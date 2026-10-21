<a id="usage-guide"></a>

# Guía de uso
<!-- velair-docs:start -->
Traducciones: [Original en inglés](usage.md) · [Español](usage.es.md) · [Français](usage.fr.md) · [Deutsch](usage.de.md) · [Italiano](usage.it.md) · [Nederlands](usage.nl.md) · [Polski](usage.pl.md) · [Português (Brasil)](usage.pt-br.md) · [Português (Portugal)](usage.pt-pt.md) · [Русский](usage.ru.md) · [Estado de las traducciones](../translation-status.md)

<details>
<summary>Estado de esta traducción</summary>

| Dato | Estado |
| --- | --- |
| Versión de referencia | 1.9.0-beta.4 |
| Última sincronización | 2026-10-21 |
| Revisión lingüística | Traducción asistida por IA |
| Respecto al original | Sin cambios pendientes respecto al original inglés. |

</details>

---
<!-- velair-docs:end -->

Esta guía explica Velair desde el punto de vista de un usuario de Home Assistant.

<a id="panel-navigation-and-direct-links"></a>

## Navegación del panel y enlaces directos

El panel lateral actualiza su URL cuando cambias de pestaña o alternas entre las subsecciones de Horarios y Plantillas. Al actualizar la página o abrir una URL copiada se recupera esa sección. Los botones Atrás y Adelante del navegador también siguen esta navegación.

| Sección | Ruta |
| --- | --- |
| Resumen | `/velair` |
| Planificación: Predeterminados | `/velair/schedules/default` |
| Planificación: Perfiles | `/velair/schedules/profiles` |
| Modos | `/velair/modes` |
| Plantillas: Plantillas | `/velair/templates/templates` |
| Plantillas: Presets climáticos | `/velair/templates/presets` |
| Sensores | `/velair/sensors` |
| Confort | `/velair/comfort` |
| Preacondicionamiento | `/velair/preconditioning` |
| Regreso a casa | `/velair/planned-return` |
| Diagnóstico | `/velair/diagnostics` |
| Ajustes | `/velair/settings` |

Utiliza estas rutas en las acciones de navegación de los paneles de Home Assistant, o añádelas a la dirección de tu Home Assistant para crear un enlace completo. Abrir un enlace selecciona una sección; no activa un Modo ni cambia los ajustes de climatización.

Por ejemplo, un botón del panel puede abrir la biblioteca de presets climáticos:

```yaml
type: button
name: Velair climate presets
icon: mdi:thermometer-lines
tap_action:
  action: navigate
  navigation_path: /velair/templates/presets
```

