# Environmental Comfort

The default comfortable temperature range is `20–24 °C` or the practical
whole-degree default `68–75 °F` for Fahrenheit installations.

Comfort thresholds use Home Assistant's configured temperature unit and migrate
or import with the rest of Velair's stored thermal data. A temperature sensor
that declares the other unit is converted before its reading is compared with
the managed climate's Comfort thresholds.

Environmental Comfort gives each managed climate a readable description of the room instead of a generic warning level.

It monitors locally available temperature, humidity, and CO2 readings. It does not change schedules or control devices automatically. Velair exposes the assessment in the panel, Lovelace cards, and Home Assistant events so automations can decide what to do.

## Sources

Temperature uses the first available source in this order:

1. the temperature sensor selected in the Comfort tab;
2. the Room Assist sensor configured for that climate;
3. the climate entity's `current_temperature`.

Humidity uses:

1. the humidity sensor selected in the Comfort tab;
2. the climate entity's `current_humidity` or `humidity` attribute, when available.

The default `Use automatic source` option keeps this automatic behavior. Select `Do not monitor humidity` when humidity should not influence that climate's environmental condition or data quality. The saved sensor selection is retained, but Velair does not read or listen to it while humidity monitoring is disabled.

CO2 is monitored only when a CO2 sensor is selected.

The effective entity ID appears below every selector. Optional metrics without a source are not treated as failures.

## Comfort Models

Velair offers three ways to describe the temperature and relative-humidity area
that is useful for a room. This is a user-configured target, not a universal or
medical definition of comfort.

- **Simple** is the default. One temperature range and one humidity range form
  the familiar rectangular target area. Existing configurations keep this
  behavior unchanged.
- **Guided psychrometric range** uses one humidity range as the reference at
  the midpoint of the configured temperature range. Velair follows the
  physical relationship between temperature and relative humidity to adapt
  that range automatically. The graph shows the resulting curved target rather
  than a rectangle. This is practical local guidance, not a complete
  physiological comfort standard.
- **Custom range by temperature** keeps the same temperature range but lets humidity use
  different minimum and maximum values at its cooler and warmer ends. Velair
  joins those two humidity ranges gradually, so the target area becomes a
  sloped four-sided shape instead of a rectangle.

For example, a room configured for `20–24 °C` can accept `40–60%` at `20 °C`
and `35–50%` at `24 °C`. At `22 °C`, Velair evaluates humidity against the
midpoint: `37.5–55%`. Below or above the configured temperature interval it
uses the nearest endpoint rather than extrapolating beyond the user's values.

The current effective humidity range appears below the map. The same
backend-calculated range drives the displayed condition, range summary,
Environmental condition entity, events, Diagnostics, and optional outdoor
guidance; clients do not calculate a second interpretation. If the current
temperature is missing or stale, Velair can still display a current humidity
reading but does not classify it or produce humidity guidance until the
effective range can be calculated.

Guided mode requires a humidity source that Velair can identify, either from the
managed climate or from a selected Home Assistant sensor. The option remains
unavailable until one is identified. If that source is temporarily unavailable,
Velair retains the selected model and settings and waits for current data
instead of switching models.

The two custom endpoint humidity ranges may rise, fall, or remain equal as temperature
changes. Velair does not impose a direction because buildings and occupants
differ. Guided is the compact choice when the same relative-humidity percentage
should not be treated identically at every temperature. Use Custom only when
the room's measured behavior gives a clear reason to control both endpoints.

Before those endpoint ranges are customized, changing the Simple humidity
range keeps both endpoints aligned with it. Once a temperature-aware range has
been customized, Velair retains it while switching between models so an
alternative setup is not lost.

## Additional Environmental Information

The Comfort configuration can optionally add three readings to the information
Velair already has for a managed climate:

