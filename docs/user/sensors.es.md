<a id="velair-sensor-reference"></a>

# Referencia de sensores de Velair
<!-- velair-docs:start -->
Traducciones: [Original en inglés](sensors.md) · [Español](sensors.es.md) · [Français](sensors.fr.md) · [Deutsch](sensors.de.md) · [Italiano](sensors.it.md) · [Nederlands](sensors.nl.md) · [Polski](sensors.pl.md) · [Português (Brasil)](sensors.pt-br.md) · [Português (Portugal)](sensors.pt-pt.md) · [Русский](sensors.ru.md) · [Estado de las traducciones](../translation-status.md)

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

Velair crea entidades de Home Assistant para que los paneles y las automatizaciones puedan consultar el contexto actual del programador, el confort, el envío de órdenes y cada equipo sin abrir el panel de Velair.

Los ID de entidad que aparecen aquí son ejemplos. Home Assistant puede añadir sufijos o permitirte renombrar las entidades, por lo que debes utilizar los ID reales de tu propio registro de entidades.

<a id="quick-guide"></a>

## Guía rápida

| Entidad | Se crea para | Uso recomendado |
| --- | --- | --- |
| **Próximo evento programado** | Integración de Velair | Mostrar la próxima acción prevista de Velair. |
| **Estado del planificador** | Integración de Velair | Comprobar si la programación está inactiva, programada, pausada o bajo un control temporal. |
| **Estado de diagnóstico** | Integración de Velair | Avisar sobre el estado de funcionamiento de Velair. |
| **Temperatura objetivo activa** | Cada equipo gestionado | Mostrar el objetivo actual controlado por Velair. |
| **Estado ambiental** | Cada equipo gestionado | Consultar el estado de Confort, la calidad de los datos, las métricas derivadas y el contexto exterior. |
| **Oportunidad de ventilación** | Cada equipo gestionado | Automatizar o mostrar oportunidades prudentes de abrir ventanas. |
| **Calidad del aire** | Cada equipo gestionado | Mostrar la evaluación de CO2 independientemente del Confort térmico. |
| **Anulación de zona** | Cada equipo gestionado | Mostrar Refuerzos o pausas activos. |
| **Control de zona** | Cada equipo gestionado | Saber quién controla el equipo: Velair, ajuste manual o ejecución externa. |
| **Diagnóstico de entrega de zona** | Cada equipo gestionado, desactivado por defecto | Investigar problemas o automatizar según el último resultado de envío local. |
| **Inicio de preacondicionamiento** | Cada equipo gestionado | Mostrar cuándo prevé comenzar antes el Preacondicionamiento adaptativo. |
| **Control por temperatura ambiente (Room Assist)** | Cada equipo gestionado | Mostrar el estado de ejecución de Room Assist y el contexto del objetivo aplicado. |

