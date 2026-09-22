# Velair Sensor Reference

Velair creates Home Assistant entities so dashboards and automations can read
the current scheduler, comfort, delivery, and per-climate context without
opening the Velair panel.

Entity IDs shown here are examples. Home Assistant can add suffixes or let you
rename entities, so use the actual entity IDs from your own entity registry.

## Quick Guide

| Entity | Created for | Best used for |
| --- | --- | --- |
| **Next scheduled event** | Velair integration | Showing the next planned Velair action. |
| **Scheduler status** | Velair integration | Checking whether scheduling is idle, scheduled, paused, or overridden. |
| **Diagnostics status** | Velair integration | Alerting on Velair runtime health. |
| **Active target temperature** | Each managed climate | Showing the current Velair-owned target. |
| **Environmental condition** | Each managed climate | Reading Comfort state, data quality, derived metrics, and outdoor context. |
| **Ventilation opportunity** | Each managed climate | Automating or displaying cautious window-opening opportunities. |
| **Air quality** | Each managed climate | Showing the CO2 assessment independently from thermal Comfort. |
| **Zone override** | Each managed climate | Showing active Boost or pause overrides. |
| **Zone control** | Each managed climate | Knowing who owns the climate: Velair, Manual adjustment, or external execution. |
| **Zone delivery diagnostics** | Each managed climate, disabled by default | Debugging or automating on the latest local delivery outcome. |
| **Preconditioning start** | Each managed climate | Showing when Adaptive Preconditioning plans to start early. |
| **Room Assist** | Each managed climate | Showing Room Assist runtime state and applied target context. |

