<a id="automation-events"></a>
# События для автоматизаций
<!-- velair-docs:start -->
Переводы: [Оригинал на английском](automation-events.md) · [Español](automation-events.es.md) · [Français](automation-events.fr.md) · [Deutsch](automation-events.de.md) · [Italiano](automation-events.it.md) · [Nederlands](automation-events.nl.md) · [Polski](automation-events.pl.md) · [Português (Brasil)](automation-events.pt-br.md) · [Português (Portugal)](automation-events.pt-pt.md) · [Русский](automation-events.ru.md) · [Статус переводов](../translation-status.md)

<details>
<summary>Статус этого перевода</summary>

| Сведения | Статус |
| --- | --- |
| Версия для сверки | 1.9.0-beta.1 |
| Последняя синхронизация | 2026-10-11 |
| Языковая проверка | Перевод с помощью ИИ |
| Соответствие оригиналу | Соответствует актуальному английскому оригиналу. |

</details>

---
<!-- velair-docs:end -->

Velair публикует исходные кратковременные события Home Assistant об изменениях во время работы. Данные шины событий существуют только при их доставке Home Assistant; Velair не предоставляет архива событий или API повторного воспроизведения. Открытие или обновление панели не публикует эти события.

Диагностика работает отдельно. Для включённых категорий она может сохранять очищенную от конфиденциальных данных сводку выбранных событий в ограниченной истории памяти, не более 100 записей. История очищается при перезапуске Velair или Home Assistant, не является историей Recorder и не меняет и не продлевает жизнь исходного события автоматизации.

Все события используют:

```yaml
event_type: velair_event
```

Фильтруйте `event_data.event` и для событий зоны `event_data.entity_id`:

```yaml
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: climate_target_applied
      entity_id: climate.living_room
```

Каждое событие содержит `domain: velair` и одно из приведённых ниже имён.

<a id="external-climate-change-detected"></a>
## Обнаружение внешнего изменения управления

`external_climate_change_detected` публикуется при изменении HVAC или уставки управляемого устройства, которое нельзя связать с климатическим действием Velair. Событие наблюдательное: `non-Velair` не обязательно означает человека — источником могут быть пульт или другая автоматизация.

Отслеживаются `hvac_mode`, одиночная `temperature` и собственные `target_temp_low`/`target_temp_high`. Показания среды и параметры вентилятора, пресета, направления потока или влажности не создают это событие. Переходы в `unknown` и `unavailable` и обратно игнорируются. Модель определения принадлежности, ограничения, правила и полные последовательности описаны во [Внешних изменениях и ручной настройке](manual-control.ru.md).

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

`policy` — правило, управляющее изменением. При активной ручной настройке остаётся правило сеанса, даже если будущие значения по умолчанию в настройках изменены. `keep_automatic` означает отсутствие ручной настройки и повторное определение текущего приоритетного действия Velair. Поэтому у такого обнаружения нет соответствующего события начала `zone_control_changed`.

`zone_control_changed` публикуется при входе зоны в ручную настройку или возвращении к автоматическому управлению. `control_mode` равен `manual` или `automatic` и намеренно отделён от режима Velair **Ручной** (`Manual`).

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

`source` равен `external_change`, если сеанс создан внешним изменением, и `explicit`, если панель или `velair.enter_manual_adjustment` сохранили текущее состояние устройства. `duration_minutes` присутствует только для `for_duration`.

Начало `until_resumed` не содержит `until`. Автоматическое завершение содержит `reason: expired`, явное — `reason: resumed`. Выход из ручной настройки не удаляет независимые причины паузы, всё ещё запрещающие физическое применение расписания.

Соответствующие действия служб:

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
## Изменение диагностической проблемы

`diagnostic_issue_changed` публикуется при обнаружении или устранении проверяемой проблемы. Уже имеющиеся при запуске проблемы становятся исходным состоянием, поэтому перезапуск не создаёт поток старых активных проблем. Неизменные проблемы не дублируются.

Проблема определяется `code`, необязательным `entity_id` управляемого устройства и необязательным `purpose` датчика. Данные не содержат исходного текста исключения, ID профиля, режима или паузы либо предполагаемой причины. `change` равен `detected` или `resolved`, `severity` — `warning` или `error`.

```yaml
domain: velair
event: diagnostic_issue_changed
change: detected
severity: error
code: delivery_exhausted
entity_id: climate.living_room
```

