<a id="shared-climate-supply"></a>
# Suministro climático compartido
<!-- velair-docs:start -->
Traducciones: [Original en inglés](shared-climate-supply.md) · [Español](shared-climate-supply.es.md) · [Français](shared-climate-supply.fr.md) · [Deutsch](shared-climate-supply.de.md) · [Italiano](shared-climate-supply.it.md) · [Nederlands](shared-climate-supply.nl.md) · [Polski](shared-climate-supply.pl.md) · [Português (Brasil)](shared-climate-supply.pt-br.md) · [Português (Portugal)](shared-climate-supply.pt-pt.md) · [Русский](shared-climate-supply.ru.md) · [Estado de las traducciones](../translation-status.md)

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

El suministro climático compartido estima si los termostatos asociados necesitan calefacción o refrigeración y controla un `switch` común, por ejemplo un relé de demanda de caldera. Es opcional y permanece deshabilitado hasta que habilites expresamente un suministro en **Control de suministro**. La estimación no confirma la apertura de válvulas, el caudal de agua ni la calefacción física.

<a id="configure-a-supply"></a>
## Configurar un suministro

Abre **Control de suministro** en el panel de Velair y elige **Añadir suministro**. Selecciona una entrada para editarla junto al listado o debajo en pantallas estrechas. Si no hay suministros, el estado vacío ofrece **Añadir suministro**. El listado **Suministros compartidos** contiene circuitos controlados de calefacción o refrigeración; es independiente de la agrupación general de termostatos.

Indica el **Nombre del suministro**, elige un interruptor existente, selecciona la **Función del suministro** (Calefacción o Refrigeración) y los termostatos gestionados que abastece el circuito. Cada interruptor solo puede pertenecer a un suministro. Los interruptores de control de Velair no pueden utilizarse como salidas.

La función describe qué proporciona el equipo compartido. No cambia los modos HVAC de los termostatos: una fuente de calor solo responde a demanda de calefacción y una fuente de frío solo a demanda de refrigeración.

Cada entrada muestra la función, el número de termostatos, el interruptor elegido y el estado guardado del control automático. Edita el nombre, el interruptor y la función directamente en el resumen superior, junto al control de habilitación y el icono de guardar. Cada ajuste aparece una sola vez; no hay una sección separada de ajustes del suministro. **Estado del interruptor** es el estado observado de la entidad; el resumen del listado describe la configuración guardada. El interruptor de habilitación edita un borrador hasta guardar, por lo que puede estar habilitado sin guardar mientras el estado guardado indica Deshabilitado. La demanda no se evalúa con el control deshabilitado o suspendido. Los botones de información explican estas diferencias, el control exclusivo del interruptor, la función y la temporización sin ampliar el formulario principal.

Usa **Eliminar suministro** (la papelera) en su entrada del listado; la eliminación es un borrador hasta guardar los suministros. Despliega **Opciones de temporización**, **Demanda e histéresis** o **Termostatos asociados** para editar esa parte. La ayuda junto al título abre un resumen y esta guía. Cambiar de suministro conserva los cambios sin guardar. **Guardar suministros**, el icono de la cabecera de detalle, aplica el listado editado completo, incluidas las eliminaciones. Sigue disponible en el estado vacío tras eliminar el último suministro. Como en Plantillas y Presets, no hay un botón separado para descartar. Salir de la pestaña con cambios solicita confirmación para descartarlos; al regresar se recupera el listado guardado. La navegación espera mientras se guarda o reanuda el control.

Devolver todos los valores editados a sus valores guardados elimina el borrador, permitiendo de nuevo las actualizaciones de configuración y **Reanudar control automático**. Los cambios guardados llegan a otros paneles conectados aunque no cambie la demanda estimada.

