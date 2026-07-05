import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Play,
  Map,
  ShoppingBag,
  Palette,
  ClipboardList,
  Ticket,
  Settings,
  BarChart3,
} from "lucide-react";
import { useEffect, useState } from "react";
import { LEVELS } from "@/lib/game/levels";
import { firstUnfinished, loadProgress } from "@/lib/game/progress";

export const Route = createFileRoute("/")({
  component: Lobby,
});

function Lobby() {
  const navigate = useNavigate();
  const [nextLevel, setNextLevel] = useState(1);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    const p = loadProgress();
    setNextLevel(firstUnfinished(p.completed, LEVELS.map((l) => l.id)));
    setCompletedCount(p.completed.length);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 sm:py-14">
      <header className="text-center mb-8 sm:mb-10">
        <div className="text-xs uppercase tracking-[0.4em] text-primary/80">
          Tile
        </div>
        <h1 className="mt-2 text-5xl sm:text-7xl font-black tracking-tight bg-gradient-to-br from-[oklch(0.85_0.15_200)] via-[oklch(0.75_0.18_265)] to-[oklch(0.72_0.2_320)] bg-clip-text text-transparent">
          RUSH
        </h1>
        <p className="mt-3 text-sm text-muted-foreground max-w-xs mx-auto">
          Suunnittele reittisi. Hallitse siirtoja. Selviä maaliin.
        </p>
      </header>

      <Button
        size="lg"
        onClick={() => navigate({ to: "/play", search: { level: nextLevel } })}
        className="h-16 w-full max-w-[420px] text-lg font-bold gap-3 shadow-[var(--glow-primary)]"
      >
        <Play className="h-5 w-5 fill-current" />
        Pelaa · Taso {nextLevel}
      </Button>

      <div className="mt-2 text-xs text-muted-foreground">
        {completedCount} / {LEVELS.length} tasoa suoritettu
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 w-full max-w-[420px]">
        <MenuTile to="/levels" icon={<Map className="h-5 w-5" />} label="Tasot" />
        <MenuTile to="/shop" icon={<ShoppingBag className="h-5 w-5" />} label="Kauppa" />
        <MenuTile to="/customize" icon={<Palette className="h-5 w-5" />} label="Mukauta" />
        <MenuTile to="/tasks" icon={<ClipboardList className="h-5 w-5" />} label="Tehtävät" />
        <MenuTile to="/pass" icon={<Ticket className="h-5 w-5" />} label="Tile Pass" />
        <MenuTile to="/stats" icon={<BarChart3 className="h-5 w-5" />} label="Tilastot" />
        <MenuTile
          to="/settings"
          icon={<Settings className="h-5 w-5" />}
          label="Asetukset"
          full
        />
      </div>
    </div>
  );
}

function MenuTile({
  to,
  icon,
  label,
  full,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  full?: boolean;
}) {
  return (
    <Link
      to={to}
      className={
        "neon-panel flex items-center gap-3 px-4 py-4 hover:border-primary/70 transition-colors " +
        (full ? "col-span-2" : "")
      }
    >
      <span className="text-primary">{icon}</span>
      <span className="font-semibold">{label}</span>
    </Link>
  );
}
