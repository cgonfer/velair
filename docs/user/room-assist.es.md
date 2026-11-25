<a id="room-assist"></a>

# Room Assist
<!-- velair-docs:start -->
Traducciones: [Original en inglés](room-assist.md) · [Español](room-assist.es.md) · [Français](room-assist.fr.md) · [Deutsch](room-assist.de.md) · [Italiano](room-assist.it.md) · [Nederlands](room-assist.nl.md) · [Polski](room-assist.pl.md) · [Português (Brasil)](room-assist.pt-br.md) · [Português (Portugal)](room-assist.pt-pt.md) · [Русский](room-assist.ru.md) · [Estado de las traducciones](../translation-status.md)

<details>
<summary>Estado de esta traducción</summary>

| Dato | Estado |
| --- | --- |
| Versión de referencia | 1.9.3-beta.5 |
| Última sincronización | 2026-11-25 |
| Revisión lingüística | Traducción asistida por IA |
| Respecto al original | Sin cambios pendientes respecto al original inglés. |

</details>

---
<!-- velair-docs:end -->

Room Assist permite a Velair utilizar un sensor de temperatura de la habitación independiente del equipo gestionado, manteniendo el control sobre la entidad real `climate.*`.

Con un bloque **Solo temperatura**, Room Assist queda suspendido mientras el equipo está apagado. No lo enciende ni restaura un modo HVAC anterior al retirar su corrección previa. Después de un encendido externo, puede asistir usando el modo compatible real sin solicitar un cambio de modo. Actualizar el objetivo programado mientras está apagado sigue dependiendo de la integración del equipo.

Resulta útil para válvulas termostáticas, válvulas de radiador, termostatos de pared o aires acondicionados cuya lectura integrada no representa la temperatura real de la habitación. Por ejemplo, una válvula junto a un radiador puede indicar `22 °C` mientras el sensor de habitación sigue indicando `20.5 °C`.

Todos los cálculos utilizan la unidad de temperatura que Home Assistant asigna a la entidad gestionada. Los ejemplos siguientes usan Celsius para facilitar la lectura, pero los mismos límites de histéresis, corrección con signo, protección del objetivo programado, anchura del intervalo, paso de temperatura y límites físicos se aplican directamente en Fahrenheit. Por ejemplo, una desviación de `4 °F` en la temperatura de la habitación supone una corrección de `4 °F`; no se trata como temperatura absoluta ni se le añade la constante de conversión de Celsius a Fahrenheit.

Room Assist funciona localmente y mediante eventos. Velair no realiza sondeo continuo ni envía datos de sensores fuera de Home Assistant.

<a id="what-it-does"></a>

## Qué hace

Velair conserva el objetivo programado como objetivo real del usuario, pero ajusta temporalmente el objetivo enviado a la entidad de climatización a partir del sensor externo de habitación y la lectura propia del equipo.

Para un objetivo único en `heat` o `cool` fijos, una banda muerta distinta de cero crea dos límites de conmutación. Con el frenado **Predeterminado**, Room Assist recuerda hacia qué límite avanza y solo cambia de dirección cuando el sensor externo alcanza el límite opuesto. Así crea un ciclo real de histéresis basado en el sensor externo, en lugar de permitir que el sensor interno del equipo inicie otro ciclo cerca del objetivo central. El Ajuste máximo de control limita la corrección con signo calculada desde el límite activo. Los niveles opcionales de frenado retiran la demanda con más firmeza; **Alto** empieza a retirarla en el objetivo programado, en vez de esperar al límite de conmutación más alejado.

Los objetivos únicos `auto` y `heat_cool` y los intervalos nativos `heat_cool` conservan su comportamiento neutro o de margen del intervalo. Velair no obliga a esos modos a alternar entre calefacción y refrigeración activas mediante un ciclo de histéresis de temperatura única.

La entidad de climatización sigue siendo el actuador. Velair no crea una entidad virtual ni evita el firmware del dispositivo. Si tu termostato o válvula permite vincular directamente un sensor externo, esa opción nativa suele seguir siendo la mejor primera elección.

Para dos consignas en `heat` o `cool` fijo, selecciona primero **Consigna de referencia** para ese equipo y modo en **Ajustes → Equipos y grupos**. Elige **Consigna inferior** o **Consigna superior** según el valor que use realmente tu equipo; Velair no lo deduce de su capacidad de intervalos. El Preacondicionamiento adaptativo comparte esta selección.

Room Assist utiliza el límite elegido como objetivo fijo de calefacción o refrigeración, incluidos el ciclo de histéresis de una consigna y la protección del objetivo programado. Mueve ambas consignas la misma cantidad, conservando su separación. Las dos deben ajustarse al paso y a los límites físicos del equipo, por lo que el otro límite puede restringir la corrección disponible. La información sobre límites físicos sigue disponible en el gráfico y en **Datos técnicos**.

Con **Sin configurar**, los pares de modo fijo se envían sin cambios ni corrección de Room Assist. Los intervalos en `auto` siguen sin admitir asistencia; las bandas nativas `heat_cool` conservan su comportamiento. Se mantienen los ajustes guardados. Cambiar referencia o modo elimina la asistencia obsoleta sin restaurar un objetivo corregido antiguo sobre la nueva intención.

<a id="setup"></a>

## Configuración

1. Abre la pestaña Room Assist.
2. Expande el equipo que quieras configurar.
3. En **Control por sensor de estancia**, elige **Sensor fijo** o **Por horario**, configura la opción elegida y guarda cualquier cambio de modalidad.
4. Activa Control por sensor de estancia.
5. Ajusta la banda muerta de Room Assist para definir los límites inferior y superior de conmutación en calor o frío fijo alrededor de su objetivo único o referencia de intervalo elegida, o el margen neutro para modos automáticos de una consigna y bandas nativas `heat_cool`.
6. Modifica Ajuste máximo de control si el valor predeterminado es insuficiente para esa habitación o menor que la diferencia de consigna que el termostato puede necesitar para dejar de calentar o enfriar.
7. Opcionalmente, elige **Frenado: Moderado** o **Alto** para retirar la demanda con más firmeza. Estos niveles requieren una banda muerta de Room Assist mayor que cero. **Predeterminado** conserva el comportamiento existente.
8. Opcionalmente, configura **Margen mínimo de control** si las correcciones pequeñas no hacen responder al termostato. Aumenta primero el Ajuste máximo de control si hace falta; el margen no puede superarlo. Déjalo en `0` para conservar el comportamiento existente.
9. Ajusta Retraso de actualización si las actualizaciones de sensores parecen demasiado lentas o frecuentes.

