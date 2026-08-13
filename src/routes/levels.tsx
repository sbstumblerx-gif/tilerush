import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getLevel } from "@/lib/game/levels";
import { isUnlocked, loadProgress } from "@/lib/game/progress";
import { PACKS, isPackUnlocked, packProgress } from "@/lib/game/packs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Lock, Star, Plus, Search, User, Package } from "lucide-react";
import {
  listMyLevels, listMyPacks, listRecentPacks, getCommunityLevel, getCommunityPack,
  deleteCommunityLevel, deleteCommunityPack, MAX_PACK_LEVELS,
  type CommunityLevel, type CommunityPack,
} from "@/lib/cloud/community";

export const Route = createFileRoute("/levels")({
  head: () => ({
    meta: [
      { title: "Kentät · Tile Rush" },
      { name: "description", content: "Pelaa viralliset kenttäpaketit tai sukella yhteisön luomiin kenttiin ja paketteihin." },
      { property: "og:title", content: "Kentät · Tile Rush" },
      { property: "og:description", content: "Viralliset paketit ja yhteisön kenttäeditorilla luodut paketit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LevelsPage,
});

function LevelsPage() {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState<number[]>([]);
  const [stars, setStars] = useState<Record<number, number>>({});
  const [openPack, setOpenPack] = useState<number | null>(null);
  const [tab, setTab] = useState<"official" | "community">("official");

  useEffect(() => {
    const p = loadProgress();
    setCompleted(p.completed);
    setStars(p.stars);
  }, []);

  const active = openPack != null ? PACKS.find((p) => p.id === openPack) : null;

  return (
    <div className="min-h-screen px-4 py-8 max-w-[560px] mx-auto">
      <button
        onClick={() => (openPack ? setOpenPack(null) : navigate({ to: "/" }))}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {openPack ? "Paketit" : "Lobby"}
      </button>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {([["official", "Viralliset"], ["community", "Yhteisö"]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => { setTab(k); setOpenPack(null); }}
            className={`rounded-lg py-2 text-sm font-bold border ${tab === k ? "bg-primary text-primary-foreground border-primary" : "border-border/60 text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "community" && <CommunitySection />}

      {tab === "official" && !active && (
        <>
          <h1 className="mt-4 text-3xl font-black">Paketit</h1>
          <p className="text-sm text-muted-foreground">Suorita paketti avataksesi seuraavan.</p>
          <div className="mt-6 space-y-3">
            {PACKS.map((pk) => {
              const done = packProgress(pk, completed);
              const unlocked = isPackUnlocked(pk, completed);
              return (
                <button
                  key={pk.id}
                  disabled={!unlocked}
                  onClick={() => setOpenPack(pk.id)}
                  className={`w-full text-left neon-panel p-4 bg-gradient-to-br ${pk.bg} ${!unlocked ? "opacity-50 cursor-not-allowed" : "hover:border-primary/70"}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest opacity-80">Paketti {pk.id}</div>
                      <div className="font-black text-lg">{pk.name}</div>
                      <div className="text-xs opacity-80">{pk.theme}</div>
                    </div>
                    <div className="text-right">
                      {unlocked ? (
                        <div className="font-bold">
                          {done}/{pk.levelIds.length}
                        </div>
                      ) : (
                        <Lock className="h-5 w-5" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {tab === "official" && active && (
        <>
          <h1 className="mt-4 text-2xl font-black">{active.name}</h1>
          <p className="text-sm text-muted-foreground">
            {packProgress(active, completed)}/{active.levelIds.length} tasoa suoritettu
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {active.levelIds.map((id) => {
              const l = getLevel(id);
              if (!l) return null;
              const done = completed.includes(id);
              const unlocked = isUnlocked(id, completed);
              const s = stars[id] ?? 0;
              return (
                <Button
                  key={id}
                  variant={done ? "secondary" : unlocked ? "default" : "outline"}
                  disabled={!unlocked}
                  onClick={() => navigate({ to: "/play", search: { level: id } })}
                  className="h-24 flex flex-col items-start justify-between p-3 text-left"
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs uppercase tracking-widest opacity-70">Taso {id}</span>
                    {done ? <Check className="h-4 w-4" /> : !unlocked ? <Lock className="h-4 w-4" /> : null}
                  </div>
                  <div className="w-full">
                    <div className="font-bold truncate text-sm">{l.name}</div>
                    <div className="flex items-center gap-1 text-[11px] opacity-80">
                      {[1, 2, 3].map((n) => (
                        <Star key={n} className={`h-3 w-3 ${n <= s ? "fill-current" : "opacity-30"}`} />
                      ))}
                      <span className="ml-auto">{l.moves} siirtoa</span>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
function CommunitySection() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [view, setView] = useState<"browse" | "mine">("browse");
  const [myLevels, setMyLevels] = useState<CommunityLevel[]>([]);
  const [myPacks, setMyPacks] = useState<CommunityPack[]>([]);
  const [recent, setRecent] = useState<CommunityPack[]>([]);

  const refresh = async () => {
    const [l, p, r] = await Promise.all([listMyLevels(), listMyPacks(), listRecentPacks(20)]);
    setMyLevels(l);
    setMyPacks(p);
    setRecent(r);
  };

  useEffect(() => { void refresh(); }, []);

  const search = async () => {
    const c = code.trim().toLowerCase();
    if (!c) return;
    setMsg(null);
    const pack = await getCommunityPack(c);
    if (pack) { navigate({ to: "/cplay", search: { pack: pack.code, i: 0 } }); return; }
    const lvl = await getCommunityLevel(c);
    if (lvl) { navigate({ to: "/cplay", search: { level: lvl.code, i: 0 } }); return; }
    setMsg("Koodilla ei löytynyt kenttää tai pakettia.");
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex gap-2">
        <Button className="flex-1 h-14 gap-2 text-base font-black" onClick={() => navigate({ to: "/create" })}>
          <Plus className="h-5 w-5" /> Luo
        </Button>
        <Button
          variant={view === "mine" ? "default" : "secondary"}
          className="h-14 gap-2"
          onClick={() => setView(view === "mine" ? "browse" : "mine")}
        >
          <User className="h-4 w-4" /> Omat
        </Button>
      </div>

      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toLowerCase().slice(0, 6))}
          onKeyDown={(e) => { if (e.key === "Enter") void search(); }}
          placeholder="Etsi koodilla"
          className="flex-1 rounded bg-background/60 border border-border/50 px-3 py-2 font-mono tracking-widest text-center"
        />
        <Button variant="secondary" onClick={search} aria-label="Etsi"><Search className="h-4 w-4" /></Button>
      </div>
      {msg && <div className="text-xs text-destructive">{msg}</div>}

      {view === "mine" ? (
        <>
          <div>
            <h2 className="font-black text-lg">Omat paketit</h2>
            <div className="mt-2 space-y-2">
              {myPacks.length === 0 && <p className="text-xs text-muted-foreground">Ei paketteja vielä.</p>}
              {myPacks.map((pk) => (
                <div key={pk.code} className="neon-panel p-3 flex items-center gap-3">
                  <Package className="h-4 w-4 text-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{pk.name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {pk.code} · {pk.level_codes.length}/{MAX_PACK_LEVELS} kenttää
                    </div>
                  </div>
                  <Button size="sm" onClick={() => navigate({ to: "/cplay", search: { pack: pk.code, i: 0 } })}>Pelaa</Button>
                  <button
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (!window.confirm(`Poistetaanko paketti "${pk.name}"? Muiden ansaitsemat pokaalit säilyvät.`)) return;
                      void deleteCommunityPack(pk.code).then(refresh);
                    }}
                  >
                    Poista
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-black text-lg">Omat kentät</h2>
            <div className="mt-2 space-y-2">
              {myLevels.length === 0 && <p className="text-xs text-muted-foreground">Ei kenttiä vielä.</p>}
              {myLevels.map((l) => (
                <div key={l.code} className="neon-panel p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{l.name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {l.code} · {l.size}×{l.size} · {l.moves} siirtoa
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => navigate({ to: "/cplay", search: { level: l.code, i: 0 } })}>
                    Pelaa
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate({ to: "/create", search: { edit: l.code } })}>
                    Muokkaa
                  </Button>
                  <button
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (!window.confirm(`Poistetaanko kenttä "${l.name}"? Muiden ansaitsemat pokaalit säilyvät.`)) return;
                      void deleteCommunityLevel(l.code).then(refresh);
                    }}
                  >
                    Poista
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div>
          <h2 className="font-black text-lg">Uusimmat pelaajapaketit</h2>
          <p className="text-xs text-muted-foreground">Läpäisty pelaajapaketti tuo 5 pokaalia (max 5/pv).</p>
          <div className="mt-2 space-y-2">
            {recent.length === 0 && <p className="text-xs text-muted-foreground">Ei paketteja vielä – ole ensimmäinen!</p>}
            {recent.map((pk) => (
              <div key={pk.code} className="neon-panel p-3 flex items-center gap-3">
                <Package className="h-4 w-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{pk.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    {pk.code} · {pk.level_codes.length} kenttää
                  </div>
                </div>
                <Button size="sm" onClick={() => navigate({ to: "/cplay", search: { pack: pk.code, i: 0 } })}>Pelaa</Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
