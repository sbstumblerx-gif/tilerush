export type TileKind =
  | "normal"
  | "obstacle"
  | "energy"
  | "heavy"
  | "ice"
  | "portal"
  | "charger"
  | "random"
  | "enemy"
  | "launcher"
  | "start"
  | "goal";

export interface Tile {
  kind: TileKind;
  /** Portal pair id; both tiles in a pair share it. */
  portalPair?: string;
  /** For chargers: has it been consumed. */
  used?: boolean;
}

export interface Pos {
  r: number;
  c: number;
}

export interface LevelDef {
  id: number;
  name: string;
  moves: number;
  /**
   * String rows. Chars:
   * . normal   # obstacle   E energy   H heavy   I ice
   * P/Q portal pairs (two of each letter)   C charger   ? random
   * S start   G goal
   */
  grid: string[];
}

export type ItemKind = "volleyball" | "tnt";

export interface GameState {
  levelId: number;
  rows: number;
  cols: number;
  tiles: Tile[][];
  player: Pos;
  goal: Pos;
  movesLeft: number;
  items: ItemKind[];
  /** Turns of color-curse remaining (0 = inactive). Ticks after each move-consuming step. */
  curseTurns: number;
  status: "playing" | "won" | "lost";
  log: string[];
  aimingItem: ItemKind | null;
  lastRandomResult?: string;
}