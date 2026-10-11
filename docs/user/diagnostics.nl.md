<a id="diagnostics"></a>
# Diagnose
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](diagnostics.md) · [Español](diagnostics.es.md) · [Français](diagnostics.fr.md) · [Deutsch](diagnostics.de.md) · [Italiano](diagnostics.it.md) · [Nederlands](diagnostics.nl.md) · [Polski](diagnostics.pl.md) · [Português (Brasil)](diagnostics.pt-br.md) · [Português (Portugal)](diagnostics.pt-pt.md) · [Русский](diagnostics.ru.md) · [Vertaalstatus](../translation-status.md)

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

Het onderdeel **Diagnostics** biedt een lokale, alleen-lezenweergave van wat Velair kan controleren, zonder Home Assistant Recorder of externe services nodig te hebben.

Je ziet de huidige plannerstatus en een compacte horizontale strook met beheerde klimaatapparaten in de ingestelde thermostaatvolgorde. Als je een apparaat selecteert, verschijnt eronder één detailpaneel over de volledige breedte. Dit paneel toont elk gegeven één keer, gegroepeerd onder status en overdracht, actieve configuratie, functies, en apparaat en sensoren. Het bevat:

- beschikbaarheid en gemelde HVAC- en temperatuurmogelijkheden;
- vastgestelde configuratieproblemen waarvoor Velair rechtstreeks bewijs heeft;
- de effectieve modus en profielen, berekende actuele besturingsopdracht, tijdelijke aanpassingen en pauzes;
- het laatste besturingsdoel dat Home Assistant heeft geaccepteerd, overdrachtsfouten en de status van begrensde herhaalpogingen;
- Room Assist, adaptieve voorconditionering, Comfort en expliciet gekoppelde sensoren.

Geslaagde `velair.set_hvac_mode`-aanroepen verschijnen als geaccepteerde handmatige overdracht van uitsluitend een modus. Ze bevatten de gekozen HVAC-modus, zonder een temperatuur te verzinnen. Validatiefouten vervangen eerder geaccepteerd bewijs niet, en fouten bij de fysieke overdracht publiceren geen geslaagde doelgebeurtenis.

Velair leidt geen oorzaak af wanneer de beschikbare gegevens alleen een symptoom aantonen, zoals een niet-beschikbare entiteit. Batterijgegevens worden weggelaten tenzij Velair een betrouwbare koppeling kan vaststellen; de eerste versie probeert apparaten niet via heuristieken te koppelen.

Voor Comfort bevat Diagnose de opgeslagen bron voor elke ingeschakelde afgeleide meting, de effectieve invoer of externe entiteit, de huidige beschikbaarheid en stabiele probleemcodes voor ontbrekende, verouderde, ongeldige of niet-geverifieerde gegevens. Dauwpunt, absolute luchtvochtigheid en Humidex blijven hier uitsluitend informatie: hun aanwezigheid in een rapport betekent niet dat ze de planning of klimaatregeling hebben beïnvloed. Dezelfde ingeschakelde gegevens zijn beschikbaar via het attribuut `derived_metrics` van de zonesensor **Omgevingsconditie**; Velair maakt hiervoor geen afzonderlijke proxy-entiteiten aan. Actuele metingen bevatten `freshness: reported` of `unverified`; de laatste blijven zichtbaar met een informatief label en zijn tot hun bron te herleiden.

Als buitenvergelijking is ingeschakeld, bevat hetzelfde Comfort-rapport ook expliciete sensorbeschikbaarheid, onafhankelijke kwaliteit van buitengegevens, de genormaliseerde vergelijking, afzonderlijke absolute luchtvochtigheid binnen en buiten en eventuele codes voor een kans of afweging. Het blok `guidance_thresholds` legt de gebruikte gevoeligheid per zone vast. Dat helpt een sensorprobleem te onderscheiden van bewust strengere adviezen. Deze waarden dienen alleen ter informatie en betekenen niet dat Velair een raam heeft geopend of HVAC heeft gewijzigd. Diagnose bevat ook `comfort_zone`: de ingestelde eenvoudige, begeleide of aangepaste temperatuurafhankelijke vorm en het luchtvochtigheidsbereik dat bij de huidige temperatuur geldt. Een effectief bereik van `null` verklaart waarom een actuele luchtvochtigheidsmeting niet is geclassificeerd bij ontbrekende temperatuur; er wordt geen bereik geraden.

