<a id="planned-return"></a>

# Regreso a casa
<!-- velair-docs:start -->
Traducciones: [Original en inglés](planned-return.md) · [Español](planned-return.es.md) · [Français](planned-return.fr.md) · [Deutsch](planned-return.de.md) · [Italiano](planned-return.it.md) · [Nederlands](planned-return.nl.md) · [Polski](planned-return.pl.md) · [Português (Brasil)](planned-return.pt-br.md) · [Português (Portugal)](planned-return.pt-pt.md) · [Русский](planned-return.ru.md) · [Estado de las traducciones](../translation-status.md)

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

La configuración anterior registrada por Regreso a casa incluye la selección base de Modo/Perfiles y todas las excepciones de Perfil por zona. Una salida confirmada selecciona la base de ausencia y elimina las excepciones; una llegada completada selecciona la base de destino. Cancelar un episodio confirmado mediante Cancelar de Regreso a casa restaura toda la selección registrada, incluidas sus excepciones, cuando sus referencias siguen siendo válidas. En cambio, una selección externa de Perfil/Modo cancela el regreso pendiente y aplica la selección solicitada. No restaura la configuración anterior. Consulta [base y excepciones por zona](climate-profiles.es.md#a-base-with-independent-zone-exceptions).

Regreso a casa prepara el hogar para una hora de llegada habitual o puntual después de que las señales de ocupación seleccionadas confirmen que toda la casa está vacía, o tras un inicio puntual explícito sin fuentes de ocupación o con **Aplicar modo de ausencia ahora** seleccionado. Configúralo en Velair; no requiere blueprints adicionales ni acciones diarias para una rutina semanal estable.
La rutina automática está desactivada por defecto y se ejecuta localmente en Home Assistant. Los regresos puntuales necesitan Modos Ausente/Retorno guardados y el programador en modo Automático y en funcionamiento; las fuentes de ocupación son opcionales para inicios explícitos. La rutina semanal requiere al menos una fuente de ocupación.

<a id="setup"></a>

## Configuración

**Ausencia y regreso** contiene los ajustes compartidos entre los regresos puntuales y la rutina semanal. La detección de ausencia actúa para un regreso puntual iniciado o cuando la rutina semanal guardada está activada. Estos campos no definen otra automatización En casa/Ausente que funcione continuamente. El tiempo de confirmación mide la ausencia detectada de forma continua, no el tiempo desde que se guardó la configuración. El Modo de ausencia se aplica normalmente después de confirmar la salida; las estancias compatibles pueden prepararse antes de que el Modo de destino se aplique a la llegada.

Sin fuentes de ocupación, iniciar un regreso puntual aplica el Modo de ausencia inmediatamente y no utiliza el tiempo de confirmación. Los ajustes muestran esta excepción junto al tiempo cuando no hay fuentes seleccionadas.

Los bloques de destino **Solo temperatura** conservan el control externo del modo HVAC. Regreso a casa no enciende un equipo apagado para preparar ese bloque; no puede garantizarse que esa estancia esté lista a la llegada mientras siga apagado. Utiliza un bloque de destino explícito **Calor** o **Frío** cuando la preparación del regreso deba poner en marcha el equipo. Seleccionar el destino a la llegada sigue respetando la política del bloque.

1. Crea los Modos Ausente y En casa deseados, o usa Predeterminado como destino. Los Perfiles de ausencia pueden apagar equipos o utilizar horarios semanales de menor demanda.
2. Abre la pestaña **Regreso a casa** y añade señales de ocupación para salidas supervisadas o semanales. Utiliza sensores binarios, ayudantes booleanos, grupos o la zona de hogar de Home Assistant (`zone.home`). Incluye señales de cualquiera que pueda permanecer en casa, también invitados. Home Assistant sigue siendo responsable del seguimiento de personas y ubicaciones; las reglas complejas pueden combinarse en un ayudante.
3. En **Ausencia y regreso**, elige cuánto debe permanecer vacía la casa, qué Modo de ausencia activar y qué Modo de destino usar al regresar. El tiempo predeterminado es diez minutos; el control compacto acepta minutos u horas. La llegada se reconoce inmediatamente. La ayuda del Modo de destino explica la preparación adaptativa y el funcionamiento a la llegada sin una estimación válida.
4. En **Horas de llegada**, introduce la hora habitual de cada día aplicable. Las llegadas semanales corresponden al día en que la casa queda vacía. Los días sin hora utilizan Ausente tras confirmar la ausencia y restauran el destino al detectar ocupación, sin preparación anticipada. Velair utiliza el horario del destino a la llegada para preparar cada zona.
5. Activa el Preacondicionamiento adaptativo para las zonas que deban comenzar antes. Se reutilizan los ajustes existentes y el aprendizaje local de calefacción/refrigeración.
6. Activa **Rutina semanal** con el interruptor de la barra de estado y después Guarda. Esto activa la confirmación automática de ausencia, la selección del Modo de ausencia y las **Horas de llegada** semanales. Introducir horas de llegada por sí solo no activa la rutina. Se pueden iniciar regresos puntuales con el interruptor desactivado. El interruptor modifica el borrador; Cancelar restaura el ajuste guardado. Detén las automatizaciones En casa/Ausente que seleccionen Modos para ese mismo hogar; dos controladores competirían entre sí.

Los días siguen la preferencia **Primer día de la semana** guardada en Ajustes de Velair. Introduce directamente una hora de llegada para cada día. Si sales un día sin hora, Velair aplica Ausente después de confirmar la ausencia, no programa preparación anticipada y restaura el destino cuando detecta ocupación. La zona horaria de Home Assistant se muestra junto a la rutina semanal. Los cambios permanecen en el borrador hasta guardarlos. Cancelar y Guardar están a la derecha del pie de configuración.

El resumen superior agrupa tres partes de la rutina en contenedores con borde independientes que corresponden a las secciones de ajustes, sin una tarjeta que los englobe ni una línea lateral compartida. La rutina semanal muestra el Modo Ausente, el tiempo de confirmación de ausencia, la preparación adaptativa y el Modo de destino como un flujo sencillo; el interruptor modifica la activación de la rutina. El tiempo es el que la casa debe permanecer vacía, no una estimación de preparación.
La sección de ocupación muestra el resultado combinado y recuentos de fuentes; expándela para revisar cada señal. Las señales desconocidas impiden la confirmación automática de salida y se distinguen de la presencia confirmada. La sección de retorno rápido reúne la salida puntual y los controles de llegada del episodio actual. Las acciones de ejecución utilizan la configuración guardada, por lo que debes guardar o cancelar los cambios pendientes antes de anunciar una nueva salida.

El formulario agrupa las fuentes de ocupación, el tiempo de ausencia y los Modos de ausencia y destino en **Ausencia y regreso**. En contenedores anchos, el tiempo y ambos Modos comparten una fila. En tabletas, el tiempo queda encima de los dos Modos; en móvil, los tres controles se apilan en ese orden. Cada control conserva su ayuda junto a él. **Horas de llegada** contiene solo los campos horarios de cada día, su explicación y la zona horaria de Home Assistant. Las fuentes de presencia usan la acción circular verde Añadir del editor de bloques cuando hay una fuente seleccionada. Añadir y Eliminar deshabilitados mantienen su aspecto transparente; las acciones habilitadas tienen respuesta al pasar el ratón y al enfocar. La lista de fuentes configuradas comienza contraída. Su resumen muestra el total y los recuentos de señales ocupadas, vacías y desconocidas; expándelo para revisar o retirar fuentes individuales. En móvil, el resumen ocupa todo el ancho de la fila del selector y Añadir; los iconos de estado y números mantienen unidos los recuentos, con etiquetas accesibles completas. Los contadores se alinean al borde final del resumen. En móvil, la lista ampliada comparte su ancho, con Eliminar al final de cada fila y más espacio para nombres e IDs. En ordenador, la lista coincide con el ancho del selector. Desplegarla no modifica la configuración. Los tiempos introducidos en horas se redondean al minuto más cercano; se muestra el tiempo equivalente junto al control.

Los estados ocupados reconocidos son `on` y `home`; los vacíos son `off` y `not_home`. Para la zona de hogar, cero personas significa vacío y un recuento positivo significa ocupado. Cualquier señal ocupada hace que el hogar esté ocupado; el hogar solo se considera vacío cuando todas las señales indican ausencia. Si ninguna indica presencia y una es desconocida o no está disponible, la ocupación es desconocida: no pueden comenzar ausencias automáticas. Una solicitud explícita de **Aplicar modo de ausencia ahora** aún puede activar Ausencia, pero no confirmar la salida mientras la ocupación sea desconocida. Un retorno aceptado permanece programado. El panel muestra el resultado combinado y cada fuente.

Selecciona señales que representen ocupación: que un sensor de movimiento esté apagado no significa necesariamente que no haya nadie en casa.

<a id="room-preparation"></a>

## Preparación de estancias

Expande **Preparación de estancias** debajo del flujo de la rutina para ver todos los equipos gestionados. La lista comienza contraída. Sin un regreso futuro aceptado, sus recuentos describen la capacidad guardada: preparación anticipada, funcionamiento solo a la llegada y sin preparación. Para un regreso aceptado, el resumen compartido cuenta las estancias que esperan preparación, se preparan, han alcanzado el objetivo, están suspendidas, no están disponibles o solo actuarán a la llegada. Muestra la llegada guardada y el inicio estimado más temprano compatible cuando existe; cada estancia puede empezar en un momento distinto. Desplegar la lista no modifica ajustes ni envía órdenes climáticas. El mismo resumen se aplica a regresos semanales y puntuales.

Cada fila identifica la habitación, la fuente de su horario de destino y el estado de preparación. Un equipo que no aparezca en los Perfiles del Modo de destino sigue utilizando su horario **Predeterminado**; un comportamiento normal explícito también utiliza Predeterminado. Un horario de Perfil utiliza el nombre de ese Perfil. Una pausa del Perfil de destino, zona desactivada o ejecución externa se identifica por separado, en lugar de etiquetarse como solo a la llegada. Sin Preacondicionamiento adaptativo, una habitación local activada sigue su horario efectivo a la llegada; no se excluye automáticamente de los cambios de Modo.

Sin un retorno futuro, esta lista describe las capacidades de la configuración guardada, no una predicción de que la habitación vaya a comenzar antes. Una vez aceptado un retorno, resuelve cada objetivo de destino a esa hora de llegada y muestra los estados pendiente, preparando, objetivo alcanzado, suspendido o no disponible con el motivo correspondiente. La falta de datos de temperatura o de una estimación válida impide la preparación anticipada; Refuerzo, ajuste Manual y pausas explícitas mantienen su prioridad habitual. Sin **Aplicar modo de ausencia ahora**, una salida sin confirmar no puede mostrarse como preparando.
**Preparando** describe la intención activa de preparación de Velair, no confirma que el dispositivo haya recibido una orden o esté funcionando físicamente. **Objetivo alcanzado** es una temperatura actual medida dentro de la tolerancia de preparación y puede ser cierto antes de salir; no inicia una ausencia ni omite la confirmación.

**Inicio previsto** es una estimación, no prueba de una orden al equipo ni de que esté físicamente preparado. Los objetivos admiten calefacción, refrigeración e intervalos de temperatura. Los retornos completados, cancelados y omitidos vuelven a información de configuración en lugar de mostrar horas obsoletas de preparación. Diagnóstico sigue utilizando los ajustes guardados del backend hasta que Guardar finalice correctamente, sin un recordatorio adicional de preparación. Esta lista completa sustituye la antigua lista de zonas limitada al episodio.

<a id="preconditioning-dependencies"></a>
### Dependencias de preacondicionamiento

El **Maestro de preacondicionamiento** de una habitación también se aplica a Regreso a casa. La preparación espera hasta que tanto su propio inicio estimado como el inicio de preparación del maestro seleccionado lo permitan. Ambos planes pertenecen al mismo episodio de regreso y utilizan su configuración de destino; una preparación semanal ajena no habilita una habitación dependiente para la llegada. Si el maestro no tiene preparación apta, el equipo dependiente espera hasta su objetivo normal de llegada. Consulta [Maestro de preacondicionamiento](adaptive-preconditioning.es.md#preconditioning-master).

<a id="one-off-return"></a>

## Regreso puntual

En **Regreso puntual**, elige una fecha y hora futuras de llegada y selecciona **Programar regreso**. Fecha y hora están juntas. En móvil, **Programar regreso** está en la siguiente fila, alineado con el borde derecho del campo de hora; los diseños mayores mantienen la acción junto a los campos. La explicación está debajo de los controles.
Puedes hacerlo antes de salir o cuando ya estás fuera. Velair utiliza los ajustes guardados de Modos y presencia. Por defecto, con fuentes de ocupación configuradas, mantiene la solicitud pendiente y aplica Ausente solo cuando todas indiquen ausencia durante el tiempo de confirmación, protegiendo a quienes permanezcan en casa.
Sin fuentes guardadas, pulsar **Programar regreso** es tu confirmación explícita de salida: Ausente comienza inmediatamente, sin tiempo de ausencia. Velair no deduce que la casa esté vacía ni detecta tu regreso físico en este caso; prepara las habitaciones normalmente y activa el destino a la llegada guardada. Por defecto, una fuente configurada desconocida/no disponible sigue esperando; una entidad ausente no puede tratarse como una lista de fuentes vacía.

Con fuentes de ocupación guardadas, **Aplicar modo de ausencia ahora** es una casilla opcional para cada regreso puntual. Empieza desmarcada y no es un ajuste guardado de la rutina. Al marcarla se aplica inmediatamente el Modo de ausencia configurado, aunque sigas en casa. La preparación y el cambio de destino a la hora elegida se activan inmediatamente. El regreso automático por presencia espera a que todas las fuentes indiquen ausencia continua durante el tiempo de confirmación configurado. La presencia o una lectura desconocida reinician esa espera; después de confirmarla, la presencia activa el destino inmediatamente.

Por ejemplo, con una demora de diez minutos y regreso a las 18:00:

| Hora | Observación | Resultado |
| --- | --- | --- |
| 08:00 | Programar regreso con Aplicar modo de ausencia ahora marcado, aún en casa. | Se aplica Ausencia; el regreso por hora y la preparación están activos. |
| 08:10 | Todas las fuentes indican ausencia. | Empieza la confirmación de diez minutos. |
| 08:15 | Presencia tras una salida corta. | Se reinicia la confirmación; se mantiene Ausencia. |
| 08:30 | Todas las fuentes vuelven a indicar ausencia. | Empieza un nuevo periodo de diez minutos. |
| 08:40 | Todas las fuentes han seguido indicando ausencia. | Se habilita el regreso automático por presencia sin volver a aplicar Ausencia. |
| 17:00 | Se detecta presencia. | Se selecciona el destino inmediatamente. |

La tarjeta de regreso de la barra lateral, la tarjeta Lovelace y el resumen de Resumen mantienen Ausente o Preparando como estado principal. Una línea compacta separada muestra **Esperando confirmar la salida** o **Confirmando la salida** con el plazo de confirmación. La presencia o las lecturas desconocidas durante esa espera restauran el mensaje de espera. La ocupación real sigue visible por separado, incluida la presencia mientras Ausencia está activo. Las tres vistas mantienen esa línea concisa y explican las reglas en su ayuda contextual, sin repetir el estado principal de preparación ni su icono. Abrir la ayuda en Resumen no navega a otra vista. Tras confirmar, la línea de espera desaparece y la ayuda explica que la presencia ya puede activar el regreso: en la ayuda de la fase principal de la tarjeta o del inicio de la línea temporal en Resumen. La ayuda de los extremos explica su significado sin repetir la hora visible.

La línea temporal comienza al aplicar Ausencia; su ayuda distingue ese momento de la salida física supervisada. No cambian las etiquetas de los extremos, los marcadores de preparación de habitaciones ni la llegada guardada. Si nunca se confirma la ausencia, la preparación programada y el cambio de destino a las 18:00 siguen ejecutándose. **Cancelar** continúa disponible antes de confirmar, al igual que la orden explícita de llegada de la API. Una demora de cero minutos también exige observar la casa vacía. Sin fuentes, no se muestra la casilla y se conserva el inicio inmediato existente.

La fecha y hora puntuales sustituyen la hora semanal solo para esta ausencia. También funciona con la rutina automática desactivada. Puedes cambiar o cancelar el aviso pendiente; si una salida pendiente normal no se confirma antes de su hora de llegada, caduca sin cambiar Modos. Si todas las fuentes ya indican ausencia y no hay un episodio activo, planificar el retorno inicia inmediatamente el tiempo configurado de confirmación; no requiere un nuevo cambio de sensor. Si ya hay una ausencia activa, cambia la fecha y hora de llegada con el editor existente del episodio; así el retorno pasa a ser una excepción puntual sin volver a aplicar Ausente.
Posponer la llegada termina su preparación anterior y restaura el comportamiento actual de Ausente hasta que corresponda la nueva preparación. Los refuerzos y ajustes manuales siguen protegidos. El objetivo de destino se resuelve en la fecha local seleccionada de llegada, también cuando la preparación comienza el día anterior. Enviar el mismo instante no reinicia la preparación. Se rechazan llegadas pasadas o actuales y horas locales inexistentes por el cambio de horario de verano; una hora local repetida utiliza su primera ocurrencia futura.

Los episodios completados, omitidos y cancelados permanecen bloqueados para la rutina automática hasta detectar ocupación, de modo que una casa vacía no inicia por sí sola otra salida semanal. Puedes elegir explícitamente **Programar regreso** después de cualquier episodio inactivo sin esperar a estar en casa. La nueva solicitud utiliza las fuentes de presencia y Modos actuales. Con fuentes, vuelve a confirmar ausencia durante el tiempo configurado aunque todos estén fuera, sin cambiar inmediatamente el Modo. Sin fuentes, la solicitud explícita activa Ausente inmediatamente. Tanto la barra lateral como la tarjeta muestran un formulario nuevo en cuanto el episodio queda inactivo. Si la planificación no está disponible, el formulario permanece visible con **Programar regreso** desactivado y una explicación de los ajustes guardados y estado del programador necesarios. En esa situación todavía puede cancelarse un retorno activo.

Después de confirmar la salida, utiliza **Cancelar** para detener el retorno y restaurar el Modo y Perfiles anteriores registrados, o **Cambiar llegada** para actualizar fecha y hora. Durante una confirmación normal de ausencia, cancelar deja intacta la selección activa porque todavía no se ha aplicado Ausente. Con Ausencia manual inmediata, Cancelar restaura la selección anterior aunque siga pendiente la confirmación supervisada de salida. Desactivar la rutina automática o editar las horas semanales no cancela un retorno manual. Cambiar sus fuentes de presencia o Modos invalida el aviso anterior. Las selecciones explícitas de Modos/Perfiles cancelan retornos pendientes y activos. Un programador detenido no ejecuta el retorno.

La primera fila mantiene Regreso puntual a la izquierda y los indicadores de ocupación exclusivos de la card a la derecha. La fase actual es un subtítulo compacto unido al título, sin otra pastilla ni fila. Durante la confirmación, el encabezado del proceso del temporizador aporta la fase. La card del dashboard agrupa los recuentos de ocupación arriba a la derecha cuando hay fuentes configuradas. Sin fuentes se omiten los contadores y el icono de demora sin uso, y el panel indica **Sin supervisión** en lugar de ocupación desconocida. El icono del tiempo de confirmación solo aparece antes de confirmar una ausencia activa; se oculta durante Ausente/Preparando y en errores activos con salida confirmada. El panel no repite esos indicadores. Pasa el ratón sobre la fase para ver una explicación breve. Durante la confirmación de ausencia, una fila ligera de temporizador explica que Velair comprueba si la casa sigue vacía. **Hasta** muestra el plazo de confirmación del backend en hora local de Home Assistant, incluida la fecha si difiere de hoy. Velair activa el Modo de ausencia tras confirmar solo si todas las fuentes seleccionadas siguen indicando ausencia. Es un plazo, no una cuenta atrás en directo ni una salida confirmada. El mismo proceso aparece cuando la rutina semanal confirma una ausencia antes de que exista un episodio; si falta el plazo no se inventa una hora. Antes de confirmar la salida, un icono de llegada y **Llegada prevista** identifican el regreso guardado, con etiqueta accesible y ayuda. Esta fila se alinea con el título y el estado. Su fecha/hora guardada es un chip compacto pulsable, sin lápiz ni subrayado. La línea temporal confirmada usa el mismo icono; la fecha/hora de llegada es una superficie de edición más oscura, con la misma tipografía que la salida. Selecciona ese valor para abrir el editor de fecha/hora en línea. Su fila de acciones tiene **Volver** azul con una flecha a la izquierda y **Cambiar llegada** verde a la derecha. Volver descarta los cambios de llegada sin guardar y cierra el editor sin cambiar el regreso. En un panel ancho, el editor sigue compacto y se alinea con el extremo de llegada; la acción de cambio queda a la derecha debajo. Las pantallas estrechas y la card mantienen su distribución adaptativa. Los campos permanecen ocultos hasta solicitarlos. **Volver** restaura la última llegada guardada y oculta los campos. Limpia el aviso de llegada y la protección de navegación; los ajustes de rutina independientes sin guardar siguen protegidos. Reabrir parte de la llegada guardada. Durante una ausencia confirmada, el extremo de llegada de la línea temporal es ese mismo botón de edición, sin llegada duplicada. Cancelar aparece debajo del episodio a la izquierda solo cuando el editor está cerrado. Al editar, Cancelar se oculta y **Cambiar llegada** queda a la derecha y **Volver** a la izquierda para descartar la edición local. Cambiar el campo no modifica el regreso hasta que **Cambiar llegada** termina correctamente. Los cambios correctos cierran el editor y devuelven el foco a la llegada guardada. Los fallos y las actualizaciones de sensores conservan el borrador abierto. Un aviso de cambios sin guardar identifica la edición pendiente; la navegación o recarga avisa antes de descartarla. Guardar la configuración de rutina no aplica una edición de llegada. Volver y Cambiar llegada usan superficies compactas rellenas azul y verde, respectivamente. Sus superficies visibles tienen 32 píxeles de altura dentro de objetivos táctiles de 44. Cancelar usa una superficie roja compacta, con texto/icono blanco, debajo del episodio: 32 píxeles visibles dentro de un objetivo táctil de 44, con respuesta clara al pasar el ratón y enfocar. Los colores se adaptan al tema para mantener legibles texto e iconos. Las acciones no disponibles usan fondo neutro, texto/iconos atenuados y cursor de no permitido. Cambiar llegada se vuelve verde al editarla. La fase sigue unida al título. Cancelar permanece a la izquierda debajo de los datos cuando no se edita; Cambiar llegada se alinea a la derecha bajo el editor abierto. Panel y card conservan este grupo en móvil. Programar regreso sigue alineado a la derecha en el formulario inicial. Las acciones correctas actualizan el episodio sin un mensaje adicional de guardado.
<a id="home-assistant-actions"></a>
### Acciones de Home Assistant

Las automatizaciones, scripts y paneles pueden anunciar una salida mediante `velair.start_planned_return`. Se requieren tanto `return_date` (`YYYY-MM-DD`) como `return_time` (`HH:MM` de 24 horas). Juntos deben identificar una llegada futura en la zona horaria de Home Assistant. El selector nativo de hora puede enviar `HH:MM:00`; se aceptan segundos cero y se normalizan a precisión de minutos. Elige una fecha futura para el ejemplo siguiente:

```yaml
action: velair.start_planned_return
data:
  return_date: "2026-10-09"
  return_time: "19:25"
```

Utiliza los ajustes guardados de presencia y Modos y el mismo comportamiento de confirmación, preparación y prioridad que **Programar regreso**. Funciona con la rutina semanal desactivada y actualiza la fecha y hora de llegada si ya hay una ausencia activa, sin volver a aplicar Ausente. Los Modos guardados y el programador en modo Automático deben estar operativos. Las fuentes son opcionales para regresos puntuales: una lista guardada vacía aplica Ausente inmediatamente; las fuentes configuradas conservan las reglas normales de confirmación salvo que se envíe `apply_away_now: true`. Una llegada pasada o en el instante actual se rechaza sin sustituir el retorno anterior. Una hora caducada o inexistente por horario de verano se rechaza; durante una hora repetida, Velair elige la primera ocurrencia que siga siendo futura.

Cancela un retorno pendiente o activo:

```yaml
action: velair.cancel_planned_return
data: {}
```

La misma acción de cancelación también cierra un aviso de episodio inactivo. Detiene la preparación y el retorno temporizado, manteniendo el bloqueo de cancelación automática. Después de confirmar la salida, restaura el Modo y la selección exacta de Perfiles guardados antes del inicio del episodio. Durante una confirmación pendiente normal deja intacta la selección actual. Con Ausencia manual inmediata, restaura la selección guardada incluso antes de confirmar la salida supervisada. Una nueva selección explícita de **Programar regreso** puede sustituir ese episodio inactivo. La barra lateral y la tarjeta utilizan esta misma acción de cancelación.

<a id="cancelling-a-return-examples"></a>

## Cancelar un retorno: ejemplos

El tiempo de confirmación de ausencia ocurre **antes** de aplicar el Modo Ausente. Cancelar durante ese tiempo no necesita restaurar nada: el Modo y Perfiles anteriores siguen activos. Cancelar después de confirmar la salida restaura la selección registrada al inicio del episodio, en lugar de activar inmediatamente el Modo de Retorno configurado.

Para los ejemplos siguientes, supón que:

- **Confort** está activo y selecciona los Perfiles **Confort del salón** y **Confort del dormitorio**.
- El Modo Ausente es **Ausente**, el Modo de Retorno es **Tarde**, y la llegada está prevista para las 18:00.
- Las fuentes de ocupación indican una casa vacía a las 13:00 y el tiempo de confirmación es cinco minutos.

<a id="cancel-before-confirmation-finishes"></a>

### Cancelar antes de terminar la confirmación

| Hora | Qué ocurre | Modo y Perfiles seleccionados |
| --- | --- | --- |
| 13:00 | Inicia un retorno. Velair comprueba que la casa permanece vacía hasta las 13:05. | Confort y sus dos Perfiles siguen activos. |
| 13:02 | Selecciona **Cancelar** mientras se confirma la ausencia. | Confort y sus dos Perfiles siguen activos; Ausente nunca se aplicó. |

La llegada prevista a las 18:00 se retira. Este episodio cancelado no activará después Ausente ni Tarde.

<a id="cancel-after-departure-is-confirmed"></a>

### Cancelar después de confirmar la salida

Este es un episodio independiente con la misma configuración inicial:

| Hora | Qué ocurre | Modo y Perfiles seleccionados |
| --- | --- | --- |
| 13:00 | Inicia un retorno y comienza la confirmación. | Confort y sus dos Perfiles siguen activos. |
| 13:05 | Todas las fuentes configuradas siguen indicando ausencia. | Velair aplica Ausente y sus Perfiles. |
| 13:10 | Selecciona **Cancelar**. | Velair restaura Confort y los dos Perfiles originales, y retira la llegada. |

El resultado es Confort, **no** el Modo de Retorno Tarde configurado. Si ya había comenzado la preparación para Tarde, cancelar también elimina esa preparación y restaura la selección original. Los Refuerzos activos, ajustes Manuales y pausas independientes conservan su prioridad.

<a id="start-without-occupancy-sensors"></a>

### Iniciar sin sensores de ocupación

Sin fuentes de ocupación configuradas, **Programar regreso** aplica Ausente inmediatamente. No hay una confirmación de cinco minutos. Cancelar ese retorno activo restaura Confort y los dos Perfiles registrados justo antes de iniciarlo. Un sensor configurado desconocido o indisponible no equivale a no tener sensores: sigue bloqueando una nueva confirmación de ausencia.

<a id="default-arrival-edits-and-restart"></a>

### Predeterminado, cambios de llegada y reinicio

Si el episodio comienza desde **Predeterminado** sin Perfiles activos, cancelar después de confirmar la salida vuelve a Predeterminado sin Perfiles activos. Una combinación manual de Perfiles se restaura en su orden original.

Cambiar la llegada de las 18:00 a las 19:00 o reiniciar Home Assistant no sustituye la selección anterior registrada. Cancelar sigue restaurando la selección anterior al inicio del episodio. No recupera temperaturas pasadas de los dispositivos ni estados HVAC: la selección restaurada utiliza sus horarios actuales, sujetos a las prioridades existentes.

<a id="choose-another-mode-instead-of-cancelling"></a>

### Elegir otro Modo en lugar de cancelar

Si seleccionas explícitamente **Eco** mientras hay un retorno activo, esa selección retira el retorno y mantiene Eco. Velair no restaura Confort posteriormente cuando cambia la ocupación o se cierra el aviso final. Así se conserva tu elección explícita; es una acción distinta del botón **Cancelar** del episodio.

<a id="distinguish-the-controls"></a>

### Distinguir los controles

- **Cancelar** en los controles de retorno retira el episodio como se describe arriba.
- **Volver** en el editor de llegada descarta los cambios de llegada no aplicados; el retorno guardado continúa.
- La **X** del panel genérico de acciones de la tarjeta de climatización cierra ese panel sin cancelar el retorno.
- **Cancelar**, junto a **Guardar** en la configuración de la rutina, descarta ajustes sin guardar en lugar de cancelar un episodio.

Para episodios antiguos sin selección anterior registrada, o si los Perfiles guardados ya no son válidos, consulta [los límites de restauración](#restoration-limits).

<a id="daily-behavior"></a>

## Comportamiento diario

Por ejemplo, configura de lunes a viernes a las 18:15. Después de que la casa permanezca vacía durante el tiempo de confirmación, Velair activa Ausente y resuelve el horario En casa a las 18:15. Cada zona utiliza su propia estimación de preparación. Una zona que necesita una hora puede comenzar a las 17:15 mientras una más rápida comienza después.

El objetivo es el bloque efectivo **a la llegada**, incluida la continuidad semanal. Si En casa solicita 17 grados antes de las 18:00 y 21 grados después, un retorno a las 18:15 prepara 21 grados aunque la preparación comience antes de las 18:00. El horario semanal no se edita ni se llena con bloques temporales.

A la hora prevista, Velair selecciona el destino y continúa su horario habitual. Una señal temprana de ocupación selecciona el destino inmediatamente una vez confirmada la salida supervisada. Una llegada tardía no vuelve a cambiar el hogar a Ausente. Las pausas, Refuerzo, ajuste Manual, zonas desactivadas y un programador detenido mantienen sus restricciones existentes de entrega. La preparación admite calefacción, refrigeración e intervalos nativos `heat_cool`. Busca acercar la habitación al objetivo; no puede garantizar una temperatura exacta. Las entidades que solo aceptan intervalos en Calor, Frío o Auto actúan únicamente a la llegada: Velair aplica ambos límites al llegar sin preparación anticipada ni aprendizaje térmico para ese objetivo. La preparación de habitaciones explica esta limitación; los ajustes guardados se conservan para objetivos compatibles.

<a id="preparation-and-room-assist"></a>

### Preparación y Room Assist

El Modo de destino define la configuración necesaria a la llegada. Cada zona comienza a su propia hora estimada; el Modo completo se selecciona a la llegada, no cuando empieza a prepararse la primera zona. Las zonas que todavía no han comenzado siguen el horario Ausente.

Cuando una zona empieza a prepararse, su objetivo temporal de llegada tiene prioridad sobre bloques posteriores del horario Ausente. Por ejemplo, con una ausencia de diez horas y retorno a las 19:25:

| Hora | Objetivo de esta habitación |
|---|---|
| 09:25, ausencia confirmada | Ausente solicita 16 grados |
| 16:25, esta zona comienza a prepararse | El horario de llegada solicita 21 grados |
| 17:00, un bloque Ausente solicita 18 grados | La preparación continúa hacia 21 grados |
| 19:25, llegada prevista | El Modo de destino inicia su horario normal |

Un bloque de horario Ausente no cancela la preparación de retorno de la zona. Esta prioridad también se aplica a refrigeración e intervalos de temperatura.

Si Room Assist está activado, sigue el mismo objetivo temporal de llegada. En este ejemplo ayuda a alcanzar 21 grados en la habitación, en lugar de corregirla hacia el objetivo Ausente de 16 grados. La consigna enviada al equipo puede diferir de 21 grados porque Room Assist compensa diferencias entre el sensor ambiente y la lectura propia del equipo. Las correcciones en cola se revalidan contra el objetivo actual antes de entregarse.

Un cambio directo de temperatura del usuario sigue la política de ajustes externos de la zona. **Mantener automático** vuelve a aplicar el objetivo actual que determina Velair, que durante la preparación es el de llegada. Un **ajuste Manual** que mantiene el control suspende la entrega automática y Room Assist para esa zona mientras ese ajuste esté activo. Refuerzo y pausas explícitas de zona conservan su prioridad existente; no cancelan todo el retorno del hogar. Consulta [Room Assist](room-assist.es.md) y [Ajuste manual](manual-control.es.md).

<a id="exceptions-and-restarts"></a>

## Excepciones y reinicios

La pestaña Regreso a casa muestra juntos el retorno aceptado, la preparación de cada zona y la rutina guardada, con su propia introducción y ayuda contextual. Ábrela directamente con `/velair/planned-return`; `/velair/preconditioning` abre la pestaña independiente de preacondicionamiento. Las antiguas URL de subsección siguen abriendo sus pestañas correspondientes. Ajustar la llegada cambia solo esta ausencia, no la semana guardada. **Cancelar** elimina la preparación y el cambio automático de destino. Antes de confirmar una ausencia normal, deja intacta la selección activa; tras confirmarla o aplicar Ausencia manual inmediata, restaura el Modo y Perfiles registrados antes del inicio del episodio.

Una selección explícita de Modo o Perfil cancela el retorno automático del episodio. Una señal de presencia posterior o reinicio no debe sobrescribir esa selección. Velair recuerda las ausencias completadas o canceladas hasta que el hogar vuelva a estar ocupado.

Esta selección explícita también cancela la preparación del episodio ya en curso, incluso cuando la configuración del Modo o Perfil seleccionado ya está activa. Se diferencia de un cambio programado de temperatura dentro del Modo Ausente, que no cancela la preparación. Ni la barra lateral ni la tarjeta incluyen botones Omitir, Estoy en casa o Cerrar; los controles compartidos de retorno son Cancelar y Cambiar llegada. El backend conserva operaciones independientes de omisión y llegada para consumidores de la API; sus contratos están documentados en la [API para desarrolladores](../developer/api.md).
La acción `velair.cancel_planned_return` cancela un retorno pendiente o activo confirmado, o cierra un aviso de episodio inactivo. Cancelar detiene la preparación y el retorno temporizado e impide su reinicio automático para esta ausencia. Para una salida confirmada restaura la selección anterior guardada de Modo/Perfiles; para una confirmación pendiente normal o aviso final no cambia la selección. Si Ausencia se aplicó manualmente de inmediato, restaura la selección anterior aunque aún no se haya confirmado la salida. Una nueva selección explícita de **Programar regreso** todavía puede iniciar otro episodio.

<a id="restoration-limits"></a>

### Límites de restauración

Para un regreso puntual, Velair registra la selección cuando eliges **Programar regreso**. Para la rutina semanal, la registra cuando se confirma la ausencia, justo antes de aplicar el Modo Ausente.

La selección anterior sobrevive a los cambios de llegada y reinicios de Home Assistant. Restaura la selección de Perfiles, no temperaturas históricas ni estados de dispositivos; los Perfiles restaurados utilizan sus horarios actuales y las prioridades existentes. Si el Modo anterior se eliminó o cambió, los Perfiles originales pueden restaurarse como una selección manual. Si falta un Perfil guardado, es inválido o entra en conflicto con otro, la cancelación sigue completándose, pero conserva la selección actual e informa de que la restauración no estaba disponible. Los episodios creados antes de existir estos metadatos conservan la selección actual porque Velair no puede deducir la anterior.

Al reiniciar, las solicitudes puntuales pendientes y las ausencias confirmadas se recuperan en lugar de comenzar otra vez. Una ausencia sin confirmar reinicia su tiempo de confirmación. Un sensor que indique ocupación permite actualizar el estado de la ausencia anterior aunque la llegada haya ocurrido mientras Home Assistant estaba desconectado. Ausencia manual inmediata conserva su bloqueo de regreso por presencia tras reiniciar: una confirmación incompleta comienza otra vez con el tiempo completo y la presencia inicial no cuenta como regreso. Una confirmación completada se mantiene completada. La llegada programada sigue siendo la referencia en ambos casos.

<a id="limits-and-backups"></a>

## Límites y copias de seguridad

- Se admite una rutina para todo el hogar. Las llegadas semanales siguen siendo del mismo día: salir después de la hora de hoy, o en un día sin hora, activa Ausente sin programar el retorno de mañana. Los regresos puntuales pueden utilizar cualquier fecha futura.
- No se interpretan calendarios, turnos rotativos ni rutinas nocturnas automáticas.
- Sin preacondicionamiento activado, lectura de temperatura u objetivo térmico, el destino cambia igualmente a la llegada, pero esa zona no se prepara antes.
- Las transiciones que afectan a zonas de ejecución externa se rechazan antes de cambiar el Modo; Velair no toma el control local de su controlador.
- El blueprint genérico existente En casa/Ausente no cambia y sigue siendo útil para otras instalaciones y acciones.
- Las copias portátiles incluyen la configuración de la rutina, no los episodios de ocupación ni temporizadores. Las rutinas importadas permanecen desactivadas hasta activarlas explícitamente.

Consulta [Perfiles climáticos](climate-profiles.es.md), [Preacondicionamiento adaptativo](adaptive-preconditioning.es.md) y [Ajuste manual](manual-control.es.md) para conocer los controles subyacentes.

<a id="overview-and-diagnostics"></a>

## Resumen y Diagnóstico

Overview muestra un resumen compacto del hogar durante un episodio semanal o puntual, o cuando una incidencia requiere atención. Identifica el origen y estado y muestra el plazo de confirmación o la llegada prevista cuando corresponde. Para un regreso aceptado, los contadores compactos con iconos muestran recuentos de preparación y ayuda al pasar el ratón, enfocar con teclado o tocar. Una salida confirmada añade una línea temporal de solo lectura con salida y llegada, los Modos seleccionados para esos extremos y puntos estimados de preparación de cada equipo compatible, con color y nombre correspondientes en la leyenda inferior. Cada entrada muestra además el inicio estimado de preparación junto al nombre, en la misma línea, con la zona horaria y formato de hora de Home Assistant; los inicios de un día posterior incluyen la fecha. Los puntos coinciden con los círculos de 8 px de la leyenda; una marca vertical neutra identifica el momento actual. La leyenda ocupa una fila por defecto: los nombres largos se abrevian y el botón «+N equipos» despliega el resto de estancias en filas adicionales dentro del resumen. Selecciona «Mostrar menos» para volver a una fila. Cada estancia conserva su color y ayuda de nombre completo/inicio estimado, disponible al pasar el ratón, enfocar o tocar. Ampliar y contraer no navega ni cambia el regreso. Solo se representa la preparación adaptativa con inicio estimado válido; se excluyen las estancias de solo llegada, suspendidas, ya en objetivo y no disponibles. Los puntos solapados comparten un círculo dividido en sectores iguales de colores, uno por equipo. Pasa el ratón, enfoca o toca un punto o entrada para ver el inicio estimado de cada estancia. Son estimaciones actuales, no un historial de actividad física. La línea temporal se sitúa junto al resumen cuando cabe y debajo en contenedores estrechos. Mide tiempo de ausencia transcurrido, no progreso térmico. Selecciona el resumen fuera de las ayudas para abrir el detalle completo en la pestaña Regreso a casa; las ayudas no navegan ni cambian el regreso.

**Próximos eventos durante un regreso activo**

Overview y las cards de próximos eventos muestran el siguiente cambio de control previsto para cada equipo, identificando el origen como horario semanal o Regreso a casa. Una acción semanal anterior al inicio de preparación sigue siendo elegible. Cuando la preparación de regreso controla un equipo, su siguiente transición es la llegada y no un bloque del horario de ausencia ajeno al regreso, incluso si la estancia ya alcanzó el objetivo. Los equipos sin intervención de regreso mantienen sus eventos semanales.

Los inicios de preparación son estimaciones basadas en medidas actuales. La llegada puede cambiar temperatura u opciones HVAC, apagar o activar un Perfil pausado; no es necesariamente una orden de temperatura. Boost, control manual y pausas mantienen su prioridad habitual. Las filas suspendidas explican el bloqueo y solo muestran un vencimiento conocido cuando todos los bloqueos activos tienen uno; el vencimiento no garantiza que la preparación empiece entonces. Las filas comparten la misma distribución compacta para eventos semanales y de regreso: nombre del equipo, etiqueta corta de origen, horas, acción y modo HVAC. La ayuda al final de cada fila muestra fase completa, Modo de llegada, motivo de suspensión/vencimiento conocido y referencia del evento semanal actual cuando el regreso tiene prioridad. Ábrela al pasar el ratón, enfocar con teclado o tocar. No se añade un subtítulo de estado bajo el nombre. Los anchos de columna se comparten entre filas y se ajustan al mayor valor mostrado para evitar huecos fijos en horas, acción y HVAC. Las listas estrechas mantienen eventos de una sola fila, con scroll horizontal y columna fija de nombres; los datos no pasan a otra fila.

Estas previsiones no confirman el envío al dispositivo ni cambian la ejecución. Los sensores existentes de próximo evento y las vistas de anticipación semanal conservan su significado semanal. Instala versiones correspondientes de integración y frontend para ver estas previsiones efectivas; un backend anterior sigue proporcionando eventos semanales.

Una señal violeta en un equipo identifica el control actual de Regreso a casa. El estado operativo existente permanece visible: esta señal explica el origen en vez de sustituir los estados calefacción, refrigeración, pausa, programado o preacondicionamiento. Las estimaciones de inicio futuro se etiquetan por separado. El control Manual, Refuerzo y pausas independientes conservan su prioridad. La atribución Ausente cubre los Perfiles Ausente efectivos del episodio, o Predeterminado cuando se selecciona explícitamente como Modo Ausente; no cubre un equipo sin correspondencia que simplemente conserva su horario Predeterminado. La preparación puede utilizar legítimamente el horario Predeterminado utilizado como alternativa en el destino cuando el backend selecciona el objetivo de llegada de ese equipo.

Las zonas de Overview muestran un indicador compacto de regreso junto a los indicadores de Perfil y confort: el estado de preparación de la estancia y la temperatura o rango de llegada, cuando existen. La ayuda cubre todo el indicador y se abre con ratón, foco de teclado o toque. Explica estado, inicio estimado, hora de llegada, motivo de suspensión o falta de disponibilidad y atribución actual del control de regreso, sin añadir un panel de preparación de varias líneas. Así, una estancia que aún sigue Ausente puede mostrar su preparación futura sin afirmar que ya la controla. No se inventan estimaciones que faltan; los regresos completados, cancelados y omitidos no conservan una vista previa activa de preparación. Las cards de climatización mantienen su presentación detallada de preparación.

Diagnóstico muestra el estado actual del hogar, origen del control por equipo y estado de preparación, incluido por qué está suspendida o no disponible. La categoría del historial **Regreso planificado** registra transiciones aceptadas relevantes sin duplicados al actualizar el panel. Sus entradas comparten el límite existente de 100 eventos de ejecución y se borran al reiniciar. Las preferencias guardadas de categorías se conservan. Los informes descargados incluyen esta información y eliminan identificadores operativos de Modos y Perfiles. La intención de control y el éxito de entrega siguen separados.

<a id="dashboard-card"></a>

## Tarjeta de panel

La card Lovelace opcional muestra los controles compactos de Regreso puntual. Su encabezado incluye los recuentos de fuentes ocupadas, vacías y desconocidas y el tiempo guardado de confirmación de ausencia. Un regreso aceptado muestra indicadores compactos de estado de preparación; sus ayudas con ratón, teclado y toque conservan recuentos de estancias, llegada y el inicio estimado compatible más temprano. La línea temporal del hogar usa el gráfico del panel: tipografía de fechas coincidente, campo oscuro de llegada editable, marca neutra de Ahora y puntos de preparación de cada equipo compatible. La leyenda ocupa inicialmente una fila, se amplía dentro de la card con +N y se contrae con Mostrar menos. Las etiquetas de Modos permanecen bajo la barra. El nombre e inicio estimado de cada equipo siguen accesibles desde las ayudas de los puntos y la leyenda. Las ayudas también explican salida, icono de llegada, fase actual, contadores de presencia y tiempo de confirmación mediante ratón, foco o toque. La ayuda de presencia enumera las fuentes configuradas correspondientes. El campo de llegada sigue siendo un botón de edición; su ayuda está en el icono de llegada adyacente. La configuración semanal, la lista de fuentes y la lista completa de preparación de estancias permanecen en el panel. Configura primero la vivienda desde el panel.

```yaml
type: custom:velair-card
view: planned-return
```

Selecciona **Regreso a casa** en el editor visual de tarjetas. La tarjeta opera sobre el mismo episodio persistido que la barra lateral y otras tarjetas. Admite fechas y horas futuras de retorno. Los episodios activos ofrecen **Cancelar** y **Cambiar llegada**; Cancelar detiene el retorno aceptado y restaura la selección anterior registrada de Modo/Perfiles después de aplicar Ausencia, incluida la activación manual inmediata; durante una confirmación pendiente normal deja intacta la selección. Después de completar, cancelar o cualquier otro episodio inactivo, la tarjeta muestra un formulario nuevo sin esperar cambios en la ocupación del hogar. Una configuración guardada inválida o un programador detenido desactivan la planificación y los cambios, pero todavía puede cancelarse un retorno activo. La barra lateral utiliza los mismos botones y ciclo de vida; la configuración semanal y su interruptor de activación permanecen allí. Solo los indicadores finales de fuentes/tiempo son exclusivos de la tarjeta; esta y la barra lateral comparten el subtítulo de fase unido al título, la edición de llegada y la línea temporal. Durante la confirmación, el bloque del temporizador sustituye el subtítulo. Esta vista del hogar no tiene filtro de termostatos.

La card **Climatización: estado y control** también puede exponer **Regreso puntual** como acción rápida de Velair junto a Boost y Pausa. Actívala en el editor de acciones de esa card, elige si mostrar su nombre o colócala en Más. El editor agrupa primero Boost, Pausa y Regreso puntual, aunque estén deshabilitados. Abre los mismos controles compactos en el panel inferior, con un encabezado sencillo a juego con Boost y Pausa. Los tres formularios utilizan los campos compactos existentes de 38 píxeles. Una salida activa usa la línea temporal refinada de Regreso a casa: tipografía uniforme de salida/llegada, superficie de llegada editable más oscura, marca neutra de Ahora y un punto de preparación solo del equipo seleccionado en la card. El panel omite los indicadores de estado de preparación y muestra el nombre y el inicio estimado del equipo seleccionado en la leyenda. Si no tiene una estimación válida actual de preparación anticipada, el gráfico se sustituye por una explicación breve: solo llegada, objetivo alcanzado, suspensión y su motivo, preparación no disponible o estimación ausente. La estimación de otro equipo nunca sustituye a la de la estancia seleccionada. La llegada guardada sigue editable y Cancelar sigue disponible incluso sin gráfico. Los indicadores de presencia siguen en el encabezado. Esta acción controla el regreso del hogar, incluidos otros equipos gestionados; no se limita al de la card. Se omiten los párrafos repetidos de cuenta atrás y el desplegable del primer inicio. La card dedicada de Regreso a casa muestra el mismo gráfico para todos los equipos gestionados compatibles y conserva sus indicadores de estado y leyenda del hogar. La X cierra los controles sin cancelar la salida. Cerrar con cambios de llegada sin guardar pregunta si se quieren descartar; el cierre se bloquea mientras se ejecuta una acción. La acción siempre controla el hogar, independientemente del equipo seleccionado. Las configuraciones de card existentes la mantienen oculta. Las cards nuevas creadas desde el selector de Home Assistant la incluyen activada; las configuraciones YAML deben habilitarla con `type: planned-return` en `climate_actions`.

Durante **Ausente** y **Preparando para la llegada**, la card muestra la hora de aplicación de Ausencia y la llegada guardada con los nombres de los Modos de ausencia y regreso del episodio. Con Ausencia manual inmediata, esa aplicación puede preceder a la salida física confirmada. Un indicador del momento actual, identificado por la ayuda **Ahora**, avanza según el tiempo UTC transcurrido, también durante cambios de hora, y permanece dentro de la barra. Los extremos incluyen fechas cuando las fechas de calendario de Home Assistant difieren. Las ediciones de llegada sin guardar no cambian la barra. Las salidas pendientes normales, los estados finales o los episodios sin marca temporal de aplicación de Ausencia mantienen un estado estático sin gráfico. Panel y card actualizan sus relojes locales una vez por minuto solo mientras están visibles y activos, e inmediatamente al volver a ser visibles; esta actualización visual nunca solicita datos al backend.

En la pestaña Regreso a casa, la línea temporal omite contadores de preparación y el resumen multilínea de cuenta atrás porque los estados ya se explican encima. La salida guardada y llegada editable están sobre la barra, con la misma tipografía para ambas fechas. La llegada aparece en una superficie más oscura que abre el editor al pulsarla, sin lápiz ni subrayado de enlace. Las etiquetas de los Modos de ausencia y destino quedan debajo. Una marca vertical neutra muestra Ahora al final del tramo transcurrido. Los equipos compatibles tienen pequeños puntos de preparación de colores y una leyenda correspondiente con cada nombre e inicio estimado y sus propias ayudas de inicio. Los puntos solapados comparten un círculo segmentado. La leyenda se amplía dentro del panel al solicitarlo y puede contraerse. Los equipos suspendidos, en objetivo, de solo llegada y no disponibles siguen representados en los detalles de Preparación de estancias de arriba, en lugar de recibir puntos inventados. La card del hogar conserva sus indicadores de estado. La sección detallada de Preparación de estancias permanece arriba; la línea temporal no repite el primer inicio estimado en otro desplegable. Cambiar la llegada guardada o el destino reinicia la expansión de la leyenda y descarta estimaciones obsoletas. Editar un borrador de llegada no altera la proyección guardada. Se conservan los controles existentes de cancelación y edición de llegada.

Los controles de dashboard usan este mismo gráfico. La card del hogar conserva indicadores de estado porque no incluye la sección completa de preparación de la pestaña. Mantiene todos los puntos de equipos compatibles actuales; la acción integrada en la card de climatización muestra solo la estancia seleccionada, con su nombre e inicio estimado en la leyenda. Los campos de fecha/hora conservan el tamaño compacto y los controles Volver/Cambiar. Abrir el editor deja intacto el gráfico aceptado; Volver restaura la llegada guardada. Aceptar otra llegada o destino reinicia la expansión de la leyenda del hogar y descarta estimaciones obsoletas. Los equipos suspendidos, en objetivo, no disponibles y de solo llegada no reciben puntos de preparación. Un punto anterior al límite de salida se coloca en el borde y su ayuda conserva la estimación real. El progreso transcurrido mide tiempo hacia la llegada, no progreso térmico. Si falta una estimación del hogar, las ayudas explican el estado conocido sin implicar que la preparación esté deshabilitada.