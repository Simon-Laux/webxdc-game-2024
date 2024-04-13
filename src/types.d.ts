import { Webxdc } from "webxdc-types";

// types

export interface PeerPingState {
  peerId: string;
  ping?: number;
}

export type PeerPingReport = PeerPingState[]

//#region packets

export interface Packet {
    type: `${string}.${string}`
}

//#region Ping system for PeerStore

export interface PingSystemPacket extends Packet {
    type: `ping.${string}`
}

export interface PingPacket extends PingSystemPacket {
  type: "ping.ping";
  pingId: string;
}
export interface PongPacket {
  type: "ping.pong";
  pingId: string
}

// when other peer reports it's ping results
export interface PingReportPacket {
  type: "ping.report";
  report: PeerPingReport;
}

//#endregion

type EpermeralPacket = PingPacket | PongPacket | PingReportPacket;

//#endregion

export type StatusPayload = {};
export type EpermeralPayload = {
    peerId: string,
    payload: EpermeralPacket
}



declare global {
  interface Window {
    webxdc: Webxdc<StatusPayload, EpermeralPayload>;
  }
}
