import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { getLevel } from "@/lib/game/levels";
import { createState, selectItem, tryMove, tryTnt, tryVolleyball } from "@/lib/game/engine";
import type { GameState, ItemKind, Pos } from "@/lib/game/types";
import { loadProgress, saveProgress } from "@/lib/game/progress";
import { playBgm, playSfx } from "@/lib/game/sound";
import { Board } from "@/components/game/Board";
import { HUD } from "@/components/game/HUD";
import { RewardScreen } from "@/components/game/RewardScreen";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, RotateCcw } from "lucide-react";

const playSearchSchema = z.object({
  level: z.number().catch(1),
});

export const Route = createFileRoute("/play")({
  head: () => ({ meta: [{ title: "Pelaa · Tile Rush" }] }),
  validateSearch: playSearchSchema,
  component: PlayPage,
});

/** Stars awarded based on how many moves were left when the level was won. */
function starsFor(state: GameState, movesAllowed: number): number {
  const ratio = state.movesLeft / Math.max(1, movesAllowed);
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.2) return 2;
  return 1;
}

function PlayPage() {
  const navigate = useNavigate();
  const { level: levelId } = Route.useSearch();
  const level = useMemo(() => getLevel(levelId), [levelId]);

  const [state, setState] = useState<GameState | null>(null);
  const [rewardApplied, setRewardApplied] = useState(false);

  useEffect(() => {
    if (!level) return;
    setState(createState(level));
    setRewardApplied(false);
    playBgm();

    const p = loadProgress();
    p.stats.starts += 1;
    saveProgress(p);
  }, [level]);

  // Apply win/loss rewards exactly once per playthrough.
  useEffect(() => {
    if (!state || !level || rewardApplied) return;
    if (state.status === "won") {
      setRewardApplied(true);
      playSfx("win");
      const p = loadProgress();
      const stars = starsFor(state, level.moves);
      const prevStars = p.stars[level.id] ?? 0;
      p.stars[level.id] = Math.max(prevStars, stars);
      if (!p.completed.includes(level.id)) p.completed.push(level.id);
      const coinsEarned = 20 + stars * 10;
      p.coins += coinsEarned;
      p.stats.wins += 1;
      p.stats.stars += Math.max(0, stars - prevStars);
      window.dispatchEvent(new Event("tilerush:progress"));
      saveProgress(p);
    } else if (state.status === "lost") {
      setRewardApplied(true);
      playSfx("lose");
      const p = loadProgress();
      p.stats.losses += 1;
      saveProgress(p);
      window.dispatchEvent(new Event("tilerush:progress"));
    }
  }, [state, level, rewardApplied]);

  if (!level) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-muted-foreground">Tasoa ei löytynyt.</p>
        <Link to="/levels">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Takaisin tasoihin
          </Button>
        </Link>
      </div>
    );
  }

  if (!state) return null;

  const move = (pos: Pos) => {
    setState((prev) => {
      if (!prev) return prev;
      if (prev.aimingItem === "tnt") return tryTnt(prev, pos);
      if (prev.aimingItem === "volleyball") return tryVolleyball(prev, pos);
      const before = prev.movesLeft;
      const next = tryMove(prev, pos);
      if (next !== prev) {
        const p = loadProgress();
        p.stats.totalMoves += 1;
        p.stats.tileUses[next.tiles[pos.r][pos.c].kind] =
          (p.stats.tileUses[next.tiles[pos.r][pos.c].kind] ?? 0) + 1;
        if (before > next.movesLeft && next.log.some((l) => l.includes("Vihollisaura"))) {
          p.stats.enemySteps += 1;
        }
        if (next.lastRandomResult) p.stats.randomGains += 1;
        saveProgress(p);
      }
      return next;
    });
  };

  const selectItemHandler = (item: ItemKind) => {
    setState((prev) => (prev ? selectItem(prev, item) : prev));
    const p = loadProgress();
    p.stats.itemUses += 1;
    saveProgress(p);
  };

  const restart = () => {
    setState(createState(level));
    setRewardApplied(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center gap-4 px-4 py-6 sm:py-10">
      <HUD
        state={state}
        levelName={level.name}
        onSelectItem={selectItemHandler}
        onRestart={restart}
        onExit={() => navigate({ to: "/levels" })}
      />

      <Board state={state} onTileClick={move} />

      {state.status !== "playing" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="neon-panel p-6 max-w-sm w-full space-y-4 text-center">
            <h2 className="text-2xl font-black">
              {state.status === "won" ? "🏁 Maali saavutettu!" : "💀 Siirrot loppuivat"}
            </h2>
            <div className="flex gap-2 justify-center">
              <Button className="gap-2" onClick={restart}>
                <RotateCcw className="h-4 w-4" /> Uudelleen
              </Button>
              {state.status === "won" && (
                <Button
                  variant="secondary"
                  className="gap-2"
                  onClick={() => navigate({ to: "/play", search: { level: level.id + 1 } })}
                >
                  <Play className="h-4 w-4" /> Seuraava
                </Button>
              )}
            </div>
            <button
              onClick={() => navigate({ to: "/levels" })}
              className="text-xs text-muted-foreground underline"
            >
              Takaisin tasoihin
            </button>
          </div>
        </div>
      )}

      <RewardScreen />
    </div>
  );
}