Solo se muestra la opción seleccionada. Si **Sensor fijo** ya es la modalidad guardada, cambiar su sensor se guarda inmediatamente. Alternar entre **Sensor fijo** y **Por horario** cambia un borrador: **Guardar** aplica la modalidad y sus ajustes, y **Cancelar** restaura la configuración guardada. Al alternar se conservan el sensor fijo y la programación guardada; no se activan ambos a la vez.


<a id="optional-braking"></a>

### Frenado opcional

El frenado modifica la consigna enviada al equipo y conserva la temperatura programada como objetivo real de la habitación. Está disponible en **Calor** y **Frío** fijos, incluidos los equipos de dos consignas con una consigna de referencia configurada. No modifica los modos automáticos de consigna única ni las bandas nativas `heat_cool`.

**T** es el objetivo programado, **H** la banda muerta de Room Assist y **S** el paso efectivo de consigna del equipo:

| Frenado | Calefacción: retirar demanda | Calefacción: volver a pedir calor | Refrigeración: retirar demanda | Refrigeración: volver a pedir frío |
| --- | --- | --- | --- | --- |
| Predeterminado | Comportamiento existente | Comportamiento existente | Comportamiento existente | Comportamiento existente |
| Moderado | A T + H | A T − H | A T − H | A T + H |
| Alto | A T | A T − H | A T | A T + H |

Durante la retirada de demanda, **Moderado** limita la consigna de calefacción a un máximo de **T − S**, o la de refrigeración a un mínimo de **T + S**. **Alto** utiliza **dos pasos** por defecto. Si el cálculo existente ya retira más demanda, Velair conserva ese resultado más intenso. Son límites fijos mientras el frenado está activo: las actualizaciones del sensor no restan ni suman otro paso cada vez.

Para cambiar la intensidad de Alto en una zona, abre **Ajustes → Equipos y grupos** y configura **Pasos de frenado Alto** para ese equipo o grupo. El ajuste acepta números enteros de `2` a `10` y muestra la diferencia de temperatura equivalente según el paso efectivo de consigna del equipo y su unidad actual. Se guarda de forma independiente por zona y solo se aplica al seleccionar **Alto** en Room Assist. **Predeterminado** y **Moderado** no utilizan este ajuste.

Por ejemplo, `3` pasos de `0.5 °C` equivalen a una diferencia de `1.5 °C`. Tres pasos de `1 °F` equivalen a `3 °F`. El número de pasos no es una temperatura y no cambia al convertir entre Celsius y Fahrenheit; la diferencia equivalente sigue el paso efectivo del equipo. Room Assist conserva su selector y muestra el número configurado y la diferencia equivalente.

Por ejemplo, con un objetivo de calefacción de `20.5 °C`, una banda muerta de `0.5 °C` y un paso del equipo de `0.5 °C`:

- **Moderado** retira demanda a `21 °C`, con una consigna del equipo no superior a `20 °C`.
- **Alto**, con sus dos pasos predeterminados, retira demanda a `20.5 °C`, con una consigna del equipo no superior a `19.5 °C`.
- Con **Pasos de frenado Alto** en `3`, Alto sigue retirando demanda a `20.5 °C`, pero la consigna del equipo no supera `19 °C`.
- Ambos vuelven a pedir calor cuando el sensor externo alcanza `20 °C`.

Cambiar el número de pasos de Alto modifica el límite de consigna, no las temperaturas de retirada o reactivación. En refrigeración, el límite correspondiente se sitúa por encima del objetivo programado en lugar de por debajo. Es un ajuste fijo: no aumenta progresivamente mientras la habitación permanece fuera de la banda.

Antes de retirar demanda, el cálculo de asistencia existente no cambia. El frenado permanece activo hasta alcanzar el límite de reactivación, incluso al cruzar el objetivo central. Si la asistencia se inicia o reinicia con la habitación dentro de su banda, conserva la inicialización prudente existente sin iniciar deliberadamente un ciclo de climatización.

El estado actual muestra las temperaturas efectivas de retirada y reactivación. El gráfico mantiene visible la banda muerta nominal y distingue los umbrales efectivos de frenado. La demanda del suministro compartido sigue la misma fase confirmada.

Elige **Predeterminado** antes de poner la banda muerta a cero. El nivel guardado se conserva si el modo o la referencia de temperatura actuales no permiten usarlo, y el estado explica por qué el frenado adicional está inactivo. Las combinaciones guardadas inválidas suspenden el frenado adicional sin modificar silenciosamente la banda muerta.

Las consignas físicas mínima y máxima pueden limitar el frenado disponible. Con dos consignas se mueve el par completo y cualquiera de sus límites puede restringir el desplazamiento. **Datos técnicos** distingue el resultado solicitado y el aplicado, y el gráfico identifica el límite alcanzado.

El frenado reduce la demanda de calor o frío; no confirma que la válvula, el compresor o el termostato se hayan detenido. El control del equipo, sus tiempos mínimos de funcionamiento y la inercia térmica pueden seguir causando sobrepasos. Este ajuste no aprende ciclos ni retira demanda antes del objetivo programado. Valídalo con ciclos reales de calefacción y refrigeración antes de confiar en un nivel para una habitación concreta.

Las exportaciones portables utilizan el modelo **30** para conservar el número de pasos de frenado Alto, el nivel de frenado, las compensaciones de preparación y el margen mínimo de control. Las importaciones antiguas compatibles sin un número de pasos de Alto utilizan `2`. Guarda una copia de la versión anterior si necesitas volver a ella; las versiones antiguas de Velair no pueden importar archivos del modelo 30.

<a id="minimum-control-margin"></a>

### Margen mínimo de control

Algunos termostatos necesitan una diferencia considerable entre su temperatura interna y la consigna solicitada antes de responder. Un sensor montado en un radiador puede marcar varios grados más que la habitación mientras el sensor externo sigue pidiendo calor. **Margen mínimo de control** solicita al menos esa diferencia durante una corrección de Room Assist en la que se pueda aplicar. Es opcional y su valor predeterminado es `0`.

Estos ajustes tienen funciones distintas:

| Ajuste | Función |
| --- | --- |
| Banda de control de Room Assist | Determina la banda de conmutación o neutra del sensor externo de la habitación. |
| Margen mínimo de control | Refuerza una corrección aplicable respecto a la lectura interna del termostato. |
| Ajuste máximo de control | Limita esa corrección; aumentar solo el máximo no solicita una corrección mayor. |
| Frenado | Cambia los umbrales de retirada de demanda y añade una protección de la consigna programada. |

El margen admite `0–10 °C` (`0–18 °F`) y no puede superar el Ajuste máximo de control. Si los ajustes son incompatibles, Velair pide aumentar primero el máximo o reducir el margen. No modifica ninguno automáticamente. Los incrementos del campo siguen el paso efectivo de consigna del equipo.

