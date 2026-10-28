<a id="environmental-comfort"></a>
# Omgevingscomfort
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](comfort.md) · [Español](comfort.es.md) · [Français](comfort.fr.md) · [Deutsch](comfort.de.md) · [Italiano](comfort.it.md) · [Nederlands](comfort.nl.md) · [Polski](comfort.pl.md) · [Português (Brasil)](comfort.pt-br.md) · [Português (Portugal)](comfort.pt-pt.md) · [Русский](comfort.ru.md) · [Vertaalstatus](../translation-status.md)

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

Het standaardbereik voor een comfortabele temperatuur is `20–24 °C`. Als Home Assistant Fahrenheit gebruikt, is het standaardbereik `68–75 °F`, met grenzen afgerond op hele graden.

Comfortdrempels gebruiken de ingestelde Home Assistant-temperatuureenheid en worden samen met de andere opgeslagen temperatuurgegevens van Velair gemigreerd of geïmporteerd. Een temperatuursensor die de andere eenheid vermeldt, wordt geconverteerd voordat de meting met de comfortdrempels van het beheerde klimaatapparaat wordt vergeleken.

Omgevingscomfort geeft voor elk beheerd klimaatapparaat een begrijpelijke beschrijving van de kamer in plaats van een algemeen waarschuwingsniveau.

Comfort blijft onafhankelijk voor elk fysiek apparaat in een kamergroep. Elk lid heeft eigen bewaking, sensoren, drempels en beoordeling. Groeperen deelt planning en kamerbesturing zonder die instellingen te vervangen.

Het volgt lokaal beschikbare metingen van temperatuur, luchtvochtigheid en CO2. Het verandert geen schema's en bestuurt apparaten niet automatisch. Velair toont de beoordeling in het paneel, Lovelace-kaarten en Home Assistant-gebeurtenissen, zodat automatiseringen kunnen bepalen wat ze ermee doen.

<a id="sources"></a>
## Bronnen

Voor temperatuur wordt de eerste beschikbare bron in deze volgorde gebruikt:

1. de temperatuursensor die in het tabblad Comfort is geselecteerd;
2. de Room Assist-sensor die voor het klimaatapparaat is ingesteld;
3. de `current_temperature` van de klimaatentiteit.

Voor groepsleden gebruikt automatische temperatuur het fysieke `current_temperature` van het lid; de Room Assist-sensor van de groep wordt niet overgenomen. Kies indien nodig expliciet een externe sensor in de Comfortconfiguratie van dat lid.

Voor luchtvochtigheid wordt gebruikt:

1. de luchtvochtigheidssensor die in het tabblad Comfort is geselecteerd;
2. het gemeten attribuut `current_humidity` van de klimaatentiteit, wanneer beschikbaar. Het attribuut `humidity` is een doelinstelling en geen meting.

De standaardoptie `Automatische bron gebruiken` behoudt dit automatische gedrag. Kies `Luchtvochtigheid niet bewaken` als luchtvochtigheid de omgevingsconditie of gegevenskwaliteit van dat apparaat niet moet beïnvloeden. De opgeslagen sensorkeuze blijft bewaard, maar Velair leest de sensor niet uit en luistert er niet naar zolang luchtvochtigheidsbewaking is uitgeschakeld.

CO2 wordt alleen gevolgd wanneer een CO2-sensor is geselecteerd.

De effectieve entiteits-ID verschijnt onder elke keuzelijst. Optionele metingen zonder bron gelden niet als fouten.

<a id="comfort-models"></a>
## Comfortmodellen

Velair biedt drie manieren om het temperatuur- en relatieve-luchtvochtigheidsgebied te beschrijven dat voor een kamer geschikt is. Dit is een door de gebruiker ingesteld doel, geen universele of medische definitie van comfort.

