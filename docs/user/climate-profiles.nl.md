<a id="climate-profiles"></a>
# Klimaatprofielen
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](climate-profiles.md) · [Español](climate-profiles.es.md) · [Français](climate-profiles.fr.md) · [Deutsch](climate-profiles.de.md) · [Italiano](climate-profiles.it.md) · [Nederlands](climate-profiles.nl.md) · [Polski](climate-profiles.pl.md) · [Português (Brasil)](climate-profiles.pt-br.md) · [Português (Portugal)](climate-profiles.pt-pt.md) · [Русский](climate-profiles.ru.md) · [Vertaalstatus](../translation-status.md)

<details>
<summary>Status van deze vertaling</summary>

| Gegeven | Status |
| --- | --- |
| Referentieversie | 1.9.0-beta.2 |
| Laatst gesynchroniseerd | 2026-10-17 |
| Taalcontrole | AI-ondersteunde vertaling |
| Vergeleken met het origineel | Gesynchroniseerd met het Engelse origineel. |

</details>

---
<!-- velair-docs:end -->

Klimaatprofielen laten Velair meerdere zones tussen afgestemde weekplannen wisselen zonder hun standaardschema's te vervangen. Home Assistant blijft de beslislaag: aanwezigheid, ramen, seizoenen, keuzelijsten, sensoren of andere automatiseringen bepalen wanneer een profiel verandert; Velair bewaart, past toe en toont het resulterende klimaatgedrag.

Een **Profiel** bepaalt één alternatieve klimaatroutine voor zijn ingestelde zones. Een **Modus** selecteert een of meer niet-overlappende profielen als **basis** van het huishouden. Daarna kun je profielen als **zone-uitzonderingen** toepassen, ook slechts een deel van een profiel met meerdere zones, zonder andere kamers te wijzigen. Stel een basis in wanneer de hele configuratie moet veranderen; gebruik uitzonderingen voor onafhankelijke routines.

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

Elke profielrij houdt acties in een aparte rechterkolom: als basis instellen, als zone-uitzondering toepassen en verwijderen. Ook bij smalle breedtes blijven ze naast de naam. De knoppen zijn transparant met ruimte tot de rand; actieve toestanden gebruiken pictogram en kleur. Onder de beschrijving staan compacte **Basis**-/ **Uitzondering**-labels voor het huidige gebruik. Ongebruikte profielen hebben geen gebruikslabels. De basisactie blijft neutraal totdat het profiel tot de basis behoort; een profiel dat alleen uitzondering is markeert zijn lagenactie. Een volledig overschreven basis behoudt zijn basisidentiteit. Dit beschrijft de opgeslagen selectie, geen draaiende apparaten. De rij opent de editor; activeren en uitzonderingen wijzigen de bewerkingsselectie niet. Bevestigd verwijderen van het bewerkte profiel leegt de editor.

Elke zone met **Profielplanning** bewaart een eigen **Dagindeling**: **Afzonderlijke dagen**, **Weekdagen / Weekend** of **Alle dagen**. De zeven dagcellen behouden hun positie; de indeling selecteert één dag, weekdagen/weekend of de hele week samen. Bewerken verandert die dagen in het profielconcept; **Profiel opslaan** bewaart het hele profiel. Controleer bij verschillen de alternatieven en kies expliciet een basis. Andere dagen blijven ongewijzigd. Indeling en conceptschema blijven bewaard bij tijdelijk wisselen van zonegedrag.

Aangrenzende geselecteerde cellen zijn visueel verbonden en de tijdlijn toont de gemeenschappelijke blokken. Verschillende configuraties verschijnen als compacte alternatieven met Overzicht-tijdlijnbalken en doel-/moduslabels. Identieke dagen vormen samen één alternatief. Er is geen permanente bloklijst eronder. Het informatiepictogram toont bij aanwijzen, toetsenbordfocus of tikken alle tijden en instellingen zonder de basis te selecteren. Klik of tik een alternatief; achtergrond en rand markeren precies één selectie. Alle alternatieven blijven zichtbaar tot opslaan. Pijltjestoetsen, Spatie en Enter ondersteunen selectie.

