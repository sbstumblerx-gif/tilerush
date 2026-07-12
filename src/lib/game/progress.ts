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
  avatar: string; // Nyt pakollinen, alustetaan oletuksena aina arvolla "default"
  /** 4 emoji reactions the player can flash mid-game / on profile. */
  emojis?: string[];
}

export interface Owned {
  colors: string[];
  shapes: string[];
  patterns: string[];
  accessories: string[];
  themes: string[];
  avatars: string[]; // Nyt pakollinen taulukko suoraan tyypeissä
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
  /** v4.7: emoji/lippu näytettävä profiilikuvana lobbyssa & profiilissa. */
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
  stars: Record<number, number>; // per level best
  stats: Stats;
  passLevel: number; // 0..60
  claimedPass: number[];
  /** XP accumulated toward current pass tier (rolls over between tiers). */
  passXp: number;
  /** XP accumulated toward post-60 prestige boxes (every 500 XP → box). */
  prestigeXp: number;
  equipped: Equipped;
  owned: Owned;
  inventory: Inventory;
  settings: Settings;
  profile: Profile;
  friends: Friends;
  lastDailyClaim?: string;
  
  // Kaupan vaatimat uudet tilatyyppimerkinnät:
  teamOffersPurchased: string[];
  promoRedeemed: string[];
}

// Apufunktiot progressin hallintaan (toteutukset riippuvat projektistasi, mutta tyypit ovat tässä)
export function loadProgress(): Progress {
  const data = localStorage.getItem(KEY);
  if (!data) return createDefaultProgress();
  try {
    const parsed = JSON.parse(data);
    // Varmistetaan että uudet taulukot ovat olemassa
    if (!parsed.teamOffersPurchased) parsed.teamOffersPurchased = [];
    if (!parsed.promoRedeemed) parsed.promoRedeemed = [];
    if (!parsed.owned.avatars) parsed.owned.avatars = ["default"];
    return parsed;
  } catch {
    return createDefaultProgress();
  }
}

export function saveProgress(p: Progress): void {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function addPassXp(p: Progress, amount: number): void {
  p.passXp += amount;
  // Mahdollinen tasonnousulogiikka tähän...
}

function createDefaultProgress(): Progress {
  return {
    completed: [],
    coins: 0,
    stars: {},
    stats: {
      starts: 0, totalMoves: 0, wins: 0, losses: 0, stars: 0,
      tileUses: {}, itemUses: 0, volleyGoals: 0, enemySteps: 0, randomGains: 0
    },
    passLevel: 0,
    claimedPass: [],
    passXp: 0,
    prestigeXp: 0,
    equipped: { color: "default", shape: "default", pattern: "none", accessory: "none", theme: "default", avatar: "default" },
    owned: { colors: ["default"], shapes: ["default"], patterns: ["none"], accessories: [], themes: ["default"], avatars: ["default"] },
    inventory: { boxes: [], hearts: [] },
    settings: { music: 5, sfx: 5 },
    profile: { username: "Pelaaja", friendCode: "0000" },
    friends: { list: [], incoming: [], outgoing: [] },
    teamOffersPurchased: [],
    promoRedeemed: []
  };
}
