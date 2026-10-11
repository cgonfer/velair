<a id="block-presets-and-linked-templates"></a>
# Blokpresets en gekoppelde sjablonen
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](linked-schedules.md) · [Español](linked-schedules.es.md) · [Français](linked-schedules.fr.md) · [Deutsch](linked-schedules.de.md) · [Italiano](linked-schedules.it.md) · [Nederlands](linked-schedules.nl.md) · [Polski](linked-schedules.pl.md) · [Português (Brasil)](linked-schedules.pt-br.md) · [Português (Portugal)](linked-schedules.pt-pt.md) · [Русский](linked-schedules.ru.md) · [Vertaalstatus](../translation-status.md)

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

Velair kan klimaatinstellingen hergebruiken via een **blokpreset** en een dag aan een dagsjabloon koppelen. Kies **Alleen tijden** om tijden met onafhankelijke klimaatinstellingen te delen, of **Tijden en instellingen** om het volledige sjabloon te volgen. Standaard en profielen ondersteunen beide keuzes. Sjabloonblokken kunnen handmatige instellingen of Velair-presets gebruiken.

Begin met [Praktische voorbeelden](linked-schedule-examples.nl.md) voor gedeelde verwarming, seizoensprofielen, onafhankelijke kopieën, omzetting van koppelingen en ongeschikte wijzigingen.

<a id="block-presets"></a>
## Blokpresets

Een Velair-blokpreset heeft een naam en dezelfde klimaatconfiguratie als een schemablok, zonder starttijd. Ze kan één temperatuur of een oorspronkelijk bereik met ondersteunde opties instellen, alleen een HVAC-modus kiezen, alleen klimaatopties toepassen of het apparaat uitschakelen. Een Velair-preset verschilt van het apparaatveld `preset_mode`, dat één van de ingestelde opties kan zijn.

Presets horen bij een gedeelde bibliotheek. Elke bestemming wordt gecontroleerd tegen haar thermostaat en waar van toepassing de externe schemaregelaar. Een weggelaten optie wordt niet verstuurd; geen ventilatorinstelling opgeven reset de ventilator niet.

Beheer de bibliotheek onder **Sjablonen → Klimaatpresets**. De bibliotheekkiezer legt dagsjablonen en gedeelde klimaatpresets uit. Maak een preset met de toevoegknop bij de lijstkop. Een lege bibliotheek behoudt dezelfde lijst-/detailindeling. Selecteer een bestaande preset om die te bekijken; niet-opgeslagen wijzigingen verschijnen pas na wijziging van naam of klimaatinstellingen. De optionele compatibiliteitscontrole markeert de preset niet als bewerkt. Gebruik wordt als alleen-lezeninformatie getoond.

De editor vereist geen thermostaat: kies verwarming of koeling, één doel of bereik en optionele apparaatinstellingen. Een optionele thermostaatcontrole toont compatibiliteit zonder gedeelde waarden te wijzigen. De backend controleert elke daadwerkelijke toepassing vóór opslaan.

Sla een preset op met het pictogram naast de naam. Bewerken behoudt de bibliotheekpositie, ook na herladen; nieuwe presets komen achteraan. Temperatuurvelden accepteren punt of komma, bijvoorbeeld `21.5` of `21,5`, ook voor beide bereikgrenzen. De editor behoudt je invoer tijdens typen en verstuurt getallen bij voorvertonen of opslaan. De compatibiliteitscontrole toont effectieve instellingen voor de gekozen thermostaat met een afzonderlijk succes- of foutresultaat. Controleren slaat niet op en verandert de niet-opgeslagen status niet.

Presetverwijzingen in sjablonen staan apart van rechtstreekse verwijzingen in Standaard en profielen. Gebruikstellers tellen directe verwijzingen, ook in sjablonen zonder gekoppelde dagen. Thermostaten die een preset via een volledig sjabloon overnemen, verschijnen als extra betrokken bestemmingen zonder dezelfde sjabloonverwijzing opnieuw te tellen. Apparaatgebruik staat gegroepeerd per thermostaat met een regel voor Standaard en elk profiel.

De lijst toont een koppelingspictogram naast elke teller. Wijs de uitgeschakelde verwijderknop aan om te zien waarom een gebruikte preset niet kan worden verwijderd; ontkoppel eerst de blokken. De gebruiksaanduiding staat op een eigen laatste regel onder de configuratiesamenvatting.

