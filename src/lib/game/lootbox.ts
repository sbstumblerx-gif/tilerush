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

/** Which rarities are eligible cosmetic drops per tier. */
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
      return ["mythic"];
  }
}

/** Emojien omat tasovaatimukset lopullisen varmistuneen tason (tier) mukaan */
function isEmojiEligible(emojiRarity: Rarity, boxTier: Rarity): boolean {
  if (emojiRarity === "common" && ["rare", "epic", "legendary", "mythic", "ultra"].includes(boxTier)) return true;
  if (emojiRarity === "rare" && ["epic", "legendary", "mythic", "ultra"].includes(boxTier)) return true;
  if (emojiRarity === "epic" && ["legendary", "mythic", "ultra"].includes(boxTier)) return true;
  if (emojiRarity === "legendary" && ["mythic", "ultra"].includes(boxTier)) return true;
  if (emojiRarity === "mythic" && boxTier === "ultra") return true;
  if (emojiRarity === "ultra" && boxTier === "ultra") return true;
  return false;
}

/** Pick a random non-exclusive cosmetic of one of the eligible rarities. Returns null if none available. */
function pickCosmetic(tier: Rarity, eligible: Rarity[], ownedFilter: (cat: CosmeticCategory, id: string) => boolean): RewardCosmetic | null {
  // Lisätty "emojis" mukaan sallittuihin kategorioihin
  const cats: CosmeticCategory[] = ["colors", "shapes", "patterns", "accessories", "themes", "emojis"];
  const pool: RewardCosmetic[] = [];

  for (const cat of cats) {
    for (const it of CATALOGS[cat]) {
      // Oletusesineitä (hinta 0) ei tiputeta laatikoista, ellei kyseessä ole Ultra-emoji
      if (it.price === 0 && cat === "emojis" && it.rarity !== "ultra") continue;
      
      // Emojeille käytetään omaa erityistä tasotarkistusta
      if (cat === "emojis") {
        if (!isEmojiEligible(it.rarity, tier)) continue;
      } else {
        // Muille kosmetiikoille käytetään pelin alkuperäistä sääntöä
        if (it.exclusive) continue;
        if (!eligible.includes(it.rarity)) continue;
      }

      if (ownedFilter(cat, it.id)) continue;
      pool.push({ type: "cosmetic", category: cat, itemId: it.id, rarity: it.rarity });
    }
  }
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Roll one reward from a container of given base rarity. */
export function rollReward(base: Rarity, ownedFilter: (cat: CosmeticCategory, id: string) => boolean): Reward {
  // Tässä kohtaa arvotaan laatikon lopullinen taso päivitysmekanismin jälkeen
  const { rarity } = rollUpgrade(base);
  
  // 50% kolikot
  if (Math.random() < 0.5) {
    return { type: "coins", amount: COIN_BY_TIER[rarity] };
  }
  
  // 50% kosmetiikat (Kaikki kosmetiikat + emojit jaetussa poolissa)
  const cos = pickCosmetic(rarity, eligibleRarities(rarity), ownedFilter);
  if (cos) return cos;
  
  // fallback to coins jos kaikki jo avattu
  return { type: "coins", amount: COIN_BY_TIER[rarity] };
}

/** Open a container. Box=3-5 rewards, Heart=1. */
export function openContainer(kind: ContainerKind, base: Rarity, ownedFilter: (cat: CosmeticCategory, id: string) => boolean): Reward[] {
  const count = kind === "box" ? 3 + Math.floor(Math.random() * 3) : 1;
  const out: Reward[] = [];
  const seenIds = new Set<string>();
  for (let i = 0; i < count; i++) {
    const r = rollReward(base, (cat, id) => ownedFilter(cat, id) || seenIds.has(`${cat}:${id}`));
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
