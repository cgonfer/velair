<a id="planned-return"></a>
# Geplande terugkeer
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](planned-return.md) · [Español](planned-return.es.md) · [Français](planned-return.fr.md) · [Deutsch](planned-return.de.md) · [Italiano](planned-return.it.md) · [Nederlands](planned-return.nl.md) · [Polski](planned-return.pl.md) · [Português (Brasil)](planned-return.pt-br.md) · [Português (Portugal)](planned-return.pt-pt.md) · [Русский](planned-return.ru.md) · [Vertaalstatus](../translation-status.md)

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

Geplande terugkeer bereidt je huis voor op een vaste of eenmalige aankomsttijd nadat de gekozen bezettingssignalen bevestigen dat het hele huis leeg is, of nadat je expliciet een eenmalige terugkeer start zonder ingestelde bezettingsbronnen. Je stelt dit in Velair in; voor een vaste wekelijkse routine is geen extra blueprint of dagelijkse actie nodig. De automatische routine is standaard uitgeschakeld en werkt lokaal in Home Assistant. Eenmalige terugkeer vereist opgeslagen afwezigheids- en terugkeermodi en werkende automatische planning; bezettingsbronnen zijn optioneel voor expliciete starts. De wekelijkse routine vereist minimaal één bezettingsbron.

