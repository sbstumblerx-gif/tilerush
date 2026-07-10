import type { Rarity } from "./rarity";

export interface CosmeticItem {
  id: string;
  label: string;
  price: number;
  rarity: Rarity;
  /** Not for sale in shop / dropped only from event/pack rewards */
  exclusive?: boolean;
  /** CSS color when category=color, or emoji/glyph preview. */
  preview?: string;
}

export type CosmeticCategory = "colors" | "shapes" | "patterns" | "accessories" | "themes";

export const COLORS: CosmeticItem[] = [
  { id: "cyan", label: "Syaani", price: 200, rarity: "common", preview: "#22d3ee" },
  { id: "green", label: "Vihreä", price: 200, rarity: "common", preview: "#22c55e" },
  { id: "yellow", label: "Keltainen", price: 200, rarity: "common", preview: "#eab308" },
  { id: "red", label: "Punainen", price: 200, rarity: "common", preview: "#ef4444" },
  { id: "pink", label: "Pinkki", price: 200, rarity: "common", preview: "#ec4899" },
  { id: "purple", label: "Violetti", price: 200, rarity: "common", preview: "#a855f7" },
  { id: "blue", label: "Sininen", price: 200, rarity: "common", preview: "#3b82f6" },
  { id: "orange", label: "Oranssi", price: 200, rarity: "common", preview: "#f97316" },
  { id: "white", label: "Valkoinen", price: 200, rarity: "common", preview: "#f5f5f5" },
];

export const SHAPES: CosmeticItem[] = [
  { id: "square", label: "Neliö", price: 150, rarity: "common", preview: "■" },
  { id: "circle", label: "Ympyrä", price: 150, rarity: "common", preview: "●" },
  { id: "star", label: "Tähti", price: 200, rarity: "rare", preview: "★" },
  { id: "kolmio", label: "Kolmio", price: 200, rarity: "rare", preview: "▲" },
  { id: "hex", label: "Kuusikulmio", price: 250, rarity: "epic", preview: "⬡" },
  { id: "tiimalasi", label: "Tiimalasi", price: 250, rarity: "epic", preview: "⧗" },
];

export const PATTERNS: CosmeticItem[] = [
  { id: "none", label: "Ei kuviota", price: 0, rarity: "common", preview: "–" },
  { id: "siksak", label: "Siksak-kuvio", price: 150, rarity: "common", preview: "⌇" },
  { id: "risti", label: "Ristikuvio", price: 150, rarity: "common", preview: "✚" },
  { id: "ruutu", label: "Ruudukkokuvio", price: 200, rarity: "rare", preview: "▦" },
  { id: "kuu", label: "Kuu-kuvio", price: 200, rarity: "rare", preview: "☾" },
  { id: "raita", label: "Raitakuvio", price: 250, rarity: "epic", preview: "▤" },
  { id: "mosaiikki", label: "Mosaiikki", price: 250, rarity: "epic", preview: "▩" },
  { id: "fifa", label: "FIFA-pallo", price: 0, rarity: "legendary", exclusive: true, preview: "⚽" },
];

