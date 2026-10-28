<a id="shared-climate-supply"></a>
# Gedeelde klimaattoevoer
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](shared-climate-supply.md) · [Español](shared-climate-supply.es.md) · [Français](shared-climate-supply.fr.md) · [Deutsch](shared-climate-supply.de.md) · [Italiano](shared-climate-supply.it.md) · [Nederlands](shared-climate-supply.nl.md) · [Polski](shared-climate-supply.pl.md) · [Português (Brasil)](shared-climate-supply.pt-br.md) · [Português (Portugal)](shared-climate-supply.pt-pt.md) · [Русский](shared-climate-supply.ru.md) · [Vertaalstatus](../translation-status.md)

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

<a id="live-status"></a>
## Live status

Kies **Live status** in de detailkop van een opgeslagen toevoer om de alleen-lezenmonitor te openen. Deze gebruikt de opgeslagen configuratie, ook bij niet-opgeslagen wijzigingen. Nieuwe toevoeren moeten eerst worden opgeslagen.

De samenvatting toont de door Home Assistant gemelde schakelaarstatus, het aantal vragende thermostaten en de automatische besturingsstatus inclusief minimale-uit- en uitschakelwachttijden. Vraag en een Aan-schakelaar bevestigen geen fysieke verwarming, koeling, klepopening of stroming.

Bij beoordeelde vraag en beschikbare metingen toont elke thermostaat een temperatuurlijn met actuele waarde, effectief doel en start-/stopgrenzen. Een gearceerde band in dezelfde themakleur als Room Assist markeert het interval, onafhankelijk van vraag. Bij vraag loopt een dunne pijl over de temperatuurlijn van huidige waarde naar stopgrens: oranje bij verwarmen, blauw bij koelen. Dit toont gevraagde temperatuurrichting, geen fysieke warmtestroom of bevestigde werking. Zonder vraag verdwijnt de pijl, wordt de actuele markering neutraal en blijft de statische band. Temperatuur stijgt voor verwarmen en koelen naar rechts. Waarden en grenslabels blijven zichtbaar zonder aanwijzen, ook mobiel. Huidige en doelwaarden staan gecentreerd boven hun echte posities; nabije labels krijgen aparte rijen. Elke start-/stopmarkering groepeert grenstemperatuur met getekende afstand tot doel, zonder aparte grenstabel.

Labels benadrukken de volgende relevante grens. Bij vraag geeft **Stopt bij** de stopgrens aan. Voordat de meting de startdrempel passeert, heet deze **Ondergrens** bij verwarmen of **Bovengrens** bij koelen. Na passeren naar de vastgehouden band duidt **Herstart bij** de volgende cyclusgrens aan. Zonder vraag wordt **Start bij** benadrukt en blijft de andere grens neutraal. Samenvallende grenzen delen één markering. Onbekende vraag blijft neutraal zonder vraag aan te nemen.

Als Room Assist de vraag bepaalt, benoemt de monitor die bron en gebruikt zijn kamersensor en vastgelegde regelgrenzen in plaats van een gecorrigeerd thermostaatinstelpunt als kamerdoel. **Waarom wordt mijn toevoerhysterese niet gebruikt?** opent uitleg over voorrang en inactieve toevoerinstellingen. De uitleg blijft dicht tot selectie en behoudt zijn open toestand bij updates. Normale start-/stopinstructies worden niet onder de grafiek herhaald; ontbrekende of niet-beoordeelde data krijgt wel uitleg. Bijvoorbeeld: comfortdoel 17 °C en Room Assist-grenzen 16/18 °C betekenen startafstand 1 °C onder en stopafstand 1 °C boven doel, ook als de ongebruikte toevoerstartafstand 0.2 °C is. Oorspronkelijke bereiken kunnen één schakelgrens gebruiken: gedeelde start-/stopmarkeringen betekenen niet nul afstand tot comfortdoel. Ontbrekende metingen en niet-beoordeelde vraag worden expliciet getoond in plaats van oude vraag als live te behouden. Uitgeschakelde thermostaten en uitgeschakelde/opgeschorte toevoeren tonen beschikbare huidige waarden zonder niet-beoordeelde doelen of regelgrenzen.

