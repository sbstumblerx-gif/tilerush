import { createClient } from "@supabase/supabase-js";

/** SV Account -projekti (täysin erillinen pelin omasta backendistä). */
const SV_URL =
  (import.meta.env.VITE_SV_URL as string | undefined) ?? "https://lrwonltkuqbissvjmewf.supabase.co";
const SV_KEY =
  (import.meta.env.VITE_SV_PUBLISHABLE_KEY as string | undefined) ??
  "sb_publishable_r3L6uewJ_qMzOdbP5YKVcg_F9UJ5wqO";

/** Uudet sb_-avaimet eivät ole JWT:itä, joten Authorization-bearer poistetaan. */
function svFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (headers.get("Authorization") === `Bearer ${SV_KEY}`) headers.delete("Authorization");
  headers.set("apikey", SV_KEY);
  return fetch(input, { ...init, headers });
}

function make() {
  return createClient(SV_URL, SV_KEY, {
    global: { fetch: svFetch },
    auth: {
      // Oma storageKey: SV-sessio ei koskaan sekoitu pelin omaan kirjautumiseen.
      storageKey: "sv-account-auth",
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _sv: ReturnType<typeof make> | undefined;

export const sv = new Proxy({} as ReturnType<typeof make>, {
  get(_t, prop, recv) {
    if (!_sv) _sv = make();
    return Reflect.get(_sv, prop, recv);
  },
});

export const SV_APP_ID = "tile_rush";