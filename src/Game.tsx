import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Name } from "./components/Name";
import {
  ActiveGame,
  calculateFrameFunction,
  NETWORK_FRAME_TIME,
  Role,
} from "./Game/system";
import { Canvas, useFrame, ThreeElements } from "@react-three/fiber";
import * as THREE from "three";

import {
  MatchId,
  MatchWinner,
  RunningMatch,
  useMatchmaking,
} from "./systems/Matchmaking";
import { myPeerId } from "./systems/peerId";
import { OrbitControls } from "@react-three/drei/core/OrbitControls";

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
    <div className="GameView">
      <h1>
        <Name peerId={match.host} /> vs <Name peerId={match.guest} />
      </h1>
      <small>{match?.matchId}</small>

      {match && <Game match={match} />}

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

type Position = { x: number; y: number };

type Input = {
  type: "spawnUnit";
  position: Position;
};

type Team = Role.Host | Role.Guest;

interface Unit {
  position: Position;
  hp: number;
  team: Team;
  speed: number;
}
function newUnit(position: Position, team: Team): Unit {
  return {
    position,
    team,
    hp: 100,
    speed: 0.02,
  };
}

type GameState = {
  units: Unit[];
};
const initialGameState = () => ({ units: [] }) as GameState;

const calculateFrame: calculateFrameFunction<GameState, Input> = (
  prev,
  inputs
) => {
  // make sure game state is immutable by not modifinyng it directly
  const units: typeof prev.units = /* cloned */ JSON.parse(
    JSON.stringify(prev.units)
  );

  if (inputs) {
    const { host, guest } = inputs;
    // process inputs
    if (host?.type === "spawnUnit") {
      const position = host.position;
      units.push(newUnit(position, Role.Host));
    }

    if (guest?.type === "spawnUnit") {
      const position = guest.position;
      units.push(newUnit(position, Role.Guest));
    }
  }

  // unit logic
  for (const unit of units) {
    // TODO find target and instead move in to that direction if not in range, if in range attack
    const direction = unit.team === Role.Host ? 1 : -1;
    unit.position.y += direction * unit.speed;
  }

  return { units };
};

const GameContext = createContext<ActiveGame<GameState, Input> | null>(null);

function Game({ match }: { match: RunningMatch }) {
  // setup game state manager in ref

  const myRole: Role =
    match.host === myPeerId
      ? Role.Host
      : match.guest === myPeerId
      ? Role.Guest
      : Role.Spectator;
  // TODO this needs to be a context?
  const game = useRef(
    new ActiveGame<GameState, Input>(
      match.matchId,
      calculateFrame,
      match.randomSeed,
      myRole,
      initialGameState()
    )
  );

  const spawn = (pos: "left" | "right") => {
    game.current?.sendInput({
      type: "spawnUnit",
      position: {
        y: myRole === Role.Host ? 0 : 50,
        x: (pos === "left" ? 2 : -2) * (myRole === Role.Host ? 1 : -1),
      },
    });
  };

  useEffect(() => {
    // to find this on dc desktop you neex to switch the console context to the iframe
    (window as any).debug_game = game;
    console.log({ game });
    // todo also connect network receiver
    const intervall = setInterval(
      game.current.nextFrame.bind(game.current),
      NETWORK_FRAME_TIME
    );
    return () => clearInterval(intervall);
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
      }}
    >
      <GameContext.Provider value={game.current}>
        <Canvas style={{ flexGrow: 1 }}>
          <GameRoot />
          <OrbitControls
            makeDefault
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2}
            maxDistance={30}
            maxZoom={2}
          />
          <ambientLight intensity={Math.PI / 2} />
          <spotLight
            position={[10, 10, 10]}
            angle={0.15}
            penumbra={1}
            decay={0}
            intensity={Math.PI}
          />
          <pointLight
            position={[-10, -10, -10]}
            decay={0}
            intensity={Math.PI}
          />
        </Canvas>
        <div>
          <button onClick={() => spawn("left")}>Spawn left</button>
          <button onClick={() => spawn("right")}>spawn right</button>
        </div>
      </GameContext.Provider>
    </div>
  );
}

function GameRoot() {
  const game = useContext(GameContext);
  const [state, setState] = useState<{ game: GameState; netframe: number }>();

  useFrame((state, delta) => {
    if (!game) {
      console.log("GameController: game is undefined");
      return;
    }
    const latestState = game.gameStates[game.currentNetworkFrame];
    if (latestState) {
      setState({
        game: latestState,
        netframe: game.currentNetworkFrame,
      });
    }
  });

  return (
    <>
      {state?.game.units.map((unit) => {
        return <RenderedUnit unit={unit} />;
      })}
      <Box position={[0, 0, 0]} />
    </>
  );
}

function Box(props: ThreeElements["mesh"]) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHover] = useState(false);
  const [active, setActive] = useState(false);
  useFrame((state, delta) => (meshRef.current.rotation.x += delta));
  return (
    <mesh
      {...props}
      ref={meshRef}
      scale={active ? 1.5 : 1}
      onClick={(event) => setActive(!active)}
      onPointerOver={(event) => setHover(true)}
      onPointerOut={(event) => setHover(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? "hotpink" : "#2f74c0"} />
    </mesh>
  );
}

function RenderedUnit({ unit }: { unit: Unit }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [active, setActive] = useState(false);
  useFrame((state, delta) => (meshRef.current.rotation.x += delta));
  return (
    <mesh
      ref={meshRef}
      scale={active ? 1.5 : 1}
      position={[unit.position.x, unit.position.y, 0]}
      onClick={(event) => setActive(!active)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={unit.team ? "red" : "blue"} />
    </mesh>
  );
}