De monitor ontvangt updates terwijl hij open is en stopt zijn abonnement bij sluiten. Hij toont de laatste Home Assistant-metingen, verhoogt de meldfrequentie niet, simuleert geen temperaturen en bewaart geen geschiedenis.

<a id="how-estimated-demand-works"></a>
## Hoe geschatte vraag werkt

Nieuwe toevoeren gebruiken **Stoppen bij doeltemperatuur**, met **Inschakelhysterese** van **0,3 °C** of **0,54 °F** en nul **Uitschakelhysterese**. Dit zijn gelijkwaardige temperatuurverschillen. Thermostaatuitzonderingen erven de toevoerwaarden tenzij je aangepaste kiest. De voorbeelden hieronder gebruiken andere waarden om elke modus te verduidelijken.

Bij gewone thermostaten bepaalt hysterese een start- en stopgrens. Daartussen blijft de vorige vraag behouden. Alle vergelijkingen omvatten de grens zelf. Voorbeelden met een doel van 22 °C:

Hysteresewaarden zijn temperatuurverschillen ten opzichte van de doeltemperatuur. De inschakelhysterese bepaalt wanneer de vraag begint. De uitschakelhysterese bepaalt hoe ver de temperatuur voorbij het doel moet komen, in de verwarmings- of koelrichting, om de vraag te beëindigen. Stoppen bij doeltemperatuur gebruikt nul voor de uitschakelhysterese. Symmetrisch gebruikt aan beide zijden dezelfde waarde; Aangepaste hysterese stelt beide waarden afzonderlijk in.

| Gedrag | Waarden | Verwarmen: start / stop | Koelen: start / stop |
| --- | --- | --- | --- |
| Stoppen bij doeltemperatuur (standaard) | Inschakelhysterese 0.5 °C | ≤21.5 / ≥22 °C | ≥22.5 / ≤22 °C |
| Symmetrisch | Symmetrische hysterese 0.5 °C per zijde | ≤21.5 / ≥22.5 °C | ≥22.5 / ≤21.5 °C |
| Aangepaste hysterese | Inschakelhysterese 0.5 °C; uitschakelhysterese 0.2 °C | ≤21.5 / ≥22.2 °C | ≥22.5 / ≤21.8 °C |

Het diagram in **Vraag en hysterese** volgt wijzigingen in doel, gedrag en afstanden. Het gebruikt een benoemd voorbeelddoel in plaats van een actuele thermostaatwaarde. Temperaturen staan bij start- en stopmarkeringen; haakjes verbinden elke hystereseafstand met het doel. De benoemde kamertemperatuuras loopt naar rechts op. De uitleg eronder zegt dat tussen start en stop alleen een bestaande vraag doorgaat. Verwarming vraagt toevoer aan de koudere kant, koeling aan de warmere kant. Het diagram verklaart de schatting en simuleert geen apparatuur of vertragingen. Het voorbeelddoel is 22 °C of 72 °F. Tijdens een lege, onvolledige of ongeldige invoer houdt een grijs diagram zonder temperaturen dezelfde hoogte totdat de invoer geldig is.

**Inschakelhysterese** is het temperatuurverschil vanaf het doel voordat verwarming of koeling wordt gevraagd. **Uitschakelhysterese** is het verschil voorbij het doel waar de vraag eindigt. **Symmetrische hysterese** geldt aan elke kant en is niet de totale bandbreedte. **Aangepaste hysterese** stelt beide apart in. Beide mogen nul zijn; bij beide nul betekent precies op doel geen vraag. Binnen de band wordt na herstart of doel-/hysteresewijziging geen nieuwe vraag aangenomen. Moduswissels bewaren eigen stopwaarden die weer gelden bij **Aangepaste hysterese**.

**Stoppen bij doeltemperatuur** is het aanbevolen beginpunt voor gewone thermostaten. **Symmetrisch** en **Aangepaste hysterese** zijn geavanceerd: een thermostaat kan de klep sluiten of de compressor stoppen bij het doel voordat de kamer de stopgrens voorbij het doel bereikt. De gedeelde bron kan dan gevraagd blijven. Deze instellingen schatten vraag, wijzigen geen eigen schakelgrenzen van de thermostaat en forceren geen warmtestroom.

