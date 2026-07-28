# Automation Events

Velair emits transient Home Assistant events for runtime changes. Events are not
stored and opening or refreshing the Velair panel does not emit them.

All events use:

```yaml
event_type: velair_event
```

Filter `event_data.event` and, for zone events, `event_data.entity_id`:

```yaml
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: climate_target_applied
      entity_id: climate.living_room
```

Every payload contains `domain: velair` and one of the event names below.

## Profile Changed

`profile_changed` is emitted after a different set of climate profiles, or
Default schedules, has been persisted. Directly selecting the same active set
can move the native Mode entity to Manual, but emits no `profile_changed` event
because the effective profiles did not change.

```yaml
domain: velair
event: profile_changed
profile_ids:
  - away
  - bedrooms
previous_profile_ids: []
source: select
```

`source` identifies where the effective selection originated. Public values are
`panel`, `service`, and `select`; internal lifecycle operations may publish a
more specific value such as `profile_deleted` or `mode_updated`.
The ordered ID lists describe the complete new and previous active sets. An
empty `profile_ids` list represents Default.

For example, this automation reacts when the Profile with ID `away` becomes
part of the active set:

```yaml
alias: Notify when Away profile becomes active
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: profile_changed
conditions:
  - condition: template
    value_template: "{{ 'away' in trigger.event.data.profile_ids }}"
actions:
  - action: notify.notify
    data:
      message: Away profile is active
```

To react when Velair returns to Default schedules, use a template condition that
checks `trigger.event.data.profile_ids == []`.

## Scheduler Mode Changed

`scheduler_mode_changed` is emitted when the global mode or pause expiry changes,
including automatic expiry. Repeating the same mode and expiry does not emit it.

```yaml
domain: velair
event: scheduler_mode_changed
mode: paused
previous_mode: auto
paused_until: "2026-07-09T18:30:00+02:00"
paused_started_at: "2026-07-09T17:00:00+02:00"
```

## Climate Target Applied

`climate_target_applied` is emitted after Velair applies a scheduled target,
turn-off action, restored schedule, startup schedule, or `velair.set_temperature`.
Unsupported optional settings are omitted.

```yaml
domain: velair
event: climate_target_applied
entity_id: climate.bedroom
action: set_temperature
temperature: 23
hvac_mode: cool
fan_mode: low
preset_mode: sleep
swing_mode: off
swing_horizontal_mode: center
humidity: 50
weekday: thursday
start: "22:30"
target_when: "2026-07-09T22:30:00+02:00"
source: scheduled_event
```

Common `source` values are `scheduled_event`, `current_schedule`,
`schedule_saved`, `scheduler_resumed`, `startup`, `service_set_temperature`,
`boost_ended`, `zone_paused`, `zone_resumed`, and `zone_pause_expired`.

## Preconditioning Plan Updated

`preconditioning_plan_updated` is emitted when a new early-start plan is
published or any of its calculation inputs or results change. Identical
recalculations are deduplicated. Planning during startup can emit this event;
calculating data only for a panel response does not.

```yaml
domain: velair
event: preconditioning_plan_updated
entity_id: climate.living_room
scheduled_when: "2026-01-15T07:00:00+01:00"
preconditioning_when: "2026-01-15T05:35:00+01:00"
lead_minutes: 85
direction: heat
target_temperature: 21
current_temperature: 17.8
temperature_delta: 3.2
hvac_mode: heat
preset_mode: comfort
model_source: history
complete_sample_count: 12
partial_sample_count: 3
invalid_sample_count: 1
similar_sample_count: 8
comfort_percentile: 90
used_outdoor_temperature: true
outdoor_temperature: -1.5
weekday: thursday
start: "07:00"
preconditioning_diagnostics:
  direction: heat
  delta_temperature: 3.2
  complete_sample_count: 12
  partial_sample_count: 3
  invalid_sample_count: 1
  similar_sample_count: 8
  comfort_percentile: 90
  complete_rate_minutes_per_degree: 23.4
  complete_estimate_minutes: 74.88
  partial_floor_minutes: 82
  combined_estimate_minutes: 82
  rounded_estimate_minutes: 85
  final_lead_minutes: 85
  limited_by_min_start: false
  limited_by_max_lead: false
  source: history
  used_outdoor_temperature: true
  initial_model_lead_minutes: 110
```

