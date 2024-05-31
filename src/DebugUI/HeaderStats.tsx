import React from "react";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { UI_OFFLINE_TIMEOUT, usePeersStore } from "../systems/PeerStore";

export function HeaderStats() {
  const peerCount = usePeersStore(({ knownPeers }) => {
    const cuttoffTS = Date.now() - UI_OFFLINE_TIMEOUT;
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
