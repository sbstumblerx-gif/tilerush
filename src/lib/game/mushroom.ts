import type { Rarity } from "./rarity";
import type { CosmeticCategory } from "./cosmetics";

/** Kausi 3 · Sienimetsä */

export const POINTS_PER_LEVEL = 200;
export const MUSHROOM_LEVELS = 8;
/** Kaikkien tasojen jälkeen: joka 400 sienipisteestä ultralaatikko. */
export const BONUS_STEP = 400;
export const FOREST_SIZE = 50;
/** Päivittäin jaettavat ilmaiset korit. */
export const DAILY_BASKETS = 3;

export interface ForestCell {
  /** Etukäteen arvotut sienipisteet (näkyvät vasta poimimisen jälkeen). */
  points: number;
  picked: boolean;
}

/** 10x25, 10x40, 10x65, 10x80, 10x100 – sekoitettuna. */
export function generateForest(): ForestCell[] {
  const pool: number[] = [];
  for (const v of [25, 40, 65, 80, 100]) for (let i = 0; i < 10; i++) pool.push(v);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.map((points) => ({ points, picked: false }));
}

export interface LevelContainer {
  kind: "box" | "heart";
  rarity: Rarity;
  count: number;
}

export interface MushroomLevel {
  level: number;
  containers: LevelContainer[];
  cosmetic: { category: CosmeticCategory; itemId: string; rarity: Rarity };
}

export const MUSHROOM_TRACK: MushroomLevel[] = [
  {
    level: 1,
    containers: [{ kind: "heart", rarity: "common", count: 2 }],
    cosmetic: { category: "emojis", itemId: "ev-mushroom", rarity: "epic" },
  },
  {
    level: 2,
    containers: [{ kind: "box", rarity: "common", count: 1 }],
    cosmetic: { category: "themes", itemId: "ruska", rarity: "epic" },
  },
  {
    level: 3,
    containers: [{ kind: "box", rarity: "epic", count: 1 }],
    cosmetic: { category: "accessories", itemId: "acc-mushroom", rarity: "legendary" },
  },
  {
    level: 4,
    containers: [{ kind: "box", rarity: "legendary", count: 1 }],
    cosmetic: { category: "shapes", itemId: "lehti", rarity: "mythic" },
  },
  {
    level: 5,
    containers: [{ kind: "box", rarity: "mythic", count: 1 }],
    cosmetic: { category: "patterns", itemId: "lehtikuvio", rarity: "legendary" },
  },
  {
    level: 6,
    containers: [{ kind: "box", rarity: "ultra", count: 1 }],
    cosmetic: { category: "emojis", itemId: "ev-leaf", rarity: "legendary" },
  },
  {
    level: 7,
    containers: [{ kind: "box", rarity: "ultra", count: 2 }],
    cosmetic: { category: "avatars", itemId: "av-mushroom", rarity: "legendary" },
  },
  {
    level: 8,
    containers: [{ kind: "box", rarity: "ultra", count: 3 }],
    cosmetic: { category: "accessories", itemId: "acc-leaf", rarity: "legendary" },
  },
];

/** Palkkiotason kynnys (sienipisteet). */
export function levelThreshold(level: number): number {
  return level * POINTS_PER_LEVEL;
}

/** Montako palkkiotasoa on jo saavutettu näillä pisteillä. */
export function reachedLevels(points: number): number {
  return Math.min(MUSHROOM_LEVELS, Math.floor(points / POINTS_PER_LEVEL));
}

/** Bonuskynnys n = 1,2,3… → 1600 + n*400 pistettä. */
export function bonusThreshold(n: number): number {
  return MUSHROOM_LEVELS * POINTS_PER_LEVEL + n * BONUS_STEP;
}

/** Montako bonus-ultralaatikkoa on ansaittu (tasojen jälkeen). */
export function reachedBonuses(points: number): number {
  const over = points - MUSHROOM_LEVELS * POINTS_PER_LEVEL;
  return over <= 0 ? 0 : Math.floor(over / BONUS_STEP);
}

/** Tile Passin sieni: kiinteä pistemäärä, joka näkyy jo etukäteen. */
export function passMushroomPoints(tier: number): number {
  const table = [25, 40, 65, 80, 100];
  return table[Math.floor(tier / 12) % table.length];
}