## Preconditioning Plan Cancelled

`preconditioning_plan_cancelled` is emitted once when a previously published
plan no longer exists, for example after a schedule edit, a smaller temperature
gap, disabling preconditioning, or leaving automatic mode. It repeats the last
published plan so an automation can identify what was cancelled.

```yaml
domain: velair
event: preconditioning_plan_cancelled
entity_id: climate.living_room
scheduled_when: "2026-01-15T07:00:00+01:00"
preconditioning_when: "2026-01-15T05:35:00+01:00"
lead_minutes: 85
direction: heat
target_temperature: 21
current_temperature: 17.8
temperature_delta: 3.2
hvac_mode: heat
preset_mode: comfort
model_source: history
complete_sample_count: 12
partial_sample_count: 3
invalid_sample_count: 1
similar_sample_count: 8
comfort_percentile: 90
used_outdoor_temperature: true
outdoor_temperature: -1.5
weekday: thursday
start: "07:00"
preconditioning_diagnostics:
  direction: heat
  delta_temperature: 3.2
  complete_sample_count: 12
  partial_sample_count: 3
  invalid_sample_count: 1
  similar_sample_count: 8
  comfort_percentile: 90
  complete_rate_minutes_per_degree: 23.4
  complete_estimate_minutes: 74.88
  partial_floor_minutes: 82
  combined_estimate_minutes: 82
  rounded_estimate_minutes: 85
  final_lead_minutes: 85
  limited_by_min_start: false
  limited_by_max_lead: false
  source: history
  used_outdoor_temperature: true
  initial_model_lead_minutes: 110
reason: no_longer_planned
```

`reason` is `no_longer_planned` when recalculation removes one plan and
`scheduler_not_auto` when pausing or stopping automatic scheduling.

## Preconditioning Observation Recorded

`preconditioning_observation_recorded` is emitted after a learning observation
has been validated, trimmed to the configured history size, and persisted.
`quality` can be `complete`, `partial`, or `invalid`.

```yaml
domain: velair
event: preconditioning_observation_recorded
entity_id: climate.living_room
direction: heat
created_at: "2026-01-15T06:52:00+01:00"
scheduled_time: "2026-01-15T07:00:00+01:00"
start_time: "2026-01-15T05:35:00+01:00"
target_temp: 21
initial_temp: 17.8
observed_temp: 20.8
outdoor_temp_start: -2.1
outdoor_temp_target: -1.5
temperature_source: room_sensor
room_temperature_entity_id: sensor.living_room_temperature
delta_t: 3.2
startup_minutes: 85
reached: true
minutes_to_reach: 77
quality: complete
stored_sample_count: 16
```

An invalid observation also includes `invalid_reason`.

## Comfort Assessment Changed

`comfort_assessment_changed` is emitted when `condition`, `air_quality`,
`data_quality`, or `data_issues` changes. Numeric movement inside the same
assessment still refreshes the Velair UI but does not flood the event bus.

```yaml
domain: velair
event: comfort_assessment_changed
entity_id: climate.office
condition: hot_and_humid
air_quality: elevated
data_quality: complete
data_issues: []
temperature:
  metric: temperature
  availability: current
  condition: hot
  source: sensor
  entity_id: sensor.office_temperature
  value: 27.1
  min: 20
  max: 24
humidity:
  metric: humidity
  availability: current
  condition: humid
  source: sensor
  entity_id: sensor.office_humidity
  value: 67
  min: 40
  max: 60
co2:
  metric: co2
  availability: current
  condition: elevated
  source: sensor
  entity_id: sensor.office_co2
  value: 1180
  attention: 1000
  max: 1500
```

## Room Sensor Assist State Changed

`room_sensor_assist_state_changed` is emitted when Room Assist is enabled or
disabled through the panel, Lovelace card, API, or service. Repeating the same
state does not emit it.

