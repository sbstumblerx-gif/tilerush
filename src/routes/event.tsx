import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ShoppingBasket } from "lucide-react";
import { loadProgress, saveProgress, type Progress } from "@/lib/game/progress";
import { presentContainer } from "@/lib/game/containers";
import { msUntilSeasonEnd, formatDaysCountdown } from "@/lib/game/dailyReward";
import { findItem, CATEGORY_LABEL } from "@/lib/game/cosmetics";
import { RARITY_EMOJI, RARITY_LABEL } from "@/lib/game/rarity";
import {
  MUSHROOM_TRACK,
  MUSHROOM_LEVELS,
  POINTS_PER_LEVEL,
  BONUS_STEP,
  levelThreshold,
  bonusThreshold,
  reachedLevels,
  reachedBonuses,
  type MushroomLevel,
} from "@/lib/game/mushroom";

export const Route = createFileRoute("/event")({
  head: () => ({
    meta: [
      { title: "Sienimetsä · Tile Rush" },
      { name: "description", content: "Kerää 50 sientä koreilla, kasvata sienipisteitä ja lunasta Sienimetsä-kauden eksklusiivinen kosmetiikka Tile Rushissa." },
      { property: "og:title", content: "Sienimetsä · Tile Rush" },
      { property: "og:description", content: "Kausi 3: 50 sientä, koreja ja kahdeksan sienitason palkkiot." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventPage,
});

function containersLabel(lvl: MushroomLevel): string {
  return lvl.containers
    .map((c) => `${c.count}x ${c.kind === "box" ? "📦" : "💗"} ${RARITY_LABEL[c.rarity]}`)
    .join(" · ");
}

function cosmeticLabel(lvl: MushroomLevel): string {
  const it = findItem(lvl.cosmetic.category, lvl.cosmetic.itemId);
  const cat = CATEGORY_LABEL[lvl.cosmetic.category].replace("Uusi ", "").replace("!", "");
  return `${it?.preview ?? "✨"} ${it?.label ?? lvl.cosmetic.itemId} (${cat}, ${RARITY_EMOJI[lvl.cosmetic.rarity]} ${RARITY_LABEL[lvl.cosmetic.rarity]})`;
}

function EventPage() {
  const [p, setP] = useState<Progress | null>(null);
  const [last, setLast] = useState<string | null>(null);

  useEffect(() => {
    const load = () => setP(loadProgress());
    load();
    window.addEventListener("tilerush:progress", load);
    return () => window.removeEventListener("tilerush:progress", load);
  }, []);

  if (!p) return null;

  const forest = p.forest ?? [];
  const baskets = p.keys ?? 0;
  const points = p.mushroomPoints ?? 0;
  const picked = forest.filter((c) => c.picked).length;
  const claimed = p.claimedMushroom ?? [];
  const claimedBonus = p.claimedMushroomBonus ?? 0;

  const maxPoints = MUSHROOM_LEVELS * POINTS_PER_LEVEL;
  const barPct = Math.min(100, (points / maxPoints) * 100);
  const availableBonus = reachedBonuses(points) - claimedBonus;

  const pick = (index: number) => {
    const cur = loadProgress();
    const cells = cur.forest ?? [];
    const cell = cells[index];
    if (!cell || cell.picked) return;
    if ((cur.keys ?? 0) < 1) {
      setLast("Ei koreja! Hanki koreja tehtävistä, kaupasta, päivän lahjasta tai Tile Passista.");
      return;
    }
    cur.keys = (cur.keys ?? 0) - 1;
    cell.picked = true;
    cur.mushroomPoints = (cur.mushroomPoints ?? 0) + cell.points;
    saveProgress(cur);
    setP(cur);
    setLast(`🍄 Sieni ${index + 1}: +${cell.points} sienipistettä`);
  };

  const claimLevel = (lvl: MushroomLevel) => {
    const cur = loadProgress();
    if ((cur.mushroomPoints ?? 0) < levelThreshold(lvl.level)) return;
    if ((cur.claimedMushroom ?? []).includes(lvl.level)) return;
    cur.claimedMushroom = [...(cur.claimedMushroom ?? []), lvl.level];
    const list = (cur.owned as unknown as Record<string, string[]>)[lvl.cosmetic.category] ?? [];
    if (!list.includes(lvl.cosmetic.itemId)) {
      (cur.owned as unknown as Record<string, string[]>)[lvl.cosmetic.category] = [...list, lvl.cosmetic.itemId];
    }
    saveProgress(cur);
    setP(cur);
    setLast(`Sienitaso ${lvl.level} lunastettu: ${cosmeticLabel(lvl)}`);
    for (const c of lvl.containers) {
      for (let i = 0; i < c.count; i++) presentContainer(c.kind, c.rarity);
    }
  };

  const claimBonus = () => {
    const cur = loadProgress();
    const avail = reachedBonuses(cur.mushroomPoints ?? 0) - (cur.claimedMushroomBonus ?? 0);
    if (avail < 1) return;
    cur.claimedMushroomBonus = (cur.claimedMushroomBonus ?? 0) + 1;
    saveProgress(cur);
    setP(cur);
    setLast("Bonus lunastettu: 📦 ultralaatikko");
    presentContainer("box", "ultra");
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-[560px] mx-auto">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Lobby
        </Link>
        <span className="neon-panel px-3 py-1 text-sm font-bold">🧺 {baskets}</span>
      </div>

      <h1 className="mt-4 text-3xl font-black">Sienimetsä</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Metsässä kasvaa 50 sientä. Yksi kori poimii yhden sienen — sienipisteet on arvottu valmiiksi,
        mutta näet ne vasta poimimisen jälkeen.
      </p>
      <div className="mt-1 text-xs text-muted-foreground">
        Kausi päättyy 1.12.2026 (UTC) · {formatDaysCountdown(msUntilSeasonEnd())}
      </div>

      {/* Sienipistepalkki + palkkiot sen yläpuolella */}
      <div className="mt-5 neon-panel p-4 flex gap-4">
        <div className="flex flex-col items-center">
          <div className="text-xs font-bold text-amber-400">{points}</div>
          <div className="mt-2 relative h-72 w-6 rounded-full bg-background/60 overflow-hidden border border-border/60">
            <div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[oklch(0.55_0.16_140)] to-[oklch(0.78_0.16_75)] transition-all"
              style={{ height: `${barPct}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-muted-foreground">sienipisteet</div>
        </div>

        <div className="flex-1 flex flex-col-reverse gap-2">
          {MUSHROOM_TRACK.map((lvl) => {
            const need = levelThreshold(lvl.level);
            const ready = points >= need;
            const isClaimed = claimed.includes(lvl.level);
            return (
              <div
                key={lvl.level}
                className={`rounded-lg border p-2 ${
                  isClaimed
                    ? "border-primary/50 bg-primary/10"
                    : ready
                      ? "border-amber-400/70 bg-amber-500/10"
                      : "border-border/50 bg-background/40 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Sienitaso {lvl.level} · {need} sp
                    </div>
                    <div className="text-xs font-semibold truncate">{containersLabel(lvl)}</div>
                    <div className="text-[11px] text-amber-300 truncate">{cosmeticLabel(lvl)}</div>
                  </div>
                  <button
                    disabled={!ready || isClaimed}
                    onClick={() => claimLevel(lvl)}
                    className="shrink-0 text-[11px] font-bold px-2.5 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-40"
                  >
                    {isClaimed ? "✓" : ready ? "Lunasta" : "🔒"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bonuspalkkiot tasojen jälkeen */}
      <div className="mt-4 neon-panel p-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Bonus</div>
          <div className="font-bold">Joka {BONUS_STEP} sienipistettä → 📦 ultralaatikko</div>
          <div className="text-xs text-muted-foreground mt-1">
            Seuraava: {bonusThreshold(claimedBonus + 1)} sp
          </div>
        </div>
        <button
          onClick={claimBonus}
          disabled={availableBonus < 1}
          className="px-3 py-2 rounded bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40"
        >
          {availableBonus > 0 ? `Lunasta (${availableBonus})` : "🔒"}
        </button>
      </div>

      <div className="mt-4 neon-panel p-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Poimitut sienet</div>
          <div className="text-2xl font-black">{picked} / 50</div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div className="flex items-center gap-1 justify-end font-bold text-foreground">
            <ShoppingBasket className="h-4 w-4 text-amber-400" /> {baskets} koria
          </div>
          <div className="mt-1">Koreja: 3 ilmaista päivässä, tehtävistä, kaupasta ja Tile Passista</div>
        </div>
      </div>

      {last && <div className="mt-3 neon-panel p-3 text-sm font-semibold">{last}</div>}

      <div className="mt-4 grid grid-cols-5 gap-2">
        {forest.map((cell, i) => (
          <button
            key={i}
            onClick={() => pick(i)}
            disabled={cell.picked || baskets < 1}
            className={`aspect-[3/4] rounded-lg border flex flex-col items-center justify-center text-xl transition-colors ${
              cell.picked
                ? "border-primary/50 bg-primary/10"
                : "border-border/60 bg-background/40 hover:border-primary/60 disabled:opacity-50"
            }`}
          >
            {cell.picked ? (
              <>
                <span>🍄</span>
                <span className="text-[10px] font-bold text-amber-300">+{cell.points}</span>
              </>
            ) : (
              <span className="text-sm opacity-60">🌿</span>
            )}
            <span className="mt-0.5 text-[9px] text-muted-foreground">{i + 1}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 neon-panel p-4 text-xs text-muted-foreground space-y-1">
        <div className="text-foreground font-bold text-sm">Metsän sienet</div>
        <div>🍄 25 sienipistettä · 10 sientä</div>
        <div>🍄 40 sienipistettä · 10 sientä</div>
        <div>🍄 65 sienipistettä · 10 sientä</div>
        <div>🍄 80 sienipistettä · 10 sientä</div>
        <div>🍄 100 sienipistettä · 10 sientä</div>
        <div className="pt-1">Jokainen sienitaso vaatii {POINTS_PER_LEVEL} sienipistettä.</div>
      </div>
    </div>
  );
}
