# Seasonal climate selection
<!-- velair-docs:start -->
Translations: [English original](seasonal-climate-selection.md) · [Español](seasonal-climate-selection.es.md) · [Français](seasonal-climate-selection.fr.md) · [Deutsch](seasonal-climate-selection.de.md) · [Italiano](seasonal-climate-selection.it.md) · [Nederlands](seasonal-climate-selection.nl.md) · [Polski](seasonal-climate-selection.pl.md) · [Português (Brasil)](seasonal-climate-selection.pt-br.md) · [Português (Portugal)](seasonal-climate-selection.pt-pt.md) · [Русский](seasonal-climate-selection.ru.md) · [Translation status](../../translation-status.md)

---
<!-- velair-docs:end -->

Run your chosen actions after a temperature sensor changes and keeps its new value for a configurable delay. Select winter, mild-weather, or summer Modes without duplicating schedules or placing weather rules inside Velair. Invalid sensor readings produce an immediate Home Assistant notification.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fseasonal_climate_selection.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Open Home Assistant and import the Seasonal climate selection blueprint" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/seasonal_climate_selection.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="View the Seasonal climate selection YAML source"></a>
</p>

[View changelog](../../../blueprints/changelogs/seasonal_climate_selection.md) · [Back to the blueprint index](../blueprints.md)

## When to use it

Use this blueprint when Home Assistant already exposes a daily forecast maximum, outdoor measurement, or average temperature as one numeric temperature sensor. It chooses which actions to run; Velair continues to own schedules, presets, Preconditioning, and device delivery.

For a sensor updated once a day, one stable update can choose the day's routine. For a frequently changing outdoor or average sensor, choose the delay carefully: every new value restarts the wait. A sensor updated every five minutes may never complete a 30-minute wait.

## Requirements

- Blueprint version 1.0.0 and Home Assistant 2024.6.0 or newer.
- One numeric sensor with temperature device class and a declared unit of °C or °F.
- Velair is needed only for actions using its entities or services. Standard scripts and other Home Assistant actions work without Velair.
- Prepare the forecast sensor separately if your weather provider exposes forecasts rather than a numeric sensor. This blueprint does not retrieve forecasts.

Modes and the native Velair Mode selector are available in Velair 1.6.0 or newer. Shared presets and linked templates are optional: the seasonal selector can also choose Modes built from independent schedules.

## Configuration

| Field | Purpose |
|---|---|
| Temperature sensor | The existing sensor to watch |
| Temperature unit for thresholds | °C or °F; sensor readings are converted for comparison |
| Winter threshold | Values below this threshold run winter actions; default 20 |
| Summer threshold | Values above this threshold run summer actions; default 27 |
| Winter / Mild-weather / Summer actions | Standard Home Assistant action sequences; initially empty |
| Stability delay | How long the new numeric temperature must remain unchanged; default 30 minutes |
| Language for diagnostic notifications | Any language supported by Velair for persistent sensor and configuration warnings; English by default |

The winter threshold must be lower than the summer threshold and the delay must be positive. Threshold numbers are not automatically changed when you choose Fahrenheit: enter the intended Fahrenheit thresholds yourself.

These two choices are explicit because Home Assistant does not expose its global temperature-unit or language preferences to blueprint templates. The browser user's language is not an automation setting either. The sensor's declared unit is read automatically and converted to your chosen threshold unit; diagnostic notifications use the language selected here.

The language selector changes diagnostic notification text only. The blueprint's form labels and descriptions remain in English; it does not translate the Home Assistant configuration form.

An empty action sequence does nothing. It does not turn off a climate, suspend Velair, or select Default.

## Example

### Daily maximum and three Modes

Create Invierno, Entretiempo, and Verano Modes in Velair. Map Invierno and Verano to their respective Profiles. Configure Entretiempo with a Profile whose relevant zones use **Pause → Turn climate off** if mild weather should disable climatization.

In each blueprint action sequence, add Home Assistant's **Select: Select** action, choose the visible Velair Mode entity, and select its option from the editor. Do not assume that your entity has the example ID below.

```yaml
service: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Invierno
```

With thresholds 20 and 27 °C, a daily maximum changing to 18 °C runs winter actions after 30 unchanged minutes. A subsequent update to 23 °C runs mild-weather actions; 30 °C runs summer actions. Exactly 20 or 27 °C belongs to mild weather. Each changed value can execute, including 18 → 19 °C within winter.

### Shared hours, different indoor temperatures

Link the Invierno and Verano Profile schedules to the same daily template using **Hours only**. Assign winter presets such as Heat at 21 °C and summer presets such as Cool at 25 °C. Moving the template's 07:00 slot changes both schedules; selecting a Mode chooses the corresponding targets. The blueprint does not edit the presets or template. See [practical linked-schedule examples](../linked-schedule-examples.md).

### Average temperature and Fahrenheit

An average sensor may change several times an hour. With a ten-minute delay, updates at 10:00 and 10:07 postpone the decision until 10:17, provided no new value arrives. If it keeps changing before ten minutes pass, no seasonal actions run.

A Fahrenheit sensor can use Celsius thresholds because the reading is converted. Alternatively, select °F and enter thresholds such as 68 and 80.6 °F, equivalent to 20 and 27 °C. A value of 77 °F then selects mild-weather actions.

### Alternative script or service

Each branch accepts normal Home Assistant actions. For example, run a household script in the summer branch:

```yaml
service: script.turn_on
target:
  entity_id: script.summer_climate_routine
```

Direct Profile activation is also possible with `velair.activate_profile` and the Profile's stable ID. To modify shared settings instead of choosing a Mode, see [preset automations](../preset-automations.md); consider all consumers of a shared preset before changing it.

## How it works

A state trigger detects a changed numeric temperature, then Home Assistant's native interruptible wait checks that it remains stable for the configured delay. A genuine numeric change interrupts the pending decision and starts a new wait, including a change back to a previous value: `21 → 22 → 21` starts a fresh delay at the final 21. A formatting-only update such as `21` to `21.0` neither starts another decision nor interrupts one already waiting. Attribute-only updates do not start seasonal actions. Before actions begin, the blueprint rechecks the current numeric reading, its unit, thresholds, delay, and the continuity of the wait.

An invalid reading or unit immediately interrupts a pending decision, even when only the unit attribute changes. Restoring the unit alone dismisses the diagnostic but does not select a season; another numeric state change is required. Recovery from an invalid numeric state such as `unavailable` to a valid number starts a fresh delay.

Home Assistant startup checks diagnostics only. It does not choose a seasonal Mode. Pending timers do not survive a restart or automation reload; another sensor state change is needed afterward. There is no periodic or once-daily trigger and no helper holding the last classification.

If the selected sensor entity is initially absent and appears later with a valid reading, that first reading counts as recovery and starts the complete stability wait. The same applies when a removed sensor is recreated. This is a sensor transition after startup, not a seasonal action caused by the startup event itself.

Sensor validation runs separately from the seasonal wait. An absent entity, `unknown`, `unavailable`, a non-finite or non-numeric value, or an unsupported unit immediately creates one automation-scoped persistent notification in the selected language. The notice identifies the automation and sensor and explains that seasonal actions are suspended. Recovery dismisses the sensor warning; recovery to a valid numeric state starts a fresh stability wait, whereas unit-only recovery updates diagnostics only. Invalid configuration uses a separate notification.

For example, a sensor becoming unavailable at 09:00 warns immediately, not at 09:30. Recovery to 25 °C at 09:10 permits mild-weather actions at 09:40 if it remains unchanged.

## Safety and precedence

Selecting a Velair Mode or Profile uses its block policies. **Temperature
only** updates the target without requesting an HVAC mode change; use explicit
**Heat** or **Cool** blocks when selecting a season should start the equipment.
The policy does not suppress direct HVAC actions configured in the blueprint.

While the sensor is invalid, the blueprint makes no new seasonal selection; it does not turn off devices automatically. The previously selected Mode and its schedule remain in place. Respond to the notification if that behavior is unsuitable for your home.

Configured actions use normal Home Assistant semantics and traces. An action error does not roll back earlier actions. The blueprint cannot generically verify that an arbitrary action selected the intended routine or reached a physical device.

A stable new reading may replace a manually selected Away Mode. Coordinate seasonal and presence automations rather than letting both select competing Modes. For example, a household script can choose an Away Mode when nobody is home and select the seasonal occupied Mode only when presence permits it.

Velair's existing Mode/Profile behavior remains applicable, including pause priority and Boost cancellation in affected zones. Preconditioning recalculates from the effective schedule selected by the action; it cannot anticipate a seasonal choice before it is made.

## Limitations

- Stability refers to the sensor value, not just its winter/mild/summer classification. Frequently changing sensors can postpone execution indefinitely.
- No automatic seasonal action on startup, daily schedule, polling, saved pending timer, additional 24 °C permission, or delayed switch-off.
- Notifications cannot detect a sensor that silently stops updating while retaining a valid number. Source freshness monitoring must be provided separately when needed.
- There is no hysteresis; the stability delay filters changes. A newly stable value in the same classification still executes its branch.
- Parallel execution is bounded. Long user action sequences can consume slots; keep actions short or hand work to scripts.
- A sequence that already started is not cancelled by a later reading. Checks protect its start, not every user-defined action.
- Renaming the automation can leave its former diagnostic notification for manual dismissal. Renamed or deleted Mode options must be updated in configured actions.

## Troubleshooting

- If nothing executes, check that the value actually changed and remained unchanged for the entire delay. Starting or reloading Home Assistant does not initiate a seasonal selection.
- If a warning appears, inspect the named sensor, numeric state, and `unit_of_measurement`. Unknown units are never guessed.
- If a timer never completes, inspect the sensor history and shorten the positive delay or use a daily maximum sensor.
- If the wrong branch runs, verify the selected threshold unit and both numeric thresholds.
- If mild weather leaves equipment running, configure an actual pause-and-off Mode; an empty action list is not an off command.
- If a Mode is not selected, test its action manually and inspect the automation trace. Select the current option name from the Home Assistant editor.
- If an import URL is unavailable before publication, use the YAML file from the checkout for testing. The public links work once the file is published on `main`.

## Updating and customizing

Import the blueprint explicitly; installing or updating Velair through HACS does not install it. Re-import the same rolling `main` URL for compatible updates. Version 1 preserves input names; new compatible inputs receive defaults. Breaking changes use a new filename and major version.

Home Assistant owns the resulting automation. Velair does not migrate automations or `.storage`. Use **Take control** for different logic, understanding that the independent automation stops receiving blueprint updates. See the [blueprint catalog](../blueprints.md) for shared distribution and update rules.
