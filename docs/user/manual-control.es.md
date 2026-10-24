<a id="external-changes-and-manual-adjustment"></a>

# Cambios externos y ajuste manual
<!-- velair-docs:start -->
Traducciones: [Original en inglés](manual-control.md) · [Español](manual-control.es.md) · [Français](manual-control.fr.md) · [Deutsch](manual-control.de.md) · [Italiano](manual-control.it.md) · [Nederlands](manual-control.nl.md) · [Polski](manual-control.pl.md) · [Português (Brasil)](manual-control.pt-br.md) · [Português (Portugal)](manual-control.pt-pt.md) · [Русский](manual-control.ru.md) · [Estado de las traducciones](../translation-status.md)

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

Velair puede reconocer cuándo cambia el modo HVAC o la temperatura objetivo de una entidad `climate.*` gestionada sin coincidir con una orden de climatización enviada por Velair. Para cada equipo, eliges si Velair mantiene el control automático o respeta ese cambio externo mediante el ajuste manual.

Un ajuste externo puede proceder de:

- la tarjeta estándar de climatización de Home Assistant;
- un termostato físico o mando infrarrojo cuya integración comunica el nuevo estado;
- una aplicación del fabricante cuya integración actualiza Home Assistant;
- un script o automatización de Home Assistant que actúa directamente sobre la entidad de climatización;
- cualquier otro origen que cambie la entidad sin pasar por Velair.

Velair llama **Ajuste manual** al estado en el que cede el control. «Manual» describe quién controla actualmente un equipo; no afirma que una persona haya realizado el cambio.

<a id="the-two-independent-questions"></a>

## Dos cuestiones independientes

Velair mantiene separados estos conceptos:

| Concepto | Alcance | Significado |
| --- | --- | --- |
| Planificación automática | Un equipo gestionado | Velair puede aplicar el horario efectivo de este equipo. |
| Ajuste manual | Un equipo gestionado | Una consigna o modo HVAC externo determina temporalmente el control. |
| Modo **Manual** de Velair | Todo el conjunto activo de Perfiles | Los Perfiles se seleccionaron directamente, en lugar de mediante un Modo personalizado guardado. |
| Refuerzo | Un equipo | Velair aplica intencionadamente un objetivo temporal. |
| Pausa de zona | Un equipo | Uno o varios motivos independientes impiden aplicar el horario, con la opción de apagar el equipo. |
| Pausa o detención global | Todos los equipos | El programador está pausado o desactivado globalmente. |

Estos estados pueden coexistir. Por ejemplo, el Modo **Manual** de Velair puede seleccionar el Perfil `Sleep` mientras `climate.living_room` está en **Ajuste manual**. El Perfil sigue determinando la configuración del horario, pero ese equipo conserva su ajuste externo hasta que termina el ajuste manual.

<a id="what-velair-observes"></a>

## Qué observa Velair

Velair observa estos campos de control en equipos gestionados:

- `hvac_mode`, representado por el estado de la entidad de climatización, incluidos `off`, `heat`, `cool`, `auto` y `heat_cool`;
- `temperature` para una temperatura objetivo única;
- `target_temp_low` y `target_temp_high` para un objetivo de intervalo nativo.

Velair no entra en ajuste manual si solo cambian los valores siguientes:

- `current_temperature` o `hvac_action`;
- lecturas de humedad;
- disponibilidad;
- opciones de ventilador, preset, oscilación o humedad objetivo;
- atributos de capacidades, como temperatura mínima o modos compatibles.

Por ejemplo, pasar un termostato de `cool` a `24 °C` a `cool` a `23 °C` es un cambio de objetivo detectado. Que una habitación pase de `24 °C` a `25 °C` mientras el objetivo no cambia no lo es.

Solo se supervisan los equipos seleccionados al configurar la integración Velair. Se ignoran los estados iniciales al arrancar y las transiciones hacia o desde `unknown` o `unavailable`.

<a id="how-velair-recognizes-its-own-commands"></a>

## Cómo reconoce Velair sus propias órdenes

Todas las órdenes de climatización enviadas por Velair pasan por un adaptador interno de servicios de climatización. Antes de cada llamada al servicio de Home Assistant, Velair registra:

- la entidad gestionada;
- los campos de control y valores que espera observar;
- un `Context` de Home Assistant para la llamada al servicio;
- un plazo breve de caducidad que solo existe durante la ejecución.

