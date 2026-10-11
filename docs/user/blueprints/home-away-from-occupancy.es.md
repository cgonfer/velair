<a id="home-and-away-from-occupancy"></a>

# En casa y Ausente según la ocupación
<!-- velair-docs:start -->
Traducciones: [Original en inglés](home-away-from-occupancy.md) · [Español](home-away-from-occupancy.es.md) · [Français](home-away-from-occupancy.fr.md) · [Deutsch](home-away-from-occupancy.de.md) · [Italiano](home-away-from-occupancy.it.md) · [Nederlands](home-away-from-occupancy.nl.md) · [Polski](home-away-from-occupancy.pl.md) · [Português (Brasil)](home-away-from-occupancy.pt-br.md) · [Português (Portugal)](home-away-from-occupancy.pt-pt.md) · [Русский](home-away-from-occupancy.ru.md) · [Estado de las traducciones](../../translation-status.md)

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

Ejecuta las acciones de Home Assistant que elijas cuando una única entidad de ocupación consolidada pase a indicar que hay alguien en casa o que la casa está vacía. Así, las reglas sobre personas, invitados y presencia específicas de cada hogar permanecen en Home Assistant, mientras que los cambios habituales de Modos y Perfiles de Velair resultan más fáciles de configurar. Una notificación con retardo explica cuándo la entidad no permite decidir con seguridad entre En casa y Ausente.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Foccupancy_home_away.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Abrir Home Assistant e importar el blueprint En casa y Ausente según la ocupación" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/occupancy_home_away.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Ver el código YAML de En casa y Ausente según la ocupación"></a>
</p>

[Ver historial de cambios](../../../blueprints/changelogs/occupancy_home_away.md) · [Volver al índice de blueprints](../blueprints.es.md)

<a id="when-to-use-it"></a>

## Cuándo utilizarlo

Utiliza este blueprint si Home Assistant ya dispone de una entidad que representa si la casa está ocupada. Es adecuado para cambios a En casa, Ausente o similares cuando conviene esperar y volver a comprobar el estado antes de ejecutar las acciones finales.

<a id="requirements"></a>

## Requisitos

- Versión 1.0.0 del blueprint y Home Assistant 2024.6.0 o posterior.
- Un `binary_sensor` o `input_boolean` con `on`/`off`, o un grupo de personas con `home`/`not_home`.
- Velair solo es necesario si las acciones configuradas utilizan sus Modos, Perfiles, entidades o servicios. En los demás casos, el blueprint puede ejecutar acciones estándar de Home Assistant sin Velair.

Configura las reglas sobre personas, invitados, zonas y presencia en Home Assistant antes de seleccionar aquí la entidad resultante. Un grupo de personas puede representar si alguna persona seguida está `home`, mientras que un sensor binario de plantilla puede incluir también un ayudante de invitados u otras excepciones del hogar. El blueprint acepta tanto `on`/`off` como `home`/`not_home`, sin volver a calcular esa decisión.

<a id="configuration"></a>

## Configuración

- **Consolidated occupancy state:** la única entidad que ya representa la ocupación de toda la casa.
- **When occupied:** una o varias acciones estándar de Home Assistant.
- **When empty:** una o varias acciones estándar de Home Assistant.
- **Occupied delay:** cuánto tiempo debe permanecer la entidad en `on` o `home`.
- **Empty delay:** cuánto tiempo debe permanecer la entidad en `off` o `not_home`.
- **Availability warning delay:** cuánto tiempo debe persistir `unknown` o `unavailable` antes de que Home Assistant cree una notificación de diagnóstico. El valor predeterminado es 5 minutos.

<a id="example"></a>

## Ejemplo

Para la acción de casa ocupada, añade **Seleccionar: Seleccionar**, elige la entidad visible del Modo de Velair que ofrece Home Assistant y selecciona `Home`. Configura la acción de casa vacía de la misma forma con `Away`. Selecciona la entidad desde la interfaz en lugar de dar por supuesto un ID concreto.

Las acciones generadas equivalen a:

```yaml
action: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Home
```

Para activar directamente un Perfil:

```yaml
action: velair.activate_profile
data:
  profile_id: home
```

Los Modos suelen ser más claros para las opciones En casa, Ausente y Vacaciones, porque el estado actual permanece visible en el selector de Modo de Velair de Home Assistant.

<a id="how-it-works"></a>

## Cómo funciona

Los disparadores de estado ocupado (`on`/`home`) y vacío (`off`/`not_home`) utilizan duraciones `for` nativas de Home Assistant, por lo que el estado debe mantenerse de forma continua durante todo el retardo. Otros disparadores de plantilla de disponibilidad detectan un estado `unknown`/`unavailable` sostenido y la recuperación de cualquier estado admitido. Home Assistant crea una notificación persistente propia de la automatización una vez transcurrido el retardo de aviso de disponibilidad, la actualiza en lugar de duplicarla y la descarta tras la recuperación. Las acciones En casa y Ausente no se ejecutan mientras la entidad carezca de un estado válido.

Al iniciar, las comprobaciones de ocupación, casa vacía y disponibilidad se ejecutan en ramas internas paralelas. Cada una comprueba su estado inicial, espera de forma interrumpible al estado opuesto hasta agotar el tiempo configurado, continúa solo si se agota ese tiempo y vuelve a comprobar antes de actuar. El modo paralelo externo, con un límite de ejecuciones, evita que una espera de disponibilidad al iniciar bloquee una transición posterior de ocupación válida. No hay sondeo periódico.

<a id="safety-and-precedence"></a>

## Seguridad y prioridades

El blueprint solo ejecuta las acciones que configures. Se mantienen las prioridades existentes de Modos, Perfiles, Refuerzo y pausas de Velair. Una entidad de ocupación en `unknown` o `unavailable` no activa ni En casa ni Ausente; el aviso identifica la entidad y explica que las acciones siguen suspendidas hasta que indique un estado admitido de casa ocupada o vacía.

<a id="limitations"></a>

## Limitaciones

- El blueprint acepta deliberadamente una entidad de ocupación cuya lógica ya está resuelta; no combina por sí mismo reglas de personas o invitados.
- Los temporizadores `for` de Home Assistant no sobreviven a un reinicio, por lo que el proceso de inicio vuelve a comenzar el retardo configurado.
- El ID de la notificación utiliza el ID de entidad de la automatización. Renombrar la automatización puede dejar su notificación anterior pendiente de descarte manual.
- La ejecución paralela está limitada a 20 ejecuciones y emite un aviso si una ráfaga anómala de eventos ocupa todas las plazas.
- Las acciones creadas con **Tomar el control** dejan de recibir automáticamente las actualizaciones del blueprint.

<a id="troubleshooting"></a>

## Resolución de problemas

- Si ninguna rama se ejecuta, confirma que la entidad seleccionada indica `on`/`home` o `off`/`not_home`.
- Si aparece un aviso, revisa la entidad de ocupación indicada y su grupo, plantilla, personas o ayudante de invitados de origen.
- Si Ausente se activa demasiado pronto, aumenta el retardo de casa vacía.
- Si no se selecciona el Modo esperado, ejecuta manualmente la acción elegida en Home Assistant y verifica el nombre de la opción.
- Si falla una acción de Perfil, utiliza su ID estable en lugar del nombre visible editable.

<a id="updating-and-customizing"></a>

## Actualización y personalización

Vuelve a importar la URL de `main`, que se actualiza continuamente, para instalar una actualización compatible. Las actualizaciones de la versión 1 conservan los nombres de las entradas existentes y toda entrada nueva tiene un valor predeterminado, por lo que no hace falta migrar la automatización. Una futura versión incompatible utilizará un nombre de archivo nuevo y una versión principal nueva en lugar de sustituir esta URL. Velair nunca modifica las automatizaciones de Home Assistant ni `.storage` para migrar un blueprint. Utiliza **Tomar el control** solo cuando la instalación necesite una lógica que no pueda expresarse mediante las entradas proporcionadas; la automatización independiente dejará entonces de recibir actualizaciones del blueprint.
