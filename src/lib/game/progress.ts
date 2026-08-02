import type { Reward } from "./lootbox";
import { CURRENT_SEASON } from "./dailyReward";

const KEY = "tilerush.progress.v3";
const OLD_KEYS = ["tilerush.progress.v2"];

// Versiointitunniste passi-nollaukselle (vaihtaminen laukaisee passin nollauksen kaikilla pelaajilla)
const PASS_RESET_VERSION = "v3_force_reset_all";

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
  avatar?: string;
  emojis?: string[];
}

export interface Owned {
  colors: string[];
  shapes: string[];
  patterns: string[];
  accessories: string[];
  themes: string[];
  emojis: string[];
  avatars: string[];
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
  date: string;
  tasks: DailyTask[];
}

export interface WeeklyTask extends DailyTask {}
export interface WeeklyTasks {
  weekKey: string;
  tasks: WeeklyTask[];
  packsCompletedThisWeek: number;
}

export interface Inventory {
  boxes: { id: string; rarity: import("./rarity").Rarity }[];
  hearts: { id: string; rarity: import("./rarity").Rarity }[];
  backpacks?: { id: string }[];
}

export interface LockerCell {
  reward: "key" | "backpack" | "coins" | "heart" | "box";
  opened: boolean;
}

export interface Settings {
  music: number;
  sfx: number;
  blockFriendRequests?: boolean;
  muteChat?: boolean;
  showEmojis?: boolean;
}

export interface Profile {
  username: string;
  friendCode: string;
  profilePic?: string;
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
  stars: Record<number, number>;
  stats: Stats;
  passLevel: number;
  claimedPass: number[];
  passXp: number;
  prestigeXp: number;
  passSeasonLevels: number[];
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
  lastDailyClaim?: string;
  promoRedeemed: string[];
  teamOffersPurchased: string[];
  season?: number;
  keys?: number;
  locker?: LockerCell[];
  lastKeyOfferClaim?: string;
  passResetVersion?: string;
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
    emojis: [],
    avatars: ["default"],
  },
  equipped: {
    color: "cyan",
    shape: "circle",
    pattern: "none",
    accessory: "none",
    theme: "default",
    avatar: "default",
    emojis: ["😭", "😃", "😅", "👍"],
  },
  tileCup: {
    goals: 0,
    volleyUses: 0,
    tasks: [
      { id: "vb10", label: "Käytä lentopalloa 10 kertaa", target: 10, progress: 0, reward: "kuvio: FIFA-pallo", claimed: false },
      { id: "g20", label: "Tee 20 maalia Tile Cupissa", target: 20, progress: 0, reward: "asuste: keltainen kortti", claimed: false },
      { id: "g50", label: "Tee 50 maalia Tile Cupissa", target: 50, progress: 0, reward: "asuste: punainen kortti", claimed: false },
      { id: "g75", label: "Tee 75 maalia Tile Cupissa", target: 75, progress: 0, reward: "taustakuva: jalkapallokenttä", claimed: false },
      { id: "g100", label: "Tee 100 maalia Tile Cupissa", target: 100, progress: 0, reward: "🪙 500 kolikot", claimed: false },
      { id: "vb25", label: "Käytä lentopalloa 25 kertaa", target: 25, progress: 0, reward: "🪙 200 kolikot", claimed: false },
    ],
  },
  inventory: { boxes: [], hearts: [] },
  season: CURRENT_SEASON,
  keys: 0,
  locker: [],
  pendingRewards: [],
  settings: { music: 0.4, sfx: 0.7, blockFriendRequests: false, muteChat: false, showEmojis: true },
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
      for (const k of OLD_KEYS) {
        const old = window.localStorage.getItem(k);
        if (old) {
          raw = old;
          break;
        }
      }
    }
    if (!raw) {
      const seeded = { ...DEFAULT, passResetVersion: PASS_RESET_VERSION, profile: { ...DEFAULT.profile, friendCode: randomCode(6) } };
      saveProgress(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw) as Partial<Progress>;
    const merged: Progress = {
      ...DEFAULT,
      ...parsed,
      stats: { ...DEFAULT.stats, ...(parsed.stats ?? {}) },
      owned: { ...DEFAULT.owned, ...(parsed.owned ?? {}) },
      equipped: { ...DEFAULT.equipped, ...(parsed.equipped ?? {}) },
      tileCup: {
        ...DEFAULT.tileCup,
        ...(parsed.tileCup ?? {}),
        tasks: mergeTileCupTasks(parsed.tileCup?.tasks),
      },
      inventory: {
        boxes: parsed.inventory?.boxes ?? [],
        hearts: parsed.inventory?.hearts ?? [],
        backpacks: parsed.inventory?.backpacks ?? [],
      },
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
    
    if (!merged.owned.avatars) merged.owned.avatars = ["default"];
    if (!merged.owned.emojis) merged.owned.emojis = [];
    if (!merged.equipped.avatar) {
      merged.equipped.avatar = merged.profile.profilePic || "default";
    }

    if (!merged.profile.friendCode) merged.profile.friendCode = randomCode(6);
    if (!merged.equipped.emojis || merged.equipped.emojis.length !== 4) {
      merged.equipped.emojis = (DEFAULT.equipped.emojis ?? ["😭", "😃", "😅", "👍"]).slice();
    }

    migrateSeason(merged);
    
    // Tarkistetaan nollaus suoraan tallennetusta 'parsed'-objektista
    if (parsed.passResetVersion !== PASS_RESET_VERSION) {
      merged.passLevel = 0;
      merged.passXp = 0;
      merged.prestigeXp = 0;
      merged.claimedPass = [];
      merged.passSeasonLevels = [];
      merged.passSeasonPacks = [];
      merged.passResetVersion = PASS_RESET_VERSION;
      saveProgress(merged);
    }

    return merged;
  } catch {
    return { ...DEFAULT, passResetVersion: PASS_RESET_VERSION };
  }
}

