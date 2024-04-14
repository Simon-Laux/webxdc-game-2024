import { create } from "zustand";
import { sendPacket } from "../connection";
import { DisplaynamePackets, Payload } from "../types";
import { myPeerId, PeerId } from "./peerId";

interface DisplayNamesStore {
  names: { [peerId: PeerId]: string };
  processPackage: (packet: Payload<DisplaynamePackets>) => void;
  requestNames: () => void;
}

export const useDisplayNames = create<DisplayNamesStore>((set, get) => ({
  names: {},
  processPackage: (packet) => {
    if (packet.payload.type === "displayname.request") {
      set(({ names }) => ({
        names: { ...names, [packet.peerId]: packet.payload.myName },
      }));
      sendPacket({
        type: "displayname.response",
        myName: window.webxdc.selfName,
      });
    } else if (packet.payload.type === "displayname.response") {
      set(({ names }) => ({
        names: { ...names, [packet.peerId]: packet.payload.myName },
      }));
    }
  },
  requestNames: () => {
    set(({ names }) => ({
      names: { ...names, [myPeerId]: window.webxdc.selfName },
    }));
    sendPacket({ type: "displayname.request", myName: window.webxdc.selfName });
  },
}));

// Hopefully deltachat/webxdc spec will provide a way
// in the future to get a built-in userid on packets
// and a way to get the displayname and avatar from the webxdc host
