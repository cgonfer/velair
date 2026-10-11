<a id="usage-guide"></a>
# Gebruikershandleiding
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](usage.md) · [Español](usage.es.md) · [Français](usage.fr.md) · [Deutsch](usage.de.md) · [Italiano](usage.it.md) · [Nederlands](usage.nl.md) · [Polski](usage.pl.md) · [Português (Brasil)](usage.pt-br.md) · [Português (Portugal)](usage.pt-pt.md) · [Русский](usage.ru.md) · [Vertaalstatus](../translation-status.md)

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

Deze handleiding legt Velair uit vanuit het perspectief van een Home Assistant-gebruiker.

<a id="panel-navigation-and-direct-links"></a>
## Paneelnavigatie en rechtstreekse links

Het zijbalkpaneel werkt zijn URL bij wanneer je van tabblad wisselt of een onderdeel van Schema's, Sjablonen of Voorconditionering selecteert. Vernieuwen of een gekopieerde URL openen herstelt dat onderdeel. Ook de browserknoppen Vorige en Volgende volgen deze navigatie.

| Onderdeel | Pad |
| --- | --- |
| Overzicht | `/velair` |
| Schema's: standaard | `/velair/schedules/default` |
| Schema's: profielen | `/velair/schedules/profiles` |
| Modi | `/velair/modes` |
| Sjablonen: sjablonen | `/velair/templates/templates` |
| Sjablonen: klimaatpresets | `/velair/templates/presets` |
| Sensoren | `/velair/sensors` |
| Comfort | `/velair/comfort` |
| Voorconditionering: adaptieve voorconditionering | `/velair/preconditioning/preconditioning` |
| Voorconditionering: geplande terugkeer | `/velair/preconditioning/planned-return` |
| Diagnostiek | `/velair/diagnostics` |
| Instellingen | `/velair/settings` |

Gebruik deze paden in navigatieacties van Home Assistant-dashboards of voeg ze toe aan je Home Assistant-adres voor een volledige link. Een link openen selecteert een onderdeel; het activeert geen modus en verandert geen apparaatinstellingen.

Een dashboardknop kan bijvoorbeeld de bibliotheek met klimaatpresets openen:

```yaml
type: button
name: Velair climate presets
icon: mdi:thermometer-lines
tap_action:
  action: navigate
  navigation_path: /velair/templates/presets
```

