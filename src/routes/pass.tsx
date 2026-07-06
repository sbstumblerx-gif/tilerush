import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadProgress, saveProgress, type Progress } from "@/lib/game/progress";
import { ACCESSORIES, COLORS, PATTERNS, SHAPES, THEMES } from "@/lib/game/cosmetics";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/pass")({
  head: () => ({ meta: [{ title: "Tile Pass · Tile Rush" }] }),
  component: PassPage,
});

const REWARDS: Array<{ type: "coins" | "cosmetic"; amount?: number; cat?: string; itemId?: string; label: string }> = Array.from({ length: 30 }, (_, i) => {
  const tier = i + 1;
  if (tier % 2 === 1) return { type: "coins", amount: 100, label: "🪙 100" };
  const pools = [
    { cat: "colors", pool: COLORS },
    { cat: "shapes", pool: SHAPES },
    { cat: "patterns", pool: PATTERNS },
    { cat: "accessories", pool: ACCESSORIES },
    { cat: "themes", pool: THEMES },
  ];
  const p = pools[(tier / 2) % pools.length | 0];
  const item = p.pool[(tier + i) % p.pool.length];
  return { type: "cosmetic", cat: p.cat, itemId: item.id, label: `${p.cat}: ${item.label}` };
});

function PassPage() {
  const [p, setP] = useState<Progress | null>(null);
  useEffect(() => setP(loadProgress()), []);
  if (!p) return null;

  const claim = (tier: number) => {
    if (tier > p.passLevel || p.claimedPass.includes(tier)) return;
    const cur = loadProgress();
    const r = REWARDS[tier - 1];
    if (r.type === "coins") cur.coins += r.amount ?? 0;
    else if (r.cat && r.itemId) {
      const cat = r.cat as keyof typeof cur.owned;
      if (!cur.owned[cat].includes(r.itemId)) cur.owned[cat] = [...cur.owned[cat], r.itemId];
    }
    cur.claimedPass.push(tier);
    saveProgress(cur);
    setP(cur);
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-[520px] mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Lobby
      </Link>
      <div className="mt-4 flex justify-between items-end">
        <h1 className="text-3xl font-black">Tile Pass</h1>
        <span className="text-xs text-muted-foreground">Seuraava passi: 30.7.2026</span>
      </div>
      <div className="mt-2 text-sm text-muted-foreground">Taso {p.passLevel} / 30</div>
      <div className="mt-2 h-2 rounded-full bg-background/60 overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${(p.passLevel / 30) * 100}%` }} />
      </div>
      <div className="mt-6 space-y-2">
        {REWARDS.map((r, i) => {
          const tier = i + 1;
          const unlocked = tier <= p.passLevel;
          const claimed = p.claimedPass.includes(tier);
          return (
            <div key={tier} className={`neon-panel p-3 flex items-center justify-between ${!unlocked && "opacity-50"}`}>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Taso {tier}</div>
                <div className="font-semibold text-sm">{r.label}</div>
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
    </div>
  );
}