<a id="installation"></a>

# Instalación
<!-- velair-docs:start -->
Traducciones: [Original en inglés](installation.md) · [Español](installation.es.md) · [Français](installation.fr.md) · [Deutsch](installation.de.md) · [Italiano](installation.it.md) · [Nederlands](installation.nl.md) · [Polski](installation.pl.md) · [Português (Brasil)](installation.pt-br.md) · [Português (Portugal)](installation.pt-pt.md) · [Русский](installation.ru.md) · [Estado de las traducciones](../translation-status.md)

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

Velair está disponible en el catálogo predeterminado de HACS. La instalación manual sigue disponible para quienes no utilizan HACS o necesitan probar una compilación concreta.

## HACS

1. Abre HACS.
2. Busca **Velair** entre las integraciones disponibles.
3. Abre Velair y selecciona **Descargar**.
4. Reinicia Home Assistant.
5. Ve a **Ajustes > Dispositivos y servicios**.
6. Añade la integración Velair.
7. Selecciona las entidades `climate.*` que Velair puede gestionar.

Velair utiliza la unidad de temperatura seleccionada en Home Assistant. Una instalación nueva crea horarios, plantillas, umbrales de Confort, ajustes de Room Assist y valores predeterminados de Preacondicionamiento adaptativo para esa unidad. La unidad se muestra como dato de solo lectura en Ajustes de Velair y debe cambiarse mediante Home Assistant, no Velair.

Las instalaciones existentes que actualicen desde una versión publicada de Velair que solo admitía Celsius pueden necesitar un restablecimiento si Home Assistant utiliza Fahrenheit. Consulta [Unidades de temperatura y migración](temperature-units.es.md) antes de continuar para poder exportar primero una copia de referencia si es necesario.

<a id="manual-installation"></a>

## Instalación manual

La instalación manual normalmente solo es necesaria si no utilizas HACS o quieres probar una compilación de GitHub Actions o una versión publicada en GitHub.

Los archivos de la versión incluyen `velair-custom-component-<version>.zip`. Extráelo para que exista esta carpeta:

```text
<home_assistant_config>/custom_components/velair
```

Si utilizas una copia local del repositorio, copia:

```text
custom_components/velair
```

a:

```text
<home_assistant_config>/custom_components/velair
```

Reinicia Home Assistant y añade Velair desde **Ajustes > Dispositivos y servicios**.

<a id="github-actions-artifacts"></a>

## Artefactos de GitHub Actions

Cada ejecución correcta de CI sube artefactos temporales:

- `velair-custom-component`: la carpeta completa `custom_components/velair` con el paquete del frontend generado por esa ejecución.
- `velair-lovelace-resource`: los archivos compilados `velair-card.js` para pruebas manuales avanzadas del recurso Lovelace.

Las ejecuciones de versiones etiquetadas también adjuntan archivos zip a la versión publicada en GitHub. Para el uso habitual, utiliza HACS; usa estos artefactos cuando quieras probar una ejecución concreta del flujo de trabajo o instalar manualmente.

<a id="optional-lovelace-card"></a>

## Tarjeta Lovelace opcional

El panel de la barra lateral se registra automáticamente. La tarjeta Lovelace es opcional.

Añade el recurso servido por la integración:

```yaml
url: /velair_frontend/velair-card.js
type: module
```

Después añade una o varias tarjetas Velair. Cada tarjeta utiliza los mismos datos del backend y componentes visuales que el panel de la barra lateral.

```yaml
type: custom:velair-card
view: overview-status
```

Valores de `view` admitidos:

- `climate`: estado y controles de un equipo gestionado, con una acción opcional de Regreso puntual del hogar junto a Refuerzo y Pausa. Las tarjetas existentes mantienen esa acción oculta; las configuraciones nuevas del selector de tarjetas la activan.
- `overview-status`: estado del programador y controles para pausar/detener/reanudar.
- `overview-boosts`: refuerzos activos.
- `overview-events`: próximos eventos.
- `overview-timeline`: línea temporal de hoy.
- `overview-zones`: resumen de zonas.
- `active-setup`: Modo y Perfiles actuales, con controles opcionales.
- `schedules`: editor completo de horarios.
- `sensors`: configuración y estado actual de Room Assist.
- `comfort`: configuración y estado del confort ambiental.
- `preconditioning`: configuración del preacondicionamiento adaptativo y estado del aprendizaje local.
- `planned-return`: controles compactos de regreso puntual, recuentos de las fuentes de ocupación configuradas y una línea temporal de salida confirmada. Sin fuentes de ocupación guardadas, Programar regreso aplica Ausente inmediatamente; la rutina semanal automática sigue necesitando fuentes.
- `diagnostics`: estado de ejecución, historial limitado, filtros y exportación de informes de problemas.

<a id="card-discovery-and-resource-troubleshooting"></a>

### Detección de la card y diagnóstico de recursos

Utiliza solo el recurso de módulo `/velair_frontend/velair-card.js` servido por la integración. Elimina los recursos duplicados de Velair, incluido cualquier `/local/velair-card.js` antiguo, y después recarga el navegador. Los elementos personalizados del navegador no se pueden sustituir una vez registrados, por lo que un recurso antiguo cargado primero puede dejar ese navegador usando una implementación obsoleta de la card.

El selector de cards del dashboard descubre Velair mediante metadatos del frontend. Añadir manualmente `type: custom:velair-card` en YAML utiliza el elemento personalizado registrado; son comprobaciones distintas. Si la card funciona mediante YAML pero no aparece en el selector, indica esa diferencia al comunicar el problema.

Si la detección difiere entre ordenador y móvil, comprueba los errores de JavaScript en la consola de desarrollo del navegador afectado y la solicitud del recurso en la pestaña Red. Incluye las versiones de Home Assistant y Velair, el navegador afectado, la URL exacta del recurso y los mensajes de error pertinentes. Elimina los detalles privados antes de compartir registros. Que cargue correctamente en otro navegador no determina la causa del fallo en el navegador afectado.

<a id="updating"></a>

## Actualización

Después de actualizar Velair:

1. Reinicia Home Assistant.
2. Recarga el navegador sin usar la caché o recarga la aplicación complementaria de Home Assistant.
3. Comprueba que la sección de mantenimiento de Ajustes muestra la versión esperada de la integración.
