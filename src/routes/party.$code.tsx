import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Copy, Settings as SettingsIcon, Play, Plus, LogOut, Home } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadProgress, type Progress } from "@/lib/game/progress";
import { PACKS } from "@/lib/game/packs";
import { Button } from "@/components/ui/button";
import { Board } from "@/components/game/Board";
import { PlayerToken } from "@/components/game/PlayerToken";
import { getLevel, LEVELS } from "@/lib/game/levels";
import { createState, tryMove } from "@/lib/game/engine";
import type { GameState, Pos } from "@/lib/game/types";
import { supabase } from "@/integrations/supabase/client";
import {
  getParty, joinParty, leaveParty, listPartyMembers, updatePartySettings,
  upsertMyProfile, type PartyRow, type CloudProfile,
} from "@/lib/cloud/social";
import {
  MAX_PLAYERS, MAX_ROUNDS, RESULTS_MS, ROUND_MS, STANDINGS_MS,
  formatMs, pickRoundLevel, rankResults,
  type MatchPhase, type MatchSnapshot, type RoundResult,
} from "@/lib/cloud/match";

export const Route = createFileRoute("/party/$code")({
  head: () => ({
    meta: [
      { title: "Party · Tile Rush" },
      { name: "description", content: "Pelaa Tile Rush -otteluita kavereiden kanssa reaaliajassa." },
    ],
  }),
  component: PartyPage,
});

type Ghost = { r: number; c: number; movesLeft: number };

function PartyPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();

  const [p, setP] = useState<Progress | null>(null);
  const [party, setParty] = useState<PartyRow | null>(null);
  const [members, setMembers] = useState<CloudProfile[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPacks, setShowPacks] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Match state
  const [snap, setSnap] = useState<MatchSnapshot>({
    phase: "lobby", round: 0, totalRounds: 0, levelId: 1, startAt: 0, scores: {}, results: [],
  });
  const [subPhase, setSubPhase] = useState<"results" | "standings">("results");
  const [game, setGame] = useState<GameState | null>(null);
  const [ghosts, setGhosts] = useState<Record<string, Ghost>>({});
  const [emojiFeed, setEmojiFeed] = useState<{ id: number; userId: string; emoji: string }[]>([]);
  const [now, setNow] = useState(Date.now());

  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const resultsRef = useRef<Map<string, RoundResult>>(new Map());
  const scoresRef = useRef<Record<string, number>>({});
  const timersRef = useRef<number[]>([]);
  const doneRef = useRef(false);
  const membersRef = useRef<CloudProfile[]>([]);
  membersRef.current = members;

  const nameOf = useCallback(
    (id: string) => membersRef.current.find((m) => m.user_id === id)?.username ?? "Pelaaja",
    [],
  );

  const refresh = useCallback(async () => {
    const [pr, mem] = await Promise.all([getParty(code), listPartyMembers(code)]);
    setParty(pr);
    setMembers(mem);
  }, [code]);

  useEffect(() => {
    const progress = loadProgress();
    setP(progress);
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const id = user?.id ?? null;
        setUid(id);
        if (!id) { setErr("Kirjaudu sisään päästäksesi partyyn."); return; }
        const pr = await getParty(code);
        if (!pr) { setErr("Peliä ei löytynyt."); return; }
        await upsertMyProfile({ username: progress?.profile?.username || "Pelaaja" }).catch(() => null);
        const mem = await listPartyMembers(code).catch(() => []);
        if (!mem.some((m) => m.user_id === id)) await joinParty(code).catch(() => null);
      } catch (e) {
        console.error("Party latausvirhe:", e);
        setErr("Partyn latauksessa tapahtui virhe.");
      } finally {
        refresh();
      }
    })();
  }, [code, refresh]);

  // 1s tick for countdowns
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);

  const isHost = uid && party ? uid === party.host_id : false;

  /* ---------------- Host: round orchestration ---------------- */
  const broadcast = useCallback((event: string, payload: Record<string, unknown>) => {
    chanRef.current?.send({ type: "broadcast", event, payload });
  }, []);

  const startRound = useCallback((round: number) => {
    if (!party) return;
    const packs: number[] = Array.isArray(party.packs) ? party.packs : [];
    const levelId = pickRoundLevel(code, round, packs);
    const payload: MatchSnapshot = {
      phase: "round",
      round,
      totalRounds: party.rounds,
      levelId,
      startAt: Date.now() + 1500,
      scores: { ...scoresRef.current },
      results: [],
    };
    broadcast("snapshot", payload as unknown as Record<string, unknown>);
    applySnapshot(payload);
  }, [broadcast, code, party]);

  const endRound = useCallback(() => {
    if (!party) return;
    const ids = membersRef.current.map((m) => m.user_id);
    const results = rankResults(
      ids.map((id) => resultsRef.current.get(id) ?? { userId: id, movesLeft: 0, timeMs: ROUND_MS, dnf: true }),
    );
    const winner = results.find((r) => !r.dnf);
    if (winner) scoresRef.current[winner.userId] = (scoresRef.current[winner.userId] ?? 0) + 1;

    const round = snapRef.current.round;
    const final = round >= party.rounds;
    const payload: MatchSnapshot = {
      phase: final ? "final" : "results",
      round,
      totalRounds: party.rounds,
      levelId: snapRef.current.levelId,
      startAt: Date.now(),
      scores: { ...scoresRef.current },
      results,
    };
    broadcast("snapshot", payload as unknown as Record<string, unknown>);
    applySnapshot(payload);
    if (!final) {
      timersRef.current.push(
        window.setTimeout(() => startRound(round + 1), RESULTS_MS + STANDINGS_MS),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcast, party, startRound]);

  const maybeEndRound = useCallback(() => {
    if (!isHost) return;
    const ids = membersRef.current.map((m) => m.user_id);
    if (ids.every((id) => resultsRef.current.has(id))) {
      clearTimers();
      endRound();
    }
  }, [clearTimers, endRound, isHost]);

  /* ---------------- Snapshot application (all clients) ---------------- */
  const snapRef = useRef<MatchSnapshot>(snap);
  const applySnapshot = useCallback((s: MatchSnapshot) => {
    snapRef.current = s;
    setSnap(s);
    setGhosts({});
    if (s.phase === "round") {
      doneRef.current = false;
      resultsRef.current = new Map();
      const level = getLevel(s.levelId) ?? LEVELS[0];
      setGame(createState(level));
    }
    if (s.phase === "results" || s.phase === "final") {
      setGame(null);
      setSubPhase("results");
      if (s.phase === "results") {
        window.setTimeout(() => setSubPhase("standings"), RESULTS_MS);
      }
    }
    if (s.phase === "lobby") setGame(null);
  }, []);

  /* ---------------- Realtime channel ---------------- */
  useEffect(() => {
    if (!uid) return;
    const ch = supabase.channel(`party-${code}`, { config: { broadcast: { self: true } } });
    ch.on("postgres_changes", { event: "*", schema: "public", table: "party_members", filter: `party_code=eq.${code}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "parties", filter: `code=eq.${code}` }, refresh)
      .on("broadcast", { event: "snapshot" }, ({ payload }) => {
        applySnapshot(payload as MatchSnapshot);
      })
      .on("broadcast", { event: "pos" }, ({ payload }) => {
        const d = payload as { userId: string; r: number; c: number; movesLeft: number };
        if (d.userId === uid) return;
        setGhosts((g) => ({ ...g, [d.userId]: { r: d.r, c: d.c, movesLeft: d.movesLeft } }));
      })
      .on("broadcast", { event: "result" }, ({ payload }) => {
        const d = payload as RoundResult & { round: number };
        if (d.round !== snapRef.current.round) return;
        resultsRef.current.set(d.userId, { userId: d.userId, movesLeft: d.movesLeft, timeMs: d.timeMs, dnf: d.dnf });
        maybeEndRound();
      })
      .on("broadcast", { event: "emoji" }, ({ payload }) => {
        const d = payload as { userId: string; emoji: string };
        if (d.userId !== uid && loadProgress().settings.showEmojis === false) return;
        const item = { id: Date.now() + Math.random(), userId: d.userId, emoji: d.emoji };
        setEmojiFeed((f) => [...f.slice(-5), item]);
        window.setTimeout(() => setEmojiFeed((f) => f.filter((x) => x.id !== item.id)), 2500);
      })
      .subscribe();
    chanRef.current = ch;
    return () => {
      chanRef.current = null;
      supabase.removeChannel(ch);
    };
  }, [applySnapshot, code, maybeEndRound, refresh, uid]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  /* ---------------- Round timer / DNF ---------------- */
  const roundEndsAt = snap.phase === "round" ? snap.startAt + ROUND_MS : 0;
  const secondsLeft = roundEndsAt ? Math.max(0, Math.ceil((roundEndsAt - now) / 1000)) : 0;

  const submitResult = useCallback((movesLeft: number, timeMs: number, dnf: boolean) => {
    if (doneRef.current || !uid) return;
    doneRef.current = true;
    const payload = { userId: uid, round: snapRef.current.round, movesLeft, timeMs, dnf };
    broadcast("result", payload);
  }, [broadcast, uid]);

  useEffect(() => {
    if (snap.phase !== "round" || !roundEndsAt) return;
    if (now < roundEndsAt) return;
    submitResult(0, ROUND_MS, true);
    if (isHost) {
      clearTimers();
      // grace for late results
      timersRef.current.push(window.setTimeout(() => endRound(), 1200));
    }
  }, [clearTimers, endRound, isHost, now, roundEndsAt, snap.phase, submitResult]);

  const started = snap.phase === "round" && now >= snap.startAt;

  const onTileClick = (pos: Pos) => {
    if (!game || !started || doneRef.current) return;
    const next = tryMove(game, pos);
    setGame(next);
    broadcast("pos", { userId: uid, r: next.player.r, c: next.player.c, movesLeft: next.movesLeft });
    if (next.status === "won") submitResult(next.movesLeft, Date.now() - snap.startAt, false);
    else if (next.status === "lost") submitResult(0, Date.now() - snap.startAt, true);
  };

  const sendEmoji = (emoji: string) => broadcast("emoji", { userId: uid, emoji });

  const startMatch = () => {
    if (!isHost || !party) return;
    scoresRef.current = {};
    membersRef.current.forEach((m) => { scoresRef.current[m.user_id] = 0; });
    clearTimers();
    startRound(1);
  };

  const backToParty = () => {
    const payload: MatchSnapshot = {
      phase: "lobby", round: 0, totalRounds: 0, levelId: 1, startAt: 0, scores: {}, results: [],
    };
    if (isHost) broadcast("snapshot", payload as unknown as Record<string, unknown>);
    applySnapshot(payload);
  };

  const doLeave = async () => {
    await leaveParty(code);
    navigate({ to: "/multiplayer" });
  };

  const standings = useMemo(() => {
    const ids = members.map((m) => m.user_id);
    return ids
      .map((id) => ({ id, points: snap.scores[id] ?? 0 }))
      .sort((a, b) => b.points - a.points);
  }, [members, snap.scores]);

  if (!p) return null;
  if (err) {
    return (
      <div className="min-h-screen px-4 py-8 max-w-[420px] mx-auto">
        <Link to="/multiplayer" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Takaisin
        </Link>
        <div className="mt-8 neon-panel p-4 text-sm">{err}</div>
      </div>
    );
  }
  if (!party) {
    return <div className="min-h-screen p-8 text-sm text-muted-foreground">Ladataan partya…</div>;
  }

  const rounds = party.rounds;
  const packs: number[] = Array.isArray(party.packs) ? party.packs : [];
  const canStart = isHost && packs.length >= 1 && members.length >= 2;
  const myEmojis = p.equipped.emojis ?? ["🎮", "⚡", "🌟", "🏆"];

  const togglePack = async (id: number) => {
    if (!isHost) return;
    const next = packs.includes(id) ? packs.filter((x) => x !== id) : [...packs, id];
    await updatePartySettings(code, { packs: next });
  };
  const setRounds = async (r: number) => {
    if (!isHost) return;
    await updatePartySettings(code, { rounds: r });
  };

  /* ---------------- Match views ---------------- */
  if (snap.phase === "round" && game) {
    const ghostList = Object.entries(ghosts).map(([id, g]) => ({
      r: g.r, c: g.c, label: nameOf(id),
      emoji: emojiFeed.find((e) => e.userId === id)?.emoji,
    }));
    return (
      <div className="min-h-screen px-4 py-6 max-w-[560px] mx-auto">
        <div className="flex items-center justify-between text-sm">
          <div className="font-bold">Kierros {snap.round}/{snap.totalRounds}</div>
          <div className={`font-mono font-black ${secondsLeft <= 10 ? "text-destructive" : ""}`}>
            {secondsLeft}s
          </div>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Siirrot jäljellä: <span className="font-bold text-foreground">{game.movesLeft}</span> · Taso {game.levelId}
        </div>
        {!started && (
          <div className="mt-4 neon-panel p-4 text-center font-black">Valmiina… peli alkaa!</div>
        )}
        <div className="mt-4">
          <Board state={game} onTileClick={onTileClick} ghosts={ghostList} />
        </div>
        {doneRef.current && (
          <div className="mt-3 neon-panel p-3 text-center text-sm">
            {game.status === "won" ? "🏁 Maalissa! Odotetaan muita…" : "❌ DNF – odotetaan muita…"}
          </div>
        )}
        <div className="mt-4 flex gap-2 justify-center">
          {myEmojis.map((e, i) => (
            <button key={i} onClick={() => sendEmoji(e)} className="neon-panel px-3 py-2 text-xl">
              {e}
            </button>
          ))}
        </div>
        {p.settings.showEmojis !== false && emojiFeed.length > 0 && (
          <div className="mt-3 space-y-1 text-xs text-muted-foreground text-center">
            {emojiFeed.map((e) => (
              <div key={e.id}>{nameOf(e.userId)}: <span className="text-lg">{e.emoji}</span></div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (snap.phase === "results") {
    const best = snap.results.find((r) => !r.dnf);
    return (
      <div className="min-h-screen px-4 py-8 max-w-[520px] mx-auto">
        <h1 className="text-2xl font-black">
          {subPhase === "results" ? `Kierros ${snap.round} · tulokset` : "Pistetaulukko"}
        </h1>
        {subPhase === "results" ? (
          <div className="mt-4 space-y-2">
            {snap.results.map((r, i) => (
              <div key={r.userId} className="neon-panel p-3 flex items-center gap-3 text-sm">
                <span className="w-6 font-black">{r.dnf ? "–" : i + 1}</span>
                <span className="font-bold flex-1">{nameOf(r.userId)}</span>
                {r.dnf ? (
                  <span className="text-destructive font-bold">DNF</span>
                ) : (
                  <>
                    <span>{r.movesLeft} siirtoa</span>
                    <span className="text-muted-foreground">
                      {best && r.userId !== best.userId ? `+${formatMs(r.timeMs - best.timeMs)}` : formatMs(r.timeMs)}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {standings.map((s, i) => (
              <div key={s.id} className="neon-panel p-3 flex items-center gap-3 text-sm">
                <span className="w-6 font-black">{i + 1}.</span>
                <span className="font-bold flex-1">{nameOf(s.id)}</span>
                <span className="font-black text-primary">{s.points} p</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 text-xs text-muted-foreground text-center">
          Seuraava kierros alkaa hetken kuluttua…
        </div>
      </div>
    );
  }

  if (snap.phase === "final") {
    const podium = standings.slice(0, 3);
    const rest = standings.slice(3);
    return (
      <div className="min-h-screen px-4 py-8 max-w-[520px] mx-auto">
        <h1 className="text-3xl font-black text-center">Ottelu päättyi</h1>
        <div className="mt-6 grid grid-cols-3 gap-2 items-end">
          {[1, 0, 2].map((idx) => {
            const s = podium[idx];
            const h = idx === 0 ? "h-32" : idx === 1 ? "h-24" : "h-20";
            const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
            return (
              <div key={idx} className="flex flex-col items-center gap-1">
                <div className="text-2xl">{s ? medal : ""}</div>
                <div className={`w-full ${h} neon-panel flex flex-col items-center justify-center p-2`}>
                  <div className="text-xs font-bold text-center">{s ? nameOf(s.id) : "–"}</div>
                  {s && <div className="text-primary font-black">{s.points} p</div>}
                </div>
              </div>
            );
          })}
        </div>
        {rest.length > 0 && (
          <div className="mt-4 space-y-2">
            {rest.map((s, i) => (
              <div key={s.id} className="neon-panel p-3 flex items-center gap-3 text-sm">
                <span className="w-6 font-black">{i + 4}.</span>
                <span className="flex-1">{nameOf(s.id)}</span>
                <span className="font-bold">{s.points} p</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-8 flex gap-2">
          <Button className="flex-1" onClick={backToParty}>Palaa partyyn</Button>
          <Button variant="secondary" className="flex-1 gap-2" onClick={doLeave}>
            <Home className="h-4 w-4" /> Palaa kotiin
          </Button>
        </div>
      </div>
    );
  }

  /* ---------------- Lobby ---------------- */
  return (
    <div className="min-h-screen px-4 py-8 max-w-[720px] mx-auto">
      <div className="flex items-center justify-between">
        <Link to="/multiplayer" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Takaisin
        </Link>
        <button onClick={doLeave} className="text-xs text-destructive flex items-center gap-1">
          <LogOut className="h-3 w-3" /> Poistu
        </button>
      </div>
      <h1 className="mt-4 text-3xl font-black">Party</h1>

      <div className="mt-4 grid md:grid-cols-2 gap-4">
        <div className="neon-panel p-4 space-y-3">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Pelin koodi</div>
          <div className="flex items-center justify-between">
            <code className="text-3xl font-black font-mono tracking-widest">{code}</code>
            <button onClick={() => navigator.clipboard?.writeText(code)} className="p-2 rounded bg-secondary">
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground opacity-70">
            Jaa koodi kavereillesi — he liittyvät Moninpeli → Liity peliin.
          </p>
        </div>

        <div className="neon-panel p-4 space-y-2">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Pelaajat {members.length}/{MAX_PLAYERS}
          </div>
          {Array.from({ length: MAX_PLAYERS }, (_, slot) => {
            const m = members[slot];
            return (
              <div key={slot} className="flex items-center gap-3 bg-background/40 rounded p-2 border border-border/40">
                {m ? (
                  <>
                    {m.user_id === uid ? (
                      <PlayerToken equipped={p.equipped} size={36} />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-bold">
                        {(m.username ?? "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="font-bold">{m.username}</div>
                    {m.user_id === party.host_id && <span className="ml-auto text-xs text-primary">Isäntä</span>}
                  </>
                ) : (
                  <div className="w-full flex items-center gap-3 text-muted-foreground">
                    <span className="h-9 w-9 rounded-full border border-dashed border-border/60 flex items-center justify-center">
                      <Plus className="h-4 w-4" />
                    </span>
                    <span className="text-sm">Tyhjä paikka</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex gap-2 flex-wrap">
        <button className="neon-panel px-3 py-2 text-sm flex items-center gap-2" onClick={() => setShowSettings((v) => !v)}>
          <SettingsIcon className="h-4 w-4" /> Asetukset
        </button>
        <button className="neon-panel px-3 py-2 text-sm" onClick={() => setShowPacks((v) => !v)}>
          Valitse paketit ({packs.length})
        </button>
        <Button className="ml-auto gap-2" disabled={!canStart} onClick={startMatch}>
          <Play className="h-4 w-4" /> Aloita peli
        </Button>
      </div>

      {showSettings && (
        <div className="mt-4 neon-panel p-4">
          <div className="text-sm font-bold mb-2">Kierrosten määrä: {rounds}</div>
          <input
            type="range" min={1} max={MAX_ROUNDS} value={rounds} disabled={!isHost}
            onChange={(e) => setRounds(Number(e.target.value))}
            className="w-full disabled:opacity-50"
          />
          <div className="mt-1 text-xs text-muted-foreground">Jokaisessa kierroksessa on 45 s aikaa päästä maaliin.</div>
          {!isHost && <div className="mt-1 text-[10px] text-muted-foreground">Vain isäntä voi muuttaa asetuksia.</div>}
        </div>
      )}

      {showPacks && (
        <div className="mt-4 neon-panel p-3 grid grid-cols-2 gap-2 max-h-64 overflow-auto">
          {PACKS.map((pk) => (
            <button
              key={pk.id}
              onClick={() => togglePack(pk.id)}
              disabled={!isHost}
              className={`text-left p-3 rounded border ${packs.includes(pk.id) ? "border-primary bg-primary/20" : "border-border/40 bg-background/40"}`}
            >
              <div className="text-[10px] uppercase text-muted-foreground">Paketti {pk.id}</div>
              <div className="font-bold text-sm">{pk.name}</div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 neon-panel p-4 text-xs text-muted-foreground text-center">
        Eniten siirtoja jäljellä voittaa kierroksen. Tasapelissä nopeampi aika ratkaisee. Siirrot loppu = DNF.
      </div>
    </div>
  );
}
