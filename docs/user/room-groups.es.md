<a id="room-groups"></a>
# Grupos de habitación
<!-- velair-docs:start -->
Traducciones: [Original en inglés](room-groups.md) · [Español](room-groups.es.md) · [Français](room-groups.fr.md) · [Deutsch](room-groups.de.md) · [Italiano](room-groups.it.md) · [Nederlands](room-groups.nl.md) · [Polski](room-groups.pl.md) · [Português (Brasil)](room-groups.pt-br.md) · [Português (Portugal)](room-groups.pt-pt.md) · [Русский](room-groups.ru.md) · [Estado de las traducciones](../translation-status.md)

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

Un grupo de habitación proporciona a varias entidades `climate` gestionadas una única programación, asignación de Perfil, refuerzo, pausa y modelo de Preacondicionamiento adaptativo. Úsalo cuando los dispositivos controlan la misma habitación física. Las habitaciones distintas deben seguir siendo independientes, aunque compartan una plantilla diaria o un suministro de calefacción o refrigeración.

<a id="what-a-group-shares"></a>
## Qué comparte un grupo

| Compartido por el grupo | Independiente para cada equipo físico |
| --- | --- |
| Programación, asignaciones de Modos/Perfiles y ajustes de control | Temperatura, humedad, acción HVAC y disponibilidad comunicadas |
| Refuerzos, pausas de zona y ajuste manual | Sensores, umbrales e interruptor de supervisión de Confort |
| Una decisión de inicio del preacondicionamiento y un modelo de aprendizaje térmico | Observaciones del dispositivo y evidencias de entrega en Diagnóstico |
| Ajustes y corrección de Room Assist | Regulación interna de temperatura del propio dispositivo |

El grupo es una unidad de control interna de Velair, no una entidad nueva `climate` o `group` de Home Assistant. Velair genera un identificador interno estable, como `group.0123456789abcdef0123456789abcdef`; cambiar el nombre del grupo conserva ese identificador. Puede aparecer en diagnósticos, exportaciones o ajustes técnicos, pero no en el registro de entidades ni en los estados de Herramientas para desarrolladores de Home Assistant. No lo uses como destino de un servicio `climate.*` de Home Assistant. Velair resuelve el grupo a sus destinatarios reales.

<a id="create-a-group"></a>
## Crear un grupo

1. Abre la pestaña **Grupos de habitación** y pulsa el botón de añadir.
2. Introduce su nombre y usa **Añadir equipos** para seleccionar los equipos gestionados de la habitación. Añade al menos dos. Busca por nombre o ID de entidad y confirma la selección. Los equipos de otro grupo no están disponibles e indican a qué grupo pertenecen.
3. Elige un miembro cuya temperatura ambiente comunicada represente la temperatura propia del grupo. Esta referencia no convierte al dispositivo en propietario del grupo. Configura un sensor externo opcional en **Room Assist**, igual que para un equipo independiente.
4. Elige si Velair envía órdenes a todos los miembros o a uno cuya instalación ya las propague a los demás dispositivos.
5. Elige qué configuración adoptar con **Usar configuración de**. Exporta primero la configuración actual si necesitas una copia de recuperación; incluye **Aprendizaje de preacondicionamiento** para respaldar también la calibración.
6. Usa el botón de guardar de la cabecera para abrir **Revisar cambios del grupo**. Todavía no se ha aplicado nada. Lee las diferencias de configuración y el aviso de reinicio del aprendizaje y elige **Confirmar y guardar** o **Volver a editar**. Los errores de validación y guardado permanecen en este flujo para que puedas corregir el borrador y reintentar.

<a id="configuration-fields"></a>
### Campos de configuración

| Campo | Significado |
| --- | --- |
| Nombre del grupo | Nombre visible obligatorio. Debe ser único entre los grupos. |
| Miembros | Equipos gestionados de esta habitación. Su orden determina su aparición individual en Resumen. Un equipo no puede pertenecer a dos grupos. |
| Referencia de temperatura | La temperatura comunicada por un miembro representa la habitación dentro de Velair. No le da prioridad sobre los demás. |
| Envío de órdenes | **Todos los miembros** por defecto, o **Miembro seleccionado** si la instalación ya propaga las órdenes. |
| Destinatario de las órdenes | Solo aparece para **Miembro seleccionado**; elige quién recibe las órdenes de Velair. |
| Usar configuración de | Solo durante la creación: elige el miembro cuya programación, configuración de Perfiles y ajustes de control serán el punto de partida compartido. |

