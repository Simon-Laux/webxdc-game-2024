import React, { useRef } from "react";
import { Name } from "./components/Name";

import {
  MatchId,
  MatchWinner,
  RunningMatch,
  useMatchmaking,
} from "./systems/Matchmaking";
import { myPeerId } from "./systems/peerId";

export function GameView({ matchId }: { matchId: MatchId }) {
  const match = useMatchmaking(({ runningMatches }) =>
    runningMatches.find((rm) => rm.matchId === matchId)
  );
  let goBackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!match) {
    if (!goBackTimeout.current) {
      goBackTimeout.current = setTimeout(
        () => useMatchmaking.setState({ currentGame: null }),
        3000
      );
    }
    return <div>No running match with that id. Going back in 3 seconds.</div>;
  }
  return (
    <div>
      <h1>
        <Name peerId={match.host} /> vs <Name peerId={match.guest} />
      </h1>
      <small>{match?.matchId}</small>

      <div>
        <button
          onClick={() =>
            useMatchmaking.getState().endMatch(match.matchId, {
              result:
                match.host === myPeerId
                  ? MatchWinner.GuestWins
                  : MatchWinner.HostWins,
              score: "score?",
            })
          }
        >
          Give Up
        </button>
        <button
          onClick={() =>
            useMatchmaking.getState().endMatch(match.matchId, {
              result:
                match.host === myPeerId
                  ? MatchWinner.HostWins
                  : MatchWinner.GuestWins,
              score: "score?",
            })
          }
        >
          Cheat to Win Game
        </button>
        <button
          onClick={() =>
            useMatchmaking.getState().endMatch(match.matchId, {
              result: MatchWinner.Tie,
              score: "score?",
            })
          }
        >
          Cheat to Tie
        </button>
      </div>
    </div>
  );
}
