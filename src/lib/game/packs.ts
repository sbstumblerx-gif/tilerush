export interface Pack {
  id: number;
  name: string;
  theme: string;
  levelIds: number[];
  /** Tailwind gradient classes for background. */
  bg: string;
  /** Reward cosmetic ids (color, shape, pattern, accessory, theme) */
  reward: { color?: string; shape?: string; pattern?: string; accessory?: string; theme: string };
}

export const PACKS: Pack[] = [
  {
    id: 1,
    name: "Alkupaketti",
    theme: "Perusteet",
    levelIds: Array.from({ length: 10 }, (_, i) => i + 1),
    bg: "from-[oklch(0.28_0.09_265)] to-[oklch(0.2_0.08_320)]",
    reward: { color: "cyan", theme: "cyber" },
  },
  {
    id: 2,
    name: "Rantaloma tropiikissa",
    theme: "Rantakenttiä ja auringonpaistetta",
    levelIds: Array.from({ length: 10 }, (_, i) => i + 11),
    bg: "from-[oklch(0.75_0.15_75)] to-[oklch(0.55_0.15_200)]",
    reward: { color: "yellow", accessory: "aurinkolasit", theme: "ranta" },
  },
  {
    id: 3,
    name: "Talvinen idylli",
    theme: "Jäätä ja lunta",
    levelIds: Array.from({ length: 10 }, (_, i) => i + 21),
    bg: "from-[oklch(0.85_0.06_220)] to-[oklch(0.5_0.1_260)]",
    reward: { color: "white", pattern: "mosaiikki", theme: "jaatikko" },
  },
  {
    id: 4,
    name: "Kuumat ylängöt",
    theme: "Purkautuva tulivuori",
    levelIds: Array.from({ length: 10 }, (_, i) => i + 31),
    bg: "from-[oklch(0.45_0.15_25)] to-[oklch(0.25_0.08_15)]",
    reward: { color: "red", shape: "kolmio", theme: "tulivuori" },
  },
  {
    id: 5,
    name: "Rajattomasti virtaa!",
    theme: "Nopeus ja energia",
    levelIds: Array.from({ length: 10 }, (_, i) => i + 41),
    bg: "from-[oklch(0.7_0.2_65)] to-[oklch(0.4_0.15_30)]",
    reward: { color: "orange", pattern: "siksak", theme: "kilpa" },
  },
  {
    id: 6,
    name: "Vihollisjoukon leiri",
    theme: "Hämärä maasto",
    levelIds: Array.from({ length: 10 }, (_, i) => i + 51),
    bg: "from-[oklch(0.4_0.15_355)] to-[oklch(0.2_0.05_340)]",
    reward: { color: "pink", accessory: "kruunu", theme: "hamara" },
  },
  {
    id: 7,
    name: "Lennokasta menoa",
    theme: "Painotus laukaisurampit 🟨",
    levelIds: Array.from({ length: 10 }, (_, i) => i + 61),
    bg: "from-[oklch(0.78_0.16_95)] to-[oklch(0.45_0.12_75)]",
    reward: { theme: "lentaja" },
  },
  {
    id: 8,
    name: "Arpa on heitetty!",
    theme: "Painotus arparuudut ❓",
    levelIds: Array.from({ length: 10 }, (_, i) => i + 71),
    bg: "from-[oklch(0.4_0.18_290)] to-[oklch(0.22_0.14_260)]",
    reward: { theme: "mysteeri" },
  },
  {
    id: 9,
    name: "Maanalainen kaamos",
    theme: "Uusi TNT-item käytössä 💣",
    levelIds: Array.from({ length: 10 }, (_, i) => i + 81),
    bg: "from-[oklch(0.18_0.03_265)] to-[oklch(0.08_0.02_265)]",
    reward: { theme: "tumma" },
  },
];

export function packOf(levelId: number): Pack | undefined {
  return PACKS.find((p) => p.levelIds.includes(levelId));
}

export function packProgress(pack: Pack, completed: number[]): number {
  return pack.levelIds.filter((id) => completed.includes(id)).length;
}

export function isPackUnlocked(pack: Pack, completed: number[]): boolean {
  if (pack.id === 1) return true;
  const prev = PACKS.find((p) => p.id === pack.id - 1);
  if (!prev) return true;
  return prev.levelIds.every((id) => completed.includes(id));
}