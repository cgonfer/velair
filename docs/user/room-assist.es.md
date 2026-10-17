<a id="room-assist"></a>

# Room Assist
<!-- velair-docs:start -->
Traducciones: [Original en inglés](room-assist.md) · [Español](room-assist.es.md) · [Français](room-assist.fr.md) · [Deutsch](room-assist.de.md) · [Italiano](room-assist.it.md) · [Nederlands](room-assist.nl.md) · [Polski](room-assist.pl.md) · [Português (Brasil)](room-assist.pt-br.md) · [Português (Portugal)](room-assist.pt-pt.md) · [Русский](room-assist.ru.md) · [Estado de las traducciones](../translation-status.md)

<details>
<summary>Estado de esta traducción</summary>

| Dato | Estado |
| --- | --- |
| Versión de referencia | 1.9.0-beta.2 |
| Última sincronización | 2026-10-17 |
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

Para un objetivo único en `heat` o `cool` fijos, una banda muerta distinta de cero crea dos límites de conmutación. Room Assist recuerda hacia qué límite avanza y solo cambia de dirección cuando el sensor externo alcanza el límite opuesto. Así crea un ciclo real de histéresis basado en el sensor externo, en lugar de permitir que el sensor interno del equipo inicie otro ciclo cerca del objetivo central. El Ajuste máximo de control limita la corrección con signo calculada desde el límite activo.

Los objetivos únicos `auto` y `heat_cool` y los intervalos nativos `heat_cool` conservan su comportamiento neutro o de margen del intervalo. Velair no obliga a esos modos a alternar entre calefacción y refrigeración activas mediante un ciclo de histéresis de temperatura única.

La entidad de climatización sigue siendo el actuador. Velair no crea una entidad virtual ni evita el firmware del dispositivo. Si tu termostato o válvula permite vincular directamente un sensor externo, esa opción nativa suele seguir siendo la mejor primera elección.

<a id="setup"></a>

## Configuración

1. Abre la pestaña Room Assist.
2. Expande el equipo que quieras configurar.
3. Selecciona un sensor de temperatura de habitación.
4. Activa Control por sensor de estancia.
5. Ajusta Banda de control de Room Assist para definir los límites inferior y superior de conmutación de calefacción o refrigeración fijas, o el margen neutro para modos automáticos e intervalos nativos.
6. Modifica Ajuste máximo de control si el valor predeterminado es insuficiente para esa habitación o menor que la diferencia de consigna que el termostato puede necesitar para dejar de calentar o enfriar.
7. Ajusta Retraso de actualización si las actualizaciones de sensores parecen demasiado lentas o frecuentes.

Seleccionar un sensor de habitación por sí solo únicamente guarda el sensor. Velair empieza a utilizarlo como temperatura efectiva de la habitación cuando se activa Room Sensor Assist.

Room Sensor Assist no requiere Preacondicionamiento adaptativo. Puede funcionar con bloques programados normales y con bloques que el Preacondicionamiento adaptativo haya iniciado antes.

Un bloque de temperatura con **Mantener modo actual** sigue aplicando su objetivo programado. Room Assist utiliza el modo en el que funciona realmente el equipo; si está apagado, Velair lo inicia en un modo compatible. **Mantener modo actual** no significa «mantener la consigna del termostato sin cambios» en un bloque de temperatura. Un bloque de solo opciones no tiene objetivo, por lo que Room Assist no actúa en él.

Retraso de actualización es la espera que agrupa los cambios de temperatura del sensor de habitación o del equipo antes de recalcular. El valor predeterminado es `20` segundos. Configúralo en `0` para recalcular inmediatamente, o hasta `300` segundos para agrupar actualizaciones frecuentes.

La banda muerta de Room Assist es independiente de la diferencia mínima del Preacondicionamiento adaptativo. Su valor predeterminado es `0.3 °C` o `1 °F`, acepta `0` para desactivarla y puede configurarse en pasos de `0.1` grados hasta `5 °C` o `9 °F`. Guardarla mientras Room Assist está activo actualiza inmediatamente el objetivo asistido.

La escala actual de temperatura representa la banda muerta configurada como una franja neutra rayada. Para un objetivo único fijo, sus dos bordes son los límites de conmutación de histéresis y el estado actual identifica hacia cuál avanza Room Assist. En los modos automáticos de temperatura única, la misma franja es un margen neutro. Para un intervalo nativo `heat_cool`, abarca desde el límite inferior menos la banda muerta hasta el superior más la banda muerta. La escala se amplía para mantener visibles ambos bordes. La leyenda traducida completa permanece centrada sobre el intervalo real de banda muerta, aunque este sea más estrecho que su texto, para que su significado no cambie con la anchura del gráfico. La explicación completa también está disponible para tecnologías de asistencia y al situar el puntero encima. Con banda muerta `0`, no se dibuja la franja y la leyenda estática indica explícitamente que no hay banda muerta. El gráfico y la leyenda se actualizan con el valor guardado del backend; ocultar `show_room_assist_deadband` en una tarjeta Lovelace de Room Assist oculta juntos el ajuste, la franja y la leyenda.

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
| **Manteniendo** | Room Assist mantiene neutro un objetivo único automático, mantiene un intervalo nativo o la protección programada conserva un objetivo del lado seguro. Un ciclo fijo `heat` o `cool` puede permanecer **Ajustando** mientras recorre la banda muerta. |
| **Bloqueado** | Una pausa, Refuerzo, estado Manual u otro estado del programador tiene prioridad sobre Room Assist. |
| **No disponible** | No puede utilizarse actualmente el equipo gestionado o la capacidad de objetivo necesaria. La interfaz muestra el motivo cuando se conoce. |

