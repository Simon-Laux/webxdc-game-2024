import React from "react";
import { useDisplayNames } from "../systems/DisplayNameStore";
import { PeerId, myPeerId } from "../systems/peerId";

export function Name({ peerId }: { peerId: PeerId }) {
  const name = useDisplayNames(({ names }) => names[peerId]);
  return (
    <>
      {name || peerId}
      {myPeerId === peerId && "[me]"}
    </>
  );
}
