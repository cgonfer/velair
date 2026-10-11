<a id="planned-return"></a>
# Geplande terugkeer
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](planned-return.md) · [Español](planned-return.es.md) · [Français](planned-return.fr.md) · [Deutsch](planned-return.de.md) · [Italiano](planned-return.it.md) · [Nederlands](planned-return.nl.md) · [Polski](planned-return.pl.md) · [Português (Brasil)](planned-return.pt-br.md) · [Português (Portugal)](planned-return.pt-pt.md) · [Русский](planned-return.ru.md) · [Vertaalstatus](../translation-status.md)

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

Geplande terugkeer bereidt je huis voor op een vaste of eenmalige aankomsttijd nadat de gekozen bezettingssignalen bevestigen dat het hele huis leeg is, of nadat je expliciet een eenmalige terugkeer start zonder ingestelde bezettingsbronnen. Je stelt dit in Velair in; voor een vaste wekelijkse routine is geen extra blueprint of dagelijkse actie nodig. De automatische routine is standaard uitgeschakeld en werkt lokaal in Home Assistant. Eenmalige terugkeer vereist opgeslagen afwezigheids- en terugkeermodi en werkende automatische planning; bezettingsbronnen zijn optioneel voor expliciete starts. De wekelijkse routine vereist minimaal één bezettingsbron.

<a id="setup"></a>
## Instellen

1. Maak de gewenste afwezigheids- en thuismodi aan, of gebruik Standaard als bestemming. Afwezigheidsprofielen kunnen klimaatapparaten uitschakelen of minder veeleisende weekschema's gebruiken.
2. Open **Voorconditionering**, kies **Geplande terugkeer** in de onderdeelkiezer en voeg bezettingssignalen toe voor bewaakte of wekelijkse vertrekmomenten. Gebruik binaire sensoren, invoerbooleans, groepen of de thuiszone van Home Assistant (`zone.home`). Neem signalen op voor iedereen die thuis kan blijven, ook gasten. Home Assistant blijft verantwoordelijk voor het volgen van personen en locaties; complexe regels kun je in een helper combineren.
3. Kies in het afwezigheidsgedeelte hoe lang het huis leeg moet blijven en welke afwezigheidsmodus wordt geactiveerd. De standaard is tien minuten; de compacte vertragingsinstelling accepteert minuten of uren. Thuiskomst wordt direct herkend.
4. Vul in het aankomstgedeelte voor elke toepasselijke weekdag de gebruikelijke tijd in en kies de bestemmingsmodus. Dagen zonder tijd hebben geen automatische terugkeer. Velair gebruikt het bestemmingsschema dat bij aankomst geldt om elke zone voor te bereiden.
5. Schakel adaptieve voorconditionering in voor zones die eerder moeten starten. Bestaande instellingen en lokale leergegevens voor verwarmen/koelen worden hergebruikt.
6. Schakel de routine in met de knop in de statusbalk en kies daarna Opslaan. De schakelaar wijzigt het concept; Annuleren herstelt de opgeslagen instelling. Stop eventuele thuis-/afwezigheidsautomatiseringen die voor hetzelfde huishouden modi kiezen, anders werken twee regelingen elkaar tegen.

Weekdagen volgen de voorkeur **Eerste dag van de week** uit de Velair-instellingen. Vul per dag rechtstreeks een aankomsttijd in. Als je vertrekt op een dag zonder tijd, activeert Velair na bevestiging van afwezigheid de afwezigheidsmodus, plant het geen vervroegde voorbereiding en herstelt het de bestemming zodra bezetting wordt gedetecteerd. De Home Assistant-tijdzone staat naast de wekelijkse routine. Wijzigingen blijven een concept totdat je opslaat. Annuleren en Opslaan staan rechts onder de configuratie.

De bovenste samenvatting groepeert drie onderdelen van de routine in afzonderlijke omlijnde vakken die bij de instellingenonderdelen passen, zonder omvattende kaart of gedeelde zijlijn. De wekelijkse routine toont afwezigheidsmodus, bevestigingsvertraging, adaptieve voorbereiding en bestemmingsmodus als een eenvoudig verloop; de schakelaar bewerkt de ingeschakelde status van de routine. De vertraging is de tijd dat het huis leeg moet blijven, geen schatting van de voorbereidingstijd.

Het bezettingsgedeelte toont het gecombineerde resultaat en bronaantallen; vouw het uit om elk signaal te bekijken. Onbekende signalen verhinderen nieuwe afwezigheid en zijn onderscheiden van bevestigde aanwezigheid. Het snelle-terugkeergedeelte houdt de eenmalige vertrekactie en aankomstbediening van de huidige periode bij elkaar. Runtimeacties gebruiken de opgeslagen configuratie: sla openstaande instellingen dus op of annuleer ze voordat je een nieuw vertrek aankondigt.

Het formulier volgt vertrek en aankomst op volgorde: bezettingsbronnen, afwezigheidsvertraging en afwezigheidsmodus, daarna wekelijkse aankomsttijden en bestemmingsmodus. Aanwezigheidsbronnen gebruiken de ronde groene toevoegknop van de blok-editor zodra een bron is geselecteerd. Uitgeschakelde toevoeg- en verwijderacties behouden hun transparante uiterlijk; ingeschakelde acties reageren op aanwijzen en focus.

