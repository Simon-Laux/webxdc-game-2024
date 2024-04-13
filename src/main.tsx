import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { usePeersStore } from "./PeerStore";

import "./peerId";
import { PingTable } from "./DebugUI/PingTable";
import PingGraph from "./DebugUI/PingGraph";

const readyPromise =
  window.webxdc?.setEphemeralUpdateListener((packet) => {
    // sort packets to to right handler

    if (packet.payload.type.startsWith("ping.")) {
      usePeersStore.getState().processEphemeralPackage(packet);
    }

    console.debug("[IN]", packet.peerId, packet.payload);
  }) || Promise.reject("webxdc does not exist");

export function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    readyPromise.then(() => setReady(true));
  }, []);

  return (
    <div>
      {ready || "Waiting for someone else to open the webxdc"}
      <PingTable />
      <PingGraph />
    </div>
  );
}

window.onload = () => {
  const root = createRoot(document.getElementById("app")!);
  root.render(<App />);
};