Cuando Room Assist está activo, Resumen condensa esta información en **Hacia el límite inferior**, **Hacia el límite superior**, **Activo**, **Manteniendo** o **Protección de consigna**, según corresponda, y muestra los valores programados y aplicados. El mínimo o máximo del termostato es distinto de la protección programada: la pestaña Room Assist muestra una advertencia con los valores solicitados, aplicados y compatibles, y Home Assistant recibe una notificación persistente hasta que deja de alcanzarse ese límite físico.

<a id="fixed-heating-hysteresis-example"></a>

## Ejemplo de histéresis de calefacción fija

Situación:

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

Cuando esta protección cambia el resultado, el estado actual de Room Assist explica ambos valores. Identifica el objetivo calculado y el conservado realmente por Velair, y Resumen muestra el estado compacto `Protección de consigna`. Es un comportamiento de protección normal, no un error del termostato, por lo que no crea una notificación persistente de Home Assistant. Los límites físicos del termostato siguen utilizando su advertencia y notificación independientes.

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

Situación:

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

Configurar `3 °C` no aplica inmediatamente una corrección de `3 °C`. Solo permite que Room Assist alcance ese valor cuando la diferencia de la habitación externa lo requiera.

<a id="why-climate-target-can-differ-from-the-calculation"></a>

### Por qué la Consigna del termostato puede diferir del cálculo

**Consigna del termostato** es el objetivo que comunica actualmente la entidad cuando Room Assist está listo o bloqueado. Mientras está ajustando o manteniendo un objetivo único aplicado, muestra en cambio la consigna temporal enviada por Velair. Ninguno de esos valores es el objetivo programado de habitación ni el límite activo de histéresis. Un equipo acepta objetivos según sus propios incrementos, por lo que Velair puede necesitar ajustar la consigna final al paso efectivo publicado, último comunicado, manual o predeterminado.

Por ejemplo, en refrigeración fija, Room Assist puede calcular `23.9 °C` para un equipo que acepta pasos de `0.5 °C`. Velair aplica `24.0 °C`: la refrigeración se ajusta hacia arriba para no enfriar más de lo calculado. La calefacción fija se ajusta hacia abajo y los modos automáticos de temperatura única utilizan el paso más cercano. El botón de información junto a **Consigna del termostato** adapta su explicación al valor mostrado y, cuando el ajuste al paso cambió realmente la consigna aplicada, muestra el cálculo, el paso efectivo y el valor aplicado. Los límites físicos mínimo o máximo y la protección programada se indican por separado y no se describen como ajuste al paso.

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

Si un objetivo único o intervalo calculado supera el mínimo o máximo compatible del termostato, Velair aplica el resultado válido más cercano. El estado actual muestra el objetivo solicitado, el aplicado y el límite alcanzado antes del gráfico. Home Assistant también crea una notificación persistente para el límite activo; las actualizaciones repetidas del sensor no crean duplicados y Velair la retira tras recuperarse.

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

<a id="automation-events"></a>

## Eventos de automatización

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

Los cuatro campos de histéresis son opcionales. Aparecen para un ciclo fijo de temperatura única `heat` o `cool` con banda muerta distinta de cero y no están presentes para la corrección anterior sin banda muerta, modos automáticos de temperatura única ni intervalos nativos.

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

La escala actual de temperatura separa dos relaciones. Para un objetivo único, la línea superior compara el sensor de habitación con el objetivo programado y la línea inferior de control compara la lectura del equipo con su consigna. En `heat` o `cool` fijos, la banda rayada marca ambos límites de histéresis y el estado identifica el activo. En modos automáticos de temperatura única sigue siendo un margen neutro. Para un intervalo nativo, los corchetes rojos y azules identifican las bandas programada y aplicada completas, incluidos ambos límites. Un conector de `Desplazamiento del rango` con signo une sus centros para representar el movimiento de toda la banda, no solo de uno de sus bordes. Estos indicadores solo describen la consigna enviada por Velair; no afirman que el termostato, válvula o compresor esté calentando o enfriando activamente.

En columnas estrechas del panel, la escala de temperatura puede desplazarse horizontalmente para mantener legibles los marcadores.

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
