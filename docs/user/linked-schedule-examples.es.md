<a id="practical-examples-presets-and-linked-templates"></a>

# Ejemplos prácticos: presets y plantillas vinculadas
<!-- velair-docs:start -->
Traducciones: [Original en inglés](linked-schedule-examples.md) · [Español](linked-schedule-examples.es.md) · [Français](linked-schedule-examples.fr.md) · [Deutsch](linked-schedule-examples.de.md) · [Italiano](linked-schedule-examples.it.md) · [Nederlands](linked-schedule-examples.nl.md) · [Polski](linked-schedule-examples.pl.md) · [Português (Brasil)](linked-schedule-examples.pt-br.md) · [Português (Portugal)](linked-schedule-examples.pt-pt.md) · [Русский](linked-schedule-examples.ru.md) · [Estado de las traducciones](../translation-status.md)

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

Esta guía recorre configuraciones del hogar con **Predeterminado**, **Perfiles**, plantillas diarias y presets de Velair. Los nombres, entidades y temperaturas son ejemplos: utiliza modos y objetivos admitidos por tus termostatos. Las temperaturas de esta guía están en Celsius; Velair también admite Fahrenheit.

Para las reglas completas, consulta [Presets de bloques y plantillas vinculadas](linked-schedules.es.md).

<a id="choose-what-you-want-to-share"></a>

## Elegir qué quieres compartir

| Tu objetivo | Elige | Cambios posteriores |
|---|---|---|
| Reutilizar una temperatura y opciones en horas no relacionadas | Un preset de Velair en cada bloque | Editar el preset actualiza esos bloques; sus horas permanecen independientes. |
| Partir de una plantilla y personalizar sus bloques | Copiar bloques | Las ediciones de plantilla no actualizan la copia. Las referencias copiadas a presets siguen activas. |
| Duplicar un día de horario configurado | Clonar | La copia conserva el tipo de vínculo, las asignaciones y las referencias a presets del origen. |
| Utilizar las mismas horas con ajustes de calefacción o refrigeración distintos | Una plantilla con **Solo horarios** | Los cambios de horas de plantilla actualizan todos los días vinculados; los ajustes climáticos permanecen independientes. |
| Mantener varios días idénticos en horas y ajustes | Una plantilla con **Horarios y ajustes** | Los cambios de horas y clima siguen la plantilla; los controles de destino son de solo lectura. |

Una plantilla es un día, no un horario semanal. Vincula explícitamente cada día y termostato necesarios. Una semana puede contener días independientes y ambos tipos de vínculo. Predeterminado es la semana habitual de cada termostato; no es un Perfil guardado.

<a id="1-one-heating-routine-for-two-rooms"></a>

## 1. Una rutina de calefacción para dos habitaciones

**Situación:** el salón y el dormitorio necesitan confort a las 07:00 y una reducción nocturna a las 23:00. Ambos termostatos admiten calefacción y estos objetivos.

1. Abre **Plantillas → Presets climáticos**. Crea y guarda estos presets:

   | Preset | Modo | Objetivo |
   |---|---|---|
   | Confort de calefacción | Calor | 21 °C |
   | Calefacción nocturna | Calor | 17 °C |

2. En la biblioteca de plantillas diarias, crea **Día laborable en casa**. Añade las 07:00 y las 23:00. En **Ajustes adicionales** de cada bloque, elige el **Preset de Velair** correspondiente y guarda la plantilla.
3. Abre **Planificación → Planificaciones predeterminadas**, selecciona el salón y el lunes. Establece **Origen de la programación** en **Día laborable en casa** y elige **Horarios y ajustes** en **Vincular**. Guarda ese día.
4. Repite para el dormitorio y para todos los días que deban seguir esta rutina.

La hora, modo, objetivo y opciones del dispositivo son de solo lectura en esos días vinculados. La columna de objetivo sigue mostrando 21 °C o 17 °C; no sustituye el objetivo por el nombre del preset. Los indicadores de origen y los detalles del bloque identifican la plantilla y el preset.

