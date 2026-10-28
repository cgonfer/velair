<a id="environmental-comfort"></a>

# Confort ambiental
<!-- velair-docs:start -->
Traducciones: [Original en inglés](comfort.md) · [Español](comfort.es.md) · [Français](comfort.fr.md) · [Deutsch](comfort.de.md) · [Italiano](comfort.it.md) · [Nederlands](comfort.nl.md) · [Polski](comfort.pl.md) · [Português (Brasil)](comfort.pt-br.md) · [Português (Portugal)](comfort.pt-pt.md) · [Русский](comfort.ru.md) · [Estado de las traducciones](../translation-status.md)

<details>
<summary>Estado de esta traducción</summary>

| Dato | Estado |
| --- | --- |
| Versión de referencia | 1.9.0-beta.6 |
| Última sincronización | 2026-10-28 |
| Revisión lingüística | Traducción asistida por IA |
| Respecto al original | Sin cambios pendientes respecto al original inglés. |

</details>

---
<!-- velair-docs:end -->

El intervalo predeterminado de temperatura confortable es `20–24 °C`. Si Home Assistant utiliza Fahrenheit, el intervalo predeterminado es `68–75 °F`, con límites redondeados a valores sin decimales.

Confort sigue siendo independiente para cada equipo físico de un grupo de habitación. Cada miembro tiene su interruptor de supervisión, sensores y umbrales propios y muestra su propia evaluación. Agrupar comparte programación y control de la habitación sin sustituir esos ajustes de Confort.

Los umbrales de Confort utilizan la unidad de temperatura configurada en Home Assistant y se migran o importan con el resto de los datos térmicos guardados de Velair. Un sensor de temperatura que declare la otra unidad se convierte antes de comparar su lectura con los umbrales de Confort del equipo gestionado.

Confort ambiental ofrece para cada equipo de climatización gestionado una descripción comprensible de la habitación, en lugar de un nivel genérico de advertencia.

Supervisa las lecturas de temperatura, humedad y CO2 disponibles localmente. No cambia horarios ni controla dispositivos automáticamente. Velair expone la evaluación en el panel, las tarjetas Lovelace y los eventos de Home Assistant para que las automatizaciones decidan qué hacer.

<a id="sources"></a>

## Fuentes

La temperatura utiliza la primera fuente disponible en este orden:

1. el sensor de temperatura seleccionado en la pestaña Confort;
2. el sensor Room Assist configurado para ese equipo;
3. el atributo `current_temperature` de la entidad de climatización.

Para los equipos agrupados, la temperatura automática usa `current_temperature` del miembro físico; no hereda el sensor Room Assist del grupo. Selecciona un sensor externo expresamente en Confort para ese miembro si lo necesitas.

La humedad utiliza:

1. el sensor de humedad seleccionado en la pestaña Confort;
2. el atributo de humedad medida `current_humidity` de la entidad de climatización, cuando está disponible. El atributo `humidity` es un ajuste objetivo, no una lectura.

La opción predeterminada `Usar fuente automática` mantiene este comportamiento automático. Selecciona `No monitorizar humedad` cuando la humedad no deba influir en la condición ambiental o calidad de datos del equipo. La selección del sensor guardada se conserva, pero Velair no lo lee ni escucha mientras la supervisión de humedad está desactivada.

El CO2 solo se supervisa si se selecciona un sensor de CO2.

El identificador de entidad efectivo aparece debajo de cada selector. Las métricas opcionales sin fuente no se consideran fallos.

<a id="comfort-models"></a>

## Modelos de Confort

Velair ofrece tres formas de describir la zona de temperatura y humedad relativa útil para una habitación. Es un objetivo configurado por el usuario, no una definición universal ni médica del confort.

- **Rangos simples** es el modelo predeterminado. Un intervalo de temperatura y otro de humedad forman la zona objetivo rectangular habitual. Las configuraciones existentes conservan este comportamiento sin cambios.
- **Rango psicrométrico guiado** utiliza un intervalo de humedad como referencia en el punto medio del intervalo de temperatura configurado. Velair sigue la relación física entre temperatura y humedad relativa para adaptar ese intervalo automáticamente. El gráfico muestra la zona objetivo curva resultante, en lugar de un rectángulo. Es una orientación local práctica, no una norma completa de confort fisiológico.
- **Rango personalizado según temperatura** conserva el mismo intervalo de temperatura, pero permite diferentes mínimos y máximos de humedad en sus extremos frío y cálido. Velair une gradualmente esos dos intervalos de humedad, de modo que la zona objetivo adopta una forma inclinada de cuatro lados en lugar de un rectángulo.

