import { create } from "zustand";
import { MatchmakingPackets, Payload } from "../types";
import { PeerId } from "./peerId";

export type MatchId = string

interface Matchmaking {
  matchRequest: { matchId:MatchId, host: PeerId }[];
  runningMatches: { matchId:MatchId, host: PeerId; guest: PeerId }[];
  processPackage: (packet: Payload<MatchmakingPackets>) => void
  sendMatchRequest: () => void
}

export const useMatchmaking = create<Matchmaking>((set, get) => ({
  matchRequest: [],
  runningMatches: [],
  processPackage: () => {

  },
  sendMatchRequest: () => {
    // check if I already have an open match request, if so throw error

    // send match request
  }
}));

// how to represent closed matches?

// Displaying:
// - for showing only show match requests of people that are online (filtered by ping)