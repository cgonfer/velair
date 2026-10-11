<a id="planned-return"></a>

# Regreso a casa
<!-- velair-docs:start -->
Traducciones: [Original en inglés](planned-return.md) · [Español](planned-return.es.md) · [Français](planned-return.fr.md) · [Deutsch](planned-return.de.md) · [Italiano](planned-return.it.md) · [Nederlands](planned-return.nl.md) · [Polski](planned-return.pl.md) · [Português (Brasil)](planned-return.pt-br.md) · [Português (Portugal)](planned-return.pt-pt.md) · [Русский](planned-return.ru.md) · [Estado de las traducciones](../translation-status.md)

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

Regreso a casa prepara el hogar para una hora de llegada habitual o puntual después de que las señales de ocupación seleccionadas confirmen que toda la casa está vacía, o tras un inicio puntual explícito cuando no hay fuentes de ocupación configuradas. Configúralo en Velair; no requiere blueprints adicionales ni acciones diarias para una rutina semanal estable.
La rutina automática está desactivada por defecto y se ejecuta localmente en Home Assistant. Los regresos puntuales necesitan Modos Ausente/Retorno guardados y el programador en modo Automático y en funcionamiento; las fuentes de ocupación son opcionales para inicios explícitos. La rutina semanal requiere al menos una fuente de ocupación.

<a id="setup"></a>

## Configuración

1. Crea los Modos Ausente y En casa deseados, o utiliza Predeterminado como destino. Los Perfiles de ausencia pueden apagar equipos o utilizar horarios semanales de menor demanda.
2. Abre **Preparación del confort**, elige **Regreso a casa** en el selector de subsecciones y añade señales de ocupación para salidas supervisadas o semanales. Utiliza sensores binarios, ayudantes booleanos, grupos o la zona de hogar de Home Assistant (`zone.home`). Incluye señales para cualquier persona que pueda permanecer en casa, también invitados. Home Assistant sigue siendo responsable del seguimiento de personas y ubicaciones; las reglas complejas pueden combinarse en un ayudante.
3. En la sección de ausencia, elige cuánto tiempo debe permanecer vacía la casa y qué Modo Ausente activar. El valor predeterminado es diez minutos; el control compacto admite minutos u horas. La llegada se reconoce inmediatamente.
4. En la sección de llegada, introduce la hora habitual de cada día aplicable y selecciona el Modo de destino. Los días sin hora no tienen retorno automático. Velair utiliza el horario del destino a la llegada para preparar cada zona.
5. Activa el Preacondicionamiento adaptativo para las zonas que deban comenzar antes. Se reutilizan los ajustes existentes y el aprendizaje local de calefacción/refrigeración.
6. Utiliza el interruptor de la barra de estado para activar la rutina y después selecciona Guardar. El interruptor modifica el borrador; Cancelar restaura el ajuste guardado. Detén cualquier automatización En casa/Ausente que seleccione Modos para ese mismo hogar; dos controladores competirían entre sí.

Los días siguen la preferencia **Primer día de la semana** guardada en Ajustes de Velair. Introduce directamente una hora de llegada para cada día. Si sales un día sin hora, Velair aplica Ausente después de confirmar la ausencia, no programa preparación anticipada y restaura el destino cuando detecta ocupación. La zona horaria de Home Assistant se muestra junto a la rutina semanal. Los cambios permanecen en el borrador hasta guardarlos. Cancelar y Guardar están a la derecha del pie de configuración.

El resumen superior agrupa tres partes de la rutina en contenedores con borde independientes que corresponden a las secciones de ajustes, sin una tarjeta que los englobe ni una línea lateral compartida. La rutina semanal muestra el Modo Ausente, el tiempo de confirmación de ausencia, la preparación adaptativa y el Modo de destino como un flujo sencillo; el interruptor modifica la activación de la rutina. El tiempo es el que la casa debe permanecer vacía, no una estimación de preparación.
La sección de ocupación muestra el resultado combinado y recuentos de fuentes; expándela para revisar cada señal. Las señales desconocidas impiden una nueva ausencia y se distinguen de la presencia confirmada. La sección de retorno rápido reúne la salida puntual y los controles de llegada del episodio actual. Las acciones de ejecución utilizan la configuración guardada, por lo que debes guardar o cancelar los cambios pendientes antes de anunciar una nueva salida.

