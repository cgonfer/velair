<a id="climate-profiles"></a>

# Perfiles climáticos
<!-- velair-docs:start -->
Traducciones: [Original en inglés](climate-profiles.md) · [Español](climate-profiles.es.md) · [Français](climate-profiles.fr.md) · [Deutsch](climate-profiles.de.md) · [Italiano](climate-profiles.it.md) · [Nederlands](climate-profiles.nl.md) · [Polski](climate-profiles.pl.md) · [Português (Brasil)](climate-profiles.pt-br.md) · [Português (Portugal)](climate-profiles.pt-pt.md) · [Русский](climate-profiles.ru.md) · [Estado de las traducciones](../translation-status.md)

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

Los perfiles climáticos permiten a Velair cambiar varias zonas climáticas entre planes semanales coordinados sin sustituir sus horarios predeterminados. Home Assistant sigue tomando las decisiones: la presencia, las ventanas, las estaciones, los selectores, los sensores u otras automatizaciones deciden cuándo cambia un perfil, mientras Velair guarda, aplica y muestra el comportamiento climático resultante.

Un **Perfil** define una rutina climática alternativa para sus zonas configuradas. Un **Modo** activa juntos uno o varios Perfiles sin zonas solapadas como un único estado del hogar. Activa directamente un Perfil cuando solo necesites esa rutina; utiliza un Modo cuando varias áreas deban cambiar juntas.

Algunos ejemplos son En casa, Ausente, Vacaciones, Verano, Invitados o Noche. Los Perfiles también admiten instalaciones cuyos horarios de calefacción y refrigeración utilizan distintas horas de bloque, objetivos y modos HVAC.

<a id="default"></a>

## Predeterminado

`Default` es la selección incorporada y siempre significa los horarios semanales configurados en la pestaña Planificación. No es un perfil guardado, por lo que no puede renombrarse ni eliminarse.

Activar otro perfil nunca sobrescribe esos horarios. Volver a Predeterminado aplica inmediatamente el bloque predeterminado activo en ese momento.

<a id="configure-a-profile"></a>

## Configurar un Perfil

Abre **Planificación**, elige **Planificaciones de Perfiles** y utiliza el botón de añadir para crear un Perfil vacío. Selecciónalo en la lista para modificar su color, icono, nombre, descripción y comportamiento de los termostatos. El espacio de trabajo del Perfil muestra un solo termostato seleccionado cada vez, de modo que el editor completo siga siendo utilizable en ordenador, tableta y móvil.
El nombre del perfil se edita desde el encabezado, junto al icono de lápiz. Su ID estable de automatización aparece justo debajo del nombre y en la lista de perfiles para copiarlo a servicios, scripts y automatizaciones sin confundirlo con el nombre visible editable.
Los iconos utilizan claves de Material Design Icons, como `mdi:briefcase-outline`; el editor muestra una vista previa con el color del perfil seleccionado, enlaza al catálogo de Material Design Icons con buscador e indica las claves que no utilizan el formato esperado `mdi:icon-name`. Las descripciones están limitadas a 500 caracteres y el editor muestra cuántos quedan. Velair asigna un color estable a los perfiles nuevos y existentes; puede cambiarse en el editor mediante el selector de color o un valor editable `#RRGGBB`. Los valores no válidos se resaltan y no pueden guardarse. El color se incluye en las exportaciones portátiles. La selección incorporada Predeterminado conserva su color fijo.
Para cada equipo de climatización gestionado, elige un comportamiento:

- **Planificación predeterminada**: seguir utilizando el horario semanal habitual de esa zona.
- **Planificación del Perfil**: utilizar un horario semanal completo guardado en el Perfil.
- **Pausar** con **Mantener el clima sin cambios**: detener los cambios programados y dejar el equipo como está.
- **Pausar** con **Apagar el clima**: detener los cambios programados y apagar el equipo.

