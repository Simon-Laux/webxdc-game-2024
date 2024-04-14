import React, { useLayoutEffect, useMemo, useRef } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import { myPeerId } from "../systems/peerId";
import {
  PING_REPORT_INTERVAL,
  UI_OFFLINE_TIMEOUT,
  usePeersStore,
} from "../systems/PeerStore";
import { PeerPingReport } from "../types";

//@ts-ignore
import getRGB from "consistent-color-generation";

const stylesheet: cytoscape.Stylesheet[] = [
  {
    selector: "edge",
    style: {
      "curve-style": "bezier",
      label: "data(label)",
      "text-rotation": "autorotate",
      "text-background-color": "lightgrey",
      "text-background-opacity": 0.8,
      "text-background-shape": "roundrectangle",
      "text-background-padding": "3px",
      "line-color": "data(color)",
      //@ts-ignore
      "line-style": "data(lineStyle)",
      width: "data(lineWidth)",
    },
  },
  {
    selector: "node",
    style: {
      label: "data(label)",
      shape: "round-pentagon",
      "text-valign": "center",
      "text-halign": "center",
      "background-color": "data(color)",
    },
  },
];

function name2Color(name: string, myself: boolean) {
  return getRGB(name, undefined, myself ? 90 : 80, myself ? 40 : 60).toString(
    "hex"
  );
}

const enum LINE_WIDTH {
  SMALL = 1,
  NORMAL = 3,
}

const mockData = [
  { data: { id: "one", label: "Node 1", color: name2Color("one", true) } },
  { data: { id: "two", label: "Node 2", color: name2Color("two", false) } },
  { data: { id: "three", label: "Node 3", color: name2Color("three", false) } },
  {
    data: {
      source: "one",
      target: "two",
      label: "32",
      color: name2Color("one", true),
      lineWidth: LINE_WIDTH.SMALL,
    },
  },
  {
    data: {
      source: "two",
      target: "one",
      label: "43",
      color: name2Color("two", false),
      lineStyle: "dashed",
      lineWidth: LINE_WIDTH.NORMAL,
    },
  },
  {
    data: {
      source: "one",
      target: "three",
      label: "34",
      color: name2Color("one", true),
      lineWidth: LINE_WIDTH.NORMAL,
    },
  },
  {
    data: {
      source: "two",
      target: "three",
      label: "6",
      color: name2Color("two", false),
      lineStyle: "dashed",
      lineWidth: LINE_WIDTH.NORMAL,
    },
  },
  {
    data: {
      source: "three",
      target: "two",
      label: "34",
      color: name2Color("three", false),
      lineStyle: "dashed",
      lineWidth: LINE_WIDTH.NORMAL,
    },
  },
  {
    data: {
      source: "three",
      target: "one",
      label: "16",
      color: name2Color("three", false),
      lineStyle: "dashed",
      lineWidth: LINE_WIDTH.NORMAL,
    },
  },
];

export default function PingGraph() {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const knownPeers = usePeersStore(({ knownPeers }) => knownPeers);

  useLayoutEffect(() => {
    cyRef.current?.layout({ name: "circle" }).run();
  }, [Object.keys(knownPeers).length]);

  const myPingsToOtherUsers: PeerPingReport = Object.keys(knownPeers).map(
    (peerId) => {
      const peer = knownPeers[peerId];
      return {
        peerId: peerId,
        ping: peer.lastPing?.ping,
        receivedTime: peer.lastPing?.receivedTime || 0,
      };
    }
  );

  const offlineCutoff = Date.now() - UI_OFFLINE_TIMEOUT;
  const offlineGossipCutoff = Date.now() - PING_REPORT_INTERVAL * 3;
  const data: cytoscape.ElementDefinition[] = [];

  for (const key in knownPeers) {
    if (Object.prototype.hasOwnProperty.call(knownPeers, key)) {
      const peer = knownPeers[key];
      const online = peer.last_seen >= offlineCutoff;
      data.push({
        data: {
          id: peer.peerId,
          label: peer.peerId,
          color: online
            ? name2Color(peer.peerId, false)
            : peer.gossiped
            ? "lightgrey"
            : "grey",
        },
      });
      // display gossiped data
      peer.pingsToOtherUsers?.forEach((pingState) => {
        data.push({
          data: {
            source: peer.peerId,
            target: pingState.peerId,
            label: pingState.ping,
            color: name2Color(peer.peerId, false),
            lineStyle: "dashed",
            lineWidth:
              pingState.receivedTime >= offlineGossipCutoff
                ? LINE_WIDTH.NORMAL
                : LINE_WIDTH.SMALL,
          },
        });
      });
    }
  }

  data.push({
    data: { id: myPeerId, label: myPeerId, color: name2Color(myPeerId, false) },
  });

  myPingsToOtherUsers.forEach((pingState) => {
    const peer = knownPeers[pingState.peerId];
    if (peer.gossiped) {
      // we kave no edges to peers that were gossiped to us
      return;
    }
    const lineWidth =
      peer.last_seen >= offlineCutoff ? LINE_WIDTH.NORMAL : LINE_WIDTH.SMALL;
    data.push({
      data: {
        source: myPeerId,
        target: pingState.peerId,
        label: pingState.ping,
        color: name2Color(myPeerId, false),
        lineWidth,
        lineStyle: "solid",
      },
    });
  });

  const elements: cytoscape.ElementDefinition[] = window.webxdc
    ? data
    : mockData;

  return (
    <div
      style={{
        flexGrow: 1,
        border: "1px grey solid",
        borderRadius: 15,
        margin: 4,
        maxHeight: "70vh",
      }}
    >
      <CytoscapeComponent
        elements={elements}
        style={{ width: "100%", height: "100%" }}
        stylesheet={stylesheet}
        cy={(cy) => (cyRef.current = cy)}
      />
    </div>
  );
}
