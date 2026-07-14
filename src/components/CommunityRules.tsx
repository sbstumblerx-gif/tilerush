import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function CommunityRules() {
  const [isAccepted, setIsAccepted] = useState(false);

  useEffect(() => {
    // Tarkistetaan onko säännöt jo aiemmin hyväksytty
    const rulesAccepted = localStorage.getItem("picpost_rules_accepted");
    if (rulesAccepted) {
      setIsAccepted(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("picpost_rules_accepted", "true");
    setIsAccepted(true);
    // Tähän voi lisätä ohjauksen eteenpäin tai muun halutun toiminnon
    alert("Säännöt hyväksytty!");
  };

  return (
    <div className="max-w-2xl mx-auto my-8 p-6 bg-background border rounded-lg shadow-sm">
      <h1 className="text-3xl font-bold text-center mb-6 border-b pb-4">
        Yhteisösäännöt
      </h1>

      <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
        <p className="text-foreground font-medium text-base">
          Haluamme, että jokainen kokee olonsa turvalliseksi PicPostissa! Tämän takia olemme luoneet tänne säännöt, jotka pitävät keskustelun turvallisena ja mukavana kaikille. PicPostin ylläpitäjillä on oikeus mykistää tili väliaikaisesti, antaa varoitus tai sulkea tili kokonaan jos käyttäjä ei noudata yhteisösääntöjä.
        </p>

        <div>
          <h2 className="font-bold text-base text-foreground mb-1">Noudata ikärajojamme</h2>
          <p>PicPostin suositusikäraja on 13-vuotta, jos ilmenee että käyttäjä on valehdellut ikänsä, niin voimme sulkea tilin väliaikaisesti tai kokonaan.</p>
        </div>

        <div>
          <h2 className="font-bold text-base text-foreground mb-1">Kunnioita tekijänoikeuksia</h2>
          <p>Älä julkaise PicpPostissa kuvia tai videoita jotka ovat tekijänoikeudella suojattua sisältöä. Mikä on tekijänoikeudella suojattua sisältöä?</p>
          <p className="italic mt-1">Tekijänoikeudella suojattua sisältöä ovat kuvat tai videot, jotka joku toinen on julkaissut.</p>
          <p>Mikäli haluat julkaista jotain sisältöä, mitä toinen henkilö on julkaissut, niin sinun pitää pyytää lupa siihen tältä henkilöltä.</p>
          <p className="mt-1">Mitä teen, jos näen että joku on julkaissut minun tekemää sisältöä ilman lupaani? Jos joku toinen on julkaissut sisältöäsi ilmam lupasi, niin tee ilmoitus siitä tällä lomakkeella.</p>
        </div>

        <div>
          <h2 className="font-bold text-base text-foreground mb-1">Kunnioita muita PicPost-yhteisön jäseniä</h2>
          <p>Haluamme, että jokainen käyttäjä kokee olonsa turvalliseksi PicPostissa. Sisältö, joka halventaa tai häpäisee toista ihmistä, poistetaan välittömästi. Kunnioita muita älä uhkaa jakaa tai jaa kenestäkään henkilöstä valheellista tietoa tai henkilön yksityisyyttä koskevaa tietoa esimerkiksi terveydestä, henkilötiedoista tai yksityiselämästä.</p>
          <ul className="list-disc list-inside space-y-1 mt-2 pl-2">
            <li>Ihmisten haukkuminen heidän etnisen alkuperänsä tai muun syyn takia ei ole sallittua.</li>
            <li>Älä uhkaile ketään millään tavalla.</li>
            <li>Älä lähetä ei toivottuja kommentteja tai yksityisviestejä kenellekkään.</li>
            <li>Älä häiritse ketään millään tavalla.</li>
          </ul>
        </div>

        <div>
          <h2 className="font-bold text-base text-foreground mb-1">Älä tekeydy toiseksi käyttäjäksi</h2>
          <p>Älä esitä millään tavalla jotain toista käyttäjää, et saa käyttää hänen profiilikuvaansa tai nimeänsä.</p>
        </div>

        <div>
          <h2 className="font-bold text-base text-foreground mb-1">Älä julkaise epäsopivaa sisältöä</h2>
          <p>Sisältöä, joka on rasistista, seksuaalista tai muulla tavalla epäsopivaa ei ole sallittua julkaista. Poistamme kaikki tällaiset julkaisut ja saatamme antaa varoituksen tai toistuvasti tälläisen sisällön julkaiseminen saattaa johtaa väliaikaiseen mykistykseen tai käyttäjän poistamiseen.</p>
        </div>

        <div>
          <h2 className="font-bold text-base text-foreground mb-1">Editoitu mediasisältö ja tekoälyn avulla luotu sisältö</h2>
          <p>Jos videota ei voi selkeästi erottaa aidon tapahtuman tai geneerisesti tuotetun tai muokatun sisällön väliltä, niin käyttäjältä vaaditaan merkintä siitä, onko tapahtuma aitoa vai muokattua sisältöä. Käytämme tässä tulkinnanvaraista menettelyä.</p>
        </div>

        <div>
          <h2 className="font-bold text-base text-foreground mb-1">Käyttäjiin kohdistuvat huijaukset</h2>
          <p>Emme salli minkäänlaisia käyttäjiin kohdistuvia huijauksia. Jos joudut huijauksen kohteeksi, niin teethän siitä ilmoituksen meille.</p>
        </div>

        <div>
          <h2 className="font-bold text-base text-foreground mb-1">Tietosuoja ja turvallisuus</h2>
          <p>Kenenkään henkilötietoja ei ole sallittua jakaa. Älä uhkaile myöskään ketään henkilötietojen jakamisella. Kannattaa myös miettiä, mitä tietoja itsestään jakaa.</p>
          <p className="mt-1">Emme salli minkäänlaisia yrityksiä hakkeroida tai muutoin aiheuttaa haittaa järjestelmillemme.</p>
        </div>

        <div>
          <h2 className="font-bold text-base text-foreground mb-1">Valheellisen tiedon levittäminen</h2>
          <p>Älä levitä minkäänlaista valheellista tietoa. Poistamme kaikki postaukset, joissa esitetään valheellista tietoa.</p>
        </div>

        <div>
          <h2 className="font-bold text-base text-foreground mb-1">Väkivaltainen ja raaka sisältö</h2>
          <p>Emme salli minkäänlaista väkivallalla ihannointia tai väkivaltaista ja raakaa sisältöä.</p>
        </div>

        <div>
          <h2 className="font-bold text-base text-foreground mb-1">Vihapuhe</h2>
          <p>Emme salli minkäänlaista sisältöä, jossa edistetään vihaa tai hyökätään toista ihmistä tai ihmisryhmää vastaan.</p>
        </div>

        <div>
          <h2 className="font-bold text-base text-foreground mb-1">Laittomien tuotteiden mainostaminen</h2>
          <p>Emme salli sisältöä, jossa mainostetaan minkäänlaisia laittomia tuotteita, tästä syystä voimme sulkea tilin kokonaan.</p>
        </div>

        <div>
          <h2 className="font-bold text-base text-foreground mb-1">Vaarallinen sisältö tai vaaralliset haasteet</h2>
          <p>Emme salli minkäänlaista sisältöä, jossa mainostetaan tai kehotetaan osallistumaan vaarallisiin haasteisiin, tai jos sisältö on muuten vaarallista.</p>
        </div>

        <div>
          <h2 className="font-bold text-base text-foreground mb-1">K18 sisältö</h2>
          <p>Mikäli sisältö on tarkoitettu vain yli 18-vuotiaille, niin sinun tulee merkitä se K18 sisällöksi. K18-sisältö sallitaan yli 18-vuotiaiksi varmennetuille käyttäjille tulevissa päivityksissä. Tällä hetkellä niihin ei ole suodatinta, ja siksi ne ovat täysin kielletty.</p>
        </div>
      </div>

      {/* Tässä on se painike aivan tekstin alapuolella */}
      <div className="mt-10 pt-6 border-t flex justify-center">
        <Button
          onClick={handleAccept}
          className="w-full sm:w-48 text-base py-6 font-semibold"
          variant={isAccepted ? "secondary" : "default"}
        >
          {isAccepted ? "Hyväksytty ✓" : "Hyväksyn"}
        </Button>
      </div>
    </div>
  );
}
