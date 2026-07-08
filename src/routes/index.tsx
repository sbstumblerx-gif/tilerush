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
  Users,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { LEVELS } from "@/lib/game/levels";
import { firstUnfinished, loadProgress } from "@/lib/game/progress";
import { themeBg } from "@/lib/game/cosmetics";
import { PlayerToken } from "@/components/game/PlayerToken";
import { todayUtc } from "@/lib/game/dailyReward";

export const Route = createFileRoute("/")({
  component: Lobby,
});

function Lobby() {
  const navigate = useNavigate();
  const [nextLevel, setNextLevel] = useState(1);
  const [completedCount, setCompletedCount] = useState(0);
  const [coins, setCoins] = useState(0);
  const [themeId, setThemeId] = useState("default");
  const [username, setUsername] = useState("Pelaaja");
  const [equipped, setEquipped] = useState({ color: "cyan", shape: "circle", pattern: "none", accessory: "none", theme: "default" });
  const [dailyAvail, setDailyAvail] = useState(false);
  const [showPlay, setShowPlay] = useState(false);

  useEffect(() => {
    const load = () => {
      const p = loadProgress();
      setNextLevel(firstUnfinished(p.completed, LEVELS.map((l) => l.id)));
      setCompletedCount(p.completed.length);
      setCoins(p.coins);
      setThemeId(p.equipped.theme);
      setUsername(p.profile.username);
      setEquipped(p.equipped);
      setDailyAvail(p.lastDailyClaim !== todayUtc());
    };
    load();
    window.addEventListener("tilerush:progress", load);
    return () => window.removeEventListener("tilerush:progress", load);
  }, []);

  return (
    <div className={`min-h-screen flex flex-col items-center px-4 py-8 sm:py-14 bg-gradient-to-br ${themeBg(themeId)}`}>
      <div className="w-full max-w-[420px] flex justify-between items-center text-sm mb-2">
        <Link to="/profile" className="neon-panel px-2 py-1 flex items-center gap-2 hover:border-primary/70">
          <PlayerToken equipped={equipped} size={28} showAccessory={false} />
          <span className="font-bold text-sm">{username}</span>
        </Link>
        <span className="neon-panel px-3 py-1 font-bold">🪙 {coins}</span>
      </div>
      <header className="text-center mb-8 sm:mb-10">
        <div className="text-xs uppercase tracking-[0.4em] text-primary/80">Tile</div>
        <h1 className="mt-2 text-5xl sm:text-7xl font-black tracking-tight bg-gradient-to-br from-[oklch(0.85_0.15_200)] via-[oklch(0.75_0.18_265)] to-[oklch(0.72_0.2_320)] bg-clip-text text-transparent">
          RUSH
        </h1>
        <p className="mt-3 text-sm text-muted-foreground max-w-xs mx-auto">
          Suunnittele reittisi. Hallitse siirtoja. Selviä maaliin.
        </p>
      </header>

      <Button
        size="lg"
        onClick={() => setShowPlay(true)}
        className="h-16 w-full max-w-[420px] text-lg font-bold gap-3 shadow-[var(--glow-primary)]"
      >
        <Play className="h-5 w-5 fill-current" /> Pelaa
      </Button>

      <div className="mt-2 text-xs text-muted-foreground">
        {completedCount} / {LEVELS.length} tasoa suoritettu
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 w-full max-w-[420px]">
        <MenuTile to="/levels" icon={<Map className="h-5 w-5" />} label="Tasot" />
        <MenuTile to="/shop" icon={<ShoppingBag className="h-5 w-5" />} label="Kauppa" badge={dailyAvail ? "ilmaista" : undefined} />
        <MenuTile to="/customize" icon={<Palette className="h-5 w-5" />} label="Mukauta" />
        <MenuTile to="/tasks" icon={<ClipboardList className="h-5 w-5" />} label="Tehtävät" />
        <MenuTile to="/pass" icon={<Ticket className="h-5 w-5" />} label="Tile Pass" />
        <MenuTile to="/friends" icon={<Users className="h-5 w-5" />} label="Kaverit" />
        <MenuTile to="/stats" icon={<BarChart3 className="h-5 w-5" />} label="Tilastot" />
        <MenuTile to="/profile" icon={<User className="h-5 w-5" />} label="Profiili" />
        <MenuTile to="/settings" icon={<Settings className="h-5 w-5" />} label="Asetukset" full />
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

      <div className="mt-6 text-xs text-muted-foreground opacity-70">Versio 4.0</div>

      {showPlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowPlay(false)}>
          <div className="neon-panel p-6 max-w-sm w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="text-xs uppercase tracking-widest text-muted-foreground text-center">Valitse pelimuoto</div>
            <Button size="lg" className="w-full h-14 text-lg gap-3" onClick={() => navigate({ to: "/play", search: { level: nextLevel } })}>
              <Play className="h-5 w-5 fill-current" /> Yksinpeli · Taso {nextLevel}
            </Button>
            <Button size="lg" variant="secondary" className="w-full h-14 text-lg gap-3" onClick={() => navigate({ to: "/multiplayer" })}>
              <Users className="h-5 w-5" /> Moninpeli
            </Button>
            <button onClick={() => setShowPlay(false)} className="w-full text-xs text-muted-foreground">Peruuta</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuTile({
  to,
  icon,
  label,
  full,
  badge,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  full?: boolean;
  badge?: string;
}) {
  return (
    <Link
      to={to}
      className={
        "relative neon-panel flex items-center gap-3 px-4 py-4 hover:border-primary/70 transition-colors " +
        (full ? "col-span-2" : "")
      }
    >
      <span className="text-primary">{icon}</span>
      <span className="font-semibold">{label}</span>
      {badge && (
        <span className="absolute -top-2 -right-2 rounded-full bg-green-500 text-white text-[10px] font-black px-2 py-0.5 shadow-lg">
          {badge}
        </span>
      )}
    </Link>
  );
}