| Reading | What it adds inside Velair |
| --- | --- |
| **Dew point** | A compact indication of how close the air is to condensation conditions. It does not establish that condensation will occur because Velair does not know the temperature of walls, windows, or other surfaces. |
| **Absolute humidity** | The mass of water vapour per cubic metre of air, displayed in `g/m³`. Unlike relative humidity, it is not expressed as a percentage of the air's saturation level. Velair does not apply a universal good/bad range to it. |
| **Humidex** | An additional perceived-heat value derived from temperature and humidity. Velair displays the value but does not turn its published bands into recommendations or use it as a complete indoor-comfort score. |

Enable only the readings that help your dashboard or automations. They are not
required for the normal Comfort condition, and every one is disabled by
default.

The expanded climate view separates current information from setup controls.
Enabled readings appear in a compact responsive group directly below the
temperature/humidity map and CO2 scale. Each item contains its current value or
availability state and accessible information help; it never contains a switch
or source selector. Disabled readings leave no empty visual card or grid slot.

All setup controls are grouped in **Comfort configuration**, which is closed by
default so the current assessment remains the focus. Its compact sections
separate data sources, the Comfort model, model-specific preferences,
recommendations, and additional environmental information. Derived-metric controls contain only their enable
switch and source selection, not a duplicate current reading. The configuration
panel remains available while Comfort monitoring is disabled, so a climate can
be prepared before enabling it. Opening or closing this panel is a local UI
choice and is not saved as configuration.

Every metric is disabled by default and has one source selector. Its first
option is **Calculated by Velair**; the remaining options are compatible Home
Assistant sensors, so an external reading does not require a second entity
control:

- **Calculated by Velair** uses the effective Comfort temperature and humidity
  readings already selected for that climate. If humidity is not monitored or
  either input is unavailable, the calculated reading is reported as missing.
- **Home Assistant entity** reads an existing `sensor.*` entity. This can come
  from Thermal Comfort, a template, or another integration; Thermal Comfort is
  neither required nor detected specially.

An external dew-point sensor must publish `°C` or `°F`. Velair displays it in
the managed climate's temperature unit. An absolute-humidity sensor must
publish `g/m³` or `mg/m³`; Velair displays `g/m³`. A Humidex sensor may publish
the common `°C` or `°F` representation used by temperature-class entities, or a
unitless value. Velair normalizes it to the canonical unitless Humidex value,
including in Fahrenheit installations.
Velair normalizes valid readings and reports missing, stale, or invalid sources
without changing the existing environmental condition or data-quality result.
An enabled external metric may be saved without selecting an entity yet; that
valid incomplete state is reported as missing and survives export/import.
Home Assistant `unknown` and `unavailable` states are missing, while non-numeric
values, incompatible units, and negative absolute humidity are invalid.

These metrics are observational. They never change a schedule, HVAC mode,
target, Room Assist adjustment, or preconditioning decision. In particular,
Humidex complements the real temperature and humidity readings rather than
replacing either one, avoiding humidity being counted twice.

## Comfort insights

Velair keeps the configured temperature/humidity condition as the main summary
and groups compact context cards above the readings. They explain CO2 threshold
crossings, a meaningful Humidex increase, and any current ventilation
opportunity or trade-off without repeating the condition or replacing the map
or CO2 scale.

The wording is cautious. Humidex appears as an insight only when perceived heat
is at least 1 °C above air temperature. Elevated or poor CO2 can also add an
insight. Dew point and absolute humidity remain useful readings rather than
permanent messages: their information button explains the potential
surface-condensation threshold and the amount of water vapour respectively.
The help is available by pointer hover, keyboard focus, or tap on touch screens.
Missing, stale, and invalid readings are ignored. Outdoor data does not change
the indoor condition or climate control.

Current values appear in the expanded climate row of the **Comfort** tab. The
Comfort Lovelace view uses the same presentation. When Comfort is enabled in a
single-climate Velair card, the expanded Comfort summary includes each enabled,
current derived reading. The card editor can also include those readings in the
collapsed Current state Comfort row when a dashboard needs denser information.
Missing, stale, and invalid readings remain visible in the Comfort view with
their status instead of presenting an old or invented number. Humidex is shown
beside room temperature with a directional comparison;
in Fahrenheit, only the difference is scaled, so it is never offset by 32.
Deltas also appear in the contextual Humidex message using the zone unit and
one decimal place. Humidex itself is a unitless, Celsius-referenced apparent-
heat index: it is not a physical temperature and Velair does not append a unit
to its value.