Velair also creates writable entities such as **Automatic scheduling** and
**Mode**. They are control surfaces rather than sensors; see the
[usage guide](usage.md#home-assistant-entities).

## Global Sensors

### Next Climate Event

Example entity ID:

```text
sensor.velair_next_scheduled_event
```

Main attributes:

| Attribute | Meaning |
| --- | --- |
| `entity_id` | Climate entity for the first event at this time. |
| `action` | `set_temperature`, `set_hvac_mode`, or `turn_off`. |
| `hvac_mode` | HVAC mode Velair plans to use, when one applies. |
| `temperature` | Scalar target, when one applies. |
| `target_temp_low` / `target_temp_high` | Range target, when one applies. |
| `weekday` / `start` | Schedule block source. |
| `when` | Actual apply time. |
| `target_when` | Original comfort target time when preconditioning starts early. |
| `event_count` | Number of events sharing the same apply time. |
| `events` | Serialized list of every event sharing the same apply time. |

Example:

```yaml
{{ state_attr('sensor.velair_next_scheduled_event', 'action') == 'turn_off' }}
```

### Current Schedule State

Example entity ID:

```text
sensor.velair_current_schedule_state
```

States:

```text
paused
override_active
scheduled
idle
temperature_migration_required
```

Main attributes:

| Attribute | Meaning |
| --- | --- |
| `global_mode` | Current global scheduler mode. |
| `paused_started_at` | When the global pause started, when applicable. |
| `paused_until` | Planned global pause expiry, when applicable. |

### Diagnostics Status

Example entity ID:

```text
sensor.velair_diagnostics_status
```

States:

```text
ok
warning
error
```

Main attributes:

| Attribute | Meaning |
| --- | --- |
| `scheduler_mode` / `scheduler_status` | Compact scheduler context. |
| `units_ok` / `units_warning` / `units_error` | Per-climate health counts. |
| `issue_count` | Total active runtime issues. |
| `warning_count` / `error_count` | Active issue severity counts. |
| `issue_codes` | Stable issue codes suitable for automations. |

Example trigger:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_diagnostics_status
    to: error
```

## Per-Climate Sensors

For a managed climate such as `climate.living_room`, Home Assistant normally
creates related entity IDs such as `sensor.velair_control_living_room`. Use
your real registry IDs in dashboards and automations.

### Zone Active Target Temperature

Main attributes:

| Attribute | Meaning |
| --- | --- |
| `action` | Active Velair target action. |
| `hvac_mode` | HVAC mode selected by the active block or override. |
| `temperature` | Scalar active target. |
| `target_temp_low` / `target_temp_high` | Active range target for native range modes. |
| `weekday` / `start` | Schedule source of the active block. |
| `when` | Apply time for the active target. |
| `target_when` | Comfort target time when preconditioning moved the apply time earlier. |

For native range targets, the sensor state is unavailable because there is no
single correct scalar value. Read `target_temp_low` and `target_temp_high`
instead.

### Zone Environmental Condition

States:

```text
monitoring_off
no_readings
temperature_comfortable
humidity_comfortable
comfortable
cold
hot
dry
humid
cold_and_dry
cold_and_humid
hot_and_dry
hot_and_humid
```

Main attributes:

| Attribute | Meaning |
| --- | --- |
| `data_quality` | `complete`, `partial`, `stale`, or `unavailable`. |
| `data_issues` | Stable codes for missing, stale, or invalid readings. |
| `range_summary` | Current Comfort range result and Humidex reconciliation. |
| `ventilation_opportunity` | Full ventilation opportunity payload. |
| `comfort_zone` | Selected Comfort model and effective humidity range. |
| `temperature_source` / `humidity_source` | Source entities used for indoor readings. |
| `derived_metrics` | Enabled Humidex, dew point, and absolute humidity payloads. |
| `outdoor` | Optional indoor-vs-outdoor comparison. |
| `insights` | Ordered observational insights with stable codes. |

Example:

```yaml
{% set insights =
   state_attr('sensor.velair_climate_living_room_environmental_condition',
              'insights') or [] %}
{{ insights
   | selectattr('code', 'eq', 'ventilation_may_help_cool')
   | list | count > 0 }}
```

See [Environmental Comfort](comfort.md) and
[Zone Control and Delivery Sensors](zone-sensors.md#environmental-condition)
for the full Comfort payload.

### Zone Ventilation Opportunity

States:

```text
unavailable
no_opportunity
may_help
comfort_possible
trade_off
already_comfortable
```

Main attributes:

| Attribute | Meaning |
| --- | --- |
| `evaluation_scope` | Whether Velair evaluated temperature, humidity, or both. |
| `reason` | Stable machine-readable reason code. |
| `data_quality` / `data_issues` | Outdoor comparison quality. |
| `outdoor_temperature_source` | Outdoor temperature source entity. |
| `outdoor_humidity_source` | Outdoor humidity source entity, when configured. |
| `potential_effects` | Effects Velair expects outdoor air may have. |
| `blocked_by` | Conditions preventing a stronger opportunity result. |

Example:

```yaml
{{ is_state('sensor.velair_ventilation_opportunity_living_room',
            'comfort_possible') }}
```

This sensor is observational. Velair never opens windows or changes climate
control based on it.

### Zone Air Quality

States:

```text
not_monitored
unavailable
good
elevated
poor
```

Main attributes:

| Attribute | Meaning |
| --- | --- |
| `availability` | Current CO2 reading availability. |
| `co2_source` | CO2 sensor used for the assessment. |

### Zone Override State

States:

```text
none
boost
paused
disabled
```

Main attributes:

| Attribute | Meaning |
| --- | --- |
| `started_at` | When the active override started. |
| `until` | Planned override expiry, when applicable. |
| `action` | Override action, when applicable. |
| `pause_id` | Active pause identifier for a single pause. |
| `pause_count` / `pause_ids` | Compact multi-pause context. |
| `manual` | Whether the pause is a Manual adjustment. |

Use this sensor for Boost and pause state. Use **Zone control** for ownership
such as automatic, manual, or external.

### Zone Control

States:

```text
automatic
manual
external
```

Main attributes:

| Attribute | Meaning |
| --- | --- |
| `runtime_state` | `idle`, `scheduled`, `preconditioning`, `boost`, `paused`, `stopped`, `externally_managed`, or `temperature_migration_required`. |
| `schedule_source` | `default`, `profile`, or `profile_pause`. |
| `profile_id` / `profile_name` | Effective Profile owner for the zone, when one applies. |
| `mode_id` / `mode_name` | Selected Mode, when one applies. |
| `manual_source` | `explicit`, `external_change`, or `other`, only while manual. |
| `manual_started_at` | When the Manual adjustment started. |
| `manual_until` | Planned Manual adjustment expiry, when applicable. |
| `manual_policy` | `until_next_block`, `for_duration`, or `until_resumed`. |

Example:

```yaml
{{ is_state('sensor.velair_control_living_room', 'automatic')
   and state_attr('sensor.velair_control_living_room', 'runtime_state')
       == 'scheduled' }}
```

### Zone Delivery Diagnostics

This diagnostic entity is disabled by default. Enable it from Home Assistant's
entity registry when a dashboard or automation needs runtime delivery evidence.

States:

```text
idle
success
failed
retrying
exhausted
invalid_intent
cancelled
unavailable
```

Main attributes:

| Attribute | Meaning |
| --- | --- |
| `updated_at` | Latest delivery-state update. |
| `retry_count` | Attempt represented by the current state. |
| `last_error_at` / `last_error_code` | Latest sanitized delivery error. |
| `last_accepted_at` | Last time Home Assistant accepted a complete Velair service sequence. |
| `last_accepted_source` | `automatic`, `manual`, `boost`, or `automatic_reassertion`. |
| `last_accepted_action` | `set_temperature`, `set_hvac_mode`, `turn_off`, or `other`. |
| `last_accepted_hvac_mode` | HVAC mode accepted by Home Assistant. |
| `last_accepted_temperature_unit` | Unit captured with the accepted target. |
| `last_accepted_temperature` | Accepted scalar target, when applicable. |
| `last_accepted_target_temp_low` / `last_accepted_target_temp_high` | Accepted range target, when applicable. |

Example:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_delivery_diagnostics_living_room
    to: exhausted
```

`success` means Home Assistant accepted the service sequence. It does not prove
that the physical device reached the target.

### Zone Preconditioning Start

Main attributes:

| Attribute | Meaning |
| --- | --- |
| `status` | `planned` or `active`. |
| `scheduled_for` | Original block comfort time. |
| `lead_minutes` | Minutes Velair moved the start earlier. |
| `direction` | Heating or cooling direction. |
| `target_kind` / `target_boundary` | Scalar or range-boundary prediction context. |
| `boundary_temperature` | Boundary used for the prediction. |
| `model_source` | Prediction source selected by Velair. |
| `target_temperature` | Scalar target, when applicable. |
| `target_temp_low` / `target_temp_high` | Range target, when applicable. |
| `hvac_mode` | HVAC mode used by the preconditioning event. |

### Zone Room Assist State

States:

```text
unavailable
not_configured
disabled
blocked
idle
holding
assisting
ready
```

Main attributes:

| Attribute | Meaning |
| --- | --- |
| `room_temperature_entity_id` | Room sensor source. |
| `target_temperature` | Visible schedule or override target. |
| `applied_temperature` | Target Room Assist applied to the climate. |
| `applied_offset` | Offset currently applied. |
| `calculated_temperature` | Calculated target before limits. |
| `assist_delta` | Active assist delta when greater than zero. |
| `scheduled_target_guard` | Guard that prevents unsafe target changes. |
| `hysteresis_phase` / `hysteresis_target` | Holding-band runtime phase. |
| `deadband_low` / `deadband_high` | Effective holding band. |
| `target_temp_low` / `target_temp_high` | Visible native range target. |
| `applied_target_temp_low` / `applied_target_temp_high` | Native range sent after assistance. |
| `climate_target_temp_low` / `climate_target_temp_high` | Live climate-reported native range. |
| `range_shift` | Current range shift, when applicable. |
| `direction` | Heating or cooling direction. |
| `hvac_mode` | HVAC mode involved in the assisted target. |
| `active_from` / `target_when` | Timing context for the assisted block. |

## Choosing The Right Surface

| Question | Use |
| --- | --- |
| What is Velair planning next? | **Next scheduled event** |
| Is Velair globally paused or scheduled? | **Scheduler status** |
| Is Velair healthy? | **Diagnostics status** |
| What target does Velair own right now? | **Active target temperature** |
| Is the room comfortable, stale, or missing readings? | **Environmental condition** |
| Could outdoor air help? | **Ventilation opportunity** |
| Is CO2 good or poor? | **Air quality** |
| Is this climate boosted or paused? | **Zone override** |
| Who owns this climate right now? | **Zone control** |
| Did Home Assistant accept the latest Velair command? | **Zone delivery diagnostics** |
| When will preconditioning start? | **Preconditioning start** |
| What is Room Assist applying? | **Room Assist** |

Events are better when an automation needs to react to a transition and know
what changed. Sensors are better when a dashboard or automation needs the
current state, including after a restart.
