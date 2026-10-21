<a id="update-shared-presets-from-automations"></a>

# Actualizar presets compartidos desde automatizaciones
<!-- velair-docs:start -->
Traducciones: [Original en inglés](preset-automations.md) · [Español](preset-automations.es.md) · [Français](preset-automations.fr.md) · [Deutsch](preset-automations.de.md) · [Italiano](preset-automations.it.md) · [Nederlands](preset-automations.nl.md) · [Polski](preset-automations.pl.md) · [Português (Brasil)](preset-automations.pt-br.md) · [Português (Portugal)](preset-automations.pt-pt.md) · [Русский](preset-automations.ru.md) · [Estado de las traducciones](../translation-status.md)

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

Utiliza `velair.update_block_preset` para modificar un preset de Velair guardado desde una automatización o script de Home Assistant. Esto modifica permanentemente la definición compartida: todos los bloques que la referencian reciben la nueva configuración, incluidos los bloques de plantillas y los días que siguen la configuración completa de esas plantillas.

No selecciona otro preset para un bloque ni activa un Perfil. Utiliza Perfiles o Modos cuando la automatización deba elegir una rutina distinta.

<a id="find-the-identifier"></a>

## Encontrar el identificador

Abre **Plantillas → Presets climáticos**, selecciona un preset guardado y copia su **ID de automatización**. Utiliza ese valor como `preset_key`; renombrar el preset no cambia su identificador. Los ejemplos siguientes utilizan identificadores ilustrativos. Sustitúyelos por los valores que hayas copiado.

<a id="update-or-replace"></a>

## Actualizar o sustituir

El valor predeterminado `operation: update` modifica solo los campos enviados y conserva la acción y los demás ajustes del preset. No envíes `action` con esta operación.

`operation: replace` sustituye toda la configuración climática. Envía `action` y todos los ajustes que deban conservarse. Así se cambia entre una acción de temperatura, solo modo, solo ajustes adicionales y Apagado. El nombre, identificador y posición del preset en la biblioteca no cambian.

| Campo | Significado |
|---|---|
| `preset_key` | Identificador obligatorio de un preset de Velair existente. |
| `operation` | `update` (predeterminado) o `replace`. |
| `action` | Obligatorio para `replace`, prohibido para `update`. Utiliza `set_temperature`, `set_hvac_mode`, `set_climate_options` o `turn_off`. |
| `temperature` | Temperatura objetivo única, en la unidad de temperatura declarada en Velair. |
| `target_temp_low`, `target_temp_high` | Intervalo objetivo nativo; envía siempre ambos límites juntos. |
| `hvac_mode` | Modo HVAC, sujeto a las reglas de la acción seleccionada. |
| `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode`, `humidity` | Ajustes opcionales del dispositivo, sujetos a las reglas de la acción seleccionada. |
| `clear_fields` | Solo para `update`: lista de parámetros climáticos que se retirarán. |

Enviar un objetivo único elimina un intervalo anterior; enviar un intervalo completo elimina un objetivo único anterior. Nunca envíes ambos en una misma llamada. No es válido retirar un objetivo obligatorio ni el último ajuste de un preset que solo contiene opciones. Utiliza `replace` para cambiar la propia acción.

Omitir un campo en `update` lo conserva. Las cadenas vacías y `null` no son instrucciones para retirar un ajuste; utiliza `clear_fields`. Un campo no puede establecerse y retirarse en la misma llamada. Retirar un ajuste del dispositivo deja de enviar esa orden; no restablece ese ajuste en el termostato.

El formulario estándar de acciones de Home Assistant define los cambios que se realizarán cada vez que se ejecute la automatización. No carga en el formulario los valores actuales del preset. Los parámetros menos utilizados se agrupan en secciones plegadas.

<a id="example-adjust-heating-comfort-to-outdoor-temperature"></a>

## Ejemplo: adaptar el confort de calefacción a la temperatura exterior

**Situación:** el salón y el despacho utilizan el preset de Velair **Confort de calefacción**, configurado en Calor a 21 °C con ventilador silencioso. Quieres 21 °C con tiempo frío y 19 °C con tiempo más templado, conservando el modo y los ajustes del ventilador.

Esta automatización evalúa el inicio de Home Assistant y los cambios del sensor exterior. Por debajo de 10 °C establece 21 °C; por encima de 12 °C establece 19 °C. Entre esos umbrales conserva el objetivo anterior. La separación evita cambios repetidos alrededor de un único umbral. Si el sensor no está disponible, no modifica nada.

```yaml
alias: Velair heating comfort by outdoor temperature
triggers:
  - trigger: homeassistant
    event: start
  - trigger: state
    entity_id: sensor.outdoor_temperature
conditions:
  - condition: template
    value_template: "{{ is_number(states('sensor.outdoor_temperature')) }}"
actions:
  - choose:
      - conditions:
          - condition: numeric_state
            entity_id: sensor.outdoor_temperature
            below: 10
        sequence:
          - action: velair.update_block_preset
            data:
              preset_key: preset_heating_comfort
              temperature: 21
      - conditions:
          - condition: numeric_state
            entity_id: sensor.outdoor_temperature
            above: 12
        sequence:
          - action: velair.update_block_preset
            data:
              preset_key: preset_heating_comfort
              temperature: 19
mode: queued
max: 10
```

