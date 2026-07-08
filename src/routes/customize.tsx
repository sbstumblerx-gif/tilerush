import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CATALOGS, COLORS, PATTERNS, SHAPES, type CosmeticCategory, type CosmeticItem } from "@/lib/game/cosmetics";
import { loadProgress, saveProgress, type Equipped, type Progress } from "@/lib/game/progress";
import { RARITY_EMOJI, RARITY_LABEL, RARITY_ORDER, RARITY_COLOR } from "@/lib/game/rarity";
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
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => setP(loadProgress()), []);

  const sorted = useMemo(() => {
    if (!p) return [];
    return [...CATALOGS[cat]].sort(
      (a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity),
    );
  }, [cat, p]);

  if (!p) return null;

  const equipKey = CATS.find((c) => c.key === cat)!.equipKey;
  const equip = (id: string) => {
    const cur = loadProgress();
    cur.equipped[equipKey] = id;
    saveProgress(cur);
    setP(cur);
  };

  const eq = p.equipped;
  const colorHex = COLORS.find((c) => c.id === eq.color)?.preview ?? "#22d3ee";
  const shape = SHAPES.find((s) => s.id === eq.shape)?.preview ?? "●";
  const pattern = PATTERNS.find((s) => s.id === eq.pattern)?.preview;

  const selItem: CosmeticItem | null = selected ? CATALOGS[cat].find((i) => i.id === selected) ?? null : null;

  return (
    <div className="min-h-screen px-4 py-8 max-w-[720px] mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Lobby
      </Link>
      <h1 className="mt-4 text-3xl font-black">Mukauta</h1>

      <div className="mt-6 grid grid-cols-[110px_1fr_1fr] gap-3">
        <div className="flex flex-col gap-2">
          {CATS.map((c) => (
            <button
              key={c.key}
              onClick={() => { setCat(c.key); setSelected(null); }}
              className={`neon-panel px-3 py-2 text-left text-sm ${cat === c.key ? "border-primary/70" : ""}`}
            >
              {c.label}
            </button>
          ))}
        </div>

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

        <div className="neon-panel p-3 max-h-[360px] overflow-auto space-y-2">
          {sorted.map((item) => {
            const owned = p.owned[cat].includes(item.id);
            const active = eq[equipKey] === item.id;
            return (
              <button
                key={item.id}
                disabled={!owned}
                onClick={() => setSelected(item.id)}
                className={`w-full flex items-center justify-between rounded px-3 py-2 text-sm ${
                  selected === item.id ? "bg-primary/25 border border-primary" :
                  active ? "bg-primary/15 border border-primary/60" : "bg-background/40 border border-border/50"
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
                <span className="text-xs" title={RARITY_LABEL[item.rarity]}>{RARITY_EMOJI[item.rarity]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selItem && (
        <div className="mt-4 neon-panel p-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Valittu esine</div>
            <div className="text-xl font-black">{selItem.label}</div>
            <div className="mt-1 text-sm" style={{ color: typeof RARITY_COLOR[selItem.rarity] === "string" && RARITY_COLOR[selItem.rarity].startsWith("#") ? RARITY_COLOR[selItem.rarity] : undefined }}>
              {RARITY_EMOJI[selItem.rarity]} {RARITY_LABEL[selItem.rarity]}
            </div>
          </div>
          {p.owned[cat].includes(selItem.id) ? (
            eq[equipKey] === selItem.id ? (
              <button disabled className="px-4 py-2 rounded bg-primary/60 text-primary-foreground text-sm font-bold">Valittu</button>
            ) : (
              <button onClick={() => equip(selItem.id)} className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-bold">
                Valitse
              </button>
            )
          ) : (
            <span className="text-xs text-muted-foreground">🔒 Ei omistettu</span>
          )}
        </div>
      )}
    </div>
  );
}