Por ejemplo, configura un objetivo de calefacción de `19.5 °C`, una banda de control de `±0.3 °C`, frenado **Predeterminado** y tanto el margen como el máximo en `10 °C`. Con una lectura interna de `21.5 °C` y un paso de consigna compatible de `0.5 °C`:

| Sensor externo de la habitación | Fase de Room Assist | Consigna solicitada al equipo |
| --- | --- | --- |
| En `19.2 °C` o por debajo | Pedir calor hacia `19.8 °C` | `31.5 °C`: lectura interna + 10 |
| Sube por la banda | Seguir pidiendo calor | Lectura interna actual + 10 |
| Alcanza `19.8 °C` | Retirar la demanda de calor hasta `19.2 °C` | `11.5 °C`: lectura interna − 10 |

La lectura interna puede cambiar, por lo que las solicitudes posteriores usan su valor actual. El objetivo de la habitación sigue siendo `19.5 °C`; las consignas elevadas o reducidas del equipo no amplían la banda de confort. El frenado Moderado o Alto conserva sus propios umbrales de parada y reanudación, y mantiene un resultado existente que retire más demanda.

La refrigeración fija funciona en sentido contrario. Con un objetivo de `24 °C`, banda de `±0.3 °C`, lectura interna de `26 °C` y margen/máximo de `10 °C`, Room Assist solicita `16 °C` mientras se necesita refrigeración y `36 °C` cuando la habitación alcanza `23.7 °C`, antes de aplicar los límites del dispositivo. La refrigeración se reanuda en `24.3 °C`. Con banda cero y sin fase retenida, solo se refuerzan correcciones no nulas; la igualdad permanece neutra.

Los modos automáticos de consigna única y los rangos nativos **Calor/frío** solo refuerzan las solicitudes activas de calefacción o refrigeración. Dentro de la banda neutra de la habitación conservan el mantenimiento existente. Bajar mucho la consigna para detener la calefacción podría, de otro modo, iniciar refrigeración en un equipo bidireccional. En los rangos nativos, ambos límites se desplazan juntos y conservan su separación original. Los pares de modo fijo usan la consigna de referencia configurada; las configuraciones de rango no compatibles siguen sin ser compatibles.

El paso y los límites físicos del equipo pueden impedir alcanzar el margen solicitado. Por ejemplo, con lectura interna de `21.7 °C`, margen/máximo de `10 °C` y una rejilla de `0.5 °C`, no existe una consigna válida exactamente a `10 °C` de distancia. Velair elige una corrección válida dentro del máximo cuando es posible e indica que el paso limita el margen. Con dos consignas, conservar la anchura del rango puede restringir aún más el movimiento. La explicación en directo y **Datos técnicos** identifican un margen activo o limitado.

La protección de la consigna programada, el frenado y las compensaciones temporales de preparación pueden producir un desplazamiento final mayor que el Ajuste máximo de control. Ese ajuste limita la corrección de Room Assist, no cada protección o incremento temporal posterior. Durante la preparación, el margen sigue su dirección actual antes de añadir la compensación.

Esta función solicita una diferencia de consigna. No confirma la apertura física de la válvula, el funcionamiento del compresor ni una parada inmediata. Utiliza el menor margen que funcione con tu equipo y comprueba ciclos reales completos de calefacción o refrigeración.

<a id="optional-sensor-schedule-beta"></a>

### Programación opcional de sensores (beta)

Room Assist puede utilizar distintas referencias de temperatura durante la semana sin cambiar tus programaciones de temperatura, perfiles ni modos. Elige **Por horario** en **Control por sensor de estancia** para configurarlas. Elige **Sensor fijo** para volver al sensor de estancia fijo.

Elige una referencia predeterminada y añade franjas con días de la semana, horas de inicio y fin y una referencia. Guarda el borrador completo para aplicarlo; Cancelar descarta las ediciones. Las referencias pueden ser sensores de temperatura disponibles en Home Assistant o la temperatura propia del equipo. Fuera de las franjas se aplica la referencia predeterminada. Las franjas pueden cruzar medianoche y pertenecen a los días de inicio seleccionados; se rechazan los solapamientos. La hora de inicio está incluida y la de fin queda excluida. Se utiliza la zona horaria configurada en Home Assistant.

Por ejemplo, elige **Sin corrección de Room Assist** como referencia predeterminada y un sensor del despacho de 08:00 a 17:00, de lunes a viernes. Tus programaciones de temperatura de verano/invierno siguen determinando la temperatura deseada. Durante la jornada laboral, Room Assist calcula las correcciones con el sensor del despacho. Fuera de ese horario, Velair envía la consigna programada normal y el termostato regula con su propia referencia. Esto no cambia el sensor físico que utiliza internamente el firmware del dispositivo.

El único interruptor de Room Assist controla si la asistencia está activada. Apagarlo conserva ambas configuraciones guardadas. Elegir **Sensor fijo** y guardar recupera el sensor de estancia fijo conservado. Si una referencia externa no está disponible, Velair suspende su corrección y utiliza la consigna programada normal cuando tiene el control automático; no elige otra habitación silenciosamente ni reutiliza una lectura antigua. La asistencia se reanuda cuando esa referencia vuelve a ser utilizable.

Los cambios de referencia no quitan el control al ajuste manual, Refuerzo ni las pausas. Cuando se reanuda el control automático, Velair utiliza la referencia válida en ese momento. En los grupos de habitación, la temperatura propia del equipo corresponde a la referencia de temperatura configurada para el grupo.

**Limitación de la beta:** la referencia cambia a su hora exacta programada. El Preacondicionamiento adaptativo no inicia un objetivo anticipado que atraviese un cambio de referencia; vuelve a calcular después de esa transición. Cambiar de habitación no es una solicitud para preparar antes la siguiente habitación. Las observaciones de aprendizaje se relacionan con su fuente de temperatura para que un salto de lectura entre habitaciones no se interprete como calefacción o refrigeración.

Todas las lecturas externas seleccionadas deben estar disponibles de forma independiente en Home Assistant. En Nest, una configuración que utilice la integración oficial para el termostato y otra integración para un sensor remoto necesita pruebas en la instalación. Mantén fija la referencia propia de Nest si pretendes usar la lectura del termostato como referencia estable de una habitación. Velair no selecciona el sensor activo interno de Nest. Un sistema HVAC compartido sigue afectando a todas las habitaciones que abastece; elegir una referencia no crea zonas físicas independientes.

<a id="room-groups"></a>
### Grupos de habitación

