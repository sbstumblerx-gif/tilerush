import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { RARITY_BG_GRADIENT, RARITY_LABEL, RARITY_EMOJI, RARITY_ORDER, rollUpgrade, type Rarity } from "@/lib/game/rarity";
import { openInventoryContainer } from "./RewardScreen";

interface Props {
  id: string;
  kind: "box" | "heart";
  startRarity: Rarity;
  onDone: () => void;
}

/** Interactive upgrade + open flow for a single box/heart container.
 *  User has 4 taps to try to upgrade. After 4 taps the container is "ready"
 *  and tapping again opens it (queues rewards into RewardScreen). */
export function OpenContainer({ id, kind, startRarity, onDone }: Props) {
  const [rarity, setRarity] = useState<Rarity>(startRarity);
  const [tapsLeft, setTapsLeft] = useState(4);
  const [lastMsg, setLastMsg] = useState<string | null>(null);

  const idx = RARITY_ORDER.indexOf(rarity);

  const handleTap = () => {
    if (tapsLeft > 0) {
      // roll ONE step (same table used by rollUpgrade internally, but we do a single roll per tap)
      const roll = Math.random();
      let step = 0;
      if (roll < 0.63) step = 0;
      else if (roll < 0.83) step = 1;
      else if (roll < 0.93) step = 2;
      else if (roll < 0.98) step = 3;
      else step = 4;
      const nextIdx = Math.min(RARITY_ORDER.length - 1, idx + step);
      const nextRar = RARITY_ORDER[nextIdx];
      setRarity(nextRar);
      setTapsLeft(tapsLeft - 1);
      setLastMsg(step === 0 ? "Ei muutosta" : `Päivitys +${step}!`);
      return;
    }
    // ready → open
    openInventoryContainer(id);
    onDone();
  };

  // Silence unused rollUpgrade warning if TS decides
  useMemo(() => rollUpgrade, []);

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center p-6 text-white cursor-pointer select-none"
      style={{ background: RARITY_BG_GRADIENT[rarity] }}
      onClick={handleTap}
    >
      <div className="text-xs uppercase tracking-[0.4em] opacity-80">
        {kind === "box" ? "Laatikko" : "Loot-sydän"}
      </div>
      <div className="mt-1 text-3xl font-black">
        {RARITY_EMOJI[rarity]} {RARITY_LABEL[rarity]}
      </div>

      <div className="my-10 flex items-center justify-center">
        <div
          className={`h-52 w-52 rounded-3xl shadow-[0_0_60px_rgba(255,255,255,0.4)] flex items-center justify-center text-[9rem] ${
            tapsLeft === 0 ? "animate-pulse" : ""
          }`}
          style={{ background: RARITY_BG_GRADIENT[rarity], filter: "brightness(1.15) saturate(1.3)" }}
        >
          {kind === "box" ? "📦" : "💗"}
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
          <div className="mt-4 text-xs opacity-75">Kaikki päivitykset käytetty</div>
        </>
      )}

      <Button
        variant="secondary"
        className="mt-8 opacity-70"
        onClick={(e) => { e.stopPropagation(); if (tapsLeft > 0) { setTapsLeft(0); } }}
      >
        {tapsLeft > 0 ? "Ohita päivitykset" : ""}
      </Button>
    </div>
  );
}