# Tile Rush 3.0 loppuun + 4.0 päivitys

Iso päivitys. Jaan sen selkeisiin osiin. Moninpeli ja kaverit vaativat backendin (Lovable Cloud jo päällä) — luodaan tietokantataulut ja Realtime-kanavat.

## Osa A — 3.0 loppuun

1. **Kosmetiikkasivu (`customize.tsx`)** — järjestä harvinaisuuden mukaan, klikkaus näyttää nimen + harvinaisuuden + "Valitse" / "Valittu" -napin.
2. **Tehtävät (`tasks.tsx`)** — viikkotehtävien UI (5 satunnaista, palkkio = laatikko + 100 XP), pakettien lasku.
3. **Inventaario** — uusi sivu/modaali laatikoille & sydämille, päivitys- ja avaus-UI (näytön logiikka on sama kuin 4.0:ssa, ks. C).
4. **FIFA-pallo** — korvaa emojit uploaded PNG:llä event-minipelissä ja UI:ssa.

## Osa B — Tile Pass rework (60 tasoa)

- **Palkinnot per taso**: pariton = 100 kolikkoa; parillinen = loot-sydän; joka 10. taso = laatikko; **taso 30 = taattu myyttinen laatikko**; **taso 60 = taattu ultralaatikko**. Kaikki laatikot päivitettävissä 4 kertaa.
- **XP per taso**: 1–10:50, 11–20:75, 21–30:125, 31–40:150, 41–50:175, 51–60:200.
- **Osta seuraava taso 300 kolikolla** -nappi.
- **Prestige tason 60 jälkeen**: joka 500 XP → uusi laatikko (yleinen, päivitettävissä).
- **XP-lähteet**: päivittäinen tehtävä +30 XP, viikkotehtävä +100 XP, taso läpi +10 XP, paketti läpi +40 XP. Vain kuluvan passikauden aikana lasketut.

## Osa C — Laatikoiden/sydämien päivitys- ja avausnäkymä

- Uusi reitti `/open/:id` (tai modaali) joka näyttää ison laatikko/sydän-kuvan (käytä uploaded PNG:t, luo `src/assets/box-*.png` ja `heart-*.png` per harvinaisuus).
- Teksti: "Päivityksiä jäljellä: X/4". Tap-to-roll.
- Kun 4 päivitystä käytetty → "Avaa napauttamalla" → siirtyy nykyiseen `RewardScreen`iin.
- Päivitystodennäköisyydet ovat jo `rarity.ts:rollUpgrade`, käytetään sitä.

## Osa D — 4.0 profiili & käyttäjänimi

- Yläkulmassa (lobby) käyttäjänimi + PlayerToken-avatar. Klikkaus → `/profile`.
- **Profiilisivu**: vaihda nimi, näyttää kaverikoodi (6 merkkiä a-z0-9), Google-linkitys-nappi, kirjaudu ulos.
- **Cloud-taulut** (uudet migraatiot GRANT + RLS mukana):
  - `profiles(id uuid pk = auth.uid, username unique citext, friend_code unique text, block_friend_requests bool, mute_chat bool, equipped jsonb, created_at)`
  - Trigger auto-luo profiili + generoi uniikin friend_code signup-hetkellä. Käyttäjänimi valitaan ensimmäisellä kirjautumisella (modaali).

## Osa E — Kaverit

- **Reitti `/friends`** kolmella tabilla:
  1. **Ystävät** (x/50) — lista, poista-nappi.
  2. **Pyynnöt** — saapuvat (hyväksy/hylkää), lähtevät (peruuta).
  3. **Lisää** — oma friend_code + kenttä koodilla lisäämiseen.
- **Taulut**:
  - `friendships(user_a, user_b, created_at)` symmetrinen tallennus.
  - `friend_requests(id, from_user, to_user, status, created_at)` — status: pending/accepted/rejected/canceled.
- Estä-pyyntö-tarkistus + virheteksti "Tämä pelaaja ei hyväksy kaveripyyntöjä…".
- Realtime-tilaus omiin pyyntöihin.

## Osa F — Moninpeli