Elige el grupo en Room Assist y usa los mismos controles de sensor, habilitación, banda muerta, corrección máxima y actualización. La temperatura propia del grupo procede del miembro elegido en **Grupos de habitación → Referencia de temperatura**; el sensor externo opcional se configura aquí. Deshabilitar o quitar Room Assist devuelve la medición efectiva a ese miembro.

El grupo tiene una configuración y una corrección compartidas, no un controlador independiente por miembro. Velair conserva el objetivo programado y envía la orden asistida según el modo de envío del grupo: todos los miembros por defecto, o el destinatario explícito cuando la instalación ya propaga las órdenes. Las comprobaciones de capacidades, paso y límites se aplican a los destinatarios reales. Los miembros siguen visibles individualmente en Resumen.

Room Sensor Assist no requiere Preacondicionamiento adaptativo. Puede funcionar con bloques programados normales y con bloques que el Preacondicionamiento adaptativo haya iniciado antes.

Un bloque de temperatura con **Mantener modo actual** sigue aplicando su objetivo programado. Room Assist utiliza el modo en el que funciona realmente el equipo; si está apagado, Velair lo inicia en un modo compatible. **Mantener modo actual** no significa «mantener la consigna del termostato sin cambios» en un bloque de temperatura. Un bloque de solo opciones no tiene objetivo, por lo que Room Assist no actúa en él.

Retraso de actualización es la espera que agrupa los cambios de temperatura del sensor de habitación o del equipo antes de recalcular. El valor predeterminado es `20` segundos. Configúralo en `0` para recalcular inmediatamente, o hasta `300` segundos para agrupar actualizaciones frecuentes.

La banda muerta de Room Assist es independiente de la diferencia mínima del Preacondicionamiento adaptativo. Su valor predeterminado es `0.3 °C` o `1 °F`, acepta `0` para desactivarla y puede configurarse en pasos de `0.1` grados hasta `5 °C` o `9 °F`. Guardarla mientras Room Assist está activo actualiza inmediatamente el objetivo asistido.

El gráfico actual dibuja la banda muerta nominal como una franja fina rayada inmediatamente encima del eje de temperatura, con una leyenda correspondiente debajo. Los umbrales efectivos de parada y reanudación proceden del estado de control confirmado, por lo que **Alto** puede detener la demanda en el objetivo mientras sigue visible toda la franja nominal. En los modos automáticos de temperatura única representa el margen neutro. Los intervalos nativos `heat_cool` rayan solo los márgenes exteriores junto a la banda nominal, con una leyenda **Margen exterior**. Una banda muerta cero no dibuja zona rayada; la leyenda muestra el margen cero configurado. Estos indicadores describen límites configurados, no el movimiento del sensor. Ocultar `show_room_assist_deadband` en una tarjeta Lovelace de Room Assist oculta juntos el ajuste, la franja y la leyenda.

Al actualizar desde una versión en la que Room Assist compartía la diferencia mínima del Preacondicionamiento adaptativo, Velair copia una sola vez el valor existente a la nueva banda muerta de Room Assist. Conserva así la anchura configurada previamente, incluido un valor histórico que no se ajuste al nuevo incremento de entrada de 0.1 grados; `heat` y `cool` fijos utilizan entonces ese valor con el ciclo de histéresis descrito abajo. Tras migrar, ambos ajustes son independientes: cambiar uno nunca cambia el otro. Una zona nueva o restablecida utiliza el valor predeterminado correspondiente a la unidad indicado arriba.

<a id="understanding-the-live-status"></a>

## Entender el estado actual

La pestaña Room Assist indica qué puede hacer Velair actualmente para cada equipo gestionado, para que no tengas que deducirlo a partir de la consigna del termostato:

| Estado | Significado |
| --- | --- |
| **Sin configurar** | No se ha seleccionado un sensor externo de habitación. |
| **Desactivado** | Hay un sensor guardado, pero Room Assist está desactivado. |
| **En espera** | Room Assist está activado, pero no hay un bloque de temperatura activo compatible o todavía no hay un cálculo utilizable. |
| **Listo** | Velair tiene las lecturas y el objetivo necesarios para calcular la asistencia, pero aún no ha aplicado un objetivo asistido. |
| **Ajustando** | Velair ha aplicado un objetivo corregido temporal o un intervalo desplazado. |
| **Manteniendo** | Room Assist mantiene neutro un objetivo único automático, mantiene un intervalo nativo `heat_cool` o la protección programada conserva un objetivo del lado seguro. Un ciclo fijo `heat` o `cool` puede permanecer **Ajustando** mientras recorre la banda muerta. |
| **Bloqueado** | Una pausa, Refuerzo, estado Manual u otro estado del programador tiene prioridad sobre Room Assist. |
| **No disponible** | No puede utilizarse actualmente el equipo gestionado o la capacidad de objetivo necesaria. La interfaz muestra el motivo cuando se conoce. |

Cuando Room Assist está activo, Resumen condensa esta información en **Hacia el límite inferior**, **Hacia el límite superior**, **Activo**, **Manteniendo** o **Protección de consigna**, según corresponda, y muestra los valores programados y aplicados. El mínimo o máximo del termostato es distinto de la protección programada: el gráfico etiqueta el límite físico alcanzado, **Datos técnicos** separa los valores solicitados y aplicados, y Home Assistant recibe una notificación persistente hasta que deja de alcanzarse ese límite físico.

<a id="fixed-heating-hysteresis-example"></a>

## Ejemplo de histéresis de calefacción fija

Escenario con frenado **Predeterminado**:

- Bloque programado: `21 °C`, `heat`
- Banda muerta de Room Assist: `±0.3 °C`
- Límite inferior: `20.7 °C`
- Límite superior: `21.3 °C`
- Ajuste máximo de control: `2 °C`
- Paso de temperatura del equipo: `0.1 °C`

El ciclo funciona paso a paso:

1. Los sensores de habitación y del equipo indican `21.0 °C`. Al ser un nuevo ciclo de calefacción fija dentro de la banda, Velair comienza de forma segura **hacia el límite inferior**.
2. El objetivo activo de histéresis es `20.7 °C`. La corrección se calcula desde ese borde, no desde los `21 °C` centrales del horario:

   ```text
   correction = 20.7 - 21.0 = -0.3 °C
   climate target = 21.0 + (-0.3) = 20.7 °C
   ```

   Es un objetivo de calefacción pensado para no solicitar calor, sujeto al paso compatible y los límites físicos del equipo.
3. Si la habitación pasa por `20.9 °C`, Velair mantiene la fase. No solicita calor simplemente por cruzar los `21 °C` centrales del horario.
4. Cuando el sensor externo alcanza `20.7 °C`, Velair cambia **hacia el límite superior** de `21.3 °C`.
5. Supón que la habitación está a `20.7 °C` y el sensor del equipo a `20.5 °C`. La nueva corrección solicita calor:

   ```text
   correction = 21.3 - 20.7 = +0.6 °C
   climate target = 20.5 + 0.6 = 21.1 °C
   ```

