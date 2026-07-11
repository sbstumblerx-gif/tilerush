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

/** Päivitetyt kiinteät kolikkomäärät per taso. */
const COIN_BY_TIER: Record<Rarity, number> = {
  common: 50,
  rare: 75,
  epic: 100,
  legendary: 150,
  mythic: 200,
  ultra: 300,
};

// Tunnistetaan ilmaiset oletusemojit kuvakkeista
const FREE_EMOJI_PREVIEWS = ["😭", "😃", "😅", "👍"];

/** * UUSI LOGIIKKA: Tarkistetaan sopiiko kosmetiikan taso konttiin.
 * Sääntö kaikille kosmetiikoille:
 * Common kontti -> Vain Rare ja siitä ylöspäin (koska mikään ei voi dropata Commonista, tämä blokkaa kaiken kosmetiikan)
 * Rare kontti -> Epic ja ylöspäin
 * Epic kontti -> Legendary ja ylöspäin
 * Legendary kontti -> Mythic ja ylöspäin
 * Mythic kontti -> Ultra
 * Ultra kontti -> Ultra
 */
function isCosmeticEligible(itemRarity: Rarity, boxTier: Rarity): boolean {
  // Ultra-esineet vaativat aina Ultra-tason kontin
  if (itemRarity === "ultra") {
    return boxTier === "ultra";
  }
  // Mythic-kontista voi tulla vain Ultra-esineitä (jotka käsiteltiin jo ylhäällä, joten muuten false)
  if (boxTier === "mythic") {
    return itemRarity === "ultra";
  }
  // Ultra-kontista ei voi tulla muita kuin ultra-esineitä
  if (boxTier === "ultra") {
    return false;
  }

  const boxRank = rarityRank(boxTier);
  const itemRank = rarityRank(itemRarity);

  // Esineen tason pitää olla KORKEAMPI (+) kuin kontin taso
  return itemRank > boxRank;
}

/** Pick a random non-exclusive cosmetic of one of the eligible rarities. */
function pickCosmetic(tier: Rarity, ownedFilter: (cat: CosmeticCategory, id: string) => boolean): RewardCosmetic | null {
  const cats: CosmeticCategory[] = ["colors", "shapes", "patterns", "accessories", "themes", "emojis"];
  
  const safeFilter = typeof ownedFilter === "function" ? ownedFilter : () => false;

  // 1. Alustetaan kategoriakohtaiset altaat
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
      // Jos pelaaja jo omistaa tämän esineen, sitä ei tiputeta uudestaan
      if (safeFilter(cat, it.id)) continue;

      // Estetään ilmaisten aloitusemojien tippuminen
      if (cat === "emojis" && it.preview && FREE_EMOJI_PREVIEWS.includes(it.preview)) continue;
      
      // Skipataan myös muut exclusive-merkityt esineet (jos niitä on koodissa)
      if (it.exclusive && cat !== "emojis") continue;

      // KORJAUS: Kaikki kosmetiikat tarkistetaan nyt samalla uudella säännöllä!
      if (!isCosmeticEligible(it.rarity, tier)) continue;

      categoryPools[cat].push({ type: "cosmetic", category: cat, itemId: it.id, rarity: it.rarity });
    }
  }

  // 2. Etsitään ne kategoriat, joissa on jotain annettavaa
  const validCategories = cats.filter((cat) => categoryPools[cat].length > 0);
  if (validCategories.length === 0) return null;

  // 3. Valitaan satunnainen kategoria (tasainen 50% / kategoriajako)
  const chosenCat = validCategories[Math.floor(Math.random() * validCategories.length)];
  const pool = categoryPools[chosenCat];

  return pool[Math.floor(Math.random() * pool.length)];
}

/** Roll one reward from a container of given base rarity. */
export function rollReward(base: Rarity, ownedFilter: (cat: CosmeticCategory, id: string) => boolean): Reward {
  // Katsotaan saako kontti harvinaisuus-upgraden
  const { rarity } = rollUpgrade(base);
  
  // Haetaan kosmetiikka uuden tiukan säännön mukaan
  const cos = pickCosmetic(rarity, ownedFilter);
  
  // 50% mahdollisuus antaa kosmetiikka (jos säännöt täyttäviä esineitä on altaassa)
  if (cos && Math.random() < 0.5) {
    return cos;
  }
  
  // Muussa tapauksessa (tai jos allas oli tyhjä, kuten Common-laatikolla aina on) annetaan kiinteät kolikot kontin mukaan
  return { type: "coins", amount: COIN_BY_TIER[rarity] };
}

/** Open a container. Box=3-5 rewards, Heart=1. */
export function openContainer(kind: ContainerKind, base: Rarity, ownedFilter: (cat: CosmeticCategory, id: string) => boolean): Reward[] {
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
