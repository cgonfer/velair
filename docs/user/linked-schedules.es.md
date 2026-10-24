<a id="block-presets-and-linked-templates"></a>

# Presets de bloques y plantillas vinculadas
<!-- velair-docs:start -->
Traducciones: [Original en inglés](linked-schedules.md) · [Español](linked-schedules.es.md) · [Français](linked-schedules.fr.md) · [Deutsch](linked-schedules.de.md) · [Italiano](linked-schedules.it.md) · [Nederlands](linked-schedules.nl.md) · [Polski](linked-schedules.pl.md) · [Português (Brasil)](linked-schedules.pt-br.md) · [Português (Portugal)](linked-schedules.pt-pt.md) · [Русский](linked-schedules.ru.md) · [Estado de las traducciones](../translation-status.md)

<details>
<summary>Estado de esta traducción</summary>

| Dato | Estado |
| --- | --- |
| Versión de referencia | 1.9.0-beta.5 |
| Última sincronización | 2026-10-24 |
| Revisión lingüística | Traducción asistida por IA |
| Respecto al original | Sin cambios pendientes respecto al original inglés. |

</details>

---
<!-- velair-docs:end -->

Velair puede reutilizar una configuración climática mediante un **preset de bloque** y vincular un día a una plantilla diaria. Elige **Solo horarios** para compartir horas con ajustes climáticos independientes, u **Horarios y ajustes** para seguir la plantilla completa. Predeterminado y los Perfiles admiten ambas opciones. Los bloques de una plantilla pueden utilizar ajustes manuales o presets de Velair.

Empieza por los [Ejemplos prácticos](linked-schedule-examples.es.md) para la calefacción compartida, los Perfiles estacionales, las copias independientes, los cambios de tipo de vínculo y las modificaciones incompatibles.

<a id="block-presets"></a>

## Presets de bloques

Un preset de bloque de Velair tiene un nombre y la misma configuración climática que un bloque del horario, sin su hora de inicio. Puede establecer una temperatura o intervalo nativo con opciones admitidas, seleccionar solo un modo HVAC, aplicar solo opciones climáticas o apagar el equipo. Un preset de Velair es diferente de `preset_mode` del dispositivo, que puede ser una de sus opciones configuradas.

Los presets pertenecen a una biblioteca compartida. Cada destino se comprueba frente a su termostato y, cuando procede, su controlador externo de horarios. Una opción omitida no se envía; omitir un ajuste de ventilador no restablece el ventilador del termostato.

