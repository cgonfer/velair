<a id="seasonal-climate-selection"></a>

# Selección climática estacional
<!-- velair-docs:start -->
Traducciones: [Original en inglés](seasonal-climate-selection.md) · [Español](seasonal-climate-selection.es.md) · [Français](seasonal-climate-selection.fr.md) · [Deutsch](seasonal-climate-selection.de.md) · [Italiano](seasonal-climate-selection.it.md) · [Nederlands](seasonal-climate-selection.nl.md) · [Polski](seasonal-climate-selection.pl.md) · [Português (Brasil)](seasonal-climate-selection.pt-br.md) · [Português (Portugal)](seasonal-climate-selection.pt-pt.md) · [Русский](seasonal-climate-selection.ru.md) · [Estado de las traducciones](../../translation-status.md)

<details>
<summary>Estado de esta traducción</summary>

| Dato | Estado |
| --- | --- |
| Versión de referencia | 1.9.0-beta.2 |
| Última sincronización | 2026-10-17 |
| Revisión lingüística | Traducción asistida por IA |
| Respecto al original | Sin cambios pendientes respecto al original inglés. |

</details>

---
<!-- velair-docs:end -->

Ejecuta las acciones que elijas después de que un sensor de temperatura cambie y mantenga su nuevo valor durante un retardo configurable. Selecciona Modos de invierno, entretiempo o verano sin duplicar horarios ni introducir reglas meteorológicas en Velair. Las lecturas de sensor no válidas generan una notificación inmediata de Home Assistant.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fseasonal_climate_selection.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Abrir Home Assistant e importar el blueprint Selección climática estacional" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/seasonal_climate_selection.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Ver el código YAML de Selección climática estacional"></a>
</p>

[Ver historial de cambios](../../../blueprints/changelogs/seasonal_climate_selection.md) · [Volver al índice de blueprints](../blueprints.es.md)

<a id="when-to-use-it"></a>

## Cuándo utilizarlo

Utiliza este blueprint si Home Assistant ya ofrece la máxima prevista del día, una medición exterior o una temperatura media como un único sensor numérico de temperatura. El blueprint elige las acciones que se ejecutarán; Velair sigue encargándose de los horarios, presets, Preacondicionamiento y envío de órdenes a los dispositivos.

Para un sensor que se actualiza una vez al día, una actualización estable puede elegir la rutina del día. Para un sensor exterior o de promedio que cambie con frecuencia, elige el retardo con cuidado: cada valor nuevo reinicia la espera. Un sensor actualizado cada cinco minutos puede no completar nunca una espera de 30 minutos.

<a id="requirements"></a>

## Requisitos

- Versión 1.0.0 del blueprint y Home Assistant 2024.6.0 o posterior.
- Un sensor numérico con clase de dispositivo de temperatura y unidad declarada de °C o °F.
- Velair solo es necesario para acciones que utilicen sus entidades o servicios. Los scripts estándar y otras acciones de Home Assistant funcionan sin Velair.
- Prepara el sensor de previsión por separado si tu proveedor meteorológico ofrece previsiones en lugar de un sensor numérico. Este blueprint no obtiene previsiones.

Los Modos y el selector nativo de Modo de Velair están disponibles desde Velair 1.6.0. Los presets compartidos y las plantillas vinculadas son opcionales: el selector estacional también puede elegir Modos creados con horarios independientes.

<a id="configuration"></a>

## Configuración

| Campo | Finalidad |
|---|---|
| Temperature sensor | El sensor existente que se observará |
| Temperature unit for thresholds | °C o °F; las lecturas se convierten para compararlas |
| Winter threshold | Los valores inferiores ejecutan las acciones de invierno; predeterminado 20 |
| Summer threshold | Los valores superiores ejecutan las acciones de verano; predeterminado 27 |
| Winter / Mild-weather / Summer actions | Secuencias de acciones estándar de Home Assistant; inicialmente vacías |
| Stability delay | Cuánto tiempo debe mantenerse sin cambios la nueva temperatura numérica; predeterminado 30 minutos |
| Language for diagnostic notifications | Cualquier idioma admitido por Velair para los avisos persistentes de sensor y configuración; inglés por defecto |

