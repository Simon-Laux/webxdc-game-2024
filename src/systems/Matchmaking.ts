import { create } from "zustand";
import { sendPacket, sendUpdate } from "../connection";
import {
  MatchmakingConfirm,
  MatchmakingMatchResult,
  MatchmakingPackets,
  MatchmakingRequest,
  Payload,
} from "../types";
import { randomId } from "../util";
import { myPeerId, PeerId } from "./peerId";

export type MatchId = string;

export enum MatchWinner {
  HostWins = "HostWins",
  GuestWins = "GuestWins",
  Tie = "Tie",
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
  /** your current game that you are playing or spectating */
  currentGame: MatchId | null;
  processPackage: (packet: Payload<MatchmakingPackets>) => void;
  sendMatchRequest: () => void;
  sendJoinRequest: (request: MatchRequest) => void;
  endMatch: (matchId: MatchId, result: MatchResult) => void;
}

// /** stores all known match ids so we can easialy check for new requests if the id  */
// const KnownMatchIds: MatchId[] = []

export const useMatchmaking = create<Matchmaking>((set, get) => ({
  currentJoinRequest: null,
  matchRequests: [],
  runningMatches: [],
  pastMatches: [],
  currentGame: null,
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
      // check match request exist and I am the host
      const matchRequest = get().matchRequests.find(
        (mr) => mr.matchId === packet.payload.matchId && mr.host === myPeerId
      );
      if (!matchRequest) {
        console.debug(
          "match accept/join request is not for me or request does not exist"
        );
        return;
      }
      // check running match does not exists yet

      if (
        get().runningMatches.findIndex(
          (m) => m.matchId === packet.payload.matchId
        ) !== -1
      ) {
        console.debug("match already exists");
        // remove request
        set(({ matchRequests }) => ({
          matchRequests: matchRequests.filter(
            (mr) => mr.matchId !== packet.payload.matchId
          ),
        }));
        return;
      }

      const match: RunningMatch = {
        matchId: packet.payload.matchId,
        host: matchRequest.host,
        guest: packet.peerId,
      };
      // create match
      set(({ runningMatches }) => ({
        runningMatches: [...runningMatches, match],
        currentGame: match.matchId,
      }));

      // send confirmation
      const newPacket: MatchmakingConfirm = {
        type: "match.confirm",
        ...match,
      };

      sendPacket(newPacket);
      sendUpdate(newPacket);
    } else if (packet.payload.type === "match.confirm") {
      if (get().currentJoinRequest === packet.payload.matchId) {
        set({ currentJoinRequest: null });
      }
      if (
        get().runningMatches.findIndex(
          (m) => m.matchId === packet.payload.matchId
        ) !== -1
      ) {
        console.debug("match already exists");
        // remove request
        set(({ matchRequests }) => ({
          matchRequests: matchRequests.filter(
            (mr) => mr.matchId !== packet.payload.matchId
          ),
        }));
        return;
      }
      const match = {
        matchId: packet.payload.matchId,
        host: packet.payload.host,
        guest: packet.payload.guest,
      };
      // remove match request and create running match
      set(({ matchRequests, runningMatches }) => ({
        matchRequests: matchRequests.filter(
          (mr) => mr.matchId !== packet.payload.matchId
        ),
        runningMatches: [...runningMatches, match],
      }));
      if (match.guest === myPeerId || match.host === myPeerId) {
        set({ currentGame: match.matchId });
      }
    } else if (packet.payload.type === "match.result") {
      console.log("match.result before", get());
      
      // check if running match exists
      const match = get().runningMatches.find(
        (m) => m.matchId === packet.payload.matchId
      );
      if (!match) {
        console.debug("match ending: match does not exist (anymore?)");
        return;
      }
      if (
        match.host !== packet.payload.host &&
        match.guest !== packet.payload.guest
      ) {
        console.error("local data inconsistent with received data");
        return;
      }
      // check if the person is either host or guest
      if (match.host !== packet.peerId && match.guest !== packet.peerId) {
        console.debug("match ending: peer can not end match it is not part of");
        return;
      }
      const pastMatch: PastMatch = {
        matchId: packet.payload.matchId,
        host: packet.payload.host,
        guest: packet.payload.guest,
        result: packet.payload.result,
      };
      // remove running match and create past match
      set(({ runningMatches, pastMatches }) => ({
        runningMatches: runningMatches.filter(
          (mr) => mr.matchId !== packet.payload.matchId
        ),
        pastMatches: [...pastMatches, pastMatch],
      }));
      console.log("match.result after", get());
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
    if (
      get().runningMatches.findIndex(
        (m) => m.host === myPeerId || m.guest === myPeerId
      ) !== -1
    ) {
      throw new Error("you can not join a match if are already in a match");
    }
    // send join request
    sendPacket({ type: "match.accept", matchId: request.matchId });
    set({ currentJoinRequest: request.matchId });
  },
  endMatch: (matchId, result) => {
    // check if running match exists
    const match = get().runningMatches.find((m) => m.matchId === matchId);
    if (!match) {
      throw new Error("match does not exist");
    }
    // check if the person is either host or guest
    if (match.host !== myPeerId && match.guest !== myPeerId) {
      console.debug("match ending: peer can not end match it is not part of");
      return;
    }

    // send match end
    const packet: MatchmakingMatchResult = {
      type: "match.result",
      matchId: match.matchId,
      host: match.host,
      guest: match.guest,
      result,
    };

    get().processPackage({
      peerId: myPeerId,
      payload: packet,
    });
    sendPacket(packet);
    sendUpdate(packet);
  },
}));

// how to represent closed matches?

// Displaying:
// - for showing only show match requests of people that are online (filtered by ping)
