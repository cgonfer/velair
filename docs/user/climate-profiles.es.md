<a id="climate-profiles"></a>

# Perfiles climáticos
<!-- velair-docs:start -->
Traducciones: [Original en inglés](climate-profiles.md) · [Español](climate-profiles.es.md) · [Français](climate-profiles.fr.md) · [Deutsch](climate-profiles.de.md) · [Italiano](climate-profiles.it.md) · [Nederlands](climate-profiles.nl.md) · [Polski](climate-profiles.pl.md) · [Português (Brasil)](climate-profiles.pt-br.md) · [Português (Portugal)](climate-profiles.pt-pt.md) · [Русский](climate-profiles.ru.md) · [Estado de las traducciones](../translation-status.md)

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

Los perfiles climáticos permiten a Velair cambiar varias zonas climáticas entre planes semanales coordinados sin sustituir sus horarios predeterminados. Home Assistant sigue tomando las decisiones: la presencia, las ventanas, las estaciones, los selectores, los sensores u otras automatizaciones deciden cuándo cambia un perfil, mientras Velair guarda, aplica y muestra el comportamiento climático resultante.

Un **Perfil** define una rutina climática alternativa para sus zonas configuradas. Un **Modo** selecciona uno o varios Perfiles sin zonas solapadas como **base** de la vivienda. Después puedes aplicar Perfiles como **excepciones por zona**, incluso solo una parte de un Perfil de varias zonas, sin cambiar las demás estancias. Establece una base cuando deba cambiar toda la configuración; aplica excepciones para rutinas independientes.

Algunos ejemplos son En casa, Ausente, Vacaciones, Verano, Invitados o Noche. Los Perfiles también admiten instalaciones cuyos horarios de calefacción y refrigeración utilizan distintas horas de bloque, objetivos y modos HVAC.

<a id="default"></a>

## Predeterminado

`Default` es la selección incorporada y siempre significa los horarios semanales configurados en la pestaña Planificación. No es un perfil guardado, por lo que no puede renombrarse ni eliminarse.

Activar otro perfil nunca sobrescribe esos horarios. Volver a Predeterminado aplica inmediatamente el bloque predeterminado activo en ese momento.

<a id="configure-a-profile"></a>

## Configurar un Perfil

Abre **Planificación**, elige **Planificaciones de Perfiles** y utiliza el botón de añadir para crear un Perfil vacío. Selecciónalo en la lista para editar su color, icono, nombre, descripción y comportamiento de los termostatos. El espacio de trabajo muestra un termostato seleccionado cada vez para que el editor completo siga siendo utilizable en ordenador, tableta y móvil. El nombre del perfil se edita desde el encabezado, junto al lápiz. Su ID estable de automatización aparece debajo y en la lista de perfiles para copiarlo a servicios, scripts y automatizaciones sin confundirlo con el nombre editable. Los iconos usan claves de Material Design Icons como `mdi:briefcase-outline`; el editor muestra una vista previa con el color elegido, enlaza al catálogo de iconos con buscador e indica claves que no siguen `mdi:icon-name`. Las descripciones tienen un límite de 500 caracteres y se muestra el espacio restante. Velair asigna un color estable a perfiles nuevos y existentes; puede cambiarse con el selector o un valor `#RRGGBB` editable. Los valores no válidos se resaltan y no se pueden guardar. El color se incluye en las exportaciones portátiles. La selección incorporada Predeterminado conserva su color fijo.

Cada fila de Perfil mantiene sus acciones en una columna independiente a la derecha: establecer como base, aplicar como excepción de zona y eliminar. Las acciones permanecen junto al nombre en anchos reducidos en lugar de pasar debajo. Los botones tienen fondo transparente y separación del borde; los estados activos usan el icono y el color. La descripción sigue visible, con chips compactos **Base** y **Excepción** debajo para sus usos actuales. Los Perfiles sin uso no tienen chips; la acción de base permanece neutra hasta que el Perfil pertenece a la base. Un Perfil usado solo como excepción resalta su acción de capas, no la de base. Una base completamente sustituida por excepciones conserva su identidad de base. Estos estados describen la selección guardada, no si un termostato está funcionando. Seleccionar la fila abre el editor; activar o aplicar excepciones no cambia la selección de edición. Confirmar la eliminación del Perfil editado limpia ese editor.

