import React from "react";
import { Name } from "../components/Name";
import { myPeerId } from "../systems/peerId";
import { usePeersStore } from "../systems/PeerStore";
import { name2Color } from "../util";

export function PingTable() {
  const knownPeers = usePeersStore((state) => state.knownPeers);

  return (
    <table className="pingtable" style={{ margin: 4 }}>
      <thead>
        <tr>
          <td>Peer Id</td>
          <td>Last Seen At</td>
          <td>ping</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ color: name2Color(myPeerId, true) }}>
            myself ({myPeerId})
          </td>
          <td>-</td>
          <td>-</td>
        </tr>
        {Object.keys(knownPeers).map((peerId) => {
          const peer = knownPeers[peerId];
          return (
            <tr>
              <td style={{ color: name2Color(peer.peerId, false) }}>
                <Name peerId={peer.peerId} /> ({peer.peerId})
              </td>
              <td>{peer.last_seen}</td>
              <td>{peer.lastPing?.ping}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
