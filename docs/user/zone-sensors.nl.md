<a id="zone-control-and-delivery-sensors"></a>
# Sensoren voor zonebesturing en overdracht
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](zone-sensors.md) · [Español](zone-sensors.es.md) · [Français](zone-sensors.fr.md) · [Deutsch](zone-sensors.de.md) · [Italiano](zone-sensors.it.md) · [Nederlands](zone-sensors.nl.md) · [Polski](zone-sensors.pl.md) · [Português (Brasil)](zone-sensors.pt-br.md) · [Português (Portugal)](zone-sensors.pt-pt.md) · [Русский](zone-sensors.ru.md) · [Vertaalstatus](../translation-status.md)

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

Velair maakt twee contextsensoren voor elke beheerde `climate.*`-entiteit:

- **Bediening** geeft aan wie de zone nu bestuurt en welke Velair-configuratie geldt.
- **Leveringsdiagnose** geeft aan wat er gebeurde toen Velair voor het laatst via Home Assistant een klimaatdoel probeerde te versturen.

Ze beschrijven verschillende lagen. Een zone kan automatisch worden bestuurd terwijl de laatste overdracht mislukt of niet beschikbaar is; de sensoren vervangen elkaar dus niet.

De afzonderlijke sensor **Omgevingsconditie** biedt ingeschakelde `derived_metrics` en de geordende runtime-inzichten `insights` wanneer Comfort actief is. Inzichten bevatten `code`, `kind`, `tone` en onderbouwende `metrics`; ze dienen alleen ter informatie en voeren nooit klimaatopdrachten uit. Zie [Omgevingscomfort](comfort.nl.md#comfort-insights).

Met optionele buitenvergelijking bevat dezelfde sensor ook `outdoor`: bronmetingen, afzonderlijke absolute luchtvochtigheid binnen en buiten, onafhankelijke kwaliteit en de betekenisvolle ventilatiekans of afweging. Velair maakt geen proxy-entiteiten voor afzonderlijke metingen. Wel wordt één aparte enum-sensor **Ventilatiemogelijkheid** gemaakt voor de door de backend bepaalde automatiseringssamenvatting hieronder.

<a id="environmental-condition"></a>
## Omgevingsconditie

**Omgevingsconditie** is de actuele statusbron voor Comfort-automatiseringen. Deze staat standaard aan voor elk beheerd apparaat en volgt dezelfde backendbeoordeling als het paneel. Uitlezen vraagt geen sensoren voortdurend op en voert geen klimaatopdracht uit.

De oorspronkelijke status behoudt de compatibele fysieke classificatie van temperatuur en luchtvochtigheid:

| Status | Betekenis |
| --- | --- |
| `monitoring_off` | Comfort-bewaking is voor dit apparaat uitgeschakeld. |
| `no_readings` | Momenteel is geen bruikbare gevolgde meting beschikbaar. |
| `temperature_comfortable` | Alleen temperatuur is te beoordelen en ligt binnen het ingestelde bereik. |
| `humidity_comfortable` | Alleen luchtvochtigheid is te beoordelen en ligt binnen het ingestelde bereik. |
| `comfortable` | Temperatuur en luchtvochtigheid liggen beide binnen hun bereik. |
| `cold` / `hot` | Temperatuur ligt onder of boven het bereik. |
| `dry` / `humid` | Luchtvochtigheid ligt onder of boven het bereik. |
| `cold_and_dry` / `cold_and_humid` | Beide metingen zijn bruikbaar; temperatuur ligt onder bereik. |
| `hot_and_dry` / `hot_and_humid` | Beide metingen zijn bruikbaar; temperatuur ligt boven bereik. |

Deze waarden blijven compatibel met bestaande automatiseringen. Ze beschrijven ingestelde fysieke bereiken, geen medische of universele uitspraak over persoonlijk comfort.

<a id="environmental-condition-attributes"></a>
### Attributen van Omgevingsconditie

| Attribuut | Betekenis |
| --- | --- |
| `data_quality` | `complete`, `unverified`, `partial`, `stale` of `unavailable` voor gevolgde binnenmetingen. `unverified` betekent dat de metingen bruikbaar zijn, maar minstens één geen verifieerbaar tijdstip van rapportage heeft. |
| `data_issues` | Stabiele codes voor ontbrekende, verouderde of ongeldige binnengegevens. Weggelaten wanneer leeg. |
| `range_summary` | Feitelijke bereiksamenvatting met optionele Humidex-afstemming. |
| `ventilation_opportunity` | Actuele backendbepaalde ventilatiestatus, reikwijdte, effecten, blokkades en reden. |
| `comfort_zone` | Gekozen eenvoudig, begeleid of aangepast temperatuurafhankelijk doelgebied en actueel effectief luchtvochtigheidsbereik. |
| `temperature_source` | Huidige bron-ID voor binnentemperatuur, indien beschikbaar. |
| `humidity_source` | Huidige bron-ID voor binnenluchtvochtigheid, indien beschikbaar. |
| `derived_metrics` | Gegevens van ingeschakelde Humidex, dauwpunt en absolute luchtvochtigheid. Niet-gevolgde metingen ontbreken. |
| `outdoor` | Optionele binnen-/buitenvergelijking, effectieve adviesdrempels, gegevenskwaliteit, metingen en kans of afweging. |
| `insights` | Geordende informatieve codes met `code`, `kind`, `tone` en onderbouwende `metrics`. Weggelaten wanneer leeg. |

`derived_metrics` en `outdoor` ontbreken als hun functie niet is ingeschakeld. Bij ontbrekende, verouderde of ongeldige ingeschakelde metingen blijven gegevens met `availability` en probleemcontext aanwezig, zodat automatiseringen geen oude waarde hergebruiken. `insights` ontbreekt bij een lege lijst. Onbewerkte binnentemperatuur en -luchtvochtigheid blijven op de bronentiteiten; CO2-classificatie staat op de aparte sensor **Luchtkwaliteit**.

Bij begeleide of aangepaste temperatuurafhankelijke modellen is `comfort_zone.effective_humidity_range` `null` als de temperatuur onbruikbaar is. Luchtvochtigheid kan zichtbaar blijven, maar heeft geen conditie en mag niet als binnen of buiten een geraden bereik worden behandeld.

`range_summary` bevat:

```yaml
status: within_range | outside_range | mixed | unavailable
thermal_relation: aligned | mixed | not_evaluated | unavailable
positions:
  temperature: below | within | above | null
  humidity: below | within | above | null
  humidex: below | within | above | null
```

Dit sjabloon herkent bijvoorbeeld gemengde thermische indicatoren zonder een vertaald label te ontleden:

```yaml
{% set summary =
   state_attr('sensor.velair_environmental_condition_living_room',
              'range_summary') %}
{{ summary is mapping and summary.get('thermal_relation') == 'mixed' }}
```

Deze voorwaarde controleert of ingeschakelde Humidex actueel is en boven het ingestelde temperatuurbereik ligt:

```yaml
{% set metrics =
   state_attr('sensor.velair_environmental_condition_living_room',
              'derived_metrics') or {} %}
{% set humidex = metrics.get('humidex', {}) %}
{{ humidex.get('availability') == 'current'
   and humidex.get('temperature_range_position') == 'above' }}
```

Deze voorwaarde gebruikt één backendbepaalde inzichtcode en blijft geldig na taalwijziging:

```yaml
{% set insights =
   state_attr('sensor.velair_environmental_condition_living_room',
              'insights') or [] %}
{{ insights
   | selectattr('code', 'eq', 'ventilation_may_help_cool')
   | list | count > 0 }}
```

Controleer bij optionele buitenvergelijking beschikbaarheid voordat je een getal gebruikt:

```yaml
{% set outdoor =
   state_attr('sensor.velair_environmental_condition_living_room',
              'outdoor') or {} %}
{% set comparison = outdoor.get('comparison', {}) %}
{% set thresholds = outdoor.get('guidance_thresholds', {}) %}
{% set temperature = comparison.get('temperature', {}) %}
{{ temperature.get('availability') == 'current'
   and temperature.get('potential') == 'cooling'
   and thresholds.get('temperature_delta') is number }}
```

<a id="entity-or-event"></a>
### Entiteit of gebeurtenis?

Gebruik deze entiteit wanneer een automatisering de actuele status nodig heeft, ook na Home Assistant-herstart. Een normale statustrigger kan op een compatibele fysieke classificatie reageren:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_environmental_condition_living_room
    to: hot_and_humid
```

Gebruik `comfort_assessment_changed` als de automatisering moet weten wat veranderde. `previous_range_summary`, `range_summary_changed` en `range_status_changed` onderscheiden een bereiksovergang van een andere Comfort-update. Zie [Comfort-beoordeling gewijzigd](automation-events.nl.md#comfort-assessment-changed) voor alle gegevens en een kopieerbare automatisering.

<a id="ventilation-opportunity"></a>
## Ventilatiekans

De zonesensor **Ventilatiemogelijkheid** werkt gebeurtenisgestuurd en dient ter informatie:

| Status | Betekenis |
| --- | --- |
| `unavailable` | Comfort, buitenvergelijking of een vereiste ingestelde meting kan nu niet worden beoordeeld. |
| `no_opportunity` | Buitenlucht overschrijdt adviesdrempels niet in een nuttige richting. |
| `may_help` | Buitenlucht brengt de kamer richting Comfort, maar Velair kan niet vaststellen dat het volledige doelgebied wordt bereikt. |
| `comfort_possible` | Buitentemperatuur ligt binnen bereik en, bij gevolgde luchtvochtigheid, ligt buitenluchtvochtigheid binnen de Comfort-band die bij die buitentemperatuur geldt. |
| `trade_off` | Een nuttige verandering in één gevolgde dimensie verergert aantoonbaar een andere. |
| `already_comfortable` | De fysieke omgevingsconditie is al comfortabel. |

`comfort_possible` is een voorzichtige omgevingsprojectie, geen belofte over raamopenen. Velair kent luchtstroming, wind, regen, buitenvervuiling, zonnewarmte, thermische massa of de openingsduur niet. Het opent nooit een raam en verandert klimaatbesturing niet.

Attributen bevatten `evaluation_scope`, `potential_effects`, `blocked_by`, `reason`, buiten-`data_quality` en `data_issues` en ingestelde buitenbron-ID's. Bij gevolgde binnenluchtvochtigheid zonder buitenluchtvochtigheid kan temperatuur `may_help`, maar nooit `comfort_possible` geven. Als luchtvochtigheidsbewaking bewust uitstaat, is een temperatuurgebaseerd `comfort_possible` geldig.

`reason` is een stabiele machineleesbare code met waarden: `monitoring_off`, `outdoor_comparison_disabled`, `indoor_temperature_unavailable`, `indoor_humidity_unavailable`, `outdoor_temperature_unavailable`, `outdoor_humidity_unavailable`, `already_comfortable`, `known_trade_off`, `no_useful_difference`, `outdoor_conditions_within_comfort`, `outdoor_humidity_not_configured` en `moves_toward_comfort`.

Voor een apparaat zoals `climate.living_room` gebruikt een nieuw registeritem normaal ID's zoals:

```text
sensor.velair_ventilation_opportunity_living_room
sensor.velair_control_living_room
sensor.velair_delivery_diagnostics_living_room
```

Dit zijn voorgestelde ID's, geen blijvende API. Home Assistant kan achtervoegsels toevoegen bij botsingen en gebruikers kunnen entiteiten hernoemen. Kies de werkelijke ID's uit jouw register. De weergavenaam gebruikt de vriendelijke apparaatnaam, de voorgestelde ID de object-ID van het klimaatapparaat. De Velair-serviceapparaatnaam en het gebied maken daar geen deel van uit.

<a id="zone-control"></a>
## Zonebesturing

**Bediening** staat standaard aan en wordt na elke herstart vanuit de planner opgebouwd. De status noemt de huidige bestuurder:

| Status | Betekenis |
| --- | --- |
| `automatic` | Velair bestuurt lokaal. Dit omvat gepland, inactief, gepauzeerd, gestopt, tijdelijke aanpassing en adaptieve voorconditionering. Onderscheid deze met `runtime_state`. |
| `manual` | Velair geeft voorrang aan een handmatige aanpassing, expliciet of na een gedetecteerde externe wijziging. Dit verschilt van Velair-modus **Handmatig**, die profielkeuze beschrijft. |
| `external` | Een ondersteunde externe schema-aanbieder voert de zone fysiek uit. Een kaart-, afstandsbedienings- of automatiseringswijziging veroorzaakt deze status niet; voorrang daaraan geven is `manual`. |

De sensor blijft beschikbaar bij een vereiste eenheidsmigratie, omdat besturingsinformatie geen temperatuurwaarde is.

<a id="zone-control-attributes"></a>
### Attributen van zonebesturing

| Attribuut | Waarden of betekenis |
| --- | --- |
| `runtime_state` | `idle`, `scheduled`, `preconditioning`, `boost`, `paused`, `stopped`, `externally_managed`, `temperature_migration_required` of defensieve terugval `unknown`. |
| `schedule_source` | `default` voor Standaard, `profile` voor een effectief profielschema of `profile_pause` wanneer het profiel de zone pauzeert. |
| `profile_id` / `profile_name` | Vaste ID en naam van het besturende profiel, indien van toepassing. |
| `mode_id` / `mode_name` | Vaste ID en naam van de gekozen eigen modus, indien van toepassing. |
| `manual_source` | Alleen bij `manual`: `explicit` voor rechtstreeks kiezen, `external_change` voor voorrang aan een gedetecteerde apparaatwijziging of defensieve terugval `other`. |
| `manual_started_at` | Begin van de huidige handmatige aanpassing. |
| `manual_until` | Gepland einde indien het beleid dat heeft; kan ontbreken bij onbeperkte aanpassing. |
| `manual_policy` | Alleen bij `manual`: `until_next_block`, `for_duration`, `until_resumed` of defensieve terugval `unknown`. |

Niet-toepasselijke optionele attributen ontbreken. Een `automatic`-entiteit heeft bijvoorbeeld geen `manual_source` of `manual_until`.

Besturingsstatus en runtime-status zijn bewust gescheiden:

- `automatic` met `runtime_state: paused`: Velair bestuurt nog, maar een pauze blokkeert normale uitvoering;
- `automatic` met `runtime_state: boost`: Velair beheert de tijdelijke aanpassing;
- `external` met `runtime_state: externally_managed`: de ingestelde externe aanbieder beheert fysieke uitvoering, niet Velairs lokale opdrachtoverdracht.

<a id="zone-delivery-diagnostics"></a>
## Diagnose van zone-overdracht

**Leveringsdiagnose** is standaard uitgeschakeld. Schakel deze diagnose-entiteit alleen in als een dashboard of automatisering de nieuwste lokale overdrachtsgegevens nodig heeft:

1. Open **Instellingen > Apparaten & diensten > Entiteiten** in Home Assistant.
2. Zoek op de apparaatnaam gevolgd door **delivery diagnostics**.
3. Open de entiteitsinstellingen en schakel in.

De sensor werkt gebeurtenisgestuurd zonder polling. De status beschrijft de laatste waargenomen overdrachtsuitkomst sinds de integratie is gestart:

| Status | Wanneer |
| --- | --- |
| `idle` | Sinds opstarten of wissen van runtimebewijs is geen uitkomst geregistreerd. |
| `success` | Home Assistant accepteerde de volledige reeks klimaatservices. `retry_count` geeft eerste of herhaalpoging aan. |
| `failed` | Home Assistant weigerde een serviceaanroep. Plannerwerk gaat normaal naar begrensd herstel; een eenmalige actie zonder herstel kan mislukt blijven. |
| `retrying` | Velair begon een begrensde herhaalpoging na een herstelbare fout. Kan kort zichtbaar zijn. |
| `exhausted` | De eerste plannerpoging en beide uitgestelde herhaalpogingen mislukten. |
| `invalid_intent` | Tijdens herstel kon de actuele opdracht niet meer naar een geldige overdracht worden omgezet. Normale service- en configuratiefouten worden vóór deze status geweigerd. |
| `cancelled` | Actief of uitgesteld werk is door nieuwere opdrachten vervangen, expliciet ongeldig gemaakt of wachtend gestopt. Kan kort zijn als nieuw werk direct start. |
| `unavailable` | Het apparaat ontbreekt, is `unknown` of `unavailable`; Velair verstuurde geen serviceaanroep. Geschikte planneropdrachten worden bij herstel opnieuw bepaald. |

De diagnose-entiteit zelf blijft beschikbaar, zodat `unavailable` als status zichtbaar is. Ze blijft ook beschikbaar bij verplichte eenheidsmigratie; vastgelegde temperatuurgegevens houden de eenheid van het geaccepteerde doel.

Velair probeert maximaal twee keer uitgesteld opnieuw, na ongeveer 2 en 10 seconden. Dit zijn hersteltijden, geen aanbevolen automatiseringsafspraak; reageer op statussen in plaats van exacte vertragingen.

<a id="delivery-diagnostic-attributes"></a>
### Overdrachtsdiagnose-attributen

| Attribuut | Betekenis |
| --- | --- |
| `updated_at` | Nieuwste statuswijziging; ontbreekt bij de eerste `idle`-status. |
| `retry_count` | Pogingsnummer van eind- of herhaalstatus: `0` voor eerste, daarna `1` of `2`. Annuleren reset naar `0`. |
| `last_error_at` | Tijd van nieuwste `failed`, `exhausted` of `invalid_intent`. |
| `last_error_code` | `failed`, `exhausted`, `invalid_intent` of defensieve terugval `unknown_delivery_status`. Onbewerkte fouttekst verschijnt nooit. |
| `last_accepted_at` | Tijd waarop Home Assistant de nieuwste volledige Velair-besturingsreeks accepteerde. |
| `last_accepted_source` | `automatic`, `manual`, `boost` of `automatic_reassertion`. |
| `last_accepted_action` | `set_temperature`, `set_hvac_mode`, `turn_off` of defensieve terugval `other`. |
| `last_accepted_hvac_mode` | HVAC-modus in het geaccepteerde doel, indien van toepassing. |
| `last_accepted_temperature_unit` | Eenheid vastgelegd bij enkel doel of bereik. |
| `last_accepted_temperature` | Geaccepteerde afzonderlijke doeltemperatuur, indien van toepassing. |
| `last_accepted_target_temp_low` / `last_accepted_target_temp_high` | Geaccepteerde onder- en bovengrens bij een oorspronkelijk bereik. |

`velair.set_temperature` en `velair.set_hvac_mode` worden beide gemeld met `last_accepted_source: manual`. Een geslaagde alleen-modusaanroep heeft `last_accepted_action: set_hvac_mode` en een HVAC-modus; alle temperatuurdoelattributen ontbreken of zijn `null`.

Laatste fout en laatste acceptatie zijn onafhankelijke geschiedenis. Latere `success` verandert de huidige status, maar wist eerdere `last_error_*` niet. Een latere fout wist het laatst geaccepteerde doel evenmin. Vergelijk tijdstippen als je automatisering dat nodig heeft.

`success` betekent dat Home Assistant de serviceaanroepen heeft geaccepteerd, niet dat transport, fysieke werking of doeltemperatuur bevestigd zijn. Gebruik klimaatentiteit en apparaatintegratie voor fysieke status. Room Assist kan later het verstuurde doel veranderen en heeft een eigen sensor voor die correctie. Externe schemapublicatie heeft ook een eigen Velair-status en valt niet onder deze lokale overdrachtssensor.

Alle overdrachtsgegevens bestaan alleen tijdens runtime. Ze keren na integratie- of Home Assistant-herstart terug naar `idle`; een geslaagde Velair-reset wist ze ook. Recorder of Velair-opslag herstelt ze niet.

<a id="automation-examples"></a>
## Automatiseringsvoorbeelden

Deze automatisering meldt pas als de begrensde herhaalpogingen op zijn. Vervang de voorbeeld-ID door de werkelijke register-ID:

```yaml
alias: Velair living room delivery exhausted
triggers:
  - trigger: state
    entity_id: sensor.velair_delivery_diagnostics_living_room
    to: exhausted
actions:
  - action: persistent_notification.create
    data:
      title: Velair delivery problem
      message: >-
        The living room target could not be delivered after
        {{ trigger.to_state.attributes.retry_count }} retries.
```

Deze sjabloonvoorwaarde controleert of Velair nu automatisch bestuurt en een actief schemablok heeft:

```yaml
condition: template
value_template: >-
  {{ is_state('sensor.velair_control_living_room', 'automatic')
     and state_attr('sensor.velair_control_living_room', 'runtime_state')
         == 'scheduled' }}
```

Gebruik **Bediening** voor actuele bestuurder en plannercontext, **Leveringsdiagnose** voor de nieuwste overdrachtsuitkomst en `climate.living_room` voor de gemelde apparaatstatus.