El formulario sigue el orden de salida y llegada: fuentes de ocupación, tiempo de ausencia y Modo Ausente, después horas semanales de llegada y Modo de destino. Las fuentes de presencia utilizan la acción circular verde Añadir del editor de bloques cuando hay una fuente seleccionada. Añadir y Eliminar desactivados mantienen su aspecto transparente; las acciones activadas responden al puntero y al foco.
La lista de fuentes configuradas comienza contraída. Su resumen muestra el total y los recuentos de señales ocupadas, vacías y desconocidas; expándela para revisar o eliminar fuentes individuales. En móvil, el resumen ocupa todo el ancho del selector y la fila Añadir; los iconos de estado y números mantienen juntos los recuentos, con etiquetas accesibles completas. Los contadores se alinean al extremo final del resumen. En móvil, la lista expandida comparte el ancho del resumen, con Eliminar al final de cada fila y más espacio para nombres e identificadores. Las listas de escritorio tienen el ancho del selector. Expandir la lista no cambia la configuración.
Los tiempos introducidos en horas se redondean al minuto más cercano; el tiempo equivalente se muestra junto al control.

Los estados ocupados reconocidos son `on` y `home`; los vacíos son `off` y `not_home`. Para la zona de hogar, cero personas significa vacío y un recuento positivo significa ocupado. Cualquier señal ocupada hace que el hogar esté ocupado; el hogar solo se considera vacío cuando todas las señales indican ausencia. Si ninguna indica presencia y una es desconocida o no está disponible, la ocupación es desconocida: no pueden comenzar nuevas ausencias. Un retorno aceptado permanece programado. El panel muestra el resultado combinado y cada fuente.

Selecciona señales que representen ocupación: que un sensor de movimiento esté apagado no significa necesariamente que no haya nadie en casa.

<a id="room-preparation"></a>

## Preparación de estancias

Expande **Preparación de estancias** debajo del flujo de la rutina para ver todos los equipos gestionados. La lista comienza contraída, con recuentos de preparación adaptativa, actuación solo a la llegada y sin preparación. Expandirla no cambia ajustes ni envía órdenes a los equipos. El mismo resumen se aplica a retornos semanales y puntuales.

Cada fila identifica la habitación, la fuente de su horario de destino y el estado de preparación. Un equipo que no aparezca en los Perfiles del Modo de destino sigue utilizando su horario **Predeterminado**; un comportamiento normal explícito también utiliza Predeterminado. Un horario de Perfil utiliza el nombre de ese Perfil. Una pausa del Perfil de destino, zona desactivada o ejecución externa se identifica por separado, en lugar de etiquetarse como solo a la llegada. Sin Preacondicionamiento adaptativo, una habitación local activada sigue su horario efectivo a la llegada; no se excluye automáticamente de los cambios de Modo.

Sin un retorno futuro, esta lista describe las capacidades de la configuración guardada, no una predicción de que la habitación vaya a comenzar antes. Una vez aceptado un retorno, resuelve cada objetivo de destino a esa hora de llegada y muestra los estados pendiente, preparando, objetivo alcanzado, suspendido o no disponible con el motivo correspondiente. La falta de datos de temperatura o de una estimación válida impide la preparación anticipada; Refuerzo, ajuste Manual y pausas explícitas mantienen su prioridad habitual. Una salida sin confirmar no puede mostrarse como preparando.
**Preparando** describe la intención activa de preparación de Velair, no confirma que el dispositivo haya recibido una orden o esté funcionando físicamente. **Objetivo alcanzado** es una temperatura actual medida dentro de la tolerancia de preparación y puede ser cierto antes de salir; no inicia una ausencia ni omite la confirmación.

**Inicio previsto** es una estimación, no prueba de una orden al equipo ni de que esté físicamente preparado. Los objetivos admiten calefacción, refrigeración e intervalos de temperatura. Los retornos completados, cancelados y omitidos vuelven a información de configuración en lugar de mostrar horas obsoletas de preparación. Diagnóstico sigue utilizando los ajustes guardados del backend hasta que Guardar finalice correctamente, sin un recordatorio adicional de preparación. Esta lista completa sustituye la antigua lista de zonas limitada al episodio.

<a id="one-off-return"></a>

## Regreso puntual

