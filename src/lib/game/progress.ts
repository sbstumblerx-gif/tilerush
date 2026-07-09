import type { Reward } from "./lootbox";

const KEY = "tilerush.progress.v3";
const OLD_KEYS = ["tilerush.progress.v2"];

export interface Stats {
  starts: number;
  totalMoves: number;
  wins: number;
  losses: number;
  stars: number;
  tileUses: Record<string, number>;
  itemUses: number;
  volleyGoals: number;
  enemySteps: number;
  randomGains: number;
}

export interface Equipped {
  color: string;
  shape: string;
  pattern: string;
  accessory: string;
  theme: string;
  /** 4 emoji reactions the player can flash mid-game / on profile. */
  emojis: string[];
}

export interface Owned {
  colors: string[];
  shapes: string[];
  patterns: string[];
  accessories: string[];
  themes: string[];
}

export interface DailyTask {
  id: string;
  label: string;
  target: number;
  progress: number;
  reward: number;
  claimed: boolean;
}

export interface DailyTasks {
  date: string; // YYYY-MM-DD
  tasks: DailyTask[];
}

export interface WeeklyTask extends DailyTask {}
export interface WeeklyTasks {
  weekKey: string; // ISO week start (YYYY-MM-DD, Monday UTC)
  tasks: WeeklyTask[];
  packsCompletedThisWeek: number;
}

export interface Inventory {
  boxes: { id: string; rarity: import("./rarity").Rarity }[];
  hearts: { id: string; rarity: import("./rarity").Rarity }[];
}

export interface Settings {
  music: number;
  sfx: number;
  blockFriendRequests?: boolean;
  muteChat?: boolean;
}

export interface Profile {
  username: string;
  friendCode: string;
}

export interface Friends {
  list: { code: string; username: string }[];
  incoming: { code: string; username: string }[];
  outgoing: { code: string; username: string }[];
}

export interface TileCupTask {
  id: string;
  label: string;
  target: number;
  progress: number;
  reward: string;
  claimed: boolean;
}

export interface Progress {
  completed: number[];
  coins: number;
  stars: Record<number, number>; // per level best
  stats: Stats;
  passLevel: number; // 0..60
  claimedPass: number[];
  /** XP accumulated toward current pass tier (rolls over between tiers). */
  passXp: number;
  /** XP accumulated toward post-60 prestige boxes (every 500 XP → box). */
  prestigeXp: number;
  /** Levels completed during the current pass season (for +10 XP counting only new ones this season). */
  passSeasonLevels: number[];
  /** Packs completed during current pass season (+40 XP each). */
  passSeasonPacks: number[];
  owned: Owned;
  equipped: Equipped;
  daily?: DailyTasks;
  weekly?: WeeklyTasks;
  inventory: Inventory;
  pendingRewards: Reward[];
  settings: Settings;
  profile: Profile;
  friends: Friends;
  /** ISO date YYYY-MM-DD of last claimed daily shop reward (UTC). */
  lastDailyClaim?: string;
  /** v4.5: redeemed promo codes (case-insensitive). */
  promoRedeemed: string[];
  /** v4.5: purchased quarter-finalist team offer ids. */
  teamOffersPurchased: string[];
  tileCup: {
    goals: number;
    volleyUses: number;
    tasks: TileCupTask[];
  };
}

