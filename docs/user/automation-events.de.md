<a id="automation-events"></a>
# Automationsereignisse
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](automation-events.md) · [Español](automation-events.es.md) · [Français](automation-events.fr.md) · [Deutsch](automation-events.de.md) · [Italiano](automation-events.it.md) · [Nederlands](automation-events.nl.md) · [Polski](automation-events.pl.md) · [Português (Brasil)](automation-events.pt-br.md) · [Português (Portugal)](automation-events.pt-pt.md) · [Русский](automation-events.ru.md) · [Übersetzungsstatus](../translation-status.md)

<details>
<summary>Status dieser Übersetzung</summary>

| Angabe | Status |
| --- | --- |
| Referenzversion | 1.9.0-beta.1 |
| Letzte Synchronisierung | 2026-10-11 |
| Sprachliche Prüfung | KI-gestützte Übersetzung |
| Vergleich mit dem Original | Mit dem englischen Original synchronisiert. |

</details>

---
<!-- velair-docs:end -->

Velair sendet unverarbeitete, vorübergehende Home-Assistant-Ereignisse bei Laufzeitänderungen. Die Daten auf dem Ereignisbus existieren nur während der Zustellung. Velair bietet weder Ereignisarchiv noch API zur erneuten Wiedergabe. Öffnen oder Neuladen des Panels erzeugt diese Ereignisse nicht.

Die Diagnose ist davon getrennt. Für aktivierte Kategorien kann sie bereinigte Zusammenfassungen ausgewählter Ereignisse in einem begrenzten Arbeitsspeicherverlauf mit höchstens 100 Einträgen behalten. Dieser wird bei Neustart von Velair oder Home Assistant gelöscht, ist kein Recorder-Verlauf und verändert oder verlängert nicht die Lebensdauer des ursprünglichen Automationsereignisses.

Alle Ereignisse verwenden:

```yaml
event_type: velair_event
```

Filtere `event_data.event` und bei Zonenereignissen `event_data.entity_id`:

```yaml
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: climate_target_applied
      entity_id: climate.living_room
```

Alle Daten enthalten `domain: velair` und einen der folgenden Ereignisnamen.

<a id="external-climate-change-detected"></a>
## Externe Änderung der Klimasteuerung erkannt

`external_climate_change_detected` wird gesendet, wenn ein verwaltetes Gerät HVAC-Modus oder Sollwert ändert und die Änderung keiner Velair-Klimaaktion zugeordnet werden kann. Es ist eine Beobachtung: `non-Velair` bedeutet nicht zwangsläufig eine Person, denn auch Fernbedienung oder andere Automation können die Quelle sein.

Die Erkennung umfasst `hvac_mode`, einzelne `temperature` und native `target_temp_low`/`target_temp_high`. Umgebungsmesswerte und Lüfter-, Preset-, Schwenk- oder Luftfeuchtigkeitsoptionen erzeugen es nicht. Übergänge von/zu `unknown` und `unavailable` werden ignoriert. Zuordnung, Grenzen, Richtlinien und vollständige Zeitverläufe beschreibt [Externe Änderungen und manuelle Anpassungen](manual-control.de.md).

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

`policy` ist die für die Änderung geltende Richtlinie. Bei aktiver manueller Anpassung bleibt es die Sitzungsrichtlinie, auch nach Änderung des zukünftigen Standards. `keep_automatic` bedeutet, dass keine manuelle Anpassung erstellt, sondern die aktuelle Zuständigkeit neu ermittelt wurde. Diese Erkennung hat deshalb kein entsprechendes Eintrittsereignis `zone_control_changed`.

`zone_control_changed` wird beim Beginn manueller Anpassung oder Rückkehr zur Automatik gesendet. `control_mode` ist `manual` oder `automatic` und bewusst vom Velair-Modus Manuell getrennt.

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

`source` ist `external_change` bei einer extern begonnenen Sitzung und `explicit`, wenn Panel oder `velair.enter_manual_adjustment` den aktuellen Gerätezustand erfasst haben. `duration_minutes` erscheint nur bei `for_duration`.

Bei `until_resumed` fehlt `until`. Automatisches Ende enthält `reason: expired`, ausdrückliches Ende `reason: resumed`. Beenden manueller Anpassung entfernt keine unabhängigen Pausengründe, die die tatsächliche Zeitplanübermittlung weiter blockieren können.

Entsprechende Dienstaktionen:

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
## Diagnoseproblem geändert