- **Pelaa-nappi** avaa modaalin: Yksinpeli / Moninpeli.
- **Moninpeli** → Luo peli / Liity peliin (koodi).
- **Party-näkymä `/party/:code`**: 4 slot-lista, koodi + kutsu-nappi (avaa kaverilistan valintaan), asetukset (kierrosten määrä 1–20, valitse paketit), aloita peli -nappi (omistajalle, ≥2 pelaajaa, ≥1 paketti valittu).
- **Peliruutu**: sama board, molemmat pelaavat samaa kenttää yhtä aikaa, 45 s aikaraja, sama siirtomäärä. Yläreunassa pelaajien nimet + pisteet + toistensa tokenit boardilla. Voitto: vähemmällä siirroilla; tasapelin ratkaisu ajan mukaan.
- **Chat/emote**: 😀-nappi (5 hymiötä) ja 💬-nappi (6 valmisviestiä). Näkyy 4 s pelaajan nimen kanssa. Chat mykistys -asetus piilottaa muiden viestit.
- **Taulut**:
  - `parties(code pk, host_id, rounds, packs int[], status, current_round, created_at)`
  - `party_members(party_code, user_id, slot, score, joined_at)`
  - `party_events(id, party_code, type, payload jsonb, user_id, created_at)` (emote/chat/round_result). Realtime-broadcast tähän.
- Koodit: 5-merkkinen a-z0-9.

## Osa G — Asetukset lisät

- Kytkin: **Estä ystäväpyynnöt** (kirjoittaa `profiles.block_friend_requests`).
- Kytkin: **Mykistä chat** (paikallinen tai `profiles.mute_chat`).

## Osa H — Päivittäinen palkkio kaupassa

- `daily_rewards(user_id, claimed_date date, reward jsonb)` — tai puhtaasti client-side seed per päivä + `progress.lastDailyClaim`.
  - Valitaan client-puolella (seed = user_id + date): 150 XP / 200 kolikkoa / loot-sydän / harvinaisesti laatikko.
- Lobbyn kauppa-ikonissa vihreä "ilmaista"-badge kun lunastettavissa; muuten countdown seuraavaan UTC 00:00.
- Kaupan yläosassa "Päivän palkkio" -kortti + Lunasta.

## Osa I — Portaali bugifix (`engine.ts`)

Nykyään: astut A→B, sitten B on portaali → teleportoi takaisin A → ikuinen luuppi.
Korjaus: teleportin jälkeen **molemmat portaalit muuttuvat normaaleiksi ruuduiksi** (`type: "empty"` tai vastaava) samalla vuorolla. Yksi kerta per peli.

## Tekninen yhteenveto

**Uudet tiedostot:**
- `src/lib/game/xp.ts` (XP-taulukot, laskenta)
- `src/lib/game/dailyReward.ts`
- `src/lib/multiplayer/party.ts` (Realtime + serverFn wrapperit)
- `src/routes/profile.tsx`, `src/routes/friends.tsx`, `src/routes/party.$code.tsx`, `src/routes/multiplayer.tsx`
- `src/components/game/OpenContainer.tsx` (päivitys+avausnäkymä)
- `src/components/game/UsernamePrompt.tsx`
- `src/components/game/EmoteBar.tsx`
- `src/assets/box-{common..ultra}.png.asset.json`, `heart-{...}.png.asset.json` (leikkaa uploaded kuvista → 12 asset-json:ia)

**Migraatiot** (Cloud): `profiles`, `friend_requests`, `friendships`, `parties`, `party_members`, `party_events`, `daily_rewards` — kaikilla GRANT + RLS + auth.uid-scoped policyt. Trigger `handle_new_user` täyttää profiilin ja friend_coden.

**Muokkaukset:**
- `progress.ts`: lisää `xp`, `passSeasonStart`, `passCompletedLevels`, `passCompletedPacks`, `lastDailyClaim`, `emotesOwned`.
- `pass.tsx`: koko rework 60 tasolla, XP-palkki, osta-nappi.
- `tasks.ts` / `tasks.tsx`: +30 XP daily, +100 XP + laatikko weekly, viikkotehtävien UI.
- `engine.ts`: portaalikorjaus.
- `index.ts` (lobby): käyttäjänimi + avatar yläkulma, Kaverit-nappi, Pelaa-modaali, päivittäinen badge, "Versio 4.0".
- `settings.tsx`: uudet kytkimet.
- `customize.tsx`: harvinaisuuslajittelu + info-panel.

**Rajaukset:**
- Moninpelin verkkotoiminta rakennetaan Supabase Realtime -postgres_changes + broadcast -kanavina; ei omaa websocket-serveriä.
- Profiilikuvat: nyt vain PlayerToken avatarina, todellinen kuvaupload myöhemmin (kuten pyydetty).
- Google-linkitys reuse `lovable.auth.signInWithOAuth`.

Iso muutospatteri — teen tämän yhdellä isolla eräällä ja verifioin buildilla + kevyillä manuaaleilla.