- **Eenvoudige bereiken** is de standaard. Eén temperatuurbereik en één luchtvochtigheidsbereik vormen het bekende rechthoekige doelgebied. Bestaande configuraties behouden dit gedrag.
- **Begeleid psychrometrisch bereik** gebruikt één luchtvochtigheidsbereik als referentie bij het midden van het ingestelde temperatuurbereik. Velair volgt het fysieke verband tussen temperatuur en relatieve luchtvochtigheid om dat bereik automatisch aan te passen. De grafiek toont het resulterende gebogen doelgebied in plaats van een rechthoek. Dit is praktische lokale begeleiding, geen volledige fysiologische comfortnorm.
- **Temperatuurafhankelijke bereiken** behoudt hetzelfde temperatuurbereik, maar laat je verschillende minimum- en maximumwaarden voor luchtvochtigheid instellen aan de koele en warme kant. Velair verbindt deze bereiken geleidelijk, zodat een schuin vierhoekig doelgebied ontstaat in plaats van een rechthoek.

Een kamer met `20–24 °C` kan bijvoorbeeld `40–60%` bij `20 °C` en `35–50%` bij `24 °C` accepteren. Bij `22 °C` beoordeelt Velair de luchtvochtigheid tegen het middenbereik: `37.5–55%`. Onder of boven het ingestelde temperatuurinterval gebruikt het de dichtstbijzijnde eindwaarden, zonder buiten de gekozen waarden te extrapoleren.

Het actuele effectieve luchtvochtigheidsbereik staat onder de kaart. Hetzelfde door de backend berekende bereik stuurt de getoonde conditie, de samenvatting van het bereik, de entiteit Omgevingsconditie, gebeurtenissen, Diagnose en optionele buitenadviezen aan. Clients berekenen geen tweede interpretatie. Als de huidige temperatuur ontbreekt of verouderd is, kan Velair nog een actuele luchtvochtigheidsmeting tonen, maar het classificeert deze niet en geeft geen luchtvochtigheidsadvies totdat het effectieve bereik kan worden berekend.

Het begeleide model vereist een herkenbare luchtvochtigheidsbron, afkomstig van het beheerde klimaatapparaat of van een geselecteerde Home Assistant-sensor. De optie blijft onbeschikbaar totdat een bron is gevonden. Als deze tijdelijk niet beschikbaar is, behoudt Velair het gekozen model en de instellingen en wacht het op actuele gegevens, in plaats van van model te wisselen.

De twee aangepaste luchtvochtigheidsbereiken aan de eindpunten kunnen bij veranderende temperatuur stijgen, dalen of gelijk blijven. Velair legt geen richting op, omdat gebouwen en bewoners verschillen. Begeleid is de compacte keuze als hetzelfde percentage relatieve luchtvochtigheid niet bij elke temperatuur hetzelfde moet worden beoordeeld. Gebruik aangepaste bereiken alleen als het gemeten gedrag van de kamer een duidelijke reden geeft om beide eindpunten afzonderlijk in te stellen.

Voordat de eindpuntbereiken zijn aangepast, houdt een wijziging van het eenvoudige luchtvochtigheidsbereik beide eindpunten daarmee gelijk. Zodra een temperatuurafhankelijk bereik is aangepast, bewaart Velair dit bij het wisselen van modellen, zodat een alternatieve configuratie niet verloren gaat.

<a id="additional-environmental-information"></a>
## Aanvullende omgevingsinformatie

De Comfort-configuratie kan optioneel drie metingen toevoegen aan de informatie die Velair al voor een beheerd klimaatapparaat heeft:

| Meting | Wat deze aan Velair toevoegt |
| --- | --- |
| **Dauwpunt** | Een compacte aanduiding van hoe dicht de lucht bij omstandigheden voor condensatie is. Dit stelt niet vast dat condensatie zal optreden: Velair kent de temperatuur van muren, ramen of andere oppervlakken niet. |
| **Absolute luchtvochtigheid** | De massa waterdamp per kubieke meter lucht, weergegeven in `g/m³`. In tegenstelling tot relatieve luchtvochtigheid is dit geen percentage van het verzadigingsniveau van de lucht. Velair hanteert hiervoor geen universeel goed/slecht bereik. |
| **Humidex** | Een aanvullende waarde voor ervaren warmte, afgeleid van temperatuur en luchtvochtigheid. Velair toont de waarde, maar zet gepubliceerde categorieën niet om in aanbevelingen en gebruikt deze niet als volledige score voor binnencomfort. |

Schakel alleen de metingen in die je dashboard of automatiseringen helpen. Ze zijn niet nodig voor de normale Comfort-conditie en zijn allemaal standaard uitgeschakeld.

