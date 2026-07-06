import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadProgress, saveProgress, type Progress } from "@/lib/game/progress";
import { generateDaily, today } from "@/lib/game/tasks";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/tasks")({
  head: () => ({ meta: [{ title: "Tehtävät · Tile Rush" }] }),
  component: TasksPage,
});

function TasksPage() {
  const [p, setP] = useState<Progress | null>(null);
  useEffect(() => {
    const cur = loadProgress();
    const t = today();
    if (!cur.daily || cur.daily.date !== t) {
      cur.daily = { date: t, tasks: generateDaily(t) };
      saveProgress(cur);
    }
    setP(cur);
  }, []);

  const claim = (id: string) => {
    const cur = loadProgress();
    const task = cur.daily?.tasks.find((x) => x.id === id);
    if (!task || task.claimed || task.progress < task.target) return;
    task.claimed = true;
    cur.coins += task.reward;
    saveProgress(cur);
    setP(cur);
  };

  if (!p) return null;
  return (
    <div className="min-h-screen px-4 py-8 max-w-[520px] mx-auto">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Lobby
        </Link>
        <span className="neon-panel px-3 py-1 text-sm font-bold">🪙 {p.coins}</span>
      </div>
      <h1 className="mt-4 text-3xl font-black">Päivittäiset tehtävät</h1>
      <p className="text-sm text-muted-foreground">Päivittyvät 24 tunnin välein.</p>
      <div className="mt-6 space-y-3">
        {p.daily?.tasks.map((t) => {
          const pct = Math.min(100, (t.progress / t.target) * 100);
          const ready = t.progress >= t.target && !t.claimed;
          return (
            <div key={t.id} className="neon-panel p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-sm">{t.label}</div>
                <div className="text-xs text-muted-foreground">🪙 {t.reward}</div>
              </div>
              <div className="mt-2 h-2 rounded-full bg-background/60 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {t.progress}/{t.target}
                </span>
                <button
                  disabled={!ready}
                  onClick={() => claim(t.id)}
                  className="text-xs font-bold px-3 py-1 rounded bg-primary text-primary-foreground disabled:opacity-40"
                >
                  {t.claimed ? "Lunastettu" : ready ? "Lunasta" : "Kesken"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}