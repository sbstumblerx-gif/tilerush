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

// Lisätty Emojit kuudenneksi kategoriaksi
const CATS: { key: CosmeticCategory; label: string; emoji: string }[] = [
  { key: "colors", label: "Värit", emoji: "🎨" },
  { key: "shapes", label: "Muodot", emoji: "🔷" },
  { key: "patterns", label: "Kuviot", emoji: "▦" },
  { key: "accessories", label: "Asusteet", emoji: "👑" },
  { key: "themes", label: "Taustat", emoji: "🖼️" },
  { key: "emojis", label: "Emojit", emoji: "😎" }, 
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
  const [open, setOpen] = useState<CosmeticCategory | null>(null);
  const [tick, setTick] = useState(0);
  const [showOffers, setShowOffers] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [promo, setPromo] = useState("");
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  useEffect(() => setP(loadProgress()), []);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  if (!p) return null;

  const today = todayUtc();
  const dailyAvailable = p.lastDailyClaim !== today;
  const reward = pickDailyReward(`${p.profile.friendCode}:${today}`);

  const claimDaily = () => {
    const cur = loadProgress();
    if (cur.lastDailyClaim === today) return;
    if (reward.type === "coins") cur.coins += reward.amount;
    else if (reward.type === "xp") addPassXp(cur, reward.amount);
    else if (reward.type === "heart") cur.inventory.hearts.push({ id: `heart-${Date.now()}`, rarity: reward.rarity });
    else if (reward.type === "box") cur.inventory.boxes.push({ id: `box-${Date.now()}`, rarity: reward.rarity });
    cur.lastDailyClaim = today;
    saveProgress(cur);
    setP(cur);
  };

  const buy = (cat: CosmeticCategory, item: CosmeticItem) => {
    const cur = loadProgress();
    
    // Suojataan owned-tarkistus kaatumiselta jos kategoria puuttuu tallennuksesta
    const ownedItems = cur.owned[cat] ?? [];
    if (ownedItems.includes(item.id)) return;
    if (item.exclusive) return;
    if (cur.coins < item.price) return;
    
    cur.coins -= item.price;
    cur.owned[cat] = [...ownedItems, item.id];
    saveProgress(cur);
    setP(cur);
  };

  const buyTeam = (id: string) => {
    const item = ACCESSORIES.find((a) => a.id === id);
    if (!item) return;
    const cur = loadProgress();
    if (cur.teamOffersPurchased.includes(id)) return;
    if (cur.coins < item.price) return;
    cur.coins -= item.price;
    cur.teamOffersPurchased.push(id);
    if (!cur.owned.accessories.includes(id)) cur.owned.accessories.push(id);
    if (!cur.owned.themes.includes(id)) cur.owned.themes.push(id);
    const emoji = TEAM_EMOJI[id];
    if (emoji) {
      cur.profile.profilePic = emoji;
      const slots = cur.equipped.emojis ? [...cur.equipped.emojis] : ["🎮", "⚡", "🌟", "🏆"];
      if (!slots.includes(emoji)) {
        slots[3] = emoji;
      }
      cur.equipped.emojis = slots;
    }
    saveProgress(cur);
    setP(cur);
  };

  const redeemPromo = () => {
    const key = promo.trim().toLowerCase();
    if (!key) return;
    const entry = PROMO_CODES[key];
    if (!entry) { setPromoMsg("❌ Tuntematon koodi."); return; }
    const cur = loadProgress();
    if (cur.promoRedeemed.includes(key)) { setPromoMsg("Koodi on jo lunastettu."); return; }
    entry.apply(cur);
    cur.promoRedeemed.push(key);
    saveProgress(cur);
    setP(cur);
    setPromo("");
    setPromoMsg(`✅ Lunastettu: ${entry.desc}`);
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
          <div className="mt-1 text-xs text-muted-foreground">
            Kausi päättyy 30.7.2026 · {formatDaysCountdown(msUntilSeasonEnd())}
          </div>

          <div className="mt-4 neon-panel p-4 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Päivän palkkio</div>
              <div className="font-bold">{labelReward(reward)}</div>
              {!dailyAvailable && (
                <div className="text-xs text-muted-foreground mt-1">Seuraava: {formatCountdown(msUntilUtcMidnight())}</div>
              )}
            </div>
            <button
              onClick={claimDaily}
              disabled={!dailyAvailable}
              className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 disabled:opacity-40"
            >
              <Gift className="h-4 w-4" /> {dailyAvailable ? "Lunasta" : "Lunastettu"}
            </button>
          </div>

          {/* Tarjoukset */}
          <div className="mt-4 neon-panel p-4">
            <button onClick={() => setShowOffers((v) => !v)} className
              
