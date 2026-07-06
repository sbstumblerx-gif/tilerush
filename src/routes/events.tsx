import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { loadProgress, saveProgress, type Progress, type TileCupTask } from "@/lib/game/progress";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/events")({
  head: () => ({ meta: [{ title: "Tapahtumat · Tile Rush" }] }),
  component: EventsPage,
});

function EventsPage() {
  const [p, setP] = useState<Progress | null>(null);
  const [view, setView] = useState<"tasks" | "game">("tasks");
  useEffect(() => setP(loadProgress()), []);

  const claim = (t: TileCupTask) => {
    if (t.claimed || t.progress < t.target) return;
    const cur = loadProgress();
    const task = cur.tileCup.tasks.find((x) => x.id === t.id);
    if (!task) return;
    task.claimed = true;
    // Grant cosmetic reward based on label
    if (t.id === "vb10") cur.owned.patterns = Array.from(new Set([...cur.owned.patterns, "fifa"]));
    if (t.id === "g20") cur.owned.accessories = Array.from(new Set([...cur.owned.accessories, "yellowcard"]));
    if (t.id === "g50") cur.owned.accessories = Array.from(new Set([...cur.owned.accessories, "redcard"]));
    if (t.id === "g75") cur.owned.themes = Array.from(new Set([...cur.owned.themes, "jalkapallo"]));
    saveProgress(cur);
    setP(cur);
  };

  if (!p) return null;

  return (
    <div className="min-h-screen px-4 py-8 max-w-[560px] mx-auto">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Lobby
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView((v) => (v === "tasks" ? "game" : "tasks"))}
            className="neon-panel px-3 py-1 text-xs font-bold flex items-center gap-1"
          >
            {view === "tasks" ? (
              <>
                Minipeli <ChevronRight className="h-3 w-3" />
              </>
            ) : (
              <>
                <ChevronLeft className="h-3 w-3" /> Tehtävät
              </>
            )}
          </button>
        </div>
      </div>
      <h1 className="mt-4 text-3xl font-black">Tile Cup</h1>

      {view === "tasks" && (
        <div className="mt-4 space-y-3">
          <div className="neon-panel p-3 text-sm">
            Maalit: <span className="font-bold">{p.tileCup.goals}</span> · Lentopallot:{" "}
            <span className="font-bold">{p.tileCup.volleyUses}</span>
          </div>
          {p.tileCup.tasks.map((t) => {
            const pct = Math.min(100, (t.progress / t.target) * 100);
            const ready = t.progress >= t.target && !t.claimed;
            return (
              <div key={t.id} className="neon-panel p-4">
                <div className="flex justify-between gap-3">
                  <div className="font-semibold text-sm">{t.label}</div>
                  <div className="text-xs text-muted-foreground">🎁 {t.reward}</div>
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
                    onClick={() => claim(t)}
                    className="text-xs font-bold px-3 py-1 rounded bg-primary text-primary-foreground disabled:opacity-40"
                  >
                    {t.claimed ? "Lunastettu" : ready ? "Lunasta" : "Kesken"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "game" && <TileCupGame onGoal={() => setP(loadProgress())} />}
    </div>
  );
}

function TileCupGame({ onGoal }: { onGoal: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [msg, setMsg] = useState("Klikkaa maalia ampuaksesi!");
  const stateRef = useRef({
    ball: { x: 200, y: 340, vx: 0, vy: 0, active: false },
    keeper: { x: 200, dir: 1 },
  });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    const W = canvas.width;
    const H = canvas.height;
    const goal = { x: 60, y: 40, w: 280, h: 120 };

    const render = () => {
      const s = stateRef.current;
      // pitch
      ctx.fillStyle = "#1a5a2a";
      ctx.fillRect(0, 0, W, H);
      // stripes
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 ? "#1e6a30" : "#1a5a2a";
        ctx.fillRect(0, i * 70, W, 70);
      }
      // goal net
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 4;
      ctx.strokeRect(goal.x, goal.y, goal.w, goal.h);
      ctx.lineWidth = 1;
      for (let x = goal.x; x <= goal.x + goal.w; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, goal.y);
        ctx.lineTo(x, goal.y + goal.h);
        ctx.stroke();
      }
      for (let y = goal.y; y <= goal.y + goal.h; y += 20) {
        ctx.beginPath();
        ctx.moveTo(goal.x, y);
        ctx.lineTo(goal.x + goal.w, y);
        ctx.stroke();
      }
      // keeper
      s.keeper.x += s.keeper.dir * 2.4;
      if (s.keeper.x < goal.x + 30) s.keeper.dir = 1;
      if (s.keeper.x > goal.x + goal.w - 30) s.keeper.dir = -1;
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(s.keeper.x - 26, goal.y + 30, 52, 70);
      ctx.fillStyle = "#fde68a";
      ctx.beginPath();
      ctx.arc(s.keeper.x, goal.y + 22, 12, 0, Math.PI * 2);
      ctx.fill();

      // ball
      if (s.ball.active) {
        s.ball.x += s.ball.vx;
        s.ball.y += s.ball.vy;
        // hit keeper?
        if (
          s.ball.y < goal.y + 100 &&
          s.ball.y > goal.y + 30 &&
          Math.abs(s.ball.x - s.keeper.x) < 30
        ) {
          setMsg("🧤 Torjunta!");
          resetBall();
        } else if (s.ball.y < goal.y + goal.h && s.ball.x > goal.x && s.ball.x < goal.x + goal.w) {
          if (s.ball.y < goal.y + 30) {
            setMsg("⚽ MAALI!");
            scored();
            resetBall();
          }
        } else if (s.ball.y < 0 || s.ball.x < 0 || s.ball.x > W) {
          setMsg("Ohi!");
          resetBall();
        }
      }
      // draw ball
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(s.ball.x, s.ball.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⚽", s.ball.x, s.ball.y);

      raf = requestAnimationFrame(render);
    };

    const resetBall = () => {
      stateRef.current.ball = { x: W / 2, y: H - 60, vx: 0, vy: 0, active: false };
    };

    const scored = () => {
      const cur = loadProgress();
      cur.tileCup.goals += 1;
      cur.coins += 5;
      cur.tileCup.tasks.forEach((t) => {
        if (t.id === "g20" || t.id === "g50" || t.id === "g75") {
          t.progress = Math.min(t.target, t.progress + 1);
        }
      });
      saveProgress(cur);
      onGoal();
    };

    const onClick = (e: MouseEvent) => {
      const s = stateRef.current;
      if (s.ball.active) return;
      const rect = canvas.getBoundingClientRect();
      const tx = ((e.clientX - rect.left) / rect.width) * W;
      const ty = ((e.clientY - rect.top) / rect.height) * H;
      const dx = tx - s.ball.x;
      const dy = ty - s.ball.y;
      const len = Math.hypot(dx, dy);
      s.ball.vx = (dx / len) * 9;
      s.ball.vy = (dy / len) * 9;
      s.ball.active = true;
      setMsg("Pallo lentää...");
    };
    canvas.addEventListener("click", onClick);
    resetBall();
    render();
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("click", onClick);
    };
  }, [onGoal]);

  return (
    <div className="mt-4 space-y-2">
      <div className="neon-panel p-3 text-center font-bold">{msg}</div>
      <canvas
        ref={ref}
        width={400}
        height={400}
        className="w-full rounded border border-border/60 cursor-crosshair"
      />
      <p className="text-xs text-muted-foreground text-center">
        Klikkaa/kosketa maalin sisälle ohittaen maalivahdin.
      </p>
    </div>
  );
}