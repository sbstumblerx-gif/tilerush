import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, X, Check, Copy } from "lucide-react";
import { loadProgress, saveProgress, type Progress } from "@/lib/game/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  acceptRequest, deleteRequest, fetchMyProfile, listFriends, listRequests,
  removeFriend, sendFriendRequest, upsertMyProfile,
  type CloudProfile, type FriendRequestRow,
} from "@/lib/cloud/social";
import { ProfileModal, type ProfileData } from "@/components/game/ProfileModal";

export const Route = createFileRoute("/friends")({
  head: () => ({ meta: [{ title: "Kaverit · Tile Rush" }] }),
  component: FriendsPage,
});

type Tab = "list" | "requests" | "add" | "leaderboard";

function FriendsPage() {
  const [p, setP] = useState<Progress | null>(null);
  const [tab, setTab] = useState<Tab>("list");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [me, setMe] = useState<CloudProfile | null>(null);
  const [friends, setFriends] = useState<CloudProfile[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestRow[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestRow[]>([]);
  
  // Profiilinäkymän tilanhallinta
  const [selectedProfile, setSelectedProfile] = useState<ProfileData | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const refresh = useCallback(async () => {
    const [prof, fs, reqs] = await Promise.all([fetchMyProfile(), listFriends(), listRequests()]);
    setMe(prof);
    setFriends(fs);
    setIncoming(reqs.incoming);
    setOutgoing(reqs.outgoing);
    
    const cur = loadProgress();
    if (prof) {
      let changed = false;
      if (prof.friend_code && cur.profile.friendCode !== prof.friend_code) {
        cur.profile.friendCode = prof.friend_code; changed = true;
      }
      if (cur.profile.username && cur.profile.username !== "Pelaaja" && cur.profile.username !== prof.username) {
        await upsertMyProfile({ username: cur.profile.username });
      } else if (cur.profile.username === "Pelaaja" && prof.username && prof.username !== cur.profile.username) {
        cur.profile.username = prof.username; changed = true;
      }
      if (changed) saveProgress(cur);
    }
    setP(loadProgress());
  }, []);

  useEffect(() => {
    setP(loadProgress());
    supabase.auth.getUser().then(({ data }) => {
      const yes = !!data.user;
      setSignedIn(yes);
      if (yes) refresh();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      const yes = !!s?.user;
      setSignedIn(yes);
      if (yes) refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  useEffect(() => {
    if (!signedIn) return;
    const ch = supabase
      .channel("friends-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [signedIn, refresh]);

  if (!p) return null;

  // Apu-funktio oman profiilidatan rakentamiseen
  const getMyProfileData = (): ProfileData => ({
    username: p.profile.username || "Pelaaja",
    friendCode: me?.friend_code || p.profile.friendCode || "TILE-0000",
    levelsCompleted: p.completed?.length || 0,
    starsCollected: p.stats?.stars || 0,
    isSelf: true,
    equipped: {
      color: p.equipped?.color || "cyan",
      shape: p.equipped?.shape || "circle",
      pattern: p.equipped?.pattern || "none",
      accessory: p.equipped?.accessory || "none",
      theme: p.equipped?.theme || "default",
      emojis: p.equipped?.emojis || ["😭", "😃", "😅", "👍"]
    }
  });

  // Apu-funktio kaverin profiilidatan rakentamiseen tietokantarivistä
  const getFriendProfileData = (f: CloudProfile): ProfileData => {
    const customEquipped = f.equipped ? (typeof f.equipped === 'string' ? JSON.parse(f.equipped) : f.equipped) : null;
    
    return {
      username: f.username || "Pelaaja",
      friendCode: f.friend_code || "",
      levelsCompleted: f.levels_completed || 0,
      starsCollected: f.stars_collected || 0,
      isSelf: false,
      equipped: {
        color: customEquipped?.color || "purple",
        shape: customEquipped?.shape || "square",
        pattern: customEquipped?.pattern || "none",
        accessory: customEquipped?.accessory || "none",
        theme: customEquipped?.theme || "default",
        emojis: customEquipped?.emojis || ["😭", "😃", "😅", "👍"]
      }
    };
  };

  const copyMyCode = async () => {
    const activeCode = me?.friend_code || p.profile.friendCode;
    if (!activeCode) return;
    await navigator.clipboard.writeText(activeCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const send = async () => {
    const c = code.trim().toLowerCase();
    if (!c) return;
    const res = await sendFriendRequest(c);
    if (!res.ok) { setMsg(`❌ ${res.error}`); return; }
    setCode("");
    setMsg(res.accepted ? "✅ Kaveri lisätty (vastapyyntö).": "✅ Kaveripyyntö lähetetty.");
    refresh();
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-[560px] mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Lobby
      </Link>
      
      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-3xl font-black">Kaverit</h1>
        <button 
          onClick={() => { setSelectedProfile(getMyProfileData()); setIsProfileOpen(true); }}
          className="text-xs font-bold px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors"
        >
          Oma profiili 👤
        </button>
      </div>

      {signedIn === false && (
        <div className="mt-4 neon-panel p-4 text-sm">
          Kaveritoiminnot vaativat sisäänkirjautumisen. <Link to="/settings" className="underline text-primary">Kirjaudu Googlella →</Link>
        </div>
      )}

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {([
          ["list", `Ystävät ${friends.length}/50`],
          ["requests", "Pyynnöt"],
          ["add", "Lisää"],
          ["leaderboard", "Tulostaulu"],
        ] as [Tab, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`neon-panel px-3 py-2 text-sm whitespace-nowrap ${tab === k ? "border-primary" : ""}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <div className="mt-4 space-y-2">
          {friends.length === 0 && <div className="text-sm text-muted-foreground">Ei vielä kavereita. Lisää heitä koodilla.</div>}
          {friends.map((f) => (
            <div key={f.user_id} className="neon-panel p-3 flex items-center justify-between hover:border-zinc-700 transition-colors">
              <div 
                className="cursor-pointer flex-1" 
                onClick={() => { setSelectedProfile(getFriendProfileData(f)); setIsProfileOpen(true); }}
              >
                <div className="font-bold flex items-center gap-2 text-white hover:text-primary transition-colors">
                  {f.avatar_team && <span>{teamFlag(f.avatar_team)}</span>}{f.username}
                </div>
                <div className="text-xs text-muted-foreground font-mono">{f.friend_code}</div>
              </div>
              <button onClick={async () => { await removeFriend(f.user_id); refresh(); }} className="text-xs text-destructive pl-2">Poista</button>
            </div>
          ))}
        </div>
      )}

      {tab === "requests" && (
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-muted-foreground">Saapuvat</h3>
            {incoming.length === 0 && <div className="text-sm text-muted-foreground mt-2">Ei saapuvia pyyntöjä.</div>}
            {incoming.map((r) => (
              <div key={r.id} className="neon-panel p-3 flex items-center justify-between mt-2">
                <div>
                  <div className="font-bold">{r.profile?.username ?? "Pelaaja"}</div>
                  <div className="text-xs text-muted-foreground font-mono">{r.profile?.friend_code}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={async () => { await acceptRequest(r.id); refresh(); }} className="p-2 rounded bg-primary text-primary-foreground"><Check className="h-4 w-4" /></button>
                  <button onClick={async () => { await deleteRequest(r.id); refresh(); }} className="p-2 rounded bg-destructive text-destructive-foreground"><X className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-sm font-bold text-muted-foreground">Lähtevät</h3>
            {outgoing.length === 0 && <div className="text-sm text-muted-foreground mt-2">Ei lähteviä pyyntöjä.</div>}
            {outgoing.map((r) => (
              <div key={r.id} className="neon-panel p-3 flex items-center justify-between mt-2">
                <div>
                  <div className="font-bold">{r.profile?.username ?? "Pelaaja"}</div>
                  <div className="text-xs text-muted-foreground font-mono">{r.profile?.friend_code}</div>
                </div>
                <button onClick={async () => { await deleteRequest(r.id); refresh(); }} className="p-2 rounded bg-secondary"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "add" && (
        <div className="mt-4 space-y-4">
          <div className="neon-panel p-4 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Oma kaverikoodisi</div>
              <div className="mt-1 text-2xl font-mono tracking-widest">{me?.friend_code ?? p.profile.friendCode}</div>
            </div>
            <button 
              onClick={copyMyCode}
              className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-all text-zinc-400 hover:text-white"
            >
              {copiedCode ? <Check className="h-5 w-5 text-emerald-400" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
          <div className="neon-panel p-4 space-y-3">
            <div className="text-sm font-bold">Lisää kaveri koodilla</div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toLowerCase())}
              placeholder="6-merkkinen koodi"
              maxLength={6}
              className="w-full rounded bg-background/60 border border-border/50 px-3 py-2 font-mono tracking-widest"
            />
            <Button onClick={send} className="w-full" disabled={!signedIn}>Lähetä pyyntö</Button>
            {msg && <div className="text-xs text-muted-foreground">{msg}</div>}
          </div>
        </div>
      )}

      {tab === "leaderboard" && (
        <div className="mt-4 space-y-2">
          <div className="text-xs text-muted-foreground">Kaverien tulostaulu — omat tulokset ensin.</div>
          
          <div 
            className="neon-panel p-3 flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => { setSelectedProfile(getMyProfileData()); setIsProfileOpen(true); }}
          >
            <div className="flex items-center gap-3">
              <span className="text-primary text-lg font-black w-6 text-center">1</span>
              <div>
                <div className="font-bold">{p.profile.username} <span className="text-xs text-primary">(Sinä)</span></div>
                <div className="text-xs text-muted-foreground">{p.completed.length} tasoa · {p.stats.stars} ⭐</div>
              </div>
            </div>
            <span className="text-sm font-mono">🪙 {p.coins}</span>
          </div>

          {friends.map((f, i) => (
            <div 
              key={f.user_id} 
              className="neon-panel p-3 flex items-center justify-between opacity-80 hover:opacity-100 cursor-pointer transition-all"
              onClick={() => { setSelectedProfile(getFriendProfileData(f)); setIsProfileOpen(true); }}
            >
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-lg font-black w-6 text-center">{i + 2}</span>
                <div>
                  <div className="font-bold hover:text-primary transition-colors">{f.username}</div>
                  <div className="text-xs text-muted-foreground font-mono">{f.friend_code}</div>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">— · —</span>
            </div>
          ))}
          {friends.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-4">
              Lisää kavereita nähdäksesi heidät tulostaululla.
            </div>
          )}
        </div>
      )}

      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        profile={selectedProfile} 
      />
    </div>
  );
}

function teamFlag(id: string): string {
  const map: Record<string, string> = {
    "team-fr": "🇫🇷", "team-ma": "🇲🇦", "team-en": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "team-no": "🇳🇴",
    "team-es": "🇪🇸", "team-be": "🇧🇪", "team-ar": "🇦🇷", "team-ch": "🇨🇭",
  };
  return map[id] ?? "";
        }