6. Velair sigue apuntando al límite superior mientras la habitación pasa por `21.0 °C`. A `21.3 °C`, vuelve hacia `20.7 °C`, aplica una corrección negativa y repite el ciclo.

El objetivo visible del horario permanece en `21 °C`. El objetivo temporal es solo el valor enviado al termostato. Si la corrección calculada supera el Ajuste máximo de control, Velair la limita antes de sumarla a la lectura actual del equipo.

La fase de modo fijo solo existe durante la ejecución. Se inicia otro ciclo al cambiar el bloque, objetivo o modo HVAC, limpiar Room Assist o recargar Velair. Si un ciclo nuevo `heat` comienza con la habitación dentro de la banda, avanza hacia el límite inferior para no solicitar calor inmediatamente.

Cuando esta protección cambia el resultado, el estado actual de Room Assist explica ambos valores. Identifica el objetivo calculado y el conservado realmente por Velair, y Resumen muestra el estado compacto `Protección de consigna`. Es un comportamiento de protección normal, no un error del termostato, por lo que no crea una notificación persistente de Home Assistant. Los límites físicos del termostato siguen identificados en el gráfico y en **Datos técnicos**, con su notificación independiente.

El dispositivo sigue siendo responsable de la protección del compresor, los tiempos mínimos de funcionamiento y su respuesta física. El ciclo de histéresis da a Velair una estrategia de consignas más firme, pero no garantiza el instante exacto en que cambie de estado el relé, válvula o compresor.

<a id="heating-with-a-capped-delta"></a>

## Calefacción con una diferencia limitada

Situación:

- Bloque programado: `25 °C`, `heat`
- Sensor de habitación: `18 °C`
- Temperatura actual del equipo: `17.1 °C`
- Banda muerta de Room Assist: `0 °C` (corrección con signo anterior)
- Ajuste máximo de control: `5 °C`

La diferencia real de la habitación es grande:

```text
25 - 18 = 7 °C
```

Velair limita la diferencia de asistencia al máximo configurado:

```text
assist delta = 5 °C
climate target = 17.1 + 5 = 22.1 °C
```

Con un paso de `0.5 °C`, el objetivo de calefacción se redondea hacia abajo a `22 °C`.

Esto evita que Room Assist envíe objetivos poco realistas al termostato, manteniendo una demanda suficiente para calentar la habitación.

<a id="fixed-cooling-hysteresis-example"></a>

## Ejemplo de histéresis de refrigeración fija

Escenario con frenado **Predeterminado**:

- Bloque programado: `24 °C`, `cool`
- Banda muerta de Room Assist: `±0.5 °C`
- Límite inferior: `23.5 °C`
- Límite superior: `24.5 °C`
- Ajuste máximo de control: `2 °C`
- Paso de temperatura del equipo: `0.5 °C`

La refrigeración es simétrica, pero un ciclo nuevo dentro de la banda comienza de forma segura **hacia el límite superior** para no solicitar refrigeración inmediatamente:

1. Con ambos sensores a `24.0 °C`, el borde activo es `24.5 °C`:

   ```text
   correction = 24.5 - 24.0 = +0.5 °C
   climate target = 24.0 + 0.5 = 24.5 °C
   ```

   Aumentar el objetivo de refrigeración fija reduce la demanda de refrigeración.
2. La fase no cambia mientras la habitación recorre la banda. Cuando el sensor externo alcanza `24.5 °C`, Velair pasa a dirigirse hacia `23.5 °C`.
3. Si la habitación está entonces a `24.5 °C` y el sensor del equipo indica `25.0 °C`:

   ```text
   correction = 23.5 - 24.5 = -1.0 °C
   climate target = 25.0 - 1.0 = 24.0 °C
   ```

   Esto solicita refrigeración.
4. Velair sigue apuntando al borde inferior mientras la habitación pasa por `24.0 °C`. A `23.5 °C`, vuelve hacia `24.5 °C` y repite el ciclo.

El ajuste al paso de temperatura y los límites físicos siguen aplicándose a cada objetivo temporal. El firmware del dispositivo sigue controlando el ciclo real de refrigeración.

<a id="how-legacy-inversion-and-scheduled-protection-work-together"></a>

## Cómo actúan juntas la inversión anterior y la protección programada

La inversión con signo y la protección del objetivo programado resuelven dos aspectos distintos del mismo problema de control. La inversión cambia la dirección de la corrección cuando la habitación cruza el objetivo. La protección programada es el límite final de seguridad cuando esa corrección inversa aún deja el objetivo de un modo fijo en el lado que solicita climatización respecto al horario.

Los ejemplos de refrigeración siguientes utilizan un horario de `22 °C`, una banda muerta de `0 °C`, un paso de temperatura de `0.5 °C` y un Ajuste máximo de control suficiente para no limitar el cálculo. Las columnas «sin inversión» y «antes de la protección» son valores intermedios explicativos; no son modos seleccionables de Room Assist.

| Habitación externa | Lectura del equipo | Sin inversión tras cruzar el objetivo | Resultado con signo antes de la protección | Objetivo final | Motivo |
| --- | --- | --- | --- | --- | --- |
| `24 °C` | `25.1 °C` | No aplicable | `23.5 °C` | `23.5 °C` | La habitación sigue necesitando refrigeración. |
| `21 °C` | `19 °C` | `19 °C` | `20 °C` | `22 °C` | La inversión eleva el objetivo, pero aún solicitaría refrigeración; se aplica el límite inferior programado. |
| `21 °C` | `25 °C` | `25 °C` | `26 °C` | `26 °C` | El objetivo inverso mayor ya está de forma segura por encima del horario, por lo que se conserva. |

La calefacción es simétrica. Con un horario de calefacción de `20 °C`, una lectura externa de `21 °C` y una interna de `24 °C`, el resultado con signo es `23 °C`; la protección aplica en su lugar el límite superior programado de `20 °C`. Si la habitación externa está a `24 °C` y la lectura interna es `21.5 °C`, el resultado inverso más intenso es `17.5 °C`, que ya es seguro y permanece sin cambios.

Por eso la inversión sigue siendo útil incluso con protección programada: puede alejar el objetivo del lado que solicita climatización cuando la lectura del equipo lo permite, mientras la protección cubre los casos en que la lectura interna ha pasado al lado incorrecto.

Con banda muerta distinta de cero, `heat` y `cool` fijos utilizan el ciclo con fase recordada descrito arriba, en lugar de cambiar de dirección en el objetivo central. Una banda muerta de `0` conserva el cálculo con signo anterior: la corrección cambia de signo al cruzar el objetivo programado y no se mantiene una fase de histéresis.

