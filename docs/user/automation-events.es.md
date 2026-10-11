<a id="automation-events"></a>

# Eventos de automatización
<!-- velair-docs:start -->
Traducciones: [Original en inglés](automation-events.md) · [Español](automation-events.es.md) · [Français](automation-events.fr.md) · [Deutsch](automation-events.de.md) · [Italiano](automation-events.it.md) · [Nederlands](automation-events.nl.md) · [Polski](automation-events.pl.md) · [Português (Brasil)](automation-events.pt-br.md) · [Português (Portugal)](automation-events.pt-pt.md) · [Русский](automation-events.ru.md) · [Estado de las traducciones](../translation-status.md)

<details>
<summary>Estado de esta traducción</summary>

| Dato | Estado |
| --- | --- |
| Versión de referencia | 1.9.0-beta.1 |
| Última sincronización | 2026-10-11 |
| Revisión lingüística | Traducción asistida por IA |
| Respecto al original | Sin cambios pendientes respecto al original inglés. |

</details>

---
<!-- velair-docs:end -->

Velair emite eventos originales y transitorios de Home Assistant ante cambios durante la ejecución. Los datos originales del bus de eventos solo existen mientras Home Assistant los entrega; Velair no ofrece un archivo de eventos ni una API para reproducirlos. Abrir o actualizar el panel de Velair no emite estos eventos.

Diagnóstico es independiente. Para las categorías activadas, puede conservar un resumen depurado de determinados eventos en un historial en memoria limitado a 100 entradas como máximo. Ese historial se borra cada vez que se reinicia Velair o Home Assistant, no es el historial de Recorder y no cambia ni prolonga la duración del evento de automatización original.

Todos los eventos utilizan:

```yaml
event_type: velair_event
```

Filtra `event_data.event` y, para eventos de zona, `event_data.entity_id`:

```yaml
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: climate_target_applied
      entity_id: climate.living_room
```

Todos los contenidos de eventos incluyen `domain: velair` y uno de los nombres siguientes.

<a id="external-climate-change-detected"></a>

## Cambio externo de climatización detectado

`external_climate_change_detected` se emite cuando un equipo gestionado cambia de modo HVAC o consigna y el cambio no puede atribuirse a una acción de climatización de Velair. Es un dato de observación: `non-Velair` no significa necesariamente una persona, porque el origen puede ser un mando u otra automatización.

La detección cubre `hvac_mode`, la temperatura única `temperature` y los límites nativos `target_temp_low`/`target_temp_high`. Las lecturas ambientales y las opciones de ventilador, preset, oscilación o humedad no producen este evento. Se ignoran las transiciones hacia o desde `unknown` y `unavailable`. Consulta [Cambios externos y ajuste manual](manual-control.es.md) para conocer el modelo de atribución, sus limitaciones, las políticas y las líneas temporales completas.

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

`policy` es la política que rige el cambio. Durante un ajuste manual activo sigue siendo la de esa sesión, aunque haya cambiado el valor predeterminado de Ajustes para sesiones futuras. `keep_automatic` significa que Velair no creó un ajuste manual y volvió a calcular su intención de control actual. Por ello, esa detección no tiene un evento de entrada `zone_control_changed` asociado.

`zone_control_changed` se emite cuando la zona entra en ajuste manual o vuelve al control automático. Su `control_mode` es `manual` o `automatic` y es independiente del Modo Manual de Velair.

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

`source` es `external_change` cuando un ajuste externo creó la sesión y `explicit` cuando el panel o `velair.enter_manual_adjustment` capturó el estado actual del equipo. `duration_minutes` solo está presente para `for_duration`.

Una entrada `until_resumed` omite `until`. Los datos de salida automática contienen `reason: expired`; una salida explícita contiene `reason: resumed`. Salir del ajuste manual no elimina los motivos independientes de pausa que puedan seguir bloqueando la aplicación física del horario.

Las acciones de servicio equivalentes son:

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

## Cambio en un problema de diagnóstico

