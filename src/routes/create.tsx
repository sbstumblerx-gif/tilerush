import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { ArrowLeft, Wand2, Save, Play, Package, Timer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Board } from "@/components/game/Board";
import { createState, tryMove, tryTnt, tryVolleyball, selectItem } from "@/lib/game/engine";
import type { GameState, Pos } from "@/lib/game/types";
import {
  createCommunityLevel, createCommunityPack, listMyPacks, updateCommunityPack,
  updateCommunityLevel, getCommunityLevel,
  MAX_PACK_LEVELS, type CommunityPack, type CommunityLevel,
} from "@/lib/cloud/community";

const searchSchema = z.object({ edit: z.string().optional() });

export const Route = createFileRoute("/create")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Luo kenttä · Tile Rush" },
      { name: "description", content: "Rakenna oma Tile Rush -kenttä 5x5–9x9 ruudukkoon, läpäise se itse 45 sekunnissa ja julkaise koodilla." },
      { property: "og:title", content: "Luo kenttä · Tile Rush" },
      { property: "og:description", content: "Kenttäeditori: aseta laatat, läpäise oma kenttäsi 45 sekunnissa ja julkaise se pakettiin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CreatePage,
});

/** Tarkistuksen aikaraja (ms) – sama kuin online-otteluissa. */
const VERIFY_MS = 45_000;

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
  const { edit: editCode } = Route.useSearch();
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
  /** Tarkistus läpäisty tälle versiolle? Nollautuu jokaisesta muutoksesta. */
  const [verified, setVerified] = useState(false);
  const [testing, setTesting] = useState(false);

  const rows = useMemo(() => grid.map((r) => r.join("")), [grid]);
  const hasStart = rows.some((r) => r.includes("S"));
  const hasGoal = rows.some((r) => r.includes("G"));

  // Muokkaustila: lataa oma kenttä editoriin.
  useEffect(() => {
    if (!editCode) return;
    let alive = true;
    (async () => {
      const l = await getCommunityLevel(editCode);
      if (!l || !alive) return;
      setSize(l.size);
      setGrid(l.grid.map((r) => r.padEnd(l.size, ".").split("")));
      setName(l.name);
      setMoves(l.moves);
      setVerified(false);
    })();
    return () => { alive = false; };
  }, [editCode]);

  const start = (s: number) => { setSize(s); setGrid(emptyGrid(s)); setMoves(s * 3); };

  const paint = (r: number, c: number) => {
    setVerified(false);
    setMsg(null);
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

  const startTest = () => {
    if (!hasStart || !hasGoal) { setMsg("Aseta lähtö (S) ja maali (G)."); return; }
    try {
      createState({ id: -1, name: name || "Testi", moves, grid: rows });
    } catch {
      setMsg("❌ Kenttä on virheellinen.");
      return;
    }
    setMsg(null);
    setTesting(true);
  };

  const publish = async () => {
    if (!size) return;
    if (!verified) { setMsg("Läpäise kenttä ensin tarkistuksessa."); return; }
    setBusy(true); setMsg(null);
    const payload = { name: name.trim() || "Kenttä", size, moves, grid: rows };
    const lvl = editCode
      ? await updateCommunityLevel(editCode, payload)
      : await createCommunityLevel(payload);
    setBusy(false);
    if (!lvl) { setMsg("Julkaisu epäonnistui – kirjaudu sisään."); return; }
    if (editCode) { navigate({ to: "/levels" }); return; }
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
        <Wand2 className="h-6 w-6 text-primary" /> {editCode ? "Muokkaa kenttää" : "Luo kenttä"}
      </h1>

      {!size && !editCode && (
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
                onChange={(e) => {
                  setVerified(false);
                  setMoves(Math.max(1, Math.min(99, Number(e.target.value) || 1)));
                }}
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

          <div className={`mt-4 neon-panel p-3 text-xs flex items-center gap-2 ${verified ? "border-emerald-500/70 text-emerald-400" : "text-muted-foreground"}`}>
            {verified ? <ShieldCheck className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
            {verified
              ? "Tarkistus läpäisty – voit julkaista kentän."
              : "Kenttä täytyy läpäistä itse 45 sekunnissa ennen julkaisua. Jokainen muutos vaatii uuden suorituksen."}
          </div>

          {msg && <div className="mt-3 text-xs">{msg}</div>}

          <div className="mt-4 flex gap-2">
            <Button variant="secondary" className="flex-1 gap-2" onClick={startTest}>
              <Play className="h-4 w-4" /> Tarkista (45 s)
            </Button>
            <Button className="flex-1 gap-2" onClick={publish} disabled={busy || !verified}>
              <Save className="h-4 w-4" /> {editCode ? "Julkaise muutokset" : "Julkaise"}
            </Button>
          </div>
        </>
      )}

      {saved && (
        <div className="mt-6 space-y-4">
          <div className="neon-panel p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Kenttä julkaistu</div>
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
              <Button onClick={() => void createPack()}>Luo paketti</Button>
            </div>
          </div>
        </div>
      )}

      {testing && size && (
        <VerifyRun
          def={{ id: -1, name: name || "Testi", moves, grid: rows }}
          onClose={(ok) => {
            setTesting(false);
            if (ok) { setVerified(true); setMsg("✅ Tarkistus läpäisty!"); }
            else setMsg("❌ Tarkistus epäonnistui – yritä uudelleen.");
          }}
        />
      )}
    </div>
  );
}

function VerifyRun({
  def,
  onClose,
}: {
  def: { id: number; name: string; moves: number; grid: string[] };
  onClose: (ok: boolean) => void;
}) {
  const [state, setState] = useState<GameState>(() => createState(def));
  const [left, setLeft] = useState(VERIFY_MS);
  const startedAt = useRef(Date.now());
  const done = state.status !== "playing";

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => {
      const rem = VERIFY_MS - (Date.now() - startedAt.current);
      setLeft(Math.max(0, rem));
    }, 100);
    return () => clearInterval(t);
  }, [done]);

  const timeout = left <= 0 && state.status === "playing";

  const handleTile = useCallback((pos: Pos) => {
    setState((s) => {
      if (Date.now() - startedAt.current > VERIFY_MS) return s;
      if (s.aimingItem === "volleyball") return tryVolleyball(s, pos);
      if (s.aimingItem === "tnt") return tryTnt(s, pos);
      return tryMove(s, pos);
    });
  }, []);

  const retry = () => {
    startedAt.current = Date.now();
    setLeft(VERIFY_MS);
    setState(createState(def));
  };

  const won = state.status === "won";
  const failed = timeout || state.status === "lost";

  return (
    <div className="fixed inset-0 z-50 bg-background/95 overflow-auto px-3 py-6 flex flex-col items-center gap-3">
      <div className="neon-panel w-full max-w-[420px] p-3 flex items-center justify-between">
        <div className="text-sm font-black">Tarkistus · {def.name}</div>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-bold">{state.movesLeft} siirtoa</span>
          <span className={`font-mono font-black ${left < 10_000 ? "text-destructive" : ""}`}>
            {(left / 1000).toFixed(1)} s
          </span>
        </div>
      </div>

      <div className="w-full max-w-[420px] h-1.5 rounded bg-border/50 overflow-hidden">
        <div className="h-full bg-primary transition-[width]" style={{ width: `${(left / VERIFY_MS) * 100}%` }} />
      </div>

      {state.items.length > 0 && (
        <div className="flex gap-2">
          {state.items.map((it, idx) => (
            <Button key={`${it}-${idx}`} size="sm" variant="secondary" onClick={() => setState((s) => selectItem(s, it))}>
              {it === "tnt" ? "🧨 TNT" : "🏐 Lentopallo"}
            </Button>
          ))}
        </div>
      )}

      <Board state={state} onTileClick={handleTile} />

      <div className="neon-panel w-full max-w-[420px] p-4 text-center space-y-3">
        {won && <div className="font-black text-emerald-400">✅ Läpäisty {(( (Date.now() - startedAt.current) / 1000)).toFixed(1)} s</div>}
        {failed && (
          <div className="font-black text-destructive">
            {timeout ? "⏱️ Aika loppui" : "💀 Siirrot loppuivat"}
          </div>
        )}
        {!won && (
          <div className="flex gap-2 justify-center">
            <Button variant="secondary" onClick={retry}>Uudelleen</Button>
            <Button variant="outline" onClick={() => onClose(false)}>Takaisin editoriin</Button>
          </div>
        )}
        {won && <Button className="w-full" onClick={() => onClose(true)}>Hyväksy tarkistus</Button>}
      </div>
    </div>
  );
}