De ingestelde bronnenlijst begint ingeklapt. De samenvatting toont het totaal en aantallen bezette, lege en onbekende signalen; vouw uit om afzonderlijke bronnen te bekijken of verwijderen. Op mobiel beslaat de samenvatting de hele breedte van keuzelijst en toevoegregel; statuspictogrammen en getallen houden de aantallen bijeen met volledige toegankelijke labels. De tellers staan aan het einde van de samenvatting. Op mobiel deelt de uitgevouwen lijst de breedte van de samenvatting, met Verwijderen aan het einde van elke regel en meer ruimte voor namen en ID's. Desktoplijsten volgen de breedte van de keuzelijst. Het uitvouwen wijzigt de configuratie niet. Vertragingen in uren worden op de dichtstbijzijnde minuut afgerond; de equivalente vertraging staat naast de instelling.

Herkende bezette statussen zijn `on` en `home`; lege statussen zijn `off` en `not_home`. Bij de thuiszone betekent nul personen leeg en een positief aantal bezet. Eén bezet signaal maakt het huis bezet; het huis is pas leeg als alle signalen afwezigheid melden. Als geen signaal aanwezigheid meldt en één onbekend of niet beschikbaar is, is de bezetting onbekend: nieuwe afwezigheden kunnen niet starten. Een geaccepteerde terugkeer blijft gepland. Het paneel toont het gecombineerde resultaat en elke bron.

Kies signalen die werkelijk bezetting vertegenwoordigen: een uitgeschakelde bewegingssensor betekent niet noodzakelijk dat niemand thuis is.

<a id="room-preparation"></a>
## Kamervoorbereiding

Vouw **Room preparation** onder het routineverloop uit om alle beheerde klimaatapparaten te zien. De lijst begint ingeklapt en toont aantallen voor adaptieve voorbereiding, alleen werking bij aankomst en geen voorbereiding. Uitvouwen wijzigt geen instellingen en stuurt geen klimaatopdrachten. Hetzelfde overzicht geldt voor wekelijkse en eenmalige terugkeer.

Elke regel noemt de kamer, de bron van het bestemmingsschema en de voorbereidingsstatus. Een klimaatapparaat dat niet in de profielen van de bestemmingsmodus zit, gebruikt nog steeds zijn **Standaard**-schema; expliciet normaal gedrag gebruikt ook Standaard. Een profielschema gebruikt de profielnaam. Een pauze in het bestemmingsprofiel, uitgeschakelde zone of externe uitvoering wordt apart aangeduid en niet als alleen-bij-aankomst gelabeld. Zonder adaptieve voorconditionering volgt een lokale ingeschakelde kamer bij aankomst haar effectieve schema; ze is niet automatisch uitgesloten van moduswijzigingen.

Zonder toekomstige terugkeer beschrijft de lijst de mogelijkheden van de opgeslagen configuratie, geen voorspelling dat de kamer eerder start. Na acceptatie van een terugkeer bepaalt ze elke bestemmingsdoeltemperatuur voor die aankomsttijd en toont wachtend, voorbereidend, doel bereikt, onderbroken of niet beschikbaar met de relevante reden. Ontbrekende temperatuurgegevens of een geldige schatting verhinderen vervroegde voorbereiding; tijdelijke aanpassingen, handmatige aanpassingen en expliciete pauzes behouden hun normale voorrang. Een onbevestigd vertrek kan niet als voorbereidend verschijnen. **Preparing** beschrijft de actieve voorbereidingsopdracht van Velair, niet een bevestiging dat het apparaat een opdracht heeft ontvangen of fysiek draait. **Target reached** betekent dat de actuele gemeten temperatuur binnen de voorbereidingstolerantie ligt en kan al vóór vertrek waar zijn; dit start geen afwezigheid en omzeilt de bevestiging niet.

**Planned start** is een schatting, geen bewijs van een klimaatopdracht of fysieke gereedheid. Doelen ondersteunen verwarmen, koelen en temperatuurbereiken. Voltooide, geannuleerde en overgeslagen terugkeren gaan terug naar configuratie-informatie in plaats van achterhaalde voorbereidingstijden te tonen. Diagnose gebruikt de opgeslagen backendinstellingen totdat Opslaan slaagt, zonder extra voorbereidingsherinnering. Deze volledige lijst vervangt de oudere zonelijst die alleen een actieve periode toonde.

<a id="one-off-return"></a>
## Eenmalige terugkeer

Kies onder **One-off return** een toekomstige aankomstdatum en -tijd en selecteer **Plan return**. Datum en tijd staan bij elkaar. Op mobiel staat **Plan return** op de volgende regel, uitgelijnd met de rechterkant van het tijdveld; grotere indelingen houden de actie naast de velden. De uitleg staat onder de bediening.

Je kunt dit vóór vertrek doen of wanneer je al afwezig bent. Velair gebruikt de opgeslagen modus- en aanwezigheidsinstellingen. Met ingestelde bezettingsbronnen houdt het de aanvraag in behandeling en past het de afwezigheidsmodus pas toe nadat alle bronnen gedurende de bevestigingsvertraging afwezigheid melden, ter bescherming van wie thuis blijft. Zonder opgeslagen bezettingsbronnen geldt het indrukken van **Plan return** als expliciete vertrekbevestiging: afwezigheid start onmiddellijk, zonder vertraging. Velair leidt in dat geval niet af dat het huis leeg is en detecteert je fysieke thuiskomst niet; het bereidt kamers normaal voor en activeert de bestemming op het opgeslagen aankomsttijdstip. Een ingestelde onbekende of niet-beschikbare bron blijft wachten; een ontbrekende entiteit wordt niet als lege bronnenlijst behandeld.

