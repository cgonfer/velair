<a id="room-assist"></a>
# Room Assist
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](room-assist.md) · [Español](room-assist.es.md) · [Français](room-assist.fr.md) · [Deutsch](room-assist.de.md) · [Italiano](room-assist.it.md) · [Nederlands](room-assist.nl.md) · [Polski](room-assist.pl.md) · [Português (Brasil)](room-assist.pt-br.md) · [Português (Portugal)](room-assist.pt-pt.md) · [Русский](room-assist.ru.md) · [Vertaalstatus](../translation-status.md)

<details>
<summary>Status van deze vertaling</summary>

| Gegeven | Status |
| --- | --- |
| Referentieversie | 1.9.3-beta.3 |
| Laatst gesynchroniseerd | 2026-11-22 |
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

Bij één doel in vaste `heat` of `cool` maakt een niet-nul dode band twee schakelgrenzen. Met afremming **Standaard** onthoudt Room Assist naar welke grens het beweegt en wisselt het pas wanneer de externe kamersensor de tegenoverliggende grens bereikt. Zo ontstaat een echte hysterese op basis van de externe sensor, in plaats van een interne sensor die rond het centrale doel een nieuwe cyclus begint. Maximale correctie begrenst de correctie met teken die vanaf de actieve grens wordt berekend. Optionele afremniveaus nemen de vraag sterker terug; **Hoog** begint daarmee bij het geplande doel in plaats van de verder gelegen schakelgrens.

Afzonderlijke doelen in `auto` en `heat_cool` en oorspronkelijke `heat_cool`-bereiken behouden hun neutrale of bereikmargegedrag. Velair dwingt deze modi niet om tijdens een hysterese voor één doel afwisselend actief te verwarmen en koelen.

De klimaatentiteit blijft het uitvoerende apparaat. Velair maakt geen virtuele klimaatentiteit en omzeilt apparaatfirmware niet. Als je thermostaat of radiatorkraan zelf een externe sensor kan koppelen, is dat doorgaans nog steeds de beste eerste keuze.

Kies voor twee instelpunten in vaste `heat` of `cool` eerst het **Referentie-instelpunt** per apparaat en modus bij **Instellingen → Klimaatapparaten en groepen**: **Onderste instelpunt** of **Bovenste instelpunt**, volgens wat het apparaat werkelijk gebruikt. Velair leidt dit niet af uit bereikondersteuning. Adaptieve voorconditionering deelt deze keuze.

Room Assist gebruikt de gekozen grens als vast verwarmings- of koeldoel, inclusief enkeldoelhysterese en bescherming van het geplande doel. Het verschuift beide grenzen evenveel en bewaart hun afstand. Beide moeten bij de doelstap en fysieke grenzen passen; de andere grens kan de correctie beperken. Informatie over fysieke grenzen blijft beschikbaar in de grafiek en **Technische gegevens**.

Bij **Niet ingesteld** worden vaste paren ongewijzigd zonder Room Assist-correctie verstuurd. `auto`-bereiken blijven ongeschikt voor ondersteuning; oorspronkelijke `heat_cool`-banden behouden hun gedrag. Opgeslagen instellingen blijven bewaard. Een referentie- of moduswijziging wist oude ondersteuning zonder een oud gecorrigeerd doel over de nieuwe intentie terug te zetten.

<a id="setup"></a>
## Instellen

1. Open Room Assist.
2. Vouw het gewenste apparaat uit.
3. Kies onder **Ondersteuning via kamersensor** voor **Vaste sensor** of **Volgens schema**, stel de gekozen optie in en sla een wissel op.
4. Schakel Ondersteuning via kamersensor in.
5. Stel de Room Assist-dode band in voor vast verwarmen of koelen rond het enkele doel of de gekozen bereikreferentie; bij automatische enkeldoelmodi en oorspronkelijke `heat_cool`-banden bepaalt deze de neutrale marge.
6. Pas Maximale correctie aan als de standaard te klein is voor die kamer of onder het verschil ligt dat de thermostaat nodig kan hebben om verwarmen/koelen te stoppen.
7. Kies eventueel **Afremming: Gemiddeld** of **Hoog** om de vraag sterker terug te nemen. Deze niveaus vereisen een Room Assist-dode band groter dan nul. **Standaard** behoudt het bestaande gedrag.
8. Pas Vernieuwingsvertraging aan als sensorupdates te traag of te frequent aanvoelen.