En **Regreso puntual**, elige una fecha y hora futuras de llegada y selecciona **Programar regreso**. Fecha y hora están juntas. En móvil, **Programar regreso** está en la siguiente fila, alineado con el borde derecho del campo de hora; los diseños mayores mantienen la acción junto a los campos. La explicación está debajo de los controles.
Puedes hacerlo antes de salir o cuando ya estás fuera. Velair utiliza los ajustes guardados de Modos y presencia. Con fuentes de ocupación configuradas, mantiene la solicitud pendiente y aplica Ausente solo cuando todas indiquen ausencia durante el tiempo de confirmación, protegiendo a quienes permanezcan en casa.
Sin fuentes guardadas, pulsar **Programar regreso** es tu confirmación explícita de salida: Ausente comienza inmediatamente, sin tiempo de ausencia. Velair no deduce que la casa esté vacía ni detecta tu regreso físico en este caso; prepara las habitaciones normalmente y activa el destino a la llegada guardada. Una fuente configurada desconocida/no disponible sigue esperando; una entidad ausente no puede tratarse como una lista de fuentes vacía.

La fecha y hora puntuales sustituyen la hora semanal solo para esta ausencia. También funciona con la rutina automática desactivada. Puedes cambiar o cancelar el aviso pendiente; si la salida no se confirma antes de su hora de llegada, caduca sin cambiar Modos. Si todas las fuentes ya indican ausencia y no hay un episodio activo, planificar el retorno inicia inmediatamente el tiempo configurado de confirmación; no requiere un nuevo cambio de sensor. Si ya hay una ausencia activa, cambia la fecha y hora de llegada con el editor existente del episodio; así el retorno pasa a ser una excepción puntual sin volver a aplicar Ausente.
Posponer la llegada termina su preparación anterior y restaura el comportamiento actual de Ausente hasta que corresponda la nueva preparación. Los refuerzos y ajustes manuales siguen protegidos. El objetivo de destino se resuelve en la fecha local seleccionada de llegada, también cuando la preparación comienza el día anterior. Enviar el mismo instante no reinicia la preparación. Se rechazan llegadas pasadas o actuales y horas locales inexistentes por el cambio de horario de verano; una hora local repetida utiliza su primera ocurrencia futura.

Los episodios completados, omitidos y cancelados permanecen bloqueados para la rutina automática hasta detectar ocupación, de modo que una casa vacía no inicia por sí sola otra salida semanal. Puedes elegir explícitamente **Programar regreso** después de cualquier episodio inactivo sin esperar a estar en casa. La nueva solicitud utiliza las fuentes de presencia y Modos actuales. Con fuentes, vuelve a confirmar ausencia durante el tiempo configurado aunque todos estén fuera, sin cambiar inmediatamente el Modo. Sin fuentes, la solicitud explícita activa Ausente inmediatamente. Tanto la barra lateral como la tarjeta muestran un formulario nuevo en cuanto el episodio queda inactivo. Si la planificación no está disponible, el formulario permanece visible con **Programar regreso** desactivado y una explicación de los ajustes guardados y estado del programador necesarios. En esa situación todavía puede cancelarse un retorno activo.

Después de confirmar la salida, utiliza **Cancelar** para detener el retorno y restaurar el Modo y Perfiles anteriores registrados, o **Cambiar llegada** para actualizar fecha y hora. Durante la confirmación de ausencia, cancelar deja intacta la selección activa porque todavía no se ha aplicado Ausente. Desactivar la rutina automática o editar las horas semanales no cancela un retorno manual. Cambiar sus fuentes de presencia o Modos invalida el aviso anterior. Las selecciones explícitas de Modos/Perfiles cancelan retornos pendientes y activos. Un programador detenido no ejecuta el retorno.