Kies een preset in een schemablok voor een levende verwijzing. Presetwijzigingen werken elke verwijzing bij. Het blok kan niet ook lokale klimaatinstellingen bevatten. Ontkoppelen behoudt de effectieve configuratie als handmatige instellingen en stopt toekomstige presetupdates voor dat blok.

Open **Aanvullende instellingen** van een blok en kies een **Velair-preset**. Dit staat los van **Apparaatpreset**, de oorspronkelijke `preset_mode`-optie van de thermostaat. Het blok behoudt de normale kolommen voor tijd, modus, doel, instellingen en verwijderen. Gekoppelde klimaatinstellingen staan in de gewone bediening, maar zijn alleen-lezen; tijd blijft bewerkbaar tenzij de dag ook gekoppelde tijden heeft.

Een regel onder het blok noemt preset en aanvullende instellingen. De instellingsteller telt één voor de Velair-presetkoppeling plus elke ingestelde apparaatoptie, zonder tijd, HVAC-modus of temperatuurdoel mee te tellen. Waarden en compatibiliteitsaanpassingen komen uit de backend; ladende of mislukte voorvertoningen vervangen de opgeslagen verwijzing niet door handmatige instellingen. De opgeloste presetwaarden blijven zichtbaar bij verplaatsen van de starttijd; een tijdwijziging vereist geen nieuwe presetvoorvertoning.

Kies onder Aanvullende instellingen een andere Velair-preset of **Geen Velair-preset** om te ontkoppelen met behoud van effectieve handmatig bewerkbare instellingen. Beheer en bewerk gedeelde presets onder **Sjablonen → Klimaatpresets**. Apparaatopties blijven alleen-lezen zolang ze gekoppeld zijn. De verwijderknop blijft op de normale plek en is uitgeschakeld bij gekoppelde sjabloontijden.

Het paneel toont eerst de configuratiekeuze, daarna apparaatopties en tot slot één samenvatting **Wat dit blok verstuurt**. Deze omvat handmatige blokken en opgeloste Velair-presets, inclusief bereiken, alleen-modusacties, alleen-optiesacties en Uit. Ze verschijnt ook als de thermostaat geen extra opties heeft. Bij een wachtende of onbeschikbare presetvoorvertoning toont de samenvatting die status in plaats van opdrachten te raden.

<a id="linked-templates"></a>
## Gekoppelde sjablonen

Sjabloonkoppelingen zijn alleen-lezen en gegroepeerd per thermostaat, daarna Standaard of profiel, met gekoppelde weekdagen bij elkaar. **Gekoppelde dagen** telt één dag ongeacht het aantal sjabloonblokken. De lijst toont dit op een eigen laatste regel onder het blokaantal. Onafhankelijke kopieën tellen niet mee en staan niet in de lijst. Ontkoppel alle dagen vóór verwijderen van een sjabloon; de uitgeschakelde verwijderknop legt dit uit.

Standaard- en profielschema's kunnen elke thermostaatweekdag aan een dagsjabloon koppelen. Bij **Alleen tijden** stel je elke tijdvakactie in de bestemming in, handmatig of met een preset. Verschillende bestemmingen kunnen op dezelfde gedeelde tijd verschillende acties gebruiken.

Bij **Tijden en instellingen** levert het sjabloon beide. Blokken bevatten handmatige instellingen of actieve presetverwijzingen. Alle bestemmingsbediening is alleen-lezen en toont effectieve waarden; bewerk het sjabloon of ontkoppel de dag om deze te wijzigen. Er zijn geen lokale uitzonderingen per blok. Sjablooninstellingen veranderen volledige koppelingen; alleen-tijdenkoppelingen behouden hun eigen klimaatinstellingen.

Een Werkdag-sjabloon start bijvoorbeeld om 07:00 en 23:00. Standaard gebruikt de gewone comfortpreset, Winter verwarmingspresets en Zomer koeling en Uit. 07:00 naar 07:30 verplaatsen werkt alle drie bij zonder hun configuraties uit te wisselen.

Bewerk gekoppelde tijden in het sjabloon, niet door de bestemmingstijdlijn te slepen. Temperatuur- en moduswijzigingen in het sjabloon veranderen alleen-tijdenbestemmingen niet. Een week kan onafhankelijke dagen en beide koppeltypen mengen.

**Planningsbron** kiest een onafhankelijk schema of sjabloon. Kies bij een sjabloon **Alleen tijden** of **Tijden en instellingen**. Het informatiepictogram legt de keuzes uit. Van alleen tijden naar volledig wisselen vraagt toestemming voordat daginstellingen worden vervangen. Van volledig naar alleen tijden bewaart de huidige sjablooninstellingen, inclusief presetverwijzingen, als onafhankelijke toewijzingen. **Ontkoppelen** behoudt de huidige concepttijden en configuraties, inclusief presets.