Alleen een kamersensor kiezen bewaart die sensor. Velair gebruikt deze pas als effectieve kamertemperatuur wanneer Ondersteuning via kamersensor is ingeschakeld.

Ondersteuning via kamersensor vereist geen adaptieve voorconditionering. Het kan bij normale temperatuurblokken en vervroegd gestarte voorconditioneringsblokken werken.

Een temperatuurblok met **Huidige modus behouden** past nog steeds het geplande doel toe. Room Assist gebruikt de werkelijk actieve apparaatmodus; staat het apparaat uit, dan start Velair het in een geschikte ondersteunde modus. **Huidige modus behouden** betekent bij een temperatuurblok niet dat het thermostaatdoel ongewijzigd blijft. Een blok met alleen opties heeft geen doel en gebruikt Room Assist niet.

Vernieuwingsvertraging is de wachttijd om snelle wijzigingen na kamer- of apparaattemperatuurupdates te bundelen. Standaard is dit `20` seconden; `0` herberekent meteen, maximaal `300` seconden groepeert frequente updates.

De Room Assist-dode band staat los van het minimumverschil voor adaptieve voorconditionering. Standaard is deze `0.3 °C` of `1 °F`, `0` schakelt haar uit en instellen kan in stappen van `0.1` graad tot `5 °C` of `9 °F`. Opslaan tijdens actieve Room Assist ververst het gecorrigeerde doel onmiddellijk.

De actuele grafiek tekent de nominale dode zone als dunne gearceerde strook direct boven de temperatuuras, met een bijpassende legenda eronder. Effectieve stop- en hervatdrempels komen uit de bevestigde regelstatus. **Hoog** kan de vraag dus bij het doel stoppen terwijl de volledige nominale strook zichtbaar blijft. Bij automatische modi met één doel stelt de strook de neutrale marge voor. Oorspronkelijke `heat_cool`-bereiken arceren alleen de buitenmarges naast de nominale band, met de legenda **Buitenmarge**. Bij een dode zone van nul is er geen arcering; de legenda toont de ingestelde nulmarge. Dit beschrijft ingestelde grenzen, geen sensorbeweging. Het verbergen van `show_room_assist_deadband` in een Lovelace Room Assist-kaart verbergt instelling, strook en legenda samen.

Alleen de gekozen optie wordt getoond. Wanneer **Vaste sensor** al de opgeslagen werkwijze is, wordt een andere sensor direct opgeslagen. Wisselen tussen **Vaste sensor** en **Volgens schema** wijzigt een concept: **Opslaan** past de werkwijze en de instellingen toe, en **Annuleren** herstelt de opgeslagen configuratie. De vaste sensor en het opgeslagen schema blijven bij het wisselen bewaard; beide worden niet tegelijk ingeschakeld.


<a id="optional-braking"></a>

### Optioneel afremmen

Afremming wijzigt het instelpunt dat naar het apparaat wordt gestuurd; de geplande temperatuur blijft het echte kamerdoel. Het is beschikbaar in vaste **Verwarmen** en **Koelen**, ook voor apparaten met twee instelpunten en een ingestelde referentie. Afzonderlijke automatische doelen en oorspronkelijke `heat_cool`-banden blijven ongewijzigd.

**T** is het geplande doel, **H** de Room Assist-dode band en **S** de effectieve instelpuntstap van het apparaat:

| Afremming | Verwarmen: vraag terugnemen | Verwarmen: opnieuw warmte vragen | Koelen: vraag terugnemen | Koelen: opnieuw koeling vragen |
| --- | --- | --- | --- | --- |
| Standaard | Bestaand gedrag | Bestaand gedrag | Bestaand gedrag | Bestaand gedrag |
| Gemiddeld | Bij T + H | Bij T − H | Bij T − H | Bij T + H |
| Hoog | Bij T | Bij T − H | Bij T | Bij T + H |

