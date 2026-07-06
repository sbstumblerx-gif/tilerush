import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadProgress, type Progress } from "@/lib/game/progress";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/stats")({
  head: () => ({ meta: [{ title: "Tilastot · Tile Rush" }] }),
  component: StatsPage,
});

function StatsPage() {
  const [p, setP] = useState<Progress | null>(null);
  useEffect(() => setP(loadProgress()), []);
  if (!p) return null;
  const s = p.stats;
  const rows: [string, string | number][] = [
    ["Tason käynnistyskerrat", s.starts],
    ["Siirrot yhteensä", s.totalMoves],
    ["Suoritetut tasot", p.completed.length],
    ["Voittokerrat", s.wins],
    ["Häviökerrat", s.losses],
    ["Kerätyt tähdet", s.stars],
    ["Kolikot", p.coins],
    ["Käytetyt esineet", s.itemUses],
    ["Vihollisruutu-astumiset", s.enemySteps],
    ["Arpavoitot", s.randomGains],
  ];
  return (
    <div className="min-h-screen px-4 py-8 max-w-[520px] mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Lobby
      </Link>
      <h1 className="mt-4 text-3xl font-black">Tilastot</h1>
      <div className="mt-6 neon-panel divide-y divide-border/60">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">{k}</span>
            <span className="font-bold">{v}</span>
          </div>
        ))}
      </div>
      <h2 className="mt-6 text-lg font-bold">Ruutujen käyttö</h2>
      <div className="mt-2 neon-panel divide-y divide-border/60">
        {Object.entries(s.tileUses).map(([k, v]) => (
          <div key={k} className="flex justify-between px-4 py-2">
            <span className="text-sm text-muted-foreground capitalize">{k}</span>
            <span className="font-bold">{v}</span>
          </div>
        ))}
        {Object.keys(s.tileUses).length === 0 && (
          <div className="px-4 py-3 text-sm text-muted-foreground">Ei vielä dataa.</div>
        )}
      </div>
    </div>
  );
}