import React from "react";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { PING_INTERVAL, usePeersStore } from "../systems/PeerStore";

const OFFLINE_TIMEOUT = PING_INTERVAL * 5;

export function HeaderStats() {
  const peerCount = usePeersStore(({ knownPeers }) => {
    const cuttoffTS = Date.now() - OFFLINE_TIMEOUT;
    return Object.keys(knownPeers)
      .map((key) => knownPeers[key])
      .filter((peer) => peer.last_seen >= cuttoffTS).length;
  });

  return (
    <div
      style={{
        display: "flex",
        fontFamily: "sans-serif",
        justifyContent: "end",
      }}
    >
      <UserGroupIcon height={"1em"} />
      {peerCount + 1}
    </div>
  );
}