Tijdens het terugnemen beperkt **Gemiddeld** het verwarmingsinstelpunt tot maximaal **T − S**, of het koelinstelpunt tot minimaal **T + S**. **Hoog** gebruikt **twee stappen**. Als de bestaande berekening al meer vraag terugneemt, behoudt Velair dat sterkere resultaat. Dit zijn vaste grenzen zolang afremming actief is: sensorupdates tellen niet telkens nog een stap op of af.

Bijvoorbeeld met een verwarmingsdoel van `20.5 °C`, een dode band van `0.5 °C` en een apparaatstap van `0.5 °C`:

- **Gemiddeld** neemt de vraag terug bij `21 °C`, met een apparaatinstelpunt van maximaal `20 °C`.
- **Hoog** neemt de vraag terug bij `20.5 °C`, met een instelpunt van maximaal `19.5 °C`.
- Beide vragen opnieuw warmte wanneer de externe sensor `20 °C` bereikt.

Vóór het terugnemen blijft de bestaande ondersteuningsberekening ongewijzigd. Afremming blijft actief tot de hervattingsgrens, ook wanneer de kamer het centrale doel passeert. Wanneer ondersteuning start of herstart terwijl de kamer al binnen de band ligt, blijft de bestaande voorzichtige initialisatie behouden zonder bewust een verwarmings- of koelcyclus te beginnen.

De actuele status toont de effectieve temperaturen voor afremmen en hervatten. De grafiek houdt de nominale dode band zichtbaar en onderscheidt de effectieve afremdrempels. De gedeelde toevoervraag volgt dezelfde bevestigde fase.

Kies **Standaard** voordat je de dode band op nul zet. Het opgeslagen niveau blijft bewaard als de huidige modus of temperatuurreferentie het niet kan gebruiken; de status legt uit waarom extra afremming niet actief is. Ongeldige opgeslagen combinaties onderbreken extra afremming in plaats van stilzwijgend de dode band te wijzigen.

Fysieke minimum- en maximuminstelpunten kunnen de beschikbare afremming beperken. Bij twee instelpunten verschuift het volledige paar samen en kan elke grens de verschuiving beperken. **Technische gegevens** onderscheidt het gevraagde en toegepaste resultaat en de grafiek markeert de bereikte grens.

Afremming vermindert de gevraagde verwarming of koeling; het bevestigt niet dat klep, compressor of thermostaat gestopt is. Apparaatregeling, minimale looptijden en thermische traagheid kunnen nog steeds overschrijding veroorzaken. Deze instelling leert geen cycli en neemt de vraag niet vóór het geplande doel terug. Controleer haar met echte verwarmings- en koelcycli voordat je voor een bepaalde kamer op een niveau vertrouwt.

Draagbare exports gebruiken model **28** om afremming en voorbereidingsverschuivingen te bewaren. Bewaar een back-up uit de eerdere versie als je wilt kunnen teruggaan; oudere Velair-versies kunnen model 28 niet importeren.

<a id="optional-sensor-schedule-beta"></a>

### Optioneel sensorschema (bèta)

Room Assist kan gedurende de week verschillende temperatuurreferenties gebruiken zonder temperatuurschema’s, profielen of modi te wijzigen. Kies **Volgens schema** onder **Ondersteuning via kamersensor** om ze in te stellen. Kies **Vaste sensor** om terug te keren naar de vaste kamersensor.

Kies een standaardreferentie en voeg perioden toe met weekdagen, begin- en eindtijden en een referentie. Sla het volledige concept op om het toe te passen; Annuleren verwerpt je wijzigingen. Referenties kunnen temperatuursensoren zijn die in Home Assistant beschikbaar zijn, of de eigen temperatuur van het klimaatapparaat. Buiten de perioden geldt de standaardreferentie. Perioden mogen over middernacht lopen en horen bij de geselecteerde begindagen; overlappingen worden geweigerd. De begintijd is inbegrepen en de eindtijd niet. De tijden volgen de ingestelde tijdzone van Home Assistant.