El umbral de invierno debe ser inferior al de verano y el retardo debe ser positivo. Los valores de los umbrales no cambian automáticamente al elegir Fahrenheit: introduce tú los umbrales deseados en Fahrenheit.

Estas dos opciones son explícitas porque Home Assistant no expone sus preferencias globales de unidad de temperatura o idioma a las plantillas de blueprints. El idioma del usuario del navegador tampoco es un ajuste de la automatización. La unidad declarada del sensor se lee automáticamente y se convierte a la unidad de umbral elegida; las notificaciones de diagnóstico utilizan el idioma seleccionado aquí.

El selector de idioma solo cambia el texto de las notificaciones de diagnóstico. Las etiquetas y descripciones del formulario del blueprint permanecen en inglés; no traduce el formulario de configuración de Home Assistant.

Una secuencia de acciones vacía no hace nada. No apaga ningún equipo, suspende Velair ni selecciona Predeterminado.

<a id="example"></a>

## Ejemplo

<a id="daily-maximum-and-three-modes"></a>

### Máxima diaria y tres Modos

Crea los Modos Invierno, Entretiempo y Verano en Velair. Relaciona Invierno y Verano con sus respectivos Perfiles. Configura Entretiempo con un Perfil cuyas zonas pertinentes utilicen **Pausar → Apagar el clima** si el tiempo templado debe desactivar la climatización.

En cada secuencia de acciones del blueprint, añade la acción **Seleccionar: Seleccionar** de Home Assistant, elige la entidad visible de Modo de Velair y selecciona su opción en el editor. No des por supuesto que tu entidad tiene el ID del ejemplo siguiente.

```yaml
service: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Invierno
```

Con umbrales de 20 y 27 °C, una máxima diaria que cambie a 18 °C ejecuta las acciones de invierno tras 30 minutos sin cambios. Una actualización posterior a 23 °C ejecuta las acciones de entretiempo; 30 °C ejecuta las de verano. Los valores exactos de 20 y 27 °C corresponden a entretiempo. Cada valor cambiado puede ejecutarse, incluido 18 → 19 °C dentro de invierno.

<a id="shared-hours-different-indoor-temperatures"></a>

### Horas compartidas y temperaturas interiores diferentes

Vincula las planificaciones de los Perfiles Invierno y Verano a la misma plantilla diaria mediante **Solo horarios**. Asigna presets de invierno, como Calor a 21 °C, y de verano, como Frío a 25 °C. Mover el bloque de las 07:00 de la plantilla cambia ambos horarios; seleccionar un Modo elige los objetivos correspondientes. El blueprint no modifica los presets ni la plantilla. Consulta los [ejemplos prácticos de horarios vinculados](../linked-schedule-examples.es.md).

<a id="average-temperature-and-fahrenheit"></a>

### Temperatura media y Fahrenheit

Un sensor de promedio puede cambiar varias veces por hora. Con un retardo de diez minutos, las actualizaciones a las 10:00 y las 10:07 posponen la decisión hasta las 10:17, siempre que no llegue otro valor. Si sigue cambiando antes de que pasen diez minutos, no se ejecutan acciones estacionales.

Un sensor en Fahrenheit puede utilizar umbrales Celsius porque la lectura se convierte. También puedes seleccionar °F e introducir umbrales como 68 y 80.6 °F, equivalentes a 20 y 27 °C. Un valor de 77 °F selecciona entonces las acciones de entretiempo.

<a id="alternative-script-or-service"></a>

### Script o servicio alternativo

Cada rama admite acciones normales de Home Assistant. Por ejemplo, ejecuta un script del hogar en la rama de verano:

```yaml
service: script.turn_on
target:
  entity_id: script.summer_climate_routine
```

También es posible activar directamente un Perfil con `velair.activate_profile` y su ID estable. Para modificar ajustes compartidos en lugar de elegir un Modo, consulta las [automatizaciones de presets](../preset-automations.es.md); considera todos los usos de un preset compartido antes de cambiarlo.

<a id="how-it-works"></a>

## Cómo funciona

Un disparador de estado detecta una temperatura numérica distinta y la espera interrumpible nativa de Home Assistant comprueba que permanezca estable durante el retardo configurado. Un cambio numérico real interrumpe la decisión pendiente e inicia otra espera, incluso si vuelve a un valor anterior: `21 → 22 → 21` inicia un nuevo retardo en el 21 final. Un cambio únicamente de formato, como de `21` a `21.0`, no inicia otra decisión ni interrumpe una espera en curso. Las actualizaciones solo de atributos no inician acciones estacionales. Antes de comenzar las acciones, el blueprint vuelve a comprobar la lectura numérica actual, su unidad, los umbrales, el retardo y la continuidad de la espera.

Una lectura o unidad no válida interrumpe inmediatamente una decisión pendiente, incluso cuando solo cambia el atributo de unidad. Restaurar únicamente la unidad descarta el diagnóstico, pero no selecciona una estación; hace falta otro cambio de estado numérico. Recuperarse de un estado numérico no válido, como `unavailable`, a un número válido inicia un nuevo retardo.

El inicio de Home Assistant solo comprueba los diagnósticos. No elige un Modo estacional. Los temporizadores pendientes no sobreviven a un reinicio o recarga de la automatización; después se necesita otro cambio de estado del sensor. No hay disparador periódico ni diario, ni un ayudante que guarde la última clasificación.

Si la entidad del sensor seleccionado no existe inicialmente y aparece después con una lectura válida, esa primera lectura cuenta como recuperación e inicia toda la espera de estabilidad. Lo mismo ocurre cuando se recrea un sensor eliminado. Es una transición del sensor posterior al inicio, no una acción estacional causada por el propio evento de inicio.

La validación del sensor se ejecuta por separado de la espera estacional. Una entidad ausente, `unknown`, `unavailable`, un valor no finito o no numérico, o una unidad no admitida crean inmediatamente una notificación persistente propia de la automatización en el idioma seleccionado. El aviso identifica la automatización y el sensor, y explica que las acciones estacionales están suspendidas. La recuperación descarta el aviso del sensor; recuperarse a un estado numérico válido inicia una nueva espera de estabilidad, mientras que recuperarse solo de la unidad actualiza únicamente el diagnóstico. La configuración no válida utiliza una notificación independiente.

Por ejemplo, si un sensor deja de estar disponible a las 09:00, el aviso aparece inmediatamente, no a las 09:30. Si se recupera a 25 °C a las 09:10, las acciones de entretiempo pueden ejecutarse a las 09:40 si el valor permanece sin cambios.

<a id="safety-and-precedence"></a>

## Seguridad y prioridades

Seleccionar un Modo o Perfil de Velair utiliza sus políticas de bloques. **Solo temperatura** actualiza el objetivo sin solicitar un cambio de modo HVAC; utiliza bloques explícitos **Calor** o **Frío** cuando seleccionar una estación deba poner en marcha el equipo. La política no suprime las acciones HVAC directas configuradas en el blueprint.

Mientras el sensor no sea válido, el blueprint no realiza ninguna nueva selección estacional; no apaga automáticamente los dispositivos. El Modo seleccionado anteriormente y su horario permanecen activos. Atiende la notificación si ese comportamiento no es adecuado para tu hogar.

Las acciones configuradas utilizan la semántica y las trazas normales de Home Assistant. Un error de acción no revierte las acciones anteriores. El blueprint no puede verificar de forma genérica que una acción arbitraria haya seleccionado la rutina prevista o llegado a un dispositivo físico.

