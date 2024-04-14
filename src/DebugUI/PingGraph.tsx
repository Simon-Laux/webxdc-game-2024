import React, { useLayoutEffect, useMemo, useRef } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import { myPeerId } from "../systems/peerId";
import { usePeersStore } from "../systems/PeerStore";
import { PeerPingReport } from "../types";

//@ts-ignore
import getRGB from "consistent-color-generation";

const stylesheet: cytoscape.Stylesheet[] = [
  {
    selector: "edge",
    style: {
      "curve-style": "bezier",
      label: "data(label)",
      "text-rotation": "autorotate",
      "text-background-color": "lightgrey",
      "text-background-opacity": 0.8,
      "text-background-shape": "roundrectangle",
      "text-background-padding": "3px",
      "line-color": "data(color)",
      //@ts-ignore
      "line-style": "data(lineStyle)"
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

function name2Color(name: string, myself: boolean) {
  return getRGB(
    name,
    undefined,
    myself ? 90 : 80,
    myself ? 40 : 60
  ).toString("hex");
}

const mockData = [
  { data: { id: "one", label: "Node 1", color: name2Color("one", true) } },
  { data: { id: "two", label: "Node 2", color: name2Color("two", false) } },
  { data: { id: "three", label: "Node 3", color: name2Color("three", false) } },
  {
    data: {
      source: "one",
      target: "two",
      label: "32",
      color: name2Color("one", true),
    },
  },
  {
    data: {
      source: "two",
      target: "one",
      label: "43",
      color: name2Color("two", false),
      lineStyle: 'dashed'
    },
  },
  {
    data: {
      source: "one",
      target: "three",
      label: "34",
      color: name2Color("one", true),
    },
  },
  {
    data: {
      source: "two",
      target: "three",
      label: "6",
      color: name2Color("two", false),
      lineStyle: 'dashed'
    },
  },
  {
    data: {
      source: "three",
      target: "two",
      label: "34",
      color: name2Color("three", false),
      lineStyle: 'dashed'
    },
  },
  {
    data: {
      source: "three",
      target: "one",
      label: "16",
      color: name2Color("three", false),
      lineStyle: 'dashed'
    },
  },
];

export default function PingGraph() {
  const cyRef = useRef<cytoscape.Core|null>(null)
  const knownPeers = usePeersStore(({ knownPeers }) => knownPeers);

  useLayoutEffect(()=>{
    cyRef.current?.layout({ name: "circle"}).run()
  }, [Object.keys(knownPeers).length])

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
        data: {
          id: peer.peerId,
          label: peer.peerId,
          color: name2Color(peer.peerId, false),
        },
      });
      peer.pingsToOtherUsers?.forEach((pingState) => {
        data.push({
          data: {
            source: peer.peerId,
            target: pingState.peerId,
            label: pingState.ping,
            color: name2Color(peer.peerId, false),
            lineStyle: 'dashed'
          },
        });
      });
    }
  }

  data.push({
    data: { id: myPeerId, label: myPeerId, color: name2Color(myPeerId, false) },
  });

  myPingsToOtherUsers.forEach((pingState) => {
    data.push({
      data: {
        source: myPeerId,
        target: pingState.peerId,
        label: pingState.ping,
        color: name2Color(myPeerId, false),
      },
    });
  });

  const elements: cytoscape.ElementDefinition[] = window.webxdc
    ? data
    : mockData;



  return (
    <div
      style={{
        flexGrow: 1,
        border: "1px grey solid",
        borderRadius: 15,
        margin: 4
      }}
    >
      <CytoscapeComponent
        elements={elements}
        style={{ width: "100%", height: "100%" }}
        stylesheet={stylesheet}
        cy={cy=>cyRef.current=cy}
      />
    </div>
  );
}
