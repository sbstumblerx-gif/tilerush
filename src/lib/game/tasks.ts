import type { DailyTask, WeeklyTask } from "./progress";

const POOL: Omit<DailyTask, "progress" | "claimed">[] = [
  { id: "use-energy-20", label: "Käytä energiaruutuja 20 kertaa", target: 20, reward: 90 },
  { id: "use-heavy-20", label: "Käytä raskaita ruutuja 20 kertaa", target: 20, reward: 90 },
  { id: "use-ice-20", label: "Käytä jääruutuja 20 kertaa", target: 20, reward: 90 },
  { id: "beat-3", label: "Läpäise 3 uutta tasoa", target: 3, reward: 40 },
  { id: "stars-10", label: "Kerää 10 tähteä", target: 10, reward: 70 },
  { id: "random-win-10", label: "Saa etu arparuudusta 10 kertaa", target: 10, reward: 120 },
  { id: "enemy-walk-3", label: "Kävele vihollisruutuun 3 kertaa", target: 3, reward: 40 },
  { id: "item-5", label: "Käytä esinettä 5 kertaa", target: 5, reward: 60 },
  { id: "volley-goal-2", label: "Lennä lentopallolla maaliin 2 kertaa", target: 2, reward: 50 },
];

function seed(dateStr: string): () => number {
  let s = 0;
  for (const c of dateStr) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** ISO Monday (UTC) key for the current week. */
export function weekKey(): string {
  const d = new Date();
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = utc.getUTCDay(); // 0..6, 0=Sun
  const diff = (day + 6) % 7; // days since Monday
  utc.setUTCDate(utc.getUTCDate() - diff);
  return `${utc.getUTCFullYear()}-${utc.getUTCMonth() + 1}-${utc.getUTCDate()}`;
}

const WEEKLY_POOL: Omit<WeeklyTask, "progress" | "claimed">[] = [
  { id: "w-stars-30", label: "Kerää 30 tähteä", target: 30, reward: 0 },
  { id: "w-beat-15", label: "Läpäise 15 uutta tasoa", target: 15, reward: 0 },
  { id: "w-vb-40", label: "Käytä lentopalloa 40 kertaa", target: 40, reward: 0 },
  { id: "w-enemy-30", label: "Astu vihollisruutuun 30 kertaa", target: 30, reward: 0 },
  { id: "w-goals-10", label: "Lennä lentopallolla maaliin 10 kertaa", target: 10, reward: 0 },
  { id: "w-random-40", label: "Astu arparuutuun 40 kertaa", target: 40, reward: 0 },
  { id: "w-pack-2", label: "Läpäise 2 pakettia", target: 2, reward: 0 },
];

export function generateWeekly(key: string): WeeklyTask[] {
  const rnd = seed(key);
  const pool = [...WEEKLY_POOL];
  const out: WeeklyTask[] = [];
  while (out.length < 5 && pool.length) {
    const i = Math.floor(rnd() * pool.length);
    const [t] = pool.splice(i, 1);
    out.push({ ...t, progress: 0, claimed: false });
  }
  return out;
}

export function generateDaily(dateStr: string): DailyTask[] {
  const rnd = seed(dateStr);
  const pool = [...POOL];
  const out: DailyTask[] = [];
  while (out.length < 3 && pool.length) {
    const i = Math.floor(rnd() * pool.length);
    const [t] = pool.splice(i, 1);
    out.push({ ...t, progress: 0, claimed: false });
  }
  return out;
}