De uitgevouwen apparaatweergave scheidt actuele informatie van instellingen. Ingeschakelde metingen verschijnen in een compacte, responsieve groep direct onder de temperatuur-/luchtvochtigheidskaart en CO2-schaal. Elk onderdeel bevat de huidige waarde of beschikbaarheidsstatus en toegankelijke informatiehulp, nooit een schakelaar of bronkeuze. Uitgeschakelde metingen laten geen lege kaart of rasterplek achter.

Alle instellingen staan onder **Comfortconfiguratie**, standaard ingeklapt zodat de actuele beoordeling centraal blijft. Compacte onderdelen scheiden gegevensbronnen, het comfortmodel, modelspecifieke voorkeuren, aanbevelingen en aanvullende omgevingsinformatie. Instellingen voor afgeleide metingen bevatten alleen de inschakelknop en bronkeuze, geen herhaling van de actuele meting. Het configuratiepaneel blijft beschikbaar als Comfort-bewaking is uitgeschakeld, zodat je een apparaat vooraf kunt instellen. Het openen of sluiten is een lokale interfacekeuze en wordt niet als configuratie opgeslagen.

Elke meting is standaard uitgeschakeld en heeft één bronkeuze. De eerste optie is **Calculated by Velair**; de overige opties zijn compatibele Home Assistant-sensoren, zodat een externe meting geen tweede entiteitsinstelling nodig heeft:

- **Calculated by Velair** gebruikt de effectieve temperatuur- en luchtvochtigheidsmetingen die voor Comfort van dat apparaat zijn gekozen. Als luchtvochtigheid niet wordt gevolgd of een invoer ontbreekt, wordt de berekende meting als ontbrekend gemeld.
- **Home Assistant entity** leest een bestaande `sensor.*`-entiteit. Deze kan afkomstig zijn van Thermal Comfort, een sjabloon of een andere integratie; Thermal Comfort is niet vereist en wordt niet speciaal gedetecteerd.

Een externe dauwpuntsensor moet `°C` of `°F` melden. Velair toont de waarde in de temperatuureenheid van het beheerde klimaatapparaat. Een sensor voor absolute luchtvochtigheid moet `g/m³` of `mg/m³` melden; Velair toont `g/m³`. Een Humidex-sensor mag de gebruikelijke weergave `°C` of `°F` van temperatuurentiteiten gebruiken of een waarde zonder eenheid. Velair normaliseert deze naar de canonieke Humidex-waarde zonder eenheid, ook bij Fahrenheit-installaties.

Velair normaliseert geldige metingen en meldt ontbrekende, verouderde of ongeldige bronnen zonder de bestaande omgevingsconditie of gegevenskwaliteit te veranderen. Een ingeschakelde externe meting mag worden opgeslagen zonder al een entiteit te kiezen; deze geldige maar onvolledige configuratie wordt als ontbrekend gemeld en blijft bij export/import behouden. Home Assistant-statussen `unknown` en `unavailable` gelden als ontbrekend. Niet-numerieke waarden, ongeschikte eenheden en negatieve absolute luchtvochtigheid zijn ongeldig.

Deze metingen dienen uitsluitend ter informatie. Ze veranderen nooit een schema, HVAC-modus, doeltemperatuur, Room Assist-correctie of voorconditioneringsbeslissing. Humidex vult met name de echte temperatuur- en luchtvochtigheidsmetingen aan in plaats van één ervan te vervangen, zodat luchtvochtigheid niet dubbel wordt meegeteld.

<a id="comfort-insights"></a>
## Inzichten over comfort

Velair houdt de ingestelde temperatuur-/luchtvochtigheidsconditie als hoofdsamenvatting en groepeert compacte contextkaarten boven de metingen. Ze lichten overschreden CO2-drempels, een betekenisvolle Humidex-toename en eventuele ventilatiekansen of afwegingen toe, zonder de conditie te herhalen of de kaart of CO2-schaal te vervangen.

