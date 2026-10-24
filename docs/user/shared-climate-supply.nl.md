<a id="shared-climate-supply"></a>
# Gedeelde klimaattoevoer
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](shared-climate-supply.md) · [Español](shared-climate-supply.es.md) · [Français](shared-climate-supply.fr.md) · [Deutsch](shared-climate-supply.de.md) · [Italiano](shared-climate-supply.it.md) · [Nederlands](shared-climate-supply.nl.md) · [Polski](shared-climate-supply.pl.md) · [Português (Brasil)](shared-climate-supply.pt-br.md) · [Português (Portugal)](shared-climate-supply.pt-pt.md) · [Русский](shared-climate-supply.ru.md) · [Vertaalstatus](../translation-status.md)

<details>
<summary>Status van deze vertaling</summary>

| Gegeven | Status |
| --- | --- |
| Referentieversie | 1.9.0-beta.5 |
| Laatst gesynchroniseerd | 2026-10-24 |
| Taalcontrole | AI-ondersteunde vertaling |
| Vergeleken met het origineel | Gesynchroniseerd met het Engelse origineel. |

</details>

---
<!-- velair-docs:end -->

Gedeelde klimaattoevoer schat of gekoppelde thermostaten verwarming of koeling nodig hebben en regelt één gedeelde `switch`, bijvoorbeeld een ketelvraagrelais. De functie is optioneel en uitgeschakeld totdat je een toevoer uitdrukkelijk inschakelt in **Toevoerregeling**. De schatting bevestigt geen klepopening, waterstroming of fysieke verwarming.

<a id="configure-a-supply"></a>
## Een toevoer instellen

Open **Toevoerregeling** in het Velair-paneel en kies **Toevoer toevoegen**. Selecteer een toevoer in de lijst om de details ernaast te bewerken, of eronder op een smal scherm. De lege lijst biedt dezelfde toevoegactie. **Gedeelde toevoeren** bevat geregelde verwarmings- of koelcircuits en staat los van algemene thermostaatgroepen.

Vul de **Toevoernaam** in, kies een bestaande **Toevoerschakelaar**, het **Doel van de toevoer** (Verwarmen of Koelen) en de beheerde thermostaten van dat circuit. Elke schakelaar mag bij slechts één toevoer horen. Velairs eigen bedieningsschakelaars mogen geen toevoeruitgangen zijn.

Het doel beschrijft wat de gedeelde apparatuur levert; het wijzigt geen HVAC-modi van thermostaten. Warmtetoevoer reageert alleen op warmtevraag, koeltoevoer alleen op koelvraag.

Elk lijstitem toont het doel, het aantal thermostaten, de schakelaar en de opgeslagen automatische regeling. Naam, schakelaar en doel bewerk je rechtstreeks in het bovenste overzicht, naast de inschakelknop en het opslagpictogram. Elke instelling staat er één keer; er is geen afzonderlijke sectie Toevoerinstellingen. **Schakelaarstatus** is de waargenomen entiteitsstatus; de regeling in de lijst beschrijft de opgeslagen instelling. Inschakelen wijzigt een concept totdat je opslaat: een niet-opgeslagen ingeschakelde knop kan daarom naast een opgeslagen Uitgeschakeld-status staan. Vraag wordt niet beoordeeld terwijl de regeling uitgeschakeld of onderbroken is. Infoknoppen verklaren deze verschillen, schakelaarbeheer, doel en timing zonder het formulier uit te breiden.

**Toevoer verwijderen** is de prullenbak in het lijstitem. Ook verwijderen blijft een concept totdat je opslaat. Open **Tijdinstellingen**, **Vraag en hysterese** of **Gekoppelde thermostaten** voor de betreffende instellingen. Het hulppictogram naast de functietitel opent een samenvatting en deze gids. Wisselen tussen toevoeren bewaart concepten. **Toevoeren opslaan**, het pictogram in de detailkop, past de volledige bewerkte lijst inclusief verwijderingen toe en blijft beschikbaar nadat je de laatste toevoer verwijdert. Net als bij Sjablonen en Presets is er geen afzonderlijke verwerpknop. Bij het verlaten met wijzigingen vraagt Velair of je die wilt verwerpen; terugkeren herstelt dan de opgeslagen lijst. Navigatie wacht tijdens opslaan of hervatten.

