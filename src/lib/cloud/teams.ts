import { supabase } from "@/integrations/supabase/client";
import { currentUserId, type CloudProfile } from "./social";

export const TEAM_MAX_MEMBERS = 30;

export interface TeamRow {
  id: string;
  code: string;
  name: string;
  description: string;
  owner_id: string;
  max_members: number;
  created_at: string;
}

export interface TeamMemberRow {
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: CloudProfile;
}

export interface TeamMessageRow {
  id: string;
  team_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export type GiftKind = "key" | "backpack" | "box" | "heart" | "coins";

export interface TeamGiftRow {
  id: string;
  team_id: string;
  from_user: string;
  to_user: string;
  kind: GiftKind;
  amount: number;
  rarity: string | null;
  claimed_at: string | null;
  created_at: string;
}

/** Oma joukkue, tai null. */
export async function myTeam(): Promise<{ team: TeamRow; role: string } | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const { data: mem } = await supabase
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", uid)
    .maybeSingle();
  if (!mem) return null;
  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", (mem as { team_id: string }).team_id)
    .maybeSingle();
  if (!team) return null;
  return { team: team as unknown as TeamRow, role: (mem as { role: string }).role };
}

export async function createTeam(name: string, description: string): Promise<TeamRow | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const { data, error } = await supabase
    .from("teams")
    .insert({ owner_id: uid, name: name.slice(0, 24) || "Joukkue", description: description.slice(0, 120) })
    .select("*")
    .single();
  if (error || !data) return null;
  const team = data as unknown as TeamRow;
  await supabase.from("team_members").insert({ team_id: team.id, user_id: uid, role: "leader" });
  return team;
}

export async function findTeamByCode(code: string): Promise<TeamRow | null> {
  const { data } = await supabase
    .from("teams")
    .select("*")
    .eq("code", code.trim().toLowerCase())
    .maybeSingle();
  return (data as unknown as TeamRow | null) ?? null;
}

export async function listTeams(limit = 20): Promise<TeamRow[]> {
  const { data } = await supabase
    .from("teams")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as unknown as TeamRow[]) ?? [];
}

export async function joinTeam(code: string): Promise<{ ok: boolean; error?: string; team?: TeamRow }> {
  const uid = await currentUserId();
  if (!uid) return { ok: false, error: "Kirjaudu sisään liittyäksesi joukkueeseen." };
  const team = await findTeamByCode(code);
  if (!team) return { ok: false, error: "Joukkuetta ei löytynyt." };
  const { error } = await supabase.from("team_members").insert({ team_id: team.id, user_id: uid });
  if (error) {
    if (String(error.message).includes("täynnä")) return { ok: false, error: "Joukkue on täynnä (30/30)." };
    if (String(error.message).includes("duplicate")) return { ok: false, error: "Olet jo joukkueessa." };
    return { ok: false, error: error.message };
  }
  return { ok: true, team };
}

export async function leaveTeam(teamId: string): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  await supabase.from("team_members").delete().eq("team_id", teamId).eq("user_id", uid);
}

export async function kickMember(teamId: string, userId: string): Promise<void> {
  await supabase.from("team_members").delete().eq("team_id", teamId).eq("user_id", userId);
}

export async function listMembers(teamId: string): Promise<TeamMemberRow[]> {
  const { data } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", teamId)
    .order("joined_at", { ascending: true });
  const rows = (data as unknown as TeamMemberRow[]) ?? [];
  const ids = rows.map((r) => r.user_id);
  if (ids.length === 0) return rows;
  const { data: profs } = await supabase.from("profiles").select("*").in("user_id", ids);
  const byId = new Map(((profs as CloudProfile[]) ?? []).map((p) => [p.user_id, p]));
  return rows.map((r) => ({ ...r, profile: byId.get(r.user_id) }));
}

export async function listMessages(teamId: string, limit = 60): Promise<TeamMessageRow[]> {
  const { data } = await supabase
    .from("team_messages")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data as unknown as TeamMessageRow[]) ?? []).slice().reverse();
}

export async function sendMessage(teamId: string, body: string): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  const text = body.trim().slice(0, 240);
  if (!text) return;
  await supabase.from("team_messages").insert({ team_id: teamId, user_id: uid, body: text });
}

export async function sendGift(
  teamId: string,
  toUser: string,
  kind: GiftKind,
  amount = 1,
  rarity: string | null = null,
): Promise<{ ok: boolean; error?: string }> {
  const uid = await currentUserId();
  if (!uid) return { ok: false, error: "Kirjaudu sisään." };
  const { error } = await supabase
    .from("team_gifts")
    .insert({ team_id: teamId, from_user: uid, to_user: toUser, kind, amount, rarity });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Lahjat, jotka odottavat minua. */
export async function listMyGifts(teamId: string): Promise<TeamGiftRow[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data } = await supabase
    .from("team_gifts")
    .select("*")
    .eq("team_id", teamId)
    .eq("to_user", uid)
    .is("claimed_at", null)
    .order("created_at", { ascending: false });
  return (data as unknown as TeamGiftRow[]) ?? [];
}

export async function markGiftClaimed(giftId: string): Promise<void> {
  await supabase.from("team_gifts").update({ claimed_at: new Date().toISOString() }).eq("id", giftId);
}
