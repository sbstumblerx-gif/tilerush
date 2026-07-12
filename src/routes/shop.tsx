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

// Laajennetaan tyyppiä kaupan sisäisesti tukemaan avatareja
type ShopCategory = CosmeticCategory | "avatars";

const CATS: { key: ShopCategory; label: string; emoji: string }[] = [
  { key: "colors", label: "Värit", emoji: "🎨" },
  { key: "shapes", label: "Muodot", emoji: "🔷" },
  { key: "patterns", label: "Kuviot", emoji: "▦" },
  { key: "accessories", label: "Asusteet", emoji: "👑" },
  { key: "themes", label: "Taustat", emoji: "🖼️" },
  { key: "emojis" as CosmeticCategory, label: "Emojit", emoji: "😎" }, 
  { key: "avatars", label: "Profiilikuvat", emoji: "👤" }, // Uusi hylly kauppaan!
];

// Kiinteillä hinnoilla varustettu avatar-katalogi kaupalle
const AVATAR_ITEMS: CosmeticItem[] = [
  // Yleiset (Common) - 300 kolikkoa
  { id: "av-banana", label: "Banaani", rarity: "common", preview: "🍌", price: 300 },
  { id: "av-pizza", label: "Pizza", rarity: "common", preview: "🍕", price: 300 },
  { id: "av-car", label: "Auto", rarity: "common", preview: "🚙", price: 300 },
  
  // Harvinaiset (Rare) - 400 kolikkoa
  { id: "av-dizzy", label: "Pyörryksissä", rarity: "rare", preview: "😵‍💫", price: 400 },
  { id: "av-popcorn", label: "Popkorni", rarity: "rare", preview: "🍿", price: 400 },
  { id: "av-headphones", label: "Kuulokkeet", rarity: "rare", preview: "🎧", price: 400 },
  
  // Eeppiset (Epic) - 500 kolikkoa
  { id: "av-alien", label: "Avaruusolio", rarity: "epic", preview: "👾", price: 500 },
  { id: "av-oni", label: "Oni-maski", rarity: "epic", preview: "👹", price: 500 },
  { id: "av-robot", label: "Robotti", rarity: "epic", preview: "🤖", price: 500 },
  { id: "av-skull", label: "Pääkallo", rarity: "epic", preview: "💀", price: 500 },
  
  // Legendaariset (Legendary) - 750 kolikkoa
  { id: "av-nerd", label: "Nörtti", rarity: "legendary", preview: "🤓", price: 750 },
  { id: "av-goat", label: "GOAT", rarity: "legendary", preview: "🐐", price: 750 },
  { id: "av-clown", label: "Pelle", rarity: "legendary", preview: "🤡", price: 750 },

  // Myyttiset Limited Time QF-liput (Ei suoraan ostettavissa tästä hyllystä)
  { id: "qf-finla", label: "QF - Suomi", rarity: "mythic", preview: "🇫🇮", price: 999, exclusive: true },
  { id: "qf-swede", label: "QF - Ruotsi", rarity: "mythic", preview: "🇸🇪", price: 999, exclusive: true },
  { id: "qf-canad", label: "QF - Kanada", rarity: "mythic", preview: "🇨🇦", price: 999, exclusive: true },
  { id: "qf-usa", label: "QF - USA", rarity: "mythic", preview: "🇺🇸", price: 999, exclusive: true },
];

const TEAM_OFFER_IDS = [
  "team-fr", "team-ma", "team-en", "team-no",
  "team-es", "team-be", "team-ar", "team-ch",
];

const TEAM_EMOJI: Record<string, string> = {
  "team-fr": "🇫🇷", "team-ma": "🇲🇦", "team-en": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "team-no": "🇳🇴",
  "team-es": "🇪🇸", "team-be": "🇧🇪", "team-ar": "🇦🇷", "team-ch": "🇨🇭",
};

const PROMO_CODES: Record<string, { desc: string; apply: (p: Progress) => void }> = {
  fifa26: {
    desc: "🪙 500 kolikkoa + FIFA-pallo -kuvio",
    apply: (p) => {
      p.coins += 500;
      if (!p.owned.patterns.includes("fifa")) p.owned.patterns.push("fifa");
    },
  },
  betatest: {
    desc: "🎁 Beta testing: 10 yleistä laatikkoa & 10 yleistä loot-sydäntä!",
    apply: (p) => {
      if (!p.inventory.boxes) p.inventory.boxes = [];
      if (!p.inventory.hearts) p.inventory.hearts = [];
      for (let i = 0; i < 10; i++) {
        p.inventory.boxes.push({ id: `box-beta-${Date.now()}-${i}`, rarity: "common" });
      }
      for (let i = 0; i < 10; i++) {
        p.inventory.hearts.push({ id: `heart-beta-${Date.now()}-${i}`, rarity: "common" });
      }
    },
  },
};

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
  const [open, setOpen] = useState<ShopCategory | null>(null);
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

  const buy = (cat: ShopCategory, item: CosmeticItem) => {
    const cur = loadProgress();
    
    // Suojataan taulukon alustus jos cat on "avatars"
    if (cat === "avatars" && !cur.owned.avatars) cur.owned.avatars = ["default"];
    
    const ownedItems = cat === "avatars" ? cur.owned.avatars : (cur.owned[cat] ?? []);
    if (ownedItems.includes(item.id)) return;
    if (item.exclusive) return;
    if (cur.coins < item.price) return;
    
    cur.coins -= item.price;
    if (cat === "avatars") {
      cur.owned.avatars = [...ownedItems, item.id];
    } else {
      cur.owned[cat] = [...ownedItems, item.id];
    }
    
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

  // Lasketaan tuotemäärät oikein esille
  const getItemCount = (key: ShopCategory) => {
    if (key === "avatars") return AVATAR_ITEMS.length;
    return CATALOGS[key]?.length ?? 0;
  };

  return (
    <div className="min-h-
      
