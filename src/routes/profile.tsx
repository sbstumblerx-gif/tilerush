import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, LogIn, LogOut } from "lucide-react";
import { loadProgress, saveProgress, type Progress } from "@/lib/game/progress";
import { PlayerToken } from "@/components/game/PlayerToken";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

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
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href
      }
    });
  };
  
      // Varajärjestelmä, jos osoitetta ei löydy
      await lovable.auth.signInWithOAuth("google", { redirect_uri: currentUrl });
    }
  };
  
      options: {
        redirectTo: currentUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
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

      <p className="mt-4 text-xs text-muted-foreground opacity-75 text-center">
        Profiilikuvat tulossa tulevassa päivityksessä. Tällä hetkellä hahmosi asukokonaisuus toimii profiilikuvana.
      </p>
      <div className="mt-6 text-center">
        <button onClick={() => navigate({ to: "/" })} className="text-xs text-muted-foreground">Sulje</button>
      </div>
    </div>
  );
}