function randomCode(len: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const DEFAULT: Progress = {
  completed: [],
  coins: 0,
  stars: {},
  stats: {
    starts: 0,
    totalMoves: 0,
    wins: 0,
    losses: 0,
    stars: 0,
    tileUses: {},
    itemUses: 0,
    volleyGoals: 0,
    enemySteps: 0,
    randomGains: 0,
  },
  passLevel: 0,
  claimedPass: [],
  passXp: 0,
  prestigeXp: 0,
  passSeasonLevels: [],
  passSeasonPacks: [],
  owned: {
    colors: ["cyan"],
    shapes: ["circle"],
    patterns: ["none"],
    accessories: ["none"],
    themes: ["default"],
  },
  equipped: {
    color: "cyan",
    shape: "circle",
    pattern: "none",
    accessory: "none",
    theme: "default",
    emojis: ["🎮", "⚡", "🌟", "🏆"],
  },
  tileCup: {
    goals: 0,
    volleyUses: 0,
    tasks: [
      { id: "vb10", label: "Käytä lentopalloa 10 kertaa", target: 10, progress: 0, reward: "kuvio: FIFA-pallo", claimed: false },
      { id: "g20", label: "Tee 20 maalia Tile Cupissa", target: 20, progress: 0, reward: "asuste: keltainen kortti", claimed: false },
      { id: "g50", label: "Tee 50 maalia Tile Cupissa", target: 50, progress: 0, reward: "asuste: punainen kortti", claimed: false },
      { id: "g75", label: "Tee 75 maalia Tile Cupissa", target: 75, progress: 0, reward: "taustakuva: jalkapallokenttä", claimed: false },
      { id: "g100", label: "Tee 100 maalia Tile Cupissa", target: 100, progress: 0, reward: "🪙 500 kolikoita", claimed: false },
      { id: "vb25", label: "Käytä lentopalloa 25 kertaa", target: 25, progress: 0, reward: "🪙 200 kolikoita", claimed: false },
    ],
  },
  inventory: { boxes: [], hearts: [] },
  pendingRewards: [],
  settings: { music: 0.4, sfx: 0.7, blockFriendRequests: false, muteChat: false },
  profile: { username: "Pelaaja", friendCode: "" },
  friends: { list: [], incoming: [], outgoing: [] },
  promoRedeemed: [],
  teamOffersPurchased: [],
};

export function loadProgress(): Progress {
  if (typeof window === "undefined") return DEFAULT;
  try {
    let raw = window.localStorage.getItem(KEY);
    if (!raw) {
      // migrate from older versions
      for (const k of OLD_KEYS) {
        const old = window.localStorage.getItem(k);
        if (old) {
          raw = old;
          break;
        }
      }
    }
    if (!raw) {
      const seeded = { ...DEFAULT, profile: { ...DEFAULT.profile, friendCode: randomCode(6) } };
      saveProgress(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw) as Partial<Progress>;
    const merged: Progress = {
      ...DEFAULT,
      ...parsed,
      stats: { ...DEFAULT.stats, ...(parsed.stats ?? {}), tileUses: { ...(parsed.stats?.tileUses ?? {}) } },
      owned: { ...DEFAULT.owned, ...(parsed.owned ?? {}) },
      equipped: { ...DEFAULT.equipped, ...(parsed.equipped ?? {}) },
      tileCup: {
        ...DEFAULT.tileCup,
        ...(parsed.tileCup ?? {}),
        tasks: mergeTileCupTasks(parsed.tileCup?.tasks),
      },
      inventory: parsed.inventory ?? { boxes: [], hearts: [] },
      pendingRewards: parsed.pendingRewards ?? [],
      settings: { ...DEFAULT.settings, ...(parsed.settings ?? {}) },
      profile: { ...DEFAULT.profile, ...(parsed.profile ?? {}) },
      friends: { ...DEFAULT.friends, ...(parsed.friends ?? {}) },
      passXp: parsed.passXp ?? 0,
      prestigeXp: parsed.prestigeXp ?? 0,
      passSeasonLevels: parsed.passSeasonLevels ?? [],
      passSeasonPacks: parsed.passSeasonPacks ?? [],
      lastDailyClaim: parsed.lastDailyClaim,
      weekly: parsed.weekly,
      promoRedeemed: parsed.promoRedeemed ?? [],
      teamOffersPurchased: parsed.teamOffersPurchased ?? [],
    };
    if (!merged.profile.friendCode) merged.profile.friendCode = randomCode(6);
    if (!merged.equipped.emojis || merged.equipped.emojis.length !== 4) {
      merged.equipped.emojis = DEFAULT.equipped.emojis.slice();
    }
    return merged;
  } catch {
    return { ...DEFAULT };
  }
}

/** Merge stored tile-cup tasks with defaults so newly-added task ids appear for existing users. */
function mergeTileCupTasks(stored: TileCupTask[] | undefined): TileCupTask[] {
  const base = DEFAULT.tileCup.tasks;
  if (!stored) return base.map((t) => ({ ...t }));
  const byId = new Map(stored.map((t) => [t.id, t]));
  return base.map((t) => byId.get(t.id) ?? { ...t });
}

export function saveProgress(p: Progress): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new Event("tilerush:progress"));
}

