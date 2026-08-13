import { supabase } from "@/integrations/supabase/client";
import { currentUserId, type CloudProfile } from "./social";

/** Liigaviikko 1 alkoi maanantaina 10.8.2026 00:00 UTC. */
export const LEAGUE_EPOCH_MS = 1786320000_000;
export const LEAGUE_WEEK_MS = 604_800_000;

export const TIERS = ["puu", "pronssi", "hopea", "kulta", "timantti", "ultra"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_LABEL: Record<Tier, string> = {
  puu: "🪵 Puu",
  pronssi: "🥉 Pronssi",
  hopea: "🥈 Hopea",
  kulta: "🥇 Kulta",
  timantti: "💎 Timantti",
  ultra: "🔮 Ultra",
};

export function currentLeagueWeek(): number {
  return 1 + Math.floor((Date.now() - LEAGUE_EPOCH_MS) / LEAGUE_WEEK_MS);
}

/** Aika seuraavaan maanantaihin 00:00 UTC. */
export function msUntilLeagueReset(): number {
  const elapsed = (Date.now() - LEAGUE_EPOCH_MS) % LEAGUE_WEEK_MS;
  return LEAGUE_WEEK_MS - elapsed;
}

/** Nousu- ja putoamispaikat: 35 % / 30 % / 35 %, nousu etusijalla pienissä divisioonissa. */
export function slots(n: number): { up: number; down: number } {
  if (n <= 1) return { up: 0, down: 0 };
  const up = Math.ceil(n * 0.35);
  let down = Math.floor(n * 0.35);
  if (up + down > n) down = Math.max(0, n - up);
  return { up, down };
}

export interface TeamStanding {
  team_id: string;
  name: string;
  tier: Tier;
  trophies: number;
  rank: number;
  outcome: "up" | "stay" | "down";
  top3: boolean;
}

export interface MemberContribution {
  user_id: string;
  trophies: number;
  profile?: CloudProfile;
}

export interface LeagueRewardRow {
  id: string;
  week: number;
  kind: string;
  amount: number;
  rarity: string | null;
  reason: string;
  claimed_at: string | null;
}

/** Ajaa viikonvaihdon (turvallinen kutsua usein). */
export async function settleLeague(): Promise<void> {
  await supabase.rpc("league_settle");
}

/** Kirjaa pokaalit omalle joukkueelle kuluvalle liigaviikolle. */
export async function addLeagueTrophies(amount: number): Promise<void> {
  if (amount <= 0) return;
  await supabase.rpc("league_add_trophies", { _amount: Math.round(amount) });
}

/** Divisioonan taulukko kuluvalta liigaviikolta. */
export async function tierStandings(tier: Tier): Promise<TeamStanding[]> {
  const week = currentLeagueWeek();
  const [{ data: teams }, { data: scores }] = await Promise.all([
    supabase.from("teams").select("id, name, tier, created_at").eq("tier", tier),
    supabase.from("league_scores").select("team_id, trophies").eq("week", week),
  ]);
  const totals = new Map<string, number>();
  for (const s of (scores as { team_id: string; trophies: number }[]) ?? []) {
    totals.set(s.team_id, (totals.get(s.team_id) ?? 0) + (s.trophies ?? 0));
  }
  const rows = ((teams as { id: string; name: string; tier: string; created_at: string }[]) ?? [])
    .map((t) => ({ team_id: t.id, name: t.name, tier: t.tier as Tier, trophies: totals.get(t.id) ?? 0, created_at: t.created_at }))
    .sort((a, b) => b.trophies - a.trophies || a.created_at.localeCompare(b.created_at));
  const { up, down } = slots(rows.length);
  return rows.map((r, i) => ({
    team_id: r.team_id,
    name: r.name,
    tier: r.tier,
    trophies: r.trophies,
    rank: i + 1,
    outcome: i < up ? "up" : i >= rows.length - down ? "down" : "stay",
    top3: i < 3,
  }));
}

/** Jäsenten panokset kuluvalla liigaviikolla. */
export async function memberContributions(teamId: string): Promise<MemberContribution[]> {
  const week = currentLeagueWeek();
  const { data } = await supabase
    .from("league_scores")
    .select("user_id, trophies")
    .eq("week", week)
    .eq("team_id", teamId);
  const rows = ((data as { user_id: string; trophies: number }[]) ?? []).slice()
    .sort((a, b) => b.trophies - a.trophies);
  if (rows.length === 0) return rows;
  const { data: profs } = await supabase.from("profiles").select("*").in("user_id", rows.map((r) => r.user_id));
  const byId = new Map(((profs as CloudProfile[]) ?? []).map((p) => [p.user_id, p]));
  return rows.map((r) => ({ ...r, profile: byId.get(r.user_id) }));
}

export async function myLeagueRewards(): Promise<LeagueRewardRow[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data } = await supabase
    .from("league_rewards")
    .select("id, week, kind, amount, rarity, reason, claimed_at")
    .eq("user_id", uid)
    .is("claimed_at", null)
    .order("created_at", { ascending: false });
  return (data as unknown as LeagueRewardRow[]) ?? [];
}

export async function claimLeagueReward(id: string): Promise<void> {
  await supabase.from("league_rewards").update({ claimed_at: new Date().toISOString() }).eq("id", id);
}