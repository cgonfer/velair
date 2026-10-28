<a id="room-assist"></a>
# Room Assist
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](room-assist.md) · [Español](room-assist.es.md) · [Français](room-assist.fr.md) · [Deutsch](room-assist.de.md) · [Italiano](room-assist.it.md) · [Nederlands](room-assist.nl.md) · [Polski](room-assist.pl.md) · [Português (Brasil)](room-assist.pt-br.md) · [Português (Portugal)](room-assist.pt-pt.md) · [Русский](room-assist.ru.md) · [Vertaalstatus](../translation-status.md)

<details>
<summary>Status van deze vertaling</summary>

| Gegeven | Status |
| --- | --- |
| Referentieversie | 1.9.0-beta.6 |
| Laatst gesynchroniseerd | 2026-10-28 |
| Taalcontrole | AI-ondersteunde vertaling |
| Vergeleken met het origineel | Gesynchroniseerd met het Engelse origineel. |

</details>

---
<!-- velair-docs:end -->

Room Assist laat Velair voor één beheerd klimaatapparaat een afzonderlijke kamertemperatuursensor gebruiken, terwijl het echte `climate.*`-apparaat wordt bestuurd.

Dit is nuttig voor thermostatische radiatorkranen, radiatorkranen, wandthermostaten en airco's waarvan de ingebouwde meting de werkelijke kamertemperatuur niet vertegenwoordigt. Een kraan naast een radiator kan bijvoorbeeld `22 °C` melden terwijl de kamersensor nog `20.5 °C` aangeeft.

Alle berekeningen gebruiken de oorspronkelijke Home Assistant-eenheid van het beheerde apparaat. De voorbeelden gebruiken Celsius voor leesbaarheid, maar dezelfde hysteresegrenzen, correctie met teken, beveiliging van het geplande doel, bereikbreedte, stapgrootte en fysieke begrenzing gelden rechtstreeks in Fahrenheit. Een kamerafwijking van `4 °F` geeft bijvoorbeeld een correctie van `4 °F`; dit is geen absolute temperatuur en krijgt geen Celsius-/Fahrenheit-offset.

Room Assist werkt lokaal en gebeurtenisgestuurd. Velair gebruikt geen voortdurende polling en verstuurt sensorgegevens niet buiten Home Assistant.

Bij een blok met **Alleen temperatuur** wordt Room Assist onderbroken zolang het klimaatapparaat uitstaat. Bij het wissen van de vorige correctie schakelt het het apparaat niet in en herstelt het geen eerdere HVAC-modus. Na extern inschakelen kan het ondersteunen met de werkelijke compatibele modus zonder een moduswijziging te vragen. Doeltemperaturen bijwerken terwijl het apparaat uitstaat, blijft afhankelijk van de klimaatintegratie.

<a id="what-it-does"></a>
## Wat Room Assist doet

Velair behoudt het geplande doel als werkelijk gebruikersdoel, maar corrigeert tijdelijk de naar het apparaat gestuurde doeltemperatuur op basis van externe kamersensor en eigen apparaatmeting.

Bij één doel in vaste `heat` of `cool` maakt een niet-nul dode band twee schakelgrenzen. Room Assist onthoudt naar welke grens het beweegt en wisselt pas wanneer de externe kamersensor de tegenoverliggende grens bereikt. Zo ontstaat een echte hysterese op basis van de externe sensor, in plaats van een interne sensor die rond het centrale doel een nieuwe cyclus begint. Maximale correctie begrenst de correctie met teken die vanaf de actieve grens wordt berekend.

Afzonderlijke doelen in `auto` en `heat_cool` en oorspronkelijke `heat_cool`-bereiken behouden hun neutrale of bereikmargegedrag. Velair dwingt deze modi niet om tijdens een hysterese voor één doel afwisselend actief te verwarmen en koelen.

De klimaatentiteit blijft het uitvoerende apparaat. Velair maakt geen virtuele klimaatentiteit en omzeilt apparaatfirmware niet. Als je thermostaat of radiatorkraan zelf een externe sensor kan koppelen, is dat doorgaans nog steeds de beste eerste keuze.

