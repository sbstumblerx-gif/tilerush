import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CATALOGS, COLORS, PATTERNS, SHAPES, type CosmeticCategory } from "@/lib/game/cosmetics";
import { loadProgress, saveProgress, type Equipped, type Progress } from "@/lib/game/progress";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/customize")({
  head: () => ({ meta: [{ title: "Mukauta · Tile Rush" }] }),
  component: CustomizePage,
});

const CATS: { key: CosmeticCategory; label: string; equipKey: keyof Equipped }[] = [
  { key: "colors", label: "Väri", equipKey: "color" },
  { key: "shapes", label: "Muoto", equipKey: "shape" },
  { key: "patterns", label: "Kuvio", equipKey: "pattern" },
  { key: "accessories", label: "Asuste", equipKey: "accessory" },
  { key: "themes", label: "Sovellusteema", equipKey: "theme" },
];

function CustomizePage() {
  const [p, setP] = useState<Progress | null>(null);
  const [cat, setCat] = useState<CosmeticCategory>("colors");
  useEffect(() => setP(loadProgress()), []);
  if (!p) return null;

  const equip = (key: keyof Equipped, id: string) => {
    const cur = loadProgress();
    cur.equipped[key] = id;
    saveProgress(cur);
    setP(cur);
  };

  const eq = p.equipped;
  const colorHex = COLORS.find((c) => c.id === eq.color)?.preview ?? "#22d3ee";
  const shape = SHAPES.find((s) => s.id === eq.shape)?.preview ?? "●";
  const pattern = PATTERNS.find((s) => s.id === eq.pattern)?.preview;

  return (
    <div className="min-h-screen px-4 py-8 max-w-[720px] mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Lobby
      </Link>
      <h1 className="mt-4 text-3xl font-black">Mukauta</h1>

      <div className="mt-6 grid grid-cols-[110px_1fr_1fr] gap-3">
        {/* Left menu */}
        <div className="flex flex-col gap-2">
          {CATS.map((c) => (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={`neon-panel px-3 py-2 text-left text-sm ${cat === c.key ? "border-primary/70" : ""}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="neon-panel p-4 flex items-center justify-center">
          <div className="relative w-28 h-28 flex items-center justify-center" style={{ color: colorHex, fontSize: 96, lineHeight: 1 }}>
            <span>{shape}</span>
            {pattern && pattern !== "–" && (
              <span className="absolute inset-0 flex items-center justify-center text-3xl mix-blend-overlay text-white/70">
                {pattern}
              </span>
            )}
            {eq.accessory !== "none" && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-3xl">
                {CATALOGS.accessories.find((a) => a.id === eq.accessory)?.preview}
              </span>
            )}
          </div>
        </div>

        {/* Owned list */}
        <div className="neon-panel p-3 max-h-[360px] overflow-auto space-y-2">
          {CATALOGS[cat].map((item) => {
            const owned = p.owned[cat].includes(item.id);
            const equipKey = CATS.find((c) => c.key === cat)!.equipKey;
            const active = eq[equipKey] === item.id;
            return (
              <button
                key={item.id}
                disabled={!owned}
                onClick={() => equip(equipKey, item.id)}
                className={`w-full flex items-center justify-between rounded px-3 py-2 text-sm ${
                  active ? "bg-primary/30 border border-primary" : "bg-background/40 border border-border/50"
                } ${!owned && "opacity-40 cursor-not-allowed"}`}
              >
                <span className="flex items-center gap-2">
                  {cat === "colors" ? (
                    <span className="h-4 w-4 rounded" style={{ background: item.preview }} />
                  ) : (
                    <span>{item.preview}</span>
                  )}
                  {item.label}
                </span>
                {active && <span className="text-xs">✓ käytössä</span>}
                {!owned && <span className="text-xs">🔒</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}