Un objetivo único compatible `auto` o `heat_cool` también conserva el cálculo con signo anterior. Dentro de su banda muerta, Velair utiliza el objetivo compatible más cercano a la lectura del equipo, en lugar de obligarlo a alternar activamente entre calefacción y refrigeración. Un equipo nativo `heat_cool` conserva ambos límites del usuario y recibe el intervalo asistido completo descrito abajo.

<a id="device-hysteresis-and-minimum-run-time"></a>

## Histéresis del dispositivo y tiempo mínimo de funcionamiento

Room Assist controla el objetivo enviado mediante Home Assistant. No puede sustituir la histéresis del firmware, la protección del compresor, el tiempo mínimo de funcionamiento ni la decisión del termostato sobre cuándo una consigna igual a su lectura se considera reposo.

Por ejemplo, un ciclo de calefacción fija que avanza hacia el límite inferior envía un objetivo pensado para reducir la demanda de calefacción hasta que el sensor externo alcance ese borde. Un dispositivo con histéresis interna amplia o tiempo mínimo de funcionamiento puede empezar o seguir calentando temporalmente. Velair no deduce un margen de parada específico sin documentar ni inspecciona `hvac_action` para cambiar su fase.

La protección programada evita que Velair desplace el objetivo al otro lado de la consigna del usuario al variar el sensor interno; no promete una parada inmediata de la climatización. Vincular un sensor externo o calibrarlo directamente en el dispositivo sigue siendo la mejor opción cuando está disponible. Utiliza un bloque `Off` cuando necesites una parada explícita, en lugar de un mantenimiento controlado por el termostato.

El Ajuste máximo de control debe permitir la corrección inversa que pueda necesitar el dispositivo. El editor de Room Assist mantiene esta orientación visible debajo del nombre del ajuste para que no pase inadvertida al configurar. Por ejemplo:

```text
Thermostat stopping gap: 2.5 °C
Maximum assist delta:    2.0 °C  -> may be insufficient
Maximum assist delta:    3.0 °C  -> permits enough inverse correction
```

Con Margen mínimo de control en `0`, configurar `3 °C` no aplica inmediatamente una corrección de `3 °C`. Solo permite que Room Assist alcance ese valor cuando la diferencia de la habitación externa lo requiera.