Kies voor twee instelpunten in vaste `heat` of `cool` eerst het **Referentie-instelpunt** per apparaat en modus bij **Instellingen → Klimaatapparaten en groepen**: **Onderste instelpunt** of **Bovenste instelpunt**, volgens wat het apparaat werkelijk gebruikt. Velair leidt dit niet af uit bereikondersteuning. Adaptieve voorconditionering deelt deze keuze.

Room Assist gebruikt de gekozen grens als vast verwarmings- of koeldoel, inclusief enkeldoelhysterese en bescherming van het geplande doel. Het verschuift beide grenzen evenveel en bewaart hun afstand. Beide moeten bij de doelstap en fysieke grenzen passen; de andere grens kan de correctie beperken. Bestaande beperkingsmeldingen blijven gelden.

Bij **Niet ingesteld** worden vaste paren ongewijzigd zonder Room Assist-correctie verstuurd. `auto`-bereiken blijven ongeschikt voor ondersteuning; oorspronkelijke `heat_cool`-banden behouden hun gedrag. Opgeslagen instellingen blijven bewaard. Een referentie- of moduswijziging wist oude ondersteuning zonder een oud gecorrigeerd doel over de nieuwe intentie terug te zetten.

<a id="setup"></a>
## Instellen

1. Open Room Assist.
2. Vouw het gewenste apparaat uit.
3. Kies een kamertemperatuursensor.
4. Schakel Ondersteuning via kamersensor in.
5. Stel de Room Assist-dode band in voor vast verwarmen of koelen rond het enkele doel of de gekozen bereikreferentie; bij automatische enkeldoelmodi en oorspronkelijke `heat_cool`-banden bepaalt deze de neutrale marge.
6. Pas Maximale correctie aan als de standaard te klein is voor die kamer of onder het verschil ligt dat de thermostaat nodig kan hebben om verwarmen/koelen te stoppen.
7. Pas Vernieuwingsvertraging aan als sensorupdates te traag of te frequent aanvoelen.

Alleen een kamersensor kiezen bewaart die sensor. Velair gebruikt deze pas als effectieve kamertemperatuur wanneer Ondersteuning via kamersensor is ingeschakeld.

Ondersteuning via kamersensor vereist geen adaptieve voorconditionering. Het kan bij normale temperatuurblokken en vervroegd gestarte voorconditioneringsblokken werken.

Een temperatuurblok met **Huidige modus behouden** past nog steeds het geplande doel toe. Room Assist gebruikt de werkelijk actieve apparaatmodus; staat het apparaat uit, dan start Velair het in een geschikte ondersteunde modus. **Huidige modus behouden** betekent bij een temperatuurblok niet dat het thermostaatdoel ongewijzigd blijft. Een blok met alleen opties heeft geen doel en gebruikt Room Assist niet.

Vernieuwingsvertraging is de wachttijd om snelle wijzigingen na kamer- of apparaattemperatuurupdates te bundelen. Standaard is dit `20` seconden; `0` herberekent meteen, maximaal `300` seconden groepeert frequente updates.

De Room Assist-dode band staat los van het minimumverschil voor adaptieve voorconditionering. Standaard is deze `0.3 °C` of `1 °F`, `0` schakelt haar uit en instellen kan in stappen van `0.1` graad tot `5 °C` of `9 °F`. Opslaan tijdens actieve Room Assist ververst het gecorrigeerde doel onmiddellijk.

De actuele temperatuurschaal toont de dode band als neutrale gestreepte zone. Bij een vast enkel doel zijn de randen hysteresegrenzen en noemt de status de actieve richting. Bij afzonderlijke automatische doelen blijft het een neutrale marge. Voor een oorspronkelijk `heat_cool`-bereik loopt deze van ondergrens min dode band tot bovengrens plus dode band. De schaal vergroot om beide randen te tonen. De volledige vertaalde legenda blijft op het werkelijke bereik gecentreerd, ook als tekst breder is, zodat betekenis niet van grafiekbreedte afhangt. De uitleg blijft beschikbaar voor ondersteunende technologie en als aanwijstekst.

Bij dode band `0` wordt geen vlak getekend en noemt de vaste legenda expliciet dat er geen dode band is. Grafiek en legenda volgen de opgeslagen backendwaarde; `show_room_assist_deadband` verbergen op een Lovelace-kaart verbergt instelling, band en legenda samen.