Gestiona la biblioteca compartida en **Plantillas → Presets climáticos**. El selector de bibliotecas explica tanto las plantillas diarias como los presets climáticos compartidos. Utiliza el botón de añadir del encabezado de la lista para crear un preset.
Una biblioteca vacía conserva la misma disposición de lista y detalle.
Selecciona un preset existente para consultarlo; los cambios sin guardar solo se muestran después de cambiar su nombre o ajustes climáticos. La comprobación opcional de compatibilidad no marca el preset como editado. Los usos se muestran como información de solo lectura. El editor no requiere un termostato: elige ajustes de calefacción o refrigeración y opciones del dispositivo. Los campos de temperatura siguen los formatos configurados en los equipos gestionados que ofrecen ese modo. Si existen ambos formatos, la primera acción de **Ajustes adicionales** alterna entre una temperatura y dos consignas. Si todos los destinos coinciden, solo se ofrece ese formato; capacidades desconocidas o ningún destino mantienen disponible la elección. Calor/Frío propone dos consignas, pero permite una si los destinos la admiten. Mantener y Solo temperatura consideran todos los modos efectivos posibles. Consulta los [ajustes de formato de temperatura](usage.es.md#target-format-by-climate-and-mode). Una comprobación opcional con un termostato ofrece una vista previa de compatibilidad sin cambiar los valores compartidos. El backend valida todos los usos reales antes de guardar.

Guarda un preset con el icono situado junto a su nombre. Editarlo conserva su posición en la biblioteca, incluso después de recargar; los presets nuevos se añaden al final. Los campos de temperatura aceptan punto o coma decimal (por ejemplo, `21.5` o `21,5`), incluidos ambos límites de un intervalo nativo. El editor conserva lo que escribes mientras introduces datos y envía valores numéricos al previsualizar o guardar. La comprobación opcional de compatibilidad muestra los ajustes efectivos de un termostato seleccionado, con un resultado independiente de éxito o error. Comprobar la compatibilidad no guarda el preset ni cambia su estado de cambios sin guardar.

Las referencias a presets en plantillas aparecen separadas de las referencias directas en Predeterminado y Perfiles. Los indicadores de uso cuentan las referencias directas, incluidas las de plantillas sin días vinculados. Los termostatos que heredan un preset mediante una plantilla completa se muestran como destinos afectados adicionales, sin volver a contar la misma referencia de plantilla. Los usos de dispositivos se agrupan por termostato, con una fila separada para Predeterminado y cada Perfil.

La lista muestra un icono de vínculo junto a cada recuento de usos. Sitúa el puntero sobre el botón de eliminar desactivado para ver por qué no puede eliminarse un preset en uso; desvincula primero sus bloques. El indicador de usos de cada preset ocupa su propia última fila, debajo del resumen de configuración.

Elige un preset en un bloque del horario para mantener una referencia activa a él. Editar el preset actualiza todas las referencias. El bloque no puede contener también ajustes climáticos locales. Desvincular un preset conserva su configuración efectiva como ajustes manuales y detiene las futuras actualizaciones de ese preset para el bloque.

Abre **Ajustes adicionales** de un bloque para elegir un **Preset de Velair**. Es distinto de **Preset del dispositivo**, la opción nativa `preset_mode` del termostato. El bloque conserva sus columnas habituales de hora, modo, objetivo, ajustes y eliminación. Los ajustes climáticos vinculados aparecen en sus controles habituales y son de solo lectura; la hora sigue siendo editable salvo que el día también tenga horas vinculadas.

Una línea debajo del bloque identifica el preset vinculado y sus ajustes adicionales. El indicador de ajustes cuenta uno por el vínculo al preset de Velair más cada opción del dispositivo configurada, excluyendo la hora, el modo HVAC y la temperatura objetivo. Los valores y adaptaciones de compatibilidad proceden del backend; las vistas previas en carga o fallidas no sustituyen la referencia guardada por ajustes manuales. Mover la hora de inicio de un bloque mantiene visibles sus ajustes resueltos de preset; cambiar la hora no requiere otra vista previa del preset.

En Ajustes adicionales, elige otro preset de Velair o selecciona **Sin preset de Velair** para desvincularlo conservando sus ajustes efectivos para editarlos manualmente. Gestiona y modifica los presets compartidos en **Plantillas → Presets climáticos**. Las opciones del dispositivo permanecen en solo lectura mientras estén vinculadas. El botón de eliminar conserva su posición habitual y permanece desactivado cuando el bloque pertenece a horas de plantilla vinculadas.

El panel muestra primero el selector de configuración, después las opciones del dispositivo y al final un único resumen **Qué envía este bloque**. El resumen incluye bloques manuales y presets de Velair resueltos, con intervalos de temperatura, acciones de solo modo, solo opciones y Apagado. También aparece cuando el termostato no tiene opciones adicionales. Mientras una vista previa de preset está pendiente o no disponible, el resumen muestra ese estado en lugar de adivinar sus órdenes.

<a id="linked-templates"></a>

## Plantillas vinculadas

<a id="apply-a-template-to-schedules"></a>

### Aplicar una plantilla a horarios

Abre **Aplicar a…** en una plantilla diaria guardada. El panel sigue **Seleccionar → Revisar → Aplicar**. Guarda primero los cambios pendientes de la plantilla; aplicar nunca guarda la plantilla compartida de forma silenciosa ni aplica una versión sin guardar.

Elige **Predeterminado** o un Perfil existente y después **Copia independiente**, **Solo horarios** u **Horarios y ajustes**. Una copia independiente no tiene enlace a la plantilla; las referencias a presets de Velair siguen activas. Los enlaces de solo horas conservan asignaciones climáticas independientes. Los enlaces completos siguen tanto las horas como los ajustes de la plantilla.

Elige una **Distribución de días** común y marca los grupos necesarios de cada termostato. Días individuales ofrece siete opciones; Entre semana / Fin de semana, dos grupos; Todos los días, toda la semana. Cambiar la distribución limpia la selección. Cambiar el destino o el tipo de aplicación conserva los grupos seleccionados, pero requiere una revisión nueva. Pulsa una cabecera de día para seleccionar esa columna en todos los termostatos visibles; vuelve a pulsarla para limpiar una columna completamente seleccionada. En teléfonos, la tabla se desplaza horizontalmente y los nombres de los termostatos permanecen visibles.

Solo los termostatos con grupos seleccionados adoptan la distribución elegida. Los días no seleccionados conservan sus bloques y enlaces. Si la nueva distribución agrupa días no seleccionados con configuraciones distintas, Revisar avisa de que conservarán **Horarios diferentes**; aceptar no iguala esos días.

Para **Solo horarios**, selecciona una base cuando un grupo de destino tenga configuraciones guardadas diferentes. Esta elección es temporal hasta Aplicar. Velair propone asignaciones climáticas de esa base: primero la hora exacta, después las anteriores de más cercana a más lejana y, por último, las posteriores. Los presets siguen siendo referencias. La revisión identifica el origen de cada propuesta y permite editar los ajustes mientras las horas de la plantilla permanecen fijas. Hay que completar las asignaciones compatibles que falten; los ajustes de la plantilla no se utilizan como alternativa silenciosa. Todos los días seleccionados de ese grupo reciben las mismas asignaciones revisadas. Una zona de Perfil sin horario propio requiere asignaciones manuales en lugar de tomar prestados los ajustes Predeterminados.

Revisar muestra los días y enlaces reemplazados, los cambios de distribución, los problemas de compatibilidad y las zonas de Perfil que pasarán a **Planificación del Perfil**. Volver regresa a la selección sin guardar. Aplicar valida y guarda toda la selección una sola vez; un destino no válido o un conflicto de revisión no aplica parcialmente las demás zonas. Un fallo de guardado conserva la configuración anterior. Revisa de nuevo después de cambiar el origen o la configuración. Cerrar con cambios pendientes de revisión utiliza la protección habitual para descartar cambios.

Aplicar a un Perfil guarda directamente los horarios seleccionados de ese Perfil; no lo activa, no selecciona un Modo ni modifica la selección de base/excepciones. Cambiar un horario ya efectivo puede afectar al control climático. La publicación externa y las respuestas físicas de los dispositivos conservan sus límites habituales de envío; una configuración guardada coherente no es una respuesta física simultánea.

Los vínculos de plantilla son de solo lectura y se agrupan por termostato y después por Predeterminado o Perfil, con los días de la semana vinculados enumerados juntos. **Días vinculados** cuenta un día vinculado, independientemente del número de bloques de la plantilla. La lista muestra estos recuentos de días en una última fila separada debajo del recuento de bloques de cada plantilla. Las copias independientes no se cuentan ni aparecen en esta lista. Desvincula todos los días antes de eliminar una plantilla; el botón de eliminar desactivado explica este requisito.

Las planificaciones Predeterminadas y de Perfiles pueden vincular cada día de la semana de un termostato a una plantilla diaria. Con **Solo horarios**, configura la acción climática de cada franja en su destino; los ajustes pueden ser manuales o utilizar un preset de bloque. Diferentes destinos pueden utilizar acciones distintas a la misma hora compartida.

Con **Horarios y ajustes**, la plantilla proporciona tanto las horas como los ajustes climáticos. Sus bloques pueden contener ajustes manuales o referencias activas a presets. Todos los controles del destino son de solo lectura y muestran sus valores efectivos; edita la plantilla o desvincula el día para cambiarlos. No hay modificaciones locales por bloque. Cambiar los ajustes de una plantilla afecta a sus vínculos completos, mientras que los vínculos de solo horarios conservan sus propios ajustes climáticos.

Por ejemplo, una plantilla Día laborable empieza a las 07:00 y las 23:00. Predeterminado puede asignar su preset habitual de confort; un Perfil Invierno, presets de calefacción; y un Perfil Verano, refrigeración y Apagado. Mover las 07:00 a las 07:30 actualiza los tres sin intercambiar sus configuraciones.

Las horas vinculadas se editan en la plantilla, no arrastrando la línea temporal de un destino. Cambiar las temperaturas o modos de la plantilla no cambia sus destinos de solo horarios. Una semana puede mezclar días independientes y ambos tipos de vínculo.

El selector **Origen de la programación** elige una programación independiente o una plantilla. Para una plantilla, elige **Solo horarios** u **Horarios y ajustes**. El icono de información explica las opciones. Cambiar de solo horarios a vínculo completo pide confirmación antes de sustituir las asignaciones climáticas del día. Cambiar de completo a solo horarios conserva los ajustes actuales de la plantilla, incluidas las referencias a presets, como asignaciones independientes. **Desvincular** conserva las horas y configuraciones actuales del borrador, incluidos los presets. Los ajustes manuales pasan a ser los valores efectivos adaptados por el backend para ese termostato; por ejemplo, un objetivo compartido de 18.3 °C pasa a 18.5 °C en un dispositivo con incrementos de 0.5 °C. Las referencias a presets siguen activas y las definiciones compartidas no cambian. Sitúa el puntero, toca o enfoca un control bloqueado para ver cómo modificar su configuración compartida. Predeterminado y Perfiles utilizan los mismos controles de ayuda.

Cambiar el selector Origen de la programación pide confirmación antes de sustituir el borrador del día, incluso si sus ajustes están incompletos. Los ajustes de horas exactamente coincidentes se conservan; las horas nuevas requieren sus propias asignaciones. Cancelar conserva la selección y el borrador anteriores. Los cambios solo se aplican después de guardar.

Elegir **Programación propia** pide confirmación antes de descartar los cambios de ese día y restaura su horario guardado en el mismo origen: Predeterminado o el Perfil seleccionado. Si el día guardado tiene horas vinculadas, esas horas y asignaciones guardadas se convierten en un borrador independiente, conservando las referencias a presets. Esto no recupera un horario manual histórico. Los demás días se conservan.

**Desvincular** es diferente: conserva las horas y ajustes actuales del borrador, incluidos los cambios desde el último guardado.

<a id="copy-or-link"></a>

## Copiar o vincular

- **Copiar bloques** copia las horas y ajustes climáticos de una plantilla, conservando las referencias a presets y adaptando los ajustes manuales al destino. El resultado no sigue la plantilla.
- **Vincular horarios** mantiene las horas conectadas a la plantilla y utiliza ajustes climáticos separados en cada destino.
- **Vincular configuración completa** sigue las horas y ajustes climáticos de la plantilla, incluidos sus presets activos, sin modificaciones locales.
- Clonar un día del horario copia su configuración, incluido su tipo de vínculo con la plantilla, las asignaciones de solo horarios y las referencias a presets. Un origen vinculado crea otro día vinculado; uno independiente crea otro día independiente. Se conservan los vínculos de los días de destino fuera de la selección de clonación.
- Guardar un día como plantilla conserva sus ajustes manuales efectivos y referencias a presets. No cambia la plantilla original ni los presets compartidos.
- Vaciar un día elimina sus bloques locales y vínculo de plantilla sin cambiar la plantilla ni otros destinos.

Clonar a otro termostato comprueba la configuración copiada frente a ese destino. Los ajustes compartidos incompatibles rechazan la clonación en lugar de retirar el vínculo o sustituirlos por ajustes manuales. Siguen aplicándose los ajustes existentes de incremento por dispositivo y adaptación de opciones. En Predeterminado, los destinos seleccionados se guardan juntos; un destino que falle deja intactos todos los destinos de la clonación. Los cambios pendientes del día de origen se guardan primero, como en las demás acciones de clonación de Predeterminado. La clonación de un Perfil modifica su borrador y valida el Perfil propuesto; guardar sigue confirmando el Perfil completo.

Para crear un día independiente a partir de uno vinculado, **Desvincúlalo** después de clonar y guarda. **Copiar bloques** desde la biblioteca de plantillas sigue creando una copia independiente.

<a id="shared-edits"></a>

## Ediciones compartidas

Editar una plantilla conserva su posición en la biblioteca, incluso después de recargar.

Añadir una franja a una plantilla propone una configuración para cada día vinculado de solo horarios, incluidos los Perfiles inactivos y las planificaciones Predeterminadas ocultas por un Perfil activo. Velair prueba primero los ajustes climáticos de la nueva franja. Si son incompatibles, prueba los bloques guardados anteriormente de ese destino: una coincidencia exacta de hora, los bloques anteriores del más cercano al más lejano y después los posteriores del más cercano al más lejano. Se copia la primera configuración compatible. La referencia a un preset de Velair del bloque de origen permanece vinculada a ese preset.

Los bloques de origen pertenecen al mismo destino y día de la semana y utilizan sus horas anteriores a la edición. Un bloque que se esté moviendo o retirando aún puede proporcionar sus ajustes guardados; otro bloque recién añadido no puede. Los ajustes copiados son independientes de los ajustes climáticos de la plantilla: solo las horas permanecen vinculadas. Si la nueva franja de plantilla utiliza un preset, una propuesta compatible conserva esa referencia.

Los vínculos completos reciben la nueva franja de plantilla sin cambios, sin selección de un bloque de origen. Si sus ajustes son incompatibles con cualquier destino completo, se rechaza todo el guardado. Esto incluye Perfiles inactivos y planificaciones Predeterminadas ocultas.

Revisa las propuestas en **Días vinculados**, agrupadas por termostato y Predeterminado o Perfil, con el tipo de vínculo identificado. Los vínculos completos muestran ajustes efectivos y errores sin editor de asignaciones. Las asignaciones alternativas indican su origen. Si no existe ninguna configuración compatible, completa allí la nueva franja con ajustes manuales o un preset de Velair. También deben resolverse antes de guardar los errores que afecten al horario completo, como la cuadrícula de horas o el límite de cambios de un controlador externo.

El control normal de guardado de la plantilla confirma juntos la plantilla y todas las asignaciones, sin panel de confirmación independiente. Las modificaciones incompletas o incompatibles siguen siendo borradores; los horarios guardados continúan ejecutándose. Mover una franja existente conserva sus ajustes de destino y retirarla elimina sus asignaciones en el mismo guardado.

Velair impide eliminar un preset o plantilla mientras se utilice. Un preset referenciado por una plantilla sin uso sigue estando en uso. Sustituye o desvincula primero sus usos. Los cambios en conflicto requieren actualizar la configuración; no deben actualizar parcialmente los destinos vinculados.

Los cambios en un objetivo automático activo se aplican tras guardar. Las pausas, el ajuste manual y el Refuerzo mantienen su prioridad. Una edición de Predeterminado oculta por el horario propio de un Perfil no sustituye ese Perfil; volver a Predeterminado utiliza la última configuración Predeterminada. Los controladores externos reciben programaciones semanales completas, no referencias, y los fallos no habilitan la ejecución local.

<a id="seasonal-automations"></a>

## Automatizaciones estacionales

Utiliza [`velair.update_block_preset`](preset-automations.es.md) para actualizar un preset compartido desde una automatización. Las actualizaciones parciales conservan los demás campos; una sustitución explícita puede cambiar la acción. Las actualizaciones son persistentes y afectan a todas las referencias, con la validación y las prioridades normales de ejecución. La guía incluye ejemplos de temperatura exterior, intervalo nativo, opciones del dispositivo y apagado/restauración.

Home Assistant sigue decidiendo cuándo seleccionar un Perfil o Modo. Reutilizar horas de plantilla y presets evita duplicar la configuración; no añade reglas de temperatura exterior ni sondeo periódico a Velair. La lógica de ventanas debe utilizar pausas de zona con propietarios independientes. Un preset no añade una fecha de regreso con anticipación ni prolonga automáticamente un periodo de refrigeración programado.

<a id="backups-and-compatibility"></a>

## Copias de seguridad y compatibilidad

El modelo portátil 16 conserva los presets, las identidades de las franjas de plantilla y ambos tipos de vínculo. Las exportaciones incluyen las plantillas necesarias y sus presets. Las importaciones se comprueban frente a toda la configuración resultante; las copias de seguridad existentes sin vínculos siguen siendo utilizables. Los vínculos existentes sin tipo siguen siendo de solo horarios. Los horarios existentes no se vinculan automáticamente al actualizar.

Las temperaturas conservan la unidad declarada en Velair y participan en el proceso existente de migración de unidades. Un preset compartido se adapta por destino sin reescribir su valor para ajustarse al incremento de temperatura de un solo termostato.

Las líneas temporales de programación muestran la temperatura o intervalo efectivo devuelto por el backend. Un icono de vínculo identifica un preset de Velair; un icono de copia junto a la hora identifica las horas vinculadas a una plantilla. La información emergente nativa del bloque incluye su acción, modo, opciones del dispositivo y nombres de recursos compartidos. Los ajustes de preset pendientes o no disponibles se muestran explícitamente. Los bloques heredados de un día anterior describen la configuración y recursos de su día de origen.

Los intervalos muy breves dan prioridad a la hora y el objetivo frente a los iconos de origen y los ajustes adicionales. Sus detalles conservan los valores completos y nombres de recursos sin cambiar la duración del intervalo.
