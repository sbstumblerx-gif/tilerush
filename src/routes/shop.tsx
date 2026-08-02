import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CATALOGS, type CosmeticCategory, type CosmeticItem } from "@/lib/game/cosmetics";
import { addPassXp, loadProgress, saveProgress, type Progress } from "@/lib/game/progress";
import { ArrowLeft, Check, Gift, KeyRound, Ticket } from "lucide-react";
import { presentContainer } from "@/lib/game/containers";
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
  { key: "avatars" as CosmeticCategory, label: "Profiilikuvat", emoji: "🧑" },
];

const KEY_OFFER_PRICE = 2000;
const KEY_OFFER_AMOUNT = 5;

/** Promo codes → grant callback. */
const PROMO_CODES: Record<string, { desc: string; apply: (p: Progress) => void }> = {
  betatest: {
    desc: "🎁 Beta testing: 10 yleistä laatikkoa & 10 yleistä loot-sydäntä!",
    apply: (p) => {
      if (!p.inventory.boxes) p.inventory.boxes = [];
      if (!p.inventory.hearts) p.inventory.hearts = [];

      // Lisätään 10 yleistä laatikkoa
      for (let i = 0; i < 10; i++) {
        p.inventory.boxes.push({
          id: `box-beta-${Date.now()}-${i}`,
          rarity: "common"
        });
      }

      // Lisätään 10 yleistä loot-sydäntä
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
  const [open, setOpen] = useState<CosmeticCategory | null>(null);
  const [tick, setTick] = useState(0);
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
    cur.lastDailyClaim = today;
    saveProgress(cur);
    setP(cur);
    if (reward.type === "heart") presentContainer("heart", reward.rarity);
    if (reward.type === "box") presentContainer("box", reward.rarity);
  };

  const buyKeys = () => {
    const cur = loadProgress();
    if (cur.lastKeyOfferClaim === today) return;
    if (cur.coins < KEY_OFFER_PRICE) return;
    cur.coins -= KEY_OFFER_PRICE;
    cur.keys = (cur.keys ?? 0) + KEY_OFFER_AMOUNT;
    cur.lastKeyOfferClaim = today;
    saveProgress(cur);
    setP(cur);
  };

  const buy = (cat: CosmeticCategory, item: CosmeticItem) => {
    const cur = loadProgress();
    
    const ownedItems = cur.owned[cat] ?? [];
    if (ownedItems.includes(item.id)) return;
    if (item.exclusive) return;
    const price = item.price ?? 0;
    if (cur.coins < price) return;

    cur.coins -= price;
    cur.owned[cat] = [...ownedItems, item.id];
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
        <span className="neon-panel px-3 py-1 text-sm font-bold">🪙 {p.coins} · 🔑 {p.keys ?? 0}</span>
      </div>

      {!open && (
        <>
          <h1 className="mt-4 text-3xl font-black">Kauppa</h1>
          <div className="mt-1 text-xs text-muted-foreground">
            Kausi 2 päättyy 1.9.2026 (UTC) · {formatDaysCountdown(msUntilSeasonEnd())}
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

          {/* Reppujahti: päivittäinen avaintarjous */}
          <div className="mt-4 neon-panel p-4 flex items-center justify-between border-amber-500/40">
            <div>
              <div className="text-xs uppercase tracking-widest text-amber-400">Tarjous · Avaimia!</div>
              <div className="font-bold flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-400" /> {KEY_OFFER_AMOUNT}x avain
              </div>
              {p.lastKeyOfferClaim === today ? (
                <div className="text-xs text-muted-foreground mt-1">Uusiutuu: {formatCountdown(msUntilUtcMidnight())}</div>
              ) : (
                <div className="text-xs text-muted-foreground mt-1">Ostettavissa kerran päivässä</div>
              )}
            </div>
            <button
              onClick={buyKeys}
              disabled={p.lastKeyOfferClaim === today || p.coins < KEY_OFFER_PRICE}
              className="px-4 py-2 rounded bg-amber-500 text-black text-sm font-black disabled:opacity-40"
            >
              {p.lastKeyOfferClaim === today ? "Ostettu" : `🪙 ${KEY_OFFER_PRICE}`}
            </button>
          </div>


          {/* Promo codes */}
          <div className="mt-4 neon-panel p-4">
            <button onClick={() => setShowPromo((v) => !v)} className="w-full flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold"><Ticket className="h-4 w-4 text-primary" /> Lunasta koodi</span>
              <span className="text-xs text-muted-foreground">{showPromo ? "Piilota" : "Näytä"}</span>
            </button>
            {showPromo && (
              <div className="mt-3 space-y-2">
                <input
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                  placeholder="Syötä koodi"
                  className="w-full rounded bg-background/60 border border-border/50 px-3 py-2 font-mono tracking-widest text-sm"
                />
                <button onClick={redeemPromo} className="w-full rounded bg-primary text-primary-foreground text-sm font-bold py-2">
                  Lunasta
                </button>
                {promoMsg && <div className="text-xs text-muted-foreground">{promoMsg}</div>}
              </div>
            )}
          </div>

          {/* Katalogiruudukko */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {CATS.map((c) => (
              <button key={c.key} onClick={() => setOpen(c.key)} className="neon-panel p-5 text-left hover:border-primary/70">
                <div className="text-3xl">{c.emoji}</div>
                <div className="mt-2 font-bold">{c.label}</div>
                <div className="text-xs text-muted-foreground">{(CATALOGS[c.key]?.length ?? 0)} tuotetta</div>
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
            {(CATALOGS[open] ?? []).map((item) => {
              const ownedItems = p.owned[open] ?? [];
              const price = item.price ?? 0;
              const owned = ownedItems.includes(item.id) || (open === "emojis" && price === 0 && !item.exclusive);
              const canBuy = !owned && p.coins >= price && !item.exclusive;
              const rarityStyle = getRarityClass(item.rarity);

              return (
                <div key={item.id} className={`neon-panel p-3 flex flex-col gap-2 border border-solid ${rarityStyle}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{item.label}</span>
                    {owned && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <div
                    className="h-14 rounded flex items-center justify-center text-3xl bg-slate-950/40"
                    style={
                      open === "colors" && item.preview
                        ? { background: item.preview }
                        : undefined
                    }
                  >
                    {open !== "colors" && (item.preview ?? "")}
                  </div>
                  
                  {item.exclusive ? (
                    <div className="text-center text-[11px] font-bold text-pink-400 py-1.5 bg-pink-500/10 rounded border border-pink-500/20">
                      Vain laatikoista
                    </div>
                  ) : (
                    <button
                      disabled={owned || !canBuy}
                      onClick={() => buy(open, item)}
                      className="rounded bg-primary text-primary-foreground text-sm font-bold py-1.5 disabled:opacity-50"
                    >
                      {owned ? "Omistettu" : `🪙 ${price}`}
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
