<a id="climate-profiles"></a>
# Klimaatprofielen
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](climate-profiles.md) · [Español](climate-profiles.es.md) · [Français](climate-profiles.fr.md) · [Deutsch](climate-profiles.de.md) · [Italiano](climate-profiles.it.md) · [Nederlands](climate-profiles.nl.md) · [Polski](climate-profiles.pl.md) · [Português (Brasil)](climate-profiles.pt-br.md) · [Português (Portugal)](climate-profiles.pt-pt.md) · [Русский](climate-profiles.ru.md) · [Vertaalstatus](../translation-status.md)

<details>
<summary>Status van deze vertaling</summary>

| Gegeven | Status |
| --- | --- |
| Referentieversie | 1.9.0-beta.1 |
| Laatst gesynchroniseerd | 2026-10-11 |
| Taalcontrole | AI-ondersteunde vertaling |
| Vergeleken met het origineel | Gesynchroniseerd met het Engelse origineel. |

</details>

---
<!-- velair-docs:end -->

Klimaatprofielen laten Velair meerdere zones tussen afgestemde weekplannen wisselen zonder hun standaardschema's te vervangen. Home Assistant blijft de beslislaag: aanwezigheid, ramen, seizoenen, keuzelijsten, sensoren of andere automatiseringen bepalen wanneer een profiel verandert; Velair bewaart, past toe en toont het resulterende klimaatgedrag.

Een **Profiel** bepaalt één alternatieve klimaatroutine voor de ingestelde zones. Een **Modus** activeert samen één of meer profielen zonder overlappende zones als één huishoudstatus. Activeer een profiel rechtstreeks als alleen die routine nodig is; gebruik een modus als meerdere gebieden samen moeten veranderen.

Voorbeelden zijn Thuis, Afwezig, Vakantie, Zomer, Gast en Slapen. Profielen ondersteunen ook installaties met verschillende bloktijden, doelen en HVAC-modi voor verwarmings- en koelschema's.

<a id="default"></a>
## Standaard

`Default` is de ingebouwde keuze en betekent altijd de weekschema's uit het tabblad Schema's. Het is geen opgeslagen profiel en kan niet worden hernoemd of verwijderd.

Het activeren van een ander profiel overschrijft die schema's nooit. Teruggaan naar Standaard past onmiddellijk het standaardblok toe dat op dat moment actief is.

<a id="configure-a-profile"></a>
## Een profiel instellen

Open **Schema's**, kies **Profielplanningen** en gebruik de toevoegknop om een leeg profiel te maken. Selecteer het in de lijst om kleur, pictogram, naam, beschrijving en thermostaatgedrag te bewerken. De profielwerkruimte toont steeds één geselecteerde thermostaat, zodat de volledige editor bruikbaar blijft op desktop, tablet en mobiel.

De profielnaam wordt in de kop naast het potlood bewerkt. De vaste automatiserings-ID staat direct onder de naam en in de profiellijst, zodat je die zonder verwarring met de bewerkbare weergavenaam naar services, scripts en automatiseringen kunt kopiëren.

Pictogrammen gebruiken Material Design Icons-sleutels, zoals `mdi:briefcase-outline`. De editor toont een voorvertoning in de gekozen profielkleur, linkt naar de doorzoekbare Material Design Icons-catalogus en meldt sleutels die niet aan `mdi:icon-name` voldoen. Beschrijvingen zijn maximaal 500 tekens; de editor toont het resterende aantal. Velair geeft nieuwe en bestaande profielen een vaste kleur, die je met de kleurkiezer of een bewerkbare `#RRGGBB`-waarde kunt wijzigen. Ongeldige waarden worden gemarkeerd en kunnen niet worden opgeslagen. De kleur is opgenomen in overdraagbare exports. De ingebouwde standaardkeuze behoudt haar vaste kleur.

Kies voor elk beheerd klimaatapparaat één gedrag:

