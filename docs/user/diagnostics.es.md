<a id="diagnostics"></a>

# Diagnóstico
<!-- velair-docs:start -->
Traducciones: [Original en inglés](diagnostics.md) · [Español](diagnostics.es.md) · [Français](diagnostics.fr.md) · [Deutsch](diagnostics.de.md) · [Italiano](diagnostics.it.md) · [Nederlands](diagnostics.nl.md) · [Polski](diagnostics.pl.md) · [Português (Brasil)](diagnostics.pt-br.md) · [Português (Portugal)](diagnostics.pt-pt.md) · [Русский](diagnostics.ru.md) · [Estado de las traducciones](../translation-status.md)

<details>
<summary>Estado de esta traducción</summary>

| Dato | Estado |
| --- | --- |
| Versión de referencia | 1.9.0-beta.3 |
| Última sincronización | 2026-10-21 |
| Revisión lingüística | Traducción asistida por IA |
| Respecto al original | Sin cambios pendientes respecto al original inglés. |

</details>

---
<!-- velair-docs:end -->

La sección **Diagnóstico** ofrece una vista local de solo lectura de lo que Velair puede comprobar sin necesitar Home Assistant Recorder ni servicios externos.

Muestra el estado actual del programador y una franja horizontal compacta de los equipos gestionados, en el orden configurado de los termostatos. Al seleccionar un equipo se abre un único panel detallado de ancho completo debajo de la franja.
El panel muestra cada dato una sola vez, agrupado en **Estado y entrega**, **Configuración activa**, **Funciones** y **Dispositivo y sensores**. Incluye:

- disponibilidad y capacidades de HVAC/temperatura declaradas;
- problemas de configuración detectados cuando Velair tiene evidencia directa;
- Modo y Perfiles efectivos, intención calculada durante la ejecución, Refuerzos y pausas;
- último objetivo de control aceptado por Home Assistant, error de entrega y estado de los reintentos, sujetos a un límite;
- Room Assist, Preacondicionamiento adaptativo, Confort y sensores asociados explícitamente.

Las llamadas correctas a `velair.set_hvac_mode` aparecen como una orden manual aceptada que cambia únicamente el modo. Incluyen el modo HVAC seleccionado, sin inventar una temperatura.
Los fallos de validación no sustituyen la evidencia aceptada anterior, y los fallos de entrega física no publican un evento de objetivo aplicado correctamente.

Velair no deduce una causa cuando la evidencia disponible solo demuestra un síntoma, como una entidad no disponible.
La información de batería se omite salvo que Velair pueda establecer una asociación fiable; la primera versión no intenta asociar dispositivos mediante heurísticas.

Para Confort, Diagnóstico incluye la fuente guardada de cada lectura derivada activada, la entrada efectiva o entidad externa, su disponibilidad actual y códigos de problema estables para datos ausentes, desactualizados, inválidos o sin verificar. El punto de rocío, la humedad absoluta y Humidex son datos de observación: que aparezcan en un informe no significa que hayan influido en la programación o el control de climatización. Los mismos datos de las lecturas activadas se exponen en el atributo `derived_metrics` del sensor de zona **Estado ambiental**; Velair no crea entidades proxy independientes para ellas. Las lecturas actuales incluyen `freshness: reported` o `unverified`; este último permanece visible con una etiqueta informativa y puede rastrearse hasta su fuente.
Cuando la comparación exterior está activada, el mismo informe de Confort también contiene la disponibilidad de sus sensores explícitos, calidad independiente de los datos exteriores, comparación normalizada, humedad absoluta interior/exterior explícita y cualquier código de oportunidad o contrapartida. El bloque `guidance_thresholds` registra la sensibilidad efectiva de cada zona utilizada para esa conclusión, lo que ayuda a distinguir un problema del sensor de una orientación intencionadamente más estricta. Estos valores siguen siendo informativos y no indican que Velair haya abierto una ventana o cambiado el HVAC.
Diagnóstico también incluye `comfort_zone`: la geometría configurada Simple, Guiada o personalizada según la temperatura y el intervalo de humedad efectivo a la temperatura actual. Un intervalo efectivo `null` explica por qué no se clasificó una lectura actual de humedad cuando faltaba la temperatura; no se sustituye por una alternativa supuesta.

La evaluación actual incluye `range_summary`. Las entradas conservadas de `comfort_assessment_changed` también guardan `previous_range_summary` y los indicadores `range_summary_changed` y `range_status_changed`, de modo que un informe descargado puede mostrar si el evento representaba una transición del intervalo configurado u otro cambio de Confort. Estos campos contienen solo códigos semánticos estables, no el contexto bruto de los eventos de Home Assistant.

<a id="learning-evidence"></a>
## Evidencias de aprendizaje

