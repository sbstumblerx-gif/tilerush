import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LEVELS } from "@/lib/game/levels";
import { isUnlocked, loadProgress } from "@/lib/game/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Lock } from "lucide-react";

export const Route = createFileRoute("/levels")({
  head: () => ({
    meta: [
      { title: "Tasot · Tile Rush" },
      { name: "description", content: "Valitse taso ja jatka etenemistä." },
    ],
  }),
  component: LevelsPage,
});

function LevelsPage() {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState<number[]>([]);

  useEffect(() => {
    setCompleted(loadProgress().completed);
  }, []);

  return (
    <div className="min-h-screen px-4 py-8 max-w-[520px] mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Lobby
      </Link>
      <h1 className="mt-4 text-3xl font-black">Tasot</h1>
      <p className="text-sm text-muted-foreground">Seuraava taso avautuu edellisen suorituksen jälkeen.</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {LEVELS.map((l) => {
          const done = completed.includes(l.id);
          const unlocked = isUnlocked(l.id, completed);
          return (
            <Button
              key={l.id}
              variant={done ? "secondary" : unlocked ? "default" : "outline"}
              disabled={!unlocked}
              onClick={() => navigate({ to: "/play", search: { level: l.id } })}
              className="h-24 flex flex-col items-start justify-between p-3 text-left"
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-xs uppercase tracking-widest opacity-70">Taso {l.id}</span>
                {done ? <Check className="h-4 w-4" /> : !unlocked ? <Lock className="h-4 w-4" /> : null}
              </div>
              <div className="w-full">
                <div className="font-bold truncate">{l.name}</div>
                <div className="text-[11px] opacity-70">{l.moves} siirtoa</div>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}