La primera fila mantiene el título Regreso puntual a la izquierda y los indicadores de ocupación exclusivos de la tarjeta a la derecha. La fase actual es un subtítulo compacto unido al título, sin etiqueta ni fila independiente. Durante la confirmación, el encabezado del temporizador aporta la fase. La tarjeta agrupa los recuentos arriba a la derecha cuando hay fuentes configuradas. Sin fuentes se omiten los contadores y el icono de espera no utilizado, y la barra lateral muestra **Sin supervisión** en lugar de ocupación desconocida. El icono de tiempo de confirmación solo aparece antes de confirmar una ausencia activa; se oculta durante Ausente/Preparando y errores activos con salida confirmada. La barra lateral no repite esos indicadores. Sitúa el puntero encima para una breve explicación de la fase.
Durante la confirmación, una fila ligera de temporizador explica que Velair comprueba si la casa permanece vacía. **Hasta** muestra el plazo de confirmación del backend en hora local de Home Assistant, con la fecha si difiere de hoy. Velair activa el Modo Ausente tras la confirmación solo si todas las fuentes seleccionadas siguen indicando ausencia. Es un plazo, no una cuenta atrás en vivo ni una salida confirmada. El mismo proceso aparece mientras la rutina semanal confirma una ausencia antes de existir un episodio; si faltan datos del plazo, no inventa una hora.
Antes de confirmar la salida, un icono de llegada y la etiqueta **Llegada prevista** identifican el retorno guardado, con etiqueta accesible y ayuda emergente. Esta fila se alinea con el título y texto de estado. La fecha/hora guardada es una etiqueta compacta pulsable, sin lápiz ni subrayado. La línea temporal confirmada utiliza el mismo icono; solo la fecha/hora guardada subrayada y el lápiz a su izquierda forman el botón de edición. Selecciona ese valor para abrir el editor integrado de fecha/hora. Su fila de acciones tiene un botón azul **Volver** con flecha izquierda a la izquierda y **Cambiar llegada** verde a la derecha. Volver descarta los cambios de llegada sin guardar y cierra el editor sin modificar el retorno.
En un panel lateral amplio, el editor permanece compacto y se alinea con el extremo correspondiente a la llegada; la acción de cambio permanece a la derecha debajo del editor. Las pantallas estrechas y la tarjeta conservan su diseño adaptable. Los campos siguen ocultos hasta solicitarlos. **Volver** restaura la última llegada guardada y oculta los campos. Borra la advertencia de llegada y la protección de navegación; los cambios independientes de configuración de la rutina siguen protegidos. Reabrir comienza desde la llegada guardada. Durante una ausencia confirmada, el extremo correspondiente a la llegada de la línea temporal es ese mismo botón de edición, sin duplicar la llegada.
Cancelar aparece a la izquierda debajo del gráfico y la leyenda de preparación solo mientras el editor está cerrado. Al editar, Cancelar se oculta y **Cambiar llegada** está a la derecha y **Volver** a la izquierda, descartando localmente la edición. Modificar el campo no cambia el retorno hasta que **Cambiar llegada** finalice correctamente. Los cambios correctos cierran el editor y devuelven el foco a la llegada guardada. Los fallos y las actualizaciones de sensores conservan el borrador abierto.
Un aviso de cambios sin guardar identifica la edición pendiente, y navegar o recargar advierte antes de descartarla. Guardar la configuración de la rutina no aplica una edición de llegada. Volver y Cambiar llegada utilizan botones compactos con fondo azul y verde, respectivamente. Sus botones visibles tienen 32 píxeles de alto dentro de áreas táctiles de 44 píxeles. La cancelación utiliza un botón compacto rojo con icono/texto blancos debajo de los datos del episodio. Su botón visible tiene 32 píxeles de alto dentro de un área táctil de 44; los estados al pasar el puntero o recibir el foco siguen siendo claros. Los colores de primer plano se adaptan al tema para mantener legibles texto e iconos.
Las acciones indisponibles utilizan un fondo neutral, texto e iconos atenuados y un cursor de prohibición. Cambiar llegada adquiere el verde al editar la llegada. La fase sigue unida al título. Cancelar queda a la izquierda debajo de los datos cuando no se edita; Cambiar llegada se alinea a la derecha debajo del editor abierto. Barra lateral y tarjeta conservan esta agrupación en móvil. Programar regreso permanece alineado a la derecha en el formulario nuevo. Las acciones correctas actualizan el episodio sin un mensaje adicional de guardado.

<a id="home-assistant-actions"></a>

### Acciones de Home Assistant

Las automatizaciones, scripts y paneles pueden anunciar una salida mediante `velair.start_planned_return`. Se requieren tanto `return_date` (`YYYY-MM-DD`) como `return_time` (`HH:MM` de 24 horas). Juntos deben identificar una llegada futura en la zona horaria de Home Assistant. El selector nativo de hora puede enviar `HH:MM:00`; se aceptan segundos cero y se normalizan a precisión de minutos. Elige una fecha futura para el ejemplo siguiente:

