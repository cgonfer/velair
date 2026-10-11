<a id="automation-events"></a>
# Zdarzenia automatyzacji
<!-- velair-docs:start -->
Tłumaczenia: [Oryginał w języku angielskim](automation-events.md) · [Español](automation-events.es.md) · [Français](automation-events.fr.md) · [Deutsch](automation-events.de.md) · [Italiano](automation-events.it.md) · [Nederlands](automation-events.nl.md) · [Polski](automation-events.pl.md) · [Português (Brasil)](automation-events.pt-br.md) · [Português (Portugal)](automation-events.pt-pt.md) · [Русский](automation-events.ru.md) · [Status tłumaczeń](../translation-status.md)

<details>
<summary>Status tego tłumaczenia</summary>

| Informacja | Status |
| --- | --- |
| Wersja odniesienia | 1.9.0-beta.1 |
| Ostatnia synchronizacja | 2026-10-11 |
| Korekta językowa | Tłumaczenie wspomagane przez AI |
| Zgodność z oryginałem | Zgodne z aktualnym angielskim oryginałem. |

</details>

---
<!-- velair-docs:end -->

Velair emituje surowe, chwilowe zdarzenia Home Assistant dotyczące zmian podczas działania. Dane na magistrali zdarzeń istnieją tylko podczas ich dostarczania. Velair nie udostępnia archiwum zdarzeń ani API do ich odtwarzania. Otwarcie lub odświeżenie panelu nie emituje tych zdarzeń.

Diagnostyka działa osobno. Dla włączonych kategorii może przechowywać oczyszczone podsumowania wybranych zdarzeń w ograniczonej historii w pamięci, do 100 wpisów. Historia znika przy restarcie Velair lub Home Assistant, nie jest historią Recorder i nie wydłuża czasu życia oryginalnego zdarzenia.

Wszystkie zdarzenia używają:

```yaml
event_type: velair_event
```

Filtruj `event_data.event`, a dla zdarzeń stref także `event_data.entity_id`:

```yaml
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: climate_target_applied
      entity_id: climate.living_room
```

Każdy zestaw danych zawiera `domain: velair` i jedną z poniższych nazw zdarzeń.

<a id="external-climate-change-detected"></a>
## Wykrycie zewnętrznej zmiany urządzenia

`external_climate_change_detected` pojawia się, gdy zarządzane urządzenie zmienia tryb HVAC lub nastawę, a zmiany nie można przypisać do działania Velair. To obserwacja: `non-Velair` nie musi oznaczać człowieka, ponieważ źródłem może być pilot lub inna automatyzacja.

Wykrywanie obejmuje `hvac_mode`, pojedynczą `temperature` oraz natywne `target_temp_low` i `target_temp_high`. Odczyty środowiskowe oraz opcje wentylatora, presetu, nawiewu czy wilgotności nie wywołują tego zdarzenia. Przejścia do lub ze stanów `unknown` i `unavailable` są pomijane. Model rozpoznawania, ograniczenia, polityki i pełne przykłady opisują [Zmiany zewnętrzne i sterowanie ręczne](manual-control.pl.md).

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

`policy` wskazuje politykę obowiązującą dla zmiany. Podczas aktywnej sesji ręcznej pozostaje to polityka sesji, nawet jeśli zmieniono domyślne Ustawienia. `keep_automatic` oznacza brak utworzenia sesji ręcznej i ponowne ustalenie obowiązującego polecenia. Takie wykrycie nie ma więc odpowiadającego zdarzenia wejścia `zone_control_changed`.

`zone_control_changed` jest emitowane przy wejściu w sterowanie ręczne lub powrocie do automatyki. Jego `control_mode` to `manual` albo `automatic`, celowo niezależne od Trybu Velair Manual.

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

`source` wynosi `external_change`, gdy sesję utworzyła zmiana zewnętrzna, lub `explicit`, gdy panel albo `velair.enter_manual_adjustment` przechwycił bieżący stan. `duration_minutes` występuje tylko dla `for_duration`.

Wejście `until_resumed` pomija `until`. Automatyczne wyjście zawiera `reason: expired`, a jawne `reason: resumed`. Wyjście nie usuwa niezależnych powodów pauzy, które nadal mogą blokować fizyczne zastosowanie harmonogramu.

Równoważne akcje usług:

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
## Zmiana problemu diagnostycznego