Velair también crea entidades modificables, como **Planificación automática** y **Modo**. Son controles, no sensores; consulta la [guía de uso](usage.es.md#home-assistant-entities).

<a id="global-sensors"></a>

## Sensores globales

<a id="next-climate-event"></a>

### Próximo evento climático

Ejemplo de ID de entidad:

```text
sensor.velair_next_scheduled_event
```

Atributos principales:

| Atributo | Significado |
| --- | --- |
| `entity_id` | Entidad de climatización del primer evento de esta hora. |
| `action` | `set_temperature`, `set_hvac_mode` o `turn_off`. |
| `hvac_mode` | Modo HVAC que Velair prevé utilizar, cuando procede. |
| `temperature` | Objetivo único, cuando procede. |
| `target_temp_low` / `target_temp_high` | Intervalo objetivo, cuando procede. |
| `weekday` / `start` | Origen del bloque del horario. |
| `when` | Hora real de aplicación. |
| `target_when` | Hora original del objetivo de confort cuando el preacondicionamiento comienza antes. |
| `event_count` | Número de eventos con la misma hora de aplicación. |
| `events` | Lista serializada de todos los eventos con la misma hora de aplicación. |

Ejemplo:

```yaml
{{ state_attr('sensor.velair_next_scheduled_event', 'action') == 'turn_off' }}
```

<a id="current-schedule-state"></a>

### Estado actual del horario

Ejemplo de ID de entidad:

```text
sensor.velair_current_schedule_state
```

Estados:

```text
paused
override_active
scheduled
idle
temperature_migration_required
```

Atributos principales:

| Atributo | Significado |
| --- | --- |
| `global_mode` | Modo global actual del programador. |
| `paused_started_at` | Momento de inicio de la pausa global, cuando procede. |
| `paused_until` | Vencimiento previsto de la pausa global, cuando procede. |

<a id="diagnostics-status"></a>

### Estado de diagnóstico

Ejemplo de ID de entidad:

```text
sensor.velair_diagnostics_status
```

Estados:

```text
ok
warning
error
```

Atributos principales:

| Atributo | Significado |
| --- | --- |
| `scheduler_mode` / `scheduler_status` | Contexto compacto del programador. |
| `units_ok` / `units_warning` / `units_error` | Recuento de equipos por estado de funcionamiento. |
| `issue_count` | Total de incidencias activas de ejecución. |
| `warning_count` / `error_count` | Recuento de incidencias activas por gravedad. |
| `issue_codes` | Códigos de incidencia estables adecuados para automatizaciones. |

Ejemplo de disparador:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_diagnostics_status
    to: error
```

<a id="per-climate-sensors"></a>

## Sensores por equipo de climatización

Para un equipo gestionado como `climate.living_room`, Home Assistant suele crear ID de entidades relacionadas como `sensor.velair_control_living_room`. Utiliza los ID reales de tu registro en paneles y automatizaciones.

<a id="zone-active-target-temperature"></a>

### Temperatura objetivo activa de zona

Atributos principales:

| Atributo | Significado |
| --- | --- |
| `action` | Acción del objetivo activo de Velair. |
| `hvac_mode` | Modo HVAC seleccionado por el bloque o control temporal activo. |
| `temperature` | Objetivo único activo. |
| `target_temp_low` / `target_temp_high` | Intervalo objetivo activo para modos con intervalo nativo. |
| `weekday` / `start` | Origen en el horario del bloque activo. |
| `when` | Hora de aplicación del objetivo activo. |
| `target_when` | Hora del objetivo de confort cuando el preacondicionamiento adelantó la aplicación. |

Para objetivos de intervalo nativo, el estado del sensor no está disponible porque no hay un único valor correcto. Consulta `target_temp_low` y `target_temp_high` en su lugar.

<a id="zone-environmental-condition"></a>

### Estado ambiental de zona

Estados:

```text
monitoring_off
no_readings
temperature_comfortable
humidity_comfortable
comfortable
cold
hot
dry
humid
cold_and_dry
cold_and_humid
hot_and_dry
hot_and_humid
```

Atributos principales:

| Atributo | Significado |
| --- | --- |
| `data_quality` | `complete`, `unverified`, `partial`, `stale` o `unavailable`. |
| `data_issues` | Códigos estables de lecturas ausentes, desactualizadas, no válidas o utilizables cuya vigencia no se ha verificado. |
| `range_summary` | Resultado actual del intervalo de Confort y su conciliación con Humidex. |
| `ventilation_opportunity` | Datos completos de la oportunidad de ventilación. |
| `comfort_zone` | Modelo de Confort seleccionado e intervalo efectivo de humedad. |
| `temperature_source` / `humidity_source` | Entidades de origen utilizadas para las lecturas interiores. |
| `derived_metrics` | Datos de Humidex, punto de rocío y humedad absoluta habilitados. |
| `outdoor` | Comparación opcional entre interior y exterior. |
| `insights` | Observaciones ordenadas con códigos estables. |

Ejemplo:

```yaml
{% set insights =
   state_attr('sensor.velair_climate_living_room_environmental_condition',
              'insights') or [] %}
{{ insights
   | selectattr('code', 'eq', 'ventilation_may_help_cool')
   | list | count > 0 }}
```

Consulta [Confort ambiental](comfort.es.md) y [Sensores de control y entrega de zona](zone-sensors.es.md#environmental-condition) para los datos completos de Confort.

<a id="zone-ventilation-opportunity"></a>

### Oportunidad de ventilación de zona

Estados:

```text
unavailable
no_opportunity
may_help
comfort_possible
trade_off
already_comfortable
```

Atributos principales:

| Atributo | Significado |
| --- | --- |
| `evaluation_scope` | Indica si Velair evaluó temperatura, humedad o ambas. |
| `reason` | Código de motivo estable interpretable por máquinas. |
| `data_quality` / `data_issues` | Calidad de la comparación exterior. |
| `outdoor_temperature_source` | Entidad de origen de la temperatura exterior. |
| `outdoor_humidity_source` | Entidad de origen de la humedad exterior, si está configurada. |
| `potential_effects` | Efectos que Velair prevé que pueda tener el aire exterior. |
| `blocked_by` | Condiciones que impiden un resultado más favorable de oportunidad. |

Ejemplo:

```yaml
{{ is_state('sensor.velair_ventilation_opportunity_living_room',
            'comfort_possible') }}
```

Este sensor es observacional. Velair nunca abre ventanas ni cambia el control climático basándose en él.

<a id="zone-air-quality"></a>

### Calidad del aire de zona

Estados:

```text
not_monitored
unavailable
good
elevated
poor
```

Atributos principales:

| Atributo | Significado |
| --- | --- |
| `availability` | Disponibilidad de la lectura actual de CO2. |
| `co2_source` | Sensor de CO2 utilizado para la evaluación. |

<a id="zone-override-state"></a>

### Estado de anulación de zona

Estados:

```text
none
boost
paused
disabled
```

Atributos principales:

| Atributo | Significado |
| --- | --- |
| `started_at` | Momento de inicio del control temporal activo. |
| `until` | Vencimiento previsto del control temporal, cuando procede. |
| `action` | Acción del control temporal, cuando procede. |
| `pause_id` | Identificador de la pausa activa cuando hay una sola pausa. |
| `pause_count` / `pause_ids` | Contexto compacto de varias pausas. |
| `manual` | Indica si la pausa es un ajuste manual. |

Utiliza este sensor para el estado de Refuerzos y pausas. Utiliza **Control de zona** para saber si el control es automático, manual o externo.

<a id="zone-control"></a>

### Control de zona

Estados:

```text
automatic
manual
external
```

Atributos principales:

| Atributo | Significado |
| --- | --- |
| `runtime_state` | `idle`, `scheduled`, `preconditioning`, `boost`, `paused`, `stopped`, `externally_managed` o `temperature_migration_required`. |
| `schedule_source` | `default`, `profile` o `profile_pause`. |
| `profile_id` / `profile_name` | Perfil que controla efectivamente la zona, cuando procede. |
| `mode_id` / `mode_name` | Modo seleccionado, cuando procede. |
| `manual_source` | `explicit`, `external_change` u `other`, solo en estado manual. |
| `manual_started_at` | Momento de inicio del ajuste manual. |
| `manual_until` | Vencimiento previsto del ajuste manual, cuando procede. |
| `manual_policy` | `until_next_block`, `for_duration` o `until_resumed`. |

Ejemplo:

```yaml
{{ is_state('sensor.velair_control_living_room', 'automatic')
   and state_attr('sensor.velair_control_living_room', 'runtime_state')
       == 'scheduled' }}
```

<a id="zone-delivery-diagnostics"></a>

### Diagnóstico de entrega de zona

Esta entidad de diagnóstico está desactivada por defecto. Actívala desde el registro de entidades de Home Assistant cuando un panel o automatización necesite evidencia de entrega de órdenes durante la ejecución.

Estados:

```text
idle
success
failed
retrying
exhausted
invalid_intent
cancelled
unavailable
```

Atributos principales:

| Atributo | Significado |
| --- | --- |
| `updated_at` | Última actualización del estado de envío. |
| `retry_count` | Intento representado por el estado actual. |
| `last_error_at` / `last_error_code` | Último error de envío, sin datos sensibles. |
| `last_accepted_at` | Última vez que Home Assistant aceptó una secuencia completa de servicios de Velair. |
| `last_accepted_source` | `automatic`, `manual`, `boost` o `automatic_reassertion`. |
| `last_accepted_action` | `set_temperature`, `set_hvac_mode`, `turn_off` u `other`. |
| `last_accepted_hvac_mode` | Modo HVAC aceptado por Home Assistant. |
| `last_accepted_temperature_unit` | Unidad registrada con el objetivo aceptado. |
| `last_accepted_temperature` | Objetivo único aceptado, cuando procede. |
| `last_accepted_target_temp_low` / `last_accepted_target_temp_high` | Intervalo objetivo aceptado, cuando procede. |

Ejemplo:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_delivery_diagnostics_living_room
    to: exhausted
```

`success` significa que Home Assistant aceptó la secuencia de servicios. No demuestra que el dispositivo físico haya alcanzado el objetivo.

<a id="zone-preconditioning-start"></a>

### Inicio de preacondicionamiento de zona

Atributos principales:

| Atributo | Significado |
| --- | --- |
| `status` | `planned` o `active`. |
| `scheduled_for` | Hora original de confort del bloque. |
| `lead_minutes` | Minutos que Velair adelantó el inicio. |
| `direction` | Dirección de calefacción o refrigeración. |
| `target_kind` / `target_boundary` | Contexto de predicción de objetivo único o límite de intervalo. |
| `boundary_temperature` | Límite utilizado para la predicción. |
| `model_source` | Origen de predicción seleccionado por Velair. |
| `target_temperature` | Objetivo único, cuando procede. |
| `target_temp_low` / `target_temp_high` | Intervalo objetivo, cuando procede. |
| `hvac_mode` | Modo HVAC utilizado por el evento de preacondicionamiento. |

<a id="zone-room-assist-state"></a>

### Estado del control por temperatura ambiente de zona (Room Assist)

Estados:

```text
unavailable
not_configured
disabled
blocked
idle
holding
assisting
ready
```

Atributos principales:

| Atributo | Significado |
| --- | --- |
| `room_temperature_entity_id` | Sensor de origen de la habitación. |
| `target_temperature` | Objetivo visible del horario o control temporal. |
| `applied_temperature` | Objetivo que Room Assist aplicó al equipo. |
| `applied_offset` | Compensación aplicada actualmente. |
| `calculated_temperature` | Objetivo calculado antes de aplicar los límites. |
| `assist_delta` | Incremento activo de asistencia cuando es mayor que cero. |
| `scheduled_target_guard` | Protección que impide cambios de objetivo inseguros. |
| `hysteresis_phase` / `hysteresis_target` | Fase de ejecución de la banda de mantenimiento. |
| `deadband_low` / `deadband_high` | Banda efectiva de mantenimiento. |
| `target_temp_low` / `target_temp_high` | Intervalo objetivo nativo visible. |
| `applied_target_temp_low` / `applied_target_temp_high` | Intervalo nativo enviado tras la asistencia. |
| `climate_target_temp_low` / `climate_target_temp_high` | Intervalo nativo comunicado actualmente por el equipo. |
| `range_shift` | Desplazamiento actual del intervalo, cuando procede. |
| `direction` | Dirección de calefacción o refrigeración. |
| `hvac_mode` | Modo HVAC del objetivo asistido. |
| `active_from` / `target_when` | Contexto temporal del bloque asistido. |

<a id="choosing-the-right-surface"></a>

## Elegir la entidad adecuada

| Pregunta | Utiliza |
| --- | --- |
| ¿Qué prevé hacer Velair a continuación? | **Próximo evento programado** |
| ¿Velair está pausado globalmente o programado? | **Estado del planificador** |
| ¿Velair funciona correctamente? | **Estado de diagnóstico** |
| ¿Qué objetivo controla Velair ahora? | **Temperatura objetivo activa** |
| ¿La habitación está confortable, tiene datos desactualizados o carece de lecturas? | **Estado ambiental** |
| ¿Podría ayudar el aire exterior? | **Oportunidad de ventilación** |
| ¿El CO2 está bien o mal? | **Calidad del aire** |
| ¿Este equipo tiene un Refuerzo o está pausado? | **Anulación de zona** |
| ¿Quién controla este equipo ahora? | **Control de zona** |
| ¿Home Assistant aceptó la última orden de Velair? | **Diagnóstico de entrega de zona** |
| ¿Cuándo comenzará el preacondicionamiento? | **Inicio de preacondicionamiento** |
| ¿Qué está aplicando Room Assist? | **Control por temperatura ambiente (Room Assist)** |

Los eventos son más adecuados cuando una automatización necesita reaccionar a una transición y saber qué ha cambiado. Los sensores son más adecuados cuando un panel o automatización necesita el estado actual, incluso después de un reinicio.
