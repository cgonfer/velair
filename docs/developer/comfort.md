# Environmental Comfort Internals

Environmental Comfort converts local Home Assistant readings into three independent concepts:

- `condition`: combined temperature and humidity condition;
- `air_quality`: CO2 assessment;
- `data_quality`: completeness and freshness of monitored readings.

Optional `derived_metrics` are a separate observational projection. They do not
alter these three established concepts.

Runtime-only `insights` interpret usable indoor assessment data without changing
control behavior or persistence.

User-facing behavior and automation examples are documented in [Environmental Comfort](../user/comfort.md).

## Scope

Comfort is monitoring-only. It does not apply climate actions, change schedules, pause zones, or select HVAC options.

## Storage

Only settings are persisted under `zones[entity_id].comfort`:

```json
{
  "enabled": false,
  "temperature_entity_id": null,
  "humidity_enabled": true,
  "humidity_entity_id": null,
  "co2_entity_id": null,
  "temperature_min": 20.0,
  "temperature_max": 24.0,
  "humidity_min": 40.0,
  "humidity_max": 60.0,
  "comfort_model": "simple",
  "temperature_aware": {
    "at_temperature_min": {"minimum": 40.0, "maximum": 60.0},
    "at_temperature_max": {"minimum": 40.0, "maximum": 60.0}
  },
  "co2_attention": 1000,
  "co2_poor": 1500,
  "stale_after_minutes": 120,
  "outdoor_comparison_enabled": false,
  "outdoor_temperature_entity_id": null,
  "outdoor_humidity_entity_id": null,
  "ventilation_temperature_threshold": 1.0,
  "ventilation_humidity_threshold": 5.0,
  "ventilation_absolute_humidity_threshold": 1.0,
  "derived_metrics": {
    "dew_point": {"enabled": false, "source": "velair", "entity_id": null},
    "absolute_humidity": {"enabled": false, "source": "velair", "entity_id": null},
    "humidex": {"enabled": false, "source": "velair", "entity_id": null}
  }
}
```

Assessments are derived at runtime and are not stored as history. Disabling the
outdoor comparison preserves both selected sensor IDs for later reuse.

In the frontend, the collapsed **Comfort configuration** panel presents
`stale_after_minutes` under **Data freshness** first, followed by temperature,
humidity, CO2, and optional derived environmental metrics. This order keeps the
runtime-reading policy visible before individual sensor and threshold settings;
it does not change persistence or assessment behavior.

`temperature_min` and `temperature_max` are absolute temperatures stored in the
recorded runtime unit. Unit migration and portable import convert both values;
editable Comfort thresholds use the feature's valid half-degree grid after
conversion. Humidity and CO2 thresholds are unit-independent and are not part of
temperature conversion.

`ventilation_temperature_threshold` is a delta stored in the recorded runtime
unit. It uses `temperature_delta` during unit migration: `1 °C` becomes
`1.8 °F`, without an absolute-temperature offset. Its effective limits are
`0.1–10 °C` or `0.2–18 °F`. The relative-humidity and absolute-humidity guidance
thresholds remain `0.5–50` percentage points and `0.1–10 g/m³` in either
temperature unit.

Temperature readings from external sensors are converted from their declared
unit to the managed climate/Home Assistant temperature unit before assessment.
The climate entity's own `current_temperature` is already at that runtime
boundary and is not converted again.

### Comfort Range Models

`comfort_model` is `simple`, `guided`, or `temperature_aware`. Missing and legacy values
normalize to `simple`, preserving the established rectangular behavior.

`simple` projects the stored `humidity_min` and `humidity_max` at both
temperature endpoints. `guided` treats those values as relative-humidity
references at the midpoint of the configured temperature interval. It converts
that reference into constant vapour-pressure boundaries with the same Magnus
implementation used by Velair's environmental metrics, samples 17 points in
the backend, and projects the effective relative-humidity range at the current
temperature. All psychrometric calculations use Celsius internally.

