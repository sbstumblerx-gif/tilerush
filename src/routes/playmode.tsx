import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Play, Swords, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { LEVELS } from "@/lib/game/levels";
import { firstUnfinished, loadProgress } from "@/lib/game/progress";

export const Route = createFileRoute("/playmode")({
  head: () => ({
    meta: [
      { title: "Pelaa · Tile Rush" },
      { name: "description", content: "Valitse pelitila: seuraava taso, online 1v1 matchmaking tai party enintään 8 pelaajalle." },
      { property: "og:title", content: "Pelaa · Tile Rush" },
      { property: "og:description", content: "Kolme pelitilaa yhdessä paikassa: tarina, 1v1 ja party." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlayModePage,
});

function PlayModePage() {
  const navigate = useNavigate();
  const [nextLevel, setNextLevel] = useState(1);
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    const p = loadProgress();
    setNextLevel(firstUnfinished(p.completed, LEVELS.map((l) => l.id)));
    setCompleted(p.completed.length);
  }, []);

  return (
    <div className="min-h-screen px-4 py-8 max-w-[420px] mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Lobby
      </Link>
      <h1 className="mt-4 text-3xl font-black flex items-center gap-2">
        <Play className="h-6 w-6 text-primary fill-current" /> Pelaa
      </h1>

      <div className="mt-6 space-y-3">
        <button
          onClick={() => navigate({ to: "/play", search: { level: nextLevel } })}
          className="w-full text-left neon-panel p-4 border-primary/50 hover:border-primary bg-primary/5"
        >
          <div className="flex items-center gap-3">
            <Play className="h-6 w-6 text-primary fill-current shrink-0" />
            <div>
              <div className="text-lg font-black">Seuraava taso</div>
              <div className="text-xs text-muted-foreground">
                Taso {nextLevel} · {completed} / {LEVELS.length} suoritettu
              </div>
            </div>
          </div>
        </button>

        <Link to="/online" className="block neon-panel p-4 hover:border-primary/70">
          <div className="flex items-center gap-3">
            <Swords className="h-6 w-6 text-primary shrink-0" />
            <div>
              <div className="text-lg font-black">Online 1v1</div>
              <div className="text-xs text-muted-foreground">Matchmaking · 3 kierrosta · pokaaleja voitosta</div>
            </div>
          </div>
        </Link>

        <Link to="/multiplayer" className="block neon-panel p-4 hover:border-primary/70">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary shrink-0" />
            <div>
              <div className="text-lg font-black">Party</div>
              <div className="text-xs text-muted-foreground">Enintään 8 pelaajaa · 1–50 kierrosta koodilla</div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
