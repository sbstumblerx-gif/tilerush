import type { DailyTask } from "./progress";

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