Por ejemplo, una habitación configurada para `20–24 °C` puede aceptar `40–60%` a `20 °C` y `35–50%` a `24 °C`. A `22 °C`, Velair evalúa la humedad con el intervalo intermedio: `37.5–55%`. Por debajo o encima del intervalo de temperatura configurado utiliza el extremo más cercano en lugar de extrapolar más allá de los valores del usuario.

El intervalo efectivo actual de humedad aparece debajo del mapa. El mismo intervalo calculado por el backend determina la condición mostrada, el resumen del intervalo, la entidad Estado ambiental, los eventos, Diagnóstico y la orientación exterior opcional; los clientes no calculan una segunda interpretación. Si la temperatura actual falta o está desactualizada, Velair puede seguir mostrando una lectura actual de humedad, pero no la clasifica ni ofrece orientación sobre humedad hasta que pueda calcularse el intervalo efectivo.

El modo Guiado requiere una fuente de humedad que Velair pueda identificar, procedente del equipo gestionado o de un sensor seleccionado de Home Assistant. La opción permanece indisponible hasta identificar una. Si esa fuente no está disponible temporalmente, Velair conserva el modelo y los ajustes seleccionados y espera datos actuales en lugar de cambiar de modelo.

Los dos intervalos de humedad personalizados de los extremos pueden subir, bajar o permanecer iguales al cambiar la temperatura. Velair no impone una dirección porque los edificios y sus ocupantes difieren. Guiado es la opción compacta cuando el mismo porcentaje de humedad relativa no debe tratarse igual a todas las temperaturas. Utiliza Personalizado solo cuando el comportamiento medido de la habitación justifique claramente controlar ambos extremos.

Antes de personalizar esos intervalos de los extremos, cambiar el intervalo de humedad Simple mantiene ambos extremos alineados con él. Una vez personalizado un intervalo dependiente de la temperatura, Velair lo conserva al cambiar entre modelos para no perder una configuración alternativa.

<a id="additional-environmental-information"></a>

## Información ambiental adicional

La configuración de Confort puede añadir opcionalmente tres lecturas a la información que Velair ya tiene para un equipo gestionado:

| Lectura | Qué aporta dentro de Velair |
| --- | --- |
| **Punto de rocío** | Una indicación compacta de la proximidad del aire a las condiciones de condensación. No establece que vaya a producirse condensación porque Velair desconoce la temperatura de paredes, ventanas y otras superficies. |
| **Humedad absoluta** | La masa de vapor de agua por metro cúbico de aire, mostrada en `g/m³`. A diferencia de la humedad relativa, no se expresa como porcentaje del nivel de saturación del aire. Velair no le aplica un intervalo universal bueno/malo. |
| **Humidex** | Un valor adicional de calor percibido derivado de la temperatura y humedad. Velair muestra el valor, pero no utiliza las bandas de referencia publicadas para hacer recomendaciones ni lo utiliza como puntuación completa de confort interior. |

Activa solo las lecturas útiles para tus paneles o automatizaciones. No son necesarias para la condición normal de Confort y todas están desactivadas por defecto.

La vista expandida del equipo separa la información actual de los controles de configuración. Las lecturas activadas aparecen en un grupo compacto y adaptable justo debajo del mapa de temperatura/humedad y de la escala de CO2. Cada elemento contiene su valor actual o estado de disponibilidad y una ayuda informativa accesible; nunca contiene un interruptor ni un selector de fuente. Las lecturas desactivadas no dejan tarjetas visuales ni posiciones de cuadrícula vacías.

Todos los controles se agrupan en **Configuración de confort**, cerrada por defecto para mantener el foco en la evaluación actual. Sus secciones compactas separan fuentes de datos, modelo de Confort, preferencias específicas del modelo, recomendaciones e información ambiental adicional. Los controles de métricas derivadas contienen únicamente el interruptor de activación y la selección de fuente, no una lectura actual duplicada. El panel de configuración permanece disponible mientras la supervisión de Confort está desactivada, para poder preparar un equipo antes de activarla. Abrir o cerrar este panel es una opción local de la interfaz y no se guarda como configuración.