Например, уведомляйте при каждой новой ошибке:

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

Для общей исправности используйте датчик **Состояние диагностики**. Его ID может меняться в Home Assistant, поэтому выберите его в редакторе автоматизации:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_diagnostics_status
    to: "error"
```

<a id="profile-changed"></a>
## Изменение профиля

`profile_changed` публикуется после сохранения другого набора климатических профилей или расписаний по умолчанию. Прямой выбор того же активного набора может перевести собственную сущность режима в Manual, но не публикует `profile_changed`, поскольку действующие профили не изменились.

```yaml
domain: velair
event: profile_changed
profile_ids:
  - away
  - bedrooms
previous_profile_ids: []
source: select
```

`source` указывает происхождение действующего выбора. Публичные значения — `panel`, `service` и `select`; внутренние операции жизненного цикла могут сообщать более точное, например `profile_deleted` или `mode_updated`. Упорядоченные списки ID описывают полный новый и прежний активные наборы. Пустой `profile_ids` означает расписания по умолчанию.

Например, эта автоматизация реагирует, когда профиль с ID `away` входит в активный набор:

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

Для реакции на возврат к расписаниям по умолчанию используйте шаблонное условие `trigger.event.data.profile_ids == []`.

<a id="scheduler-mode-changed"></a>
## Изменение режима планировщика

`scheduler_mode_changed` публикуется при изменении общего режима или срока паузы, включая автоматическое истечение. Повторение того же режима и срока не создаёт событие.

```yaml
domain: velair
event: scheduler_mode_changed
mode: paused
previous_mode: auto
paused_until: "2026-07-09T18:30:00+02:00"
paused_started_at: "2026-07-09T17:00:00+02:00"
```

<a id="climate-target-applied"></a>
## Применение цели устройства

`climate_target_applied` публикуется после применения запланированной цели, действия только режима, только параметров, выключения, восстановленного расписания, расписания запуска или вызова `velair.set_temperature` / `velair.set_hvac_mode`. Неподдерживаемые дополнительные параметры пропускаются.

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

Обычные значения `source`: `scheduled_event`, `current_schedule`, `schedule_saved`, `scheduler_resumed`, `startup`, `service_set_temperature`, `service_set_hvac_mode`, `boost_ended`, `zone_paused`, `zone_resumed` и `zone_pause_expired`.

Для диапазона `temperature` отсутствует; событие содержит обе границы:

```yaml
target_temp_low: 20
target_temp_high: 24
hvac_mode: heat_cool
```

Для блока только режима `action` равен `set_hvac_mode`, `hvac_mode` — применённому режиму, а все температурные цели пропущены. Автоматизации могут отличать передачу режима от изменения цели. Те же данные используются `velair.set_hvac_mode` с `source: service_set_hvac_mode` и без полей расписания `weekday` и `start`.

Для блока только параметров `action` равен `set_climate_options`. Событие содержит применённые параметры, например `preset_mode` или `fan_mode`, без температурных целей и `hvac_mode`. Такие блоки не включают выключенное устройство.

<a id="preconditioning-plan-updated"></a>
## Обновление плана предварительной подготовки

`preconditioning_plan_updated` публикуется при новом плане раннего запуска или изменении входов либо результатов расчёта. Одинаковые пересчёты не дублируются. Планирование при запуске может публиковать событие; расчёт только для ответа панели — нет.

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

Для собственного диапазона `target_temperature` равен `null`, а данные содержат полную пару `target_temp_low` и `target_temp_high`. `target_kind` равен `range`, `target_boundary` — `low` или `high`, `boundary_temperature` — одной действующей границе прогнозирования. `temperature_delta` измеряется относительно неё. Одиночные планы сохраняют `target_kind: scalar` и `target_boundary: temperature`.

Например, прогноз отопления для `20–24 °C` содержит:

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
## Отмена плана предварительной подготовки

`preconditioning_plan_cancelled` публикуется один раз при исчезновении ранее опубликованного плана: например, после правки расписания, уменьшения разницы температур, отключения подготовки или выхода из автоматического режима. Событие повторяет последний план для определения отменённого действия автоматизацией.

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

`reason` равен `no_longer_planned`, если пересчёт удаляет план, и `scheduler_not_auto` при паузе или остановке автоматического расписания.

<a id="preconditioning-observation-recorded"></a>
## Запись наблюдения предварительной подготовки

`preconditioning_observation_recorded` публикуется после проверки обучающего наблюдения, ограничения истории настроенным размером и сохранения. `quality` может быть `complete`, `partial` или `invalid`.

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

Недействительное наблюдение также содержит `invalid_reason`.

<a id="comfort-assessment-changed"></a>
## Изменение оценки Комфорта

`comfort_assessment_changed` публикуется при изменении `condition`, `air_quality`, `data_quality`, `data_issues` или смыслового состояния включённого расчётного показателя. Смысловое состояние включает доступность, источник, сущность, единицу, проблемы и классификацию. Числовые изменения базовых и расчётных показаний продолжают обновлять интерфейс и атрибуты датчиков без нового события, не перегружая шину.

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

Поля диапазонов предназначены для простых автоматизаций без замены совместимого физического поля `condition`.

Для шаблонов текущего состояния и триггеров состояния см. полное [описание сущности состояния окружающей среды](zone-sensors.ru.md#environmental-condition). Используйте событие, если важны предыдущее значение или точный переход.

| `status` | Значение |
| --- | --- |
| `within_range` | Все пригодные отслеживаемые значения внутри настроенных диапазонов. |
| `outside_range` | Хотя бы одно пригодное значение вне диапазона; температура и Humidex согласованы, когда оба включены. |
| `mixed` | Температура и Humidex занимают разные позиции относительно диапазона. |
| `unavailable` | Требуемое отслеживаемое значение или включённый Humidex нельзя оценить. |

| `thermal_relation` | Значение |
| --- | --- |
| `aligned` | Температура и Humidex занимают одинаковую позицию. |
| `mixed` | Температура и Humidex занимают разные позиции. |
| `not_evaluated` | Humidex отключён. |
| `unavailable` | Температуру или включённый Humidex нельзя оценить. |

Каждое значение `positions` равно `below`, `within`, `above` или `null`. Событие также содержит полную прежнюю сводку. `range_summary_changed` сообщает любое изменение статуса, температурного соотношения или позиции; `range_status_changed` — только общего `status`. Оба равны `false`, если событие вызвано другой частью оценки.

`comfort_zone` использует единицу температуры устройства. Действующий диапазон тот же, что у классификации влажности и наружных подсказок. Для управляемой или пользовательской температурно-зависимой модели он `null`, когда температура не оценивается: автоматизации не должны подставлять прежние фиксированные границы влажности. Обычные числовые изменения диапазона обновляют атрибуты и API без события, если не меняется описанный смысловой результат. Событие содержит текущую `ventilation_opportunity`. Изменения состояния, области, эффектов, блокировок или причины смысловые; колебания наружных чисел без изменения полей не создают событие.

Например, автоматизация реагирует только на новый выход зоны за диапазоны:

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

`insights` — упорядоченная интерпретация текущих внутренних данных, существующая только во время работы. Поля — стабильные ID, а не переведённый текст. Смысловое изменение подсказки может публиковать событие; устаревшие, отсутствующие или ошибочные показания не дают подсказки. Событие содержит полный текущий список, включая `insights: []` при исчезновении последней подсказки. `condition` остаётся сводной оценкой и не дублируется подсказкой.

При наружном сравнении событие содержит всё поддерево `outdoor`. Его качество и проблемы не меняют внутренние `data_quality` и `data_issues`. События реагируют на доступность, качество, `effect`, `potential`, `blocked_by` или список подсказок; обычные числовые изменения с тем же смыслом не публикуют событие. `guidance_thresholds` сообщает действующую чувствительность зоны. Изменение порога без нового смыслового результата обновляет текущее состояние без события.

Текущие данные показателей содержат `freshness: reported | unverified`. Внутренние или наружные `data_quality` могут быть `unverified`, если все значения пригодны, но хотя бы одно без проверяемого времени сообщения. Прямые датчики могут устаревать по сроку сообщения без изменения числа. Внутренняя абсолютная влажность указана явно; её нельзя восстанавливать по округлённым разницам. Коды проветривания описывают только возможность или компромисс, а не открытие окна или изменение устройства Velair.

Только расчётные данные Humidex включают `temperature_range_position`. Поле присутствует всегда: `below`, `within`, `above` или `null`; переход может публиковать событие. Это наблюдательное сравнение с температурным диапазоном, а не заключение о комфорте или команда управления.

<a id="room-sensor-assist-state-changed"></a>
## Изменение включения Room Assist

`room_sensor_assist_state_changed` публикуется при включении или отключении через панель, Lovelace, API или службу. Повторение состояния не публикует событие.

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
## Обновление Room Assist

`room_sensor_assist_updated` публикуется только после отправки изменённой временной цели. Изменения меньше шага цели не публикуют его.

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

Для фиксированной одиночной цели `heat` или `cool` с ненулевой зоной четыре поля гистерезиса указывают применённую фазу, активный край и полный диапазон переключения. При нулевой зоне, одиночных автоматических режимах и собственных диапазонах они отсутствуют. Фаза сохраняется при пересечении центра расписания и меняется только при достижении противоположного края отдельным комнатным датчиком.

При защите цели фиксированного отопления или охлаждения обновление добавляет два необязательных поля:

```yaml
target_temperature: 22
calculated_temperature: 20
applied_temperature: 22
scheduled_target_guard: cooling_floor
direction: cool
```

`calculated_temperature` — поддерживаемая цель до защиты расписания. Существующие автоматизации совместимы: поля добавляются и пропускаются при неактивной защите.

Для собственного диапазона одиночные поля отсутствуют; сообщаются обе полные полосы:

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
## Восстановление после Room Assist

`room_sensor_assist_restored` публикуется при прекращении временной коррекции и восстановлении обычной цели расписания, где возможно. В фиксированном цикле достижение активного края остаётся частью `room_sensor_assist_updated`: меняет фазу и может менять знак `applied_offset`. Цель расписания остаётся защитной границей в фазе без запроса работы, даже при смещении встроенного датчика. Если округление шага делает новую команду ненужной, фаза всё равно меняется в текущем состоянии, но событие обновления не публикуется. `reason` объясняет опубликованный переход.

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

Другие причины: `assist_disabled`, `boost_started`, `manual_target`, `missing_temperature`, `no_active_target`, `not_auto`, `schedule_changed`, `schedule_cleared`, `scheduler_mode_changed`, `scheduler_stopped`, `settings_updated`, `turn_off`, `unsupported_mode`, `zone_paused` и `zone_unavailable`. `unsupported_temperature_range` возможно для старой одиночной цели, которую нельзя применить в текущем режиме, требующем собственного диапазона; корректные блоки диапазона поддерживаются.

<a id="boost-started"></a>
## Начало форсированного режима

`boost_started` публикуется после применения и сохранения цели и переопределения. Замена активного режима публикует новое `boost_started`.

Диапазоны используют `target_temp_low` и `target_temp_high` вместо `temperature`. Данные восстановления сохраняют ту же форму цели.

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
## Завершение форсированного режима

`boost_ended` публикуется при истечении или отмене. `reason` — `expired` или `manual`; `restoration` описывает применяемое затем состояние.

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

`restoration.type` может быть `schedule`, `previous_state` или `none`. Восстановление расписания также публикует `climate_target_applied` с `source: boost_ended`.

<a id="zone-paused"></a>
## Пауза зоны

`zone_paused` публикуется при переходе от нуля причин к одной. Если `action` равен `turn_off`, сначала публикуется `climate_target_applied` для выключения.

```yaml
domain: velair
event: zone_paused
entity_id: climate.guest_room
started_at: "2026-07-09T12:00:00+02:00"
until: "2026-07-12T18:00:00+02:00"
action: turn_off
pause_id: velair_window_guard
```

`zone_pause_added`, `zone_pause_updated` и `zone_pause_removed` описывают изменения отдельных причин и включают `pause_id`, если задан. Точное повторение с ID не публикует событие. Старые и ручные причины не содержат ID.

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
## Возобновление зоны

`zone_resumed` публикуется только при ручном удалении или истечении последней причины. Если текущее расписание применяется снова, последующее `climate_target_applied` описывает цель.

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
## Операции без рабочих событий

Создание шаблонов, изменение предпочтений панели, импорт и сброс настроек обновляют конфигурацию без событий автоматизации. Правка расписаний не имеет отдельного конфигурационного события, но может вызывать отмену или обновление планов либо `climate_target_applied` при изменении текущей цели.

<a id="delivery-meaning"></a>
## Что подтверждает отправка

Событие применения публикуется только после принятия Home Assistant всей последовательности вызовов режима, цели и поддерживаемых параметров для текущего намерения Velair. Ошибочные или заменённые попытки его не создают. Событие подтверждает принятие команды, а не достижение физическим оборудованием температуры или состояния HVAC.
