import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CATALOGS, ACCESSORIES, type CosmeticCategory, type CosmeticItem } from "@/lib/game/cosmetics";
import { addPassXp, loadProgress, saveProgress, type Progress } from "@/lib/game/progress";
import { ArrowLeft, Check, Gift, Tag, Ticket } from "lucide-react";
import {
  pickDailyReward, todayUtc, msUntilUtcMidnight, formatCountdown, labelReward,
  msUntilSeasonEnd, formatDaysCountdown,
} from "@/lib/game/dailyReward";

export const Route = createFileRoute("/shop")({
  head: () => ({ meta: [{ title: "Kauppa · Tile Rush" }] }),
  component: ShopPage,
});

// Lisätty Emojit kuudenneksi kategoriaksi – as-muunnos varmistaa tyyppien toimivuuden
const CATS: { key: CosmeticCategory; label: string; emoji: string }[] = [
  { key: "colors", label: "Värit", emoji: "🎨" },
  { key: "shapes", label: "Muodot", emoji: "🔷" },
  { key: "patterns", label: "Kuviot", emoji: "▦" },
  { key: "accessories", label: "Asusteet", emoji: "👑" },
  { key: "themes", label: "Taustat", emoji: "🖼️" },
  { key: "emojis" as CosmeticCategory, label: "Emojit", emoji: "😎" }, 
];

const TEAM_OFFER_IDS = [
  "team-fr", "team-ma", "team-en", "team-no",
  "team-es", "team-be", "team-ar", "team-ch",
];

const TEAM_EMOJI: Record<string, string> = {
  "team-fr": "🇫🇷", "team-ma": "🇲🇦", "team-en": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "team-no": "🇳🇴",
  "team-es": "🇪🇸", "team-be": "🇧🇪", "team-ar": "🇦🇷", "team-ch": "🇨🇭",
};

/** Promo codes → grant callback. */
const PROMO_CODES: Record<string, { desc: string; apply: (p: Progress) => void }> = {
  fifa26: {
    desc: "🪙 500 kolikkoa + FIFA-pallo -kuvio",
    apply: (p) => {
      p.coins += 500;
      if (!p.owned.patterns.includes("fifa")) p.owned.patterns.push("fifa");
    },
  },
  // UUSI: Beta testing -koodi testausta varten
  betatest: {
    desc: "🎁 Beta testing: 10 yleistä laatikkoa & 10 yleistä loot-sydäntä!",
    apply: (p) => {
      if (!p.inventory.boxes) p.inventory.boxes = [];
      if (!p.inventory.hearts) p.inventory.hearts = [];

      // Lisätään 10 yleistä (common) laatikkoa
      for (let i = 0; i < 10; i++) {
        p.inventory.boxes.push({
          id: `box-beta-${Date.now()}-${i}`,
          rarity: "common"
        });
      }

      // Lisätään 10 yleistä (common) loot-sydäntä
      for (let i = 0; i < 10; i++) {
        p.inventory.hearts.push({
          id: `heart-beta-${Date.now()}-${i}`,
          rarity: "common"
        });
      }
    },
  },
};

// Apufunktio tuomaan taustavärit ja reunat eri rarityille kauppaan
const getRarityClass = (rarity: string) => {
  switch (rarity) {
    case "common": return "border-green-500/30 bg-green-950/20";
    case "rare": return "border-blue-500/30 bg-blue-950/20";
    case "epic": return "border-purple-500/30 bg-purple-950/20";
    case "legendary": return "border-yellow-500/30 bg-yellow-950/20";
    case "mythic": return "border-red-500/30 bg-red-950/20";
    case "ultra": return "border-pink-500 bg-gradient-to-br from-pink-950/40 via-purple-950/40 to-indigo-950/40 animate-pulse";
    default: return "border-border/60 bg-background/40";
  }
};

function ShopPage() {
  const [p, setP] = useState<Progress | null>(null);
  const
    