`diagnostic_issue_changed` se emite al detectar o resolver un problema de diagnóstico verificable. Velair utiliza los problemas presentes al iniciar como referencia inicial, para que reiniciar Home Assistant no emita una ráfaga de problemas que ya estaban activos. No se repiten eventos de problemas sin cambios.

La identidad del problema consta de `code`, un `entity_id` opcional del equipo gestionado y un `purpose` opcional del sensor. Los datos no contienen el mensaje original de excepción, identificadores de Perfil/Modo/pausa ni causas deducidas. `change` es `detected` o `resolved`; `severity` es `warning` o `error`.

```yaml
domain: velair
event: diagnostic_issue_changed
change: detected
severity: error
code: delivery_exhausted
entity_id: climate.living_room
```

Por ejemplo, envía una notificación cada vez que Velair detecte un error nuevo:

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

Para el estado agregado, utiliza el sensor **Estado de diagnóstico**. Su identificador de entidad puede cambiarse en Home Assistant, así que selecciónalo desde el editor de automatizaciones:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_diagnostics_status
    to: "error"
```

<a id="profile-changed"></a>

## Cambio de Perfil

`profile_changed` se emite después de guardar un conjunto distinto de perfiles climáticos o los horarios Predeterminados. Seleccionar directamente el mismo conjunto activo puede cambiar la entidad nativa Modo a Manual, pero no emite `profile_changed` porque no cambiaron los perfiles efectivos.

```yaml
domain: velair
event: profile_changed
profile_ids:
  - away
  - bedrooms
