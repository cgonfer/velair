<a id="pause-a-zone-while-windows-are-open"></a>

# Pausar una zona mientras las ventanas están abiertas
<!-- velair-docs:start -->
Traducciones: [Original en inglés](pause-zone-for-open-windows.md) · [Español](pause-zone-for-open-windows.es.md) · [Français](pause-zone-for-open-windows.fr.md) · [Deutsch](pause-zone-for-open-windows.de.md) · [Italiano](pause-zone-for-open-windows.it.md) · [Nederlands](pause-zone-for-open-windows.nl.md) · [Polski](pause-zone-for-open-windows.pl.md) · [Português (Brasil)](pause-zone-for-open-windows.pt-br.md) · [Português (Portugal)](pause-zone-for-open-windows.pt-pt.md) · [Русский](pause-zone-for-open-windows.ru.md) · [Estado de las traducciones](../../translation-status.md)

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

Pausa uno o varios equipos de climatización gestionados por Velair cuando cualquier ventana o puerta seleccionada permanezca abierta. Reanuda sus horarios solo cuando se confirme que todos los contactos están cerrados y cada pausa activa siga perteneciendo a esta automatización. Home Assistant avisa cuando un contacto no disponible impide reanudar con seguridad.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fwindow_pause.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Abrir Home Assistant e importar el blueprint Pausar una zona mientras las ventanas están abiertas" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/window_pause.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Ver el código YAML de Pausar una zona mientras las ventanas están abiertas"></a>
</p>

[Ver historial de cambios](../../../blueprints/changelogs/window_pause.md) · [Volver al índice de blueprints](../blueprints.es.md)

