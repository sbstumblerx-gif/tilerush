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

// Lisätty avatar mukaan kategorioihin
const CATS: { key: CosmeticCategory | "avatars"; label: string; equipKey: keyof Equipped | null }[] = [
  { key: "colors", label: "Väri", equipKey: "color" },
  { key: "shapes", label: "Muoto", equipKey: "shape" },
  { key: "patterns", label: "Kuvio", equipKey: "pattern" },
  { key: "accessories", label: "Asuste", equipKey: "accessory" },
  { key: "themes", label: "Sovellusteema", equipKey: "theme" },
  { key: "emojis", label: "Emojit", equipKey: null },
  { key: "avatars", label: "Profiilikuva", equipKey: "avatar" }, // ← UUSI KATEGORIA
];

const DEFAULT_EMOJIS = ["😭", "😃", "😅", "👍"];

// Puolivälierien ja muiden profiilikuvien määrittelyt
const AVATAR_ITEMS: CosmeticItem[] = [
  { id: "default", label: "Oletus Token", rarity: "common", preview: "👤" },
  { id: "qf-finla", label: "QF - Suomi", rarity: "epic", preview: "/assets/avatars/qf_finland.png" },
  { id: "qf-swede", label: "QF - Ruotsi", rarity: "epic", preview: "/assets/avatars/qf_sweden.png" },
  { id: "qf-canad", label: "QF - Kanada", rarity: "epic", preview: "/assets/avatars/qf_canada.png" },
  { id: "qf-usa", label: "QF - USA", rarity: "epic", preview: "/assets/avatars/qf_usa.png" },
];

function CustomizePage() {
  const [p, setP] = useState<Progress | null>(null);
  const [cat, setCat] = useState<CosmeticCategory | "avatars">("colors");
  const [selected, setSelected] = useState<string | null>(null);
  const [emojiSlot, setEmojiSlot] = useState<number>(0);
  
  useEffect(() => {
    const loaded = loadProgress();
    
    if (!loaded.equipped.emojis || loaded.equipped.emojis.includes("🎮") || loaded.equipped.emojis.includes("🏆")) {
      loaded.equipped.emojis = [...DEFAULT_EMOJIS];
      saveProgress(loaded);
    }
    
    setP(loaded);
  }, []);

  // Haetaan oikea katalogi ja käsitellään uusi avatar-tyyppi
  const activeCatalog = useMemo(() => {
    if (cat === "avatars") return AVATAR_ITEMS;
    return CATALOGS[cat] || [];
  }, [cat]);

  const sorted = useMemo(() => {
    if (!p) return [];
    return [...activeCatalog].sort(
      (a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity),
    );
  }, [activeCatalog, p]);

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
    selected ? activeCatalog.find((i) => i.id === selected) ?? null : null;

  const currentEmojis = eq.emojis ?? DEFAULT_EMOJIS;
  const activeSlotEmoji = currentEmojis[emojiSlot];

  // Tarkistetaan onko käytössä oleva avatar jokin puolivälieräkuva (alkaa / tai sisältää polun)
  const activeAvatarItem = AVATAR_ITEMS.find((a) => a.id === eq.avatar);
  const hasImageAvatar = activeAvatarItem && activeAvatarItem.preview.startsWith("/");

  return (
    <div className="min-h-screen px-4 py-8 max-w-[720px] mx-
      
