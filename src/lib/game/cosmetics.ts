export interface CosmeticItem {
  id: string;
  label: string;
  price: number;
  /** CSS color when category=color, or emoji/glyph preview. */
  preview?: string;
}

export type CosmeticCategory = "colors" | "shapes" | "patterns" | "accessories" | "themes";

export const COLORS: CosmeticItem[] = [
  { id: "green", label: "Vihreä", price: 200, preview: "#22c55e" },
  { id: "yellow", label: "Keltainen", price: 200, preview: "#eab308" },
  { id: "red", label: "Punainen", price: 200, preview: "#ef4444" },
  { id: "pink", label: "Pinkki", price: 200, preview: "#ec4899" },
  { id: "purple", label: "Violetti", price: 200, preview: "#a855f7" },
  { id: "blue", label: "Sininen", price: 200, preview: "#3b82f6" },
  { id: "orange", label: "Oranssi", price: 200, preview: "#f97316" },
  { id: "white", label: "Valkoinen", price: 200, preview: "#f5f5f5" },
  { id: "cyan", label: "Syaani", price: 0, preview: "#22d3ee" },
];

export const SHAPES: CosmeticItem[] = [
  { id: "circle", label: "Ympyrä", price: 0, preview: "●" },
  { id: "hex", label: "Kuusikulmio", price: 250, preview: "⬡" },
  { id: "pentagon", label: "Viisikulmio", price: 250, preview: "⬠" },
  { id: "star", label: "Tähti", price: 250, preview: "★" },
  { id: "kolmio", label: "Kolmio", price: 250, preview: "▲" },
];

export const PATTERNS: CosmeticItem[] = [
  { id: "none", label: "Ei kuviota", price: 0, preview: "–" },
  { id: "ruutu", label: "Ruutukuvio", price: 300, preview: "▦" },
  { id: "mosaiikki", label: "Mosaiikki", price: 300, preview: "▩" },
  { id: "siksak", label: "Siksak", price: 300, preview: "⌇" },
  { id: "fifa", label: "FIFA-pallo", price: 0, preview: "⚽" },
];

export const ACCESSORIES: CosmeticItem[] = [
  { id: "none", label: "Ei asustetta", price: 0, preview: "–" },
  { id: "kruunu", label: "Kruunu", price: 250, preview: "👑" },
  { id: "lippis", label: "Lippis", price: 250, preview: "🧢" },
  { id: "tophat", label: "Silinteri", price: 250, preview: "🎩" },
  { id: "aurinkolasit", label: "Aurinkolasit", price: 250, preview: "🕶️" },
  { id: "peruukki", label: "Peruukki", price: 250, preview: "💇" },
  { id: "yellowcard", label: "Keltainen kortti", price: 0, preview: "🟨" },
  { id: "redcard", label: "Punainen kortti", price: 0, preview: "🟥" },
];

export const THEMES: CosmeticItem[] = [
  { id: "default", label: "Neon (oletus)", price: 0 },
  { id: "cyber", label: "Cyberpunk", price: 400 },
  { id: "puisto", label: "Rauhallinen puisto", price: 400 },
  { id: "jaatikko", label: "Jäätikkö", price: 400 },
  { id: "ranta", label: "Trooppinen ranta", price: 0 },
  { id: "tulivuori", label: "Tulivuori", price: 0 },
  { id: "kilpa", label: "Kilparata", price: 0 },
  { id: "hamara", label: "Hämärä maasto", price: 0 },
  { id: "jalkapallo", label: "Jalkapallokenttä", price: 0 },
];

export const CATALOGS: Record<CosmeticCategory, CosmeticItem[]> = {
  colors: COLORS,
  shapes: SHAPES,
  patterns: PATTERNS,
  accessories: ACCESSORIES,
  themes: THEMES,
};

export function themeBg(themeId: string): string {
  const map: Record<string, string> = {
    default: "from-[oklch(0.28_0.09_265)] to-[oklch(0.2_0.08_320)]",
    cyber: "from-[oklch(0.35_0.2_300)] to-[oklch(0.2_0.15_260)]",
    puisto: "from-[oklch(0.55_0.12_140)] to-[oklch(0.35_0.08_160)]",
    jaatikko: "from-[oklch(0.75_0.08_220)] to-[oklch(0.4_0.1_240)]",
    ranta: "from-[oklch(0.75_0.15_75)] to-[oklch(0.55_0.15_200)]",
    tulivuori: "from-[oklch(0.45_0.18_25)] to-[oklch(0.2_0.08_15)]",
    kilpa: "from-[oklch(0.65_0.2_65)] to-[oklch(0.3_0.1_30)]",
    hamara: "from-[oklch(0.35_0.12_355)] to-[oklch(0.18_0.05_340)]",
    jalkapallo: "from-[oklch(0.55_0.18_140)] to-[oklch(0.35_0.12_150)]",
  };
  return map[themeId] ?? map.default;
}