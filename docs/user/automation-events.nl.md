<a id="automation-events"></a>
# Automatiseringsgebeurtenissen
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](automation-events.md) · [Español](automation-events.es.md) · [Français](automation-events.fr.md) · [Deutsch](automation-events.de.md) · [Italiano](automation-events.it.md) · [Nederlands](automation-events.nl.md) · [Polski](automation-events.pl.md) · [Português (Brasil)](automation-events.pt-br.md) · [Português (Portugal)](automation-events.pt-pt.md) · [Русский](automation-events.ru.md) · [Vertaalstatus](../translation-status.md)

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

Velair publiceert onbewerkte, tijdelijke Home Assistant-gebeurtenissen voor wijzigingen tijdens de uitvoering. De gegevens op de gebeurtenissenbus bestaan alleen terwijl Home Assistant ze aflevert. Velair biedt geen archief of API om gebeurtenissen opnieuw af te spelen. Het openen of vernieuwen van het paneel veroorzaakt deze gebeurtenissen niet.

Diagnostiek staat hier los van. Voor ingeschakelde categorieën kan het een opgeschoonde samenvatting van bepaalde gebeurtenissen bewaren in een begrensde geschiedenis in het geheugen, met maximaal 100 vermeldingen. Deze geschiedenis wordt gewist wanneer Velair of Home Assistant opnieuw opstart. Het is geen Recorder-geschiedenis en verlengt de levensduur van de oorspronkelijke automatiseringsgebeurtenis niet.

Alle gebeurtenissen gebruiken:

```yaml
event_type: velair_event
```

Filter op `event_data.event` en, voor zonegebeurtenissen, op `event_data.entity_id`:

```yaml
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: climate_target_applied
      entity_id: climate.living_room
```

Elke gegevensset bevat `domain: velair` en een van de onderstaande gebeurtenisnamen.

<a id="external-climate-change-detected"></a>
## Externe apparaatwijziging gedetecteerd

`external_climate_change_detected` wordt gepubliceerd wanneer de HVAC-modus of doeltemperatuur van een beheerde klimaatentiteit verandert zonder dat Velair deze wijziging aan een eigen actie kan toeschrijven. Dit is een waarneming: `non-Velair` betekent niet noodzakelijk dat een persoon iets heeft gewijzigd. De bron kan ook een afstandsbediening of andere automatisering zijn.

De detectie omvat `hvac_mode`, de enkele doeltemperatuur `temperature` en het oorspronkelijke bereik `target_temp_low`/`target_temp_high`. Omgevingsmetingen en opties voor ventilator, apparaatpreset, oscillatie of luchtvochtigheid veroorzaken deze gebeurtenis niet. Overgangen van of naar `unknown` en `unavailable` worden genegeerd. Zie [Externe wijzigingen en handmatige aanpassingen](manual-control.nl.md) voor toeschrijving, beperkingen, beleidskeuzes en volledige tijdlijnen.

```yaml
domain: velair
event: external_climate_change_detected
entity_id: climate.living_room
changed_fields: [hvac_mode, temperature]
previous:
  hvac_mode: "off"
  temperature: 24
current:
  hvac_mode: "cool"
  temperature: 23
policy: keep_automatic
```

`policy` is het beleid dat voor de wijziging geldt. Tijdens een actieve handmatige aanpassing blijft het beleid van die sessie gelden, ook als de standaard voor toekomstige sessies inmiddels in Instellingen is gewijzigd. `keep_automatic` betekent dat Velair geen handmatige aanpassing heeft gestart, maar opnieuw heeft bepaald welke regeling voorrang heeft. Bij deze detectie hoort daarom geen `zone_control_changed`-gebeurtenis voor het starten van een sessie.

`zone_control_changed` wordt gepubliceerd wanneer de zone een handmatige aanpassing start of terugkeert naar automatische regeling. `control_mode` is `manual` of `automatic` en staat bewust los van de Velair-modus Handmatig.

```yaml
domain: velair
event: zone_control_changed
entity_id: climate.living_room
control_mode: manual
previous_control_mode: automatic
policy: for_duration
source: external_change
duration_minutes: 60
started_at: "2026-08-20T18:00:00+02:00"
until: "2026-08-20T19:00:00+02:00"
```

`source` is `external_change` wanneer een externe aanpassing de sessie heeft gestart, en `explicit` wanneer het paneel of `velair.enter_manual_adjustment` de actuele apparaatinstellingen heeft vastgelegd. `duration_minutes` is alleen aanwezig bij `for_duration`.