Kies bijvoorbeeld **Geen Room Assist-correctie** als standaard en een kantoorsensor van 08:00 tot 17:00, maandag tot en met vrijdag. Je bestaande zomer-/wintertemperatuurschema’s blijven de gewenste temperatuur bepalen. Tijdens werktijden berekent Room Assist correcties met de kantoorsensor. Daarbuiten stuurt Velair het normale geplande doel en regelt de thermostaat met zijn eigen referentie. Dit verandert niet welke fysieke sensor de apparaatfirmware intern gebruikt.

De enige Room Assist-schakelaar bepaalt of ondersteuning is ingeschakeld. Uitschakelen bewaart beide configuraties. **Vaste sensor** kiezen en opslaan herstelt de bewaarde vaste kamersensor. Als een externe referentie niet beschikbaar is, onderbreekt Velair de correctie en gebruikt het normale geplande doel wanneer het automatisch de regeling beheert; het kiest niet stilzwijgend een andere kamer en gebruikt geen oude meting opnieuw. Ondersteuning hervat zodra die referentie weer bruikbaar is.

Referentiewissels nemen de regeling niet over van handmatige aanpassing, Boost of pauzes. Wanneer de automatische regeling hervat, gebruikt Velair de referentie die op dat moment geldt. Voor kamergroepen betekent de eigen apparaattemperatuur de ingestelde temperatuurreferentie van de groep.

**Bètabeperking:** een referentie wisselt precies op de geplande tijd. Adaptieve voorconditionering start geen vervroegd doel over een referentiewissel heen; na die overgang wordt opnieuw berekend. Een kamerwissel is geen verzoek om de volgende kamer eerder voor te bereiden. Leerwaarnemingen worden aan hun temperatuurbron gekoppeld, zodat een meetverschil tussen kamers niet wordt geïnterpreteerd als verwarming of koeling.

Alle geselecteerde externe metingen moeten onafhankelijk beschikbaar zijn in Home Assistant. Voor Nest moet een opstelling met de officiële integratie voor de thermostaat en een andere integratie voor een externe sensor in de installatie worden getest. Houd Nests eigen referentie vast als je de thermostaatmeting als stabiele kamerreferentie wilt gebruiken. Velair kiest Nests interne actieve sensor niet. Een gedeeld HVAC-systeem blijft alle aangesloten kamers beïnvloeden; een referentie kiezen maakt geen onafhankelijke fysieke zones.

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

Bij actieve Room Assist vat Overzicht dit zo nodig samen als **Naar de ondergrens**, **Naar de bovengrens**, **Actief**, **Vasthouden** of **Doeltemperatuur beschermd**, met geplande en toegepaste waarden. Een apparaatminimum/-maximum verschilt van geplande bescherming: de grafiek markeert de bereikte fysieke grens, **Technische gegevens** scheiden gevraagde en toegepaste waarden; Home Assistant toont één blijvende melding totdat die fysieke begrenzing vervalt.

<a id="fixed-heating-hysteresis-example"></a>
## Voorbeeld van hysterese bij vaste verwarming

Voorbeeld met afremming **Standaard**:

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

Als beveiliging het resultaat verandert, legt de actuele status beide waarden uit: berekend doel en werkelijk behouden doel. Overzicht toont **Doeltemperatuur beschermd**. Dit is normale bescherming, geen thermostaatfout, en maakt geen blijvende melding. Fysieke limieten blijven zichtbaar in de grafiek en **Technische gegevens**, met hun aparte melding.

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

Voorbeeld met afremming **Standaard**:

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

Deze instelling begrenst de proportionele correctie, niet het uiteindelijke instelpunt na bescherming van het geplande doel. Optionele afremming versterkt die bescherming met een grens van één of twee stappen; het wijzigt Maximale correctie niet en past niet bij elke update het volledige maximum toe.

<a id="why-climate-target-can-differ-from-the-calculation"></a>
### Waarom het apparaatdoel kan afwijken van de berekening