Bij upgrade vanaf een versie waarin Room Assist het minimumverschil van voorconditionering deelde, kopieert Velair de bestaande waarde één keer naar de nieuwe dode band. Dit behoudt eerdere bandbreedte, ook een historische waarde buiten de nieuwe invoerstap van 0.1 graad. Vaste `heat` en `cool` gebruiken die waarde daarna met de onderstaande hysterese. Na migratie zijn instellingen onafhankelijk: één veranderen wijzigt de andere nooit. Een nieuwe of geresette zone krijgt de eenheidsafhankelijke standaard hierboven.

<a id="room-groups"></a>
### Kamergroepen

Kies de groep in Room Assist en gebruik dezelfde sensorkeuze, inschakeling, dode band, maximale correctie en vernieuwingsregelaars. De eigen groepstemperatuur komt van het lid bij **Kamergroepen → Temperatuurreferentie**; de optionele externe sensor stel je hier in. Uitschakelen of wissen herstelt de effectieve meting van dat lid.

De groep heeft één gedeelde Room Assist-configuratie en correctie, geen onafhankelijke regelaar per lid. Velair behoudt het geplande kamerdoel en verzendt de ondersteunde opdracht volgens de groepsverzending: standaard alle leden, of de gekozen ontvanger als de installatie al doorgeeft. Mogelijkheden, stappen en temperatuurgrenzen worden nog steeds voor de echte ontvangers gecontroleerd. Leden blijven individueel zichtbaar in Overzicht.

<a id="understanding-the-live-status"></a>
## De actuele status begrijpen

Room Assist meldt wat Velair nu per apparaat kan doen, zodat je dit niet uit het thermostaatdoel hoeft af te leiden:

| Status | Betekenis |
| --- | --- |
| **Niet geconfigureerd** | Geen externe kamersensor geselecteerd. |
| **Uitgeschakeld** | Sensor opgeslagen, maar Room Assist uit. |
| **Inactief** | Ingeschakeld, maar geen passend actief temperatuurblok of nog geen bruikbare berekening. |
| **Gereed** | Metingen en doel beschikbaar voor correctie, maar nog geen gecorrigeerd doel toegepast. |
| **Ondersteunt** | Tijdelijk gecorrigeerd doel of verschoven bereik toegepast. |
| **Vasthouden** | Neutraal automatisch doel of oorspronkelijk `heat_cool`-bereik behouden, of gepland-doelbeveiliging houdt het doel aan de veilige kant. Een vaste `heat`-/`cool`-cyclus kan binnen de dode band **Ondersteunt** blijven. |
| **Geblokkeerd** | Pauze, tijdelijke aanpassing, handmatige status of andere plannerstatus heeft voorrang. |
| **Niet beschikbaar** | Apparaat of benodigde doelmogelijkheid nu niet bruikbaar. Bekende redenen verschijnen in de interface. |

Bij actieve Room Assist vat Overzicht dit zo nodig samen als **Naar de ondergrens**, **Naar de bovengrens**, **Actief**, **Vasthouden** of **Doeltemperatuur beschermd**, met geplande en toegepaste waarden. Een apparaatminimum/-maximum verschilt van geplande bescherming: Room Assist toont een waarschuwing met gevraagde, toegepaste en ondersteunde waarden; Home Assistant toont één blijvende melding totdat die fysieke begrenzing vervalt.

<a id="fixed-heating-hysteresis-example"></a>
## Voorbeeld van hysterese bij vaste verwarming

Situatie:

- Gepland blok: `21 °C`, `heat`
- Dode band: `±0.3 °C`
- Ondergrens: `20.7 °C`
- Bovengrens: `21.3 °C`
- Maximale correctie: `2 °C`
- Apparaatstap: `0.1 °C`

De cyclus stap voor stap:

1. Beide sensoren melden `21.0 °C`. Een nieuwe vaste verwarmingscyclus binnen de band begint veilig **naar de ondergrens**.
2. Het actieve hysteresedoel is `20.7 °C`. Correctie wordt vanaf die rand berekend, niet vanaf centraal `21 °C`:

   ```text
   correction = 20.7 - 21.0 = -0.3 °C
   climate target = 21.0 + (-0.3) = 20.7 °C
   ```

   Dit is bewust een verwarmingsdoel dat verwarming ontmoedigt, binnen apparaatstappen en fysieke grenzen.