Cuando cambia la entidad, Velair relaciona cada campo modificado con esas expectativas, teniendo en cuenta `target_temp_step` publicado por el equipo. Se hace por campo: si una actualización contiene una temperatura de Velair y un modo HVAC no relacionado, solo la temperatura se clasifica como propia de Velair.

Algunos dispositivos comunican varios valores mientras procesan una orden. Pueden volver brevemente a un objetivo anterior, publicar uno intermedio o comunicar el modo y la temperatura en otro orden. Velair mantiene un periodo breve y limitado de estabilización solo para los campos que cambió, para evitar que esas actualizaciones creen un ajuste manual incorrectamente. El periodo no se reinicia cuando llega una respuesta del dispositivo; se establece definitivamente cuando termina la secuencia completa de servicios de Home Assistant. Un cambio de Home Assistant claramente realizado por un usuario, u otro script o automatización identificable, sigue siendo externo, y los cambios posteriores a la estabilización se tratan normalmente.

Cuando una actualización anónima durante la estabilización no puede distinguirse de forma fiable del proceso del dispositivo para alcanzar el estado solicitado, Velair mantiene prudentemente el control Automático. Así evita convertir una orden rechazada o retrasada en un falso ajuste manual. El estado de estabilización solo existe durante la ejecución y se borra al reiniciar. Si el equipo sigue sin coincidir con el valor solicitado al terminar la estabilización, Velair mantiene el control Automático y registra una advertencia de estabilización de la orden. La siguiente instantánea actualizada de Diagnóstico muestra la advertencia; sus datos incluyen los valores esperados y observados. Velair no reintenta la orden a ciegas ni convierte la discrepancia en un ajuste manual diferido.

El registro de valores esperados tiene un tamaño limitado, caduca automáticamente, nunca se guarda y no realiza sondeo continuo. El origen no necesita conservar el `Context` de Home Assistant para que funcione la correlación, aunque conservarlo permite relacionar los cambios con mayor precisión.

Cualquier campo de control observado que no pueda relacionarse con una orden de Velair se clasifica como externo. Esto atribuye el cambio, pero no identifica su origen: Velair no afirma saber si lo causó una persona, mando, automatización, servicio del fabricante o firmware del dispositivo.

<a id="choose-a-policy"></a>

## Elegir una política

Abre **Ajustes**, busca el equipo gestionado y utiliza **Ajustes externos**. El backend guarda la política para ese equipo y la incluye en los datos exportables de la zona. Se aplica a partir del próximo cambio externo; cambiarla no modifica ni termina un ajuste manual ya activo.

<a id="keep-automatic"></a>

### Mantener automático

Valor interno: `keep_automatic`.

Es la opción predeterminada, incluidas las configuraciones creadas antes de que existieran los ajustes externos. Velair informa del cambio externo, mantiene el equipo en Planificación automática y vuelve a calcular inmediatamente su intención de control actual. Cuando una intención controla el equipo, Velair la aplica de nuevo mediante la vía habitual de entrega serializada. Puede ser un horario Predeterminado o de Perfil, un Refuerzo, un objetivo activo de preacondicionamiento, un objetivo de Room Assist, `off` o una temperatura objetivo única o intervalo nativo.

Se respetan las pausas existentes y las condiciones del programador. Una pausa con acción `none`, una pausa global, una zona desactivada, un programador detenido o la ausencia de objetivo actual no envía nada. Una pausa de zona o Perfil con acción `turn_off` vuelve a aplicar `off`.

<a id="manual-until-the-next-schedule-block"></a>

### Manual hasta el próximo bloque del horario

Valor interno: `until_next_block`.

Velair conserva el estado externo hasta que comienza el siguiente bloque efectivo del horario de ese equipo; después vuelve a Planificación automática y aplica la intención de control vigente en ese momento.

El límite se calcula al comenzar el ajuste manual. Otro ajuste externo durante la misma sesión actualiza el estado conservado del equipo, pero no desplaza ese límite. Si no hay un bloque efectivo futuro, no hay vencimiento automático; utiliza **Planificación automática** para reanudar cuando quieras.

El límite del próximo bloque utiliza la hora programada del bloque, incluido `Off`, en lugar de un inicio previsto de preacondicionamiento. Por ejemplo, un ajuste a las `18:05` con `Off` a las `19:00` y calefacción a las `20:00` termina a las `19:00`, aunque la predicción de calefacción comenzase antes.

<a id="manual-for-a-duration"></a>

### Manual durante un tiempo

Valor interno: `for_duration`.

