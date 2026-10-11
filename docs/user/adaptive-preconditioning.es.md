<a id="adaptive-preconditioning"></a>

# Preacondicionamiento adaptativo
<!-- velair-docs:start -->
Traducciones: [Original en inglés](adaptive-preconditioning.md) · [Español](adaptive-preconditioning.es.md) · [Français](adaptive-preconditioning.fr.md) · [Deutsch](adaptive-preconditioning.de.md) · [Italiano](adaptive-preconditioning.it.md) · [Nederlands](adaptive-preconditioning.nl.md) · [Polski](adaptive-preconditioning.pl.md) · [Português (Brasil)](adaptive-preconditioning.pt-br.md) · [Português (Portugal)](adaptive-preconditioning.pt-pt.md) · [Русский](adaptive-preconditioning.ru.md) · [Estado de las traducciones](../translation-status.md)

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

El Preacondicionamiento adaptativo permite a Velair iniciar la calefacción o la refrigeración antes de un bloque programado para que la habitación esté más cerca de la temperatura objetivo cuando comience el bloque.

Por ejemplo, un bloque a las `07:00` con `21 °C` significa «estar cerca de `21 °C` a las `07:00`», no «empezar a cambiar a `21 °C` a las `07:00`».

El Preacondicionamiento adaptativo se ejecuta localmente en Home Assistant. Velair guarda sus ajustes y muestras de aprendizaje en el almacenamiento de Home Assistant y nunca envía su historial de temperaturas, observaciones ni datos de calibración a un controlador externo. Las zonas delegadas mediante Ejecución externa de horarios no utilizan Preacondicionamiento adaptativo; solo se publica su horario semanal efectivo.

<a id="setup"></a>

## Configuración

La pestaña Preparación del confort ofrece dos herramientas en su selector de subsecciones. Anticipación adaptativa se abre por defecto; elige Regreso a casa para configurar la ocupación y las llegadas semanales y gestionar la ausencia actual. Sus rutas directas son `/velair/preconditioning/preconditioning` y `/velair/preconditioning/planned-return`. Consulta [Regreso a casa](planned-return.es.md).

1. Abre la pestaña Preparación del confort.
2. Expande el equipo que quieras configurar.
3. Activa el preacondicionamiento.
4. Mantén los ajustes predeterminados del modelo salvo que tengas un motivo concreto para modificarlos.
5. Opcionalmente, selecciona un sensor de temperatura exterior.

El preacondicionamiento se configura por equipo. El aprendizaje de calefacción y refrigeración se registra por separado: las muestras de refrigeración no sustituyen a las de calefacción, ni viceversa.

Se admiten intervalos nativos `heat_cool`. Si la habitación está por debajo del objetivo inferior en más de la Diferencia mínima de temperatura, Velair calcula la predicción desde ese límite y aplica anticipadamente el intervalo completo para calentar. Si está por encima del objetivo superior en más de esa diferencia, calcula desde el límite superior y aplica anticipadamente el intervalo completo para refrigerar. Las lecturas dentro del intervalo o de las bandas muertas de sus límites mantienen la hora programada habitual. Velair siempre envía ambos límites; nunca reduce un intervalo a una sola temperatura.

Al expandir un equipo, cada modo compatible muestra una tarjeta de predicción actual. Utiliza los mismos datos del backend sobre el próximo evento que la pestaña Resumen, de modo que las pausas, refuerzos, modos incompatibles y bloques que no pueden adelantarse se tratan de forma coherente. Cuando existe un bloque futuro adecuado, la tarjeta muestra el inicio calculado, la hora objetivo, el adelanto, la temperatura y el modo programados, y si Velair utiliza el modelo inicial o un historial local de casos similares.

Para comprobar un cálculo concreto, abre **Detalles del cálculo** en la tarjeta de predicción. Esta sección opcional muestra los valores del backend utilizados: recuentos de muestras, estimación de observaciones completas, límite inferior de observaciones parciales, estimación combinada, redondeo y adelanto final. Está oculta por defecto para mantener sencilla la vista habitual.

<a id="how-it-starts"></a>

## Cómo comienza

Velair calcula la diferencia de temperatura actual para el próximo bloque de temperatura programado.

Para un intervalo `heat_cool`, «temperatura objetivo» significa a continuación el límite inferior al calentar y el superior al refrigerar.

