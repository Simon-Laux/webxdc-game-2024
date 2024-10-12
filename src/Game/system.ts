import { sendPacket } from "../connection";
import { GamePackets } from "../types";

/** how many frames per second go over the network */
const NETWORK_FRAME_RATE = 30;
/** frame time in ms */
export const NETWORK_FRAME_TIME = 1000 / NETWORK_FRAME_RATE;

const INPUT_DELAY_FRAMES = 4;

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
  readyToShow: boolean = false;

  constructor(
    public matchId: string,
    private calculateFrame: calculateFrameFunction<GameState, InputData>,
    public randomSeed: number,
    public myRole: Role,
    initialGameState: GameState
  ) {
    if (myRole === Role.Host) {
      this.gameStates[0] = initialGameState;
      this.readyToShow = true;
    }
  }

  receiveMessage(packet: GamePackets, senderRole: Role.Host | Role.Guest) {
    if (packet.matchId !== this.matchId) {
      console.log("ignoring package for other match");
      return;
    }

    if (packet.type === "game.input") {
      this.addInput(packet.input, senderRole);
    } else if (packet.type === "game.snapshot") {
      const frame = packet.snapshot.state.networkFrame;
      if (this.gameStates[frame]) {
        // frame already exists - TODO think about what we need to do
        // maybe sth with input hash?
      } else {
        this.gameStates[frame] = packet.snapshot.state.state;
      }
      // when joining as spectator or rejoining later
      if (!this.readyToShow) {
        this.currentNetworkFrame = this.initialjoinFrame =
          packet.snapshot.state.networkFrame;
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
    this.gameStates[this.currentNetworkFrame] = this.calculateFrame(
      lastFrame,
      this.inputs[this.currentNetworkFrame]
    );
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