Handmatige instellingen worden de effectieve backendwaarden voor die thermostaat; een gedeeld doel van 18.3 °C wordt bijvoorbeeld 18.5 °C bij stappen van 0.5 °C. Presetverwijzingen blijven actief en gedeelde definities veranderen niet. Wijs een vergrendelde instelling aan, tik erop of geef focus om te zien hoe je de gedeelde configuratie bewerkt. Standaard en profielen gebruiken dezelfde hulp.

Het wijzigen van Planningsbron vraagt bevestiging vóór vervangen van het dagconcept, ook als instellingen onvolledig zijn. Instellingen op exact gelijke tijden blijven behouden; nieuwe tijden vereisen toewijzingen. Annuleren behoudt keuze en concept. Wijzigingen gelden pas na opslaan.

**Eigen schema** vraagt toestemming vóór verwerpen van dagwijzigingen en herstelt het opgeslagen schema uit dezelfde bron: Standaard of het gekozen profiel. Bij een opgeslagen gekoppelde dag worden tijden en toewijzingen een onafhankelijk concept met behoud van presetverwijzingen. Dit herstelt geen historisch handmatig schema. Andere weekdagen blijven behouden.

**Ontkoppelen** doet iets anders: het behoudt de actuele concepttijden en instellingen, inclusief wijzigingen sinds de laatste opslag.

<a id="copy-or-link"></a>
## Kopiëren of koppelen

- **Blokken kopiëren** kopieert tijden en klimaatinstellingen van een sjabloon, behoudt presets en past handmatige instellingen aan de bestemming aan. Het resultaat volgt het sjabloon niet.
- **Tijden koppelen** verbindt tijden met het sjabloon, met afzonderlijke klimaatinstellingen per bestemming.
- **Volledige configuratie koppelen** volgt tijden en instellingen, inclusief actieve presetverwijzingen, zonder lokale uitzonderingen.
- Een schemadag klonen kopieert configuratie, koppeltype, alleen-tijdentoewijzingen en presets. Een gekoppelde bron maakt een gekoppelde dag; een onafhankelijke bron een onafhankelijke dag. Niet-geselecteerde doeldagen behouden hun koppelingen.
- Een dag als sjabloon opslaan behoudt effectieve handmatige instellingen en presets en verandert oorspronkelijk sjabloon of gedeelde presets niet.
- Een dag wissen verwijdert lokale blokken en koppeling zonder het sjabloon of andere bestemmingen te veranderen.

Klonen naar een andere thermostaat controleert de kopie tegen die bestemming. Ongeschikte gedeelde instellingen weigeren de kloon in plaats van koppelingen te verwijderen of handmatige instellingen in te vullen. Bestaande stapgrootte- en optieaanpassing blijven gelden. In Standaard worden bestemmingen samen opgeslagen; één fout laat alle bestemmingen gelijk. Openstaande brondagwijzigingen worden eerst opgeslagen, zoals bij andere standaardkloonacties. Profielklonen wijzigt het concept en controleert het voorgestelde profiel; opslaan bewaart nog steeds het hele profiel.

Om een onafhankelijke dag uit een gekoppelde dag te maken, gebruik je na klonen **Ontkoppelen** en sla je op. **Blokken kopiëren** vanuit de sjabloonbibliotheek blijft een onafhankelijke kopie.

<a id="shared-edits"></a>
## Gedeelde wijzigingen

Sjabloonbewerking behoudt de bibliotheekpositie, ook na herladen.

Een nieuw sjabloontijdvak stelt voor elke gekoppelde alleen-tijdendag een configuratie voor, ook voor inactieve profielen en Standaard verborgen door een actief profiel. Velair probeert eerst de nieuwe tijdvakinstellingen. Als die ongeschikt zijn, probeert het de eerder opgeslagen bestemmingsblokken: exact dezelfde tijd, eerdere blokken van dichtbij naar verder weg, daarna latere blokken van dichtbij naar verder weg. De eerste geschikte configuratie wordt gekopieerd. Een presetverwijzing van de bron blijft aan de preset gekoppeld.

Bronblokken horen bij dezelfde bestemming en weekdag, met hun tijden van vóór de wijziging. Een verplaatst of verwijderd blok kan nog opgeslagen instellingen leveren; een ander nieuw blok niet. Gekopieerde instellingen zijn onafhankelijk van de sjabloonklimaatinstellingen: alleen tijden blijven gekoppeld. Als het nieuwe sjabloontijdvak een preset gebruikt, behoudt een passend voorstel die presetverwijzing.