previous_profile_ids: []
source: select
```

`source` identifica el origen de la selección efectiva. Los valores públicos son `panel`, `service` y `select`; las operaciones internas del ciclo de vida pueden publicar un valor más concreto, como `profile_deleted` o `mode_updated`. Las listas ordenadas de identificadores describen los conjuntos activos completos nuevo y anterior. Una lista `profile_ids` vacía representa Predeterminado.

Por ejemplo, esta automatización reacciona cuando el Perfil con identificador `away` pasa a formar parte del conjunto activo:

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

Para reaccionar cuando Velair vuelve a los horarios Predeterminados, utiliza una condición de plantilla que compruebe `trigger.event.data.profile_ids == []`.

<a id="scheduler-mode-changed"></a>

## Cambio de modo del programador

`scheduler_mode_changed` se emite cuando cambia el modo global o el vencimiento de la pausa, incluido el vencimiento automático. Repetir el mismo modo y vencimiento no lo emite.

```yaml
domain: velair
event: scheduler_mode_changed
mode: paused
previous_mode: auto
paused_until: "2026-07-09T18:30:00+02:00"
paused_started_at: "2026-07-09T17:00:00+02:00"
```

<a id="climate-target-applied"></a>

## Objetivo de climatización aplicado

`climate_target_applied` se emite después de que Velair aplique un objetivo programado, una acción de solo modo, de solo opciones o de apagado, un horario restaurado, el horario al iniciar o una llamada a `velair.set_temperature` / `velair.set_hvac_mode`. Se omiten los ajustes opcionales incompatibles.

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

Los valores habituales de `source` son `scheduled_event`, `current_schedule`, `schedule_saved`, `scheduler_resumed`, `startup`, `service_set_temperature`, `service_set_hvac_mode`, `boost_ended`, `zone_paused`, `zone_resumed` y `zone_pause_expired`.

Para un objetivo de intervalo, se omite `temperature` y el evento contiene ambos límites:

```yaml
target_temp_low: 20
target_temp_high: 24
hvac_mode: heat_cool
```

Para un bloque de solo modo, `action` es `set_hvac_mode`, `hvac_mode` es el modo que aplicó Velair y se omiten todos los campos de temperatura objetivo. Esto permite distinguir un cambio de modo de un cambio de objetivo. `velair.set_hvac_mode` utiliza la misma estructura, con `source: service_set_hvac_mode` y sin los campos exclusivos de horarios `weekday` o `start`.

Para un bloque de solo opciones, `action` es `set_climate_options`. El evento incluye los campos opcionales aplicados, como `preset_mode` o `fan_mode`, y omite los objetivos de temperatura y `hvac_mode`. Estos bloques no encienden un equipo apagado.

<a id="preconditioning-plan-updated"></a>

## Plan de preacondicionamiento actualizado

`preconditioning_plan_updated` se emite al publicar un nuevo plan de inicio anticipado o cuando cambian sus entradas o resultados de cálculo. Los recálculos idénticos no se repiten. La planificación al iniciar puede emitir este evento; calcular datos solo para responder al panel no lo emite.

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

Para un plan de intervalo nativo, `target_temperature` es `null` y los datos incluyen el par completo `target_temp_low` y `target_temp_high`. `target_kind` es `range`, `target_boundary` es `low` o `high` y `boundary_temperature` es el único límite efectivo utilizado por el predictor. `temperature_delta` se mide respecto a ese límite. Los planes de temperatura única mantienen `target_kind: scalar` y `target_boundary: temperature`.

Por ejemplo, una predicción de calefacción para un intervalo `20–24 °C` incluye:

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

## Plan de preacondicionamiento cancelado

`preconditioning_plan_cancelled` se emite una sola vez cuando deja de existir un plan publicado previamente, por ejemplo tras editar un horario, reducirse la diferencia de temperatura, desactivar el preacondicionamiento o salir del modo automático. Repite el último plan publicado para que una automatización identifique qué se canceló.

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

`reason` es `no_longer_planned` cuando un recálculo elimina un plan y `scheduler_not_auto` al pausar o detener la programación automática.

<a id="preconditioning-observation-recorded"></a>

## Observación de preacondicionamiento registrada

`preconditioning_observation_recorded` se emite después de validar una observación de aprendizaje, limitar el historial al tamaño configurado y guardarla. `quality` puede ser `complete`, `partial` o `invalid`.

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

Una observación inválida también incluye `invalid_reason`.

<a id="comfort-assessment-changed"></a>

## Cambio de evaluación de Confort

`comfort_assessment_changed` se emite cuando cambia `condition`, `air_quality`, `data_quality`, `data_issues` o el estado semántico de una métrica derivada activada. El estado semántico incluye disponibilidad, fuente, entidad, unidad, problemas y condición. Los cambios numéricos de las lecturas originales o derivadas siguen actualizando la interfaz de Velair y los atributos de sensores sin emitir otro evento de automatización. Así se evita saturar el bus de eventos.

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

Los campos del intervalo permiten automatizaciones sencillas sin sustituir el campo físico compatible `condition`:

Para plantillas de estado actual y disparadores de estado, consulta el [contrato completo de la entidad Estado ambiental](zone-sensors.es.md#environmental-condition). Utiliza este evento cuando importe el valor anterior o la transición exacta.

| `status` | Significado |
| --- | --- |
| `within_range` | Todos los valores supervisados utilizables están dentro de su intervalo configurado. |
| `outside_range` | Al menos un valor supervisado utilizable está fuera de su intervalo configurado, con la temperatura y Humidex alineados cuando ambos están activados. |
| `mixed` | La temperatura actual y Humidex ocupan posiciones distintas respecto al intervalo. |
| `unavailable` | No puede evaluarse actualmente un valor supervisado necesario o Humidex activado. |

| `thermal_relation` | Significado |
| --- | --- |
| `aligned` | La temperatura actual y Humidex tienen la misma posición. |
| `mixed` | La temperatura actual y Humidex tienen posiciones distintas. |
| `not_evaluated` | Humidex está desactivado. |
| `unavailable` | No puede evaluarse actualmente la temperatura o Humidex activado. |

Cada entrada de `positions` es `below`, `within`, `above` o `null`. El evento también incluye el resumen anterior completo. `range_summary_changed` indica cualquier cambio de estado, relación térmica o posición; `range_status_changed` solo indica un cambio del `status` agregado. Ambos indicadores son `false` cuando otra parte de la evaluación de Confort originó el evento.

`comfort_zone` utiliza la unidad del equipo gestionado. Su intervalo efectivo es el mismo que utilizan la condición de humedad y la orientación exterior. Con el modelo Guiado o personalizado según temperatura, es `null` cuando no puede evaluarse la temperatura, por lo que las automatizaciones no deben sustituirlo por los antiguos límites fijos de humedad. Los cambios numéricos habituales del intervalo actualizan los atributos y la API sin emitir un evento, salvo que también cambie un resultado semántico documentado. El evento incluye asimismo `ventilation_opportunity` actual. Los cambios de su estado, alcance, efectos, impedimentos o motivo son semánticos; los cambios numéricos exteriores que mantienen esos campos no emiten otro evento.

Por ejemplo, esta automatización solo reacciona cuando una zona pasa a estar fuera de sus intervalos configurados:

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

`insights` es una interpretación ordenada de los datos interiores actuales que solo existe durante la ejecución. Sus campos son identificadores estables, no texto traducido. Un cambio semántico de información contextual puede emitir este evento; las lecturas desactualizadas, ausentes o inválidas no producen información contextual. Los datos contienen la lista actual completa, incluido `insights: []` cuando desaparece el último mensaje contextual. El campo existente `condition` sigue siendo el resumen de evaluación y no se duplica como información contextual.

Cuando la comparación exterior está activada, el evento también incluye todo el subárbol `outdoor`. Su propia calidad y problemas nunca alteran `data_quality` ni `data_issues` interiores. Los eventos reaccionan a cambios de disponibilidad, calidad, `effect`, `potential`, `blocked_by` o de la lista contextual; los cambios numéricos habituales con el mismo resultado semántico no emiten otro evento. `guidance_thresholds` indica la sensibilidad efectiva de la zona utilizada para obtener el resultado. Editar un umbral sin cambiar ese resultado actualiza el estado, pero no emite un evento. Los datos de métricas actuales incluyen `freshness: reported | unverified`. `data_quality` interior o exterior puede ser `unverified` cuando todas las lecturas son utilizables, pero al menos una carece de marca temporal de comunicación verificable. Los sensores directos pueden quedar desactualizados al vencer ese plazo sin que cambie su valor de estado. El subárbol proporciona explícitamente la humedad absoluta interior; quienes utilicen estos datos no deben reconstruirla a partir de diferencias redondeadas. Los códigos de ventilación solo describen una oportunidad o contrapartida. No significan que Velair haya abierto una ventana o cambiado la climatización.

Solo los datos derivados de Humidex incluyen `temperature_range_position`. Siempre está presente en ellos y es `below`, `within`, `above` o `null`; pasar entre esos valores puede emitir este evento. El campo es una comparación informativa con el intervalo de temperatura configurado, no una conclusión de confort ni una orden de climatización.

<a id="room-sensor-assist-state-changed"></a>

## Cambio de estado de Room Sensor Assist

`room_sensor_assist_state_changed` se emite al activar o desactivar Room Assist mediante el panel, tarjeta Lovelace, API o servicio. Repetir el mismo estado no lo emite.

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

## Room Sensor Assist actualizado

`room_sensor_assist_updated` solo se emite después de que Room Assist envíe al equipo un objetivo temporal modificado. Los cambios menores que el paso de temperatura del equipo no lo emiten.

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

Para un objetivo único fijo `heat` o `cool` con banda muerta distinta de cero, los cuatro campos de histéresis identifican la fase de ejecución establecida, su límite activo y la banda completa de conmutación. Se omiten con banda muerta cero, modos automáticos de temperatura única e intervalos nativos. La fase no cambia al cruzar el centro programado y solo se invierte cuando el sensor externo alcanza el límite opuesto.

Cuando el objetivo programado protege el resultado de calefacción o refrigeración fija, la actualización de temperatura única añade dos campos opcionales:

```yaml
target_temperature: 22
calculated_temperature: 20
applied_temperature: 22
scheduled_target_guard: cooling_floor
direction: cool
```

`calculated_temperature` es el objetivo compatible antes de la protección programada. Las automatizaciones existentes siguen siendo compatibles porque los campos se añaden y se omiten cuando la protección no está activa.

Para un intervalo nativo se omiten los campos de temperatura única y se incluyen ambas bandas completas:

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

## Room Sensor Assist restaurado

`room_sensor_assist_restored` se emite cuando Room Assist deja de gestionar su objetivo temporal y restaura el objetivo programado habitual cuando es posible. En un ciclo fijo de calefacción o refrigeración, alcanzar el límite activo de la banda muerta sigue formando parte de `room_sensor_assist_updated`; invierte la fase de histéresis y puede cambiar `applied_offset` con su signo. El objetivo programado sigue siendo el límite de seguridad durante la fase que no solicita climatización, aunque cambie la lectura propia del equipo. Si el redondeo al paso de temperatura hace innecesaria una orden nueva, la fase cambia en el estado actual, pero no se emite un evento de actualización, como se describe arriba. `reason` explica una transición emitida.

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

Otros motivos son `assist_disabled`, `boost_started`, `manual_target`, `missing_temperature`, `no_active_target`, `not_auto`, `schedule_changed`, `schedule_cleared`, `scheduler_mode_changed`, `scheduler_stopped`, `settings_updated`, `turn_off`, `unsupported_mode`, `zone_paused` y `zone_unavailable`. `unsupported_temperature_range` sigue siendo posible para un objetivo único antiguo que no puede aplicarse cuando el modo efectivo del equipo requiere un intervalo nativo; los bloques de intervalo válidos sí son compatibles.

<a id="boost-started"></a>

## Inicio de Refuerzo

`boost_started` se emite después de aplicar y guardar un objetivo de refuerzo y su anulación temporal. Sustituir un refuerzo activo emite otro `boost_started`.

Los refuerzos de intervalo utilizan `target_temp_low` y `target_temp_high` en lugar de `temperature`. Sus datos de restauración conservan la misma forma de objetivo.

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

## Fin de Refuerzo

`boost_ended` se emite cuando un refuerzo vence o se cancela. `reason` es `expired` o `manual`. `restoration` describe el estado que aplica Velair después.

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

`restoration.type` puede ser `schedule`, `previous_state` o `none`. Una restauración del horario también emite `climate_target_applied` con `source: boost_ended`.

<a id="zone-paused"></a>

## Zona pausada

`zone_paused` se emite cuando una zona gestionada pasa de cero motivos a uno. Si `action` es `turn_off`, primero se emite `climate_target_applied` para ese apagado.

```yaml
domain: velair
event: zone_paused
entity_id: climate.guest_room
started_at: "2026-07-09T12:00:00+02:00"
until: "2026-07-12T18:00:00+02:00"
action: turn_off
pause_id: velair_window_guard
```

`zone_pause_added`, `zone_pause_updated` y `zone_pause_removed` describen cambios de motivos individuales e incluyen `pause_id` cuando están identificados. Repetir exactamente una llamada identificada no emite ningún evento. Los motivos antiguos y manuales omiten el identificador.

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

## Zona reanudada

`zone_resumed` solo se emite cuando se elimina manualmente o vence el último motivo. Al volver a aplicar el horario actual, un evento posterior `climate_target_applied` describe ese objetivo.

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

## Operaciones sin eventos de ejecución

Crear plantillas, cambiar preferencias del panel, importar datos y restablecer ajustes actualiza la configuración sin emitir eventos de automatización de ejecución. Las ediciones de horarios no tienen un evento de configuración propio, aunque pueden producir eventos de cancelación/actualización de planes o `climate_target_applied` cuando cambian el objetivo activo actual.

<a id="delivery-meaning"></a>

## Significado de la entrega

Un evento de aplicación solo se emite después de que Home Assistant acepte la secuencia completa de llamadas de modo, objetivo y opciones compatibles para la intención actual de Velair. Los intentos fallidos o sustituidos no lo emiten. El evento confirma la aceptación de la orden, no que el equipo físico haya alcanzado ya la temperatura o el estado HVAC solicitados.