```yaml
action: velair.start_planned_return
data:
  return_date: "2026-10-09"
  return_time: "19:25"
```

Utiliza los ajustes guardados de presencia y Modos y el mismo comportamiento de confirmación, preparación y prioridad que **Programar regreso**. Funciona con la rutina semanal desactivada y actualiza la fecha y hora de llegada si ya hay una ausencia activa, sin volver a aplicar Ausente. Los Modos guardados y el programador en modo Automático deben estar operativos. Las fuentes son opcionales para regresos puntuales: una lista guardada vacía aplica Ausente inmediatamente; las fuentes configuradas conservan las reglas normales de confirmación. Una llegada pasada o en el instante actual se rechaza sin sustituir el retorno anterior. Una hora caducada o inexistente por horario de verano se rechaza; durante una hora repetida, Velair elige la primera ocurrencia que siga siendo futura.

Cancela un retorno pendiente o activo:

```yaml
action: velair.cancel_planned_return
data: {}
```

La misma acción de cancelación también cierra un aviso de episodio inactivo. Detiene la preparación y el retorno temporizado, manteniendo el bloqueo de cancelación automática. Después de confirmar la salida, restaura el Modo y la selección exacta de Perfiles guardados antes del inicio del episodio. Durante la confirmación deja intacta la selección actual. Una nueva selección explícita de **Programar regreso** puede sustituir ese episodio inactivo. La barra lateral y la tarjeta utilizan esta misma acción de cancelación.

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

A la hora prevista, Velair selecciona el destino y continúa su horario habitual. Una señal temprana de ocupación selecciona el destino inmediatamente. Una llegada tardía no vuelve a cambiar el hogar a Ausente. Las pausas, Refuerzo, ajuste Manual, zonas desactivadas y un programador detenido mantienen sus restricciones existentes de entrega. La preparación admite calefacción, refrigeración e intervalos de temperatura nativos. Busca acercar la habitación al objetivo; no puede garantizar una temperatura exacta.

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

La subsección Regreso a casa muestra juntos el retorno aceptado, la preparación de cada zona y la rutina guardada. Ábrela directamente con `/velair/preconditioning/planned-return`; `/velair/preconditioning/preconditioning` abre Anticipación adaptativa, la subsección predeterminada de la pestaña. Ajustar la hora de llegada cambia solo esta ausencia, no la semana guardada. **Cancelar** elimina la preparación y el cambio automático de destino. Antes de confirmar la ausencia, deja intacta la selección activa; después, restaura el Modo y Perfiles registrados antes del inicio del episodio.

Una selección explícita de Modo o Perfil cancela el retorno automático del episodio. Una señal de presencia posterior o reinicio no debe sobrescribir esa selección. Velair recuerda las ausencias completadas o canceladas hasta que el hogar vuelva a estar ocupado.

Esta selección explícita también cancela la preparación del episodio ya en curso, incluso cuando la configuración del Modo o Perfil seleccionado ya está activa. Se diferencia de un cambio programado de temperatura dentro del Modo Ausente, que no cancela la preparación. Ni la barra lateral ni la tarjeta incluyen botones Omitir, Estoy en casa o Cerrar; los controles compartidos de retorno son Cancelar y Cambiar llegada. El backend conserva operaciones independientes de omisión y llegada para consumidores de la API; sus contratos están documentados en la [API para desarrolladores](../developer/api.md).
La acción `velair.cancel_planned_return` cancela un retorno pendiente o activo confirmado, o cierra un aviso de episodio inactivo. Cancelar detiene la preparación y el retorno temporizado e impide su reinicio automático para esta ausencia. Para una salida confirmada restaura la selección anterior guardada de Modo/Perfiles; para una confirmación pendiente o aviso final no cambia la selección. Una nueva selección explícita de **Programar regreso** todavía puede iniciar otro episodio.

<a id="restoration-limits"></a>

### Límites de restauración

Para un regreso puntual, Velair registra la selección cuando eliges **Programar regreso**. Para la rutina semanal, la registra cuando se confirma la ausencia, justo antes de aplicar el Modo Ausente.