Ahora realiza dos cambios separados:

| Cambio que guardas | Qué ocurre |
|---|---|
| Mover el bloque de las 07:00 de la plantilla a las 07:30 | Todos los días vinculados empiezan ese bloque a las 07:30. Su referencia a preset no cambia. |
| Cambiar Confort de calefacción de 21 °C a 21.5 °C | Todas las referencias a ese preset utilizan 21.5 °C, incluidas las recibidas mediante la plantilla. Los objetivos nocturnos siguen en 17 °C. |

Guardar la plantilla no guarda también un borrador de Perfil abierto no relacionado. Guardar un preset no guarda un borrador de horario no relacionado. Cada recurso tiene su propio control de guardado.

<a id="2-winter-and-summer-with-one-set-of-times"></a>

## 2. Invierno y verano con las mismas horas

**Situación:** un aire acondicionado calienta en invierno y refrigera en verano. El horario del hogar sigue igual, pero los objetivos y acciones cambian.

Crea **Día laborable** con bloques a las 07:00 y las 23:00. Crea los siguientes presets y utiliza **Solo horarios** al vincular el lunes del salón en Predeterminado y en los dos Perfiles:

| Hora compartida | Asignación en Predeterminado | Asignación del Perfil Invierno | Asignación del Perfil Verano |
|---|---|---|---|
| 07:00 | Confort habitual: Calor, 20 °C | Confort de invierno: Calor, 21 °C | Confort de verano: Frío, 25 °C |
| 23:00 | Apagado manual | Noche de invierno: Calor, 17 °C | Preset de apagado |

Para configurar un Perfil, selecciona **Planificaciones de Perfiles**, crea el Perfil y establece el salón en **Planificación del Perfil**. Selecciona el día, elige **Día laborable → Solo horarios** y configura sus asignaciones. Guarda el Perfil completo. En Predeterminado, guarda cada día editado por separado.

Mover la hora matinal de la plantilla a las 07:30 mueve los tres horarios. Cambiar el objetivo propio de la plantilla no modifica estas asignaciones. Editar **Confort de invierno** afecta a sus referencias a preset, incluido el Perfil Invierno, pero no convierte el objetivo de refrigeración de Verano en uno de calefacción.

El Perfil seleccionado sigue determinando qué semana se ejecuta. Home Assistant puede seleccionar Invierno o Verano mediante las acciones de Perfil existentes; la plantilla no decide la estación. Por ejemplo, tras crear un Perfil con ID de automatización `summer`, esta acción lo selecciona:

```yaml
action: velair.activate_profile
data:
  profile_id: summer
```

Para volver a las planificaciones Predeterminadas guardadas:

```yaml
action: velair.deactivate_profile
```

Utiliza el **ID de automatización** mostrado en tu Perfil, que puede ser distinto de su nombre visible. Consulta [Perfiles climáticos](climate-profiles.es.md) para los Modos y las reglas de activación de perfiles.

Para el entretiempo, un equipo controlado localmente puede tener un Perfil separado cuyo comportamiento sea **Pausar → Apagar el clima**. Una automatización puede seleccionar ese Perfil. Es distinto de un bloque de apagado programado: una zona pausada no vuelve a seguir los bloques programados posteriores. El comportamiento de pausa no está disponible para zonas controladas externamente; se aplican las acciones de horario admitidas por su proveedor.

Los umbrales de previsión, las comprobaciones periódicas de temperatura exterior, las notificaciones de ventanas y el retraso del apagado nocturno siguen siendo decisiones de automatización de Home Assistant. Los presets y vínculos no añaden esas reglas a Velair.

<a id="3-copy-a-day-then-customize-a-guest-room"></a>

## 3. Copiar un día y personalizar una habitación de invitados

**Situación:** la habitación de invitados debe partir de Día laborable en casa, pero los invitados quieren calefacción para desayunar a las 08:00 en lugar de las 07:00.

