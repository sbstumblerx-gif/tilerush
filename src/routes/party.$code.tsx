import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Copy, Settings as SettingsIcon, Play, Plus, LogOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { loadProgress, type Progress } from "@/lib/game/progress";
import { PACKS } from "@/lib/game/packs";
import { Button } from "@/components/ui/button";
import { PlayerToken } from "@/components/game/PlayerToken";
import { supabase } from "@/integrations/supabase/client";
import {
  getParty, joinParty, leaveParty, listPartyMembers, updatePartySettings,
  currentUserId, type PartyRow, type CloudProfile,
} from "@/lib/cloud/social";

export const Route = createFileRoute("/party/$code")({
  head: () => ({ meta: [{ title: "Party · Tile Rush" }] }),
  component: PartyPage,
});

function PartyPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [p, setP] = useState<Progress | null>(null);
  const [party, setParty] = useState<PartyRow | null>(null);
  const [members, setMembers] = useState<CloudProfile[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPacks, setShowPacks] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [pr, mem] = await Promise.all([getParty(code), listPartyMembers(code)]);
    setParty(pr);
    setMembers(mem);
  }, [code]);

          useEffect(() => {
    const progress = loadProgress();
    setP(progress);
    
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const id = user?.id ?? null;
        setUid(id);
        
        if (!id) { setErr("Kirjaudu sisään päästäksesi partyyn."); return; }
        
        const pr = await getParty(code);
        if (!pr) { setErr("Peliä ei löytynyt."); return; }
        
        const myUsername = progress?.profile?.username || "Pelaaja";
        try {
          await upsertMyProfile({ username: myUsername });
        } catch (e) {
          console.error(e);
        }
        
        const mem = await listPartyMembers(code).catch(() => []);
        if (!mem.some((m) => m.user_id === id)) {
          await joinParty(code).catch(() => null);
        }

        setMembers(() => {
          const currentMembers = Array.isArray(mem) ? mem : [];
          if (!currentMembers.some(m => m.user_id === id)) {
            return [...currentMembers, { 
              user_id: id, 
              username: myUsername, 
              friend_code: id.slice(0, 8),
              avatar_team: null 
            }];
          }
          return currentMembers;
        });

      } catch (globalError) {
        console.error("Party latausvirhe:", globalError);
        setErr("Partyn latauksessa tapahtui virhe.");
      } finally {
        // TÄMÄ PUUTTUI: Pakotetaan latausruutu sulkeutumaan, 
        // oli lopputulos mikä tahansa!
        refresh();
      }
    })();
  }, [code, refresh]);
  
      } catch (globalError) {
        console.error("Party latausvirhe:", globalError);
        setErr("Partyn latauksessa tapahtui virhe. Yritä ladata sivu uudelleen.");
      }
    })();
  }, [code, refresh]);
            
      
  
    
    

  useEffect(() => {
    const ch = supabase
      .channel(`party-${code}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "party_members", filter: `party_code=eq.${code}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "parties", filter: `code=eq.${code}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [code, refresh]);

  if (!p) return null;
  if (err) {
    return (
      <div className="min-h-screen px-4 py-8 max-w-[420px] mx-auto">
        <Link to="/multiplayer" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Takaisin
        </Link>
        <div className="mt-8 neon-panel p-4 text-sm">{err}</div>
      </div>
    );
  }
  if (!party) {
    return <div className="min-h-screen p-8 text-sm text-muted-foreground">Ladataan partya…</div>;
  }

  const isHost = uid === party.host_id;
  const rounds = party.rounds;
  const packs: number[] = Array.isArray(party.packs) ? party.packs : [];
  const canStart = isHost && packs.length >= 1 && members.length >= 2;

  const togglePack = async (id: number) => {
    if (!isHost) return;
    const next = packs.includes(id) ? packs.filter((x) => x !== id) : [...packs, id];
    await updatePartySettings(code, { packs: next });
  };
  const setRounds = async (r: number) => {
    if (!isHost) return;
    await updatePartySettings(code, { rounds: r });
  };
  const doLeave = async () => {
    await leaveParty(code);
    navigate({ to: "/multiplayer" });
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-[720px] mx-auto">
      <div className="flex items-center justify-between">
        <Link to="/multiplayer" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Takaisin
        </Link>
        <button onClick={doLeave} className="text-xs text-destructive flex items-center gap-1"><LogOut className="h-3 w-3" /> Poistu</button>
      </div>
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
          <p className="text-[10px] text-muted-foreground opacity-70">Jaa koodi kaverillesi — hän voi liittyä Moninpeli → Liity peliin.</p>
        </div>

        {/* Right: player slots */}
        <div className="neon-panel p-4 space-y-2">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Pelaajat {members.length}/4</div>
          {[0, 1, 2, 3].map((slot) => {
            const m = members[slot];
            return (
              <div key={slot} className="flex items-center gap-3 bg-background/40 rounded p-2 border border-border/40">
                {m ? (
                  <>
                    {m.user_id === uid ? (
                      <PlayerToken equipped={p.equipped} size={36} />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-bold">
                        {(m.username ?? "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="font-bold">{m.username}</div>
                    {m.user_id === party.host_id && <span className="ml-auto text-xs text-primary">Isäntä</span>}
                  </>
                ) : (
                  <div className="w-full flex items-center gap-3 text-muted-foreground">
                    <span className="h-9 w-9 rounded-full border border-dashed border-border/60 flex items-center justify-center"><Plus className="h-4 w-4" /></span>
                    <span className="text-sm">Tyhjä paikka</span>
                  </div>
                )}
              </div>
            );
          })}
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
          <input type="range" min={1} max={20} value={rounds} disabled={!isHost} onChange={(e) => setRounds(Number(e.target.value))} className="w-full disabled:opacity-50" />
          <div className="mt-1 text-xs text-muted-foreground">Jokaisessa kierroksessa on korkeintaan 45 s aikaa.</div>
          {!isHost && <div className="mt-1 text-[10px] text-muted-foreground">Vain isäntä voi muuttaa asetuksia.</div>}
        </div>
      )}

      {showPacks && (
        <div className="mt-4 neon-panel p-3 grid grid-cols-2 gap-2 max-h-64 overflow-auto">
          {PACKS.map((pk) => (
            <button
              key={pk.id}
              onClick={() => togglePack(pk.id)}
              disabled={!isHost}
              className={`text-left p-3 rounded border ${packs.includes(pk.id) ? "border-primary bg-primary/20" : "border-border/40 bg-background/40"}`}
            >
              <div className="text-[10px] uppercase text-muted-foreground">Paketti {pk.id}</div>
              <div className="font-bold text-sm">{pk.name}</div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 neon-panel p-4 text-xs text-muted-foreground text-center">
        Party synkronoituu reaaliaikaisesti pilvessä. Ottelun aikaraja 45 s / kierros ja pistetaulukko käynnistetään seuraavaksi.
      </div>
    </div>
  );
}