Bij `until_resumed` ontbreekt `until`. Automatisch beëindigen bevat `reason: expired`; expliciet beëindigen bevat `reason: resumed`. Het beëindigen van een handmatige aanpassing verwijdert geen onafhankelijke pauzereden die de uitvoering van het schema nog kan blokkeren.

De overeenkomstige serviceacties zijn:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: for_duration
  duration_minutes: 60
```

```yaml
action: velair.resume_automatic_control
data:
  entity_id: climate.living_room
```

<a id="diagnostic-issue-changed"></a>
## Diagnostisch probleem gewijzigd

`diagnostic_issue_changed` wordt gepubliceerd wanneer een aantoonbaar diagnostisch probleem wordt gedetecteerd of opgelost. Problemen die bij het opstarten al aanwezig zijn, vormen de uitgangssituatie. Opnieuw opstarten veroorzaakt dus geen reeks meldingen over bestaande problemen. Ongewijzigde problemen worden niet opnieuw gemeld.

De identiteit van een probleem bestaat uit `code`, eventueel de `entity_id` van een beheerde klimaatentiteit en eventueel het sensorveld `purpose`. De gegevens bevatten geen onbewerkte foutmelding, identificatie van een profiel, modus of pauze, of veronderstelde oorzaak. `change` is `detected` of `resolved`; `severity` is `warning` of `error`.

```yaml
domain: velair
event: diagnostic_issue_changed
change: detected
severity: error
code: delivery_exhausted
entity_id: climate.living_room
```

Bijvoorbeeld: stuur een melding wanneer Velair een nieuwe fout detecteert:

```yaml
alias: Notify about new Velair errors
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: diagnostic_issue_changed
      change: detected
      severity: error
actions:
  - action: notify.notify
    data:
      message: "Velair detected an error. Open Diagnostics for details."
```

Gebruik voor de algemene toestand de sensor **Diagnosestatus**. Je kunt het entiteits-ID wijzigen in Home Assistant; selecteer de sensor daarom in de automatiseringseditor:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_diagnostics_status
    to: "error"
```

<a id="profile-changed"></a>
## Profiel gewijzigd

`profile_changed` wordt gepubliceerd nadat een andere combinatie van klimaatprofielen of de standaardplanningen is opgeslagen. Dezelfde actieve combinatie opnieuw rechtstreeks selecteren kan de oorspronkelijke modusentiteit op Handmatig zetten, maar veroorzaakt geen `profile_changed`, omdat de effectieve profielen niet zijn veranderd.

```yaml
domain: velair
event: profile_changed
profile_ids:
  - away
  - bedrooms
previous_profile_ids: []
source: select
```

`source` geeft aan waar de effectieve selectie vandaan komt. Publieke waarden zijn `panel`, `service` en `select`; interne levenscyclusacties kunnen een specifiekere waarde publiceren, zoals `profile_deleted` of `mode_updated`. De geordende lijsten met ID's beschrijven de volledige nieuwe en vorige actieve combinatie. Een lege lijst `profile_ids` staat voor de standaardplanningen.

Deze automatisering reageert bijvoorbeeld wanneer het profiel met ID `away` deel gaat uitmaken van de actieve combinatie:

```yaml
alias: Notify when Away profile becomes active
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: profile_changed
conditions:
  - condition: template
    value_template: "{{ 'away' in trigger.event.data.profile_ids }}"
actions:
  - action: notify.notify
    data:
      message: Away profile is active
```

Gebruik om op de terugkeer naar standaardplanningen te reageren een templatevoorwaarde met `trigger.event.data.profile_ids == []`.

<a id="scheduler-mode-changed"></a>
## Planningsmodus gewijzigd

`scheduler_mode_changed` wordt gepubliceerd wanneer de algemene modus of de eindtijd van de pauze verandert, ook bij automatisch verlopen. Dezelfde modus en eindtijd opnieuw instellen veroorzaakt geen gebeurtenis.

```yaml
domain: velair
event: scheduler_mode_changed
mode: paused
previous_mode: auto
paused_until: "2026-07-09T18:30:00+02:00"
paused_started_at: "2026-07-09T17:00:00+02:00"
```

<a id="climate-target-applied"></a>
## Apparaatinstellingen toegepast

`climate_target_applied` wordt gepubliceerd nadat Velair een geplande doeltemperatuur, actie met alleen een modus, actie met alleen opties, uitschakeling, hersteld schema, opstartschema of aanroep van `velair.set_temperature` / `velair.set_hvac_mode` heeft toegepast. Niet-ondersteunde optionele instellingen worden weggelaten.

```yaml
domain: velair
event: climate_target_applied
entity_id: climate.bedroom
action: set_temperature
temperature: 23
hvac_mode: cool
fan_mode: low
preset_mode: sleep
swing_mode: off
swing_horizontal_mode: center
humidity: 50
weekday: thursday
start: "22:30"
target_when: "2026-07-09T22:30:00+02:00"
source: scheduled_event
```

