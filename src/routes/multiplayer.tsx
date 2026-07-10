import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Users, Plus, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { createParty, joinParty } from "@/lib/cloud/social";

export const Route = createFileRoute("/multiplayer")({
  head: () => ({ meta: [{ title: "Moninpeli · Tile Rush" }] }),
  component: MultiplayerPage,
});

function MultiplayerPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"choose" | "join">("choose");
  const [code, setCode] = useState("");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  const createGame = async () => {
    setBusy(true); setErr(null);
    const party = await createParty(5, []);
    setBusy(false);
    if (!party) { setErr("Pelin luonti epäonnistui."); return; }
    navigate({ to: "/party/$code", params: { code: party.code } });
  };

  const doJoin = async () => {
    const c = code.trim().toLowerCase();
    if (!c) return;
    setBusy(true); setErr(null);
    const res = await joinParty(c);
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? "Virhe."); return; }
    navigate({ to: "/party/$code", params: { code: c } });
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-[420px] mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Lobby
      </Link>
      <h1 className="mt-4 text-3xl font-black flex items-center gap-2"><Users className="h-6 w-6" /> Moninpeli</h1>

      {signedIn === false && (
        <div className="mt-4 neon-panel p-4 text-sm">
          Moninpeli vaatii sisäänkirjautumisen. <Link to="/settings" className="underline text-primary inline-flex items-center gap-1"><LogIn className="h-3 w-3" /> Kirjaudu Googlella</Link>
        </div>
      )}

      {mode === "choose" && (
        <div className="mt-8 space-y-3">
          <Button size="lg" className="w-full h-16 text-lg gap-3" onClick={createGame} disabled={!signedIn || busy}>
            <Plus className="h-5 w-5" /> Luo peli
          </Button>
          <Button size="lg" variant="secondary" className="w-full h-16 text-lg gap-3" onClick={() => setMode("join")} disabled={!signedIn}>
            <LogIn className="h-5 w-5" /> Liity peliin
          </Button>
          <p className="mt-4 text-xs text-muted-foreground text-center">Moninpeli tukee 4 pelaajaa. Luo peli tai liity kaverisi koodilla.</p>
          {err && <div className="text-xs text-destructive text-center">{err}</div>}
        </div>
      )}

      {mode === "join" && (
        <div className="mt-8 space-y-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toLowerCase())}
            placeholder="Syötä pelin koodi"
            maxLength={5}
            className="w-full rounded bg-background/60 border border-border/50 px-3 py-3 font-mono text-xl tracking-widest text-center"
          />
          <Button className="w-full" onClick={doJoin} disabled={busy || !code}>
            Liity
          </Button>
          {err && <div className="text-xs text-destructive text-center">{err}</div>}
          <button onClick={() => setMode("choose")} className="w-full text-xs text-muted-foreground">Takaisin</button>
        </div>
      )}
    </div>
  );
}