La referencia de temperatura, el destinatario y el origen de la configuración inicial pueden ser tres miembros diferentes.

<a id="send-commands-to-all-members-or-one-recipient"></a>
### Enviar órdenes a todos o a un destinatario

**Todos los miembros** es la opción predeterminada: Velair envía órdenes a cada miembro. **Miembro seleccionado** solo las envía al **Destinatario de las órdenes** situado debajo. Usa esta opción únicamente si la instalación ya propaga esas órdenes a los demás; Velair no realiza esa propagación adicional.

Por ejemplo, una habitación puede tener tres válvulas de radiador y un controlador de habitación que también aparezca como entidad `climate`. Si la instalación propaga sus órdenes a las válvulas, incluye los cuatro miembros, elige el controlador como referencia de temperatura, selecciona **Miembro seleccionado** y úsalo como destinatario. Los cuatro siguen visibles, con una programación y una decisión de preacondicionamiento. Si cada dispositivo necesita una orden directa, usa **Todos los miembros**.

Estas opciones eligen los destinatarios; ninguna crea programaciones ni modelos de aprendizaje independientes para los miembros.

<a id="adopt-an-existing-configuration"></a>
### Adoptar una configuración existente

La adopción crea una configuración compartida a partir de las programaciones, los Perfiles y los ajustes de control del miembro elegido. Sustituye la configuración independiente de control de los miembros; no mantiene copias separadas sincronizadas ni copia ajustes del firmware. Cada equipo conserva sus propios ajustes, sensores y umbrales de Confort, que no se sustituyen por los del miembro elegido. Los historiales de aprendizaje existentes no se fusionan. La referencia propia, el destinatario y el origen inicial pueden ser distintos.

Velair valida el grupo completo antes de guardar. Un equipo solo puede pertenecer a un grupo. Las combinaciones incompatibles deben resolverse antes de usarlo; agrupar no añade capacidades HVAC al dispositivo. La Ejecución externa de horarios no puede controlar un miembro agrupado al mismo tiempo que Velair. Los destinatarios deben compartir modos compatibles, límites de temperatura solapados y una cuadrícula compatible de pasos de temperatura. Si sus modos HVAC activos difieren, selecciona un modo explícito en lugar de pedir a Velair que conserve un modo compartido.

<a id="shared-control-and-individual-observations"></a>
## Control compartido y observaciones individuales

Los selectores de programación, Perfiles y otras funciones de control muestran el grupo en lugar de sus miembros. Edita la programación y los controles habituales. El grupo guarda una configuración, no varias copias sincronizadas.

Confort sigue siendo individual: su panel y sus tarjetas muestran cada equipo con sus mediciones, sensores, umbrales e interruptor de supervisión. El sensor externo opcional de Room Assist del grupo no sustituye esas lecturas salvo que lo selecciones expresamente en Confort para ese miembro. Crear, editar o disolver un grupo conserva la configuración de Confort de cada miembro. Los grupos guardados antes del almacenamiento independiente de Confort inicializan cada miembro con una copia de los ajustes de Confort guardados del grupo; después se editan por separado. No se recuperan automáticamente los ajustes individuales anteriores.

**Resumen** sigue mostrando cada equipo físico. Su grupo identifica la programación y el control compartidos, mientras que temperatura, disponibilidad y estado siguen siendo individuales. Una acción de control sobre un miembro se aplica a la habitación; no crea una programación independiente en competencia.

**Próximos eventos** muestra cada equipo con su grupo debajo del nombre, igual que las filas individuales de **Línea temporal de hoy**. Los miembros muestran el mismo evento del grupo; Velair no crea programaciones ni eventos de backend separados. Selecciona el nombre para abrir la programación compartida en el día del evento, incluida la programación propia de un Perfil si aporta el evento. Regreso a casa usa la programación del Modo de destino. También funciona desde la tarjeta Próximos eventos de un panel. Filtrar la tarjeta por un miembro muestra solo ese miembro; filtrar por un grupo muestra todos sus miembros.