El ejemplo supone que Velair y el sensor exterior utilizan °C. Para Fahrenheit, elige umbrales y objetivos equivalentes en las unidades correspondientes. El servicio nunca convierte el valor del sensor exterior para esta automatización.

Ambas habitaciones conservan sus propios horarios. Si Confort de calefacción está activo y Velair tiene el control automático, su objetivo cambia tras guardar. Si el siguiente bloque es futuro, Velair vuelve a calcular los eventos programados y el plan de Preacondicionamiento. Las llamadas repetidas con una configuración idéntica no escriben en el almacenamiento ni envían órdenes.

<a id="example-update-a-native-range"></a>

## Ejemplo: actualizar un intervalo nativo

**Situación:** un termostato que admite intervalos de Calor/frío utiliza **Intervalo de casa**. Cambia su objetivo a 19–25 °C, conservando su modo y las opciones del dispositivo:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_home_range
  target_temp_low: 19
  target_temp_high: 25
```

Envía ambos límites aunque solo cambie uno. Un termostato que solo admita un objetivo único no puede utilizar este preset. Velair no deduce un objetivo único compatible ni un límite ausente del intervalo.

<a id="example-change-or-remove-a-device-setting"></a>

## Ejemplo: cambiar o retirar un ajuste del dispositivo

Para cambiar solo el ajuste del ventilador conservando la temperatura y el modo HVAC:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  fan_mode: auto
```

Para dejar de incluir una orden de ventilador en ese preset:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  clear_fields:
    - fan_mode
```

`preset_mode` se refiere a un **Preset del dispositivo**, como `eco` o `sleep`. Es un parámetro dentro del preset de Velair, no el identificador de otro preset de Velair.

<a id="example-replace-with-off-and-restore-explicitly"></a>

## Ejemplo: sustituir por Apagado y restaurar explícitamente

Sustituye la configuración de un preset guardado por Apagado:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  operation: replace
  action: turn_off
```

Para restaurar Calor a 21 °C con ventilador silencioso, vuelve a sustituirla explícitamente:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  operation: replace
  action: set_temperature
  temperature: 21
  hvac_mode: heat
  fan_mode: quiet
```

No hay vencimiento temporizado ni restauración automática. Apagado afecta a todas las referencias guardadas a este preset. Para una ventana abierta o una suspensión temporal por habitación, es preferible una [pausa de zona](usage.es.md#services) con propietario, que conserva el preset compartido.

<a id="validation-and-runtime-behavior"></a>

## Validación y comportamiento en ejecución

- Velair valida todos los usos guardados, incluidos los Perfiles inactivos y las planificaciones Predeterminadas ocultas por un Perfil. Un uso incompatible rechaza toda la actualización; no se guarda parcialmente nada.
- Los ajustes opcionales admitidos pueden filtrarse por termostato mediante las reglas de adaptación existentes. Siguen aplicándose los límites de temperatura, la compatibilidad de la acción y las restricciones del controlador externo.
- Refuerzo, Pausa, ajuste manual y Detener mantienen su prioridad. Actualizar un preset no los cancela. Al reanudar el control automático, Velair utiliza los últimos ajustes guardados.
- Un cambio automático activo se aplica tras guardar; un cambio que solo afecta al futuro no envía innecesariamente una orden ahora. El Preacondicionamiento y Room Assist se ajustan cuando cambia su objetivo u origen. Las acciones de solo modo, solo opciones y Apagado no adquieren anticipación de temperatura.
- Los controladores externos reciben programaciones semanales completas actualizadas cuando cambian sus horarios efectivos. Un fallo de publicación no habilita la ejecución local.
- Los identificadores desconocidos, las combinaciones no válidas, los usos incompatibles y una migración pendiente de unidad de temperatura producen errores. Los fallos de envío de órdenes a los dispositivos posteriores al guardado no revierten el preset guardado.

Los umbrales ambientales, la histéresis, la interpretación de previsiones y el momento de restaurar un ajuste corresponden a las automatizaciones de Home Assistant. El servicio no crea reglas meteorológicas ni sondeo periódico dentro de Velair. El [blueprint de selección climática estacional](blueprints/seasonal-climate-selection.es.md) puede seleccionar Modos o ejecutar estos servicios una sola vez después de que la temperatura permanezca en un nuevo rango estacional durante un retardo configurado. Elige Modos si invierno y verano deben conservar definiciones de presets separadas; actualizar un preset cambia todos sus usos.

Consulta [Presets de bloques y plantillas vinculadas](linked-schedules.es.md) para el alcance de los recursos compartidos y [Ejemplos prácticos](linked-schedule-examples.es.md) para configuraciones completas del hogar.
