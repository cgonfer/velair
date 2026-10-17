<a id="pause-a-zone-while-windows-are-open"></a>
# Een zone pauzeren zolang ramen open zijn
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](pause-zone-for-open-windows.md) · [Español](pause-zone-for-open-windows.es.md) · [Français](pause-zone-for-open-windows.fr.md) · [Deutsch](pause-zone-for-open-windows.de.md) · [Italiano](pause-zone-for-open-windows.it.md) · [Nederlands](pause-zone-for-open-windows.nl.md) · [Polski](pause-zone-for-open-windows.pl.md) · [Português (Brasil)](pause-zone-for-open-windows.pt-br.md) · [Português (Portugal)](pause-zone-for-open-windows.pt-pt.md) · [Русский](pause-zone-for-open-windows.ru.md) · [Vertaalstatus](../../translation-status.md)

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

Pauzeer één of meer door Velair beheerde klimaatapparaten wanneer een geselecteerd raam of een geselecteerde deur open blijft. Hervat hun schema's alleen wanneer alle contacten bevestigd gesloten zijn en elke actieve pauze nog bij deze automatisering hoort. Home Assistant waarschuwt als een niet-beschikbaar contact veilig hervatten verhindert.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fwindow_pause.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Home Assistant openen en de blueprint Een zone pauzeren zolang ramen open zijn importeren" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/window_pause.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="YAML-bron van Een zone pauzeren zolang ramen open zijn bekijken"></a>
</p>

[Wijzigingslog bekijken](../../../blueprints/changelogs/window_pause.md) · [Terug naar de blueprintindex](../blueprints.nl.md)