Selecciona un grupo para editarlo en el panel adyacente, con la misma distribución de listado y detalle que Plantillas y Control de suministro. El resumen identifica miembros, referencia y destinatarios, junto con el control compartido y el estado de preparación. La acción de cabecera revisa y guarda; la eliminación está en el listado y requiere confirmación. Las ayudas explican las elecciones de referencia, envío y configuración. Si falta información obligatoria, la revisión identifica los campos que debes completar. Mientras editas, el resumen sigue describiendo el grupo guardado hasta confirmar y guardar los cambios.

Diagnóstico separa las evidencias individuales de la intención común de la habitación. Una llamada de servicio aceptada no demuestra movimiento de válvulas ni flujo de calor. Con un destinatario seleccionado, Velair no afirma haber enviado órdenes directamente a los otros miembros.

<a id="temperature-reference-and-room-assist"></a>
## Referencia de temperatura y Room Assist

Con la programación normal, Velair envía el objetivo compartido a los destinatarios configurados. Cada dispositivo sigue regulando internamente con su sensor; elegir una referencia no cambia su firmware.

La **Referencia de temperatura** aporta la lectura propia del grupo para el preacondicionamiento, el aprendizaje térmico, la referencia propia de Room Assist, la estimación de demanda de suministro y el resumen. Elígela entre los miembros. Configura el sensor externo opcional en [Room Assist](room-assist.es.md#room-groups), no como otra referencia propia en el editor del grupo. Al habilitar Room Assist, esa lectura externa se convierte en la medición efectiva y Velair calcula una corrección compartida. Las órdenes siguen **Envío de órdenes**.

Confort permanece independiente: habilitar Room Assist para el grupo no sustituye los sensores ni umbrales de Confort de cada miembro.

<a id="pauses-manual-adjustment-and-resuming"></a>
## Pausas, ajuste manual y reanudación

El grupo tiene una sola autoridad de programación. Una pausa de zona o un refuerzo solicitado desde cualquier miembro se aplica al grupo completo. La pestaña Grupos de habitación muestra el estado guardado; no tiene un botón propio de pausa. Usa los controles de los miembros. Reanudar esa pausa compartida desde otro miembro tiene el mismo alcance. Otros motivos independientes de pausa siguen teniendo prioridad hasta terminar o eliminarse. Una Pausa o Detención global sigue afectando a todas las habitaciones, incluidos los equipos sin grupo.

Pausar la programación no implica apagar los dispositivos. La acción de pausa elegida decide si Velair conserva sus estados o envía Apagar a los destinatarios configurados del grupo.

La política de **Ajustes externos** en Ajustes pertenece al grupo. Un cambio externo detectado de objetivo o modo HVAC de un miembro puede poner a todo el grupo en **Ajuste manual**, sujeto a las mismas reglas de programación y pausa de un equipo independiente. Con **Hasta el próximo bloque**:

1. Tres miembros siguen un objetivo compartido de `20 °C`.
2. Un cambio externo sube un miembro a `22 °C`.
3. Velair cede el control de programación del grupo y conserva los estados. No copia el cambio a los demás: pueden quedar a `22, 20, 20 °C`. La propia instalación sí podría propagar cambios.
4. En el próximo bloque, vuelve al control Automático y envía el objetivo compartido a los destinatarios. Puedes reanudar Automático antes.

| Política de ajustes externos | Comportamiento del grupo |
| --- | --- |
| Mantener automático | Velair conserva el control y vuelve a aplicar la intención efectiva actual cuando existe. |
| Hasta el próximo bloque | El ajuste manual termina en el próximo bloque aplicable. Sin un bloque futuro, reanuda Automático expresamente. |
| Durante un tiempo | El grupo cede durante el tiempo configurado. Nuevos cambios externos renuevan ese tiempo. |
| Hasta reanudar | El grupo cede hasta reanudar expresamente el control Automático. |

Seleccionar Manual expresamente usa la política guardada y conserva los estados actuales. Si la política es **Mantener automático**, el Manual explícito dura hasta reanudarlo. Room Assist cede durante el ajuste manual.

Este control Manual/Automático es distinto del Modo **Manual** usado al elegir Perfiles directamente. Consulta [Cambios externos y ajuste manual](manual-control.es.md) para las prioridades y casos especiales de bloques.

<a id="display-order"></a>
## Orden de aparición

Usa los controles de orden de Ajustes para mover grupos y equipos independientes. Un grupo nuevo ocupa inicialmente la posición del primero de sus miembros. Ordena los miembros en el detalle de Grupos de habitación. Resumen despliega el grupo en entradas individuales consecutivas en ese orden; los selectores de programación muestran una entrada para el grupo. El backend guarda ambos órdenes.

El listado solo muestra los miembros seleccionados. Los nuevos se añaden al final sin cambiar el orden existente. Usa las flechas para ordenar y la papelera para quitar miembros. Los listados largos se pueden expandir. Los cambios de miembros se aplican solo tras revisar y guardar.

<a id="learning-and-membership-changes"></a>
## Aprendizaje y cambios de miembros

El grupo aprende una respuesta térmica con historiales separados de calefacción y refrigeración. Sin Room Assist, su temperatura procede del miembro elegido. Room Assist usa su sensor externo solo al estar habilitado, con las mismas reglas de control, límites de corrección y preparación que un equipo independiente. Seleccionar un sensor no habilita la asistencia. Quitarlo o deshabilitarla devuelve la lectura a la referencia del miembro. Las órdenes siguen el modo de envío del grupo; las correcciones temporales no cambian el objetivo programado real. No se combinan los historiales independientes existentes. Velair guarda aprendizaje para el grupo, no un modelo por miembro. Las observaciones individuales siguen en Diagnóstico. Crear un grupo comienza de cero y no fusiona historiales previos.

| Cambio | Aprendizaje posterior |
| --- | --- |
| Renombrar el grupo o reordenar miembros | Se conserva el aprendizaje del grupo. |
| Añadir o quitar un miembro | El grupo restante reinicia el aprendizaje porque cambia su composición física. El miembro retirado comienza aprendizaje independiente desde cero. |
| Cambiar la referencia de temperatura o la configuración de envío | El grupo reinicia el aprendizaje y cancela la observación activa anterior. |
| Disolver el grupo | Cada miembro comienza aprendizaje independiente desde cero. Se elimina el historial del grupo anterior. |

Quitar un miembro le da una copia independiente de la configuración común. Disolver el grupo hace lo mismo para todos. Los refuerzos activos, las pausas y el historial térmico no se copian a estas habitaciones independientes. Revisa las programaciones y los Perfiles tras cambiar la unidad de control.

Por ejemplo, quitar un equipo de un grupo de tres deja dos miembros con un nuevo historial del grupo y un equipo independiente con otro historial nuevo. Eliminar el grupo hace independientes a los tres. Ninguna operación restaura sus historiales anteriores al grupo. Conserva al menos dos miembros en un grupo guardado; disuélvelo si todos deben ser independientes.

<a id="before-testing-the-beta"></a>
## Antes de probar la beta

Exporta una copia e incluye el aprendizaje de preacondicionamiento si lo necesitas. Tras revisar y guardar un grupo, comprueba:

- Aparece un grupo en Programación, Perfiles, Preacondicionamiento y Room Assist.
- Cada miembro sigue apareciendo individualmente en Resumen, Próximos eventos, Línea temporal de hoy, Confort y Diagnóstico.
- El envío coincide con la instalación: órdenes directas a todos o al destinatario elegido para que la instalación las propague.
- Cambiar Confort de un miembro deja intactos los demás.
- Una pausa o ajuste manual desde un miembro afecta a la habitación compartida.
- Reiniciar Home Assistant conserva grupo, orden y configuración compartida.

Al comunicar problemas, incluye modo de envío, miembro de referencia, si Room Assist está habilitado y las evidencias de Diagnóstico pertinentes. Una llamada de servicio aceptada no equivale a que el dispositivo comunique el estado solicitado.

Las betas anteriores pueden contener una referencia externa de grupo. Cargarlas o importarlas conserva esa referencia sin elegir un miembro ni habilitar Room Assist automáticamente. El editor identifica ese valor antiguo y solicita una referencia de miembro antes de guardar un grupo editado. Configura el sensor externo en Room Assist al adoptar la nueva disposición.

Los grupos de habitación y los de suministro tienen fines distintos. Un grupo de habitación controla una habitación; [Control de suministro](shared-climate-supply.es.md) agrega demanda para accionar una fuente común. Las plantillas vinculadas comparten contenido del horario sin cambiar quién controla la habitación. Las dependencias de preacondicionamiento coordinan habitaciones separadas conservando su aprendizaje independiente.
