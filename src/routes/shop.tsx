import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CATALOGS, ACCESSORIES, type CosmeticCategory, type CosmeticItem } from "@/lib/game/cosmetics";
import { addPassXp, loadProgress, saveProgress, type Progress } from "@/lib/game/progress";
import { ArrowLeft, Check, Gift, Tag, Ticket } from "lucide-react";
import {
  pickDailyReward, todayUtc, msUntilUtcMidnight, formatCountdown, labelReward,
  msUntilSeasonEnd, formatDaysCountdown,
} from "@/lib/game/dailyReward";

// @ts-expect-error - Ohitetaan mahdollinen reittipuun puuttuminen kääntäjässä
export const Route = createFileRoute("/shop" as any)({
  head: () => ({ meta: [{ title: "Kauppa · Tile Rush" }] }),
  component: ShopPage,
});

type ShopCategory = CosmeticCategory | "avatars";

const CATS: { key: ShopCategory; label: string; emoji: string }[] = [
  { key: "colors", label: "Varit", emoji: "🎨" },
  { key: "shapes", label: "Muodot", emoji: "🔷" },
  { key: "patterns", label: "Kuviot", emoji: "▦" },
  { key: "accessories", label: "Asusteet", emoji: "👑" },
  { key: "themes", label: "Taustat", emoji: "🖼️" },
  { key: "emojis" as CosmeticCategory, label: "Emojit", emoji: "😎" }, 
  { key: "avatars", label: "Profiilikuvat", emoji: "👤" },
];

const AVATAR_ITEMS: CosmeticItem[] = [
  { id: "av-banana", label: "Banaani", rarity: "common", preview: "🍌", price: 300 },
  { id: "av-pizza", label: "Pizza", rarity: "common", preview: "🍕", price: 300 },
  { id: "av-car", label: "Auto", rarity: "common", preview: "🚙", price: 300 },
  
  { id: "av-dizzy", label: "Pyorryksissa", rarity: "rare", preview: "💫", price: 400 },
  { id: "av-popcorn", label: "Popkorni", rarity: "rare", preview: "🍿", price: 400 },
  { id: "av-headphones", label: "Kuulokkeet", rarity: "rare", preview: "🎧", price: 400 },
  
  { id: "av-alien", label: "Avaruusolio", rarity: "epic", preview: "👾", price: 500 },
  { id: "av-oni", label: "Oni-maski", rarity: "epic", preview: "👹", price: 500 },
  { id: "av-robot", label: "Robotti", rarity: "epic", preview: "🤖", price: 500 },
  { id: "av-skull", label: "Paakallo", rarity: "epic", preview: "💀", price: 500 },
  
  { id: "av-nerd", label: "Nortti", rarity: "legendary", preview: "🤓", price: 750 },
  { id: "av-goat", label: "GOAT", rarity: "legendary", preview: "🐐", price: 750 },
  { id: "av-clown", label: "Pelle", rarity: "legendary", preview: "🤡", price: 750 },

  { id: "qf-finla", label: "QF - Suomi", rarity: "mythic", preview: "FI", price: 999, exclusive: true },
  { id: "qf-swede", label: "QF - Ruotsi", rarity: "mythic", preview: "SE", price: 999, exclusive: true },
  { id: "qf-canad", label: "QF - Kanada", rarity: "mythic", preview: "CA", price: 999, exclusive: true },
  { id: "qf-usa", label: "QF - USA", rarity: "mythic", preview: "US", price: 999, exclusive: true },
];

const TEAM_OFFER_IDS = [
  "team-fr", "team-ma", "team-en", "team-no",
  "team-es", "team-be", "team-ar", "team-ch",
];

const TEAM_EMOJI: Record<string, string> = {
  "team-fr": "FR", "team-ma": "MA", "team-en": "UK", "team-no": "NO",
  "team-es": "ES", "team-be": "BE", "team-ar": "AR", "team-ch": "CH",
};

