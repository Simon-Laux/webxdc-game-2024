import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

import "./systems/peerId";
import { PingTable } from "./DebugUI/PingTable";
import PingGraph from "./DebugUI/PingGraph";
import { EphermeralReadyPromise, StatusUpdateReadyPromise } from "./connection";
import DebugUI from "./DebugUI";

export function App() {
  const [readyEphermeral, setReadyEphermeral] = useState(false);
  const [readyStatusUpdate, setReadyStatusUpdate] = useState(false);
  const [showDebugUI, setShowDebugUI] = useState(false);

  useEffect(() => {
    EphermeralReadyPromise.then(() => setReadyEphermeral(true));
    StatusUpdateReadyPromise.then(() => setReadyStatusUpdate(true));
  }, []);

  return (
    <div>
      <button
        onClick={() => setShowDebugUI(true)}
        style={{ fontSize: "1.4em", margin: 5 }}
      >
        Open Debug Menu
      </button>

      <div>
        {readyStatusUpdate || "Processing old updates"}<br />
        {readyEphermeral || "Waiting for someone else to open the webxdc"}
      </div>

      {showDebugUI && <DebugUI onClose={() => setShowDebugUI(false)} />}
    </div>
  );
}

window.onload = () => {
  const root = createRoot(document.getElementById("app")!);
  root.render(<App />);
};
