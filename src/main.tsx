import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

import "./systems/peerId";
import { StatusUpdateReadyPromise } from "./connection";
import DebugUI from "./DebugUI";
import { HeaderStats } from "./DebugUI/HeaderStats";
import { MatchSelector } from "./MatchmakingUI";
import { useMatchmaking } from "./systems/Matchmaking";
import { GameView } from "./Game";
import { useDisplayNames } from "./systems/DisplayNameStore";

export function App() {
  const [readyEphermeral, setReadyEphermeral] = useState(false);
  const [readyStatusUpdate, setReadyStatusUpdate] = useState(false);
  const [showDebugUI, setShowDebugUI] = useState(false);

  useEffect(() => {
    // there is no ready promise anymore for Ephermeral channels
    useDisplayNames.getState().requestNames();
    setReadyEphermeral(true)
    StatusUpdateReadyPromise.then(() => setReadyStatusUpdate(true));
  }, []);

  const currentMatch = useMatchmaking(({currentGame})=>currentGame)

  return (
    <div>
      <div style={{ display: "flex" }}>
        <h2 style={{ flexGrow: 1 }}>simon/webxdc-game2024</h2>
        <div style={{ margin: 5 }}>
          <button
            onClick={() => setShowDebugUI(true)}
            style={{ fontSize: "1.4em" }}
          >
            Open Debug Menu
          </button>
          <HeaderStats />
        </div>
      </div>

      <div>
        {readyStatusUpdate || "Processing old updates"}
        <br />
        {readyEphermeral || "Waiting for someone else to open the webxdc"}
      </div>

      {readyStatusUpdate && readyEphermeral && <>

       {!currentMatch && <MatchSelector />}
       {currentMatch && <GameView matchId={currentMatch} />}

      
      </>}

      {showDebugUI && <DebugUI onClose={() => setShowDebugUI(false)} />}
    </div>
  );
}

window.onload = () => {
  const root = createRoot(document.getElementById("app")!);
  root.render(<App />);
};
