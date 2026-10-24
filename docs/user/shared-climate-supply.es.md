<a id="shared-climate-supply"></a>
# Suministro climático compartido
<!-- velair-docs:start -->
Traducciones: [Original en inglés](shared-climate-supply.md) · [Español](shared-climate-supply.es.md) · [Français](shared-climate-supply.fr.md) · [Deutsch](shared-climate-supply.de.md) · [Italiano](shared-climate-supply.it.md) · [Nederlands](shared-climate-supply.nl.md) · [Polski](shared-climate-supply.pl.md) · [Português (Brasil)](shared-climate-supply.pt-br.md) · [Português (Portugal)](shared-climate-supply.pt-pt.md) · [Русский](shared-climate-supply.ru.md) · [Estado de las traducciones](../translation-status.md)

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

El suministro climático compartido estima si los termostatos asociados necesitan calefacción o refrigeración y controla un `switch` común, por ejemplo un relé de demanda de caldera. Es opcional y permanece deshabilitado hasta que habilites expresamente un suministro en **Control de suministro**. La estimación no confirma la apertura de válvulas, el caudal de agua ni la calefacción física.

<a id="configure-a-supply"></a>
## Configurar un suministro

Abre **Control de suministro** en el panel de Velair y elige **Añadir suministro**. Selecciona una entrada para editarla junto al listado o debajo en pantallas estrechas. Si no hay suministros, el estado vacío ofrece **Añadir suministro**. El listado **Suministros compartidos** contiene circuitos controlados de calefacción o refrigeración; es independiente de la agrupación general de termostatos.

Indica el **Nombre del suministro**, elige un interruptor existente, selecciona la **Función del suministro** (Calefacción o Refrigeración) y los termostatos gestionados que abastece el circuito. Cada interruptor solo puede pertenecer a un suministro. Los interruptores de control de Velair no pueden utilizarse como salidas.

La función describe qué proporciona el equipo compartido. No cambia los modos HVAC de los termostatos: una fuente de calor solo responde a demanda de calefacción y una fuente de frío solo a demanda de refrigeración.

Cada entrada muestra la función, el número de termostatos, el interruptor elegido y el estado guardado del control automático. Edita el nombre, el interruptor y la función directamente en el resumen superior, junto al control de habilitación y el icono de guardar. Cada ajuste aparece una sola vez; no hay una sección separada de ajustes del suministro. **Estado del interruptor** es el estado observado de la entidad; el resumen del listado describe la configuración guardada. El interruptor de habilitación edita un borrador hasta guardar, por lo que puede estar habilitado sin guardar mientras el estado guardado indica Deshabilitado. La demanda no se evalúa con el control deshabilitado o suspendido. Los botones de información explican estas diferencias, el control exclusivo del interruptor, la función y la temporización sin ampliar el formulario principal.

Usa **Eliminar suministro** (la papelera) en su entrada del listado; la eliminación es un borrador hasta guardar los suministros. Despliega **Opciones de temporización**, **Demanda e histéresis** o **Termostatos asociados** para editar esa parte. La ayuda junto al título abre un resumen y esta guía. Cambiar de suministro conserva los cambios sin guardar. **Guardar suministros**, el icono de la cabecera de detalle, aplica el listado editado completo, incluidas las eliminaciones. Sigue disponible en el estado vacío tras eliminar el último suministro. Como en Plantillas y Presets, no hay un botón separado para descartar. Salir de la pestaña con cambios solicita confirmación para descartarlos; al regresar se recupera el listado guardado. La navegación espera mientras se guarda o reanuda el control.

Devolver todos los valores editados a sus valores guardados elimina el borrador, permitiendo de nuevo las actualizaciones de configuración y **Reanudar control automático**. Los cambios guardados llegan a otros paneles conectados aunque no cambie la demanda estimada.

Elige el comportamiento de histéresis y sus valores. Cada termostato asociado hereda el comportamiento; puedes sobrescribir sus valores numéricos sin configurar otro comportamiento. En la fila de cada termostato seleccionado, **Histéresis del termostato** permite elegir **Usar histéresis del suministro** o **Valores de histéresis personalizados**. El selector se alinea con la casilla y el nombre; las excepciones y límites efectivos aparecen debajo. En el comportamiento personalizado, ambos valores pueden heredarse de forma independiente. Son diferencias de temperatura en la unidad actual del panel; cambiar de unidad convierte estas diferencias sin tratarlas como temperaturas absolutas.

Los campos numéricos indican los valores no válidos mientras editas. La histéresis debe ser finita y no negativa; dejar una excepción vacía hereda el valor del suministro. No se puede guardar mientras algún suministro tenga números no válidos y el listado señala cuál necesita atención.