`diagnostic_issue_changed` jest emitowane po wykryciu lub rozwiązaniu sprawdzalnego problemu. Problemy obecne przy uruchomieniu tworzą stan odniesienia, więc restart nie emituje serii już aktywnych problemów. Niezmienione problemy są deduplikowane.

Tożsamość problemu tworzą `code`, opcjonalne `entity_id` zarządzanego urządzenia oraz opcjonalne `purpose` czujnika. Dane nie zawierają surowego komunikatu wyjątku, identyfikatora Profilu, Trybu lub pauzy ani domniemanej przyczyny. `change` to `detected` lub `resolved`, a `severity` — `warning` lub `error`.

```yaml
domain: velair
event: diagnostic_issue_changed
change: detected
severity: error
code: delivery_exhausted
entity_id: climate.living_room
```

Przykład powiadomienia o każdym nowym błędzie:

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

Do zbiorczej oceny działania użyj czujnika **Stan diagnostyki**. ID encji można zmienić w Home Assistant, więc wybierz ją w edytorze automatyzacji:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_diagnostics_status
    to: "error"
```

<a id="profile-changed"></a>
## Zmiana Profilu

`profile_changed` pojawia się po trwałym zapisaniu innego zestawu Profili lub harmonogramów Default. Bezpośredni wybór już aktywnego zestawu może przełączyć natywną encję Trybu na Manual, ale nie emituje `profile_changed`, ponieważ efektywne Profile się nie zmieniły.

```yaml
domain: velair
event: profile_changed
profile_ids:
  - away
  - bedrooms
