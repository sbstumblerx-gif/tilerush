import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Users, Plus, LogIn } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/multiplayer")({
  head: () => ({ meta: [{ title: "Moninpeli · Tile Rush" }] }),
  component: MultiplayerPage,
});

function MultiplayerPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"choose" | "join">("choose");
  const [code, setCode] = useState("");

  const createGame = () => {
    const c = Math.random().toString(36).slice(2, 7);
    navigate({ to: "/party/$code", params: { code: c } });
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-[420px] mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Lobby
      </Link>
      <h1 className="mt-4 text-3xl font-black flex items-center gap-2"><Users className="h-6 w-6" /> Moninpeli</h1>

      {mode === "choose" && (
        <div className="mt-8 space-y-3">
          <Button size="lg" className="w-full h-16 text-lg gap-3" onClick={createGame}>
            <Plus className="h-5 w-5" /> Luo peli
          </Button>
          <Button size="lg" variant="secondary" className="w-full h-16 text-lg gap-3" onClick={() => setMode("join")}>
            <LogIn className="h-5 w-5" /> Liity peliin
          </Button>
          <p className="mt-4 text-xs text-muted-foreground text-center">
            Moninpeli tukee 4 pelaajaa. Kirjoittautuminen ja partyn järjestäminen on käytettävissä.
            Reaaliaikainen peliyhteys pilvessä viimeistellään seuraavassa päivityksessä.
          </p>
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
          <Button className="w-full" onClick={() => code && navigate({ to: "/party/$code", params: { code } })}>
            Liity
          </Button>
          <button onClick={() => setMode("choose")} className="w-full text-xs text-muted-foreground">Takaisin</button>
        </div>
      )}
    </div>
  );
}