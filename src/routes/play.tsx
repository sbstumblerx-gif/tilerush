import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Board } from "@/components/game/Board";
import { HUD } from "@/components/game/HUD";
import { Button } from "@/components/ui/button";
import { getLevel, LEVELS } from "@/lib/game/levels";
import { createState, selectItem, tryMove, tryVolleyball } from "@/lib/game/engine";
import type { GameState, Pos } from "@/lib/game/types";
import {
  calcStars,
  loadProgress,
  markComplete,
  markLoss,
  markStart,
  saveProgress,
} from "@/lib/game/progress";

const searchSchema = z.object({
  level: z.coerce.number().int().min(1).default(1),
});

export const Route = createFileRoute("/play")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Pelaa · Tile Rush" },
      { name: "description", content: "Ratkaise ruudukkopulmia rajallisilla siirroilla." },
    ],
  }),
  component: PlayPage,
});

function PlayPage() {
  const { level: levelId } = Route.useSearch();
  const navigate = useNavigate();
  const level = getLevel(levelId) ?? LEVELS[0];
  const [state, setState] = useState<GameState>(() => createState(level));
  const [prevState, setPrevState] = useState<GameState | null>(null);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    setState(createState(level));
    setEnded(false);
    markStart();
  }, [level]);

  useEffect(() => {
    if (ended) return;
    if (state.status === "won") {
      const stars = calcStars(state.movesLeft, level.moves);
      const wasCompleted = loadProgress().completed.includes(state.levelId);
      markComplete(state.levelId, {
        movesLeft: state.movesLeft,
        totalMoves: level.moves - state.movesLeft,
        stars,
      });
      // Track "beat new level" daily task
      if (!wasCompleted) {
        const p = loadProgress();
        if (p.daily) {
          p.daily.tasks.forEach((t) => {
            if (t.id === "beat-3") t.progress = Math.min(t.target, t.progress + 1);
            if (t.id === "stars-10") t.progress = Math.min(t.target, t.progress + stars);
          });
          saveProgress(p);
        }
      }
      setEnded(true);
    } else if (state.status === "lost") {
      markLoss(level.moves - state.movesLeft);
      setEnded(true);
    }
  }, [state.status, state.levelId, state.movesLeft, level.moves, ended]);

  // Track tile usage + item uses + enemy steps + random wins from diffs
  useEffect(() => {
    if (!prevState) {
      setPrevState(state);
      return;
    }
    if (prevState === state) return;
    const p = loadProgress();
    const cur = state.tiles[state.player.r][state.player.c];
    // player moved
    if (prevState.player.r !== state.player.r || prevState.player.c !== state.player.c) {
      p.stats.tileUses[cur.kind] = (p.stats.tileUses[cur.kind] ?? 0) + 1;
      // check original tile at destination BEFORE resolveEnter — best-effort by looking at previous grid
      const origin = prevState.tiles[state.player.r]?.[state.player.c];
      if (origin?.kind === "enemy") {
        p.stats.enemySteps += 1;
        if (p.daily) {
          p.daily.tasks.forEach((t) => {
            if (t.id === "enemy-walk-3") t.progress = Math.min(t.target, t.progress + 1);
          });
        }
      }
      const dailyMap: Record<string, string> = {
        energy: "use-energy-20",
        heavy: "use-heavy-20",
        ice: "use-ice-20",
      };
      const dailyId = dailyMap[origin?.kind ?? ""];
      if (dailyId && p.daily) {
        p.daily.tasks.forEach((t) => {
          if (t.id === dailyId) t.progress = Math.min(t.target, t.progress + 1);
        });
      }
    }
    // item used = fewer items than before
    if (prevState.items.length > state.items.length) {
      p.stats.itemUses += 1;
      p.tileCup.volleyUses += 1;
      p.tileCup.tasks.forEach((t) => {
        if (t.id === "vb10") t.progress = Math.min(t.target, t.progress + 1);
      });
      if (p.daily) {
        p.daily.tasks.forEach((t) => {
          if (t.id === "item-5") t.progress = Math.min(t.target, t.progress + 1);
        });
      }
    }
    // detect random gain (movesLeft increased)
    if (state.movesLeft > prevState.movesLeft && state.lastRandomResult && state.lastRandomResult !== prevState.lastRandomResult) {
      if (state.lastRandomResult.includes("+") || state.lastRandomResult.includes("lentopallo")) {
        p.stats.randomGains += 1;
        if (p.daily) {
          p.daily.tasks.forEach((t) => {
            if (t.id === "random-win-10") t.progress = Math.min(t.target, t.progress + 1);
          });
        }
      }
    }
    saveProgress(p);
    setPrevState(state);
  }, [state, prevState]);

  const handleTile = useCallback(
    (p: Pos) => {
      setState((s) => {
        if (s.aimingItem === "volleyball") return tryVolleyball(s, p);
        return tryMove(s, p);
      });
    },
    [],
  );

  const restart = useCallback(() => setState(createState(level)), [level]);
  const exit = useCallback(() => navigate({ to: "/" }), [navigate]);

  const nextLevelId = useMemo(() => {
    const idx = LEVELS.findIndex((l) => l.id === level.id);
    return LEVELS[idx + 1]?.id;
  }, [level.id]);

  return (
    <div className="min-h-screen flex flex-col items-center px-3 py-6 gap-4">
      <HUD
        state={state}
        levelName={level.name}
        onSelectItem={(it) => setState((s) => selectItem(s, it))}
        onRestart={restart}
        onExit={exit}
      />

      <Board state={state} onTileClick={handleTile} />

      {state.status !== "playing" && (
        <div className="neon-panel w-full max-w-[420px] p-5 text-center flex flex-col gap-3">
          <div className="text-2xl font-black">
            {state.status === "won" ? "🏆 Voitto!" : "💀 Häviö"}
          </div>
          <div className="text-sm text-muted-foreground">
            {state.status === "won"
              ? `Suoritit tason ${state.levelId} · ${state.movesLeft} siirtoa jäljellä`
              : "Siirrot loppuivat kesken. Uusi yritys?"}
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={restart} variant="secondary">
              Uudelleen
            </Button>
            {state.status === "won" && nextLevelId && (
              <Button
                onClick={() =>
                  navigate({ to: "/play", search: { level: nextLevelId } })
                }
              >
                Seuraava taso
              </Button>
            )}
            <Button onClick={exit} variant="outline">
              Lobby
            </Button>
          </div>
        </div>
      )}

      <TileLegend />
    </div>
  );
}

function TileLegend() {
  const items = [
    ["bg-[var(--tile-normal)]", "Tavallinen · 1"],
    ["bg-[var(--tile-heavy)]", "Raskas · 2"],
    ["bg-[var(--tile-energy)]", "Energia · 0"],
    ["bg-[var(--tile-ice)]", "Jää · liuku"],
    ["bg-[var(--tile-portal)]", "Portaali"],
    ["bg-[var(--tile-charger)]", "Lataus +5"],
    ["bg-[var(--tile-random)]", "Arpa ?"],
    ["bg-[var(--tile-enemy)]", "💗 Aura −3"],
    ["bg-[var(--tile-launcher)]", "🚀 Laukaisu"],
    ["bg-[var(--tile-obstacle)]", "Este"],
  ] as const;
  return (
    <div className="neon-panel w-full max-w-[520px] p-3 grid grid-cols-4 gap-2">
      {items.map(([cls, label]) => (
        <div key={label} className="flex items-center gap-2 text-[11px]">
          <span className={`h-4 w-4 rounded ${cls}`} />
          <span className="text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}