Alle waarden terugzetten op hun opgeslagen waarde wist het concept. Live configuratie-updates en **Automatische regeling hervatten** zijn dan weer beschikbaar. Opgeslagen wijzigingen bereiken andere verbonden panelen, ook als de geschatte vraag gelijk blijft.

Kies het hysteresegedrag en de waarden van de toevoer. Elke thermostaat erft het gedrag; alleen numerieke waarden kunnen afwijken. **Thermostaathysterese** biedt per geselecteerde rij **Toevoerhysterese gebruiken** of **Aangepaste hysteresewaarden**. De keuze staat uitgelijnd met het selectievakje en de naam; afwijkende waarden en effectieve grenzen verschijnen eronder. In aangepast gedrag kunnen beide waarden afzonderlijk worden geërfd. Het zijn temperatuurverschillen in de huidige paneeleenheid. Een eenheidswijziging rekent ze als verschillen om, niet als absolute temperaturen.

Numerieke velden melden fouten tijdens het typen. Hysteresewaarden moeten eindig en niet-negatief zijn. Een lege thermostaatuitzondering erft de toevoerwaarde. Opslaan is niet beschikbaar zolang een toevoer ongeldige getallen bevat; de lijst markeert de toevoer die aandacht vraagt.

Sla uitdrukkelijk op om de configuratie toe te passen. Een ingeschakelde toevoer geeft Velair exclusieve automatische controle over de schakelaar. Vermijd een andere automatisering die dezelfde uitgang voortdurend regelt.

Opslagfouten staan in de detailkop naast de opslagactie. Configuratiefouten noemen toevoer, veld en correctie. Velair selecteert de toevoer, opent de juiste sectie, markeert het veld en geeft het focus. Home Assistant- en verbindingsfouten behouden hun oorspronkelijke uitleg zonder verwijzing naar een ongerelateerd veld. Concepten blijven bewaard voor correctie en opnieuw proberen, ook na het verwijderen van de laatste toevoer.

<a id="how-estimated-demand-works"></a>
## Hoe geschatte vraag werkt

Nieuwe toevoeren gebruiken **Stoppen bij doeltemperatuur**, een startafstand van **0,3 °C** of **0,54 °F** en een stopafstand van nul. Dit zijn gelijkwaardige temperatuurverschillen. Thermostaten erven deze waarden tenzij je aangepaste waarden kiest. De voorbeelden hieronder gebruiken andere afstanden om de modi te verduidelijken.

Bij gewone thermostaten bepaalt hysterese een start- en stopgrens. Daartussen blijft de vorige vraag behouden. Alle vergelijkingen omvatten de grens zelf. Voorbeelden met een doel van 22 °C:

| Gedrag | Waarden | Verwarmen: start / stop | Koelen: start / stop |
| --- | --- | --- | --- |
| Stoppen bij doeltemperatuur (standaard) | Startafstand 0,5 °C | ≤21,5 / ≥22 °C | ≥22,5 / ≤22 °C |
| Symmetrisch | Afstand 0,5 °C | ≤21,5 / ≥22,5 °C | ≥22,5 / ≤21,5 °C |
| Aangepast | Start 0,5 °C; stop 0,2 °C | ≤21,5 / ≥22,2 °C | ≥22,5 / ≤21,8 °C |

