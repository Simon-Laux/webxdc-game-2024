import { create } from "zustand";
import { sendPacket, sendUpdate } from "../connection";
import { MatchmakingPackets, MatchmakingRequest, Payload } from "../types";
import { randomId } from "../util";
import { myPeerId, PeerId } from "./peerId";

export type MatchId = string;

enum MatchWinner {
  HostWins,
  GuestWins,
  Tie,
}

export interface MatchResult {
  result: MatchWinner;
  score: string;
}

export interface MatchRequest {
  matchId: MatchId;
  host: PeerId;
}

export interface RunningMatch {
  matchId: MatchId;
  host: PeerId;
  guest: PeerId;
}

export interface PastMatch {
  matchId: MatchId;
  host: PeerId;
  guest: PeerId;
  result: MatchResult;
}

interface Matchmaking {
  currentJoinRequest: MatchId | null;
  matchRequests: MatchRequest[];
  runningMatches: RunningMatch[];
  pastMatches: PastMatch[];
  processPackage: (packet: Payload<MatchmakingPackets>) => void;
  sendMatchRequest: () => void;
  sendJoinRequest: (request: MatchRequest) => void;
}

// /** stores all known match ids so we can easialy check for new requests if the id  */
// const KnownMatchIds: MatchId[] = []

export const useMatchmaking = create<Matchmaking>((set, get) => ({
  currentJoinRequest: null,
  matchRequests: [],
  runningMatches: [],
  pastMatches: [],
  processPackage: (packet) => {
    if (packet.payload.type === "match.request") {
      if (
        get().matchRequests.findIndex(
          (mr) => mr.matchId === packet.payload.matchId
        ) !== -1
      ) {
        console.log(
          "ignoring match request package as it was already processed"
        );
        return;
      }
      set(({ matchRequests }) => ({
        matchRequests: [
          ...matchRequests,
          { host: packet.peerId, matchId: packet.payload.matchId },
        ],
      }));
    } else if (packet.payload.type === "match.accept") {
    } else if (packet.payload.type === "match.confirm") {
    } else if (packet.payload.type === "match.result") {
    }
  },
  sendMatchRequest: () => {
    // check if I already have an open match request, if so throw error
    if (get().matchRequests.findIndex((mr) => mr.host === myPeerId) !== -1) {
      throw new Error("my peer already has a match request");
    }
    if (get().runningMatches.findIndex((mr) => mr.host === myPeerId) !== -1) {
      throw new Error("my peer already has a running match");
    }
    if (get().currentJoinRequest) {
      throw new Error(
        "you can not start a match if you are alreay joining one"
      );
    }
    // send match request
    const packet: MatchmakingRequest = {
      type: "match.request",
      matchId: randomId(),
    };

    sendPacket(packet);
    sendUpdate(packet);

    get().processPackage({
      peerId: myPeerId,
      payload: packet,
    });
  },
  sendJoinRequest: (request) => {
    // check if match request exists & no running game with that id exists
    const { matchRequests } = get();
    if (
      matchRequests.findIndex((mr) => mr.matchId === request.matchId) === -1
    ) {
      throw new Error("match join request does not exist");
    }
    if (get().matchRequests.findIndex((mr) => mr.host === myPeerId) !== -1) {
      throw new Error(
        "you can not join a match if you have an open match request"
      );
    }
    // send join request
    sendPacket({ type: "match.accept", matchId: request.matchId });
    set({ currentJoinRequest: request.matchId });
  },
}));

// how to represent closed matches?

// Displaying:
// - for showing only show match requests of people that are online (filtered by ping)
