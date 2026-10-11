<a id="temperature-units-and-migration"></a>

# Unidades de temperatura y migración
<!-- velair-docs:start -->
Traducciones: [Original en inglés](temperature-units.md) · [Español](temperature-units.es.md) · [Français](temperature-units.fr.md) · [Deutsch](temperature-units.de.md) · [Italiano](temperature-units.it.md) · [Nederlands](temperature-units.nl.md) · [Polski](temperature-units.pl.md) · [Português (Brasil)](temperature-units.pt-br.md) · [Português (Portugal)](temperature-units.pt-pt.md) · [Русский](temperature-units.ru.md) · [Estado de las traducciones](../translation-status.md)

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

Velair admite Celsius y Fahrenheit siguiendo la unidad de temperatura configurada en Home Assistant. No ofrece un selector de unidad independiente. La unidad detectada aparece como dato de solo lectura en **Ajustes > Unidad de temperatura**; cámbiala desde los ajustes del sistema de unidades de Home Assistant.

<a id="new-installations-and-resets"></a>

## Instalaciones nuevas y restablecimientos

En la primera configuración, Velair crea horarios, plantillas integradas, umbrales de Confort, límites de Room Assist y ajustes del Preacondicionamiento adaptativo en la unidad detectada en Home Assistant. Restablecer Velair vuelve a crear esos valores predeterminados para la unidad detectada actualmente.

Los objetivos de climatización se validan con el mínimo, máximo y paso efectivo de temperatura de cada equipo gestionado. Velair utiliza directamente `target_temp_step` cuando Home Assistant lo proporciona. En caso contrario, Ajustes muestra el valor alternativo efectivo: el último paso válido comunicado por esa entidad, el valor manual guardado para la zona o `1` si no existe ninguno. Puede configurarse con el incremento real del dispositivo. Guardarlo mientras falta el atributo elimina la observación recordada sin cambiar las reglas de los horarios. Un valor válido comunicado posteriormente tiene prioridad y vuelve a recordarse, de modo que una entidad inconsistente no invalida los horarios con decimales existentes por el mero hecho de omitir el atributo.

La serie de objetivos válidos comienza en la temperatura mínima publicada por el equipo, no en cero. Esto conserva sus consignas reales tanto en Celsius como en Fahrenheit, incluidos los equipos cuyo mínimo no es un múltiplo exacto de su paso.

<a id="existing-stored-data"></a>

## Datos existentes guardados

Velair guarda la configuración térmica en la unidad registrada con los datos. No reinterpreta silenciosamente los números guardados cuando cambia la unidad de Home Assistant.

Cuando los datos guardados ya declaran una unidad y Home Assistant comunica después la otra, Velair:

1. detiene la programación automática y la escritura de valores térmicos;
2. conserva el estado activo de recuperación de Room Assist mientras detiene sus suscripciones a eventos;
3. crea una notificación persistente de Home Assistant;
4. muestra las unidades de origen y destino en Ajustes de Velair; y
5. ofrece una migración explícita de todos los datos térmicos guardados.

Ejecuta esa migración solo si todos los valores guardados siguen utilizando la unidad de origen indicada. La operación convierte horarios, plantillas, objetivos activos y anteriores de anulaciones, valores alternativos del paso de temperatura, umbrales de Confort, ajustes de Room Assist, configuración del Preacondicionamiento adaptativo, últimos pasos de temperatura comunicados, tasas y observaciones de aprendizaje. Los objetivos vinculados a un equipo conocido se ajustan a su paso efectivo cuando está disponible. Los demás valores editables convertidos utilizan una precisión segura en lugar de inventar un paso de dispositivo.

El programador solo se reanuda después de guardar correctamente los datos convertidos y restaurar el estado de ejecución. Tras una operación correcta, Room Assist restaura el objetivo programado convertido y elimina su estado de recuperación guardado. Si los datos se guardan pero la recuperación de ejecución falla, Velair permanece detenido e indica que debe recargarse la integración o reiniciarse Home Assistant.

<a id="upgrading-published-celsius-only-data"></a>

## Actualización de datos publicados que solo admitían Celsius

Las versiones publicadas de Velair anteriores a los metadatos de unidad trataban los valores térmicos guardados como Celsius. Por ello, Velair considera que el almacenamiento antiguo sin unidad está en Celsius.

- Si Home Assistant utiliza Celsius, Velair puede continuar con esos valores y registra los metadatos de unidad.
- Si Home Assistant utiliza Fahrenheit, Velair no deduce si se editaron manualmente valores individuales. Detiene el programador y solicita **Restablecer Velair**, que sustituye los datos antiguos por nuevos valores predeterminados en Fahrenheit.

La exportación sigue disponible mientras está pendiente este restablecimiento, para que puedas conservar una copia de referencia antes de borrar los horarios y ajustes antiguos.

<a id="export-and-import"></a>

## Exportación e importación

Las exportaciones actuales incluyen el campo `temperature_unit`. Si un archivo importado utiliza la otra unidad, Velair convierte las secciones térmicas seleccionadas a la unidad actual de Home Assistant antes de guardarlas.

Se aceptan las copias antiguas sin `temperature_unit` y se consideran Celsius. La pantalla de importación muestra esta suposición antes de importar. En una instalación Fahrenheit, esos valores antiguos se convierten automáticamente a Fahrenheit.

La importación sobrescribe las secciones seleccionadas: se sustituyen los horarios, plantillas, ajustes o datos de aprendizaje coincidentes. Exporta primero la configuración actual si puedes necesitar un punto de recuperación.

El paso de temperatura manual alternativo de cada zona se incluye en sus datos exportables y se convierte como diferencia de temperatura cuando las unidades difieren. El último paso observado en una entidad de climatización local es contexto interno del dispositivo y no se exporta.

<a id="temporarily-unavailable-climates"></a>

## Equipos temporalmente no disponibles

Un equipo puede no publicar su intervalo o paso de temperatura mientras no está disponible. Velair puede migrar o importar los datos guardados y valida los horarios cuando el equipo vuelve a publicar sus capacidades. El panel identifica los horarios incompatibles, que deben corregirse antes de utilizarlos con confianza.

<a id="what-velair-converts"></a>

## Qué convierte Velair

La configuración guardada y los datos de copias importadas se convierten únicamente durante una migración o importación explícita. Las lecturas y objetivos actuales de los equipos ya pertenecen a Home Assistant y no se convierten de nuevo. Las lecturas de sensores externos de habitación o exteriores solo se convierten al compararlas cuando su unidad declarada difiere de la del equipo gestionado.