De eenmalige datum en tijd vervangen alleen voor deze afwezigheid de wekelijkse tijd. Dit werkt ook met de automatische routine uitgeschakeld. Je kunt de aankondiging wijzigen of annuleren; als vertrek niet vóór aankomst is bevestigd, verloopt ze zonder modi te veranderen. Als alle bronnen al afwezigheid melden en er geen actieve periode is, start het plannen van terugkeer de ingestelde bevestigingsvertraging onmiddellijk: er is geen nieuwe sensorwijziging nodig. Als afwezigheid al actief is, wijzig je datum en tijd via de bestaande aankomst-editor; hiermee wordt de terugkeer een eenmalige uitzondering zonder de afwezigheidsmodus opnieuw toe te passen.

Uitstel van aankomst beëindigt de vorige voorbereiding en herstelt het huidige afwezigheidsgedrag totdat de nieuwe voorbereiding nodig is. Tijdelijke en handmatige aanpassingen blijven beschermd. Het bestemmingsdoel wordt bepaald voor de gekozen lokale aankomstdatum, ook als voorbereiding de vorige dag begint. Het indienen van hetzelfde tijdstip reset de voorbereiding niet. Aankomsten in het verleden of op het huidige tijdstip en niet-bestaande lokale tijden door zomer-/wintertijd worden geweigerd; een dubbel voorkomende lokale tijd gebruikt het eerstvolgende tijdstip dat nog in de toekomst ligt.

Voltooide, overgeslagen en geannuleerde perioden blijven voor de automatische routine geblokkeerd totdat bezetting wordt gedetecteerd, zodat een leeg huis niet vanzelf opnieuw een wekelijks vertrek start. Je kunt na elke inactieve periode expliciet **Plan return** kiezen zonder eerst thuis te hoeven zijn. De nieuwe aanvraag gebruikt de huidige aanwezigheidsbronnen en modi. Met bronnen wordt afwezigheid opnieuw gedurende de ingestelde vertraging bevestigd, ook als iedereen al weg is, zonder direct de modus te wijzigen. Zonder bronnen activeert expliciete registratie de afwezigheidsmodus meteen. Zijbalk en dashboardkaart tonen een nieuw planningsformulier zodra een periode inactief wordt. Als plannen niet beschikbaar is, blijft het formulier zichtbaar met **Plan return** uitgeschakeld en uitleg over benodigde opgeslagen instellingen en plannerstatus. Een actieve terugkeer kan dan nog worden geannuleerd.

Gebruik na bevestigd vertrek **Annuleren** om de terugkeer te stoppen en de vastgelegde eerdere modus en profielen te herstellen, of **Terugkomst wijzigen** om datum en tijd aan te passen. Tijdens de afwezigheidsbevestiging laat annuleren de actieve selectie ongemoeid, omdat de afwezigheidsmodus nog niet is toegepast. Het uitschakelen van de automatische routine of wijzigen van wekelijkse tijden annuleert een handmatige terugkeer niet. Wijziging van de bijbehorende aanwezigheidsbronnen of modi maakt de eerdere aankondiging ongeldig. Expliciete modus-/profielkeuzes annuleren wachtende en actieve terugkeren. Een gestopte planner voert de terugkeer niet uit.

De eerste regel houdt de titel Eenmalige terugkeer links en bezettingsaanduidingen die alleen op de kaart staan rechts. De huidige fase is een compacte ondertitel aan de titel, zonder aparte statuspil of regel. Tijdens bevestiging geeft de timerproceskop de fase aan. De dashboardkaart groepeert bronaantallen rechtsboven als bronnen zijn ingesteld. Zonder bronnen worden tellers en het ongebruikte vertragingspictogram weggelaten en meldt de zijbalk **Niet bewaakt** in plaats van onbekende bezetting. Het pictogram voor bevestigingsvertraging verschijnt alleen vóór bevestiging van actieve afwezigheid; het is verborgen bij Afwezig/Voorbereiden en actieve fouten na bevestigd vertrek. De zijbalk herhaalt deze aanduidingen niet. Wijs de fase aan voor een korte uitleg.

Tijdens afwezigheidsbevestiging legt een lichte timerregel uit dat Velair controleert of het huis leeg blijft. **Tot** toont de backendbevestigingstermijn in de lokale Home Assistant-tijd, inclusief datum als die afwijkt van vandaag. Velair activeert de afwezigheidsmodus na bevestiging alleen als elke bron nog afwezigheid meldt. Dit is een deadline, geen liveaftelling of bevestigd vertrek. Hetzelfde proces verschijnt wanneer de wekelijkse routine afwezigheid bevestigt voordat een periode bestaat; zonder deadlinegegevens wordt geen tijd verzonnen.

Voordat vertrek bevestigd is, geven een aankomstpictogram en het label **Expected arrival** de opgeslagen terugkeer aan, met toegankelijk label en tooltip. Deze regel staat uitgelijnd met titel en statustekst. De opgeslagen datum/tijd is een compact klikbaar label, zonder potlood of onderstreping. De bevestigde tijdlijn gebruikt hetzelfde pictogram; alleen de onderstreepte opgeslagen datum/tijd en het potlood links daarvan vormen de bewerkknop. Selecteer die waarde om de datum-/tijd-editor te openen. De actieregel heeft links een blauwe knop **Terug** met linkerpijl en rechts een groene knop **Terugkomst wijzigen**. Terug verwerpt niet-opgeslagen aankomstwijzigingen en sluit de editor zonder de terugkeer te veranderen.