const PROMO_CODES: Record<string, { desc: string; apply: (p: any) => void }> = {
  fifa26: {
    desc: "500 kolikkoa + FIFA-pallo",
    apply: (p) => {
      p.coins += 500;
      if (!p.owned?.patterns?.includes("fifa")) p.owned?.patterns?.push("fifa");
    },
  },
  betatest: {
    desc: "Beta: 10 laatikkoa ja sydanta",
    apply: (p) => {
      if (!p.inventory) p.inventory = { boxes: [], hearts: [] };
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

export function ShopPage() {
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
  const reward = pickDailyReward(`${p.profile?.friendCode ?? "000"}:${today}`);

  const claimDaily = () => {
    const cur = loadProgress() as any;
    if (cur.lastDailyClaim === today) return;
    if (reward.type === "coins") cur.coins += reward.amount;
    else if (reward.type === "xp") addPassXp(cur, reward.amount);
    else if (reward.type === "heart") {
      if (!cur.inventory) cur.inventory = { boxes: [], hearts: [] };
      if (!cur.inventory.hearts) cur.inventory.hearts = [];
      cur.inventory.hearts.push({ id: `heart-${Date.now()}`, rarity: reward.rarity });
    }
    else if (reward.type === "box") {
      if (!cur.inventory) cur.inventory = { boxes: [], hearts: [] };
      if (!cur.inventory.boxes) cur.inventory.boxes = [];
      cur.inventory.boxes.push({ id: `box-${Date.now()}`, rarity: reward.rarity });
    }
    cur.lastDailyClaim = today;
    saveProgress(cur);
    setP(cur);
  };

  const claimMaintenanceCompensation = () => {
    const cur = loadProgress() as any;
    if (cur.maintenanceClaimed) return;

    // Lisätään 500 kolikkoa
    cur.coins += 500;

    // Lisätään 5 sydäntä pelaajan inventaarioon
    if (!cur.inventory) cur.inventory = { boxes: [], hearts: [] };
    if (!cur.inventory.hearts) cur.inventory.hearts = [];
    
    for (let i = 0; i < 5; i++) {
      cur.inventory.hearts.push({
        id: `heart-maintenance-${Date.now()}-${i}`,
        rarity: "common"
      });
    }

    cur.maintenanceClaimed = true;
    saveProgress(cur);
    setP(cur);
  };

  const buy = (cat: ShopCategory, item: CosmeticItem) => {
    const cur = loadProgress() as any;
    
    if (cat === "avatars" && !cur.owned.avatars) cur.owned.avatars = ["default"];
    
    const ownedItems = cat === "avatars" ? (cur.owned.avatars ?? ["default"]) : (cur.owned[cat] ?? []);
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
    const cur = loadProgress() as any;
    if (!cur.teamOffersPurchased) cur.teamOffersPurchased = [];
    if (cur.teamOffersPurchased.includes(id)) return;
    if (cur.coins < item.price) return;
    cur.coins -= item.price;
    cur.teamOffersPurchased.push(id);
    if (!cur.owned.accessories.includes(id)) cur.owned.accessories.push(id);
    if (!cur.owned.themes.includes(id)) cur.owned.themes.push(id);
    const emoji = TEAM_EMOJI[id];
    if (emoji) {
      if (!cur.profile) cur.profile = { username: "Pelaaja", friendCode: "0000" };
      cur.profile.profilePic = emoji;
      const slots = cur.equipped?.emojis ? [...cur.equipped.emojis] : ["🎮", "⚡", "🌟", "🏆"];
      if (!slots.includes(emoji)) {
        slots[3] = emoji;
      }
      if (!cur.equipped) cur.equipped = {};
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
    const cur = loadProgress() as any;
    if (!cur.promoRedeemed) cur.promoRedeemed = [];
    if (cur.promoRedeemed.includes(key)) { setPromoMsg("Koodi on jo lunastettu."); return; }
    entry.apply(cur);
    cur.promoRedeemed.push(key);
    saveProgress(cur);
    setP(cur);
    setPromo("");
    setPromoMsg(`✅ Lunastettu: ${entry.desc}`);
  };

  const getItemCount = (key: ShopCategory) => {
    if (key === "avatars") return AVATAR_ITEMS.length;
    return CATALOGS[key as CosmeticCategory]?.length ?? 0;
  };

  const ownedAvatars = (p.owned as any)?.avatars ?? ["default"];
  const teamOffersPurchased = (p as any)?.teamOffersPurchased ?? [];
  const isMaintenanceClaimed = (p as any)?.maintenanceClaimed ?? false;

  return (
    <div className="min-h-screen px-4 py-8 max-w-[560px] mx-auto">
      <div className="flex items-center justify-between">
        <button
          onClick={() => (open ? setOpen(null) : window.history.back())}
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
            Kausi paattyy 30.7.2026 · {formatDaysCountdown(msUntilSeasonEnd())}
          </div>

          {/* Ilmainen Huoltokatko-hyvitys */}
          {!isMaintenanceClaimed && (
            <div className="mt-4 border-2 border-amber-500/50 bg-amber-950/20 rounded-xl p-4 flex items-center justify-between shadow-lg shadow-amber-950/20">
              <div className="pr-2">
                <div className="text-[10px] uppercase font-black tracking-widest text-amber-400 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  Erikoislahja
                </div>
                <div className="font-black text-lg mt-0.5 text-foreground">Huoltokatko-hyvitys</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Sisältää: <span className="text-amber-300 font-bold">5❤️ sydäntä</span> & <span className="text-yellow-400 font-bold">🪙 500 kolikkoa</span>
                </div>
              </div>
              <button
                onClick={claimMaintenanceCompensation}
                className="px-5 py-2.5 rounded bg-amber-500 hover:bg-amber-600 text-black text-sm font-black flex items-center gap-2 flex-shrink-0 transition-colors"
              >
                <Gift className="h-4 w-4" /> Lunasta
              </button>
            </div>
          )}

          <div className="mt-4 neon-panel p-4 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Paivan palkkio</div>
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

          <div className="mt-4 neon-panel p-4">
            <button onClick={() => setShowOffers((v) => !v)} className="w-full flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold"><Tag className="h-4 w-4 text-primary" /> Tarjoukset</span>
            </button>
            {showOffers && (
              <>
                <div className="mt-3 text-[11px] text-muted-foreground">Paketti sisaltaa profiilikuvan, emojin ja asusteen.</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {TEAM_OFFER_IDS.map((id) => {
                    const item = ACCESSORIES.find((a) => a.id === id);
                    if (!item) return null;
                    const owned = teamOffersPurchased.includes(id);
                    const canBuy = !owned && p.coins >= item.price;
                    return (
                      <div key={id} className="rounded border border-border/60 bg-background/40 p-2 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold">{item.preview}</span>
                          <span className="text-[10px] uppercase text-primary">Myyttinen</span>
                        </div>
                        <div className="text-sm font-bold">{item.label}</div>
                        <button
                          disabled={owned || !canBuy}
                          onClick={() => buyTeam(id)}
                          className="rounded bg-primary text-primary-foreground text-xs font-bold py-1.5 disabled:opacity-50"
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

          <div className="mt-4 neon-panel p-4">
            <button onClick={() => setShowPromo((v) => !v)} className="w-full flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold"><Ticket className="h-4 w-4 text-primary" /> Lunasta koodi</span>
            </button>
            {showPromo && (
              <div className="mt-3 space-y-2">
                <input
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                  placeholder="Syota koodi"
                  className="w-full rounded bg-background/60 border border-border/50 px-3 py-2 font-mono tracking-widest text-sm"
                />
                <button onClick={redeemPromo} className="w-full rounded bg-primary text-primary-foreground text-sm font-bold py-2">
                  Lunasta
                </button>
                {promoMsg && <div className="text-xs text-muted-foreground">{promoMsg}</div>}
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {CATS.map((c) => (
              <button key={c.key} onClick={() => setOpen(c.key)} className="neon-panel p-5 text-left hover:border-primary/70">
                <div className="text-3xl">{c.emoji}</div>
                <div className="mt-2 font-bold">{c.label}</div>
                <div className="text-xs text-muted-foreground">{getItemCount(c.key)} tuotetta</div>
              </button>
            ))}
          </div>
        </>
      )}

      {open && (
        <>
          <h1 className="mt-4 text-2xl font-black">{CATS.find((c) => c.key === open)?.label}</h1>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(open === "avatars" ? AVATAR_ITEMS : (CATALOGS[open as CosmeticCategory] ?? [])).map((item) => {
              const ownedItems = open === "avatars" ? ownedAvatars : ((p.owned as any)[open] ?? []);
              const owned = ownedItems.includes(item.id) || (open === "emojis" && item.price === 0 && !item.exclusive);
              const canBuy = !owned && p.coins >= item.price && !item.exclusive;
              const rarityStyle = getRarityClass(item.rarity);

              return (
                <div key={item.id} className={`neon-panel p-3 flex flex-col gap-2 border border-solid ${rarityStyle}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{item.label}</span>
                    {owned && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="h-14 rounded flex items-center justify-center text-3xl bg-slate-950/40 select-none">
                    {open !== "colors" && item.preview}
                  </div>
                  
                  {item.exclusive ? (
                    <div className="text-center text-[11px] font-bold text-pink-400 py-1.5 bg-pink-500/10 rounded border border-pink-500/20">
                      Rajoitettu era
                    </div>
                  ) : (
                    <button
                      disabled={owned || !canBuy}
                      onClick={() => buy(open, item)}
                      className="rounded bg-primary text-primary-foreground text-sm font-bold py-1.5 disabled:opacity-50"
                    >
                      {owned ? "Omistettu" : `🪙 ${item.price}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
      <span className="hidden">{tick}</span>
    </div>
  );
  }
                