3. Bij `20.9 °C` blijft de fase gelijk. Het passeren van het centrale schemadoel `21 °C` vraagt op zichzelf geen verwarming.
4. Bij externe kamertemperatuur `20.7 °C` wisselt Velair **naar de bovengrens** van `21.3 °C`.
5. Bij kamer `20.7 °C` en apparaat `20.5 °C` vraagt de nieuwe correctie verwarming:

   ```text
   correction = 21.3 - 20.7 = +0.6 °C
   climate target = 20.5 + 0.6 = 21.1 °C
   ```

6. Velair blijft op de bovengrens richten terwijl de kamer `21.0 °C` passeert. Bij `21.3 °C` wisselt het terug naar `20.7 °C`, corrigeert negatief en herhaalt de cyclus.

Het zichtbare schemadoel blijft `21 °C`. Het tijdelijke doel is alleen de verstuurde waarde. Een te grote correctie wordt tot Maximale correctie begrensd vóór optellen bij de actuele apparaatmeting.

De vaste-modusfase bestaat alleen tijdens runtime. Een nieuw blok, doel of HVAC-modus, het wissen van Room Assist of herladen van Velair begint een nieuwe cyclus. Een nieuwe `heat`-cyclus binnen de band begint naar de ondergrens om niet direct verwarming te vragen.

Als beveiliging het resultaat verandert, legt de actuele status beide waarden uit: berekend doel en werkelijk behouden doel. Overzicht toont **Doeltemperatuur beschermd**. Dit is normale bescherming, geen thermostaatfout, en maakt geen blijvende melding. Fysieke limieten houden hun aparte waarschuwing en melding.

Het apparaat blijft verantwoordelijk voor compressorbeveiliging, minimumlooptijden en fysieke reactie. De hysterese geeft een sterkere instelpuntstrategie, maar garandeert niet wanneer relais, klep of compressor precies omschakelt.

<a id="heating-with-a-capped-delta"></a>
## Verwarmen met begrensde correctie

Situatie:

- Gepland blok: `25 °C`, `heat`
- Kamersensor: `18 °C`
- Apparaattemperatuur: `17.1 °C`
- Dode band: `0 °C` (eerdere correctie met teken)
- Maximale correctie: `5 °C`

Het werkelijke kamerverschil is groot:

```text
25 - 18 = 7 °C
```

Velair begrenst de correctie:

```text
assist delta = 5 °C
climate target = 17.1 + 5 = 22.1 °C
```

Bij stap `0.5 °C` wordt het verwarmingsdoel naar beneden op `22 °C` afgerond.

Zo verstuurt Room Assist geen onrealistische doelen, maar blijft de thermostaat genoeg warmte toelaten om de kamer te verwarmen.

<a id="fixed-cooling-hysteresis-example"></a>
## Voorbeeld van hysterese bij vaste koeling

Situatie:

- Gepland blok: `24 °C`, `cool`
- Dode band: `±0.5 °C`
- Ondergrens: `23.5 °C`
- Bovengrens: `24.5 °C`
- Maximale correctie: `2 °C`
- Apparaatstap: `0.5 °C`

Koelen is symmetrisch, maar een nieuwe cyclus binnen de band begint veilig **naar de bovengrens**, zodat niet onmiddellijk koeling wordt gevraagd:

1. Bij beide sensoren op `24.0 °C` is de actieve rand `24.5 °C`:

   ```text
   correction = 24.5 - 24.0 = +0.5 °C
   climate target = 24.0 + 0.5 = 24.5 °C
   ```

   Een hoger doel bij vaste koeling ontmoedigt koelen.
2. Binnen de band blijft de fase gelijk. Wanneer de externe kamersensor `24.5 °C` bereikt, wisselt Velair naar `23.5 °C`.
3. Als de kamer dan `24.5 °C` en het apparaat `25.0 °C` meldt:

   ```text
   correction = 23.5 - 24.5 = -1.0 °C
   climate target = 25.0 - 1.0 = 24.0 °C
   ```

   Dit vraagt koeling.
4. Velair blijft naar de ondergrens richten terwijl de kamer `24.0 °C` passeert. Bij `23.5 °C` wisselt het terug naar `24.5 °C` en herhaalt.