De actuele beoordeling bevat `range_summary`. Bewaarde `comfort_assessment_changed`-gebeurtenissen behouden ook `previous_range_summary` en de vlaggen `range_summary_changed` en `range_status_changed`. Zo kan een gedownload rapport tonen of de gebeurtenis een overgang ten opzichte van het ingestelde bereik of een andere Comfort-wijziging vertegenwoordigde. Deze velden bevatten alleen stabiele betekenisvolle codes, geen onbewerkte Home Assistant-gebeurteniscontext.

<a id="runtime-history-and-privacy"></a>
## Runtimegeschiedenis en privacy

Diagnose bewaart maximaal 100 relevante gebeurtenissen in één globale tijdlijn. Onder **Geschiedenisinstellingen** kun je afzonderlijk kiezen of besturings- en schema-activiteit, Room Assist, voorconditionering, Comfort, klimaatopdrachtoverdracht en beschikbaarheidsgebeurtenissen worden bewaard. Nieuwe Velair-gebeurtenistypen die nog niet zijn ingedeeld, worden onder besturing en schema's bewaard in plaats van stilzwijgend weggegooid. Externe aanpassingen en overgangen tussen automatische en handmatige besturing blijven ook in deze categorie. Hun logregels tonen alleen de gewijzigde HVAC-modus, afzonderlijke doeltemperatuur of doelbereik, het gebruikte beleid voor externe wijzigingen en een eventuele verval- of hervattingsreden. Willekeurige klimaatattributen en Home Assistant-context-ID's worden niet bewaard.

Alle categorieën zijn standaard ingeschakeld. De backend bewaart deze keuzes lokaal; het uitschakelen van een categorie verwijdert onmiddellijk de al bewaarde gebeurtenissen ervan. **Geschiedenis wissen** verwijdert alle bewaarde gebeurtenissen zonder de actuele gegevens over gezondheid, overdracht of configuratie te veranderen.

Je kunt het runtimelog lokaal filteren zonder te veranderen wat Velair bewaart. Kies een combinatie van het Velair-systeem en beheerde klimaatapparaten als bronnen, of gebruik de hoofdoptie **Alle**. Beperk de lijst vervolgens eventueel op categorie en een inclusief Van/Tot-datumbereik. **Filters wissen** herstelt de volledige bewaarde tijdlijn. Een lege geschiedenis wordt anders weergegeven dan een filtercombinatie zonder resultaten. Deze filters zijn tijdelijke interfacestatus en worden niet opgeslagen.

Op desktop kun je logkolommen vergroten of verkleinen door hun scheidingslijnen te slepen of het toetsenbord te gebruiken wanneer een scheidingslijn de focus heeft. Pijltjestoetsen wijzigen de breedte in kleine stappen; Shift+pijl gebruikt grotere stappen, Home/End gaat naar de toegestane grenzen en dubbelklikken herstelt de standaardbreedte. Kolombreedtes zijn tijdelijk en worden niet opgeslagen. Op mobiel staan tijd, klimaatapparaat, type en bericht op vier afzonderlijke regels. Een regel kan horizontaal schuiven als één waarde anders alleen met regelafbreking past.

Alleen categoriekeuzes worden opgeslagen. Gebeurtenisgeschiedenis bestaat uitsluitend in het geheugen, wordt gewist bij het herstarten van de integratie of Home Assistant en gebruikt geen Recorder. Ze wordt gevuld vanuit bestaande Velair-gebeurtenissen, beschikbaarheidswijzigingen en overdrachtsresultaten, zonder extra polling.

**Rapport downloaden** opent privacyopties voordat een JSON-bestand voor een probleemmelding wordt gemaakt. ID's van beheerde klimaatentiteiten worden standaard vervangen door vaste aliassen; voor lokale inspectie kun je onbewerkte ID's behouden. Profiel-, modus- en pauze-ID's worden altijd verwijderd. Het sluiten van het paneel of voltooien van een download herstelt de veiligere standaardkeuze. De standaarddiagnosedownload van een Home Assistant-configuratie-item gebruikt altijd de versie waarin identificerende gegevens zijn vervangen.

