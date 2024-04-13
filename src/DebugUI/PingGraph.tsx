import React, { useMemo } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import { myPeerId } from "../peerId";
import { usePeersStore } from "../PeerStore";
import { PeerPingReport } from "../types";

const stylesheet: cytoscape.Stylesheet[] = [
  {
    selector: "edge",
    style: {
      "curve-style": "bezier",
      "target-arrow-color": "#555",
      "target-arrow-shape": "triangle",
      label: "data(label)",
      "text-rotation": "autorotate",
      "text-background-color": "lightgrey",
      "text-background-opacity": 0.8,
      "text-background-shape": "roundrectangle",
      "text-background-padding": "3px",
      "line-color": "data(color)",
    },
  },
  {
    selector: "node",
    style: {
      label: "data(label)",
      shape: "round-pentagon",
      "text-valign": "center",
      "text-halign": "center",
      "background-color": "data(color)",
    },
  },
];

const COLOR_OTHERS = "lightgrey";
const COLOR_MYSELF = "grey";

const mockData = [
  { data: { id: "one", label: "Node 1", color: COLOR_MYSELF } },
  { data: { id: "two", label: "Node 2", color: COLOR_OTHERS } },
  { data: { id: "three", label: "Node 3", color: COLOR_OTHERS } },
  {
    data: { source: "one", target: "two", label: "32", color: COLOR_MYSELF },
  },
  {
    data: { source: "two", target: "one", label: "43", color: COLOR_OTHERS },
  },
  {
    data: { source: "one", target: "three", label: "34", color: COLOR_MYSELF },
  },
  {
    data: { source: "two", target: "three", label: "6", color: COLOR_OTHERS },
  },
  {
    data: { source: "three", target: "two", label: "34", color: COLOR_OTHERS },
  },
  {
    data: { source: "three", target: "one", label: "16", color: COLOR_OTHERS },
  },
];

export default function PingGraph() {
  const knownPeers = usePeersStore(({ knownPeers }) => knownPeers);

  const myPingsToOtherUsers: PeerPingReport = Object.keys(knownPeers).map(
    (peerId) => {
      const peer = knownPeers[peerId];
      return { peerId: peerId, ping: peer.lastPing?.ping };
    }
  );

  const data: cytoscape.ElementDefinition[] = [];

  for (const key in knownPeers) {
    if (Object.prototype.hasOwnProperty.call(knownPeers, key)) {
      const peer = knownPeers[key];
      data.push({
        data: { id: peer.peerId, label: peer.peerId, color: COLOR_OTHERS },
      });
      peer.pingsToOtherUsers?.forEach((pingState) => {
        data.push({
          data: {
            source: peer.peerId,
            target: pingState.peerId,
            label: pingState.ping,
            color: COLOR_OTHERS,
          },
        });
      });
    }
  }

  data.push({
    data: { id: myPeerId, label: myPeerId, color: COLOR_MYSELF },
  });

  myPingsToOtherUsers.forEach((pingState) => {
    data.push({
      data: {
        source: myPeerId,
        target: pingState.peerId,
        label: pingState.ping,
        color: COLOR_MYSELF,
      },
    });
  });

  const elements: cytoscape.ElementDefinition[] = window.webxdc
    ? data
    : mockData;

  return (
    <div
      style={{
        width: "100%",
        height: "500px",
        border: "1px grey solid",
        borderRadius: 15,
      }}
    >
      <CytoscapeComponent
        elements={elements}
        style={{ width: "100%", height: "100%" }}
        layout={{ name: "circle" }}
        stylesheet={stylesheet}
      />
    </div>
  );
}