Stapuitlijning en fysieke grenzen gelden voor elk tijdelijk doel. Apparaatfirmware bestuurt de werkelijke koelcyclus.

<a id="how-legacy-inversion-and-scheduled-protection-work-together"></a>
## Hoe eerdere omkering en geplande bescherming samenwerken

Omkering van het teken en bescherming van het geplande doel lossen verschillende delen van hetzelfde regelprobleem op. De correctie verandert van richting wanneer de meting van de externe kamersensor de doeltemperatuur passeert. De bescherming van het geplande doel vormt de laatste veiligheidsgrens wanneer de omgekeerde correctie bij een vaste HVAC-modus toch nog verwarming of koeling zou vragen ten opzichte van het geplande doel.

De koelvoorbeelden gebruiken schema `22 °C`, dode band `0 °C`, stap `0.5 °C` en voldoende Maximale correctie om niet te begrenzen. «Zonder omkering» en «vóór bescherming» zijn tussentijdse uitlegwaarden, geen kiesbare modi.

| Meting externe kamersensor | Apparaatmeting | Zonder omkering na passeren | Resultaat met teken vóór bescherming | Einddoel | Waarom |
| --- | --- | --- | --- | --- | --- |
| `24 °C` | `25.1 °C` | Niet van toepassing | `23.5 °C` | `23.5 °C` | De kamer moet nog koelen. |
| `21 °C` | `19 °C` | `19 °C` | `20 °C` | `22 °C` | Omkering verhoogt het doel, maar vraagt nog koeling; de geplande ondergrens geldt. |
| `21 °C` | `25 °C` | `25 °C` | `26 °C` | `26 °C` | Het sterkere omgekeerde doel ligt veilig boven het schema en blijft behouden. |

Bij verwarmen geldt hetzelfde principe. Met een geplande doeltemperatuur van `20 °C`, een externe kamersensor die `21 °C` meet en een interne sensor die `24 °C` meet, is het resultaat `23 °C`; de bescherming begrenst dit op het geplande maximum van `20 °C`. Wanneer de externe kamersensor `24 °C` meet en de interne sensor `21.5 °C`, is het sterkere omgekeerde resultaat van `17.5 °C` al veilig en blijft het behouden.

Omkering blijft dus nuttig: ze kan verder naar de niet-vragende kant gaan als de apparaatmeting dit toelaat; bescherming vangt interne metingen aan de verkeerde kant op.

Met niet-nul dode band gebruiken vaste `heat` en `cool` de beschreven onthouden cyclus, niet omschakelen bij het centrale doel. Bij dode band `0` blijft de eerdere berekening met teken: correctie wisselt teken bij passeren van het geplande doel, zonder hysteresegeheugen.

Een geschikt afzonderlijk `auto`- of `heat_cool`-doel behoudt ook die berekening. Binnen de dode band gebruikt Velair de dichtstbijzijnde ondersteunde doelwaarde bij de apparaatmeting, zonder actief afwisselend verwarmen/koelen af te dwingen. Een oorspronkelijk `heat_cool`-apparaat behoudt beide gebruikersgrenzen en krijgt het volledige gecorrigeerde bereik hieronder.

<a id="device-hysteresis-and-minimum-run-time"></a>
## Apparaathysterese en minimumlooptijd

Room Assist regelt het via Home Assistant verstuurde doel. Het vervangt geen firmwarehysterese, compressorbeveiliging, minimumlooptijd of de apparaatbeslissing over wanneer een gelijk doel als inactief geldt.

Een verwarmingscyclus naar de ondergrens vraagt bijvoorbeeld een doel dat verwarmen ontmoedigt totdat de externe sensor die rand bereikt. Een apparaat met brede interne hysterese of minimumlooptijd kan tijdelijk toch beginnen of doorgaan met verwarmen. Velair leidt geen ongedocumenteerde apparaatstopmarge af en inspecteert `hvac_action` niet om de fase te veranderen.

Geplande bescherming voorkomt dat een verschuivende interne sensor het doel voorbij het gebruikersschema duwt; ze belooft geen onmiddellijke HVAC-stop. Een externe sensor direct koppelen of apparaatkalibratie blijft waar beschikbaar de beste optie. Gebruik een `Uit`-blok als expliciet stoppen nodig is in plaats van vasthouden door de thermostaat.