Veelgebruikte waarden van `source` zijn `scheduled_event`, `current_schedule`, `schedule_saved`, `scheduler_resumed`, `startup`, `service_set_temperature`, `service_set_hvac_mode`, `boost_ended`, `zone_paused`, `zone_resumed` en `zone_pause_expired`.

Bij een doelbereik ontbreekt `temperature` en bevat de gebeurtenis beide grenzen:

```yaml
target_temp_low: 20
target_temp_high: 24
hvac_mode: heat_cool
```

Voor een blok met alleen een modus is `action` gelijk aan `set_hvac_mode`. `hvac_mode` bevat de toegepaste modus en alle temperatuurvelden ontbreken. Automatiseringen kunnen zo een moduswijziging onderscheiden van een gewijzigde doeltemperatuur. `velair.set_hvac_mode` gebruikt dezelfde structuur, met `source: service_set_hvac_mode` en zonder de schemavelden `weekday` of `start`.

Voor een blok met alleen opties is `action` gelijk aan `set_climate_options`. De gebeurtenis bevat de toegepaste opties, zoals `preset_mode` of `fan_mode`, maar geen doeltemperaturen of `hvac_mode`. Deze blokken schakelen een uitgeschakeld apparaat niet in.

<a id="preconditioning-plan-updated"></a>
## Voorbereidingsplan bijgewerkt

`preconditioning_plan_updated` wordt gepubliceerd wanneer een nieuw plan voor vervroegd starten verschijnt of de invoer of uitkomst van de berekening verandert. Identieke herberekeningen worden niet opnieuw gemeld. Plannen tijdens het opstarten kan deze gebeurtenis veroorzaken; gegevens berekenen alleen voor een paneelantwoord niet.

```yaml
domain: velair
event: preconditioning_plan_updated
entity_id: climate.living_room
scheduled_when: "2026-01-15T07:00:00+01:00"
preconditioning_when: "2026-01-15T05:35:00+01:00"
lead_minutes: 85
direction: heat
target_kind: scalar
target_boundary: temperature
boundary_temperature: 21
target_temperature: 21
current_temperature: 17.8
temperature_delta: 3.2
hvac_mode: heat
preset_mode: comfort
model_source: history
complete_sample_count: 12
partial_sample_count: 3
invalid_sample_count: 1
similar_sample_count: 8
comfort_percentile: 90
used_outdoor_temperature: true
outdoor_temperature: -1.5
weekday: thursday
start: "07:00"
preconditioning_diagnostics:
  direction: heat
  target_kind: scalar
  target_boundary: temperature
  boundary_temperature: 21
  current_temperature: 17.8
  delta_temperature: 3.2
  complete_sample_count: 12
  partial_sample_count: 3
  invalid_sample_count: 1
  similar_sample_count: 8
  comfort_percentile: 90
  complete_rate_minutes_per_degree: 23.4
  complete_estimate_minutes: 74.88
  partial_floor_minutes: 82
  combined_estimate_minutes: 82
  rounded_estimate_minutes: 85
  final_lead_minutes: 85
  limited_by_min_start: false
  limited_by_max_lead: false
  source: history
  used_outdoor_temperature: true
  initial_model_lead_minutes: 110
```

Bij een plan voor een oorspronkelijk temperatuurinterval is `target_temperature` gelijk aan `null` en zijn zowel `target_temp_low` als `target_temp_high` aanwezig. `target_kind` is `range`, `target_boundary` is `low` of `high`, en `boundary_temperature` is de effectieve grens die de voorspelling gebruikt. `temperature_delta` wordt ten opzichte van die grens gemeten. Plannen met één doeltemperatuur behouden `target_kind: scalar` en `target_boundary: temperature`.

Een verwarmingsvoorspelling voor een bereik van `20–24 °C` bevat bijvoorbeeld:

```yaml
direction: heat
target_kind: range
target_boundary: low
boundary_temperature: 20
target_temperature: null
target_temp_low: 20
target_temp_high: 24
current_temperature: 18
temperature_delta: 2
hvac_mode: heat_cool
```

<a id="preconditioning-plan-cancelled"></a>
## Voorbereidingsplan geannuleerd

`preconditioning_plan_cancelled` wordt één keer gepubliceerd wanneer een eerder gepubliceerd plan vervalt, bijvoorbeeld na een schemawijziging, een kleiner temperatuurverschil, het uitschakelen van voorbereiding of het verlaten van automatische regeling. De gebeurtenis bevat het laatst gepubliceerde plan, zodat een automatisering kan vaststellen wat is geannuleerd.