In een breed zijbalkpaneel blijft de aankomst-editor compact en uitgelijnd met het aankomsteindpunt; de wijzigactie blijft rechts onder de editor. Smalle schermen en de dashboardkaart behouden hun responsieve indeling. Invoervelden blijven verborgen totdat je ze opent. **Terug** herstelt de laatst opgeslagen aankomst en verbergt de velden. Het wist de aankomstwaarschuwing en navigatiebeveiliging; onafhankelijke niet-opgeslagen routine-instellingen blijven beschermd. Opnieuw openen begint bij de opgeslagen aankomst. Tijdens bevestigde afwezigheid is het aankomsteindpunt van de tijdlijn dezelfde bewerkknop, zodat aankomst niet dubbel verschijnt.

Annuleren staat alleen links onder de grafiek en voorbereidingstoelichting als de aankomst-editor gesloten is. Tijdens bewerken is Annuleren verborgen; **Terugkomst wijzigen** staat rechts en **Terug** links om de aankomstwijziging lokaal te verwerpen. Een wijziging in het invoerveld verandert de geplande terugkeer pas wanneer **Terugkomst wijzigen** slaagt. Geslaagde wijzigingen sluiten de editor en geven focus terug aan de opgeslagen aankomst. Mislukte wijzigingen en sensorupdates behouden het open concept. Een melding markeert niet-opgeslagen wijzigingen; navigeren of opnieuw laden waarschuwt voordat ze verloren gaan. Het opslaan van routine-instellingen past een aankomstwijziging niet toe.

Terug en Terugkomst wijzigen gebruiken respectievelijk compacte blauwe en groene gevulde knoppen. Het zichtbare vlak is 32 pixels hoog binnen een aanraakgebied van 44 pixels. Annuleren gebruikt een compact rood vlak met wit pictogram/tekst onder de periodegegevens, eveneens 32 pixels binnen een aanraakgebied van 44 pixels; aanwijzen en focus blijven duidelijk. Tekst en pictogrammen passen zich aan het thema aan om leesbaar te blijven. Niet-beschikbare acties krijgen een neutrale achtergrond, gedempte tekst en pictogrammen en een niet-toegestaan-cursor. Terugkomst wijzigen wordt groen zodra de aankomst is bewerkt. De fase blijft bij de titel. Annuleren blijft links onder de gegevens wanneer je niet bewerkt; Terugkomst wijzigen staat rechts onder de open editor. Zijbalk en kaart behouden deze groepering op mobiel. Plan return blijft rechts op het nieuwe planningsformulier. Geslaagde acties werken de periode bij zonder extra opgeslagen-melding.

<a id="home-assistant-actions"></a>
### Home Assistant-acties

Automatiseringen, scripts en dashboards kunnen een vertrek aankondigen via `velair.start_planned_return`. Zowel `return_date` (`YYYY-MM-DD`) als `return_time` (24-uursnotatie `HH:MM`) zijn vereist. Samen moeten ze een toekomstige aankomst in de Home Assistant-tijdzone aangeven. De oorspronkelijke tijdkiezer kan `HH:MM:00` versturen; nul seconden worden geaccepteerd en genormaliseerd op minuten. Kies voor dit voorbeeld een toekomstige datum:

```yaml
action: velair.start_planned_return
data:
  return_date: "2026-10-09"
  return_time: "19:25"
```

Dit gebruikt de opgeslagen aanwezigheids- en modusinstellingen en hetzelfde gedrag voor bevestiging, voorbereiding en tijdelijke aanpassingen als **Plan return**. Het werkt met de wekelijkse routine uitgeschakeld en wijzigt datum en tijd wanneer afwezigheid al actief is, zonder de afwezigheidsmodus opnieuw toe te passen. Opgeslagen modi en automatische planning moeten werken. Bronnen zijn optioneel voor eenmalige terugkeer: een lege opgeslagen lijst activeert afwezigheid direct; ingestelde bronnen behouden normale bevestigingsregels. Een aankomst in het verleden of op het huidige tijdstip wordt geweigerd zonder de vorige terugkeer te vervangen. Een verlopen of niet-bestaande zomer-/wintertijd wordt geweigerd; bij een dubbel uur kiest Velair het vroegste voorkomen dat nog in de toekomst ligt.

Een wachtende of actieve terugkeer annuleren:

```yaml
action: velair.cancel_planned_return
data: {}
```

Dezelfde annuleringsactie sluit ook een melding van een inactieve periode. Ze stopt voorbereiding en getimede terugkeer en behoudt de blokkering voor automatisch opnieuw starten na annulering. Na bevestigd vertrek herstelt ze de modus en exacte profielselectie van vóór het begin van de periode. Tijdens afwezigheidsbevestiging laat ze de huidige selectie ongemoeid. Een nieuwe expliciete **Plan return** kan de inactieve periode vervangen. Zijbalk en kaart gebruiken dezelfde annuleringsactie.

<a id="cancelling-a-return-examples"></a>
## Een terugkeer annuleren: voorbeelden

De bevestigingsvertraging voor afwezigheid vindt plaats **vóór** het toepassen van de afwezigheidsmodus. Tijdens die vertraging hoeft annuleren niets te herstellen: de vorige modus en profielen zijn nog actief. Na bevestigd vertrek herstelt annuleren de selectie die bij het begin van de periode is vastgelegd, in plaats van direct de ingestelde terugkeermodus te activeren.

Neem voor deze voorbeelden aan:

