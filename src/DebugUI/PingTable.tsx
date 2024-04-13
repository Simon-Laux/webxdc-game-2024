import React from "react";
import { myPeerId } from "../peerId";
import { usePeersStore } from "../PeerStore";

export function PingTable() {
  const knownPeers = usePeersStore((state) => state.knownPeers);

  return (
    <table className="pingtable">
      <thead>
        <tr>
          <td>Peer Id</td>
          <td>Last Seen At</td>
          <td>ping</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>myself ({myPeerId})</td>
          <td>-</td>
          <td>-</td>
        </tr>
        {Object.keys(knownPeers).map((peerId) => {
          const peer = knownPeers[peerId];
          return (
            <tr>
              <td>{peer.peerId}</td>
              <td>{peer.last_seen}</td>
              <td>{peer.lastPing?.ping}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