Vervang `navigation_path` door een pad uit de tabel. Dit gebruikt de standaard [dashboardnavigatieactie](https://www.home-assistant.io/dashboards/actions/) van Home Assistant. Gebruik voor een bladwijzer of link uit een andere toepassing je eigen Home Assistant-adres gevolgd door het pad, bijvoorbeeld `https://your-home-assistant.example/velair/schedules/profiles`.

`/velair/schedules` opent de standaardplanningen, `/velair/templates` de sjablonen en `/velair/preconditioning` adaptieve voorconditionering. De onderdeelkeuze wisselt tussen adaptieve schemavoorbereiding en geplande terugkeer. `/velair/overview` opent Overzicht; het oudere pad `/velair/profiles` opent Modi. Een onbekend onderdeel opent het standaardonderdeel van het tabblad; een onbekend tabblad opent Overzicht. Deze paden worden genormaliseerd zonder extra browsergeschiedenis.

Links bewaren geen selectie van een klimaatentiteit, weekdag, profiel, sjabloon of preset. Niet-opgeslagen wijzigingen keren na vernieuwen niet terug. Bestaande bevestigingen voor het weggooien van wijzigingen blijven gelden: annuleren behoudt het huidige onderdeel en de URL. Optionele Lovelace-kaarten behouden hun dashboard-URL.

Zolang het zijbalkpaneel open is, delen de tabbladen de laatst bevestigde backendgegevens. Na de eerste laadbeurt herhaalt tabbladwisseling die laadbeurt niet. Updates gaan tijdens navigatie door; bevestigingen bij niet-opgeslagen wijzigingen blijven gelden. De pagina vernieuwen laadt de gegevens opnieuw zonder concepten te herstellen.

Optionele Lovelace-kaarten gebruiken een aparte sessie. Kaarten op dezelfde Home Assistant-verbinding delen hun eerste laadbeurt en actuele updates, maar houden hun eigen bediening en niet-opgeslagen wijzigingen. Lovelace kan kaarten actief houden wanneer je naar een andere dashboardweergave gaat, zodat terugkeren geen nieuwe laadbeurt vraagt. De gedeelde sessie sluit wanneer de laatste kaart wordt verwijderd; vernieuwen start een nieuwe laadbeurt. Hiervoor hoef je YAML niet te wijzigen.

<a id="help-and-documentation"></a>
## Hulp en documentatie

Open **Instellingen → Hulp en community** voor documentatie, om een probleem in GitHub Issues te melden of om vragen en suggesties in Discussions te delen. Het hulpicoon naast een kop of rechts in een onderdeelknop opent een korte uitleg met **Handleiding openen**. Hulp bij een onderdeel openen selecteert dat onderdeel niet en verandert je bewerkingen niet. De uitleg en handleiding horen bij die keuze, ook als die niet actief is. In Instellingen biedt het hulpicoon bij **Externe aanpassingen** ook de bijbehorende handleiding. Hulpiconen gebruiken hetzelfde vraagteken en lichten op wanneer je erover beweegt; informatie-iconen geven korte uitleg bij velden.

Sluit de hulp met de sluitknop, Escape of een klik buiten het dialoogvenster. De toetsenbordfocus keert terug naar het hulpicoon.

De korte uitleg blijft in alle ondersteunde interfacetalen beschikbaar, ook zonder internetverbinding. Handleidingen gebruiken je Home Assistant-taal wanneer een vertaling beschikbaar is; anders valt elke handleiding afzonderlijk terug op Engels. Alleen bij die terugval verschijnt **In het Engels**. Vertaalde handleidingen tonen hun synchronisatie met de bron en taalreviewstatus, met een link naar het Engelse origineel als wijzigingen ontbreken. Gepubliceerde releasebuilds openen documentatie van de bijbehorende versietag; ontwikkelbuilds openen de huidige documentatie op `main`. Documentatie- en communitylinks openen GitHub in een nieuw tabblad. Internet is alleen nodig wanneer je ze opent; diagnostiek of lokale configuratie wordt niet automatisch geüpload.

<a id="concepts"></a>
## Begrippen

Velair beheert schema's voor de `climate.*`-entiteiten die je bij het instellen selecteert. Elke geselecteerde entiteit is een beheerde klimaatzone.

Een schema bestaat uit blokken per weekdag. Een blok begint op een bepaald tijdstip en kan:

- een doeltemperatuur instellen, eventueel met een HVAC-modus en ondersteunde opties zoals ventilatorstand, apparaatpreset, oscillatie, horizontale oscillatie of doelluchtvochtigheid;
- één of meer ondersteunde opties instellen zonder doeltemperatuur of HVAC-modus te veranderen;
- alleen de HVAC-modus wijzigen en de doeltemperatuur aan het apparaat overlaten;
- de klimaatentiteit uitschakelen.

Een blok blijft actief tot het volgende blok in het weekschema begint. Dit geldt ook over middernacht en lege weekdagen heen: vóór het eerste blok van een dag behoudt Velair het laatste blok van een eerdere dag. De tijdlijn toont die overgenomen periode afzonderlijk, zodat je ziet waar het blok oorspronkelijk is ingesteld.

<a id="external-adjustments-and-manual-adjustment"></a>
## Externe en handmatige aanpassingen

Per zone bepaal je wat Velair doet als een HVAC-modus of doeltemperatuur buiten Velair verandert, bijvoorbeeld via een Home Assistant-klimaatkaart, infraroodafstandsbediening of andere automatisering. Stel **Externe aanpassingen** in bij elke beheerde klimaatentiteit in **Instellingen**:

- **Automatisch behouden** is de standaard en past de huidige Velair-instelling opnieuw toe.
- **Tot volgend blok** respecteert de aanpassing tot het volgende effectieve blok begint.
- **Voor een bepaalde tijd** hervat na het ingestelde aantal minuten.
- **Tot hervatten** wacht op een expliciete actie.

Zolang Velair de regeling afstaat, selecteert Overzicht **Handmatige aanpassing** in de vaste Automatisch/Handmatig-bediening. Dit staat los van de Velair-modus **Handmatig**: die beschrijft hoe profielen zijn geselecteerd; een handmatige aanpassing beschrijft wie één klimaatentiteit bestuurt. Hervatten past het actieve profielschema, standaardschema of andere huidige planningsinstelling opnieuw toe. Andere onafhankelijke pauzeredenen blijven gelden.

Overzicht selecteert **Automatische planning** wanneer Velair de klimaatentiteit bestuurt. Selecteer **Handmatige aanpassing** om de huidige instellingen vast te houden zonder eerst het apparaat te wijzigen. Dit gebruikt het handmatige beleid uit Instellingen. Met **Automatisch behouden** blijft een expliciete handmatige actie toch actief tot hervatten, zonder die instelling te veranderen. Dezelfde handeling is beschikbaar via `velair.enter_manual_adjustment`: deze legt de actuele verwarmings-, koel-, uit- of bereikinstellingen vast en accepteert alleen het entiteits-ID.

Bij **Automatisch behouden** herberekent Room Assist zijn geldende doeltemperatuur en past deze opnieuw toe. Bij een handmatig beleid geeft het de regeling af zonder zijn geplande correctie te herstellen. Eén doeltemperatuur en oorspronkelijke temperatuurintervallen worden beide ondersteund.

De volledige handleiding beschrijft detectiegrenzen, alle beleidskeuzes, herhaalde aanpassingen, profielen en modi, prioriteit van tijdelijke aanpassingen en pauzes, herstartgedrag, exacte YAML voor services en gebeurtenissen en praktische tijdlijnen. Zie [Externe wijzigingen en handmatige aanpassingen](manual-control.nl.md).

Velair berekent komende gebeurtenissen in de backend en plant nauwkeurige eenmalige callbacks via Home Assistant. De frontend ontvangt backendupdates via WebSocket en heeft geen voortdurende peilingen nodig.

Tijdens een geplande terugkeer toont Overzicht een compacte huishoudsamenvatting met wekelijkse of eenmalige oorsprong, huidig proces en toepasselijke bevestigings- of aankomsttijd. Selecteer deze om Geplande terugkeer onder Voorconditionering te openen; de samenvatting herhaalt de vertrekbediening niet. Een probleem kan zichtbaar blijven zonder actieve vertrekprocedure.

Elke betrokken klimaatentiteit krijgt een violet signaal voor geplande terugkeer wanneer de backend aangeeft dat Afwezig of aankomstvoorbereiding de huidige regeling bepaalt. De normale bedrijfstoestand, profiel- en Room Assist-informatie blijven zichtbaar. Toekomstige voorbereidingstijden zijn een vooruitblik, geen teken van actieve regeling. Handmatige regeling, tijdelijke aanpassingen, onafhankelijke pauzes, gestopte planning en externe uitvoering behouden hun prioriteit. Een zone die onder een aangepaste afwezigheidsmodus gewoon haar standaardschema volgt, krijgt geen afwezigheidssignaal. Het signaal beschrijft de bedoelde regeling, niet dat een opdracht succesvol is afgeleverd of de kamer haar doel al heeft bereikt.

Wanneer een klimaatentiteit geen `target_temp_step` publiceert, toont haar rij in **Instellingen** **Temperatuurstap**. Velair gebruikt standaard `1`; je kunt de werkelijke positieve stap instellen. Velair onthoudt de laatst geldige gerapporteerde stap, zodat decimalen geldig blijven als het attribuut verdwijnt. Een momenteel gerapporteerde stap heeft altijd voorrang. Een handmatige waarde opslaan terwijl het attribuut ontbreekt vervangt de onthouden terugvalwaarde. Als het apparaat later weer een stap publiceert, onthoudt Velair dat nieuwe raster, ook als de handmatige terugvalwaarde opgeslagen blijft.

**Diagnostics** biedt een alleen-lezen momentopname van planning en zones, een begrensde geschiedenis voor de huidige uitvoering en een opgeschoond JSON-rapport voor probleembijlagen. Dit voegt geen peilingen toe en vereist Recorder niet. Op desktop kun je logboekkolommen voor de huidige sessie in breedte aanpassen; herladen herstelt de breedtes en ze worden nooit opgeslagen. Op mobiel verschijnt dezelfde informatie in een compacte responsieve indeling.

Diagnostiek toont ook de geplande terugkeer van het huishouden en de effectieve deelname, voorbereidingsschatting en eventuele opschortingsreden van de geselecteerde zone. Een uitgeschakelde wekelijkse routine staat los van de beschikbaarheid van eenmalige terugkeer. De geschiedeniscategorie **Geplande terugkeer** registreert geaccepteerde planning, bevestiging, vertrek, aankomstwijzigingen, voorbereidingsstarts, voltooiing, annulering en fouten. Ze deelt de bestaande limiet van 100 gebeurtenissen en wordt bij herstart gewist; categorievoorkeuren blijven opgeslagen. Vernieuwen voegt geen geschiedenis toe. Rapporten bevatten deze context zonder modus- en profielidentificaties, ook als entiteits-ID's expliciet zijn opgenomen.

<a id="home-assistant-entities"></a>
## Home Assistant-entiteiten

Velair maakt blijvende Home Assistant-entiteiten die de tijdelijke automatiseringsgebeurtenissen aanvullen:

- **Volgende geplande gebeurtenis** is een tijdstempelsensor voor de eerstvolgende Velair-actie. Attributen bevatten alle gebeurtenissen op dat tijdstip, de berekende uitvoeringstijd en de oorspronkelijke doeltijd bij vervroegde voorbereiding.
- **Plannerstatus** beschrijft of Velair inactief, gepland, tijdelijk aangepast of gepauzeerd is. Attributen bevatten algemene modus en pauze-eindtijd. Komende gebeurtenissen en zoneaanpassingen blijven in hun eigen sensoren, om dubbele Recorder-geschiedenis te vermijden.
- **Diagnosestatus** is een diagnostische enum-sensor met toestanden `ok`, `warning` en `error`. Compacte attributen bevatten plannerstatus, aantallen gezonde zones en zones met waarschuwingen of fouten, probleemaantallen en actieve probleemcodes. Dashboards en toestandstriggers kunnen de gezondheid zo gebruiken zonder onbewerkte fouttekst.
- **Actieve doeltemperatuur** bestaat per zone. Ze toont de doeltemperatuur die Velair momenteel beheert, inclusief tijdelijke aanpassingen en vervroegd gestarte blokken. De eenheid volgt de klimaatentiteit. Bij een oorspronkelijk bereik is één sensorwaarde niet beschikbaar, omdat er niet één juiste temperatuur is; gebruik `target_temp_low` en `target_temp_high`.
- **Omgevingsconditie** bestaat per zone en biedt leesbare toestanden zoals comfortabel, koud, vochtig of warm en vochtig. Compacte attributen tonen gegevenskwaliteit en bronentiteiten, zonder de oorspronkelijke temperatuur- en vochtigheidsmetingen te kopiëren.
- **Ventilatiemogelijkheid** bestaat per zone en beschrijft voorzichtig of buitenlucht de kamer naar de ingestelde comfortzone kan brengen. Ze opent geen ramen en bestuurt het apparaat niet.
- **Luchtkwaliteit** bestaat per zone en houdt de afzonderlijke CO2-beoordeling bij: goed, verhoogd, slecht, niet beschikbaar of niet bewaakt.
- **Tijdelijke aanpassing** toont of de zone geen aanpassing, een tijdelijke temperatuurinstelling of een zonepauze heeft.
- **Bediening** bestaat per zone en toont of lokale regeling `automatic` is, een handmatige aanpassing actief is of een externe schemaprovider de fysieke uitvoering beheert. Attributen bieden de huidige planner-, profiel-, modus- en handmatige context.
- **Leveringsdiagnose** bestaat per zone als standaard uitgeschakelde diagnostische sensor. Ze toont de laatste uitvoeringsuitkomst en de laatste doelinstellingen waarvoor Home Assistant de volledige servicereeks heeft geaccepteerd, zonder onbewerkte fouttekst of uitspraak over het fysieke apparaat.
- **Start voorconditionering** is een tijdstempelsensor met de berekende start van het volgende of actieve vervroegde blok. Attributen bevatten doeltijd, voorsprong, richting, modelbron, doeltemperatuur en HVAC-modus.
- **Room Assist** toont de actuele uitvoeringstoestand en compacte doelcontext zonder de oorspronkelijke kamer- en apparaatmetingen te herhalen.
- **Automatische planning** en **Modus** zijn bestuurbare entiteiten. Automatische planning uitschakelen stopt onbeperkt; inschakelen hervat het actieve schema. Een aangepaste modus selecteren activeert de gekoppelde profielen; **Standaard** wist de actieve combinatie. **Handmatig** betekent dat geen aangepaste modus die combinatie bepaalt; rechtstreekse activering komt doorgaans in die toestand. Velair toont deze toestand, maar biedt haar niet als actie. Gebruik `velair.pause` voor een tijdelijke pauze met duur.

Deze entiteiten hergebruiken backendmomentopnamen, ontvangen dispatcherupdates en peilen Home Assistant niet. Gebeurtenissen zijn geschikt om op overgangen te reageren; entiteiten om de huidige toestand te raadplegen. Room Assist kan de verzonden doeltemperatuur na de geaccepteerde regelwaarde aanpassen; gebruik de eigen **Room Assist**-sensor voor die correctiecontext. Zie [Sensorreferentie](sensors.nl.md) voor sensoren, attributen en voorbeelden en [Sensoren voor zonebediening en opdrachtuitvoering](zone-sensors.nl.md) voor diepere afspraken over regeling, comfort, ventilatie en uitvoering.

Als je een klimaatentiteit uit de integratieopties verwijdert, verwijdert Velair bij herladen haar gegenereerde zonesensoren uit het entiteitsregister. Algemene Velair-entiteiten en die van andere integraties blijven intact. Opnieuw toevoegen maakt de sensoren weer aan met deterministische unieke ID's.

Home Assistant kiest vertaalde entiteitsnamen op basis van de backendtaal bij het aanmaken. Alleen de interfacetaal van een gebruiker wijzigen hernoemt bestaande registervermeldingen niet. Je kunt bestaande entiteiten in Home Assistant hernoemen zonder hun gedrag te wijzigen.

<a id="open-velair"></a>
## Velair openen

Na het instellen verschijnt Velair in de Home Assistant-zijbalk. Het zijbalkpaneel is de aanbevolen interface. Optionele Lovelace-kaarten zijn handig om afzonderlijke Velair-onderdelen in een bestaand dashboard op te nemen.

De lijst met komende gebeurtenissen in Overzicht toont de volgende geplande gebeurtenis per zone, ook vervroegde voorbereiding. Dit is zichtbaarheid voor de gebruiker; intern plant Velair nog steeds de eerstvolgende actie.

Het zoneoverzicht gebruikt compacte responsieve kaarten om te tonen wat Velair en het apparaat nu doen. Als de klimaatentiteit `hvac_action` rapporteert, gebruikt de samenvatting haar actuele waarde voor verwarmen, koelen, drogen, ventileren, inactief, uit, voorverwarmen of ontdooien. Vervolgens vermeldt dezelfde samenvatting Velairs planning, handmatige regeling, tijdelijke aanpassing, pauze, voorbereiding of uitgeschakelde automatisering, de gerapporteerde HVAC-modus en relevante tijden, zonder de activiteit elders te herhalen. Ontbreekt `hvac_action` of is de waarde ongeldig, dan toont Velair zijn eigen uitvoeringstoestand zonder apparaatactiviteit te raden.

Elke kaart begint met naam en entiteits-ID, daarna het actieve profiel en geordende signalen voor Room Assist, comfort, lucht en gegevenskwaliteit. Op zeer brede kaarten staan deze signalen en de compacte samenvatting samen in de kop. Op smalle kaarten, ook mobiel en compacte Lovelace-indelingen, blijven identiteit en status naast elkaar, terwijl volledige profiel- en comfortsignalen de volgende rij gebruiken zonder hun betekenis te verkorten. De samenvatting gebruikt een consistent icoon, evenwichtige tekst en terughoudend activiteitsaccent, zonder vaste kop of versierende buitenrand. Bij actieve of vasthoudende Room Assist zijn details gegroepeerd in Temperatuur (apparaat, dan sensor), Doeltemperatuur (apparaat, dan gepland) en richtingsafhankelijke Correctie. Ontbrekende waarden worden weggelaten. Neutrale signalen blijven rustig; waarschuwingskleur is voor situaties die aandacht vragen.

De Lovelace-kaart ondersteunt de volgende waarden van `view`:

- `climate`;
- `overview-status`;
- `overview-boosts`;
- `overview-events`;
- `overview-timeline`;
- `overview-zones`;
- `active-setup`;
- `schedules`;
- `sensors`;
- `comfort`;
- `preconditioning`;
- `planned-return`;
- `diagnostics`.

<a id="planned-return-card"></a>
### Kaart voor geplande terugkeer

Voeg de huishoudbediening voor terugkeer uit het zijbalkpaneel toe aan een dashboard:

```yaml
type: custom:velair-card
view: planned-return
```

Tijdens het bevestigen van afwezigheid legt een tijdregel de controle op een leeg huis uit en toont de backenddeadline in de lokale Home Assistant-tijd. De afwezigheidsmodus start pas na bevestiging als alle bronnen nog afwezigheid melden. Vóór bevestiging is er geen lopend aftellen of vertrektijdlijn.

De visuele editor noemt deze weergave **Geplande terugkeer**. Ze toont alleen de compacte bediening voor **One-off return**, met rechtsboven aantallen aanwezige, afwezige en onbekende bronnen. De opgeslagen bevestigingsvertraging staat daar alleen vóór bevestigde actieve afwezigheid. Zonder aanwezigheidsbronnen ontbreken deze signalen: **Plan return** bevestigt vertrek expliciet en activeert Afwezig onmiddellijk. De aankomsttijd bepaalt nog steeds voorbereiding en doelmodusactivering, maar zonder bronnen kan Velair fysieke aankomst niet herkennen. Onbekende of onbeschikbare ingestelde bronnen behouden hun normale wachtgedrag; de wekelijkse routine vereist bronnen.

Stel vóór vertrek of tijdens afwezigheid een toekomstige datum en tijd in. Een actieve episode biedt alleen **Annuleren** en **Terugkomst wijzigen**. Annuleren stopt de terugkeerautomatisering en herstelt na bevestigd vertrek de vorige modus en profielen; zolang bevestiging loopt verandert de selectie niet. Start bijvoorbeeld vanuit Comfort met vijf minuten vertraging: annuleren na twee minuten laat Comfort actief; annuleren nadat Afwezig is toegepast herstelt Comfort en zijn oorspronkelijke profielen. Zie de [annuleringsvoorbeelden](planned-return.nl.md#cancelling-a-return-examples), ook voor starten zonder sensoren, aankomstwijzigingen en expliciete modusselecties.

Na voltooiing of annulering verschijnt een nieuw datum-/tijdformulier, ook als de aanwezigheidsbronnen iedereen nog afwezig melden. **Plan return** blijft zichtbaar maar is uitgeschakeld wanneer configuratie of planner niet beschikbaar is. Het zijbalkpaneel gebruikt dezelfde knoppen en het nieuwe formulier. Alleen de afsluitende aanwezigheids- en vertragingssignalen zijn kaartspecifiek; de zijbalk houdt de volledige wekelijkse, aanwezigheids- en voorbereidingsconfiguratie.

Beide tonen een compacte fasesubtitel bij de titel, met een oorspronkelijke tooltip die de fase uitlegt. Tijdens bevestiging geeft de proceskop deze context. Vóór bevestigd vertrek markeren een toegankelijk aankomsticoon en **Expected arrival** de opgeslagen terugkeer, uitgelijnd met titel en toestand. De waarde is een compacte klikbare chip zonder potlood of onderstreping. De bevestigde grafiek houdt haar onderstreepte datum/tijd met potlood ervoor. Beide openen dezelfde aankomsteditor.

De blauwe knop **Terug** met pijl links in de actierij gooit de aankomstbewerking weg en sluit lokaal, waarna de laatst opgeslagen aankomst verschijnt. De waarschuwing en navigatiebeveiliging verdwijnen; onafhankelijke niet-opgeslagen routinewijzigingen blijven beschermd. Opnieuw openen begint met de opgeslagen waarde. Een geslaagde opslag sluit de editor; mislukte opslag en actuele updates behouden het concept.

Vertrek en aankomst gebruiken dezelfde typografie. Annuleren is een compacte rode gevulde knop met witte tekst linksonder de episodegegevens, alleen zichtbaar als een actieve terugkeer annuleerbaar is en de editor gesloten is. Tijdens bewerken sluit **Terug** links en blijft **Terugkomst wijzigen** rechts met een compacte groene achtergrond. Beide hebben 32-pixel zichtbare knoppen binnen 44-pixel aanraakvlakken. Aanwezigheidssignalen blijven rechtsboven; vertraging verdwijnt na bevestigd vertrek.

Stel bronnen, modi, afwezigheidsbevestiging en wekelijkse routine in via **Voorconditionering → Geplande terugkeer** in de zijbalk. De kaart gebruikt deze opgeslagen huishoudconfiguratie, zonder configuratievelden of schakelaar voor de wekelijkse routine. Thermostaatfilters beperken deze huishoudkaart niet. Dashboard en zijbalk wijzigen dezelfde backendepisode; aankomstconcepten blijven lokaal per kaart tot verzending.

Bij bevestigde afwezigheid staan vertrek- en aankomsticonen aan de uiteinden van de tijdlijn. Opgeslagen tijden staan er direct onder; aankomst behoudt het potlood. **Terug** sluit vanuit de actierij, zonder sluitknop naast de tijd. Eenvoudige moduslabels met icoon en tekst onder de tijden benoemen Afwezig/Terugkeer zonder herhaling. De tijdlijn toont werkelijk bevestigd vertrek en opgeslagen aankomst met de namen van beide modi. Een punt met vertaalde tooltip **Nu** markeert verstreken UTC-tijd tussen de uiteinden, begrensd tot de balk. Datums verschijnen wanneer vertrek en aankomst op verschillende dagen in de Home Assistant-tijdzone vallen.

Een aankomstbewerking verplaatst het uiteinde pas na backendacceptatie. Nog te bevestigen, voltooide, geannuleerde, overgeslagen of mislukte terugkeren hebben geen bewegende balk. De lokale klok vernieuwt eenmaal per minuut terwijl kaart of zijbalk zichtbaar is; ze peilt Home Assistant niet. De gekleurde balk geeft verstreken tijd aan, geen temperatuurvoortgang.

Als geen betrouwbare eerste voorbereidingsstart beschikbaar is, legt een klein informatieknopje naast **One-off return** opgeschorte, al bereikte, uitsluitend bij aankomst deelnemende of uitgesloten kamers uit, mits de huidige vooruitblik overeenstemt. Ontbrekende of gemengde informatie blijft onzeker. Gebruik aanwijzer of focus op desktop, tik op mobiel; Escape of buiten het venster klikken sluit de uitleg.

Een backendschatting kan een klokmarkering **Geschatte voorbereiding** toevoegen voor de eerste geschikte kamer. De zachtblauwe toelichting klapt open met geschikte kamers en geschatte starttijden in tijdvolgorde. Ze begint ingeklapt; elke kamer kan afzonderlijk starten. Gewone updates houden de lijst open; een gewijzigde opgeslagen aankomst of episode sluit haar. Aankomst bewerken verbergt toelichting en terugvaluitleg, maar bewaart de schatting op de tijdlijn. **Terug** herstelt de open/dicht-toestand van dezelfde episode. Dit is advies, geen werkelijke HVAC- of temperatuurvoortgang. Weeksamenvatting, bronnenlijst en voorbereidingsdetails blijven in de zijbalk.

<a id="climate-status-and-control-card"></a>
### Kaart voor apparaatstatus en bediening

Gebruik `view: climate` voor een compacte kaart voor één beheerde `climate.*`-entiteit. Ze volgt het actieve Home Assistant-thema via kleur- en oppervlakvariabelen en past zich aan lichte, donkere, mobiele, tablet- en desktopindelingen aan.

De kaart combineert apparaattemperatuur, luchtvochtigheid, HVAC-modus en `hvac_action` met Velairs huidige regeling en uitvoeringsgegevens. Ze gebruikt dezelfde effectieve dagtijdlijn, profielkleur en profielicoon als Overzicht. Modus, profiel, comfort, Room Assist en voorbereiding verschijnen alleen als ze ingesteld en relevant zijn. Bij externe uitvoering toont de kaart provider en publicatiestatus in plaats van lokale functies of apparaatacties. De optionele eenmalige terugkeer bestuurt het huishouden en staat los van wie de geselecteerde zone beheert.

```yaml
type: custom:velair-card
view: climate
selected_entity: climate.living_room
climate_name: Living room
climate_humidity_entity: sensor.living_room_humidity
climate_outdoor_temperature_entity: sensor.outdoor_temperature
climate_window_entities:
  - binary_sensor.living_room_window
  - binary_sensor.patio_door
climate_window_display: grouped
climate_room_assist_display: both
climate_preconditioning_display: both
climate_show_control_mode: true
climate_show_target_control: true
climate_show_hvac_mode_control: true
climate_show_native_climate_link: true
climate_actions:
  - type: boost
  - type: pause
    placement: more
  - type: planned-return
    enabled: true
  - type: script
    name: Ventilate room
    script: script.ventilate_living_room
    icon: mdi:window-open-variant
    color: "#03a9f4"
    confirmation: true
    placement: auto
```

De bediening combineert geordende snelle acties met een onafhankelijk instelbare Automatisch/Handmatig-keuze, volgens hetzelfde model als Overzicht. Het onderste vlak groepeert HVAC-modus, huidige doeltemperatuur wanneer het apparaat aanstaat en een snelkoppeling naar het oorspronkelijke Home Assistant-dialoogvenster. Elke aangeboden HVAC-modus heeft een icoon. Rechtstreeks wijzigen blijft alleen-lezen zolang Velair het actieve schema beheert: kies eerst **Handmatig**, wacht tot de handmatige aanpassing is bevestigd en gebruik daarna temperatuur- en modusbediening. **Automatisch** hervat planning. Tijdelijke aanpassingen, onafhankelijke pauzes, stoppen en onbeschikbaarheid blokkeren bewerken met uitleg. De interne pauze voor handmatige aanpassing zelf blokkeert deze bediening niet. Externe zones behouden de Home Assistant-snelkoppeling; een ingeschakelde eenmalige terugkeer kan de huishoudbediening openen.

Eén doeltemperatuur en oorspronkelijke `heat_cool`-bereiken worden ondersteund. Bereikwijzigingen sturen beide grenzen samen. Velair gebruikt gepubliceerde `min_temp`, `max_temp` en `hvac_modes`. Temperatuuraanpassingen volgen gepubliceerde `target_temp_step`; verdwijnt dat attribuut, dan blijft de laatst geldige stap gelden zodat decimalen geldig blijven. Daarna volgt de handmatige zoneterugval uit Instellingen, vervolgens `1` als nooit een stap is gerapporteerd of ingesteld. Velair verzint geen HVAC-modi.

Oudere kaarten gebruikten `climate_show_boost_action`, `climate_show_pause_action` en `climate_custom_actions`. Velair blijft deze lezen; de visuele editor schrijft `climate_actions` wanneer de actielijst verandert.

**One-off return** is een andere ingebouwde actie. Ze ondersteunt dezelfde zichtbaarheid, verborgen naam en automatische/Meer-plaatsing als Tijdelijke aanpassing en Pauze. De editor zet ingebouwde acties eerst: tijdelijke aanpassing, pauze, daarna eenmalige terugkeer, ook verborgen acties. Terugkeer gebruikt violet om zich van Pauze te onderscheiden. Openen vervangt het onderste regelvlak door het compacte vertrekformulier of de huidige tijdlijn en bediening. Sluit met X om terug te gaan; sluiten annuleert een actief vertrek niet. Niet-opgeslagen aankomstwijzigingen vragen bevestiging; een lopende actie moet eerst eindigen. Instellingen en effecten gelden voor het hele huishouden, niet alleen de gekozen zone.

Deze drie actiepanelen sluiten aan bij de rand en achtergrond van de werkbalk, zoals de normale thermostaatbediening. Rechtstreekse acties zonder tekst behouden hun compacte breedte en centreren het icoon; een open paneel geeft ruimte aan de sluitknop.

Bestaande kaarten houden terugkeer verborgen tot je haar inschakelt. Nieuwe kaarten uit de Home Assistant-kaartkiezer hebben haar in de eerste actielijst ingeschakeld, ook wanneer je de nieuwe kaart op `climate` zet. Een YAML-kaart zonder `planned-return`-actie houdt haar verborgen. Schakel haar in via de editor of voeg bovenstaande actie toe. De editor houdt ingebouwde acties in hun vaste sectie en biedt volgordeaanpassing voor eigen acties. De editor openen herschikt de opgeslagen dashboardlijst niet.

Huidige luchtvochtigheid en geschiedenis gebruiken standaard de attributen van de gekozen klimaatentiteit. Stel `climate_humidity_entity` in voor de actuele waarde en oorspronkelijke Home Assistant-geschiedenis van een eigen vochtigheidssensor. Velair raadt dit verband niet, omdat integraties het niet consequent publiceren.

Buitentemperatuur en raamcontacten zijn optionele dashboardcontext. Velair ontdekt, beheert of automatiseert ze niet via deze kaart. Raamtoestanden zijn alleen informatie, ook als een aparte automatisering of de [raamblueprint](blueprints/pause-zone-for-open-windows.nl.md) dezelfde entiteiten gebruikt. Stel `climate_window_display` op `grouped` of `individual`. De editor heeft aparte vinkjes voor buitenmeting en ramen en toont deze onderdelen pas na entiteitsselectie.

De volledige kop Huidige status klapt het geopende paneel dicht. Metingen en context gebruiken chips die naar een volgende regel lopen in plaats van horizontaal te schuiven; alle ingeschakelde sensoren blijven op smalle kaarten zichtbaar. Een beschikbare comfortbeoordeling krijgt onder de ingeklapte kop een aparte beschrijvende rij met toestand, contextueel inzicht, icoon en kleuraccent. De editor kan ingeschakelde afgeleide comfortmetingen ook in die rij tonen; anders blijven ze in de uitgeklapte rij. Bij onbeschikbare beoordeling ontbreekt de comfortrij.

De uitklapknop blijft vast terwijl chips zoveel compacte rijen gebruiken als nodig. De presentatietoestand geldt alleen voor de huidige kaartsessie. Huidige status begint standaard ingeklapt; de editor kan uitgeklapt als standaard kiezen, zonder handmatig in- of uitklappen te verhinderen.

De editor volgt dezelfde volgorde van boven naar beneden. Je kunt onafhankelijk statusbalk, apparaatnaam, bedrijfstoestand, losse bediening en acties, huidige temperatuur, luchtvochtigheid, buitenmeting, ramen, comfort, optionele ingeklapte comfortmetingen, tijdlijn, Room Assist en voorbereiding verbergen. De apparaatnaam kan een eigen lokale kaartnaam worden, ook leeg, en worden hersteld naar de actuele vriendelijke entiteitsnaam. Zijn alle onderdelen van Huidige status uitgeschakeld, dan ontbreekt de hele container. Ontbrekende zichtbaarheidswaarden betekenen zichtbaar, zodat oude kaarten hetzelfde blijven.

Elke zichtbare temperatuur- of vochtigheidsmeting heeft een compacte snelkoppeling naar de oorspronkelijke geschiedenis van de ingestelde bron; met de meting verdwijnt ook de snelkoppeling. Configuratiecategorieën kunnen dichtklappen; eigen scriptacties blijven dicht tot bewerking nodig is, voor bruikbaarheid op smalle schermen. Een ander script kiezen ververst de naam uit die scriptentiteit; daarna kun je die weer aanpassen. De Velair-snelkoppeling in de kop blijft altijd aanwezig voor herkenbaarheid en terugkeer naar de integratie. Elke rechtstreekse actie kan haar naam verbergen en een icoonknop worden; het toegankelijke label en de volledige naam in Meer blijven intact.

Snelle acties delen de bovenste regel met Automatisch/Handmatig, maar blijven in een zelfstandige groep aan de tegenoverliggende kant, bij elke kaartbreedte. Zijn labels te breed, dan behoudt elk zijn natuurlijke breedte en schuift de groep horizontaal in plaats van af te breken of af te kappen. Tijdelijke aanpassing of Pauze openen vervangt de gewone bediening ter plaatse; Annuleren of opnieuw op dezelfde actie drukken herstelt de bediening.

De oorspronkelijke schuifbalk blijft verborgen. Bij overloop gebruiken richtingsknoppen vaste buitenste vakken en verschijnen ze alleen als acties buiten beeld staan, zonder de actierij te bedekken of te verkleinen. Past alles, dan verdwijnen die vakken. De rij ondersteunt aanraken, muis- en penslepen zonder de actie waarmee het slepen begon uit te voeren. Scriptacties bevestigen kort geaccepteerde uitvoering of mislukking op hun knop; een open tijdelijke aanpassing of pauze toont een sluiticoon.

De apparaatkop gebruikt de huidige bedrijfsactie als belangrijkste signaal en groepeert actie, uitvoeringsbron en HVAC-modus onder de naam. Een compacte Velair-signatuur blijft de snelkoppeling naar het hoofdpaneel, met projectnaam en auteur op twee regels bij elke breedte.

Tijdlijn en Room Assist hergebruiken de Velair-grafieken, met horizontaal schuiven op smalle schermen. `climate_room_assist_display` kiest `text`, `chart` of `both` voor uitleg, temperatuurgrafiek of beide. De toestand blijft naast de titel; ingeschakelde uitleg gebruikt een tweede regel. Alleen weergaven met grafiek kunnen inklappen; tekst blijft zichtbaar zonder misleidende uitklapknop.

`climate_preconditioning_display` volgt hetzelfde model. De kop houdt geplande of actieve toestand zichtbaar; de optionele tweede regel toont doel en berekende start. Alleen een grafiek houdt uitsluitend de toestand boven de uitklapbare vooruitblik. Beide grafische onderdelen beginnen ingeklapt tenzij anders ingesteld; de editor toont die beginoptie alleen bij een grafiek. Tijdlijntitel, actief profiel en actieve modus hebben elk zichtbaarheid; modus- en profielchips gebruiken een lagere kaarthoogte. Handmatig uitklappen blijft lokaal voor de sessie.

Tijdelijke aanpassing opent een kaartformulier voor alle opties die apparaat en service ondersteunen: doeltemperatuur of bereik, duur, HVAC-modus, ventilator, preset, oscillatie, horizontale oscillatie en vochtigheid. Pauze biedt beperkte of onbeperkte duur en de keuze apparaat ongewijzigd te laten of uit te schakelen. De kaart toont `pause_id` niet; dat identificeert redenen van automatiseringen. Als een pauze een andere eigenaar of reden kan hebben, opent de kaart Velair in plaats van redenen stilzwijgend te wissen. Handmatige regeling kan vanuit de kaart worden hervat. Deze lokale acties verschijnen niet voor extern uitgevoerde zones. Tijdelijke aanpassing en Pauze/Hervatten kunnen onafhankelijk verborgen of verplaatst worden in dezelfde geordende lijst als scripts. Hun gedrag, labels, iconen en formulieren komen van Velair en zijn niet aanpasbaar.

De actielijst kan ook gekozen Home Assistant-`script.*`-entiteiten bevatten. Elke snelkoppeling heeft een lokale kaartnaam, MDI-icoon, kleur en optionele bevestiging. Velair bewaart alleen deze presentatie in Lovelace en voert het script uit via `script.turn_on`; scriptinhoud, rechten en acties blijven bij Home Assistant. De kaart accepteert geen vrije JavaScript, sjablonen, servicegegevens of ingebedde actiereeksen. Scripts moeten zonder verplichte invoervelden kunnen starten: definieer benodigde waarden in het script of geef daar standaardwaarden.

Elke actie gebruikt `placement: auto` of `placement: more`. Automatische acties gebruiken de eerste drie beschikbare rechtstreekse plaatsen en schuiven daarna naar **Meer**. `more` blijft altijd in dat menu, ongeacht de plaats in de lijst. De limiet van drie is vast en geen extra instelling. Meer ontbreekt zonder acties; **Velair openen** is het vaste laatste menu-item en laat het menu op zichzelf niet verschijnen. Scripts blijven bij externe zones beschikbaar als zelfstandige Home Assistant-acties; Velair-acties behouden hun normale beperkingen voor regeling en beschikbaarheid.

De dunne bovenlijn geeft bedrijfstoestand aan, geen voortgang. Verwarmen en voorverwarmen hebben een warm accent, koelen een koel accent; drogen en ventileren blijven rustig. Inactief is een gedempte versie van de actieve modus, uit neutraal en niet beschikbaar een onderbroken foutweergave. Beweging is alleen een kort overgangssignaal en wordt bij beperkte beweging uitgeschakeld. HVAC-modus `off` heeft voorrang op een verouderde `idle`-actie: de kaart toont **Uit** met aan/uit-icoon. Inactief met een gekozen actieve modus gebruikt een neutraal thermostaaticoon en lijkt niet op een Velair-pauze.

Zonekaarten kunnen zichtbare thermostaten beperken. Dit is alleen een dashboardfilter en verandert opgeslagen schema's of planning niet. Algemene kaarten zoals `overview-status` en `active-setup` tonen geen thermostaat- of weekdagkeuze, omdat ze niet bij één thermostaat of schema-editor horen.

Voeg `view: active-setup` afzonderlijk van de plannerstatuskaart toe. Kies via editor of `active_setup_controls` of de actieve configuratie `modes`, `profiles` of `both` kan wijzigen:

```yaml
type: custom:velair-card
view: active-setup
active_setup_controls: profiles
```

Standaard is `both`; elke variant toont nog steeds huidige modus en toegepaste profielen. Alleen-profielen behoudt een actie voor standaardplanningen. Rechtstreeks een profiel kiezen vervangt alle actieve profielen en zet de modus op Handmatig. Zones buiten het nieuwe profiel vallen terug op hun standaardplanningen, zonder de vorige modusconfiguratie vast te houden. Gebruik een modus om meerdere niet-overlappende profielen samen te activeren.

```yaml
type: custom:velair-card
view: preconditioning
entities:
  - climate.living_room
  - climate.bedroom
zone_order:
  - climate.bedroom
  - climate.living_room
```

Zonder `entities` tonen zonekaarten elke beheerde thermostaat. Bij `view: sensors` kan de editor schakelaar, kamersensorkeuze, dode zone, maximale correctie, vernieuwingsvertraging of actuele status verbergen voor een kleinere of alleen-lezen kaart.

Bij `view: comfort` kan de editor thermostaten selecteren en configuratie, temperatuur-, vochtigheids- en CO2-grafieken onafhankelijk verbergen. Dit zijn alleen dashboardkeuzes; comfortinstellingen, sensoren, drempels, gebeurtenissen en gegenereerde entiteiten veranderen niet.

```yaml
type: custom:velair-card
view: comfort
entities:
  - climate.living_room
show_comfort_configuration: false
show_comfort_temperature: true
show_comfort_humidity: false
show_comfort_co2: true
```

<a id="create-a-daily-schedule"></a>
## Een dagschema maken

Als je **Schema's** opent, selecteert Velair de huidige lokale weekdag. Daarna blijft je keuze bewaard wanneer je van thermostaat, standaard- naar profielplanning of bijgewerkte backendgegevens wisselt.

1. Selecteer de klimaatentiteit.
2. Selecteer de weekdag.
3. Kies **Eigen schema** voor onafhankelijke blokken of een sjabloon met **Alleen tijden** of **Tijden en instellingen**. Ga voor onafhankelijke blokken hieronder verder.
4. Voeg een blok toe.
5. Kies de starttijd.
6. Kies een HVAC-modus of behoud `Huidige modus behouden`.
7. Vul een doeltemperatuur of bereik in, of kies apparaatopties zonder doeltemperatuur.
8. Sla op.

Onder Aanvullende instellingen kan een **Velair-preset** de apparaatconfiguratie leveren terwijl de tijd onafhankelijk blijft. Gekoppelde dagen volgen de gekozen reikwijdte. Lees [de volledige regels](linked-schedules.nl.md) en [praktische huishoudvoorbeelden](linked-schedule-examples.nl.md) voordat je tussen kopiëren en koppelen kiest.

Na selectie van een expliciete HVAC-modus anders dan uit kun je de compacte thermometerknop in de doeltemperatuurcel gebruiken om temperatuurinvoer uit te schakelen. Het grijze veld toont dan een streep; het blok roept alleen `climate.set_hvac_mode` aan, zonder enkele temperatuur of bereik. Dit is handig voor bijvoorbeeld `auto`, waarbij het apparaat zijn eigen programma kan hervatten, maar beschikbaar voor elke gepubliceerde modus anders dan uit. Dezelfde knop schakelt invoer weer in en herstelt het eerdere conceptdoel, dat geldig moet zijn vóór opslaan. Bestaande blokken behouden hun doelgedrag.

Modusblokken zonder temperatuur voeren geen voorbereiding of Room Assist uit: er is geen doel om te bereiken of corrigeren. Optionele apparaatinstellingen zijn ook niet beschikbaar, zodat de opgeslagen actie één ondubbelzinnige moduswijziging blijft. Externe providers moeten expliciet ondersteuning voor deze actie aangeven; Velair zet haar nooit om in een temperatuurblok.

Kies om een preset of andere optie zonder temperatuur te plannen de optie in de aanvullende bediening en schakel het doelveld uit. Je kunt preset, ventilator, oscillatie, horizontale oscillatie en doelluchtvochtigheid combineren. Het blok roept alleen de bijbehorende Home Assistant-services aan, zonder `climate.set_temperature`, HVAC-moduswijziging of inschakeling van een uitgeschakeld apparaat. Minstens één ondersteunde optie is vereist. Rechtstreekse optiewijzigingen tussen geplande gebeurtenissen worden niet onmiddellijk hersteld. Ook deze blokken voeren geen voorbereiding of Room Assist uit. Meerdere opties worden in afzonderlijke opeenvolgende aanroepen verstuurd. Als een latere aanroep mislukt, kunnen eerdere opties al veranderd zijn; Velair meldt de mislukte uitvoering.

Bij toepassing op een ander apparaat behoudt Velair ondersteunde opties. Blijft bij een optieblok niets over, dan wordt het doelschema afgewezen in plaats van een lege actie op te slaan. De editor gebruikt de mogelijkheden van de geselecteerde klimaatentiteit: niet-ondersteunde modi ontbreken en temperaturen blijven binnen haar grenzen.

In een temperatuurblok verstuurt `Huidige modus behouden` doeltemperatuur en opties zonder moduswijziging zolang het apparaat aanstaat. Staat het uit, dan start Velair de eerste ondersteunde modus die bij het doel past. Een dergelijk blok kan worden opgeslagen als minstens één compatibele modus anders dan uit beschikbaar is. Dat garandeert niet dat de actieve modus bij uitvoering compatibel is. Kan die modus het doel niet accepteren, dan mislukt de uitvoering zonder andere modus te kiezen.

Sommige integraties publiceren hun ondersteuning voor één doeltemperatuur pas na het starten van een modus. Velair start dan de compatibele modus vóór de temperatuur en laat de Home Assistant-service een apparaatspecifieke fout melden. Oorspronkelijke bereiken vereisen nog steeds expliciete bereikondersteuning; één temperatuur wordt nooit een bereik of andersom.

De editor houdt gekozen opties zichtbaar in een compacte regel. Open bij zo'n blok de optiebediening om te zien wat wordt verstuurd: doeltemperatuur indien aanwezig, verwerking van HVAC-modus en opties. De uitleg verduidelijkt ook dat één temperatuur niet naar een bereik wordt omgezet. Dit werkt in schema's, profielen en sjablonen. De editor waarschuwt zonder opslaan te blokkeren als een eerder blok van die dag een mogelijk ongeschikte modus kiest. Als geen eerdere expliciete modus of uitschakeling de modus bepaalt, gebruikt de hint de huidige apparaatmodus. Die kan vóór uitvoering veranderen; de waarschuwing is daarom voorwaardelijk.

Temperatuurblokken bevatten één doeltemperatuur of een volledig onder-/bovenbereik. De editor gebruikt gepubliceerde mogelijkheden en maakt nieuwe `heat_cool`-blokken standaard als bereik wanneer ondersteund, bijvoorbeeld `20–24 °C`. Velair verzint geen bereik uit één temperatuur en weigert onvolledige, omgekeerde of onverenigbare doelen vóór verzending. In deze eerste fase zijn oorspronkelijke bereiken beperkt tot `heat_cool`; Velair neemt niet aan dat `auto` hetzelfde model gebruikt.

Als het apparaat extra bediening aanbiedt, toont de editor deze, bijvoorbeeld ventilatorstand, apparaatpreset, oscillatie, horizontale oscillatie of vochtigheid bij airconditioning. Alleen ondersteunde opties worden opgeslagen en verstuurd. Bij **Uit** worden temperatuurvelden niet gebruikt, omdat het blok de klimaatentiteit uitschakelt.

<a id="timeline-editing"></a>
## De tijdlijn bewerken

De tijdlijn toont de gekozen dag over 24 uur.

- Versleep een blok om de starttijd te wijzigen.
- Versleep een blokrand om de periode tussen aangrenzende blokken te veranderen.
- Gebruik de blokkenlijst voor exacte tijden, modi en temperaturen.

<a id="preconditioning"></a>
## Voorconditionering

Zie [Geplande terugkeer](planned-return.nl.md) voor aanwezigheidsgestuurde afwezigheid met wekelijkse of eenmalige aankomst. Stel de routine in onder Geplande terugkeer binnen Voorconditionering; gebruik actuele status voor bronnen en eenmalige aankomstwijzigingen zonder de week aan te passen. **Plan return** kan met een eenmalige tijd op bevestigd vertrek wachten terwijl de wekelijkse routine uitstaat. Zonder opgeslagen bronnen activeert expliciet starten Afwezig meteen; normale voorbereiding en aankomst blijven werken.

Voorconditionering laat Velair een gepland comfortdoel voor één zone vóór de zichtbare bloktijd starten. Met deze functie ingeschakeld betekent de bloktijd het gewenste comforttijdstip. Velair kan eerder starten met een adaptieve voorspelling en houdt de oorspronkelijke tijd zichtbaar bij komende gebeurtenissen. Herberekent het terwijl het al binnen de voorbereidingsperiode zit, dan wordt het doel onmiddellijk toegepast als verwarmen of koelen nog nodig is.

Voorconditionering toont zones in de volgorde uit Instellingen. Per zone kun je:

- voorbereiding in- of uitschakelen;
- maximale voorsprong instellen, tot 1440 minuten;
- modelparameters en minimumtemperatuurverschil instellen;
- verwarmings- en koelleren afzonderlijk bekijken;
- afstelparameters herstellen zonder leergegevens te wissen;
- één leerrichting herstellen zonder de andere te beïnvloeden.

Configuratie is gegroepeerd in timing en grenzen, leermodel, geschiedenis en optionele buitencontext. Zonder buitencontext is de sensorkeuze uitgeschakeld. Onbeschikbare apparaten kunnen voorbereiding niet inschakelen; de reden wordt getoond. Elke afsteloptie heeft compacte contexthulp. Beweeg over, focus op of tik het informatie-icoon voor het effect van verhogen, verlagen of inschakelen.

De voorspelling is adaptief en gebruikt het huidige temperatuurverschil, eerst met een lokaal beginmodel en later met vergelijkbare lokale geschiedenis zodra voldoende volledige waarnemingen bestaan. Historische voorspellingen leren thermische respons per graad: kleine eerdere veranderingen kunnen naar grotere verschillen opschalen en grote veranderingen naar kleinere afschalen. Recentere en meer vergelijkbare waarnemingen wegen zwaarder.

Velair start **Uit**-blokken niet vroeg. Is de temperatuur al dichtbij genoeg, dan blijft de normale bloktijd gelden. Bij oorspronkelijke `heat_cool`-bereiken gebruikt het de ondergrens voor verwarmen en bovengrens voor koelen. Het volledige bereik wordt vervroegd toegepast; de leerwaarneming onthoudt welke grens de sessie bepaalde. Zie [Adaptieve voorconditionering](adaptive-preconditioning.nl.md) voor instellen, verwarmen, koelen, buitenmeting, automatiseringen en Lovelace.

Vóór een vroege start luistert Velair naar relevante temperatuurwijzigingen op beheerde apparaten met voorbereiding ingeschakeld. Standaard gebruikt het `current_temperature`. Met Ondersteuning via kamersensor ingeschakeld wordt de gekozen kamersensor de effectieve temperatuur voor beslissingen en leren. Een relevante wijziging wordt vertraagd samengevoegd en de volgende planneractie lokaal herberekend. Open panelen groeperen relevante binnen- en ingestelde buitenwijzigingen ook in één vernieuwing, zonder voortdurend te peilen. Verandert de vervroegde start voor dezelfde zichtbare gebeurtenis, dan licht de rij kort op, zonder dialoogvenster of algemene melding.

<a id="room-assist"></a>
## Room Assist

Room Assist toont beheerde apparaten in de volgorde uit Instellingen en biedt per apparaat **Ondersteuning via kamersensor**. Een kamersensor is nuttig bij radiatorknoppen of thermostaten waarvan de ingebouwde sensor te dicht bij radiator, luchtuitlaat of andere warmtebron zit. Alleen een sensor kiezen verandert de regeling niet. Pas na inschakeling wordt hij de effectieve kamertemperatuur, omdat Velair dan ook de apparaatdoeltemperatuur corrigeert zodat het apparaat naar de externe meting blijft verwarmen of koelen. Zie [Room Assist](room-assist.nl.md) voor verwarmings-, koel-, automatiserings- en Lovelace-voorbeelden.

Dit is een geavanceerde optie met een vereiste kamersensor, maar zonder vereiste adaptieve voorbereiding. Bij een vast `heat`- of `cool`-blok met dode zone groter dan nul gebruikt Velair onder- en bovengrens als schakelgrenzen. Eén uitvoeringsfase blijft gelden tot de externe sensor de tegenovergestelde grens bereikt; dan keert ze om. Vaste verwarming begint veilig richting ondergrens, vaste koeling richting bovengrens. **Maximale correctie** begrenst de correctie met teken vanaf de actieve grens.

Een dode zone van `0` behoudt de eerdere correctie rond het middendoel. Enkele doelen in `auto` en `heat_cool` houden neutraal gedrag; oorspronkelijke `heat_cool`-bereiken behouden hun stabiele vasthoudband. Velair dwingt een automatisch apparaat dus niet actief tussen verwarmen en koelen te wisselen.

De dode zone is standaard `0.3 °C` of `1 °F`, instelbaar in stappen van `0.1` graad van `0` tot `5 °C` of `9 °F`, en geldt meteen na opslaan. Maximale correctie is standaard `2 °C` of `4 °F`, instelbaar per `0.1` graad tot `10 °C` of `18 °F`. Het zichtbare schemadoel blijft intact; stapuitlijning, geplande bescherming en fysieke grenzen blijven gelden. De fase bestaat alleen tijdens uitvoering en begint opnieuw na een blok-, doel- of moduswijziging, het wissen van Room Assist of herladen van de integratie. Velair beïnvloedt via de doeltemperatuur en kan apparaathysterese, compressorbeveiliging of minimale draaitijd niet omzeilen. Gebruik **Uit** als expliciet uitschakelen nodig is.

Velair volgt de Home Assistant-temperatuureenheid, zonder aparte Celsius-/Fahrenheitkeuze. Instellingen toont die alleen-lezen; verander haar in Home Assistant. Nieuwe schema's, ingebouwde sjablonen, comfortgrenzen, Room Assist-limieten en voorbereidingsstandaarden zijn fysiek gelijkwaardig. Externe temperatuursensoren worden vóór vergelijking omgerekend.

Thermische waarden worden onbewerkt opgeslagen in de vastgelegde eenheid. Bij een Home Assistant-eenheidswijziging stopt Velair planning en thermisch schrijven, maakt een blijvende melding en biedt één expliciete migratie in Instellingen naar de nieuwe eenheid. Ga alleen verder als alle opgeslagen waarden nog de getoonde broneenheid gebruiken; al omgerekende waarden zouden verkeerd worden geconverteerd. Schema's, sjablonen, actieve en eerdere tijdelijke doelen, comfortlimieten, Room Assist-waarden, voorbereidingsinstellingen, snelheden en leerwaarnemingen worden atomair gemigreerd.

De eenmalige upgrade van gepubliceerde gegevens die alleen Celsius ondersteunden is anders. Gebruikt Home Assistant al Fahrenheit, dan neemt Velair zonder vraag aan dat oude gegevens Celsius zijn, houdt planning gestopt en verwijst naar **Velair resetten**. Reset wist de oude configuratie en maakt atomair nieuwe Fahrenheit-standaarden. Latere eenheidswijzigingen gebruiken daarna de volledige expliciete conversie met gegevensbehoud.

Huidige draagbare exports in model v16 behouden onbewerkte waarden en vermelden hun eenheid. Oudere Velair-versies kunnen v16 niet importeren; gebruik een ondersteunende versie. Eerdere ondersteunde bestanden, waaronder v4, v5, v8 en v9, blijven importeerbaar. Bij verschil met Home Assistant worden gekozen thermische gegevens omgerekend. Oudere bestanden zonder eenheid gelden als Celsius, omdat alle gepubliceerde versies die ze maakten Celsius opsloegen. Export blijft beschikbaar tijdens een eenheidsstop, zodat je vóór reset een referentie bewaart en daarna importeert.

Was een apparaat tijdens migratie of import niet beschikbaar, dan controleert Velair later grenzen en effectieve temperatuurstap. Een actuele geldige `target_temp_step` heeft voorrang op de laatst gemelde stap en handmatige zoneterugval. Het paneel waarschuwt bij onverenigbare opgeslagen doelen, zodat je vóór gebruik kunt corrigeren. Zie [Temperatuureenheden en migratie](temperature-units.nl.md) voor volledige upgrade-, migratie-, back-up- en herstelregels.

Met kamersensorondersteuning en een actief temperatuurblok toont Room Assist een compacte actuele schaal. Voor één doel markeert deze gepland doel, kamersensor, apparaatdoel en apparaatmeting. Een neutraal gestreepte band markeert de dode-zonegrenzen. Bij vast `heat` of `cool` vermeldt status beweging naar onder- of bovengrens; bij automatische enkele doelen is de band een neutrale marge.

Bij een oorspronkelijk bereik loopt de band van geplande ondergrens minus marge tot bovengrens plus marge. Aparte haken tonen volledige geplande en toegepaste bereiken, met één verbinding tussen hun middelpunten voor de verplaatsing met teken. Kamer- en apparaatmetingen blijven afzonderlijke markeringen. De volledige vertaalde legenda blijft rond de dode zone gecentreerd, ook als die smaller is dan het label. Nul verwijdert de band en wordt expliciet vermeld. `show_room_assist_deadband` verbergen verbergt instelling, band en legenda samen.

Deze waarden komen uit Home Assistant en actuele Velair-toestand, zonder nieuwe opgeslagen geschiedenis. Zonder actief temperatuurblok verschijnt een wachttoestand in plaats van voorbeeldwaarden. Met een gekozen sensor maar uitgeschakelde ondersteuning staat vermeld dat de sensor opgeslagen maar niet operationeel is.

Room Assist reageert op gebeurtenissen en peilt temperaturen niet. Het luistert alleen naar gekozen sensor en klimaatentiteit zolang ondersteuning actief is, voegt wijzigingen samen via **Vernieuwingsvertraging**, lijnt tijdelijke doelen uit op actuele, laatst gemelde of ingestelde stap, negeert beweging kleiner dan die stap en herstelt het echte geplande doel bij algemene of zonepauze, tijdelijke aanpassing, uitschakelblok, onbruikbare sensor of uitgeschakelde functie. Het wissen van de uitvoeringstoestand wist ook de vaste hysterese. Heeft voorbereiding al een toekomstig blok gestart, dan volgt Room Assist dat doel tot comforttijd in plaats van terug te vallen op het vorige blok.

Bij uitgeschakelde voorbereiding registreert Velair daarvoor geen temperatuurluisteraars of herberekeningen, start geen leersessies en slaat geen nieuwe waarnemingen op. Eerdere leergegevens blijven bewaard voor later hergebruik.

Velair houdt een compacte lokale leergeschiedenis van voorbereidingspogingen bij. Een vroege comfortstart opent een sessie; het bereiken van de doeldrempel of comforttijd slaat een waarneming op. Onderbreking door tijdelijke aanpassing, pauze, stop of schemawijziging verwerpt de sessie. De tab toont per apparaat afzonderlijk verwarmen en koelen; niet-ondersteunde richtingen zijn onbeschikbaar. Met voldoende volledige waarnemingen gebruikt Velair vergelijkbare geschiedenis in plaats van het beginmodel.

Elke ondersteunde richting heeft een compacte kaart met leerbereidheid, actieve modelbron en aantallen volledige, gedeeltelijke en ongeldige waarnemingen. Per richting kun je leren vanaf nul herstellen, met behoud van schema's, instellingen en andere richting. De afzonderlijke herstelactie per apparaat herstelt alleen afstelparameters en behoudt inschakeltoestand, kamersensorinstellingen en alle verwarmings- en koelwaarnemingen.

Gedeeltelijke waarnemingen worden geen verzonnen voltooiingstijden. Ze geven een ondergrens: de benodigde tijd was langer dan de tijd die voor de poging beschikbaar was. Bewijzen genoeg latere volledige waarnemingen dat minder voorsprong werkt, dan verhogen oudere gedeeltelijke waarnemingen de voorspelling niet meer. Zo blijft leren voorzichtig zonder hoge voorsprong blijvend te maken. Aparte verwarmings- en koelgeschiedenissen voorkomen dat seizoensgebruik de andere richting verdringt.

Alle berekeningen en instellingen blijven lokaal in Home Assistant; klimaatgeschiedenis en schema's gaan niet naar externe diensten. Technische uitleg over leerstatus, API en voorspelregels staat in [Adaptive preconditioning internals](../developer/adaptive-preconditioning.md).

<a id="environmental-comfort"></a>
## Omgevingscomfort

Comfort toont zones in de volgorde uit Instellingen en kan kamertemperatuur, luchtvochtigheid en CO2 bewaken. Optioneel toont het dauwpunt, absolute luchtvochtigheid en Humidex, lokaal berekend uit effectieve temperatuur en vochtigheid of geleverd door een bestaande Home Assistant-sensor.

Comfort bewaakt alleen: het verandert geen schemablokken, doelen, ventilatorstanden, presets of pauzes. Het beschrijft de ruimte met begrijpelijke toestanden zoals `Koud en vochtig`, houdt CO2-luchtkwaliteit apart, meldt of gegevens volledig zijn en publiceert gebeurtenissen als de beoordeling verandert.

Temperatuur kan een eigen comfortsensor, de ingestelde Room Assist-sensor of `current_temperature` gebruiken. Vochtigheid kan een eigen sensor of beschikbare `current_humidity` gebruiken. CO2 wordt alleen met een geselecteerde sensor beoordeeld.

Het standaardmodel **Eenvoudige bereiken** heeft één rechthoekig temperatuur-/vochtigheidsgebied. Het begeleide model zet één vochtigheidsreferentie in het midden om naar een temperatuurafhankelijke psychrometrische curve. Het aangepaste temperatuurafhankelijke model laat vochtigheidsgrenzen bij koudere en warmere uiteinden verschillen; Velair interpoleert het effectieve bereik en toont een schuin doelgebied zonder universeel comfort te claimen. Bestaande zones behouden het eenvoudige model tot expliciete wijziging.

Extra metingen staan standaard uit en blijven informatie: ze veranderen beoordeling of regeling niet. Bij uitgeschakeld Comfort registreert Velair geen comfortluisteraars voor de zone; ingeschakeld luistert het alleen naar relevante gekozen sensoren en apparaat. Er zijn geen voortdurende peilingen.

Comfort kan ook met expliciete buitentemperatuur- en optionele vochtigheidssensoren vergelijken. **Indoor vs outdoor** toont temperatuurverschil, absolute luchtvochtigheid binnen/buiten en de relatieve vochtigheid die buitenlucht op binnentemperatuur zou hebben. Als de backend een nuttige richting of conflict vindt, verschijnt één voorzichtig ventilatieadvies, nooit een opdracht. Configuratie zit in het ingeklapte instelpaneel; uitschakelen behoudt sensor-ID's. Met **Ventilation guidance** per zone kun je grotere of kleinere temperatuur-, verwachte vochtigheids- en luchtvochtverschillen vereisen; de oorspronkelijke voorzichtige marges blijven standaard. Zie [Omgevingscomfort](comfort.nl.md) voor inrichting, verwarmen, koelen, CO2, automatiseringen en privacy.

<a id="templates"></a>
## Sjablonen

Sjablonen zijn herbruikbare dagverzamelingen van blokken met handmatige instellingen of gedeelde Velair-presets. Het tabblad bevat ook de bibliotheek **Klimaatpresets**: een Velair-preset deelt apparaatinstellingen zonder bloktijden.

In Sjablonen kun je een sjabloon maken, hernoemen, blokken bewerken, toepassen op apparaten en weekdagen en verwijderen wanneer geen dagen gekoppeld zijn. In Schema's koppel je een sjabloon als dagbron met alleen tijden of volledige configuratie. Kopiëren blijft een afzonderlijke handeling. Je kunt ook de huidige dag als nieuw sjabloon opslaan.

Bij kopiëren of koppelen valideert Velair HVAC-modi, doeltypen, temperatuurgrenzen en providerbeperkingen. Doelen buiten grenzen en ongeschikte modi worden afgewezen. Handmatige instellingen worden aan ondersteunde stappen aangepast; gedeelde presetwaarden per bestemming zonder de bibliotheek te wijzigen. Niet-ondersteunde opties worden verwijderd zolang een geldige actie overblijft.

Blokken kopiëren maakt tijden onafhankelijk, maar behoudt actieve presetverwijzingen. **Alleen tijden** deelt tijden met onafhankelijke apparaatinstellingen; **Tijden en instellingen** deelt alles met alleen-lezen bediening op de bestemming. Sjabloonwijzigingen valideren elke gekoppelde dag, ook in niet-actieve profielen. Bewerken behoudt de bibliotheekpositie. Zie [Blokpresets en gekoppelde sjablonen](linked-schedules.nl.md) voor alle regels en [Praktische voorbeelden](linked-schedule-examples.nl.md) voor inrichting, nieuwe blokken, koppelconversies, gebruiksaantallen en problemen.

Sjablonen kunnen alle opties bevatten die in de beheerde apparaten beschikbaar zijn, voor gemengde installaties. Bij toepassing behoudt Velair alleen ondersteunde opties: `fan_mode: quiet` voor een airco verdwijnt bijvoorbeeld bij een radiatorknop zonder ventilatorstanden.

<a id="climate-profiles"></a>
## Klimaatprofielen

Profielen schakelen meerdere zones tussen gecoördineerde weekschema's zonder standaardplanningen te overschrijven. Een profiel kan een zone een alternatieve week geven, pauzeren, pauzeren en uitschakelen of op het standaardschema laten. Weggelaten zones volgen hun standaardplanningen.

Een modus kan meerdere profielen tegelijk activeren als hun zones niet overlappen. Rechtstreekse activering vervangt de actieve combinatie door één profiel en selecteert Handmatig. Zones die het nieuwe profiel niet meer dekt, keren terug naar standaard. Activering past huidige blokken toe, ook van een eerdere dag, en annuleert tijdelijke aanpassingen in betrokken zones. Algemene en zonepauzes houden voorrang.

**Schema's** is de volledige planningswerkruimte. Kies **Standaardplanningen** voor de normale week of **Profielplanningen** om een profiel te maken en per thermostaat **Standaardplanning**, **Profielplanning** of **Pauzeren** te kiezen. Beide bronnen hebben dezelfde tijdlijn, opties, sjablonen en kloneerhulpmiddelen. Opslaan verschilt bewust: een standaarddag wordt rechtstreeks opgeslagen; profielmetadata en thermostaatgedrag atomair als één profiel. Een profiel kan nog rechtstreeks vanuit zijn rij worden geactiveerd. **Modi** combineert profielen tot herbruikbare configuraties zonder de schema-editor te herhalen.

Terwijl Velair zones verwerkt, toont een algemene voortgangsbalk over tabbladen heen huidige zone, aantal verwerkte zones en uiteindelijke geslaagde of gedeeltelijk mislukte uitkomst. In Lovelace staat deze alleen in de kaart voor actieve configuratie, waar activering gebeurt. Verwerkt betekent dat Home Assistant en Velair de zone hebben afgehandeld, ook als een pauze of tijdelijke aanpassing geen apparaatopdracht vraagt. Het betekent niet dat de kamer haar doel bereikt heeft. Succes verdwijnt na een korte bevestiging; gedeeltelijke en mislukte uitkomsten blijven tot je ze sluit.

Automatiseringen kunnen één profiel activeren via `velair.activate_profile` of een instelbare waarde kiezen uit `select.velair_mode`. Zie [Klimaatprofielen](climate-profiles.nl.md) voor inrichting, automatiseringen, herstart, interacties en overdraagbaarheid.

<a id="external-schedule-execution"></a>
## Externe schema-uitvoering

Normaal slaat Velair het weekschema op en voert het uit via `climate.*`. Detecteert **Instellingen → Externe systemen** een compatibele regelaar, dan kan een geschikte zone uitvoering daaraan overlaten. Velair publiceert de volledige effectieve week uit standaard, profiel of modus. Er moet eerst een effectief schema met minstens één temperatuurblok opgeslagen zijn; anders blijft lokale uitvoering actief met uitleg in Instellingen.

Een externe zone blijft beperkt tot schema's. Velair stuurt geen directe opdrachten voor tijdelijke aanpassingen, pauze/hervatten, handmatige aanpassing, Room Assist of adaptieve voorbereiding. Profielgedrag **Pauzeren** ontbreekt; **Standaardplanning** en **Profielplanning** kiezen de te publiceren week. Beperkingen verschijnen eenmaal per gebruikt systeem in Instellingen en gelden ook in compatibele standaard- en profielplanningen. Vereist een regelaar een impliciet continuïteitspunt om middernacht, dan telt de editor dit mee in zichtbaar dagelijks schakelpuntgebruik.

Overzicht toont alleen **Bezig met publiceren**, **Geaccepteerd** of **Mislukt** na een poging in de huidige Home Assistant-uitvoering. Gepubliceerd betekent dat de externe integratie de serviceaanroep accepteerde, niet dat de fysieke regelaar het schema heeft toegepast. De zone behoudt normale schema-activiteit en komende gebeurtenis; een compact extern signaal toont regelaar en publicatiestatus. Velair peilt niet, leest niet terug en probeert niet automatisch opnieuw. Zie [Externe schema-uitvoering](external-systems.nl.md) voor systemen, grenzen, overdracht en validatiestatus.

<a id="clone-schedules"></a>
## Schema's klonen

Onder de editor kun je de huidige dag klonen naar andere dagen van hetzelfde apparaat of dezelfde weekdag van andere apparaten. **Ma–Vr**, **Weekend**, **Alle dagen** en **Selectie wissen** kiezen snel doelen, naast afzonderlijke weekdagen. Ze veranderen alleen de selectie; **Kopiëren** blijft expliciet en de brondag wordt nooit meegenomen.

Klonen slaat indien nodig wijzigingen eerst op. Het kopieert bronconfiguratie met sjabloon, koppeltype, instellingen bij alleen-tijden en presetverwijzingen. Een onafhankelijke dag klonen verwijdert de koppeling voor die bestemmingsdag; overige dagen blijven intact. Een ongeschikte bestemming weigert de hele handeling zonder een gekozen bestemming te wijzigen. Gebruik **Ontkoppelen** als een nieuwe dag het sjabloon niet langer moet volgen.

<a id="pause-stop-and-resume"></a>
## Pauzeren, stoppen en hervatten

Algemene bediening:

- **Pauzeren** onderbreekt uitvoering voor een aantal minuten.
- **Stoppen** onderbreekt onbeperkt.
- **Hervatten** brengt de planner terug naar automatisch.

Bij tijdelijke pauze toont Overzicht resterende tijd en voortgang. Pauze- en aanpassingsduur zijn in minuten. De Home Assistant-service-interface accepteert maximaal 10 080 minuten, oftewel zeven dagen.

Zonepauzes via services en automatiseringen betreffen één beheerde entiteit; overige zones volgen hun schema's. Bij hervatten past Velair alleen een momenteel actief blok toe; zonder actief blok blijft het apparaat ongewijzigd.

<a id="boost"></a>
## Tijdelijke aanpassing

Een tijdelijke aanpassing overschrijft het schema van één zone; andere zones gaan normaal door. Bij starten legt Velair herstelbare toestand vast, met HVAC-modus en enkele temperatuur of volledig bereik indien Home Assistant die aanbiedt. Deze momentopname bepaalt alleen het gedrag bij einde.

De functie is beschikbaar via services, scripts, automatiseringen en dashboards, zodat de schema-editor overzichtelijk blijft. Je kunt bijvoorbeeld via een knop, beweging of spraak een kamer tijdelijk aanpassen, eventueel met gewenste HVAC-modus.

Bij verlopen bepaalt Velair de uitkomst in deze volgorde:

1. Een actief blok met expliciete HVAC-modus past zijn geplande doel toe.
2. Een actief uitschakelblok schakelt uit.
3. Zonder actief blok herstelt Velair de toestand van vóór de aanpassing.
4. Ook bij `Huidige modus behouden` herstelt het die eerdere toestand, omdat dat blok geen nieuwe HVAC-modus voor na de tijdelijke aanpassing bepaalt.

Velair verzint zo geen verwarmings- of koeldoel als het schema er geen expliciet vastlegt.

<a id="startup-behavior"></a>
## Gedrag bij opstarten

Standaard herstelt Velair na Home Assistant-start de opgeslagen plannerstatus, zonder apparaten naar schemadoelen te dwingen. Schakel in Instellingen **Actief schema toepassen na opstarten** in om huidige actieve blokken na opstarten toe te passen, mits automatische planning actief is. Een blok van een eerdere dag blijft actief tot het volgende weekblok. Actieve tijdelijke aanpassingen worden gerespecteerd.

<a id="automation-blueprints"></a>
## Automatiseringsblueprints

Optionele Home Assistant-blueprints uit de documentatie kunnen:

- gekozen thuis-/afwezig-acties uitvoeren via één samengestelde aanwezigheidsentiteit;
- zones pauzeren zolang een gekozen raam of deur open is;
- seizoensmodi of andere acties kiezen na stabiel gebleven temperatuurwijziging, met onmiddellijke meldingen bij ongeldige metingen.

Ze gebruiken toestandsgebeurtenissen en instelbare vertraging, geen peilingen. De aanwezigheidsblueprint kan blijvende onbeschikbaarheid van groep, sjabloonsensor of helper melden zonder thuis- of afwezig-acties. De raamblueprint identificeert haar pauze, zodat sluiten geen handmatige of andere automatiseringspauze verwijdert. Bij onbekend of onbeschikbaar contact toont Home Assistant één vertraagde diagnostische melding voor de thermostaatgroep en verwijdert die na herstel; het contact blijft hervatten blokkeren. Zie [Automatiseringsblueprints](blueprints.nl.md) voor inrichting, voorbeelden, opstartgedrag en één-automatisering-per-zone voor raamcontacten.

De [seizoensblueprint](blueprints/seasonal-climate-selection.nl.md) wacht standaard 30 minuten na iedere temperatuurwijziging. Voortdurend veranderende metingen kunnen acties onbeperkt uitstellen. Opstarten controleert alleen diagnostiek. Kies modi in de normale Home Assistant-actie-editor. Configureer een echte pauze-en-uit-modus als mild weer klimaatregeling moet stoppen; lege acties laten de huidige werking intact.

<a id="portability"></a>
## Overdraagbaarheid

Instellingen kan een JSON-bestand met versie exporteren en importeren. Het kan thermostaatschema's, sjablonen, gedeelde blokpresets, paneelinstellingen, leergegevens voor adaptieve voorconditionering, klimaatprofielen en modussen bevatten.

Model 16 behoudt beide sjabloonkoppeltypes en presetverwijzingen. Schema's of profielen exporteren neemt vereiste sjablonen en presets mee, zichtbaar als extra gekozen secties. Import valideert de gecombineerde configuratie, ook bestaande gebruikers van vervangen gedeelde bronnen. Presets worden op vaste sleutel samengevoegd: overeenkomstige sleutels worden vervangen; lokale presets buiten het bestand blijven. Oude back-ups blijven importeerbaar; oude Velair-versies kunnen model 16 niet importeren. Zie [het back-upvoorbeeld](linked-schedule-examples.nl.md#back-up-the-whole-setup).

Bij import kies je te overschrijven secties. Import vervangt gekozen gegevens; exporteer eerst voor een herstelpunt. Profiel- en modusdefinities zijn overdraagbaar, de actieve selectie niet. Velair behoudt actieve profiel-ID's die nog bestaan en keert pas naar standaard terug als geen meer overblijven.

Elke nieuwe export vermeldt de temperatuureenheid. Vanuit een ander eenhedenstelsel worden gekozen thermische waarden omgerekend naar Home Assistant. Waarden bij beschikbare apparaten volgen hun effectieve stap; zelfstandige waarden gebruiken veilige precisie zonder gemeenschappelijke stap. Handmatige zoneterugval is overdraagbaar, de lokaal waargenomen laatste apparaatstap bewust niet. Oude exports zonder eenheid worden in het importscherm aangekondigd en als Celsius behandeld.

Leerdata wordt op exact klimaatentiteits-ID gekoppeld. Gegevens voor niet-beheerde apparaten worden vóór import getoond en overgeslagen. Bij passende apparaten vervangt import de bestaande kalibratie. Lokale apparaten buiten het bestand blijven intact. Voorbereidingsinstellingen zitten al in **Thermostaatschema's**; de aparte sectie **Leerdata voorconditionering** bevat de opgebouwde lokale kalibratiegeschiedenis.

<a id="maintenance"></a>
## Onderhoud

Instellingen toont frontendbuild, draagbare exportmodelversie, opslag-/modelversie en integratieversie. Reset verwijdert alle opgeslagen Velair-schemagegevens: schema's, sjablonen, paneelvoorkeuren, tijdelijke aanpassingen en pauzes, externe-wijzigingsbeleid en handmatige sessies, comfort- en Room Assist-instellingen, voorbereidingsinstellingen en leren, en opstartgedrag. Daarna ontstaan eenheidsafhankelijke standaarden voor de huidige beheerde apparaten. De afzonderlijke diagnostiekcategorieën en het huidige uitvoeringslogboek vallen buiten deze reset. Velair vraagt bevestiging.

<a id="services"></a>
## Services

Velair biedt services voor automatiseringen en scripts:

- `velair.set_temperature`
- `velair.set_hvac_mode`
- `velair.apply_schedule`
- `velair.boost`
- `velair.cancel_boost`
- `velair.activate_profile`
- `velair.deactivate_profile`
- `velair.enable_room_sensor_assist`
- `velair.disable_room_sensor_assist`
- `velair.pause`
- `velair.pause_zone`
- `velair.resume`
- `velair.resume_zone`
- `velair.set_external_change_policy`
- `velair.enter_manual_adjustment`
- `velair.resume_automatic_control`
- `velair.set_daily_schedule`
- `velair.copy_day_schedule`
- `velair.clear_schedule`
- `velair.update_block_preset`

Services met een entiteitsdoel werken alleen voor apparaten gekozen bij setup. Een niet-beheerde klimaatentiteit wordt vóór elke wijziging afgewezen.

<a id="velairupdate_block_preset"></a>
### `velair.update_block_preset`

Werk een opgeslagen gedeelde preset bij met vaste `preset_key`. Gedeeltelijke updates behouden weggelaten velden; expliciete vervanging kan de actie veranderen. Wijzigingen gelden voor elke verwijzing en gebruiken normale validatie, regelprioriteit en voorbereidingsherberekening. Zie [Presetautomatiseringen](preset-automations.nl.md) voor velden en voorbeelden met buitenmeting, bereiken, opties en uit/herstel. De service verandert een gedeelde definitie, niet welke preset een blok kiest.

<a id="velairactivate_profile"></a>
### `velair.activate_profile`

Activeer één opgeslagen profiel en pas onmiddellijk het huidige effectieve gedrag toe. Dit vervangt de volledige actieve combinatie; ongedekte zones vallen terug op standaard. Gebruik het vaste getoonde profiel-ID, niet de bewerkbare naam. Rechtstreekse activering zet de moduskeuze op `Manual`. Zonder `profile_id` keert de service voor compatibiliteit nog terug naar standaard; nieuwe automatiseringen moeten expliciet `velair.deactivate_profile` gebruiken.

```yaml
action: velair.activate_profile
data:
  profile_id: vacation
```

<a id="velairdeactivate_profile"></a>
### `velair.deactivate_profile`

Deactiveer alle actieve profielen en breng elke zone onmiddellijk terug naar standaard.

```yaml
action: velair.deactivate_profile
```

<a id="velairset_temperature"></a>
### `velair.set_temperature`

Stel één beheerde klimaatentiteit in op één temperatuur of volledig onder-/bovenbereik. `hvac_mode` is optioneel. Dit is een gemakservice voor Velair, geen vervanging voor `climate.set_temperature`:

- alleen beheerde entiteiten worden geaccepteerd;
- doelen worden tegen bekende mogelijkheden en grenzen gevalideerd;
- Velairs modusregels gelden bij expliciete modus of benodigde inschakeling.

Gebruik oorspronkelijke Home Assistant-services voor algemene klimaatbediening en deze service als een automatisering alleen beheerde apparaten mag aansturen. Optioneel zijn `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode` en `humidity`; alleen ondersteunde velden worden toegepast.

```yaml
action: velair.set_temperature
data:
  entity_id: climate.living_room
  temperature: 21
  hvac_mode: heat
  fan_mode: quiet
```

Laat voor een bereik `temperature` weg en geef beide grenzen:

```yaml
action: velair.set_temperature
data:
  entity_id: climate.living_room
  target_temp_low: 20
  target_temp_high: 24
  hvac_mode: heat_cool
```

`temperature` en bereikvelden sluiten elkaar uit; beide grenzen zijn samen vereist.

<a id="velairset_hvac_mode"></a>
### `velair.set_hvac_mode`

Kies een aangeboden modus anders dan uit zonder doeltemperatuur. Alleen lokaal beheerde apparaten zijn toegestaan. Velair valideert de modus en registreert de opdracht als eigen actie, zodat die geen externe aanpassing lijkt.

```yaml
action: velair.set_hvac_mode
data:
  entity_id: climate.living_room
  hvac_mode: auto
```

Gebruik dit om alleen de modus te wijzigen. De aanroep bevat geen temperatuur of bereik; apparaat of integratie kan intern toch zijn toestand aanpassen. Geslaagde uitvoering schakelt actieve Room Assist uit, omdat Velair voor deze opdracht geen temperatuurdoel beheert. Mislukken laat Room Assist intact en veroorzaakt geen succesvolle doelgebeurtenis. Gebruik `climate.set_hvac_mode` voor algemene bediening buiten Velair. `off` wordt bewust geweigerd; gebruik een passende Velair-pauze, schema- of apparaatactie.

<a id="velairapply_schedule"></a>
### `velair.apply_schedule`

Pas het huidige actieve blok onmiddellijk toe. Zonder `entity_id` gebeurt dit voor alle beheerde apparaten.

```yaml
action: velair.apply_schedule
data:
  entity_id: climate.living_room
```

<a id="velairboost"></a>
### `velair.boost`

Pas één apparaat tijdelijk aan. Bij verlopen wordt een actief expliciet schemadoel toegepast of, zonder zo'n doel, de vooraf vastgelegde toestand hersteld.

```yaml
action: velair.boost
data:
  entity_id: climate.living_room
  temperature: 22
  duration_minutes: 45
  hvac_mode: heat
  fan_mode: high
```

Velair legt herstelbare toestand vóór toepassing vast. Is het apparaat niet beschikbaar en kan dit niet veilig, dan wordt starten afgewezen. Een bereik gebruikt `target_temp_low` en `target_temp_high` in plaats van `temperature`, volgens dezelfde regels als `velair.set_temperature`.

<a id="velaircancel_boost"></a>
### `velair.cancel_boost`

Beëindig een actieve tijdelijke aanpassing vroeg. Dit gebruikt hetzelfde herstel als verlopen: een actief expliciet doel of anders, ook bij `Huidige modus behouden`, de vooraf vastgelegde modus en temperatuur. Zonder actieve aanpassing doet de aanroep niets.

```yaml
action: velair.cancel_boost
data:
  entity_id: climate.living_room
```

<a id="velairenable_room_sensor_assist"></a>
### `velair.enable_room_sensor_assist`

Schakel kamersensorondersteuning in voor één beheerd apparaat. Een kamersensor moet al in Room Assist zijn ingesteld.

```yaml
action: velair.enable_room_sensor_assist
data:
  entity_id: climate.living_room
```

<a id="velairdisable_room_sensor_assist"></a>
### `velair.disable_room_sensor_assist`

Schakel ondersteuning uit. Als Velair een gecorrigeerd doel toepaste, herstelt het het huidige geplande doel.

```yaml
action: velair.disable_room_sensor_assist
data:
  entity_id: climate.living_room
```

<a id="velairpause"></a>
### `velair.pause`

Pauzeer automatische uitvoering. Laat `duration_minutes` weg voor onbeperkt stoppen.

```yaml
action: velair.pause
data:
  duration_minutes: 60
```

<a id="velairresume"></a>
### `velair.resume`

Hervat automatische uitvoering en pas het huidige schema toe.

```yaml
action: velair.resume
```

<a id="velairpause_zone"></a>
### `velair.pause_zone`

Pauzeer één beheerde klimaatentiteit terwijl de rest doorgaat. Zonder `duration_minutes` is de pauze onbeperkt. Optioneel `action`:

- `none`: laat het apparaat exact intact en stop alleen automatische Velair-wijzigingen;
- `turn_off`: schakel onmiddellijk uit en houd gepauzeerd.

Automatiseringen kunnen `pause_id` sturen met 1 tot 128 letters, cijfers, punten, underscores, dubbele punten of koppeltekens, beginnend met letter of cijfer. Een geïdentificeerde pauze voegt een reden toe zonder andere ID's te vervangen. Hetzelfde ID werkt alleen die reden bij; identieke herhaling doet niets. Zonder ID blijft handmatige voorrang gelden en worden alle redenen vervangen door één handmatige pauze.

```yaml
action: velair.pause_zone
data:
  entity_id: climate.guest_room
  duration_minutes: 120
  action: turn_off
  pause_id: window_guard
```

<a id="velairresume_zone"></a>
### `velair.resume_zone`

Hervat één zone. Standaard wordt het huidige actieve blok toegepast indien aanwezig; zonder blok blijft het apparaat intact. Met `pause_id` verdwijnt alleen die reden. Andere redenen houden de pauze actief; pas na de laatste wordt het schema toegepast. `resume_all: true` wist expliciet alle redenen. Zonder beide velden blijft het oudere wis-alles-gedrag. De velden kunnen niet samen; `resume_all: false` zonder ID wordt geweigerd.

Redenen verlopen onafhankelijk. Zolang één reden `turn_off` gebruikt, blijft de effectieve actie uit. Tijdelijke aanpassingen worden bij zonepauze geweigerd.

```yaml
action: velair.resume_zone
data:
  entity_id: climate.guest_room
  apply_current_schedule: true
  pause_id: window_guard
```

<a id="velairset_daily_schedule"></a>
### `velair.set_daily_schedule`

Vervang één weekdag van één beheerd apparaat.

```yaml
action: velair.set_daily_schedule
data:
  entity_id: climate.living_room
  weekday: monday
  blocks:
    - start: "06:30"
      action: set_temperature
      temperature: 21
      hvac_mode: heat
      fan_mode: quiet
    - start: "09:00"
      action: turn_off
    - start: "18:00"
      action: set_temperature
      temperature: 20
      hvac_mode: heat
```

Blokken kunnen `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode` en `humidity` bevatten. Niet-ondersteunde waarden worden vóór opslaan of toepassen verwijderd. Gebruik `action: set_climate_options` met minstens één optie, zonder temperatuur of `hvac_mode`, om alleen die services aan te roepen:

```yaml
action: velair.set_daily_schedule
data:
  entity_id: climate.living_room
  weekday: monday
  blocks:
    - start: "06:30"
      action: set_climate_options
      preset_mode: comfort
    - start: "22:00"
      action: set_climate_options
      preset_mode: eco
      fan_mode: quiet
```

<a id="velaircopy_day_schedule"></a>
### `velair.copy_day_schedule`

Kopieer een opgeslagen standaarddag, inclusief koppeling en presetverwijzingen, naar gekozen dagen. Zonder `target_entity_ids` gebeurt dit binnen hetzelfde apparaat; met de lijst naar andere beheerde apparaten. Alle apparaat-/dagcombinaties worden in één transactie gevalideerd en opgeslagen.

```yaml
action: velair.copy_day_schedule
data:
  entity_id: climate.living_room
  source_weekday: monday
  target_weekdays:
    - tuesday
    - wednesday
    - thursday
```

Kopieer dezelfde maandagconfiguratie naar andere thermostaten:

```yaml
action: velair.copy_day_schedule
data:
  entity_id: climate.living_room
  source_weekday: monday
  target_weekdays:
    - monday
  target_entity_ids:
    - climate.study
    - climate.bedroom
```

De service kopieert de laatst opgeslagen bron onder configuratievergrendeling. Optioneel `expected_revision` weigert de operatie als configuratie veranderd is; het paneel geeft zijn revisie automatisch mee. Profielen gebruiken hun eigen volledige-profielworkflow. Een onafhankelijke dag kopiëren verwijdert de koppelingen van gekozen doeldagen; andere dagen blijven behouden.

<a id="velairclear_schedule"></a>
### `velair.clear_schedule`

Wis één weekdag. Laat `weekday` weg om alle dagen van het apparaat te wissen.

```yaml
action: velair.clear_schedule
data:
  entity_id: climate.living_room
  weekday: sunday
```

<a id="automation-events"></a>
## Automatiseringsgebeurtenissen

Velair publiceert Home Assistant-gebeurtenissen voor automatiseringstriggers. Ze zijn tijdelijk, niet als configuratie opgeslagen en vervangen diagnostische entiteiten niet. Alle uitvoeringsgebeurtenissen gebruiken hetzelfde type:

```text
velair_event
```

Het veld `event` identificeert profielcombinatie- en plannerwijzigingen, toegepaste doelen, voorbereidingsplannen en waarnemingen, comfortwijzigingen, Room Assist-toestand en doelen, tijdelijke aanpassingen en zonepauzes. Zie [Automatiseringsgebeurtenissen](automation-events.nl.md) voor exacte publicatieregels, ontdubbeling, velden en een volledig voorbeeld per type.
