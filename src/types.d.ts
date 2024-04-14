import { Webxdc } from "webxdc-types";
import { MatchId } from "./systems/Matchmaking";
import { PeerId } from "./systems/peerId";

// types

export interface PeerPingState {
  peerId: string;
  ping?: number;
  receivedTime: number,
}

export type PeerPingReport = PeerPingState[];

//#region packets

export interface Packet {
  type: `${string}.${string}`;
}

//#region Ping system for PeerStore

export interface PingSystemPacket extends Packet {
  type: `ping.${string}`;
}

/** ping all other peers
 * @sent over p2p channel
 */
export interface PingPacket extends PingSystemPacket {
  type: "ping.ping";
  pingId: string;
}

/** pong the person that pinged
 * @sent over p2p channel
 * @todo if we have whispering implement it for there
 */
export interface PongPacket {
  type: "ping.pong";
  pingId: string;
}

/** when other peer reports it's ping results
 * @sent over p2p channel
 */
export interface PingReportPacket {
  type: "ping.report";
  report: PeerPingReport;
}

export type PingPackets = PingPacket | PongPacket | PingReportPacket;

//#endregion

//#region matchmaking
export interface MatchmakingSystemPacket extends Packet {
  type: `match.${string}`;
}

/** signal that you are ready for a game
 * @sent over both persistent and p2p channel
 */
export interface MatchmakingRequest {
  type: "match.request";
  matchId: MatchId;
}
/**
 * try to accept a game
 * (first received accept request wins)
 * @sent over p2p channel
 * @todo if we have whispering implement it for there
 *  */
export interface MatchmakingAccept {
  type: "match.accept";
  matchId: MatchId;
}
/**
 * announce who joined the game (who won the race to accept)
 * @sent over both persistent and p2p channel
 */
export interface MatchmakingConfirm {
  type: "match.confirm";
  matchId: MatchId;
}

export type MatchmakingPackets = AllPackets & MatchmakingSystemPacket

//#endregion

type EpermeralPacket =
  // Ping
  | PingPacket
  | PongPacket
  | PingReportPacket
  // Matchmaking
  | MatchmakingRequest
  | MatchmakingAccept
  | MatchmakingConfirm;
type StatusPacket =
  // Matchmaking
  MatchmakingRequest | MatchmakingConfirm;

type AllPackets = EpermeralPacket | StatusPacket

//#endregion

export interface Payload<P extends Packet> {
  peerId: PeerId;
  payload: P;
}

export type StatusPayload = Payload<StatusPacket>;
export type EpermeralPayload = Payload<EpermeralPacket>;

declare global {
  interface Window {
    webxdc: Webxdc<StatusPayload, EpermeralPayload>;
  }
}