`temperature_aware` instead reads the two complete
relative-humidity ranges under `temperature_aware`. Each boundary must satisfy
`0 <= minimum < maximum <= 100`. Partial public updates are deep-merged before
validation, so changing one endpoint or one limit cannot erase its siblings.
While both retained endpoints still equal the current Simple range, edits to
that Simple range synchronize both endpoints. Once either endpoint differs,
later Simple edits preserve the customized temperature-aware values.

`comfort_ranges.build_comfort_zone` is the single owner of runtime geometry. It
returns the configured temperature endpoints, model-owned plot points, and the
`effective_humidity_range`. For a current temperature `T`, it uses:

```text
ratio = clamp((T - temperature_min) / (temperature_max - temperature_min), 0, 1)
effective_limit = cold_limit + ratio * (warm_limit - cold_limit)
```

Minimum and maximum are interpolated independently. Clamping prevents
extrapolation outside user intent. The endpoint direction is unrestricted.
Temperatures in this projection use the managed climate's current runtime
temperature unit; relative humidity remains `%` and is never unit-converted.

When the temperature metric is not current, a guided or temperature-aware effective
range is `null`. A current humidity reading is retained with `condition: null`
and `effective_range_available: false`; it cannot affect the combined
condition, `range_summary`, insights, or outdoor guidance. Velair deliberately
does not fall back to the Simple range because that would silently evaluate a
different model from the one the user selected.

The effective range is reused by the humidity metric and outdoor comparison.
The resulting backend-owned `comfort_zone` is also projected through the
schedule API, Diagnostics, the Environmental condition entity, and
`comfort_assessment_changed`. Frontends draw every supplied point but never
reproduce psychrometric or interpolation policy.

## Metric Contract

Each metric payload contains:

```json
{
  "metric": "temperature",
  "availability": "current",
  "condition": "comfortable",
  "source": "sensor",
  "entity_id": "sensor.living_room_temperature",
  "value": 22.0,
  "min": 20.0,
  "max": 24.0
}
```

`availability` is one of:

- `current`;
- `missing`;
- `stale`;
- `invalid` for an enabled derived source with an unsupported unit or value;
- `not_monitored`.

## Derived Metrics

Native calculations use the effective current Comfort temperature and humidity.
The temperature is converted to canonical Celsius before calculation. Velair
accepts only finite native inputs with `-100 < temperature_c < 100` and
`0 < relative_humidity <= 100`; unusable input produces an `invalid` derived
payload rather than a fabricated value.

The implementation uses the Magnus constants `a = 17.625` and `b = 243.04`:

```text
gamma = ln(RH / 100) + (a * T) / (b + T)
dew_point_c = (b * gamma) / (a - gamma)

saturation_hpa = 6.1094 * exp((a * T) / (b + T))
vapour_pressure_hpa = (RH / 100) * saturation_hpa
absolute_humidity_g_m3 = 216.7 * vapour_pressure_hpa / (T + 273.15)

humidex_vapour_pressure_hpa =
  6.11 * exp(5417.7530 * ((1 / 273.16) - (1 / (273.16 + dew_point_c))))
humidex = T + 0.5555 * (humidex_vapour_pressure_hpa - 10)
```

`T` is degrees Celsius and `RH` is relative humidity in percent. The calculation
helpers round to three decimal places; the public Comfort assessment rounds the
display value to two. The dew-point and saturation-pressure implementation is
based on Alduchov and Eskridge's improved Magnus approximation. For Humidex,
Velair uses Environment and Climate Change Canada's revised `273.16` Kelvin
conversion. These references justify Velair's implementation; this document
does not redefine the underlying measures.

Dew point is converted back to the zone's runtime temperature unit. Absolute
humidity is normalized to `g/m³`, accepting external `g/m³` and `mg/m³` values.
Humidex remains a unitless Celsius-based index; external temperature-class
Humidex entities are normalized back to that canonical scale.

Implementation references:

