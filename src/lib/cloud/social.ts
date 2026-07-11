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
    // Automaattinen korjaus/synkronointi: Jos koodi on väärän pituinen, korjataan se 6-merkkiseksi
    if (!prof.friend_code || prof.friend_code.length !== 6) {
      const correctedCode = uid.slice(0, 6).toLowerCase();
      prof.friend_code = correctedCode;
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

/* -------- Friends -------- */

export async function listFriends(): Promise<CloudProfile[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data: rels } = await supabase.from("friendships").select("friend_id").eq
  
