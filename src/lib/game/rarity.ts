export type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic" | "ultra";

export const RARITY_ORDER: Rarity[] = ["common", "rare", "epic", "legendary", "mythic", "ultra"];

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Yleinen",
  rare: "Harvinainen",
  epic: "Eeppinen",
  legendary: "Legendaarinen",
  mythic: "Myyttinen",
  ultra: "Ultra",
};

export const RARITY_EMOJI: Record<Rarity, string> = {
  common: "🟩",
  rare: "🟦",
  epic: "🟪",
  legendary: "🟨",
  mythic: "🟥",
  ultra: "🎨",
};

/** CSS color for backgrounds / borders */
export const RARITY_COLOR: Record<Rarity, string> = {
  common: "#22c55e",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#eab308",
  mythic: "#ef4444",
  ultra: "linear-gradient(135deg,#ef4444,#eab308,#22c55e,#3b82f6,#a855f7)",
};

export const RARITY_BG_GRADIENT: Record<Rarity, string> = {
  common: "linear-gradient(135deg,#14532d,#22c55e)",
  rare: "linear-gradient(135deg,#1e3a8a,#3b82f6)",
  epic: "linear-gradient(135deg,#4c1d95,#a855f7)",
  legendary: "linear-gradient(135deg,#78350f,#eab308)",
  mythic: "linear-gradient(135deg,#7f1d1d,#ef4444)",
  ultra: "conic-gradient(from 0deg,#ef4444,#eab308,#22c55e,#3b82f6,#a855f7,#ef4444)",
};

export function rarityRank(r: Rarity): number {
  return RARITY_ORDER.indexOf(r);
}

/** Upgrade roll: 4 attempts. Kausi 2: korkeat tasot ovat selvästi harvinaisempia. */
export function rollUpgrade(base: Rarity): { rarity: Rarity; steps: number } {
  let idx = rarityRank(base);
  let totalSteps = 0;
  for (let i = 0; i < 4; i++) {
    const roll = Math.random();
    let step = 0;
    if (roll < UPGRADE_ODDS[0]) step = 0;
    else if (roll < UPGRADE_ODDS[1]) step = 1;
    else if (roll < UPGRADE_ODDS[2]) step = 2;
    else if (roll < UPGRADE_ODDS[3]) step = 3;
    else step = 4;
    idx = Math.min(RARITY_ORDER.length - 1, idx + step);
    totalSteps += step;
  }
  return { rarity: RARITY_ORDER[idx], steps: totalSteps };
}

/** Kumulatiiviset rajat: 82 % ei muutosta, 12 % +1, 4 % +2, 1,5 % +3, 0,5 % +4. */
export const UPGRADE_ODDS = [0.82, 0.94, 0.98, 0.995] as const;

/** Yksi napautus: palauttaa montako askelta harvinaisuus nousee. */
export function rollUpgradeStep(): number {
  const roll = Math.random();
  if (roll < UPGRADE_ODDS[0]) return 0;
  if (roll < UPGRADE_ODDS[1]) return 1;
  if (roll < UPGRADE_ODDS[2]) return 2;
  if (roll < UPGRADE_ODDS[3]) return 3;
  return 4;
}