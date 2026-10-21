<a id="automation-blueprints"></a>

# Blueprints de automatización
<!-- velair-docs:start -->
Traducciones: [Original en inglés](blueprints.md) · [Español](blueprints.es.md) · [Français](blueprints.fr.md) · [Deutsch](blueprints.de.md) · [Italiano](blueprints.it.md) · [Nederlands](blueprints.nl.md) · [Polski](blueprints.pl.md) · [Português (Brasil)](blueprints.pt-br.md) · [Português (Portugal)](blueprints.pt-pt.md) · [Русский](blueprints.ru.md) · [Estado de las traducciones](../translation-status.md)

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

Velair deja en Home Assistant la gestión de presencia, puertas, invitados y condiciones específicas del hogar, en lugar de crear otro motor de automatización. Estos blueprints opcionales ofrecen puntos de partida guiados para casos habituales, con funcionamiento completamente local y basado en eventos.

Importar un blueprint no cambia Velair por sí solo. Home Assistant añade primero el blueprint reutilizable; después creas y configuras una automatización a partir de él. Las automatizaciones existentes pueden recibir actualizaciones al volver a importarlo, o puedes utilizar **Tomar el control** para convertir una en una automatización independiente de Home Assistant.

Los paquetes de integración de HACS no copian automáticamente los blueprints en el directorio de blueprints de Home Assistant. Utiliza los enlaces de importación siguientes.

<a id="available-blueprints"></a>

## Blueprints disponibles

Los blueprints se muestran en orden alfabético según sus nombres en inglés.

- [En casa y Ausente según la ocupación](#home-and-away-from-occupancy)
- [Pausar una zona mientras hay ventanas abiertas](#pause-a-zone-while-windows-are-open)
- [Selección estacional de climatización](#seasonal-climate-selection)

<hr>

<a id="home-and-away-from-occupancy"></a>

### En casa y Ausente según la ocupación

Ejecuta las acciones de Home Assistant que elijas cuando una entidad de ocupación consolidada indique presencia o ausencia. Las acciones pueden seleccionar un Modo de Velair, activar un Perfil o coordinar Velair con el resto del hogar. Una notificación diferida informa cuando la ocupación deja de estar disponible.

**Versión:** 1.0.0 · **Requiere:** Home Assistant 2024.6.0+

<p>
  <a href="blueprints/home-away-from-occupancy.es.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Ver la documentación de En casa y Ausente según la ocupación"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Foccupancy_home_away.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Abrir Home Assistant e importar el blueprint de En casa y Ausente según la ocupación" height="28"></a>
</p>

<hr>

<a id="pause-a-zone-while-windows-are-open"></a>

### Pausar una zona mientras hay ventanas abiertas

Pausa uno o varios equipos gestionados por Velair mientras alguna ventana o puerta seleccionada permanezca abierta; después reanuda sus horarios solo cuando la automatización siga siendo responsable de la pausa activa. Una notificación diferida de Home Assistant identifica los contactos no disponibles y los termostatos afectados.

**Versión:** 1.0.0 · **Requiere:** Home Assistant 2024.6.0+ y Velair 1.6.0+

<p>
  <a href="blueprints/pause-zone-for-open-windows.es.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Ver la documentación de Pausar una zona mientras hay ventanas abiertas"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fwindow_pause.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Abrir Home Assistant e importar el blueprint de Pausar una zona mientras hay ventanas abiertas" height="28"></a>
</p>

<hr>

<a id="seasonal-climate-selection"></a>

### Selección estacional de climatización

Ejecuta una sola vez las acciones configurables para invierno, tiempo templado o verano después de que la temperatura permanezca en un nuevo rango estacional durante un tiempo positivo, inicialmente 30 minutos. Los cambios dentro de ese rango conservan el plazo y no repiten las acciones. Utiliza el editor estándar de acciones para elegir Modos de Velair u otras acciones de Home Assistant. Las lecturas inválidas generan una notificación inmediata; las comprobaciones al iniciar revisan el diagnóstico sin elegir una estación.

Las notificaciones de diagnóstico admiten los mismos idiomas que Velair, seleccionados explícitamente en el blueprint.

**Versión:** 1.1.0 · **Requiere:** Home Assistant 2024.6.0+ · **Categoría:** Temperatura / automatización estacional

<p>
  <a href="blueprints/seasonal-climate-selection.es.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Ver la documentación de Selección estacional de climatización"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fseasonal_climate_selection.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Abrir Home Assistant e importar el blueprint de Selección estacional de climatización" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/seasonal_climate_selection.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Ver el código YAML de Selección estacional de climatización"></a>
</p>

<hr>

<a id="shared-behavior"></a>

## Comportamiento compartido

- Los blueprints reaccionan a eventos de estado y de inicio de Home Assistant; no realizan sondeo continuo.
- Los retardos configurables filtran cambios de estado breves.
- Los estados `unknown` y `unavailable` se tratan con prudencia.
- El blueprint de ocupación informa de problemas prolongados de disponibilidad de la ocupación y retira la advertencia tras recuperarse.
- El blueprint de ventanas informa de problemas persistentes de disponibilidad de contactos sin retrasar el control de los contactos que siguen funcionando.
- El blueprint estacional informa inmediatamente de lecturas de temperatura inválidas y nunca selecciona una estación al iniciar.
- La configuración de los blueprints permanece en Home Assistant, no en el almacenamiento de Velair.
- Volver a importar la misma URL actualiza el blueprint utilizado por las automatizaciones existentes.

Cada página de blueprint documenta sus propios requisitos, configuración, ejemplo, comportamiento de seguridad, limitaciones y pasos de resolución de problemas.

<a id="versions-and-updates"></a>

## Versiones y actualizaciones

Los blueprints utilizan sus propias versiones semánticas, independientes de la integración Velair. Los enlaces de importación apuntan a la versión actual de `main`. Vuelve a importar la misma URL cuando quieras una actualización compatible de una automatización existente. Home Assistant no actualiza automáticamente los blueprints importados.

Las actualizaciones dentro de la versión 1 conservan los nombres de las entradas existentes y cualquier entrada nueva tiene un valor predeterminado. Los cambios incompatibles se publican con un nombre de archivo y una versión principal nuevos, manteniendo disponible la URL anterior. Velair no inspecciona ni migra automatizaciones de Home Assistant ni datos de `.storage`. **Tomar el control** mantiene una automatización independiente, pero también impide que reciba actualizaciones posteriores del blueprint.