Cambia `navigation_path` por cualquier ruta de la tabla. Esto utiliza la [acción de navegación estándar de los paneles](https://www.home-assistant.io/dashboards/actions/) de Home Assistant. Para un marcador o un enlace desde otra aplicación, utiliza la dirección de tu Home Assistant seguida de la ruta, por ejemplo `https://your-home-assistant.example/velair/schedules/profiles`.

`/velair/schedules` abre Predeterminados y `/velair/templates` abre Plantillas. `/velair/preconditioning` abre Preacondicionamiento y `/velair/planned-return` abre la pestaña independiente Regreso a casa. Los antiguos enlaces de subsección abren su pestaña correspondiente. `/velair/overview` abre Resumen, y la ruta antigua `/velair/profiles` abre Modos. Una subsección desconocida abre la subsección predeterminada de su pestaña; una pestaña desconocida abre Resumen. Estas rutas se normalizan sin añadir una entrada al historial.

Los enlaces no conservan la selección de un climatizador, día de la semana, Perfil, plantilla o preset concreto. Los cambios sin guardar no se recuperan al actualizar la página. Las confirmaciones existentes para descartar cambios se aplican cuando la navegación descartaría modificaciones sin guardar; cancelar mantiene la sección y la URL actuales. Las tarjetas Lovelace opcionales conservan las URL de sus paneles.

Mientras el panel lateral está abierto, sus pestañas comparten los últimos datos confirmados del backend. Tras la primera carga, cambiar de pestaña no repite esa carga inicial. Las actualizaciones continúan durante la navegación y siguen aplicándose las confirmaciones existentes para los cambios sin guardar. Actualizar la página vuelve a cargar los datos y no recupera borradores. Las tarjetas Lovelace opcionales utilizan una sesión separada de la del panel. Las tarjetas cargadas en la misma conexión de Home Assistant comparten la carga inicial de datos y las actualizaciones en directo, pero mantienen sus propios controles y cambios sin guardar. Lovelace puede conservar las tarjetas cargadas cuando visitas otra vista del panel, permitiéndote volver sin cargarlas de nuevo. La sesión compartida se cierra cuando se retira la última tarjeta; actualizar la página inicia una carga nueva. No se necesitan cambios en YAML.

<a id="help-and-documentation"></a>

## Ayuda y documentación

Abre **Ajustes → Ayuda y comunidad** para consultar la documentación, comunicar un problema en GitHub Issues o compartir preguntas y sugerencias en Discussions. Utiliza el icono de ayuda junto al encabezado de una sección o a la derecha de una opción de submenú para abrir una explicación breve y un enlace **Abrir guía**. Abrir la ayuda de un submenú no lo selecciona ni modifica tus cambios. La explicación y la guía corresponden a esa opción, incluso cuando no es la sección activa. En Ajustes, el icono de ayuda de **Ajustes externos** también ofrece su guía. Los iconos de ayuda utilizan el mismo símbolo de interrogación y se resaltan al pasar el puntero; los iconos de información siguen ofreciendo explicaciones breves sobre campos. Cierra el diálogo de ayuda con su botón de cierre, Escape o un clic fuera de él; el foco del teclado vuelve al icono de ayuda.

Las explicaciones breves siguen disponibles dentro de Velair en todos los idiomas admitidos por la interfaz, incluso sin conexión a Internet. Los enlaces a las guías utilizan tu idioma de Home Assistant cuando existe una traducción y recurren al inglés de forma independiente para cada guía. El enlace solo indica **En inglés** cuando se utiliza ese idioma por falta de traducción. Las guías traducidas muestran su estado de sincronización con el original y de revisión lingüística, con un enlace al original inglés cuando hay cambios pendientes. Las compilaciones publicadas abren la documentación de la etiqueta de versión correspondiente; las compilaciones de desarrollo abren la documentación actual de `main`. Los enlaces de documentación y comunidad abren GitHub en una pestaña nueva y solo requieren Internet al abrirlos; no suben automáticamente diagnósticos ni configuración local.

<a id="concepts"></a>

## Conceptos

Velair gestiona horarios para las entidades `climate.*` seleccionadas durante la configuración de la integración. Cada entidad seleccionada es una zona de climatización gestionada.

Un horario está formado por bloques de los días de la semana. Un bloque comienza a una hora concreta y puede:

- establecer una temperatura objetivo, opcionalmente con un modo HVAC y opciones de climatización compatibles, como modo de ventilador, modo preset, oscilación, oscilación horizontal o humedad objetivo;
- establecer una o varias opciones de climatización compatibles sin enviar una temperatura objetivo ni cambiar el modo HVAC;
- cambiar únicamente el modo HVAC y dejar el objetivo bajo el control del dispositivo;
- apagar la entidad de climatización.

Un bloque permanece activo hasta que comienza el siguiente bloque del horario semanal. Esto incluye la medianoche y los días vacíos: antes del primer bloque de un día, Velair mantiene el bloque más reciente de un día anterior. La línea temporal muestra por separado este periodo heredado para que quede claro dónde se configuró originalmente el bloque.

<a id="external-adjustments-and-manual-adjustment"></a>

## Ajustes externos y ajuste manual

Cada zona puede elegir qué hace Velair cuando su modo HVAC o consigna cambia fuera de Velair, por ejemplo desde una tarjeta de climatización de Home Assistant, un mando infrarrojo u otra automatización. Configura **Ajustes externos** en la fila de cada climatizador gestionado en **Ajustes**:

- **Mantener automático** es la opción predeterminada y vuelve a aplicar la intención actual de Velair.
- **Hasta el próximo bloque** respeta el ajuste hasta que comienza el siguiente bloque efectivo.
- **Durante un tiempo** reanuda tras el número de minutos configurado.
- **Hasta reanudar** espera una acción explícita.

Mientras cede el control, Resumen selecciona **Ajuste manual** en su control permanente Automático/Manual. Esto no es el Modo **Manual** de Velair: el Modo Manual describe cómo se seleccionaron los Perfiles, mientras que Ajuste manual describe quién controla actualmente un climatizador. Reanudar vuelve a aplicar el horario del Perfil activo, el horario Predeterminado u otra intención actual del planificador. Los demás motivos de pausa independientes siguen vigentes.

Resumen selecciona **Planificación automática** mientras Velair controla el climatizador. Selecciona **Ajuste manual** para mantener el estado actual sin cambiar primero el dispositivo; se utiliza la política manual ya guardada en Ajustes. Si está guardado **Mantener automático**, una acción manual explícita permanece en Manual hasta reanudar, sin cambiar ese ajuste. La misma operación está disponible como `velair.enter_manual_adjustment`; captura el estado actual de calefacción, refrigeración, apagado o rango nativo y solo acepta el ID de la entidad de climatización.

Con **Mantener automático**, Room Assist recalcula y vuelve a aplicar su objetivo que determina Velair. Con una política manual, cede el control sin restaurar su corrección programada. Se admiten objetivos escalares y rangos nativos.

La guía completa explica los límites de detección, cada política, los ajustes repetidos, Perfiles y Modos, la prioridad de Refuerzo y las pausas, el comportamiento tras reiniciar, el YAML exacto de servicios y eventos, y líneas temporales de casos reales paso a paso. Consulta [Cambios externos y ajuste manual](manual-control.es.md).

Velair calcula los próximos eventos en el backend y programa callbacks precisos de una sola ejecución mediante Home Assistant. El frontend se suscribe a las actualizaciones del backend por WebSocket, por lo que no necesita consultas continuas.

Durante un episodio de Regreso a casa, Overview muestra un resumen compacto del hogar con origen semanal o puntual, proceso actual y hora de confirmación o llegada aplicable. Utiliza el fondo habitual de tarjeta del tema, con un borde violeta discreto y el icono principal de regreso; los demás iconos conservan el color del texto que los rodea. Un regreso futuro aceptado añade recuentos de preparación con iconos y ayuda con ratón, teclado y toque. Las salidas confirmadas muestran una línea temporal compacta de solo lectura con horas y Modos de salida/llegada, junto al resumen si cabe o debajo en contenedores estrechos. Su botón de navegación abre la pestaña Regreso a casa; el resumen no duplica los controles de salida. Una incidencia puede seguir visible aunque no haya ninguna salida en curso.

Cada climatizador afectado muestra una señal violeta de Regreso a casa cuando el backend indica que el modo de ausencia o la preparación de llegada tienen actualmente el control. Su estado operativo habitual y la información de Perfil y Room Assist siguen visibles. Las horas futuras de preparación son previsiones, no una señal de control activo. El control manual, Refuerzo, las pausas independientes, la programación detenida y la ejecución externa conservan su prioridad. Un climatizador que simplemente mantiene la programación Predeterminada bajo un Modo de ausencia personalizado no adquiere una señal de ausencia. El indicador describe la intención de control, no demuestra que una orden se haya entregado correctamente ni que la habitación haya alcanzado su objetivo.

La información de preparación del regreso está separada del indicador de autoridad de control: cada equipo puede mostrar su estado de espera, preparación, objetivo alcanzado, suspensión, no disponible o solo llegada, el inicio estimado, objetivo de llegada y motivo pertinente aunque aún siga Ausente. Las estimaciones que faltan no se sustituyen por horas inventadas. Los regresos inactivos no conservan una vista previa de preparación futura.

Cuando un climatizador gestionado no publica `target_temp_step`, su fila en **Ajustes** muestra **Paso de temperatura**. Velair utiliza `1` por defecto y permite indicar el paso positivo real del dispositivo. Velair recuerda el último paso válido comunicado por Home Assistant, por lo que una entidad que deja de publicarlo no invalida los objetivos decimales existentes. Un paso publicado actualmente siempre tiene prioridad. Guardar un valor manual mientras falta el atributo sustituye al valor recordado como alternativa. Si la entidad vuelve a publicar un paso, Velair recuerda esa nueva cuadrícula aunque la alternativa manual siga almacenada.

La sección **Diagnóstico** del panel ofrece una instantánea de solo lectura del planificador y de cada zona, un historial limitado que solo existe durante la ejecución y un informe JSON anonimizado para adjuntarlo a incidencias. No añade consultas periódicas ni depende de Recorder. En escritorio, las columnas del registro pueden redimensionarse durante la sesión actual; sus anchos se restablecen al recargar el panel y nunca se guardan. En móvil, los mismos eventos utilizan un diseño compacto y adaptable en lugar de controles de redimensionamiento.

Diagnóstico también muestra el estado de Regreso a casa del hogar y la participación efectiva del climatizador seleccionado, su estimación de preparación y cualquier motivo de suspensión. Una rutina semanal desactivada es independiente de la disponibilidad de regresos puntuales. La categoría **Regreso planificado** del historial registra la planificación aceptada, la confirmación, la salida, los ajustes de llegada, los inicios de preparación, la finalización, la cancelación y los errores. Comparte el límite existente de 100 eventos y se borra al reiniciar; las preferencias de categorías permanecen guardadas. Actualizar cualquiera de las vistas no añade entradas al historial. Los informes incluyen este contexto, eliminando los identificadores de Modos y Perfiles incluso cuando se incluyen explícitamente los ID de entidades.

<a id="home-assistant-entities"></a>

## Entidades de Home Assistant

Velair crea entidades persistentes de Home Assistant que complementan sus eventos transitorios de automatización:

- **Próximo evento programado** es un sensor de fecha y hora para la primera acción pendiente de Velair. Sus atributos incluyen todos los eventos que comparten esa hora, la hora de aplicación calculada y la hora objetivo original cuando Anticipación adaptativa adelanta el inicio de un bloque.
- **Estado del planificador** describe si Velair está inactivo, programado, bajo una anulación o pausado. Sus atributos incluyen el modo global y el vencimiento de la pausa. Los detalles de próximos eventos y anulaciones por zona permanecen en sus sensores específicos para evitar duplicar el historial de Recorder.
- **Estado de diagnóstico** es un sensor de enumeración diagnóstica con estados `ok`, `warning` y `error`. Solo expone atributos compactos: estado del planificador, recuentos de equipos sin problemas, con advertencias o con errores, recuentos de problemas y códigos de problemas activos. Así, el estado actual está disponible para paneles y automatizaciones activadas por cambios de estado sin exponer texto de excepciones.
- **Temperatura objetivo activa** se crea una vez por climatizador gestionado. Expone el objetivo que Velair gestiona actualmente, incluidos los Refuerzos y los bloques ya iniciados por Anticipación adaptativa. Su unidad sigue la de esa entidad de climatización. Para un rango nativo, su estado escalar no está disponible porque no existe un único valor correcto; utiliza los atributos `target_temp_low` y `target_temp_high`.
- **Estado ambiental** se crea una vez por climatizador gestionado. Expone estados legibles como confortable, frío, húmedo o caluroso y húmedo. Mantiene la calidad de los datos y los ID de las entidades de origen como atributos compactos sin copiar las lecturas originales de temperatura o humedad.
- **Oportunidad de ventilación** se crea una vez por climatizador gestionado. Expone una enumeración conservadora y observacional que describe si el aire exterior puede acercar la habitación a su zona de Confort configurada. No abre ventanas ni controla el climatizador.
- **Calidad del aire** se crea una vez por climatizador gestionado y conserva la evaluación independiente de CO2: buena, elevada, mala, no disponible o no supervisada.
- **Anulación de zona** muestra si ese climatizador no tiene actualmente ninguna anulación, tiene un Refuerzo activo o una pausa de zona activa.
- **Control de zona** se crea una vez por climatizador gestionado y expone si el control local es `automatic`, hay un Ajuste manual activo o un proveedor de horarios externo controla la ejecución física. Sus atributos proporcionan el contexto actual del planificador, Perfil, Modo y ajuste manual.
- **Diagnóstico de entrega de zona** se crea una vez por climatizador gestionado como sensor diagnóstico desactivado por defecto. Expone el último resultado de entrega climática, que solo existe durante la ejecución, y el último objetivo cuya secuencia completa de servicios aceptó Home Assistant, sin texto de errores ni afirmaciones sobre lo que hizo el dispositivo físico.
- **Inicio de preparación** es un sensor de fecha y hora que contiene el inicio calculado del próximo bloque adelantado o del que está activo. Sus atributos incluyen la hora objetivo programada, el adelanto, la dirección, el origen del modelo, la temperatura objetivo y el modo HVAC.
- **Room Assist** expone el estado actual de ejecución de Room Assist y un contexto compacto del objetivo, sin duplicar las lecturas originales de la habitación y del climatizador.
- **Planificación automática** y **Modo** son las entidades que permiten modificar el control de Velair. Desactivar Planificación automática detiene indefinidamente la programación; activarla reanuda el horario activo. Seleccionar un Modo personalizado activa sus Perfiles asignados, mientras que **Predeterminado** vacía el conjunto activo. **Manual** significa que ningún Modo personalizado controla el conjunto de Perfiles activo; la activación directa normalmente entra en ese estado. Velair lo muestra en lugar de ofrecerlo como acción. Utiliza la acción `velair.pause` cuando necesites una pausa temporal con duración.

Estas entidades reutilizan instantáneas del backend, reciben actualizaciones del dispatcher y no consultan periódicamente Home Assistant. Los eventos sirven para reaccionar a transiciones; las entidades son útiles cuando una automatización o un panel necesita consultar el estado actual. Room Assist puede ajustar el objetivo enviado después del objetivo de control aceptado; utiliza el sensor específico **Room Assist** para el contexto de ese ajuste aplicado. Consulta [Referencia de sensores](sensors.es.md) para ver la lista completa de sensores de Velair con sus atributos principales y ejemplos. Consulta [Sensores de control y entrega de zona](zone-sensors.es.md) para conocer con más detalle los contratos de control, Confort, ventilación y entrega.

Cuando se elimina un climatizador de las opciones de la integración Velair, Velair elimina sus sensores de zona generados del registro de entidades de Home Assistant al recargar. Las entidades globales de Velair y las entidades de otras integraciones no se ven afectadas. Volver a añadir el climatizador recrea sus sensores con ID únicos deterministas.

Home Assistant elige los nombres traducidos de las entidades utilizando el idioma del backend cuando se crea por primera vez una entidad. Cambiar únicamente el idioma de interfaz de un usuario no renombra las entradas existentes del registro. Puedes renombrar manualmente las entidades existentes desde Home Assistant sin cambiar su comportamiento en Velair.

<a id="open-velair"></a>

## Abrir Velair

Tras la configuración, Velair aparece en la barra lateral de Home Assistant.

El panel lateral es la interfaz recomendada. La tarjeta Lovelace opcional resulta útil si quieres integrar paneles concretos de Velair en un panel existente.

En los paneles de tipo Secciones, las tarjetas de Velair usan altura automática para que los controles desplegados, las zonas adicionales y el texto en varias líneas reserven espacio sobre la tarjeta siguiente. Si una tarjeta existente sigue solapándose con otra después de actualizar, revisa su YAML del panel: elimina cualquier valor numérico de `grid_options.rows` o cámbialo a `auto`. Las opciones de diseño guardadas prevalecen sobre los valores predeterminados de la tarjeta:

```yaml
grid_options:
  columns: 12
  rows: auto
```

La lista de próximos eventos de Overview y las cards de próximos eventos muestran el siguiente cambio de control previsto de cada equipo gestionado, incluidas transiciones de preparación estimada y llegada durante un Regreso a casa confirmado. Todas las filas comparten una distribución compacta de nombre/origen/hora/acción/HVAC, sin subtítulo de estado bajo el nombre. La ayuda final explica la fase y, cuando el regreso tiene prioridad, muestra Modo de llegada, detalles de suspensión y referencia semanal actual. Las ayudas se abren con ratón, foco de teclado o toque. Las suspensiones explican los bloqueos de mayor prioridad sin prometer un inicio bloqueado. Los sensores existentes de próximo evento y las vistas específicas de anticipación semanal conservan su significado semanal. La previsión sirve para informar al usuario; no cambia la ejecución del programador ni confirma el envío al dispositivo.

El resumen de zonas utiliza cards compactas adaptativas para explicar qué hacen ahora Velair y el equipo de cada estancia. Cuando la entidad informa de `hvac_action`, el resumen utiliza su valor actual Calentando, Refrigerando, Secando, Ventilando, En espera, Apagado, Precalentando o Desescarchando como estado principal. Después identifica el estado de Velair —programado, manual, Boost, pausa, preacondicionamiento o apagado por automatización—, el modo HVAC comunicado y los tiempos pertinentes sin repetir la actividad como otra señal. Si `hvac_action` falta o no es válido, muestra su propio estado sin inferir la actividad del dispositivo. Cada card presenta primero el nombre e ID del equipo, después su Perfil activo y las señales ordenadas de Room Assist/Confort/aire/datos. En cards muy anchas, estas señales y el resumen compacto comparten el encabezado. En cards estrechas, incluidas las de móvil y Lovelace compactas, la identidad y el estado permanecen alineados uno al lado del otro; las señales de Perfil/Confort usan toda la fila inferior. Los chips de Perfil, regreso, Room Assist y Confort/aire/datos comparten tipografía compacta y un diseño separado de icono/etiqueta y valor. Regreso utiliza un acento púrpura discreto; Confort sigue distinguiendo estados normal, información, aviso y error. Los valores largos pueden abreviarse para conservar la altura compacta; su texto completo sigue accesible mediante ayuda con ratón, foco o toque. El resumen utiliza un icono coherente, texto equilibrado y un acento de actividad moderado sin encabezado fijo ni insignia exterior decorativa. Cuando Room Assist está activo o manteniendo, los detalles se agrupan en Temperatura (Equipo y después Sensor), Consigna (Equipo y después Programada) y Desfase según la dirección. Se omiten los valores ausentes. Las señales neutras son discretas; el color de aviso se reserva para condiciones que requieren atención.

La tarjeta Lovelace admite estos valores de `view`:

- `climate`;
- `overview-status`;
- `overview-boosts`;
- `overview-events`;
- `overview-timeline`;
- `overview-zones`;
- `active-setup`;
- `schedules`;
- `sensors`;
- `comfort`;
- `preconditioning`;
- `planned-return`;
- `diagnostics`.

<a id="planned-return-card"></a>

### Tarjeta de Regreso a casa

Añade a cualquier panel los mismos controles de retorno del hogar que utiliza el panel lateral:

```yaml
type: custom:velair-card
view: planned-return
```

Para una salida pendiente normal, una fila de temporizador explica la comprobación de que la casa permanece vacía y muestra su plazo del backend en la hora local de Home Assistant. El Modo de ausencia solo se activa tras la confirmación si todas las fuentes siguen indicando ausencia. No hay cuenta atrás en directo ni línea temporal de salida antes de confirmar. Con **Aplicar modo de ausencia ahora**, Ausencia y su línea temporal comienzan inmediatamente; la confirmación de salida habilita por separado el regreso automático por presencia mientras la preparación y la llegada programadas siguen activas.

El editor visual denomina esta vista **Regreso a casa**. Solo muestra los controles compactos de **Regreso puntual**, con recuentos de fuentes ocupadas, vacías y desconocidas arriba a la derecha del encabezado. El tiempo guardado de confirmación de ausencia solo aparece antes de una ausencia activa confirmada. Sin fuentes guardadas se omiten estos indicadores: **Programar regreso** confirma explícitamente la salida y activa Ausente inmediatamente, sin esperar. La llegada guardada sigue controlando la preparación y activación del destino; Velair no puede detectar la llegada física sin fuentes. Las fuentes configuradas desconocidas/no disponibles conservan su espera habitual salvo que se seleccione **Aplicar modo de ausencia ahora**, y la rutina semanal requiere fuentes. Introduce una fecha y hora futuras antes de salir o cuando ya estés fuera. Un episodio activo solo ofrece **Cancelar** y **Cambiar llegada**. Cancelar detiene la automatización de regreso y restaura la selección anterior de Modo/Perfiles después de una salida confirmada o de aplicar Ausencia manual inmediata, incluso antes de confirmar la salida supervisada. La confirmación pendiente normal no cambia la selección. Por ejemplo, parte de Confort con cinco minutos de demora: cancelar tras dos minutos mantiene Confort activo; cancelar después de aplicar Ausente restaura Confort y sus Perfiles originales. Consulta [ejemplos de cancelación](planned-return.es.md#cancelling-a-return-examples), incluidos inicios sin sensores, ediciones de llegada y selecciones explícitas de Modo. Cuando el regreso termina o se cancela, la card muestra un formulario nuevo de fecha/hora aunque la presencia siga indicando que todos están fuera. **Programar regreso** permanece visible pero deshabilitado si la configuración guardada o el programador no están disponibles. El panel usa los mismos botones Cancelar/Cambiar llegada y el formulario nuevo. Solo los indicadores finales de ocupación/demora son específicos de la card; el panel conserva toda la configuración semanal, de presencia y preparación. Ambas superficies muestran un subtítulo compacto de fase unido al título, con ayuda contextual que explica la fase. Durante la confirmación, el encabezado del proceso aporta ese contexto. Antes de confirmar la salida, un icono accesible de llegada y **Llegada prevista** identifican el regreso guardado, alineados con el título/estado; el valor guardado es un chip compacto pulsable sin lápiz ni subrayado. El gráfico confirmado usa una superficie oscura de llegada editable, con la misma tipografía que la salida, sin lápiz ni subrayado. Ambas abren el mismo editor de llegada. El botón azul **Volver**, con flecha a la izquierda en la fila de acciones, descarta la edición y la cierra localmente, restaurando la última llegada guardada. Limpia el aviso y la protección de navegación; la configuración independiente de rutina sin guardar sigue protegida. Reabrir parte del valor guardado. Un cambio correcto cierra el editor; los fallos y actualizaciones en directo conservan el borrador. Salida y llegada usan la misma tipografía; Cancelar es una acción roja compacta con texto blanco a la izquierda bajo el episodio, visible solo cuando puede cancelarse un regreso activo y el editor está cerrado. Al editar, **Volver** cierra desde la izquierda y Cambiar llegada queda a la derecha con una superficie verde compacta. Volver y Cambiar llegada tienen superficies visibles de 32 píxeles dentro de objetivos táctiles de 44. Los indicadores de ocupación permanecen arriba a la derecha; el de demora desaparece tras confirmar la salida.

Configura las fuentes de ocupación, los modos, la confirmación de ausencia y la rutina semanal en la pestaña **Regreso a casa** del panel lateral. La tarjeta utiliza esa configuración guardada del hogar; no expone campos de configuración ni el interruptor de la rutina semanal. Los filtros de visualización de termostatos no limitan esta tarjeta del hogar. Los controles del panel y de la barra lateral actualizan el mismo episodio del backend; los borradores de llegada permanecen locales en cada tarjeta abierta hasta que se envían.

Durante una ausencia confirmada, las horas de salida guardada y llegada editable están sobre la línea temporal; debajo quedan los Modos Ausente y Retorno. La hora de salida, el icono de llegada y las ayudas de los Modos explican su significado con ratón, foco de teclado o toque. La fecha de llegada sigue siendo un botón de edición separado. Una marca vertical neutra de Ahora señala el tiempo UTC transcurrido y se alinea con el final de la barra coloreada. Se muestran fechas cuando los extremos caen en días distintos en la zona horaria de Home Assistant. Editar un borrador no mueve el extremo hasta aceptarlo. Los estados pendientes y finales, o la ausencia de una salida confirmada, no tienen línea temporal móvil. Un episodio activo con error y datos de salida válidos conserva su línea temporal y Cancelar. El reloj local se actualiza una vez por minuto mientras está visible y activo; no sondea Home Assistant.

Los equipos con preparación adaptativa compatible tienen puntos individuales de colores, leyendas con nombres e inicios estimados visibles y ayudas completas. Los puntos solapados comparten un círculo segmentado. Las estancias suspendidas, en objetivo, no disponibles y de solo llegada no reciben puntos. La leyenda de la card del hogar comienza en una fila; +N amplía el resto dentro de la card y Mostrar menos la contrae. Las actualizaciones normales conservan la expansión; cambiar la llegada guardada, destino o episodio la reinicia. Los indicadores de preparación del hogar conservan recuentos y detalles de llegada/primer inicio en sus ayudas. Los contadores de presencia, tiempo de confirmación y fase actual también tienen ayudas de teclado y móvil. La configuración semanal, lista de fuentes y detalle completo de preparación permanecen en el panel. La preparación estimada y el tiempo transcurrido no confirman actividad física HVAC ni progreso térmico.
<a id="climate-status-and-control-card"></a>
### Card de estado y control climático

Utiliza `view: climate` para una tarjeta compacta dedicada a una entidad `climate.*` gestionada por Velair. Sigue el tema activo de Home Assistant mediante sus variables de color y superficie, y se adapta a diseños claros, oscuros, móviles, de tablet y de escritorio.

La tarjeta combina la temperatura, humedad, modo HVAC y `hvac_action` comunicados por el dispositivo con los datos actuales de control y ejecución de Velair. Reutiliza la misma línea temporal diaria efectiva, icono de Perfil y color de Perfil que la pestaña Resumen. La información de Modo, Perfil, Confort, Room Assist y preparación solo se muestra cuando está configurada y es relevante. Un climatizador de ejecución externa muestra el proveedor externo y el estado de publicación en lugar de funciones exclusivamente locales de Velair o acciones específicas del climatizador. La acción opcional de Regreso puntual controla el hogar y es independiente de quién controla el climatizador seleccionado.

```yaml
type: custom:velair-card
view: climate
selected_entity: climate.living_room
climate_name: Living room
climate_humidity_entity: sensor.living_room_humidity
climate_outdoor_temperature_entity: sensor.outdoor_temperature
climate_window_entities:
  - binary_sensor.living_room_window
  - binary_sensor.patio_door
climate_window_display: grouped
climate_room_assist_display: both
climate_preconditioning_display: both
climate_show_control_mode: true
climate_show_target_control: true
climate_show_hvac_mode_control: true
climate_show_native_climate_link: true
climate_actions:
  - type: boost
  - type: pause
    placement: more
  - type: planned-return
    enabled: true
  - type: script
    name: Ventilate room
    script: script.ventilate_living_room
    icon: mdi:window-open-variant
    color: "#03a9f4"
    confirmation: true
    placement: auto
```

La superficie de control de climatización combina acciones rápidas ordenadas con el selector Automático/Manual, configurable por separado, utilizando el mismo modelo de control que Resumen. Su panel inferior reúne el modo HVAC, el objetivo actual cuando el climatizador está encendido y un acceso al diálogo climático nativo de Home Assistant. Cada modo HVAC publicado se muestra con su icono. Los cambios directos permanecen en solo lectura mientras Velair controla el horario activo: selecciona primero **Manual**, espera a que se confirme el Ajuste manual y después utiliza los controles de objetivo y modo. Selecciona **Automático** para reanudar la programación. Refuerzo, las pausas independientes y los estados detenido y no disponible bloquean la edición directa con una explicación. La pausa interna que representa el propio Ajuste manual no bloquea estos controles. Las zonas de ejecución externa conservan el acceso nativo a Home Assistant; una acción de Regreso puntual activada puede seguir abriendo los controles de salida del hogar.

Se admiten objetivos escalares y rangos nativos `heat_cool`. Los cambios de rango envían juntos ambos límites. Velair utiliza los valores `min_temp`, `max_temp` y `hvac_modes` publicados por la entidad de climatización. Los ajustes de objetivo utilizan `target_temp_step` cuando se publica. Si ese atributo desaparece, Velair sigue utilizando el último paso válido comunicado para que los objetivos decimales existentes sigan siendo válidos. Después se utiliza una alternativa manual por zona configurada en Ajustes, seguida de `1` cuando nunca se ha comunicado ni configurado un paso. No inventa modos HVAC.

Las tarjetas creadas antes de la lista ordenada de acciones utilizaban `climate_show_boost_action`, `climate_show_pause_action` y `climate_custom_actions`. Velair sigue leyendo esos campos antiguos, mientras el editor visual escribe `climate_actions` cuando cambia la lista de acciones.

**Regreso puntual** es otra acción proporcionada por Velair. Admite las mismas opciones de visibilidad, nombre oculto y ubicación automática/Más que Refuerzo y Pausa. El editor enumera primero las acciones proporcionadas: Refuerzo, Pausa y después Regreso puntual, incluidas las ocultas. Regreso puntual utiliza un acento violeta para distinguirse de Pausa. Al abrirlo sustituye el panel inferior de control por el formulario compacto de salida o por la línea temporal y controles del episodio actual. Cierra el panel con su X para volver a los controles climáticos; cerrarlo no cancela una salida activa. Las modificaciones de llegada sin guardar requieren confirmación antes de cerrar, y una acción pendiente debe terminar primero. Los ajustes y efectos de salida se aplican a todo el hogar, no solo al climatizador seleccionado.

Los paneles de Refuerzo, Pausa y Regreso puntual comparten el borde y la superficie de la barra de herramientas, como los controles normales del termostato. Las acciones directas que solo muestran un icono conservan su ancho compacto y centran el icono; abrir un panel añade espacio para su icono de cierre.

Las tarjetas existentes mantienen oculta esta acción salvo que se habilite explícitamente. Las tarjetas creadas mediante el selector de tarjetas de Home Assistant la incluyen habilitada en su lista inicial de acciones; esto también se aplica al cambiar la vista de esa tarjeta nueva a `climate`. Una tarjeta YAML sin una acción `planned-return` la mantiene oculta. Habilítala en el editor visual o añade la acción mostrada arriba.

El editor mantiene las acciones proporcionadas en su sección fija y ofrece controles de ordenación para las acciones personalizadas. Abrir el editor no reordena la lista de acciones guardada en el panel.

Por defecto, la humedad actual y su acceso al historial utilizan los atributos de la entidad de climatización seleccionada. Establece `climate_humidity_entity` para utilizar en su lugar el valor en directo y el historial nativo de Home Assistant de un sensor de humedad específico. Velair no infiere esta relación porque las integraciones de Home Assistant no la publican de manera uniforme.

Las entidades de temperatura exterior y ventanas son contexto opcional del panel. Velair no las descubre, gestiona ni automatiza mediante esta tarjeta. Los estados de ventanas son solo informativos, incluso cuando una automatización separada o el [blueprint de ventanas](blueprints/pause-zone-for-open-windows.es.md) de Velair utiliza esas entidades. Establece `climate_window_display` en `grouped` o `individual`; el editor visual ofrece casillas independientes para la lectura exterior y las ventanas, y no muestra ninguna sección hasta que se selecciona una entidad. Todo el encabezado Estado actual pliega el panel cuando está expandido. Sus lecturas y contexto compactos utilizan etiquetas que pasan a varias líneas en lugar de desplazamiento horizontal, de modo que todas las lecturas de los sensores habilitados permanecen visibles en espacios estrechos. Una evaluación de Confort disponible utiliza una fila descriptiva separada debajo del encabezado plegado, con su condición, indicación contextual de Confort, icono y acento de estado. El editor de tarjetas también puede mostrar en esa fila plegada las lecturas derivadas de Confort habilitadas; en caso contrario, esos valores permanecen en la fila expandida. La fila de Confort se omite cuando la evaluación no está disponible. El control de expansión permanece fijo mientras las etiquetas ocupan tantas filas compactas como requiera el ancho disponible. Este estado de presentación solo se conserva durante la sesión de la tarjeta. Estado actual comienza plegado por defecto. El editor visual puede hacer que comience expandido; cambiar ese valor inicial no impide plegarlo o expandirlo manualmente durante el uso.

El editor visual sigue el mismo orden de arriba abajo que la tarjeta. Puede ocultar por separado la barra de estado, el nombre del climatizador, el estado operativo, los controles y acciones individuales del termostato, la temperatura actual, la humedad, la lectura exterior, las ventanas, Confort, las lecturas opcionales de Confort plegadas, la línea temporal, Room Assist y la preparación. El nombre del climatizador también puede sustituirse por una etiqueta independiente local a la tarjeta, incluida una etiqueta vacía, y restablecerse al nombre descriptivo actual de la entidad. Si todos los elementos de Estado actual están desactivados, se omite todo el contenedor de Estado actual. Los valores de visibilidad omitidos se consideran visibles para que las tarjetas existentes conserven su presentación. Cada lectura visible de temperatura actual o humedad incluye un acceso compacto al historial nativo de Home Assistant de su fuente configurada; el acceso se omite junto con su lectura. Cada categoría de configuración puede plegarse, y las acciones de scripts personalizados permanecen plegadas hasta que necesitan editarse, manteniendo el editor práctico en pantallas estrechas. Seleccionar otro script actualiza el nombre de ese acceso a partir de la entidad script; después puede personalizarse de nuevo. El acceso del encabezado de Velair siempre está presente para que la tarjeta siga siendo identificable y ofrezca una forma coherente de volver a la integración. Cada acción directa puede ocultar su nombre visible y reducirse a un botón del tamaño del icono; se conservan su etiqueta accesible y su nombre completo dentro del menú Más.

Las acciones rápidas comparten la fila superior de la superficie de control de climatización con el selector Automático/Manual. Permanecen en un grupo independiente alineado al extremo opuesto de la misma fila con cualquier ancho de tarjeta. Si sus etiquetas superan el espacio disponible, cada etiqueta completa mantiene su ancho natural y ese grupo se desplaza horizontalmente en lugar de pasar a varias filas o truncarse. Abrir Refuerzo o Pausa sustituye el panel normal del termostato en el mismo lugar, y Cancelar o pulsar de nuevo la acción seleccionada vuelve a los controles normales. La barra de desplazamiento nativa permanece oculta. Cuando las acciones desbordan, los controles direccionales utilizan espacios exteriores fijos y solo se muestran mientras quedan acciones fuera de la pantalla, sin cubrir ni redimensionar la fila; cuando todas caben, esos espacios desaparecen por completo. La misma fila admite deslizamiento táctil y arrastre con ratón o lápiz sin ejecutar la acción utilizada para comenzar el arrastre. Las acciones de scripts confirman brevemente la ejecución aceptada o el fallo en el propio botón, y una acción abierta de Refuerzo o Pausa muestra un icono de cierre.

El encabezado climático utiliza la actividad operativa actual como señal visual principal y mantiene juntos la actividad, el origen de ejecución y el modo HVAC debajo del nombre del climatizador. Una firma compacta de Velair permanece disponible como acceso al panel principal, manteniendo el nombre del proyecto y el autor en dos líneas con cualquier ancho de tarjeta.

Las secciones de línea temporal y Room Assist reutilizan los gráficos correspondientes de Velair, incluido el desplazamiento horizontal en pantallas estrechas. Establece `climate_room_assist_display` en `text`, `chart` o `both` para elegir si se muestra la explicación breve de ejecución, el gráfico de temperatura o ambos. El estado de Room Assist siempre permanece junto al título, mientras la explicación utiliza una segunda línea cuando está habilitada. Solo las presentaciones que incluyen el gráfico pueden plegarse; el modo de solo texto permanece visible y no tiene un control de expansión engañoso.

`climate_preconditioning_display` sigue el mismo modelo `text`, `chart` o `both`. La preparación de un regreso aceptado se identifica por separado de la anticipación semanal, con estado de la estancia, inicio estimado, objetivo de llegada y motivo pertinente. Estos detalles describen el regreso guardado y la intención actual de control; no confirman actividad física del dispositivo. Los controles integrados de Regreso puntual muestran solo el punto compatible del equipo seleccionado, sin indicadores de preparación, y conservan su nombre e inicio estimado en la leyenda. Si no hay un punto actual, una explicación breve de estado/motivo sustituye el gráfico. La llegada guardada sigue editable y Cancelar continúa disponible; estas acciones siguen afectando al regreso del hogar. La línea temporal mide tiempo hacia la llegada, no progreso térmico. El encabezado de preacondicionamiento mantiene visible el estado programado o activo y su segunda línea opcional identifica objetivo e inicio calculado. El modo de solo gráfico conserva solo ese estado sobre la vista previa ampliable. Ambas secciones gráficas comienzan contraídas salvo configuración contraria; la opción de estado inicial solo se muestra en el editor cuando se selecciona un gráfico. El título de la línea temporal, Perfil activo y Modo activo conservan opciones de visibilidad propias; los chips de Modo y Perfil tienen menor altura específica de card. La expansión manual permanece local a la sesión activa.

Refuerzo abre un formulario dentro de la tarjeta para todas las opciones compatibles con el climatizador y el servicio: objetivo o rango, duración, modo HVAC, ventilador, preset, oscilación, oscilación horizontal y humedad. Pausa permite elegir una duración finita o indefinida y si se deja el climatizador sin cambios o se apaga. La tarjeta no expone `pause_id`, reservado para identificar motivos pertenecientes a automatizaciones. Cuando una pausa puede tener otro propietario o motivo, la tarjeta abre Velair en lugar de eliminar motivos implícitamente. Desde la tarjeta puede devolverse el control manual al automático. Estas acciones locales nunca se muestran para zonas de ejecución externa. Refuerzo y Pausa/Reanudar pueden ocultarse por separado y moverse dentro de la misma lista ordenada que los accesos a scripts. Velair proporciona su comportamiento, etiquetas, iconos y formularios, que no son personalizables.

La lista de acciones también puede contener entidades `script.*` de Home Assistant seleccionadas por el usuario. Cada acceso tiene un nombre local a la tarjeta, icono MDI, color y confirmación opcional. Velair solo almacena esos ajustes de presentación en la tarjeta Lovelace y ejecuta la entidad seleccionada mediante `script.turn_on`; Home Assistant sigue siendo el responsable del script, sus permisos y sus acciones. La tarjeta no acepta JavaScript arbitrario, plantillas, cargas de servicios ni secuencias de acciones integradas. Por tanto, los accesos a scripts deben poder ejecutarse sin campos de entrada obligatorios; define los valores necesarios dentro del script de Home Assistant o proporciona valores predeterminados allí. Cada acción puede utilizar `placement: auto` o `placement: more`. Las acciones automáticas utilizan las tres primeras posiciones directas disponibles y pasan a **Más** cuando esas posiciones están ocupadas. Las acciones asignadas a `more` permanecen siempre en ese menú, independientemente de su posición en la lista ordenada. El límite de tres posiciones es fijo, no otro ajuste de visualización. **Más** se omite cuando no contiene acciones; **Abrir Velair** sigue siendo su último elemento fijo y no hace aparecer el menú por sí solo. Los accesos a scripts siguen disponibles para zonas de ejecución externa porque son acciones independientes de Home Assistant, mientras las acciones exclusivas de Velair conservan sus restricciones normales de control y disponibilidad.

La línea fina superior es un indicador semántico del estado operativo, no de progreso. La calefacción y el precalentamiento utilizan un acento cálido, la refrigeración uno frío, la deshumidificación y el ventilador permanecen estables, el reposo es una forma atenuada del modo activo, apagado es neutro y no disponible utiliza un tratamiento discontinuo de error. El movimiento es una breve indicación de cambio de estado y se desactiva cuando se solicita movimiento reducido. Un modo HVAC `off` tiene prioridad sobre una actividad `idle` obsoleta, por lo que la tarjeta muestra **Apagado** con un icono de encendido; el reposo con un modo activo seleccionado utiliza un icono neutro de termostato y no se parece a una pausa de Velair.

Las tarjetas Lovelace basadas en zonas también pueden limitar qué termostatos muestran. Es solo un filtro de visualización del panel; no cambia los horarios almacenados de Velair ni el comportamiento del planificador. Las tarjetas globales como `overview-status` y `active-setup` no muestran selección de termostatos ni opciones de día de la semana en el editor, porque no están vinculadas a un termostato o editor de horarios concreto.

Añade `view: active-setup` independientemente de la tarjeta de estado del planificador. Utiliza el editor visual o `active_setup_controls` para elegir si Configuración activa puede cambiar `modes`, `profiles` o `both`:

```yaml
type: custom:velair-card
view: active-setup
active_setup_controls: profiles
```

La opción utiliza `both` por defecto y todas las variantes siguen mostrando **Base** y **Excepciones**, con la identidad real de Modo/Perfil/Predeterminado de la base y los grupos de excepción con recuentos de estancias. Base y su tipo comparten una línea pequeña sobre el nombre; los nombres largos se ajustan en teléfonos y cards estrechas. La base también indica cuántas zonas incluidas aún la heredan; se excluyen las excepciones y las zonas Predeterminadas fuera del ámbito de un Perfil. Las bases Predeterminadas incluyen todas las zonas gestionadas. Es cobertura de selección, no actividad del dispositivo. El desplegable **Distribución de la vivienda** bajo el resumen de base comienza cerrado. Selecciona su etiqueta para mostrar barra y leyenda juntas; vuelve a seleccionarla o pulsa Escape para contraerlas dejando el encabezado en su sitio. La barra cubre todas las zonas gestionadas y su etiqueta indica el total. La leyenda compacta usa colores de Perfil, iconos pequeños y una columna de recuentos alineada a la derecha. Los recuentos de excepciones coinciden con la lista, incluidas las zonas fuera de la base. Las zonas no cubiertas sin excepciones forman un segmento neutro Predeterminado. Este total de vivienda es distinto del denominador de cobertura propio de la base. Sin zonas gestionadas no hay barra. Los Perfiles base se identifican en la leyenda ampliada sin otra lista de componentes del Modo. Las distribuciones anchas dan más espacio a las excepciones y las estrechas conservan el resumen apilado. Pulsa cualquier parte de una fila de excepción para desplegar sus estancias debajo, manteniendo visibles todas las excepciones. Vuelve a pulsarla o pulsa Escape para contraerla; el encabezado y recuento seleccionados permanecen en su sitio mientras el contenido crece hacia abajo. Abrir otro grupo cierra el anterior. El resumen compacto no muestra los nombres de estancias y las listas largas se desplazan dentro del área desplegada. El detalle es de solo lectura en todas las variantes; Configuración activa no contiene otro menú de edición por zona. El control de solo Perfiles conserva una acción de horarios Predeterminados. Seleccionar directamente un Perfil reemplaza todos los Perfiles antes activos y cambia el Modo a Manual. Las zonas que deja de cubrir vuelven a sus horarios Predeterminados en lugar de conservar la configuración del Modo anterior. Utiliza un Modo cuando deban activarse juntos como base varios Perfiles sin solapamientos. El icono compacto de capas aplica un Perfil solo a sus zonas configuradas como excepciones y conserva las demás selecciones. Consulta [base y excepciones por zona](climate-profiles.es.md#a-base-with-independent-zone-exceptions).

```yaml
type: custom:velair-card
view: preconditioning
entities:
  - climate.living_room
  - climate.bedroom
zone_order:
  - climate.bedroom
  - climate.living_room
```

Si se omite `entities`, las tarjetas basadas en zonas muestran todos los termostatos gestionados por Velair.

Para `view: sensors`, el editor de tarjetas puede ocultar el interruptor de encendido/apagado, el selector de sensor de habitación, la banda muerta de Room Assist, la desviación máxima de asistencia, el intervalo de actualización o la sección de estado en directo, de modo que una tarjeta del panel pueda ser solo informativa o más compacta.

Para `view: comfort`, el editor puede limitar la tarjeta a termostatos seleccionados y ocultar por separado la sección de configuración y los gráficos de temperatura, humedad o CO2. Son decisiones de visualización exclusivas del panel; no cambian los ajustes de Confort, sensores supervisados, umbrales, eventos ni entidades de Home Assistant generadas.

```yaml
type: custom:velair-card
view: comfort
entities:
  - climate.living_room
show_comfort_configuration: false
show_comfort_temperature: true
show_comfort_humidity: false
show_comfort_co2: true
```

<a id="create-a-daily-schedule"></a>

## Crear un horario diario

Al entrar en **Planificación**, Velair abre el día de la semana actual en hora local. Tu selección se conserva después al cambiar entre termostatos, horarios Predeterminados y de Perfiles, o datos actualizados del backend.

1. Selecciona el equipo de climatización que quieras configurar.
2. Elige una **Distribución de días** y después selecciona un día o grupo de días.
3. Utiliza **Programación propia** para bloques independientes o selecciona una plantilla con **Solo horarios** u **Horarios y ajustes**. Para bloques independientes, continúa a continuación.
4. Añade un bloque.
5. Elige la hora de inicio.
6. Elige un modo HVAC o deja `Mantener modo actual`.
7. Introduce una temperatura objetivo o un rango, o selecciona opciones del equipo sin objetivo.
8. Guarda.

En Ajustes adicionales, un **Preset de Velair** puede proporcionar la configuración de climatización del bloque manteniendo independiente su hora. Los días vinculados siguen el alcance elegido de la plantilla. Consulta [las reglas completas](linked-schedules.es.md) y [ejemplos prácticos del hogar](linked-schedule-examples.es.md) antes de elegir entre copiar y vincular.

Tras seleccionar explícitamente un modo HVAC distinto de apagado, utiliza el botón compacto de termómetro de la celda Objetivo para desactivar su entrada de temperatura. El campo gris muestra entonces un guion y el bloque solo llama al servicio `climate.set_hvac_mode` de Home Assistant, sin enviar un objetivo escalar ni un rango. Resulta útil para modos como `auto`, en los que la integración o el dispositivo pueden reanudar su propio programa, pero está disponible para todos los modos HVAC distintos de apagado comunicados por la entidad. Utiliza el mismo botón para habilitar de nuevo el campo; Velair restaura el objetivo anterior del borrador, que debe ser válido antes de guardar el horario. Los bloques existentes mantienen su comportamiento actual respecto al objetivo.

Los bloques de solo modo no ejecutan preparación ni Room Assist porque Velair no tiene una temperatura objetivo que alcanzar o ajustar. Los ajustes de climatización opcionales tampoco están disponibles para estos bloques, de modo que la acción guardada siga siendo un único cambio inequívoco de modo HVAC. Los proveedores de horarios externos deben anunciar explícitamente que admiten esta acción; Velair nunca la convierte en un bloque de temperatura.

Para programar un preset u otra opción climática sin temperatura objetivo, elige la opción en los controles adicionales del bloque y desactiva el campo Objetivo. El bloque puede combinar ajustes de preset, ventilador, oscilación, oscilación horizontal y humedad objetivo. Solo llama a los servicios de climatización correspondientes de Home Assistant; no envía `climate.set_temperature`, cambia el modo HVAC ni enciende un climatizador apagado. Un bloque debe contener al menos una opción compatible. Velair no restaura inmediatamente los cambios realizados directamente en esas opciones entre eventos programados. Los bloques de solo opciones no ejecutan preparación ni Room Assist. Cuando un bloque contiene varios controles, Home Assistant recibe llamadas de servicio separadas en secuencia. Si falla una llamada posterior, los controles anteriores pueden haber cambiado ya; Velair informa del fallo de entrega.

Cuando se aplica una plantilla o un Perfil a otro climatizador, Velair mantiene las opciones que ese climatizador admite. Si no queda ninguna en un bloque de solo opciones, se rechaza el horario de destino en lugar de guardar una acción vacía.

Velair utiliza las capacidades de la entidad de climatización seleccionada al editar un horario. Los modos no compatibles no se ofrecen para ese climatizador y las temperaturas se limitan al rango de su entidad.

En un bloque de temperatura, `Mantener modo actual` envía el objetivo y las opciones de climatización seleccionadas sin solicitar otro modo mientras el climatizador está encendido. Si está apagado, Velair lo inicia en el primer modo compatible con el objetivo. Un bloque Mantener puede guardarse cuando el climatizador anuncia al menos un modo distinto de apagado compatible con su tipo de objetivo; esto no garantiza que el modo en funcionamiento sea compatible cuando se ejecute el bloque. Si ese modo no acepta el objetivo, la entrega falla sin cambiar a otro modo. Algunas integraciones solo anuncian su función de objetivo de temperatura única después de iniciar un modo, por lo que Velair inicia el modo compatible antes de enviar el objetivo y deja que el servicio de Home Assistant informe de cualquier fallo específico del dispositivo. Los rangos nativos siguen requiriendo compatibilidad explícita, y Velair nunca convierte un objetivo único en un rango ni un rango en un objetivo único.

Elige **Solo temperatura** en el selector de modo del bloque para actualizar su objetivo sin pedir a Velair que encienda el equipo ni cambie su modo HVAC. Un equipo apagado sigue apagado cuando su integración acepta objetivos estando apagado; uno en marcha conserva su modo real. Es una opción independiente: **Mantener modo actual**, los modos explícitos y los horarios existentes conservan su comportamiento. Los bloques Solo temperatura no pueden incluir opciones adicionales como un preset, porque esas órdenes podrían cambiar el estado de funcionamiento.

La opción se aplica durante todo el bloque activo, incluidos los cambios manuales de modo HVAC, el arranque, la reanudación y la recuperación de envío. Cambiar solo el modo HVAC no inicia un Ajuste manual; cambiar la temperatura sigue la política configurada de cambios externos. Room Assist y la preparación anticipada no actúan mientras ese equipo Solo temperatura está apagado. Pueden reanudarse tras un encendido externo usando el modo compatible actual. Un Boost explícito sigue siendo una solicitud independiente que puede encender el equipo.

La compatibilidad depende de la integración del equipo. Algunas integraciones ocultan o rechazan objetivos estando apagadas o se encienden internamente al recibirlos. Velair no envía un cambio de modo ni un encendido como alternativa para un bloque Solo temperatura. Informa del fallo de actualización; no enciende brevemente el dispositivo para fijar su objetivo. Los rangos nativos requieren la capacidad de rango correspondiente. Los proveedores de horarios externos deben admitir explícitamente esta política de bloques.

El editor mantiene visibles las opciones de climatización seleccionadas en una línea compacta. Para un bloque con opciones, abre su control de opciones para ver qué enviará: el objetivo, si existe, cómo se gestiona el modo HVAC y las opciones seleccionadas. La explicación también aclara que una temperatura única no se convierte en un rango. Esto funciona en horarios, Perfiles y plantillas. El editor advierte, sin bloquear el guardado, si un bloque anterior de ese día selecciona un modo que podría no admitir el tipo de objetivo. Cuando ningún modo explícito anterior ni bloque de apagado determina el modo, utiliza el modo actual del climatizador para esta indicación. El modo puede cambiar antes de ejecutar el bloque, por lo que la advertencia es condicional.

Los bloques de temperatura contienen una temperatura objetivo única o un rango completo con objetivos inferior y superior. El editor utiliza las capacidades publicadas por la entidad de climatización y configura por defecto los nuevos bloques `heat_cool` como rango cuando es compatible. Un rango se muestra, por ejemplo, como `20–24 °C`. Velair nunca inventa un rango a partir de una temperatura y rechaza objetivos incompletos, invertidos o incompatibles antes de enviar una orden.

Los rangos nativos se limitan a `heat_cool` en esta primera fase. Velair no supone que el modo `auto` de un dispositivo utilice el mismo modelo de objetivos inferior y superior.

Cuando el climatizador seleccionado expone controles adicionales, el editor de bloques también los muestra. Por ejemplo, un aire acondicionado puede exponer modo de ventilador, modo preset, oscilación, oscilación horizontal o humedad. Velair solo guarda y envía opciones compatibles con el climatizador seleccionado; las opciones incompatibles se omiten en lugar de enviarse a ciegas.

Si un bloque utiliza `Off`, los campos de objetivo no se utilizan porque el bloque apaga la entidad de climatización.

**Distribuciones de días y edición de varios días**

El horario Predeterminado de cada equipo y cada horario de equipo dentro de un Perfil recuerdan su propia **Distribución de días**. Elige **Días individuales**, **Entre semana / Fin de semana** o **Todos los días** antes de seleccionar una pestaña de día. Los horarios existentes comienzan con Días individuales.

Todas las distribuciones conservan las mismas siete celdas en el orden de semana configurado. Días individuales selecciona una celda. Entre semana / Fin de semana selecciona lunes a viernes juntos o sábado y domingo juntos según el día pulsado. Con domingo primero, seleccionar sábado también selecciona domingo en el extremo opuesto. Todos los días selecciona todas las celdas, pulses la que pulses. Las celdas seleccionadas adyacentes se unen visualmente; las separadas conservan sus posiciones. Pulsar una celda del grupo ya seleccionado mantiene el borrador.

Seleccionar una distribución también conserva los bloques existentes. Guarda la selección con el horario Predeterminado o utiliza **Guardar Perfil** para un Perfil. Cada zona puede usar una distribución distinta. Las plantillas diarias siguen siendo listas diarias de bloques.

Cuando los días seleccionados tienen configuraciones guardadas idénticas, edita directamente su horario común. Si difieren, **Horarios diferentes** permite revisar los disponibles y elegir explícitamente una base. Los días con bloques y enlaces idénticos comparten una alternativa, con sus etiquetas de días visibles. Cada alternativa utiliza las barras compactas de Overview, con etiquetas de objetivo y modo dentro de los segmentos coloreados y sin lista permanente de bloques debajo. El icono de información abre el horario completo, incluidas horas, ajustes y referencias, con ratón, foco o toque. Consultarlo no selecciona la alternativa. Pulsa una alternativa para elegirla como base; su fondo y borde identifican la única configuración seleccionada. Con teclado se selecciona con flechas, Espacio o Intro. Las alternativas permanecen disponibles para cambiar de base antes de guardar. Con **Todos los días** o **Entre semana / Fin de semana**, selecciona una alternativa y guárdala primero para el grupo: siete días, cinco días laborables o dos de fin de semana. Seleccionarla y pulsar **Guardar** la aplica directamente, sin otra confirmación de reemplazo. El editor común de bloques solo se abre tras guardar correctamente; después puedes cambiar el horario compartido. Un fallo conserva la selección y comparación para reintentar. Las alternativas vacías muestran **Sin bloques propios** sin repetir un recuento de cero bloques. Su información explica que aplicarlas retira los bloques propios de los días elegidos; un día vacío no es una orden de apagado y puede seguir aplicándose la continuidad semanal. La distribución se adapta al móvil. Elegir una base no guarda nada. **Guardar** queda deshabilitado hasta seleccionar una base y aparece abajo alineado a la derecha. Un resumen junto a Guardar identifica el día de origen y los días que recibirán su horario. Al guardar se reemplazan los días del grupo por la configuración elegida y los demás quedan intactos. Las temperaturas visibles idénticas no implican configuraciones idénticas si difieren sus enlaces o referencias a presets. Si las alternativas parecen iguales por compartir ajustes efectivos, las etiquetas compactas de dependencias identifican plantilla y ámbito del enlace, nombres de presets o configuración independiente. Los detalles completos de referencias siguen disponibles desde información.

Añadir, quitar o mover bloques, aplicar una plantilla, cambiar su ámbito de enlace y desvincular se aplican a todos los días seleccionados al guardar. Los demás no cambian. **Guardar como plantilla** guarda una lista diaria reutilizable. Copiar a otros equipos afecta a los mismos días seleccionados y mantiene sus distribuciones propias. Para clonar de un día a otro, vuelve a Días individuales.

La línea temporal agrupada muestra los bloques comunes que estás editando, sin otro selector de vista previa ni segmento heredado específico de un día. Días individuales sigue mostrando la continuidad del día anterior. La continuidad semanal del programador no cambia; los bloques heredados nunca se copian a los guardados. Los límites del dispositivo se validan para cada día afectado antes de un guardado completo.

Las distribuciones sobreviven a reinicios de Home Assistant y exportaciones portátiles. Las exportaciones antiguas sin distribución se importan con Días individuales. Las referencias de distribuciones personalizadas anteriores también se abren como Días individuales, conservando los bloques y enlaces de cada día.

<a id="timeline-editing"></a>

## Edición de la línea temporal

La línea temporal es una representación visual de 24 horas del día seleccionado.

- Arrastra un bloque para mover su hora de inicio.
- Arrastra el borde de un bloque para redimensionar el intervalo entre bloques adyacentes.
- Utiliza la lista de bloques para indicar valores exactos de hora, modo y temperatura.

<a id="preconditioning"></a>

## Preparación

Para ausencias basadas en ocupación con llegadas semanales o puntuales preconfiguradas, consulta [Regreso a casa](planned-return.es.md). Configura la rutina en la pestaña Regreso a casa y utiliza su estado en directo para conocer los estados de cada fuente y modificar llegadas puntuales sin editar la semana guardada. **Programar regreso** puede esperar a confirmar la salida con una hora puntual incluso si la rutina semanal automática está desactivada. Sin fuentes de ocupación guardadas, el inicio explícito aplica Ausencia inmediatamente; la preparación normal y la llegada guardada siguen ejecutándose.

La preparación permite a Velair iniciar un objetivo de confort programado antes de la hora visible del bloque para un climatizador gestionado.

Cuando se habilita para un climatizador en la pestaña Preparación del confort, la hora del bloque representa la hora deseada de confort. Velair puede aplicar antes el objetivo utilizando su predicción adaptativa, manteniendo visible la hora objetivo original en los próximos eventos.

Si Velair recalcula cuando ya está dentro de la ventana de preparación, aplica inmediatamente el objetivo cuando la temperatura actual aún necesita calefacción o refrigeración.

La pestaña Preparación del confort enumera los climatizadores gestionados en el orden configurado en Ajustes. Para cada climatizador permite:

- activar o desactivar la preparación;
- establecer un adelanto máximo de hasta 1440 minutos;
- establecer los parámetros del modelo adaptativo y la diferencia mínima de temperatura;
- inspeccionar por separado el aprendizaje de calefacción y refrigeración;
- restaurar los parámetros de ajuste a sus valores predeterminados sin eliminar muestras de aprendizaje;
- reiniciar una dirección de aprendizaje sin afectar a la otra.

La configuración se agrupa en tiempos y límites, modelo de aprendizaje, historial y contexto exterior opcional. Cuando el contexto exterior está desactivado, también lo está su selector de sensor. Los climatizadores no disponibles no pueden habilitar la preparación, y la pestaña explica el motivo.

Cada control de ajuste incluye ayuda contextual compacta. Sitúa el puntero sobre su icono de información, selecciónalo con el teclado o tócalo para ver cómo aumentar, reducir o habilitar ese ajuste afecta a la preparación.

La preparación es adaptativa. Velair predice cada evento futuro a partir de la diferencia actual de temperatura, primero con un modelo inicial local y después con historial local similar cuando existen suficientes observaciones completas. Las predicciones históricas aprenden el tiempo necesario por grado de cambio térmico, de modo que cambios pequeños de temperatura del pasado pueden escalarse para diferencias futuras mayores y cambios grandes anteriores pueden reducirse para diferencias menores. Las observaciones más similares y recientes tienen mayor influencia.

Velair no adelanta el inicio de bloques `Off`. Si la temperatura actual ya está suficientemente cerca del objetivo, mantiene la hora normal del bloque.

Para rangos nativos `heat_cool`, Velair utiliza el límite inferior cuando la habitación necesita calefacción y el superior cuando necesita refrigeración. Se sigue aplicando por adelantado el rango completo, y el aprendizaje registra qué límite dirigió la sesión.

Los detalles de configuración y los ejemplos de calefacción, refrigeración, sensor exterior, automatización y Lovelace están documentados en [Anticipación adaptativa](adaptive-preconditioning.es.md).

Antes de que comience un inicio adelantado, Velair escucha los cambios relevantes de temperatura de los climatizadores gestionados con preparación habilitada. Por defecto utiliza el atributo `current_temperature` del propio termostato. Si Room Sensor Assist está habilitado para ese climatizador, Velair utiliza el sensor de la habitación seleccionado como temperatura efectiva para las decisiones y el aprendizaje de preparación. Cuando la temperatura cambia lo suficiente para afectar a la diferencia actual, Velair agrupa la actualización con un pequeño retardo y recalcula localmente la siguiente acción del planificador. Los paneles abiertos también agrupan los cambios relevantes de temperatura interior o exterior configurada en una única actualización, sin consultas continuas. Si cambia el inicio adelantado del mismo evento visible, su fila se resalta brevemente para que el ajuste pueda apreciarse sin un diálogo ni una notificación global.

<a id="room-assist"></a>

## Room Assist

La pestaña Room Assist enumera los climatizadores gestionados en el orden configurado en Ajustes. Para cada climatizador permite configurar Room Sensor Assist.

El sensor de temperatura de habitación seleccionado es útil para válvulas termostáticas o termostatos cuyo sensor integrado está demasiado cerca de un radiador, una salida de aire u otra fuente local de calor. Seleccionar un sensor por sí solo no cambia el control de Velair. Solo se convierte en la temperatura efectiva de la habitación cuando Room Sensor Assist está habilitado, porque entonces Velair también ajusta el objetivo del termostato para que el actuador siga calentando o enfriando tomando como referencia la lectura del sensor externo de la habitación.

Los ejemplos detallados de calefacción, refrigeración, automatización y Lovelace están documentados en [Room Assist](room-assist.es.md).

Room Sensor Assist es una opción avanzada que requiere un sensor de temperatura de habitación, pero no Anticipación adaptativa. Para un bloque fijo `heat` o `cool` con una banda muerta distinta de cero, Velair trata los bordes inferior y superior de la banda como límites de conmutación. Mantiene una fase de ejecución hasta que el sensor externo alcanza el borde opuesto y después invierte la dirección: la calefacción fija se inicia de forma segura hacia el borde inferior y la refrigeración fija hacia el superior. La desviación máxima de asistencia limita la corrección con signo desde el borde actualmente activo. Una banda muerta de `0` conserva la corrección con signo anterior alrededor del objetivo central. Los objetivos escalares `auto` y `heat_cool` conservan ese comportamiento neutro, y los rangos nativos `heat_cool` conservan su comportamiento estable de banda de mantenimiento, de modo que Velair no fuerza una unidad automática a alternar activamente entre calefacción y refrigeración. La banda muerta utiliza por defecto `0.3 °C` o `1 °F`, admite pasos de `0.1` grados desde `0` hasta `5 °C` o `9 °F`, y se aplica inmediatamente al guardar. La desviación máxima de asistencia utiliza por defecto `2 °C` o `4 °F` y puede configurarse en pasos de `0.1` grados hasta `10 °C` o `18 °F`. El objetivo o rango visible del horario no cambia, y siguen aplicándose la alineación al paso de temperatura, la protección del horario y los límites físicos del climatizador. La fase solo existe durante la ejecución y comienza de nuevo después de cambiar el bloque, objetivo o modo, limpiar Room Assist o recargar la integración. Velair influye en la unidad mediante su objetivo; no puede anular la histéresis del dispositivo, la protección del compresor ni el tiempo mínimo de funcionamiento, así que utiliza un bloque `Off` cuando necesites un apagado explícito.

Velair sigue la unidad de temperatura configurada en Home Assistant. No hay un ajuste separado de Celsius o Fahrenheit. Ajustes muestra esa unidad de Home Assistant como valor de solo lectura para verificar el comportamiento activo; cámbiala desde los ajustes del sistema de unidades de Home Assistant. Los nuevos horarios, plantillas integradas, umbrales de Confort, límites de Room Assist y valores predeterminados de Anticipación adaptativa son físicamente equivalentes en ambas unidades. Los sensores externos de temperatura se convierten antes de comparar sus lecturas con un objetivo del equipo.

Velair almacena los valores térmicos sin transformar en la unidad registrada con sus datos. Si Home Assistant cambia de unidad, Velair detiene la programación y las escrituras térmicas, crea una notificación persistente y ofrece en Ajustes una migración explícita desde la unidad almacenada a la unidad actual de Home Assistant. Continúa únicamente cuando todos los valores almacenados sigan utilizando la unidad de origen mostrada; los valores que ya estén en la unidad de destino se convertirían incorrectamente. Los horarios, plantillas, objetivos activos y anteriores de anulación, límites de Confort, valores de Room Assist, ajustes y tasas de Anticipación adaptativa y observaciones de aprendizaje se migran de forma atómica.

La actualización única desde datos publicados de Velair que solo admitían Celsius es distinta. Si Home Assistant ya utiliza Fahrenheit, Velair supone sin preguntar que esos datos antiguos están en Celsius, mantiene detenido el planificador e indica utilizar **Restablecer Velair**. El restablecimiento descarta la configuración antigua y crea atómicamente valores predeterminados nuevos en Fahrenheit. Después de esa actualización, los cambios posteriores de unidad de Home Assistant utilizan la conversión explícita completa descrita arriba y conservan los datos.

Las exportaciones actuales del formato de intercambio v19 conservan los valores sin transformar y declaran su unidad. Las versiones anteriores de Velair no pueden importar exportaciones v19; utiliza una versión compatible con v19 para restaurarlas. Los archivos antiguos compatibles, incluidos v4, v5, v8 y v9, siguen siendo importables. Las importaciones convierten los datos térmicos seleccionados cuando difieren la unidad del archivo y la actual de Home Assistant. Los archivos antiguos sin unidad se consideran Celsius porque todas las versiones publicadas de Velair que los generaron almacenaban valores Celsius. La exportación sigue disponible mientras la programación está detenida para actualizar la unidad, por lo que puedes guardar una copia de referencia antes de restablecer e importarla después.

Si un climatizador no estaba disponible al migrar o importar los datos, Velair comprueba sus límites y su paso efectivo de temperatura. Un `target_temp_step` válido publicado por Home Assistant tiene prioridad sobre el último paso comunicado y después sobre la alternativa manual configurada por zona. El panel advierte cuando un objetivo de horario almacenado ya no es compatible para que pueda editarse antes de depender de ese horario.

El comportamiento completo de actualización, migración, copia de seguridad y recuperación está documentado en [Unidades de temperatura y migración](temperature-units.es.md).

Cuando Room Sensor Assist está habilitado, la pestaña Room Assist muestra una escala compacta de temperatura en directo mientras está activo un bloque de temperatura gestionado. Para un objetivo único marca el objetivo programado, el sensor de habitación, el objetivo del equipo y la lectura del termostato. Una banda neutra rayada marca los límites inferior y superior de la banda muerta. Con `heat` o `cool` fijos, el estado también muestra si el control avanza hacia el límite inferior o superior; con modos automáticos escalares, la banda permanece como margen neutro. Para un rango nativo se extiende desde el límite inferior programado menos la banda muerta hasta el superior programado más la banda muerta; unos corchetes separados siguen mostrando las bandas completas programada y aplicada, con un conector entre sus centros que representa el desplazamiento con signo de todo el rango. El sensor de habitación y las lecturas del equipo mantienen marcadores individuales. La leyenda traducida completa permanece centrada sobre el rango representado de banda muerta, incluso cuando ese rango es más estrecho que la etiqueta; una banda muerta de cero elimina la superficie y se indica explícitamente. Ocultar `show_room_assist_deadband` oculta juntos su ajuste, banda y leyenda. Estos valores se derivan del estado de Home Assistant y de la ejecución de Velair; no se guardan como un historial nuevo. Si no hay un bloque de temperatura gestionado activo, la pestaña muestra un estado de espera en lugar de valores de relleno. Si hay un sensor seleccionado pero Assist está apagado, indica que el sensor está guardado pero no operativo.

Room Sensor Assist responde a eventos. Velair no consulta periódicamente las temperaturas. Solo escucha el sensor de habitación configurado y la entidad de climatización mientras la asistencia está activa, agrupa los cambios utilizando el ajuste Intervalo de actualización de cada climatizador, alinea los objetivos temporales al paso efectivo publicado, último comunicado o configurado, ignora movimientos menores que ese paso y restaura el objetivo programado real cuando se pausa el planificador, se pausa una zona, comienza un Refuerzo, el bloque apaga, el sensor deja de ser utilizable o se desactiva la función. Limpiar ese estado de ejecución también elimina cualquier fase de histéresis de modo fijo. Si Anticipación adaptativa ya ha iniciado por adelantado un bloque futuro, Room Sensor Assist sigue ese objetivo futuro hasta la hora de confort programada en lugar de volver al bloque anterior.

Cuando se desactiva la preparación para un climatizador, Velair no registra suscripciones de temperatura para preparación, no programa callbacks de recálculo, no inicia sesiones de aprendizaje ni guarda observaciones nuevas para ese climatizador. Las muestras aprendidas anteriormente se conservan y pueden reutilizarse al habilitar de nuevo la preparación.

Velair también conserva un historial compacto local de aprendizaje para los intentos de preparación. Abre una sesión de aprendizaje durante la ejecución cuando aplica por adelantado un objetivo de confort, y después almacena una observación compacta cuando el climatizador alcanza el umbral objetivo o llega la hora de confort. Las sesiones interrumpidas por Refuerzo, pausas, detenciones del planificador o cambios de horario se descartan.

La pestaña Preparación del confort muestra el estado local de aprendizaje por climatizador. Calefacción y refrigeración se supervisan por separado, y una dirección no admitida por la entidad de climatización se muestra como no disponible. Cuando Velair dispone de suficientes observaciones completas para una dirección compatible, puede utilizar historial local similar en lugar del modelo inicial.

Cada dirección compatible tiene una tarjeta compacta de estado que muestra si el aprendizaje está preparado, qué origen del modelo está activo y las recuentos de muestras completas, parciales e inválidas.

La pestaña también ofrece una acción para reiniciar el aprendizaje de cada dirección compatible. Recalibra calefacción o refrigeración desde cero de forma independiente, manteniendo los horarios, ajustes de preparación e historial de aprendizaje de la otra dirección.

La acción de restaurar por climatizador es distinta del reinicio de aprendizaje. Solo restaura los parámetros de ajuste de Anticipación adaptativa, mantiene su estado actual de activación, conserva los ajustes del sensor de habitación y todas las muestras guardadas de calefacción y refrigeración.

Las observaciones parciales no se convierten en tiempos ficticios de finalización. Actúan como límites inferiores: Velair sabe que el tiempo necesario fue mayor que la ventana de inicio intentada. Si suficientes observaciones completas posteriores demuestran que funciona un adelanto menor, las observaciones parciales antiguas dejan de forzar al alza la predicción. Esto mantiene el aprendizaje conservador sin hacer permanentes los adelantos elevados.

Velair mantiene historiales compactos separados de calefacción y refrigeración para que el uso estacional de una dirección no pueda desplazar el aprendizaje de la otra.

Todos los ajustes y cálculos de preparación se ejecutan localmente dentro de Home Assistant. Velair no envía el historial climático ni los datos de horarios a ningún servicio externo.

Los detalles para desarrolladores sobre estados locales de aprendizaje, salida de API y reglas de predicción están documentados en [Funcionamiento interno de la preparación adaptativa](../developer/adaptive-preconditioning.md).

<a id="environmental-comfort"></a>

## Confort ambiental

La pestaña Confort enumera los climatizadores gestionados en el orden configurado en Ajustes. Para cada uno puede supervisar temperatura de habitación, humedad y CO2. También puede mostrar lecturas opcionales de punto de rocío, humedad absoluta y Humidex calculadas localmente a partir de la temperatura y humedad efectivas o proporcionadas por un sensor existente de Home Assistant.

Confort solo supervisa. No cambia bloques de horarios, objetivos de climatización, modos de ventilador, presets ni pausas. En su lugar, Velair describe la habitación con condiciones comprensibles como `Frío y húmedo`, mantiene separada la calidad del aire por CO2, indica si las lecturas están completas y emite eventos de automatización cuando cambia esa evaluación.

La temperatura puede utilizar un sensor específico de Confort, el sensor de temperatura de habitación de Room Assist cuando esté configurado o el atributo `current_temperature` de la propia entidad de climatización. La humedad puede utilizar un sensor seleccionado o `current_humidity` de la entidad de climatización cuando esté disponible. El CO2 solo se evalúa cuando se selecciona un sensor de CO2.

El modelo Simple de Confort, predeterminado, utiliza un rango rectangular de temperatura y humedad. El modo Guiado convierte una referencia de humedad en el punto medio en una curva psicrométrica dependiente de la temperatura. El modelo personalizado sensible a la temperatura permite que los límites de humedad difieran en los extremos de temperatura más frío y más cálido; Velair interpola el rango efectivo y muestra su área objetivo inclinada sin afirmar que sea un confort universal. Las zonas existentes permanecen en el modelo Simple salvo que se cambie explícitamente.

Estas lecturas adicionales están desactivadas por defecto y siguen siendo informativas: no cambian las clasificaciones de Confort ni el comportamiento climático. Cuando Confort está desactivado para un climatizador, Velair no registra suscripciones de sensores de confort para él. Cuando está habilitado, solo escucha los sensores seleccionados relevantes y la entidad de climatización. No hay consultas continuas.

Confort también puede comparar la habitación con sensores explícitos de temperatura exterior y humedad opcional. El bloque **Interior frente a exterior** muestra la diferencia de temperatura, las humedades absolutas interior y exterior, y la humedad relativa que tendría el aire exterior a la temperatura interior. Cuando el backend identifica una dirección útil o un conflicto, Velair muestra un único mensaje prudente de ventilación; nunca trata la comparación como una orden. La configuración se mantiene dentro del panel plegado de ajustes de Confort, y desactivar la comparación conserva los ID de sensores seleccionados. Los controles de **Orientación de ventilación** por climatizador permiten exigir diferencias mayores o menores de temperatura, humedad proyectada y humedad del aire antes de mostrar ese mensaje; los márgenes prudentes originales siguen siendo los valores predeterminados.

Los detalles de configuración y los ejemplos de calefacción, refrigeración, CO2, automatización y privacidad están documentados en [Confort ambiental](comfort.es.md).

<a id="templates"></a>

## Plantillas

Las plantillas son conjuntos diarios reutilizables de bloques. Sus ajustes pueden ser manuales o utilizar presets compartidos de Velair. La pestaña Plantillas también contiene la biblioteca de presets climáticos; un preset de Velair comparte ajustes de climatización sin compartir las horas de los bloques.

La pestaña Plantillas permite:

- crear una plantilla nueva;
- renombrar una plantilla;
- editar sus bloques;
- aplicar una plantilla a climatizadores y días seleccionados;
- eliminar plantillas que no tengan días vinculados.

En Horarios, selecciona una plantilla como origen de un día para vincular sus horas o toda su configuración. Copiar una plantilla sigue siendo una operación separada.

La pestaña Horarios también puede guardar el día actual como plantilla nueva.

Al copiar o vincular una plantilla a un climatizador, Velair valida sus modos HVAC, tipos de objetivo, límites de temperatura y restricciones del proveedor. Los objetivos fuera de rango y los modos incompatibles se rechazan. Los ajustes manuales se adaptan a los pasos de temperatura compatibles; los valores de presets compartidos se adaptan para cada destino sin cambiar la biblioteca. Los ajustes opcionales incompatibles se filtran siempre que el bloque siga teniendo una acción válida.

Copiar bloques crea horas independientes de la plantilla, pero conserva las referencias activas a presets. Los vínculos **Solo horarios** comparten horas con asignaciones climáticas independientes. Los vínculos **Horarios y ajustes** comparten toda la plantilla, con controles de solo lectura en el destino. Los cambios de plantilla validan todos los días vinculados, incluidos los Perfiles inactivos. La edición conserva la posición de la plantilla en la biblioteca.

Consulta [Presets climáticos y plantillas vinculadas](linked-schedules.es.md) para todas las reglas y [Ejemplos prácticos](linked-schedule-examples.es.md) para configuraciones completas, alternativas de bloques nuevos, conversiones de vínculos, recuentos de uso y resolución de problemas.

Las plantillas pueden incluir todos los ajustes de climatización opcionales disponibles entre los climatizadores gestionados. Esto permite utilizar una plantilla en instalaciones mixtas. Cuando se aplica a un climatizador concreto, Velair conserva solo las opciones compatibles con él. Por ejemplo, una plantilla puede contener `fan_mode: quiet` para un aire acondicionado, pero ese campo se elimina automáticamente al aplicar la misma plantilla a una válvula termostática que no exponga modos de ventilador.

<a id="climate-profiles"></a>

## Perfiles climáticos

Los Perfiles climáticos alternan varias zonas entre planes semanales coordinados sin sobrescribir sus horarios predeterminados. Cada Perfil puede dar a una zona un horario semanal alternativo, pausarla, pausarla y apagarla o dejarla en su horario Predeterminado. Las zonas omitidas en un Perfil siguen utilizando sus horarios predeterminados.

Un Modo puede activar varios Perfiles juntos cuando sus zonas configuradas no se solapan. La activación directa sustituye el conjunto activo por un Perfil y selecciona Manual. Las zonas cubiertas por el conjunto activo anterior pero no por ese Perfil vuelven a sus horarios Predeterminados. La activación aplica los bloques activos en la hora actual, incluidos los iniciados en un día anterior, y cancela los Refuerzos de las zonas afectadas. Las pausas globales y por zona mantienen su prioridad.

El panel lateral utiliza **Planificación** como espacio completo de planificación. Elige **Planificaciones predeterminadas** para editar el plan semanal habitual, o **Planificaciones de Perfiles** para crear un Perfil y configurar un termostato cada vez con **Planificación predeterminada**, **Planificación del Perfil** o **Pausa**. Ambos orígenes ofrecen la misma línea temporal, opciones de bloque, plantillas y herramientas de clonación, pero cada uno conserva su propia forma de guardar: un día Predeterminado se guarda directamente, mientras los metadatos del Perfil y el comportamiento de los termostatos se guardan atómicamente como un único Perfil. Sigue siendo posible activar directamente un Perfil desde su fila. La pestaña separada **Modos** combina Perfiles en configuraciones reutilizables y no duplica su editor de horarios. Mientras Velair procesa las zonas afectadas, una barra global de operación muestra la zona actual, el número procesado y el resultado final de éxito o error parcial en todas las pestañas del panel. En Lovelace solo aparece en la tarjeta Configuración activa, donde se realizan las activaciones de Modos y Perfiles. Procesado significa que Home Assistant y Velair han terminado de gestionar esa zona, incluidos los casos en que una pausa o anulación evita necesitar una orden climática. No significa que la habitación haya alcanzado ya su temperatura objetivo. Los resultados correctos desaparecen automáticamente tras una breve confirmación. Los resultados parciales y fallidos permanecen visibles hasta descartarlos. Las automatizaciones de Home Assistant pueden activar un Perfil mediante `velair.activate_profile` o seleccionar un valor configurable en la entidad nativa `select.velair_mode` de Velair.

Consulta [Perfiles climáticos](climate-profiles.es.md) para detalles de configuración, automatización, reinicio, interacciones y portabilidad.

<a id="external-schedule-execution"></a>

## Ejecución externa de horarios

Normalmente, Velair guarda el plan semanal de una zona y lo ejecuta mediante su entidad `climate.*` de Home Assistant. Cuando **Ajustes → Sistemas externos** detecta un controlador compatible, una zona elegible puede delegar la ejecución en ese sistema. Velair publica entonces la semana efectiva completa seleccionada por Predeterminado, un Perfil o un Modo. La zona debe tener primero un horario efectivo guardado con al menos un bloque de temperatura; de lo contrario, Velair mantiene la ejecución local y explica el requisito en Ajustes.

Una zona gestionada externamente sigue limitada a horarios. Velair no envía acciones climáticas directas para Refuerzo, pausa o reanudación, Ajuste manual, Room Assist ni Anticipación adaptativa. El comportamiento **Pausa** de un Perfil no está disponible, mientras **Planificación predeterminada** y **Planificación del Perfil** seleccionan la semana que se publica. Los límites específicos del controlador se muestran una vez por sistema en uso en Ajustes y también se aplican al editar horarios Predeterminados y de Perfiles compatibles. Cuando un controlador requiere un punto implícito de continuidad a medianoche, el editor lo incluye en el uso visible de puntos diarios de cambio.

Resumen solo informa de **Publicando**, **Publicado** o **Error** después de un intento en la ejecución actual de Home Assistant. **Publicado** significa que la integración externa aceptó la llamada al servicio; no confirma que el controlador físico haya aplicado el horario. La zona conserva su actividad habitual de programación y el próximo evento, mientras un indicador compacto **Externo** muestra el controlador y el estado de publicación. Velair no consulta periódicamente, relee ni reintenta automáticamente. Consulta [Ejecución externa de horarios](external-systems.es.md) para sistemas compatibles, límites, comportamiento de transferencia y estado actual de validación.

<a id="clone-schedules"></a>

## Clonar horarios

Debajo del editor, Velair puede clonar el día actual:

- a otros días de la semana del mismo climatizador;
- al mismo día de la semana de otros climatizadores gestionados.

Para clonar días, **Lun–Vie**, **Fin de semana**, **Todos los días** y **Borrar selección** permiten seleccionar rápidamente los destinos, manteniendo disponibles los días individuales. Estos accesos solo cambian los destinos seleccionados; **Clonar** sigue siendo una acción explícita y nunca se incluye el día de origen.

Las acciones de clonación guardan primero los cambios pendientes cuando es necesario. Copian la configuración de origen, incluida la plantilla, el tipo de vínculo, las asignaciones de solo horas y las referencias a presets. Clonar un día independiente elimina el vínculo del destino para ese día; los demás días conservan sus vínculos. Los destinos incompatibles rechazan la clonación sin cambiar ningún destino seleccionado. Utiliza **Desvincular** después de clonar cuando el nuevo día deba dejar de seguir su plantilla.

<a id="pause-stop-and-resume"></a>

## Pausar, detener y reanudar

Velair tiene controles globales del planificador:

- **Pausar** suspende la ejecución automática de horarios durante un tiempo en minutos.
- **Detener** suspende indefinidamente la ejecución automática de horarios.
- **Reanudar** devuelve el planificador al modo automático.

Cuando hay una pausa temporal activa, el resumen muestra el tiempo restante y el progreso.

Las duraciones de pausa y Refuerzo se introducen en minutos. La interfaz de servicios de Home Assistant permite valores de hasta 10080 minutos, que son siete días.

Velair también admite pausas por zona mediante servicios y automatizaciones. Una pausa de zona solo afecta a una entidad de climatización gestionada. Los demás climatizadores siguen sus horarios. Al reanudar una zona, Velair aplica el horario actual solo si existe un bloque activo para ese climatizador en ese momento; en caso contrario, lo deja sin cambios.

<a id="boost"></a>

## Refuerzo

Refuerzo se aplica por zona climática. Anula temporalmente el horario de una entidad de climatización y deja que las demás zonas funcionen normalmente.

Cuando comienza un Refuerzo, Velair captura el estado del equipo de climatización actual restaurable de esa zona, incluido el modo HVAC y su objetivo único o rango completo cuando Home Assistant los expone. Esta instantánea solo se utiliza para decidir qué debe suceder al finalizar el Refuerzo.

Refuerzo está disponible mediante servicios, scripts, automatizaciones y controles del panel de Home Assistant. Así, el editor principal de horarios se centra en su función mientras se permiten automatizaciones avanzadas como:

- iniciar un Refuerzo en una habitación desde un botón;
- iniciar un Refuerzo tras detectar movimiento;
- iniciar un Refuerzo desde un asistente de voz;
- iniciar un Refuerzo con un modo HVAC preferido.

Cuando vence un Refuerzo, Velair resuelve la zona afectada en este orden:

1. Si hay un bloque activo de horario con un modo HVAC explícito, Velair aplica ese objetivo programado.
2. Si hay un bloque activo que apaga el climatizador, Velair lo apaga.
3. Si no hay ningún bloque activo, Velair restaura el estado capturado antes del Refuerzo.
4. Si el bloque activo utiliza `Keep`, Velair también restaura el estado capturado antes del Refuerzo, porque `Keep` no define un nuevo modo HVAC que aplicar después de la anulación temporal.

Esto significa que un Refuerzo no debe hacer que Velair invente un objetivo nuevo de calefacción o refrigeración cuando el horario actual no define explícitamente uno.

<a id="startup-behavior"></a>

## Comportamiento al iniciar

Por defecto, Velair restaura el estado guardado del planificador después de iniciar Home Assistant, pero no fuerza los equipos de climatización a un objetivo de horario.

Desde Ajustes puedes habilitar **Aplicar la planificación activa al arrancar**. Cuando está habilitado, Velair aplica el bloque activo actual a los climatizadores gestionados después de iniciar Home Assistant, siempre que el planificador esté en modo automático. Un bloque que comenzó en un día anterior sigue considerándose activo hasta que comienza el siguiente bloque semanal. Se respetan los Refuerzos activos.

<a id="automation-blueprints"></a>

## Blueprints de automatización

Velair proporciona blueprints opcionales de Home Assistant mediante su documentación:

- alternar entre acciones elegidas de Casa/Ausencia desde una entidad consolidada de ocupación;
- pausar uno o varios climatizadores gestionados mientras alguna ventana o puerta seleccionada permanezca abierta;
- seleccionar Modos estacionales u otras acciones una sola vez tras confirmar un nuevo rango estacional, con notificaciones inmediatas para lecturas inválidas.

Utilizan eventos de estado de Home Assistant y retardos configurables, no consultas periódicas. El blueprint de ocupación puede informar cuando su grupo consolidado, sensor de plantilla o ayudante sigue no disponible, sin ejecutar acciones de Casa ni de Ausencia. El blueprint de ventanas identifica la pausa que crea, por lo que cerrar una ventana no puede eliminar una pausa manual ni una pausa perteneciente a otra automatización. Si un contacto sigue desconocido o no disponible, Home Assistant muestra una única notificación diagnóstica retardada para el conjunto de termostatos y la descarta automáticamente tras recuperarse; el contacto afectado sigue bloqueando la reanudación. Consulta [Blueprints de automatización](blueprints.es.md) para configuración, ejemplos, comportamiento al iniciar y la regla de una automatización por zona para contactos de ventanas.

El [blueprint estacional](blueprints/seasonal-climate-selection.es.md) confirma un nuevo rango estacional durante 30 minutos por defecto. Los cambios dentro de ese rango conservan el plazo original; las acciones se ejecutan una sola vez por cada entrada en el rango. Las comprobaciones al iniciar son únicamente diagnósticas. Utiliza su editor normal de acciones de Home Assistant para seleccionar Modos de Velair. Configura un Modo real de pausa y apagado si el tiempo templado debe detener la climatización; las acciones vacías dejan sin cambios el funcionamiento actual.

<a id="portability"></a>

## Portabilidad

La pestaña Ajustes puede exportar e importar un archivo JSON con versión.

El archivo puede contener:

- horarios de termostatos;
- plantillas;
- presets compartidos de bloques;
- ajustes del panel;
- aprendizaje de preparación adaptativa;
- definiciones de Perfiles climáticos;
- definiciones de Modos.

Las exportaciones actuales del modelo 19 conservan ambos tipos de vínculo de plantillas, las referencias a presets y las relaciones de Maestro de preacondicionamiento. Las referencias de ejecución aceptada del maestro permanecen locales y no se exportan. Exportar horarios o Perfiles incluye las plantillas y presets necesarios, mostrados como secciones adicionales seleccionadas. Las importaciones validan la configuración combinada, incluidos los consumidores existentes de recursos compartidos sustituidos. Los presets se combinan por clave estable: se sustituyen las claves coincidentes, mientras que los presets locales ausentes del archivo permanecen. Las copias existentes siguen siendo importables; las versiones antiguas de Velair no pueden importar archivos del modelo 19. Consulta [el ejemplo de copia de seguridad](linked-schedule-examples.es.md#back-up-the-whole-setup).

Al importar, Velair permite elegir qué secciones sobrescribir. La importación sustituye los datos seleccionados, así que exporta primero si necesitas un punto de recuperación. Las definiciones de Perfiles y Modos se pueden exportar e importar, pero su selección activa no. Velair conserva los ID de Perfiles activos que sigan existiendo y solo vuelve a los horarios predeterminados cuando no queda ninguno.

Cada exportación nueva registra su unidad de temperatura. Al importar un archivo del otro sistema de unidades, Velair convierte los valores térmicos seleccionados a la unidad actual de Home Assistant. Los valores vinculados a un climatizador disponible se alinean con su paso efectivo de objetivo; los valores independientes utilizan una precisión segura cuando no hay un paso común de dispositivo. La alternativa manual por zona se puede exportar e importar, mientras que el último paso observado de una entidad de climatización local se excluye deliberadamente de la exportación. Las exportaciones antiguas sin unidad registrada se anuncian en la pantalla de importación y se interpretan como Celsius.

El aprendizaje de preparación adaptativa se vincula mediante el ID exacto de la entidad de climatización de Home Assistant. El aprendizaje de climatizadores no gestionados actualmente se muestra antes de importar y se omite. Para los climatizadores coincidentes, el aprendizaje importado sustituye su calibración existente. El aprendizaje de climatizadores locales que no aparezcan en el archivo permanece sin cambios.

Los valores de configuración de preparación ya están incluidos en **Horarios de termostatos**. La sección separada **Aprendizaje de preparación** contiene el historial de calibración local costoso de obtener.

<a id="maintenance"></a>

## Mantenimiento

La pestaña Ajustes muestra información técnica de versiones:

- compilación del frontend;
- versión del formato de exportación;
- versión de almacenamiento/modelo;
- versión de la integración.

También incluye una acción de restablecimiento. Restablecer elimina todos los datos de horarios guardados de Velair, incluidos horarios, plantillas, preferencias del panel, Refuerzo y pausas activos, políticas de ajustes externos por climatizador y Ajustes manuales activos, ajustes de Confort y Room Assist, ajustes y aprendizaje de Anticipación adaptativa y comportamiento al iniciar. Después recrea valores predeterminados según la unidad para los climatizadores gestionados actualmente. La selección separada de categorías de Diagnóstico y su registro actual de ejecución no forman parte de este restablecimiento de datos de horarios. Velair solicita confirmación antes de hacerlo.

<a id="services"></a>

## Servicios

Velair expone servicios de Home Assistant para automatizaciones y scripts:

- `velair.set_temperature`
- `velair.set_hvac_mode`
- `velair.apply_schedule`
- `velair.boost`
- `velair.cancel_boost`
- `velair.activate_profile`
- `velair.deactivate_profile`
- `velair.enable_room_sensor_assist`
- `velair.disable_room_sensor_assist`
- `velair.pause`
- `velair.pause_zone`
- `velair.resume`
- `velair.resume_zone`
- `velair.set_external_change_policy`
- `velair.enter_manual_adjustment`
- `velair.resume_automatic_control`
- `velair.set_daily_schedule`
- `velair.copy_day_schedule`
- `velair.clear_schedule`
- `velair.update_block_preset`

Los servicios dirigidos a una entidad solo funcionan con climatizadores seleccionados durante la configuración. Si se proporciona una entidad de climatización no gestionada, Velair rechaza la llamada al servicio antes de cambiar nada.

<a id="velairupdate_block_preset"></a>

### `velair.update_block_preset`

Actualiza un preset compartido guardado utilizando su `preset_key` estable. Las actualizaciones parciales conservan los campos omitidos; una sustitución explícita puede cambiar su acción. Los cambios afectan a todas las referencias y utilizan la validación normal, la prioridad de las anulaciones y el recálculo de Preparación. Consulta [Automatizaciones de presets](preset-automations.es.md) para la referencia de campos y los ejemplos de temperatura exterior, rango, opciones del dispositivo y apagado/restauración. Este servicio cambia una definición compartida; no selecciona otro preset para un bloque.

<a id="velairactivate_profile"></a>

### `velair.activate_profile`

Activa un Perfil climático guardado y aplica inmediatamente el comportamiento efectivo actual. Sustituye todo el conjunto activo de Perfiles; las zonas que no cubra el Perfil seleccionado vuelven a sus horarios Predeterminados. Utiliza el ID estable del Perfil mostrado por Velair en lugar de su nombre visible editable. Una activación directa establece el selector de Modo en `Manual`. Omitir `profile_id` sigue devolviendo a los horarios predeterminados por compatibilidad; las automatizaciones nuevas deben utilizar explícitamente `velair.deactivate_profile`.

```yaml
action: velair.activate_profile
data:
  profile_id: vacation
```

<a id="velairdeactivate_profile"></a>

### `velair.deactivate_profile`

Desactiva todos los Perfiles activos y devuelve inmediatamente cada zona a su horario predeterminado.

```yaml
action: velair.deactivate_profile
```

<a id="velairset_temperature"></a>

### `velair.set_temperature`

Establece una entidad de climatización gestionada en una temperatura única o en un rango de objetivos inferior y superior. `hvac_mode` es opcional.

Es un servicio práctico limitado al ámbito de Velair, no un sustituto de `climate.set_temperature` de Home Assistant. Las diferencias son:

- solo acepta entidades de climatización gestionadas por Velair;
- valida el objetivo con las capacidades y límites de temperatura conocidos por Velair;
- utiliza las reglas alternativas de modo HVAC de Velair cuando se proporciona un modo o cuando es necesario encender el climatizador.

Utiliza los servicios de climatización nativos de Home Assistant para un control de climatización genérico. Utiliza `velair.set_temperature` cuando una automatización deba actuar únicamente sobre climatizadores gestionados por Velair.

También pueden proporcionarse los campos opcionales `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode` y `humidity`. Velair solo aplica los campos compatibles con el climatizador de destino.

```yaml
action: velair.set_temperature
data:
  entity_id: climate.living_room
  temperature: 21
  hvac_mode: heat
  fan_mode: quiet
```

Para un rango, omite `temperature` y proporciona ambos límites:

```yaml
action: velair.set_temperature
data:
  entity_id: climate.living_room
  target_temp_low: 20
  target_temp_high: 24
  hvac_mode: heat_cool
```

`temperature` y los campos de rango son mutuamente excluyentes. Los dos límites del rango deben proporcionarse juntos.

<a id="velairset_hvac_mode"></a>

### `velair.set_hvac_mode`

Establece un modo HVAC anunciado distinto de apagado sin enviar una temperatura objetivo. Velair solo acepta climatizadores gestionados cuya ejecución es local, valida el modo con la entidad y registra la orden como una acción propia de Velair para no confundirla con un ajuste externo.

```yaml
action: velair.set_hvac_mode
data:
  entity_id: climate.living_room
  hvac_mode: auto
```

Utiliza este servicio cuando una automatización de Velair deba cambiar únicamente el modo HVAC. Velair no incluye un objetivo escalar ni un rango en la llamada; la integración climática o el dispositivo aún pueden ajustar internamente su propio estado al cambiar de modo. Una entrega correcta desactiva Room Assist activo porque Velair ya no controla una temperatura objetivo para esa orden. Una entrega fallida deja Room Assist sin cambios y no emite ningún evento de objetivo aplicado correctamente.

Utiliza el servicio nativo `climate.set_hvac_mode` de Home Assistant para el control genérico fuera de Velair. El modo `off` se rechaza deliberadamente; utiliza la pausa, horario o acción climática adecuada de Velair para esa intención separada.

<a id="velairapply_schedule"></a>

### `velair.apply_schedule`

Aplica inmediatamente el bloque de horario activo. Si se omite `entity_id`, Velair aplica el bloque activo a todos los climatizadores gestionados.

```yaml
action: velair.apply_schedule
data:
  entity_id: climate.living_room
```

<a id="velairboost"></a>

### `velair.boost`

Anula temporalmente una entidad de climatización. Cuando vence el Refuerzo, Velair aplica el objetivo explícito del horario activo si existe, o restaura el estado del equipo de climatización capturado antes del Refuerzo cuando no hay un objetivo explícito que aplicar.

```yaml
action: velair.boost
data:
  entity_id: climate.living_room
  temperature: 22
  duration_minutes: 45
  hvac_mode: heat
  fan_mode: high
```

Velair captura el estado del equipo de climatización restaurable antes de aplicar el Refuerzo. El Refuerzo se rechaza cuando el climatizador no está disponible y ese estado no puede capturarse con seguridad.

Un Refuerzo de rango utiliza `target_temp_low` y `target_temp_high` en lugar de `temperature`, siguiendo las mismas reglas que `velair.set_temperature`.

<a id="velaircancel_boost"></a>

### `velair.cancel_boost`

Cancela anticipadamente un Refuerzo activo. Siempre utiliza el mismo comportamiento de retorno que el vencimiento normal: Velair aplica el objetivo explícito del horario activo si existe; en caso contrario, incluido un bloque `Keep`, restaura el modo HVAC y el objetivo capturados antes del Refuerzo. Llamarlo cuando no hay un Refuerzo activo no tiene efecto.

```yaml
action: velair.cancel_boost
data:
  entity_id: climate.living_room
```

<a id="velairenable_room_sensor_assist"></a>

### `velair.enable_room_sensor_assist`

Habilita Room Sensor Assist para un climatizador gestionado. El climatizador debe tener ya un sensor de temperatura de habitación configurado en la pestaña Room Assist.

```yaml
action: velair.enable_room_sensor_assist
data:
  entity_id: climate.living_room
```

<a id="velairdisable_room_sensor_assist"></a>

### `velair.disable_room_sensor_assist`

Desactiva Room Sensor Assist para un climatizador gestionado. Si Velair estaba aplicando un objetivo asistido, restaura el objetivo programado actual.

```yaml
action: velair.disable_room_sensor_assist
data:
  entity_id: climate.living_room
```

<a id="velairpause"></a>

### `velair.pause`

Pausa la ejecución automática de horarios. Omite `duration_minutes` para detener indefinidamente la ejecución automática.

```yaml
action: velair.pause
data:
  duration_minutes: 60
```

<a id="velairresume"></a>

### `velair.resume`

Reanuda la ejecución automática de horarios y aplica el horario actual.

```yaml
action: velair.resume
```

<a id="velairpause_zone"></a>

### `velair.pause_zone`

Pausa la ejecución automática de horarios para una entidad de climatización gestionada mientras el resto de Velair sigue funcionando. Omite tanto `duration_minutes` como `until_next_block` para pausar esa zona indefinidamente.

Usa `until_next_block: true` para terminar esta pausa al inicio del siguiente bloque del horario efectivo de la zona. Se usa la hora nominal del bloque, no el inicio anticipado de preacondicionamiento. El vencimiento se fija al llamar al servicio y sobrevive a reinicios; los cambios posteriores del horario no lo desplazan. No se puede combinar con `duration_minutes`, y la llamada falla sin cambiar la zona si no existe ningún bloque futuro. Los demás motivos de pausa mantienen la zona pausada hasta que también finalicen.

```yaml
action: velair.pause_zone
data:
  entity_id: climate.guest_room
  pause_id: external_control
  action: none
  until_next_block: true
```

El campo opcional `action` puede ser:

- `none`: dejar el climatizador exactamente como está y solo impedir que Velair lo cambie automáticamente;
- `turn_off`: apagar el climatizador inmediatamente y mantenerlo pausado.

Las automatizaciones también pueden enviar un `pause_id` opcional con entre 1 y 128 letras, números, puntos, guiones bajos, dos puntos o guiones, comenzando por una letra o un número. Una pausa identificada añade un motivo sin sustituir los motivos con otros ID. Reutilizar el ID actualiza únicamente ese motivo; repetir exactamente la misma llamada no tiene efecto. Las llamadas sin `pause_id` conservan la autoridad manual y sustituyen todos los motivos por una pausa manual.

```yaml
action: velair.pause_zone
data:
  entity_id: climate.guest_room
  duration_minutes: 120
  action: turn_off
  pause_id: window_guard
```

<a id="velairresume_zone"></a>

### `velair.resume_zone`

Reanuda la ejecución automática de horarios para una entidad de climatización gestionada. Por defecto, Velair aplica el bloque de horario actualmente activo para ese climatizador cuando existe. Si no se aplica ningún bloque en ese momento, deja el climatizador sin cambios.

Cuando se proporciona `pause_id`, Velair elimina únicamente ese motivo. Los demás motivos mantienen pausada la zona y el horario solo se aplica cuando termina el último. Utiliza `resume_all: true` para eliminar explícitamente todos los motivos. Omitir ambos campos conserva el comportamiento antiguo de reanudar todo. Los campos no pueden combinarse, y se rechaza `resume_all: false` sin un ID.

Los motivos vencen de forma independiente. Si alguno de los motivos restantes utiliza `turn_off`, la acción efectiva de pausa sigue siendo apagar. Los Refuerzo se rechazan mientras una zona está pausada.

```yaml
action: velair.resume_zone
data:
  entity_id: climate.guest_room
  apply_current_schedule: true
  pause_id: window_guard
```

<a id="velairset_daily_schedule"></a>

### `velair.set_daily_schedule`

Sustituye el horario de un día de la semana para un climatizador gestionado.

```yaml
action: velair.set_daily_schedule
data:
  entity_id: climate.living_room
  weekday: monday
  blocks:
    - start: "06:30"
      action: set_temperature
      temperature: 21
      hvac_mode: heat
      fan_mode: quiet
    - start: "09:00"
      action: turn_off
    - start: "18:00"
      action: set_temperature
      temperature: 20
      hvac_mode: heat
```

Los bloques pueden incluir valores opcionales de `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode` y `humidity`. Los valores no compatibles con el climatizador de destino se eliminan antes de guardar o aplicar el horario.

Utiliza `action: set_climate_options` con uno o varios de estos campos y sin temperatura ni `hvac_mode` para llamar únicamente a sus servicios de Home Assistant. Por ejemplo:

```yaml
action: velair.set_daily_schedule
data:
  entity_id: climate.living_room
  weekday: monday
  blocks:
    - start: "06:30"
      action: set_climate_options
      preset_mode: comfort
    - start: "22:00"
      action: set_climate_options
      preset_mode: eco
      fan_mode: quiet
```

<a id="velaircopy_day_schedule"></a>

### `velair.copy_day_schedule`

Copia un día Predeterminado guardado, incluidos su vínculo de plantilla y referencias a presets, a los días seleccionados. Omite `target_entity_ids` para copiar dentro del climatizador de origen, o proporciona esa lista para copiar a otros climatizadores gestionados. Cada combinación seleccionada de climatizador/día se valida y guarda en una única transacción.

```yaml
action: velair.copy_day_schedule
data:
  entity_id: climate.living_room
  source_weekday: monday
  target_weekdays:
    - tuesday
    - wednesday
    - thursday
```

Para copiar la misma configuración del lunes a otros termostatos:

```yaml
action: velair.copy_day_schedule
data:
  entity_id: climate.living_room
  source_weekday: monday
  target_weekdays:
    - monday
  target_entity_ids:
    - climate.study
    - climate.bedroom
```

El servicio copia el último origen guardado bajo el bloqueo de configuración. El campo opcional `expected_revision` rechaza la operación si la configuración ha cambiado; el panel proporciona automáticamente su revisión actual. Los Perfiles se editan y guardan mediante su propio flujo de Perfil completo. Copiar un día independiente guardado elimina los vínculos de plantilla de los días de destino seleccionados; los demás días se conservan.

<a id="velairclear_schedule"></a>

### `velair.clear_schedule`

Vacía el horario de un día de la semana. Omite `weekday` para vaciar todos los días de ese climatizador gestionado.

```yaml
action: velair.clear_schedule
data:
  entity_id: climate.living_room
  weekday: sunday
```

<a id="automation-events"></a>

## Eventos de automatización

Velair también emite eventos de Home Assistant que pueden utilizarse como disparadores de automatización. Estos eventos son transitorios; no se almacenan como configuración ni sustituyen a las entidades diagnósticas.

Todos los eventos de ejecución utilizan el mismo tipo de evento de Home Assistant:

```text
velair_event
```

El campo `event` de la carga identifica los cambios del conjunto de Perfiles, los cambios de modo del planificador, los objetivos aplicados, los planes y observaciones de Anticipación adaptativa, los cambios de Confort ambiental, los cambios de estado y objetivo de Room Assist, los Refuerzos y las pausas de zona.

Consulta [Eventos de automatización](automation-events.es.md) para las reglas exactas de emisión, el comportamiento de deduplicación, los campos disponibles y un ejemplo completo de carga para cada tipo de evento.