`diagnostic_issue_changed` wird bei Erkennen oder Beheben eines überprüfbaren Problems gesendet. Velair übernimmt beim Start vorhandene Probleme als Ausgangsbasis, damit ein Neustart keine Flut bereits aktiver Probleme sendet. Unveränderte Probleme werden nicht doppelt gemeldet.

Die Problemidentität besteht aus `code`, optionaler verwalteter Klima-`entity_id` und optionalem Sensorzweck `purpose`. Die Daten enthalten weder unverarbeiteten Ausnahmetext noch Profil-/Modus-/Pausenkennung oder abgeleitete Ursache. `change` ist `detected` oder `resolved`; `severity` ist `warning` oder `error`.

```yaml
domain: velair
event: diagnostic_issue_changed
change: detected
severity: error
code: delivery_exhausted
entity_id: climate.living_room
```

Beispiel: Bei jedem neu erkannten Fehler benachrichtigen:

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

Verwende für den Gesamtzustand stattdessen **Diagnosestatus**. Seine ID lässt sich in Home Assistant ändern; wähle ihn daher im Automationseditor:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_diagnostics_status
    to: "error"
```

<a id="profile-changed"></a>
## Profile geändert

`profile_changed` wird nach Speichern eines anderen Klimaprofilsatzes oder der Standardzeitpläne gesendet. Direkte Auswahl desselben aktiven Satzes kann die native Modusentität zu Manuell bewegen, sendet aber kein `profile_changed`, weil wirksame Profile gleich bleiben.

```yaml
domain: velair
event: profile_changed
profile_ids:
  - away
  - bedrooms