Het diagram in **Vraag en hysterese** volgt wijzigingen in doel, gedrag en afstanden. Het gebruikt een benoemd voorbeelddoel in plaats van een actuele thermostaatwaarde. Temperaturen staan bij start- en stopmarkeringen; haakjes verbinden elke hystereseafstand met het doel. De benoemde kamertemperatuuras loopt naar rechts op. De uitleg eronder zegt dat tussen start en stop alleen een bestaande vraag doorgaat. Verwarming vraagt toevoer aan de koudere kant, koeling aan de warmere kant. Het diagram verklaart de schatting en simuleert geen apparatuur of vertragingen. Het voorbeelddoel is 22 °C of 72 °F. Tijdens een lege, onvolledige of ongeldige invoer houdt een grijs diagram zonder temperaturen dezelfde hoogte totdat de invoer geldig is.

De startafstand meet hoeveel de temperatuur van het doel afwijkt voordat verwarmen of koelen nodig is. De stopafstand ligt voorbij het doel in de verwarmings- of koelrichting. Beide mogen nul zijn; zijn beide nul, dan betekent precies op het doel geen vraag. Binnen de band wordt na herstart, doelwijziging of hystereseverandering geen nieuwe vraag aangenomen. Wisselen van gedrag bewaart eerder ingevoerde aangepaste stopwaarden en gebruikt ze opnieuw wanneer je terugkeert naar aangepast gedrag.

**Stoppen bij doeltemperatuur** is het aanbevolen beginpunt voor gewone thermostaten. Symmetrisch en Aangepast zijn geavanceerd: een thermostaat kan de klep sluiten of de compressor stoppen bij het doel voordat de kamer de stopgrens voorbij het doel bereikt. De gedeelde bron kan dan gevraagd blijven. Deze instellingen schatten vraag, wijzigen geen eigen schakelgrenzen van de thermostaat en forceren geen warmtestroom.

Houd grenzen van afzonderlijke warmte- en koeltoevoeren uit elkaar wanneer ze een bereikthermostaat delen. Grote stopafstanden kunnen warmtevraag vasthouden terwijl koeling start, of andersom. Toevoeren combineren vraag onafhankelijk en vergrendelen tegengestelde uitgangen niet. Gebruik waar nodig geschikte apparatuurvergrendelingen.

De bron wordt gevraagd zodra minstens één gekoppelde thermostaat geldige vraag heeft. Een uitgeschakelde thermostaat of onverenigbare HVAC-richting vraagt niets. Ontbrekende of niet-beschikbare temperatuurgegevens geven onbekende vraag en behouden een eerdere vraag niet onbeperkt. Andere geldige kamers kunnen nog vraag leveren. Zonder geldig vragende kamer schakelt de toevoer na de ingestelde vertraging uit.

Actuele thermostaatdoelen gelden, inclusief handmatige wijzigingen en doelen van adaptieve voorconditionering of Geplande terugkeer. Een schema pauzeren schakelt automatische toevoerregeling niet uit. Een geldig bereik gebruikt de ondergrens voor verwarming en de bovengrens voor koeling; een dubbelzinnig doel kan geen toevoer vragen.

<a id="room-assist"></a>
## Room Assist

Een blauw informatiepaneel bovenaan **Vraag en hysterese**, vóór de gedragskeuze, verklaart de voorrang van Room Assist en wanneer toevoerhysterese geldt.

Wanneer Room Assist het actieve doel van een kamer beheert, volgt gedeelde toevoer zijn vastgelegde regelintentie. Bij vaste verwarming vraagt de fase `towards_upper` warmte; bij vaste koeling vraagt `towards_lower` koeling. Zijn bestaande schakelgrenzen blijven leidend: toevoerhysterese en thermostaatuitzondering worden niet opnieuw toegepast. Oorspronkelijke bereikregeling volgt haar vastgelegde richting. Een ongeldig of nog wachtend ondersteund doel blijft onbekend totdat een geldige regelintentie is vastgelegd.

Het gecorrigeerde thermostaatdoel wordt niet met een aparte kamersensor vergeleken. Room Assist kan toevoervraag beëindigen terwijl de thermostaat nog hetzelfde aangepaste doel meldt.

<a id="timing-and-manual-control"></a>
## Timing en handmatige regeling

