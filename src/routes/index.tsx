import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Play,
  Map,
  ShoppingBag,
  Palette,
  ClipboardList,
  Settings,
  BarChart3,
  Users,
  Shield,
  PartyPopper,
  Gift,
  Trophy,
} from "lucide-react";
import { useEffect, useState } from "react";
import { LEVELS } from "@/lib/game/levels";
import { firstUnfinished, loadProgress, type Equipped } from "@/lib/game/progress";
import { themeBg } from "@/lib/game/cosmetics";
import { AvatarBadge } from "@/components/game/AvatarBadge";
import { trophyLevel, TROPHY_PER_LEVEL, TROPHY_MAX_LEVEL } from "@/lib/game/progress";
import { todayUtc, msUntilSeasonEnd, formatDaysCountdown } from "@/lib/game/dailyReward";

export const Route = createFileRoute("/")({
  component: Lobby,
});

function Lobby() {
  const navigate = useNavigate();
  const [nextLevel, setNextLevel] = useState(1);
  const [coins, setCoins] = useState(0);
  const [keys, setKeys] = useState(0);
  const [passLevel, setPassLevel] = useState(0);
  const [themeId, setThemeId] = useState("default");
  const [username, setUsername] = useState("Pelaaja");
  const [equipped, setEquipped] = useState<Equipped>({ color: "cyan", shape: "circle", pattern: "none", accessory: "none", theme: "default", avatar: "default" });
  const [dailyAvail, setDailyAvail] = useState(false);
  const [gems, setGems] = useState(0);
  const [trophies, setTrophies] = useState(0);

  useEffect(() => {
    const load = () => {
      const p = loadProgress();
      setNextLevel(firstUnfinished(p.completed, LEVELS.map((l) => l.id)));
      setCoins(p.coins);
      setKeys(p.keys ?? 0);
      setPassLevel(p.passLevel);
      setThemeId(p.equipped.theme);
      setUsername(p.profile.username);
      setEquipped(p.equipped);
      setDailyAvail(p.lastDailyClaim !== todayUtc());
      setGems(p.gems ?? 0);
      setTrophies(p.trophies ?? 0);
    };
    load();
    window.addEventListener("tilerush:progress", load);
    return () => window.removeEventListener("tilerush:progress", load);
  }, []);

  return (
    <div className={`min-h-screen flex flex-col items-center px-4 py-6 sm:py-10 bg-gradient-to-br ${themeBg(themeId)}`}>
      <div className="w-full max-w-[420px] flex justify-between items-center text-sm mb-3">
        <Link to="/profile" className="neon-panel px-2 py-1 flex items-center gap-2 hover:border-primary/70">
          <AvatarBadge avatar={equipped.avatar} name={username} size={28} />
          <span className="font-bold text-sm">{username}</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/shop" className="neon-panel px-3 py-1 font-bold hover:border-primary/70">🪙 {coins}</Link>
          <Link to="/shop" className="neon-panel px-3 py-1 font-bold hover:border-primary/70">💎 {gems}</Link>
          <Link to="/event" className="neon-panel px-3 py-1 font-bold hover:border-primary/70">🔑 {keys}</Link>
          <Link to="/settings" className="neon-panel px-2 py-2 hover:border-primary/70" aria-label="Asetukset">
            <Settings className="h-4 w-4 text-primary" />
          </Link>
        </div>
      </div>
      <div className="w-full max-w-[420px] mb-4">
        <Link to="/trophies" className="block neon-panel p-3 hover:border-primary/70">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-primary shrink-0" />
            <div className="flex-1">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] uppercase tracking-[0.3em] text-primary">Pokaalipolku</span>
                <span className="text-xs font-bold">🏆 {trophies}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black">Taso {trophyLevel(trophies)}</span>
                <div className="flex-1 h-2 rounded-full bg-background/60 overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${trophyLevel(trophies) >= TROPHY_MAX_LEVEL ? 100 : ((trophies % TROPHY_PER_LEVEL) / TROPHY_PER_LEVEL) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>

      <header className="text-center mb-6">
        <div className="text-xs uppercase tracking-[0.4em] text-primary/80">Tile</div>
        <h1 className="mt-1 text-5xl sm:text-6xl font-black tracking-tight bg-gradient-to-br from-[oklch(0.85_0.15_200)] via-[oklch(0.75_0.18_265)] to-[oklch(0.72_0.2_320)] bg-clip-text text-transparent">
          RUSH
        </h1>
      </header>

      <div className="w-full max-w-[420px] space-y-3">
        <Button
          size="lg"
          onClick={() => navigate({ to: "/playmode" })}
          className="h-20 w-full text-lg font-black gap-3 shadow-[var(--glow-primary)] flex-col"
        >
          <span className="flex items-center gap-2">
            <Play className="h-5 w-5 fill-current" /> PELAA
          </span>
          <span className="text-xs font-semibold opacity-80">
            Taso {nextLevel} · Online 1v1 · Party
          </span>
        </Button>

        <MenuTile to="/event" icon={<PartyPopper className="h-5 w-5" />} label="Tapahtumat" badge="Reppujahti" full />

        <div className="grid grid-cols-3 gap-3">
          <SquareTile to="/shop" icon={<ShoppingBag className="h-6 w-6" />} label="Kauppa" badge={dailyAvail ? "ilmaista" : undefined} />
          <SquareTile to="/customize" icon={<Palette className="h-6 w-6" />} label="Mukauta" />
          <SquareTile to="/levels" icon={<Map className="h-6 w-6" />} label="Kentät" />
        </div>

        <div className="grid grid-cols-4 gap-3">
          <SquareTile to="/stats" icon={<BarChart3 className="h-5 w-5" />} label="Tilastot" small />
          <SquareTile to="/friends" icon={<Users className="h-5 w-5" />} label="Ystävät" small />
          <SquareTile to="/team" icon={<Shield className="h-5 w-5" />} label="Joukkue" small />
          <SquareTile to="/tasks" icon={<ClipboardList className="h-5 w-5" />} label="Tehtävät" small />
        </div>

        <Link
          to="/pass"
          className="block neon-panel p-4 border-primary/50 hover:border-primary bg-primary/5"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-primary">Tile Pass</div>
              <div className="text-2xl font-black">KAUSI 2</div>
              <div className="text-xs text-muted-foreground">Taso {passLevel} / 60 · Reppujahti</div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <Gift className="h-6 w-6 text-primary ml-auto" />
              <div className="mt-1">{formatDaysCountdown(msUntilSeasonEnd())}</div>
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-6 text-xs text-muted-foreground opacity-70">Versio 6.0</div>
    </div>
  );
}

function SquareTile({
  to,
  icon,
  label,
  badge,
  small,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  small?: boolean;
}) {
  return (
    <Link
      to={to}
      className="relative neon-panel aspect-square flex flex-col items-center justify-center gap-1.5 hover:border-primary/70 transition-colors text-center"
    >
      <span className="text-primary">{icon}</span>
      <span className={small ? "text-[11px] font-semibold" : "text-sm font-bold"}>{label}</span>
      {badge && (
        <span className="absolute -top-2 -right-2 rounded-full bg-green-500 text-white text-[10px] font-black px-2 py-0.5 shadow-lg">
          {badge}
        </span>
      )}
    </Link>
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