Cada métrica está desactivada por defecto y tiene un selector de fuente. Su primera opción es **Calculado por Velair**; las demás son sensores compatibles de Home Assistant, por lo que una lectura externa no requiere un segundo control de entidad:

- **Calculado por Velair** utiliza las lecturas efectivas de temperatura y humedad de Confort ya seleccionadas para ese equipo. Si no se supervisa la humedad o cualquiera de las entradas no está disponible, la lectura calculada se declara ausente.
- **Entidad de Home Assistant** lee una entidad `sensor.*` existente. Puede proceder de Thermal Comfort, una plantilla u otra integración; Thermal Comfort no es necesario ni se detecta de forma especial.

Un sensor externo de punto de rocío debe publicar `°C` o `°F`. Velair lo muestra en la unidad de temperatura del equipo gestionado. Un sensor de humedad absoluta debe publicar `g/m³` o `mg/m³`; Velair muestra `g/m³`. Un sensor Humidex puede publicar la representación habitual `°C` o `°F` de entidades con clase de dispositivo de temperatura, o un valor sin unidad. Velair lo normaliza al valor Humidex canónico sin unidad, también en instalaciones Fahrenheit.
Velair normaliza las lecturas válidas e informa de fuentes ausentes, desactualizadas o inválidas sin modificar el resultado existente de condición ambiental o calidad de datos. Se puede guardar una métrica externa activada sin seleccionar todavía una entidad; ese estado incompleto válido se declara ausente y sobrevive a la exportación/importación. Los estados `unknown` y `unavailable` de Home Assistant son ausentes, mientras que los valores no numéricos, unidades incompatibles y humedad absoluta negativa son inválidos.

Estas métricas son observacionales. Nunca cambian un horario, modo HVAC, objetivo, ajuste de Room Assist ni decisión de preacondicionamiento. En particular, Humidex complementa las lecturas reales de temperatura y humedad en vez de sustituirlas, evitando contar la humedad dos veces.

<a id="comfort-insights"></a>

## Información contextual de Confort

Velair mantiene la condición configurada de temperatura/humedad como resumen principal y agrupa tarjetas contextuales compactas encima de las lecturas. Explican cruces de umbrales de CO2, un aumento significativo de Humidex y cualquier oportunidad o contrapartida de ventilación actual sin repetir la condición ni sustituir el mapa o la escala de CO2.

La redacción es prudente. Humidex aparece como información contextual solo cuando el calor percibido supera la temperatura del aire en al menos 1 °C. Un CO2 elevado o una mala calidad del aire también pueden añadir información. El punto de rocío y la humedad absoluta siguen siendo lecturas útiles en lugar de mensajes permanentes: su botón de información explica el posible umbral de condensación en superficies y la cantidad de vapor de agua, respectivamente. La ayuda está disponible al situar el puntero encima, enfocar con el teclado o tocar en pantallas táctiles. Se ignoran las lecturas ausentes, desactualizadas e inválidas. Los datos exteriores no modifican la condición interior ni el control de climatización.

Los valores actuales aparecen en la fila expandida del equipo de la pestaña **Confort**. La vista Lovelace de Confort utiliza la misma presentación. Cuando Confort está activado en una tarjeta Velair de un solo equipo, el resumen expandido incluye cada lectura derivada activada y actual. El editor de tarjetas también puede incluirlas en la fila de Confort de la sección Estado actual contraída cuando un panel necesite información más densa. Las lecturas ausentes, desactualizadas e inválidas permanecen visibles con su estado en la vista Confort en lugar de presentar un número antiguo o inventado. Humidex se muestra junto a la temperatura ambiente con una comparación direccional; en Fahrenheit, solo se escala la diferencia, por lo que nunca se le suma 32.
Las diferencias también aparecen en el mensaje contextual de Humidex, con la unidad de la zona y un decimal. Humidex en sí es un índice de calor aparente sin unidad y referenciado a Celsius: no es una temperatura física y Velair no añade una unidad a su valor.

