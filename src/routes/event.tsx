import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, KeyRound } from "lucide-react";
import { loadProgress, saveProgress, grantKeys, grantBackpack, type Progress, type LockerCell } from "@/lib/game/progress";
import { presentContainer } from "@/lib/game/containers";
import { msUntilSeasonEnd, formatDaysCountdown } from "@/lib/game/dailyReward";

export const Route = createFileRoute("/event")({
  head: () => ({
    meta: [
      { title: "Reppujahti · Tile Rush" },
      { name: "description", content: "Avaa koulun kaapin 50 lokeroa avaimilla ja metsästä Reppujahdin eksklusiivista kosmetiikkaa Tile Rushissa." },
      { property: "og:title", content: "Reppujahti · Tile Rush" },
      { property: "og:description", content: "Kauden 2 tapahtuma: 50 lokeroa, avaimia ja reppuja täynnä palkintoja." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventPage,
});

const CELL_ICON: Record<LockerCell["reward"], string> = {
  key: "🔑",
  backpack: "🎒",
  coins: "🪙",
  heart: "💗",
  box: "📦",
};

const CELL_LABEL: Record<LockerCell["reward"], string> = {
  key: "1x avain",
  backpack: "1x reppu",
  coins: "1000 kolikkoa",
  heart: "Loot-sydän",
  box: "Laatikko",
};

function EventPage() {
  const [p, setP] = useState<Progress | null>(null);
  const [last, setLast] = useState<string | null>(null);

  useEffect(() => {
    const load = () => setP(loadProgress());
    load();
    window.addEventListener("tilerush:progress", load);
    return () => window.removeEventListener("tilerush:progress", load);
  }, []);

  if (!p) return null;

  const locker = p.locker ?? [];
  const keys = p.keys ?? 0;
  const openedCount = locker.filter((c) => c.opened).length;

  const openCell = (index: number) => {
    const cur = loadProgress();
    const cells = cur.locker ?? [];
    const cell = cells[index];
    if (!cell || cell.opened) return;
    if ((cur.keys ?? 0) < 1) {
      setLast("Ei avaimia! Hanki avaimia tehtävistä, kaupasta tai Tile Passista.");
      return;
    }
    cur.keys = (cur.keys ?? 0) - 1;
    cell.opened = true;

    if (cell.reward === "key") grantKeys(cur, 1);
    else if (cell.reward === "coins") cur.coins += 1000;
    else if (cell.reward === "backpack") grantBackpack(cur);

    saveProgress(cur);
    setP(cur);
    setLast(`Lokero ${index + 1}: ${CELL_ICON[cell.reward]} ${CELL_LABEL[cell.reward]}`);

    if (cell.reward === "heart") presentContainer("heart", "common");
    if (cell.reward === "box") presentContainer("box", "common");
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-[560px] mx-auto">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Lobby
        </Link>
        <span className="neon-panel px-3 py-1 text-sm font-bold">🔑 {keys}</span>
      </div>

      <h1 className="mt-4 text-3xl font-black">Reppujahti</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Koulun kaapissa on 50 lokeroa. Yksi avain avaa yhden lokeron — sisältö on arvottu sinulle valmiiksi.
      </p>
      <div className="mt-1 text-xs text-muted-foreground">
        Tapahtuma päättyy 1.9.2026 (UTC) · {formatDaysCountdown(msUntilSeasonEnd())}
      </div>

      <div className="mt-4 neon-panel p-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Avatut lokerot</div>
          <div className="text-2xl font-black">{openedCount} / 50</div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div className="flex items-center gap-1 justify-end font-bold text-foreground">
            <KeyRound className="h-4 w-4 text-amber-400" /> {keys} avainta
          </div>
          <div className="mt-1">Avaimia: tehtävistä, kaupasta ja Tile Passista</div>
        </div>
      </div>

      {last && <div className="mt-3 neon-panel p-3 text-sm font-semibold">{last}</div>}

      <div className="mt-4 grid grid-cols-5 gap-2">
        {locker.map((cell, i) => (
          <button
            key={i}
            onClick={() => openCell(i)}
            disabled={cell.opened || keys < 1}
            className={`aspect-[3/4] rounded-lg border flex flex-col items-center justify-center text-xl transition-colors ${
              cell.opened
                ? "border-primary/50 bg-primary/10"
                : "border-border/60 bg-background/40 hover:border-primary/60 disabled:opacity-50"
            }`}
          >
            {cell.opened ? <span>{CELL_ICON[cell.reward]}</span> : <span className="text-sm opacity-60">🔒</span>}
            <span className="mt-0.5 text-[9px] text-muted-foreground">{i + 1}</span>
          </button>
        ))}
      </div>

      {(p.inventory.backpacks?.length ?? 0) > 0 && (
        <div className="mt-6 neon-panel p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Reput varastossa</div>
          <div className="mt-2 text-sm">🎒 {p.inventory.backpacks?.length} kpl — avaa ne Tile Passin inventaariosta.</div>
        </div>
      )}

      <div className="mt-8 neon-panel p-4 text-xs text-muted-foreground space-y-1">
        <div className="text-foreground font-bold text-sm">Kaapin sisältö</div>
        <div>🔑 avain · 15 lokeroa</div>
        <div>🎒 reppu · 10 lokeroa</div>
        <div>🪙 1000 kolikkoa · 10 lokeroa</div>
        <div>💗 Loot-sydän · 10 lokeroa</div>
        <div>📦 Laatikko · 5 lokeroa</div>
      </div>
    </div>
  );
}