previous_profile_ids: []
source: select
```

`source` nennt die Herkunft der wirksamen Auswahl. Öffentliche Werte sind `panel`, `service` und `select`; interne Lebenszyklusaktionen können genauere Werte wie `profile_deleted` oder `mode_updated` veröffentlichen. Geordnete ID-Listen beschreiben vollständigen neuen und vorherigen aktiven Satz. Leere `profile_ids` bedeutet Standard.

Diese Automation reagiert beispielsweise, wenn Profil-ID `away` Teil des aktiven Satzes wird:

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

Für Rückkehr zu Standardzeitplänen prüfe mit einer Template-Bedingung `trigger.event.data.profile_ids == []`.

<a id="scheduler-mode-changed"></a>
## Zeitplanermodus geändert

`scheduler_mode_changed` wird bei Änderung von globalem Modus oder Pausenablauf gesendet, einschließlich automatischem Ablauf. Wiederholung desselben Modus und Ablaufs sendet es nicht.

```yaml
domain: velair
event: scheduler_mode_changed
mode: paused
previous_mode: auto
paused_until: "2026-07-09T18:30:00+02:00"
paused_started_at: "2026-07-09T17:00:00+02:00"
```

<a id="climate-target-applied"></a>
## Klimaziel angewendet

`climate_target_applied` wird nach Anwendung eines geplanten Ziels, reiner Modus-/Optionsaktion, Ausschalten, wiederhergestelltem oder Startzeitplan oder Dienstaufruf `velair.set_temperature` / `velair.set_hvac_mode` gesendet. Nicht unterstützte Optionen fehlen.

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

Übliche `source`-Werte sind `scheduled_event`, `current_schedule`, `schedule_saved`, `scheduler_resumed`, `startup`, `service_set_temperature`, `service_set_hvac_mode`, `boost_ended`, `zone_paused`, `zone_resumed` und `zone_pause_expired`.

Bei Bereichsziel fehlt `temperature`; beide Grenzen sind enthalten:

```yaml
target_temp_low: 20
target_temp_high: 24
hvac_mode: heat_cool
```

Bei reinem Modusblock ist `action` gleich `set_hvac_mode`, `hvac_mode` der angewendete Modus und alle Temperaturzielfelder fehlen. So unterscheiden Automationen Modusübergabe und Zieländerung. Dieselbe Datenform gilt für `velair.set_hvac_mode` mit `source: service_set_hvac_mode` und ohne zeitplanbezogene Felder `weekday` oder `start`.

Bei reinem Optionsblock ist `action` gleich `set_climate_options`. Daten enthalten angewendete Optionen wie `preset_mode` oder `fan_mode`, keine Temperaturziele oder `hvac_mode`. Solche Blöcke schalten ausgeschaltete Geräte nicht ein.

<a id="preconditioning-plan-updated"></a>
## Vorkonditionierungsplan aktualisiert

`preconditioning_plan_updated` wird bei Veröffentlichung eines neuen Frühstartplans oder Änderungen seiner Berechnungseingänge/-ergebnisse gesendet. Identische Neuberechnungen werden dedupliziert. Planung beim Start kann es senden, eine Berechnung nur für eine Panelantwort nicht.

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

Bei nativem Bereichsplan ist `target_temperature` gleich `null`; die vollständigen `target_temp_low` und `target_temp_high` sind enthalten. `target_kind` ist `range`, `target_boundary` ist `low` oder `high`, und `boundary_temperature` ist die für die Vorhersage verwendete wirksame Grenze. `temperature_delta` wird gegen sie gemessen. Einzelpläne behalten `target_kind: scalar` und `target_boundary: temperature`.

Eine Heizvorhersage für `20–24 °C` enthält beispielsweise:

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
## Vorkonditionierungsplan aufgehoben

`preconditioning_plan_cancelled` wird einmal gesendet, wenn ein zuvor veröffentlichter Plan nicht mehr existiert, etwa nach Zeitplanänderung, kleinerer Temperaturdifferenz, deaktivierter Vorkonditionierung oder Verlassen der Automatik. Es wiederholt den letzten veröffentlichten Plan, damit eine Automation die Aufhebung zuordnen kann.

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

`reason` ist `no_longer_planned`, wenn Neuberechnung einen Plan entfernt, und `scheduler_not_auto` beim Pausieren/Stoppen der Automatik.

<a id="preconditioning-observation-recorded"></a>
## Vorkonditionierungsbeobachtung gespeichert

`preconditioning_observation_recorded` wird nach Validierung, Begrenzung auf die konfigurierte Verlaufsgröße und Speicherung einer Lernbeobachtung gesendet. `quality` kann `complete`, `partial` oder `invalid` sein.

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

Ungültige Beobachtungen enthalten außerdem `invalid_reason`.

<a id="comfort-assessment-changed"></a>
## Komfortbewertung geändert

`comfort_assessment_changed` wird bei Änderungen von `condition`, `air_quality`, `data_quality`, `data_issues` oder semantischem Zustand einer aktivierten abgeleiteten Messgröße gesendet. Dieser umfasst Verfügbarkeit, Quelle, Entität, Einheit, Probleme und Zustand. Reine Zahlenänderungen in Basis- oder abgeleiteten Werten aktualisieren Oberfläche und Sensorattribute ohne weiteres Ereignis. Der Ereignisbus wird dadurch nicht überflutet.

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

Bereichsfelder sind für einfache Automationen gedacht und ersetzen nicht das kompatible physische Feld `condition`.

Für aktuelle Zustandstemplates und Zustandsauslöser siehe den vollständigen [Entitätsvertrag für Umgebungszustand](zone-sensors.de.md#environmental-condition). Verwende dieses Ereignis, wenn vorheriger Wert oder genauer Übergang wichtig ist.

| `status` | Bedeutung |
| --- | --- |
| `within_range` | Jeder nutzbare überwachte Wert liegt in seinem konfigurierten Bereich. |
| `outside_range` | Mindestens ein nutzbarer Wert liegt außerhalb; Temperatur und Humidex sind bei gemeinsamer Aktivierung übereinstimmend eingeordnet. |
| `mixed` | Aktuelle Temperatur und Humidex haben verschiedene Bereichspositionen. |
| `unavailable` | Ein erforderlicher Wert oder aktivierter Humidex kann nicht bewertet werden. |

| `thermal_relation` | Bedeutung |
| --- | --- |
| `aligned` | Temperatur und Humidex haben dieselbe Position. |
| `mixed` | Temperatur und Humidex haben verschiedene Positionen. |
| `not_evaluated` | Humidex ist deaktiviert. |
| `unavailable` | Temperatur oder aktivierter Humidex kann nicht bewertet werden. |

Jeder `positions`-Eintrag ist `below`, `within`, `above` oder `null`. Das Ereignis enthält die vollständige vorherige Zusammenfassung. `range_summary_changed` meldet Änderung von Status, thermischer Beziehung oder Position; `range_status_changed` nur Änderung des gesamten `status`. Beide sind `false`, wenn ein anderer Teil der Komfortbewertung auslöste.

`comfort_zone` verwendet die Geräteeinheit. Sein wirksamer Bereich wird auch für Luftfeuchtigkeitszustand und Außenhinweise verwendet. Bei geführtem oder benutzerdefiniert temperaturabhängigem Modell ist er `null`, wenn Temperatur nicht auswertbar ist. Automationen dürfen deshalb nicht die früheren festen Feuchtigkeitsgrenzen einsetzen. Normale Zahlenänderungen dieses Bereichs aktualisieren Entitätsattribute und API ohne Ereignis, sofern kein dokumentiertes semantisches Ergebnis wechselt. Das Ereignis enthält auch aktuelles `ventilation_opportunity`. Änderungen von Zustand, Umfang, Wirkungen, Hindernissen oder Grund sind semantisch; reine Außenzahlenänderungen ohne diese Änderungen senden nichts Neues.

Diese Automation reagiert beispielsweise nur auf einen neuen Wechsel außerhalb der konfigurierten Bereiche:

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

`insights` ist eine geordnete, nur zur Laufzeit gültige Interpretation aktueller Innendaten. Felder sind stabile Kennungen statt übersetzter Prosa. Eine semantische Hinweisänderung kann auslösen; veraltete, fehlende oder ungültige Werte erzeugen keinen Hinweis. Daten enthalten die vollständige aktuelle Liste, auch `insights: []`, wenn der letzte Hinweis verschwindet. Das bestehende `condition` bleibt Bewertungszusammenfassung und wird nicht als Hinweis dupliziert.

Bei aktiviertem Außenvergleich enthält das Ereignis den vollständigen Teilbaum `outdoor`. Dessen Qualität und Probleme verändern niemals innere `data_quality` oder `data_issues`. Ereignisse reagieren auf Änderungen von Verfügbarkeit, Qualität, `effect`, `potential`, `blocked_by` oder Hinweislisten; normale Zahlenbewegungen im selben semantischen Ergebnis senden kein weiteres Ereignis. `guidance_thresholds` meldet die wirksame Zonenempfindlichkeit für das Ergebnis. Schwellenänderung ohne semantische Wirkung aktualisiert den Zustand ohne Ereignis. Aktuelle Messgrößendaten enthalten `freshness: reported | unverified`. Innen- oder Außen-`data_quality` kann `unverified` sein, wenn alle Werte nutzbar sind, aber einer keinen überprüfbaren Meldezeitpunkt hat. Direkte Sensoren können ohne Zahlenänderung bei Ablauf veraltet werden. Absolute Innenluftfeuchtigkeit wird ausdrücklich geliefert und darf nicht aus gerundeten Differenzen rekonstruiert werden. Lüftungscodes beschreiben nur Gelegenheit oder Abwägung, kein geöffnetes Fenster oder geänderte Klimasteuerung.

Nur Humidex-Daten enthalten `temperature_range_position`, immer vorhanden und `below`, `within`, `above` oder `null`. Wechsel können auslösen. Das Feld ist ein beobachtender Vergleich mit dem konfigurierten Temperaturbereich, kein Komforturteil oder Klimasteuerbefehl.

<a id="room-sensor-assist-state-changed"></a>
## Raumsensorunterstützung aktiviert oder deaktiviert

`room_sensor_assist_state_changed` wird bei Aktivierung/Deaktivierung über Panel, Karte, API oder Dienst gesendet. Wiederholung desselben Zustands sendet nichts.

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
## Raumsensorunterstützung aktualisiert

`room_sensor_assist_updated` wird nur nach Senden eines geänderten vorübergehenden Ziels gesendet. Änderungen unterhalb des Geräteschritts senden nichts.

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

Bei festem Einzelziel `heat` oder `cool` mit Totband ungleich null nennen vier Hysteresefelder die übernommene Laufzeitphase, aktive Grenze und vollständiges Schaltband. Sie fehlen bei null Totband, Einzelziel-Automatikmodi und nativen Bereichen. Die Phase bleibt beim Durchlaufen des Zeitplanzentrums gleich und kehrt erst an der gegenüberliegenden externen Sensorgrenze um.

Schützt das Zeitplanziel ein festes Heiz-/Kühlergebnis, ergänzt das Einzelzielupdate zwei optionale Felder:

```yaml
target_temperature: 22
calculated_temperature: 20
applied_temperature: 22
scheduled_target_guard: cooling_floor
direction: cool
```

`calculated_temperature` ist das unterstützte Ziel vor Zeitplanzielschutz. Bestehende Automationen bleiben kompatibel, da die Felder ergänzend und bei inaktivem Schutz weggelassen sind.

Bei nativem Bereich fehlen Einzelzielfelder; beide vollständigen Bänder werden gemeldet:

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
## Raumsensorunterstützung beendet und Ziel wiederhergestellt

`room_sensor_assist_restored` wird gesendet, wenn Room Assist die temporäre Zielsteuerung beendet und soweit möglich das normale Zeitplanziel wiederherstellt. Bei festem Heiz-/Kühlzyklus bleibt Erreichen der aktiven Totbandgrenze Teil von `room_sensor_assist_updated`: Es kehrt die Phase um und kann `applied_offset` ändern. Zeitplanziel bleibt in der nicht anfordernden Phase Sicherheitsgrenze, auch bei internem Sensordrift. Macht Schrittrundung einen neuen Thermostatbefehl unnötig, ändert sich die Phase trotzdem im Livezustand, aber ohne Updateereignis. `reason` erklärt einen gesendeten Übergang.

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

Weitere Gründe sind `assist_disabled`, `boost_started`, `manual_target`, `missing_temperature`, `no_active_target`, `not_auto`, `schedule_changed`, `schedule_cleared`, `scheduler_mode_changed`, `scheduler_stopped`, `settings_updated`, `turn_off`, `unsupported_mode`, `zone_paused` und `zone_unavailable`. `unsupported_temperature_range` bleibt für ältere Einzelziele möglich, die sich bei einem Bereich erfordernden Modus nicht anwenden lassen. Gültige Bereichsblöcke sind unterstützt.

<a id="boost-started"></a>
## Temporäre Anpassung gestartet

`boost_started` wird nach Anwendung und Speicherung von Ziel und Übersteuerung gesendet. Ersetzen einer aktiven temporären Anpassung sendet erneut `boost_started`.

Bereichsanpassungen verwenden `target_temp_low` und `target_temp_high` statt `temperature`. Wiederherstellungsdaten behalten dieselbe Zielform.

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
## Temporäre Anpassung beendet

`boost_ended` wird bei Ablauf oder Abbruch gesendet. `reason` ist `expired` oder `manual`. `restoration` beschreibt den danach angewendeten Zustand.

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

`restoration.type` ist `schedule`, `previous_state` oder `none`. Zeitplanwiederherstellung sendet außerdem `climate_target_applied` mit `source: boost_ended`.

<a id="zone-paused"></a>
## Zone pausiert

`zone_paused` wird beim Wechsel einer Zone von null zu einem Pausengrund gesendet. Bei `action: turn_off` wird davor für das Ausschalten `climate_target_applied` gesendet.

```yaml
domain: velair
event: zone_paused
entity_id: climate.guest_room
started_at: "2026-07-09T12:00:00+02:00"
until: "2026-07-12T18:00:00+02:00"
action: turn_off
pause_id: velair_window_guard
```

`zone_pause_added`, `zone_pause_updated` und `zone_pause_removed` beschreiben einzelne Gründe und enthalten `pause_id`, wenn zugeordnet. Eine genau identische Wiederholung eines identifizierten Grunds sendet kein Ereignis. Ältere und manuelle Gründe lassen die ID weg.

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
## Zone fortgesetzt

`zone_resumed` wird erst beim manuellen Entfernen oder Ablauf des letzten Grunds gesendet. Wird der aktuelle Zeitplan erneut angewendet, beschreibt ein späteres `climate_target_applied` dessen Ziel.

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
## Vorgänge ohne Laufzeitereignisse

Vorlagenerstellung, Panelpräferenzen, Datenimport und Einstellungsreset verändern Konfiguration ohne Laufzeit-Automationsereignisse. Zeitplanänderungen haben kein eigenes Konfigurationsereignis, können aber Planaufhebung/-aktualisierung oder bei geändertem aktivem Ziel `climate_target_applied` erzeugen.

<a id="delivery-meaning"></a>
## Bedeutung der Übermittlung

Ein Anwendungsereignis wird erst nach Annahme der vollständigen Modus-, Ziel- und unterstützten Optionsaufruffolge für die aktuelle Absicht durch Home Assistant gesendet. Fehlgeschlagene oder überholte Versuche senden es nicht. Es bestätigt Befehlsannahme, nicht bereits erreichte Temperatur oder HVAC-Zustand des physischen Geräts.