previous_profile_ids: []
source: select
```

`source` wskazuje źródło efektywnego wyboru. Publiczne wartości to `panel`, `service` i `select`; wewnętrzne operacje mogą podać dokładniejszą wartość, jak `profile_deleted` lub `mode_updated`. Uporządkowane listy ID opisują pełny nowy i poprzedni zestaw. Pusta lista `profile_ids` oznacza Default.

Poniższa automatyzacja reaguje, gdy Profil o ID `away` dołącza do aktywnego zestawu:

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

Aby reagować na powrót do Default, użyj warunku szablonu `trigger.event.data.profile_ids == []`.

<a id="scheduler-mode-changed"></a>
## Zmiana trybu harmonogramu

`scheduler_mode_changed` pojawia się przy zmianie globalnego trybu lub terminu pauzy, także przy automatycznym wygaśnięciu. Powtórzenie tego samego trybu i terminu nie emituje zdarzenia.

```yaml
domain: velair
event: scheduler_mode_changed
mode: paused
previous_mode: auto
paused_until: "2026-07-09T18:30:00+02:00"
paused_started_at: "2026-07-09T17:00:00+02:00"
```

<a id="climate-target-applied"></a>
## Zastosowanie nastawy urządzenia

`climate_target_applied` pojawia się po zastosowaniu temperatury harmonogramu, akcji tylko trybu, tylko opcji, wyłączenia, przywróconego harmonogramu, harmonogramu przy uruchomieniu albo usług `velair.set_temperature` lub `velair.set_hvac_mode`. Nieobsługiwane opcje są pomijane.

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

Częste wartości `source` to `scheduled_event`, `current_schedule`, `schedule_saved`, `scheduler_resumed`, `startup`, `service_set_temperature`, `service_set_hvac_mode`, `boost_ended`, `zone_paused`, `zone_resumed` i `zone_pause_expired`.

Dla zakresu pomijane jest `temperature`, a zdarzenie zawiera obie granice:

```yaml
target_temp_low: 20
target_temp_high: 24
hvac_mode: heat_cool
```

Dla bloku tylko trybu `action` wynosi `set_hvac_mode`, `hvac_mode` wskazuje zastosowany tryb, a pola temperatur są pomijane. Automatyzacja może dzięki temu odróżnić przekazanie trybu od zmiany temperatury. Taki sam kształt danych wykorzystuje `velair.set_hvac_mode`, z `source: service_set_hvac_mode`, bez pól harmonogramu `weekday` i `start`.

Dla bloku tylko opcji `action` to `set_climate_options`. Zdarzenie zawiera zastosowane opcje, np. `preset_mode` lub `fan_mode`, i pomija temperatury oraz `hvac_mode`. Taki blok nie włącza wyłączonego urządzenia.

<a id="preconditioning-plan-updated"></a>
## Aktualizacja planu przygotowania

`preconditioning_plan_updated` jest emitowane po opublikowaniu nowego planu wcześniejszego rozpoczęcia lub zmianie danych wejściowych albo wyników. Identyczne przeliczenia są deduplikowane. Planowanie przy uruchomieniu może emitować zdarzenie; obliczenie wyłącznie na potrzeby odpowiedzi panelu go nie emituje.

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

Dla natywnego zakresu `target_temperature` to `null`, a dane zawierają pełną parę `target_temp_low` i `target_temp_high`. `target_kind` to `range`, `target_boundary` to `low` lub `high`, a `boundary_temperature` wskazuje jedną efektywną granicę używaną przez predyktor. `temperature_delta` jest mierzona względem tej granicy. Plany pojedynczej temperatury zachowują `target_kind: scalar` i `target_boundary: temperature`.

Przykładowa prognoza ogrzewania dla `20–24 °C` zawiera:

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
## Anulowanie planu przygotowania

`preconditioning_plan_cancelled` pojawia się raz, gdy wcześniej opublikowany plan przestaje istnieć, np. po edycji harmonogramu, zmniejszeniu różnicy temperatur, wyłączeniu przygotowania lub wyjściu z automatyki. Powtarza ostatni opublikowany plan, aby automatyzacja mogła rozpoznać anulowany element.

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

`reason` to `no_longer_planned`, gdy przeliczenie usuwa plan, lub `scheduler_not_auto` przy pauzie bądź zatrzymaniu automatyki.

<a id="preconditioning-observation-recorded"></a>
## Zapis obserwacji uczenia

`preconditioning_observation_recorded` pojawia się po walidacji obserwacji, przycięciu historii do ustawionego rozmiaru i trwałym zapisaniu. `quality` może być `complete`, `partial` lub `invalid`.

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

Nieprawidłowa obserwacja zawiera również `invalid_reason`.

<a id="comfort-assessment-changed"></a>
## Zmiana oceny komfortu

`comfort_assessment_changed` jest emitowane, gdy zmienia się `condition`, `air_quality`, `data_quality`, `data_issues` lub znaczeniowy stan włączonej miary pochodnej. Ten stan obejmuje dostępność, źródło, encję, jednostkę, problemy i ocenę warunków. Same liczbowe zmiany odczytów bazowych lub pochodnych nadal odświeżają interfejs i atrybuty czujników, ale nie emitują kolejnego zdarzenia, ograniczając ruch na magistrali.

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

Pola zakresów służą prostym automatyzacjom, nie zastępując zgodnego pola fizycznej oceny `condition`.

Szablony bieżącego stanu i wyzwalacze opisuje pełny [kontrakt encji warunków otoczenia](zone-sensors.pl.md#environmental-condition). Użyj zdarzenia, gdy znaczenie ma poprzednia wartość lub dokładne przejście.

| `status` | Znaczenie |
| --- | --- |
| `within_range` | Każda użyteczna monitorowana wartość mieści się w ustawionym zakresie. |
| `outside_range` | Co najmniej jedna użyteczna wartość jest poza zakresem; temperatura i Humidex zajmują zgodne pozycje, jeśli oba są włączone. |
| `mixed` | Temperatura i Humidex zajmują różne pozycje względem zakresów. |
| `unavailable` | Wymaganej wartości lub włączonego Humidex nie można obecnie ocenić. |

| `thermal_relation` | Znaczenie |
| --- | --- |
| `aligned` | Temperatura i Humidex zajmują tę samą pozycję. |
| `mixed` | Bieżąca temperatura i Humidex zajmują różne pozycje względem zakresów. |
| `not_evaluated` | Humidex jest wyłączony. |
| `unavailable` | Temperatury lub włączonego Humidex nie można ocenić. |

Każda pozycja w `positions` ma wartość `below`, `within`, `above` lub `null`. Zdarzenie zawiera też całe poprzednie podsumowanie. `range_summary_changed` oznacza dowolną zmianę stanu, relacji cieplnej lub pozycji; `range_status_changed` tylko zmianę zbiorczego `status`. Obie flagi wynoszą `false`, gdy zdarzenie wynika z innej części oceny komfortu.

`comfort_zone` używa jednostki urządzenia. Efektywny zakres jest taki sam jak dla oceny wilgotności i wskazówek dotyczących powietrza zewnętrznego. Przy modelu prowadzonym lub niestandardowym zależnym od temperatury wynosi `null`, jeśli temperatury nie da się ocenić; automatyzacje nie powinny zastępować go dawnymi stałymi granicami wilgotności. Same liczbowe zmiany zakresu aktualizują atrybuty i API, lecz nie emitują zdarzenia bez udokumentowanej zmiany znaczeniowej.

Zdarzenie zawiera bieżące `ventilation_opportunity`. Zmiany stanu, zakresu zastosowania, efektów, blokad lub przyczyny mają znaczenie semantyczne; same zmiany liczbowe na zewnątrz bez zmiany tych pól nie emitują zdarzenia.

Automatyzacja reagująca tylko na nowe wyjście strefy poza ustawione zakresy:

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

`insights` to uporządkowana interpretacja bieżących danych wewnętrznych, istniejąca tylko podczas działania. Pola są stabilnymi identyfikatorami, a nie przetłumaczonym tekstem. Zmiana znaczenia wskazówki może emitować zdarzenie; nieaktualne, brakujące lub nieprawidłowe odczyty nie tworzą wskazówek. Dane zawierają całą bieżącą listę, także `insights: []`, gdy znika ostatnia wskazówka. `condition` pozostaje podsumowaniem oceny i nie jest powielane jako wskazówka.

Przy włączonym porównaniu zewnętrznym zdarzenie zawiera całe poddrzewo `outdoor`. Jego jakość i problemy nie zmieniają wewnętrznych `data_quality` ani `data_issues`. Zdarzenia reagują na zmiany dostępności, jakości, `effect`, `potential`, `blocked_by` lub listy wskazówek; zwykłe liczbowe zmiany bez nowego znaczenia nie emitują zdarzeń. `guidance_thresholds` wskazuje efektywną czułość strefy wykorzystaną do oceny. Zmiana progu bez zmiany wyniku znaczeniowego aktualizuje stan, lecz nie emituje zdarzenia.

Dane miar zawierają `freshness: reported | unverified`. Wewnętrzna lub zewnętrzna `data_quality` może wynosić `unverified`, gdy wszystkie odczyty są użyteczne, lecz co najmniej jeden nie ma weryfikowalnego czasu raportu. Bezpośrednie czujniki mogą stać się nieaktualne po upływie terminu raportu bez zmiany wartości stanu. Poddrzewo jawnie zawiera wewnętrzną wilgotność bezwzględną; odbiorcy nie powinni odtwarzać jej z zaokrąglonych różnic. Kody wentylacji opisują jedynie możliwość lub kompromis, nie otwarcie okna ani zmianę urządzenia przez Velair.

Tylko dane pochodnego Humidex zawierają `temperature_range_position`. Pole zawsze jest tam obecne jako `below`, `within`, `above` lub `null`; przejście między nimi może emitować zdarzenie. To obserwacyjne porównanie z zakresem temperatury, a nie werdykt komfortu czy polecenie sterowania.

<a id="room-sensor-assist-state-changed"></a>
## Zmiana stanu wspomagania czujnikiem pokojowym

`room_sensor_assist_state_changed` jest emitowane po włączeniu lub wyłączeniu Room Assist przez panel, Lovelace, API albo usługę. Powtórzenie tego samego stanu nie emituje zdarzenia.

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
## Aktualizacja wspomagania czujnikiem pokojowym

`room_sensor_assist_updated` pojawia się dopiero po wysłaniu zmienionej tymczasowej nastawy. Ruch mniejszy niż krok urządzenia nie emituje zdarzenia.

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

Dla stałej pojedynczej temperatury `heat` lub `cool` z niezerową strefą nieczułości cztery pola histerezy opisują zastosowaną fazę, aktywną krawędź i pełny pas przełączania. Są pomijane przy zerowej strefie, pojedynczych temperaturach automatycznych i natywnych zakresach. Faza nie zmienia się przy przekraczaniu środkowej temperatury harmonogramu, lecz dopiero po osiągnięciu przeciwnej krawędzi przez osobny czujnik pokojowy.

Gdy temperatura harmonogramu chroni wynik stałego ogrzewania lub chłodzenia, aktualizacja dodaje dwa opcjonalne pola:

```yaml
target_temperature: 22
calculated_temperature: 20
applied_temperature: 22
scheduled_target_guard: cooling_floor
direction: cool
```

`calculated_temperature` to obsługiwana nastawa przed ochroną harmonogramu. Istniejące automatyzacje pozostają zgodne, ponieważ pola są dodatkiem i są pomijane, gdy ochrona nie działa.

Dla natywnego zakresu pojedyncze temperatury są pomijane, a raportowane są oba pełne pasy:

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
## Przywrócenie po wspomaganiu czujnikiem pokojowym

`room_sensor_assist_restored` pojawia się po zakończeniu sterowania tymczasową nastawą i przywróceniu zwykłego celu, jeśli to możliwe. W stałym cyklu osiągnięcie aktywnej krawędzi nadal należy do `room_sensor_assist_updated`: odwraca fazę i może zmienić `applied_offset` ze znakiem. Cel harmonogramu pozostaje granicą bezpieczeństwa w fazie bez żądania pracy, nawet przy zmianach czujnika urządzenia. Jeśli zaokrąglenie sprawia, że nowe polecenie jest zbędne, faza nadal zmienia się w interfejsie, ale zdarzenie aktualizacji nie pojawia się. `reason` wyjaśnia emitowane przejście.

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

Inne przyczyny to `assist_disabled`, `boost_started`, `manual_target`, `missing_temperature`, `no_active_target`, `not_auto`, `schedule_changed`, `schedule_cleared`, `scheduler_mode_changed`, `scheduler_stopped`, `settings_updated`, `turn_off`, `unsupported_mode`, `zone_paused` i `zone_unavailable`. `unsupported_temperature_range` nadal może dotyczyć starszej pojedynczej temperatury niemożliwej do zastosowania w trybie wymagającym zakresu; prawidłowe bloki zakresu są obsługiwane.

<a id="boost-started"></a>
## Rozpoczęcie Wzmocnienia

`boost_started` pojawia się po zastosowaniu i trwałym zapisaniu celu oraz nadpisania Wzmocnienia. Zastąpienie aktywnego Wzmocnienia emituje kolejne `boost_started`.

Zakresy używają `target_temp_low` i `target_temp_high` zamiast `temperature`. Dane przywracania zachowują tę samą postać celu.

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
## Zakończenie Wzmocnienia

`boost_ended` jest emitowane po wygaśnięciu lub anulowaniu Wzmocnienia. `reason` to `expired` lub `manual`. `restoration` opisuje następnie zastosowany stan.

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

`restoration.type` może wynosić `schedule`, `previous_state` lub `none`. Przywrócenie harmonogramu emituje również `climate_target_applied` z `source: boost_ended`.

<a id="zone-paused"></a>
## Wstrzymanie strefy

`zone_paused` pojawia się, gdy liczba powodów pauzy zmienia się z zera na jeden. Przy `action: turn_off` najpierw emitowane jest `climate_target_applied` dla wyłączenia.

```yaml
domain: velair
event: zone_paused
entity_id: climate.guest_room
started_at: "2026-07-09T12:00:00+02:00"
until: "2026-07-12T18:00:00+02:00"
action: turn_off
pause_id: velair_window_guard
```

`zone_pause_added`, `zone_pause_updated` i `zone_pause_removed` opisują zmiany poszczególnych powodów i zawierają `pause_id`, jeśli został podany. Dokładne powtórzenie zidentyfikowanego powodu nie emituje zdarzenia. Starsze i ręczne powody pomijają ID.

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
## Wznowienie strefy

`zone_resumed` pojawia się dopiero po ręcznym usunięciu lub wygaśnięciu ostatniego powodu. Jeśli harmonogram zostaje ponownie zastosowany, późniejsze `climate_target_applied` opisuje jego cel.

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
## Operacje bez zdarzeń działania

Tworzenie szablonów, zmiana preferencji panelu, import danych i reset ustawień aktualizują konfigurację, ale nie emitują zdarzeń automatyzacji. Edycje harmonogramu nie mają osobnego zdarzenia konfiguracji, choć mogą anulować lub aktualizować plan albo emitować `climate_target_applied`, jeśli zmieniają aktualny cel.

<a id="delivery-meaning"></a>
## Znaczenie potwierdzenia wykonania

Zdarzenie zastosowania pojawia się dopiero po zaakceptowaniu przez Home Assistant pełnej sekwencji trybu, celu i obsługiwanych opcji dla aktualnego polecenia Velair. Próby nieudane lub zastąpione nowszym poleceniem nie emitują go. Zdarzenie potwierdza przyjęcie polecenia, nie osiągnięcie żądanej temperatury ani fizycznego stanu HVAC.