Rapportexport is verborgen op telefoonformaat, omdat downloads niet betrouwbaar werken in de webview van de Home Assistant-companion-app. Open Velair in een tablet- of desktopbrowser om een rapport te downloaden. Controleer elk rapport voordat je het publiceert. Ook ID's van gekoppelde sensorentiteiten worden vervangen; in de actuele lokale weergave blijven ze zichtbaar, omdat ze nuttig zijn bij het controleren van de configuratie.

De lokale diagnoseweergave gebruikt de vriendelijke apparaatnamen van Home Assistant bij het filteren, maar toont bewust lokale entiteits-ID's in het detailpaneel om de configuratie te kunnen controleren. Met de standaardprivacyoptie vervangen gedownloade rapporten zowel gestructureerde ID's als ID's in bewaarde foutteksten door deterministische aliassen zoals `climate_unit_1` en `associated_entity_1`. Herhaalde verwijzingen behouden dezelfde alias, zodat verbanden bruikbaar blijven zonder de oorspronkelijke lokale ID's te tonen. Als je expliciet onbewerkte ID's behoudt, blijven die lokale identificatoren in het rapport; profiel-, modus- en pauze-ID's worden nog steeds verwijderd. Controleer elk rapport voordat je het deelt.

Diagnose heeft geen bediening voor de planner, herhaalpogingen, terugdraaien of klimaatapparaten. De instellingen blijven de plaats voor configuratie en onderhoud; details over apparaatmogelijkheden en gezondheid staan nu onder Diagnose.

Elk beheerd klimaatapparaat rapporteert ook runtimegegevens over het stabiliseren na opdrachten. Terwijl een recente Velair-opdracht stabiliseert, vermeldt Diagnose de betrokken besturingsvelden in de actuele momentopname. Als het apparaat de verwachte waarden niet binnen de begrensde termijn heeft bereikt, markeert de volgende nieuwe momentopname het apparaat met een waarschuwing `command_settling_mismatch`. Het blok `command_settling` in het gedownloade rapport bevat de verwachte en waargenomen waarden. Dit dient als bewijs voor probleemoplossing: Diagnose herhaalt de opdracht niet, wijzigt het apparaat niet en maakt geen handmatige aanpassing. Een nieuwere opdracht voor dat veld of een herstart wist deze gegevens.

<a id="automating-diagnostic-health"></a>
## Automatiseren op basis van diagnosegezondheid

Velair maakt een entiteit **Diagnosestatus** aan met de statussen `ok`, `warning` en `error`. Deze wordt bijgewerkt vanuit dezelfde backendmomentopname als de weergave en gebruikt geen polling. De compacte attributen bevatten plannerstatus, apparaataantallen, aantallen problemen en stabiele probleemcodes; onbewerkte fouten en operationele ID's worden weggelaten.

Gebruik een statustrigger wanneer een automatisering alleen de samengevoegde actuele gezondheid nodig heeft. Gebruik de gebeurtenis `diagnostic_issue_changed` als de automatisering moet reageren op het ontstaan of oplossen van één probleem terwijl andere problemen actief blijven. Zie [Gebeurtenissen voor automatiseringen](automation-events.nl.md#diagnostic-issue-changed) voor gegevens en voorbeelden.

Elk beheerd klimaatapparaat heeft ook een sensor **Leveringsdiagnose**, die standaard is uitgeschakeld. Deze toont dezelfde runtime-overdrachtsstatus en het laatst geaccepteerde besturingsdoel als Diagnose, zonder onbewerkte fouttekst. Een geaccepteerd doel betekent dat Home Assistant de bijbehorende reeks Velair-serviceaanroepen heeft geaccepteerd; het stelt de toestand van het apparaat of de verbinding niet vast. Room Assist kan de verzonden doeltemperatuur later aanpassen en toont die context via zijn eigen sensor. Overdrachtsgegevens worden nooit na een herstart hersteld en worden bij een geslaagde Velair-reset gewist. Zie [Sensoren voor zonebesturing en overdracht](zone-sensors.nl.md#zone-delivery-diagnostics) voor alle statussen en attributen, stappen om de sensor in te schakelen en automatiseringsvoorbeelden.
