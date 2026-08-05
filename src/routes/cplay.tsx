import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useCallback, useEffect, useState } from "react";
import { Board } from "@/components/game/Board";
import { HUD } from "@/components/game/HUD";
import { Button } from "@/components/ui/button";
import { createState, selectItem, tryMove, tryTnt, tryVolleyball } from "@/lib/game/engine";
import type { GameState, LevelDef, Pos } from "@/lib/game/types";
import { getCommunityLevel, getCommunityLevels, getCommunityPack, toLevelDef } from "@/lib/cloud/community";
import { loadProgress, saveProgress, awardPlayerPackTrophies, markStart, TROPHY_PLAYER_PACK } from "@/lib/game/progress";
import { playSfx } from "@/lib/game/sound";

const searchSchema = z.object({
  level: z.string().optional(),
  pack: z.string().optional(),
  i: z.coerce.number().int().min(0).default(0),
});

export const Route = createFileRoute("/cplay")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Yhteisökenttä · Tile Rush" },
      { name: "description", content: "Pelaa muiden pelaajien tekemiä Tile Rush -kenttiä ja paketteja koodilla." },
      { property: "og:title", content: "Yhteisökenttä · Tile Rush" },
      { property: "og:description", content: "Pelaajien luomat kentät ja paketit tuovat pokaaleja pokaalipolulle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CommunityPlay,
});

function CommunityPlay() {
  const { level: levelCode, pack: packCode, i } = Route.useSearch();
  const navigate = useNavigate();
  const [defs, setDefs] = useState<LevelDef[] | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [packName, setPackName] = useState<string>("");
  const [state, setState] = useState<GameState | null>(null);
  const [ended, setEnded] = useState(false);
  const [trophyMsg, setTrophyMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (packCode) {
        const pack = await getCommunityPack(packCode);
        if (!pack) { if (alive) setError("Pakettia ei löytynyt."); return; }
        const levels = await getCommunityLevels(pack.level_codes);
        if (!alive) return;
        setPackName(pack.name);
        setCodes(levels.map((l) => l.code));
        setDefs(levels.map(toLevelDef));
      } else if (levelCode) {
        const l = await getCommunityLevel(levelCode);
        if (!l) { if (alive) setError("Kenttää ei löytynyt."); return; }
        if (!alive) return;
        setCodes([l.code]);
        setDefs([toLevelDef(l)]);
      } else {
        setError("Anna kentän tai paketin koodi.");
      }
    })();
    return () => { alive = false; };
  }, [levelCode, packCode]);

  const def = defs?.[i] ?? null;

  useEffect(() => {
    if (!def) return;
    setState(createState(def));
    setEnded(false);
    setTrophyMsg(null);
    markStart();
  }, [def]);

  useEffect(() => {
    if (!state || !def || ended) return;
    if (state.status === "won") {
      playSfx("win");
      const p = loadProgress();
      const code = codes[i];
      if (code && !p.communityCompleted.includes(code)) p.communityCompleted.push(code);
      const isLast = i === (defs?.length ?? 1) - 1;
      if (isLast && packCode) {
        const res = awardPlayerPackTrophies(p, packCode);
        if (res === "granted") setTrophyMsg(`🏆 +${TROPHY_PLAYER_PACK} pokaalia paketista!`);
        else if (res === "capped") setTrophyMsg("Päivän pelaajapakettipalkinnot (5) on jo käytetty.");
      }
      saveProgress(p);
      setEnded(true);
    } else if (state.status === "lost") {
      playSfx("lose");
      setEnded(true);
    }
  }, [state, def, ended, codes, i, defs, packCode]);

  const handleTile = useCallback((pos: Pos) => {
    setState((s) => {
      if (!s) return s;
      if (s.aimingItem === "volleyball") return tryVolleyball(s, pos);
      if (s.aimingItem === "tnt") return tryTnt(s, pos);
      return tryMove(s, pos);
    });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        <div className="neon-panel p-5 text-center">
          <div className="font-black">{error}</div>
          <Button className="mt-3" onClick={() => navigate({ to: "/levels" })}>Kentät</Button>
        </div>
      </div>
    );
  }

  if (!def || !state) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Ladataan…</div>;
  }

  const hasNext = i < (defs?.length ?? 1) - 1;

  return (
    <div className="min-h-screen flex flex-col items-center px-3 py-6 gap-4">
      <HUD
        state={state}
        levelName={packCode ? `${packName} · ${i + 1}/${defs?.length}` : def.name}
        onSelectItem={(it) => setState((s) => (s ? selectItem(s, it) : s))}
        onRestart={() => setState(createState(def))}
        onExit={() => navigate({ to: "/levels" })}
      />

      <Board state={state} onTileClick={handleTile} />

      {state.status !== "playing" && (
        <div className="neon-panel w-full max-w-[420px] p-5 text-center flex flex-col gap-3">
          <div className="text-2xl font-black">{state.status === "won" ? "🏆 Voitto!" : "💀 Häviö"}</div>
          <div className="text-sm text-muted-foreground">
            {state.status === "won" ? `${state.movesLeft} siirtoa jäljellä` : "Siirrot loppuivat."}
          </div>
          {trophyMsg && <div className="text-sm font-bold text-primary">{trophyMsg}</div>}
          <div className="flex gap-2 justify-center flex-wrap">
            <Button variant="secondary" onClick={() => setState(createState(def))}>Uudelleen</Button>
            {state.status === "won" && hasNext && (
              <Button onClick={() => navigate({ to: "/cplay", search: { level: levelCode, pack: packCode, i: i + 1 } })}>
                Seuraava kenttä
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate({ to: "/levels" })}>Kentät</Button>
          </div>
        </div>
      )}
    </div>
  );
}