- **Comfort** is actief en kiest de profielen **Woonkamercomfort** en **Slaapkamercomfort**.
- De afwezigheidsmodus is **Afwezig**, de terugkeermodus **Avond** en aankomst staat op 18:00.
- Bezettingsbronnen melden om 13:00 een leeg huis; de bevestigingsvertraging is vijf minuten.

<a id="cancel-before-confirmation-finishes"></a>
### Annuleren voordat bevestiging klaar is

| Tijd | Wat gebeurt er | Gekozen modus en profielen |
| --- | --- | --- |
| 13:00 | Start een terugkeer. Velair controleert of het huis tot 13:05 leeg blijft. | Comfort en de twee profielen blijven actief. |
| 13:02 | Kies **Annuleren** terwijl afwezigheid nog wordt bevestigd. | Comfort en de twee profielen blijven actief; Afwezig is nooit toegepast. |

De geplande aankomst om 18:00 wordt ingetrokken. Deze geannuleerde periode activeert later geen Afwezig of Avond.

<a id="cancel-after-departure-is-confirmed"></a>
### Annuleren na bevestigd vertrek

Dit is een afzonderlijke periode met dezelfde beginconfiguratie:

| Tijd | Wat gebeurt er | Gekozen modus en profielen |
| --- | --- | --- |
| 13:00 | Start een terugkeer en begin bevestiging. | Comfort en de twee profielen blijven actief. |
| 13:05 | Elke ingestelde bron meldt nog afwezigheid. | Velair past Afwezig en de bijbehorende profielen toe. |
| 13:10 | Kies **Annuleren**. | Velair herstelt Comfort en de oorspronkelijke twee profielen en trekt daarna de aankomst in. |

Het resultaat is Comfort, **niet** de ingestelde terugkeermodus Avond. Als voorbereiding op Avond al was begonnen, beëindigt annuleren ook die voorbereiding en herstelt het de oorspronkelijke selectie. Actieve tijdelijke aanpassingen, handmatige aanpassingen en onafhankelijke pauzes behouden hun voorrang.

<a id="start-without-occupancy-sensors"></a>
### Starten zonder bezettingssensoren

Zonder ingestelde bezettingsbronnen activeert **Plan return** Afwezig direct. Er is geen bevestigingsstap van vijf minuten. Het annuleren van die actieve terugkeer herstelt Comfort en de twee profielen die direct vóór de start zijn vastgelegd. Een ingestelde onbekende of niet-beschikbare sensor telt niet als afwezigheid van sensoren: deze blijft nieuwe afwezigheidsbevestiging blokkeren.

<a id="default-arrival-edits-and-restart"></a>
### Standaard, aankomstwijzigingen en herstarten

Als de periode vanuit **Standaard** zonder actieve profielen begint, herstelt annuleren na bevestigd vertrek Standaard zonder actieve profielen. Een handmatige combinatie van profielen wordt in de oorspronkelijke volgorde hersteld.

Het wijzigen van aankomst van 18:00 naar 19:00 of herstarten van Home Assistant vervangt de vastgelegde eerdere selectie niet. Annuleren herstelt nog steeds de selectie van vóór het begin van deze periode. Eerdere apparaattemperaturen of HVAC-statussen worden niet hersteld: de herstelde selectie gebruikt de huidige schema's, met bestaande tijdelijke aanpassingen.

<a id="choose-another-mode-instead-of-cancelling"></a>
### Een andere modus kiezen in plaats van annuleren

Als je expliciet **Eco** kiest tijdens een actieve terugkeer, trekt die keuze de terugkeer in en blijft Eco behouden. Velair herstelt Comfort later niet wanneer bezetting verandert of je de eindmelding sluit. Zo blijft je expliciete keuze gelden; dit is een andere actie dan de knop **Annuleren** van de periode.

<a id="distinguish-the-controls"></a>
### De knoppen onderscheiden

- **Annuleren** bij de terugkeerbediening trekt de periode in zoals hierboven beschreven.
- **Terug** in de aankomst-editor verwerpt niet-toegepaste aankomstwijzigingen; de opgeslagen terugkeer gaat door.
- De **X** in het algemene bedieningspaneel van de klimaatkaart sluit dat paneel zonder de terugkeer te annuleren.
- **Annuleren** naast **Opslaan** bij de routine-instellingen verwerpt niet-opgeslagen instellingen en annuleert geen periode.

