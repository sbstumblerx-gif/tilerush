import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RARITY_BG_GRADIENT, RARITY_LABEL, RARITY_EMOJI, RARITY_ORDER, rollUpgradeStep, type Rarity } from "@/lib/game/rarity";
import { openInventoryContainer } from "./RewardScreen";
import { openLooseContainer, openStoredBackpack, storeContainer, type ContainerKind } from "@/lib/game/containers";

interface Props {
  /** Inventaarion id, kun avataan varastosta. */
  id?: string;
  kind: ContainerKind;
  startRarity: Rarity;
  /** Näytä "Siirrä varastoon" -vaihtoehto (suoraan lunastetut kontit). */
  allowStore?: boolean;
  onDone: () => void;
}

const ICON: Record<ContainerKind, string> = { box: "📦", heart: "💗", backpack: "🎒" };
const TITLE: Record<ContainerKind, string> = { box: "Laatikko", heart: "Loot-sydän", backpack: "Reppu" };

export function OpenContainer({ id, kind, startRarity, allowStore, onDone }: Props) {
  const [rarity, setRarity] = useState<Rarity>(startRarity);
  const [tapsLeft, setTapsLeft] = useState(kind === "backpack" ? 0 : 4);
  const [lastMsg, setLastMsg] = useState<string | null>(null);

  const idx = RARITY_ORDER.indexOf(rarity);

  const handleTap = () => {
    if (tapsLeft > 0) {
      const step = rollUpgradeStep();
      const nextIdx = Math.min(RARITY_ORDER.length - 1, idx + step);
      const nextRar = RARITY_ORDER[nextIdx];
      setRarity(nextRar);
      setTapsLeft(tapsLeft - 1);
      setLastMsg(step === 0 ? "Ei muutosta" : `Päivitys +${step}!`);
      return;
    }
    if (id) {
      if (kind === "backpack") openStoredBackpack(id);
      else openInventoryContainer(id, rarity);
    } else {
      openLooseContainer(kind, rarity);
    }
    onDone();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center p-6 text-white cursor-pointer select-none"
      style={{ background: RARITY_BG_GRADIENT[rarity] }}
      onClick={handleTap}
    >
      <div className="text-xs uppercase tracking-[0.4em] opacity-80">
        {TITLE[kind]}
      </div>
      <div className="mt-1 text-3xl font-black">
        {kind === "backpack" ? "🎒 Reppujahti" : `${RARITY_EMOJI[rarity]} ${RARITY_LABEL[rarity]}`}
      </div>

      <div className="my-10 flex items-center justify-center">
        <div
          className={`h-52 w-52 rounded-3xl shadow-[0_0_60px_rgba(255,255,255,0.4)] flex items-center justify-center text-[9rem] ${
            tapsLeft === 0 ? "animate-pulse" : ""
          }`}
          style={{ background: RARITY_BG_GRADIENT[rarity], filter: "brightness(1.15) saturate(1.3)" }}
        >
          {ICON[kind]}
        </div>
      </div>

      {tapsLeft > 0 ? (
        <>
          <div className="text-xl font-bold">Päivityksiä jäljellä: {tapsLeft}/4</div>
          <div className="mt-2 h-8 text-sm opacity-90">{lastMsg}</div>
          <div className="mt-4 text-xs opacity-75">Napauta päivittääksesi</div>
        </>
      ) : (
        <>
          <div className="text-2xl font-black animate-pulse">Avaa napauttamalla</div>
          <div className="mt-4 text-xs opacity-75">
            {kind === "backpack" ? "Repussa on kolikoita tai tapahtuman kosmetiikkaa" : "Kaikki päivitykset käytetty"}
          </div>
        </>
      )}

      <div className="mt-8 flex flex-col gap-2 w-full max-w-xs">
        {tapsLeft > 0 && (
          <Button
            variant="secondary"
            className="opacity-80"
            onClick={(e) => { e.stopPropagation(); setTapsLeft(0); }}
          >
            Ohita päivitykset
          </Button>
        )}
        {allowStore && !id && (
          <Button
            variant="outline"
            className="bg-black/30 border-white/40 text-white hover:bg-black/50"
            onClick={(e) => { e.stopPropagation(); storeContainer(kind, startRarity); onDone(); }}
          >
            Siirrä varastoon
          </Button>
        )}
      </div>
    </div>
  );
}
