import type { GameState, LevelDef, Pos, Tile, TileKind } from "./types";

const CHAR_MAP: Record<string, TileKind | "portalP" | "portalQ"> = {
  ".": "normal",
  "#": "obstacle",
  E: "energy",
  H: "heavy",
  I: "ice",
  C: "charger",
  "?": "random",
  X: "enemy",
  L: "launcher",
  S: "start",
  G: "goal",
  P: "portalP",
  Q: "portalQ",
};

export function createState(level: LevelDef): GameState {
  const rows = level.grid.length;
  const cols = Math.max(...level.grid.map((r) => r.length));
  const tiles: Tile[][] = [];
  let player: Pos = { r: 0, c: 0 };
  let goal: Pos = { r: 0, c: 0 };

  for (let r = 0; r < rows; r++) {
    const row: Tile[] = [];
    const raw = level.grid[r].padEnd(cols, ".");
    for (let c = 0; c < cols; c++) {
      const ch = raw[c];
      const mapped = CHAR_MAP[ch] ?? "normal";
      if (mapped === "start") {
        player = { r, c };
        row.push({ kind: "normal" });
      } else if (mapped === "goal") {
        goal = { r, c };
        row.push({ kind: "goal" });
      } else if (mapped === "portalP") {
        row.push({ kind: "portal", portalPair: "P" });
      } else if (mapped === "portalQ") {
        row.push({ kind: "portal", portalPair: "Q" });
      } else {
        row.push({ kind: mapped });
      }
    }
    tiles.push(row);
  }

  return {
    levelId: level.id,
    rows,
    cols,
    tiles,
    player,
    goal,
    movesLeft: level.moves,
    items: [],
    curseTurns: 0,
    status: "playing",
    log: [`Taso ${level.id}: ${level.name}`],
    aimingItem: null,
  };
}

function inBounds(s: GameState, p: Pos): boolean {
  return p.r >= 0 && p.r < s.rows && p.c >= 0 && p.c < s.cols;
}

function adjacent(a: Pos, b: Pos): boolean {
  const dr = Math.abs(a.r - b.r);
  const dc = Math.abs(a.c - b.c);
  return dr + dc === 1;
}

function effectiveKind(tile: Tile, curseTurns: number): TileKind {
  if (curseTurns > 0 && tile.kind === "normal") return "heavy";
  return tile.kind;
}

export function stepCost(tile: Tile, curseTurns: number): number {
  const k = effectiveKind(tile, curseTurns);
  switch (k) {
    case "energy":
      return 0;
    case "heavy":
      return 2;
    case "obstacle":
      return Infinity;
    default:
      return 1;
  }
}

function findPortalPartner(s: GameState, p: Pos): Pos | null {
  const tile = s.tiles[p.r][p.c];
  if (tile.kind !== "portal" || !tile.portalPair) return null;
  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      if (r === p.r && c === p.c) continue;
      const t = s.tiles[r][c];
      if (t.kind === "portal" && t.portalPair === tile.portalPair) {
        return { r, c };
      }
    }
  }
  return null;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function inEnemyAura(s: GameState, p: Pos): boolean {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = p.r + dr;
      const c = p.c + dc;
      if (r < 0 || r >= s.rows || c < 0 || c >= s.cols) continue;
      if (s.tiles[r][c].kind === "enemy") return true;
    }
  }
  return false;
}