Una nueva lectura estable puede sustituir un Modo Ausente seleccionado manualmente. Coordina las automatizaciones estacionales y de presencia para evitar que seleccionen Modos en conflicto. Por ejemplo, un script del hogar puede elegir un Modo Ausente cuando no hay nadie en casa y seleccionar el Modo estacional de casa ocupada solo cuando lo permita la presencia.

Sigue aplicándose el comportamiento existente de Modos y Perfiles de Velair, incluida la prioridad de las pausas y la cancelación de Refuerzos en las zonas afectadas. El Preacondicionamiento vuelve a calcularse a partir del horario efectivo seleccionado por la acción; no puede anticipar una selección estacional antes de que se produzca.

<a id="limitations"></a>

## Limitaciones

- La estabilidad se refiere al valor del sensor, no solo a su clasificación como invierno, entretiempo o verano. Los sensores que cambian con frecuencia pueden posponer indefinidamente la ejecución.
- No hay acción estacional automática al iniciar, horario diario, sondeo periódico, temporizador pendiente guardado, permiso adicional de 24 °C ni apagado retardado.
- Las notificaciones no detectan un sensor que deje de actualizarse silenciosamente mientras conserve un número válido. Si hace falta, la supervisión de la vigencia de los datos de origen debe proporcionarse por separado.
- No hay histéresis; el retardo de estabilidad filtra los cambios. Un nuevo valor estable de la misma clasificación también ejecuta su rama.
- La ejecución paralela tiene un límite. Las secuencias largas de acciones del usuario pueden ocupar plazas; mantén las acciones breves o delega el trabajo en scripts.
- Una lectura posterior no cancela una secuencia que ya haya comenzado. Las comprobaciones protegen su inicio, no cada acción definida por el usuario.
- Renombrar la automatización puede dejar su antigua notificación de diagnóstico pendiente de descarte manual. Las opciones de Modo renombradas o eliminadas deben actualizarse en las acciones configuradas.

<a id="troubleshooting"></a>

## Resolución de problemas

- Si no se ejecuta nada, comprueba que el valor haya cambiado realmente y permanezca sin cambios durante todo el retardo. Iniciar o recargar Home Assistant no inicia una selección estacional.
- Si aparece un aviso, revisa el sensor indicado, su estado numérico y `unit_of_measurement`. Nunca se adivinan unidades desconocidas.
- Si un temporizador nunca termina, revisa el historial del sensor y reduce el retardo positivo o utiliza un sensor de máxima diaria.
- Si se ejecuta la rama incorrecta, verifica la unidad elegida para los umbrales y ambos umbrales numéricos.
- Si el entretiempo deja los equipos encendidos, configura un Modo que realmente pause y apague; una lista de acciones vacía no es una orden de apagado.
- Si no se selecciona un Modo, prueba su acción manualmente y revisa la traza de la automatización. Selecciona el nombre actual de la opción en el editor de Home Assistant.
- Si una URL de importación no está disponible antes de la publicación, utiliza el archivo YAML de la copia local para probar. Los enlaces públicos funcionan cuando el archivo está publicado en `main`.

<a id="updating-and-customizing"></a>

## Actualización y personalización

Importa el blueprint de forma explícita; instalar o actualizar Velair mediante HACS no lo instala. Vuelve a importar la misma URL de `main`, que se actualiza continuamente, para obtener actualizaciones compatibles. La versión 1 conserva los nombres de las entradas; las entradas nuevas compatibles reciben valores predeterminados. Los cambios incompatibles utilizan un nombre de archivo nuevo y una versión principal nueva.

Home Assistant es el responsable de la automatización resultante. Velair no migra las automatizaciones ni `.storage`. Utiliza **Tomar el control** para una lógica diferente, teniendo en cuenta que la automatización independiente deja de recibir actualizaciones del blueprint. Consulta el [catálogo de blueprints](../blueprints.es.md) para las reglas comunes de distribución y actualización.
