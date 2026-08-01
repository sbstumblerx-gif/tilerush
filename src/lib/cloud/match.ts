import { LEVELS } from "@/lib/game/levels";
import { PACKS } from "@/lib/game/packs";

/** Aikaraja per kierros (ms). */
export const ROUND_MS = 45_000;
/** Kierroksen tulosnäkymän kesto (ms). */
export const RESULTS_MS = 7_000;
/** Pistetaulukon kesto kierrosten välissä (ms). */
export const STANDINGS_MS = 6_000;
export const MAX_PLAYERS = 8;
export const MAX_ROUNDS = 50;

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Deterministinen tason valinta koodin + kierroksen perusteella. */
export function pickRoundLevel(code: string, round: number, packs: number[]): number {
  const pool = packs.length
    ? PACKS.filter((p) => packs.includes(p.id)).flatMap((p) => p.levelIds)
    : LEVELS.map((l) => l.id);
  const safe = pool.length ? pool : LEVELS.map((l) => l.id);
  return safe[hash(`${code}:${round}`) % safe.length];
}

export interface RoundResult {
  userId: string;
  movesLeft: number;
  timeMs: number;
  dnf: boolean;
}

/** Eniten siirtoja jäljellä voittaa; tasapelissä nopeampi aika. DNF viimeisenä. */
export function rankResults(results: RoundResult[]): RoundResult[] {
  return [...results].sort((a, b) => {
    if (a.dnf !== b.dnf) return a.dnf ? 1 : -1;
    if (a.dnf && b.dnf) return a.timeMs - b.timeMs;
    if (b.movesLeft !== a.movesLeft) return b.movesLeft - a.movesLeft;
    return a.timeMs - b.timeMs;
  });
}

export function formatMs(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  return `${s.toFixed(2)} s`;
}

export type MatchPhase = "lobby" | "round" | "results" | "standings" | "final";

export interface MatchSnapshot {
  phase: MatchPhase;
  round: number;
  totalRounds: number;
  levelId: number;
  startAt: number;
  scores: Record<string, number>;
  results: RoundResult[];
}