Elige el comportamiento de histéresis y sus valores. Cada termostato asociado hereda el comportamiento; puedes sobrescribir sus valores numéricos sin configurar otro comportamiento. En la fila de cada termostato seleccionado, **Histéresis del termostato** permite elegir **Usar histéresis del suministro** o **Valores de histéresis personalizados**. El selector se alinea con la casilla y el nombre; las excepciones y límites efectivos aparecen debajo. En **Histéresis personalizada**, ambos valores pueden heredarse de forma independiente. Son diferencias de temperatura en la unidad actual del panel; cambiar de unidad convierte estas diferencias sin tratarlas como temperaturas absolutas.

Los campos numéricos indican los valores no válidos mientras editas. La histéresis debe ser finita y no negativa; dejar una excepción vacía hereda el valor del suministro. No se puede guardar mientras algún suministro tenga números no válidos y el listado señala cuál necesita atención.

Guarda expresamente para aplicar la configuración. Habilitar el suministro da a Velair el control automático exclusivo del interruptor elegido. Evita que otra automatización controle continuamente la misma salida.

Los fallos de guardado aparecen junto a la acción de guardar en la cabecera de detalle. Los errores de configuración identifican el suministro, el campo y la corrección; Velair selecciona ese suministro, abre su sección y marca y enfoca el campo. Los errores de Home Assistant o conexión conservan su explicación original sin atribuirlos a un campo ajeno. Los borradores se conservan para corregir y reintentar, incluso tras eliminar el último suministro.

<a id="live-status"></a>
## Estado en directo

Elige **Estado en directo** en la cabecera de detalle de un suministro guardado para abrir su monitor de solo lectura. Usa la configuración guardada aunque el editor tenga cambios pendientes. Los suministros nuevos deben guardarse antes de abrir su monitor.

El resumen muestra el estado del interruptor comunicado por Home Assistant, cuántos termostatos solicitan suministro y el estado del control automático, incluidas las esperas por tiempo mínimo apagado o retardo de apagado. Una solicitud y un interruptor encendido no confirman calefacción, refrigeración, apertura de válvulas ni caudal físicos.

Cuando se evalúa la demanda y hay lecturas, cada termostato muestra una línea de temperatura con lectura actual, objetivo efectivo y umbrales de inicio y parada. Una banda rayada con el mismo color del tema que Room Assist marca el intervalo entre límites, haya o no solicitud. Si la habitación solicita suministro, una flecha fina de color sobre la línea va desde la lectura actual hacia el límite de parada: naranja para calor y azul para frío. Indica la dirección de temperatura solicitada, no flujo de calor ni funcionamiento físico confirmado. Sin demanda desaparece la flecha y el marcador actual es neutro; la banda estática sigue visible. La temperatura aumenta de izquierda a derecha en calor y frío. Valores y etiquetas siguen visibles sin pasar el cursor, también en móvil. Las lecturas actual y objetivo se centran sobre sus posiciones reales; las etiquetas próximas usan filas distintas. Cada marcador de inicio/parada reúne temperatura y distancia con signo al objetivo, sin necesitar otra tabla de límites.

Las etiquetas destacan el siguiente límite relevante. Durante la demanda, **Termina en** identifica la parada. Antes de que la lectura cruce el umbral de inicio, este es simplemente el **Límite inferior** para calor o **Límite superior** para frío. Tras cruzarlo hacia la banda retenida, **Se reinicia en** identifica el límite del siguiente ciclo. Sin demanda se destaca **Comienza en** y el otro límite usa una etiqueta neutra. Los límites coincidentes comparten un marcador. La demanda desconocida permanece neutra sin suponer una solicitud.

Cuando Room Assist controla la demanda, el monitor identifica su origen y usa su sensor de habitación y límites de control confirmados, sin tratar la consigna corregida del termostato como objetivo ambiente. La pregunta **¿Por qué no se usa la histéresis del suministro?** abre una explicación de su prioridad y los ajustes guardados inactivos. Permanece cerrada hasta seleccionarla y conserva su estado durante las actualizaciones. Las instrucciones normales de inicio/parada no se repiten debajo del gráfico; los datos no disponibles o no evaluados sí tienen explicación. Por ejemplo, un objetivo de 17 °C con límites Room Assist de 16 y 18 °C implica una distancia de inicio de 1 °C por debajo y parada de 1 °C por encima, aunque la distancia de inicio de suministro inactiva sea 0.2 °C. Los intervalos nativos de Room Assist pueden usar un único umbral: los marcadores coincidentes no significan distancia cero al objetivo. Las lecturas ausentes o la demanda sin evaluar se muestran expresamente, sin conservar una solicitud antigua como dato en directo. Los termostatos apagados y los suministros deshabilitados o suspendidos mantienen visibles las lecturas actuales disponibles sin presentar objetivos ni límites no evaluados.