**Instelpunt** is de actuele door de klimaatentiteit gemelde waarde als Room Assist gereed of geblokkeerd is. Bij actief corrigeren of behouden van een toegepast enkel doel toont het juist het tijdelijke verstuurde instelpunt. Geen van beide is het geplande kamerdoel of de actieve hysteresegrens. Apparaten accepteren doelen op een eigen raster; Velair lijnt daarom zo nodig uit op de effectieve huidige gemelde, laatst gemelde, handmatige of standaardstap.

Room Assist kan bijvoorbeeld bij vaste koeling `23.9 °C` berekenen voor een apparaat met stappen `0.5 °C`. Velair past `24.0 °C` toe: naar boven afronden voorkomt sterker koelen dan berekend. Verwarming wordt naar beneden uitgelijnd; automatische enkeldoelmodi gebruiken de dichtstbijzijnde stap. Vouw de chip **Instelpunt** uit of open **Technische gegevens** om de getoonde waarde en beschikbare berekening, effectieve stap en toegepaste waarde te bekijken. Als uitlijning het bevestigde instelpunt veranderde, toont **Technische gegevens** ook de waarde vóór stapuitlijning. Fysieke minimum- en maximumgrenzen en bescherming van het geplande doel worden apart gemeld, niet als stapuitlijning.

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

Als berekend enkel doel of bereik het apparaatminimum/-maximum overschrijdt, past Velair het dichtstbijzijnde geldige resultaat toe. De grafiek markeert de bereikte grens; **Technische gegevens** tonen het gevraagde en toegepaste enkele doel of bereik. Home Assistant maakt ook één blijvende melding voor de actieve grens; herhaalde sensorupdates maken geen duplicaten en herstel verwijdert de melding.

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

Optionele aparte verwarmings- en koelverschuivingen stel je in bij Voorconditionering. Room Assist berekent het basisdoel uit het oorspronkelijke kamerdoel; daarna past Velair de voorbereidingsextra toe. Apparaatgrenzen verminderen de extra; banden met twee instelpunten behouden hun breedte. Een positief ingestelde verschuiving houdt de voorbereidingsrichting tijdelijk vast tot de oorspronkelijke kamerdrempel, ook bij effectieve extra nul of een overgenomen fase zonder vraag. Na die drempel of de geplande start eindigt de extra en hervatten gewone hysterese en afremming. Oorspronkelijke `heat_cool`-bereiken behouden hun bestaande beperkingen voor afremming.