Velair conserva el estado externo durante los minutos configurados. La duración inicial es 120 minutos y el intervalo permitido es de 1 a 10 080 minutos (siete días). Se conservan los valores guardados existentes, incluidos 60 minutos. Cada nuevo cambio de control externo detectado reinicia la duración desde ese cambio utilizando la duración guardada de la sesión activa, aunque Ajustes haya cambiado entretanto. El evento de cambio externo asociado indica la política efectiva de esa sesión, no el valor predeterminado más reciente de Ajustes.

<a id="manual-until-resumed"></a>

### Manual hasta reanudar

Valor interno: `until_resumed`.

Velair conserva el estado externo indefinidamente. El usuario o una automatización debe reanudar explícitamente la Planificación automática.

<a id="what-happens-when-manual-adjustment-starts"></a>

## Qué ocurre al comenzar un ajuste manual

Para cada ajuste externo que cumpla las condiciones y utilice una de las tres políticas manuales, Velair realiza una transición serializada:

1. Captura el modo HVAC completo y la temperatura objetivo única o intervalo nativo del evento de cambio de estado.
2. Guarda un motivo reservado de ajuste manual para la zona.
3. Termina cualquier Refuerzo activo sin restaurar el Refuerzo ni el horario anterior.
4. Hace que Room Assist ceda el control sin restaurar su corrección programada anterior.
5. Conserva el estado externo capturado o lo aplica de nuevo si es necesario.
6. Resumen selecciona **Ajuste manual** y mantiene disponible **Planificación automática**.

La política solo inicia un ajuste manual mientras la Planificación automática global está funcionando, la zona está activada, el Perfil activo no la está pausando y no hay una pausa de zona independiente del Refuerzo ya activa. El evento informativo `external_climate_change_detected` se emite igualmente cuando estas condiciones impiden la entrada. Un Refuerzo activo es la excepción: el cambio externo lo sustituye como se describe a continuación.

La tabla siguiente indica el resultado exacto cuando se observa un cambio de control externo bajo una política que, en otras circunstancias, iniciaría un ajuste manual:

| Estado anterior al cambio externo | Evento | Entrada en ajuste manual | Acción inmediata sobre el equipo |
| --- | --- | --- | --- |
| Sin pausa ni Refuerzo | Emitido | Sí | Conserva el modo y objetivo externos completos. |
| Pausa independiente de zona, acción `none` | Emitido | No | No envía nada; la pausa existente sigue cediendo el control. |
| Pausa independiente de zona, acción `turn_off` | Emitido | No | Vuelve a aplicar `off`; encender externamente no evita la pausa. |
| Pausa de Perfil activa, incluido `turn_off` del Perfil | Emitido | No | No envía nada por esta vía de detección; no repite la acción del Perfil únicamente por observar el cambio. |

Un programador pausado globalmente o una zona desactivada siguen el mismo patrón informativo: emiten el evento de cambio externo, no crean un ajuste manual ni envían un nuevo objetivo del horario por esta vía de detección.

Durante un ajuste manual, Velair sigue calculando el horario efectivo Predeterminado, de Perfil o de Modo, pero no lo aplica a ese equipo. Los demás equipos gestionados continúan normalmente.

Velair no hace automáticamente lo siguiente:

- crear un Refuerzo;
- cambiar de Perfil o Modo de Velair;
- deducir quién realizó el ajuste;
- copiar el ajuste en un horario;
- cambiar la política de otro equipo;
- eliminar pausas independientes de zona;
- esperar a que la habitación alcance la temperatura solicitada.

<a id="what-happens-when-automatic-scheduling-resumes"></a>

## Qué ocurre al reanudar la Planificación automática

El ajuste manual puede terminar al vencer su duración, llegar el límite del próximo bloque, pulsar el botón de Resumen o llamar a `velair.resume_automatic_control`.

Velair solo elimina su motivo reservado de ajuste manual. Después calcula la intención de control vigente:

- el horario de un Perfil cuando un Perfil activo controla la zona;
- el horario Predeterminado cuando no la controla ningún Perfil activo o el Perfil delega la zona a Predeterminado;
- una pausa de Perfil, incluida su acción `turn_off`;
- cualquier otra pausa independiente o estado global del programador.

Velair no restaura el bloque que estaba activo al comenzar el ajuste manual. Esta diferencia importa si cambió un Perfil, Modo, horario, pausa u hora mientras el equipo tenía cedido el control.

