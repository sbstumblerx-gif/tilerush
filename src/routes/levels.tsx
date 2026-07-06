import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getLevel } from "@/lib/game/levels";
import { isUnlocked, loadProgress } from "@/lib/game/progress";
import { PACKS, isPackUnlocked, packProgress } from "@/lib/game/packs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Lock, Star } from "lucide-react";

export const Route = createFileRoute("/levels")({
  head: () => ({ meta: [{ title: "Tasot · Tile Rush" }] }),
  component: LevelsPage,
});

function LevelsPage() {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState<number[]>([]);
  const [stars, setStars] = useState<Record<number, number>>({});
  const [openPack, setOpenPack] = useState<number | null>(null);

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

      {!active && (
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

      {active && (
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