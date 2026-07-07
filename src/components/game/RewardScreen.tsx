import { useEffect, useState } from "react";
import { CATEGORY_LABEL, findItem } from "@/lib/game/cosmetics";
import { itemLabel, topRarity, type Reward } from "@/lib/game/lootbox";
import { loadProgress, saveProgress } from "@/lib/game/progress";
import { RARITY_BG_GRADIENT, RARITY_LABEL, RARITY_EMOJI } from "@/lib/game/rarity";
import { Button } from "@/components/ui/button";
import { PlayerToken } from "./PlayerToken";

export function RewardScreen() {
  const [queue, setQueue] = useState<Reward[]>([]);

  useEffect(() => {
    const load = () => setQueue(loadProgress().pendingRewards);
    load();
    window.addEventListener("tilerush:progress", load);
    return () => window.removeEventListener("tilerush:progress", load);
  }, []);

  if (queue.length === 0) return null;
  const current = queue[0];

  const consume = () => {
    const p = loadProgress();
    p.pendingRewards = p.pendingRewards.slice(1);
    saveProgress(p);
  };
  const equip = () => {
    if (current.type === "cosmetic") {
      const p = loadProgress();
      const keyMap = { colors: "color", shapes: "shape", patterns: "pattern", accessories: "accessory", themes: "theme" } as const;
      p.equipped[keyMap[current.category]] = current.itemId;
      saveProgress(p);
    }
    consume();
  };

  const rarity = current.type === "cosmetic" ? current.rarity : "common";
  const title = current.type === "coins" ? "Kolikoita!" : CATEGORY_LABEL[current.category];
  const item = current.type === "cosmetic" ? findItem(current.category, current.itemId) : null;
  const previewEquipped =
    current.type === "cosmetic"
      ? {
          color: current.category === "colors" ? current.itemId : "cyan",
          shape: current.category === "shapes" ? current.itemId : "circle",
          pattern: current.category === "patterns" ? current.itemId : "none",
          accessory: current.category === "accessories" ? current.itemId : "none",
          theme: "default",
        }
      : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: RARITY_BG_GRADIENT[rarity] }}>
      <div className="w-full max-w-sm text-center text-white">
        <div className="text-xs uppercase tracking-[0.4em] opacity-80">Palkinto</div>
        <h2 className="mt-2 text-3xl font-black">{title}</h2>

        <div className="my-8 flex items-center justify-center">
          {current.type === "coins" ? (
            <div className="text-7xl font-black">🪙 {current.amount}</div>
          ) : previewEquipped ? (
            <div className="p-8 bg-black/30 rounded-2xl">
              {current.category === "themes" ? (
                <div className="w-32 h-20 rounded-lg" style={{ background: "rgba(255,255,255,0.25)" }}>
                  <div className="p-2 text-xs">{item?.label}</div>
                </div>
              ) : (
                <PlayerToken equipped={previewEquipped} size={96} />
              )}
            </div>
          ) : null}
        </div>

        {current.type === "cosmetic" && (
          <>
            <div className="text-2xl font-bold">{itemLabel(current)}</div>
            <div className="mt-1 text-sm opacity-90">{RARITY_EMOJI[rarity]} {RARITY_LABEL[rarity]}</div>
          </>
        )}

        <div className="mt-8 flex gap-3">
          {current.type === "cosmetic" && (
            <Button className="flex-1" variant="secondary" onClick={equip}>
              Ota käyttöön
            </Button>
          )}
          <Button className="flex-1" onClick={consume}>Jatka</Button>
        </div>
        {queue.length > 1 && (
          <div className="mt-3 text-xs opacity-80">{queue.length - 1} palkintoa jäljellä</div>
        )}
      </div>
    </div>
  );
}

/** Award a container (heart or box) with the given rarity. */
export function pushContainer(kind: "box" | "heart", rarity: import("@/lib/game/rarity").Rarity) {
  const p = loadProgress();
  const id = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  if (kind === "box") p.inventory.boxes.push({ id, rarity });
  else p.inventory.hearts.push({ id, rarity });
  saveProgress(p);
}

/** Open a container from inventory (by id, from either boxes or hearts). */
export function openInventoryContainer(id: string) {
  const p = loadProgress();
  let kind: "box" | "heart" | null = null;
  let rarity: import("@/lib/game/rarity").Rarity | null = null;
  const b = p.inventory.boxes.find((x) => x.id === id);
  if (b) { kind = "box"; rarity = b.rarity; p.inventory.boxes = p.inventory.boxes.filter((x) => x.id !== id); }
  else {
    const h = p.inventory.hearts.find((x) => x.id === id);
    if (h) { kind = "heart"; rarity = h.rarity; p.inventory.hearts = p.inventory.hearts.filter((x) => x.id !== id); }
  }
  if (!kind || !rarity) return;
  const { openContainer } = require("@/lib/game/lootbox") as typeof import("@/lib/game/lootbox");
  const rewards = openContainer(kind, rarity, (cat, iid) =>
    p.owned[cat].includes(iid),
  );
  // Apply coins immediately, queue cosmetics for reward screen
  for (const r of rewards) {
    if (r.type === "coins") p.coins += r.amount;
    else if (!p.owned[r.category].includes(r.itemId)) p.owned[r.category] = [...p.owned[r.category], r.itemId];
  }
  p.pendingRewards = [...p.pendingRewards, ...rewards];
  saveProgress(p);
}