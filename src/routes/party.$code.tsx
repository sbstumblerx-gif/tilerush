import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Copy, Settings as SettingsIcon, Play, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { loadProgress, type Progress } from "@/lib/game/progress";
import { PACKS } from "@/lib/game/packs";
import { Button } from "@/components/ui/button";
import { PlayerToken } from "@/components/game/PlayerToken";

export const Route = createFileRoute("/party/$code")({
  head: () => ({ meta: [{ title: "Party · Tile Rush" }] }),
  component: PartyPage,
});

function PartyPage() {
  const { code } = Route.useParams();
  const [p, setP] = useState<Progress | null>(null);
  const [rounds, setRounds] = useState(5);
  const [packs, setPacks] = useState<number[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showPacks, setShowPacks] = useState(false);

  useEffect(() => setP(loadProgress()), []);
  if (!p) return null;

  const togglePack = (id: number) =>
    setPacks((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const canStart = packs.length >= 1; // stub: real check needs ≥2 players

  return (
    <div className="min-h-screen px-4 py-8 max-w-[720px] mx-auto">
      <Link to="/multiplayer" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Takaisin
      </Link>
      <h1 className="mt-4 text-3xl font-black">Party</h1>

      <div className="mt-4 grid md:grid-cols-2 gap-4">
        {/* Left: code & invite */}
        <div className="neon-panel p-4 space-y-3">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Pelin koodi</div>
          <div className="flex items-center justify-between">
            <code className="text-3xl font-black font-mono tracking-widest">{code}</code>
            <button onClick={() => navigator.clipboard?.writeText(code)} className="p-2 rounded bg-secondary">
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <Button variant="secondary" className="w-full gap-2">
            <Plus className="h-4 w-4" /> Kutsu ystäviä
          </Button>
          <p className="text-[10px] text-muted-foreground opacity-70">Reaaliaikainen liittyminen viimeistellään tulevassa päivityksessä.</p>
        </div>

        {/* Right: player slots */}
        <div className="neon-panel p-4 space-y-2">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Pelaajat 1/4</div>
          {[0, 1, 2, 3].map((slot) => (
            <div key={slot} className="flex items-center gap-3 bg-background/40 rounded p-2 border border-border/40">
              {slot === 0 ? (
                <>
                  <PlayerToken equipped={p.equipped} size={36} />
                  <div className="font-bold">{p.profile.username}</div>
                  <span className="ml-auto text-xs text-primary">Isäntä</span>
                </>
              ) : (
                <button className="w-full flex items-center gap-3 text-muted-foreground">
                  <span className="h-9 w-9 rounded-full border border-dashed border-border/60 flex items-center justify-center"><Plus className="h-4 w-4" /></span>
                  <span className="text-sm">Kutsu ystävä</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-2 flex-wrap">
        <button className="neon-panel px-3 py-2 text-sm flex items-center gap-2" onClick={() => setShowSettings((v) => !v)}>
          <SettingsIcon className="h-4 w-4" /> Asetukset
        </button>
        <button className="neon-panel px-3 py-2 text-sm" onClick={() => setShowPacks((v) => !v)}>
          Valitse paketit ({packs.length})
        </button>
        <Button className="ml-auto gap-2" disabled={!canStart}>
          <Play className="h-4 w-4" /> Aloita peli
        </Button>
      </div>

      {showSettings && (
        <div className="mt-4 neon-panel p-4">
          <div className="text-sm font-bold mb-2">Kierrosten määrä: {rounds}</div>
          <input type="range" min={1} max={20} value={rounds} onChange={(e) => setRounds(Number(e.target.value))} className="w-full" />
          <div className="mt-1 text-xs text-muted-foreground">Jokaisessa kierroksessa on korkeintaan 45 s aikaa.</div>
        </div>
      )}

      {showPacks && (
        <div className="mt-4 neon-panel p-3 grid grid-cols-2 gap-2 max-h-64 overflow-auto">
          {PACKS.map((pk) => (
            <button
              key={pk.id}
              onClick={() => togglePack(pk.id)}
              className={`text-left p-3 rounded border ${packs.includes(pk.id) ? "border-primary bg-primary/20" : "border-border/40 bg-background/40"}`}
            >
              <div className="text-[10px] uppercase text-muted-foreground">Paketti {pk.id}</div>
              <div className="font-bold text-sm">{pk.name}</div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 neon-panel p-4 text-xs text-muted-foreground text-center">
        Moninpelin pelilogiikka (45 s aikaraja per kierros, pistetaulukko, pelaajat samalla kentällä yhtä aikaa) toteutetaan täysin toiminnalliseksi
        seuraavassa päivityksessä pilviyhteyden kanssa. Party-ikkuna, kutsukoodi, paketti- ja kierrosvalinnat ovat käytettävissä nyt.
      </div>
    </div>
  );
}