```yaml
domain: velair
event: preconditioning_plan_cancelled
entity_id: climate.living_room
scheduled_when: "2026-01-15T07:00:00+01:00"
preconditioning_when: "2026-01-15T05:35:00+01:00"
lead_minutes: 85
direction: heat
target_kind: scalar
target_boundary: temperature
boundary_temperature: 21
target_temperature: 21
current_temperature: 17.8
temperature_delta: 3.2
hvac_mode: heat
preset_mode: comfort
model_source: history
complete_sample_count: 12
partial_sample_count: 3
invalid_sample_count: 1
similar_sample_count: 8
comfort_percentile: 90
used_outdoor_temperature: true
outdoor_temperature: -1.5
weekday: thursday
start: "07:00"
preconditioning_diagnostics:
  direction: heat
  target_kind: scalar
  target_boundary: temperature
  boundary_temperature: 21
  current_temperature: 17.8
  delta_temperature: 3.2
  complete_sample_count: 12
  partial_sample_count: 3
  invalid_sample_count: 1
  similar_sample_count: 8
  comfort_percentile: 90
  complete_rate_minutes_per_degree: 23.4
  complete_estimate_minutes: 74.88
  partial_floor_minutes: 82
  combined_estimate_minutes: 82
  rounded_estimate_minutes: 85
  final_lead_minutes: 85
  limited_by_min_start: false
  limited_by_max_lead: false
  source: history
  used_outdoor_temperature: true
  initial_model_lead_minutes: 110
reason: no_longer_planned
```

`reason` is `no_longer_planned` wanneer een herberekening een plan verwijdert en `scheduler_not_auto` wanneer automatische planning wordt gepauzeerd of gestopt.

<a id="preconditioning-observation-recorded"></a>
## Voorbereidingswaarneming opgeslagen

`preconditioning_observation_recorded` wordt gepubliceerd nadat een leerwaarneming is gevalideerd, de geschiedenis tot de ingestelde omvang is begrensd en de gegevens zijn opgeslagen. `quality` kan `complete`, `partial` of `invalid` zijn.

```yaml
domain: velair
event: preconditioning_observation_recorded
entity_id: climate.living_room
direction: heat
created_at: "2026-01-15T06:52:00+01:00"
scheduled_time: "2026-01-15T07:00:00+01:00"
start_time: "2026-01-15T05:35:00+01:00"
target_temp: 21
initial_temp: 17.8
observed_temp: 20.8
outdoor_temp_start: -2.1
outdoor_temp_target: -1.5
temperature_source: room_sensor
room_temperature_entity_id: sensor.living_room_temperature
delta_t: 3.2
startup_minutes: 85
reached: true
minutes_to_reach: 77
quality: complete
stored_sample_count: 16
```

Een ongeldige waarneming bevat ook `invalid_reason`.

<a id="comfort-assessment-changed"></a>
## Comfortbeoordeling gewijzigd

`comfort_assessment_changed` wordt gepubliceerd wanneer `condition`, `air_quality`, `data_quality`, `data_issues` of de betekenisvolle toestand van een ingeschakelde afgeleide meetwaarde verandert. Die toestand omvat beschikbaarheid, bron, entiteit, eenheid, problemen en beoordeling. Getalsmatige veranderingen in oorspronkelijke of afgeleide metingen vernieuwen nog steeds het paneel en sensorattributen, maar veroorzaken geen nieuwe automatiseringsgebeurtenis. Zo blijft het aantal gebeurtenissen beperkt.

