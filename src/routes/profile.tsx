import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, LogIn, LogOut } from "lucide-react";
import { loadProgress, saveProgress, type Progress } from "@/lib/game/progress";
import { PlayerToken } from "@/components/game/PlayerToken";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import {
  svUser, svSignIn, svSignUp, svSignInGoogle, svSignOut, svIsLinked, svLink, svUnlink,
  svSyncData, claimSvLinkGift, markSvUser,
} from "@/lib/sv/account";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profiili · Tile Rush" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const [p, setP] = useState<Progress | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const cur = loadProgress();
    setP(cur);
    setName(cur.profile.username);
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!p) return null;

  const saveName = () => {
    const trimmed = name.trim().slice(0, 20);
    if (!trimmed) return;
    const cur = loadProgress();
    cur.profile.username = trimmed;
    saveProgress(cur);
    setP(cur);
  };

            const linkGoogle = async () => {
    await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.href
    });
  };
  

  const signOut = async () => {
    await supabase.auth.signOut();
    setEmail(null); // Varmistetaan, että tila nollautuu heti käyttöliittymässä
  };
  
  const copyCode = () => navigator.clipboard?.writeText(p.profile.friendCode);

  return (
    <div className="min-h-screen px-4 py-8 max-w-[520px] mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Lobby
      </Link>
      <h1 className="mt-4 text-3xl font-black">Profiili</h1>

      <div className="mt-6 neon-panel p-6 flex items-center gap-4">
        <PlayerToken equipped={p.equipped} size={72} />
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Käyttäjänimi</div>
          <div className="text-2xl font-black">{p.profile.username}</div>
        </div>
      </div>

      <section className="mt-4 neon-panel p-4 space-y-3">
        <h2 className="font-bold">Vaihda käyttäjänimi</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="Käyttäjänimi"
          className="w-full rounded bg-background/60 border border-border/50 px-3 py-2"
        />
        <Button onClick={saveName} className="w-full">Tallenna</Button>
      </section>

      <section className="mt-4 neon-panel p-4">
        <h2 className="font-bold">Kaverikoodi</h2>
        <div className="mt-2 flex items-center justify-between">
          <code className="text-lg font-mono tracking-widest">{p.profile.friendCode}</code>
          <Button size="sm" variant="secondary" onClick={copyCode}>Kopioi</Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Jaa tämä koodi kavereille — he voivat lisätä sinut peliin sen avulla.</p>
      </section>

      <section className="mt-4 neon-panel p-4 space-y-3">
        <h2 className="font-bold">Tili</h2>
        {email ? (
          <>
            <div className="text-sm text-muted-foreground">Kirjautunut: <span className="text-foreground">{email}</span></div>
            <Button variant="outline" className="w-full gap-2" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Kirjaudu ulos
            </Button>
          </>
        ) : (
          <Button className="w-full gap-2" onClick={linkGoogle}>
            <LogIn className="h-4 w-4" /> Linkitä Google-tili
          </Button>
        )}
      </section>

      <SvAccountPanel />

      <p className="mt-4 text-xs text-muted-foreground opacity-75 text-center">
        Profiilikuvat tulossa tulevassa päivityksessä. Tällä hetkellä hahmosi asukokonaisuus toimii profiilikuvana.
      </p>
      <div className="mt-6 text-center">
        <button onClick={() => navigate({ to: "/" })} className="text-xs text-muted-foreground">Sulje</button>
      </div>
    </div>
  );
}

function SvAccountPanel() {
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  const [linked, setLinked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const u = await svUser();
    setUser(u);
    if (u) {
      markSvUser(u.id);
      setLinked(await svIsLinked(u.id));
    } else setLinked(false);
  };

  useEffect(() => { void refresh(); }, []);

  const signIn = async (mode: "in" | "up") => {
    setBusy(true); setMsg(null);
    const err = mode === "in" ? await svSignIn(email, password) : await svSignUp(email, password);
    setBusy(false);
    if (err) { setMsg(err); return; }
    setPassword("");
    await refresh();
  };

  const link = async () => {
    setBusy(true); setMsg(null);
    const res = await svLink();
    setBusy(false);
    if (!res.ok) { setMsg(res.error ?? "Linkitys epäonnistui."); return; }
    setLinked(true);
    if (res.firstLink && user && claimSvLinkGift(user.id)) {
      setMsg("🎁 Linkitys onnistui! Sait 2× ultralaatikkoa varastoon.");
    } else {
      setMsg("Linkitys ajan tasalla.");
    }
  };

  const unlink = async () => {
    if (!window.confirm("Katkaistaanko SV Account -linkitys? Pelidatasi säilyy.")) return;
    setBusy(true);
    await svUnlink();
    setBusy(false);
    setLinked(false);
    setMsg("Linkitys katkaistu.");
  };

  const sync = async () => {
    setBusy(true);
    await svSyncData();
    setBusy(false);
    setMsg("Tiedot synkronoitu SV Accountiin.");
  };

  return (
    <section className="mt-4 neon-panel p-4 space-y-3">
      <h2 className="font-bold">SV Account</h2>
      <p className="text-xs text-muted-foreground">
        Erillinen SV-tunnus, joka yhdistää kaikki SV-sovellukset. Ensimmäisestä linkityksestä saat 2× ultralaatikon.
      </p>

      {!user ? (
        <>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="SV-sähköposti"
            autoComplete="email"
            className="w-full rounded bg-background/60 border border-border/50 px-3 py-2 text-sm"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Salasana"
            autoComplete="current-password"
            className="w-full rounded bg-background/60 border border-border/50 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <Button className="flex-1" disabled={busy} onClick={() => void signIn("in")}>Kirjaudu</Button>
            <Button variant="secondary" className="flex-1" disabled={busy} onClick={() => void signIn("up")}>Luo tunnus</Button>
          </div>
          <Button variant="outline" className="w-full" disabled={busy} onClick={() => void svSignInGoogle()}>
            Jatka Googlella (SV)
          </Button>
        </>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            SV-tunnus: <span className="text-foreground">{user.email ?? user.id.slice(0, 8)}</span>
          </div>
          <div className="text-xs">
            Tila: {linked ? <span className="text-emerald-400 font-bold">Linkitetty</span> : <span className="text-muted-foreground">Ei linkitetty</span>}
          </div>
          {linked ? (
            <div className="flex gap-2">
              <Button className="flex-1" disabled={busy} onClick={() => void sync()}>Synkronoi</Button>
              <Button variant="outline" className="flex-1" disabled={busy} onClick={() => void unlink()}>Katkaise</Button>
            </div>
          ) : (
            <Button className="w-full" disabled={busy} onClick={() => void link()}>Yhdistä SV Account</Button>
          )}
          <button
            className="text-xs text-muted-foreground"
            onClick={() => void svSignOut().then(refresh)}
          >
            Kirjaudu ulos SV Accountista
          </button>
        </>
      )}

      {msg && <div className="text-xs">{msg}</div>}
    </section>
  );
}