Maximale correctie moet groot genoeg zijn voor de omgekeerde correctie die het apparaat nodig kan hebben. De editor toont dit advies onder de instellingsnaam. Bijvoorbeeld:

```text
Thermostat stopping gap: 2.5 °C
Maximum assist delta:    2.0 °C  -> may be insufficient
Maximum assist delta:    3.0 °C  -> permits enough inverse correction
```

`3 °C` instellen past niet meteen `3 °C` correctie toe. Het staat alleen toe dat Room Assist die waarde bereikt wanneer het externe kamerverschil dit vereist.

<a id="why-climate-target-can-differ-from-the-calculation"></a>
### Waarom het apparaatdoel kan afwijken van de berekening

**Klimaatdoel** is het actuele gemelde instelpunt als Room Assist gereed of geblokkeerd is. Bij actief corrigeren of behouden van een toegepast enkel doel toont het juist het tijdelijke verstuurde instelpunt. Geen van beide is het geplande kamerdoel of de actieve hysteresegrens. Apparaten accepteren doelen op een eigen raster; Velair lijnt daarom zo nodig uit op de huidige gemelde, laatst gemelde, handmatige of standaardstap.

Room Assist kan bijvoorbeeld bij vaste koeling `23.9 °C` berekenen voor een apparaat met stappen `0.5 °C`. Velair past `24.0 °C` toe: naar boven afronden voorkomt sterker koelen dan berekend. Verwarming wordt naar beneden uitgelijnd; automatische enkeldoelmodi gebruiken de dichtstbijzijnde stap. De informatieknop naast **Klimaatdoel** past de uitleg aan de getoonde waarde aan. Bij werkelijk gewijzigde uitlijning toont deze berekening, effectieve stap en toegepaste waarde. Fysieke grenzen en geplande bescherming worden apart gemeld, niet als stapuitlijning.

<a id="heatcool-range-example"></a>
## Voorbeeld van een verwarmings-/koelbereik

Room Assist ondersteunt oorspronkelijke `heat_cool`-bereiken. Onder- en bovendoel vormen één comfortband en verschuiven altijd samen; de afstand verandert nooit.

Situatie:

- Gepland bereik: `19–24 °C`
- Kamersensor: `18 °C`
- Apparaattemperatuur: `22 °C`
- Maximale correctie: `2 °C`
- Apparaatstap: `0.5 °C`

De kamer ligt `1 °C` onder de verwarmingsgrens. Velair legt de ondergrens `1 °C` boven de apparaatmeting en verschuift de bovengrens evenveel:

```text
applied range = 23–28 °C
```

Het apparaat meet `22 °C`, onder de toegepaste ondergrens, en kan daardoor verwarming vragen. Stijgt de kamertemperatuur later boven `24 °C`, dan gebruikt Velair de bovengrens op dezelfde manier voor koeling. Zodra de kamertemperatuur binnen de geplande band ligt, inclusief de dode band aan beide grenzen, verschuift Velair de toegepaste band zodat de apparaatmeting erin ligt. Die band blijft stabiel zolang de meting van de externe kamersensor binnen de band blijft. De band volgt latere veranderingen van de interne sensor niet, omdat die ook door de compressor, ventilator, klep of radiator kunnen ontstaan.

Het toegepaste bereik wordt altijd op de apparaatstap uitgelijnd en als geheel verschoven bij fysieke grenswaarden. Velair past Min en Max nooit apart aan.

Als berekend enkel doel of bereik het apparaatminimum/-maximum overschrijdt, past Velair het dichtstbijzijnde geldige resultaat toe. De actuele status toont gevraagd doel, toegepast doel en bereikte grens vóór de grafiek. Home Assistant maakt ook één blijvende melding voor de actieve grens; herhaalde sensorupdates maken geen duplicaten en herstel verwijdert de melding.

<a id="when-velair-does-nothing"></a>
## Wanneer Velair niets doet

Room Assist vereist een geldige positieve effectieve doelstap. Eerst geldt `target_temp_step` van het apparaat. Ontbreekt dit, dan beschermt de laatst geldige gemelde stap hetzelfde raster. Daarna geldt de handmatige zoneterugval uit Instellingen, standaard `1` als beide ontbreken. Opslaan terwijl het attribuut ontbreekt maakt de expliciete waarde leidend door de onthouden waarneming te wissen; een later geldig rapport wordt opnieuw onthouden. Velair leidt geen verband met een andere entiteit af.

