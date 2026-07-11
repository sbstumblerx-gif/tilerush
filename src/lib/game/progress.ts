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
  avatar: string; // ← UUSI: Aktiivinen profiilikuva
  /** 4 emoji reactions the player can flash mid-game / on profile. */
  emojis?: string[];
}

export interface Owned {
  colors: string[];
  shapes: string[];
  patterns: string[];
  accessories: string[];
  themes: string[];
  avatars: string[]; // ← UUSI: Avatut profiilikuvat
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
  incoming:
  
