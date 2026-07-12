import { CATALOGS, findItem, type CosmeticCategory, type CosmeticItem } from "./cosmetics";
import { RARITY_ORDER, rollUpgrade, type Rarity, rarityRank } from "./rarity";

export type ContainerKind = "box" | "heart";

// Laajennetaan palkintoluokka tukemaan myös uutta "avatars"-kategoriaa
export interface RewardCoins {
  type: "coins";
  amount: number;
}
export interface RewardCosmetic {
  type: "cosmetic";
  category: CosmeticCategory | "avatars";
  itemId: string;
  rarity: Rarity;
}
export type Reward = RewardCoins | RewardCosmetic;

/** Päivitetyt kiinteät kolikkomäärät per taso. */
export const COIN_BY_TIER: Record<Rarity, number> = {
  common: 50,
  rare: 75,
  epic: 100,
  legendary: 150,
  mythic: 200,
  ultra: 300,
};

// Tunnistetaan ilmaiset oletusemojit kuvakkeista
const FREE_EMOJI_PREVIEWS = ["😭", "😃", "😅", "👍"];

// Sisäinen katalogi avatareille, jotta ne saadaan drop-logiikkaan mukaan
const AVATAR_CATALOG: CosmeticItem[] = [
  { id: "av-banana", label: "Banaani", rarity: "common", preview: "🍌" },
  { id: "av-pizza", label: "Pizza", rarity: "common", preview: "🍕" },
  { id: "av-car", label: "Auto", rarity: "common", preview: "🚙" },
  { id: "av-dizzy", label: "Pyörryksissä", rarity: "rare", preview: "😵‍💫" },
  { id: "av-popcorn", label: "Popkorni", rarity: "rare", preview: "🍿" },
  { id: "av-headphones", label: "Kuulokkeet", rarity: "rare", preview: "🎧" },
  { id: "av-alien", label: "Avaruusolio", rarity: "epic", preview: "👾" },
  { id: "av-oni", label: "Oni-maski", rarity: "epic", preview: "👹" },
  { id: "av-robot", label: "Robotti", rarity: "epic", preview: "🤖" },
  { id: "av-skull", label: "Pääkallo", rarity: "epic", preview: "💀" },
  { id: "av-nerd", label: "Nörtti", rarity: "legendary", preview: "🤓" },
  { id: "av-goat", label: "GOAT", rarity: "legendary", preview: "🐐" },
  { id: "av-clown", label: "Pelle", rarity: "legendary", preview: "🤡" },
  // Myyttiset QF-liput ovat exclusive-kohteita, joten niille asetetaan lipun myötä esto (tai ne rajautuvat drop-säännöillä)
  { id: "qf-finla", label: "QF - Suomi", rarity: "mythic", preview: "🇫🇮", exclusive: true },
  { id: "qf-swede", label: "QF - Ruotsi", rarity: "mythic", preview: "🇸🇪", exclusive: true },
  { id: "qf-canad", label: "QF - Kanada", rarity: "mythic", preview: "🇨🇦", exclusive: true },
  { id: "qf-usa", label: "QF - USA", rarity: "mythic", preview: "🇺🇸", exclusive: true },
];

/** Tarkistetaan sopiiko kosmetiikan taso konttiin. */
function isCosmeticEligible(itemRarity: Rarity, boxTier: Rarity): boolean {
  if (itemRarity === "ultra") {
    return boxTier === "ultra";
  }
  if (boxTier === "mythic") {
    return itemRarity === "ultra";
  }
  if (boxTier === "ultra") {
    return false;
  }

  const boxRank = rarityRank(boxTier);
  const itemRank = rarityRank(itemRarity);

  return itemRank > boxRank;
}

/** Pick a random non-exclusive cosmetic of one of the eligible rarities. */
function pickCosmetic(tier: Rarity, ownedFilter: (cat: CosmeticCategory | "avatars", id: string) => boolean): RewardCosmetic | null {
  // Lisätään "avatars" mukaan sallittujen kategorioiden listaan
  const cats: (CosmeticCategory | "avatars")[] = ["colors", "shapes", "patterns", "accessories", "themes", "emojis", "avatars"];
  const safeFilter = typeof ownedFilter === "function" ? ownedFilter : () => false;

  const categoryPools: Record<CosmeticCategory | "avatars", RewardCosmetic[]> = {
    colors: [],
    shapes: [],
    patterns: [],
    accessories: [],
    themes: [],
    emojis: [],
    avatars: [], // Alustetaan uusi allas avatareille
  };

  for (const cat of cats) {
    // Haetaan lista joko globaalista katalogista tai meidän avatar-luettelosta
    const items = cat === "avatars" ? AVATAR_CATALOG : CATALOGS[cat];
    if (!items) continue;

    for (const it of items) {
      if (safeFilter(cat, it.id)) continue;

      if (cat === "emojis" && it.preview && FREE_EMOJI_PREVIEWS.includes(it.preview)) continue;
      // Estetään Limited Time / Exclusive tarjousten dropit
      if (it.exclusive && cat !== "emojis") continue;

      if (!isCosmeticEligible(it.rarity, tier)) continue;

      categoryPools[cat].push({ type: "cosmetic", category: cat, itemId: it.id, rarity: it.rarity });
    }
  }

  const validCategories = cats.filter((cat) => categoryPools[cat].length > 0);
  if (validCategories.length === 0) return null;

  const chosenCat = validCategories[Math.floor(Math.random() * validCategories.length)];
  const pool = categoryPools[chosenCat];

  return pool[Math.floor(Math.random() * pool.length)];
}

/** Roll one reward from a container of given base rarity. */
export function rollReward(base: Rarity, ownedFilter: (cat: CosmeticCategory | "avatars", id: string) => boolean): Reward {
  const rarity = base;
  const cos = pickCosmetic(rarity, ownedFilter);
  
  if (cos && Math.random() < 0.5) {
    return cos;
  }
  
  return { type: "coins", amount: COIN_BY_TIER[rarity] };
}

/** Open a container. Box=3-5 rewards, Heart=1. */
export function openContainer(kind: ContainerKind, base: Rarity, ownedFilter: (cat: CosmeticCategory | "avatars", id: string) => boolean): Reward[] {
  const count = kind === "box" ? 3 + Math.floor(Math.random() * 3) : 1;
  const out: Reward[] = [];
  const seenIds = new Set<string>();
  const safeFilter = typeof ownedFilter === "function" ? ownedFilter : () => false;

  for (let i = 0; i < count; i++) {
    const r = rollReward(base, (cat, id) => safeFilter(cat, id) || seenIds.has(`${cat}:${id}`));
    if (r.type === "cosmetic") seenIds.add(`${r.category}:${r.itemId}`);
    out.push(r);
  }
  return out;
}

export function topRarity(rewards: Reward[]): Rarity {
  let best: Rarity = "common";
  for (const r of rewards) {
    const rr = r.type === "cosmetic" ? r.rarity : ("common" as Rarity);
    if (rarityRank(rr) > rarityRank(best)) best = rr;
  }
  return best;
}

export function itemLabel(r: Reward): string {
  if (r.type === "coins") return `🪙 ${r.amount}`;
  // Jos kyseessä on avatar, haetaan sen nimi paikallisesta listasta
  if (r.category === "avatars") {
    const av = AVATAR_CATALOG.find((a) => a.id === r.itemId);
    return av?.label ?? r.itemId;
  }
  const it = findItem(r.category, r.itemId);
  return it?.label ?? r.itemId;
}

export { RARITY_ORDER, rollUpgrade };