Voor oudere perioden zonder vastgelegde eerdere selectie of wanneer opgeslagen profielen niet meer geldig zijn, zie [herstelbeperkingen](#restoration-limits).

<a id="daily-behavior"></a>
## Dagelijks gedrag

Stel bijvoorbeeld maandag tot en met vrijdag op 18:15 in. Nadat het huis gedurende de bevestigingsvertraging leeg blijft, activeert Velair Afwezig en bepaalt het het thuisschema voor 18:15. Elke zone gebruikt haar eigen voorbereidingsschatting. Een zone die een uur nodig heeft, kan om 17:15 beginnen; een snellere zone begint later.

Het doel is het blok dat **bij aankomst** geldt, met inbegrip van wekelijkse continuïteit. Als Thuis vóór 18:00 17 graden vraagt en daarna 21 graden, bereidt een terugkeer om 18:15 21 graden voor, ook wanneer de voorbereiding vóór 18:00 begint. Het weekschema wordt niet gewijzigd en krijgt geen tijdelijke blokken.

Op de verwachte tijd selecteert Velair de bestemming en gaat verder met het gewone schema. Een eerdere bezettingsmelding kiest de bestemming onmiddellijk. Late aankomst schakelt het huis niet terug naar Afwezig. Pauzes, tijdelijke aanpassingen, handmatige aanpassingen, uitgeschakelde zones en een gestopte planner behouden hun bestaande voorwaarden voor overdracht. Voorbereiding ondersteunt verwarmen, koelen en oorspronkelijke temperatuurbereiken. Ze probeert de kamer dicht bij het doel te brengen, maar kan geen exacte temperatuur garanderen.

<a id="preparation-and-room-assist"></a>
### Voorbereiding en Room Assist

De bestemmingsmodus bepaalt de benodigde configuratie bij aankomst. Elke zone start op haar eigen geschatte tijd; de hele modus wordt pas bij aankomst gekozen, niet zodra de eerste zone voorbereidt. Zones die nog niet gestart zijn, blijven het afwezigheidsschema volgen.

Zodra een zone voorbereidt, heeft het tijdelijke aankomstdoel voorrang op latere blokken in het afwezigheidsschema. Bijvoorbeeld bij tien uur afwezigheid en terugkeer om 19:25:

| Tijd | Doel voor deze kamer |
|---|---|
| 09:25, afwezigheid bevestigd | Afwezig vraagt 16 graden |
| 16:25, deze zone begint voorbereiding | Het aankomstschema vraagt 21 graden |
| 17:00, een afwezigheidsblok vraagt 18 graden | Voorbereiding naar 21 graden gaat door |
| 19:25, geplande aankomst | De bestemmingsmodus begint het normale schema |

Een afwezigheidsblok annuleert de terugkeervoorbereiding van de zone niet. Deze voorrang geldt ook voor koelen en temperatuurbereiken.

Als Room Assist is ingeschakeld, volgt het hetzelfde tijdelijke aankomstdoel. In dit voorbeeld helpt het de kamer 21 graden te bereiken in plaats van terug te corrigeren naar het afwezigheidsdoel van 16 graden. Het naar het apparaat gestuurde instelpunt kan van 21 graden afwijken doordat Room Assist verschillen tussen de kamersensor en de eigen apparaatmeting compenseert. Wachtrijcorrecties worden vóór overdracht opnieuw tegen het actuele doel gecontroleerd.

Een rechtstreekse temperatuurwijziging door een gebruiker volgt het beleid voor externe aanpassingen van de zone. **Automatisch behouden** past het huidige leidende doel opnieuw toe, tijdens voorbereiding dus het aankomstdoel. Een **Handmatige aanpassing** onderbreekt automatische overdracht en Room Assist voor die zone zolang de handmatige aanpassing actief is. Tijdelijke aanpassingen en expliciete zonepauzes behouden hun voorrang en annuleren niet de hele huishoudelijke terugkeer. Zie [Room Assist](room-assist.nl.md) en [Handmatige aanpassing](manual-control.nl.md).

<a id="exceptions-and-restarts"></a>
## Uitzonderingen en herstarten

Het onderdeel Geplande terugkeer toont de geaccepteerde terugkeer, de voorbereiding per zone en de opgeslagen routine samen. Open rechtstreeks via `/velair/preconditioning/planned-return`; `/velair/preconditioning/preconditioning` opent adaptieve voorconditionering, het standaardonderdeel van het tabblad. Het wijzigen van aankomst verandert alleen deze afwezigheid, niet de opgeslagen week. **Annuleren** verwijdert voorbereiding en de automatische bestemmingswijziging. Vóór afwezigheidsbevestiging blijft de actieve selectie ongemoeid; daarna worden de modus en profielen van vóór het begin van de periode hersteld.

Een expliciete modus- of profielkeuze annuleert de automatische terugkeer van de periode. Een latere aanwezigheidsmelding of herstart mag die keuze niet overschrijven. Velair onthoudt voltooide of geannuleerde afwezigheden totdat het huis weer bezet is.

Deze expliciete keuze annuleert ook al lopende voorbereiding voor de periode, zelfs als de gekozen modus- of profielconfiguratie al actief is. Dit verschilt van een geplande temperatuurwijziging binnen de afwezigheidsmodus, die voorbereiding niet annuleert. Zijbalk en kaart bevatten geen knoppen Overslaan, Ik ben thuis of Sluiten; de gedeelde terugkeerknoppen zijn Annuleren en Terugkomst wijzigen. De backend behoudt aparte overslaan- en aankomstbewerkingen voor API-gebruikers; de afspraken staan in de [ontwikkelaars-API](../developer/api.md).

De actie `velair.cancel_planned_return` annuleert een wachtende of actieve bevestigde terugkeer, of sluit een melding van een inactieve periode. Annuleren stopt voorbereiding en de getimede terugkeer en voorkomt automatisch opnieuw starten voor deze afwezigheid. Na bevestigd vertrek herstelt het de eerdere opgeslagen modus-/profielselectie; bij wachtende bevestiging of een eindmelding verandert het de selectie niet. Een nieuwe expliciete **Plan return** kan nog steeds een nieuwe periode starten.

<a id="restoration-limits"></a>
### Herstelbeperkingen

Bij een eenmalige terugkeer legt Velair de selectie vast wanneer je **Plan return** kiest. Bij de wekelijkse routine gebeurt dit bij afwezigheidsbevestiging, direct vóór het toepassen van de afwezigheidsmodus.

De eerdere selectie blijft behouden bij aankomstwijzigingen en Home Assistant-herstarts. Het herstel betreft profielkeuze, geen historische temperaturen of apparaatstatussen; de herstelde profielen gebruiken hun actuele schema's en bestaande voorrangsregels voor tijdelijke aanpassingen. Als de vorige modus is verwijderd of gewijzigd, kunnen de oorspronkelijke profielen als handmatige selectie worden hersteld. Als een opgeslagen profiel ontbreekt, ongeldig is of botst met een ander opgeslagen profiel, slaagt annuleren nog steeds maar blijft de huidige selectie behouden en wordt gemeld dat herstel niet beschikbaar was. Perioden van vóór deze herstelmetadata behouden de huidige selectie, omdat Velair hun eerdere selectie niet kan afleiden.

Bij herstart worden wachtende eenmalige aankondigingen en bevestigde afwezigheden hersteld in plaats van opnieuw gestart. Onbevestigde afwezigheid begint de bevestigingsvertraging opnieuw. Een sensor die bezetting meldt, handelt de vorige afwezigheid af, ook als aankomst plaatsvond terwijl Home Assistant offline was.

<a id="limits-and-backups"></a>
## Beperkingen en back-ups

- Eén routine voor het hele huis wordt ondersteund. Wekelijkse aankomsten blijven op dezelfde dag: vertrek na de tijd van vandaag of op een dag zonder tijd activeert Afwezig zonder de terugkeer van morgen te plannen. Eenmalige terugkeer kan elke toekomstige datum gebruiken.
- Kalenders, wisselende diensten en automatische routines voor aankomst op een latere dag worden niet geïnterpreteerd.
- Zonder ingeschakelde voorconditionering, temperatuurmeting of temperatuurdoel verandert de bestemming nog steeds bij aankomst, maar die zone bereidt niet eerder voor.
- Overgangen die extern uitgevoerde zones raken, worden vóór de moduswijziging geweigerd; Velair neemt hun lokale besturing niet van de regelaar over.
- De bestaande algemene thuis-/afwezigheidsblueprint verandert niet en blijft nuttig voor andere installaties en acties.
- Overdraagbare back-ups bevatten de routineconfiguratie, geen bezettingsperioden of timers. Geïmporteerde routines blijven uitgeschakeld totdat je ze expliciet inschakelt.

Zie [Klimaatprofielen](climate-profiles.nl.md), [Adaptieve voorconditionering](adaptive-preconditioning.nl.md) en [Handmatige aanpassing](manual-control.nl.md) voor de onderliggende bediening.

<a id="overview-and-diagnostics"></a>
## Overzicht en Diagnose

Het overzicht toont een compacte huishoudsamenvatting tijdens een wekelijkse of eenmalige periode of wanneer een probleem aandacht nodig heeft. Het noemt oorsprong en status en toont zo nodig de bevestigingstermijn of verwachte aankomst. Selecteer de samenvatting om de volledige details in Voorconditionering te openen.

Een violet signaal op een klimaatapparaat duidt op actuele besturing door Geplande terugkeer. De bestaande werking blijft zichtbaar: het signaal verklaart de oorsprong en vervangt niet de status verwarmen, koelen, gepauzeerd, gepland of voorconditioneren. Toekomstige startschattingen worden apart gelabeld. Handmatige besturing, tijdelijke aanpassingen en onafhankelijke pauzes behouden hun voorrang. Toeschrijving aan Afwezig geldt voor de effectieve afwezigheidsprofielen van de periode, of Standaard wanneer deze expliciet als afwezigheidsmodus is gekozen. Ze geldt niet voor een niet-gekoppeld apparaat dat gewoon het standaardschema behoudt. Voorbereiding kan wel de standaardterugval van de bestemming gebruiken wanneer de backend het aankomstdoel van dat apparaat kiest.

Diagnose toont de actuele huishoudstatus, besturingsoorsprong en voorbereidingsstatus per apparaat, met redenen voor onderbroken of onbeschikbare voorbereiding. De geschiedeniscategorie Geplande terugkeer bewaart betekenisvolle geaccepteerde overgangen zonder dubbele regels bij vernieuwen van het paneel. Deze deelt de bestaande runtimegrens van 100 gebeurtenissen en wordt bij herstart gewist. Opgeslagen categorievoorkeuren blijven behouden. Gedownloade rapporten bevatten deze informatie en verwijderen operationele modus- en profiel-ID's. Besturingsopdracht en geslaagde overdracht blijven afzonderlijke zaken.

<a id="dashboard-card"></a>
## Dashboardkaart

De optionele Lovelace-kaart toont compacte bediening voor een eenmalige terugkeer. De kop bevat aantallen bezette, lege en onbekende bronnen en de opgeslagen bevestigingsvertraging. De weeksamenvatting, bronnenlijst en kamervoorbereidingsdetails blijven in de zijbalk. Stel het huishouden eerst daar in.

```yaml
type: custom:velair-card
view: planned-return
```

Kies **Geplande terugkeer** in de visuele kaart-editor. De kaart bedient dezelfde opgeslagen periode als de zijbalk en andere kaarten en ondersteunt toekomstige datums en tijden. Actieve perioden bieden **Annuleren** en **Terugkomst wijzigen**. Annuleren stopt de geaccepteerde terugkeer en herstelt de eerder vastgelegde modus-/profielselectie na bevestigd vertrek; tijdens bevestiging blijft de selectie gelijk. Na voltooiing, annulering of een andere inactieve periode toont de kaart een nieuw planningsformulier zonder op gewijzigde bezetting te wachten. Ongeldige opgeslagen configuratie of een gestopte planner schakelt plannen en wijzigen uit, maar een actieve terugkeer kan nog worden geannuleerd. De zijbalk gebruikt dezelfde knoppen en levenscyclus; wekelijkse configuratie en de inschakelknop blijven daar.

Alleen de bron-/vertragingsaanduidingen aan het einde zijn kaartspecifiek; zijbalk en kaart delen de faseondertitel bij de titel, aankomstbewerking en tijdlijn. Tijdens bevestiging vervangt het timerprocesblok de ondertitel. Deze huishoudweergave heeft geen thermostaatfilter.

De kaart **Thermostaat: status en bediening** kan **Eenmalige terugkeer** ook als snelle Velair-actie naast Tijdelijke aanpassing en Pauzeren aanbieden. Schakel deze in de actie-editor van de kaart in, kies of de naam wordt getoond of plaats de actie in Meer. De editor groepeert Tijdelijke aanpassing, Pauzeren en Eenmalige terugkeer bovenaan, ook wanneer ze uitgeschakeld zijn. De actie opent dezelfde compacte bediening in het onderste bedieningspaneel, met een eenvoudige kop zoals bij de andere acties. Alle drie formulieren gebruiken de bestaande compacte veldhoogte van 38 pixels.

Een actief vertrek toont de bestaande tijdlijn en aankomst-editor. De X van het paneel sluit de bediening zonder vertrek te annuleren. Bij sluiten met niet-opgeslagen aankomstwijzigingen wordt gevraagd of je deze wilt verwerpen; sluiten is geblokkeerd zolang een actie loopt. Deze actie bedient altijd het huishouden, ongeacht het geselecteerde apparaat. Bestaande kaartconfiguraties houden haar verborgen. Nieuwe kaarten via de Home Assistant-kaartkiezer schakelen haar in; YAML-configuraties moeten expliciet `type: planned-return` in `climate_actions` opnemen.

Tijdens **Away** en **Preparing for arrival** toont de kaart bevestigd vertrek en opgeslagen aankomst met de afwezigheids- en terugkeermodusnamen van de periode. Een actuele-tijdmarkering met tooltip **Nu** schuift volgens verstreken UTC-tijd, ook bij klokwijzigingen, en blijft binnen de balk. Eindpunten bevatten datums wanneer hun lokale Home Assistant-datums verschillen. Niet-opgeslagen aankomstwijzigingen veranderen de balk niet. Wachtende en eindstatussen of perioden zonder bevestigd vertrektijdstip houden een statische status zonder tijdlijn. Zijbalk en kaart werken hun lokale klok eenmaal per minuut bij, uitsluitend wanneer ze zichtbaar en actief zijn, en direct zodra ze zichtbaar worden; deze weergavevernieuwing vraagt nooit backendgegevens op.

Vertrek- en aankomstpictogrammen staan aan weerszijden van de lijn met oorspronkelijke tooltips en toegankelijke labels. Opgeslagen tijden staan direct onder hun eindpuntpictogrammen; alleen de aankomstwaarde is bewerkbaar. Eenvoudige moduslabels onder de tijden noemen de afwezigheids- en terugkeerconfiguratie met een algemeen moduspictogram. Lange namen en datums over meerdere dagen lopen binnen het paneel door. Elk eindpunt groepeert de eigen tijd en het eigen moduslabel, direct daaronder. Datum-/tijdvelden gebruiken dezelfde compacte maat als andere actieformulieren; naast de opgeslagen tijd verschijnt geen sluitknop.

De voorbereidingspositie is een klein streepje op de lijn, met klok en uitleg onder de tijden. Het verstreken deel, eindpuntstreepjes en Nu-markering tonen tijdsverloop, geen temperatuurvoortgang. Zonder geldige schatting voor de eerste kamer legt een kleine informatieknop naast de titel Eenmalige terugkeer de huidige opgeslagen-aankomstvoorvertoning uit: alle betrokken kamers kunnen onderbroken zijn, al op doel zijn, uitgesloten zijn of alleen bij aankomst handelen. Wijs aan of geef focus op desktop, of tik op mobiel. Ontbrekende of gemengde informatie blijft onbeslist en betekent niet dat vervroegde voorbereiding is uitgeschakeld. Escape of een handeling buiten de hulp sluit deze.

Als de backend een geldige adaptieve schatting voor de opgeslagen aankomst heeft, voegt de tijdlijn een klokmarkering **Geschatte voorbereiding** met tijd toe. Deze noemt de vroegste geschikte kamerschatting; andere kamers kunnen later beginnen. De zachtgekleurde toelichting is standaard ingeklapt. Selecteer deze om elke geschikte kamer met geschatte start te zien, geordend op tijd. De lijst gebruikt Home Assistant-kamernamen, pictogrammen en lokale tijd, zo nodig met datum. Onderbroken kamers, kamers op doel en kamers die alleen bij aankomst handelen, worden uitgesloten. Openen vraagt geen backendgegevens op; normale actuele updates behouden de toestand, terwijl gewijzigde opgeslagen aankomst of periode deze sluit. Tijdens aankomstbewerking zijn toelichting en terugvalinformatieknop verborgen; de lijn behoudt de opgeslagen schatting. Terug herstelt de uitgeklapte toestand van dezelfde periode. Wijs de kop aan voor uitleg.

Dit is een planningsschatting, geen bewijs dat een apparaat gestart is of maat voor temperatuurvoortgang. Onderbroken, op-doel-, onbeschikbare en alleen-bij-aankomstkamers leveren deze markering niet. De positie blijft binnen de vertrek-/aankomstbalk, terwijl het label de werkelijke schatting behoudt, ook bij een eerdere datum.