De formulering is voorzichtig. Humidex verschijnt alleen als inzicht wanneer de ervaren warmte minimaal 1 °C boven de luchttemperatuur ligt. Verhoogde of slechte CO2-waarden kunnen ook een inzicht toevoegen. Dauwpunt en absolute luchtvochtigheid blijven bruikbare metingen in plaats van permanente berichten: hun informatieknop verklaart respectievelijk de mogelijke drempel voor oppervlaktecondensatie en de hoeveelheid waterdamp. De hulp is bereikbaar met de muis, toetsenbordfocus of een tik op een aanraakscherm. Ontbrekende, verouderde en ongeldige metingen worden genegeerd. Buiteninformatie verandert de binnenconditie of klimaatbesturing niet.

Actuele waarden verschijnen in de uitgevouwen apparaatregel van het tabblad **Comfort**. De Comfort-weergave van Lovelace gebruikt dezelfde presentatie. Als Comfort is ingeschakeld op een Velair-kaart voor één klimaatapparaat, bevat de uitgevouwen samenvatting elke ingeschakelde actuele afgeleide meting. De kaart-editor kan deze ook in de ingeklapte Comfort-regel onder Huidige status opnemen wanneer je dashboard compactere informatie nodig heeft.

Ontbrekende, verouderde en ongeldige metingen blijven met hun status zichtbaar in de Comfort-weergave in plaats van een oud of verzonnen getal te tonen. Humidex staat naast de kamertemperatuur met een aanduiding van het verschil; in Fahrenheit wordt alleen het verschil omgerekend en nooit met 32 verhoogd. Verschillen staan ook in het contextbericht voor Humidex, met de zone-eenheid en één decimaal. Humidex zelf is een index voor ervaren warmte zonder eenheid, met Celsius als referentie. Het is geen fysieke temperatuur en Velair voegt geen eenheid aan de waarde toe.

Bij actuele Humidex toont het paneel ook een compacte vergelijkingsschaal. Twee markeringen wijzen de kamerluchttemperatuur en Humidex aan; de gemarkeerde band is het ingestelde temperatuurbereik voor het apparaat. De status vermeldt of Humidex onder, binnen of boven dat bereik ligt, zonder te beweren dat de kamer comfortabel of gevaarlijk is. De schaal loopt 5 °C onder en boven het ingestelde bereik door, zodat nabije verschillen leesbaar blijven. In Fahrenheit worden absolute schaallabels normaal geconverteerd; het verschil wordt alleen vermenigvuldigd met `9 / 5` en Humidex blijft zonder eenheid. Ontbrekende of ongeldige gegevens krijgen geen verzonnen positie.

Dauwpunt wordt neutraal beschreven als hoger of lager dan de kamerluchttemperatuur. Absolute luchtvochtigheid blijft een neutrale meting in `g/m³`. Definities staan achter toegankelijke informatieknoppen om de panelen compact te houden.

De hoofdsamenvatting begint altijd met de fysieke omgevingsconditie, op basis van de ingestelde temperatuur- en luchtvochtigheidsmetingen. Als Humidex is ingeschakeld en de positie ten opzichte van het kamertemperatuurbereik afwijkt, toont een tweede **Humidex**-label of de ervaren warmte onder, binnen of boven het ingestelde bereik ligt. Zo blijft de fysieke conditie zichtbaar in plaats van door een afgeleide interpretatie te worden vervangen. Het Humidex-paneel legt het gemeten verschil uit zonder de kamer warm, koud of comfortabel te noemen. Ontbrekende of ongeldige afgeleide gegevens veranderen de fysieke conditie nooit.

De hieronder beschreven compatibele waarde voor Omgevingsconditie verandert niet. Bestaande automatiseringen kunnen deze blijven gebruiken; Humidex en de bereiksamenvatting bieden alleen aanvullende informatie en besturen het klimaatapparaat nooit.

<a id="indoor-vs-outdoor"></a>
## Binnen en buiten vergelijken

Een optionele buitenvergelijking voegt context toe zonder de binnenconditie van Comfort te veranderen. Schakel **Indoor vs outdoor** in het ingeklapte paneel **Comfortconfiguratie** in, kies expliciet een buitentemperatuursensor en eventueel een buitenluchtvochtigheidssensor. Bij uitschakelen blijven deze sensorkeuzes bewaard, zodat je de vergelijking opnieuw kunt inschakelen zonder alles opnieuw in te stellen.

