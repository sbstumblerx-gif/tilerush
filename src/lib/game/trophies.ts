import type { Rarity } from "./rarity";
import { TROPHY_MAX_LEVEL, TROPHY_PER_LEVEL } from "./progress";

export type TrophyReward =
  | { kind: "coins"; amount: number }
  | { kind: "gems"; amount: number }
  | { kind: "heart"; rarity: Rarity }
  | { kind: "box"; rarity: Rarity };

/** Tasot, joilta saa laatikon. */
export const TROPHY_BOX_LEVELS = [10, 20, 30, 40, 50];
/** Tasot, joilta saa jalokiven. */
export const TROPHY_GEM_LEVELS = [7, 17, 27, 37, 47];

const BOX_RARITY: Record<number, Rarity> = {
  10: "rare",
  20: "epic",
  30: "legendary",
  40: "mythic",
  50: "ultra",
};

export function trophyRewardFor(level: number): TrophyReward {
  if (TROPHY_BOX_LEVELS.includes(level)) return { kind: "box", rarity: BOX_RARITY[level] ?? "rare" };
  if (TROPHY_GEM_LEVELS.includes(level)) return { kind: "gems", amount: 1 };
  if (level % 2 === 0) {
    const rarity: Rarity = level <= 20 ? "common" : level <= 40 ? "rare" : "epic";
    return { kind: "heart", rarity };
  }
  return { kind: "coins", amount: 300 };
}

export function trophyRewardLabel(r: TrophyReward): string {
  switch (r.kind) {
    case "coins": return `🪙 ${r.amount}`;
    case "gems": return `💎 ${r.amount} jalokivi`;
    case "heart": return `💗 Loot-sydän`;
    case "box": return `📦 Laatikko`;
  }
}

export const TROPHY_LEVELS = Array.from({ length: TROPHY_MAX_LEVEL }, (_, i) => i + 1);

/** Pokaalimäärä, joka tarvitaan annetulle tasolle. */
export function trophiesForLevel(level: number): number {
  return level * TROPHY_PER_LEVEL;
}