Room Assist past geen gecorrigeerd doel toe wanneer:

- geen kamersensor is geselecteerd;
- Ondersteuning via kamersensor is uitgeschakeld;
- de planner niet automatisch draait;
- het apparaat gepauzeerd is of een tijdelijke aanpassing heeft;
- er geen actief temperatuurblok is;
- het actieve blok `Uit` is;
- kamer- of apparaattemperatuur niet beschikbaar of niet numeriek is;
- de berekende wijziging kleiner dan de apparaatstap is;
- de HVAC-modus niet als verwarmen of koelen kan worden geïnterpreteerd.

Velair behoudt of herstelt dan waar veilig het normale geplande doel.

<a id="external-adjustments-and-manual-adjustment"></a>
## Externe wijzigingen en handmatige aanpassing

Met standaard **Automatisch behouden** blijft Room Assist leidend en herberekent Velair het actuele gecorrigeerde doel na gedetecteerde externe doel- of moduswijzigingen. Met elk handmatig beleid geeft Room Assist bewust voorrang wanneer de wijziging het apparaat in **Handmatige aanpassing** brengt. Velair legt de volledige externe status uit de Home Assistant-statuswijziging vast, wist actieve correctie zonder het schemadoel te herstellen en behoudt het externe enkeldoel of oorspronkelijke `heat_cool`-bereik. Zo vecht Room Assist niet meteen tegen wijzigingen via kaart, fysieke afstandsbediening of andere niet-Velair-bronnen.

Voorbeeld:

```text
Scheduled cooling target: 24 °C
Room Assist temporary target: 26 °C
External adjustment: 23 °C
Result during Manual adjustment: 23 °C
```

Bij hervatten van automatische planning bepaalt Velair het dan geldige schema- of profieldoel. Room Assist berekent vanuit actuele metingen een nieuwe correctie; de oude `26 °C`-correctie of vaste-modushysteresefase keert niet terug. Herladen van Velair of Home Assistant geeft dezelfde runtime-reset: huidig blok opnieuw bepalen en veilig een nieuwe fase kiezen uit actuele modus en kamermeting.

Een geschikte externe wijziging behoudt automatische besturing of start/werkt handmatige aanpassing bij volgens het opgeslagen zonebeleid. Zie [Externe wijzigingen en handmatige aanpassing](manual-control.nl.md) voor beleid, services, tijdelijke-aanpassings-/profielinteracties en herkenningsgrenzen.

<a id="planned-return"></a>
## Geplande terugkeer

Tijdens [Geplande terugkeer](planned-return.nl.md) volgt Room Assist het tijdelijke aankomstdoel zodra de zone voorbereidt. Het blijft niet de afwezigheidstemperatuur gebruiken en keert er niet naar terug bij een nieuw afwezigheidsblok. Andere zones volgen Afwezig totdat hun eigen voorbereiding begint.