- [Alduchov and Eskridge, *Improved Magnus Form Approximation of Saturation Vapor Pressure*](https://doi.org/10.1175/1520-0450(1996)035%3C0601:IMFAOS%3E2.0.CO;2)
- [Environment and Climate Change Canada notice for the revised Humidex Kelvin conversion](https://climate.weather.gc.ca/archived_messages_e.html?ArchivedYear=2009)

External sources are generic `sensor.*` entities and add no platform-specific
dependency. Their state, declared unit, availability, and freshness are
validated at runtime. Source selection is deep-merged so changing one metric or
one field cannot erase sibling metrics or a retained entity ID.

The frontend presents the Velair calculation and compatible external entities
in one selector. Its mapper retains `entity_id` when selecting
`source: velair`, and writes `source: entity` with the selected sensor.
An external source with no ID remains a disabled placeholder and is not
auto-saved.

An enabled external metric may temporarily have no selected entity. This is a
valid incomplete configuration with `availability: "missing"` and survives a
portable export/import round trip. `unknown` and `unavailable` entity states are
also `missing`; non-numeric states, incompatible units, and negative absolute
humidity are `invalid`.

Derived metric availability and issues remain inside each derived payload. They
deliberately do not affect `data_quality` or `data_issues`, preserving the
existing public Comfort contract.

Every derived payload has a stable shape. `unit` is the zone temperature unit
for dew point, `g/m³` for absolute humidity, and `null` for Humidex. `issues` is
always a list. `input_entity_ids` is always a list: empty when disabled, the
selected entity for an external source, or the effective temperature and
humidity source entity IDs resolved for a Velair calculation when known. A
resolved source remains listed when its reading is currently missing or stale.

The Humidex payload alone also always includes
`temperature_range_position`. Its value is `below`, `within`, `above`, or
`null`. Classification compares the canonical Humidex number with the
configured zone temperature bounds converted to Celsius. Bounds are inclusive
and comparisons use an epsilon of `1e-6`; non-current or non-finite Humidex,
non-finite bounds, and reversed ranges produce `null`. Dew point and absolute
humidity deliberately omit this key. The field is carried unchanged through
the schedule API, diagnostics, the Environmental condition sensor attributes,
and `comfort_assessment_changed`.

The assessment also exposes backend-owned `range_summary` context. Its
`status` is `within_range`, `outside_range`, `mixed`, or `unavailable`;
`thermal_relation` is `aligned`, `mixed`, `not_evaluated`, or `unavailable`;
and `positions` carries nullable `temperature`, `humidity`, and `humidex`
positions. Humidex that is disabled is `not_evaluated`, while enabled but
unusable Humidex is `unavailable`. Frontends translate this contract and do not
reclassify readings. A monitored physical range whose reading is missing,
stale, invalid, boolean, or non-finite also makes the summary `unavailable`;
an explicitly unmonitored humidity range is ignored. The original `condition`
remains unchanged for backward compatibility.

No per-metric proxy entities are created. `ZoneEnvironmentalConditionSensor`
projects enabled derived payloads. `ZoneVentilationOpportunitySensor` projects
the backend-owned `ventilation_opportunity.state` enum and compact evidence
attributes. The same assessment is reused by the API, Diagnostics, panel,
cards, both Comfort entities, and `comfort_assessment_changed`.

## Outdoor Comparison

Outdoor comparison is opt-in and accepts only explicitly selected `sensor.*`
entities. Outdoor temperature must declare `°C` or `°F`; outdoor humidity is
optional and must declare `%` with a value from 0 to 100. The existing
`stale_after_minutes` policy applies. There is no weather lookup, automatic
source discovery, or fallback.

When enabled, the assessment adds `outdoor` with its own `data_quality` and
`data_issues`; these never alter the established indoor fields. The subtree
contains `temperature`, `humidity`, calculated `indoor_absolute_humidity` and
outdoor `absolute_humidity`, and a
`comparison` object. It also contains the effective `guidance_thresholds` used
for that assessment:

```json
{
  "temperature_delta": 1.0,
  "temperature_unit": "°C",
  "humidity_delta_percentage_points": 5.0,
  "absolute_humidity_delta_g_m3": 1.0
}
```

Temperature delta means outdoor minus indoor. Humidity is
compared by converting outdoor temperature and relative humidity to absolute
humidity, then projecting that moisture content at the indoor temperature.
This yields `equivalent_indoor_relative_humidity`, rather than comparing raw
relative-humidity percentages at different temperatures.

Outdoor `data_quality` summarizes the configured source readings, not whether
a comparison can currently be calculated. It is `partial` when at least one
configured outdoor source is current and another required or configured source
is missing, stale, or invalid. Each comparison dimension has its own
`availability`; therefore current outdoor humidity without outdoor temperature
is useful as a visible reading but leaves both comparisons unavailable and
cannot produce a ventilation insight.

`indoor_absolute_humidity` is an explicit backend-produced metric payload. UI
clients must not reconstruct it from `absolute_humidity_delta`, because public
readings and deltas are rounded independently. Its absence from an older
backend means unavailable, not permission to infer a replacement.

Thermal opportunities require the configured useful temperature difference and
movement closer to the configured temperature range. Humidity opportunities
require both configured humidity margins and movement closer to the humidity
range. Defaults remain `1 °C`, `5` percentage points, and `1 g/m³`. A known
worsening in the other dimension produces `ventilation_has_tradeoff`; an
unmonitored other dimension leaves a limited single-dimension opportunity.
These are cautious observations, not commands. Velair does not inspect windows
or operate the climate from this assessment.

## Insight Contract

`comfort_insights.py` is pure backend logic. It returns an ordered list:

```json
{
  "code": "co2_elevated",
  "kind": "context",
  "tone": "attention",
  "metrics": ["co2"]
}
```

Each item has `code`, `kind`, `tone`, and `metrics`. `kind` is `primary` or
`context`; this phase produces contextual items because `condition` remains the
single assessment summary. `tone` is `positive`, `neutral`, `cool`, `warm`,
`attention`, or `critical`. Insights are ordered as CO2, outdoor trade-off,
outdoor opportunities, then Humidex. Only current numeric metrics participate. Humidex requires a
Celsius-normalized margin of at least 1 °C. Dew point and absolute humidity keep
their normalized readings but do not create permanent insights; the frontend
provides their neutral explanation through the shared `renderInlineHelp`
mechanism beside each value. It supports hover, keyboard focus, click/touch,
Escape, and viewport-aware positioning.

Clients render only known codes. Outdoor codes are
`ventilation_may_help_cool`, `ventilation_may_help_warm`,
`ventilation_may_help_reduce_humidity`,
`ventilation_may_help_increase_humidity`, and
`ventilation_has_tradeoff`. Existing CO2 and `humidex_feels_warmer` codes remain
unchanged. Unknown codes are ignored without a fallback card.
The frontend groups all known contextual insights in one area above the
readings. Outdoor opportunities and trade-offs use their own window or trade-off
icon instead of being repeated inside the indoor-versus-outdoor data panel.
The Comfort frontend has separate runtime and configuration projections. The
runtime assessment renders only enabled derived metrics, immediately after the
temperature/humidity map and CO2 scale. Each responsive item contains its label,
inline help, current value or availability state, and no controls. With no
enabled derived metrics, the visual group is omitted entirely.

Editable controls live in one native `details` panel after the assessment. It
is rendered closed by default without binding its `open` property, so ordinary
Lit updates preserve the user's current open state without adding frontend
persistence. Its compact sections are ordered as Data sources (including data
freshness), Comfort model, Preferences, Outdoor comparison and Additional
environmental information. Controls appear only where their selected source or
model makes them relevant. The panel remains renderable when Comfort itself is
disabled and is omitted as a whole when a Lovelace view sets
`show_comfort_configuration: false`; runtime readings remain visible in that
read-only presentation.
The visual body is metric-specific: Humidex compares its canonical unitless
value with room temperature and scales a Fahrenheit delta by `9 / 5` without an
offset. The canonical Humidex value remains unitless and Celsius-referenced; it
represents equivalent apparent heat, not a physical temperature. Both the
panel and compact card interpolate the exact one-decimal delta in the zone
unit. Dew point reports a neutral absolute distance above or below room air;
absolute humidity displays only its normalized `g/m³` value. Missing, stale,
and invalid states are muted and never show a relationship. Definitions remain
in the viewport-aware inline help rather than permanent explanatory copy.
Relationship direction uses the same one-decimal precision shown to users, so
sub-display differences remain neutral; dew-point distance is omitted when it
rounds to zero.

For current Humidex, the panel additionally renders a compact, read-only scale.
Its domain is `[temperature_min - 5 °C, temperature_max + 5 °C]`; the configured
range is a highlighted band, and room air and Humidex use separate marker lanes.
The connector is hidden below a `0.1 °C` absolute delta. Markers are clamped
inside the plot when values overflow the domain. Fahrenheit converts absolute
coordinates with `C * 9 / 5 + 32` and deltas with `C * 9 / 5`, never adding 32
to a delta. An accessible label names both values and the backend-owned range
position. Older or partial payloads without that field render a neutral state.

Temperature conditions are `cold`, `comfortable`, or `hot`.

Humidity conditions are `dry`, `comfortable`, or `humid`.

CO2 conditions are `good`, `elevated`, or `poor`.

`condition` is `null` unless availability is `current`.

## Environmental Condition

Current temperature and humidity conditions are combined:

| Temperature | Humidity | Result |
| --- | --- | --- |
| `cold` | `dry` | `cold_and_dry` |
| `cold` | `comfortable` | `cold` |
| `cold` | `humid` | `cold_and_humid` |
| `comfortable` | `dry` | `dry` |
| `comfortable` | `comfortable` | `comfortable` |
| `comfortable` | `humid` | `humid` |
| `hot` | `dry` | `hot_and_dry` |
| `hot` | `comfortable` | `hot` |
| `hot` | `humid` | `hot_and_humid` |

When only one metric is current:

- an in-range temperature becomes `temperature_comfortable` if humidity is monitored but unavailable;
- an in-range humidity becomes `humidity_comfortable`;
- an out-of-range metric keeps its specific `cold`, `hot`, `dry`, or `humid` condition.

When humidity is not monitored, an in-range temperature can produce `comfortable`.

If neither temperature nor humidity is current, the result is `no_readings`.

## Air Quality

Top-level `air_quality` mirrors the useful CO2 assessment:

- `not_monitored`;
- `unavailable`;
- `good`;
- `elevated`;
- `poor`.

It remains separate from the environmental condition so combinations do not grow into ambiguous states.

## Data Quality

`data_quality` is calculated over monitored metrics:

1. `stale` when no current metric exists and every monitored metric is stale;
2. `unavailable` when no current metric exists for any other reason;
3. `partial` when at least one metric is current and another monitored metric is missing or stale;
4. `complete` when every monitored metric is current.

`data_issues` contains machine-readable identifiers:

- `temperature_missing`;
- `temperature_stale`;
- `humidity_missing`;
- `humidity_stale`;
- `co2_missing`;
- `co2_stale`.

Optional humidity and CO2 sources with `availability: not_monitored` do not create data issues. Automatic climate humidity is considered monitored when the climate exposes either `current_humidity` or `humidity`, even if its current value is temporarily unreadable.

When `humidity_enabled` is false, humidity always returns `availability: not_monitored`. Its configured entity ID and thresholds remain persisted, but the source is excluded from listener registration, assessment calculation, and data quality.

## Freshness

Staleness uses:

```text
now - state.last_updated > stale_after_minutes
```

States without `last_updated` are treated as current for compatibility with test fakes.

There is no polling or expiry timer. Reevaluation happens after tracked state changes, Comfort setting changes, and API assessment reads.

## Runtime Listener

The scheduler registers `async_track_state_change_event` only for entities that can affect enabled Comfort zones:

- the managed climate;
- configured temperature, humidity, and CO2 sensors;
- the Room Assist sensor when used as the automatic temperature source.
- enabled external derived-metric sensor entities.
- enabled outdoor temperature and optional humidity sensor entities.

When no zone has Comfort enabled, the listener is removed.

## API Response

`velair/get_schedule` includes:

```json
{
  "comfort": {
    "climate.living_room": {
      "enabled": true,
      "condition": "comfortable",
      "air_quality": "good",
      "data_quality": "complete",
      "data_issues": [],
      "temperature": {},
      "humidity": {},
      "co2": {},
      "derived_metrics": {
        "dew_point": {},
        "absolute_humidity": {},
        "humidex": {}
      },
      "comfort_zone": {
        "model": "temperature_aware",
        "temperature_min": 20,
        "temperature_max": 24,
        "points": [
          {"temperature": 20, "humidity_min": 40, "humidity_max": 60},
          {"temperature": 24, "humidity_min": 35, "humidity_max": 50}
        ],
        "effective_humidity_range": {
          "temperature": 22,
          "minimum": 37.5,
          "maximum": 55
        }
      },
      "insights": [
        {
          "code": "co2_elevated",
          "kind": "context",
          "tone": "attention",
          "metrics": ["co2"]
        }
      ]
    }
  }
}
```

Settings are updated through `velair/update_zone_comfort`.

## Automation Event

The scheduler emits `comfort_assessment_changed` when any of these change:

- `condition`;
- `air_quality`;
- `data_quality`;
- `data_issues`;
- an enabled derived metric's semantic state: availability, source, entity,
  unit, issues, or condition.
- the ordered semantic insight projection.
- outdoor availability, quality, issues, effects, opportunities, and blocking
  dimensions.

`comfort_zone` numeric geometry refreshes the API, entity attributes,
Diagnostics, and frontend, but does not by itself emit an automation event.
An event is emitted when that geometry changes a public semantic result such as
the humidity condition, range summary, outdoor opportunity, or insight. This
keeps ordinary temperature movement from producing an event for every
interpolated limit.

The event preserves `condition` and adds transition metadata around the
backend-owned `range_summary`:

| `range_summary.status` | Contract |
| --- | --- |
| `within_range` | All evaluated positions are `within`. |
| `outside_range` | At least one evaluated position is `below` or `above`, without a temperature/Humidex disagreement. |
| `mixed` | Usable temperature and Humidex positions differ. |
| `unavailable` | Temperature, a monitored humidity reading, or enabled Humidex cannot be evaluated. |

| `range_summary.thermal_relation` | Contract |
| --- | --- |
| `aligned` | Usable temperature and Humidex positions match. |
| `mixed` | Usable temperature and Humidex positions differ. |
| `not_evaluated` | Humidex is disabled. |
| `unavailable` | Temperature or enabled Humidex is unusable. |

The `temperature`, `humidity`, and `humidex` entries in `positions` are exactly
`below`, `within`, `above`, or `null`. `previous_range_summary` is restored
from the previous semantic snapshot. `range_summary_changed` compares the
complete previous and current summaries; `range_status_changed` compares only
their aggregate `status`. Therefore a CO2, insight, or outdoor-only semantic
event carries both flags as `false`, while a positions-only transition can set
the first flag without setting the second. The initial snapshot establishes a
baseline and emits no event.

The event contains the complete current metric payloads and the current ordered
`insights` list, including an empty list when the last insight disappears.
Numeric changes to original, derived, or outdoor readings update frontend and
entity state without emitting
an event while their semantic state remains unchanged.
Changing guidance thresholds follows the same rule: the entity/API/Diagnostics
projection refreshes immediately, while an event is emitted only if the
effective opportunity, trade-off, availability, or insight list changes.

Opening or refreshing the panel does not emit events.

The public payload contract and example are in
[Automation Events](../user/automation-events.md#comfort-assessment-changed).

## Frontend Projection

The frontend does not recalculate conditions or effective humidity limits.

It uses backend-provided assessment fields and only calculates visual marker positions:

- temperature and humidity use a range with one configured-range span of context on either side;
- marker positions are clamped to the visible plot;
- the two-dimensional map uses a nine-region projection and a compact marker with a separate value label;
- CO2 uses its attention and poor thresholds for the scale;
- when both environmental metrics are current, the UI renders a two-dimensional map;
- the Simple model draws a rectangle, Guided draws the sampled backend curve,
  and the custom temperature-aware model draws its backend-provided endpoint
  geometry;
- the current effective humidity range is displayed as accessible supporting
  text when the backend supplies it;
- when only one is current, it renders a one-dimensional scale.