```yaml
domain: velair
event: comfort_assessment_changed
entity_id: climate.office
condition: hot_and_humid
air_quality: elevated
data_quality: complete
data_issues: []
range_summary:
  status: mixed
  thermal_relation: mixed
  positions:
    temperature: above
    humidity: above
    humidex: within
previous_range_summary:
  status: outside_range
  thermal_relation: aligned
  positions:
    temperature: above
    humidity: above
    humidex: above
range_summary_changed: true
range_status_changed: true
temperature:
  metric: temperature
  availability: current
  freshness: reported
  condition: hot
  source: sensor
  entity_id: sensor.office_temperature
  value: 27.1
  min: 20
  max: 24
humidity:
  metric: humidity
  availability: current
  freshness: reported
  condition: humid
  source: sensor
  entity_id: sensor.office_humidity
  value: 67
  min: 40
  max: 60
comfort_zone:
  model: temperature_aware
  temperature_min: 20
  temperature_max: 24
  points:
    - temperature: 20
      humidity_min: 40
      humidity_max: 60
    - temperature: 24
      humidity_min: 35
      humidity_max: 50
  effective_humidity_range:
    temperature: 27.1
    minimum: 35
    maximum: 50
co2:
  metric: co2
  availability: current
  condition: elevated
  source: sensor
  entity_id: sensor.office_co2
  value: 1180
  attention: 1000
  max: 1500
derived_metrics:
  humidex:
    metric: humidex
    availability: current
    condition: null
    source: velair
    entity_id: null
    value: 23.8
    unit: null
    temperature_range_position: within
    issues: []
    input_entity_ids:
      - sensor.office_temperature
      - sensor.office_humidity
  dew_point:
    metric: dew_point
    availability: current
    condition: null
    source: velair
    entity_id: null
    value: 15.1
    unit: °C
    issues: []
    input_entity_ids:
      - sensor.office_temperature
      - sensor.office_humidity
outdoor:
  enabled: true
  data_quality: complete
  data_issues: []
  temperature:
    metric: outdoor_temperature
    availability: current
    source: sensor
    entity_id: sensor.outdoor_temperature
    value: 18
    unit: °C
  humidity:
    metric: outdoor_humidity
    availability: current
    source: sensor
    entity_id: sensor.outdoor_humidity
    value: 55
    unit: "%"
  indoor_absolute_humidity:
    metric: indoor_absolute_humidity
    availability: current
    source: velair
    entity_id: null
    value: 12.7
    unit: g/m³
    input_entity_ids:
      - sensor.office_temperature
      - sensor.office_humidity
  absolute_humidity:
    metric: outdoor_absolute_humidity
    availability: current
    source: velair
    entity_id: null
    value: 8.5
    unit: g/m³
    input_entity_ids:
      - sensor.outdoor_temperature
      - sensor.outdoor_humidity
  guidance_thresholds:
    temperature_delta: 1
    temperature_unit: °C
    humidity_delta_percentage_points: 5
    absolute_humidity_delta_g_m3: 1
  comparison:
    temperature:
      availability: current
      delta: -9.1
      effect: cooler
      potential: cooling
      blocked_by: []
    humidity:
      availability: current
      absolute_humidity_delta: -4.2
      equivalent_indoor_relative_humidity: 43
      equivalent_indoor_relative_humidity_delta: -24
      effect: drier
      potential: drying
      blocked_by: []
insights:
  - code: co2_elevated
    kind: context
    tone: attention
    metrics:
      - co2
  - code: ventilation_may_help_cool
    kind: context
    tone: cool
    metrics:
      - temperature
      - outdoor
ventilation_opportunity:
  state: comfort_possible
  evaluation_scope: temperature_and_humidity
  potential_effects:
    - cooling
    - drying
  blocked_by: []
  reason: outdoor_conditions_within_comfort
```