La sección de preacondicionamiento existente separa la actividad de calefacción y refrigeración. Muestra si hay una observación en curso o Velair espera una transición adecuada y, cuando existe, la última transición de aprendizaje conservada. Los detalles desplegables contienen solo evidencias relevantes para esa decisión, como las temperaturas inicial y objetivo, la diferencia mínima de temperatura, la duración observada y la anticipación máxima configurada.

El historial de preacondicionamiento incluye inicios, interrupciones y resultados de observaciones, y transiciones reales que no permitieron iniciar una observación. Los resultados distinguen observaciones completas, parciales y no válidas. Las no válidas pueden identificar una diferencia de temperatura insuficiente, una duración demasiado corta o una duración superior al máximo configurado. Las observaciones antiguas guardadas pueden conservar el motivo menos específico de fuera de límites. Velair no les asigna retroactivamente una causa más precisa.

Los cálculos repetidos de predicciones futuras no generan entradas de aprendizaje. La última transición sigue los mismos ajustes de conservación y límite global del historial que la línea temporal. Desactivar el historial de preacondicionamiento o vaciar el historial elimina esas evidencias históricas; no detiene el aprendizaje ni borra las muestras guardadas. Tras reiniciar, no se restauran la actividad previa de ejecución ni el historial. Si no hay evidencias, Diagnóstico no inventa un motivo para los contadores que no cambian ni deduce si una caldera estaba funcionando.

<a id="preconditioning-dependency-evidence"></a>
### Evidencias de dependencia de preacondicionamiento

En una habitación con **Maestro de preacondicionamiento** configurado, consulta los detalles de dependencia junto a la información de preparación existente. Distinguen la estimación independiente de la habitación, la transición e inicio seleccionados del maestro y el inicio efectivo o el motivo por el que no puede empezar la preparación. Una orden aceptada por Home Assistant demuestra la acción de Velair, no mide el relé de la caldera. La observación de aprendizaje sigue describiendo la temperatura y el tiempo transcurrido de la propia habitación dependiente.

Cuando hay evidencias, la explicación distingue la disponibilidad en Home Assistant de una programación o un preacondicionamiento desactivados, un perfil pausado, una anulación activa, un maestro no apto o una transición inexistente. La misma explicación aparece en las tarjetas y en Diagnóstico. Un equipo no disponible aún puede tener una predicción calculada si otro sensor configurado aporta su temperatura de estancia; esa predicción no confirma que el dispositivo pueda recibir una orden ni proporcionar calefacción o refrigeración.

<a id="runtime-history-and-privacy"></a>

## Historial de ejecución y privacidad

Diagnóstico conserva como máximo 100 eventos relevantes en una línea temporal global.
La sección **Ajustes del historial** permite conservar de forma independiente la actividad de control y horarios, Room Assist, Preacondicionamiento, Confort, entrega de órdenes y eventos de disponibilidad. Los nuevos tipos de eventos de Velair que todavía no están clasificados se conservan en control y horarios en lugar de descartarse sin aviso.
Los ajustes externos y las transiciones entre control Automático y Manual también permanecen en esta categoría. Sus entradas muestran solo el modo HVAC o el objetivo de temperatura única/intervalo modificado, la política efectiva de cambios externos y cualquier motivo de caducidad o reanudación; no se conservan atributos arbitrarios del equipo ni identificadores Context de Home Assistant.
Todas las categorías están activadas por defecto. Estas opciones se guardan localmente en el backend; desactivar una categoría elimina inmediatamente sus eventos ya conservados.
**Borrar historial** elimina todos los eventos conservados sin cambiar la evidencia actual de estado, entrega o configuración.

El registro de ejecución puede filtrarse localmente sin cambiar lo que Velair conserva.
Elige cualquier combinación de la fuente del sistema Velair y equipos gestionados, o utiliza la opción general **Todos los termostatos + Velair**; después puedes reducir la lista por categoría y un intervalo inclusivo de fechas Desde/Hasta. **Limpiar filtros** restaura toda la línea temporal conservada.
Un historial vacío se muestra de forma distinta a una combinación de filtros sin coincidencias. Estos filtros son un estado temporal de la interfaz y no se guardan.

En escritorio, las columnas del registro pueden redimensionarse arrastrando sus separadores o utilizando el teclado con el foco del teclado en un separador. Las flechas cambian el tamaño en pasos pequeños; Mayús+Flecha utiliza pasos mayores; Inicio/Fin llega a los límites permitidos; y un doble clic restaura el ancho predeterminado. Los anchos son temporales y no se guardan. En móvil, la hora, el equipo, el tipo y el mensaje aparecen en cuatro filas distintas. Una fila puede desplazarse horizontalmente cuando un valor no cabe sin ajustarse a varias líneas.