El monitor recibe actualizaciones mientras está abierto y cancela la suscripción al cerrarse. Muestra las últimas lecturas comunicadas a Home Assistant; no aumenta la frecuencia de comunicación de los dispositivos, simula temperaturas ni guarda historial.

<a id="how-estimated-demand-works"></a>
## Cómo funciona la demanda estimada

Los suministros nuevos creados en el panel usan **Parar en la consigna**, con **Histéresis de activación** de **0.3 °C** o **0.54 °F** e **Histéresis de desactivación** cero. Son diferencias equivalentes; las excepciones heredan los valores del suministro salvo que elijas valores personalizados. Los ejemplos siguientes usan otros valores para explicar cada comportamiento.

Para termostatos ordinarios, la histéresis define un umbral de arranque y otro de parada. Entre ambos se conserva la demanda anterior. Todas las comparaciones incluyen el propio umbral. Estos ejemplos usan una consigna de 22 °C:

Los valores de histéresis son diferencias de temperatura respecto a la consigna. La histéresis de activación determina cuándo comienza la demanda. La de desactivación indica cuánto debe rebasarse la consigna, en la dirección de calor o frío, para finalizarla. Parar en la consigna usa cero para desactivación. Simétrica aplica el mismo valor a cada lado; Histéresis personalizada permite ajustar ambos por separado.

| Comportamiento | Valores | Calefacción: arranque / parada | Refrigeración: arranque / parada |
| --- | --- | --- | --- |
| Parar en la consigna (predeterminado) | Histéresis de activación 0.5 °C | ≤21.5 / ≥22 °C | ≥22.5 / ≤22 °C |
| Simétrica | Histéresis simétrica 0.5 °C a cada lado | ≤21.5 / ≥22.5 °C | ≥22.5 / ≤21.5 °C |
| Histéresis personalizada | Histéresis de activación 0.5 °C; Histéresis de desactivación 0.2 °C | ≤21.5 / ≥22.2 °C | ≥22.5 / ≤21.8 °C |

El diagrama de **Demanda e histéresis** se actualiza al editar la función, el comportamiento o las distancias. Usa una consigna de ejemplo identificada, no la consigna actual de un termostato. Las temperaturas aparecen junto a los marcadores de arranque y parada; unas cotas enlazan las distancias de histéresis con la consigna de ejemplo. El eje de temperatura ambiente está identificado y aumenta hacia la derecha. La nota inferior explica que entre arranque y parada continúa una solicitud existente; si no la había, no se inicia. Dentro de los límites se conserva la demanda anterior. La calefacción solicita suministro en el lado frío y la refrigeración en el caliente. El diagrama explica la demanda estimada, sin simular equipos ni retardos. Su consigna de ejemplo es 22 °C o 72 °F. Mientras un valor está vacío, incompleto o no es válido, un diagrama gris sin temperaturas conserva la altura hasta que vuelva a ser válido.

La **Histéresis de activación** es la diferencia de temperatura respecto al objetivo antes de solicitar calor o frío. La **Histéresis de desactivación** es la diferencia más allá del objetivo antes de terminar la solicitud. La **Histéresis simétrica** aplica la misma diferencia a cada lado del objetivo; no es el ancho total de banda. La **Histéresis personalizada** permite ajustar activación y desactivación por separado. Ambas aceptan cero; con ambas a cero, justo en el objetivo no hay demanda. Dentro de la banda tras reiniciar o cambiar objetivo o histéresis, no se supone una demanda nueva. Cambiar de comportamiento conserva las paradas personalizadas, que vuelven a aplicarse al regresar a **Histéresis personalizada**.