De bereikvelden zijn bedoeld voor eenvoudige automatiseringen en vervangen het bestaande fysieke veld `condition` niet. Zie voor templates met de actuele toestand en toestandstriggers de volledige [beschrijving van de entiteit voor omgevingsconditie](zone-sensors.nl.md#environmental-condition). Gebruik deze gebeurtenis als de vorige waarde of de precieze overgang van belang is.

| `status` | Betekenis |
| --- | --- |
| `within_range` | Alle bruikbare bewaakte waarden liggen binnen hun ingestelde bereik. |
| `outside_range` | Minstens één bruikbare bewaakte waarde ligt buiten het ingestelde bereik; temperatuur en Humidex hebben dezelfde positie wanneer beide zijn ingeschakeld. |
| `mixed` | De huidige temperatuur en Humidex bevinden zich op verschillende posities ten opzichte van hun bereik. |
| `unavailable` | Een vereiste bewaakte waarde of ingeschakelde Humidex kan momenteel niet worden beoordeeld. |

| `thermal_relation` | Betekenis |
| --- | --- |
| `aligned` | Temperatuur en Humidex hebben dezelfde positie. |
| `mixed` | Temperatuur en Humidex hebben verschillende posities. |
| `not_evaluated` | Humidex is uitgeschakeld. |
| `unavailable` | Temperatuur of ingeschakelde Humidex kan momenteel niet worden beoordeeld. |

Elke vermelding in `positions` is `below`, `within`, `above` of `null`. De gebeurtenis bevat ook de volledige vorige samenvatting. `range_summary_changed` geeft een wijziging in status, temperatuurrelatie of positie aan; `range_status_changed` alleen een wijziging in de algemene `status`. Beide zijn `false` wanneer een ander onderdeel van de comfortbeoordeling de gebeurtenis heeft veroorzaakt.

`comfort_zone` gebruikt de temperatuureenheid van de beheerde klimaatentiteit. Het effectieve bereik is hetzelfde bereik dat de vochtigheidsbeoordeling en buitenadvies gebruiken. Bij het begeleide model of een aangepast temperatuurafhankelijk model is het `null` wanneer de temperatuur niet kan worden beoordeeld. Automatiseringen moeten dan niet terugvallen op de oude vaste vochtigheidsgrenzen. Gewone getalsmatige beweging van dit bereik werkt entiteitsattributen en de API bij, zonder gebeurtenis, tenzij ook een beschreven betekenisvolle uitkomst verandert.

De gebeurtenis bevat ook de actuele `ventilation_opportunity`. Wijzigingen in toestand, reikwijdte, effecten, belemmeringen of reden zijn betekenisvol. Getalsmatige schommelingen buiten die deze velden niet veranderen, veroorzaken geen nieuwe gebeurtenis.

Deze automatisering reageert bijvoorbeeld alleen wanneer een zone voor het eerst buiten de ingestelde bereiken komt:

```yaml
automation:
  - alias: "Velair office outside configured ranges"
    triggers:
      - trigger: event
        event_type: velair_event
        event_data:
          domain: velair
          event: comfort_assessment_changed
          entity_id: climate.office
    conditions:
      - condition: template
        value_template: >-
          {{ trigger.event.data.range_status_changed
             and trigger.event.data.range_summary.status == 'outside_range' }}
    actions:
      - action: notify.notify
        data:
          message: "The office moved outside its configured Comfort ranges."
```

`insights` is een geordende interpretatie van de huidige binnenmetingen die alleen tijdens de uitvoering bestaat. De velden zijn vaste identificaties, geen vertaalde teksten. Een betekenisvolle wijziging in inzichten kan deze gebeurtenis veroorzaken. Verouderde, ontbrekende of ongeldige metingen leveren geen inzicht op. De volledige huidige lijst is aanwezig, inclusief `insights: []` wanneer het laatste contextuele inzicht verdwijnt. Het bestaande veld `condition` blijft de samenvattende beoordeling en wordt niet als inzicht herhaald.

Wanneer vergelijking met buiten is ingeschakeld, bevat de gebeurtenis ook de volledige structuur `outdoor`. De eigen kwaliteit en problemen daarvan veranderen de binnenvelden `data_quality` of `data_issues` nooit. Gebeurtenissen reageren op wijzigingen in beschikbaarheid, kwaliteit, `effect`, `potential`, `blocked_by` of de inzichtenlijst. Gewone getalsmatige beweging zonder gewijzigde betekenis veroorzaakt geen nieuwe gebeurtenis.

`guidance_thresholds` vermeldt de effectieve gevoeligheid per zone waarmee deze uitkomst is bepaald. Een drempel wijzigen zonder de betekenisvolle uitkomst te veranderen werkt de actuele toestand bij, maar veroorzaakt geen gebeurtenis. Actuele meetgegevens bevatten `freshness: reported | unverified`. De binnen- of buitenwaarde van `data_quality` kan `unverified` zijn wanneer alle metingen bruikbaar zijn, maar minstens één geen verifieerbaar tijdstip van rapportage heeft. Rechtstreekse sensoren kunnen hun actualiteitsgrens overschrijden zonder verandering van de meetwaarde.

De structuur vermeldt de absolute luchtvochtigheid binnen expliciet; afnemers moeten die niet uit afgeronde verschillen reconstrueren. Ventilatiecodes beschrijven alleen een kans of afweging. Ze betekenen niet dat Velair een raam heeft geopend of het apparaat heeft gewijzigd.

Alleen de afgeleide Humidex-gegevens bevatten `temperature_range_position`. Dat veld is daar altijd aanwezig en is `below`, `within`, `above` of `null`. Een overgang tussen deze waarden kan de gebeurtenis veroorzaken. Het veld vergelijkt waarnemingen met het ingestelde temperatuurbereik; het is geen comfortoordeel of opdracht voor klimaatregeling.

<a id="room-sensor-assist-state-changed"></a>
## Toestand van Room Assist gewijzigd

`room_sensor_assist_state_changed` wordt gepubliceerd wanneer Room Assist via het paneel, een Lovelace-kaart, de API of een service wordt in- of uitgeschakeld. Dezelfde toestand opnieuw instellen veroorzaakt geen gebeurtenis.

```yaml
domain: velair
event: room_sensor_assist_state_changed
entity_id: climate.living_room
enabled: true
previous_enabled: false
room_temperature_entity_id: sensor.living_room_temperature
deadband: 0.3
max_delta: 3
debounce_seconds: 20
```

<a id="room-sensor-assist-updated"></a>
## Room Assist bijgewerkt

`room_sensor_assist_updated` wordt alleen gepubliceerd nadat Room Assist een gewijzigde tijdelijke doeltemperatuur naar het apparaat heeft gestuurd. Wijzigingen kleiner dan de temperatuurstap van het apparaat veroorzaken geen gebeurtenis.

```yaml
domain: velair
event: room_sensor_assist_updated
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
target_temperature: 21
applied_temperature: 23.5
room_temperature: 18
climate_temperature: 20.5
assist_delta: 3
applied_offset: 3
direction: heat
hvac_mode: heat
hysteresis_phase: towards_upper
hysteresis_target: 21.3
deadband_low: 20.7
deadband_high: 21.3
reason: scheduled_event
```

Bij een vaste enkele doeltemperatuur voor `heat` of `cool` met een dode band groter dan nul beschrijven de vier hysteresevelden de vastgelegde uitvoeringsfase, de actieve grens en de volledige schakelband. Ze ontbreken bij een dode band van nul, automatische modi met één doeltemperatuur en oorspronkelijke bereiken. De fase verandert niet wanneer de kamertemperatuur het geplande midden passeert; ze keert pas om wanneer de externe sensor de tegenovergestelde grens bereikt.

Wanneer de geplande doeltemperatuur een vast verwarmings- of koelresultaat beschermt, voegt een update met één doeltemperatuur twee optionele velden toe:

```yaml
target_temperature: 22
calculated_temperature: 20
applied_temperature: 22
scheduled_target_guard: cooling_floor
direction: cool
```

`calculated_temperature` is de ondersteunde doeltemperatuur vóór de geplande bescherming. Bestaande automatiseringen blijven werken: de velden worden toegevoegd en ontbreken wanneer de bescherming niet actief is.

Bij een oorspronkelijk bereik ontbreken de velden voor één doeltemperatuur en worden beide volledige bereiken vermeld:

```yaml
target_temp_low: 19
target_temp_high: 24
applied_target_temp_low: 23
applied_target_temp_high: 28
room_temperature: 18
climate_temperature: 22
assist_delta: 1
range_shift: 4
direction: heat
hvac_mode: heat_cool
```

<a id="room-sensor-assist-restored"></a>
## Room Assist hersteld

`room_sensor_assist_restored` wordt gepubliceerd wanneer Room Assist stopt met de tijdelijke doeltemperatuur en waar mogelijk de normale geplande doeltemperatuur herstelt. Bij een vaste verwarmings- of koelcyclus blijft het bereiken van de actieve grens van de dode band onderdeel van `room_sensor_assist_updated`: dit keert de hysterese om en kan het teken van `applied_offset` veranderen. De geplande doeltemperatuur blijft tijdens de niet-aandrijvende fase de veiligheidsgrens, ook als de eigen temperatuurmeting van de klimaatentiteit verschuift. Als afronding op de temperatuurstap een nieuwe opdracht overbodig maakt, verandert de fase wel in de actuele status, maar wordt zoals hierboven beschreven geen updategebeurtenis gepubliceerd. `reason` verklaart een gepubliceerde overgang.

```yaml
domain: velair
event: room_sensor_assist_restored
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
target_temperature: 21
applied_temperature: 21
room_temperature: 21.1
climate_temperature: 20.5
assist_delta: 0
applied_offset: 0
direction: heat
hvac_mode: heat
reason: assist_disabled
```

Andere redenen zijn `assist_disabled`, `boost_started`, `manual_target`, `missing_temperature`, `no_active_target`, `not_auto`, `schedule_changed`, `schedule_cleared`, `scheduler_mode_changed`, `scheduler_stopped`, `settings_updated`, `turn_off`, `unsupported_mode`, `zone_paused` en `zone_unavailable`. `unsupported_temperature_range` blijft mogelijk voor een oudere enkele doeltemperatuur die niet kan worden toegepast terwijl de effectieve apparaatmodus een oorspronkelijk bereik vereist. Geldige bereikblokken worden ondersteund.

<a id="boost-started"></a>
## Tijdelijke aanpassing gestart

`boost_started` wordt gepubliceerd nadat de doeltemperatuur en tijdelijke aanpassing zijn toegepast en opgeslagen. Een actieve tijdelijke aanpassing vervangen veroorzaakt opnieuw `boost_started`.

Tijdelijke aanpassingen met een bereik gebruiken `target_temp_low` en `target_temp_high` in plaats van `temperature`. De herstelgegevens behouden dezelfde vorm van doeltemperatuur.

```yaml
domain: velair
event: boost_started
entity_id: climate.bedroom
temperature: 22
hvac_mode: cool
fan_mode: high
preset_mode: comfort
swing_mode: vertical
swing_horizontal_mode: wide
humidity: 48
started_at: "2026-07-09T14:00:00+02:00"
until: "2026-07-09T15:30:00+02:00"
```

<a id="boost-ended"></a>
## Tijdelijke aanpassing beëindigd

`boost_ended` wordt gepubliceerd wanneer een tijdelijke aanpassing verloopt of wordt geannuleerd. `reason` is `expired` of `manual`. `restoration` beschrijft de toestand die Velair daarna toepast.

```yaml
domain: velair
event: boost_ended
entity_id: climate.bedroom
temperature: 22
hvac_mode: cool
fan_mode: high
preset_mode: comfort
swing_mode: vertical
swing_horizontal_mode: wide
humidity: 48
started_at: "2026-07-09T14:00:00+02:00"
until: "2026-07-09T15:30:00+02:00"
reason: manual
restoration:
  type: schedule
  source: boost_ended
  target:
    action: set_temperature
    temperature: 24
    hvac_mode: cool
    fan_mode: low
    preset_mode: sleep
    swing_mode: off
    swing_horizontal_mode: center
    humidity: 50
    weekday: thursday
    start: "15:00"
```

`restoration.type` kan `schedule`, `previous_state` of `none` zijn. Herstel van een schema veroorzaakt ook `climate_target_applied` met `source: boost_ended`.

<a id="zone-paused"></a>
## Zone gepauzeerd

`zone_paused` wordt gepubliceerd wanneer een beheerde zone van nul naar één pauzereden gaat. Bij `action: turn_off` wordt eerst `climate_target_applied` voor die uitschakeling gepubliceerd.

```yaml
domain: velair
event: zone_paused
entity_id: climate.guest_room
started_at: "2026-07-09T12:00:00+02:00"
until: "2026-07-12T18:00:00+02:00"
action: turn_off
pause_id: velair_window_guard
```

`zone_pause_added`, `zone_pause_updated` en `zone_pause_removed` beschrijven wijzigingen in afzonderlijke redenen en bevatten `pause_id` wanneer de reden een identificatie heeft. Een identieke herhaling van een geïdentificeerde reden veroorzaakt geen gebeurtenis. Oudere en handmatige redenen hebben geen ID.

```yaml
domain: velair
event: zone_pause_added
entity_id: climate.guest_room
started_at: "2026-07-09T12:00:00+02:00"
until: null
action: turn_off
pause_id: velair_window_guard
```

```yaml
domain: velair
event: zone_pause_updated
entity_id: climate.guest_room
started_at: "2026-07-09T12:00:00+02:00"
until: "2026-07-09T18:00:00+02:00"
action: turn_off
pause_id: velair_window_guard
```

```yaml
domain: velair
event: zone_pause_removed
entity_id: climate.guest_room
started_at: "2026-07-09T12:00:00+02:00"
until: "2026-07-09T18:00:00+02:00"
action: turn_off
pause_id: velair_window_guard
reason: expired
```

<a id="zone-resumed"></a>
## Zone hervat

`zone_resumed` wordt alleen gepubliceerd wanneer de laatste reden handmatig wordt verwijderd of verloopt. Wanneer het huidige schema opnieuw wordt toegepast, beschrijft een latere `climate_target_applied` die doelinstellingen.

```yaml
domain: velair
event: zone_resumed
entity_id: climate.guest_room
started_at: "2026-07-09T12:00:00+02:00"
until: "2026-07-12T18:00:00+02:00"
action: turn_off
pause_id: velair_window_guard
reason: expired
```

<a id="operations-without-runtime-events"></a>
## Bewerkingen zonder uitvoeringsgebeurtenissen

Templates maken, paneelvoorkeuren wijzigen, gegevens importeren en instellingen herstellen wijzigen de configuratie, maar veroorzaken geen uitvoeringsgebeurtenissen voor automatiseringen. Schemawijzigingen hebben geen eigen configuratiegebeurtenis. Ze kunnen wel gebeurtenissen over het annuleren of bijwerken van plannen of `climate_target_applied` veroorzaken wanneer ze de huidige doelinstellingen veranderen.

<a id="delivery-meaning"></a>
## Betekenis van een toegepaste opdracht

Een gebeurtenis over toegepaste instellingen wordt pas gepubliceerd nadat Home Assistant de volledige reeks aanroepen voor modus, doeltemperatuur en ondersteunde opties voor Velairs huidige bedoeling heeft geaccepteerd. Mislukte of inmiddels achterhaalde pogingen veroorzaken deze gebeurtenis niet. De gebeurtenis bevestigt dat de opdracht is geaccepteerd, niet dat het fysieke apparaat de gevraagde temperatuur of HVAC-toestand al heeft bereikt.