En Planificación, selecciona la habitación de invitados y el día. Mantén **Origen de la programación → Programación propia** y elige **Día laborable en casa** en el selector separado **Plantillas** para copiar sus bloques. Cambia la hora matinal a las 08:00 y guarda. El día es independiente de la plantilla. Mover posteriormente Día laborable en casa a las 07:30 no mueve el bloque de las 08:00 de la habitación de invitados.

Si el bloque copiado utiliza **Confort de calefacción**, sigue referenciando ese preset. Editar Confort de calefacción a 21.5 °C también cambia por tanto el objetivo de la habitación de invitados. Ser independiente de una plantilla no significa ser independiente de un preset.

Para mantener la habitación de invitados a 20 °C independientemente de futuras ediciones del preset, abre Ajustes adicionales del bloque, elige **Sin preset de Velair**, edita después el objetivo manual a 20 °C y guarda. Retirar primero el preset conserva sus ajustes efectivos; no vacía el bloque.

Clonar un día del horario es distinto de copiar bloques desde la biblioteca de plantillas: conserva el vínculo del día de origen con la plantilla. Por ejemplo, clona al martes un lunes que siga **Día laborable en casa → Horarios y ajustes**. Ambos días siguen ahora Día laborable en casa; cambiar su inicio de las 07:00 a las 07:30 actualiza ambos.

Con **Solo horarios**, la copia conserva el mismo vínculo de horas y copia sus asignaciones, incluidos los presets. Puedes cambiar después las asignaciones del martes sin cambiar las del lunes, mientras ambos días siguen las horas de la plantilla.

También puedes clonar el lunes al lunes de otro termostato. Ese destino conserva el mismo tipo de vínculo si es compatible; sus demás días mantienen su configuración existente. Si un preset compartido de Calor no puede utilizarse en un equipo de solo refrigeración, se rechaza la clonación en lugar de retirar silenciosamente el vínculo. Predeterminado valida juntos todos los destinos seleccionados. En Perfiles, la clonación solo actualiza el borrador validado hasta que guardes el Perfil.

Para un martes independiente, clónalo y elige después **Desvincular** antes de guardar. El día conserva sus ajustes actuales y presets activos, pero deja de seguir la plantilla. La operación **Copiar bloques** de la biblioteca de plantillas sigue siendo independiente.

<a id="4-change-a-link-without-losing-the-wrong-draft"></a>

## 4. Cambiar un vínculo conservando el borrador adecuado

**Situación:** el lunes está vinculado a Día laborable en casa. Quieres personalizar ese lunes, pero mantener intactos los demás días vinculados.

| Opción | Resultado en el borrador |
|---|---|
| Cambiar **Horarios y ajustes** a **Solo horarios** | Conservar los ajustes actuales de la plantilla como asignaciones propias de ese día, incluidos los presets. Las horas siguen la plantilla. |
| Cambiar **Solo horarios** a **Horarios y ajustes** | Confirmar la sustitución de las asignaciones del día por los ajustes de la plantilla. Cancelar conserva la selección y el borrador originales. |
| Elegir otra plantilla | Confirmar la sustitución del borrador. Cancelar conserva la plantilla y los ajustes actuales. |
| Utilizar **Desvincular** | Conservar las horas y ajustes del borrador actual como un día independiente, incluidos los presets. |
| Elegir **Programación propia** | Confirmar el descarte de los cambios de ese día y restaurar su día guardado como borrador independiente. |

Estas operaciones no guardan automáticamente. Guarda el día Predeterminado o el Perfil completo cuando esté listo.

Como diferencia concreta, supongamos que el lunes guardado tiene un bloque independiente a las 09:00 y 20 °C. Seleccionas una plantilla que empieza a las 08:00 y ajustas su asignación de solo horarios a 21 °C sin guardar:

- **Desvincular** conserva las 08:00 y 21 °C en el borrador independiente.
- **Programación propia** restaura las 09:00 y 20 °C guardadas.

