import { supabase } from "@/integrations/supabase/client";
import { currentUserId } from "./social";
import type { LevelDef } from "@/lib/game/types";

export const MIN_PACK_LEVELS = 1;
export const MAX_PACK_LEVELS = 10;

export interface CommunityLevel {
  id: string;
  code: string;
  author_id: string;
  name: string;
  size: number;
  moves: number;
  grid: string[];
  created_at: string;
}

export interface CommunityPack {
  id: string;
  code: string;
  author_id: string;
  name: string;
  level_codes: string[];
  created_at: string;
}

function normalize(row: Record<string, unknown>): CommunityLevel {
  const grid = Array.isArray(row.grid) ? (row.grid as string[]) : [];
  return { ...(row as unknown as CommunityLevel), grid };
}

/** Yhteisökentästä pelattava LevelDef. */
export function toLevelDef(l: CommunityLevel): LevelDef {
  return { id: -1, name: l.name, moves: l.moves, grid: l.grid };
}

export async function createCommunityLevel(input: {
  name: string; size: number; moves: number; grid: string[];
}): Promise<CommunityLevel | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const { data, error } = await supabase
    .from("community_levels")
    .insert({ author_id: uid, name: input.name, size: input.size, moves: input.moves, grid: input.grid })
    .select("*")
    .single();
  if (error || !data) return null;
  return normalize(data as Record<string, unknown>);
}

export async function getCommunityLevel(code: string): Promise<CommunityLevel | null> {
  const { data } = await supabase
    .from("community_levels")
    .select("*")
    .eq("code", code.trim().toLowerCase())
    .maybeSingle();
  return data ? normalize(data as Record<string, unknown>) : null;
}

export async function getCommunityLevels(codes: string[]): Promise<CommunityLevel[]> {
  if (codes.length === 0) return [];
  const { data } = await supabase.from("community_levels").select("*").in("code", codes);
  const rows = (data ?? []).map((r) => normalize(r as Record<string, unknown>));
  // Säilytetään paketin järjestys
  return codes.map((c) => rows.find((r) => r.code === c)).filter((x): x is CommunityLevel => !!x);
}

export async function listMyLevels(): Promise<CommunityLevel[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data } = await supabase
    .from("community_levels")
    .select("*")
    .eq("author_id", uid)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => normalize(r as Record<string, unknown>));
}

export async function deleteCommunityLevel(code: string): Promise<void> {
  await supabase.from("community_levels").delete().eq("code", code);
}

/* -------- Packs -------- */

export async function createCommunityPack(name: string, levelCodes: string[]): Promise<CommunityPack | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const codes = levelCodes.slice(0, MAX_PACK_LEVELS);
  if (codes.length < MIN_PACK_LEVELS) return null;
  const { data, error } = await supabase
    .from("community_packs")
    .insert({ author_id: uid, name, level_codes: codes })
    .select("*")
    .single();
  if (error || !data) return null;
  return data as unknown as CommunityPack;
}

export async function updateCommunityPack(code: string, levelCodes: string[]): Promise<void> {
  await supabase
    .from("community_packs")
    .update({ level_codes: levelCodes.slice(0, MAX_PACK_LEVELS) })
    .eq("code", code);
}

export async function getCommunityPack(code: string): Promise<CommunityPack | null> {
  const { data } = await supabase
    .from("community_packs")
    .select("*")
    .eq("code", code.trim().toLowerCase())
    .maybeSingle();
  return (data as unknown as CommunityPack | null) ?? null;
}

export async function listMyPacks(): Promise<CommunityPack[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data } = await supabase
    .from("community_packs")
    .select("*")
    .eq("author_id", uid)
    .order("created_at", { ascending: false });
  return (data as unknown as CommunityPack[]) ?? [];
}

export async function listRecentPacks(limit = 20): Promise<CommunityPack[]> {
  const { data } = await supabase
    .from("community_packs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as unknown as CommunityPack[]) ?? [];
}

export async function deleteCommunityPack(code: string): Promise<void> {
  await supabase.from("community_packs").delete().eq("code", code);
}