Kies bij **Alle dagen** en **Weekdagen / Weekend** eerst een alternatief en sla het profiel op voordat de gedeelde blokeditor beschikbaar wordt. Er is geen extra vervangingsbevestiging. Het betreft zeven dagen, vijf weekdagen of twee weekenddagen; andere dagen blijven behouden. Een mislukte opslag behoudt de selectie. Bewerkingen van gedeelde blokken kunnen daarna normaal met het profiel worden opgeslagen. Een gemengde groep vereist een basis voordat **Profiel opslaan** beschikbaar is. Samenvattingen naast Opslaan noemen bron, zone en doeldagen. Profiel opslaan omvat ook andere openstaande profielwijzigingen. Visueel gelijke alternatieven onderscheiden sjabloon-/presetafhankelijkheden met compacte labels. Lege alternatieven tonen **Geen eigen blokken**; de hulp verklaart dat toepassen eigen blokken verwijdert en dat een lege dag geen uitschakelopdracht is. Zie [Dagindelingen en groepsbewerking](usage.nl.md#create-a-daily-schedule).

Kies voor elk beheerd klimaatapparaat één gedrag:

- **Neemt niet deel**: dit profiel neemt de zone niet op.
- **Standaardplanning**: het gewone weekschema van de zone blijven gebruiken.
- **Profielplanning**: een volledig weekschema uit het profiel gebruiken.
- **Pauzeren** met **Klimaatentiteit ongewijzigd laten**: geplande wijzigingen stoppen en het apparaat laten zoals het is.
- **Pauzeren** met **Klimaatentiteit uitschakelen**: geplande wijzigingen stoppen en het apparaat uitschakelen.

**Standaardplanning** neemt de zone expliciet op, ook voor overlapvalidatie. Een zone met **Neemt niet deel** erft de basis of Standaard wanneer geen basisprofiel deze bevat. Sjablonen kunnen nog steeds als onafhankelijke blokken worden gekopieerd, alleen hun tijden koppelen met eigen klimaatinstellingen of het volledige sjabloon volgen met alleen-lezen bediening. Sjablonen en eigen blokken kunnen gedeelde Velair-presets refereren. Zie [Blokpresets en gekoppelde sjablonen](linked-schedules.nl.md) en het [winter-/zomervoorbeeld](linked-schedule-examples.nl.md#2-winter-and-summer-with-one-set-of-times). Een dag klonen behoudt koppelingstype, toewijzingen van tijdkoppelingen en presetverwijzingen. Klonen naar een andere thermostaat valideert het voorstel voordat het concept verandert; andere dagen behouden hun koppelingen. Ontkoppel na klonen als de nieuwe dag onafhankelijk moet zijn.

Voor een zone met externe regelaar kiezen profielen en modi de effectieve volledige week die Velair publiceert, in plaats van rechtstreekse `climate.*`-acties. **Standaardplanning** publiceert de gewone week en **Profielplanning** de profielweek. **Pauzeren** is niet beschikbaar voor extern beheerde zones. De profiel-editor gebruikt regelaarmogelijkheden als extra validatie; een publicatiefout draait de opgeslagen profiel- of moduskeuze niet terug en raakt lokale zones niet. Zie [Externe schema-uitvoering](external-systems.nl.md) voor actuele regelaarlimieten en de betekenis van publicatie.

**Opslaan als sjabloon** slaat vanuit een bewerkt profielschema alleen een herbruikbaar sjabloon op via de backend en laat het niet-opgeslagen profielconcept ongewijzigd. Kies apparaten in het kloonpaneel **Andere thermostaten** en kies **Kopiëren** om de selectie elders te gebruiken. Het label volgt de indeling: één dag, maandag–vrijdag, zaterdag–zondag of Alle dagen. De bevestiging noemt apparaten en geselecteerde dagen en wijst Standaard-/Pauzezones aan die naar **Profielplanning** veranderen. Alleen die overeenkomende weekdagen worden vervangen; andere onthouden dagen en de dagindeling van het doel blijven behouden. De kopie blijft onderdeel van het profielconcept. Dagen onderling klonen is alleen beschikbaar bij **Afzonderlijke dagen**; gegroepeerde editors tonen dat paneel en de indelingssnelkoppeling niet. Gebruik de gewone **Dagindeling**. Standaard- en profieleditors gebruiken dezelfde geselecteerde groep voor kopieën naar andere thermostaten. Velair valideert doeltype, HVAC-modus, grenzen en temperatuurstap voor elk doel voordat het concept verandert. Niet-ondersteunde opties worden per doel verwijderd. Als een optieblok geen ondersteunde optie overhoudt of een doel/modus onverenigbaar is, blijft het hele concept ongewijzigd. Gekloonde dagen worden pas met het profiel opgeslagen.

Velair controleert doeltype, HVAC-modus, temperatuurgrenzen en stapgrootte voor elk gekozen apparaat vóór conceptwijzigingen. Niet-ondersteunde optionele bediening wordt per bestemming verwijderd. Als een blok met alleen opties geen ondersteunde bediening overhoudt, of doel of modus ongeschikt is, verandert niets aan het concept. Gekloonde dagen worden pas bewaard bij opslaan van het profiel.

Elke profieldag gebruikt dezelfde bewerkbare tijdlijn als standaardschema's en sjablonen, inclusief slepen en formaatwijziging voor bloktijden. Blokken hebben een starttijd maar geen aparte eindtijd; het laatste blok loopt over middernacht en lege weekdagen door tot een volgend blok start. De tijdlijn toont het overgenomen dagdeel met een herkenbaar, niet-bewerkbaar segment en noemt de weekdag waarop het blok werkelijk is ingesteld.

Zolang een profiel wordt bewerkt, behoudt een tijdelijke wissel van **Profielplanning** naar **Standaardplanning** of **Pauzeren** het weekschemaconcept. Opnieuw **Profielplanning** kiezen herstelt die niet-opgeslagen blokken. Opslaan met Standaard of Pauzeren bewaart alleen dat gekozen gedrag; het verborgen conceptschema wordt niet bewaard. De thermostaatkiezer toont vriendelijke namen; de actieve editor ook de entiteits-ID. Metadata en schema's worden samen als één ondeelbaar profiel opgeslagen; een andere thermostaat kiezen slaat geen gedeeltelijk concept op.

Meerdere profielen kunnen samen een basis vormen wanneer een modus ze coördineert. Hun ingestelde zones mogen niet overlappen. Uitzonderingen kunnen afzonderlijke zones van die basis vervangen: elk klimaatapparaat behoudt precies één effectieve routine. Schemablokken worden niet gemengd en eerdere uitzonderingen vormen geen prioriteitsstapel.

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

Gebruik de afspeelknop op een profielrij onder **Schema’s > Profielplanningen** of **Actieve configuratie** in Overzicht en Modi. De kaart scheidt **Basis** van **Uitzonderingen** en toont of de basis uit een modus, één profiel, meerdere profielen of Standaard bestaat. Kies **Wijzigen** voor een modus of de groep **Profielen**. Een profielrij stelt het profiel in als volledige basis; het lagenpictogram ernaast past alleen de ingestelde zones als uitzonderingen toe. Rechtstreekse profielselectie vervangt de basiscombinatie door dat profiel en zet de oorspronkelijke modus op **Handmatig**. **Standaard** betekent geen alternatieve basisprofielen. Activeren kan ook vanuit de profielrij of met <code>velair.activate_profile</code>. Velair past het huidige blok meteen toe, inclusief een blok uit een eerdere dag als er vandaag nog geen nieuw blok is begonnen.

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

Voeg in de visuele Home Assistant-automatiseringseditor een actie toe en zoek **Velair: Klimaatprofiel activeren**. Deze integratieactie staat los van schakel- en selectacties bij filteren op het Velair-apparaat. Vul de **Automatiserings-ID** van het profiel in, zichtbaar onder de naam in Velair.

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

Modi toont actieve de geselecteerde basis en zone-uitzonderingen in **Actieve configuratie**. De gegroepeerde kiezer toont eerst Standaard en eigen modi, met afzonderlijke basis- en uitzonderingsacties voor profielen. Handmatig blijft een status van de oorspronkelijke Home Assistant-selectie en is geen basisnaam in het paneel. Een modus activeert zijn gekoppelde profielen; directe profielselectie vervangt de basiscombinatie door dat profiel en zet de oorspronkelijke selectie op **Handmatig**. Modusrijen tonen de pictogrammen en kleuren van gekoppelde profielen zodat beide ook bij gelijke namen herkenbaar blijven. Ingebouwde rijen lichten kort toe wanneer ze gelden.

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

<a id="a-base-with-independent-zone-exceptions"></a>
## Een basis met onafhankelijke zone-uitzonderingen

Een profiel kan meerdere kamers bevatten. Als uitzondering vervangt het alleen de routine van expliciet ingestelde kamers; andere kamers en de profieldefinitie veranderen niet. Elke kamer gebruikt één volledige weekroutine, nooit een mengsel van blokken uit verschillende profielen.

Voorbeeld: **Winter** omvat kantoor, woonkamer en slaapkamer. **Thuiswerken** omvat kantoor en woonkamer; **Gasten** woonkamer en logeerkamer:

| Wijziging | Kantoor | Woonkamer | Slaapkamer | Logeerkamer |
| --- | --- | --- | --- | --- |
| Basis Winter kiezen | Winter | Winter | Winter | Standaard |
| Thuiswerken toepassen | Thuiswerken | Thuiswerken | Winter | Standaard |
| Later Gasten toepassen | Thuiswerken | Gasten | Winter | Gasten |
| Woonkamer terug naar basis | Thuiswerken | Winter | Winter | Gasten |

Terugkeren naar de basis herstelt Thuiswerken niet; uitzonderingen hebben geen geschiedenisstapel. Expliciet Standaard kiezen gebruikt het gewone zoneschema, zelfs wanneer de basis daar een andere routine bevat.

Gebruik **Als uitzondering toepassen** in Actieve configuratie of een automatisering:

```yaml
action: velair.apply_profiles
data:
  profile_ids: [remote_work]
```

Eén verzoek mag meerdere profielen toepassen als ze verschillende zones bevatten. [remote_work, guests] wordt volledig afgewezen omdat beide de woonkamer bevatten. Gasten later in een apart verzoek toepassen vervangt bewust de woonkameruitzondering en behoudt het kantoor.

Voor slechts één kamer uit een profiel met meerdere zones:

```yaml
action: velair.set_zone_profile
data:
  entity_id: climate.office
  profile_id: remote_work
```

Het profiel moet deze beheerde kamer expliciet bevatten. <code>profile_id: null</code> legt Standaard op. Verwijder een uitzondering om de huidige basis te erven:

```yaml
action: velair.clear_profile_overrides
data:
  entity_id: [climate.office, climate.living_room]
```

Vervang de hele basis en wis alle uitzonderingen zonder een modus te maken:

```yaml
action: velair.activate_profiles
data:
  profile_ids: [winter_office, winter_bedrooms]
```

Basisprofielen mogen niet overlappen. Een lege activeringslijst kiest Standaard; lege toepassings-/wislijsten doen niets. Nieuwe acties vereisen hun velden: weglaten betekent nooit ‘alle kamers’ of ‘Standaard’.

Actieve configuratie toont **Basis** en type boven de naam, in twee compacte niveaus op telefoons en smalle kaarten. Lange namen lopen door. Het bereik telt de opgenomen beheerde zones die de basis nog erven. Uitzonderingen, ook expliciet Standaard of hetzelfde profiel, tellen niet mee. Zones buiten een profielbasis gebruiken Standaard en horen niet bij het basisbereik. Een Standaard-basis omvat alle beheerde zones. Dit beschrijft selectietoewijzing, geen apparaatwerking. Een lege basis is te onderscheiden van een basis die volledig door uitzonderingen is vervangen.

**Verdeling in het huishouden** onder de basissamenvatting is aanvankelijk gesloten. Selecteer het label om de 6-pixelbalk en volledige legenda te tonen; opnieuw selecteren of Escape sluit beide. De kop blijft staan terwijl inhoud naar beneden groeit met een korte overgang die rekening houdt met minder beweging. De balk omvat alle beheerde zones in profielkleuren; het label noemt het huishoudtotaal onafhankelijk van het basisbereik. Uitzonderingssegmenten bevatten ook zones buiten de basis en komen overeen met de uitzonderingslijst. Niet-opgenomen zones zonder uitzondering vormen een neutraal Standaard-segment. De compacte legenda gebruikt 14-pixelprofielpictogrammen, namen en herkomst met rechts uitgelijnde aantallen. Expliciete Standaard-uitzonderingen zijn ook neutraal. Basis, uitzondering en terugval blijven onderscheiden bij gelijke kleuren. Het eigen basisbereik staat apart en maar één keer. Een lege profielbasis kan een huishoudbalk met Standaard-zones hebben; zonder beheerde zones is er geen balk. Basisprofielen staan in de uitgeklapte legenda; modusbasissen herhalen daarboven geen aparte componentenlijst.

Op desktop neemt de basis minder ruimte dan uitzonderingen; het pictogram blijft bovenaan uitgelijnd met naam en type. De uitzonderingskop gebruikt hetzelfde lagenpictogram als de profielacties. **Uitzonderingen** vermeldt profielen met zoneaantal; expliciete Standaard-uitzonderingen hebben een eigen groep. Kamernamen blijven aanvankelijk verborgen. De volledige uitzonderingsrij klapt de kamers eronder open en behoudt de andere uitzonderingen. Opnieuw selecteren of Escape sluit; een andere groep openen sluit de vorige. Korte overgangen houden rekening met minder beweging. Rij en aantal blijven op hun plaats; details groeien omlaag en schuiven volgende rijen op. Lange kamerlijsten schuiven intern. Een ongewijzigde basis toont **Geen uitzonderingen** en blijft zichtbaar als elke kamer is overschreven. Actieve configuratie heeft geen aparte zone-editor; gebruik de beschreven zoneacties.

De oorspronkelijke modusselectie toont Manual zolang uitzonderingen bestaan. Alle uitzonderingen wissen herstelt de oorspronkelijke modusnaam als die nog bestaat. Een eigen modus, Standaard, één profiel of een volledige profiellijst vervangt expliciet de basis en wist uitzonderingen. De oorspronkelijke optie Manual verbreekt alleen de modusverbinding en behoudt basis en uitzonderingen.

Een basismodus bewerken behoudt uitzonderingen. Profielen hernoemen of bewerken houdt verwijzingen actief: schemawijzigingen beïnvloeden kamers die ze gebruiken. Een kamer aan een profiel toevoegen breidt een eerder op andere kamers toegepaste uitzondering niet uit. Verwijder een uitzondering voordat je de gekoppelde kamer uit het profiel verwijdert. Een profiel verwijderen of definities zonder dat profiel importeren verwijdert de uitzonderingen en zet die kamers terug naar de overgebleven basis of Standaard.

Home Assistant bepaalt nog steeds seizoen, aanwezigheid en persoonlijke routine. Een seizoensmodus is een volledige selectie, geen extra laag boven kameruitzonderingen. Bereken relevante kamerselecties opnieuw na een seizoenswijziging. Acties voor verschillende kamers combineren veilig; concurrerende acties voor dezelfde kamer worden op volgorde geaccepteerd. Een volledige basisselectie kan ze allemaal vervangen.

Alle expliciete selectieacties annuleren een geplande terugkeer naar huis, ook herhaalde selecties. Lege toepassings-/wislijsten niet. Annuleren kan voorbereiding elders in huis beïnvloeden. Het wordt apart van de volgende selectie opgeslagen: mislukt die opslag, dan kan de vorige selectie blijven bestaan terwijl terugkeer al geannuleerd is. Ongeldige verzoeken annuleren nooit.

Selectiewijzigingen worden samen opgeslagen, maar apparaten kunnen ze op verschillende tijden toepassen of afzonderlijke fouten melden. Bestaande pauzes en uitvoeringsbeperkingen houden voorrang. Alleen toewijzing wijzigen bij dezelfde effectieve routine annuleert geen Tijdelijke aanpassing en verstuurt geen dubbele klimaatacties. Extern uitgevoerde kamers publiceren hun effectieve week met bestaande providerbeperkingen. Profielen nemen beperkingen van gedeelde apparatuur niet weg.

Basis en uitzonderingen overleven herstart. Overdraagbare exports bevatten definities, niet deze actieve selectie; import activeert geen nieuwe profielen.

<a id="seasonal-selection"></a>
## Seizoenskeuze

De [blueprint voor seizoensgebonden klimaatkeuze](blueprints/seasonal-climate-selection.nl.md) kan na een stabiele wijziging van een dagmaximum- of andere temperatuursensor een modus kiezen. Koppel winter- en zomerprofielen aan dezelfde sjabloontijden en geef ze verschillende presets. Stel een zachtweerprofiel met pauze en uitschakelen in als geen klimaatregeling gewenst is. Stem dit af op aanwezigheidsregels: een nieuwe stabiele meting kan een handmatige afwezigheidsmodus vervangen.

Blokken met **Alleen temperatuur** behouden hun beleid in profielen, presets, sjablonen en gekoppelde sjabloonbindingen. Een profiel of modus activeren werkt hun doel bij zonder HVAC-moduswijziging en schakelt een uitgeschakeld klimaatapparaat niet in. De integratie moet doelen accepteren terwijl het apparaat uitstaat.

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
