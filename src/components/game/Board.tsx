import { useEffect, useMemo, useState } from "react";
import type { GameState, Pos, TileKind } from "@/lib/game/types";
import { displayKind, stepCost } from "@/lib/game/engine";
import { cn } from "@/lib/utils";
import { PlayerToken } from "./PlayerToken";
import { loadProgress, type Equipped } from "@/lib/game/progress";

interface Props {
  state: GameState;
  onTileClick: (pos: Pos) => void;
}

const TILE_BG: Record<TileKind, string> = {
  normal: "bg-[var(--tile-normal)] text-[var(--tile-normal-fg)]",
  obstacle: "bg-[var(--tile-obstacle)]",
  energy: "bg-[var(--tile-energy)]",
  heavy: "bg-[var(--tile-heavy)]",
  ice: "bg-[var(--tile-ice)]",
  portal: "bg-[var(--tile-portal)]",
  charger: "bg-[var(--tile-charger)]",
  random: "bg-[var(--tile-random)]",
  enemy: "bg-[var(--tile-enemy)] text-white",
  launcher: "bg-[var(--tile-launcher)]",
  start: "bg-[var(--tile-start)]",
  goal: "bg-[var(--tile-goal)]",
};

const TILE_LABEL: Partial<Record<TileKind, string>> = {
  energy: "E",
  heavy: "×2",
  ice: "❄",
  portal: "◎",
  charger: "+5",
  random: "?",
  enemy: "💗",
  launcher: "🚀",
  goal: "★",
};

export function Board({ state, onTileClick }: Props) {
  const { rows, cols, player, tiles, aimingItem } = state;
  const [equipped, setEquipped] = useState<Equipped | null>(null);
  useEffect(() => {
    setEquipped(loadProgress().equipped);
    const h = () => setEquipped(loadProgress().equipped);
    window.addEventListener("tilerush:progress", h);
    return () => window.removeEventListener("tilerush:progress", h);
  }, []);

  const validTargets = useMemo(() => {
    const set = new Set<string>();
    if (state.status !== "playing") return set;
    if (aimingItem === "tnt") {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (tiles[r][c].kind === "obstacle") set.add(`${r},${c}`);
        }
      }
      return set;
    }
    if (aimingItem === "volleyball") {
      const dirs: Pos[] = [
        { r: player.r - 2, c: player.c },
        { r: player.r + 2, c: player.c },
        { r: player.r, c: player.c - 2 },
        { r: player.r, c: player.c + 2 },
      ];
      for (const p of dirs) {
        if (p.r < 0 || p.r >= rows || p.c < 0 || p.c >= cols) continue;
        if (tiles[p.r][p.c].kind === "obstacle") continue;
        set.add(`${p.r},${p.c}`);
      }
      return set;
    }
    const neighbors: Pos[] = [
      { r: player.r - 1, c: player.c },
      { r: player.r + 1, c: player.c },
      { r: player.r, c: player.c - 1 },
      { r: player.r, c: player.c + 1 },
    ];
    for (const p of neighbors) {
      if (p.r < 0 || p.r >= rows || p.c < 0 || p.c >= cols) continue;
      const cost = stepCost(tiles[p.r][p.c], state.curseTurns);
      if (!isFinite(cost)) continue;
      if (cost > state.movesLeft) continue;
      set.add(`${p.r},${p.c}`);
    }
    return set;
  }, [state, aimingItem, player, rows, cols, tiles]);

  const size = Math.max(rows, cols);
  const cellPx = size <= 5 ? 60 : size <= 6 ? 54 : 46;

  return (
    <div
      className="neon-panel p-3 sm:p-4"
      style={{ boxShadow: "var(--glow-primary)" }}
    >
      <div
        className="grid gap-1.5 sm:gap-2"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${cellPx}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellPx}px)`,
        }}
      >
        {tiles.map((row, r) =>
          row.map((tile, c) => {
            const kind = displayKind(state, r, c);
            const isPlayer = state.player.r === r && state.player.c === c;
            const isGoal = state.goal.r === r && state.goal.c === c;
            const targetable = validTargets.has(`${r},${c}`);
            const bg = TILE_BG[kind] ?? TILE_BG.normal;
            const label = TILE_LABEL[tile.kind];
            const cost = stepCost(tile, state.curseTurns);
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => onTileClick({ r, c })}
                disabled={!targetable || isPlayer}
                className={cn(
                  "tile-face relative text-sm sm:text-base",
                  bg,
                  tile.kind === "obstacle" && "cursor-not-allowed opacity-90",
                  targetable && "ring-2 ring-primary ring-offset-1 ring-offset-transparent hover:scale-105",
                  !targetable && !isPlayer && "cursor-default",
                )}
                style={{
                  animation: "tile-pop 250ms ease-out both",
                }}
                aria-label={`Ruutu ${r},${c} ${tile.kind}`}
              >
                {isGoal && !isPlayer && (
                  <span className="text-lg font-black">★</span>
                )}
                {!isGoal && label && (
                  <span className="text-xs sm:text-sm font-bold opacity-80">
                    {label}
                  </span>
                )}
                {targetable && cost > 0 && !isGoal && (
                  <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-foreground/70">
                    {isFinite(cost) ? cost : ""}
                  </span>
                )}
                {isPlayer && (
                  <span
                    className="absolute inset-1 flex items-center justify-center"
                    style={{ animation: "player-pulse 1.4s ease-in-out infinite" }}
                  >
                    {equipped ? (
                      <PlayerToken equipped={equipped} size={cellPx - 12} />
                    ) : (
                      <span className="h-6 w-6 rounded-full bg-primary" />
                    )}
                  </span>
                )}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}