Si sigue existiendo una pausa independiente de zona, la zona permanece pausada. Si su acción efectiva es `turn_off`, el apagado sigue determinando el control. Reanudar desde el ajuste manual no equivale, por tanto, a eliminar todos los motivos de pausa de zona.

<a id="resume-from-off-when-the-block-says-keep-current-mode"></a>

### Reanudar desde `off` cuando el bloque indica Mantener modo actual

**Solo temperatura** es una opción de bloque independiente. Durante ese bloque, un cambio externo del modo HVAC queda bajo control externo y no genera por sí solo un Ajuste manual. Los cambios externos de temperatura objetivo siguen la política configurada. Una pausa o un Ajuste manual siguen deteniendo el envío del horario; al reanudar se aplica el bloque actual sin encender un equipo apagado. Esto también se aplica cuando una automatización de ventanas reanuda la zona. Un Boost explícito o un bloque posterior con un modo HVAC explícito sí pueden encenderlo.

**Mantener modo actual** significa que el bloque no proporciona un modo HVAC. Para un bloque con temperatura objetivo, Velair sigue la regla habitual de entrega al reanudar:

- si el equipo está encendido, conserva su modo y aplica el objetivo si ese modo lo acepta; de lo contrario, la entrega falla sin cambiar de modo;
- si el equipo está en `off`, elige el primer modo compatible declarado por el equipo que no sea `off` y aplica el objetivo del bloque.

Para un equipo solo de calefacción que declare `[off, heat]`, un bloque activo que mantiene el modo a `21 °C` reanuda como `heat`, `21 °C`. Para uno solo de refrigeración que declare `[off, cool]`, reanuda como `cool`, `21 °C`. Un equipo reversible puede declarar varios modos compatibles; Velair utiliza su orden declarado y no deduce calefacción o refrigeración por la estación, ubicación geográfica ni valor del objetivo. Define un modo HVAC explícito en el bloque si esa elección debe ser determinista.