**Parar en la consigna** es el punto de partida recomendado para termostatos ordinarios. **Simétrica** e **Histéresis personalizada** son opciones avanzadas: el termostato puede cerrar la válvula o detener el compresor en la consigna antes de alcanzar el umbral de parada situado más allá. La fuente compartida podría seguir solicitada. Estos ajustes estiman la demanda; no cambian los límites del propio termostato ni fuerzan el caudal de calor.

Mantén separados los umbrales de suministros de calor y frío que compartan un termostato con intervalo. Una distancia de parada grande puede mantener la solicitud de calor mientras empieza la de frío o a la inversa. Los suministros agregan demanda de forma independiente; no proporcionan un interbloqueo entre salidas opuestas. Utiliza interbloqueos de equipo adecuados cuando sean necesarios.

Se solicita la fuente cuando al menos un termostato asociado tiene demanda válida. Un termostato apagado o con dirección HVAC incompatible no solicita suministro. Los datos de temperatura ausentes o no disponibles producen demanda desconocida; no conservan indefinidamente una solicitud anterior. Otras habitaciones válidas pueden seguir solicitando suministro. Sin habitaciones con demanda válida, se solicita el apagado tras el retardo configurado.

Se usan los objetivos actuales, incluidos los cambios manuales y los de Preacondicionamiento adaptativo o Regreso a casa. Pausar un horario no deshabilita el control del suministro. Un intervalo válido usa por defecto el límite inferior para calefacción y el superior para refrigeración. Para un intervalo fijo de Calor o Frío con **Consigna de referencia** en **Ajustes → Equipos y grupos**, se usa ese límite y la dirección del modo fijo. Un objetivo ambiguo no solicita suministro.

<a id="room-assist"></a>
## Room Assist

Un panel informativo azul al principio de **Demanda e histéresis**, antes del selector, explica la prioridad de Room Assist y cuándo se aplica la histéresis del suministro.

Cuando Room Assist controla la consigna activa de una habitación, el suministro sigue su intención de control ya confirmada. En calefacción fija, la fase `towards_upper` solicita calor; en refrigeración fija, `towards_lower` solicita frío. Sus límites de conmutación siguen siendo los que mandan: la histéresis del suministro y la excepción de habitación no se aplican por segunda vez. El control de intervalo nativo sigue su dirección confirmada. Un objetivo asistido no válido o pendiente es desconocido hasta disponer de una confirmación válida.

No se compara la consigna corregida del termostato con un sensor externo de habitación. Room Assist puede dejar de solicitar suministro aunque el termostato siga mostrando la misma consigna ajustada.

<a id="timing-and-manual-control"></a>
## Temporización y control manual

**Retardo de encendido** requiere demanda estimada continua antes de arrancar. Si desaparece o se vuelve desconocida, se reinicia la cuenta. Pertenece al suministro: una habitación puede dejar de solicitar mientras otra continúa sin reiniciarla. **Tiempo mínimo apagado** retrasa el arranque desde que se apaga el interruptor. Cuando aparece demanda, se espera el mayor de estos tiempos: el **tiempo mínimo apagado restante** o el **retardo de encendido completo**. No se suman.

Por ejemplo, con un mínimo apagado de 60 segundos y un retardo de encendido de 20:

- Si lleva un día apagado, la protección terminó: espera solo 20 segundos desde la demanda.
- Si aparece demanda justo después de apagarse, espera 60 segundos, el mayor de los tiempos.
- Si aparece 50 segundos después, quedan 10 de protección: espera 20 desde la demanda y permite arrancar a los 70 segundos del apagado.

La demanda debe mantenerse toda la espera. Estado en directo muestra el tiempo restante y si bloquea la confirmación de demanda o el mínimo apagado. Poner una opción a cero solo desactiva esa espera; la otra sigue aplicándose.

