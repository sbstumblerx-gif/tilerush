import { sv, SV_APP_ID } from "./client";
import { loadProgress, saveProgress, trophyLevel } from "@/lib/game/progress";

export interface SvUser {
  id: string;
  email: string | null;
}

export async function svUser(): Promise<SvUser | null> {
  const { data } = await sv.auth.getUser();
  if (!data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

export async function svSignIn(email: string, password: string): Promise<string | null> {
  const { error } = await sv.auth.signInWithPassword({ email, password });
  return error?.message ?? null;
}

export async function svSignUp(email: string, password: string): Promise<string | null> {
  const { error } = await sv.auth.signUp({ email, password });
  return error?.message ?? null;
}

export async function svSignInGoogle(): Promise<string | null> {
  const { error } = await sv.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.href },
  });
  return error?.message ?? null;
}

export async function svSignOut(): Promise<void> {
  await sv.auth.signOut();
}

/** Onko tämä käyttäjä linkittänyt Tile Rushin SV Accountiin. */
export async function svIsLinked(userId: string): Promise<boolean> {
  const { data } = await sv
    .from("app_links")
    .select("user_id")
    .eq("user_id", userId)
    .eq("app", SV_APP_ID)
    .maybeSingle();
  return !!data;
}

/** Linkitä sovellus + synkkaa pelidata. Palauttaa true jos linkitys onnistui. */
export async function svLink(): Promise<{ ok: boolean; error?: string; firstLink?: boolean }> {
  const user = await svUser();
  if (!user) return { ok: false, error: "Kirjaudu ensin SV Accountiin." };
  const already = await svIsLinked(user.id);
  const p = loadProgress();
  const { error } = await sv
    .from("app_links")
    .upsert(
      { user_id: user.id, app: SV_APP_ID, app_username: p.profile.username },
      { onConflict: "user_id,app" },
    );
  if (error) return { ok: false, error: error.message };
  await svSyncData();
  return { ok: true, firstLink: !already };
}

export async function svUnlink(): Promise<void> {
  const user = await svUser();
  if (!user) return;
  await sv.from("app_links").delete().eq("user_id", user.id).eq("app", SV_APP_ID);
}

/** Kirjoita pelin tilastot SV Accountin tile_rush_data-tauluun. */
export async function svSyncData(currentTeam?: string | null): Promise<void> {
  const user = await svUser();
  if (!user) return;
  const p = loadProgress();
  await sv.from("tile_rush_data").upsert(
    {
      user_id: user.id,
      profile_name: p.profile.username,
      friend_code: p.profile.friendCode,
      current_team: currentTeam ?? null,
      stats: {
        matches: p.stats.starts ?? 0,
        wins: p.stats.wins ?? 0,
        score: p.trophies ?? 0,
        trophies: p.trophies ?? 0,
        trophyLevel: trophyLevel(p.trophies ?? 0),
        coins: p.coins,
        gems: p.gems ?? 0,
      },
    },
    { onConflict: "user_id" },
  );
  await sv
    .from("app_links")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("app", SV_APP_ID);
}

/** SV Accountin kaverit, jotka pelaavat myös Tile Rushia (vain luku). */
export async function svFriendsInGame(): Promise<{ user_id: string; app_username: string | null }[]> {
  const user = await svUser();
  if (!user) return [];
  const { data: friends } = await sv.from("friendships").select("friend_id").eq("user_id", user.id);
  const ids = (friends ?? []).map((f: { friend_id: string }) => f.friend_id);
  if (ids.length === 0) return [];
  const { data: inGame } = await sv
    .from("app_links")
    .select("user_id, app_username")
    .eq("app", SV_APP_ID)
    .in("user_id", ids);
  return (inGame ?? []) as { user_id: string; app_username: string | null }[];
}

/** Ensilinkityksen lahja: 2x ultralaatikko (vain kerran per pelaaja). */
export function claimSvLinkGift(userId: string): boolean {
  const p = loadProgress();
  if (p.sv?.giftClaimed) return false;
  for (let i = 0; i < 2; i++) {
    p.inventory.boxes.push({
      id: `box-sv-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      rarity: "ultra",
    });
  }
  p.sv = { userId, giftClaimed: true };
  saveProgress(p);
  return true;
}

export function markSvUser(userId: string): void {
  const p = loadProgress();
  p.sv = { userId, giftClaimed: p.sv?.giftClaimed ?? false };
  saveProgress(p);
}