De door Terugkeer naar huis vastgelegde vorige configuratie bevat de basisselectie van modus/profielen en alle zone-uitzonderingen. Bevestigd vertrek selecteert de afwezigheidsbasis en wist uitzonderingen; voltooide aankomst selecteert de bestemmingsbasis. **Annuleren** van een bevestigde periode herstelt de volledige vastgelegde selectie, inclusief uitzonderingen als de verwijzingen geldig blijven. Een externe profiel-/modusselectie annuleert daarentegen de geplande terugkeer en past de gevraagde selectie toe zonder de eerdere configuratie te herstellen. Zie [basis en zone-uitzonderingen](climate-profiles.nl.md#a-base-with-independent-zone-exceptions).

<a id="setup"></a>
## Instellen

**Afwezigheid en terugkeer** bevat gedeelde instellingen voor eenmalige terugkeer en de wekelijkse routine. Afwezigheidsdetectie werkt voor een gestarte eenmalige terugkeer of wanneer de opgeslagen wekelijkse routine is ingeschakeld. Dit is geen afzonderlijke permanent lopende Thuis/Afwezig-automatisering. De bevestigingstijd meet ononderbroken gedetecteerde afwezigheid, niet de tijd sinds opslaan. De afwezigheidsmodus geldt na bevestigd vertrek; geschikte kamers kunnen eerder worden voorbereid dan toepassing van de bestemmingsmodus bij aankomst.

Zonder aanwezigheidsbronnen past starten van een eenmalige terugkeer de afwezigheidsmodus meteen toe zonder bevestigingsvertraging. Deze uitzondering staat bij de vertraging wanneer geen bronnen zijn gekozen.

Bestemmingsblokken met **Alleen temperatuur** behouden externe controle over de HVAC-modus. Geplande terugkeer schakelt een uitgeschakeld klimaatapparaat niet in om zo’n blok voor te bereiden; gereedheid bij aankomst kan niet worden beloofd zolang het uitstaat. Kies expliciet **Verwarmen** of **Koelen** als de voorbereiding de apparatuur moet starten. Ook de bestemming bij aankomst selecteren respecteert het blokbeleid.

1. Maak de gewenste afwezigheids- en thuismodi aan, of gebruik Standaard als bestemming. Afwezigheidsprofielen kunnen klimaatapparaten uitschakelen of minder veeleisende weekschema's gebruiken.
2. Open **Voorconditionering**, kies **Geplande terugkeer** in de onderdeelkiezer en voeg bezettingssignalen toe voor bewaakte of wekelijkse vertrekmomenten. Gebruik binaire sensoren, invoerbooleans, groepen of de thuiszone van Home Assistant (`zone.home`). Neem signalen op voor iedereen die thuis kan blijven, ook gasten. Home Assistant blijft verantwoordelijk voor het volgen van personen en locaties; complexe regels kun je in een helper combineren.
3. Kies in **Afwezigheid en terugkeer** de bevestigingstijd, afwezigheidsmodus en bestemmingsmodus. De standaard is tien minuten; minuten en uren zijn mogelijk. Aankomst wordt direct herkend. De bestemmingshulp legt adaptieve voorbereiding en werking zonder geldige schatting uit.
4. Vul bij **Aankomsttijden** de gebruikelijke tijd per weekdag in. Wekelijkse aankomsten gelden voor de dag waarop het huis leeg wordt. Dagen zonder tijd gebruiken Afwezig na bevestiging en herstellen de bestemming zodra aanwezigheid wordt gedetecteerd, zonder voorbereiding vooraf. Het bestemmingsschema bij aankomst bepaalt de voorbereiding.
5. Schakel adaptieve voorconditionering in voor zones die eerder moeten starten. Bestaande instellingen en lokale leergegevens voor verwarmen/koelen worden hergebruikt.
6. Schakel **Wekelijkse routine** in via de statusbalk en sla op. Dit activeert automatische afwezigheidsbevestiging, de afwezigheidsmodus en wekelijkse **Aankomsttijden**. Alleen tijden invullen schakelt de routine niet in. Eenmalige terugkeer blijft mogelijk met de schakelaar uit. De schakelaar bewerkt het concept; Annuleren herstelt de opgeslagen waarde. Stop concurrerende Thuis/Afwezig-automatiseringen voor hetzelfde huishouden.

Weekdagen volgen de voorkeur **Eerste dag van de week** uit de Velair-instellingen. Vul per dag rechtstreeks een aankomsttijd in. Als je vertrekt op een dag zonder tijd, activeert Velair na bevestiging van afwezigheid de afwezigheidsmodus, plant het geen vervroegde voorbereiding en herstelt het de bestemming zodra bezetting wordt gedetecteerd. De Home Assistant-tijdzone staat naast de wekelijkse routine. Wijzigingen blijven een concept totdat je opslaat. Annuleren en Opslaan staan rechts onder de configuratie.

De bovenste samenvatting groepeert drie onderdelen van de routine in afzonderlijke omlijnde vakken die bij de instellingenonderdelen passen, zonder omvattende kaart of gedeelde zijlijn. De wekelijkse routine toont afwezigheidsmodus, bevestigingsvertraging, adaptieve voorbereiding en bestemmingsmodus als een eenvoudig verloop; de schakelaar bewerkt de ingeschakelde status van de routine. De vertraging is de tijd dat het huis leeg moet blijven, geen schatting van de voorbereidingstijd.

Het bezettingsgedeelte toont het gecombineerde resultaat en bronaantallen; vouw het uit om elk signaal te bekijken. Onbekende signalen verhinderen nieuwe afwezigheid en zijn onderscheiden van bevestigde aanwezigheid. Het snelle-terugkeergedeelte houdt de eenmalige vertrekactie en aankomstbediening van de huidige periode bij elkaar. Runtimeacties gebruiken de opgeslagen configuratie: sla openstaande instellingen dus op of annuleer ze voordat je een nieuw vertrek aankondigt.

Het formulier groepeert aanwezigheidsbronnen, bevestigingstijd en beide modi in **Afwezigheid en terugkeer**. In brede containers staan vertraging en modi op één rij; op tablets staat de vertraging boven beide modi en mobiel staan alle drie onder elkaar. Elke hulp blijft bij het eigen veld. **Aankomsttijden** bevat alleen weekdagtijden, uitleg en de Home Assistant-tijdzone. Aanwezigheidsbronnen gebruiken de ronde groene toevoegknop van de blok-editor zodra een bron is geselecteerd. Uitgeschakelde toevoeg- en verwijderacties behouden hun transparante uiterlijk; ingeschakelde acties reageren op aanwijzen en focus.

De ingestelde bronnenlijst begint ingeklapt. De samenvatting toont het totaal en aantallen bezette, lege en onbekende signalen; vouw uit om afzonderlijke bronnen te bekijken of verwijderen. Op mobiel beslaat de samenvatting de hele breedte van keuzelijst en toevoegregel; statuspictogrammen en getallen houden de aantallen bijeen met volledige toegankelijke labels. De tellers staan aan het einde van de samenvatting. Op mobiel deelt de uitgevouwen lijst de breedte van de samenvatting, met Verwijderen aan het einde van elke regel en meer ruimte voor namen en ID's. Desktoplijsten volgen de breedte van de keuzelijst. Het uitvouwen wijzigt de configuratie niet. Vertragingen in uren worden op de dichtstbijzijnde minuut afgerond; de equivalente vertraging staat naast de instelling.

Herkende bezette statussen zijn `on` en `home`; lege statussen zijn `off` en `not_home`. Bij de thuiszone betekent nul personen leeg en een positief aantal bezet. Eén bezet signaal maakt het huis bezet; het huis is pas leeg als alle signalen afwezigheid melden. Als geen signaal aanwezigheid meldt en één onbekend of niet beschikbaar is, is de bezetting onbekend: nieuwe afwezigheden kunnen niet starten. Een geaccepteerde terugkeer blijft gepland. Het paneel toont het gecombineerde resultaat en elke bron.

Kies signalen die werkelijk bezetting vertegenwoordigen: een uitgeschakelde bewegingssensor betekent niet noodzakelijk dat niemand thuis is.

<a id="room-preparation"></a>
## Kamervoorbereiding

Vouw **Kamervoorbereiding** onder het routineverloop uit om alle beheerde klimaatapparaten te zien. De lijst begint ingeklapt. Zonder geaccepteerde toekomstige terugkeer tellen de waarden opgeslagen mogelijkheden: voorbereiding vooraf, alleen aankomst of geen voorbereiding. Bij een geaccepteerde terugkeer telt de gedeelde samenvatting wachtende, voorbereidende, op doel zijnde, onderbroken, onbeschikbare en alleen bij aankomst actieve kamers. Ze toont opgeslagen aankomst en vroegste geschikte geschatte start; kamers kunnen op verschillende tijden starten. Uitvouwen wijzigt geen instellingen en stuurt geen klimaatopdrachten. Hetzelfde overzicht geldt voor wekelijkse en eenmalige terugkeer.

Elke regel noemt de kamer, de bron van het bestemmingsschema en de voorbereidingsstatus. Een klimaatapparaat dat niet in de profielen van de bestemmingsmodus zit, gebruikt nog steeds zijn **Standaard**-schema; expliciet normaal gedrag gebruikt ook Standaard. Een profielschema gebruikt de profielnaam. Een pauze in het bestemmingsprofiel, uitgeschakelde zone of externe uitvoering wordt apart aangeduid en niet als alleen-bij-aankomst gelabeld. Zonder adaptieve voorconditionering volgt een lokale ingeschakelde kamer bij aankomst haar effectieve schema; ze is niet automatisch uitgesloten van moduswijzigingen.

Zonder toekomstige terugkeer beschrijft de lijst de mogelijkheden van de opgeslagen configuratie, geen voorspelling dat de kamer eerder start. Na acceptatie van een terugkeer bepaalt ze elke bestemmingsdoeltemperatuur voor die aankomsttijd en toont wachtend, voorbereidend, doel bereikt, onderbroken of niet beschikbaar met de relevante reden. Ontbrekende temperatuurgegevens of een geldige schatting verhinderen vervroegde voorbereiding; tijdelijke aanpassingen, handmatige aanpassingen en expliciete pauzes behouden hun normale voorrang. Een onbevestigd vertrek kan niet als voorbereidend verschijnen. **Voorbereiden** beschrijft de actieve voorbereidingsopdracht van Velair, niet een bevestiging dat het apparaat een opdracht heeft ontvangen of fysiek draait. **Doel bereikt** betekent dat de actuele gemeten temperatuur binnen de voorbereidingstolerantie ligt en kan al vóór vertrek waar zijn; dit start geen afwezigheid en omzeilt de bevestiging niet.

**Geplande start** is een schatting, geen bewijs van een klimaatopdracht of fysieke gereedheid. Doelen ondersteunen verwarmen, koelen en temperatuurbereiken. Voltooide, geannuleerde en overgeslagen terugkeren gaan terug naar configuratie-informatie in plaats van achterhaalde voorbereidingstijden te tonen. Diagnose gebruikt de opgeslagen backendinstellingen totdat Opslaan slaagt, zonder extra voorbereidingsherinnering. Deze volledige lijst vervangt de oudere zonelijst die alleen een actieve periode toonde.

<a id="one-off-return"></a>
## Eenmalige terugkeer

Kies onder **Eenmalige terugkeer** een toekomstige aankomstdatum en -tijd en selecteer **Terugkeer plannen**. Datum en tijd staan bij elkaar. Op mobiel staat **Terugkeer plannen** op de volgende regel, uitgelijnd met de rechterkant van het tijdveld; grotere indelingen houden de actie naast de velden. De uitleg staat onder de bediening.

Je kunt dit vóór vertrek doen of wanneer je al afwezig bent. Velair gebruikt de opgeslagen modus- en aanwezigheidsinstellingen. Met ingestelde bezettingsbronnen houdt het de aanvraag in behandeling en past het de afwezigheidsmodus pas toe nadat alle bronnen gedurende de bevestigingsvertraging afwezigheid melden, ter bescherming van wie thuis blijft. Zonder opgeslagen bezettingsbronnen geldt het indrukken van **Terugkeer plannen** als expliciete vertrekbevestiging: afwezigheid start onmiddellijk, zonder vertraging. Velair leidt in dat geval niet af dat het huis leeg is en detecteert je fysieke thuiskomst niet; het bereidt kamers normaal voor en activeert de bestemming op het opgeslagen aankomsttijdstip. Een ingestelde onbekende of niet-beschikbare bron blijft wachten; een ontbrekende entiteit wordt niet als lege bronnenlijst behandeld.

De eenmalige datum en tijd vervangen alleen voor deze afwezigheid de wekelijkse tijd. Dit werkt ook met de automatische routine uitgeschakeld. Je kunt de aankondiging wijzigen of annuleren; als vertrek niet vóór aankomst is bevestigd, verloopt ze zonder modi te veranderen. Als alle bronnen al afwezigheid melden en er geen actieve periode is, start het plannen van terugkeer de ingestelde bevestigingsvertraging onmiddellijk: er is geen nieuwe sensorwijziging nodig. Als afwezigheid al actief is, wijzig je datum en tijd via de bestaande aankomst-editor; hiermee wordt de terugkeer een eenmalige uitzondering zonder de afwezigheidsmodus opnieuw toe te passen.

Uitstel van aankomst beëindigt de vorige voorbereiding en herstelt het huidige afwezigheidsgedrag totdat de nieuwe voorbereiding nodig is. Tijdelijke en handmatige aanpassingen blijven beschermd. Het bestemmingsdoel wordt bepaald voor de gekozen lokale aankomstdatum, ook als voorbereiding de vorige dag begint. Het indienen van hetzelfde tijdstip reset de voorbereiding niet. Aankomsten in het verleden of op het huidige tijdstip en niet-bestaande lokale tijden door zomer-/wintertijd worden geweigerd; een dubbel voorkomende lokale tijd gebruikt het eerstvolgende tijdstip dat nog in de toekomst ligt.

Voltooide, overgeslagen en geannuleerde perioden blijven voor de automatische routine geblokkeerd totdat bezetting wordt gedetecteerd, zodat een leeg huis niet vanzelf opnieuw een wekelijks vertrek start. Je kunt na elke inactieve periode expliciet **Terugkeer plannen** kiezen zonder eerst thuis te hoeven zijn. De nieuwe aanvraag gebruikt de huidige aanwezigheidsbronnen en modi. Met bronnen wordt afwezigheid opnieuw gedurende de ingestelde vertraging bevestigd, ook als iedereen al weg is, zonder direct de modus te wijzigen. Zonder bronnen activeert expliciete registratie de afwezigheidsmodus meteen. Zijbalk en dashboardkaart tonen een nieuw planningsformulier zodra een periode inactief wordt. Als plannen niet beschikbaar is, blijft het formulier zichtbaar met **Terugkeer plannen** uitgeschakeld en uitleg over benodigde opgeslagen instellingen en plannerstatus. Een actieve terugkeer kan dan nog worden geannuleerd.

Gebruik na bevestigd vertrek **Annuleren** om de terugkeer te stoppen en de vastgelegde eerdere modus en profielen te herstellen, of **Terugkomst wijzigen** om datum en tijd aan te passen. Tijdens de afwezigheidsbevestiging laat annuleren de actieve selectie ongemoeid, omdat de afwezigheidsmodus nog niet is toegepast. Het uitschakelen van de automatische routine of wijzigen van wekelijkse tijden annuleert een handmatige terugkeer niet. Wijziging van de bijbehorende aanwezigheidsbronnen of modi maakt de eerdere aankondiging ongeldig. Expliciete modus-/profielkeuzes annuleren wachtende en actieve terugkeren. Een gestopte planner voert de terugkeer niet uit.

De eerste regel houdt de titel Eenmalige terugkeer links en bezettingsaanduidingen die alleen op de kaart staan rechts. De huidige fase is een compacte ondertitel aan de titel, zonder aparte statuspil of regel. Tijdens bevestiging geeft de timerproceskop de fase aan. De dashboardkaart groepeert bronaantallen rechtsboven als bronnen zijn ingesteld. Zonder bronnen worden tellers en het ongebruikte vertragingspictogram weggelaten en meldt de zijbalk **Niet bewaakt** in plaats van onbekende bezetting. Het pictogram voor bevestigingsvertraging verschijnt alleen vóór bevestiging van actieve afwezigheid; het is verborgen bij Afwezig/Voorbereiden en actieve fouten na bevestigd vertrek. De zijbalk herhaalt deze aanduidingen niet. Wijs de fase aan voor een korte uitleg.

Tijdens afwezigheidsbevestiging legt een lichte timerregel uit dat Velair controleert of het huis leeg blijft. **Tot** toont de backendbevestigingstermijn in de lokale Home Assistant-tijd, inclusief datum als die afwijkt van vandaag. Velair activeert de afwezigheidsmodus na bevestiging alleen als elke bron nog afwezigheid meldt. Dit is een deadline, geen liveaftelling of bevestigd vertrek. Hetzelfde proces verschijnt wanneer de wekelijkse routine afwezigheid bevestigt voordat een periode bestaat; zonder deadlinegegevens wordt geen tijd verzonnen.

Voordat vertrek bevestigd is, geven een aankomstpictogram en het label **Verwachte aankomst** de opgeslagen terugkeer aan, met toegankelijk label en tooltip. Deze regel staat uitgelijnd met titel en statustekst. De opgeslagen datum/tijd is een compact klikbaar label, zonder potlood of onderstreping. De bevestigde tijdlijn gebruikt hetzelfde pictogram; de opgeslagen aankomstdatum en -tijd vormen een donkerder veldachtige bewerkknop met dezelfde typografie als het vertrek. Selecteer die waarde om de datum-/tijd-editor te openen. De actieregel heeft links een blauwe knop **Terug** met linkerpijl en rechts een groene knop **Terugkomst wijzigen**. Terug verwerpt niet-opgeslagen aankomstwijzigingen en sluit de editor zonder de terugkeer te veranderen.

In een breed zijbalkpaneel blijft de aankomst-editor compact en uitgelijnd met het aankomsteindpunt; de wijzigactie blijft rechts onder de editor. Smalle schermen en de dashboardkaart behouden hun responsieve indeling. Invoervelden blijven verborgen totdat je ze opent. **Terug** herstelt de laatst opgeslagen aankomst en verbergt de velden. Het wist de aankomstwaarschuwing en navigatiebeveiliging; onafhankelijke niet-opgeslagen routine-instellingen blijven beschermd. Opnieuw openen begint bij de opgeslagen aankomst. Tijdens bevestigde afwezigheid is het aankomsteindpunt van de tijdlijn dezelfde bewerkknop, zodat aankomst niet dubbel verschijnt.

Annuleren staat alleen links onder de periode-inhoud als de aankomst-editor gesloten is. Tijdens bewerken is Annuleren verborgen; **Terugkomst wijzigen** staat rechts en **Terug** links om de aankomstwijziging lokaal te verwerpen. Een wijziging in het invoerveld verandert de geplande terugkeer pas wanneer **Terugkomst wijzigen** slaagt. Geslaagde wijzigingen sluiten de editor en geven focus terug aan de opgeslagen aankomst. Mislukte wijzigingen en sensorupdates behouden het open concept. Een melding markeert niet-opgeslagen wijzigingen; navigeren of opnieuw laden waarschuwt voordat ze verloren gaan. Het opslaan van routine-instellingen past een aankomstwijziging niet toe.

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

Dit gebruikt de opgeslagen aanwezigheids- en modusinstellingen en hetzelfde gedrag voor bevestiging, voorbereiding en tijdelijke aanpassingen als **Terugkeer plannen**. Het werkt met de wekelijkse routine uitgeschakeld en wijzigt datum en tijd wanneer afwezigheid al actief is, zonder de afwezigheidsmodus opnieuw toe te passen. Opgeslagen modi en automatische planning moeten werken. Bronnen zijn optioneel voor eenmalige terugkeer: een lege opgeslagen lijst activeert afwezigheid direct; ingestelde bronnen behouden normale bevestigingsregels. Een aankomst in het verleden of op het huidige tijdstip wordt geweigerd zonder de vorige terugkeer te vervangen. Een verlopen of niet-bestaande zomer-/wintertijd wordt geweigerd; bij een dubbel uur kiest Velair het vroegste voorkomen dat nog in de toekomst ligt.

Een wachtende of actieve terugkeer annuleren:

```yaml
action: velair.cancel_planned_return
data: {}
```

Dezelfde annuleringsactie sluit ook een melding van een inactieve periode. Ze stopt voorbereiding en getimede terugkeer en behoudt de blokkering voor automatisch opnieuw starten na annulering. Na bevestigd vertrek herstelt ze de modus en exacte profielselectie van vóór het begin van de periode. Tijdens afwezigheidsbevestiging laat ze de huidige selectie ongemoeid. Een nieuwe expliciete **Terugkeer plannen** kan de inactieve periode vervangen. Zijbalk en kaart gebruiken dezelfde annuleringsactie.

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

Zonder ingestelde bezettingsbronnen activeert **Terugkeer plannen** Afwezig direct. Er is geen bevestigingsstap van vijf minuten. Het annuleren van die actieve terugkeer herstelt Comfort en de twee profielen die direct vóór de start zijn vastgelegd. Een ingestelde onbekende of niet-beschikbare sensor telt niet als afwezigheid van sensoren: deze blijft nieuwe afwezigheidsbevestiging blokkeren.

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

De actie `velair.cancel_planned_return` annuleert een wachtende of actieve bevestigde terugkeer, of sluit een melding van een inactieve periode. Annuleren stopt voorbereiding en de getimede terugkeer en voorkomt automatisch opnieuw starten voor deze afwezigheid. Na bevestigd vertrek herstelt het de eerdere opgeslagen modus-/profielselectie; bij wachtende bevestiging of een eindmelding verandert het de selectie niet. Een nieuwe expliciete **Terugkeer plannen** kan nog steeds een nieuwe periode starten.

<a id="restoration-limits"></a>
### Herstelbeperkingen

Bij een eenmalige terugkeer legt Velair de selectie vast wanneer je **Terugkeer plannen** kiest. Bij de wekelijkse routine gebeurt dit bij afwezigheidsbevestiging, direct vóór het toepassen van de afwezigheidsmodus.

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
## Overzicht en diagnostiek

Overzicht toont bij een wekelijkse/eenmalige periode of problemen een compacte huishoudsamenvatting met herkomst, status en zo nodig bevestigingstermijn of verwachte aankomst. Bij geaccepteerde terugkeer tonen compacte pictogramtellers voorbereidingsaantallen met hulp bij aanwijzen, toetsenbordfocus of tikken. Bevestigd vertrek voegt een alleen-lezen tijdlijn toe met vertrek-/aankomsttijden, de bijbehorende modi en geschatte voorbereidingspunten voor elk geschikt klimaatapparaat. Kleuren horen bij namen in de legenda eronder. Naast elke naam staat op dezelfde regel de geschatte voorbereidingsstart in de Home Assistant-tijdzone en -tijdnotatie; latere dagen bevatten een datum. Punten komen overeen met de 8-pixellegendacirkels; een neutrale verticale streep markeert Nu.

De legenda begint op één regel. Lange namen worden visueel ingekort; **+N klimaatapparaten** toont extra kamers binnen de samenvatting, **Minder tonen** herstelt één regel. Elke kamer behoudt kleur en hulp met volledige naam/starttijd bij aanwijzen, focus of tikken. In- en uitklappen navigeert niet en wijzigt de terugkeer niet. Alleen adaptieve voorbereiding met geldige start wordt getekend; alleen-bij-aankomst, onderbroken, al op doel en onbeschikbare kamers niet. Overlappende punten delen één cirkel in gelijke kleursectoren, één per apparaat. Punten en legendaregels tonen geschatte starttijden bij aanwijzen, focus of tikken. Het zijn actuele schattingen, geen geschiedenis van fysieke apparaatwerking. Met voldoende ruimte staat de tijdlijn naast de samenvatting, anders eronder. Ze meet verstreken afwezigheidstijd, geen thermische voortgang. Selecteer de samenvatting buiten de hulpelementen om details in Voorconditionering te openen; hulp navigeert niet en wijzigt geen terugkeer.

**Volgende gebeurtenissen tijdens actieve terugkeer**

Overzicht en dashboardkaarten met volgende gebeurtenissen tonen de volgende verwachte aansturingswijziging per apparaat met bron Weekschema of Geplande terugkeer. Een weekactie vóór de voorbereidingsstart blijft mogelijk. Zodra terugkeervoorbereiding een apparaat aanstuurt, is de volgende overgang aankomst in plaats van een niet-gerelateerd Afwezig-blok, ook als het doel al bereikt is. Apparaten zonder terugkeeringreep behouden hun weekgebeurtenissen.

Startschattingen zijn gebaseerd op huidige metingen. Aankomst kan temperatuur of HVAC-opties wijzigen, uitschakelen of een gepauzeerd profiel activeren; het is niet noodzakelijk een temperatuurcommando. Tijdelijke/handmatige aanpassingen en pauzes houden voorrang. Onderbroken rijen verklaren de blokkering en tonen alleen een bekende vervaltijd als alle actieve blokkeringen die hebben. Dit belooft geen voorbereidingsstart. Week-/terugkeerrijen delen de compacte indeling: naam, korte bron, tijden, actie en HVAC-modus. De hulp aan het rij-einde verklaart volledige fase, aankomstmodus, onderbrekingsreden/bekende vervaltijd en huidig weekschemareferentie bij terugkeervoorrang via aanwijzen, toetsenbordfocus of tikken. Er is geen statusondertitel onder de naam. Kolombreedtes volgen de breedste waarde van alle rijen, zonder vaste lege ruimte in tijd-, actie- en HVAC-kolommen. Smalle lijsten behouden één regel per gebeurtenis met horizontaal schuiven en een vaste naamkolom; gegevens verhuizen niet naar een extra rij.

Deze voorspellingen bevestigen geen opdrachtuitvoering en wijzigen de uitvoering niet. Bestaande volgende-gebeurtenissensoren en aparte weekvoorbereidingsweergaven behouden hun weekbetekenis. Installeer passende integratie- en frontendversies voor effectieve voorspellingen; een oudere backend levert nog weekgebeurtenissen.

Een paars signaal duidt huidige terugkeeraansturing aan. De bedrijfstoestand blijft zichtbaar; het vervangt verwarmen, koelen, pauze, planning of voorconditionering niet. Toekomstige startschattingen zijn apart gelabeld. Handmatige bediening, Tijdelijke aanpassing en onafhankelijke pauzes houden voorrang. Afwezigheidstoewijzing omvat effectieve afwezigheidsprofielen of expliciet Standaard als afwezigheidsmodus, geen niet-gekoppelde apparaten die hun standaardschema blijven volgen. Voorbereiding mag de Standaard-terugval van de bestemming gebruiken als de backend dat aankomstdoel kiest.

Overzichtszones tonen één compacte terugkeerindicator naast profiel- en comfortindicatoren: de voorbereidingsstatus en zo mogelijk aankomsttemperatuur/-bereik. De hulp beslaat de hele indicator en opent bij aanwijzen, toetsenbordfocus of tikken. Ze verklaart status, geschatte start, aankomst, onderbrekings-/beschikbaarheidsreden en huidige aansturing zonder meerregelig voorbereidingspaneel. Een kamer kan nog Afwezig volgen en toekomstige voorbereiding tonen zonder al terugkeeraansturing te claimen. Ontbrekende schattingen worden niet verzonnen; voltooide, geannuleerde en overgeslagen terugkeren behouden geen actief voorbereidingsvoorbeeld. Klimaatkaarten behouden hun bestaande detailweergave.

Diagnostiek toont huishoudstatus, aansturingsherkomst en voorbereiding per apparaat inclusief onderbrekings-/onbeschikbaarheidsreden. De geschiedeniscategorie Geplande terugkeer registreert betekenisvolle geaccepteerde overgangen zonder herlaadduplicaten. Ze delen de runtimegrens van 100 gebeurtenissen en verdwijnen bij herstart. Categorievoorkeuren blijven opgeslagen. Rapporten bevatten deze informatie en verwijderen operationele modus-/profiel-ID’s. Aansturingsintentie en uitvoeringssucces blijven gescheiden.

<a id="dashboard-card"></a>
## Dashboardkaart

De optionele Lovelace-kaart toont compacte acties voor Eenmalige terugkeer. De kop bevat aantallen bezette, lege en onbekende bronnen en de opgeslagen bevestigingstijd. Geaccepteerde terugkeer toont compacte voorbereidingsstatuslabels met hulp bij aanwijzen, toetsenbord en aanraken voor kamertellingen, aankomst en vroegste geschikte geschatte start. De huishoudtijdlijn gebruikt de paneelgrafiek: gelijke datumtypografie, donker bewerkbaar aankomstveld, neutrale Nu-streep en individuele voorbereidingspunten voor geschikte apparaten. De legenda begint op één regel, klapt binnen de kaart uit met +N en sluit met Minder tonen. Modusnamen staan onder de balk. Apparaatnaam en geschatte start blijven toegankelijk via punt- en legendahulp. Contexthulp verklaart vertrektijd, aankomstpictogram, fase, aanwezigheidstellers en bevestigingstijd via aanwijzen, toetsenbordfocus of tikken; aanwezigheidshulp noemt bijbehorende ingestelde bronnen. Het aankomstveld blijft een bewerkknop; de uitleg zit op het nabije aankomstpictogram. Weekconfiguratie, bronnenlijst en volledige kamervoorbereiding blijven in de zijbalk. Stel het huishouden eerst daar in.

```yaml
type: custom:velair-card
view: planned-return
```

Kies **Geplande terugkeer** in de visuele editor. De kaart gebruikt dezelfde opgeslagen periode als de zijbalk en andere kaarten en ondersteunt toekomstige datums/tijden. Actieve perioden bieden **Annuleren** en **Terugkomst wijzigen**. Annuleren stopt de geaccepteerde terugkeer en herstelt na bevestigd vertrek de eerdere modus-/profielselectie; tijdens bevestiging blijft die ongewijzigd. Na voltooiing, annulering of andere inactiviteit toont de kaart direct een nieuw formulier zonder op aanwezigheid te wachten. Ongeldige configuratie of gestopte planner schakelt plannen/wijzigen uit; actieve terugkeer blijft annuleerbaar. De zijbalk deelt acties en levenscyclus; weekconfiguratie en inschakeling blijven daar. Alleen achterste aanwezigheid-/vertragingsindicatoren zijn kaartspecifiek. Fase, aankomsteditor en tijdlijn worden gedeeld. Tijdens bevestiging vervangt de timerproceskop de ondertitel. Deze huishoudkaart heeft geen thermostaatfilter.

**Klimaatapparaat: status en bediening** biedt **Eenmalige terugkeer** naast Tijdelijke aanpassing en Pauzeren. Schakel in via de actie-editor, kies naamweergave of plaats onder Meer. De editor groepeert deze drie eerst, ook uitgeschakeld. De actie opent dezelfde compacte bediening in het onderste paneel met eenvoudige passende kop en velden van 38 pixels. Bevestigd vertrek gebruikt de verfijnde tijdlijn van Geplande terugkeer met gelijke vertrek-/aankomsttypografie, donker aankomstvlak, neutrale Nu-streep en alleen het voorbereidingspunt van het gekozen apparaat. Het paneel laat voorbereidingsstatuslabels weg en toont apparaatnaam en geschatte start in de legenda. Zonder geldige actuele vroege-voorbereidingsschatting vervangt een korte uitleg de tijdlijn: alleen aankomst, doel bereikt, onderbreking met reden, niet-beschikbare voorbereiding of ontbrekende schatting. Schattingen van andere apparaten worden niet als vervanging gebruikt. Opgeslagen aankomst blijft bewerkbaar en Annuleren beschikbaar, ook zonder tijdlijn. Aanwezigheidsindicatoren blijven in de kop. De actie bestuurt de huishoudterugkeer inclusief andere apparaten en is niet beperkt tot het getoonde apparaat. Herhaalde aftelalinea’s en eerste-startdetails vervallen. De huishoudkaart toont de grafiek voor alle geschikte apparaten met huishoudstatuslabels en legenda.

X sluit het paneel zonder de periode te annuleren. Niet-opgeslagen aankomstwijzigingen vereisen bevestiging van verwerpen; tijdens een lopende actie is sluiten geblokkeerd. Bestaande kaarten houden deze actie verborgen; nieuwe kaarten via de Home Assistant-kiezer schakelen haar in. YAML schakelt expliciet in met <code>type: planned-return</code> in <code>climate_actions</code>.

Tijdens **Afwezig** en **Voorbereiden op aankomst** toont de kaart bevestigd vertrek en opgeslagen aankomst met afwezigheids-/terugkeermodi. De met **Nu**-hulp aangeduide marker volgt verstreken UTC-tijd inclusief klokwissels en blijft binnen de balk. Eindpunten bevatten datums bij verschillende Home Assistant-kalenderdagen. Niet-opgeslagen wijzigingen bewegen de balk niet. Wachtende en eindtoestanden of ontbrekend bevestigd vertrek blijven statisch zonder tijdlijn; een actieve foutperiode met geldig vertrek behoudt tijdlijn en annuleren. Lokale klokken vernieuwen alleen zichtbaar en actief eenmaal per minuut en direct bij zichtbaar worden, zonder backendaanvraag.

In het tabblad Geplande terugkeer vervallen voorbereidingstellers en meerregelige aftelsamenvatting omdat kamerstatussen erboven al uitgelegd zijn. Opgeslagen vertrek en bewerkbare aankomst staan met gelijke typografie boven de balk. Aankomst is een donkerder veldachtige bewerkknop zonder potlood of onderstreping. Afwezigheids-/bestemmingsmodi staan eronder. Een neutrale verticale streep markeert Nu aan het einde van het verstreken segment. Geschikte apparaten krijgen kleine gekleurde punten en een legenda met naam, geschatte voorbereidingsstart en eigen starthulp. Overlappende punten vormen een gesegmenteerde cirkel. De legenda kan binnen het paneel uitklappen en weer sluiten. Onderbroken, al op doel zijnde, alleen bij aankomst actieve en onbeschikbare apparaten blijven in de kamerdetails erboven in plaats van verzonnen punten te krijgen. De huishoudkaart behoudt statuslabels. Kamervoorbereiding blijft erboven beschikbaar; de tijdlijn herhaalt de vroegste start niet in een extra paneel.

Een gewijzigde opgeslagen aankomst of bestemming reset de legenda en verwerpt verouderde schattingen. Een aankomstconcept verandert de opgeslagen projectie niet. Annuleren en aankomstbewerking blijven behouden. Dashboardbediening gebruikt dezelfde grafiek: de huishoudkaart alle geschikte punten en labels, de ingebedde klimaatkaartactie alleen zijn kamer met naam en starttijd in de legenda. Velden blijven compact met Terug-/Wijzigen-acties. De editor openen laat de geaccepteerde tijdlijn ongewijzigd; Terug herstelt de opgeslagen aankomst. Een punt buiten de vertrekgrens staat op de rand; de hulp behoudt de werkelijke schatting. Verstreken voortgang meet tijd tot aankomst, geen thermische ontwikkeling. Zonder huishoudschatting verklaart voorbereidingshulp de bekende status zonder uitgeschakelde voorbereiding te veronderstellen.
