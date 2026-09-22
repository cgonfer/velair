# Zone Control And Delivery Sensors

Velair creates two context sensors for every managed `climate.*` entity:

- **Zone control** answers who currently owns the zone and which Velair
  configuration applies.
- **Zone delivery diagnostics** answers what happened when Velair most recently
  tried to send a climate target through Home Assistant.

They describe different layers. A zone can be under automatic control while
its latest delivery is unavailable or has failed, so do not treat either sensor
as a replacement for the other.

The separate **Environmental condition** sensor exposes enabled
`derived_metrics` and the ordered runtime-only `insights` list when Comfort is
enabled. Insights contain `code`, `kind`, `tone`, and supporting `metrics`; they
are observational and never execute climate actions. See
[Environmental Comfort](comfort.md#comfort-insights).
When optional outdoor comparison is enabled, that same sensor also exposes the
`outdoor` subtree. It contains the source readings, explicit indoor and outdoor
absolute humidity, independent quality, and semantic ventilation opportunity
or trade-off. Velair creates no proxy entities for individual readings. It
does create one separate **Ventilation opportunity** enum sensor for the
backend-owned automation summary described below.

## Environmental Condition

The **Environmental condition** sensor is the current-state surface for
Comfort automations. It is enabled by default for every managed climate and
updates from the same backend assessment as the Velair panel. Reading it does
not poll a sensor or execute a climate action.

Its native state keeps the compatible physical temperature-and-humidity
classification:

| State | Meaning |
| --- | --- |
| `monitoring_off` | Comfort monitoring is disabled for this climate. |
| `no_readings` | No usable monitored reading is currently available. |
| `temperature_comfortable` | Only temperature can be evaluated and it is within its configured range. |
| `humidity_comfortable` | Only humidity can be evaluated and it is within its configured range. |
| `comfortable` | Temperature and humidity are both within their configured ranges. |
| `cold` / `hot` | Temperature is below or above its configured range. |
| `dry` / `humid` | Humidity is below or above its configured range. |
| `cold_and_dry` / `cold_and_humid` | Both readings are usable and temperature is below range. |
| `hot_and_dry` / `hot_and_humid` | Both readings are usable and temperature is above range. |

These values remain compatible with existing automations. They describe the
configured physical ranges; they are not a medical or universal statement
about personal comfort.

### Environmental Condition Attributes

| Attribute | Meaning |
| --- | --- |
| `data_quality` | `complete`, `partial`, `stale`, or `unavailable` for the monitored indoor readings. |
| `data_issues` | Stable codes explaining missing, stale, or invalid indoor data. Omitted when empty. |
| `range_summary` | Factual configured-range summary, including optional Humidex reconciliation. |
| `ventilation_opportunity` | Current backend-owned ventilation state, scope, effects, blockers, and reason. |
| `comfort_zone` | Selected Simple, Guided, or custom temperature-aware target geometry and the humidity range effective at the current temperature. |
| `temperature_source` | Entity ID currently used for indoor temperature, when available. |
| `humidity_source` | Entity ID currently used for indoor humidity, when available. |
| `derived_metrics` | Enabled Humidex, dew-point, and absolute-humidity payloads. Unmonitored metrics are omitted. |
| `outdoor` | Optional indoor-versus-outdoor comparison, its effective guidance thresholds, data quality, readings, and semantic opportunity or trade-off. |
| `insights` | Ordered observational codes with `code`, `kind`, `tone`, and supporting `metrics`. Omitted when empty. |

`derived_metrics` and `outdoor` are omitted when their corresponding feature is
not enabled. When enabled readings are missing, stale, or invalid, their
payload remains present with `availability` and issue context so automations do
not reuse an old value. `insights` is omitted when its current list is empty.
Raw indoor temperature and humidity remain on their source entities. CO2
classification is exposed by the separate **Air quality** sensor.

For a Guided or custom temperature-aware model,
`comfort_zone.effective_humidity_range` is `null` when the current
temperature is unusable. In that state the humidity reading may remain visible,
but it has no condition and must not be treated as inside or outside a guessed
range.

`range_summary` contains:

```yaml
status: within_range | outside_range | mixed | unavailable
thermal_relation: aligned | mixed | not_evaluated | unavailable
positions:
  temperature: below | within | above | null
  humidity: below | within | above | null
  humidex: below | within | above | null
```

For example, this template detects mixed thermal indicators without parsing a
translated display label:

```yaml
{% set summary =
   state_attr('sensor.velair_environmental_condition_living_room',
              'range_summary') %}
{{ summary is mapping and summary.get('thermal_relation') == 'mixed' }}
```

This condition checks whether the enabled Humidex reading is current and above
the configured temperature range:

```yaml
{% set metrics =
   state_attr('sensor.velair_environmental_condition_living_room',
              'derived_metrics') or {} %}
{% set humidex = metrics.get('humidex', {}) %}
{{ humidex.get('availability') == 'current'
   and humidex.get('temperature_range_position') == 'above' }}
```

This condition consumes one backend-owned insight code. It remains valid when
the displayed language changes:

```yaml
{% set insights =
   state_attr('sensor.velair_environmental_condition_living_room',
              'insights') or [] %}
{{ insights
   | selectattr('code', 'eq', 'ventilation_may_help_cool')
   | list | count > 0 }}
```

For the optional outdoor comparison, inspect availability before using a
numeric value:

```yaml
{% set outdoor =
   state_attr('sensor.velair_environmental_condition_living_room',
              'outdoor') or {} %}
{% set comparison = outdoor.get('comparison', {}) %}
{% set thresholds = outdoor.get('guidance_thresholds', {}) %}
{% set temperature = comparison.get('temperature', {}) %}
{{ temperature.get('availability') == 'current'
   and temperature.get('potential') == 'cooling'
   and thresholds.get('temperature_delta') is number }}
```

### Entity Or Event?

Use this entity when an automation needs the current state, including after a
Home Assistant restart. A normal state trigger can react to a compatible
physical classification:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_environmental_condition_living_room
    to: hot_and_humid
```

Use `comfort_assessment_changed` when the automation must know what changed.
Its `previous_range_summary`, `range_summary_changed`, and
`range_status_changed` fields distinguish a range transition from an unrelated
Comfort update. See
[Comfort Assessment Changed](automation-events.md#comfort-assessment-changed)
for the complete payload and a copy-ready automation.

## Ventilation Opportunity

The per-zone **Ventilation opportunity** sensor is event-driven and
observational:

| State | Meaning |
| --- | --- |
| `unavailable` | Comfort, outdoor comparison, or a configured required reading cannot currently be evaluated. |
| `no_opportunity` | Outdoor air does not cross configured thresholds in a useful direction. |
| `may_help` | Outdoor air moves the room toward Comfort, but Velair cannot establish that it reaches the complete configured zone. |
| `comfort_possible` | Outdoor temperature is inside range and, when humidity is monitored, outdoor humidity is inside the Comfort band evaluated at that outdoor temperature. |
| `trade_off` | A useful change in one monitored dimension has a known worsening in another. |
| `already_comfortable` | The physical environmental condition is already comfortable. |

`comfort_possible` is a conservative environmental projection, not a promise
about opening a window. Velair cannot know airflow, wind, rain, outdoor
pollutants, solar gain, room thermal mass, or how long the window stays open.
It never opens a window or changes climate control.

Attributes include `evaluation_scope`, `potential_effects`, `blocked_by`,
`reason`, outdoor `data_quality` and `data_issues`, and configured outdoor
source IDs. If indoor humidity is monitored but outdoor humidity is omitted,
temperature can produce `may_help`, but never `comfort_possible`. If humidity
monitoring is deliberately disabled, a temperature-only
`comfort_possible` result is valid.

`reason` is a stable machine-readable code. Its values are:
`monitoring_off`, `outdoor_comparison_disabled`,
`indoor_temperature_unavailable`, `indoor_humidity_unavailable`,
`outdoor_temperature_unavailable`, `outdoor_humidity_unavailable`,
`already_comfortable`, `known_trade_off`, `no_useful_difference`,
`outdoor_conditions_within_comfort`, `outdoor_humidity_not_configured`, and
`moves_toward_comfort`.

For a climate such as `climate.living_room`, a newly created registry entry will
normally use an entity ID such as:

```text
sensor.velair_ventilation_opportunity_living_room
sensor.velair_control_living_room
sensor.velair_delivery_diagnostics_living_room
```

These are suggested entity IDs, not a permanent API. Home Assistant may add a
suffix to avoid a collision, and users can rename an entity. Select entities by
their actual entity IDs in your own Home Assistant registry. The displayed
entity name uses the managed climate's friendly name, while the suggested ID
uses the climate entity's object ID. The Velair service device name and its area
do not form part of that suggested ID.

## Zone Control

**Zone control** is enabled by default and is reconstructed from the scheduler
after every restart. Its state identifies the current control owner:

| State | Meaning |
| --- | --- |
| `automatic` | Velair owns local control. This includes scheduled, idle, paused, stopped, Boost, and Adaptive Preconditioning states. Use `runtime_state` to distinguish them. |
| `manual` | Velair has yielded this climate to a Manual adjustment, either explicitly or after a detected external change. This is different from Velair Mode **Manual**, which describes Profile selection. |
| `external` | A supported external schedule provider owns physical execution for this zone. A change made from a climate card, remote, or another automation does not produce this state; when Velair yields to such a change, the state is `manual`. |

The sensor remains available while a temperature-unit migration is required
because its ownership information is not a temperature value.

### Zone Control Attributes

| Attribute | Values or meaning |
| --- | --- |
| `runtime_state` | `idle`, `scheduled`, `preconditioning`, `boost`, `paused`, `stopped`, `externally_managed`, `temperature_migration_required`, or the defensive fallback `unknown`. |
| `schedule_source` | `default` for the zone's Default schedule, `profile` for an effective Profile schedule, or `profile_pause` when the effective Profile pauses the zone. |
| `profile_id` / `profile_name` | Stable ID and display name of the Profile that owns the zone, when one applies. |
| `mode_id` / `mode_name` | Stable ID and display name of the selected Mode, when a custom Mode applies. |
| `manual_source` | Present only in `manual`: `explicit` when Manual adjustment was selected directly, `external_change` when Velair yielded to a detected climate change, or the defensive fallback `other`. |
| `manual_started_at` | Timestamp at which the current Manual adjustment began. |
| `manual_until` | Planned expiry when the selected Manual policy has one. It may be absent for an open-ended adjustment. |
| `manual_policy` | Present only in `manual`: `until_next_block`, `for_duration`, `until_resumed`, or the defensive fallback `unknown`. |

Optional attributes are omitted when they do not apply. For example, an
`automatic` entity has no `manual_source` or `manual_until`.

The control state and runtime state are intentionally separate. For example:

- `automatic` with `runtime_state: paused` means Velair still owns the zone but
  a pause currently prevents normal schedule execution;
- `automatic` with `runtime_state: boost` means Velair owns the temporary Boost;
- `external` with `runtime_state: externally_managed` means the configured
  external provider, rather than Velair's local climate delivery, owns physical
  execution.

## Zone Delivery Diagnostics

**Zone delivery diagnostics** is a diagnostic entity and is disabled by default.
Enable it only when a dashboard or automation needs the latest local delivery
evidence:

1. Open **Settings > Devices & services > Entities** in Home Assistant.
2. Search for the managed climate name followed by **delivery diagnostics**.
3. Open the entity settings and enable it.

The sensor is event-driven and does not poll. Its state describes the latest
delivery outcome observed since the integration started:

| State | When it occurs |
| --- | --- |
| `idle` | No delivery outcome has been recorded since startup or since runtime delivery evidence was cleared. |
| `success` | Home Assistant accepted the complete Velair climate service sequence. `retry_count` shows whether this happened on the initial attempt or a retry. |
| `failed` | Home Assistant rejected a climate service call. Scheduler-owned work normally proceeds to bounded recovery; a non-resilient one-shot action can remain failed without retrying. |
| `retrying` | Velair has begun one of its bounded retry attempts after a recoverable failure. This state may be brief. |
| `exhausted` | The initial scheduler-owned attempt and both delayed retries failed. |
| `invalid_intent` | While recovering or redelivering, Velair could no longer resolve the current intent into a valid delivery. Normal service and configuration validation errors are rejected before reaching this state. |
| `cancelled` | Active or deferred delivery work was superseded by newer intent, explicitly invalidated, or stopped while still pending. This state may be brief when newer work starts immediately. |
| `unavailable` | The managed climate was missing, `unknown`, or `unavailable`, so Velair did not issue the climate service call. Eligible scheduler-owned intent is resolved again when the entity becomes available. |

The diagnostic entity itself remains available so that `unavailable` can be an
observable state. It also remains available during a required temperature-unit
migration; recorded temperature evidence keeps the unit captured with that
accepted target.

Velair currently makes at most two delayed retries, after approximately 2 and
10 seconds. These timings are recovery behavior rather than a recommended
automation contract; automations should react to the states instead of relying
on exact delays.

### Delivery Diagnostic Attributes

| Attribute | Meaning |
| --- | --- |
| `updated_at` | Timestamp of the latest delivery-state update. It is absent in the initial `idle` state. |
| `retry_count` | Number of the attempt represented by the current terminal or retry state: `0` for the initial attempt, then `1` or `2` for retries. Cancellation resets it to `0`. |
| `last_error_at` | Timestamp of the most recently recorded `failed`, `exhausted`, or `invalid_intent` outcome. |
| `last_error_code` | `failed`, `exhausted`, `invalid_intent`, or the defensive fallback `unknown_delivery_status`. Raw exception text is never exposed. |
| `last_accepted_at` | Timestamp at which Home Assistant accepted the most recent complete Velair control sequence. |
| `last_accepted_source` | `automatic`, `manual`, `boost`, or `automatic_reassertion`. |
| `last_accepted_action` | `set_temperature`, `set_hvac_mode`, `turn_off`, or the defensive fallback `other`. |
| `last_accepted_hvac_mode` | HVAC mode included in the accepted target, when one applied. |
| `last_accepted_temperature_unit` | Temperature unit recorded with a scalar or range target. |
| `last_accepted_temperature` | Accepted scalar target, when applicable. |
| `last_accepted_target_temp_low` / `last_accepted_target_temp_high` | Accepted lower and upper targets for a native range, when applicable. |

Calls made through `velair.set_temperature` and `velair.set_hvac_mode` are both
reported with `last_accepted_source: manual`. A successful mode-only call has
`last_accepted_action: set_hvac_mode` and an HVAC mode, while all temperature
target attributes remain absent or `null`.

The last-error and last-accepted fields are independent history. A later
`success` changes the current state but does not erase the previous
`last_error_*` values. Similarly, a later failure does not erase the last
accepted target. Check the timestamps when an automation needs to compare them.

`success` means that Home Assistant accepted the service calls; it does not
confirm transport delivery, equipment activity, or that the room reached the
target. Use the climate entity and its device integration for physical state.
Room Assist can subsequently change the target sent to the thermostat and has
its own sensor for that applied adjustment. External schedule publication also
has separate status in Velair and is not represented by this local delivery
sensor.

All delivery evidence is runtime-only. It returns to `idle` after the Velair
integration or Home Assistant restarts, and a successful Velair data reset also
clears it. It is not restored from Recorder or Velair storage.

## Automation Examples

The following automation notifies only after Velair has exhausted its bounded
retries. Replace the example entity ID with the one in your entity registry:

```yaml
alias: Velair living room delivery exhausted
triggers:
  - trigger: state
    entity_id: sensor.velair_delivery_diagnostics_living_room
    to: exhausted
actions:
  - action: persistent_notification.create
    data:
      title: Velair delivery problem
      message: >-
        The living room target could not be delivered after
        {{ trigger.to_state.attributes.retry_count }} retries.
```

This template condition checks that Velair currently owns automatic control
and has an active scheduled block:

```yaml
condition: template
value_template: >-
  {{ is_state('sensor.velair_control_living_room', 'automatic')
     and state_attr('sensor.velair_control_living_room', 'runtime_state')
         == 'scheduled' }}
```

Use **Zone control** for current ownership and scheduler context. Use **Zone
delivery diagnostics** for the latest service-delivery outcome. Use
`climate.living_room` for the device's reported state.
