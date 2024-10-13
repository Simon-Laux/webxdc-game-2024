import React from "react";
import { Name } from "./components/Name";

import { MatchRequest, useMatchmaking } from "./systems/Matchmaking";
import { myPeerId } from "./systems/peerId";
import { Peer, UI_OFFLINE_TIMEOUT, usePeersStore } from "./systems/PeerStore";

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
  // get last ping so we rerender on each ping
  const { knownPeers } = usePeersStore(({ knownPeers, lastSentPing }) => ({
    knownPeers,
    lastSentPing,
  }));
  const currentJoinRequest = useMatchmaking(
    ({ currentJoinRequest }) => currentJoinRequest
  );
  const peer: Peer | undefined = knownPeers[request.host];

  // if peer is offline disable the button
  const offline =
    Math.max(peer?.last_seen || 0, peer?.gossiped_last_seen || 0) <=
    Date.now() - UI_OFFLINE_TIMEOUT;
  const my_match = request.host === myPeerId;

  const onJoinRequest = () => {
    useMatchmaking.getState().sendJoinRequest(request);
  };
  return (
    <button onClick={onJoinRequest} disabled={my_match || offline}>
      {my_match ? "My Match Invitation" : <Name peerId={request.host} />}
      <br />
      <small>{request.matchId}</small>
      {currentJoinRequest === request.matchId && (
        <>
          <br />
          joining
        </>
      )}
      {offline && !my_match && (
        <>
          <br />
          host is offline
        </>
      )}
    </button>
  );
}

export function RunningMatches() {
  const { runningMatches, spectate } = useMatchmaking(
    ({ runningMatches, spectate }) => ({ runningMatches, spectate })
  );
  return (
    <div>
      {runningMatches.map((match) => (
        <button onClick={() => spectate(match.matchId)}>
          <Name peerId={match.host} /> vs <Name peerId={match.guest} />
          <br />
          <small>{match.matchId}</small>
        </button>
      ))}
    </div>
  );
}

export function PastMatches() {
  const pastMatches = useMatchmaking(({ pastMatches }) => pastMatches);
  return (
    <div>
      <li>
        {pastMatches.map((match) => (
          <ul>
            {match.matchId}: <Name peerId={match.host} /> vs{" "}
            <Name peerId={match.guest} />
            <br />
            Result: {JSON.stringify(match.result)}
          </ul>
        ))}
      </li>
    </div>
  );
}