Este ajuste limita la corrección proporcional, no la consigna final después de proteger el objetivo programado. El frenado opcional refuerza esa protección con su límite de uno o dos pasos; no cambia el Ajuste máximo de control ni aplica todo el máximo en cada actualización. Un [Margen mínimo de control](#minimum-control-margin) distinto de cero puede solicitar una corrección mayor incluso cuando la diferencia de temperatura externa es pequeña.

<a id="why-climate-target-can-differ-from-the-calculation"></a>

### Por qué la Consigna del termostato puede diferir del cálculo

**Consigna** es el objetivo que comunica actualmente la entidad cuando Room Assist está listo o bloqueado. Mientras está ajustando o manteniendo un objetivo único aplicado, muestra en cambio la consigna temporal enviada por Velair. Ninguno de esos valores es el objetivo programado de habitación ni el límite activo de histéresis. Un equipo acepta objetivos según sus propios incrementos, por lo que Velair puede necesitar ajustar la consigna final al paso efectivo publicado, último comunicado, manual o predeterminado.

Por ejemplo, en refrigeración fija, Room Assist puede calcular `23.9 °C` para un equipo que acepta pasos de `0.5 °C`. Velair aplica `24.0 °C`: la refrigeración se ajusta hacia arriba para no enfriar más de lo calculado. La calefacción fija se ajusta hacia abajo y los modos automáticos de temperatura única utilizan el paso más cercano. Expande la etiqueta **Consigna** o abre **Datos técnicos** para consultar el valor mostrado y cualquier información disponible sobre el cálculo, el paso efectivo y el valor aplicado. Si la alineación cambió la consigna confirmada, **Datos técnicos** también muestra el valor anterior a la alineación al paso. Los límites físicos mínimo o máximo y la protección del objetivo programado se indican por separado y no se describen como alineación al paso.

<a id="heatcool-range-example"></a>

## Ejemplo de intervalo de calefacción/refrigeración

Room Assist también admite intervalos nativos `heat_cool`. Trata los objetivos inferior y superior como una única banda de confort y siempre los desplaza juntos, por lo que su separación nunca cambia.

Situación:

- Intervalo programado: `19–24 °C`
- Sensor de habitación: `18 °C`
- Temperatura actual del equipo: `22 °C`
- Ajuste máximo de control: `2 °C`
- Paso de temperatura del equipo: `0.5 °C`

La habitación está `1 °C` por debajo del límite de calefacción. Velair coloca el límite inferior `1 °C` por encima de la lectura del equipo y desplaza el superior la misma cantidad:

```text
applied range = 23–28 °C
```

El equipo indica `22 °C`, por debajo del límite inferior aplicado, y puede solicitar calor. Si la habitación supera después `24 °C`, Velair utiliza el límite superior del mismo modo para solicitar refrigeración. Cuando la habitación entra por primera vez en la banda programada, incluida la banda muerta configurada alrededor de sus límites, Velair coloca la banda aplicada de forma que la lectura del equipo quede dentro. Después mantiene estable esa banda mientras la habitación externa permanezca dentro. No sigue los cambios posteriores del sensor interno, porque esa lectura puede variar precisamente cuando funcionan el compresor, ventilador, válvula o radiador.

El intervalo aplicado siempre se ajusta al paso del equipo y se desplaza como conjunto al alcanzar los límites físicos del objetivo. Velair nunca ajusta Mínimo y Máximo independientemente.

Si un objetivo único o intervalo calculado supera el mínimo o máximo compatible del termostato, Velair aplica el resultado válido más cercano. El gráfico etiqueta el límite alcanzado; **Datos técnicos** muestra el objetivo único o intervalo solicitado y aplicado. Home Assistant también crea una notificación persistente para el límite activo; las actualizaciones repetidas del sensor no crean duplicados y Velair la retira tras recuperarse.

<a id="when-velair-does-nothing"></a>

## Cuándo Velair no actúa

Room Assist requiere un paso efectivo de temperatura válido y positivo. Velair utiliza primero `target_temp_step` publicado por el equipo gestionado. Si falta, el último paso válido comunicado por esa entidad conserva la misma serie de objetivos válidos. Después se utiliza el valor manual alternativo por zona mostrado en Ajustes, con `1` por defecto si no existe ningún valor. Guardar el campo mientras falta el atributo da prioridad a ese valor explícito eliminando la observación recordada; un valor válido comunicado posteriormente vuelve a recordarse. Velair no deduce una relación con otra entidad.

Room Assist no aplica un objetivo asistido cuando:

- no hay un sensor de habitación seleccionado;
- Room Sensor Assist está desactivado;
- el programador no está en modo automático;
- el equipo está pausado o tiene un refuerzo;
- no hay un bloque de temperatura activo;
- el bloque activo es `Off`;
- la temperatura del sensor de habitación o del equipo no está disponible o no es numérica;
- el cambio calculado es menor que el paso de temperatura de la entidad;
- el modo HVAC no puede interpretarse como calefacción o refrigeración.

En estos casos, Velair mantiene o restaura el objetivo programado normal cuando es seguro hacerlo.

<a id="external-adjustments-and-manual-adjustment"></a>

## Ajustes externos y ajuste manual

Con la política predeterminada **Mantener automático**, Room Assist sigue determinando el objetivo y Velair recalcula y aplica de nuevo su objetivo asistido actual tras detectar un cambio externo de consigna o modo HVAC. Con cualquier política manual, Room Assist cede el control cuando el cambio coloca el equipo en **Ajuste manual**. Velair captura el estado externo completo del evento de cambio de estado de Home Assistant, elimina la corrección activa de Room Assist sin restaurar el objetivo programado y conserva la temperatura objetivo única o intervalo nativo `heat_cool` externos. Así evita que Room Assist contrarreste inmediatamente un ajuste desde una tarjeta, mando físico u otro origen externo.

Ejemplo:

```text
Scheduled cooling target: 24 °C
Room Assist temporary target: 26 °C
External adjustment: 23 °C
Result during Manual adjustment: 23 °C
```

Al reanudar la Planificación automática, Velair calcula la intención del horario o Perfil vigente. Room Assist puede calcular entonces una corrección nueva con las lecturas actuales; no recupera su antigua corrección de `26 °C` ni la fase de histéresis de modo fijo. Recargar Velair o Home Assistant produce el mismo reinicio del estado de ejecución: vuelve a calcularse el bloque actual y se elige una fase nueva segura según el modo y lectura de habitación actuales.

Un cambio externo que cumpla las condiciones conserva el control automático o inicia/actualiza el ajuste manual según la política guardada para ese equipo. Consulta [Cambios externos y ajuste manual](manual-control.es.md) para ver políticas, ejemplos de servicios, interacciones con Refuerzos/Perfiles y límites de atribución.

<a id="planned-return"></a>

## Regreso a casa

Durante [Regreso a casa](planned-return.es.md), Room Assist sigue el objetivo temporal de llegada de cada zona cuando empieza a prepararse. No sigue utilizando la temperatura del Modo Ausente ni vuelve a ella cuando cambia un bloque del horario de ausencia. Las demás zonas siguen Ausente hasta que comienza su propia preparación.

Por ejemplo, un objetivo Ausente de 16 grados pasa a un objetivo de llegada de 21 grados cuando esa habitación empieza a prepararse. Room Assist puede ajustar la consigna física para alcanzar 21 grados en el sensor de habitación. El ajuste manual y las pausas explícitas suspenden su intervención para esa zona. Seleccionar explícitamente un Modo/Perfil cancela la preparación anticipada del episodio y mantiene esa selección. El control **Cancelar este regreso** también elimina la preparación; después de confirmar la salida, restaura el Modo y Perfiles anteriores registrados. Consulta los [ejemplos de cancelación](planned-return.es.md#cancelling-a-return-examples).

<a id="adaptive-preconditioning"></a>

## Preacondicionamiento adaptativo

Cuando el Preacondicionamiento adaptativo está activado e inicia anticipadamente un bloque futuro, Room Assist sigue ese objetivo futuro hasta la hora de confort programada.

Esto importa porque la hora actual puede seguir perteneciendo a un bloque anterior. Velair trata el bloque anticipado ya iniciado como objetivo gestionado activo, de modo que Room Assist no vuelve a calcular respecto al bloque anterior.

Cuando Room Sensor Assist está activado, el Preacondicionamiento adaptativo también utiliza el sensor de habitación seleccionado como fuente efectiva de temperatura para sus decisiones y aprendizaje.

Las compensaciones opcionales independientes de calefacción y refrigeración se configuran en Preacondicionamiento. Room Assist calcula el objetivo base a partir del objetivo original de la habitación y después Velair aplica el extra de preparación. Los límites del equipo reducen el extra; las bandas de dos consignas conservan su anchura. Una compensación positiva configurada conserva temporalmente la dirección de preparación hasta el umbral original de la habitación, aunque el extra efectivo sea cero o Room Assist haya heredado una fase sin demanda. Tras ese umbral o el inicio programado, el extra termina y se reanudan la histéresis y el frenado ordinarios. Los intervalos nativos `heat_cool` conservan sus limitaciones existentes de compatibilidad con el frenado.

Room Assist confirma su demanda efectiva de calefacción o refrigeración junto con el objetivo aplicado. Durante la preparación incluye la solicitud temporal y conserva por separado su fase ordinaria de histéresis. Suministro climático compartido sigue esa demanda efectiva mediante su integración existente con Room Assist; no añade otra compensación, histéresis ni regla de preparación. Cuando termina el extra, vuelve la demanda ordinaria de Room Assist. Una orden fallida o sustituida no confirma una solicitud nueva, y una restauración fallida no puede dejar que la preparación retirada solicite suministro indefinidamente. Consulta [Suministro climático compartido](shared-climate-supply.es.md#room-assist).

El gráfico distingue el objetivo nominal de la consigna final de Room Assist más preparación. Su insignia de extra incluye un `0` limitado; **Datos técnicos** separa la base, el extra solicitado, el efectivo y la orden final. Durante la preparación, el umbral **Fin de preparación** tiene un botón de información que explica el margen de llegada configurado. Un objetivo de `21 °C` con margen de llegada `0.1 °C` termina la preparación de calefacción en `20.9 °C`; esto es independiente de la banda de control de Room Assist. Consulta [Compensación temporal de consigna](adaptive-preconditioning.es.md#temporary-setpoint-offset) para ver ejemplos de calefacción, refrigeración y límites físicos.

<a id="automation-events"></a>

## Eventos de automatización

Los eventos de actualización también pueden incluir un objeto `braking` con el nivel configurado y efectivo, la fase activa, las temperaturas efectivas de frenado y reanudación, el límite de consigna y el motivo de inactividad, si existe. Estos campos adicionales describen la política de demanda confirmada, no la actividad física del equipo. Consulta [Actualización de Room Sensor Assist](automation-events.es.md#room-sensor-assist-updated) para ver un ejemplo.

Velair emite el evento estándar de Home Assistant `velair_event`.

Room Assist emite:

- `room_sensor_assist_state_changed`: se activó o desactivó Room Assist.
- `room_sensor_assist_updated`: Velair aplicó un objetivo de climatización asistido temporal.
- `room_sensor_assist_restored`: Velair dejó de gestionar el objetivo asistido temporal y restauró el objetivo programado habitual cuando fue posible.

Consulta [Eventos de automatización](automation-events.es.md#room-sensor-assist-state-changed) para ver los datos completos y todos los motivos de restauración.

Ejemplo de datos del evento:

```yaml
event: room_sensor_assist_updated
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
target_temperature: 21
applied_temperature: 20
room_temperature: 18
climate_temperature: 17.1
assist_delta: 3.3
applied_offset: 2.9
direction: heat
hvac_mode: heat
hysteresis_phase: towards_upper
hysteresis_target: 21.3
deadband_low: 20.7
deadband_high: 21.3
reason: current_schedule
```

Los cuatro campos de histéresis son opcionales. En los eventos de automatización aparecen para un ciclo fijo de una consigna `heat` o `cool` con banda muerta no nula; faltan para la corrección antigua con banda muerta cero, los modos automáticos de una consigna y todos los intervalos. Los intervalos fijos con referencia configurada muestran su fase de histéresis en el estado de funcionamiento en directo; sus eventos conservan los pares completos de límites y `range_shift`.

Una actualización de intervalo utiliza las bandas programada y aplicada completas, en lugar de campos de temperatura única:

```yaml
event: room_sensor_assist_updated
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
target_temp_low: 19
target_temp_high: 24
applied_target_temp_low: 23
applied_target_temp_high: 28
room_temperature: 18
climate_temperature: 22
assist_delta: 1
range_shift: 4
direction: heat
hvac_mode: heat_cool
reason: current_schedule
```

Ejemplo de disparador de automatización:

```yaml
trigger:
  - platform: event
    event_type: velair_event
    event_data:
      event: room_sensor_assist_updated
      entity_id: climate.living_room
```

Room Assist también puede controlarse desde automatizaciones con:

- `velair.enable_room_sensor_assist`
- `velair.disable_room_sensor_assist`

<a id="lovelace"></a>

## Lovelace

La vista Room Assist está disponible como tarjeta Lovelace:

```yaml
type: custom:velair-card
view: sensors
entities:
  - climate.living_room
```

El panel lateral y las tarjetas usan el mismo gráfico en directo. Las etiquetas compactas **Habitación**, **Objetivo**, **Equipo** y **Consigna** se conectan verticalmente con sus posiciones de temperatura. Pasa el cursor, enfoca o pulsa una etiqueta para ver los detalles. **Normal** muestra la solicitud actual y el siguiente umbral; **Detallado** añade la diferencia entre habitación y objetivo, el ajuste total y cualquier extra de preparación ya incluido en ese total. Las etiquetas de medida se sitúan sobre sus líneas cuando hay espacio y debajo en caso contrario.

Una flecha continua representa la calefacción o refrigeración solicitada. Una flecha discontinua representa la espera y apunta al umbral de reanudación. Estas flechas describen la demanda de Room Assist, no una tendencia de temperatura medida ni una prueba de que funcione una válvula o compresor. Si no hay demanda aceptada disponible, el gráfico indica esa incertidumbre en lugar de inventar una solicitud o un estado de espera.

La franja rayada inmediatamente encima del eje conserva la banda de control nominal y su leyenda. Una parada efectiva por frenado se marca por separado; la franja no implica que la demanda continúe más allá de esa parada. La etiqueta de consigna identifica el frenado solo cuando su protección ha cambiado realmente la orden aplicada. Para un intervalo nativo `heat_cool`, corchetes separados muestran las bandas completas de objetivo y aplicada, con rayado en los márgenes exteriores de Room Assist. Los límites físicos están etiquetados.

El gráfico muestra la solicitud en su insignia de estado, las lecturas en las etiquetas de temperatura y el umbral de parada o reanudación junto a la flecha. Si falta la lectura de la habitación y no se puede dibujar esa relación, el umbral permanece en la insignia de estado. **Explicación** abre un contexto breve debajo del gráfico: cómo difieren las lecturas de los sensores, por qué un ciclo continúa tras alcanzar el objetivo de confort o qué preparación, frenado o límite del equipo afecta al ajuste. Añade contexto sin repetir las temperaturas, la solicitud ni la ayuda de la banda de control. El gráfico no tiene un resumen independiente repetido debajo.

**Datos técnicos** agrupa las etapas de la consigna del equipo, los límites de control y el origen y momento en la misma zona de detalle. Las lecturas permanecen en el gráfico en lugar de repetirse en otra tabla. Los valores consecutivos calculado, solicitado, anterior al ajuste de paso y aplicado comparten una fila cuando coinciden, conservando los nombres de todas las etapas; los valores distintos se mantienen separados. Las órdenes de intervalo y la información de su consigna de referencia única permanecen diferenciadas. Los valores de parada y reanudación no se repiten como siguiente umbral ni como un límite nominal idéntico, y la dirección del ciclo se muestra sin repetir su temperatura. Siguen disponibles el paso del equipo y las protecciones o límites físicos pertinentes. El extra de preparación tiene su propio grupo, incluidos los valores solicitado y aplicado cuando difieren y un cero limitado. Origen y momento muestra la entidad del sensor y el inicio del bloque con fecha; si no hay fecha, utiliza solo la hora. Los grupos se apilan en paneles y tarjetas estrechos. Solo puede abrirse una vista de detalle a la vez; vuelve a seleccionar su botón o pulsa Escape para cerrarla. Los botones funcionan con teclado y pantalla táctil, y el detalle permanece debajo del gráfico sin cubrir otros controles. Abrir o cerrar un detalle no cambia la solicitud de control. El gráfico se adapta a columnas estrechas sin cambiar la escala de temperatura ni desplazar una lectura de su posición real.

La tarjeta Lovelace de Room Assist también puede ocultar partes individuales si quieres una vista compacta solo para el panel:

```yaml
type: custom:velair-card
view: sensors
entities:
  - climate.living_room
show_room_assist_switch: false
show_room_assist_sensor: false
show_room_assist_deadband: false
show_room_assist_max_delta: false
show_room_assist_debounce: false
show_room_assist_live_status: true
```

Las opciones `show_room_assist_*` omitidas tienen el valor predeterminado `true`.

<a id="technical-details"></a>

## Detalles técnicos

Los detalles para desarrolladores sobre campos de almacenamiento, estado de ejecución, cálculo del objetivo asistido, restauración y eventos están en [Funcionamiento interno de Room Assist](../developer/room-assist.md).
