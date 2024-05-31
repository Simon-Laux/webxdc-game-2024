export type PeerId = string;

export const myPeerId = (() => {
  const LOCAL_STORAGE_KEY = "my.game.deviceId";
  let deviceId = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!deviceId) {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      (deviceId = (Math.random() * 100).toString(26)),
    );
  }
  return `${window.webxdc?.selfAddr || "?"}-${deviceId}` as PeerId;
})();

console.info("PeerId of this device is:", myPeerId);
