import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Shield, Plus, LogIn, Send, Gift, Copy, Trophy, UserMinus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AvatarBadge } from "@/components/game/AvatarBadge";
import {
  createTeam, joinTeam, leaveTeam, kickMember, listMembers, listMessages, sendMessage,
  myTeam, sendGift, listMyGifts, markGiftClaimed, TEAM_MAX_MEMBERS,
  type TeamRow, type TeamMemberRow, type TeamMessageRow, type TeamGiftRow, type GiftKind,
} from "@/lib/cloud/teams";
import { currentUserId } from "@/lib/cloud/social";
import { loadProgress, saveProgress, grantKeys, grantBackpack } from "@/lib/game/progress";
import { presentContainer } from "@/lib/game/containers";
import type { Rarity } from "@/lib/game/rarity";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Joukkue · Tile Rush" },
      { name: "description", content: "Liity enintään 30 pelaajan joukkueeseen, keskustele chatissa ja lahjoita tuotteita kaverisi kanssa." },
      { property: "og:title", content: "Joukkue · Tile Rush" },
      { property: "og:description", content: "Joukkuechat, lahjoitukset ja tulevat viikkoliigat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamPage,
});

const GIFTS: { kind: GiftKind; label: string; amount: number; cost: (p: ReturnType<typeof loadProgress>) => boolean }[] = [
  { kind: "key", label: "🔑 Avain", amount: 1, cost: (p) => (p.keys ?? 0) >= 1 },
  { kind: "backpack", label: "🎒 Reppu", amount: 1, cost: (p) => (p.inventory.backpacks ?? []).length >= 1 },
  { kind: "coins", label: "🪙 100", amount: 100, cost: (p) => p.coins >= 100 },
];

function TeamPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [role, setRole] = useState("member");
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [messages, setMessages] = useState<TeamMessageRow[]>([]);
  const [gifts, setGifts] = useState<TeamGiftRow[]>([]);
  const [tab, setTab] = useState<"chat" | "roster" | "league">("chat");
  const [draft, setDraft] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [giftTarget, setGiftTarget] = useState<TeamMemberRow | null>(null);
  const chatEnd = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user);
      setUid(data.user?.id ?? null);
    });
  }, []);

  const refresh = useCallback(async () => {
    const mine = await myTeam();
    if (!mine) { setTeam(null); return; }
    setTeam(mine.team);
    setRole(mine.role);
    const [m, msg, g] = await Promise.all([
      listMembers(mine.team.id),
      listMessages(mine.team.id),
      listMyGifts(mine.team.id),
    ]);
    setMembers(m);
    setMessages(msg);
    setGifts(g);
  }, []);

  useEffect(() => { if (signedIn) void refresh(); }, [signedIn, refresh]);

  // Reaaliaikainen chat + jäsenet + lahjat
  useEffect(() => {
    if (!team) return;
    const channel = supabase
      .channel(`team-${team.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "team_messages", filter: `team_id=eq.${team.id}` }, () => {
        void listMessages(team.id).then(setMessages);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members", filter: `team_id=eq.${team.id}` }, () => {
        void listMembers(team.id).then(setMembers);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "team_gifts", filter: `team_id=eq.${team.id}` }, () => {
        void listMyGifts(team.id).then(setGifts);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [team]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ block: "end" }); }, [messages, tab]);

  const doCreate = async () => {
    setBusy(true); setErr(null);
    const t = await createTeam(name || "Joukkue", "");
    setBusy(false);
    if (!t) { setErr("Joukkueen luonti epäonnistui."); return; }
    await refresh();
  };

  const doJoin = async () => {
    setBusy(true); setErr(null);
    const res = await joinTeam(code);
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? "Virhe."); return; }
    setCode("");
    await refresh();
  };

  const doLeave = async () => {
    if (!team) return;
    await leaveTeam(team.id);
    setTeam(null);
    setMembers([]);
    setMessages([]);
  };

  const doSend = async () => {
    if (!team || !draft.trim()) return;
    const body = draft;
    setDraft("");
    await sendMessage(team.id, body);
    setMessages(await listMessages(team.id));
  };

  const doGift = async (g: typeof GIFTS[number]) => {
    if (!team || !giftTarget) return;
    const p = loadProgress();
    if (!g.cost(p)) { setErr("Sinulla ei ole tätä lahjoitettavaksi."); return; }
    if (g.kind === "key") p.keys = (p.keys ?? 0) - 1;
    else if (g.kind === "backpack") p.inventory.backpacks = (p.inventory.backpacks ?? []).slice(1);
    else if (g.kind === "coins") p.coins -= g.amount;
    saveProgress(p);
    const res = await sendGift(team.id, giftTarget.user_id, g.kind, g.amount);
    if (!res.ok) setErr(res.error ?? "Lahjoitus epäonnistui.");
    setGiftTarget(null);
  };

  const claimGift = async (gift: TeamGiftRow) => {
    const p = loadProgress();
    if (gift.kind === "key") grantKeys(p, gift.amount);
    else if (gift.kind === "backpack") grantBackpack(p);
    else if (gift.kind === "coins") p.coins += gift.amount;
    saveProgress(p);
    if (gift.kind === "box" || gift.kind === "heart") {
      presentContainer(gift.kind, (gift.rarity as Rarity) ?? "common");
    }
    await markGiftClaimed(gift.id);
    if (team) setGifts(await listMyGifts(team.id));
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-[560px] mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Lobby
      </Link>
      <h1 className="mt-4 text-3xl font-black flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" /> Joukkue
      </h1>

      {signedIn === false && (
        <div className="mt-4 neon-panel p-4 text-sm">
          Joukkueet vaativat sisäänkirjautumisen.{" "}
          <Link to="/settings" className="underline text-primary inline-flex items-center gap-1">
            <LogIn className="h-3 w-3" /> Kirjaudu Googlella
          </Link>
        </div>
      )}

      {err && <div className="mt-3 text-xs text-destructive">{err}</div>}

      {signedIn && !team && (
        <div className="mt-6 space-y-4">
          <div className="neon-panel p-4 space-y-2">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Perusta joukkue</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 24))}
              placeholder="Joukkueen nimi"
              className="w-full rounded bg-background/60 border border-border/50 px-3 py-2"
            />
            <Button className="w-full gap-2" onClick={doCreate} disabled={busy}>
              <Plus className="h-4 w-4" /> Perusta (max {TEAM_MAX_MEMBERS} pelaajaa)
            </Button>
          </div>
          <div className="neon-panel p-4 space-y-2">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Liity koodilla</div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toLowerCase().slice(0, 6))}
              placeholder="joukkuekoodi"
              className="w-full rounded bg-background/60 border border-border/50 px-3 py-2 font-mono tracking-widest text-center"
            />
            <Button variant="secondary" className="w-full gap-2" onClick={doJoin} disabled={busy || !code}>
              <LogIn className="h-4 w-4" /> Liity
            </Button>
          </div>
        </div>
      )}

      {team && (
        <>
          <div className="mt-4 neon-panel p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-lg font-black">{team.name}</div>
                <div className="text-xs text-muted-foreground">
                  {members.length}/{team.max_members ?? TEAM_MAX_MEMBERS} pelaajaa
                </div>
              </div>
              <button
                onClick={() => void navigator.clipboard.writeText(team.code)}
                className="neon-panel px-3 py-1.5 text-xs font-mono flex items-center gap-2"
                title="Kopioi koodi"
              >
                {team.code} <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>

          {gifts.length > 0 && (
            <div className="mt-3 neon-panel p-3 space-y-2 border-primary/50">
              <div className="text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                <Gift className="h-3 w-3" /> Sinulle lahjoitettu
              </div>
              {gifts.map((g) => (
                <div key={g.id} className="flex items-center justify-between text-sm">
                  <span>{giftLabel(g)}</span>
                  <Button size="sm" onClick={() => void claimGift(g)}>Lunasta</Button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2">
            {([["chat", "Chat"], ["roster", "Jäsenet"], ["league", "Liiga"]] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-lg py-2 text-sm font-bold border ${tab === k ? "bg-primary text-primary-foreground border-primary" : "border-border/60 text-muted-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "chat" && (
            <div className="mt-3 neon-panel p-3">
              <div className="max-h-[46vh] overflow-y-auto space-y-2 pr-1">
                {messages.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-6">Ei viestejä vielä.</div>
                )}
                {messages.map((m) => {
                  const prof = members.find((x) => x.user_id === m.user_id)?.profile;
                  const mine = m.user_id === uid;
                  return (
                    <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse text-right" : ""}`}>
                      <AvatarBadge avatar={prof?.avatar_team} name={prof?.username ?? "?"} size={28} />
                      <div className={`rounded-2xl px-3 py-2 max-w-[75%] ${mine ? "bg-primary/20" : "bg-background/60"}`}>
                        <div className="text-[10px] text-muted-foreground">{prof?.username ?? "Pelaaja"}</div>
                        <div className="text-sm break-words">{m.body}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEnd} />
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, 240))}
                  onKeyDown={(e) => { if (e.key === "Enter") void doSend(); }}
                  placeholder="Kirjoita viesti…"
                  className="flex-1 rounded bg-background/60 border border-border/50 px-3 py-2 text-sm"
                />
                <Button size="icon" onClick={doSend} disabled={!draft.trim()} aria-label="Lähetä">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {tab === "roster" && (
            <div className="mt-3 space-y-2">
              {members.map((m) => (
                <div key={m.user_id} className="neon-panel p-3 flex items-center gap-3">
                  <AvatarBadge avatar={m.profile?.avatar_team} name={m.profile?.username ?? "?"} size={34} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">
                      {m.profile?.username ?? "Pelaaja"}
                      {m.role === "leader" && <span className="ml-2 text-[10px] text-primary">JOHTAJA</span>}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">{m.profile?.friend_code}</div>
                  </div>
                  {m.user_id !== uid && (
                    <Button size="sm" variant="secondary" className="gap-1" onClick={() => setGiftTarget(m)}>
                      <Gift className="h-3 w-3" /> Lahjoita
                    </Button>
                  )}
                  {role === "leader" && m.user_id !== uid && (
                    <button
                      onClick={() => void kickMember(team.id, m.user_id).then(refresh)}
                      className="p-2 text-muted-foreground hover:text-destructive"
                      aria-label="Poista jäsen"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <Button variant="outline" className="w-full gap-2 mt-2" onClick={doLeave}>
                <LogOut className="h-4 w-4" /> Poistu joukkueesta
              </Button>
            </div>
          )}

          {tab === "league" && <LeagueTab team={team} />}
        </>
      )}

      {giftTarget && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/70">
          <div className="absolute inset-0" onClick={() => setGiftTarget(null)} />
          <div className="relative neon-panel p-5 w-full max-w-xs space-y-2">
            <div className="font-black">Lahjoita: {giftTarget.profile?.username ?? "Pelaaja"}</div>
            {GIFTS.map((g) => (
              <Button key={g.kind} variant="secondary" className="w-full" onClick={() => void doGift(g)}>
                {g.label}
              </Button>
            ))}
            <button className="w-full text-xs text-muted-foreground pt-1" onClick={() => setGiftTarget(null)}>
              Peruuta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function giftLabel(g: TeamGiftRow): string {
  switch (g.kind) {
    case "key": return `🔑 ${g.amount}x avain`;
    case "backpack": return `🎒 ${g.amount}x reppu`;
    case "coins": return `🪙 ${g.amount} kolikkoa`;
    case "box": return "📦 Laatikko";
    case "heart": return "💗 Loot-sydän";
  }
}