Guarda expresamente para aplicar la configuración. Habilitar el suministro da a Velair el control automático exclusivo del interruptor elegido. Evita que otra automatización controle continuamente la misma salida.

Los fallos de guardado aparecen junto a la acción de guardar en la cabecera de detalle. Los errores de configuración identifican el suministro, el campo y la corrección; Velair selecciona ese suministro, abre su sección y marca y enfoca el campo. Los errores de Home Assistant o conexión conservan su explicación original sin atribuirlos a un campo ajeno. Los borradores se conservan para corregir y reintentar, incluso tras eliminar el último suministro.

<a id="how-estimated-demand-works"></a>
## Cómo funciona la demanda estimada

Los suministros nuevos creados desde el panel usan **Parar en la consigna**, una distancia de arranque de **0.3 °C** o **0.54 °F** y una distancia de parada de cero. Son diferencias equivalentes; las excepciones heredan los valores del suministro salvo que elijas valores personalizados. Los ejemplos siguientes utilizan otras distancias para explicar cada comportamiento.

Para termostatos ordinarios, la histéresis define un umbral de arranque y otro de parada. Entre ambos se conserva la demanda anterior. Todas las comparaciones incluyen el propio umbral. Estos ejemplos usan una consigna de 22 °C:

| Comportamiento | Valores | Calefacción: arranque / parada | Refrigeración: arranque / parada |
| --- | --- | --- | --- |
| Parar en la consigna (predeterminado) | Arranque 0.5 °C | ≤21.5 / ≥22 °C | ≥22.5 / ≤22 °C |
| Simétrica | Distancia 0.5 °C | ≤21.5 / ≥22.5 °C | ≥22.5 / ≤21.5 °C |
| Personalizada | Arranque 0.5 °C; parada 0.2 °C | ≤21.5 / ≥22.2 °C | ≥22.5 / ≤21.8 °C |

El diagrama de **Demanda e histéresis** se actualiza al editar la función, el comportamiento o las distancias. Usa una consigna de ejemplo identificada, no la consigna actual de un termostato. Las temperaturas aparecen junto a los marcadores de arranque y parada; unas cotas enlazan las distancias de histéresis con la consigna de ejemplo. El eje de temperatura ambiente está identificado y aumenta hacia la derecha. La nota inferior explica que entre arranque y parada continúa una solicitud existente; si no la había, no se inicia. Dentro de los límites se conserva la demanda anterior. La calefacción solicita suministro en el lado frío y la refrigeración en el caliente. El diagrama explica la demanda estimada, sin simular equipos ni retardos. Su consigna de ejemplo es 22 °C o 72 °F. Mientras un valor está vacío, incompleto o no es válido, un diagrama gris sin temperaturas conserva la altura hasta que vuelva a ser válido.

La distancia de arranque se mide alejándose de la consigna hasta necesitar calor o frío. La distancia de parada se prolonga más allá de la consigna en la dirección de calefacción o refrigeración. Ambas aceptan cero; con ambas a cero, en la consigna exacta no hay demanda. Dentro de la banda, tras un reinicio o cambio de consigna o histéresis, no se supone una demanda nueva. Cambiar de comportamiento conserva la distancia de parada personalizada introducida; vuelve a aplicarse al regresar al comportamiento personalizado.

**Parar en la consigna** es el punto de partida recomendado para termostatos ordinarios. Simétrica y Personalizada son opciones avanzadas: el termostato puede cerrar la válvula o detener el compresor en la consigna antes de alcanzar el umbral de parada situado más allá. La fuente compartida podría seguir solicitada. Estos ajustes estiman la demanda; no cambian los límites del propio termostato ni fuerzan el caudal de calor.

Mantén separados los umbrales de suministros de calor y frío que compartan un termostato con intervalo. Una distancia de parada grande puede mantener la solicitud de calor mientras empieza la de frío o a la inversa. Los suministros agregan demanda de forma independiente; no proporcionan un interbloqueo entre salidas opuestas. Utiliza interbloqueos de equipo adecuados cuando sean necesarios.

Se solicita la fuente cuando al menos un termostato asociado tiene demanda válida. Un termostato apagado o con dirección HVAC incompatible no solicita suministro. Los datos de temperatura ausentes o no disponibles producen demanda desconocida; no conservan indefinidamente una solicitud anterior. Otras habitaciones válidas pueden seguir solicitando suministro. Sin habitaciones con demanda válida, se solicita el apagado tras el retardo configurado.

Se usan las consignas actuales, incluidos los cambios manuales y los objetivos de Preacondicionamiento adaptativo o Regreso a casa. Pausar un horario no deshabilita el control de suministro. Un intervalo válido usa su límite inferior para calefacción y el superior para refrigeración; una consigna ambigua no puede solicitar suministro.

