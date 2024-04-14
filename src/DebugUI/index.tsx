import React, { useLayoutEffect, useRef } from "react";
import PingGraph from "./PingGraph";
import { PingTable } from "./PingTable";

export default function DebugUI({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        border: "1px red solid",
        position: "absolute",
        zIndex: "300",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(255,255,255)",
        padding: 5,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <button onClick={onClose} style={{ fontSize: "1.4em", margin: 5, flexShrink: 0 }}>
        Close debug menu
      </button>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        <PingTable />
        <PingGraph />
      </div>
    </div>
  );
}