Volledige koppelingen ontvangen het nieuwe tijdvak ongewijzigd, zonder bronblokkeuze. Als de instellingen ongeschikt zijn voor één volledig gekoppelde bestemming, wordt de hele opslag geweigerd. Dit geldt ook voor inactieve profielen en een Standaard-schema dat door een actief profiel verborgen is.

Bekijk voorstellen onder **Gekoppelde dagen**, per thermostaat en Standaard of profiel, met koppeltype. Volledige koppelingen tonen effectieve instellingen en fouten zonder toewijzingseditor. Terugvaltoewijzingen noemen hun bron. Als niets geschikt is, voltooi het nieuwe tijdvak daar met handmatige instellingen of een Velair-preset. Los ook schemabrede fouten zoals extern tijdraster of wijzigingslimiet op vóór opslaan.

De normale sjabloonopslag bewaart sjabloon en alle toewijzingen samen, zonder apart bevestigingspaneel. Onvolledige of ongeschikte wijzigingen blijven concepten; opgeslagen schema's draaien door. Verplaatsen behoudt bestemmingsinstellingen; verwijderen wist de toewijzingen in dezelfde opslag.

Velair verhindert het verwijderen van gebruikte presets of sjablonen. Een preset in een ongebruikt sjabloon geldt nog als gebruikt. Vervang of ontkoppel eerst de toepassingen. Conflicterende wijzigingen vereisen vernieuwen van de configuratie en mogen bestemmingen niet gedeeltelijk bijwerken.

Actieve automatische doelen veranderen na opslaan. Pauzes, handmatige aanpassingen en tijdelijke aanpassingen behouden voorrang. Een Standaard-wijziging verborgen door een eigen profielschema vervangt dat profiel niet; teruggaan naar Standaard gebruikt de nieuwste standaardconfiguratie. Externe regelaars ontvangen volledig uitgewerkte weekplanningen, geen verwijzingen; fouten schakelen lokale uitvoering niet in.

<a id="seasonal-automations"></a>
## Seizoensautomatiseringen

Gebruik [`velair.update_block_preset`](preset-automations.nl.md) om een gedeelde preset via een automatisering te wijzigen. Gedeeltelijke wijzigingen behouden overige velden; expliciete vervanging kan de actie wijzigen. Wijzigingen zijn blijvend en raken elke verwijzing, met normale validatie en voorrangsregels. De handleiding bevat voorbeelden voor buitentemperatuur, bereiken, apparaatopties en Uit/herstel.

Home Assistant beslist nog steeds wanneer een profiel of modus wordt gekozen. Sjabloontijden en presets hergebruiken voorkomt dubbele configuratie, maar voegt geen buitentemperatuurregels of polling toe. Raamlogica hoort onafhankelijke zonepauzes met eigen ID te gebruiken. Een preset voegt geen terugkeerdatum met anticipatie toe en verlengt een geplande koelperiode niet automatisch.

<a id="backups-and-compatibility"></a>
## Back-ups en compatibiliteit

Overdraagbaar model 16 bewaart presets, tijdvak-ID's en beide koppeltypen. Exports bevatten benodigde sjablonen en hun presets. Imports worden tegen de volledige resulterende configuratie gecontroleerd; bestaande back-ups zonder koppelingen blijven bruikbaar. Bestaande koppelingen zonder type blijven alleen tijden. Bestaande schema's worden bij upgrade niet automatisch gekoppeld.

Temperaturen behouden de opgegeven Velair-eenheid en volgen het bestaande migratieproces. Een gedeelde preset wordt per bestemming aangepast zonder de waarde naar de stapgrootte van één thermostaat te herschrijven.

Schematijdlijnen tonen de effectieve temperatuur of het bereik van de backend. Een koppelingspictogram markeert een Velair-preset; een kopiepictogram naast tijd markeert gekoppelde sjabloontijden. De oorspronkelijke tooltip bevat actie, modus, opties en gedeelde bronnamen. Wachtende of onbeschikbare presetinstellingen worden expliciet getoond. Overgenomen blokken beschrijven instellingen en bronnen van hun brondag.

Zeer korte intervallen geven tijd en doel voorrang boven oorsprongspictogrammen en extra instellingen. Details behouden volledige waarden en bronnamen zonder de intervalduur te veranderen.
