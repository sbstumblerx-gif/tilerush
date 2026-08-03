import { loadProgress, saveProgress, grantBackpack, type Progress } from "./progress";
import { openContainer, rollBackpack, COIN_BY_TIER, type Reward } from "./lootbox";
import type { Rarity } from "./rarity";

export type ContainerKind = "box" | "heart" | "backpack";

export interface PresentedContainer {
  kind: ContainerKind;
  rarity: Rarity;
  /** Inventaarion id, jos kontti avataan varastosta. */
  id?: string;
}

export const PRESENT_EVENT = "tilerush:present-container";

/** Näytä kontti heti ruudulla avattavaksi (vaihtoehtona siirto varastoon). */
export function presentContainer(kind: ContainerKind, rarity: Rarity = "common"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<PresentedContainer>(PRESENT_EVENT, { detail: { kind, rarity } }));
}

function ownedFilter(p: Progress) {
  return (cat: string, id: string) =>
    (p.owned as unknown as Record<string, string[]>)[cat]?.includes(id) ?? false;
}

export function applyRewards(p: Progress, rewards: Reward[]): void {
  for (const r of rewards) {
    if (r.type === "coins") {
      p.coins += r.amount;
    } else if (r.type === "gems") {
      p.gems = (p.gems ?? 0) + r.amount;
    } else {
      const list = (p.owned as unknown as Record<string, string[]>)[r.category] ?? [];
      if (!list.includes(r.itemId)) {
        (p.owned as unknown as Record<string, string[]>)[r.category] = [...list, r.itemId];
      }
    }
  }
  p.pendingRewards = [...p.pendingRewards, ...rewards];
}

/** Avaa kontti, joka ei ole varastossa (esim. suoraan lunastuksesta). */
export function openLooseContainer(kind: ContainerKind, rarity: Rarity): void {
  const p = loadProgress();
  const rewards =
    kind === "backpack"
      ? [rollBackpack(ownedFilter(p))]
      : openContainer(kind, rarity, ownedFilter(p)).map((r) =>
          r.type === "coins" ? { ...r, amount: COIN_BY_TIER[rarity] ?? 50 } : r,
        );
  applyRewards(p, rewards);
  saveProgress(p);
}

/** Siirrä kontti varastoon avaamatta. */
export function storeContainer(kind: ContainerKind, rarity: Rarity): void {
  const p = loadProgress();
  const id = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  if (kind === "box") p.inventory.boxes.push({ id, rarity });
  else if (kind === "heart") p.inventory.hearts.push({ id, rarity });
  else grantBackpack(p);
  saveProgress(p);
}

/** Avaa reppu varastosta. */
export function openStoredBackpack(id: string): void {
  const p = loadProgress();
  const list = p.inventory.backpacks ?? [];
  if (!list.some((b) => b.id === id)) return;
  p.inventory.backpacks = list.filter((b) => b.id !== id);
  applyRewards(p, [rollBackpack(ownedFilter(p))]);
  saveProgress(p);
}