```yaml
domain: velair
event: room_sensor_assist_state_changed
entity_id: climate.living_room
enabled: true
previous_enabled: false
room_temperature_entity_id: sensor.living_room_temperature
max_delta: 3
debounce_seconds: 20
```

## Room Sensor Assist Updated

`room_sensor_assist_updated` is emitted only after Room Assist sends a changed
temporary target to the climate. Movements smaller than the climate target step
do not emit it.

```yaml
domain: velair
event: room_sensor_assist_updated
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
target_temperature: 21
applied_temperature: 23.5
room_temperature: 18
climate_temperature: 20.5
assist_delta: 3
direction: heat
hvac_mode: heat
reason: scheduled_event
```

## Room Sensor Assist Restored

`room_sensor_assist_restored` is emitted when assistance stops driving the
climate or applies a neutral hold target after the room reaches its target.
`reason` explains the transition.

```yaml
domain: velair
event: room_sensor_assist_restored
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
target_temperature: 21
applied_temperature: 20.5
room_temperature: 21.1
climate_temperature: 20.5
assist_delta: 0
direction: heat
hvac_mode: heat
reason: target_reached
```

Other reasons include `assist_disabled`, `boost_started`, `manual_target`,
`missing_temperature`, `no_active_target`, `not_auto`, `schedule_changed`,
`schedule_cleared`, `scheduler_mode_changed`, `scheduler_stopped`,
`settings_updated`, `turn_off`, `unsupported_mode`, `zone_paused`, and
`zone_unavailable`.

## Boost Started

`boost_started` is emitted after a boost target and override have been applied
and persisted. Replacing an active boost emits another `boost_started`.

```yaml
domain: velair
event: boost_started
entity_id: climate.bedroom
temperature: 22
hvac_mode: cool
fan_mode: high
preset_mode: comfort
swing_mode: vertical
swing_horizontal_mode: wide
humidity: 48
started_at: "2026-07-09T14:00:00+02:00"
until: "2026-07-09T15:30:00+02:00"
```

## Boost Ended

`boost_ended` is emitted when a boost expires or is cancelled. `reason` is
`expired` or `manual`. `restoration` describes the state Velair then applies.

```yaml
domain: velair
event: boost_ended
entity_id: climate.bedroom
temperature: 22
hvac_mode: cool
fan_mode: high
preset_mode: comfort
swing_mode: vertical
swing_horizontal_mode: wide
humidity: 48
started_at: "2026-07-09T14:00:00+02:00"
until: "2026-07-09T15:30:00+02:00"
reason: manual
restoration:
  type: schedule
  source: boost_ended
  target:
    action: set_temperature
    temperature: 24
    hvac_mode: cool
    fan_mode: low
    preset_mode: sleep
    swing_mode: off
    swing_horizontal_mode: center
    humidity: 50
    weekday: thursday
    start: "15:00"
```

`restoration.type` can be `schedule`, `previous_state`, or `none`. A scheduled
restoration also emits `climate_target_applied` with `source: boost_ended`.

## Zone Paused

`zone_paused` is emitted whenever one managed zone is paused. If `action` is
`turn_off`, `climate_target_applied` is emitted first for that turn-off.

```yaml
domain: velair
event: zone_paused
entity_id: climate.guest_room
started_at: "2026-07-09T12:00:00+02:00"
until: "2026-07-12T18:00:00+02:00"
action: turn_off
```

## Zone Resumed

`zone_resumed` is emitted when a zone resumes manually or its pause expires.
When the current schedule is reapplied, a later `climate_target_applied` event
describes that target.

```yaml
domain: velair
event: zone_resumed
entity_id: climate.guest_room
started_at: "2026-07-09T12:00:00+02:00"
until: "2026-07-12T18:00:00+02:00"
action: turn_off
reason: expired
```

## Operations Without Runtime Events

Creating templates, changing panel preferences, importing data, and resetting
settings update configuration but do not emit runtime automation events.
Schedule edits do not have a dedicated configuration event, although they can
produce plan cancellation/update events or `climate_target_applied` when they
change the currently active target.
