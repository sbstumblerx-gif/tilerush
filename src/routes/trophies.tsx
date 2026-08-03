import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Trophy, Lock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  loadProgress,
  saveProgress,
  trophyLevel,
  TROPHY_MAX_LEVEL,
  TROPHY_PER_LEVEL,
  type Progress,
} from "@/lib/game/progress";
import { trophyRewardFor, trophyRewardLabel, TROPHY_LEVELS } from "@/lib/game/trophies";
import { applyRewards, presentContainer } from "@/lib/game/containers";

export const Route = createFileRoute("/trophies")({
  head: () => ({
    meta: [
      { title: "Pokaalipolku · Tile Rush" },
      { name: "description", content: "Kerää pokaaleita onlinevoitoista ja paketeista ja lunasta palkintoja 50 tasolta." },
      { property: "og:title", content: "Pokaalipolku · Tile Rush" },
      { property: "og:description", content: "Uusi edistysjärjestelmä: 100 pokaalia per taso, 50 tasoa palkintoja." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrophyRoad,
});

function TrophyRoad() {
  const [p, setP] = useState<Progress | null>(null);
  useEffect(() => {
    setP(loadProgress());
    const h = () => setP(loadProgress());
    window.addEventListener("tilerush:progress", h);
    return () => window.removeEventListener("tilerush:progress", h);
  }, []);

  if (!p) return null;
  const level = trophyLevel(p.trophies ?? 0);
  const intoLevel = (p.trophies ?? 0) % TROPHY_PER_LEVEL;
  const pct = level >= TROPHY_MAX_LEVEL ? 100 : (intoLevel / TROPHY_PER_LEVEL) * 100;

  const claim = (lvl: number) => {
    const cur = loadProgress();
    if (trophyLevel(cur.trophies ?? 0) < lvl) return;
    if (cur.claimedTrophy.includes(lvl)) return;
    cur.claimedTrophy = [...cur.claimedTrophy, lvl];
    const r = trophyRewardFor(lvl);
    if (r.kind === "coins") applyRewards(cur, [{ type: "coins", amount: r.amount }]);
    else if (r.kind === "gems") applyRewards(cur, [{ type: "gems", amount: r.amount }]);
    saveProgress(cur);
    if (r.kind === "box" || r.kind === "heart") presentContainer(r.kind, r.rarity);
    setP(loadProgress());
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-[560px] mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Lobby
      </Link>
      <h1 className="mt-4 text-3xl font-black flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" /> Pokaalipolku
      </h1>

      <div className="mt-4 neon-panel p-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Taso</div>
            <div className="text-4xl font-black">{level}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black">🏆 {p.trophies ?? 0}</div>
            <div className="text-xs text-muted-foreground">
              {level >= TROPHY_MAX_LEVEL ? "Maksimitaso" : `${TROPHY_PER_LEVEL - intoLevel} pokaalia seuraavaan`}
            </div>
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-background/60 overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Onlinevoitto +30 · Onlinetappio −10 · Virallinen paketti +20 · Pelaajapaketti +5 (max 5/pv)
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {TROPHY_LEVELS.map((lvl) => {
          const r = trophyRewardFor(lvl);
          const unlocked = level >= lvl;
          const claimed = p.claimedTrophy.includes(lvl);
          return (
            <div
              key={lvl}
              className={`neon-panel p-3 flex items-center gap-3 ${unlocked ? "" : "opacity-60"}`}
            >
              <div className="w-10 h-10 rounded-full bg-background/60 flex items-center justify-center font-black">
                {lvl}
              </div>
              <div className="flex-1">
                <div className="font-bold">{trophyRewardLabel(r)}</div>
                <div className="text-xs text-muted-foreground">{lvl * TROPHY_PER_LEVEL} pokaalia</div>
              </div>
              {claimed ? (
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Check className="h-4 w-4" /> Lunastettu
                </span>
              ) : unlocked ? (
                <Button size="sm" onClick={() => claim(lvl)}>Lunasta</Button>
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/trophies')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/trophies"!</div>
}
