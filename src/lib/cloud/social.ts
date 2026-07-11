import { supabase } from "@/integrations/supabase/client";

export interface CloudProfile {
  user_id: string;
  username: string;
  friend_code: string;
  avatar_team: string | null;
}

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function fetchMyProfile(): Promise<CloudProfile | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const { data } = await supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle();
  
  if (data) {
    const prof = data as CloudProfile;
    // Automaattinen korjaus/synkronointi: Jos tietokannassa oleva koodi on väärän pituinen,
    // ajetaan upsert heti uusilla säännöillä ja palautetaan korjattu profiili.
    if (!prof.friend_code || prof.friend_code.length !== 6) {
      const correctedCode = uid.slice(0, 6).toLowerCase();
      prof.friend_code = correctedCode;
      // Päivitetään korjattu koodi taustalla tietokantaan
      await supabase.from("profiles").upsert({
        user_id: uid,
        friend_code: correctedCode
      }, { onConflict: 'user_id' });
    }
    return prof;
  }
  
  return null;
}

export async function upsertMyProfile(
  patch: Partial<Pick<CloudProfile, "username" | "avatar_team">>,
): Promise<void> {
  try {
    const uid = await currentUserId();
    if (!uid) return;
    
    const targetCode = uid.slice(0, 6).toLowerCase();
    
    await supabase.from("profiles").upsert({
      user_id: uid,
      username: patch.username || "Pelaaja",
      friend_code: targetCode,
      ...patch
    }, { onConflict: 'user_id' });
  } catch (e) {
    console.error("Profiilin päivitys epäonnistui:", e);
  }
}

    
    // FIKSI: Otetaan vain 6 merkkiä user_id:n alusta, jotta se täsmää Friends.js:n maxLength={6} kanssa
    await supabase.from("profiles").upsert({
      user_id: uid,
      username: patch.username || "Pelaaja",
      friend_code: uid.slice(0, 6).toLowerCase(),
      ...patch
    }, { onConflict: 'user_id' });
  } catch (e) {
    console.error("Profiilin päivitys epäonnistui:", e);
  }
}

/* -------- Friends -------- */

export async function listFriends(): Promise<CloudProfile[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data: rels } = await supabase.from("friendships").select("friend_id").eq("user_id", uid);
  const ids = (rels ?? []).map((r) => r.friend_id as string);
  if (ids.length === 0) return [];
  const { data: profs } = await supabase.from("profiles").select("*").in("user_id", ids);
  return (profs as CloudProfile[]) ?? [];
}

export interface FriendRequestRow {
  id: string;
  from_user: string;
  to_user: string;
  profile?: CloudProfile;
}

export async function listRequests(): Promise<{ incoming: FriendRequestRow[]; outgoing: FriendRequestRow[] }> {
  const uid = await currentUserId();
  if (!uid) return { incoming: [], outgoing: [] };
  const { data } = await supabase
    .from("friend_requests")
    .select("id,from_user,to_user")
    .or(`from_user.eq.${uid},to_user.eq.${uid}`);
  const rows = (data as FriendRequestRow[]) ?? [];
  const otherIds = Array.from(new Set(rows.map((r) => (r.from_user === uid ? r.to_user : r.from_user))));
  const { data: profs } = otherIds.length
    ? await supabase.from("profiles").select("*").in("user_id", otherIds)
    : { data: [] as CloudProfile[] };
  const byId = new Map((profs ?? []).map((p: CloudProfile) => [p.user_id, p]));
  const attach = (r: FriendRequestRow) => ({
    ...r,
    profile: byId.get(r.from_user === uid ? r.to_user : r.from_user),
  });
  return {
    incoming: rows.filter((r) => r.to_user === uid).map(attach),
    outgoing: rows.filter((r) => r.from_user === uid).map(attach),
  };
}

export async function sendFriendRequest(code: string): Promise<{ ok: boolean; error?: string; accepted?: boolean }> {
  const uid = await currentUserId();
  if (!uid) return { ok: false, error: "Kirjaudu sisään käyttääksesi kavereita." };
  
  // Varmistetaan hakuun menevän koodin siisteytys ja pituus
  const cleanedCode = code.trim().toLowerCase().slice(0, 6);
  
  const { data, error } = await supabase.rpc("send_friend_request_by_code", { _code: cleanedCode });
  if (error) return { ok: false, error: error.message };
  return { ok: true, accepted: data === null };
}

export async function acceptRequest(requestId: string): Promise<void> {
  await supabase.rpc("accept_friend_request", { _request_id: requestId });
}

export async function deleteRequest(requestId: string): Promise<void> {
  await supabase.from("friend_requests").delete().eq("id", requestId);
}

export async function removeFriend(friendId: string): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  await supabase.from("friendships").delete().eq("user_id", uid).eq("friend_id", friendId);
  await supabase.from("friendships").delete().eq("user_id", friendId).eq("friend_id", uid);
}

/* -------- Parties -------- */

export interface PartyRow {
  code: string;
  host_id: string;
  rounds: number;
  packs: number[];
  status: string;
}

export async function createParty(rounds: number, packs: number[]): Promise<PartyRow | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const code = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const { data, error } = await supabase
    .from("parties")
    .insert({ code, host_id: uid, rounds, packs })
    .select("*")
    .single();
  if (error || !data) return null;
  await supabase.from("party_members").insert({ party_code: code, user_id: uid });
  return data as PartyRow;
}

export async function getParty(code: string): Promise<PartyRow | null> {
  const { data } = await supabase.from("parties").select("*").eq("code", code).maybeSingle();
  return (data as PartyRow | null) ?? null;
}

export async function joinParty(code: string): Promise<{ ok: boolean; error?: string }> {
  const uid = await currentUserId();
  if (!uid) return { ok: false, error: "Kirjaudu sisään liittyäksesi." };
  const party = await getParty(code);
  if (!party) return { ok: false, error: "Peliä ei löytynyt." };
  const { count } = await supabase
    .from("party_members")
    .select("*", { count: "exact", head: true })
    .eq("party_code", code);
  if ((count ?? 0) >= 4) return { ok: false, error: "Peli on täynnä." };
  const { error } = await supabase.from("party_members").insert({ party_code: code, user_id: uid });
  if (error && !String(error.message).includes("duplicate")) return { ok: false, error: error.message };
  return { ok: true };
}

export async function leaveParty(code: string): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  await supabase.from("party_members").delete().eq("party_code", code).eq("user_id", uid);
}

export async function listPartyMembers(code: string): Promise<CloudProfile[]> {
  const { data: mem } = await supabase.from("party_members").select("user_id").eq("party_code", code);
  const ids = (mem ?? []).map((m) => m.user_id as string);
  if (ids.length === 0) return [];
  const { data: profs } = await supabase.from("profiles").select("*").in("user_id", ids);
  return (profs as CloudProfile[]) ?? [];
}

export async function updatePartySettings(code: string, patch: Partial<Pick<PartyRow, "rounds" | "packs" | "status">>): Promise<void> {
  await supabase.from("parties").update(patch).eq("code", code);
                                          }

