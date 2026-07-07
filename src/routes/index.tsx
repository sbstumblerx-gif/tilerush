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
  Trophy,
} from "lucide-react";
import { useEffect, useState } from "react";
import { LEVELS } from "@/lib/game/levels";
import { firstUnfinished, loadProgress } from "@/lib/game/progress";
import { themeBg } from "@/lib/game/cosmetics";

export const Route = createFileRoute("/")({
  component: Lobby,
});

function Lobby() {
  const navigate = useNavigate();
  const [nextLevel, setNextLevel] = useState(1);
  const [completedCount, setCompletedCount] = useState(0);
  const [coins, setCoins] = useState(0);
  const [themeId, setThemeId] = useState("default");

  useEffect(() => {
    const load = () => {
      const p = loadProgress();
      setNextLevel(firstUnfinished(p.completed, LEVELS.map((l) => l.id)));
      setCompletedCount(p.completed.length);
      setCoins(p.coins);
      setThemeId(p.equipped.theme);
    };
    load();
    window.addEventListener("tilerush:progress", load);
    return () => window.removeEventListener("tilerush:progress", load);
  }, []);

  return (
    <div className={`min-h-screen flex flex-col items-center px-4 py-8 sm:py-14 bg-gradient-to-br ${themeBg(themeId)}`}>
      <div className="w-full max-w-[420px] flex justify-end text-sm mb-2">
        <span className="neon-panel px-3 py-1 font-bold">🪙 {coins}</span>
      </div>
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

      <Link
        to="/events"
        className="mt-6 neon-panel w-full max-w-[420px] p-4 flex items-center justify-between hover:border-primary/70"
      >
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-primary" />
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Tapahtuma</div>
            <div className="font-bold">Tile Cup</div>
          </div>
        </div>
        <span className="text-primary">→</span>
      </Link>

      <div className="mt-6 text-xs text-muted-foreground opacity-70">Versio 3.0</div>
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
