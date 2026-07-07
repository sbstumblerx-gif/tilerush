import type { GameState } from "@/lib/game/types";
import { Button } from "@/components/ui/button";
import { Bomb, Footprints, Sparkles, Volleyball, Zap } from "lucide-react";
import type { ItemKind } from "@/lib/game/types";

interface Props {
  state: GameState;
  levelName: string;
  onSelectItem: (item: ItemKind) => void;
  onRestart: () => void;
  onExit: () => void;
}

export function HUD({ state, levelName, onSelectItem, onRestart, onExit }: Props) {
  return (
    <div className="neon-panel w-full max-w-[520px] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Taso {state.levelId}
          </div>
          <div className="text-lg font-bold">{levelName}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onRestart}>
            Uudelleen
          </Button>
          <Button variant="outline" size="sm" onClick={onExit}>
            Lobby
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat icon={<Footprints className="h-4 w-4" />} label="Siirrot" value={String(state.movesLeft)} />
        <Stat
          icon={<Sparkles className="h-4 w-4" />}
          label="Kirous"
          value={state.curseTurns > 0 ? `${state.curseTurns}` : "–"}
          highlight={state.curseTurns > 0}
        />
        <Stat icon={<Zap className="h-4 w-4" />} label="Itemit" value={String(state.items.length)} />
      </div>

      {state.items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {state.items.map((it, i) => (
            <Button
              key={i}
              size="sm"
              variant={state.aimingItem === it ? "default" : "secondary"}
              onClick={() => onSelectItem(it)}
              className="gap-2"
            >
              {it === "tnt" ? <Bomb className="h-4 w-4" /> : <Volleyball className="h-4 w-4" />}
              {it === "tnt" ? "TNT" : "Lentopallo"}
            </Button>
          ))}
        </div>
      )}

      <div className="max-h-24 overflow-auto rounded-md bg-background/40 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
        {state.log.slice(-6).map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-md border border-border/60 bg-background/40 px-3 py-2 " +
        (highlight ? "text-destructive-foreground bg-destructive/30" : "")
      }
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-xl font-black">{value}</div>
    </div>
  );
}