- **Standaardplanning**: het gewone weekschema van de zone blijven gebruiken.
- **Profielplanning**: een volledig weekschema uit het profiel gebruiken.
- **Pauzeren** met **Klimaatentiteit ongewijzigd laten**: geplande wijzigingen stoppen en het apparaat laten zoals het is.
- **Pauzeren** met **Klimaatentiteit uitschakelen**: geplande wijzigingen stoppen en het apparaat uitschakelen.

Niet in het profiel ingestelde zones blijven hun standaardschema gebruiken. Sjablonen kunnen nog als onafhankelijke blokken worden gekopieerd. Een standaard- of profielweekdag kan ook alleen de tijden aan een sjabloon koppelen en eigen klimaatinstellingen behouden, of het volledige sjabloon volgen met alleen-lezenbediening. Sjablonen en onafhankelijke blokken kunnen naar gedeelde Velair-presets verwijzen. Zie [Blokpresets en gekoppelde sjablonen](linked-schedules.nl.md) voor doorwerking, ontkoppelen, compatibiliteit en gedeelde wijzigingen, en [het winter-/zomervoorbeeld](linked-schedule-examples.nl.md#2-winter-and-summer-with-one-set-of-times) voor verschillende klimaatinstellingen met dezelfde tijden.

Het klonen van een dag behoudt het koppeltype, toewijzingen voor alleen tijden en blokpresetverwijzingen. Klonen naar een andere thermostaat controleert het voorgestelde profiel vóór toepassing op het concept; andere doeldagen behouden hun koppelingen. Gebruik Ontkoppelen na klonen als de nieuwe dag onafhankelijk moet zijn.

Voor een zone met externe regelaar kiezen profielen en modi de effectieve volledige week die Velair publiceert, in plaats van rechtstreekse `climate.*`-acties. **Standaardplanning** publiceert de gewone week en **Profielplanning** de profielweek. **Pauzeren** is niet beschikbaar voor extern beheerde zones. De profiel-editor gebruikt regelaarmogelijkheden als extra validatie; een publicatiefout draait de opgeslagen profiel- of moduskeuze niet terug en raakt lokale zones niet. Zie [Externe schema-uitvoering](external-systems.nl.md) voor actuele regelaarlimieten en de betekenis van publicatie.

Vanaf een bewerkte profieldag bewaart **Opslaan als sjabloon** alleen een herbruikbaar sjabloon via de backend en laat het niet-opgeslagen profielconcept ongemoeid. Om de dag bij andere beheerde apparaten te gebruiken, selecteer je deze onder **Dag kopiëren naar / Andere thermostaten** en kies je **Kopiëren**. De bevestiging noemt gekozen apparaten en standaard- of pauzezones die naar **Profielplanning** overgaan. Alleen dezelfde weekdag wordt vervangen; overige onthouden dagen blijven behouden. Klonen blijft onderdeel van het profielconcept.

Velair controleert doeltype, HVAC-modus, temperatuurgrenzen en stapgrootte voor elk gekozen apparaat vóór conceptwijzigingen. Niet-ondersteunde optionele bediening wordt per bestemming verwijderd. Als een blok met alleen opties geen ondersteunde bediening overhoudt, of doel of modus ongeschikt is, verandert niets aan het concept. Gekloonde dagen worden pas bewaard bij opslaan van het profiel.

Elke profieldag gebruikt dezelfde bewerkbare tijdlijn als standaardschema's en sjablonen, inclusief slepen en formaatwijziging voor bloktijden. Blokken hebben een starttijd maar geen aparte eindtijd; het laatste blok loopt over middernacht en lege weekdagen door tot een volgend blok start. De tijdlijn toont het overgenomen dagdeel met een herkenbaar, niet-bewerkbaar segment en noemt de weekdag waarop het blok werkelijk is ingesteld.

Zolang een profiel wordt bewerkt, behoudt een tijdelijke wissel van **Profielplanning** naar **Standaardplanning** of **Pauzeren** het weekschemaconcept. Opnieuw **Profielplanning** kiezen herstelt die niet-opgeslagen blokken. Opslaan met Standaard of Pauzeren bewaart alleen dat gekozen gedrag; het verborgen conceptschema wordt niet bewaard. De thermostaatkiezer toont vriendelijke namen; de actieve editor ook de entiteits-ID. Metadata en schema's worden samen als één ondeelbaar profiel opgeslagen; een andere thermostaat kiezen slaat geen gedeeltelijk concept op.

Meerdere profielen kunnen tegelijk actief zijn via een modus. Hun ingestelde zones mogen niet overlappen: elk beheerd apparaat heeft maximaal één profiel dat zijn effectieve gedrag bestuurt. Zones zonder actief besturend profiel blijven het standaardschema gebruiken.

<a id="worked-example-an-away-mode"></a>
## Uitgewerkt voorbeeld: een afwezigheidsmodus

Stel dat woonruimtes en slaapkamers verschillend gedrag nodig hebben als niemand thuis is:

1. Maak **Afwezig · Woonruimtes**. Geef woonkamer en keuken alternatieve schema's met passende doelen, voor verwarming, koeling of beide.
2. Maak **Afwezig · Slaapkamers**. Geef slaapkamerzones een ander alternatief schema, **Pauzeren** of **Pauzeren en uitschakelen**.
3. Laat niet-betrokken zones uit beide profielen. Ze blijven hun standaardschema volgen.
4. Open **Modi**, kies **Nieuwe modus**, noem deze **Away**, selecteer beide profielen en sla op.
5. Kies onder **Actieve configuratie** **Wijzigen** en daarna **Away**. Velair activeert beide profielen als één ondeelbare keuze.

Dit is geldig omdat de profielen verschillende zones instellen. Als beide hetzelfde apparaat instellen, weigert Velair de modus en vraagt om de overlap te verwijderen.

Dezelfde modus kiezen via een Home Assistant-automatisering:

```yaml
alias: Use Away climate mode
triggers:
  - trigger: state
    entity_id: person.resident
    to: "not_home"
actions:
  - action: select.select_option
    target:
      entity_id: select.velair_mode
    data:
      option: Away
```

Een andere automatisering kan de gewone schema's van alle zones herstellen:

```yaml
alias: Restore default climate schedules
triggers:
  - trigger: state
    entity_id: person.resident
    to: "home"
actions:
  - action: select.select_option
    target:
      entity_id: select.velair_mode
    data:
      option: Default
```

Vervang de persoonsentiteit en zichtbare modusnamen door die van jouw Home Assistant-installatie. Werk automatiseringen met de zichtbare optie bij als je een modus hernoemt.

<a id="activate-a-profile"></a>
## Een profiel activeren

Gebruik de afspeelknop op een profielregel onder **Schema's > Profielplanningen** voor rechtstreekse activering, of de gedeelde kaart **Actieve configuratie** in Overzicht of bovenaan **Modi**. Deze toont huidige modus en de toegepaste profielen als één verband. Kies **Wijzigen** voor een modus of de aparte groep **Een profiel handmatig activeren**.

Rechtstreeks een profiel kiezen vervangt de actieve verzameling door dat profiel en verandert de modus naar **Handmatig**; **Standaard** betekent dat geen alternatief profiel actief is. Je kunt profielen rechtstreeks via hun regel, Actieve configuratie of `velair.activate_profile` activeren. Velair past het huidige actieve blok toe en wacht niet op de volgende geplande grens. Dit kan het laatste blok van een eerdere dag zijn als vandaag nog geen nieuw blok is begonnen.

Rechtstreekse activering voegt nooit een profiel toe aan de bestaande verzameling, ook niet zonder overlappende zones. Zones uit de eerdere modus of profielverzameling die niet in het nieuwe profiel zitten, gaan direct terug naar Standaard en behouden niet de vorige configuratie. Maak een modus met alle vereiste niet-overlappende profielen als ze samen moeten worden geactiveerd.

Activeren annuleert actieve tijdelijke aanpassingen in zones waarvan het effectieve profielgedrag verandert. Een globale of zonepauze blijft bepalend; Velair registreert het nieuwe profiel en past het toe zodra planner of zone hervat.

Overzicht gebruikt elk effectief zoneschema voor Vandaag en Volgende gebeurtenissen. Door het actieve profiel gewijzigde zones tonen een compact gekleurd profiellabel met pictogram en naam; tijdelijke aanpassing of pauze blijft visueel leidend tot afloop. Bevestigingen voor opslaan, activeren en verwijderen gebruiken de normale tijdelijke Velair-melding met sluitknop en aftelbalk.

Modus- en profielwijzigingen tonen ook een globale voortgangsstrook terwijl Velair zones verwerkt. Deze blijft zichtbaar bij wisselen tussen paneeltabbladen. In Lovelace verschijnt ze alleen op Actieve configuratie, waar activering plaatsvindt. De teller geeft verwerkte zones aan, ook zones waarvoor pauze of tijdelijke aanpassing betekent dat geen opdracht nodig is; hij beweert niet dat een kamer al op doel is. De eindstatus onderscheidt volledig succes van afgeronde overgang met zonefouten. Succes verdwijnt na een korte bevestiging; gedeeltelijke en mislukte resultaten blijven tot sluiten beschikbaar, ook bij tabbladwissels.

Automatiseringen en scripts kunnen gebruiken:

```yaml
action: velair.activate_profile
data:
  profile_id: vacation
```

Voeg in de visuele Home Assistant-automatiseringseditor een actie toe en zoek **Velair: Activate climate profile**. Deze integratieactie staat los van schakel- en selectacties bij filteren op het Velair-apparaat. Vul de **Automatiserings-ID** van het profiel in, zichtbaar onder de naam in Velair.

Gebruik de expliciete deactiveringsservice voor standaardschema's:

```yaml
action: velair.deactivate_profile
```

Het weglaten van `profile_id` bij `velair.activate_profile` blijft ondersteund voor compatibiliteit. Profiel-ID's blijven gelijk als de naam verandert. Rechtstreekse activering via paneel of service zet de oorspronkelijke moduskiezer op `Manual`, ook wanneer hetzelfde profiel al actief was.

<a id="modes"></a>
## Modi

Een profiel bevat geen willekeurige voorwaarden; Home Assistant blijft de beslislaag. Velair beheert een oorspronkelijke entiteit `select.velair_mode`, zodat automatiseringswaarden via Modi kunnen worden beheerd zonder extra Home Assistant-helper.

Twee ingebouwde waarden bestaan altijd en zijn niet hernoembaar of verwijderbaar:

- **Standaard** deactiveert profielen en herstelt het standaardschema per zone.
- **Handmatig** betekent dat geen eigen modus de actieve profielverzameling bestuurt. Rechtstreekse profielactivering komt normaal in deze status. Velair toont dit als status, niet als actie in de kiezer. Kies Standaard of een eigen modus om deze te verlaten. De oorspronkelijke Home Assistant-entiteit behoudt de optie Manual voor compatibiliteit; die kiezen behoudt de actieve profielen maar koppelt ze los van hun eigen modus.

Maak eigen waarden zoals Afwezig, Vakantie of Thuis en koppel elk aan één of meer opgeslagen klimaatprofielen. Kies **Nieuwe modus**, vul de optienaam voor Home Assistant in, selecteer niet-overlappende profielen en sla op. Een eigen waarde kiezen activeert de hele verzameling ondeelbaar. Profielen binnen één modus moeten verschillende zones instellen; Velair weigert overlap in plaats van impliciete voorrang te gebruiken. Meerdere modi mogen naar hetzelfde profiel verwijzen. Namen worden bijgesneden, zijn maximaal 255 tekens, uniek ongeacht hoofdletters en mogen geen ingebouwde naam of gereserveerde Home Assistant-status `unknown` of `unavailable` gebruiken.

Modi toont actieve modus en toegepaste profielen samen op **Actieve configuratie**. De gegroepeerde kiezer noemt eerst Standaard en eigen modi, met aparte rechtstreekse profielactivering. Handmatig blijft zichtbaar als status maar is niet kiesbaar. Een modus activeert alle gekoppelde profielen; een rechtstreeks profiel vervangt de verzameling door dat ene profiel en zet de modus op Handmatig. Modusregels tonen profielpictogrammen en -kleuren, zodat modi en profielen ook bij gelijke naam herkenbaar blijven. Ingebouwde regels leggen kort uit wanneer ze gelden.

Gebruik de standaard selectactie in Home Assistant-automatiseringen:

```yaml
action: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Vacation
```

Modus-ID's blijven gelijk bij naamswijzigingen, zodat de actuele keuze behouden blijft. De zichtbare optienaam is echter de Home Assistant-entiteitsstatus; automatiseringen die naar hernoemde of verwijderde opties verwijzen, moeten worden bijgewerkt.

Het opnieuw koppelen van de gekozen modus activeert de nieuwe profielverzameling als één ondeelbare wijziging. Verwijderen van die modus laat de profielen actief en zet de kiezer op Handmatig. Verwijderen van een profiel verwijdert ook de daaraan gekoppelde modi en alleen dat profiel uit de actieve verzameling. Als niets actief blijft, gaat Velair terug naar Standaard.

<a id="seasonal-selection"></a>
## Seizoenskeuze

De [blueprint voor seizoensgebonden klimaatkeuze](blueprints/seasonal-climate-selection.nl.md) kan na een stabiele wijziging van een dagmaximum- of andere temperatuursensor een modus kiezen. Koppel winter- en zomerprofielen aan dezelfde sjabloontijden en geef ze verschillende presets. Stel een zachtweerprofiel met pauze en uitschakelen in als geen klimaatregeling gewenst is. Stem dit af op aanwezigheidsregels: een nieuwe stabiele meting kan een handmatige afwezigheidsmodus vervangen.

<a id="interactions"></a>
## Samenwerking met andere functies

- Globale en zonepauzes hebben voorrang op profielwijzigingen.
- Tijdelijke aanpassingen in betrokken zones worden bij profielactivering geannuleerd.
- Adaptieve voorconditionering herberekent vanuit het effectieve profielschema.
- Room Assist volgt het effectieve profielschemadoel.
- Omgevingscomfort blijft alleen bewaken en verandert niet.
- Verwarmen, koelen, heat/cool, uitschakelblokken en ondersteunde klimaatopties werken hetzelfde als bij standaardschema's.

<a id="restart-and-portability"></a>
## Herstarten en overdraagbaarheid

De actieve profielverzameling, eigen modi en gekozen modus-ID zijn in de Velair-backend opgeslagen. Na Home Assistant-herstart wordt de selectentiteit vanuit die status opgebouwd; ze activeert niet zelfstandig een profiel. **Actief schema toepassen na opstarten** bepaalt alleen of Velair het huidige effectieve doel onmiddellijk naar apparaten stuurt. Als dit uitstaat, behoudt Velair het profiel en berekent toekomstige gebeurtenissen zonder bij opstarten apparaatstatus te wijzigen. Ingeschakeld past een profielschema het huidige blok toe, schakelt **Pauzeren → Klimaatentiteit uitschakelen** de zone uit en laat gewone **Pauzeren** deze ongemoeid. Actieve tijdelijke aanpassingen, pauzes en globale plannerpauze behouden hun voorrang.

Overdraagbare V5-exports kunnen profiel- en modusdefinities als afzonderlijke onderdelen bevatten. De actieve profiel- of moduskeuze is nooit inbegrepen, zodat import niet impliciet een ander profiel activeert. Alleen profielen importeren verwijdert modi waarvan profielen niet meer bestaan. Modi importeren controleert elke koppeling en weigert overlappende zones.

Selecteer **Klimaatprofielen** en **Modi** onder **Instellingen > Overdraagbaarheid** bij export. Controleer en kies beide onderdelen vóór importbevestiging. De gekozen definities worden overschreven, maar de actieve profielverzameling en moduskeuze worden nooit geïmporteerd.

Elke modus koppelt één of meer profielen zonder overlappende zones. De hele verzameling wordt ondeelbaar geactiveerd; rechtstreekse profielactivering vervangt die door één profiel en kiest Handmatig.