La selección anterior sobrevive a los cambios de llegada y reinicios de Home Assistant. Restaura la selección de Perfiles, no temperaturas históricas ni estados de dispositivos; los Perfiles restaurados utilizan sus horarios actuales y las prioridades existentes. Si el Modo anterior se eliminó o cambió, los Perfiles originales pueden restaurarse como una selección manual. Si falta un Perfil guardado, es inválido o entra en conflicto con otro, la cancelación sigue completándose, pero conserva la selección actual e informa de que la restauración no estaba disponible. Los episodios creados antes de existir estos metadatos conservan la selección actual porque Velair no puede deducir la anterior.

Al reiniciar, las solicitudes puntuales pendientes y las ausencias confirmadas se recuperan en lugar de comenzar otra vez. Una ausencia sin confirmar reinicia su tiempo de confirmación. Un sensor que indique ocupación permite actualizar el estado de la ausencia anterior aunque la llegada haya ocurrido mientras Home Assistant estaba desconectado.

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

Resumen muestra información compacta del hogar durante un episodio semanal o puntual, o cuando una incidencia requiere atención. Identifica el origen y estado y muestra el plazo de confirmación o llegada prevista cuando corresponde. Selecciona el resumen para abrir el detalle completo de esta función en Preacondicionamiento.

Una señal violeta en un equipo identifica el control actual de Regreso a casa. El estado operativo existente permanece visible: esta señal explica el origen en vez de sustituir los estados calefacción, refrigeración, pausa, programado o preacondicionamiento. Las estimaciones de inicio futuro se etiquetan por separado. El control Manual, Refuerzo y pausas independientes conservan su prioridad. La atribución Ausente cubre los Perfiles Ausente efectivos del episodio, o Predeterminado cuando se selecciona explícitamente como Modo Ausente; no cubre un equipo sin correspondencia que simplemente conserva su horario Predeterminado. La preparación puede utilizar legítimamente el horario Predeterminado utilizado como alternativa en el destino cuando el backend selecciona el objetivo de llegada de ese equipo.

Diagnóstico muestra el estado actual del hogar, origen del control por equipo y estado de preparación, incluido por qué está suspendida o no disponible. La categoría del historial **Regreso planificado** registra transiciones aceptadas relevantes sin duplicados al actualizar el panel. Sus entradas comparten el límite existente de 100 eventos de ejecución y se borran al reiniciar. Las preferencias guardadas de categorías se conservan. Los informes descargados incluyen esta información y eliminan identificadores operativos de Modos y Perfiles. La intención de control y el éxito de entrega siguen separados.

<a id="dashboard-card"></a>

## Tarjeta de panel

La tarjeta Lovelace opcional muestra los controles compactos de Regreso puntual. Su encabezado incluye recuentos de fuentes ocupadas, vacías y desconocidas y el tiempo guardado de confirmación de ausencia; el resumen semanal, lista de fuentes y detalle de preparación de habitaciones permanecen en la barra lateral. Configura primero el hogar en la barra lateral.

```yaml
type: custom:velair-card
view: planned-return
```

Selecciona **Regreso a casa** en el editor visual de tarjetas. La tarjeta opera sobre el mismo episodio persistido que la barra lateral y otras tarjetas. Admite fechas y horas futuras de retorno. Los episodios activos ofrecen **Cancelar** y **Cambiar llegada**; Cancelar detiene el retorno aceptado y restaura la selección anterior registrada de Modo/Perfiles después de confirmar la salida; durante la confirmación deja intacta la selección. Después de completar, cancelar o cualquier otro episodio inactivo, la tarjeta muestra un formulario nuevo sin esperar cambios en la ocupación del hogar. Una configuración guardada inválida o un programador detenido desactivan la planificación y los cambios, pero todavía puede cancelarse un retorno activo. La barra lateral utiliza los mismos botones y ciclo de vida; la configuración semanal y su interruptor de activación permanecen allí. Solo los indicadores finales de fuentes/tiempo son exclusivos de la tarjeta; esta y la barra lateral comparten el subtítulo de fase unido al título, la edición de llegada y la línea temporal. Durante la confirmación, el bloque del temporizador sustituye el subtítulo. Esta vista del hogar no tiene filtro de termostatos.