Para calefacción:

```text
delta = target temperature - current temperature
```

Para refrigeración:

```text
delta = current temperature - target temperature
```

Si la diferencia es menor que la Diferencia mínima de temperatura, Velair mantiene la hora habitual del bloque y no comienza antes.

<a id="schedule-boundaries-and-other-climates"></a>

## Límites del horario y otros equipos

Un inicio anticipado semanal no puede alcanzar ni cruzar el bloque efectivo del horario inmediatamente anterior del mismo equipo, incluido un bloque `Off`. Si la ventana calculada alcanza o cruza ese límite, Velair mantiene la hora normal de confort. Por ejemplo, con `Off` a las `19:00` y `heat` a las `20:00`, se descarta un inicio calculado a las `18:00`: se aplica `Off` a las `19:00` y la calefacción comienza a las `20:00`. Un bloque `Off` a las `22:00` de la noche anterior no impide un inicio a las `05:35` para las `07:00` si no hay ningún bloque intermedio. La misma regla se aplica a la refrigeración y a los intervalos nativos `heat_cool`; no cambia las predicciones de llegada de Regreso a casa.

Un equipo que ya está preacondicionando no retrasa los bloques ni los inicios anticipados de otros equipos. Si el procesamiento de una acción cruza otra transición, Velair calcula el objetivo actualmente autorizado del equipo afectado en lugar de repetir órdenes obsoletas. Las pausas, los refuerzos, el ajuste manual, las zonas desactivadas y la ejecución externa del horario siguen determinando si puede enviarse un objetivo. Esta recuperación se aplica mientras funciona el programador; el comportamiento configurado de aplicación al arrancar no cambia.

<a id="initial-model-example"></a>

## Ejemplo del modelo inicial

Cuando no hay suficiente historial local, Velair utiliza el modelo inicial:

```text
lead = Minimum start + Initial model min/degree * temperature delta
```

Situación:

- Bloque programado: `21 °C`, `heat`, hora objetivo `07:00`
- Temperatura de la habitación: `18 °C`
- Anticipación mínima: `10 min`
- Modelo inicial: `25 min/°C` o el equivalente `13.89 min/°F`
- Anticipación máxima: `24 h`

Cálculo:

```text
delta = 21 - 18 = 3 °C
lead = 10 + 25 * 3 = 85 min
start = 07:00 - 85 min = 05:35
```

Velair aplica el objetivo programado a las `05:35` y mantiene las `07:00` como hora visible del objetivo de confort.

<a id="heating-with-learned-history"></a>

## Calefacción con historial aprendido

Tras suficientes observaciones correctas, Velair puede utilizar un historial local de casos similares en lugar del modelo inicial.

Situación:

- Bloque programado: `21 °C`, `heat`, hora objetivo `07:00`
- Temperatura actual de la habitación: `18.5 °C`
- Diferencia actual: `2.5 °C`
- Observaciones completas similares:

```text
A: 2.0 °C in 50 min -> 25.0 min/°C
B: 2.4 °C in 72 min -> 30.0 min/°C
C: 2.8 °C in 84 min -> 30.0 min/°C
D: 2.1 °C in 63 min -> 30.0 min/°C
E: 2.6 °C in 91 min -> 35.0 min/°C
```

Con Percentil de confort en `80`, Velair elige un valor prudente entre las muestras completas similares. En este ejemplo es `35.0 min/°C`.

```text
lead = 2.5 * 35 = 87.5 min
```

Velair redondea el adelanto final hacia arriba hasta el siguiente minuto admitido por el programador, en lugar de redondearlo por debajo del valor calculado.

```text
87.5 min -> 90 min
start = 07:00 - 90 min = 05:30
```

<a id="cooling-example"></a>

## Ejemplo de refrigeración

Situación:

- Bloque programado: `23 °C`, `cool`, hora objetivo `22:00`
- Temperatura de la habitación: `27 °C`
- Anticipación mínima: `10 min`
- Modelo inicial: `25 min/°C`
- Anticipación máxima: `24 h`

Cálculo:

```text
delta = 27 - 23 = 4 °C
lead = 10 + 25 * 4 = 110 min
start = 22:00 - 110 min = 20:10
```