const TEAM_CODES = ["fr", "ma", "en", "no", "es", "be", "ar", "ch"];

function migrateSeason(p: Progress): void {
  p.owned.avatars = (p.owned.avatars ?? ["default"]).filter((id) => !id.startsWith("qf-"));
  if (!p.owned.avatars.includes("default")) p.owned.avatars.push("default");
  if (p.equipped.avatar?.startsWith("qf-")) p.equipped.avatar = "default";

  for (const raw of p.teamOffersPurchased ?? []) {
    const code = TEAM_CODES.find((c) => raw.toLowerCase().endsWith(c));
    if (!code) continue;
    const id = `av-team-${code}`;
    if (!p.owned.avatars.includes(id)) p.owned.avatars.push(id);
  }

  if (!p.locker || p.locker.length !== 50) p.locker = generateLocker();
  if (typeof p.keys !== "number") p.keys = 0;
  if (!p.inventory.backpacks) p.inventory.backpacks = [];

  if (p.season !== CURRENT_SEASON) {
    p.season = CURRENT_SEASON;
    p.passLevel = 0;
    p.passXp = 0;
    p.prestigeXp = 0;
    p.claimedPass = [];
    p.passSeasonLevels = [];
    p.passSeasonPacks = [];
  }
}

export function generateLocker(): LockerCell[] {
  const pool: LockerCell["reward"][] = [
    ...Array(15).fill("key"),
    ...Array(10).fill("backpack"),
    ...Array(10).fill("coins"),
    ...Array(10).fill("heart"),
    ...Array(5).fill("box"),
  ];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.map((reward) => ({ reward, opened: false }));
}

export function grantKeys(p: Progress, n: number): void {
  p.keys = (p.keys ?? 0) + n;
}

export function grantBackpack(p: Progress): void {
  if (!p.inventory.backpacks) p.inventory.backpacks = [];
  p.inventory.backpacks.push({ id: `bp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` });
}

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

export function xpForTier(currentLevel: number): number {
  const t = currentLevel + 1;
  if (t <= 10) return 50;
  if (t <= 20) return 75;
  if (t <= 30) return 125;
  if (t <= 40) return 150;
  if (t <= 50) return 175;
  if (t <= 60) return 200;
  return 500;
}

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