Si el lunes guardado ya estaba vinculado, Programación propia utiliza los valores actuales de ese día vinculado guardado y los independiza. No recupera un horario manual anterior a la creación del vínculo.

Convertir un día en independiente utiliza los valores adaptados a su termostato. Por ejemplo, un objetivo manual compartido de 18.3 °C puede aparecer como 18.5 °C en un dispositivo con incrementos de 0.5 °C. Tras Desvincular, ese objetivo manual sigue en 18.5 °C. Un bloque que utiliza un preset conserva en cambio su referencia al preset. Ninguna operación modifica la biblioteca compartida.

<a id="5-add-a-lunchtime-block-to-a-shared-template"></a>

## 5. Añadir un bloque al mediodía a una plantilla compartida

**Situación:** Día laborable ya tiene bloques a las 07:00 y las 23:00. Añades las 12:00 con Calor manual a 18 °C. Varias habitaciones y Perfiles utilizan esta plantilla.

<a id="a-compatible-hours-only-destination"></a>

### Un destino compatible de solo horarios

Si el destino admite Calor a 18 °C, Velair propone copiar esa configuración a su nueva asignación de las 12:00. Revísala en **Días vinculados** y guarda la plantilla.

Solo la hora sigue compartida. Cambiar después el objetivo de las 12:00 de la plantilla a 19 °C no modifica esta asignación de solo horarios. Si el nuevo bloque referencia en cambio un preset compatible, la asignación conserva esa referencia; las ediciones posteriores de ese preset siguen propagándose.

<a id="an-incompatible-hours-only-destination"></a>

### Un destino incompatible de solo horarios

Supongamos que otro termostato tiene un objetivo mínimo de 19 °C. Su asignación existente de las 07:00 utiliza el preset válido **Confort de oficina: Calor, 21 °C**. El nuevo objetivo de 18 °C es incompatible, por lo que Velair busca una asignación guardada en ese mismo día del termostato:

1. Un bloque exactamente a las 12:00, si existía antes de esta edición.
2. Bloques anteriores, empezando por el más cercano.
3. Bloques posteriores, empezando por el más cercano.

En este caso propone Confort de oficina desde las 07:00. Días vinculados identifica la alternativa y su origen. Puedes aceptarla o elegir otra asignación válida antes de guardar. Su preset sigue activo.

Se omite un bloque de origen incompatible. Un bloque movido o eliminado en esta edición aún puede proporcionar su asignación guardada anteriormente; otro bloque recién añadido no puede. Si no existe un bloque de origen válido, Días vinculados muestra una asignación pendiente. Complétala manualmente o elige un preset compatible; no se guarda nada mientras esté pendiente.

<a id="a-completely-linked-destination"></a>

### Un destino con vínculo completo

Para **Horarios y ajustes**, el nuevo bloque de las 12:00 procede directamente de la plantilla. No se recurre a los ajustes antiguos de una habitación.

Si el objetivo de 18 °C de la plantilla es incompatible con cualquier destino completo, se bloquea todo el guardado de la plantilla. Cambia el objetivo de la plantilla por uno admitido por todos esos destinos, o cambia el destino afectado a Solo horarios o a un día independiente y guarda primero ese cambio.

Esta comprobación incluye Perfiles inactivos y planificaciones Predeterminadas ocultas por otro Perfil activo. Hasta que se complete un guardado válido de la plantilla, todos los destinos guardados conservan su programación anterior.

<a id="move-or-remove-an-existing-block"></a>

### Mover o retirar un bloque existente

Mover las 07:00 a las 07:30 conserva la asignación matinal de cada destino de solo horarios; no la sustituye por el objetivo de la plantilla. Los destinos completos siguen la plantilla actualizada. Retirar un bloque elimina las asignaciones coincidentes de solo horarios y el bloque correspondiente de vínculo completo en el mismo guardado.

Un bloque tiene una identidad estable. Eliminarlo y añadir otro a la misma hora crea un bloque nuevo; no se considera un movimiento del original.

<a id="6-understand-uses-before-editing-or-deleting"></a>