/** After entering a tile, resolve its effect and possible chain (ice slide, portal). */
function resolveEnter(s: GameState): void {
  let guard = 0;
  while (guard++ < 20 && s.status === "playing") {
    const p = s.player;
    const tile = s.tiles[p.r][p.c];

    if (p.r === s.goal.r && p.c === s.goal.c) {
      s.status = "won";
      s.log.push("🏁 Maali saavutettu!");
      return;
    }

    if (tile.kind === "launcher") {
      tile.kind = "normal";
      const dirs: Pos[] = [
        { r: -1, c: 0 },
        { r: 1, c: 0 },
        { r: 0, c: -1 },
        { r: 0, c: 1 },
      ];
      const d = randomChoice(dirs);
      let cur = { ...p };
      for (let step = 0; step < 3; step++) {
        const nxt = { r: cur.r + d.r, c: cur.c + d.c };
        if (!inBounds(s, nxt)) break;
        if (s.tiles[nxt.r][nxt.c].kind === "obstacle") break;
        cur = nxt;
      }
      s.player = cur;
      s.log.push("🟨 Laukaisu!");
      continue;
    }

    if (tile.kind === "charger" && !tile.used) {
      tile.used = true;
      tile.kind = "normal";
      s.movesLeft += 5;
      s.log.push("🟧 Lataus: +5 siirtoa");
      continue;
    }

    if (tile.kind === "random") {
      tile.kind = "normal";
      const roll = Math.random();
      if (roll < 0.35) {
        s.movesLeft += 3;
        s.lastRandomResult = "+3 siirtoa";
        s.log.push("❓ +3 siirtoa");
      } else if (roll < 0.55) {
        s.items.push("volleyball");
        s.lastRandomResult = "🎾 lentopallo";
        s.log.push("❓ Sait lentopallon!");
      } else if (roll < 0.8) {
        s.movesLeft = Math.max(0, s.movesLeft - 5);
        s.lastRandomResult = "−5 siirtoa";
        s.log.push("❓ −5 siirtoa");
      } else {
        s.curseTurns = 3;
        s.lastRandomResult = "värikirous";
        s.log.push("❓ Värikirous 3 vuoroksi!");
      }
      if (s.movesLeft <= 0 && s.status === "playing") {
        s.status = "lost";
        s.log.push("💀 Siirrot loppuivat");
        return;
      }
      continue;
    }

    if (tile.kind === "portal") {
      const partner = findPortalPartner(s, p);
      if (partner) {
        s.player = partner;
        s.log.push("🟦 Teleportti");
        continue;
      }
    }

    if (tile.kind === "ice") {
      // Slide to a random adjacent non-obstacle tile (free).
      const dirs: Pos[] = [
        { r: p.r - 1, c: p.c },
        { r: p.r + 1, c: p.c },
        { r: p.r, c: p.c - 1 },
        { r: p.r, c: p.c + 1 },
      ].filter(
        (q) => inBounds(s, q) && s.tiles[q.r][q.c].kind !== "obstacle",
      );
      if (dirs.length === 0) return;
      const target = randomChoice(dirs);
      s.player = target;
      s.log.push("🩵 Liukuma");
      continue;
    }

    return;
  }
}

function tickCurse(s: GameState): void {
  if (s.curseTurns > 0) {
    s.curseTurns -= 1;
    if (s.curseTurns === 0) s.log.push("Värikirous purkautui");
  }
}

function tickEnemyAura(s: GameState): void {
  if (s.status !== "playing") return;
  if (inEnemyAura(s, s.player)) {
    s.movesLeft = Math.max(0, s.movesLeft - 3);
    s.log.push("💗 Vihollisaura −3 siirtoa");
  }
}

function checkLoss(s: GameState): void {
  if (s.status !== "playing") return;
  if (s.movesLeft <= 0) {
    // Check if standing on goal already (won handled elsewhere)
    s.status = "lost";
    s.log.push("💀 Siirrot loppuivat");
  }
}

export function tryMove(state: GameState, target: Pos): GameState {
  if (state.status !== "playing") return state;
  if (!inBounds(state, target)) return state;
  if (!adjacent(state.player, target)) return state;
  const tile = state.tiles[target.r][target.c];
  const cost = stepCost(tile, state.curseTurns);
  if (!isFinite(cost)) return state;
  if (cost > state.movesLeft) return state;

  const next: GameState = deepClone(state);
  next.movesLeft -= cost;
  next.player = target;
  next.aimingItem = null;
  resolveEnter(next);
  tickEnemyAura(next);
  if (cost > 0) tickCurse(next);
  checkLoss(next);
  return next;
}

/** Volleyball: jump 2 tiles cardinal, ignoring obstacles between. Consumes item and 1 move. */
export function tryVolleyball(state: GameState, target: Pos): GameState {
  if (state.status !== "playing") return state;
  if (!state.items.includes("volleyball")) return state;
  const dr = target.r - state.player.r;
  const dc = target.c - state.player.c;
  const straight =
    (Math.abs(dr) === 2 && dc === 0) || (Math.abs(dc) === 2 && dr === 0);
  if (!straight) return state;
  if (!inBounds(state, target)) return state;
  const landing = state.tiles[target.r][target.c];
  if (landing.kind === "obstacle") return state;
  if (state.movesLeft < 1) return state;

  const next: GameState = deepClone(state);
  next.items.splice(next.items.indexOf("volleyball"), 1);
  next.movesLeft -= 1;
  next.player = target;
  next.aimingItem = null;
  next.log.push("🎾 Lentopallohyppy");
  resolveEnter(next);
  tickEnemyAura(next);
  tickCurse(next);
  checkLoss(next);
  return next;
}

export function selectItem(state: GameState, item: "volleyball"): GameState {
  if (state.status !== "playing") return state;
  if (!state.items.includes(item)) return state;
  return { ...state, aimingItem: state.aimingItem === item ? null : item };
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export function displayKind(state: GameState, r: number, c: number): TileKind {
  const t = state.tiles[r][c];
  return effectiveKind(t, state.curseTurns);
}