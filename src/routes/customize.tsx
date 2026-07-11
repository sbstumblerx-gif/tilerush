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

const CATS: { key: CosmeticCategory; label: string; equipKey: keyof Equipped | null }[] = [
  { key: "colors", label: "Väri", equipKey: "color" },
  { key: "shapes", label: "Muoto", equipKey: "shape" },
  { key: "patterns", label: "Kuvio", equipKey: "pattern" },
  { key: "accessories", label: "Asuste", equipKey: "accessory" },
  { key: "themes", label: "Sovellusteema", equipKey: "theme" },
  { key: "emojis", label: "Emojit", equipKey: null },
];

const DEFAULT_EMOJIS = ["😭", "😃", "😅", "👍"];

function CustomizePage() {
  const [p, setP] = useState<Progress | null>(null);
  const [cat, setCat] = useState<CosmeticCategory>("colors");
  const [selected, setSelected] = useState<string | null>(null);
  const [emojiSlot, setEmojiSlot] = useState<number>(0);
  
  useEffect(() => {
    const loaded = loadProgress();
    
    // Puhdistetaan vanhat oletusemojit tallennuksesta, jos siellä kummittelee peliohjain tai salama
    if (!loaded.equipped.emojis || loaded.equipped.emojis.includes("🎮") || loaded.equipped.emojis.includes("🏆")) {
      loaded.equipped.emojis = [...DEFAULT_EMOJIS];
      saveProgress(loaded);
    }
    
    setP(loaded);
  }, []);

  const sorted = useMemo(() => {
    if (!p) return [];
    return [...CATALOGS[cat]].sort(
      (a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity),
    );
  }, [cat, p]);

  if (!p) return null;

  const currentCatConfig = CATS.find((c) => c.key === cat)!;
  const equipKey = currentCatConfig.equipKey;

  const equip = (id: string) => {
    if (!equipKey) return;
    const cur = loadProgress();
    (cur.equipped as unknown as Record<string, string>)[equipKey] = id;
    saveProgress(cur);
    setP(cur);
  };

  const setEmojiForActiveSlot = (emojiPreview: string) => {
    const cur = loadProgress();
    const arr = (cur.equipped.emojis ?? [...DEFAULT_EMOJIS]).slice();
    arr[emojiSlot] = emojiPreview;
    cur.equipped.emojis = arr;
    saveProgress(cur);
    setP(cur);
  };

  const eq = p.equipped;
  const colorHex = COLORS.find((c) => c.id === eq.color)?.preview ?? "#22d3ee";
  const shape = SHAPES.find((s) => s.id === eq.shape)?.preview ?? "●";
  const pattern = PATTERNS.find((s) => s.id === eq.pattern)?.preview;

  const selItem: CosmeticItem | null =
    selected ? CATALOGS[cat].find((i) => i.id === selected) ?? null : null;

  const currentEmojis = eq.emojis ?? DEFAULT_EMOJIS;
  const activeSlotEmoji = currentEmojis[emojiSlot];

  return (
    <div className="min-h-screen px-4 py-8 max-w-[720px] mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Lobby
      </Link>
      <h1 className="mt-4 text-3xl font-black">Mukauta</h1>

      <div className="mt-6 grid grid-cols-[110px_1fr_1fr] gap-3">
        {/* Kategoriapainikkeet */}
        <div className="flex flex-col gap-2">
          {CATS.map((c) => (
            <button
              key={c.key}
              onClick={() => { setCat(c.key); setSelected(null); }}
              className={`neon-panel px-3 py-2 text-left text-sm transition-colors ${cat === c.key ? "border-primary/70 bg-primary/5 font-bold" : ""}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Keskimmäinen esikatselulaatikko */}
        <div className="neon-panel p-4 flex flex-col items-center justify-center gap-3 bg-background/20">
          {cat === "emojis" ? (
            <div className="flex flex-col items-center gap-2 w-full">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Muokattava paikka</span>
              <div className="text-5xl h-20 w-20 flex items-center justify-center bg-primary/10 rounded-xl border border-primary/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                {activeSlotEmoji}
              </div>
              <span className="text-xs font-semibold text-primary/80">Paikka {emojiSlot + 1}</span>
            </div>
          ) : (
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
          )}
        </div>

        {/* Oikeanpuoleinen valintalista */}
        <div className="neon-panel p-3 max-h-[360px] overflow-auto space-y-2">
          {cat === "emojis" && (
            <div className="mb-4 space-y-2 bg-background/40 p-2 rounded border border-border/40">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Valitse täytettävä paikka:</div>
              <div className="grid grid-cols-4 gap-1.5">
                {currentEmojis.map((e, i) => (
                  <button
                    key={i}
                    onClick={() => { setEmojiSlot(i); setSelected(null); }}
                    className={`h-10 rounded text-xl flex items-center justify-center transition-all ${
                      emojiSlot === i ? "border-2 border-primary bg-primary/20 scale-105 font-bold" : "border border-border/40 bg-background/60"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Listataan valitun kategorian esineet */}
          {sorted.map((item) => {
            const owned = p.owned[cat]?.includes(item.id);
            
            let isCurrentEquipped = false;
            if (cat === "emojis") {
              isCurrentEquipped = currentEmojis[emojiSlot] === item.preview;
            } else if (equipKey) {
              isCurrentEquipped = (eq as unknown as Record<string, string>)[equipKey] === item.id;
            }

            return (
              <button
                key={item.id}
                disabled={!owned}
                onClick={() => setSelected(item.id)}
                className={`w-full flex items-center justify-between rounded px-3 py-2 text-sm transition-all ${
                  selected === item.id ? "bg-primary/25 border border-primary animate-pulse" :
                  isCurrentEquipped ? "bg-primary/15 border border-primary/60" : "bg-background/40 border border-border/50"
                } ${!owned ? "opacity-30 cursor-not-allowed" : "hover:border-primary/40"}`}
              >
                <span className="flex items-center gap-2">
                  {cat === "colors" ? (
                    <span className="h-4 w-4 rounded" style={{ background: item.preview }} />
                  ) : (
                    <span className="text-lg leading-none">{item.preview}</span>
                  )}
                  {item.label}
                </span>
                <span className="text-xs" title={RARITY_LABEL[item.rarity]}>{RARITY_EMOJI[item.rarity]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Alapaneeli varustamista varten */}
      {selItem && (
        <div className="mt-4 neon-panel p-4 flex items-center justify-between border-primary/40 bg-primary/5">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Valittu kosmetiikka</div>
            <div className="text-xl font-black flex items-center gap-2 mt-0.5">
              {cat === "emojis" && <span className="text-2xl leading-none">{selItem.preview}</span>}
              {selItem.label}
            </div>
            <div className="mt-1 text-xs font-bold" style={{ color: typeof RARITY_COLOR[selItem.rarity] === "string" && RARITY_COLOR[selItem.rarity].startsWith("#") ? RARITY_COLOR[selItem.rarity] : undefined }}>
              {RARITY_EMOJI[selItem.rarity]} {RARITY_LABEL[selItem.rarity].toUpperCase()}
            </div>
          </div>
          
          <div>
            {cat === "emojis" ? (
              currentEmojis[emojiSlot] === selItem.preview ? (
                <button disabled className="px-4 py-2 rounded bg-muted text-muted-foreground text-xs font-bold cursor-not-allowed">
                  Jo paikassa {emojiSlot + 1}
                </button>
              ) : (
                <button 
                  onClick={() => setEmojiForActiveSlot(selItem.preview!)} 
                  className="px-5 py-2 rounded bg-primary text-primary-foreground text-sm font-bold hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all"
                >
                  Aseta paikkaan {emojiSlot + 1}
                </button>
              )
            ) : equipKey && (eq as unknown as Record<string, string>)[equipKey] === selItem.id ? (
              <button disabled className="px-4 py-2 rounded bg-muted text-muted-foreground text-xs font-bold cursor-not-allowed">
                Käytössä
              </button>
            ) : (
              <button 
                onClick={() => equip(selItem.id)} 
                className="px-5 py-2 rounded bg-primary text-primary-foreground text-sm font-bold hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all"
              >
                Ota käyttöön
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


              