Para una entidad que solo acepta intervalos, los modos de funcionamiento compatibles son los modos `heat`, `cool`, `auto` y `heat_cool` que declare. Mantener desde Apagado usa el primero en el orden declarado. Las entidades compatibles con ambos formatos usan su [política guardada de formato por modo](usage.es.md#target-format-by-climate-and-mode) para determinar los modos compatibles, conservando la preferencia por `heat_cool` al reanudar un intervalo compatible desde Apagado. Solo temperatura puede escribir ambos límites mientras el equipo está apagado si se declaran compatibilidad con intervalos y un modo compatible; nunca lo activa para poder escribirlos.

Para un bloque de solo opciones, reanudar aplica únicamente los controles seleccionados. No envía una temperatura ni enciende un equipo apagado.

<a id="complete-real-world-examples"></a>

## Ejemplos completos de situaciones reales

<a id="keep-automatic-reject-a-climate-card-setpoint-change"></a>

### Mantener automático: rechazar un cambio de consigna de una tarjeta de climatización

Configuración:

```text
Living-room policy: Keep automatic
Current authoritative block: heat at 21 °C
```

| Hora | Acción | Resultado |
| --- | --- | --- |
| 18:00 | Velair aplica `heat`, `21 °C`. | Planificación automática |
| 18:20 | Un usuario selecciona `23 °C` en la tarjeta de climatización de Home Assistant. | Velair emite `external_climate_change_detected` con `policy: keep_automatic`. |
| 18:20 | Velair calcula el bloque que sigue vigente. | Vuelve a aplicar `heat`, `21 °C`; no crea un ajuste manual ni un evento `zone_control_changed`. |

La misma regla se aplica a refrigeración, `off`, intervalos nativos `heat_cool`, Refuerzo, preacondicionamiento y Room Assist: Velair aplica de nuevo la intención que determina el control en el momento de la detección.

Los ejemplos utilizan Celsius, pero el comportamiento es idéntico en Fahrenheit.

<a id="home-assistant-card-keep-the-change-until-bedtime"></a>

### Tarjeta de Home Assistant: conservar el cambio hasta acostarse

Configuración:

```text
Living room policy: Manual until the next schedule block
18:00 schedule block: cool at 24 °C
22:00 schedule block: cool at 25 °C
```

Línea temporal:

| Hora | Acción | Resultado en el equipo | Control de Velair |
| --- | --- | --- | --- |
| 18:00 | Velair aplica el bloque. | `cool`, `24 °C` | Planificación automática |
| 19:15 | Un usuario selecciona `22 °C` en la tarjeta de climatización de HA. | `cool`, `22 °C` | Ajuste manual hasta las 22:00 |
| 20:00 | Room Assist recibe una nueva lectura de la habitación. | Sigue en `22 °C`; no se envía una corrección asistida. | Ajuste manual |
| 22:00 | Comienza el siguiente bloque efectivo. | Velair aplica `cool`, `25 °C`. | Planificación automática |

Se respeta `22 °C` como instrucción temporal. No se escribe en ninguno de los bloques del horario.

<a id="ir-remote-turn-on-an-ac-that-the-schedule-had-turned-off"></a>

### Mando infrarrojo: encender un aire acondicionado que el horario había apagado

Configuración:

```text
Bedroom policy: Manual until resumed
Current authoritative block: Off
```

Línea temporal:

| Hora | Acción | Resultado en el equipo | Control de Velair |
| --- | --- | --- | --- |
| 13:00 | El bloque de Velair mantiene apagado el equipo. | `off` | Planificación automática |
| 14:10 | Una persona utiliza el mando infrarrojo: `cool`, `23 °C`. | La integración del dispositivo comunica `cool`, `23 °C`. | Ajuste manual |
| 16:00 | El plan programado sigue en Apagado. | El equipo permanece en `cool`, `23 °C`. | Ajuste manual |
| 17:30 | El usuario pulsa **Planificación automática**. | Velair calcula el bloque de apagado aún vigente y apaga el equipo. | Planificación automática |

Esto solo funciona si la integración de climatización comunica el cambio del mando a Home Assistant. No puede detectarse una orden infrarroja invisible para Home Assistant.

<a id="a-60-minute-comfort-adjustment-changed-again"></a>

### Un ajuste de confort de 60 minutos, modificado de nuevo

Configuración: `for_duration`, 60 minutos.

| Hora | Acción | Resultado |
| --- | --- | --- |
| 09:00 | El horario aplica `heat`, `20 °C`. | Planificación automática |
| 09:20 | El usuario selecciona `22 °C`. | El ajuste manual vence a las 10:20. |
| 09:50 | El usuario selecciona `21 °C`. | El equipo permanece en `21 °C`; el vencimiento pasa a las 10:50. |
| 10:50 | No hubo más cambios externos. | Velair aplica la intención de control vigente a las 10:50. |

<a id="repeated-change-with-next-block-policy"></a>

### Cambio repetido con la política del próximo bloque

Configuración: `until_next_block`; próximo bloque a las 22:00.

| Hora | Acción | Resultado |
| --- | --- | --- |
| 19:15 | El usuario cambia `24 °C` por `22 °C`. | El ajuste manual termina a las 22:00. |
| 20:30 | El usuario cambia `22 °C` por `23 °C`. | El valor conservado pasa a `23 °C`; el vencimiento sigue a las 22:00. |
| 22:00 | Comienza el próximo bloque. | Velair vuelve a Automático y aplica ese bloque. |

<a id="activate-a-profile-while-one-climate-is-manual"></a>

### Activar un Perfil mientras un equipo está en Manual

Configuración:

```text
Default living-room intent: cool at 24 °C
Sleep Profile living-room intent: cool at 25 °C
Manual policy: until resumed
```

| Hora | Acción | Salón | Otras zonas del Perfil |
| --- | --- | --- | --- |
| 20:00 | El usuario cambia el salón a `22 °C`. | Ajuste manual a `22 °C` | Continúan normalmente |
| 21:00 | El usuario activa `Sleep`. | Permanece en `22 °C`; `Sleep` pasa a determinar la configuración. | `Sleep` se aplica inmediatamente donde no haya otra anulación. |
| 21:30 | El usuario reanuda el salón. | Velair aplica `Sleep`: `cool`, `25 °C`. | Sin cambios |

Seleccionar un Modo personalizado de Velair funciona igual: puede cambiar el conjunto activo de Perfiles, pero no cancela el ajuste manual de una zona. Si los Perfiles se seleccionan directamente, el Modo de Velair puede mostrar **Manual** al mismo tiempo que la zona muestra **Ajuste manual**; las etiquetas describen cosas distintas.

<a id="activate-several-profiles-or-modes-while-manual"></a>

### Activar varios Perfiles o Modos durante el control manual

Supón que el estado externo es `heat`, `22 °C`. Mientras permanece en Manual, el usuario selecciona En casa (`21 °C`), Ausente (`17 °C`) y después Dormir (`18 °C`). Velair conserva `22 °C` durante todo ese tiempo. Al reanudar solo aplica la intención actual de Dormir de `18 °C`; no repite En casa ni Ausente ni restaura el antiguo objetivo Predeterminado.

<a id="profile-pause-and-turn_off"></a>

### Pausa de Perfil y `turn_off`

Si se activa un Perfil que pausa la zona mientras ya hay un ajuste manual activo, el estado externo se mantiene hasta que termina ese ajuste. Al reanudar:

- una Pausa de Perfil sin apagado no envía un objetivo nuevo; la zona vuelve al control Automático, pero sigue sujeta a la pausa del Perfil;
- una Pausa de Perfil con `turn_off` apaga el equipo.

Si la pausa de Perfil ya estaba activa antes del cambio externo, Velair sigue emitiendo `external_climate_change_detected`, pero no entra en ajuste manual. Esa vía de detección no repite inmediatamente la pausa del Perfil ni su llamada `turn_off`; solo informa de la observación. Un cambio posterior de Perfil, una aplicación explícita del horario u otra transición del programador vuelve a calcular el comportamiento del Perfil.

<a id="external-adjustment-during-a-boost"></a>

### Ajuste externo durante un Refuerzo

| Hora | Acción | Resultado |
| --- | --- | --- |
| 12:00 | Velair inicia un Refuerzo en `cool`, `20 °C` hasta las 13:00. | Refuerzo |
| 12:20 | El usuario cambia el equipo a `cool`, `23 °C`. | El Refuerzo termina sin restauración; el ajuste manual conserva `23 °C`. |
| 12:45 | El usuario reanuda la Planificación automática. | Velair calcula y aplica el horario vigente a las 12:45. |

El antiguo Refuerzo no se reanuda y su vencimiento original a las 13:00 deja de controlar el equipo.

<a id="room-assist-without-a-control-fight"></a>

### Room Assist sin conflicto de control

Supón que el objetivo de refrigeración programado es `24 °C`, Room Assist aplicó temporalmente `26 °C` y el usuario selecciona externamente `23 °C`.

Velair captura el estado del evento antes de que el trabajo en cola de Room Assist pueda sustituirlo, detiene Room Assist en la zona cuyo control ha cedido sin restaurar `24 °C` y conserva `23 °C`. Al reanudar la Planificación automática, Velair calcula el horario actual y Room Assist puede calcular un nuevo objetivo asistido con las lecturas actuales.

<a id="native-heat_cool-range"></a>

### Intervalo nativo `heat_cool`

```text
Scheduled range: 20–25 °C
External range: 19–24 °C
Policy: until resumed
```

Velair detecta `target_temp_low` y `target_temp_high`, captura el estado completo `heat_cool` y conserva `19–24 °C` durante el ajuste manual. Al reanudar aplica el intervalo completo del bloque que determina el control actual. Nunca reduce el intervalo a una temperatura objetivo única.

La misma captura y restauración del par completo se aplica a entidades que solo aceptan intervalos en Calor, Frío y Auto. Un atributo residual `temperature` no sustituye a sus dos límites. Si el par observado está incompleto o no es válido, Velair no inventa un objetivo restaurable a partir de ese atributo escalar.

<a id="independent-window-pause-while-manual"></a>

### Pausa independiente de ventanas durante el control manual

Supón que un equipo está en Manual a `23 °C` y una automatización de ventanas llama a `velair.pause_zone` con `pause_id: window` y `action: turn_off`. La acción de pausa combinada es apagar, por lo que el equipo se apaga. Llamar a `velair.resume_automatic_control` solo elimina el ajuste manual; el motivo `window` permanece y el equipo sigue apagado. La automatización de ventanas debe eliminar su propio motivo con `velair.resume_zone`.

<a id="changing-the-policy-with-a-service"></a>

## Cambiar la política mediante un servicio

Todos los ejemplos siguientes utilizan la sintaxis actual de acciones de Home Assistant.

Mantener Velair en Automático y volver a aplicar su intención de control actual:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: keep_automatic
```

Conservar el estado externo hasta el próximo bloque:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: until_next_block
```

Conservarlo durante 90 minutos:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: for_duration
  duration_minutes: 90
```

Conservarlo hasta reanudar explícitamente:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: until_resumed
```

`duration_minutes` se utiliza con `for_duration`; se conserva como duración de la zona al seleccionar otra política. Los servicios rechazan entidades de climatización no gestionadas, políticas desconocidas y duraciones fuera de 1–10 080.

Cambiar este ajuste mientras el equipo ya está en Manual solo afecta al próximo ajuste externo posterior a esa sesión. La sesión activa conserva su política, duración, origen y vencimiento. Utiliza Resumen o `velair.resume_automatic_control` para terminarla.

<a id="enter-manual-adjustment-explicitly"></a>

## Entrar explícitamente en ajuste manual

Resumen siempre muestra **Control de Velair** como **Planificación automática** o **Ajuste manual** para cada equipo gestionado. Ambas opciones permanecen visibles en un selector segmentado. Selecciona **Ajuste manual** para capturar el modo HVAC actual y la temperatura objetivo única o el intervalo completo. Normalmente utiliza la política manual y duración guardadas en **Ajustes > Ajustes externos**. Si está guardado **Mantener automático**, esta acción explícita utiliza **Hasta reanudar** sin cambiar la política guardada de cambios externos. Selecciona **Planificación automática** para reanudar la intención de control actual de Velair. Seleccionar la opción ya activa no tiene efecto.

Cuando hay un ajuste manual activo, Resumen muestra su política exacta de finalización y vencimiento debajo del selector y representa el objetivo físico conservado, único o de intervalo, en lugar del objetivo del horario que no se está aplicando. Cuando Manual no puede comenzar, su segmento permanece visible con una explicación accesible: equipo no disponible o desactivado, Planificación automática detenida, pausa de Perfil activa u otra pausa de zona que controla el equipo. También se desactiva mientras hay una migración de temperaturas pendiente, porque Velair no permite modificar la configuración ni las sesiones de control manual hasta que termine. Un Refuerzo no bloquea la acción porque el ajuste lo sustituye.

La acción equivalente también utiliza la política guardada y solo acepta `entity_id`:

```yaml
action: velair.enter_manual_adjustment
data:
  entity_id: climate.living_room
```

Para crear un ajuste de 90 minutos, guarda primero `for_duration` y `duration_minutes: 90` mediante `velair.set_external_change_policy` y llama después a esta acción. La acción explícita rechaza equipos no gestionados, desactivados, `unknown` o `unavailable`, y equipos bloqueados por una detención global, Pausa de Perfil activa o pausa independiente de zona. Se sustituye un Refuerzo activo. La calefacción, refrigeración, `off`, objetivos únicos e intervalos nativos `heat_cool` se capturan mediante la misma vía serializada de entrega.

<a id="resume-with-a-service"></a>

## Reanudar mediante un servicio

```yaml
action: velair.resume_automatic_control
data:
  entity_id: climate.living_room
```

Esta acción es idempotente: llamarla para un equipo gestionado ya automático no hace nada. Rechaza entidades de climatización no gestionadas.

No utilices el identificador interno reservado de pausa `velair.manual_adjustment` con `velair.pause_zone` o `velair.resume_zone`. Velair lo rechaza para que un único mecanismo gestione el ajuste manual. Una llamada genérica a `velair.resume_zone` no elimina el ajuste manual.

<a id="automations-and-events"></a>

## Automatizaciones y eventos

Todos los eventos de ejecución de Velair utilizan `event_type: velair_event`.

<a id="observe-every-external-control-change"></a>

### Observar cada cambio externo de control

Este evento se emite cuando al menos un campo observado de modo u objetivo no puede atribuirse a Velair:

```yaml
event_type: velair_event
event_data:
  domain: velair
  event: external_climate_change_detected
  entity_id: climate.living_room
  changed_fields:
    - hvac_mode
    - temperature
  previous:
    hvac_mode: "off"
    temperature: 24
  current:
    hvac_mode: "cool"
    temperature: 23
  policy: keep_automatic
```

Para un intervalo nativo, `changed_fields`, `previous` y `current` utilizan `target_temp_low` y `target_temp_high` en lugar de `temperature`, según corresponda. Solo aparecen campos externos; se omite un campo relacionado con una acción de Velair aunque llegase en la misma actualización de estado de Home Assistant.

Ejemplo de automatización de notificación:

```yaml
alias: Notify when the living-room climate changes outside Velair
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: external_climate_change_detected
      entity_id: climate.living_room
actions:
  - action: notify.notify
    data:
      message: >-
        Living-room climate changed outside Velair:
        {{ trigger.event.data.changed_fields | join(', ') }}.
```

<a id="observe-entry-into-or-exit-from-manual-adjustment"></a>

### Observar la entrada o salida del ajuste manual

Datos de entrada:

```yaml
event_type: velair_event
event_data:
  domain: velair
  event: zone_control_changed
  entity_id: climate.living_room
  control_mode: manual
  previous_control_mode: automatic
  policy: for_duration
  started_at: "2026-08-20T18:00:00+02:00"
  until: "2026-08-20T19:00:00+02:00"
```

Para `until_resumed`, `until` no está presente. Datos de salida:

```yaml
event_type: velair_event
event_data:
  domain: velair
  event: zone_control_changed
  entity_id: climate.living_room
  control_mode: automatic
  previous_control_mode: manual
  reason: resumed
```

Un vencimiento automático utiliza `reason: expired`. El evento significa que cambió el motivo de ajuste manual; otra pausa puede seguir impidiendo aplicar físicamente el horario.

Consulta [Eventos de automatización](automation-events.es.md) para ver el contrato completo del evento.

<a id="restart-and-availability-behavior"></a>

## Comportamiento tras reiniciar y ante cambios de disponibilidad

La política de cada zona y el motivo de ajuste manual activo se guardan. Después de reiniciar Home Assistant:

- un ajuste manual que no ha vencido o es indefinido permanece en Manual;
- activar **Aplicar la planificación activa al arrancar** no evita el ajuste manual activo;
- al llegar su vencimiento guardado, Velair lo elimina y calcula la intención de control actual;
- la exportación incluye la política, pero excluye el estado actual de ejecución del ajuste manual.

La instantánea capturada del modo/objetivo externo solo existe durante la ejecución y no se guarda ni se reproduce tras reiniciar. Normalmente, el dispositivo físico conserva y comunica su estado manual, mientras el motivo guardado de ajuste manual de Velair sigue impidiendo aplicar el horario. Si el dispositivo se restablece o comunica un objetivo distinto durante el reinicio, Velair no reconstruye la instantánea externa antigua; espera a que el ajuste manual venza o se reanude y calcula después la intención de control actual.

Velair ignora las transiciones hacia o desde `unknown` y `unavailable`. Si un mando cambia el equipo mientras la integración no puede comunicar su estado y la única actualización posterior es pasar de `unavailable` a disponible, Velair no clasifica esa recuperación como un nuevo ajuste externo. Una vez disponible, los cambios posteriores de modo u objetivo pueden detectarse normalmente.

<a id="attribution-limits"></a>

## Límites de atribución

La atribución utiliza la información disponible sin garantizar identificar todos los casos, porque las integraciones de climatización de Home Assistant y los dispositivos físicos comunican el estado de formas distintas.

- No puede detectarse una acción física o del fabricante que nunca llegue a Home Assistant.
- Algunos dispositivos publican modo y objetivo en varias actualizaciones; esto puede emitir más de un evento informativo. Las automatizaciones deben ser idempotentes.
- Una acción externa que comunique exactamente el valor de un campo esperado de Velair aún vigente puede clasificarse como propia de Velair.
- Un dispositivo que nunca confirme un objetivo aceptado de Velair puede mantener vigente esa expectativa hasta que venza su breve plazo.
- Se ignora la propia recuperación de disponibilidad, como se describe arriba.
- Los cambios de ventilador, preset, oscilación, humedad o solo lecturas ambientales quedan fuera del contrato inicial de esta función.

La interpretación prudente de `external_climate_change_detected` es, por tanto: «Velair observó un cambio de control que no pudo atribuir a una de sus propias órdenes», no «Velair demostró que esta persona concreta cambió el termostato».

<a id="troubleshooting-checklist"></a>

## Lista de comprobación para resolver problemas

Si no aparece un ajuste manual esperado:

1. Comprueba que Velair gestione el equipo.
2. Comprueba que la Planificación automática esté activa globalmente y la zona esté activada.
3. Comprueba que el Perfil activo no esté pausando ya la zona.
4. Comprueba que el origen externo cambie `hvac_mode`, `temperature` o un intervalo nativo en Home Assistant, no solo la pantalla del fabricante o una opción de ventilador/preset.
5. Comprueba que la entidad no estuviera en `unknown` o `unavailable` durante la transición.
6. Escucha `velair_event` y filtra `event: external_climate_change_detected`.
7. Revisa Diagnóstico de Velair y los registros de Home Assistant por si falló la conservación del estado o una llamada al servicio de climatización.

Si la zona se reanuda pero no aplica la temperatura esperada, revisa el Perfil/Modo actual, horario Predeterminado, motivos independientes de pausa, estado global del programador y si el bloque actual es Apagado o Mantener. Reanudar siempre utiliza la intención de control vigente, nunca una instantánea histórica del horario antiguo.
