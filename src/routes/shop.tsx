import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CATALOGS, type CosmeticCategory, type CosmeticItem } from "@/lib/game/cosmetics";
import { loadProgress, saveProgress, type Progress } from "@/lib/game/progress";
import { ArrowLeft, Check } from "lucide-react";

export const Route = createFileRoute("/shop")({
  head: () => ({ meta: [{ title: "Kauppa · Tile Rush" }] }),
  component: ShopPage,
});

const CATS: { key: CosmeticCategory; label: string; emoji: string }[] = [
  { key: "colors", label: "Värit", emoji: "🎨" },
  { key: "shapes", label: "Muodot", emoji: "🔷" },
  { key: "patterns", label: "Kuviot", emoji: "▦" },
  { key: "accessories", label: "Asusteet", emoji: "👑" },
  { key: "themes", label: "Taustat", emoji: "🖼️" },
];

function ShopPage() {
  const [p, setP] = useState<Progress | null>(null);
  const [open, setOpen] = useState<CosmeticCategory | null>(null);
  useEffect(() => setP(loadProgress()), []);
  if (!p) return null;

  const buy = (cat: CosmeticCategory, item: CosmeticItem) => {
    const cur = loadProgress();
    if (cur.owned[cat].includes(item.id)) return;
    if (cur.coins < item.price) return;
    cur.coins -= item.price;
    cur.owned[cat] = [...cur.owned[cat], item.id];
    saveProgress(cur);
    setP(cur);
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-[560px] mx-auto">
      <div className="flex items-center justify-between">
        <button
          onClick={() => (open ? setOpen(null) : history.back())}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {open ? "Katalogit" : "Takaisin"}
        </button>
        <span className="neon-panel px-3 py-1 text-sm font-bold">🪙 {p.coins}</span>
      </div>

      {!open && (
        <>
          <h1 className="mt-4 text-3xl font-black">Kauppa</h1>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {CATS.map((c) => (
              <button key={c.key} onClick={() => setOpen(c.key)} className="neon-panel p-5 text-left hover:border-primary/70">
                <div className="text-3xl">{c.emoji}</div>
                <div className="mt-2 font-bold">{c.label}</div>
                <div className="text-xs text-muted-foreground">{CATALOGS[c.key].length} tuotetta</div>
              </button>
            ))}
          </div>
          <div className="mt-6">
            <Link to="/" className="text-sm text-muted-foreground">← Lobby</Link>
          </div>
        </>
      )}

      {open && (
        <>
          <h1 className="mt-4 text-2xl font-black">{CATS.find((c) => c.key === open)?.label}</h1>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {CATALOGS[open].filter((i) => !i.exclusive).map((item) => {
              const owned = p.owned[open].includes(item.id);
              const canBuy = !owned && p.coins >= item.price;
              return (
                <div key={item.id} className="neon-panel p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{item.label}</span>
                    {owned && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <div
                    className="h-14 rounded flex items-center justify-center text-2xl"
                    style={
                      open === "colors" && item.preview
                        ? { background: item.preview }
                        : { background: "oklch(0.24 0.04 265)" }
                    }
                  >
                    {open !== "colors" && (item.preview ?? "")}
                  </div>
                  <button
                    disabled={owned || !canBuy}
                    onClick={() => buy(open, item)}
                    className="rounded bg-primary text-primary-foreground text-sm font-bold py-1.5 disabled:opacity-50"
                  >
                    {owned ? "Omistettu" : `🪙 ${item.price}`}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}