Cuando Humidex está actualizado, su panel también muestra una escala compacta de comparación. Los dos marcadores identifican la temperatura del aire de la habitación y Humidex, mientras que la banda resaltada es el intervalo de temperatura configurado para ese equipo. El estado indica si Humidex está por debajo, dentro o por encima de ese intervalo; no afirma que la habitación sea confortable o peligrosa. La escala se extiende 5 °C por debajo y encima del intervalo configurado para mantener legibles las diferencias cercanas. En Fahrenheit, las etiquetas absolutas de la escala se convierten normalmente, mientras que la diferencia solo se multiplica por `9 / 5`; el valor Humidex permanece sin unidad. Los datos ausentes o inválidos no muestran una posición inventada.
El punto de rocío se describe de forma neutral como superior o inferior al aire de la habitación. La humedad absoluta sigue siendo una lectura neutral en `g/m³`. Sus definiciones se consultan mediante los botones de información accesibles para mantener compactos los paneles.

El resumen principal comienza siempre con la condición ambiental física, utilizando las lecturas configuradas de temperatura y humedad. Cuando Humidex está activado y su posición respecto al intervalo difiere de la temperatura del aire, una segunda etiqueta **Humidex** muestra si el calor percibido está por debajo, dentro o encima del intervalo de temperatura configurado. Así se mantiene visible la condición física sin sustituirla por una interpretación derivada. El panel Humidex explica la diferencia medida sin llamar a la habitación caliente, fría o confortable. Los datos derivados ausentes o inválidos nunca cambian la condición física.

El estado del sensor **Estado ambiental** descrito a continuación no cambia. Las automatizaciones existentes pueden seguir utilizándolo; Humidex y el resumen del intervalo son contexto observacional adicional y nunca controlan el equipo.

<a id="indoor-vs-outdoor"></a>

## Interior frente a exterior

La comparación exterior opcional añade contexto sin cambiar la condición interior de Confort. Activa **Interior y exterior** dentro del panel contraído **Configuración de confort**, selecciona un sensor explícito de temperatura exterior y, opcionalmente, uno de humedad exterior. Desactivar la comparación conserva esas selecciones para volver a activarla sin reconfigurar.

El panel de ejecución permanece separado del gráfico. Muestra las temperaturas interior y exterior con su diferencia, la humedad absoluta interior y exterior y la humedad relativa que tendría el aire exterior al alcanzar la temperatura interior actual. Las dos áreas son simétricas en pantallas amplias y se apilan en móvil.

Ambos valores de humedad absoluta proceden directamente del backend. Si un backend antiguo no proporciona el valor interior, la interfaz lo muestra como no disponible en lugar de reconstruir una lectura física a partir de diferencias redondeadas.

Velair puede mostrar una oportunidad o contrapartida de ventilación prudente, proporcionada por el backend, en el área contextual compartida encima de las lecturas. Una oportunidad basada solo en temperatura indica explícitamente que el impacto sobre la humedad no está disponible. Las lecturas ausentes, desactualizadas, inválidas y no supervisadas aparecen como estados, en lugar de reutilizar valores o presentar comparaciones falsas.

