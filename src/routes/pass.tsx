import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadProgress, saveProgress, xpForTier, type Progress } from "@/lib/game/progress";
import { ArrowLeft, Coins } from "lucide-react";
import { OpenContainer } from "@/components/game/OpenContainer";
import { RewardScreen } from "@/components/game/RewardScreen";
import { RARITY_EMOJI, type Rarity } from "@/lib/game/rarity";
import { msUntilSeasonEnd, formatDaysCountdown } from "@/lib/game/dailyReward";

export const Route = createFileRoute("/pass")({
  head: () => ({ meta: [{ title: "Tile Pass · Tile Rush" }] }),
  component: PassPage,
});

type Reward =
  | { kind: "coins"; amount: number }
  | { kind: "heart"; rarity: Rarity }
  | { kind: "box"; rarity: Rarity };

function rewardFor(tier: number): Reward {
  // guaranteed at 30/60
  if (tier === 60) return { kind: "box", rarity: "ultra" };
  if (tier === 30) return { kind: "box", rarity: "mythic" };
  if (tier % 10 === 0) {
    const idx = Math.min(3, Math.floor(tier / 10) - 1);
    const rar: Rarity = (["common", "rare", "epic", "legendary"] as const)[idx];
    return { kind: "box", rarity: rar };
  }
  if (tier % 2 === 1) return { kind: "coins", amount: 100 };
  return { kind: "heart", rarity: "common" };
}

function rewardLabel(r: Reward): string {
  if (r.kind === "coins") return `🪙 ${r.amount}`;
  if (r.kind === "heart") return `💗 Loot-sydän ${RARITY_EMOJI[r.rarity]}`;
  return `📦 Laatikko ${RARITY_EMOJI[r.rarity]}`;
}

function PassPage() {
  const [p, setP] = useState<Progress | null>(null);
  const [opening, setOpening] = useState<{ id: string; kind: "box" | "heart"; rarity: Rarity } | null>(null);

  useEffect(() => {
    const load = () => setP(loadProgress());
    load();
    window.addEventListener("tilerush:progress", load);
    return () => window.removeEventListener("tilerush:progress", load);
  }, []);

  if (!p) return null;

  const need = p.passLevel < 60 ? xpForTier(p.passLevel) : 500;
  const cur = p.passLevel < 60 ? p.passXp : p.prestigeXp;

  const claim = (tier: number) => {
    if (tier > p.passLevel || p.claimedPass.includes(tier)) return;
    const cp = loadProgress();
    const r = rewardFor(tier);
    if (r.kind === "coins") {
      cp.coins += r.amount;
    } else if (r.kind === "heart") {
      cp.inventory.hearts.push({ id: `heart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, rarity: r.rarity });
    } else {
      cp.inventory.boxes.push({ id: `box-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, rarity: r.rarity });
    }
    cp.claimedPass.push(tier);
    saveProgress(cp);
    setP(cp);
  };

  const buyNext = () => {
    if (p.passLevel >= 60) return;
    if (p.coins < 300) return;
    const cp = loadProgress();
    cp.coins -= 300;
    cp.passLevel += 1;
    cp.passXp = 0;
    saveProgress(cp);
    setP(cp);
  };

  const openContainer = (kind: "box" | "heart", rarity: Rarity, id: string) => {
    setOpening({ id, kind, rarity });
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-[560px] mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Lobby
      </Link>
      <div className="mt-4 flex justify-between items-end">
        <h1 className="text-3xl font-black">Tile Pass</h1>
        <span className="text-xs text-muted-foreground text-right">
          Passi päättyy 30.7.2026<br />
          <span className="text-primary">{formatDaysCountdown(msUntilSeasonEnd())}</span>
        </span>
      </div>
      <div className="mt-2 text-sm text-muted-foreground">
        {p.passLevel >= 60 ? `Prestige · ${p.prestigeXp}/500 XP → laatikko` : `Taso ${p.passLevel} / 60 · ${p.passXp}/${need} XP`}
      </div>
      <div className="mt-2 h-3 rounded-full bg-background/60 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary to-[oklch(0.7_0.2_320)]" style={{ width: `${(cur / need) * 100}%` }} />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          disabled={p.passLevel >= 60 || p.coins < 300}
          onClick={buyNext}
          className="neon-panel px-4 py-2 text-sm font-bold flex items-center gap-2 disabled:opacity-40"
        >
          <Coins className="h-4 w-4" /> Osta seuraava taso · 300
        </button>
        <span className="text-xs text-muted-foreground">Kolikoita: {p.coins}</span>
      </div>

      <div className="mt-6 space-y-2">
        {Array.from({ length: 60 }, (_, i) => i + 1).map((tier) => {
          const unlocked = tier <= p.passLevel;
          const claimed = p.claimedPass.includes(tier);
          const r = rewardFor(tier);
          const guaranteed = tier === 30 || tier === 60;
          return (
            <div key={tier} className={`neon-panel p-3 flex items-center justify-between ${!unlocked && "opacity-50"} ${guaranteed && "border-primary/70"}`}>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Taso {tier}
                  {guaranteed && <span className="ml-2 text-primary">TAATTU</span>}
                </div>
                <div className="font-semibold text-sm">{rewardLabel(r)}</div>
              </div>
              <button
                disabled={!unlocked || claimed}
                onClick={() => claim(tier)}
                className="text-xs font-bold px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-40"
              >
                {claimed ? "✓" : unlocked ? "Lunasta" : "🔒"}
              </button>
            </div>
          );
        })}
      </div>

      {p.inventory.hearts.length + p.inventory.boxes.length > 0 && (
        <div className="mt-8 neon-panel p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Inventaario</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {p.inventory.boxes.map((b) => (
              <button key={b.id} onClick={() => openContainer("box", b.rarity, b.id)} className="neon-panel px-2 py-1 text-xs">
                📦 {RARITY_EMOJI[b.rarity]}
              </button>
            ))}
            {p.inventory.hearts.map((h) => (
              <button key={h.id} onClick={() => openContainer("heart", h.rarity, h.id)} className="neon-panel px-2 py-1 text-xs">
                💗 {RARITY_EMOJI[h.rarity]}
              </button>
            ))}
          </div>
        </div>
      )}

      {opening && (
        <OpenContainer
          id={opening.id}
          kind={opening.kind}
          startRarity={opening.rarity}
          onDone={() => setOpening(null)}
        />
      )}
      <RewardScreen />
    </div>
  );
}