Room Assist bevestigt de effectieve verwarmings- of koelvraag samen met het toegepaste doel. Tijdens voorbereiding omvat dit de tijdelijke vraag en blijft de gewone hysteresefase apart behouden. Gedeelde klimaattoevoer volgt die effectieve vraag via de bestaande Room Assist-integratie; er komt geen extra verschuiving, hysterese of voorbereidingsregel bij. Na de extra hervat gewone Room Assist-vraag. Een mislukte of achterhaalde opdracht bevestigt geen nieuwe vraag en mislukt herstel mag een vervallen voorbereiding niet onbeperkt toevoer laten vragen. Zie [Gedeelde klimaattoevoer](shared-climate-supply.nl.md#room-assist).

De grafiek houdt het nominale doel apart van het uiteindelijke Room Assist- plus voorbereidingsinstelpunt. Het extralabel omvat een beperkte `0`; **Technische gegevens** scheiden de basis, gevraagde extra, effectieve extra en uiteindelijke opdracht. Tijdens voorbereiding heeft de drempel **Voorbereiding eindigt** een informatieknop die de ingestelde aankomstmarge uitlegt. Een doel `21 °C` met aankomstmarge `0.1 °C` beëindigt verwarmingsvoorbereiding bij `20.9 °C`; dit staat los van de Room Assist-regelband. Zie [Tijdelijke instelpuntverschuiving](adaptive-preconditioning.nl.md#temporary-setpoint-offset) voor voorbeelden van verwarming, koeling en fysieke grenzen.

<a id="automation-events"></a>
## Gebeurtenissen voor automatiseringen

Updategebeurtenissen kunnen ook een object `braking` bevatten met het ingestelde en effectieve niveau, de actieve fase, effectieve stop- en hervattingstemperaturen, instelpuntgrens en een eventuele reden voor inactiviteit. Deze extra velden beschrijven de bevestigde vraagregeling, niet de fysieke HVAC-activiteit. Zie [Room Sensor Assist bijgewerkt](automation-events.nl.md#room-sensor-assist-updated) voor een voorbeeld.

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

Het zijpaneel en de kaarten gebruiken dezelfde actuele grafiek. Compacte chips **Kamer**, **Doel**, **Apparaat** en **Instelpunt** zijn loodrecht verbonden met hun temperatuurpositie. Wijs een chip aan, focus erop of druk erop voor details. **Normaal** toont de huidige vraag en volgende drempel; **Gedetailleerd** voegt het verschil tussen kamer en doel, de totale aanpassing en eventuele voorbereidingsextra die al in dat totaal zit toe. Meetlabels staan bij voldoende ruimte op hun lijnen en anders eronder.

Een doorgetrokken pijl betekent gevraagde verwarming of koeling. Een gestreepte pijl betekent wachten en wijst naar de hervatdrempel. De pijlen beschrijven Room Assist-vraag, geen gemeten temperatuurtrend of bewijs dat een klep of compressor werkt. Wanneer bevestigde vraag ontbreekt, meldt de grafiek die onzekerheid in plaats van een aanvraag of wachtstatus te verzinnen.

De gearceerde strook direct boven de as behoudt de nominale regelband en legenda. Een effectieve afremstop staat apart aangegeven; de strook betekent niet dat de vraag na die stop doorgaat. De instelpuntchip noemt afremming alleen wanneer de beveiliging de toegepaste opdracht werkelijk veranderde. Voor een oorspronkelijk `heat_cool`-bereik tonen aparte haakjes de volledige doel- en toegepaste banden, met arcering bij de buitenste Room Assist-marges. Fysieke grenzen zijn gelabeld.

De grafiek toont de vraag in de statusbadge, de metingen in de temperatuurchips en de stop- of hervattingsdrempel naast de pijl. Als een ontbrekende kamermeting deze relatie niet laat tekenen, blijft de drempel in de statusbadge staan. **Uitleg** opent onder de grafiek korte context: hoe sensormetingen verschillen, waarom een cyclus na het bereiken van het comfortdoel doorgaat, of welke voorbereiding, afremming of apparaatgrens de aanpassing beïnvloedt. Dit voegt context toe zonder de getoonde temperaturen, vraag of hulp over de regelband te herhalen. De grafiek heeft geen aparte herhaalde samenvatting eronder.

**Technische gegevens** groeperen de instelpuntstappen van het apparaat, regelgrenzen en bron/tijdgegevens in hetzelfde detailgebied. Metingen blijven in de grafiek en worden niet in een tweede tabel herhaald. Opeenvolgende berekende, gevraagde, vóór stapuitlijning bepaalde en toegepaste waarden delen één rij wanneer ze overeenkomen, terwijl elke fase benoemd blijft. Verschillende waarden blijven apart. Bereikopdrachten en bewijs voor hun afzonderlijke referentie-instelpunt blijven gescheiden. Stop- en hervattingswaarden worden niet herhaald als volgende drempel of identieke nominale grens; de cyclusrichting wordt zonder herhaling van de temperatuur getoond. Apparaatstap en relevante beveiligingen of fysieke grenzen blijven beschikbaar. Voorbereidingsextra heeft een eigen groep, inclusief gevraagde en toegepaste waarden als ze verschillen en een begrensde nul. Bron/tijdgegevens tonen de sensorentiteit en de blokstart met datum, met alleen de kloktijd als terugval. Groepen worden in smalle panelen en kaarten onder elkaar geplaatst. Er staat maar één detailweergave tegelijk open; selecteer de knop opnieuw of druk op Escape om deze te sluiten. De knoppen ondersteunen toetsenbord en aanraking; details blijven onder de grafiek zonder andere bediening te bedekken. Een detailweergave openen of sluiten verandert de besturingsvraag niet. De grafiek past zich aan smalle kolommen aan zonder de temperatuurschaal te veranderen of een meting van de werkelijke positie te verplaatsen.

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