**Retardo de apagado** exige un periodo continuo sin demanda antes de apagar; su retorno cancela el retardo. Los tres ajustes aceptan segundos enteros de 0 a 86 400 y parten de cero. No hay tiempo mínimo encendido forzado que mantenga la fuente activa cuando las válvulas podrían haberse cerrado.

Renombrar un suministro o editar una distancia de parada que no se usa no reinicia su ciclo de demanda ni el retardo de apagado. Al habilitar de nuevo un suministro, se usa la última transición de apagado comunicada para respetar el tiempo mínimo apagado.

Apagar fuera de Velair el interruptor de un suministro habilitado suspende el control automático. Una notificación persistente de Home Assistant y una entrada de Actividad explican que se apagó fuera de Velair y seguirá en pausa hasta reanudar. El motivo también aparece junto a **Reanudar control automático** y en Estado en directo. Las temperaturas disponibles siguen visibles durante la pausa. Usa **Reanudar control automático** para evaluar de nuevo la demanda; reanudar no enciende necesariamente el suministro. Comienza un nuevo retardo de encendido cuando se confirma la demanda y sigue aplicándose el mínimo apagado. La suspensión se guarda entre reinicios. Guardar otros cambios no la elimina. Deshabilitar o eliminar solicita apagar la salida anterior.

Encender el interruptor fuera de Velair no anula el control automático. Si todos los termostatos asociados informan de ausencia de demanda, Velair lo apaga tras el retardo configurado. Si Home Assistant confirma que esa transición pertenece a la corrección de Velair, este crea una notificación persistente y una entrada de Actividad asociada al interruptor. El mensaje identifica el suministro, explica que se corrigió una activación externa porque el control automático no tenía demanda estimada de calefacción o refrigeración y enlaza a **Control de suministro** para revisar o deshabilitar el control. No supone que el cambio lo hiciera una persona.

Las correcciones repetidas del mismo suministro e interruptor se notifican como máximo una vez cada 15 minutos durante la ejecución actual de la integración. Reasignar el interruptor inicia un nuevo periodo. Los avisos de pausa usan una notificación y un límite de 15 minutos separados; una corrección reciente no oculta una pausa posterior. Un aviso de corrección posterior permitido sustituye solo al aviso de corrección anterior. Los fallos de entrega o la aceptación del servicio sin una transición de apagado correspondiente no generan un aviso de éxito. La demanda desconocida no se presenta como ausencia confirmada de demanda. Una integración de interruptor que no conserve el contexto de la orden no permite atribuir el cambio para este aviso. Estas reglas no cambian el control ni requieren sondeo. Los fallos de notificación y Actividad no interrumpen el control; Actividad requiere la integración de actividad/logbook de Home Assistant.

Un apagado manual más reciente tiene prioridad frente a un guardado o reanudación ya en curso. Reanuda expresamente otra vez si quieres recuperar el control tras ese apagado. La suspensión manual también permanece guardada durante la migración de unidades de temperatura y el reinicio.

Un interruptor no disponible o una orden fallida aparecen en el suministro. Los intentos de entrega están limitados y no se repiten con cada actualización de sensor. Que Home Assistant acepte una orden no demuestra que el equipo físico haya funcionado.

Los suministros importados quedan deshabilitados y suspendidos. Revisa salida y habitaciones, habilita el suministro, guarda y reanuda expresamente el control cuando corresponda.

<a id="preconditioning-master-and-performance"></a>
## Maestro de preacondicionamiento y rendimiento

El [Maestro de preacondicionamiento](adaptive-preconditioning.es.md#preconditioning-master) condiciona el inicio de preparación de las habitaciones dependientes. El suministro compartido sigue la demanda de las habitaciones. Una caldera controlada por válvulas TRV no necesita automáticamente un maestro; Velair no crea dependencias entre estos ajustes.

El controlador escucha las entidades configuradas y usa un único trabajador que agrupa actualizaciones y como máximo un temporizador por suministro. No hace sondeo, no guarda muestras de temperatura ni requiere un navegador abierto. Los cambios rutinarios de temperatura sin un cambio relevante del estado de control no difunden una instantánea completa nueva del panel.