Houd grenzen van afzonderlijke warmte- en koeltoevoeren uit elkaar wanneer ze een bereikthermostaat delen. Grote stopafstanden kunnen warmtevraag vasthouden terwijl koeling start, of andersom. Toevoeren combineren vraag onafhankelijk en vergrendelen tegengestelde uitgangen niet. Gebruik waar nodig geschikte apparatuurvergrendelingen.

De bron wordt gevraagd zodra minstens één gekoppelde thermostaat geldige vraag heeft. Een uitgeschakelde thermostaat of onverenigbare HVAC-richting vraagt niets. Ontbrekende of niet-beschikbare temperatuurgegevens geven onbekende vraag en behouden een eerdere vraag niet onbeperkt. Andere geldige kamers kunnen nog vraag leveren. Zonder geldig vragende kamer schakelt de toevoer na de ingestelde vertraging uit.

Actuele thermostaatdoelen gelden, inclusief handmatige wijzigingen en doelen van voorconditionering of Geplande terugkeer. Een schema pauzeren schakelt automatische toevoer niet uit. Geldige bereiken gebruiken standaard de ondergrens bij verwarmen en bovengrens bij koelen. Met een **Referentie-instelpunt** voor vaste Verwarmen of Koelen bij **Instellingen → Klimaatapparaten en groepen** gebruikt de toevoer dezelfde grens en de vaste modusrichting. Een dubbelzinnig doel kan geen vraag leveren.

<a id="room-assist"></a>
## Room Assist

Een blauw informatiepaneel bovenaan **Vraag en hysterese**, vóór de gedragskeuze, verklaart de voorrang van Room Assist en wanneer toevoerhysterese geldt.

Wanneer Room Assist het actieve doel van een kamer beheert, volgt gedeelde toevoer zijn vastgelegde regelintentie. Bij vaste verwarming vraagt de fase `towards_upper` warmte; bij vaste koeling vraagt `towards_lower` koeling. Zijn bestaande schakelgrenzen blijven leidend: toevoerhysterese en thermostaatuitzondering worden niet opnieuw toegepast. Oorspronkelijke bereikregeling volgt haar vastgelegde richting. Een ongeldig of nog wachtend ondersteund doel blijft onbekend totdat een geldige regelintentie is vastgelegd.

Het gecorrigeerde thermostaatdoel wordt niet met een aparte kamersensor vergeleken. Room Assist kan toevoervraag beëindigen terwijl de thermostaat nog hetzelfde aangepaste doel meldt.

<a id="timing-and-manual-control"></a>
## Timing en handmatige regeling

**Inschakelvertraging** vereist voortdurende geschatte vraag vóór de start. Bij verdwenen of onbekende vraag begint de bevestiging opnieuw. De timer hoort bij de toevoer: wisselen van vragende kamer terwijl er vraag blijft, herstart deze niet. **Minimale uittijd** beschermt na uitschakelen. Bij vraag geldt de langste tijd: **resterende minimale uittijd** of **volledige inschakelvertraging**. Ze worden niet opgeteld.

Voorbeeld met 60 seconden minimale uittijd en 20 seconden inschakelvertraging:

- Na een dag Uit is de bescherming voorbij: wacht alleen 20 seconden vanaf vraag.
- Bij vraag direct na uitschakelen wacht je 60 seconden, de langste ingestelde tijd.
- Bij vraag 50 seconden na uitschakelen resteren 10 seconden bescherming. Wacht 20 seconden vanaf vraag; starten kan 70 seconden na uitschakelen.

Vraag moet voortdurend aanwezig blijven. Live status toont resterende tijd en of bevestiging of minimale uittijd blokkeert. Nul schakelt alleen die wachttijd uit; de andere blijft gelden.

**Uitschakelvertraging** vereist voortdurend geen vraag; terugkerende vraag annuleert deze. Alle drie tijden accepteren gehele seconden van 0 tot 86.400, standaard nul. Er is geen afgedwongen minimale aantijd die de bron na mogelijk sluiten van kranen actief houdt.