export const ACCESSORIES: CosmeticItem[] = [
  { id: "none", label: "Ei asustetta", price: 0, rarity: "common", preview: "–" },
  { id: "peruukki", label: "Peruukki", price: 200, rarity: "common", preview: "💇" },
  { id: "viikset", label: "Viikset", price: 200, rarity: "common", preview: "〰" },
  { id: "parta", label: "Parta", price: 200, rarity: "common", preview: "🧔" },
  { id: "lippis", label: "Lippis", price: 250, rarity: "rare", preview: "🧢" },
  { id: "tophat", label: "Silinteri", price: 250, rarity: "rare", preview: "🎩" },
  { id: "aurinkolasit", label: "Aurinkolasit", price: 250, rarity: "rare", preview: "🕶️" },
  { id: "kruunu", label: "Kruunu", price: 300, rarity: "epic", preview: "👑" },
  { id: "avaruus", label: "Avaruuskypärä", price: 350, rarity: "legendary", preview: "🪐" },
  { id: "yellowcard", label: "Keltainen kortti", price: 0, rarity: "legendary", exclusive: true, preview: "🟨" },
  { id: "redcard", label: "Punainen kortti", price: 0, rarity: "legendary", exclusive: true, preview: "🟥" },
  // v4.7: FIFA quarter-final team badges — sold as offers, exclusive mythic.
  { id: "team-fr", label: "Ranska", price: 750, rarity: "mythic", exclusive: true, preview: "🇫🇷" },
  { id: "team-ma", label: "Marokko", price: 750, rarity: "mythic", exclusive: true, preview: "🇲🇦" },
  { id: "team-en", label: "Englanti", price: 750, rarity: "mythic", exclusive: true, preview: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "team-no", label: "Norja", price: 750, rarity: "mythic", exclusive: true, preview: "🇳🇴" },
  { id: "team-es", label: "Espanja", price: 750, rarity: "mythic", exclusive: true, preview: "🇪🇸" },
  { id: "team-be", label: "Belgia", price: 750, rarity: "mythic", exclusive: true, preview: "🇧🇪" },
  { id: "team-ar", label: "Argentiina", price: 750, rarity: "mythic", exclusive: true, preview: "🇦🇷" },
  { id: "team-ch", label: "Sveitsi", price: 750, rarity: "mythic", exclusive: true, preview: "🇨🇭" },
];

export const THEMES: CosmeticItem[] = [
  { id: "default", label: "Neon (oletus)", price: 0, rarity: "common" },
  // pack rewards — exclusive
  { id: "ranta", label: "Trooppinen ranta", price: 0, rarity: "common", exclusive: true },
  { id: "jaatikko", label: "Jäätikkö", price: 0, rarity: "common", exclusive: true },
  { id: "tulivuori", label: "Tulivuori", price: 0, rarity: "common", exclusive: true },
  { id: "kilpa", label: "Kilparata", price: 0, rarity: "common", exclusive: true },
  { id: "hamara", label: "Hämärä maasto", price: 0, rarity: "common", exclusive: true },
  { id: "lentaja", label: "Lentäjä", price: 0, rarity: "common", exclusive: true },
  { id: "mysteeri", label: "Mysteerin värit", price: 0, rarity: "common", exclusive: true },
  { id: "tumma", label: "Tumma", price: 0, rarity: "common", exclusive: true },
  // shop themes
  { id: "puisto", label: "Rauhallinen puisto", price: 200, rarity: "rare" },
  { id: "cyber", label: "Cyberpunk", price: 250, rarity: "epic" },
  { id: "aavikko", label: "Aavikko", price: 250, rarity: "epic" },
  { id: "jalkapallo", label: "Jalkapallokenttä", price: 0, rarity: "legendary", exclusive: true },
];

export const CATALOGS: Record<CosmeticCategory, CosmeticItem[]> = {
  colors: COLORS,
  shapes: SHAPES,
  patterns: PATTERNS,
  accessories: ACCESSORIES,
  themes: THEMES,
};

export function findItem(cat: CosmeticCategory, id: string): CosmeticItem | undefined {
  return CATALOGS[cat].find((i) => i.id === id);
}

export const CATEGORY_LABEL: Record<CosmeticCategory, string> = {
  colors: "Uusi väri!",
  shapes: "Uusi muoto!",
  patterns: "Uusi kuvio!",
  accessories: "Uusi asuste!",
  themes: "Uusi taustakuva!",
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
    aavikko: "from-[oklch(0.72_0.13_75)] to-[oklch(0.45_0.1_55)]",
    lentaja: "from-[oklch(0.78_0.16_95)] to-[oklch(0.5_0.12_75)]",
    mysteeri: "from-[oklch(0.4_0.18_290)] to-[oklch(0.25_0.15_260)]",
    tumma: "from-[oklch(0.18_0.03_265)] to-[oklch(0.1_0.02_265)]",
  };
  return map[themeId] ?? map.default;
}