Para cada equipo de climatización gestionado, elige un comportamiento:

- **No participa**: este Perfil no controla la zona.
- **Planificación predeterminada**: seguir utilizando el horario semanal habitual de esa zona.
- **Planificación del Perfil**: utilizar un horario semanal completo guardado en el Perfil.
- **Pausar** con **Mantener el clima sin cambios**: detener los cambios programados y dejar el equipo como está.
- **Pausar** con **Apagar el clima**: detener los cambios programados y apagar el equipo.

Cada zona con **Planificación del Perfil** también guarda su propia **Distribución de días**. Selecciona días individuales, entre semana/fin de semana o todos los días antes de elegir un día. Las siete celdas conservan sus posiciones; la distribución selecciona un día, entre semana/fin de semana o toda la semana conjuntamente. Editar el grupo seleccionado actualiza esos días en el borrador del Perfil; **Guardar Perfil** guarda todo el Perfil a la vez. Cuando los días difieren, revísalos y elige explícitamente una base antes de reemplazar sus configuraciones. Los demás días no cambian. La distribución se recuerda junto al borrador del horario al cambiar temporalmente el comportamiento de una zona. Las celdas contiguas seleccionadas se unen visualmente y la línea temporal muestra los bloques comunes. Las diferencias aparecen como alternativas visuales compactas: se agrupan los días con configuraciones idénticas, con las barras compactas de solo lectura de Overview y etiquetas de objetivo/modo. No hay una lista permanente de bloques debajo; el icono de información abre todas las horas y ajustes al pasar el ratón, enfocar con teclado o tocar, sin seleccionar la base. Pulsa una alternativa para elegir una única base, identificada por su fondo y borde. Las alternativas siguen visibles para cambiar de base antes de guardar. En **Todos los días** y **Entre semana / Fin de semana**, selecciona el horario y utiliza **Guardar Perfil** antes de que aparezca el editor de bloques común, sin confirmación adicional de reemplazo. El grupo seleccionado contiene siete días, cinco días laborables o dos de fin de semana; los demás mantienen sus horarios. Un fallo al guardar conserva la alternativa seleccionada. Después, los cambios de los bloques comunes pueden guardarse con el Perfil como siempre. Las flechas, Espacio e Intro permiten seleccionar con teclado. Un grupo mixto necesita una base seleccionada para habilitar **Guardar Perfil**. Consulta los resúmenes junto a Guardar con cada origen, zona y días de destino elegidos. Guardar perfil también incluye los demás cambios pendientes del Perfil. Las alternativas visualmente iguales identifican las distintas dependencias de plantillas o presets con etiquetas compactas. Las vacías muestran **Sin bloques propios**; su información explica que aplicarlas elimina los bloques propios y que un día vacío no es una orden de apagado. Consulta [Distribuciones de días y edición de varios días](usage.es.md#create-a-daily-schedule) para la edición agrupada, los días mixtos y la portabilidad.

Planificación predeterminada controla explícitamente la zona, también para validar solapamientos. Una zona que no participa hereda la base, o Predeterminado si ningún Perfil base la incluye. Las plantillas pueden copiarse como bloques independientes; también puede enlazarse un día de Predeterminado o de un Perfil solo a las horas de una plantilla y conservar sus ajustes climáticos, o seguir la plantilla completa con todos los controles de solo lectura. Las plantillas y bloques independientes pueden referenciar presets compartidos de Velair. Consulta [Presets de bloques y plantillas vinculadas](linked-schedules.es.md) para las reglas de propagación, desvinculación, compatibilidad y edición compartida, y [el ejemplo Invierno/Verano](linked-schedule-examples.es.md#2-winter-and-summer-with-one-set-of-times) para compartir horas con ajustes distintos. Clonar un día conserva su tipo de enlace con la plantilla, las asignaciones de solo horas y las referencias a presets. Clonar a otro termostato valida el Perfil propuesto antes de aplicar el borrador; los demás días de destino conservan sus enlaces. Utiliza Desvincular después de clonar si el nuevo día debe ser independiente de la plantilla.

Para una zona delegada a un controlador externo, los Perfiles y Modos seleccionan la semana completa efectiva que publica Velair en lugar de provocar acciones directas `climate.*`. **Planificación predeterminada** publica la semana habitual y **Planificación del Perfil**, la semana del Perfil. El comportamiento **Pausar** no está disponible para una zona gestionada externamente. El editor de Perfiles aplica las capacidades del controlador como validación adicional; un fallo de publicación no revierte la selección guardada de Perfil o Modo ni afecta a las zonas ejecutadas localmente. Consulta [Ejecución externa de horarios](external-systems.es.md) para los límites actuales del controlador y la semántica de publicación.

Desde un día editado de la planificación de un Perfil, **Guardar como plantilla** solo guarda una plantilla reutilizable mediante el backend y deja intacto el borrador sin guardar del Perfil. Para reutilizar la selección en otros equipos gestionados, selecciónalos en el panel de clonado **Otros termostatos** y pulsa **Clonar**. Su etiqueta sigue la distribución seleccionada: un día, lunes–viernes, sábado–domingo o Todos los días. La confirmación resume los equipos seleccionados, identifica las zonas Predeterminado o Pausa que pasarán a **Planificación del Perfil** y enumera los días elegidos. Clonar reemplaza solo esos días de la semana correspondientes, conserva los demás días recordados y la distribución del destino, y sigue formando parte del borrador del Perfil. El clonado de un día a otro solo está disponible con **Días individuales**. Los editores agrupados omiten ese panel y el acceso directo para cambiar de distribución; utiliza el selector habitual **Distribución de días**. Los editores de Predeterminado y Perfil usan el mismo ámbito de grupo seleccionado para copiar a otros termostatos. Velair valida tipo de objetivo, modo HVAC, límites y paso de temperatura para cada equipo seleccionado antes de cambiar el borrador. Retira los controles opcionales que cada destino no admite. Si un bloque solo de opciones se queda sin controles compatibles, o un objetivo o modo es incompatible, no se cambia nada del borrador. Los días clonados solo se guardan al guardar el Perfil.

Cada día del perfil utiliza la misma línea temporal editable que los horarios predeterminados y las plantillas, con acciones de arrastrar y redimensionar para ajustar las horas de los bloques. Los bloques tienen una hora de inicio, pero no una hora de fin independiente, por lo que el último bloque continúa tras la medianoche y durante los días vacíos hasta que comienza otro. La línea temporal representa la parte heredada del día mediante un segmento diferenciado no editable e identifica el día de la semana donde ese bloque está realmente configurado.
Mientras un Perfil permanece abierto para editarlo, cambiar temporalmente una zona de **Planificación del Perfil** a **Planificación predeterminada** o **Pausar** conserva su horario semanal en el borrador. Volver a seleccionar **Planificación del Perfil** restaura esos bloques no guardados. Guardar el Perfil con Predeterminado o Pausa sigue almacenando solo ese comportamiento seleccionado; el horario oculto del borrador no se guarda. El selector de termostatos muestra nombres descriptivos y el editor activo también muestra el ID de entidad. Los metadatos y horarios del Perfil siguen guardándose juntos como un único Perfil de forma atómica; cambiar el termostato seleccionado no guarda un borrador parcial.

Varios Perfiles pueden formar una base cuando un Modo los coordina. Sus zonas configuradas no deben solaparse. Las excepciones pueden sustituir zonas individuales de esa base: cada equipo gestionado sigue teniendo exactamente una rutina efectiva. No se mezclan bloques de horarios ni existe una pila de prioridad de excepciones anteriores.

<a id="worked-example-an-away-mode"></a>

## Ejemplo completo: un Modo Ausente

Supongamos que los equipos de las zonas de estar y dormitorios necesitan comportamientos diferentes cuando no hay nadie en casa:

1. Crea un Perfil llamado **Away · Living areas**. Asigna al salón y la cocina horarios alternativos con objetivos adecuados a la instalación, tanto si calienta como si refrigera o admite ambas funciones.
2. Crea un Perfil llamado **Away · Bedrooms**. Configura las zonas de dormitorios con otro horario alternativo, **Pausar** o **Pausar y apagar**.
3. Deja las zonas que no deban cambiar fuera de ambos Perfiles. Continuarán utilizando sus horarios Predeterminados.
4. Abre **Modos**, elige **Nuevo modo**, llámalo **Away**, selecciona ambos Perfiles y guarda.
5. En **Configuración activa**, elige **Cambiar** y después **Away**. Velair aplica ambos Perfiles como una única selección atómica.

Esta configuración es válida porque ambos Perfiles configuran zonas diferentes. Si los dos configuraran el mismo equipo, Velair rechazaría el Modo y pediría eliminar el solapamiento.

El mismo Modo puede seleccionarse desde una automatización de Home Assistant:

```yaml
alias: Use Away climate mode
triggers:
  - trigger: state
    entity_id: person.resident
    to: "not_home"
actions:
  - action: select.select_option
    target:
      entity_id: select.velair_mode
    data:
      option: Away
```

Otra automatización puede restaurar el horario habitual de todas las zonas:

```yaml
alias: Restore default climate schedules
triggers:
  - trigger: state
    entity_id: person.resident
    to: "home"
actions:
  - action: select.select_option
    target:
      entity_id: select.velair_mode
    data:
      option: Default
```

Sustituye la entidad de persona y los nombres visibles de los Modos por los utilizados en tu instalación de Home Assistant. Si renombras un Modo, actualiza las automatizaciones que seleccionen su opción visible.

<a id="activate-a-profile"></a>

## Activar un Perfil

Utiliza el botón de reproducción de una fila de Perfil en **Planificación > Planificaciones de Perfiles** para activarlo directamente, o la tarjeta compartida **Configuración activa** de Overview o de la parte superior de **Modos**. Separa la **Base** de las **Excepciones** e identifica si la base procede de un Modo, un Perfil, varios Perfiles o Predeterminado. Selecciona **Cambiar** para elegir un Modo o utiliza el grupo independiente **Perfiles**. Seleccionar una fila de Perfil establece ese Perfil como base completa; el icono compacto de capas junto a él aplica solo sus zonas configuradas como excepciones. Elegir directamente un Perfil reemplaza el conjunto activo por ese Perfil y cambia el Modo a **Manual**, mientras que **Predeterminado** significa que no hay ningún Perfil alternativo activo. Los Perfiles también pueden activarse desde su fila, Configuración activa o la acción `velair.activate_profile`. Velair aplica el bloque activo en ese momento en lugar de esperar al siguiente cambio programado. Esto incluye el último bloque de un día anterior cuando aún no ha comenzado ningún bloque nuevo en el día actual.

La activación directa nunca añade un Perfil al conjunto existente, aunque sus zonas no se solaparan. Las zonas controladas por el Modo o conjunto de Perfiles anterior que no estén incluidas en el nuevo Perfil vuelven inmediatamente a sus horarios Predeterminados; no conservan la configuración anterior. Crea un Modo que relacione todos los Perfiles necesarios sin solapamiento cuando deban activarse juntos.

La activación cancela los Refuerzos activos en las zonas cuyo comportamiento efectivo de perfil cambia. Una pausa global o por zona existente mantiene el control; Velair registra el nuevo perfil y lo aplica cuando se reanuda el programador o la zona.

Resumen utiliza el horario efectivo de cada zona en la línea temporal de hoy y los próximos eventos. Las zonas modificadas por el perfil activo muestran una etiqueta compacta de Perfil con su color, icono y nombre, mientras que el estado temporal de Refuerzo o Pausa sigue predominando visualmente hasta que termina. Las confirmaciones de guardado, activación y eliminación de Perfiles utilizan la notificación temporal estándar de Velair, con botón de descarte y barra de cuenta atrás.

Los cambios de Modo y activaciones de Perfiles también muestran una franja global de operación mientras Velair procesa las zonas afectadas. Permanece visible al cambiar de pestaña del panel. En Lovelace, la franja solo aparece en la tarjeta Configuración activa, donde se realizan esas activaciones. El contador indica las zonas que Velair ha terminado de procesar, incluidas aquellas cuya pausa o control temporal actual hace innecesaria una orden climática; no afirma que una habitación física haya alcanzado ya su objetivo. El estado final distingue el éxito completo de una transición terminada con uno o varios errores de zona. Los resultados correctos desaparecen automáticamente tras un breve periodo de confirmación; los parciales y fallidos siguen disponibles hasta descartarlos, incluso al cambiar de pestaña del panel.

Las automatizaciones y scripts pueden utilizar:

```yaml
action: velair.activate_profile
data:
  profile_id: vacation
```

En el editor visual de automatizaciones de Home Assistant, añade una acción y busca **Velair: Activate climate profile**. Esta acción de la integración es distinta de las acciones de interruptor y selector que aparecen al filtrar por el dispositivo Velair. Introduce el **ID de automatización** del Perfil, mostrado debajo de su nombre en Velair.

Utiliza el servicio explícito de desactivación para volver a los horarios predeterminados:

```yaml
action: velair.deactivate_profile
```

Omitir `profile_id` en `velair.activate_profile` sigue admitiéndose por compatibilidad. Los identificadores de perfiles son estables aunque cambie su nombre visible. Una activación directa desde el panel o servicio establece el selector nativo de Modo en `Manual`, incluso si ya estaba activo el mismo perfil.

<a id="modes"></a>

## Modos

Un perfil no contiene condiciones arbitrarias. Home Assistant sigue tomando las decisiones. Velair proporciona una entidad nativa `select.velair_mode` para gestionar desde la pestaña Modos los valores utilizados por las automatizaciones sin crear otro ayudante de Home Assistant.

Siempre existen dos valores incorporados que no pueden renombrarse ni eliminarse:

- **Predeterminado** desactiva los perfiles y restaura el horario predeterminado de cada zona.
- **Manual** significa que ningún Modo personalizado controla actualmente el conjunto de Perfiles activos. La activación directa de un Perfil suele entrar en este estado. Se muestra como estado actual, pero no es una acción en el selector de Velair. Selecciona **Predeterminado** o un Modo personalizado para salir. La entidad nativa de Home Assistant conserva su opción Manual por compatibilidad; seleccionarla mantiene los Perfiles activos, pero los desvincula de su Modo personalizado.

Crea valores personalizados como Ausente, Vacaciones o En casa y relaciona cada uno con uno o varios Perfiles climáticos guardados. En **Modos**, elige **Nuevo modo**, introduce el nombre de opción que mostrará Home Assistant, selecciona uno o varios Perfiles sin zonas solapadas y guarda. Seleccionar un valor personalizado activa todo el conjunto de forma atómica. Los Perfiles del mismo Modo deben configurar zonas distintas; Velair rechaza los solapamientos en lugar de aplicar una prioridad implícita. Varios Modos sí pueden referenciar el mismo perfil. Se recortan los espacios de los extremos de los nombres, que están limitados a 255 caracteres, deben ser únicos sin distinguir mayúsculas y minúsculas y no pueden utilizar ninguno de los nombres incorporados ni los estados reservados `unknown` y `unavailable` de Home Assistant.

La pestaña Modos muestra la base seleccionada y sus excepciones por zona en una tarjeta **Configuración activa**. Su selector agrupado enumera primero Predeterminado y los Modos personalizados, con las acciones de base y excepción de Perfiles por separado. Manual sigue siendo un estado del selector nativo de Home Assistant, no el nombre de base del panel. Seleccionar un Modo activa todos sus Perfiles asociados; seleccionar directamente un Perfil reemplaza el conjunto activo por ese único Perfil y cambia el Modo a **Manual**. Las filas de Modos muestran los iconos y colores de los Perfiles asociados para distinguir Modos y Perfiles aunque compartan nombre. Las filas incorporadas incluyen una breve explicación de cuándo se aplican.

Utiliza la acción estándar de selector de Home Assistant en las automatizaciones:

```yaml
action: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Vacation
```

Los identificadores de Modos permanecen estables cuando cambian sus nombres visibles, por lo que la selección actual sobrevive a un cambio de nombre. Sin embargo, el nombre visible de la opción es el estado de la entidad de Home Assistant; deben actualizarse las automatizaciones que hagan referencia a una opción renombrada o eliminada.

Cambiar los Perfiles relacionados con el Modo seleccionado actualmente activa su nuevo conjunto como un único cambio atómico. Eliminar el Modo seleccionado conserva sus Perfiles activos y cambia el selector a **Manual**. Eliminar un Perfil también elimina los Modos relacionados con él y retira solo ese Perfil del conjunto activo; Velair vuelve a **Predeterminado** cuando el conjunto queda vacío.

<a id="a-base-with-independent-zone-exceptions"></a>

## Una base con excepciones independientes por zona

Un Perfil puede incluir varias estancias. Aplicarlo como excepción sustituye la rutina solo en las estancias configuradas explícitamente; no cambia las demás ni reescribe el Perfil. Cada estancia utiliza una rutina semanal completa, nunca una mezcla de bloques de varios Perfiles.

Por ejemplo, una base **Invierno** cubre el despacho, el salón y el dormitorio. **Teletrabajo** incluye el despacho y el salón; **Invitados** incluye el salón y la habitación de invitados:

| Cambio | Despacho | Salón | Dormitorio | Habitación de invitados |
| --- | --- | --- | --- | --- |
| Seleccionar base Invierno | Invierno | Invierno | Invierno | Predeterminado |
| Aplicar Teletrabajo | Teletrabajo | Teletrabajo | Invierno | Predeterminado |
| Aplicar Invitados después | Teletrabajo | Invitados | Invierno | Invitados |
| Devolver el salón a la base | Teletrabajo | Invierno | Invierno | Invitados |

Devolver el salón a su base no recupera Teletrabajo. Las excepciones no tienen una pila histórica. Elegir explícitamente Predeterminado es distinto: utiliza el horario habitual de la zona aunque la base incluya otra rutina para ella.

Utiliza **Aplicar como excepción** en Configuración activa o una automatización:

```yaml
action: velair.apply_profiles
data:
  profile_ids: [remote_work]
```

Una solicitud solo puede aplicar varios Perfiles si incluyen zonas distintas. Por ejemplo, `[remote_work, guests]` se rechaza por completo porque ambos incluyen el salón. Aplicar Invitados en una solicitud posterior sustituye intencionadamente la excepción de esa estancia y conserva el despacho.

Para aplicar solo una estancia de un Perfil de varias zonas:

```yaml
action: velair.set_zone_profile
data:
  entity_id: climate.office
  profile_id: remote_work
```

El Perfil debe incluir explícitamente esa estancia gestionada. Utiliza `profile_id: null` para imponer Predeterminado. Para retirar una excepción y heredar la base actual:

```yaml
action: velair.clear_profile_overrides
data:
  entity_id: [climate.office, climate.living_room]
```

Para reemplazar toda la base y retirar todas las excepciones sin crear un Modo:

```yaml
action: velair.activate_profiles
data:
  profile_ids: [winter_office, winter_bedrooms]
```

Los Perfiles base no deben solaparse. Una lista de activación vacía selecciona Predeterminado; las listas vacías de aplicación o borrado no hacen nada. Las acciones nuevas requieren sus campos: omitir un valor nunca significa «todas las estancias» ni «Predeterminado».

Configuración activa muestra **Base** y su tipo juntos sobre el nombre, en dos niveles compactos en teléfonos y cards estrechas. Los nombres largos se ajustan cuando es necesario. Una línea de cobertura muestra cuántas zonas gestionadas incluidas en la base aún la heredan. Las excepciones, incluido Predeterminado explícito o el mismo Perfil, se excluyen del recuento. Las zonas fuera de una base de Perfil utilizan Predeterminado y no se cuentan como parte de esa base. Una base Predeterminada incluye todas las zonas gestionadas. Esto describe a quién corresponde el control según la selección, no si los dispositivos están funcionando. Se distingue una base de ámbito vacío de otra totalmente sustituida por excepciones. Debajo de la cobertura de la base, **Distribución de la vivienda** es un desplegable cerrado inicialmente. Su etiqueta indica el total de la vivienda, independientemente del recuento de zonas incluidas en la base. Selecciónalo para mostrar la barra de 6 px y toda su leyenda; vuelve a seleccionarlo o pulsa Escape para contraerlos. El encabezado permanece fijo mientras el contenido crece hacia abajo, con una transición corta que respeta la preferencia de movimiento reducido. La barra representa todas las zonas gestionadas con los colores de los Perfiles. Los segmentos de excepción incluyen zonas fuera de la base, por lo que sus recuentos coinciden con la lista Excepciones. Las zonas fuera de la base sin excepción tienen un segmento neutro Predeterminado independiente. La leyenda compacta usa iconos de Perfil de 14 px, nombres y origen, con los recuentos en una columna separada alineada a la derecha. Las excepciones Predeterminadas explícitas también usan un color neutro. Las referencias de base, excepción y alternativa siguen siendo distintas aunque coincidan sus colores. La cobertura propia de la base sigue separada y aparece una sola vez. Una base de Perfil vacía puede tener una barra de vivienda con zonas Predeterminadas; sin zonas gestionadas no hay barra. Estas cifras describen la selección, no el estado físico. Los Perfiles de la base se identifican en la leyenda ampliada; las bases de Modo no repiten otra lista de componentes encima. En ordenador, la base ocupa menos ancho que las excepciones. Su icono se alinea con la parte superior del nombre y del tipo. El encabezado Excepciones usa el icono de capas para identificar el mismo concepto que las acciones de excepción de Perfil. **Excepciones** enumera cada Perfil y un botón con su recuento de zonas; las excepciones Predeterminadas explícitas tienen su propio grupo. Los nombres de las estancias quedan ocultos hasta solicitarlos. Pulsa cualquier parte de una fila de excepción para desplegar sus estancias debajo sin sustituir las demás excepciones. Vuelve a pulsarla o pulsa Escape para contraerla; abrir otro grupo cierra el anterior. La expansión usa una transición corta y respeta la preferencia de movimiento reducido. La fila seleccionada y su recuento permanecen en su sitio; los detalles crecen hacia abajo y desplazan las filas siguientes, por lo que el mismo botón permite contraerlos. Las listas largas de estancias se desplazan dentro del área desplegada en lugar de llenar Overview. Una base sin modificaciones muestra **Sin excepciones**. La base sigue visible aunque todas las estancias tengan excepciones. Configuración activa no incluye otro espacio de edición por zona; utiliza las acciones de zona documentadas para cambios específicos. El selector nativo de Modo muestra Manual mientras haya excepciones. Al borrarlas todas, restaura la etiqueta original del Modo si aún existe. Seleccionar un Modo personalizado o Predeterminado, activar un Perfil o activar una lista completa reemplaza explícitamente la base y borra las excepciones. La opción nativa Manual solo elimina la asociación de Modo de la base y conserva la base y las excepciones.

Editar un Modo base conserva sus excepciones. Renombrar o editar un Perfil mantiene las referencias activas: los horarios modificados afectan a las estancias que los usan. Añadir una estancia a un Perfil no amplía una excepción aplicada antes a otras estancias. Retira una excepción antes de editar su Perfil para eliminar la estancia referenciada. Eliminar un Perfil o importar definiciones que lo retiren elimina sus excepciones y devuelve esas estancias a la base restante o a Predeterminado.

Home Assistant sigue decidiendo la combinación de estación, presencia y rutina personal. Un Modo estacional es una selección completa, no una capa adicional sobre las excepciones de estancia. Recalcula las selecciones pertinentes tras cambiar de estación. Las acciones sobre estancias distintas se combinan de forma segura; las acciones que compiten por una misma estancia se aceptan por orden. Una selección de base completa puede reemplazarlas todas.

Todas las acciones explícitas de selección cancelan un Regreso a casa pendiente, incluso una selección repetida. Las listas vacías de aplicación/borrado no lo hacen. Cancelar Regreso a casa puede afectar a la preparación de otras partes de la vivienda. Se guarda por separado de la selección posterior: si ese guardado falla, puede mantenerse la selección anterior con Regreso a casa ya cancelado. Las solicitudes no válidas nunca lo cancelan.

Los cambios de selección se guardan juntos, pero los dispositivos pueden aplicarlos en momentos distintos o informar de fallos individuales. Las pausas y restricciones de envío existentes siguen teniendo prioridad. Un cambio solo de atribución de la selección no cancela Boost ni envía acciones climáticas duplicadas si la rutina efectiva no cambia. Las estancias ejecutadas externamente publican su semana efectiva con las restricciones existentes del proveedor. Los Perfiles no eliminan las limitaciones compartidas del equipo.

La intención completa de base y excepciones sobrevive a los reinicios. Las exportaciones portátiles contienen definiciones, no esta intención activa; importar nunca activa nuevos Perfiles.

<a id="seasonal-selection"></a>

## Selección estacional

El [blueprint de selección climática estacional](blueprints/seasonal-climate-selection.es.md) puede elegir un Modo a partir de un sensor de máxima diaria u otra temperatura tras un cambio estable. Vincula los Perfiles de invierno y verano a las horas de la misma plantilla y asígnales presets diferentes. Configura un Perfil de entretiempo con pausa y apagado si no se desea climatización. Coordina esta automatización con las reglas de presencia: otra lectura estable puede sustituir un Modo Ausente seleccionado manualmente.

<a id="interactions"></a>

## Interacciones

- Los bloques **Solo temperatura** conservan su política en Perfiles, presets reutilizables, plantillas y asignaciones de plantillas vinculadas. Activar un Perfil o Modo con ese bloque actualiza su objetivo sin solicitar un cambio de modo HVAC. No enciende un equipo apagado; la integración debe aceptar objetivos estando apagado.
- Las pausas globales y por zona tienen prioridad sobre un cambio de perfil.
- Los Boosts de las zonas afectadas se cancelan al activar un perfil.
- El Preacondicionamiento adaptativo recalcula con el horario efectivo del perfil.
- Room Assist sigue el objetivo del horario efectivo del perfil.
- Confort ambiental sigue siendo solo observación y no cambia.
- Calefacción, refrigeración, calor/frío, bloques Apagado y controles climáticos opcionales compatibles funcionan igual que en los horarios predeterminados.

<a id="restart-and-portability"></a>

## Reinicio y portabilidad

El conjunto de perfiles activos, los Modos personalizados y el identificador del modo seleccionado se guardan en el backend de Velair. Tras reiniciar Home Assistant, la entidad de selector nativa se reconstruye desde ese estado; no activa un perfil por su cuenta. El ajuste existente **Aplicar la planificación activa al arrancar** solo controla si Velair envía inmediatamente a los dispositivos climáticos el objetivo efectivo actual. Si está desactivado, Velair conserva el perfil y calcula los eventos futuros sin cambiar el estado de los dispositivos al iniciar. Si está activado, una planificación de perfil aplica su bloque actual, `Pause and turn off` apaga la zona y `Pause` la deja sin cambios. Los Refuerzos y pausas activos y una pausa global del programador conservan su prioridad habitual.

Las exportaciones portátiles V5 pueden incluir las definiciones de perfiles y Modos como secciones separadas. Nunca incluyen la intención del perfil activo o del modo seleccionado, por lo que importar no puede activar implícitamente un perfil diferente. Importar solo perfiles elimina los Modos cuyos perfiles relacionados ya no existan. Importar Modos valida todas las relaciones y rechaza zonas configuradas solapadas.

En **Ajustes > Portabilidad**, selecciona **Perfiles climáticos** y **Modos** al exportar. Al importar, revisa y selecciona ambas secciones antes de confirmar. Las definiciones seleccionadas se sobrescriben, pero nunca se importan el conjunto de Perfiles activos ni la selección de Modo.

Cada Modo se relaciona con uno o varios Perfiles con zonas configuradas sin solapamiento. Todo el conjunto se activa de forma atómica; la activación directa de un Perfil sustituye el conjunto por un único Perfil y selecciona Manual.