Een afwezigheidsdoel van 16 graden wordt bijvoorbeeld 21 graden bij voorbereiden van die kamer. Room Assist kan het fysieke instelpunt aanpassen om 21 graden op de kamersensor te bereiken. Handmatige aanpassingen en expliciete pauzes onderbreken de tussenkomst voor die zone. Een expliciete modus-/profielkeuze annuleert vervroegde voorbereiding en behoudt die keuze. **Annuleren** bij terugkeer beëindigt ook voorbereiding en herstelt na bevestigd vertrek de vastgelegde vorige modus en profielen. Zie [annuleringsvoorbeelden](planned-return.nl.md#cancelling-a-return-examples).

<a id="adaptive-preconditioning"></a>
## Adaptieve voorconditionering

Wanneer adaptieve voorconditionering een toekomstig blok eerder start, volgt Room Assist dat toekomstige doel tot het geplande comforttijdstip.

De kloktijd kan nog bij een ouder blok horen. Velair behandelt het al gestarte voorconditioneringsblok als actief beheerd doel, zodat Room Assist niet vanuit het vorige blok herberekent.

Bij ingeschakelde Ondersteuning via kamersensor gebruikt adaptieve voorconditionering ook de gekozen kamersensor voor beslissingen en leren.

<a id="automation-events"></a>
## Gebeurtenissen voor automatiseringen

Velair verstuurt het standaard Home Assistant-gebeurtenistype `velair_event`.

Room Assist verstuurt:

- `room_sensor_assist_state_changed`: Room Assist is in- of uitgeschakeld.
- `room_sensor_assist_updated`: een tijdelijk gecorrigeerd klimaatdoel is toegepast.
- `room_sensor_assist_restored`: beheer van het tijdelijke doel is gestopt en het normale doel is waar mogelijk hersteld.

Zie [Gebeurtenissen voor automatiseringen](automation-events.nl.md#room-sensor-assist-state-changed) voor volledige gegevens en alle herstelredenen.

Voorbeeldgegevens:

```yaml
event: room_sensor_assist_updated
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
target_temperature: 21
applied_temperature: 20
room_temperature: 18
climate_temperature: 17.1
assist_delta: 3.3
applied_offset: 2.9
direction: heat
hvac_mode: heat
hysteresis_phase: towards_upper
hysteresis_target: 21.3
deadband_low: 20.7
deadband_high: 21.3
reason: current_schedule
```

De vier hysteresevelden zijn optioneel. In automatiseringsgebeurtenissen verschijnen ze voor vaste enkeldoel-`heat` of `cool` met niet-nul dode band; ze ontbreken bij oude nul-dodebandcorrectie, automatische enkeldoelmodi en alle bereiken. Vaste bereiken met ingestelde referentie tonen hun hysteresefase in de live uitvoeringsstatus; hun gebeurtenissen behouden volledige grensparen en `range_shift`.

Een bereikupdate gebruikt volledige geplande en toegepaste banden in plaats van enkeldoelvelden:

```yaml
event: room_sensor_assist_updated
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
target_temp_low: 19
target_temp_high: 24
applied_target_temp_low: 23
applied_target_temp_high: 28
room_temperature: 18
climate_temperature: 22
assist_delta: 1
range_shift: 4
direction: heat
hvac_mode: heat_cool
reason: current_schedule
```

Voorbeeldtrigger:

```yaml
trigger:
  - platform: event
    event_type: velair_event
    event_data:
      event: room_sensor_assist_updated
      entity_id: climate.living_room
```

Room Assist is ook via automatiseringen te bedienen met:

- `velair.enable_room_sensor_assist`
- `velair.disable_room_sensor_assist`

<a id="lovelace"></a>
## Lovelace

Room Assist is beschikbaar als Lovelace-kaart:

```yaml
type: custom:velair-card
view: sensors
entities:
  - climate.living_room
```

De actuele temperatuurschaal scheidt twee relaties. Bij één doel vergelijkt de bovenste lijn kamersensor en gepland doel, de onderste besturingslijn apparaatmeting en apparaatdoel. Bij vaste `heat`/`cool` toont de gestreepte band beide hysteresegrenzen en noemt de status de actieve grens. Bij automatische enkeldoelmodi blijft het een neutrale marge. Bij een oorspronkelijk bereik tonen rode en blauwe haakjes de volledige geplande en toegepaste banden, met beide grenzen. Eén verbinding **Bereikverschuiving** met teken loopt tussen de middelpunten en vertegenwoordigt de hele bandverschuiving, niet één grens. Dit beschrijft alleen het door Velair gestuurde instelpunt, geen bewijs dat thermostaat, klep of compressor actief verwarmt of koelt.

In smalle dashboardkolommen schuift de schaal horizontaal om markeringen leesbaar te houden.

Je kunt onderdelen verbergen voor een compacte dashboardweergave:

```yaml
type: custom:velair-card
view: sensors
entities:
  - climate.living_room
show_room_assist_switch: false
show_room_assist_sensor: false
show_room_assist_deadband: false
show_room_assist_max_delta: false
show_room_assist_debounce: false
show_room_assist_live_status: true
```

Weggelaten opties `show_room_assist_*` zijn standaard `true`.

<a id="technical-details"></a>
## Technische details

Ontwikkelaarsdetails over opslagvelden, runtime-status, doelberekening, herstel en gebeurtenissen staan in [Interne werking van Room Assist](../developer/room-assist.md).
