import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Wand2, Save, Play, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createState } from "@/lib/game/engine";
import {
  createCommunityLevel, createCommunityPack, listMyPacks, updateCommunityPack,
  MAX_PACK_LEVELS, type CommunityPack, type CommunityLevel,
} from "@/lib/cloud/community";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Luo kenttä · Tile Rush" },
      { name: "description", content: "Rakenna oma Tile Rush -kenttä 5x5–9x9 ruudukkoon ja jaa se koodilla kavereille." },
      { property: "og:title", content: "Luo kenttä · Tile Rush" },
      { property: "og:description", content: "Kenttäeditori: aseta laatat, lähtö ja maali, ja julkaise kenttäsi pakettiin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CreatePage,
});

const PALETTE: { ch: string; label: string; cls: string }[] = [
  { ch: ".", label: "Tavallinen", cls: "bg-[var(--tile-normal)]" },
  { ch: "H", label: "Raskas · 2", cls: "bg-[var(--tile-heavy)]" },
  { ch: "E", label: "Energia · 0", cls: "bg-[var(--tile-energy)]" },
  { ch: "I", label: "Jää", cls: "bg-[var(--tile-ice)]" },
  { ch: "P", label: "Portaali P", cls: "bg-[var(--tile-portal)]" },
  { ch: "Q", label: "Portaali Q", cls: "bg-[var(--tile-portal)]" },
  { ch: "C", label: "Lataus +5", cls: "bg-[var(--tile-charger)]" },
  { ch: "?", label: "Arpa", cls: "bg-[var(--tile-random)]" },
  { ch: "X", label: "Vihollinen", cls: "bg-[var(--tile-enemy)]" },
  { ch: "L", label: "Laukaisu", cls: "bg-[var(--tile-launcher)]" },
  { ch: "#", label: "Este", cls: "bg-[var(--tile-obstacle)]" },
  { ch: "S", label: "Lähtö", cls: "bg-primary" },
  { ch: "G", label: "Maali", cls: "bg-emerald-500" },
];

const SIZES = [5, 6, 7, 8, 9] as const;

function emptyGrid(size: number): string[][] {
  const g = Array.from({ length: size }, () => Array.from({ length: size }, () => "."));
  g[0][0] = "S";
  g[size - 1][size - 1] = "G";
  return g;
}