Velair también crea un sensor enumerado **Oportunidad de ventilación** por equipo gestionado. Mantiene el resultado actual disponible para paneles y automatizaciones después de reiniciar sin cambiar el estado del sensor **Estado ambiental** que utilizan las automatizaciones existentes. Consulta [Oportunidad de ventilación](zone-sensors.es.md#ventilation-opportunity).

**Orientación de ventilación**, en el mismo panel de configuración, permite elegir para cada equipo la magnitud de la diferencia útil necesaria para que Velair muestre ese contexto:

| Ajuste | Predeterminado | Qué filtra |
| --- | --- | --- |
| Diferencia de temperatura | `1 °C` / `1.8 °F` | Diferencias pequeñas de temperatura interior frente a exterior. |
| Diferencia de humedad ajustada | `5` puntos porcentuales | Cambios pequeños de humedad relativa proyectada después de que el aire exterior alcance la temperatura interior. |
| Diferencia de humedad del aire | `1 g/m³` | Diferencias pequeñas de humedad absoluta que, solo por la temperatura, podrían parecer útiles. |

Los controles de humedad aparecen después de seleccionar un sensor de humedad exterior. Sus valores se conservan si ese sensor o la comparación se desactivan después. Los valores bajos hacen la orientación más sensible; los altos requieren una diferencia más clara. Estos márgenes no sustituyen los intervalos de Confort configurados: el aire exterior debe seguir acercando la habitación al intervalo correspondiente.

Esta función es visual y se basa en eventos. No abre ni cierra ventanas ni cambia objetivos, modos, horarios, pausas o refuerzos de climatización. Velair utiliza únicamente las entidades `sensor.*` seleccionadas y no recurre a datos meteorológicos como alternativa.

Velair no crea tres entidades de sensor proxy adicionales. Las lecturas activadas están disponibles en el atributo `derived_metrics` del sensor existente **Estado ambiental** de zona, en la API de horarios, Diagnóstico y el evento `comfort_assessment_changed`. Así se mantiene una sola fuente de referencia y los paneles y automatizaciones pueden consumir los datos. Consulta [Estado ambiental](zone-sensors.es.md#environmental-condition) para ver todos sus estados, atributos, plantillas defensivas y orientación para elegir la entidad o el evento en una automatización.

<a id="environmental-conditions"></a>

## Condiciones ambientales

La temperatura y humedad se clasifican según los intervalos configurados y se combinan en una condición ambiental compatible:

| Temperatura | Humedad | Condición |
| --- | --- | --- |
| Bajo el intervalo | Bajo el intervalo | `Frío y seco` |
| Bajo el intervalo | Dentro del intervalo | `Frío` |
| Bajo el intervalo | Sobre el intervalo | `Frío y húmedo` |
| Dentro del intervalo | Bajo el intervalo | `Ambiente seco` |
| Dentro del intervalo | Dentro del intervalo | `Confortable` |
| Dentro del intervalo | Sobre el intervalo | `Ambiente húmedo` |
| Sobre el intervalo | Bajo el intervalo | `Caluroso y seco` |
| Sobre el intervalo | Dentro del intervalo | `Calor` |
| Sobre el intervalo | Sobre el intervalo | `Caluroso y húmedo` |

Cuando solo hay una métrica útil disponible, Velair informa de lo que puede establecer sin afirmar un confort completo:

- `Temperatura adecuada`;
- `Humedad adecuada`;
- `Frío`, `Calor`, `Ambiente seco` o `Ambiente húmedo`.

Si no hay ninguna lectura ambiental útil, la condición se muestra como `Sin lecturas`. Cuando todas las fuentes supervisadas están desactualizadas, se muestra como `Lecturas desactualizadas`.

<a id="air-quality"></a>

## Calidad del aire

El CO2 permanece separado de la temperatura y humedad porque describe la calidad del aire, no el confort térmico:

- `Buena`: por debajo del umbral de atención;
- `CO2 elevado`: en el umbral de atención o por encima;
- `Calidad del aire deficiente`: en el umbral de mala calidad o por encima;
- `CO2 no disponible`: una fuente de CO2 configurada no puede leerse actualmente.

Por tanto, una habitación puede mostrar, por ejemplo, `Caluroso y húmedo` junto con `CO2 elevado`.

<a id="data-quality"></a>

## Calidad de datos

Velair expone un valor de calidad de datos:

- `complete`: cada métrica supervisada tiene una lectura actual respaldada por una comunicación reciente de Home Assistant;
- `unverified`: todas las métricas supervisadas son utilizables, pero al menos una lectura no tiene una marca temporal de comunicación verificable;
- `partial`: hay una evaluación disponible, pero al menos una lectura supervisada falta o está desactualizada;
- `stale`: no hay lecturas actuales y todas las fuentes supervisadas están desactualizadas;
- `unavailable`: no puede utilizarse ninguna lectura actual por otro motivo.

La pestaña Confort agrupa las lecturas utilizables cuya vigencia no puede verificarse junto a los selectores de sensores en **Configuración → Fuentes de datos**. Una explicación discreta identifica las lecturas afectadas y aclara que desconocer la hora de medición no significa que sean incorrectas ni que la habitación sea incómoda. Resumen y las tarjetas Lovelace omiten este estado habitual; Diagnóstico conserva el contexto técnico de vigencia. Es una configuración automática válida con la fuente del equipo, no un error. Las lecturas ausentes o desactualizadas siguen mostrando una advertencia en la lista de zonas.

<a id="visual-status"></a>

## Estado visual

La fila contraída del equipo muestra:

- la condición ambiental;
- una etiqueta Humidex independiente solo cuando la temperatura actual y Humidex ocupan partes diferentes del intervalo configurado;
- etiquetas opcionales de lecturas derivadas para Humidex, punto de rocío y humedad absoluta cuando el editor de la tarjeta de un solo equipo activa lecturas contraídas adicionales;
- la calidad del aire cuando se supervisa CO2;
- un icono de advertencia cuando las lecturas están incompletas;
- el interruptor de activación/desactivación de Confort.

El estado actual expandido utiliza:

- la misma condición ambiental física como encabezado principal;
- un mapa de temperatura/humedad cuando ambas lecturas son actuales;
- una única escala horizontal cuando solo la temperatura o humedad es actual;
- una escala de CO2 independiente cuando se supervisa CO2 y su lectura es actual.

El mapa de temperatura/humedad utiliza nueve regiones sutiles para las condiciones de frío, calor, sequedad, humedad y sus combinaciones. Su zona objetivo resaltada sigue siempre el modelo seleccionado: un rectángulo para Simple, una curva calculada por el backend para Guiado y el polígono configurado para Personalizado. Un pequeño marcador muestra la posición actual y su etiqueta contiene ambas lecturas.

En las escalas de una sola métrica, la sección verde central es el intervalo de confort configurado. Sus etiquetas de mínimo y máximo se alinean con el inicio y final de esa sección; las secciones exteriores aportan contexto para las lecturas por debajo o encima del intervalo.

## Lovelace

La vista Confort está disponible como tarjeta Lovelace:

```yaml
type: custom:velair-card
view: comfort
```

La tarjeta puede limitarse a determinados equipos gestionados:

```yaml
type: custom:velair-card
view: comfort
entities:
  - climate.living_room
  - climate.bedroom
```

También puede ocultar secciones locales de la interfaz cuando un panel deba centrarse solo en las lecturas relevantes:

```yaml
type: custom:velair-card
view: comfort
show_comfort_configuration: false
show_comfort_temperature: true
show_comfort_humidity: false
show_comfort_co2: true
```

Las opciones `show_comfort_*` omitidas tienen el valor predeterminado `true`. Cuando `show_comfort_configuration` es `false`, la tarjeta oculta todo el panel de configuración, pero mantiene las lecturas derivadas activadas en la evaluación visual.

Las opciones de visibilidad de temperatura, humedad y CO2 solo afectan a los gráficos de esa tarjeta Lovelace. No cambian la configuración de Confort, selección de fuentes, umbrales, eventos de automatización ni sensores de Home Assistant. Si la temperatura y humedad están visibles, pero solo existe una lectura actual, la tarjeta recurre a la misma escala de una sola métrica utilizada por el panel principal de Velair.

<a id="freshness"></a>

## Vigencia de los datos

`Desactualizado tras` es el tiempo máximo desde que un sensor seleccionado comunicó por última vez su estado a Home Assistant (`last_reported`). Repetir el mismo valor actualiza la marca temporal de la comunicación y mantiene vigente la lectura. Velair escucha esas comunicaciones y programa el siguiente vencimiento, para que el panel, los sensores y los eventos puedan mostrar `stale` cuando se alcance el plazo sin otra comunicación.

El ajuste está en su propia sección **Vigencia de los datos**, después de los controles de fuentes. Enumera las fuentes directas cubiertas por el límite, incluidos sensores Room Assist, CO2, exteriores o métricas derivadas externas. La explicación de lecturas con vigencia no verificable aparece junto a los selectores de sensores e incluye métricas derivadas habilitadas y lecturas exteriores. Los sensores exteriores pueden mantener el límite activo aunque la temperatura y humedad interiores procedan del equipo; el límite no hace caducar esas lecturas. Puedes configurarlo antes de habilitar Confort. Sin una fuente directa configurada, el campo se deshabilita con una explicación; el valor guardado se conserva para una futura selección.

Los atributos automáticos de temperatura y humedad de `climate.*` no tienen una marca temporal de comunicación independiente. Velair mantiene visible un valor válido y etiqueta su vigencia como `unverified`; los cambios en el objetivo del equipo no verifican una medición nueva. Selecciona el sensor original de temperatura o humedad cuando esté disponible. Si un sensor seleccionado no tiene `last_reported`, su valor válido también es `unverified`. Una entidad `unavailable` o `unknown` no puede proporcionar una lectura utilizable, aunque conserve atributos numéricos antiguos.

Una comunicación de Home Assistant no demuestra que el sensor físico haya realizado otra medición. Una integración que solo comunique cambios de valor acabará marcada como desactualizada si su valor permanece constante.

<a id="automation-event"></a>

## Evento de automatización

Cuando cambia la condición ambiental, la calidad del aire, calidad de los datos, los problemas de datos o el estado semántico de una métrica derivada activada, Velair emite:

```yaml
event_type: velair_event
event_data:
  event: comfort_assessment_changed
```

Ejemplo del contenido del evento:

```json
{
  "domain": "velair",
  "event": "comfort_assessment_changed",
  "entity_id": "climate.living_room",
  "condition": "cold_and_humid",
  "air_quality": "elevated",
  "data_quality": "complete",
  "data_issues": [],
  "range_summary": {
    "status": "outside_range",
    "thermal_relation": "not_evaluated",
    "positions": {
      "temperature": "below",
      "humidity": "above",
      "humidex": null
    }
  },
  "previous_range_summary": {
    "status": "within_range",
    "thermal_relation": "not_evaluated",
    "positions": {
      "temperature": "within",
      "humidity": "within",
      "humidex": null
    }
  },
  "range_summary_changed": true,
  "range_status_changed": true,
  "temperature": {
    "metric": "temperature",
    "availability": "current",
    "freshness": "reported",
    "condition": "cold",
    "source": "sensor",
    "entity_id": "sensor.living_room_temperature",
    "value": 18.7,
    "min": 20.0,
    "max": 24.0
  },
  "humidity": {
    "metric": "humidity",
    "availability": "current",
    "freshness": "reported",
    "condition": "humid",
    "source": "sensor",
    "entity_id": "sensor.living_room_humidity",
    "value": 68,
    "min": 40,
    "max": 60
  },
  "co2": {
    "metric": "co2",
    "availability": "current",
    "freshness": "reported",
    "condition": "elevated",
    "source": "sensor",
    "entity_id": "sensor.living_room_co2",
    "value": 1200,
    "attention": 1000,
    "max": 1500
  },
  "derived_metrics": {
    "dew_point": {
      "metric": "dew_point",
      "availability": "current",
      "freshness": "reported",
      "source": "velair",
      "entity_id": null,
      "value": 12.9,
      "unit": "°C",
      "issues": [],
      "input_entity_ids": [
        "sensor.living_room_temperature",
        "sensor.living_room_humidity"
      ]
    }
  }
}
```

Ejemplo de automatización:

```yaml
automation:
  - alias: "Velair poor air quality"
    triggers:
      - trigger: event
        event_type: velair_event
        event_data:
          event: comfort_assessment_changed
          air_quality: poor
    actions:
      - action: notify.mobile_app_phone
        data:
          message: >
            Poor air quality in {{ trigger.event.data.entity_id }}:
            {{ trigger.event.data.co2.value | round(0) }} ppm
```

Abrir o actualizar el panel no emite un evento de automatización. Los cambios numéricos en las lecturas originales o derivadas no emite duplicados mientras sus clasificaciones semánticas y disponibilidad permanezcan iguales. El panel y los atributos de sensores de Home Assistant siguen actualizándose con los últimos valores.

Utiliza `range_status_changed: true` cuando una automatización deba reaccionar únicamente a cambios del estado agregado del intervalo configurado. Utiliza `range_summary_changed: true` cuando también importen los cambios de posiciones individuales o de su relación térmica. Otros cambios de Confort pueden emitir este mismo evento con ambos indicadores en `false`; los resúmenes actual y anterior explicitan esa transición.

Consulta [Eventos de automatización](automation-events.es.md#comfort-assessment-changed) para ver el contenido completo del evento, los campos derivados exactos que participan en ese estado semántico y el patrón de disparador compartido `velair_event`.

<a id="performance-and-privacy"></a>

## Rendimiento y privacidad

Confort está desactivado por defecto.

Cuando está desactivado para un equipo, Velair no registra suscripciones de Confort para él. Cuando está activado, escucha únicamente al equipo gestionado y las entidades de sensores seleccionadas o resueltas automáticamente, incluidas las fuentes externas activas de métricas derivadas. Las métricas derivadas nativas reutilizan las suscripciones existentes de temperatura y humedad. No hay sondeo continuo.

Todas las lecturas y evaluaciones permanecen locales dentro de Home Assistant.