La tarjeta **Climatización: estado y control** también puede exponer **Regreso puntual** como acción rápida de Velair junto a Refuerzo y Pausa. Actívala en el editor de acciones de esa tarjeta, elige si mostrar su nombre o colócala en Más. El editor agrupa primero Refuerzo, Pausa y Regreso puntual, incluso desactivados. Abre estos mismos controles compactos en el panel inferior de control, con un encabezado sencillo igual al de Refuerzo y Pausa. Los tres formularios utilizan la altura compacta existente de campos de 38 píxeles.
Una salida activa muestra su línea temporal y editor de llegada existentes. La X del panel cierra los controles sin cancelar la salida. Cerrar con cambios de llegada sin guardar pregunta si deben descartarse; el cierre está bloqueado mientras se ejecuta una acción. Esta acción siempre controla el hogar, independientemente del equipo seleccionado. Las configuraciones existentes la mantienen oculta. Las tarjetas nuevas creadas desde el selector de Home Assistant la incluyen activada; las configuraciones YAML deben activarla con `type: planned-return` en `climate_actions`.

Durante **Fuera de casa** y **Preparando la llegada**, la tarjeta muestra la salida confirmada y la llegada guardada con los nombres de Modos Ausente y Retorno del episodio. Un punto de hora actual, identificado por su ayuda emergente **Ahora**, avanza según el tiempo UTC transcurrido, también durante cambios de reloj, y permanece dentro de la barra. Los extremos incluyen fechas si sus días de calendario en Home Assistant difieren. Las ediciones de llegada sin guardar no cambian esta barra. Los estados pendientes y finales, o episodios sin marca temporal de salida confirmada, conservan un estado estático sin línea temporal. Tanto la barra lateral como la tarjeta actualizan sus relojes locales una vez por minuto solo mientras son visibles y activos, e inmediatamente al volver a ser visibles; esta actualización visual nunca solicita datos al backend.

Los iconos de salida y llegada flanquean la línea, con ayudas emergentes nativas y etiquetas accesibles. Las horas guardadas quedan justo debajo de sus iconos de extremo; solo el valor de llegada es editable. Las etiquetas sencillas de Modo debajo de las horas identifican las configuraciones Ausente y Retorno con un icono genérico de Modo. Los nombres largos y fechas entre días se ajustan dentro del panel. Cada extremo agrupa su hora y etiqueta de Modo, esta última justo debajo. Los campos de edición de fecha/hora comparten el tamaño compacto de los demás formularios de acciones; no aparece un botón de cierre junto a la hora guardada. La posición de preparación es una pequeña marca en la línea, con su reloj y leyenda explicativa debajo de las horas. La parte transcurrida, marcas de extremos y marcador Ahora muestran el paso del tiempo, no progreso térmico. Cuando no hay una primera estimación válida de habitación, un pequeño botón de información junto al título Regreso puntual explica la vista previa de llegada guardada actual: todas las habitaciones afectadas pueden estar suspendidas, ya en el objetivo, excluidas o configuradas solo para actuar a la llegada. Sitúa el puntero o foco en escritorio, o tócalo en móvil. La información ausente o mixta sigue siendo inconcluyente y no implica preparación anticipada desactivada. Escape o una interacción externa cierran la ayuda.

Cuando el backend tiene una estimación adaptativa válida para la llegada guardada, la línea temporal añade un marcador de reloj y hora de **Preparación estimada**. Identifica la primera estimación de una habitación que puede prepararse; otras pueden comenzar después. La leyenda de color suave es desplegable y comienza contraída. Selecciónala para ver cada habitación que puede prepararse y su inicio estimado, ordenadas por hora. La lista utiliza nombres de habitaciones de Home Assistant, iconos y hora local, con fechas cuando hacen falta. Se excluyen habitaciones suspendidas, con objetivo alcanzado y de solo llegada. Abrir la lista no hace solicitudes al backend; las actualizaciones habituales conservan su estado, mientras que un cambio de llegada guardada o episodio la cierra. Al editar la llegada, se ocultan el recuadro y control informativo alternativo; la línea mantiene su estimación guardada. Volver restaura el estado desplegado del mismo episodio. Sitúa el puntero sobre el encabezado para la explicación. Es una estimación de planificación, no evidencia de inicio de un dispositivo ni medida de progreso térmico. Las habitaciones suspendidas, con objetivo alcanzado, no disponibles y de solo llegada no proporcionan este marcador. Su posición permanece dentro de la barra salida/llegada, mientras la etiqueta conserva la estimación real, también si corresponde a una fecha anterior.
