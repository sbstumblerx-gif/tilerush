## Tile Rush v2.0 – Laaja päivitys

Toteutan spec:in vaiheittain. Tämä on iso työ (uusi ruututyyppi, uudet tasot, pakettijärjestelmä, kolme uutta sivua, minipeli, tallennus). Ehdotan seuraavaa toteutusjärjestystä ja jaan sen kahteen vaiheeseen.

### VAIHE 1 — Peliydin ja rakenne (tämä toimeksianto)

**1. Uudet ruudut**
- `enemy` (💗 pinkki): staattinen vihollinen. Kun pelaaja on 8-suuntaisesti vieressä, `-3 siirtoa` jokaisen liikkeen jälkeen niin kauan kuin alueella. Tarkistus `resolveEnter`in jälkeen + `tickCurse`-vaiheessa. Kirjasin `💗 -3 siirtoa (aura)`.
- `launcher` (🟨 keltainen): astuminen kuluttaa 1 siirron normaalisti; sen jälkeen valitaan satunnainen 4-suunta ja pelaaja liukuu enintään 3 ruutua tuohon suuntaan (pysähtyy esteeseen/reunaan). Ei lisäsiirtokustannusta. Muuttuu käytön jälkeen `normal`iksi. Laskeutumisruudun efekti resolvoidaan normaalisti (ketju).
- Grid-merkit: `X` = enemy, `L` = launcher. Päivitetään `types.ts`, `engine.ts` (parser + logiikka), `Board.tsx` (värit, labelit), `styles.css` (uudet tokenit `--tile-enemy`, `--tile-launcher`), legenda `play.tsx`.

**2. Tasot 8, 9, 10 ja pakettijärjestelmä**
- Taso 8 = enemy-harjoitus, Taso 9 = launcher-harjoitus, Taso 10 = Sekasotku (siirretty entisestä 8:sta, lisätään enemy + launcher).
- Uusi `packs.ts`: `Pack { id, name, theme, background, levelIds[], unlockRequirement }`. Paketit 1–6 spec:in mukaan (nimet, ID-alueet). Vain paketti 1 sisältää kaikki 10 valmista tasoa; paketit 2–6 saavat placeholder-tasot (generoidaan yksinkertaisia grid-tasoja teeman mukaan: rantaloma helppo, talvi = jäätä, kuumat = raskaita, virta = energiaa, viholliset = enemy). Näin peli ei ole tyhjä.
- `levels.tsx`: näyttää ensin pakettikortit taustakuvineen ja edistymisellä (`x/10 suoritettu`). Klikkaus avaa paketin tasovalitsimen. Uudet paketit lukossa kunnes edellinen valmis.

**3. Tallennus**
- Laajennetaan `progress.ts`: `completed[]`, `coins`, `stars: Record<levelId, 1|2|3>`, `stats` (starts, moves, wins, losses, tileUsage, itemUses, volleyGoals, enemyEnters, arpaWins, newLevelsBeaten päivittäin), `passProgress` (taso 0–30), `ownedCosmetics { colors[], shapes[], patterns[], accessories[], themes[] }`, `equipped { color, shape, pattern, accessory, theme }`, `dailyTasks { generatedAt, tasks[] }`.
- Tallennus `localStorage`iin. Kirjautuminen jää fase 2:een (Cloud) – kysyn erikseen ennen käyttöönottoa, jotta ei rikota nykyistä anonyymiä pelaamista.

**4. Tähdet, kolikot ja Tile Pass**
- Voiton yhteydessä lasketaan tähdet jäljellä olevista siirroista (kynnykset skaalattu `level.moves`in mukaan: ≥50% → 3★, ≥25% → 2★, muuten 1★). Tallennetaan paras.
- Joka toinen Tile Pass -taso: +100 kolikkoa, muuten satunnainen kosmeettinen. Pass etenee esim. 1 pisteen per läpäisty taso.

**5. Sivut**
- `stats.tsx`: näyttää kaikki tilastot listana.
- `pass.tsx`: 30-tason polku, ylälaidassa "Seuraava passi: 30.7.2026", palkintokuvakkeet, "Lunasta"-napit.
- `customize.tsx`: vasen valikko (5 kategoriaa), keski = esikatselu pelimerkistä (SVG jossa color+shape+pattern+accessory), oikea = omistettu-lista klikattavana.
- `shop.tsx`: 5 katalogia (väri, muoto, kuvio, asu, tausta) hinnoilla; osto kuluttaa kolikot ja lisää `owned`iin. "Omistettu"-tila.
- `tasks.tsx`: 3 päivittäistä tehtävää (generoidaan seedillä päivämäärästä), edistymispalkit, lunastus.
- Etusivun (lobby) alalaitaan **tapahtumat-laatikko**, jossa lukee "Tile Cup" ja linkki `/events`.
- Uusi `/events`-reitti: vasen puoli = 5 Tile Cup -tehtävää palkkioineen; oikealle pyyhkäisemällä avautuu **Tile Cup -minipeli** (canvas: jalkapallokenttä maalin edestä, liikkuva maalivahti, käyttäjä tähtää palloa hiirellä/kosketuksella). Käytetään toimitettua palloa placeholderina (asset lisätään myöhemmin – nyt gradientti+teksti "⚽"). Maali → +1 Tile Cup goal, +5 kolikkoa, edistää tehtäviä.

### VAIHE 2 (myöhemmin, erillinen keskustelu)
- Kirjautuminen ja pilvitallennus (Lovable Cloud).
- Pallokuvan integrointi (odotan kuvan lähetystä – en näe sitä nyt liitteenä).
- Kaikki pakettien 2–6 taustakuvat (generoin nyt yksinkertaisilla gradienteilla; korkealaatuiset kuvat voidaan lisätä pyynnöstä).

### Teknisiä huomioita
- Kaikki UI säilyy suomeksi ja neon-tyylisenä.
- Ei rikota olemassaolevaa `search: { level }`-navigointia; pakettinäkymä käyttää samaa reittiä.
- Enemy-auran vahinko voi laukaista `lost`-tilan; kirjataan lokiin.
- Launcherin satunnaissuunta suodattaa suunnat, joissa 1. askel on obstacle → uudelleenarpa; jos yhtään ei kelpaa, jää paikalleen.

### Kysymys ennen aloittamista
Yksi tarkennus: **kirjautuminen/pilvitallennus** — otanko käyttöön Lovable Cloudin nyt (email + Google), vai riittääkö localStorage ensimmäiseksi versioksi ja lisätään kirjautuminen erillisenä askeleena? Jälkimmäinen on nopeampi ja pitää tämän toimituksen fokusoituna.

Vahvista jompikumpi, niin aloitan koodauksen heti.