## 6. Comprender los usos antes de editar o eliminar

**Situación:** el preset Confort de calefacción está seleccionado en:

- Un bloque de Día laborable en casa.
- Un bloque independiente Predeterminado del viernes.
- Una asignación de solo horarios de un Perfil Invierno.

El preset tiene **tres referencias directas**. Si otros dos días utilizan Día laborable en casa con Horarios y ajustes, heredan su preset mediante la plantilla. Aparecen como destinos afectados adicionales, sin aumentar el recuento de referencias directas a cinco.

Editar el preset afecta a todas esas referencias y destinos heredados. Todos deben ser compatibles para poder guardar la edición. Un preset referenciado por una plantilla no puede eliminarse aunque esa plantilla no tenga días vinculados: retira primero la referencia de la plantilla.

El recuento **Días vinculados** de una plantilla significa algo distinto. Vincular lunes y martes crea dos días vinculados. Copiarla al viernes no crea ningún vínculo ni aumenta ese recuento. Las copias no se registran como usos de plantilla.

Elimina una plantilla solo después de desvincular todos sus días guardados en Predeterminado y Perfiles. Editar su nombre, horas o ajustes conserva su posición en la biblioteca.

<a id="7-what-happens-while-a-schedule-is-active"></a>

## 7. ¿Qué ocurre mientras un horario está activo?

Supongamos que el salón sigue automáticamente Confort de calefacción a 21 °C. Guardar ese preset a 21.5 °C actualiza la intención activa. El dispositivo físico aún debe aceptar la acción; guardar no demuestra que la habitación se haya calentado.

Si el salón tiene un Refuerzo a 23 °C, editar el preset no cancela ese Refuerzo. Cuando vence, Velair utiliza la configuración actual del horario. Las pausas y el ajuste manual también mantienen su prioridad. Activar un Perfil es una acción separada: cancela los Refuerzos de las zonas afectadas, mientras las pausas globales y por zona siguen teniendo prioridad. Consulta las [Reglas de prioridad de Perfiles](climate-profiles.es.md).

Si Invierno proporciona su propia semana, editar Predeterminado no sustituye el horario activo de Invierno. Volver a Predeterminado utiliza los últimos ajustes Predeterminados guardados. Un Perfil configurado para utilizar **Planificación predeterminada** hereda los vínculos y presets de Predeterminado en lugar de guardar otra copia.

Un día vacío no apaga implícitamente el equipo. Un bloque nocturno del viernes a las 23:00 continúa durante un sábado vacío hasta que empieza otro bloque programado. Añade un bloque explícito de Apagado si esa es la acción deseada.

<a id="8-device-options-cooling-and-temperature-ranges"></a>

## 8. Opciones del dispositivo, refrigeración e intervalos de temperatura

**Situación:** el aire acondicionado de un dormitorio ofrece un preset nativo `sleep` y un ajuste de ventilador `quiet`. Quieres ambos a las 23:00 con refrigeración a 25 °C.

Crea un preset de Velair llamado **Noche de verano del dormitorio** con Frío, 25 °C, Preset del dispositivo `sleep` y Modo del ventilador `quiet`. Selecciónalo en el bloque de las 23:00 del dormitorio mediante Ajustes adicionales. **Preset de Velair** es la configuración compartida de Velair; **Preset del dispositivo** es una orden dentro de esa configuración. El resumen del bloque muestra juntos el objetivo, modo y ambas opciones del dispositivo.

En un destino que admita esas opciones, el indicador de ajustes cuenta tres: un vínculo de Velair y dos opciones del dispositivo. La temperatura y el modo HVAC no suman en ese indicador. Una opción del dispositivo omitida no se restablece: retirar `quiet` de la configuración compartida deja de enviar una orden de ventilador, en lugar de establecer otro valor.