When Humidex is current, its panel also shows a compact comparison scale. The
two markers identify the room-air temperature and Humidex, while the highlighted
band is the temperature range configured for that climate. The status says
whether Humidex is below, within, or above that range; it does not claim that
the room is comfortable or dangerous. The scale extends 5 °C below and above
the configured range so nearby differences remain readable. In Fahrenheit,
the absolute scale labels are converted normally while the difference is only
multiplied by `9 / 5`; the Humidex number itself remains unitless. Missing or
invalid data shows no invented position.
Dew point is described neutrally as being above or below room air. Absolute
humidity remains a neutral `g/m³` reading. Their definitions stay behind the
accessible information buttons so the panels remain compact.

The main summary always leads with the physical Environmental condition, using
the configured temperature and humidity readings. When Humidex is enabled and
disagrees with the room-air temperature range position, a second **Humidex**
chip shows whether perceived heat is below, within, or above the configured
temperature range. This keeps the physical condition visible instead of
replacing it with a derived interpretation. The Humidex panel explains the
measured difference without calling the room hot, cold, or comfortable.
Missing or invalid derived data never changes the physical condition.

The compatible Environmental condition value described below does not change.
Existing automations can continue to use it; Humidex and the range summary are
additional observational context and never control the climate.

## Indoor vs outdoor

Optional outdoor comparison adds context without changing the indoor Comfort
condition. Enable **Outdoor comparison** inside the collapsed **Comfort
configuration** panel, select an explicit outdoor temperature sensor, and
optionally select an outdoor humidity sensor. Turning the comparison off keeps
those sensor choices so it can be enabled again without reconfiguration.

The runtime panel stays separate from the graph. It shows indoor and outdoor
temperature with their difference, indoor and outdoor absolute humidity, and
the relative humidity the outdoor air would have after reaching the current
indoor temperature. The two areas are symmetric on wider screens and stack on
mobile.

Both absolute-humidity values come directly from the backend. If an older
backend does not provide the indoor value, the UI shows it as unavailable
instead of reconstructing a physical reading from rounded differences.

Velair can show one cautious, backend-provided ventilation opportunity or
trade-off in the shared insight area above the readings. A temperature-only
opportunity explicitly says that the humidity impact is unavailable. Missing,
stale, invalid, and unmonitored readings appear as states rather than reused
values or false comparisons.

