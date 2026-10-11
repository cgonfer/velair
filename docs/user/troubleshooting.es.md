<a id="troubleshooting"></a>

# Resolución de problemas
<!-- velair-docs:start -->
Traducciones: [Original en inglés](troubleshooting.md) · [Español](troubleshooting.es.md) · [Français](troubleshooting.fr.md) · [Deutsch](troubleshooting.de.md) · [Italiano](troubleshooting.it.md) · [Nederlands](troubleshooting.nl.md) · [Polski](troubleshooting.pl.md) · [Português (Brasil)](troubleshooting.pt-br.md) · [Português (Portugal)](troubleshooting.pt-pt.md) · [Русский](troubleshooting.ru.md) · [Estado de las traducciones](../translation-status.md)

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

<a id="a-lovelace-card-shows-configuration-error"></a>

## Una tarjeta Lovelace muestra un error de configuración

Comprueba que Velair está instalado y configurado antes de que el panel cargue la tarjeta. La integración publica su recurso del frontend al principio del arranque de Home Assistant para que los reinicios habituales no dejen las tarjetas esperando el módulo.

Si el error persiste:

1. Comprueba que la URL del recurso del panel es exactamente `/velair_frontend/velair-card.js` y su tipo es **Módulo JavaScript**.
2. Elimina recursos duplicados o antiguos, como `/local/velair-card.js`.
3. Reinicia Home Assistant después de actualizar la integración.
4. Recarga el navegador o la aplicación complementaria de Home Assistant.

La consola o el panel de red del navegador deberían indicar si falló la solicitud del módulo. Incluye ese error completo al comunicar un problema reproducible.

<a id="velair-does-not-appear-in-the-sidebar"></a>

## Velair no aparece en la barra lateral

Reinicia Home Assistant después de instalar o actualizar la integración. El panel de la barra lateral se registra durante la configuración de la integración.

Si acabas de actualizarla, recarga el navegador sin utilizar la caché o recarga la aplicación complementaria de Home Assistant.

<a id="the-lovelace-card-shows-old-ui"></a>

## La tarjeta Lovelace muestra la interfaz antigua

Revisa los recursos del panel. Elimina los recursos antiguos de desarrollo, como:

```yaml
url: /local/velair-card.js
type: module
```

Utiliza en su lugar el recurso servido por la integración:

```yaml
url: /velair_frontend/velair-card.js
type: module
```

Velair sirve este recurso con cabeceras que evitan la caché. La barra lateral utiliza una URL con versión automática y elementos internos aislados, para que una tarjeta Lovelace antigua almacenada en caché no bloquee una actualización del panel. Actualizar la integración suele requerir solo reiniciar Home Assistant y recargar el navegador o la aplicación complementaria. Si el backend indica la nueva versión pero sigue visible la interfaz anterior, recarga sin caché o borra la caché del sitio antes de comunicar el problema. No es necesario añadir identificadores de compilación ni editar la URL del recurso entre versiones.

<a id="a-climate-entity-is-missing"></a>

## Falta una entidad de climatización

Abre las opciones de la integración Velair y comprueba que la entidad esté seleccionada. Velair solo gestiona entidades `climate.*` configuradas en la integración.

Si la entidad ya no existe en Home Assistant, Velair mostrará el problema comprobado en **Diagnóstico**.

<a id="a-mode-is-not-available"></a>

## Un modo no está disponible

Velair lee los modos HVAC compatibles de la entidad de climatización. Si no aparece un modo, la entidad no lo está declarando como compatible.

Al aplicar plantillas o clonar horarios, Velair rechaza los modos incompatibles con un error claro. Cambia el bloque a `Keep` o selecciona un modo compatible con el equipo de destino.

<a id="temperature-is-adjusted-when-applying-templates"></a>

## La temperatura se ajusta al aplicar plantillas

Al aplicar una plantilla, Velair comprueba sus ajustes efectivos de climatización frente al termostato de destino. Primero rechaza las temperaturas que quedan fuera del mínimo y máximo del termostato. Después, los valores que están dentro de esos límites pueden redondearse al paso de temperatura admitido, incluso cerca de un límite del intervalo. Esta comprobación también se aplica a los presets compartidos y las plantillas vinculadas: una configuración compartida incompatible impide guardar la operación afectada. Ajusta la temperatura o elige un destino compatible antes de volver a intentarlo.

<a id="export-does-not-download-on-mobile"></a>

## La exportación no se descarga en móvil

Por ahora, la exportación solo se muestra en escritorio porque las aplicaciones complementarias móviles gestionan las descargas de forma inconsistente. La importación sigue disponible tanto en escritorio como en móvil.

<a id="scheduler-does-not-apply-after-restart"></a>

## El programador no aplica el horario tras reiniciar

Por defecto, Velair restaura el estado sin forzar los equipos de climatización después de iniciar Home Assistant.

Activa **Aplicar la planificación activa al arrancar** en Ajustes si quieres que Velair aplique el horario activo después de reiniciar.

<a id="reset-to-defaults"></a>

## Restablecer los valores predeterminados

Utiliza **Ajustes > Mantenimiento > Restablecer Velair**. Esto elimina todos los datos guardados de Velair, incluidos horarios, plantillas, preferencias del panel, refuerzos y pausas activos, ajustes de Confort y Room Assist, ajustes y aprendizaje del Preacondicionamiento adaptativo y comportamiento al iniciar. Después vuelve a crear los valores predeterminados correspondientes a la unidad de los equipos gestionados actualmente.

Exporta primero si puedes necesitar recuperar los datos existentes.

<a id="temperature-unit-requires-attention"></a>

## La unidad de temperatura requiere atención

Velair lee la unidad de temperatura de Home Assistant. Si Ajustes indica que la unidad guardada y la de Home Assistant difieren, la programación automática y la escritura de valores térmicos permanecen detenidas para evitar aplicar un objetivo antiguo con un significado incorrecto.

- Si Velair ofrece migrar las temperaturas guardadas, comprueba que todos los valores siguen utilizando la unidad de origen indicada y ejecuta la migración una sola vez. Si no la ejecutas, la programación permanece detenida; Velair nunca convierte los datos silenciosamente.
- Si actualizar datos antiguos publicados en Celsius requiere un restablecimiento, exporta antes una copia de referencia si resulta útil y utiliza **Restablecer Velair** para crear valores predeterminados en la unidad actual de Home Assistant.
- Si se guardó un restablecimiento, migración o importación, pero falló la recuperación de ejecución, recarga la integración Velair o reinicia Home Assistant. Velair permanece detenido hasta recuperarse.

Si un horario aparece como incompatible cuando un equipo vuelve a estar disponible, compara el objetivo con su intervalo publicado y paso efectivo de temperatura. Cuando falta `target_temp_step`, configura el paso real del dispositivo en su fila de Ajustes. El campo muestra el último paso válido que Velair recuerda, después el valor manual alternativo guardado o `1` si no existe ninguno. Guardar un valor manual mientras falta el atributo sustituye la observación recordada. El valor manual no se utiliza, pero se conserva, cuando Home Assistant publica un paso válido.

Las copias antiguas sin unidad registrada se aceptan como Celsius. La pantalla de importación muestra esa suposición y convierte los valores térmicos seleccionados cuando la unidad actual de Home Assistant es Fahrenheit.

Consulta [Unidades de temperatura y migración](temperature-units.es.md) para ver la guía completa de decisiones y el comportamiento de las copias de seguridad.
