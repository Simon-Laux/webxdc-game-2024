import { EpermeralPacket } from "./types";

export const myPeerId = (() => {
  const LOCAL_STORAGE_KEY = "my.game.deviceId";
  let deviceId = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!deviceId) {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      (deviceId = (Math.random() * 100).toString(26))
    );
  }
  return `${window.webxdc?.selfAddr || "?"}-${deviceId}`;
})();

console.info("PeerId of this device is:", myPeerId);

export function sendPacket(packet: EpermeralPacket) {
  console.debug("[OUT]", packet);
  window.webxdc.sendEphemeralUpdate({ peerId: myPeerId, payload: packet });
}

const randomIdSeed = Math.floor(Math.random() * 1000);

export function randomId() {
  return (
    Math.floor(Math.random() * 100000 + randomIdSeed) * randomIdSeed
  ).toString(26);
}
