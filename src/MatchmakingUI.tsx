import React from "react";
import { MatchRequest, useMatchmaking } from "./systems/Matchmaking";

export function MatchSelector() {
  const createMatch = () => {
    useMatchmaking.getState().sendMatchRequest();
  };
  return (
    <div>
      <h1>Match Offers</h1>
      <MatchRequests />
      <button onClick={createMatch}>Create a new Match</button>
      <h1>Running Matches</h1>
      <RunningMatches />
      <h1>Past Matches</h1>
      <PastMatches />
    </div>
  );
}

export function MatchRequests() {
  const matchRequests = useMatchmaking(({ matchRequests }) => matchRequests);
  return (
    <div>
      {matchRequests.map((request) => (
        <MatchRequestElement request={request} />
      ))}
    </div>
  );
}

export function MatchRequestElement({ request }: { request: MatchRequest }) {
  const onJoinRequest = () => {
    useMatchmaking.getState().sendJoinRequest(request);
  };
  return (
    <button onClick={onJoinRequest}>
      {request.host}
      <small>{request.matchId}</small>
    </button>
  );
}

export function RunningMatches() {
  return <div></div>;
}

export function PastMatches() {
  return <div></div>;
}