Een toevoer hernoemen of een ongebruikte stopafstand wijzigen herstart de vraagcyclus of uitschakelvertraging niet. Opnieuw inschakelen gebruikt de laatst gemelde uitschakelovergang voor de minimale uitduur.

De schakelaar van een ingeschakelde toevoer buiten Velair uitzetten pauzeert de automatiek. Een blijvende Home Assistant-melding en Activiteit-item verklaren de oorzaak en dat hervatten nodig is. De reden staat ook bij **Automatisch hervatten** en Live status. Beschikbare kamertemperaturen blijven zichtbaar. Hervatten beoordeelt actuele vraag opnieuw en schakelt niet noodzakelijk in. Bij bevestigde vraag begint een nieuwe inschakelvertraging; minimale uittijd blijft gelden. De pauze blijft na herstarts en andere opgeslagen wijzigingen bestaan. Uitschakelen of verwijderen vraagt Uit aan voor de eerder bestuurde uitgang.

Extern inschakelen overschrijft de automatische regeling niet. Wanneer alle gekoppelde thermostaten geen vraag melden, schakelt Velair na de uitschakelvertraging weer uit. Bevestigt Home Assistant dat deze overgang bij Velairs correctie hoort, dan maakt Velair een blijvende melding en een Activiteit-item bij de schakelaar. De tekst noemt de toevoer, verklaart dat een externe activering is gecorrigeerd omdat de automatische regeling geen geschatte warmte- of koelvraag had en verwijst naar **Toevoerregeling** om die regeling te bekijken of uit te schakelen. Het bericht neemt niet aan dat een persoon de wijziging veroorzaakte.

Herhaalde correcties voor dezelfde toevoer en schakelaar worden tijdens de huidige integratierun hoogstens eenmaal per 15 minuten gemeld. Een andere schakelaar toewijzen begint een nieuwe meldperiode. Elke toevoer gebruikt één melding; een latere toegestane melding vervangt de vorige. Mislukte opdrachten of acceptatie van een serviceaanroep zonder bijbehorende gemelde uitschakelovergang geven geen succesmelding. Onbekende thermostaatvraag geldt niet als bevestigde nulvraag. Een schakelaarintegratie die de opdrachtcontext niet behoudt, kan niet de benodigde toeschrijving leveren. Deze meldregels wijzigen de regeling niet en vereisen geen polling. Fouten in meldingen of Activiteit onderbreken de regeling niet; Activiteit vereist Home Assistants activiteit-/logboekintegratie. Pauzemeldingen hebben een aparte melding en eigen limiet van 15 minuten; een recente correctie verbergt geen latere pauze.

Een nieuwere handmatige uitschakeling gaat vóór een reeds lopend opslag- of hervatverzoek. Hervat daarna opnieuw uitdrukkelijk als je automatische regeling wilt. Handmatige onderbreking blijft ook tijdens eenheidsmigratie en herstart opgeslagen.

Een niet-beschikbare schakelaar of mislukte opdracht staat bij de toevoer. Afleverpogingen zijn begrensd en worden niet bij elke sensorupdate herhaald. Home Assistants acceptatie van een opdracht bewijst geen fysieke werking.

Geïmporteerde toevoeren zijn uitgeschakeld en onderbroken. Controleer uitgang en kamers, schakel de toevoer in, sla op en hervat de automatische regeling uitdrukkelijk wanneer passend.

<a id="preconditioning-master-and-performance"></a>
## Master voor voorconditionering en prestaties

De [Master voor voorconditionering](adaptive-preconditioning.nl.md#preconditioning-master) begrenst de voorbereidingsstart van afhankelijke kamers. Gedeelde toevoer volgt juist de kamervraag. Een ketelinstallatie met radiatorventielen heeft niet automatisch een master nodig; Velair maakt geen afhankelijkheden tussen deze instellingen.

De regeling luistert naar ingestelde entiteiten en gebruikt één bundelende worker en maximaal één timer per toevoer. Er is geen polling, geen opslag van temperatuurmonsters en geen open browser nodig. Gewone temperatuurveranderingen zonder relevante wijziging van de regelstatus versturen geen nieuwe volledige paneelsnapshot.