Cuando el equipo disponga de suficientes observaciones de refrigeración, Velair utilizará solo ese historial. No se mezcla con el de calefacción porque la misma habitación y el mismo dispositivo pueden calentar y enfriar a ritmos distintos.

<a id="partial-and-invalid-observations"></a>

## Observaciones parciales e inválidas

Velair guarda observaciones locales compactas tras los intentos de preacondicionamiento.

Las observaciones completas son ejemplos útiles en los que la habitación alcanzó el umbral objetivo a tiempo.

Las observaciones parciales indican que Velair comenzó antes, pero la habitación no alcanzó el umbral objetivo a la hora de confort programada. Actúan como límites inferiores: Velair sabe que hacía falta más tiempo, pero no inventa una hora de finalización.

Las observaciones inválidas se conservan solo para diagnóstico y no influyen en el modelo. Algunos ejemplos son diferencias mínimas, duraciones imposibles, sesiones interrumpidas, temperaturas ausentes, refuerzos, pausas o cambios de estado del programador.

Si después de antiguas observaciones parciales hay suficientes observaciones completas que demuestren que la habitación ya alcanza el objetivo de forma fiable, las parciales antiguas dejan de aumentar la predicción.

<a id="outdoor-temperature-sensor"></a>

## Sensor de temperatura exterior

El sensor de temperatura exterior es opcional.

Si está configurado, Velair guarda su valor como contexto local de las observaciones y compara posteriormente las condiciones actuales con observaciones anteriores similares. No consulta servicios meteorológicos, no requiere Internet ni aplica una corrección fija al modelo inicial.

Si el sensor exterior no está disponible al guardar una muestra, Velair guarda la observación sin ese contexto.

<a id="room-assist-interaction"></a>

## Interacción con Room Assist

Por defecto, el Preacondicionamiento adaptativo utiliza `current_temperature` de la entidad de climatización.

Si Room Sensor Assist está activado para ese equipo y hay un sensor de habitación seleccionado, el Preacondicionamiento adaptativo utiliza ese sensor como temperatura efectiva de la habitación para sus decisiones y aprendizaje.

Esto resulta útil para válvulas termostáticas o termostatos cuyo sensor integrado está demasiado cerca de un radiador, una salida de aire u otra fuente local de calor. Consulta [Room Assist](room-assist.es.md) para conocer cómo actúa sobre el equipo.

<a id="automation-events"></a>

## Eventos de automatización

Velair utiliza tres eventos `velair_event` para este ciclo:

- `preconditioning_plan_updated` cuando aparece o cambia un plan calculado;
- `preconditioning_plan_cancelled` cuando un plan publicado deja de ser aplicable;
- `preconditioning_observation_recorded` después de guardar una muestra de aprendizaje.

Consulta [Eventos de automatización](automation-events.es.md#preconditioning-plan-updated) para ver las reglas precisas de emisión y ejemplos completos del contenido de los eventos.

Ejemplo de disparador de automatización:

```yaml
trigger:
  - platform: event
    event_type: velair_event
    event_data:
      event: preconditioning_plan_updated
      entity_id: climate.living_room
```

<a id="when-velair-does-nothing"></a>

## Cuándo Velair no actúa

El Preacondicionamiento adaptativo no comienza antes cuando:

- está desactivado para ese equipo;
- el programador no está en modo automático;
- la zona está pausada o tiene un refuerzo;
- el siguiente bloque es `Off`;
- el equipo no admite la dirección necesaria de calefacción o refrigeración;
- la diferencia de temperatura es menor que la Diferencia mínima de temperatura;
- la temperatura necesaria no está disponible o no es numérica.

<a id="lovelace"></a>

## Lovelace

La vista de Preacondicionamiento está disponible como tarjeta Lovelace:

```yaml
type: custom:velair-card
view: preconditioning
entities:
  - climate.living_room
```

La tarjeta Lovelace utiliza la misma configuración del backend que el panel principal de Velair.

<a id="technical-details"></a>

## Detalles técnicos

Los detalles para desarrolladores sobre almacenamiento, algoritmo de aprendizaje, tratamiento de observaciones parciales, ponderación por similitud y salida de la API están en [Funcionamiento interno del preacondicionamiento adaptativo](../developer/adaptive-preconditioning.md).