Vragen, testervaringen en constructieve feedback zijn welkom in het [officiële blueprintonderwerp op het Home Assistant-communityforum](https://community.home-assistant.io/t/velair-blueprint-pause-a-zone-while-windows-are-open/1021389).

<a id="when-to-use-it"></a>
## Wanneer gebruiken

Gebruik deze blueprint als het openen van een raam of deur Velair tijdelijk moet beletten één of meer klimaatapparaten te wijzigen die bij dezelfde openingen horen. Ze werkt voor verwarming en koeling en kan apparaten tijdens een pauze in hun huidige status laten of uitschakelen.

<a id="requirements"></a>
## Vereisten

- Blueprintversie 1.0.0, Velair 1.6.0 of nieuwer en Home Assistant 2024.6.0 of nieuwer. Velair 1.6.0 biedt de gelijktijdige pauzeredenen met eigen verantwoordelijkheid die deze blueprint gebruikt.
- Eén of meer klimaatentiteiten die Velair al beheert.
- Eén of meer `binary_sensor`-entiteiten met apparaatklasse `window`, `door` of `opening`.
- Voor elk geselecteerd contact moet `on` open en `off` gesloten betekenen.

<a id="configuration"></a>
## Configuratie

- **Managed thermostats:** alle door Velair beheerde apparaten die samen worden gepauzeerd en hervat.
- **Windows and doors:** alle openingen die deze zone beïnvloeden.
- **Climate action while paused:** huidige status behouden of het apparaat uitschakelen.
- **Pause ID:** een vaste verantwoordelijkheids-ID. Behoud de standaard voor één automatisering, of gebruik voor elke afzonderlijke automatisering die dezelfde thermostaat bedient een andere ID.
- **Open delay:** hoe lang ten minste één opening open moet blijven vóór pauzeren.
- **Close delay:** hoe lang alle openingen gesloten moeten blijven vóór hervatten.
- **Availability warning delay:** hoe lang een contact `unknown` of `unavailable` moet blijven vóór een Home Assistant-melding. Standaard 5 minuten.

<a id="example"></a>
## Voorbeeld

Voor een woonkamer met twee ramen:

```text
Managed thermostats:
  - climate.living_room
  - climate.living_room_radiator
Windows and doors:
  - binary_sensor.living_room_left_window
  - binary_sensor.living_room_right_window
Climate action while paused: Turn off
Open delay: 2 minutes
Close delay: 30 seconds
Availability warning delay: 5 minutes
```

Als één raam twee minuten open blijft, pauzeert de blueprint beide woonkamerapparaten en schakelt ze uit. Nadat het laatste raam sluit en beide contacten 30 seconden gesloten blijven, hervat ze elk actief schema.

<a id="how-it-works"></a>
## Werking

Home Assistant volgt drie gecombineerde voorwaarden: ten minste één contact is open, alle contacten zijn gesloten en ten minste één contact is `unknown` of `unavailable`. Elke voorwaarde gebruikt een oorspronkelijke sjabloontrigger met de ingestelde `for`-duur. Als de gecombineerde voorwaarde vóór afloop onwaar wordt, reset Home Assistant de timer en volgt geen actie. Na afloop controleert de korte actie alle contacten opnieuw voordat ze kan pauzeren, hervatten of waarschuwen.

Open-besturing, gesloten-besturing en beschikbaarheidsdiagnose gebruiken onafhankelijke gebeurtenisgestuurde triggers. Een open contact kan de zone daarom na de openvertraging pauzeren, ook als een ander gekozen contact niet beschikbaar is. Dat onbeschikbare contact verhindert nog steeds dat alle contacten als gesloten gelden en de zone hervat.

Als een contact gedurende de waarschuwingsvertraging `unknown` of `unavailable` blijft, maakt Home Assistant één blijvende melding voor de volledige thermostaatgroep. Deze noemt de betrokken contacten en geselecteerde thermostaten en verklaart waarom ze niet worden hervat. De status wordt na de vertraging opnieuw gecontroleerd: een oudere uitvoering eindigt vóór de melding als alle contacten hersteld zijn. Een gecombineerde hersteltrigger verwijdert de waarschuwing. Dankzij een vaste meldings-ID werken latere uitvoeringen dezelfde waarschuwing bij in plaats van duplicaten te maken.

Na opstarten voert één hersteluitvoering de drie controles uit als interne parallelle takken. Elke tak controleert eerst haar gecombineerde voorwaarde, wacht tot de ingestelde duur op de tegengestelde voorwaarde en stopt direct als die optreedt. De open-tak kan apparaten dus pauzeren terwijl de beschikbaarheidstak wacht. Ze handelt alleen na timeout en een laatste geslaagde gecombineerde controle. Home Assistant kan niet reconstrueren hoe lang een voorwaarde vóór opstarten gold; deze onderbreekbare opstarttimers beginnen daarom vanaf nul. Daarna gebruikt de normale werking de eerder beschreven ononderbroken sjabloontriggertimers. Er is geen polling.

Automatiseringsruns kunnen overlappen, zodat `opened_due` niet wordt geblokkeerd terwijl de opstartbeschikbaarheidstak wacht. Die wachttijd gebruikt slechts één van de begrensde parallelle plaatsen. Acties komen veilig tot de actuele uitkomst doordat elke apparaatiteratie de huidige gecombineerde contactstatus opnieuw controleert, Velair wijzigingen van tijdelijke instellingen per apparaat achtereenvolgens afhandelt en een tegengestelde gecombineerde trigger bij veranderde omstandigheden de latere pauze- of hervattingsbeslissing toepast.

<a id="safety-and-precedence"></a>
## Veiligheid en voorrang

Als het actieve blok **Alleen temperatuur** gebruikt, past hervatten na het sluiten van de ramen de doeltemperatuur opnieuw toe zonder een HVAC-moduswijziging te vragen. Als de blauwdruk het klimaatapparaat uitschakelde, blijft het uit. Gebruik indien nodig een expliciete modus in een later blok of schakel handmatig in. **Huidige modus behouden** behoudt het bestaande herstartgedrag. Dit is het beleid van het actieve blok, geen nieuwe blauwdrukinvoer; opnieuw importeren is niet nodig.

De blueprint maakt elke pauze met de ingestelde **Pause ID**. Standaard is dit `velair_window_guard`; Velair bewaart deze verantwoordelijkheid afzonderlijk voor elke geselecteerde thermostaat.

- Ze vervangt geen handmatige pauze of pauze van een andere automatisering.
- Alle ramen sluiten hervat alleen pauzes met dezelfde ID.
- Handmatig pauzeren of hervatten in Velair blijft bepalend.
- Bestaande scripts en automatiseringen zonder `pause_id` behouden hun gedrag.
- Contacten met `unknown` en `unavailable` worden nooit als veilig gesloten beschouwd.
- Beschikbaarheidswaarschuwingen omzeilen of wijzigen pauzeverantwoordelijkheid niet; ze verklaren alleen waarom veilig hervatten niet kan.

Elk apparaat krijgt een afzonderlijke serviceaanroep en de relevante gecombineerde contactstatus wordt onmiddellijk vóór elke aanroep opnieuw gecontroleerd. Een Home Assistant-servicefout verschijnt in de automatiseringstrace, maar `continue_on_error` laat de blueprint doorgaan met de overige apparaten. Tijdelijke aanpassingen, pauzeren, hervatten en vervallen worden per klimaatzone onafhankelijk achtereenvolgens afgehandeld.

<a id="limitations"></a>
## Beperkingen

- Gebruik bij voorkeur één automatisering met alle relevante openingen voor dezelfde thermostaatgroep.
- Als afzonderlijke raamautomatiseringen dezelfde thermostaat moeten bedienen, geef elke een andere vaste **Pause ID**. Zo maken ze onafhankelijke pauzeredenen aan en kan elke automatisering alleen haar eigen reden verwijderen.
- De blueprint kan wijzigingen via een infraroodafstandsbediening niet betrouwbaar interpreteren als de apparaatintegratie ze niet aan Home Assistant meldt.
- Onderbreekbare opstarthersteltimers beginnen bij nul, omdat Home Assistant de timerhistorie van vóór herstart niet kan herstellen.
- Meldingen gebruiken de ingebouwde Home Assistant-integratie `persistent_notification`.
- De meldings-ID gebruikt de Home Assistant-automatiseringsentiteits-ID, zodat ze kort en onafhankelijk van thermostaatkeuze of volgorde blijft. Hernoemen kan een eerdere melding laten staan die je handmatig kunt verwijderen.
- Maximaal 50 runs mogen overlappen. Home Assistant waarschuwt als een uitzonderlijke gebeurtenispiek deze plaatsen vult; normale voorwaardegestuurde runs blijven kort.

<a id="troubleshooting"></a>
## Problemen oplossen

- Als de zone nooit pauzeert, controleer of ten minste één gekozen contact bij openen `on` meldt en langer open blijft dan de openvertraging.
- Als de zone niet hervat, controleer of elk contact `off` meldt. Na de waarschuwingsvertraging noemt de blijvende melding contacten die nog `unknown` of `unavailable` melden.
- Als een beschikbaarheidswaarschuwing na herstel blijft, controleer of het contact een nieuwe statuswijziging heeft verstuurd. Opnieuw laden of uitvoeren van de automatisering controleert alle contacten opnieuw en verwijdert een achterhaalde waarschuwing.
- Als een service een onbeheerde entiteit meldt, voeg dat klimaatapparaat aan Velair toe. Servicefouten stoppen overige apparaten niet; bekijk de trace voor afzonderlijke fouten.
- Als sluiten van ramen de zone gepauzeerd laat, controleer of de actieve pauze handmatig of door een andere automatisering is gemaakt. De blueprint laat deze bewust ongemoeid.
- Als meerdere automatiseringen hetzelfde apparaat bedienen, combineer de openingen of controleer of elke automatisering een andere vaste **Pause ID** gebruikt.

<a id="updating-and-customizing"></a>
## Bijwerken en aanpassen

Importeer de doorlopende `main`-URL opnieuw voor een compatibele update. Versie 1 behoudt bestaande invoernamen en nieuwe invoer heeft een standaardwaarde, zodat geen automatiseringsmigratie nodig is. Een toekomstige niet-compatibele versie krijgt een nieuwe bestandsnaam en hoofdversie in plaats van deze URL te vervangen. Velair bewerkt nooit Home Assistant-automatiseringen of `.storage` om een blueprint te migreren. Gebruik **Controle overnemen** alleen als je meer eigen gedrag nodig hebt dan de aangeboden contacten, acties en vertragingen; de zelfstandige automatisering ontvangt dan geen blueprintupdates meer.
