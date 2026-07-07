import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, LogIn, LogOut, RefreshCw, Youtube, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { loadProgress, resetAllProgress, saveProgress } from "@/lib/game/progress";
import { setMusicVolume, setSfxVolume } from "@/lib/game/sound";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Asetukset · Tile Rush" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [music, setMusic] = useState(0.4);
  const [sfx, setSfx] = useState(0.7);
  const [email, setEmail] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    const p = loadProgress();
    setMusic(p.settings.music);
    setSfx(p.settings.sfx);
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const saveMusic = (v: number) => {
    setMusic(v);
    setMusicVolume(v);
    const p = loadProgress(); p.settings.music = v; saveProgress(p);
  };
  const saveSfx = (v: number) => {
    setSfx(v);
    setSfxVolume(v);
    const p = loadProgress(); p.settings.sfx = v; saveProgress(p);
  };

  const signIn = async () => {
    await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
  };
  const signOut = async () => {
    await supabase.auth.signOut();
    setConfirmLogout(false);
  };
  const doReset = () => {
    resetAllProgress();
    setConfirmReset(false);
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-[520px] mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Lobby
      </Link>
      <h1 className="mt-4 text-3xl font-black">Asetukset</h1>

      <section className="mt-6 neon-panel p-4 space-y-4">
        <h2 className="font-bold">Ääni</h2>
        <div>
          <div className="flex justify-between text-sm"><span>Musiikin voimakkuus</span><span>{Math.round(music * 100)}%</span></div>
          <Slider value={[music * 100]} onValueChange={(v) => saveMusic(v[0] / 100)} min={0} max={100} step={1} className="mt-2" />
        </div>
        <div>
          <div className="flex justify-between text-sm"><span>Äänitehosteet</span><span>{Math.round(sfx * 100)}%</span></div>
          <Slider value={[sfx * 100]} onValueChange={(v) => saveSfx(v[0] / 100)} min={0} max={100} step={1} className="mt-2" />
        </div>
      </section>

      <section className="mt-4 neon-panel p-4 space-y-3">
        <h2 className="font-bold">Tili</h2>
        {email ? (
          <>
            <div className="text-sm text-muted-foreground">Kirjautunut: <span className="text-foreground">{email}</span></div>
            <Button variant="outline" className="w-full gap-2" onClick={() => setConfirmLogout(true)}>
              <LogOut className="h-4 w-4" /> Kirjaudu ulos
            </Button>
          </>
        ) : (
          <Button className="w-full gap-2" onClick={signIn}>
            <LogIn className="h-4 w-4" /> Kirjaudu Googlella
          </Button>
        )}
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <a href="https://youtube.com/@tilerushgame?si=6lOOIINcRthkK3sG" target="_blank" rel="noreferrer" className="neon-panel p-3 flex items-center justify-center gap-2 font-semibold">
          <Youtube className="h-4 w-4" /> YouTube
        </a>
        <a href="https://discord.gg/zVNUHCnETV" target="_blank" rel="noreferrer" className="neon-panel p-3 flex items-center justify-center gap-2 font-semibold">
          <MessageCircle className="h-4 w-4" /> Discord
        </a>
      </section>

      <section className="mt-6 neon-panel p-4">
        <button onClick={() => setConfirmReset(true)} className="text-destructive font-black flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> NOLLAA
        </button>
      </section>

      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="neon-panel p-6 max-w-sm w-full text-center">
            <div className="font-bold">Aiotko varmasti nollata pelin? Menetät kaiken edistymisen ja sitä ei voi peruuttaa!</div>
            <div className="mt-4 flex gap-3">
              <Button className="flex-1" variant="destructive" onClick={doReset}>Kyllä</Button>
              <Button className="flex-1" variant="secondary" onClick={() => setConfirmReset(false)}>Ei</Button>
            </div>
          </div>
        </div>
      )}
      {confirmLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="neon-panel p-6 max-w-sm w-full text-center">
            <div className="font-bold">Haluatko varmasti kirjautua ulos?</div>
            <div className="mt-2 text-xs text-muted-foreground">Menetät pääsyn pilvitallennukseen ilman kirjautumista!</div>
            <div className="mt-4 flex gap-3">
              <Button className="flex-1" variant="destructive" onClick={signOut}>Kirjaudu ulos</Button>
              <Button className="flex-1" variant="secondary" onClick={() => setConfirmLogout(false)}>Peruuta</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}