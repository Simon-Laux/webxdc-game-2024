import { create } from "zustand";
import { myPeerId } from "./peerId";
import { Payload, PeerPingReport, PingPackets } from "../types";
import { randomId } from "../util";
import { sendPacket } from "../connection";

export interface Peer {
  peerId: string;
  /** last ping to the user */
  lastPing?: {
    receivedTime: number;
    ping: number;
  };
  /** the users last pings to others */
  pingsToOtherUsers?: PeerPingReport;
  /** unix ts */
  last_seen: number;
  /** if we know of this peer only from others */
  gossiped: boolean;
  gossiped_last_seen: number;
}

const buildPeer = (peerId: string) => {
  return { peerId, last_seen: 0, gossiped: false } as Peer;
};

const buildGossipedPeer = (peerId: string, gossiped_last_seen: number) => {
  return { peerId, last_seen: 0, gossiped: true, gossiped_last_seen } as Peer;
};

interface PeersStore {
  knownPeers: { [peerId: string]: Peer };
  lastSentPing: { ts: number; id: string } | null;
  processPackage: (packet: Payload<PingPackets>) => void;
  sendPing: () => void;
  sendPingReport: () => void;
}

export const usePeersStore = create<PeersStore>((set, get) => ({
  knownPeers: {},
  lastSentPing: null,
  processPackage: (packet) => {
    if (packet.peerId === myPeerId) {
      console.debug("ignoring update for own peer id");
      return;
    }

    if (packet.payload.type === "ping.ping") {
      sendPacket({
        type: "ping.pong",
        pingId: packet.payload.pingId,
      });
    } else if (packet.payload.type === "ping.pong") {
      const receivedTime = Date.now();
      const lastPing = get().lastSentPing;
      if (!lastPing) {
        return;
      }
      const ping = receivedTime - lastPing?.ts;
      // is this the current ping or older
      if (packet.payload.pingId === lastPing?.id) {
        set(({ knownPeers }) => ({
          knownPeers: {
            ...knownPeers,
            [packet.peerId]: {
              ...(knownPeers[packet.peerId] || buildPeer(packet.peerId)),
              lastPing: { receivedTime, ping },
              last_seen: receivedTime,
              gossiped: false,
            },
          },
        }));
      }
    } else if (packet.payload.type === "ping.report") {
      const receivedTime = Date.now();
      const report = packet.payload.report;
      const knownPeerIds = [
        ...Object.keys(get().knownPeers),
        myPeerId,
        packet.peerId,
      ];
      const newGossipedPeers = report
        .filter(({ peerId }) => knownPeerIds.indexOf(peerId) === -1)
        .map(({ peerId, receivedTime }) =>
          buildGossipedPeer(peerId, receivedTime),
        )
        .reduce(
          (container, peer) => {
            container[peer.peerId] = peer;
            return container;
          },
          {} as PeersStore["knownPeers"],
        );
      set(({ knownPeers }) => ({
        knownPeers: {
          ...knownPeers,
          ...newGossipedPeers,
          [packet.peerId]: {
            ...(knownPeers[packet.peerId] || buildPeer(packet.peerId)),
            pingsToOtherUsers: report,
            last_seen: receivedTime,
          },
        },
      }));
    }
  },
  sendPing: () => {
    const ping = {
      ts: Date.now(),
      id: randomId(),
    };

    sendPacket({
      type: "ping.ping",
      pingId: ping.id,
    });

    set(() => ({ lastSentPing: ping }));
  },
  sendPingReport: () => {
    const knownPeers = get().knownPeers;

    sendPacket({
      type: "ping.report",
      report: Object.keys(knownPeers)
        .map((peerId) => knownPeers[peerId])
        .filter((peer) => !peer.gossiped && peer.lastPing !== undefined)
        .map((peer) => {
          return {
            peerId: peer.peerId,
            ping: peer.lastPing!.ping,
            receivedTime: peer.lastPing!.receivedTime,
          };
        }),
    });
  },
}));

export const PING_INTERVAL = 800;
export const PING_REPORT_INTERVAL = 4000;

if (window.webxdc) {
  setInterval(usePeersStore.getState().sendPing, PING_INTERVAL);
  setInterval(usePeersStore.getState().sendPingReport, PING_REPORT_INTERVAL);
}

/** when the ui considers a peer as offline */
export const UI_OFFLINE_TIMEOUT = PING_INTERVAL * 5;