<a id="room-assist"></a>
## Room Assist

Un panel informativo azul al principio de **Demanda e histéresis**, antes del selector, explica la prioridad de Room Assist y cuándo se aplica la histéresis del suministro.

Cuando Room Assist controla la consigna activa de una habitación, el suministro sigue su intención de control ya confirmada. En calefacción fija, la fase `towards_upper` solicita calor; en refrigeración fija, `towards_lower` solicita frío. Sus límites de conmutación siguen siendo los que mandan: la histéresis del suministro y la excepción de habitación no se aplican por segunda vez. El control de intervalo nativo sigue su dirección confirmada. Un objetivo asistido no válido o pendiente es desconocido hasta disponer de una confirmación válida.

No se compara la consigna corregida del termostato con un sensor externo de habitación. Room Assist puede dejar de solicitar suministro aunque el termostato siga mostrando la misma consigna ajustada.

<a id="timing-and-manual-control"></a>
## Temporización y control manual

**Tiempo mínimo apagado** retrasa un nuevo arranque tras apagarse el interruptor. **Retardo de apagado** exige un periodo continuo sin demanda antes de apagar; si vuelve la demanda, cancela el retardo. Ambos aceptan segundos enteros de 0 a 86 400 y su valor predeterminado es cero. No se fuerza un tiempo mínimo encendido que mantenga la fuente activa cuando las válvulas podrían haberse cerrado.

Renombrar un suministro o editar una distancia de parada que no se usa no reinicia su ciclo de demanda ni el retardo de apagado. Al habilitar de nuevo un suministro, se usa la última transición de apagado comunicada para respetar el tiempo mínimo apagado.

Apagar fuera de Velair el interruptor de un suministro habilitado suspende el control automático. Usa **Reanudar control automático** para recuperarlo. La suspensión se guarda y sobrevive a reinicios. Guardar otros cambios no la elimina. Deshabilitar o eliminar un suministro solicita apagar su salida anterior.

Encender el interruptor fuera de Velair no anula el control automático. Si todos los termostatos asociados informan de ausencia de demanda, Velair lo apaga tras el retardo configurado. Si Home Assistant confirma que esa transición pertenece a la corrección de Velair, este crea una notificación persistente y una entrada de Actividad asociada al interruptor. El mensaje identifica el suministro, explica que se corrigió una activación externa porque el control automático no tenía demanda estimada de calefacción o refrigeración y enlaza a **Control de suministro** para revisar o deshabilitar el control. No supone que el cambio lo hiciera una persona.

Las correcciones repetidas del mismo suministro e interruptor se notifican como máximo una vez cada 15 minutos durante la ejecución actual de la integración. Reasignar el interruptor inicia un nuevo periodo. Cada suministro usa una única notificación: un aviso posterior permitido sustituye al anterior. Los fallos de entrega o la aceptación del servicio sin una transición de apagado correspondiente no generan un aviso de éxito. La demanda desconocida no se presenta como ausencia confirmada de demanda. Una integración de interruptor que no conserve el contexto de la orden no permite atribuir el cambio para este aviso. Estas reglas no cambian el control ni requieren sondeo. Los fallos de notificación y Actividad no interrumpen el control; Actividad requiere la integración de actividad/logbook de Home Assistant.

Un apagado manual más reciente tiene prioridad frente a un guardado o reanudación ya en curso. Reanuda expresamente otra vez si quieres recuperar el control tras ese apagado. La suspensión manual también permanece guardada durante la migración de unidades de temperatura y el reinicio.

Un interruptor no disponible o una orden fallida aparecen en el suministro. Los intentos de entrega están limitados y no se repiten con cada actualización de sensor. Que Home Assistant acepte una orden no demuestra que el equipo físico haya funcionado.

Los suministros importados quedan deshabilitados y suspendidos. Revisa salida y habitaciones, habilita el suministro, guarda y reanuda expresamente el control cuando corresponda.

<a id="preconditioning-master-and-performance"></a>
## Maestro de preacondicionamiento y rendimiento

El [Maestro de preacondicionamiento](adaptive-preconditioning.es.md#preconditioning-master) condiciona el inicio de preparación de las habitaciones dependientes. El suministro compartido sigue la demanda de las habitaciones. Una caldera controlada por válvulas TRV no necesita automáticamente un maestro; Velair no crea dependencias entre estos ajustes.

El controlador escucha las entidades configuradas y usa un único trabajador que agrupa actualizaciones y como máximo un temporizador por suministro. No hace sondeo, no guarda muestras de temperatura ni requiere un navegador abierto. Los cambios rutinarios de temperatura sin un cambio relevante del estado de control no difunden una instantánea completa nueva del panel.