Solo se guardan las opciones de categorías. El historial de eventos existe únicamente en memoria, se borra al reiniciar la integración o Home Assistant y no utiliza Recorder. Se alimenta de eventos existentes de Velair, cambios de disponibilidad y resultados de entrega, por lo que no añade sondeo continuo.

**Descargar informe** abre opciones de privacidad antes de crear un JSON adecuado para adjuntarlo a una incidencia. Los identificadores de entidades de climatización gestionadas se sustituyen por alias estables de forma predeterminada; puedes conservar los identificadores originales para inspección local. Los identificadores de Perfiles, Modos y pausas se eliminan siempre. Cerrar el panel o completar una descarga restaura la opción predeterminada más segura. La descarga estándar de diagnóstico de la entrada de configuración de Home Assistant utiliza siempre la instantánea anonimizada.
La sección de exportación del informe está oculta en pantallas de tamaño de teléfono porque las descargas no son fiables en el navegador integrado de la aplicación complementaria de Home Assistant. Abre Velair desde el navegador de una tablet o un ordenador cuando necesites descargar un informe.
Revisa cualquier informe antes de publicarlo. Los identificadores de entidades de los sensores asociados también se sustituyen; la vista local actual los mantiene visibles porque resultan útiles para comprobar la configuración.

La vista local de Diagnóstico utiliza los nombres descriptivos de los equipos de Home Assistant al filtrar, pero su panel detallado muestra deliberadamente los identificadores locales de entidades para que el usuario pueda verificar la configuración. Con la opción de privacidad predeterminada activada, los informes descargados sustituyen tanto los identificadores estructurados como los incluidos en el texto de errores conservados por alias deterministas, como `climate_unit_1` y `associated_entity_1`. Las referencias repetidas mantienen el mismo alias para conservar relaciones útiles sin revelar los identificadores locales originales. Si eliges explícitamente conservar los identificadores originales, permanecerán en el informe; los de Perfiles, Modos y pausas se siguen eliminando. Revisa cada informe antes de compartirlo.

Diagnóstico no ofrece controles del programador, reintentos, reversión ni climatización. Ajustes sigue conteniendo las acciones de configuración y mantenimiento; los detalles de capacidades y estado de los equipos ahora pertenecen a Diagnóstico.

Cada equipo gestionado también proporciona datos sobre la estabilización de las órdenes; estos datos solo existen durante la ejecución. Mientras una orden reciente de Velair se estabiliza, Diagnóstico enumera los campos de control afectados en su instantánea. Si el equipo no ha alcanzado el estado esperado dentro del plazo establecido, la siguiente instantánea actualizada marca el equipo con una advertencia `command_settling_mismatch`. Despliega esa advertencia en el panel de Diagnóstico del equipo seleccionado para comparar el valor esperado de cada campo afectado con el valor comunicado por el termostato. Las temperaturas incluyen la unidad del equipo, los modos HVAC usan sus etiquetas habituales y los valores ausentes se identifican explícitamente. Se utiliza la comparación registrada, no el horario actual ni una nueva lectura. El informe descargado también conserva el bloque `command_settling`. Es evidencia para resolver problemas: Diagnóstico no reintenta la orden, no cambia el equipo ni crea un ajuste Manual. La evidencia se borra con una orden más reciente para ese campo o al reiniciar.

<a id="automating-diagnostic-health"></a>

## Automatización del estado de diagnóstico

Velair crea una entidad **Estado de diagnóstico** con estados `ok`, `warning` y `error`. Se actualiza desde la misma instantánea del backend que esta vista y no realiza sondeo continuo. Sus atributos compactos incluyen estado del programador, recuentos de unidades, recuentos de problemas y códigos de problema estables; no se incluye el texto original de los errores ni identificadores operativos.

Utiliza un disparador de estado cuando una automatización solo necesite el estado actual agregado.
Utiliza el evento `diagnostic_issue_changed` cuando deba reaccionar a la detección o resolución de un problema mientras otros siguen activos. Consulta [Eventos de automatización](automation-events.es.md#diagnostic-issue-changed) para ver la carga del evento y ejemplos.

Cada equipo gestionado también tiene un sensor **Diagnóstico de entrega de zona**, desactivado por defecto. Expone el mismo estado de entrega durante la ejecución y el último objetivo de control aceptado utilizados por Diagnóstico, sin el texto original de los errores. Un objetivo aceptado significa que Home Assistant aceptó la secuencia de servicios correspondiente de Velair; no demuestra el estado del dispositivo ni del transporte. Room Assist puede ajustar posteriormente el objetivo enviado y expone ese contexto mediante su propio sensor. La evidencia de entrega nunca se restaura después de un reinicio y se borra tras restablecer correctamente los datos de Velair. Consulta [Sensores de control y entrega de zona](zone-sensors.es.md#zone-delivery-diagnostics) para ver el contrato completo de estados y atributos, los pasos de activación y ejemplos de automatización.
