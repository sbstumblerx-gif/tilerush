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
  owned: Owned;
  equipped: Equipped;
  daily?: DailyTasks;
  weekly?: WeeklyTasks;
  inventory: Inventory;
  pendingRewards: Reward[];
  settings: Settings;
  tileCup: {
    goals: number;
    volleyUses: number;
    tasks: TileCupTask[];
  };
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
  },
  tileCup: {
    goals: 0,
    volleyUses: 0,
    tasks: [
      { id: "vb10", label: "Käytä lentopalloa 10 kertaa", target: 10, progress: 0, reward: "kuvio: FIFA-pallo", claimed: false },
      { id: "g20", label: "Tee 20 maalia Tile Cupissa", target: 20, progress: 0, reward: "asuste: keltainen kortti", claimed: false },
      { id: "g50", label: "Tee 50 maalia Tile Cupissa", target: 50, progress: 0, reward: "asuste: punainen kortti", claimed: false },
      { id: "g75", label: "Tee 75 maalia Tile Cupissa", target: 75, progress: 0, reward: "taustakuva: jalkapallokenttä", claimed: false },
    ],
  },
  inventory: { boxes: [], hearts: [] },
  pendingRewards: [],
  settings: { music: 0.4, sfx: 0.7 },
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
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      ...DEFAULT,
      ...parsed,
      stats: { ...DEFAULT.stats, ...(parsed.stats ?? {}), tileUses: { ...(parsed.stats?.tileUses ?? {}) } },
      owned: { ...DEFAULT.owned, ...(parsed.owned ?? {}) },
      equipped: { ...DEFAULT.equipped, ...(parsed.equipped ?? {}) },
      tileCup: { ...DEFAULT.tileCup, ...(parsed.tileCup ?? {}), tasks: parsed.tileCup?.tasks ?? DEFAULT.tileCup.tasks },
      inventory: parsed.inventory ?? { boxes: [], hearts: [] },
      pendingRewards: parsed.pendingRewards ?? [],
      settings: { ...DEFAULT.settings, ...(parsed.settings ?? {}) },
      weekly: parsed.weekly,
    };
  } catch {
    return { ...DEFAULT };
  }
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
    // pass: 1 point per new completion
    if (!wasCompleted && p.passLevel < 60) p.passLevel += 1;
    if (!wasCompleted) {
      const rar = (levelId <= 30 ? "common" : levelId <= 60 ? "rare" : "epic") as import("./rarity").Rarity;
      p.inventory.hearts.push({ id: `heart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, rarity: rar });
    }
  });
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