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
import { GameProcessPacketHandler } from "./connection";

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

  const isSpectating = ![match.guest, match.host].includes(myPeerId);
  const stopSpectating = () => {
    useMatchmaking.setState({ currentGame: null });
  };

  return (
    <div className="GameView">
      {isSpectating && (
        <button onClick={stopSpectating}>stop spectating</button>
      )}
      <h1>
        <Name peerId={match.host} /> vs <Name peerId={match.guest} />
      </h1>
      <small>{match?.matchId}</small>

      {match && <Game match={match} />}

      {!isSpectating && (
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
      )}
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
  /** that react can reuse them correctly */
  unit_key: number;
  position: Position;
  hp: number;
  team: Team;
  speed: number;
}
let unit_key = 0;
function newUnit(position: Position, team: Team): Unit {
  return {
    unit_key: unit_key++,
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
  let units: typeof prev.units = /* cloned */ JSON.parse(
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

  // remove out of bounds units and units with 0 health
  units = units.filter(
    (unit) => unit.position.x < 50 && unit.position.x > -50 && unit.hp > 0
  );

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

  const [readyToShow, setReadyToShow] = useState(game.current.readyToShow);
  game.current.onReadyToShow = () => setReadyToShow(true);

  const spawn = (pos: "left" | "right") => {
    game.current?.sendInput({
      type: "spawnUnit",
      position: {
        y: myRole === Role.Host ? -10 : 10,
        x: (pos === "left" ? 2 : -2) * (myRole === Role.Host ? 1 : -1),
      },
    });
  };

  const orbitalControllRef = useRef<any>();
  useEffect(() => {
    (window as any).orbitalControllRef = orbitalControllRef;
    setTimeout(() => {
      orbitalControllRef.current?.setAzimuthalAngle(
        myRole === Role.Guest ? 0 : Math.PI
      );
    }, 100);
  }, [orbitalControllRef.current, readyToShow]);

  useEffect(() => {
    // to find this on dc desktop you neex to switch the console context to the iframe
    (window as any).debug_game = game;

    console.log({ game });
    // todo also connect network receiver
    const intervall = setInterval(
      game.current.nextFrame.bind(game.current),
      NETWORK_FRAME_TIME
    );
    GameProcessPacketHandler.handler = game.current.receiveMessage.bind(
      game.current
    );
    return () => {
      clearInterval(intervall);
    };
  });

  let azimuthAngleRestrictions: [
    min: number | undefined,
    max: number | undefined,
  ] = [undefined, undefined];
  if (readyToShow){
    if (myRole === Role.Host) {
      azimuthAngleRestrictions = [Math.PI / 2, -Math.PI / 2];
    } else if (myRole === Role.Guest) {
      azimuthAngleRestrictions = [-Math.PI / 2, Math.PI / 2];
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
      }}
    >
      <GameContext.Provider value={game.current}>
        <div className="gameWindow">
          {!readyToShow && (
            <div className="gameOverlay">
              {!readyToShow && (
                <div className="gameWaiting">Waiting for info from peers</div>
              )}
            </div>
          )}
          <Canvas>
            <GameRoot />
            <OrbitControls
              makeDefault
              minPolarAngle={0}
              maxPolarAngle={Math.PI / 2}
              minAzimuthAngle={azimuthAngleRestrictions[0]}
              maxAzimuthAngle={azimuthAngleRestrictions[1]}
              maxDistance={30}
              minDistance={2}
              ref={orbitalControllRef}
              enablePan={readyToShow}
              enableRotate={readyToShow}
              autoRotate={!readyToShow}
              autoRotateSpeed={4}
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
            <directionalLight intensity={Math.PI} />
            <ArenaFloor />
          </Canvas>
        </div>
        {myRole !== Role.Spectator && (
          <div>
            <button onClick={() => spawn("left")}>Spawn left</button>
            <button onClick={() => spawn("right")}>spawn right</button>
          </div>
        )}
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
        return <RenderedUnit unit={unit} key={unit.unit_key} />;
      })}
      <Box position={[0, 0, 0]} />
    </>
  );
}

function degreesToRadians(degrees: number) {
  return degrees * (Math.PI / 180);
}

function ArenaFloor() {
  return (
    <mesh position={[0, -1, 0]} rotation={[degreesToRadians(-90), 0, 0]}>
      <planeGeometry args={[14, 26]} />
      <meshStandardMaterial color={"green"} />
    </mesh>
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
      position={[unit.position.x, 0, unit.position.y]}
      onClick={(event) => setActive(!active)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={unit.team ? "red" : "blue"} />
    </mesh>
  );
}
