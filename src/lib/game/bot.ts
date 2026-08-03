import type { LevelDef } from "./types";
import { ROUND_MS } from "@/lib/cloud/match";

const COST: Record<string, number> = {
  ".": 1, S: 1, G: 1, E: 0, H: 2, I: 1, C: 1, "?": 1, X: 1, L: 1, P: 1, Q: 1,
};

/** Halvin reitti lähdöstä maaliin (Dijkstra, arvioiva – ei huomioi liukuja/portaaleja). */
export function cheapestPathCost(level: LevelDef): number | null {
  const rows = level.grid.length;
  const cols = Math.max(...level.grid.map((r) => r.length));
  const at = (r: number, c: number) => (level.grid[r] ?? "").padEnd(cols, ".")[c] ?? "#";

  let start: [number, number] | null = null;
  let goal: [number, number] | null = null;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (at(r, c) === "S") start = [r, c];
      if (at(r, c) === "G") goal = [r, c];
    }
  }
  if (!start || !goal) return null;

  const dist = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
  dist[start[0]][start[1]] = 0;
  const queue: [number, number][] = [start];
  while (queue.length) {
    // pieni ruudukko → lineaarinen minimin haku riittää
    let bi = 0;
    for (let i = 1; i < queue.length; i++) {
      const [ar, ac] = queue[i];
      const [br, bc] = queue[bi];
      if (dist[ar][ac] < dist[br][bc]) bi = i;
    }
    const [r, c] = queue.splice(bi, 1)[0];
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
      const ch = at(nr, nc);
      if (ch === "#") continue;
      const step = COST[ch] ?? 1;
      const nd = dist[r][c] + step;
      if (nd < dist[nr][nc]) {
        dist[nr][nc] = nd;
        queue.push([nr, nc]);
      }
    }
  }
  const best = dist[goal[0]][goal[1]];
  return Number.isFinite(best) ? best : null;
}

export interface BotResult {
  movesLeft: number;
  timeMs: number;
  dnf: boolean;
}

/**
 * Simuloi bottivastustajan suoritus: ei täydellinen reitinlöytäjä, mutta ei
 * myöskään täysin hukassa. Käyttää 15–70 % ylimääräisiä siirtoja optimiin nähden.
 */
export function simulateBot(level: LevelDef): BotResult {
  const optimal = cheapestPathCost(level);
  if (optimal == null) return { movesLeft: 0, timeMs: ROUND_MS, dnf: true };

  const skill = 0.3 + Math.random() * 0.55; // 0.30–0.85
  const waste = 1 + (1 - skill) * 0.8; // 1.12–1.56
  const used = Math.ceil(optimal * waste) + (Math.random() < 0.35 ? 1 : 0);
  const movesLeft = level.moves - used;

  // Pieni mahdollisuus, että botti mokaa kokonaan
  const blunder = Math.random() < 0.08;
  if (movesLeft < 0 || blunder) return { movesLeft: 0, timeMs: ROUND_MS, dnf: true };

  const base = 7000 + (1 - skill) * 16000;
  const timeMs = Math.min(ROUND_MS - 1500, Math.round(base + Math.random() * 9000));
  return { movesLeft, timeMs, dnf: false };
}

const BOT_NAMES = [
  "Tiilipöllö", "Ruutu-Rane", "NeonNiilo", "Laattamestari", "Pikku-Piksel",
  "Siirto-Sisu", "Kuutio-Kaisa", "Bittibotti", "Nopsa-Nea", "Ruudukko-Roni",
];

export function randomBotName(): string {
  return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
}

export const BOT_ID = "bot";