Velair also creates one **Ventilation opportunity** enum sensor per managed
climate. It keeps the current result available to dashboards and automations
after restart without changing the compatible Environmental condition state.
See [Ventilation Opportunity](zone-sensors.md#ventilation-opportunity).

**Ventilation guidance** in the same configuration panel lets each climate
choose how large a useful difference must be before Velair shows that context:

| Setting | Default | What it filters |
| --- | --- | --- |
| Temperature difference | `1 °C` / `1.8 °F` | Small indoor-versus-outdoor temperature differences. |
| Adjusted humidity difference | `5` percentage points | Small projected relative-humidity changes after outdoor air reaches indoor temperature. |
| Air-moisture difference | `1 g/m³` | Small absolute-humidity differences that could otherwise look useful because of temperature alone. |

The humidity controls appear after an outdoor humidity sensor is selected.
Their values are retained if that sensor or the comparison is later disabled.
Lower values make guidance more sensitive; higher values require a clearer
difference. These margins do not replace the configured Comfort ranges: the
outdoor air must still move the room toward the relevant range.

This feature is visual and event-driven. It does not open or close windows and
does not change a climate target, mode, schedule, pause, or boost. Velair uses
only the selected `sensor.*` entities and does not fall back to weather data.

Velair does not create three additional proxy sensor entities. The enabled
readings are available under the `derived_metrics` attribute of the existing
zone **Environmental condition** sensor, in the schedule API, Diagnostics, and
the `comfort_assessment_changed` event. This keeps one source of truth while
still allowing dashboards and automations to consume the data.
See [Environmental Condition](zone-sensors.md#environmental-condition) for its
complete states, attributes, defensive templates, and guidance on choosing the
entity or the event for an automation.

## Environmental Conditions

Temperature and humidity are classified against the configured ranges and combined into one compatible environmental condition:

| Temperature | Humidity | Condition |
| --- | --- | --- |
| Below range | Below range | `Cold and dry` |
| Below range | In range | `Cold` |
| Below range | Above range | `Cold and humid` |
| In range | Below range | `Dry air` |
| In range | In range | `Comfortable` |
| In range | Above range | `Humid` |
| Above range | Below range | `Hot and dry` |
| Above range | In range | `Hot` |
| Above range | Above range | `Hot and humid` |

When only one useful metric is available, Velair reports what it can establish without claiming full comfort:

- `Temperature in range`;
- `Humidity in range`;
- `Cold`, `Hot`, `Dry air`, or `Humid`.

If no useful environmental reading exists, the condition is shown as `No readings`. When every monitored source is stale, it is shown as `Readings outdated`.

## Air Quality

CO2 remains separate from temperature and humidity because it describes air quality rather than thermal comfort:

- `Good air`: below the attention threshold;
- `CO2 elevated`: at or above the attention threshold;
- `Poor air quality`: at or above the poor threshold;
- `CO2 unavailable`: a configured CO2 source cannot currently be read.

A room can therefore show, for example, `Hot and humid` together with `CO2 elevated`.

## Data Quality

Velair exposes one data-quality value:

- `complete`: every monitored metric has a current reading;
- `partial`: an assessment is available, but at least one monitored reading is missing or stale;
- `stale`: no current reading exists and every monitored source is stale;
- `unavailable`: no current reading can be used for another reason.

The interface shows a compact warning icon for non-complete data. Its tooltip identifies the affected readings.

## Visual Status

The collapsed climate row shows:

- the environmental condition;
- a separate Humidex chip only when current temperature and Humidex occupy
  different parts of the configured range;
- optional derived-reading chips for Humidex, dew point, and absolute humidity
  when the single-climate card editor enables extra collapsed readings;
- air quality when CO2 is monitored;
- a warning icon when readings are incomplete;
- the Comfort on/off switch.

The expanded live status uses:

- the same physical environmental condition as its primary heading;
- a temperature/humidity map when both readings are current;
- a single horizontal scale when only temperature or humidity is current;
- a separate CO2 scale when CO2 is monitored and current.

The temperature/humidity map uses nine subtle regions for the cold, hot, dry, humid, and combined conditions. Its highlighted target always follows the selected model: a rectangle for Simple, a backend-calculated curve for Guided, and the configured polygon for Custom. A small marker shows the current position and its label contains both readings.

On single-metric scales, the center green section is the configured comfort range. Its minimum and maximum labels align with the beginning and end of that section; the outer sections provide context for readings below or above the range.

## Lovelace

The Comfort view is available as a Lovelace card:

```yaml
type: custom:velair-card
view: comfort
```

The card can be limited to selected managed climates:

```yaml
type: custom:velair-card
view: comfort
entities:
  - climate.living_room
  - climate.bedroom
```

It can also hide local UI sections when a dashboard should focus only on the
readings you care about:

```yaml
type: custom:velair-card
view: comfort
show_comfort_configuration: false
show_comfort_temperature: true
show_comfort_humidity: false
show_comfort_co2: true
```

Omitted `show_comfort_*` options default to `true`. When
`show_comfort_configuration` is `false`, the card hides the complete setup panel
but keeps the enabled derived readings in the visual assessment.

Temperature, humidity, and CO2 visibility options only affect the graphs shown
in that Lovelace card. They do not change the Comfort configuration, source
selection, thresholds, automation events, or Home Assistant sensors. If both
temperature and humidity are visible but only one current reading exists, the
card falls back to the same single-metric scale used by the main Velair panel.

## Freshness

`Stale after` is the maximum age of the Home Assistant `last_updated` timestamp used by a monitored source.

Velair does not poll sensors and does not run an expiry loop. It reevaluates Comfort when a tracked entity changes, settings change, or the current state is requested.

Repeating the same displayed value only refreshes the reading if Home Assistant advances `last_updated` and exposes a state change. Some integrations keep `last_updated` unchanged when both state and attributes are identical.

## Automation Event

When the environmental condition, air quality, data quality, data issues, or an
enabled derived metric's semantic state changes, Velair emits:

```yaml
event_type: velair_event
event_data:
  event: comfort_assessment_changed
```

Example payload:

```json
{
  "domain": "velair",
  "event": "comfort_assessment_changed",
  "entity_id": "climate.living_room",
  "condition": "cold_and_humid",
  "air_quality": "elevated",
  "data_quality": "complete",
  "data_issues": [],
  "range_summary": {
    "status": "outside_range",
    "thermal_relation": "not_evaluated",
    "positions": {
      "temperature": "below",
      "humidity": "above",
      "humidex": null
    }
  },
  "previous_range_summary": {
    "status": "within_range",
    "thermal_relation": "not_evaluated",
    "positions": {
      "temperature": "within",
      "humidity": "within",
      "humidex": null
    }
  },
  "range_summary_changed": true,
  "range_status_changed": true,
  "temperature": {
    "metric": "temperature",
    "availability": "current",
    "condition": "cold",
    "source": "sensor",
    "entity_id": "sensor.living_room_temperature",
    "value": 18.7,
    "min": 20.0,
    "max": 24.0
  },
  "humidity": {
    "metric": "humidity",
    "availability": "current",
    "condition": "humid",
    "source": "sensor",
    "entity_id": "sensor.living_room_humidity",
    "value": 68,
    "min": 40,
    "max": 60
  },
  "co2": {
    "metric": "co2",
    "availability": "current",
    "condition": "elevated",
    "source": "sensor",
    "entity_id": "sensor.living_room_co2",
    "value": 1200,
    "attention": 1000,
    "max": 1500
  },
  "derived_metrics": {
    "dew_point": {
      "metric": "dew_point",
      "availability": "current",
      "source": "velair",
      "entity_id": null,
      "value": 12.9,
      "unit": "°C",
      "issues": [],
      "input_entity_ids": [
        "sensor.living_room_temperature",
        "sensor.living_room_humidity"
      ]
    }
  }
}
```

Example automation:

```yaml
automation:
  - alias: "Velair poor air quality"
    triggers:
      - trigger: event
        event_type: velair_event
        event_data:
          event: comfort_assessment_changed
          air_quality: poor
    actions:
      - action: notify.mobile_app_phone
        data:
          message: >
            Poor air quality in {{ trigger.event.data.entity_id }}:
            {{ trigger.event.data.co2.value | round(0) }} ppm
```

Opening or refreshing the panel does not emit an automation event. Numeric
movement in original or derived readings does not emit duplicates while their
semantic classifications and availability remain unchanged. The panel and
Home Assistant sensor attributes still refresh with the latest values.

Use `range_status_changed: true` when an automation should react only when the
aggregate configured-range status changes. Use `range_summary_changed: true`
when changes to individual positions or their thermal relationship also
matter. Other Comfort changes can emit this same event with both flags set to
`false`; the current and previous summaries make that transition explicit.

See [Automation Events](automation-events.md#comfort-assessment-changed) for a
complete payload, the exact derived fields that participate in that semantic
state, and the shared `velair_event` trigger pattern.

## Performance And Privacy

Comfort is disabled by default.

When disabled for a climate, Velair registers no Comfort listeners for that climate. When enabled, it listens only to the managed climate and the selected or automatically resolved sensor entities, including active external derived-metric sources. Native derived metrics reuse the existing temperature and humidity listeners. There is no continuous polling.

All readings and assessments remain local inside Home Assistant.
