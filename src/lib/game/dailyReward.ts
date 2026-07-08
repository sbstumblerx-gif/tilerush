import type { Rarity } from "./rarity";

export type DailyReward =
  | { type: "coins"; amount: number }
  | { type: "xp"; amount: number }
  | { type: "heart"; rarity: Rarity }
  | { type: "box"; rarity: Rarity };

export function todayUtc(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

function seedFrom(str: string): () => number {
  let s = 2166136261;
  for (const c of str) s = (s ^ c.charCodeAt(0)) * 16777619 >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/** Deterministic per-day pick. */
export function pickDailyReward(seedKey: string): DailyReward {
  const rnd = seedFrom(seedKey);
  const r = rnd();
  if (r < 0.4) return { type: "coins", amount: 200 };
  if (r < 0.75) return { type: "xp", amount: 150 };
  if (r < 0.95) return { type: "heart", rarity: "common" };
  return { type: "box", rarity: "common" };
}

export function msUntilUtcMidnight(): number {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return next.getTime() - now.getTime();
}

export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h}h ${m}m ${ss}s`;
}

export function labelReward(r: DailyReward): string {
  switch (r.type) {
    case "coins": return `🪙 ${r.amount} kolikkoa`;
    case "xp": return `⭐ ${r.amount} Tile Pass XP`;
    case "heart": return `💗 Loot-sydän`;
    case "box": return `📦 Laatikko`;
  }
}