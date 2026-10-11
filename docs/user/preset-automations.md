# Update shared presets from automations
<!-- velair-docs:start -->
Translations: [English original](preset-automations.md) · [Español](preset-automations.es.md) · [Français](preset-automations.fr.md) · [Deutsch](preset-automations.de.md) · [Italiano](preset-automations.it.md) · [Nederlands](preset-automations.nl.md) · [Polski](preset-automations.pl.md) · [Português (Brasil)](preset-automations.pt-br.md) · [Português (Portugal)](preset-automations.pt-pt.md) · [Русский](preset-automations.ru.md) · [Translation status](../translation-status.md)

---
<!-- velair-docs:end -->

Use `velair.update_block_preset` to change a saved Velair preset from a Home
Assistant automation or script. This edits the shared definition permanently:
every block referencing it receives the new configuration, including blocks in
templates and days following those templates' complete configuration.

It does not select a different preset for a block or activate a Profile. Use
Profiles or Modes when the automation should choose a different routine.

## Find the identifier

Open **Templates → Climate presets**, select a saved preset, and copy its
**Automation ID**. Use that value as `preset_key`; renaming the preset
does not change its identifier. The examples below use illustrative identifiers.
Replace them with your own copied values.

## Update or replace

The default `operation: update` changes only the fields you send and preserves
the preset's action and other settings. Do not send `action` in this operation.

`operation: replace` replaces the entire climate configuration. Send `action`
and all settings that should remain. This is how to switch between a temperature
action, mode-only, additional-settings-only, and Off. The preset's name,
identifier, and position in the library remain unchanged.

| Field | Meaning |
|---|---|
| `preset_key` | Required identifier of an existing Velair preset. |
| `operation` | `update` (default) or `replace`. |
| `action` | Required for `replace`, forbidden for `update`. Use `set_temperature`, `set_hvac_mode`, `set_climate_options`, or `turn_off`. |
| `temperature` | Single temperature target, in Velair's declared temperature unit. |
| `target_temp_low`, `target_temp_high` | Native range target; always send both limits together. |
| `hvac_mode` | HVAC mode, subject to the selected action's rules. |
| `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode`, `humidity` | Optional device settings, subject to the selected action's rules. |
| `clear_fields` | For `update` only: list of climate parameters to remove. |

Sending a scalar target removes a previous range; sending a complete range
removes a previous scalar target. Never send both in one call. Removing a
required target or the last setting from an options-only preset is invalid.
Use `replace` when changing the action itself.

Omitting a field in `update` preserves it. Empty strings and `null` are not
instructions to remove a setting; use `clear_fields`. A field cannot be both
set and cleared in the same call. Removing a device setting stops sending that
command; it does not reset that setting on the thermostat.

The standard Home Assistant action form defines the changes to make each time
the automation runs. It does not load the preset's current values into the form.
Less frequently used parameters are grouped into collapsed sections.

## Example: adjust heating comfort to outdoor temperature

**Situation:** Living room and Study both use the Velair preset **Heating comfort**,
configured for Heat at 21 °C with a quiet fan. You want 21 °C in cold weather and
19 °C in milder weather, keeping its mode and fan settings.

This automation evaluates on Home Assistant startup and changes to the outdoor
sensor. Below 10 °C it sets 21 °C; above 12 °C it sets 19 °C. Between those
thresholds it keeps the previous target. The gap prevents repeated switching
around a single threshold. If the sensor is unavailable, it makes no change.

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

The example assumes Velair and the outdoor sensor use °C. For Fahrenheit, choose
equivalent thresholds and targets in the appropriate units. The service never
converts the outdoor sensor value for this automation.

Both rooms retain their own schedules. If Heating comfort is active and Velair
has automatic control, its target changes after saving. If its next block is in
the future, Velair recalculates the scheduled events and Preconditioning plan.
Repeated calls with an unchanged configuration do not write storage or issue
commands.

## Example: update a native range

**Situation:** a thermostat supporting Heat/cool ranges uses **Home range**.
Change its target to 19–25 °C, preserving its mode and device options:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_home_range
  target_temp_low: 19
  target_temp_high: 25
```

Send both limits even if only one changes. A scalar-only thermostat cannot use
this preset. Velair does not infer a compatible scalar or a missing range limit.

## Example: change or remove a device setting

To change only the fan setting while preserving the temperature and HVAC mode:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  fan_mode: auto
```

To stop including a fan command in that preset:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  clear_fields:
    - fan_mode
```

`preset_mode` refers to a **device preset**, such as `eco` or `sleep`. It is a
parameter within the Velair preset, not the identifier of another Velair preset.

## Example: replace with Off and restore explicitly

Replace a saved preset's configuration with Off:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  operation: replace
  action: turn_off
```

To restore Heat at 21 °C with a quiet fan, explicitly replace it again:

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

There is no timed expiry or automatic restoration. Off affects every saved
reference to this preset. For an open window or a temporary per-room suspension,
prefer an owned [zone pause](usage.md#services), which leaves the shared preset
unchanged.

## Validation and runtime behavior

- Velair validates every saved consumer, including inactive Profiles and Default
  schedules hidden by a Profile. An incompatible consumer rejects the whole
  update; nothing is partially saved.
- Supported optional settings may be filtered per thermostat using the existing
  adaptation rules. Temperature limits, action compatibility, and external
  controller restrictions still apply.
- Boost, Pause, Manual adjustment, and Stop keep their authority. Updating a
  preset does not cancel them. On resuming automatic control, Velair uses the
  latest saved settings.
- An active automatic change applies after saving; a future-only change does
  not needlessly send a command now. Preconditioning and Room Assist are
  reconciled when their target or source changes. Mode-only, options-only, and
  Off actions do not gain temperature anticipation.
- External controllers receive updated resolved weeks when their effective
  schedules change. A publication failure does not enable local execution.
- Unknown identifiers, invalid combinations, incompatible consumers, and a
  pending temperature-unit migration produce errors. Device delivery failures
  after persistence do not undo the saved preset.

Environmental thresholds, hysteresis, forecast interpretation, and when to
restore a setting belong to Home Assistant automations. The service creates no
weather rules or polling inside Velair. The
[seasonal climate selection blueprint](blueprints/seasonal-climate-selection.md)
can select Modes or run these services after a temperature remains stable for a
configured delay. Choose Modes when winter and summer should retain separate
preset definitions; updating a preset changes all its consumers.

See [Block presets and linked templates](linked-schedules.md) for shared-resource
scope and [Practical examples](linked-schedule-examples.md) for complete household
setups.