Las zonas no configuradas en un perfil continúan utilizando sus horarios predeterminados. Las plantillas pueden seguir copiándose como bloques independientes; también puede vincularse un día de Predeterminado o de un Perfil solo a las horas de una plantilla y conservar sus propios ajustes climáticos, o seguir la plantilla completa con todos los controles de solo lectura. Las plantillas y los bloques independientes pueden referenciar presets compartidos de Velair. Consulta [Presets de bloques y plantillas vinculadas](linked-schedules.es.md) para las reglas de propagación, desvinculación, compatibilidad y edición compartida, y [el ejemplo Invierno/Verano](linked-schedule-examples.es.md#2-winter-and-summer-with-one-set-of-times) para compartir horas con ajustes climáticos diferentes. Clonar un día conserva su tipo de vínculo con la plantilla, sus asignaciones de solo horarios y sus referencias a presets de bloques. Clonar a otro termostato valida el Perfil propuesto antes de aplicar el borrador; los demás días de destino conservan sus vínculos existentes. Utiliza Desvincular después de clonar si el nuevo día debe ser independiente de la plantilla.

Para una zona delegada a un controlador externo, los Perfiles y Modos seleccionan la semana completa efectiva que publica Velair en lugar de provocar acciones directas `climate.*`. **Planificación predeterminada** publica la semana habitual y **Planificación del Perfil**, la semana del Perfil. El comportamiento **Pausar** no está disponible para una zona gestionada externamente. El editor de Perfiles aplica las capacidades del controlador como validación adicional; un fallo de publicación no revierte la selección guardada de Perfil o Modo ni afecta a las zonas ejecutadas localmente. Consulta [Ejecución externa de horarios](external-systems.es.md) para los límites actuales del controlador y la semántica de publicación.

Desde un día editado de la planificación de un Perfil, **Guardar como plantilla** solo guarda una plantilla reutilizable mediante el backend y deja intacto el borrador no guardado del Perfil. Para reutilizar el día en otros equipos gestionados, selecciónalos en el panel **Clonar el día en / Otros termostatos** y elige **Clonar**. La confirmación resume los equipos seleccionados e identifica las zonas en Predeterminado o Pausa que pasarán a **Planificación del Perfil**. Clonar solo sustituye el mismo día de la semana, conserva todos los demás días recordados y sigue formando parte del borrador del Perfil. Velair valida el tipo de objetivo, modo HVAC, límites de temperatura e incremento de temperatura de cada equipo seleccionado antes de modificar el borrador. Retira los controles opcionales no admitidos por cada equipo de destino. Si un bloque de solo opciones queda sin controles admitidos, o un objetivo o modo es incompatible, no cambia ninguna parte del borrador. Los días clonados solo se guardan de forma persistente al guardar el Perfil.

Cada día del perfil utiliza la misma línea temporal editable que los horarios predeterminados y las plantillas, con acciones de arrastrar y redimensionar para ajustar las horas de los bloques. Los bloques tienen una hora de inicio, pero no una hora de fin independiente, por lo que el último bloque continúa tras la medianoche y durante los días vacíos hasta que comienza otro. La línea temporal representa la parte heredada del día mediante un segmento diferenciado no editable e identifica el día de la semana donde ese bloque está realmente configurado.
Mientras un Perfil permanece abierto para editarlo, cambiar temporalmente una zona de **Planificación del Perfil** a **Planificación predeterminada** o **Pausar** conserva su horario semanal en el borrador. Volver a seleccionar **Planificación del Perfil** restaura esos bloques no guardados. Guardar el Perfil con Predeterminado o Pausa sigue almacenando solo ese comportamiento seleccionado; el horario oculto del borrador no se guarda. El selector de termostatos muestra nombres descriptivos y el editor activo también muestra el ID de entidad. Los metadatos y horarios del Perfil siguen guardándose juntos como un único Perfil de forma atómica; cambiar el termostato seleccionado no guarda un borrador parcial.

Varios perfiles pueden estar activos juntos cuando un Modo los coordina. Sus zonas configuradas no deben solaparse: cada equipo gestionado tiene siempre como máximo un perfil controlando su comportamiento efectivo. Las zonas que no pertenecen a ningún perfil activo continúan utilizando su horario predeterminado.

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

Utiliza el botón de reproducción de una fila de Perfil en **Planificación > Planificaciones de Perfiles** para activarlo directamente, o la tarjeta compartida **Configuración activa** en Resumen o en la parte superior de **Modos**. Muestra el Modo actual y los Perfiles que aplica como una relación conjunta. Selecciona **Cambiar** para elegir un Modo o utiliza el grupo separado **Activar un Perfil manualmente**. Elegir directamente un Perfil sustituye el conjunto activo por ese Perfil y cambia el Modo a **Manual**, mientras que **Predeterminado** significa que no hay ningún Perfil alternativo activo. Los Perfiles también pueden activarse desde su fila, desde Configuración activa o mediante la acción `velair.activate_profile`. Velair aplica el bloque activo en ese momento sin esperar al siguiente cambio programado. Esto incluye el último bloque de un día anterior cuando aún no ha comenzado ningún bloque nuevo en el día actual.

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

La pestaña Modos muestra juntos el Modo activo y los Perfiles climáticos aplicados en una tarjeta **Configuración activa**. Su único selector agrupado enumera primero Predeterminado y los Modos personalizados, con la activación directa de Perfiles por separado. Manual permanece visible como estado, pero no puede seleccionarse desde este selector. Seleccionar un Modo activa todos sus Perfiles relacionados; seleccionar un Perfil directamente sustituye el conjunto activo por ese único Perfil y cambia el Modo a **Manual**. Las filas de Modos muestran los iconos y colores de los Perfiles relacionados, de modo que Modos y Perfiles sigan distinguiéndose aunque tengan el mismo nombre. Las filas incorporadas incluyen una explicación breve de cuándo se aplican.

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

<a id="seasonal-selection"></a>

## Selección estacional

El [blueprint de selección climática estacional](blueprints/seasonal-climate-selection.es.md) puede elegir un Modo a partir de un sensor de máxima diaria u otra temperatura tras un cambio estable. Vincula los Perfiles de invierno y verano a las horas de la misma plantilla y asígnales presets diferentes. Configura un Perfil de entretiempo con pausa y apagado si no se desea climatización. Coordina esta automatización con las reglas de presencia: otra lectura estable puede sustituir un Modo Ausente seleccionado manualmente.

<a id="interactions"></a>

## Interacciones

- Las pausas globales y por zona tienen prioridad sobre un cambio de perfil.
- Los Refuerzos de las zonas afectadas se cancelan al activar un perfil.
- El Preacondicionamiento adaptativo vuelve a calcularse según el horario efectivo del perfil.
- Room Assist sigue el objetivo del horario efectivo del perfil.
- El Confort ambiental sigue siendo solo de supervisión y no cambia.
- Los bloques de calefacción, refrigeración, Calor/frío y Apagado, y los controles climáticos opcionales admitidos, funcionan igual que en los horarios predeterminados.

<a id="restart-and-portability"></a>

## Reinicio y portabilidad

El conjunto de perfiles activos, los Modos personalizados y el identificador del modo seleccionado se guardan en el backend de Velair. Tras reiniciar Home Assistant, la entidad de selector nativa se reconstruye desde ese estado; no activa un perfil por su cuenta. El ajuste existente **Aplicar la planificación activa al arrancar** solo controla si Velair envía inmediatamente a los dispositivos climáticos el objetivo efectivo actual. Si está desactivado, Velair conserva el perfil y calcula los eventos futuros sin cambiar el estado de los dispositivos al iniciar. Si está activado, una planificación de perfil aplica su bloque actual, `Pause and turn off` apaga la zona y `Pause` la deja sin cambios. Los Refuerzos y pausas activos y una pausa global del programador conservan su prioridad habitual.

Las exportaciones portátiles V5 pueden incluir las definiciones de perfiles y Modos como secciones separadas. Nunca incluyen la intención del perfil activo o del modo seleccionado, por lo que importar no puede activar implícitamente un perfil diferente. Importar solo perfiles elimina los Modos cuyos perfiles relacionados ya no existan. Importar Modos valida todas las relaciones y rechaza zonas configuradas solapadas.

En **Ajustes > Portabilidad**, selecciona **Perfiles climáticos** y **Modos** al exportar. Al importar, revisa y selecciona ambas secciones antes de confirmar. Las definiciones seleccionadas se sobrescriben, pero nunca se importan el conjunto de Perfiles activos ni la selección de Modo.

Cada Modo se relaciona con uno o varios Perfiles con zonas configuradas sin solapamiento. Todo el conjunto se activa de forma atómica; la activación directa de un Perfil sustituye el conjunto por un único Perfil y selecciona Manual.
