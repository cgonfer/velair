<a id="zone-control-and-delivery-sensors"></a>

# Sensores de control y entrega de zona
<!-- velair-docs:start -->
Traducciones: [Original en inglés](zone-sensors.md) · [Español](zone-sensors.es.md) · [Français](zone-sensors.fr.md) · [Deutsch](zone-sensors.de.md) · [Italiano](zone-sensors.it.md) · [Nederlands](zone-sensors.nl.md) · [Polski](zone-sensors.pl.md) · [Português (Brasil)](zone-sensors.pt-br.md) · [Português (Portugal)](zone-sensors.pt-pt.md) · [Русский](zone-sensors.ru.md) · [Estado de las traducciones](../translation-status.md)

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

Velair crea dos sensores de contexto para cada entidad `climate.*` gestionada:

- **Control de zona** indica quién controla actualmente la zona y qué configuración de Velair se aplica.
- **Diagnóstico de entrega de zona** indica qué ocurrió cuando Velair intentó por última vez enviar un objetivo climático mediante Home Assistant.

Describen capas diferentes. Una zona puede estar bajo control automático mientras su última entrega no está disponible o ha fallado, por lo que ninguno sustituye al otro.

El sensor independiente **Estado ambiental** expone las `derived_metrics` habilitadas y la lista ordenada `insights`, disponible solo durante la ejecución, cuando Confort está activado. Las observaciones contienen `code`, `kind`, `tone` y `metrics` de apoyo; son observacionales y nunca ejecutan acciones climáticas. Consulta [Confort ambiental](comfort.es.md#comfort-insights).
Cuando se activa la comparación exterior opcional, ese mismo sensor expone también el subárbol `outdoor`. Contiene las lecturas de origen, la humedad absoluta interior y exterior explícita, su calidad independiente y una oportunidad de ventilación o una mejora que implique empeorar otra condición. Velair no crea entidades intermediarias para las lecturas individuales. Sí crea un sensor enumerado independiente de **Oportunidad de ventilación** para el resumen destinado a automatizaciones, calculado por el backend y descrito a continuación.

<a id="environmental-condition"></a>

## Estado ambiental

El sensor **Estado ambiental** proporciona el estado actual para las automatizaciones de Confort. Está activado por defecto para cada equipo gestionado y se actualiza a partir de la misma evaluación del backend que el panel de Velair. Consultarlo no sondea ningún sensor ni ejecuta una acción climática.

Su estado nativo conserva la clasificación física compatible de temperatura y humedad:

| Estado | Significado |
| --- | --- |
| `monitoring_off` | La supervisión de Confort está desactivada para este equipo. |
| `no_readings` | No hay ninguna lectura supervisada utilizable actualmente. |
| `temperature_comfortable` | Solo puede evaluarse la temperatura y está dentro de su intervalo configurado. |
| `humidity_comfortable` | Solo puede evaluarse la humedad y está dentro de su intervalo configurado. |
| `comfortable` | La temperatura y la humedad están dentro de sus respectivos intervalos configurados. |
| `cold` / `hot` | La temperatura está por debajo o por encima de su intervalo configurado. |
| `dry` / `humid` | La humedad está por debajo o por encima de su intervalo configurado. |
| `cold_and_dry` / `cold_and_humid` | Ambas lecturas son utilizables y la temperatura está por debajo del intervalo. |
| `hot_and_dry` / `hot_and_humid` | Ambas lecturas son utilizables y la temperatura está por encima del intervalo. |

Estos valores siguen siendo compatibles con las automatizaciones existentes. Describen los intervalos físicos configurados; no constituyen una afirmación médica o universal sobre el confort personal.

<a id="environmental-condition-attributes"></a>

### Atributos del estado ambiental

| Atributo | Significado |
| --- | --- |
| `data_quality` | `complete`, `unverified`, `partial`, `stale` o `unavailable` para las lecturas interiores supervisadas. `unverified` significa que las lecturas son utilizables, pero al menos una carece de una marca de tiempo verificable que indique cuándo se comunicó. |
| `data_issues` | Códigos estables que explican datos interiores ausentes, desactualizados o no válidos. Se omite cuando está vacío. |
| `range_summary` | Resumen objetivo del intervalo configurado, incluida la conciliación opcional con Humidex. |
| `ventilation_opportunity` | Estado, alcance, efectos, impedimentos y motivo actuales de ventilación, calculados por el backend. |
| `comfort_zone` | Geometría objetivo seleccionada (Rangos simples, Rango psicrométrico guiado o modelo personalizado que tenga en cuenta la temperatura) e intervalo de humedad efectivo a la temperatura actual. |
| `temperature_source` | ID de entidad utilizado actualmente para la temperatura interior, cuando está disponible. |
| `humidity_source` | ID de entidad utilizado actualmente para la humedad interior, cuando está disponible. |
| `derived_metrics` | Datos habilitados de Humidex, punto de rocío y humedad absoluta. Las métricas no supervisadas se omiten. |
| `outdoor` | Comparación opcional interior-exterior, sus umbrales efectivos de orientación, calidad de datos, lecturas y oportunidades de ventilación o posibles efectos contrapuestos. |
| `insights` | Códigos observacionales ordenados con `code`, `kind`, `tone` y `metrics` de apoyo. Se omite cuando está vacío. |

`derived_metrics` y `outdoor` se omiten cuando sus funciones correspondientes no están activadas. Cuando las lecturas habilitadas faltan, están desactualizadas o no son válidas, sus datos siguen presentes con `availability` y el contexto de la incidencia para que las automatizaciones no reutilicen un valor antiguo. `insights` se omite si su lista actual está vacía. La temperatura y humedad interiores sin procesar permanecen en sus entidades de origen. La clasificación de CO2 se expone mediante el sensor independiente **Calidad del aire**.

Para un modelo de Rango psicrométrico guiado o personalizado que tenga en cuenta la temperatura, `comfort_zone.effective_humidity_range` es `null` cuando la temperatura actual no es utilizable. En ese estado, la lectura de humedad puede seguir visible, pero no tiene una condición y no debe interpretarse como dentro o fuera de un intervalo supuesto.

`range_summary` contiene:

```yaml
status: within_range | outside_range | mixed | unavailable
thermal_relation: aligned | mixed | not_evaluated | unavailable
positions:
  temperature: below | within | above | null
  humidity: below | within | above | null
  humidex: below | within | above | null
```

Por ejemplo, esta plantilla detecta indicadores térmicos mixtos sin analizar una etiqueta traducida:

```yaml
{% set summary =
   state_attr('sensor.velair_environmental_condition_living_room',
              'range_summary') %}
{{ summary is mapping and summary.get('thermal_relation') == 'mixed' }}
```

Esta condición comprueba si la lectura de Humidex habilitada está vigente y por encima del intervalo de temperatura configurado:

```yaml
{% set metrics =
   state_attr('sensor.velair_environmental_condition_living_room',
              'derived_metrics') or {} %}
{% set humidex = metrics.get('humidex', {}) %}
{{ humidex.get('availability') == 'current'
   and humidex.get('temperature_range_position') == 'above' }}
```

Esta condición utiliza un código de observación calculado por el backend. Sigue siendo válida cuando cambia el idioma mostrado:

```yaml
{% set insights =
   state_attr('sensor.velair_environmental_condition_living_room',
              'insights') or [] %}
{{ insights
   | selectattr('code', 'eq', 'ventilation_may_help_cool')
   | list | count > 0 }}
```

Para la comparación exterior opcional, comprueba la disponibilidad antes de utilizar un valor numérico:

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

### ¿Entidad o evento?

Utiliza esta entidad cuando una automatización necesite el estado actual, incluso tras un reinicio de Home Assistant. Un disparador normal de estado puede reaccionar a una clasificación física compatible:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_environmental_condition_living_room
    to: hot_and_humid
```

Utiliza `comfort_assessment_changed` cuando la automatización deba saber qué cambió. Sus campos `previous_range_summary`, `range_summary_changed` y `range_status_changed` distinguen una transición de intervalo de una actualización de Confort no relacionada. Consulta [Cambio de evaluación de Confort](automation-events.es.md#comfort-assessment-changed) para los datos completos y una automatización lista para copiar.

<a id="ventilation-opportunity"></a>

## Oportunidad de ventilación

El sensor **Oportunidad de ventilación** por zona se basa en eventos y es observacional:

| Estado | Significado |
| --- | --- |
| `unavailable` | Actualmente no puede evaluarse Confort, la comparación exterior o una lectura obligatoria configurada. |
| `no_opportunity` | El aire exterior no cruza los umbrales configurados en una dirección útil. |
| `may_help` | El aire exterior acerca la habitación al Confort, pero Velair no puede establecer que alcance toda la zona configurada. |
| `comfort_possible` | La temperatura exterior está dentro del intervalo y, cuando se supervisa la humedad, la humedad exterior está dentro de la banda de Confort evaluada a esa temperatura exterior. |
| `trade_off` | Un cambio útil en una dimensión supervisada conlleva un empeoramiento conocido en otra. |
| `already_comfortable` | La condición ambiental física ya es confortable. |

`comfort_possible` es una proyección ambiental prudente, no una promesa sobre abrir una ventana. Velair no puede conocer el flujo de aire, el viento, la lluvia, los contaminantes exteriores, la ganancia solar, la masa térmica de la habitación ni cuánto tiempo permanece abierta la ventana. Nunca abre una ventana ni cambia el control climático.

Los atributos incluyen `evaluation_scope`, `potential_effects`, `blocked_by`, `reason`, `data_quality` y `data_issues` exteriores, y los ID de origen exterior configurados. Si se supervisa la humedad interior pero se omite la exterior, la temperatura puede producir `may_help`, pero nunca `comfort_possible`. Si la supervisión de humedad se desactiva deliberadamente, un resultado `comfort_possible` basado solo en temperatura es válido.

`reason` es un código estable interpretable por máquinas. Sus valores son: `monitoring_off`, `outdoor_comparison_disabled`, `indoor_temperature_unavailable`, `indoor_humidity_unavailable`, `outdoor_temperature_unavailable`, `outdoor_humidity_unavailable`, `already_comfortable`, `known_trade_off`, `no_useful_difference`, `outdoor_conditions_within_comfort`, `outdoor_humidity_not_configured` y `moves_toward_comfort`.

Para un equipo como `climate.living_room`, una entrada recién creada en el registro suele utilizar ID de entidad como:

```text
sensor.velair_ventilation_opportunity_living_room
sensor.velair_control_living_room
sensor.velair_delivery_diagnostics_living_room
```

Son ID de entidad sugeridos, no una API permanente. Home Assistant puede añadir un sufijo para evitar una colisión y los usuarios pueden renombrar una entidad. Selecciona las entidades mediante sus ID reales en tu propio registro de Home Assistant. El nombre mostrado utiliza el nombre descriptivo del equipo gestionado, mientras que el ID sugerido utiliza el ID de objeto de la entidad de climatización. El nombre del dispositivo de servicio de Velair y su área no forman parte de ese ID sugerido.

<a id="zone-control"></a>

## Control de zona

**Control de zona** está activado por defecto y se reconstruye a partir del programador tras cada reinicio. Su estado identifica quién tiene el control actualmente:

| Estado | Significado |
| --- | --- |
| `automatic` | Velair tiene el control local. Incluye los estados programado, inactivo, pausado, detenido, Refuerzo y Preacondicionamiento adaptativo. Utiliza `runtime_state` para distinguirlos. |
| `manual` | Velair ha cedido este equipo a un ajuste manual, de forma explícita o tras detectar un cambio externo. Es diferente del Modo **Manual** de Velair, que describe la selección de Perfiles. |
| `external` | Un proveedor externo de horarios admitido se encarga de la ejecución física de esta zona. Un cambio desde una tarjeta de climatización, un mando u otra automatización no produce este estado; cuando Velair cede ante ese cambio, el estado es `manual`. |

El sensor permanece disponible mientras se requiere una migración de unidad de temperatura porque la información sobre quién tiene el control no es un valor de temperatura.

<a id="zone-control-attributes"></a>

### Atributos del control de zona

| Atributo | Valores o significado |
| --- | --- |
| `runtime_state` | `idle`, `scheduled`, `preconditioning`, `boost`, `paused`, `stopped`, `externally_managed`, `temperature_migration_required` o el valor de reserva defensivo `unknown`. |
| `schedule_source` | `default` para el horario Predeterminado de la zona, `profile` para una planificación efectiva de Perfil o `profile_pause` si el Perfil efectivo pausa la zona. |
| `profile_id` / `profile_name` | ID estable y nombre visible del Perfil que controla la zona, cuando procede. |
| `mode_id` / `mode_name` | ID estable y nombre visible del Modo seleccionado, cuando se aplica un Modo personalizado. |
| `manual_source` | Solo presente en `manual`: `explicit` si el ajuste manual se seleccionó directamente, `external_change` si Velair cedió ante un cambio detectado en el equipo de climatización o el valor de reserva defensivo `other`. |
| `manual_started_at` | Marca de tiempo en que comenzó el ajuste manual actual. |
| `manual_until` | Vencimiento previsto si la política manual seleccionada lo tiene. Puede estar ausente para un ajuste sin límite de tiempo. |
| `manual_policy` | Solo presente en `manual`: `until_next_block`, `for_duration`, `until_resumed` o el valor de reserva defensivo `unknown`. |

Los atributos opcionales se omiten cuando no proceden. Por ejemplo, una entidad `automatic` no tiene `manual_source` ni `manual_until`.

El estado de control y el estado de ejecución están separados deliberadamente. Por ejemplo:

- `automatic` con `runtime_state: paused` significa que Velair sigue controlando la zona, pero una pausa impide actualmente ejecutar el horario normal;
- `automatic` con `runtime_state: boost` significa que Velair controla el Refuerzo temporal;
- `external` con `runtime_state: externally_managed` significa que el proveedor externo configurado se encarga de la ejecución física en lugar del envío local de órdenes climáticas de Velair.

<a id="zone-delivery-diagnostics"></a>

## Diagnóstico de entrega de zona

**Diagnóstico de entrega de zona** es una entidad de diagnóstico desactivada por defecto. Actívala solo si un panel o automatización necesita la evidencia más reciente de entrega local:

1. Abre **Ajustes > Dispositivos y servicios > Entidades** en Home Assistant.
2. Busca el nombre del equipo gestionado seguido de **diagnóstico de entrega**.
3. Abre los ajustes de la entidad y actívala.

El sensor se basa en eventos y no realiza sondeo periódico. Su estado describe el último resultado de envío observado desde que se inició la integración:

| Estado | Cuándo ocurre |
| --- | --- |
| `idle` | No se ha registrado ningún resultado desde el inicio o desde que se borró la evidencia de entrega durante la ejecución. |
| `success` | Home Assistant aceptó toda la secuencia de servicios climáticos de Velair. `retry_count` muestra si ocurrió en el intento inicial o en un reintento. |
| `failed` | Home Assistant rechazó una llamada de servicio climático. El trabajo controlado por el programador suele continuar con recuperación limitada; una acción puntual sin recuperación puede quedar fallida sin reintentarse. |
| `retrying` | Velair ha comenzado uno de sus reintentos limitados tras un fallo recuperable. Este estado puede ser breve. |
| `exhausted` | Fallaron el intento inicial controlado por el programador y los dos reintentos retardados. |
| `invalid_intent` | Durante la recuperación o el reenvío, Velair ya no pudo resolver la intención actual en un envío válido. Los errores normales de validación de servicios y configuración se rechazan antes de llegar a este estado. |
| `cancelled` | Un trabajo de envío activo o aplazado fue sustituido por una intención más reciente, invalidado explícitamente o detenido mientras seguía pendiente. Puede ser breve si comienza inmediatamente un nuevo trabajo. |
| `unavailable` | El equipo gestionado estaba ausente, `unknown` o `unavailable`, por lo que Velair no realizó la llamada de servicio climático. Una intención apta controlada por el programador vuelve a resolverse cuando la entidad está disponible. |

La propia entidad de diagnóstico permanece disponible para que `unavailable` pueda observarse como estado. También permanece disponible durante una migración obligatoria de unidad de temperatura; la evidencia de temperatura registrada conserva la unidad capturada con ese objetivo aceptado.

Actualmente Velair realiza como máximo dos reintentos retardados, aproximadamente a los 2 y 10 segundos. Estos tiempos forman parte de la recuperación, no de un contrato recomendado para automatizaciones; las automatizaciones deben reaccionar a los estados en lugar de depender de retardos exactos.

<a id="delivery-diagnostic-attributes"></a>

### Atributos del diagnóstico de entrega

| Atributo | Significado |
| --- | --- |
| `updated_at` | Marca de tiempo de la última actualización del estado de envío. No está presente en el estado inicial `idle`. |
| `retry_count` | Número del intento representado por el estado final o de reintento actual: `0` para el inicial, después `1` o `2` para los reintentos. La cancelación lo restablece a `0`. |
| `last_error_at` | Marca de tiempo del resultado `failed`, `exhausted` o `invalid_intent` registrado más recientemente. |
| `last_error_code` | `failed`, `exhausted`, `invalid_intent` o el valor de reserva defensivo `unknown_delivery_status`. Nunca se expone el texto original de las excepciones. |
| `last_accepted_at` | Marca de tiempo en que Home Assistant aceptó la secuencia completa de control de Velair más reciente. |
| `last_accepted_source` | `automatic`, `manual`, `boost` o `automatic_reassertion`. |
| `last_accepted_action` | `set_temperature`, `set_hvac_mode`, `turn_off` o el valor de reserva defensivo `other`. |
| `last_accepted_hvac_mode` | Modo HVAC incluido en el objetivo aceptado, cuando procede. |
| `last_accepted_temperature_unit` | Unidad de temperatura registrada con un objetivo único o de intervalo. |
| `last_accepted_temperature` | Objetivo único aceptado, cuando procede. |
| `last_accepted_target_temp_low` / `last_accepted_target_temp_high` | Objetivos inferior y superior aceptados para un intervalo nativo, cuando procede. |

Las llamadas mediante `velair.set_temperature` y `velair.set_hvac_mode` se registran ambas con `last_accepted_source: manual`. Una llamada correcta de solo modo tiene `last_accepted_action: set_hvac_mode` y un modo HVAC, mientras que todos los atributos de temperatura objetivo permanecen ausentes o `null`.

Los campos del último error y de la última aceptación son historiales independientes. Un `success` posterior cambia el estado actual, pero no borra los valores anteriores `last_error_*`. Del mismo modo, un fallo posterior no borra el último objetivo aceptado. Comprueba las marcas de tiempo cuando una automatización necesite compararlos.

`success` significa que Home Assistant aceptó las llamadas de servicio; no confirma la entrega por el transporte, la actividad del equipo ni que la habitación haya alcanzado el objetivo. Utiliza la entidad de climatización y su integración de dispositivo para el estado físico. Room Assist puede cambiar posteriormente el objetivo enviado al termostato y tiene su propio sensor para ese ajuste aplicado. La publicación de horarios externos también tiene un estado independiente en Velair y no está representada por este sensor de entrega local.

Toda la evidencia de entrega existe solo durante la ejecución. Vuelve a `idle` tras reiniciar la integración de Velair o Home Assistant, y un restablecimiento correcto de los datos de Velair también la borra. No se restaura desde Recorder ni desde el almacenamiento de Velair.

<a id="automation-examples"></a>

## Ejemplos de automatización

La siguiente automatización solo notifica cuando Velair ha agotado sus reintentos limitados. Sustituye el ID de entidad de ejemplo por el de tu registro:

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

Esta condición de plantilla comprueba que Velair tenga actualmente el control automático y un bloque programado activo:

```yaml
condition: template
value_template: >-
  {{ is_state('sensor.velair_control_living_room', 'automatic')
     and state_attr('sensor.velair_control_living_room', 'runtime_state')
         == 'scheduled' }}
```

Utiliza **Control de zona** para saber quién controla la zona actualmente y conocer el contexto del programador. Utiliza **Diagnóstico de entrega de zona** para el último resultado de envío mediante servicios. Utiliza `climate.living_room` para el estado comunicado por el dispositivo.
