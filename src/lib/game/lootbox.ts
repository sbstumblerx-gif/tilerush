import { CATALOGS, findItem, type CosmeticCategory } from "./cosmetics";
import { RARITY_ORDER, rollUpgrade, type Rarity, rarityRank } from "./rarity";

export type ContainerKind = "box" | "heart";

export interface RewardCoins {
  type: "coins";
  amount: number;
}
export interface RewardCosmetic {
  type: "cosmetic";
  category: CosmeticCategory;
  itemId: string;
  rarity: Rarity;
}
export type Reward = RewardCoins | RewardCosmetic;

/** Coin amount by tier. */
const COIN_BY_TIER: Record<Rarity, number> = {
  common: 50,
  rare: 75,
  epic: 100,
  legendary: 200,
  mythic: 300,
  ultra: 500,
};

// Tunnistetaan ilmaiset oletusemojit suoraan kuvakkeista
const FREE_EMOJI_PREVIEWS = ["😭", "😃", "😅", "👍"];

/** Which rarities are eligible cosmetic drops per tier for standard items. */
function eligibleRarities(tier: Rarity): Rarity[] {
  switch (tier) {
    case "common":
      return ["common"];
    case "rare":
      return ["common", "rare"];
    case "epic":
      return ["common", "rare", "epic"];
    case "legendary":
      return ["rare", "epic", "legendary"];
    case "mythic":
      return ["epic", "legendary", "mythic"];
    case "ultra":
      return ["mythic", "ultra"];
  }
}

/** Emojien omat tasovaatimukset kontin tason mukaan. */
function isEmojiEligible(emojiRarity: Rarity, boxTier: Rarity): boolean {
  const boxRank = rarityRank(boxTier);
  const emojiRank = rarityRank(emojiRarity);

  if (emojiRarity === "ultra") {
    return boxTier === "ultra";
  }
  return boxRank >= emojiRank;
}

/** Pick a random non-exclusive cosmetic of one of the eligible rarities. */
function pickCosmetic(tier: Rarity, eligible: Rarity[], ownedFilter: (cat: CosmeticCategory, id: string) => boolean): RewardCosmetic | null {
  const cats: CosmeticCategory[] = ["colors", "shapes", "patterns", "accessories", "themes", "emojis"];
  
  // Varmistetaan, että ownedFilter on varmasti funktio
  const safeFilter = typeof ownedFilter === "function" ? ownedFilter : () => false;

  const categoryPools: Record<CosmeticCategory, RewardCosmetic[]> = {
    colors: [],
    shapes: [],
    patterns: [],
    accessories: [],
    themes: [],
    emojis: [],
  };

  for (const cat of cats) {
    if (!CATALOGS[cat]) continue;

    for (const it of CATALOGS[cat]) {
      // Käytetään turvallista suodatinta
      if (safeFilter(cat, it.id)) continue;

      if (cat === "emojis") {
        if (it.preview && FREE_EMOJI_PREVIEWS.includes(it.preview)) continue;
        if (!isEmojiEligible(it.rarity, tier)) continue;
      } else {
        if (it.exclusive) continue;
        if (!eligible.includes(it.rarity)) continue;
      }

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
export function rollReward(base: Rarity, ownedFilter: (cat: CosmeticCategory, id: string) => boolean): Reward {
  const { rarity } = rollUpgrade(base);
  
  const cos = pickCosmetic(rarity, eligibleRarities(rarity), ownedFilter);
  
  if (cos && Math.random() < 0.5) {
    return cos;
  }
  
  return { type: "coins", amount: COIN_BY_TIER[rarity] };
}

/** Open a container. Box=3-5 rewards, Heart=1. */
export function openContainer(kind: ContainerKind, base: Rarity, ownedFilter: (cat: CosmeticCategory, id: string) => boolean): Reward[] {
  const count = kind === "box" ? 3 + Math.floor(Math.random() * 3) : 1;
  const out: Reward[] = [];
  const seenIds = new Set<string>();
  
  // KORJAUS: Varmistetaan että ownedFilter on olemassa ja toimii, muuten peli jämähtää klikatessa
  const safeFilter = typeof ownedFilter === "function" ? ownedFilter : () => false;

  for (let i = 0; i < count; i++) {
    const r = rollReward(base, (cat, id) => safeFilter(cat, id) || seenIds.has(`${cat}:${id}`));
    if (r.type === "cosmetic") seenIds.add(`${r.category}:${r.itemId}`);
    out.push(r);
  }
  return out;
}

/** Highest rarity for the reward-screen background */
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
  const it = findItem(r.category, r.itemId);
  return it?.label ?? r.itemId;
}

export { RARITY_ORDER };
