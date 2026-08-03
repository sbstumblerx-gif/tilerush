import { supabase } from "@/integrations/supabase/client";

/** Aika, jonka jälkeen vastustajaksi asetetaan botti (ms). */
export const BOT_FALLBACK_MS = 10_000;
/** Onlineottelun kierrosmäärä. */
export const ONLINE_ROUNDS = 3;

/** Liity jonoon. Palauttaa ottelukoodin heti, jos vastustaja löytyi. */
export async function joinQueue(): Promise<string | null> {
  const { data, error } = await supabase.rpc("matchmaking_join");
  if (error) return null;
  return (data as string | null) ?? null;
}

/** Kysele, onko jonossa jo pari. */
export async function pollQueue(): Promise<string | null> {
  const { data, error } = await supabase.rpc("matchmaking_poll");
  if (error) return null;
  return (data as string | null) ?? null;
}

export async function leaveQueue(): Promise<void> {
  await supabase.rpc("matchmaking_leave");
}
