import { sendPacket } from "../connection";
import { useMatchmaking } from "../systems/Matchmaking";
import { GamePackets, Payload } from "../types";

/** how many frames per second go over the network */
const NETWORK_FRAME_RATE = 30;
/** frame time in ms */
export const NETWORK_FRAME_TIME = Math.floor(1000 / NETWORK_FRAME_RATE);
const INPUT_DELAY_FRAMES = 4;
const FRAMES_UNTIL_SNAPSHOT = NETWORK_FRAME_RATE * 2;

/* hash(hash + input)
        if 2 inputs happened in same frame then sort them deteministicly */
// type hashOfInputs = string;

export interface GameState<S> {
  /** state */
  networkFrame: number;
  state: S;

  // hashOfInputs: hashOfInputs;
}

export interface Input<D> {
  networkFrame: number;
  data: D;
}

/** sent out ever so often so players can correct when input is missing */
export interface GameSnapshot<S> {
  state: GameState<S>;
}

export enum Role {
  Host,
  Guest,
  Spectator,
}

export type calculateFrameFunction<GameState, InputData> = (
  previousState: GameState,
  inputs?: { host?: InputData; guest?: InputData }
) => GameState;

// TODO: rejoining and spectating
// Host starts the game currently, how he starts needs to be modified if rejoining should be possible

export class ActiveGame<GameState, InputData> {
  /** array indexed by networkFrame, could contain items in future */
  inputs: { host?: InputData; guest?: InputData }[] = [];
  /** array indexed by networkFrame */
  gameStates: (GameState | undefined)[] = [];
  currentNetworkFrame: number = 0;
  /** how far rollback can go at most */
  initialjoinFrame = 0;
  rollBackToFrame?: number;

  // whether we have enough data to show the game yet, show loading as long as this is false
  private __readyToShow: boolean = false;
  onReadyToShow?: () => void;
  get readyToShow() {
    return this.__readyToShow;
  }
  set readyToShow(new_value) {
    this.__readyToShow = new_value;
    new_value && this.onReadyToShow?.();
  }

  constructor(
    public matchId: string,
    private calculateFrame: calculateFrameFunction<GameState, InputData>,
    public randomSeed: number,
    public myRole: Role,
    initialGameState: GameState
  ) {
    if (myRole === Role.Host && !localStorage.getItem(`match${matchId}`)) {
      this.gameStates[0] = initialGameState;
      this.readyToShow = true;
      this.sendSnapshot({
        state: initialGameState,
        networkFrame: 0,
      });
      localStorage.setItem(`match${matchId}`, "1")
    }
  }

  receiveMessage({ payload, peerId }: Payload<GamePackets>) {
    if (payload.matchId !== this.matchId) {
      console.log("ignoring package for other match");
      return;
    }

    if (payload.type === "game.input") {
      const match = useMatchmaking
        .getState()
        .runningMatches.find((match) => match.matchId === payload.matchId);
      if (!match) {
        throw new Error("match does not exist");
      }

      let senderRole: Role.Host | Role.Guest;
      if (match.guest === peerId) {
        senderRole = Role.Guest;
      } else if (match.host === peerId) {
        senderRole = Role.Host;
      } else {
        console.error(
          "sender is neither host nor guest, this should not happen",
          { match, peerId }
        );
        return;
      }

      this.addInput(payload.input, senderRole);
    } else if (payload.type === "game.snapshot") {
      const frame = payload.snapshot.state.networkFrame;
      if (this.gameStates[frame]) {
        // frame already exists - TODO think about what we need to do
        // maybe sth with input hash?
      } else {
        this.gameStates[frame] = payload.snapshot.state.state;
      }
      // when joining as spectator or rejoining later
      if (!this.readyToShow) {
        this.currentNetworkFrame = this.initialjoinFrame =
          payload.snapshot.state.networkFrame;
        this.readyToShow = true;
      }
    }
  }

  nextFrame() {
    console.log(
      "next_frame",
      this.currentNetworkFrame,
      this.rollBackToFrame,
      this.initialjoinFrame
    );
    if (!this.readyToShow) {
      console.log(
        "next frame failed, not ready to show yet. if yoingn as guest or spectator you need to wait for a gamesnapshot packet"
      );

      return;
    }

    if (this.rollBackToFrame) {
      let framePointer = Math.min(this.rollBackToFrame, this.initialjoinFrame);
      // recalculate previous frames
      while (framePointer <= this.currentNetworkFrame) {
        const lastFrame = this.gameStates[this.currentNetworkFrame - 1];
        if (!lastFrame) {
          throw new Error("last frame is undefined, this should not happen");
        }
        this.gameStates[this.currentNetworkFrame] = this.calculateFrame(
          lastFrame,
          this.inputs[this.currentNetworkFrame]
        );
      }
      this.rollBackToFrame = undefined;
    }
    this.currentNetworkFrame++;
    const lastFrame = this.gameStates[this.currentNetworkFrame - 1];
    if (!lastFrame) {
      throw new Error("last frame is undefined, this should not happen");
    }
    const newGameState = this.calculateFrame(
      lastFrame,
      this.inputs[this.currentNetworkFrame]
    );
    this.gameStates[this.currentNetworkFrame] = newGameState;

    if (
      this.myRole !== Role.Spectator &&
      this.currentNetworkFrame % FRAMES_UNTIL_SNAPSHOT === 0
    ) {
      console.log("sending snapshot", this.currentNetworkFrame);
      this.sendSnapshot({
        state: newGameState,
        networkFrame: this.currentNetworkFrame,
      });
    }
  }

  sendSnapshot(snapshotState: GameSnapshot<GameState>["state"]) {
    sendPacket({
      type: "game.snapshot",
      matchId: this.matchId,
      snapshot: {
        state: snapshotState,
      },
    });
  }

  addInput(inputPackage: Input<InputData>, sender: Role.Host | Role.Guest) {
    const previousData = this.inputs[inputPackage.networkFrame];
    if (previousData && this.currentNetworkFrame > inputPackage.networkFrame) {
      this.rollBackToFrame = inputPackage.networkFrame;
    }
    this.inputs[inputPackage.networkFrame] = {
      ...(previousData || {}),
      [sender === Role.Host ? "host" : "guest"]: inputPackage.data,
    };
  }

  sendInput(data: InputData) {
    if (this.myRole === Role.Spectator) {
      throw new Error("spectators can't play");
    }
    const inputPackage: Input<InputData> = {
      networkFrame: this.currentNetworkFrame + INPUT_DELAY_FRAMES,
      data,
    };
    // send directly
    sendPacket({
      type: "game.input",
      matchId: this.matchId,
      input: inputPackage,
    });

    // TODO send
    this.addInput(inputPackage, this.myRole);
  }
}