function CreatePage() {
  const navigate = useNavigate();
  const [size, setSize] = useState<number | null>(null);
  const [grid, setGrid] = useState<string[][]>([]);
  const [brush, setBrush] = useState("#");
  const [name, setName] = useState("");
  const [moves, setMoves] = useState(15);
  const [msg, setMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState<CommunityLevel | null>(null);
  const [packs, setPacks] = useState<CommunityPack[]>([]);
  const [newPackName, setNewPackName] = useState("");
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => grid.map((r) => r.join("")), [grid]);
  const hasStart = rows.some((r) => r.includes("S"));
  const hasGoal = rows.some((r) => r.includes("G"));

  const start = (s: number) => { setSize(s); setGrid(emptyGrid(s)); setMoves(s * 3); };

  const paint = (r: number, c: number) => {
    setGrid((g) => {
      const next = g.map((row) => row.slice());
      if (next[r][c] === brush && brush !== "S" && brush !== "G") {
        next[r][c] = ".";
        return next;
      }
      if (brush === "S" || brush === "G") {
        for (let i = 0; i < next.length; i++)
          for (let j = 0; j < next[i].length; j++)
            if (next[i][j] === brush) next[i][j] = ".";
      }
      next[r][c] = brush;
      return next;
    });
  };

  const test = () => {
    if (!hasStart || !hasGoal) { setMsg("Aseta lähtö (S) ja maali (G)."); return; }
    setMsg(null);
    try {
      createState({ id: -1, name: name || "Testi", moves, grid: rows });
      setMsg("✅ Kenttä on kelvollinen.");
    } catch {
      setMsg("❌ Kenttä on virheellinen.");
    }
  };

  const save = async () => {
    if (!size) return;
    if (!hasStart || !hasGoal) { setMsg("Aseta lähtö (S) ja maali (G)."); return; }
    setBusy(true); setMsg(null);
    const lvl = await createCommunityLevel({ name: name.trim() || "Kenttä", size, moves, grid: rows });
    setBusy(false);
    if (!lvl) { setMsg("Tallennus epäonnistui – kirjaudu sisään."); return; }
    setSaved(lvl);
    setPacks(await listMyPacks());
  };

  const addToPack = async (pack: CommunityPack) => {
    if (!saved) return;
    if (pack.level_codes.length >= MAX_PACK_LEVELS) { setMsg(`Paketissa on jo ${MAX_PACK_LEVELS} kenttää.`); return; }
    await updateCommunityPack(pack.code, [...pack.level_codes, saved.code]);
    navigate({ to: "/levels" });
  };

  const createPack = async () => {
    if (!saved) return;
    const pack = await createCommunityPack(newPackName.trim() || "Paketti", [saved.code]);
    if (!pack) { setMsg("Paketin luonti epäonnistui."); return; }
    navigate({ to: "/levels" });
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-[560px] mx-auto">
      <Link to="/levels" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Kentät
      </Link>
      <h1 className="mt-4 text-3xl font-black flex items-center gap-2">
        <Wand2 className="h-6 w-6 text-primary" /> Luo kenttä
      </h1>

      {!size && (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-muted-foreground">Valitse ruudukon koko.</p>
          <div className="grid grid-cols-3 gap-3">
            {SIZES.map((s) => (
              <Button key={s} variant="secondary" className="h-16 text-lg font-black" onClick={() => start(s)}>
                {s}×{s}
              </Button>
            ))}
          </div>
        </div>
      )}

      {size && !saved && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 24))}
              placeholder="Kentän nimi"
              className="rounded bg-background/60 border border-border/50 px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-sm neon-panel px-3">
              Siirrot
              <input
                type="number"
                min={1}
                max={99}
                value={moves}
                onChange={(e) => setMoves(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
                className="w-16 bg-transparent text-right font-bold"
              />
            </label>
          </div>

          <div className="mt-4 neon-panel p-3">
            <div
              className="grid gap-1 mx-auto"
              style={{ gridTemplateColumns: `repeat(${size}, minmax(0,1fr))`, maxWidth: 360 }}
            >
              {grid.map((row, r) =>
                row.map((ch, c) => {
                  const p = PALETTE.find((x) => x.ch === ch) ?? PALETTE[0];
                  return (
                    <button
                      key={`${r}-${c}`}
                      onClick={() => paint(r, c)}
                      className={`aspect-square rounded ${p.cls} text-[10px] font-black text-black/70 flex items-center justify-center`}
                    >
                      {ch !== "." ? ch : ""}
                    </button>
                  );
                }),
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {PALETTE.map((p) => (
              <button
                key={p.ch}
                onClick={() => setBrush(p.ch)}
                className={`neon-panel p-2 flex flex-col items-center gap-1 text-[10px] ${brush === p.ch ? "border-primary" : ""}`}
              >
                <span className={`h-5 w-5 rounded ${p.cls}`} />
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Kosketa laattaa uudelleen poistaaksesi sen. Lähtö ja maali voi olla vain yksi kerrallaan.
          </p>

          {msg && <div className="mt-3 text-xs">{msg}</div>}

          <div className="mt-4 flex gap-2">
            <Button variant="secondary" className="flex-1 gap-2" onClick={test}>
              <Play className="h-4 w-4" /> Tarkista
            </Button>
            <Button className="flex-1 gap-2" onClick={save} disabled={busy}>
              <Save className="h-4 w-4" /> Tallenna
            </Button>
          </div>
        </>
      )}

      {saved && (
        <div className="mt-6 space-y-4">
          <div className="neon-panel p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Kenttä tallennettu</div>
            <div className="text-lg font-black">{saved.name}</div>
            <div className="text-sm font-mono text-primary">Koodi: {saved.code}</div>
            <p className="mt-2 text-xs text-muted-foreground">
              Jokainen kenttä täytyy lisätä pakettiin (1–{MAX_PACK_LEVELS} kenttää per paketti).
            </p>
          </div>

          <div className="neon-panel p-4 space-y-2">
            <div className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Package className="h-3 w-3" /> Lisää pakettiin
            </div>
            {packs.map((pk) => (
              <Button key={pk.code} variant="secondary" className="w-full justify-between" onClick={() => void addToPack(pk)}>
                <span>{pk.name}</span>
                <span className="text-xs opacity-70">{pk.level_codes.length}/{MAX_PACK_LEVELS}</span>
              </Button>
            ))}
            <div className="flex gap-2 pt-2">
              <input
                value={newPackName}
                onChange={(e) => setNewPackName(e.target.value.slice(0, 24))}
                placeholder="Uusi paketti"
                className="flex-1 rounded bg-background/60 border border-border/50 px-3 py-2 text-sm"
              />
              <Button onClick={createPack}>Luo</Button>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={() => { setSaved(null); setSize(null); setName(""); }}>
            Tee toinen kenttä
          </Button>
        </div>
      )}
    </div>
  );
}
