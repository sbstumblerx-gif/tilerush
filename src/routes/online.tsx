import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Home, RotateCcw, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Board } from "@/components/game/Board";
import { AvatarBadge } from "@/components/game/AvatarBadge";
import { supabase } from "@/integrations/supabase/client";
import { loadProgress, saveProgress, addTrophies, TROPHY_ONLINE_LOSS, TROPHY_ONLINE_WIN, type Progress } from "@/lib/game/progress";
import { getLevel, LEVELS } from "@/lib/game/levels";
import { createState, tryMove } from "@/lib/game/engine";
import type { GameState, Pos } from "@/lib/game/types";
import { formatMs, pickRoundLevel, rankResults, RESULTS_MS, ROUND_MS, type RoundResult } from "@/lib/cloud/match";
import { BOT_FALLBACK_MS, joinQueue, leaveQueue, ONLINE_ROUNDS, pollQueue } from "@/lib/cloud/matchmaking";
import { BOT_ID, randomBotName, simulateBot } from "@/lib/game/bot";
import { upsertMyProfile, fetchMyProfile } from "@/lib/cloud/social";

export const Route = createFileRoute("/online")({
  head: () => ({
    meta: [
      { title: "Online-ottelu · Tile Rush" },
      { name: "description", content: "Etsi vastustaja ja pelaa kolme kierrosta pokaaleista Tile Rushissa." },
      { property: "og:title", content: "Online-ottelu · Tile Rush" },
      { property: "og:description", content: "1v1-matchmaking: kolme kierrosta, 45 sekuntia per kierros." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OnlinePage,
});

type Phase = "search" | "round" | "results" | "final" | "error";
interface Opp { id: string; name: string; avatar?: string | null; bot: boolean }

export default function noop() {}

function OnlinePage() {
  const navigate = useNavigate();
  const [p, setP] = useState<Progress | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("search");
  const [err, setErr] = useState<string | null>(null);
  const [searchMs, setSearchMs] = useState(0);
  const [opp, setOpp] = useState<Opp | null>(null);
  const [round, setRound] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [game, setGame] = useState<GameState | null>(null);
  const [startAt, setStartAt] = useState(0);
  const [ghost, setGhost] = useState<{ r: number; c: number } | null>(null);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [now, setNow] = useState(Date.now());
  const [emojiFeed, setEmojiFeed] = useState<{ id: number; userId: string; emoji: string }[]>([]);
  const [trophyDelta, setTrophyDelta] = useState<number | null>(null);

  const codeRef = useRef<string | null>(null);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const oppRef = useRef<Opp | null>(null);
  const roundRef = useRef(0);
  const startRef = useRef(0);
  const doneRef = useRef(false);
  const resultsRef = useRef<Map<string, RoundResult>>(new Map());
  const scoresRef = useRef<Record<string, number>>({});
  const timersRef = useRef<number[]>([]);
  const uidRef = useRef<string | null>(null);
  const hostRef = useRef(false);
  const finishedRef = useRef(false);

  const clearTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  };

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  /* ---------------- Match orchestration ---------------- */

  const beginRound = useCallback((r: number, levelId: number, at: number) => {
    roundRef.current = r;
    startRef.current = at;
    doneRef.current = false;
    resultsRef.current = new Map();
    setRound(r);
    setStartAt(at);
    setGhost(null);
    setResults([]);
    setGame(createState(getLevel(levelId) ?? LEVELS[0]));
    setPhase("round");

    // Botti "pelaa" oman suorituksensa
    const o = oppRef.current;
    if (o?.bot) {
      const level = getLevel(levelId) ?? LEVELS[0];
      const sim = simulateBot(level);
      timersRef.current.push(
        window.setTimeout(() => {
          resultsRef.current.set(BOT_ID, { userId: BOT_ID, movesLeft: sim.movesLeft, timeMs: sim.timeMs, dnf: sim.dnf });
          maybeEnd();
        }, Math.max(500, sim.timeMs)),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishMatch = useCallback((finalScores: Record<string, number>) => {
    const me = uidRef.current ?? "me";
    const o = oppRef.current;
    if (finishedRef.current || !o) return;
    finishedRef.current = true;
    const mine = finalScores[me] ?? 0;
    const theirs = finalScores[o.id] ?? 0;
    const delta = mine > theirs ? TROPHY_ONLINE_WIN : mine < theirs ? TROPHY_ONLINE_LOSS : 0;
    const cur = loadProgress();
    if (delta !== 0) addTrophies(cur, delta);
    if (mine > theirs) cur.stats.wins += 0; // online-voitto ei vaikuta kenttätilastoihin
    saveProgress(cur);
    setTrophyDelta(delta);
    setP(loadProgress());
  }, []);

  const endRound = useCallback(() => {
    const me = uidRef.current ?? "me";
    const o = oppRef.current;
    if (!o) return;
    const ids = [me, o.id];
    const ranked = rankResults(
      ids.map((id) => resultsRef.current.get(id) ?? { userId: id, movesLeft: 0, timeMs: ROUND_MS, dnf: true }),
    );
    const winner = ranked.find((r) => !r.dnf);
    const next = { ...scoresRef.current };
    if (winner) next[winner.userId] = (next[winner.userId] ?? 0) + 1;
    scoresRef.current = next;

    const r = roundRef.current;
    const isFinal = r >= ONLINE_ROUNDS;
    setScores(next);
    setResults(ranked);
    setGame(null);
    setPhase(isFinal ? "final" : "results");

    if (isFinal) {
      finishMatch(next);
      return;
    }
    if (hostRef.current) {
      timersRef.current.push(
        window.setTimeout(() => {
          const nr = r + 1;
          const levelId = pickRoundLevel(codeRef.current ?? "solo", nr, []);
          const at = Date.now() + 1500;
          chanRef.current?.send({ type: "broadcast", event: "start", payload: { round: nr, levelId, startAt: at, scores: next } });
          beginRound(nr, levelId, at);
        }, RESULTS_MS),
      );
    }
  }, [beginRound, finishMatch]);

  const maybeEnd = useCallback(() => {
    const me = uidRef.current ?? "me";
    const o = oppRef.current;
    if (!o || !hostRef.current) return;
    if (resultsRef.current.has(me) && resultsRef.current.has(o.id)) {
      clearTimers();
      endRound();
    }
  }, [endRound]);

  /* ---------------- Matchmaking ---------------- */

  const startWithBot = useCallback(() => {
    const bot: Opp = { id: BOT_ID, name: randomBotName(), avatar: null, bot: true };
    oppRef.current = bot;
    setOpp(bot);
    hostRef.current = true;
    codeRef.current = `bot-${Math.random().toString(36).slice(2, 7)}`;
    scoresRef.current = {};
    finishedRef.current = false;
    const levelId = pickRoundLevel(codeRef.current, 1, []);
    beginRound(1, levelId, Date.now() + 1500);
    leaveQueue().catch(() => null);
  }, [beginRound]);

  const connectMatch = useCallback((code: string, myId: string, myName: string, myAvatar?: string | null) => {
    codeRef.current = code;
    const ch = supabase.channel(`mm-${code}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "hello" }, ({ payload }) => {
      const d = payload as { userId: string; name: string; avatar?: string | null };
      if (d.userId === myId) return;
      const o: Opp = { id: d.userId, name: d.name, avatar: d.avatar ?? null, bot: false };
      oppRef.current = o;
      setOpp(o);
      hostRef.current = myId < d.userId;
      ch.send({ type: "broadcast", event: "hello-ack", payload: { userId: myId, name: myName, avatar: myAvatar } });
      if (hostRef.current && roundRef.current === 0) {
        scoresRef.current = {};
        finishedRef.current = false;
        const levelId = pickRoundLevel(code, 1, []);
        const at = Date.now() + 2000;
        ch.send({ type: "broadcast", event: "start", payload: { round: 1, levelId, startAt: at, scores: {} } });
        beginRound(1, levelId, at);
      }
    })
      .on("broadcast", { event: "hello-ack" }, ({ payload }) => {
        const d = payload as { userId: string; name: string; avatar?: string | null };
        if (d.userId === myId) return;
        const o: Opp = { id: d.userId, name: d.name, avatar: d.avatar ?? null, bot: false };
        oppRef.current = o;
        setOpp(o);
        hostRef.current = myId < d.userId;
      })
      .on("broadcast", { event: "start" }, ({ payload }) => {
        const d = payload as { round: number; levelId: number; startAt: number; scores: Record<string, number> };
        scoresRef.current = d.scores ?? {};
        setScores(d.scores ?? {});
        beginRound(d.round, d.levelId, d.startAt);
      })
      .on("broadcast", { event: "pos" }, ({ payload }) => {
        const d = payload as { userId: string; r: number; c: number };
        if (d.userId === myId) return;
        setGhost({ r: d.r, c: d.c });
      })
      .on("broadcast", { event: "result" }, ({ payload }) => {
        const d = payload as RoundResult & { round: number };
        if (d.round !== roundRef.current) return;
        resultsRef.current.set(d.userId, { userId: d.userId, movesLeft: d.movesLeft, timeMs: d.timeMs, dnf: d.dnf });
        maybeEnd();
      })
      .on("broadcast", { event: "emoji" }, ({ payload }) => {
        const d = payload as { userId: string; emoji: string };
        if (loadProgress().settings.showEmojis === false) return;
        const item = { id: Date.now() + Math.random(), userId: d.userId, emoji: d.emoji };
        setEmojiFeed((f) => [...f.slice(-4), item]);
        window.setTimeout(() => setEmojiFeed((f) => f.filter((x) => x.id !== item.id)), 2500);
      })
      .subscribe(() => {
        ch.send({ type: "broadcast", event: "hello", payload: { userId: myId, name: myName, avatar: myAvatar } });
      });
    chanRef.current = ch;
  }, [beginRound, maybeEnd]);

  useEffect(() => {
    let cancelled = false;
    let poll = 0;
    let tick = 0;
    (async () => {
      const progress = loadProgress();
      setP(progress);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setErr("Kirjaudu sisään pelatäksesi onlineotteluita."); setPhase("error"); return; }
      if (cancelled) return;
      uidRef.current = user.id;
      setUid(user.id);
      const myName = progress.profile.username || "Pelaaja";
      const myAvatar = progress.equipped.avatar ?? null;
      await upsertMyProfile({ username: myName, avatar_team: myAvatar }).catch(() => null);

      const started = Date.now();
      tick = window.setInterval(() => setSearchMs(Date.now() - started), 200);

      const first = await joinQueue();
      if (cancelled) return;
      if (first) { window.clearInterval(tick); connectMatch(first, user.id, myName, myAvatar); return; }

      poll = window.setInterval(async () => {
        const code = await pollQueue();
        if (cancelled) return;
        if (code) {
          window.clearInterval(poll);
          window.clearInterval(tick);
          connectMatch(code, user.id, myName, myAvatar);
          return;
        }
        if (Date.now() - started >= BOT_FALLBACK_MS) {
          window.clearInterval(poll);
          window.clearInterval(tick);
          startWithBot();
        }
      }, 1200);
    })();
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.clearInterval(tick);
      clearTimers();
      leaveQueue().catch(() => null);
      if (chanRef.current) { supabase.removeChannel(chanRef.current); chanRef.current = null; }
    };
  }, [connectMatch, startWithBot]);

  /* ---------------- Round timer ---------------- */

  const submit = useCallback((movesLeft: number, timeMs: number, dnf: boolean) => {
    const me = uidRef.current ?? "me";
    if (doneRef.current) return;
    doneRef.current = true;
    resultsRef.current.set(me, { userId: me, movesLeft, timeMs, dnf });
    chanRef.current?.send({ type: "broadcast", event: "result", payload: { userId: me, round: roundRef.current, movesLeft, timeMs, dnf } });
    maybeEnd();
  }, [maybeEnd]);

  const roundEndsAt = phase === "round" ? startAt + ROUND_MS : 0;
  const secondsLeft = roundEndsAt ? Math.max(0, Math.ceil((roundEndsAt - now) / 1000)) : 0;

  useEffect(() => {
    if (phase !== "round" || !roundEndsAt || now < roundEndsAt) return;
    submit(0, ROUND_MS, true);
    if (hostRef.current) {
      clearTimers();
      timersRef.current.push(window.setTimeout(() => endRound(), 1200));
    }
  }, [endRound, now, phase, roundEndsAt, submit]);

  const onTileClick = (pos: Pos) => {
    if (!game || doneRef.current || now < startAt) return;
    const next = tryMove(game, pos);
    setGame(next);
    chanRef.current?.send({ type: "broadcast", event: "pos", payload: { userId: uidRef.current, r: next.player.r, c: next.player.c } });
    if (next.status === "won") submit(next.movesLeft, Date.now() - startAt, false);
    else if (next.status === "lost") submit(0, Date.now() - startAt, true);
  };

  const sendEmoji = (emoji: string) =>
    chanRef.current?.send({ type: "broadcast", event: "emoji", payload: { userId: uidRef.current, emoji } });

  const nameOf = (id: string) => (id === (uid ?? "me") ? (p?.profile.username ?? "Sinä") : (opp?.name ?? "Vastustaja"));

  if (phase === "error") {
    return (
      <div className="min-h-screen px-4 py-8 max-w-[420px] mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Lobby
        </Link>
        <div className="mt-8 neon-panel p-4 text-sm">{err}</div>
      </div>
    );
  }

  if (phase === "search") {
    return (
      <div className="min-h-screen px-4 py-8 max-w-[420px] mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Lobby
        </Link>
        <h1 className="mt-4 text-3xl font-black flex items-center gap-2">
          <Swords className="h-6 w-6" /> Online-ottelu
        </h1>
        <div className="mt-8 neon-panel p-8 text-center">
          <div className="text-5xl animate-pulse">🔍</div>
          <div className="mt-4 font-black">Etsitään vastustajaa…</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {Math.max(0, Math.ceil((BOT_FALLBACK_MS - searchMs) / 1000))} s kuluttua vastustajaksi asetetaan botti
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground text-center">
          3 kierrosta · 45 s / kierros · voitto +{TROPHY_ONLINE_WIN} 🏆, tappio {TROPHY_ONLINE_LOSS} 🏆
        </p>
      </div>
    );
  }

  const myEmojis = p?.equipped.emojis ?? ["🎮", "⚡", "🌟", "🏆"];

  if (phase === "round" && game) {
    const started = now >= startAt;
    return (
      <div className="min-h-screen px-4 py-6 max-w-[560px] mx-auto">
        <div className="flex items-center justify-between text-sm">
          <div className="font-bold">Kierros {round}/{ONLINE_ROUNDS}</div>
          <div className={`font-mono font-black ${secondsLeft <= 10 ? "text-destructive" : ""}`}>{secondsLeft}s</div>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Siirrot: <span className="font-bold text-foreground">{game.movesLeft}</span></span>
          <span className="inline-flex items-center gap-2">
            <AvatarBadge avatar={opp?.avatar} name={opp?.name} size={22} />
            {opp?.name}{opp?.bot ? " (botti)" : ""}
          </span>
        </div>
        {!started && <div className="mt-4 neon-panel p-4 text-center font-black">Valmiina… peli alkaa!</div>}
        <div className="mt-4">
          <Board
            state={game}
            onTileClick={onTileClick}
            ghosts={ghost ? [{ r: ghost.r, c: ghost.c, label: opp?.name ?? "Vastustaja" }] : []}
          />
        </div>
        {doneRef.current && (
          <div className="mt-3 neon-panel p-3 text-center text-sm">
            {game.status === "won" ? "🏁 Maalissa! Odotetaan vastustajaa…" : "❌ DNF – odotetaan vastustajaa…"}
          </div>
        )}
        {!opp?.bot && (
          <div className="mt-4 flex gap-2 justify-center">
            {myEmojis.map((e, i) => (
              <button key={i} onClick={() => sendEmoji(e)} className="neon-panel px-3 py-2 text-xl">{e}</button>
            ))}
          </div>
        )}
        {emojiFeed.length > 0 && (
          <div className="mt-3 space-y-1 text-xs text-muted-foreground text-center">
            {emojiFeed.map((e) => (
              <div key={e.id}>{nameOf(e.userId)}: <span className="text-lg">{e.emoji}</span></div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (phase === "results") {
    const best = results.find((r) => !r.dnf);
    return (
      <div className="min-h-screen px-4 py-8 max-w-[480px] mx-auto">
        <h1 className="text-2xl font-black">Kierros {round} · tulokset</h1>
        <div className="mt-4 space-y-2">
          {results.map((r, i) => (
            <div key={r.userId} className="neon-panel p-3 flex items-center gap-3 text-sm">
              <span className="w-6 font-black">{r.dnf ? "–" : i + 1}</span>
              <span className="font-bold flex-1">{nameOf(r.userId)}</span>
              {r.dnf ? <span className="text-destructive font-bold">DNF</span> : (
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
        <div className="mt-4 neon-panel p-3 text-sm flex justify-between">
          <span>{p?.profile.username ?? "Sinä"}: <b>{scores[uid ?? "me"] ?? 0}</b></span>
          <span>{opp?.name}: <b>{scores[opp?.id ?? ""] ?? 0}</b></span>
        </div>
        <div className="mt-6 text-xs text-muted-foreground text-center">Seuraava kierros alkaa hetken kuluttua…</div>
      </div>
    );
  }

  // final
  const mine = scores[uid ?? "me"] ?? 0;
  const theirs = scores[opp?.id ?? ""] ?? 0;
  return (
    <div className="min-h-screen px-4 py-8 max-w-[480px] mx-auto text-center">
      <h1 className="text-3xl font-black">
        {mine > theirs ? "🏆 Voitto!" : mine < theirs ? "💀 Tappio" : "🤝 Tasapeli"}
      </h1>
      <div className="mt-4 neon-panel p-5 flex items-center justify-around">
        <div>
          <AvatarBadge avatar={p?.equipped.avatar} name={p?.profile.username} size={48} />
          <div className="mt-2 text-sm font-bold">{p?.profile.username}</div>
          <div className="text-3xl font-black">{mine}</div>
        </div>
        <div className="text-muted-foreground font-black">–</div>
        <div>
          <AvatarBadge avatar={opp?.avatar} name={opp?.name} size={48} />
          <div className="mt-2 text-sm font-bold">{opp?.name}</div>
          <div className="text-3xl font-black">{theirs}</div>
        </div>
      </div>
      {trophyDelta !== null && (
        <div className="mt-4 text-lg font-black">
          {trophyDelta > 0 ? `+${trophyDelta}` : trophyDelta} 🏆 pokaalia
        </div>
      )}
      <div className="mt-6 flex flex-col gap-2">
        <Button className="w-full gap-2" onClick={() => window.location.reload()}>
          <RotateCcw className="h-4 w-4" /> Uusi ottelu
        </Button>
        <Button variant="secondary" className="w-full gap-2" onClick={() => navigate({ to: "/" })}>
          <Home className="h-4 w-4" /> Palaa kotiin
        </Button>
      </div>
    </div>
  );
}