Las preguntas, notas de pruebas y sugerencias constructivas son bienvenidas en el [tema oficial del blueprint en el foro de la comunidad de Home Assistant](https://community.home-assistant.io/t/velair-blueprint-pause-a-zone-while-windows-are-open/1021389).

<a id="when-to-use-it"></a>

## Cuándo utilizarlo

Utiliza este blueprint si abrir una ventana o puerta debe impedir temporalmente que Velair modifique uno o varios equipos afectados por las mismas aberturas. Es útil para sistemas de calefacción y refrigeración, y puede mantener cada equipo en su estado actual o apagarlo durante la pausa.

<a id="requirements"></a>

## Requisitos

- Versión 1.0.0 del blueprint, Velair 1.6.0 o posterior y Home Assistant 2024.6.0 o posterior. Velair 1.6.0 proporciona los motivos de pausa simultáneos con propietario que utiliza este blueprint.
- Una o varias entidades de climatización ya gestionadas por Velair.
- Una o varias entidades `binary_sensor` con la clase de dispositivo `window`, `door` u `opening`.
- `on` debe significar abierto y `off`, cerrado en todos los contactos seleccionados.

<a id="configuration"></a>

## Configuración

- **Managed thermostats:** todos los equipos gestionados por Velair que se pausarán y reanudarán juntos.
- **Windows and doors:** todas las aberturas que afectan a esta zona.
- **Climate action while paused:** mantener el estado actual o apagar el equipo.
- **Pause ID:** un identificador estable del propietario de la pausa. Mantén el predeterminado para una sola automatización o utiliza un ID diferente para cada automatización independiente que actúe sobre el mismo termostato.
- **Open delay:** cuánto tiempo debe permanecer abierta al menos una abertura antes de pausar.
- **Close delay:** cuánto tiempo deben permanecer cerradas todas las aberturas antes de reanudar.
- **Availability warning delay:** cuánto tiempo debe permanecer un contacto en `unknown` o `unavailable` antes de mostrar una notificación de Home Assistant. El valor predeterminado es 5 minutos.

<a id="example"></a>

## Ejemplo

Para un equipo del salón con dos ventanas:

```text
Managed thermostats:
  - climate.living_room
  - climate.living_room_radiator
Windows and doors:
  - binary_sensor.living_room_left_window
  - binary_sensor.living_room_right_window
Climate action while paused: Turn off
Open delay: 2 minutes
Close delay: 30 seconds
Availability warning delay: 5 minutes
```

Si cualquiera de las ventanas permanece abierta durante dos minutos, el blueprint pausa y apaga ambos equipos del salón. Cuando se cierra la última ventana y ambos contactos permanecen cerrados durante 30 segundos, reanuda cada horario activo.

<a id="how-it-works"></a>

## Cómo funciona

Home Assistant observa tres condiciones agregadas: al menos un contacto está abierto, todos los contactos están cerrados y al menos un contacto está en `unknown` o `unavailable`. Cada condición utiliza un disparador de plantilla nativo con su duración `for` configurada. Si la condición agregada deja de cumplirse antes de que termine esa duración, Home Assistant reinicia su temporizador y no ejecuta ninguna acción. Cuando termina un temporizador, la acción breve comprueba de nuevo el conjunto completo de contactos antes de pausar, reanudar o crear un aviso.

El control de apertura, el de cierre y el diagnóstico de disponibilidad utilizan disparadores independientes basados en eventos. Por tanto, un contacto abierto puede pausar la zona tras el retardo de apertura aunque otro contacto seleccionado no esté disponible. El contacto no disponible sigue impidiendo que se cumpla la condición de todos cerrados y se reanude la zona.

Si un contacto permanece en `unknown` o `unavailable` durante el retardo de aviso configurado, Home Assistant crea una notificación persistente para todo el conjunto de termostatos. Enumera los contactos afectados y los termostatos seleccionados, y explica por qué no se reanudan. El estado vuelve a comprobarse después del retardo, por lo que una ejecución anterior termina antes de crear la notificación si todos los contactos ya se han recuperado. Un disparador de recuperación agregada descarta el aviso. El ID determinista de la notificación hace que las ejecuciones posteriores actualicen el mismo aviso en lugar de crear duplicados.

Después de iniciar Home Assistant, una ejecución de reconciliación realiza las tres comprobaciones en ramas internas paralelas. Cada rama verifica primero su condición agregada, espera hasta la duración configurada a que aparezca la condición opuesta y se detiene inmediatamente si esta aparece. Por ello, la rama de apertura puede pausar los equipos mientras la rama de disponibilidad sigue esperando. Solo actúa cuando se agota la espera y sigue superándose la comprobación agregada final. Home Assistant no puede reconstruir cuánto tiempo se cumplía una condición antes del inicio, por lo que estos temporizadores interrumpibles de inicio vuelven a comenzar desde cero. El funcionamiento normal utiliza después los temporizadores continuos de los disparadores de plantilla descritos anteriormente. No hay sondeo periódico.

Las ejecuciones de la automatización pueden solaparse, de modo que un evento `opened_due` no queda bloqueado mientras espera la rama de disponibilidad del inicio. Esa espera solo ocupa una de las plazas paralelas limitadas. Las acciones convergen de forma segura porque cada iteración sobre un equipo vuelve a validar el estado agregado actual de los contactos, Velair serializa los cambios de control temporal por equipo y un disparador agregado opuesto aplica la decisión posterior de pausa o reanudación cuando cambian las condiciones.

<a id="safety-and-precedence"></a>

## Seguridad y prioridades

El blueprint crea cada pausa con el **Pause ID** configurado. Su valor predeterminado es `velair_window_guard`; Velair guarda ese propietario de forma independiente para cada termostato seleccionado.

- No sustituye una pausa manual ni una pausa cuyo propietario sea otra automatización.
- Cerrar todas las ventanas solo reanuda las pausas que tengan el mismo ID.
- Una pausa o reanudación manual en Velair mantiene su prioridad.
- Los scripts y automatizaciones existentes sin `pause_id` conservan su comportamiento anterior.
- Los contactos `unknown` y `unavailable` nunca se consideran cerrados con seguridad.
- Los avisos de disponibilidad no eluden ni cambian el propietario de la pausa. Solo explican por qué no es posible reanudar con seguridad.

Cada equipo recibe una llamada de servicio individual y el estado agregado pertinente de los contactos vuelve a comprobarse inmediatamente antes de cada llamada. Un error de servicio de Home Assistant queda registrado en la traza de la automatización, pero `continue_on_error` permite que el blueprint continúe con los demás equipos. Los cambios de Refuerzo, pausa, reanudación y vencimiento siguen serializándose de forma independiente por zona climática.

<a id="limitations"></a>

## Limitaciones

- Es preferible una sola automatización con todas las aberturas pertinentes para el mismo conjunto de termostatos.
- Si varias automatizaciones de ventanas deben actuar sobre el mismo termostato, asigna a cada una un **Pause ID** estable diferente. Así crean motivos de pausa independientes y cada automatización solo puede retirar el suyo.
- El blueprint no puede interpretar de forma fiable los cambios realizados con un mando infrarrojo si la integración de climatización subyacente no los comunica a Home Assistant.
- Los temporizadores interrumpibles de reconciliación al iniciar comienzan desde cero porque Home Assistant no puede recuperar el historial de temporizadores anterior al reinicio.
- Las notificaciones dependen de la integración incorporada `persistent_notification` de Home Assistant.
- El ID de la notificación utiliza el ID de entidad de la automatización de Home Assistant, por lo que es breve e independiente de la selección o el orden de los termostatos. Renombrar la automatización puede dejar su notificación anterior pendiente de descarte manual.
- Pueden solaparse hasta 50 ejecuciones. Home Assistant emite un aviso si una ráfaga anómala de eventos ocupa esas plazas; las ejecuciones normales activadas por condiciones siguen siendo breves.

<a id="troubleshooting"></a>

## Resolución de problemas

- Si la zona nunca se pausa, confirma que al menos un contacto seleccionado indica `on` mientras está abierto y permanece abierto más tiempo que el retardo de apertura.
- Si la zona no se reanuda, confirma que todos los contactos seleccionados indican `off`. Tras el retardo de aviso de disponibilidad, la notificación persistente enumera los contactos que siguen en `unknown` o `unavailable`.
- Si un aviso de disponibilidad sigue presente tras la recuperación, verifica que el contacto haya producido un nuevo evento de estado. Recargar o ejecutar la automatización también vuelve a evaluar todo el conjunto y descarta un aviso desactualizado.
- Si un servicio indica una entidad no gestionada, añade ese equipo a Velair. Los errores de servicio de Home Assistant no detienen los demás equipos; revisa la traza de la automatización para identificar los fallos individuales.
- Si cerrar las ventanas deja la zona pausada, comprueba si la pausa activa se creó manualmente o mediante otra automatización. El blueprint la deja intacta deliberadamente.
- Si varias automatizaciones actúan sobre el mismo equipo, reúne sus aberturas o verifica que cada automatización utilice un **Pause ID** estable diferente.

<a id="updating-and-customizing"></a>

## Actualización y personalización

Vuelve a importar la URL de `main`, que se actualiza continuamente, para instalar una actualización compatible. Las actualizaciones de la versión 1 conservan los nombres de las entradas existentes y toda entrada nueva tiene un valor predeterminado, por lo que no hace falta migrar la automatización. Una futura versión incompatible utilizará un nombre de archivo nuevo y una versión principal nueva en lugar de sustituir esta URL. Velair nunca modifica las automatizaciones de Home Assistant ni `.storage` para migrar un blueprint. Utiliza **Tomar el control** solo cuando la instalación necesite un comportamiento personalizado que vaya más allá de los contactos, acciones y retardos proporcionados; la automatización independiente dejará entonces de recibir actualizaciones del blueprint.