export function updateProgress(mut: (p: Progress) => void): Progress {
  const p = loadProgress();
  mut(p);
  saveProgress(p);
  return p;
}

export function markComplete(levelId: number, opts: { movesLeft: number; totalMoves: number; stars: number }): void {
  updateProgress((p) => {
    const wasCompleted = p.completed.includes(levelId);
    if (!p.completed.includes(levelId)) p.completed.push(levelId);
    if ((p.stars[levelId] ?? 0) < opts.stars) {
      p.stats.stars += opts.stars - (p.stars[levelId] ?? 0);
      p.stars[levelId] = opts.stars;
    }
    p.stats.wins += 1;
    p.stats.totalMoves += opts.totalMoves;
    // Tile Pass 4.0: +10 XP per new level in current season
    if (!wasCompleted && !p.passSeasonLevels.includes(levelId)) {
      p.passSeasonLevels.push(levelId);
      addPassXp(p, 10);
    }
    if (!wasCompleted) {
      const rar = (levelId <= 30 ? "common" : levelId <= 60 ? "rare" : "epic") as import("./rarity").Rarity;
      p.inventory.hearts.push({ id: `heart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, rarity: rar });
    }
  });
}

/** XP needed to advance a Tile Pass tier (from level -> level+1). */
export function xpForTier(currentLevel: number): number {
  const t = currentLevel + 1; // XP required to REACH t
  if (t <= 10) return 50;
  if (t <= 20) return 75;
  if (t <= 30) return 125;
  if (t <= 40) return 150;
  if (t <= 50) return 175;
  if (t <= 60) return 200;
  return 500; // prestige loops after 60
}

/** Add XP to the pass. Advances tiers automatically; after tier 60 accumulates as prestigeXp
 *  and awards a common box every 500 XP (upgradable). */
export function addPassXp(p: Progress, amount: number): void {
  if (amount <= 0) return;
  let remaining = amount;
  while (remaining > 0) {
    if (p.passLevel < 60) {
      const need = xpForTier(p.passLevel) - p.passXp;
      if (remaining >= need) {
        remaining -= need;
        p.passLevel += 1;
        p.passXp = 0;
      } else {
        p.passXp += remaining;
        remaining = 0;
      }
    } else {
      // prestige
      const need = 500 - p.prestigeXp;
      if (remaining >= need) {
        remaining -= need;
        p.prestigeXp = 0;
        p.inventory.boxes.push({ id: `box-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, rarity: "common" });
      } else {
        p.prestigeXp += remaining;
        remaining = 0;
      }
    }
  }
}

/** Award XP for a pack completion (once per pack per season). */
export function awardPackCompletion(p: Progress, packId: number): boolean {
  if (p.passSeasonPacks.includes(packId)) return false;
  p.passSeasonPacks.push(packId);
  addPassXp(p, 40);
  return true;
}

export function resetAllProgress(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  for (const k of OLD_KEYS) window.localStorage.removeItem(k);
  window.localStorage.removeItem("tilerush.sound.v1");
  window.dispatchEvent(new Event("tilerush:progress"));
}

export function markLoss(totalMoves: number): void {
  updateProgress((p) => {
    p.stats.losses += 1;
    p.stats.totalMoves += totalMoves;
  });
}

export function markStart(): void {
  updateProgress((p) => {
    p.stats.starts += 1;
  });
}

export function isUnlocked(levelId: number, completed: number[]): boolean {
  if (levelId === 1) return true;
  return completed.includes(levelId - 1);
}

export function firstUnfinished(completed: number[], allIds: number[]): number {
  for (const id of allIds) if (!completed.includes(id)) return id;
  return allIds[allIds.length - 1];
}

export function calcStars(movesLeft: number, totalMoves: number): number {
  const ratio = movesLeft / totalMoves;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}