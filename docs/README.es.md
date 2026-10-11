<a id="documentation"></a>

# Documentación
<!-- velair-docs:start -->
Traducciones: [Original en inglés](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-br.md) · [Português (Portugal)](README.pt-pt.md) · [Русский](README.ru.md) · [Estado de las traducciones](translation-status.md)

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

La documentación de Velair se agrupa por destinatarios y temas.

<a id="user-documentation"></a>

## Documentación para usuarios

- [Instalación](user/installation.es.md): instala Velair mediante HACS o manualmente.
- [Uso](user/usage.es.md): configura equipos de climatización, horarios, plantillas, perfiles, refuerzos, pausas, importación/exportación y servicios.
- [Navegación del panel y enlaces directos](user/usage.es.md#panel-navigation-and-direct-links): enlaza pestañas y subsecciones, recupera la sección al actualizar y utiliza el historial del navegador.
- [Cambios externos y ajuste manual](user/manual-control.es.md): elige si Velair mantiene el control automático o cede ante cambios desde tarjetas de HA, mandos, dispositivos y automatizaciones.
- [Ejecución externa de horarios](user/external-systems.es.md): publica horarios semanales efectivos compatibles, incluida la selección de Perfiles y Modos, en controladores compatibles sin mezclar la lógica del proveedor con el programador de Velair.
- [Perfiles climáticos](user/climate-profiles.es.md): coordina horarios alternativos y expón Modos configurables a las automatizaciones de Home Assistant.
- [Presets climáticos y plantillas vinculadas](user/linked-schedules.es.md): reutiliza ajustes de climatización y comparte horas diarias o programaciones diarias completas entre los horarios Predeterminados y de Perfiles.
- [Ejemplos de presets y plantillas](user/linked-schedule-examples.es.md): configuraciones domésticas paso a paso, horarios estacionales, copias, ediciones compartidas y resolución de problemas.
- [Automatizaciones de presets](user/preset-automations.es.md): actualiza temperaturas objetivo compartidas y ajustes de dispositivos desde scripts, con ejemplos de temperatura exterior y sustitución explícita.
- [Eventos de automatización](user/automation-events.es.md): utiliza las cargas completas de los eventos de ejecución en automatizaciones de Home Assistant.
- [Blueprints de automatización](user/blueprints.es.md): importa asistentes opcionales para ocupación, ventanas abiertas y temperatura estacional sin sondeo continuo.
- [Selección estacional de climatización](user/blueprints/seasonal-climate-selection.es.md): elige Modos u otras acciones a partir de cambios estables de temperatura, con notificaciones de diagnóstico inmediatas.
- [Preacondicionamiento adaptativo](user/adaptive-preconditioning.es.md): adelanta el inicio de los objetivos de confort programados con aprendizaje local.
- [Regreso a casa](user/planned-return.es.md): configura ausencias según la ocupación y llegadas semanales o puntuales, con ejemplos de cancelación antes y después de confirmar la salida.
- [Room Assist](user/room-assist.es.md): utiliza un sensor de temperatura ambiente independiente para válvulas termostáticas, termostatos y equipos de aire acondicionado.
- [Entrega resiliente de órdenes de climatización](user/resilient-climate-delivery.es.md): comprende los reintentos diferidos y la reconexión cuando un equipo no está disponible temporalmente.
- [Confort ambiental](user/comfort.es.md): comprende la temperatura, humedad, calidad del aire por CO2 y vigencia de las lecturas mediante evaluaciones locales de las habitaciones.
- [Unidades de temperatura y migración](user/temperature-units.es.md): comprende los valores predeterminados en Celsius/Fahrenheit, actualizaciones, migración, importación/exportación y recuperación.
- [Resolución de problemas](user/troubleshooting.es.md): problemas habituales de configuración, recursos del frontend y ejecución.
- [Diagnóstico](user/diagnostics.es.md): estado local de ejecución, historial limitado e informes de problemas con datos anonimizados.
- [Referencia de sensores](user/sensors.es.md): consulta todos los sensores de Velair, sus atributos principales y ejemplos prácticos de automatización.
- [Sensores de control y entrega de zona](user/zone-sensors.es.md): utiliza el contexto de control por equipo y la evidencia de entrega de órdenes en paneles y automatizaciones.

<a id="developer-documentation"></a>

## Documentación para desarrolladores

- [Arquitectura](developer/architecture.md): límites entre módulos de backend y frontend, modelo de persistencia y flujo del programador.
- [Funcionamiento interno de horarios vinculados](developer/linked-schedules.md): presets climáticos compartidos, vínculos de plantillas de solo horarios o de horarios y ajustes, transacciones compartidas y horarios resueltos.
- [Mantenimiento de blueprints](developer/blueprints.md): añade YAML de blueprints, entradas del catálogo, páginas detalladas coherentes, traducciones y pruebas.
- [API WebSocket](developer/api.md): contrato de la API entre frontend y backend.
- [Funcionamiento interno del preacondicionamiento adaptativo](developer/adaptive-preconditioning.md): estados de aprendizaje local, ponderación por similitud, almacenamiento y salida de la API.
- [Funcionamiento interno de Room Assist](developer/room-assist.md): selección del sensor ambiente, cálculo del objetivo asistido, estado de ejecución, restauración y eventos.
- [Funcionamiento interno de la entrega de órdenes](developer/climate-delivery.md): reintentos basados en eventos, recuperación de disponibilidad, serialización, generaciones y alcance de una entrega correcta.
- [Funcionamiento interno del confort ambiental](developer/comfort.md): selección de fuentes, evaluación de condiciones, calidad de datos, suscripciones a eventos, salida de la API y eventos.
- [Funcionamiento interno de las unidades de temperatura](developer/temperature-units.md): metadatos de almacenamiento, límites de migración, conversión portátil, validación y seguridad durante la ejecución.
- [Frontend](developer/frontend.md): elementos de ejecución del frontend, comandos de compilación, recurso Lovelace, traducciones, principios de interfaz y flujo de trabajo del frontend.
- [Desarrollo](developer/development.md): comprobaciones locales, archivos generados, directrices de código y flujo de contribución.
- [Pruebas manuales](developer/manual-testing.md): lista de comprobación de versiones y comportamiento.

<a id="project-documentation"></a>

## Documentación del proyecto

- [Capturas de pantalla](project/screenshots.md): capturas reales.

Las ideas futuras y solicitudes de funciones deben gestionarse mediante incidencias o debates de GitHub para que puedan evolucionar con los comentarios de la comunidad sin crear compromisos de hoja de ruta.