Het actuele paneel blijft gescheiden van de grafiek. Het toont binnen- en buitentemperatuur met hun verschil, absolute luchtvochtigheid binnen en buiten en de relatieve luchtvochtigheid die buitenlucht zou hebben na het bereiken van de huidige binnentemperatuur. Op brede schermen staan de twee gebieden naast elkaar; op mobiel onder elkaar.

Beide waarden voor absolute luchtvochtigheid komen rechtstreeks uit de backend. Als een oudere backend de binnenwaarde niet levert, toont de interface deze als niet beschikbaar in plaats van een fysieke meting uit afgeronde verschillen te reconstrueren.

Velair kan één voorzichtig geformuleerde ventilatiekans of afweging van de backend tonen in het gezamenlijke inzichtgedeelte boven de metingen. Een kans die alleen op temperatuur berust, vermeldt uitdrukkelijk dat het luchtvochtigheidseffect niet beschikbaar is. Ontbrekende, verouderde, ongeldige of niet-gevolgde metingen worden als status getoond, zonder oude waarden of onjuiste vergelijkingen te gebruiken.

Velair maakt ook één enum-sensor **Ventilatiemogelijkheid** per beheerd klimaatapparaat aan. Hiermee blijft het huidige resultaat na herstart beschikbaar voor dashboards en automatiseringen, zonder de compatibele status van Omgevingsconditie te veranderen. Zie [Ventilatiekans](zone-sensors.nl.md#ventilation-opportunity).

Met **Ventilation guidance** in hetzelfde configuratiepaneel bepaal je per apparaat hoe groot een nuttig verschil moet zijn voordat Velair deze context toont:

| Instelling | Standaard | Wat wordt gefilterd |
| --- | --- | --- |
| Temperatuurverschil | `1 °C` / `1.8 °F` | Kleine verschillen tussen de binnen- en buitentemperatuur. |
| Aangepast luchtvochtigheidsverschil | `5` procentpunten | Kleine voorspelde veranderingen in relatieve luchtvochtigheid nadat buitenlucht de binnentemperatuur bereikt. |
| Verschil in vochtgehalte | `1 g/m³` | Kleine verschillen in absolute luchtvochtigheid die alleen door de temperatuur nuttig zouden kunnen lijken. |

De luchtvochtigheidsinstellingen verschijnen nadat je een buitenluchtvochtigheidssensor kiest. De waarden blijven bewaard als je die sensor of de vergelijking later uitschakelt. Lagere waarden maken het advies gevoeliger; hogere waarden vereisen een duidelijker verschil. Deze marges vervangen de ingestelde comfortbereiken niet: de buitenlucht moet de kamer nog steeds richting het relevante bereik brengen.

Deze functie biedt visuele informatie en werkt gebeurtenisgestuurd. Ze opent of sluit geen ramen en verandert geen doeltemperatuur, modus, schema, pauze of tijdelijke aanpassing. Velair gebruikt alleen de gekozen `sensor.*`-entiteiten en valt niet terug op weergegevens.

Velair maakt geen drie extra proxy-sensorentiteiten aan. Ingeschakelde metingen zijn beschikbaar onder het attribuut `derived_metrics` van de bestaande zonesensor **Omgevingsconditie**, in de schema-API, Diagnose en de gebeurtenis `comfort_assessment_changed`. Zo blijft er één bron van waarheid, terwijl dashboards en automatiseringen de gegevens kunnen gebruiken. Zie [Omgevingsconditie](zone-sensors.nl.md#environmental-condition) voor alle statussen, attributen, defensieve sjablonen en advies over de keuze tussen entiteit en gebeurtenis voor een automatisering.

<a id="environmental-conditions"></a>
## Omgevingscondities

Temperatuur en luchtvochtigheid worden ten opzichte van de ingestelde bereiken geclassificeerd en tot één compatibele omgevingsconditie gecombineerd:

| Temperatuur | Luchtvochtigheid | Conditie |
| --- | --- | --- |
| Onder bereik | Onder bereik | `Koud en droog` |
| Onder bereik | Binnen bereik | `Koud` |
| Onder bereik | Boven bereik | `Koud en vochtig` |
| Binnen bereik | Onder bereik | `Droge lucht` |
| Binnen bereik | Binnen bereik | `Comfortabel` |
| Binnen bereik | Boven bereik | `Vochtig` |
| Boven bereik | Onder bereik | `Warm en droog` |
| Boven bereik | Binnen bereik | `Warm` |
| Boven bereik | Boven bereik | `Warm en vochtig` |

Als slechts één bruikbare meting beschikbaar is, meldt Velair wat het kan vaststellen zonder volledig comfort te suggereren:

- `Temperatuur binnen bereik`;
- `Luchtvochtigheid binnen bereik`;
- `Koud`, `Warm`, `Droge lucht` of `Vochtig`.

Als er geen bruikbare omgevingsmeting is, verschijnt `Geen metingen`. Als elke gevolgde bron verouderd is, verschijnt `Metingen verouderd`.

<a id="air-quality"></a>
## Luchtkwaliteit

CO2 blijft gescheiden van temperatuur en luchtvochtigheid, omdat het luchtkwaliteit beschrijft en geen thermisch comfort:

- `Goede luchtkwaliteit`: onder de aandachtsdrempel;
- `CO2 verhoogd`: op of boven de aandachtsdrempel;
- `Slechte luchtkwaliteit`: op of boven de slechte-luchtkwaliteitsdrempel;
- `CO2 niet beschikbaar`: een ingestelde CO2-bron kan momenteel niet worden gelezen.

Een kamer kan dus bijvoorbeeld `Warm en vochtig` samen met `CO2 verhoogd` tonen.

<a id="data-quality"></a>
## Gegevenskwaliteit

Velair biedt één waarde voor gegevenskwaliteit:

- `complete`: elke gevolgde meting heeft een actuele waarde, ondersteund door een recente Home Assistant-melding;
- `unverified`: elke gevolgde meting is bruikbaar, maar ten minste één meting heeft geen verifieerbaar rapportagetijdstip;
- `partial`: een beoordeling is beschikbaar, maar ten minste één gevolgde meting ontbreekt of is verouderd;
- `stale`: er is geen actuele meting en elke gevolgde bron is verouderd;
- `unavailable`: om een andere reden kan geen actuele meting worden gebruikt.

Comfort groepeert bruikbare metingen waarvan de actualiteit niet verifieerbaar is naast de sensorkeuzes bij **Configuratie → Gegevensbronnen**. Een rustige uitleg noemt de betrokken waarden en verduidelijkt dat een onbekend meettijdstip niet betekent dat waarden onjuist zijn of de kamer oncomfortabel is. Overzicht en Lovelace-kaarten laten deze routinestatus weg; Diagnostiek bewaart de technische context. Dit is een geldige automatische apparaatbron, geen configuratiefout. Ontbrekende of verouderde waarden blijven een waarschuwing in de zonelijst geven.

<a id="visual-status"></a>
## Visuele status

De ingeklapte apparaatregel toont:

- de omgevingsconditie;
- een apart Humidex-label alleen wanneer actuele temperatuur en Humidex in verschillende delen van het ingestelde bereik liggen;
- optionele labels voor Humidex, dauwpunt en absolute luchtvochtigheid wanneer de editor voor een kaart met één klimaatapparaat extra ingeklapte metingen inschakelt;
- luchtkwaliteit wanneer CO2 wordt gevolgd;
- een waarschuwingspictogram bij onvolledige metingen;
- de Comfort-aan/uitknop.

De uitgevouwen actuele status gebruikt:

- dezelfde fysieke omgevingsconditie als hoofdkop;
- een temperatuur-/luchtvochtigheidskaart als beide metingen actueel zijn;
- één horizontale schaal als alleen temperatuur of luchtvochtigheid actueel is;
- een afzonderlijke CO2-schaal als CO2 wordt gevolgd en actueel is.

De temperatuur-/luchtvochtigheidskaart gebruikt negen subtiele gebieden voor koud, warm, droog, vochtig en gecombineerde condities. Het gemarkeerde doelgebied volgt altijd het gekozen model: een rechthoek bij Eenvoudige bereiken, een backendberekende curve bij Begeleid en de ingestelde veelhoek bij Aangepast. Een kleine markering toont de huidige positie en het label bevat beide metingen.

Op schalen met één meting is het groene middenstuk het ingestelde comfortbereik. Minimum- en maximumlabels staan bij het begin en einde van dat stuk; de buitenste stukken geven context voor waarden onder of boven het bereik.

<a id="lovelace"></a>
## Lovelace

De Comfort-weergave is beschikbaar als Lovelace-kaart:

```yaml
type: custom:velair-card
view: comfort
```

Je kunt de kaart beperken tot geselecteerde beheerde klimaatapparaten:

```yaml
type: custom:velair-card
view: comfort
entities:
  - climate.living_room
  - climate.bedroom
```

Je kunt ook lokale interfaceonderdelen verbergen om het dashboard te richten op de metingen die je belangrijk vindt:

```yaml
type: custom:velair-card
view: comfort
show_comfort_configuration: false
show_comfort_temperature: true
show_comfort_humidity: false
show_comfort_co2: true
```

Weggelaten opties `show_comfort_*` hebben standaard de waarde `true`. Als `show_comfort_configuration` `false` is, verbergt de kaart het volledige instellingenpaneel maar behoudt ze de ingeschakelde afgeleide metingen in de visuele beoordeling.

Zichtbaarheidsopties voor temperatuur, luchtvochtigheid en CO2 beïnvloeden alleen de grafieken op die Lovelace-kaart. Ze wijzigen geen Comfort-configuratie, bronkeuze, drempels, automatiseringsgebeurtenissen of Home Assistant-sensoren. Als temperatuur en luchtvochtigheid beide zichtbaar zijn maar slechts één actuele meting beschikbaar is, gebruikt de kaart dezelfde schaal voor één meting als het hoofdpaneel van Velair.

<a id="freshness"></a>
## Actualiteit

`Verouderd na` is de maximale tijd sinds de geselecteerde sensor zijn status voor het laatst aan Home Assistant heeft gemeld (`last_reported`). Het herhalen van dezelfde waarde vernieuwt het rapportagetijdstip en houdt de meting actueel. Velair luistert naar deze meldingen en plant het volgende vervalmoment, zodat paneel, sensoren en gebeurtenissen `stale` kunnen tonen wanneer de termijn verstrijkt zonder nieuw rapport.

De instelling staat in **Actualiteit gegevens** na de bronkeuzes. Dit noemt de directe bronnen waarop de limiet geldt: Room Assist, CO2, buiten- of externe sensoren voor afgeleide metingen. De uitleg over niet-verifieerbare actualiteit staat bij de sensorkeuzes, inclusief ingeschakelde afgeleide en buitenmetingen. Buitensensoren kunnen de limiet actief houden als binnentemperatuur en vochtigheid van het klimaatapparaat komen; de limiet laat die apparaatmetingen niet verlopen. Je kunt dit vóór inschakelen van Comfort instellen. Zonder directe bron is het veld uitgeschakeld met uitleg; de waarde blijft bewaard voor een latere sensorkeuze.

De automatische temperatuur- en luchtvochtigheidsattributen van `climate.*` hebben geen onafhankelijk rapportagetijdstip. Velair blijft een geldige waarde tonen met actualiteit `unverified`; wijzigingen aan een doeltemperatuur bevestigen geen nieuwe meting. Kies indien beschikbaar de oorspronkelijke temperatuur- of luchtvochtigheidssensor. Als een geselecteerde sensor geen `last_reported` heeft, is de geldige waarde eveneens `unverified`. Een entiteit met status `unavailable` of `unknown` kan geen bruikbare meting leveren, ook niet als oude numerieke attributen nog aanwezig zijn.

Een Home Assistant-melding bewijst niet dat de fysieke sensor opnieuw heeft gemeten. Een integratie die alleen bij gewijzigde waarden rapporteert, wordt uiteindelijk als verouderd aangeduid als de waarde constant blijft.

<a id="automation-event"></a>
## Gebeurtenis voor automatiseringen

Als de omgevingsconditie, luchtkwaliteit, gegevenskwaliteit, gegevensproblemen of de betekenisvolle status van een ingeschakelde afgeleide meting verandert, verstuurt Velair:

```yaml
event_type: velair_event
event_data:
  event: comfort_assessment_changed
```

Voorbeeldgegevens:

```json
{
  "domain": "velair",
  "event": "comfort_assessment_changed",
  "entity_id": "climate.living_room",
  "condition": "cold_and_humid",
  "air_quality": "elevated",
  "data_quality": "complete",
  "data_issues": [],
  "range_summary": {
    "status": "outside_range",
    "thermal_relation": "not_evaluated",
    "positions": {
      "temperature": "below",
      "humidity": "above",
      "humidex": null
    }
  },
  "previous_range_summary": {
    "status": "within_range",
    "thermal_relation": "not_evaluated",
    "positions": {
      "temperature": "within",
      "humidity": "within",
      "humidex": null
    }
  },
  "range_summary_changed": true,
  "range_status_changed": true,
  "temperature": {
    "metric": "temperature",
    "availability": "current",
    "freshness": "reported",
    "condition": "cold",
    "source": "sensor",
    "entity_id": "sensor.living_room_temperature",
    "value": 18.7,
    "min": 20.0,
    "max": 24.0
  },
  "humidity": {
    "metric": "humidity",
    "availability": "current",
    "freshness": "reported",
    "condition": "humid",
    "source": "sensor",
    "entity_id": "sensor.living_room_humidity",
    "value": 68,
    "min": 40,
    "max": 60
  },
  "co2": {
    "metric": "co2",
    "availability": "current",
    "freshness": "reported",
    "condition": "elevated",
    "source": "sensor",
    "entity_id": "sensor.living_room_co2",
    "value": 1200,
    "attention": 1000,
    "max": 1500
  },
  "derived_metrics": {
    "dew_point": {
      "metric": "dew_point",
      "availability": "current",
      "freshness": "reported",
      "source": "velair",
      "entity_id": null,
      "value": 12.9,
      "unit": "°C",
      "issues": [],
      "input_entity_ids": [
        "sensor.living_room_temperature",
        "sensor.living_room_humidity"
      ]
    }
  }
}
```

Voorbeeldautomatisering:

```yaml
automation:
  - alias: "Velair poor air quality"
    triggers:
      - trigger: event
        event_type: velair_event
        event_data:
          event: comfort_assessment_changed
          air_quality: poor
    actions:
      - action: notify.mobile_app_phone
        data:
          message: >
            Poor air quality in {{ trigger.event.data.entity_id }}:
            {{ trigger.event.data.co2.value | round(0) }} ppm
```

Het openen of vernieuwen van het paneel verstuurt geen automatiseringsgebeurtenis. Numerieke veranderingen in oorspronkelijke of afgeleide metingen veroorzaken geen duplicaten zolang hun classificatie en beschikbaarheid gelijk blijven. Het paneel en de Home Assistant-sensorattributen worden wel met de nieuwste waarden bijgewerkt.

Gebruik `range_status_changed: true` als een automatisering alleen moet reageren op een gewijzigde samengevoegde status ten opzichte van het ingestelde bereik. Gebruik `range_summary_changed: true` als veranderingen van afzonderlijke posities of hun thermische verband ook belangrijk zijn. Andere Comfort-wijzigingen kunnen dezelfde gebeurtenis versturen met beide vlaggen op `false`; de actuele en eerdere samenvattingen maken die overgang expliciet.

Zie [Gebeurtenissen voor automatiseringen](automation-events.nl.md#comfort-assessment-changed) voor volledige gegevens, de precieze afgeleide velden die bij die betekenisvolle status horen en het gezamenlijke triggerpatroon voor `velair_event`.

<a id="performance-and-privacy"></a>
## Prestaties en privacy

Comfort is standaard uitgeschakeld.

Als Comfort voor een apparaat is uitgeschakeld, registreert Velair daarvoor geen Comfort-listeners. Als het is ingeschakeld, luistert Velair alleen naar het beheerde klimaatapparaat en de gekozen of automatisch bepaalde sensorentiteiten, inclusief actieve externe bronnen voor afgeleide metingen. Ingebouwde afgeleide metingen hergebruiken de bestaande temperatuur- en luchtvochtigheidslisteners. Er is geen voortdurende polling.

Alle metingen en beoordelingen blijven lokaal in Home Assistant.
