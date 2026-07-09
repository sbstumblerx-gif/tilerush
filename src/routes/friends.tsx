import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, X, Check } from "lucide-react";
import { loadProgress, saveProgress, type Progress } from "@/lib/game/progress";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/friends")({
  head: () => ({ meta: [{ title: "Kaverit · Tile Rush" }] }),
  component: FriendsPage,
});

type Tab = "list" | "requests" | "add" | "leaderboard";

function FriendsPage() {
  const [p, setP] = useState<Progress | null>(null);
  const [tab, setTab] = useState<Tab>("list");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => setP(loadProgress()), []);
  if (!p) return null;

  const send = () => {
    const c = code.trim().toLowerCase();
    if (!c) return;
    if (c === p.profile.friendCode) { setMsg("Et voi lisätä itseäsi kaveriksi."); return; }
    const cur = loadProgress();
    if (cur.friends.list.some((f) => f.code === c)) { setMsg("Tämä pelaaja on jo kaverisi."); return; }
    if (cur.friends.outgoing.some((f) => f.code === c)) { setMsg("Pyyntö on jo lähetetty."); return; }
    // Local stub: since backend is not built yet, we treat request as pending outgoing.
    // Real cloud implementation coming.
    cur.friends.outgoing.push({ code: c, username: `Koodi ${c}` });
    saveProgress(cur);
    setP(cur);
    setCode("");
    setMsg("Kaveripyyntö lähetetty. (Kaveritoiminnot yhdistetään pilveen tulevassa päivityksessä.)");
  };

  const cancel = (c: string) => {
    const cur = loadProgress();
    cur.friends.outgoing = cur.friends.outgoing.filter((f) => f.code !== c);
    saveProgress(cur); setP(cur);
  };
  const accept = (c: string) => {
    const cur = loadProgress();
    const found = cur.friends.incoming.find((f) => f.code === c);
    if (!found) return;
    cur.friends.incoming = cur.friends.incoming.filter((f) => f.code !== c);
    if (cur.friends.list.length < 50) cur.friends.list.push(found);
    saveProgress(cur); setP(cur);
  };
  const reject = (c: string) => {
    const cur = loadProgress();
    cur.friends.incoming = cur.friends.incoming.filter((f) => f.code !== c);
    saveProgress(cur); setP(cur);
  };
  const removeFriend = (c: string) => {
    const cur = loadProgress();
    cur.friends.list = cur.friends.list.filter((f) => f.code !== c);
    saveProgress(cur); setP(cur);
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-[560px] mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Lobby
      </Link>
      <h1 className="mt-4 text-3xl font-black">Kaverit</h1>

      <div className="mt-4 flex gap-2">
        {([
          ["list", `Ystävät ${p.friends.list.length}/50`],
          ["requests", "Pyynnöt"],
          ["add", "Lisää"],
          ["leaderboard", "Tulostaulu"],
        ] as [Tab, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`neon-panel px-3 py-2 text-sm ${tab === k ? "border-primary" : ""}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <div className="mt-4 space-y-2">
          {p.friends.list.length === 0 && <div className="text-sm text-muted-foreground">Ei vielä kavereita. Lisää heitä koodilla.</div>}
          {p.friends.list.map((f) => (
            <div key={f.code} className="neon-panel p-3 flex items-center justify-between">
              <div>
                <div className="font-bold">{f.username}</div>
                <div className="text-xs text-muted-foreground font-mono">{f.code}</div>
              </div>
              <button onClick={() => removeFriend(f.code)} className="text-xs text-destructive">Poista</button>
            </div>
          ))}
        </div>
      )}

      {tab === "requests" && (
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-muted-foreground">Saapuvat</h3>
            {p.friends.incoming.length === 0 && <div className="text-sm text-muted-foreground mt-2">Ei saapuvia pyyntöjä.</div>}
            {p.friends.incoming.map((f) => (
              <div key={f.code} className="neon-panel p-3 flex items-center justify-between mt-2">
                <div className="font-bold">{f.username}</div>
                <div className="flex gap-2">
                  <button onClick={() => accept(f.code)} className="p-2 rounded bg-primary text-primary-foreground"><Check className="h-4 w-4" /></button>
                  <button onClick={() => reject(f.code)} className="p-2 rounded bg-destructive text-destructive-foreground"><X className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-sm font-bold text-muted-foreground">Lähtevät</h3>
            {p.friends.outgoing.length === 0 && <div className="text-sm text-muted-foreground mt-2">Ei lähteviä pyyntöjä.</div>}
            {p.friends.outgoing.map((f) => (
              <div key={f.code} className="neon-panel p-3 flex items-center justify-between mt-2">
                <div>
                  <div className="font-bold">{f.username}</div>
                  <div className="text-xs text-muted-foreground font-mono">{f.code}</div>
                </div>
                <button onClick={() => cancel(f.code)} className="p-2 rounded bg-secondary"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "add" && (
        <div className="mt-4 space-y-4">
          <div className="neon-panel p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Oma kaverikoodisi</div>
            <div className="mt-1 text-2xl font-mono tracking-widest">{p.profile.friendCode}</div>
          </div>
          <div className="neon-panel p-4 space-y-3">
            <div className="text-sm font-bold">Lisää kaveri koodilla</div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toLowerCase())}
              placeholder="6-merkkinen koodi"
              maxLength={6}
              className="w-full rounded bg-background/60 border border-border/50 px-3 py-2 font-mono tracking-widest"
            />
            <Button onClick={send} className="w-full">Lähetä pyyntö</Button>
            {msg && <div className="text-xs text-muted-foreground">{msg}</div>}
          </div>
          <p className="text-xs text-muted-foreground opacity-75">
            Huom: täydet kaveritoiminnot (reaaliaikaiset pyynnöt muilta pelaajilta) yhdistetään pilveen tulevassa päivityksessä.
          </p>
        </div>
      )}

      {tab === "leaderboard" && (
        <div className="mt-4 space-y-2">
          <div className="text-xs text-muted-foreground">
            Kaverien tulostaulu — tähdet, tasot ja kolikot. Reaaliaikaiset kaverien tulokset yhdistetään pilveen seuraavassa päivityksessä.
          </div>
          <div className="neon-panel p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-primary text-lg font-black w-6 text-center">1</span>
              <div>
                <div className="font-bold">{p.profile.username} <span className="text-xs text-primary">(Sinä)</span></div>
                <div className="text-xs text-muted-foreground">{p.completed.length} tasoa · {p.stats.stars} ⭐</div>
              </div>
            </div>
            <span className="text-sm font-mono">🪙 {p.coins}</span>
          </div>
          {p.friends.list.map((f, i) => (
            <div key={f.code} className="neon-panel p-3 flex items-center justify-between opacity-80">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-lg font-black w-6 text-center">{i + 2}</span>
                <div>
                  <div className="font-bold">{f.username}</div>
                  <div className="text-xs text-muted-foreground font-mono">{f.code}</div>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">— · —</span>
            </div>
          ))}
          {p.friends.list.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-4">
              Lisää kavereita nähdäksesi heidät tulostaululla.
            </div>
          )}
        </div>
      )}
    </div>
  );
}