**Minimale uitduur** vertraagt een herstart na uitschakelen. **Uitschakelvertraging** vereist een ononderbroken periode zonder vraag voordat wordt uitgeschakeld; terugkerende vraag annuleert die vertraging. Beide accepteren gehele seconden van 0 tot 86.400 en staan standaard op nul. Er is geen verplichte minimale aanperiode die de bron actief houdt nadat kleppen mogelijk sluiten.

Een toevoer hernoemen of een ongebruikte stopafstand wijzigen herstart de vraagcyclus of uitschakelvertraging niet. Opnieuw inschakelen gebruikt de laatst gemelde uitschakelovergang voor de minimale uitduur.

De schakelaar van een ingeschakelde toevoer buiten Velair uitschakelen onderbreekt automatische regeling. Gebruik **Automatische regeling hervatten** om verder te gaan. De onderbreking blijft na herstart bestaan en wordt niet opgeheven door andere toevoerwijzigingen op te slaan. Uitschakelen of verwijderen van een toevoer vraagt uitschakeling van de eerder geregelde uitgang.

Extern inschakelen overschrijft de automatische regeling niet. Wanneer alle gekoppelde thermostaten geen vraag melden, schakelt Velair na de uitschakelvertraging weer uit. Bevestigt Home Assistant dat deze overgang bij Velairs correctie hoort, dan maakt Velair een blijvende melding en een Activiteit-item bij de schakelaar. De tekst noemt de toevoer, verklaart dat een externe activering is gecorrigeerd omdat de automatische regeling geen geschatte warmte- of koelvraag had en verwijst naar **Toevoerregeling** om die regeling te bekijken of uit te schakelen. Het bericht neemt niet aan dat een persoon de wijziging veroorzaakte.

Herhaalde correcties voor dezelfde toevoer en schakelaar worden tijdens de huidige integratierun hoogstens eenmaal per 15 minuten gemeld. Een andere schakelaar toewijzen begint een nieuwe meldperiode. Elke toevoer gebruikt één melding; een latere toegestane melding vervangt de vorige. Mislukte opdrachten of acceptatie van een serviceaanroep zonder bijbehorende gemelde uitschakelovergang geven geen succesmelding. Onbekende thermostaatvraag geldt niet als bevestigde nulvraag. Een schakelaarintegratie die de opdrachtcontext niet behoudt, kan niet de benodigde toeschrijving leveren. Deze meldregels wijzigen de regeling niet en vereisen geen polling. Fouten in meldingen of Activiteit onderbreken de regeling niet; Activiteit vereist Home Assistants activiteit-/logboekintegratie.

Een nieuwere handmatige uitschakeling gaat vóór een reeds lopend opslag- of hervatverzoek. Hervat daarna opnieuw uitdrukkelijk als je automatische regeling wilt. Handmatige onderbreking blijft ook tijdens eenheidsmigratie en herstart opgeslagen.

Een niet-beschikbare schakelaar of mislukte opdracht staat bij de toevoer. Afleverpogingen zijn begrensd en worden niet bij elke sensorupdate herhaald. Home Assistants acceptatie van een opdracht bewijst geen fysieke werking.

Geïmporteerde toevoeren zijn uitgeschakeld en onderbroken. Controleer uitgang en kamers, schakel de toevoer in, sla op en hervat de automatische regeling uitdrukkelijk wanneer passend.

<a id="preconditioning-master-and-performance"></a>
## Master voor voorconditionering en prestaties

De [Master voor voorconditionering](adaptive-preconditioning.nl.md#preconditioning-master) begrenst de voorbereidingsstart van afhankelijke kamers. Gedeelde toevoer volgt juist de kamervraag. Een ketelinstallatie met radiatorventielen heeft niet automatisch een master nodig; Velair maakt geen afhankelijkheden tussen deze instellingen.

De regeling luistert naar ingestelde entiteiten en gebruikt één bundelende worker en maximaal één timer per toevoer. Er is geen polling, geen opslag van temperatuurmonsters en geen open browser nodig. Gewone temperatuurveranderingen zonder relevante wijziging van de regelstatus versturen geen nieuwe volledige paneelsnapshot.
