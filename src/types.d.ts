import { Webxdc } from "webxdc-types";
import { GameSnapshot, Input } from "./Game/system";
import { MatchId, MatchResult } from "./systems/Matchmaking";
import { PeerId } from "./systems/peerId";

// types

export interface PeerPingState {
  peerId: string;
  ping?: number;
  receivedTime: number;
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

export type PingPackets = AllPackets & PingSystemPacket;

//#endregion

//#region displayname
export interface DisplaynameSystemPacket extends Packet {
  type: `displayname.${string}`;
}
export interface DisplaynameRequestPacket {
  type: "displayname.request";
  myName: string;
}
export interface DisplaynameResponsePacket {
  type: "displayname.response";
  myName: string;
}

export type DisplaynamePackets = AllPackets & DisplaynameSystemPacket;

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
  host: PeerId;
  guest: PeerId;
  randomSeed: number;
}

/**
 * announce that a game ended and who is the winner
 * @sent over both persistent and p2p channel
 */
export interface MatchmakingMatchResult {
  type: "match.result";
  matchId: MatchId;
  host: PeerId;
  guest: PeerId;
  result: MatchResult;
}

export type MatchmakingPackets = AllPackets & MatchmakingSystemPacket;

//#endregion

//#region matchmaking
export interface GamePacket extends Packet {
  type: `game.${string}`;
  matchId: MatchId;
}

export interface GameSnapshotPacket extends GamePacket {
  type: `game.snapshot`;
  snapshot: GameSnapshot<any>;
}

export interface GameInputPacket extends GamePacket {
  type: `game.input`;
  input: Input<any>;
}

export type GamePackets = AllPackets & GamePacket;

//#endregion

type EpermeralPacket =
  // Ping
  | PingPacket
  | PongPacket
  | PingReportPacket
  // Displayname
  | DisplaynameRequestPacket
  | DisplaynameResponsePacket
  // Matchmaking
  | MatchmakingRequest
  | MatchmakingAccept
  | MatchmakingConfirm
  | MatchmakingMatchResult
  // Game
  | GameSnapshotPacket
  | GameInputPacket;
type StatusPacket =
  // Matchmaking
  MatchmakingRequest | MatchmakingConfirm | MatchmakingMatchResult;

type AllPackets = EpermeralPacket | StatusPacket;

//#endregion

export interface Payload<P extends Packet> {
  peerId: PeerId;
  payload: P;
}

export type StatusPayload = Payload<StatusPacket>;
export type EpermeralPayload = Payload<EpermeralPacket>;

declare global {
  interface Window {
    webxdc: Webxdc<StatusPayload>;
  }
}
