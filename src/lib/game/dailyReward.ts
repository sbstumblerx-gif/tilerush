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

/** Nykyinen kausi (Kausi 3 · Sienimetsä). */
export const CURRENT_SEASON = 3;

/** Kauden nimi. */
export const SEASON_NAME = "Sienimetsä";

/** Kausi 3 päättyy / uusi Tile Pass saapuu 1.12.2026 00:00 UTC. */
export const SEASON_END_UTC = Date.UTC(2026, 11, 1, 0, 0, 0);

export function msUntilSeasonEnd(): number {
  return Math.max(0, SEASON_END_UTC - Date.now());
}

export function formatDaysCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}pv ${h}h ${m}min`;
}

export function labelReward(r: DailyReward): string {
  switch (r.type) {
    case "coins": return `🪙 ${r.amount} kolikkoa`;
    case "xp": return `⭐ ${r.amount} Tile Pass XP`;
    case "heart": return `💗 Loot-sydän`;
    case "box": return `📦 Laatikko`;
  }
}
/* -------- Sienimetsä: päivittäinen ilmainen tapahtumalahja -------- */

/** Päivien lukumäärä epookista (UTC). */
export function dayIndexUtc(): number {
  return Math.floor(Date.now() / 86_400_000);
}

/** Onko tapahtuma vielä käynnissä (päättyy 1.12.2026 UTC). */
export function isEventActive(): boolean {
  return Date.now() < SEASON_END_UTC;
}

/**
 * Sienimetsä: joka päivä 3 ilmaista koria, ja joka kolmas päivä lisäksi
 * bonussieni (65 sienipistettä). Null kun kausi on päättynyt.
 */
export function eventGiftForToday(): { baskets: number; mushroomPoints: number; label: string } | null {
  if (!isEventActive()) return null;
  const bonus = dayIndexUtc() % 3 === 0;
  return bonus
    ? { baskets: 3, mushroomPoints: 65, label: "🧺 3 koria + 🍄 bonussieni (65 sp)" }
    : { baskets: 3, mushroomPoints: 0, label: "🧺 3 ilmaista koria" };
}