Para otra rutina, crea **Solo ventilador silencioso** con únicamente la opción de ventilador y sin objetivo ni modo HVAC. Una referencia programada envía el ajuste de ventilador sin solicitar un cambio de modo HVAC ni encender un equipo apagado. No tiene objetivo para el Preacondicionamiento ni Room Assist. Si se copia a un termostato sin control de ventilador, se convertiría en una acción vacía y se rechaza.

Un equipo que admita de forma nativa intervalos de Calor/frío puede utilizar en cambio un preset llamado **Intervalo de casa** con Calor/frío, objetivo inferior de 19 °C y superior de 24 °C. Ambos límites aparecen en las columnas de objetivo del bloque y proceden del mismo preset. Cambiar el límite superior a 25 °C actualiza sus referencias y conserva el inferior. Un termostato de objetivo único no puede utilizar este preset de intervalo; Velair no inventa un objetivo único ni un límite de intervalo ausente. Utiliza un preset compatible separado para ese dispositivo.

Los presets de solo modo seleccionan un modo HVAC sin temperatura ni opciones adicionales del dispositivo. Un preset de Apagado solicita el apagado y no tiene objetivo ni opciones extra. Estas acciones conservan su semántica existente al referenciarse mediante una plantilla; compartirlas no añade control continuo de temperatura.

<a id="troubleshooting-shared-configurations"></a>

## Resolver problemas de configuraciones compartidas

| Lo que ves | Qué comprobar o hacer |
|---|---|
| Una hora está bloqueada | El día sigue las horas de la plantilla. Edita la plantilla o Desvincula. |
| El modo y el objetivo también están bloqueados | El día sigue la plantilla completa o el bloque utiliza un preset de Velair. Edita su origen compartido. |
| Un día copiado sigue cambiando de temperatura | Conservó una referencia a preset. Elige Sin preset de Velair para convertir ese bloque en manual. |
| Una edición de plantilla falla aunque la habitación activa parezca válida | Revisa Días vinculados para los Perfiles inactivos, los días Predeterminados ocultos y otros termostatos. |
| Una nueva franja de solo horarios está pendiente | Elige una configuración manual válida o un preset en Días vinculados. |
| Persiste un error del proveedor sobre toda la semana | Resuelve la cuadrícula de horas del proveedor, las acciones admitidas o el límite de bloques. Elegir un bloque de origen no resuelve esas restricciones. |
| La comprobación de compatibilidad pasa, pero guardar falla | La comprobación probó un termostato. Guardar valida todos los destinos reales guardados. |
| Un botón de eliminar está desactivado | Retira primero todas las referencias guardadas; las plantillas pueden referenciar presets sin tener días vinculados. |
| Otra sesión cambió la configuración | Actualiza la configuración y revisa el borrador conservado antes de reintentar. |
| Una vista previa falla o sigue cargando | Conserva el borrador y reintenta. Velair no adivina ajustes ni retira referencias para permitir guardar. |

Los ajustes opcionales del dispositivo no admitidos por un destino pueden filtrarse de su configuración efectiva. Los objetivos fuera de límites y los modos incompatibles se rechazan. Una acción de solo opciones no puede quedar vacía tras el filtrado. Los controladores externos imponen restricciones adicionales; publicar un horario nunca recurre a la ejecución climática local como alternativa.

<a id="back-up-the-whole-setup"></a>

## Guardar una copia de toda la configuración

Utiliza la exportación de Velair en lugar de copiar solo un día visible resuelto. Las exportaciones del modelo 16 conservan ambos tipos de vínculo, los presets y las identidades de bloque. Exportar horarios o Perfiles incluye las plantillas y presets de los que dependen; la pantalla de exportación muestra las secciones añadidas automáticamente.

Al importar, revisa las sustituciones antes de confirmar. Sustituir un recurso compartido también puede afectar a usos locales existentes. La configuración combinada debe ser válida; los Perfiles nuevos no se activan simplemente por importarlos. Las copias de seguridad antiguas siguen siendo importables, mientras que las versiones antiguas de Velair no pueden importar una exportación del modelo 16. Consulta [Portabilidad](usage.es.md#portability).
