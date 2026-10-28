# WebSocket API

For live block preset references, hours-only and complete template links, configuration revisions,
and preview commands, see [Linked schedule internals](linked-schedules.md).

Velair exposes WebSocket commands for the sidebar panel and optional Lovelace card.

Frontend code should use Home Assistant's WebSocket connection:

```ts
await hass.connection.sendMessagePromise({
  type: "velair/get_schedule",
});
```

## Room groups and control-unit identity

Schedule responses preserve `configured_entities` as real managed climates and
add `room_groups`, ordered `control_units`, `member_to_unit`,
`control_unit_states` and `group_delivery_status`. Group state is a backend
projection, not an HA entity. Scheduling/Profile editors use control-unit IDs;
Overview uses physical members with their owner's effective configuration.

- `velair/preview_room_group`: `group`, `expected_revision`, and
  `source_entity_id` when creating a group. Returns the normalized group,
  configuration differences, removed members and whether learning resets.
- `velair/set_room_group`: the same request fields; validates and commits the
  complete ownership change, then returns the schedule response.
- `velair/remove_room_group`: `group_id` and `expected_revision`; makes each
  member independent with the common configuration and returns the response.

`group` contains a stable `id`, `name`, ordered `members`,
`temperature_entity_id`, and `delivery_mode` (`all` or `selected`). Selected
delivery also requires `delivery_entity_id` from the members. Group IDs use
`group.` followed by lowercase letters, digits or underscores. Member-targeted
room actions resolve to their one owner. Real HA climate service calls always
use physical climate IDs.

The `group.*` prefix is an internal namespace, not a registered Home Assistant
group. Generated IDs use `group.` plus a UUID hex string and remain stable on
rename. They do not create HA states and must not be sent directly to HA
`climate.*` services. Velair room actions resolve either a physical member ID
or the group ID to the same shared zone. This includes boosts, zone pauses,
Manual adjustment and automatic resume. An external change on one member can
pause the group's schedule while retaining the members' distinct live states.

Preconditioning learning is keyed by the control-unit ID. Group creation starts
one history; member histories are not merged. Membership-set, native-reference
or delivery changes invalidate group learning. Member order and name changes
preserve it. Removing members or dissolving a group copies shared configuration
without copying the group's active overrides or learning into independent units.

New groups and changes to `temperature_entity_id` require a member climate. This
is the native group measurement; the optional external Room Assist sensor remains
in the shared zone's `preconditioning.room_temperature_entity_id`, with ordinary
`room_sensor_assist_enabled` semantics. Group creation adopts that zone setting
without replacing it with the group's native reference. Reload and portable import
preserve both independent values. Legacy external native references remain readable
and unchanged metadata edits may retain them; they are not accepted as new or
replacement references. Loading legacy groups never automatically enables Assist.

Settings `unit_order` arranges groups and independent climates. Legacy
`zone_order` remains the physical compatibility order. Group membership order
determines the individual entries when Overview expands a group. Portable model
25 includes room groups with their shared zone/Profile configuration.

## Day layouts and grouped Default saves

Default zones and Profile schedule zones include `day_layout_key`, one of
`individual`, `weekdays_weekend` or `all`. These are the only supported layouts;
there are no layout-library management commands. Legacy schedules default to
`individual`. Loading or importing earlier custom references resets their
presentation to `individual` without modifying schedule content.

All new writes require `expected_revision` and return the updated schedule
response:

- `velair/set_schedule_days`: `entity_id`, optional `weekdays`, optional
  `day_layout_key`, and either `blocks` or `template_link` for day replacement.
  Replacing existing linked days with blocks requires `unlink_template: true`.
  Omit day content and weekdays for a layout-only save.

A grouped save validates the full candidate week and commits once. Revision,
device, reference or validation failures leave every selected day unchanged.
Existing `velair/set_daily_schedule` callers remain compatible. Profiles retain
their complete-Profile save and include layout references in schedule zones.
Layout-only updates persist and publish metadata without climate actions or
runtime rescheduling. Layouts never alter scheduler recurrence semantics.

For example, assigning the integrated weekdays/weekend division alone:

```ts
await hass.connection.sendMessagePromise({
  type: "velair/set_schedule_days",
  entity_id: "climate.kitchen",
  day_layout_key: "weekdays_weekend",
  expected_revision: 12,
});
```

## Planned Return Services

Home Assistant actions `velair.start_planned_return` and
`velair.cancel_planned_return` reuse the same scheduler operations as their
WebSocket counterparts. Start requires `return_date` (valid `YYYY-MM-DD`) and `return_time` (strict 24-hour `HH:MM`);
the time selector's `HH:MM:00` is also accepted and normalized to minute precision.
Cancel accepts no fields and withdraws a pending or active return, or closes any
terminal notice. For a confirmed absence, it atomically restores the episode's
saved previous Mode/Profile selection together with a dismissed cancellation
latch. A pending confirmation or terminal acknowledgement leaves selection
unchanged. The latch prevents immediate weekly departure restart while away.
Neither accepts a climate target or edits schedule/Profile definitions.

The service resolves the selected date and wall time in Home Assistant's time zone, rejects
nonexistent daylight-saving times, and chooses the earliest future UTC instant
when the wall time repeats. The existing runtime validates configuration,
operation availability, external execution, and episode phase. Validation failures
become `HomeAssistantError`; start does not require the weekly routine enabled.
For explicit starts, occupancy sources are optional. With an empty saved
`occupancy_entity_ids` list, start persists a confirmed manual departure and
applies Away immediately, bypassing only absence detection and its delay.
Configured unknown/unavailable sources still arm a request; missing configured
entities are rejected. Weekly automatic departures still require sources.
Start also accepts optional boolean `apply_away_now` (default `false`) in the
service and WebSocket command. When true, Away and scheduled preparation activate
immediately. With sources, the episode persists `awaiting_departure_confirmation`
until every source stays empty for `absence_delay_minutes`; home or unknown
resets the timer. Only then can presence trigger automatic arrival. The timer
restarts after reload while pending; a completed confirmation stays completed.
The scheduled arrival and explicit arrive/cancel actions remain active while
pending. Repeated starts of an active absence only adjust the arrival and retain
the gate; an armed request with the option true is promoted atomically.
Start and adjust WebSocket commands accept an aware ISO `return_at` instant,
which must be strictly in the future and is persisted in UTC. One-off returns
can span multiple days; weekly times remain same-day. Destination schedules are
resolved in Home Assistant local time, while preparation leads and confirmation
delays use elapsed UTC time. Changing the arrival resets the preparation latch,
invalidates pending delivery and restores current Away authority for formerly
preparing zones; submitting the same instant preserves the latch.

```yaml
action: velair.start_planned_return
data:
  return_date: "2026-10-09"
  return_time: "19:25"
```

```yaml
action: velair.cancel_planned_return
data: {}
```

## Schedule Response

The response also includes backend-owned `planned_return` configuration and a
derived `planned_return_status` with `state`, `occupancy`, `sources`, `origin`,
`can_start`, `episode_active`, `can_cancel`, `return_at`, `departure_at`, `away_mode_id`, `destination_mode_id`,
`absence_confirm_at`, `awaiting_departure_confirmation`, per-zone preparation entries, and an optional `error`.
`departure_at` is the timezone-aware instant when monitored absence or an
explicit manual departure applied Away and saved the transition. For immediate
manual Away with sources, this is the application time; the separate
`awaiting_departure_confirmation` flag remains true until monitored absence is
confirmed. The public state stays `away` or `preparing` while that flag is true,
and `absence_confirm_at` supplies the pending presence-return deadline when
running. It is null while waiting for normal departure and for
older episodes without this metadata. It survives arrival adjustments, restarts,
and retained terminal episodes. The mode identifiers come from the episode,
including `default`, and are null when there is no episode. These fields support
the compact card's elapsed-time display; they do not report thermal progress.
See [Planned Return](../user/planned-return.md) for behavior and limits.

Most write commands return the full schedule response:

The response includes a runtime-only `zone_runtime` mapping. It is derived by the backend and never persisted. Each managed climate reports an authoritative `state` (`stopped`, `paused`, `boost`, `preconditioning`, `scheduled`, `idle`, or `externally_managed`) plus the minimal available room, target, applied setpoint, HVAC mode, and relevant timing fields used by Overview.

An optional `zone_runtime[entity_id].planned_return` identifies current effective
Planned Return authority. Its shape is `{ phase: "away" | "preparing", origin:
"automatic" | "manual", mode_id: string, profile_id?: string | null, effect:
"schedule" | "pause" | "turn_off" }`. `mode_id` refers to Away during absence and
the destination during preparation. Absence of this field means no current
Planned Return attribution; a future estimate or ordinary preconditioning state
does not establish it. Current Manual, Boost, independent-pause, external,
disabled-zone and scheduler authority gates apply. The field describes intent,
not delivery confirmation, and does not replace `state`. Clients must tolerate
its absence when using an older backend.

```json
{
  "configured_entities": ["climate.living_room"],
  "temperature_unit": "°C",
  "home_assistant_temperature_unit": "°C",
  "temperature_migration": {
    "required": false,
    "reason": null,
    "source_unit": "°C",
    "target_unit": "°C",
    "temperature_revision": 3
  },
  "operation_recovery": null,
  "global": {
    "mode": "auto",
    "paused_started_at": null,
    "paused_until": null,
    "active_profile_ids": ["away"],
    "active_mode_id": "away-mode"
  },
  "active_profile_ids": ["away"],
  "profiles": [
    {
      "key": "away",
      "name": "Away",
      "icon": "mdi:home-export-outline",
      "color": "#546e7a",
      "description": "Lower demand while nobody is home",
      "zones": {
        "climate.living_room": {
          "behavior": "schedule",
          "schedule": {
            "monday": []
          }
        }
      }
    }
  ],
  "modes": [
    {
      "key": "away-mode",
      "name": "Away",
      "profile_ids": ["away"]
    }
  ],
  "active_mode_id": "away-mode",
  "settings": {
    "first_weekday": "monday",
    "zone_order": ["climate.living_room"],
    "min_temperature": 5,
    "max_temperature": 35,
    "apply_active_schedule_on_startup": false
  },
  "zones": {
    "climate.living_room": {
      "enabled": true,
      "schedule": {
        "monday": [
          {
            "start": "06:00",
            "action": "set_temperature",
            "target_temp_low": 20,
            "target_temp_high": 24,
            "hvac_mode": "heat_cool",
            "fan_mode": "quiet",
            "preset_mode": "eco",
            "swing_mode": "vertical",
            "swing_horizontal_mode": "left",
            "humidity": 45
          }
        ]
      },
      "override": null,
      "preconditioning": {
        "enabled": false,
        "max_lead_minutes": 1440,
        "minimum_delta_temperature": 0.3,
        "learning_history_size": 120,
        "similar_sample_count": 25,
        "comfort_percentile": 80,
        "adaptive_percentile_enabled": true,
        "partial_expiry_days": 30,
        "recency_decay_days": 30,
        "min_start_minutes": 10,
        "fallback_minutes_per_degree": 25,
        "use_outdoor_temperature": true,
        "outdoor_temperature_entity_id": "sensor.outdoor_temperature",
        "room_temperature_entity_id": "sensor.living_room_temperature",
        "room_sensor_assist_enabled": false,
        "room_sensor_assist_deadband": 0.3,
        "room_sensor_assist_max_delta": 2.0
      },
      "comfort": {
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
          "dew_point": {"enabled": true, "source": "velair", "entity_id": null},
          "absolute_humidity": {"enabled": false, "source": "velair", "entity_id": null},
          "humidex": {"enabled": true, "source": "entity", "entity_id": "sensor.living_room_humidex"}
        }
      }
    }
  },
  "operational_status": "scheduled",
  "next_event": null,
  "next_events": [],
  "active_overrides": {},
  "room_sensor_assist": {
    "climate.living_room": {
      "status": "assisting",
      "enabled": true,
      "configured": true,
      "room_temperature_entity_id": "sensor.living_room_temperature",
      "target_temperature": null,
      "target_temp_low": 20,
      "target_temp_high": 24,
      "applied_temperature": null,
      "applied_target_temp_low": 21,
      "applied_target_temp_high": 25,
      "climate_target_temperature": null,
      "climate_target_temp_low": 21,
      "climate_target_temp_high": 25,
      "room_temperature": 19.8,
      "climate_temperature": 20.5,
      "assist_delta": 0.2,
      "applied_offset": null,
      "range_shift": 1.0,
      "limited_by": null,
      "limit_temperature": null,
      "requested_temperature": null,
      "calculated_temperature": null,
      "scheduled_target_guard": null,
      "requested_target_temp_low": null,
      "requested_target_temp_high": null,
      "direction": "heat",
      "hvac_mode": "heat_cool",
      "weekday": "monday",
      "start": "06:00"
    }
  },
  "comfort": {
    "climate.living_room": {
      "enabled": false,
      "condition": "monitoring_off",
      "air_quality": "not_monitored",
      "data_quality": "unavailable",
      "data_issues": []
    }
  },
  "zone_runtime": {
    "climate.living_room": {
      "state": "scheduled",
      "room_temperature": 19.8,
      "target_temperature": null,
      "target_temp_low": 20,
      "target_temp_high": 24,
      "applied_temperature": null,
      "hvac_mode": "heat_cool",
      "active_from": "2026-05-19T06:00:00+00:00",
      "target_when": null
    }
  },
  "preconditioning_learning": {
    "climate.living_room": {
      "status": "learning",
      "required_samples": 5,
      "total_samples": 0,
      "heat": {
        "status": "learning",
        "sample_count": 0,
        "total_samples": 0,
        "required_samples": 5,
        "effective_lead_minutes": null,
        "effective_lead_source": "initial_model",
        "partial_sample_count": 0,
        "complete_sample_count": 0,
        "invalid_sample_count": 0,
        "lead_limited_by_max": false,
        "last_quality": null,
        "model_source": "initial_model",
        "comfort_percentile": 80,
        "similar_sample_count": 25
      },
      "cool": {
        "status": "learning",
        "sample_count": 0,
        "total_samples": 0,
        "required_samples": 5,
        "effective_lead_minutes": null,
        "effective_lead_source": "initial_model",
        "partial_sample_count": 0,
        "complete_sample_count": 0,
        "invalid_sample_count": 0,
        "lead_limited_by_max": false,
        "last_quality": null,
        "model_source": "initial_model",
        "comfort_percentile": 80,
        "similar_sample_count": 25
      }
    }
  },
  "templates": [],
  "versions": {
    "export_format": "velair_portable_data",
    "portable_model": 23,
    "storage": 1,
    "model": 7,
    "integration": "1.9.0-beta.6"
  }
}
```

`operation_recovery` is normally `null`. When persisted data could not be fully
published back into runtime state, it contains `operation`, `phase`, `persisted`,
and `message`; the scheduler remains stopped until the integration reloads or
Home Assistant restarts. Runtime `zone_runtime`, Room Assist, and Comfort
projections are suppressed while a temperature or recovery block is active.

`temperature_unit` identifies the unit of the stored Velair values.
`home_assistant_temperature_unit` is the unit currently detected from Home
Assistant. Both are informational and cannot be changed through Velair. When
they differ, `temperature_migration.required` is `true`, `operational_status`
is `temperature_migration_required`, automatic scheduling and Velair write
operations remain blocked, and the frontend must ask the user to migrate the
stored values.

There is one upgrade exception. A response with
`temperature_migration.reason` equal to
`legacy_celsius_upgrade_reset_required` identifies published Celsius-only data
loaded while Home Assistant uses Fahrenheit. The frontend must offer
`velair/reset_data`, not `velair/resolve_temperature_migration`. Reset replaces
the legacy model atomically with defaults in Home Assistant's current unit.
Subsequent unit changes use `home_assistant_unit_changed` and the explicit
migration command below.

## Resolve Temperature Migration

```ts
await hass.connection.sendMessagePromise({
  type: "velair/resolve_temperature_migration",
  source_unit: "°C",
  migration_id: crypto.randomUUID(),
  expected_revision: 3,
});
```

Available only while the stored unit differs from Home Assistant. The source
must match `temperature_migration.source_unit`; the target is always
`temperature_migration.target_unit`. The command converts all thermal
configuration and learning data, persists it atomically, dismisses the
notification, starts the scheduler, and returns the full response. The
migration id makes exact retries harmless and `expected_revision` rejects stale
clients.

`next_event` is the scheduler's earliest due action. `next_events` is the UI-oriented list of the next visible event per managed climate, sorted by apply time; preconditioning events include `target_when` so the panel can show both the early start and the comfort target time.

Preconditioned native ranges remain an exclusive target union: serialized
events include both `target_temp_low` and `target_temp_high` and leave
`temperature` null. Their diagnostics expose `target_kind: "range"`, the
effective `target_boundary` (`low` or `high`), and `boundary_temperature`.
Scalar events retain `target_kind: "scalar"` and `target_boundary:
"temperature"`.

`preconditioning_learning` is local runtime/storage status used by the panel. It can be included explicitly in portable exports and is never sent outside Home Assistant by Velair. Direction statuses are `learning`, `ready`, or `unsupported` when the climate does not report a compatible HVAC mode. A direction is `ready` when it has at least 5 complete local samples; before that, Adaptive predictions use the initial event-specific model.

Each direction can additionally expose optional runtime `activity` with
`state` (`observing`, `waiting`, `unavailable`, or `disabled`), an optional
semantic `reason`, and an optional ISO timestamp `at`. This is observational
context, not a new learning criterion or evidence of physical heat supply.
Clients receiving older payloads omit this context rather than deriving it from
sample counts. Activity is never included as authoritative persisted learning
configuration.

The same direction summary can include optional `last_transition`, projected
from retained diagnostic history using the shape described below. This lets
the learning view explain a dated skipped transition without loading the full
Diagnostics snapshot. It disappears when the relevant history is cleared,
disabled or evicted; it is not part of portable learning observations.

The actual lead is calculated per future event from the current temperature delta and the selected local model source (`initial_model` or `history`).

Stored observations are trimmed per climate direction. `learning_history_size` limits useful `complete` and `partial` samples, while only the 10 newest `invalid` diagnostic samples are retained separately. Invalid samples cannot evict useful learning history. Heat and cool keep separate local histories, so seasonal cooling samples cannot evict heating samples, and heating samples cannot evict cooling samples.

Range observations use the effective boundary in the existing `target_temp`
field and may add `target_temp_low`, `target_temp_high`, and `target_boundary`.
These fields are optional so existing stored and portable observations remain
valid. Temperature migration converts both optional boundaries as absolute
temperatures.

`comfort` is the local runtime Environmental Comfort assessment. It contains the compatible physical `condition`, independent CO2 `air_quality`, `data_quality`, `data_issues`, and raw metric payloads. Current metrics expose `freshness: reported | unverified`; `data_quality: unverified` means all monitored readings are usable but at least one lacks verifiable freshness. Direct sensors use `last_reported`; climate attributes remain unverified.

`comfort_zone` identifies the selected Simple, Guided, or custom temperature-aware model, its backend-owned geometry points, and the humidity range effective at the current temperature. Its temperatures use the managed climate's runtime unit. Guided also exposes its midpoint `reference`. For Guided and custom temperature-aware models, `effective_humidity_range` is `null` when temperature cannot be evaluated; clients must not substitute the Simple range.

Optional `derived_metrics` and the `outdoor` comparison are observational and do not control a climate. Every derived payload has a stable shape; the Humidex payload alone includes nullable `temperature_range_position`. Range position does not create an insight or change the compatible physical condition. Backend-owned `range_summary` reconciles the configured physical ranges and Humidex with `status`, `thermal_relation`, and nullable per-metric `positions`, without replacing `condition` or making a universal comfort claim. Clients should tolerate these newer fields being absent when paired with an older backend. The existing `comfort_assessment_changed` event adds `previous_range_summary`, `range_summary_changed`, and `range_status_changed` so automations can distinguish an aggregate transition from another semantic Comfort update without subscribing to a second event. Outdoor quality/issues remain separate and its comparison reports normalized temperature, explicit indoor and outdoor absolute-humidity readings, equivalent indoor relative humidity, possible improvement, and known trade-offs. Clients must treat an omitted `indoor_absolute_humidity` from an older backend as unavailable instead of reconstructing it from rounded deltas. The runtime-only ordered `insights` list contains backend-owned `code`, `kind`, `tone`, and `metrics`; clients translate it but must not infer new rules. Opening or refreshing the panel does not emit comfort automation events.

## Home Assistant Mode-Only Service

`velair.set_hvac_mode` is the public one-shot counterpart to a persisted
`set_hvac_mode` schedule block:

```yaml
action: velair.set_hvac_mode
data:
  entity_id: climate.living_room
  hvac_mode: cool
```

The schema contains exactly `entity_id` and `hvac_mode`. The backend rejects an
unmanaged climate, externally owned execution, `off`, and any mode not advertised
by the live entity. A valid request is serialized through the local delivery
coordinator and produces exactly one `climate.set_hvac_mode` call with no target
or optional climate fields. ClimateManager registers that call as Velair-owned,
so its state echo is not classified as an external adjustment.

After successful physical delivery, Velair disables any active Room Assist
correction for that climate and emits `climate_target_applied` with
`action: set_hvac_mode`, the applied `hvac_mode`, and
`source: service_set_hvac_mode`. No temperature fields are added. Failed
physical delivery publishes no success event and leaves Room Assist unchanged.
The existing `velair.set_temperature` schema and behavior are independent and
unchanged.

## Read Schedule State

```ts
await hass.connection.sendMessagePromise({
  type: "velair/get_schedule",
});
```

When a compatible provider is detected, the response also includes
`external_execution.systems` with provider capabilities and eligible entity IDs,
plus `external_execution.zones` with the configured provider, availability, and
nullable runtime `publication`. Publication is `null` until Velair attempts one
in the current runtime; an attempt can be `publishing`, `published`, or `failed`.
`published` means the provider service accepted the call. It is not a hardware
verification claim. Availability is reported separately. Selected registered
providers retain their name and capabilities if they later become unavailable;
unknown persisted provider keys remain safe and unavailable. Publication state
is not persisted, read back, retried, or polled.

Schedule capabilities are provider-neutral: `supports_profile_schedules`,
`supported_actions`, `supported_hvac_modes`, `supported_target_types`,
`supported_option_fields`, `max_switchpoints_per_day`, and
`time_step_minutes`. Providers can also declare
`implicit_midnight_change_counts_toward_limit` when the continuity switchpoint
Velair adds at `00:00` consumes one of the daily changes. Clients must derive controller conditions from these
fields rather than branching on a provider key. The ramses_cc provider declares
`set_temperature`, `heat`, `scalar`, and no supported climate option fields.

## Set Zone Execution Ownership

```ts
await hass.connection.sendMessagePromise({
  type: "velair/set_zone_execution",
  entity_id: "climate.living_room",
  provider: "ramses_cc",
});
```

Both `entity_id` and `provider` are required. Set `provider` explicitly to
`null` to return the zone to local Velair execution. External ownership is
persisted before publication and remains external if publication fails. While
external, all Velair climate actions are rejected. The scheduler resolves and
publishes the effective full week: Default for normal Profile behavior, or the
Profile schedule for schedule behavior. Profile pause behavior is rejected for
external zones. Profile and Mode selection is persisted before publication; a
provider failure does not roll the selection back. Re-selecting Default, a
Profile, or a Mode explicitly republishes the effective week when runtime
publication evidence is `failed` or absent; no background retry is implied.
The result is the full schedule response.

## Diagnostics

Diagnostics uses a separate read-only snapshot so opening the view cannot
change scheduler state. History contains at most 100 sanitized runtime events;
the category selection is persisted, but the events themselves are cleared
whenever Velair or Home Assistant restarts.

### Read Diagnostics

```ts
const diagnostics = await hass.connection.sendMessagePromise({
  type: "velair/get_diagnostics",
});
```

The request has no fields beyond `type`. The result has this top-level schema:

```ts
interface DiagnosticsSnapshot {
  generated_at: string;
  history_limit: number;
  history_policy: {
    categories: Record<DiagnosticsCategory, boolean>;
    runtime_only: true;
    cleared_on_restart: true;
  };
  overall: {
    status: "ok" | "warning" | "error";
    scheduler_mode: string;
    scheduler_status: string;
    unit_counts: { ok: number; warning: number; error: number };
    issues: Array<Record<string, unknown>>;
  };
  units: Record<string, Record<string, unknown>>;
  planned_return?: PlannedReturnStatus;
  history: Array<Record<string, unknown>>;
}

type DiagnosticsCategory =
  | "control"
  | "room_assist"
  | "preconditioning"
  | "planned_return"
  | "comfort"
  | "delivery"
  | "availability";
```

The command returns `not_loaded` when the integration runtime is unavailable.

`planned_return` contains the existing household `PlannedReturnStatus` shape,
with `weekly_enabled` indicating whether the weekly routine is enabled.
Per-climate current attribution is copied into `units[entity_id].intent.planned_return`.
Prospective preparation details remain in the household preparation projection;
they must not be interpreted as current zone authority. Weekly enablement and
one-off availability are independent.

The `planned_return` history category retains `planned_return_changed` events
with a `transition` of `registered`, `confirmation_started`, `confirmation_reset`,
`departed`, `arrival_changed`, `preparation_started`, `fulfilled`, `cancelled`,
`skipped` or `error`. Zone preparation transitions use the standard top-level
`entity_id`; household transitions do not. Safe event data contains only bounded
transition/origin/state/reason, timestamp and Mode/Profile context fields.
Accepted durable transitions are emitted after successful persistence; timer
confirmation transitions describe accepted runtime changes. Failed saves and
unchanged refreshes do not emit accepted-transition events. Repeated identical
errors and preparation retries do not create duplicate rows. History category
retention does not suppress automation events.

These events share the existing 100-entry runtime-only history. Newly introduced
category preferences default to enabled while retaining previous choices.
Exports remove `away_mode_id`, `destination_mode_id` and related operational
Mode/Profile identifiers even when raw entity IDs are requested.

Per-climate `preconditioning_learning.heat` and `.cool` diagnostics retain their
observation counts and can expose current `activity` and `last_transition`.
The latter is derived only from retained Preconditioning history and contains
`at`, `status` (`started`, `skipped`, `interrupted`, `complete`, `partial`, or
`invalid`), a semantic `reason`, and available numeric/timestamp evidence.
Clearing history or disabling its category removes `last_transition` without
changing saved learning observations or current activity. Restart restores
neither diagnostic history nor an active learning session.

Learning transitions are recorded from actual processing, never from queries
or recalculations of future predictions. The existing
`preconditioning_observation_recorded` event supplies the final result;
additional activity events describe starts, skips and interruptions. Invalid
observations distinguish `delta_too_small`, `duration_too_short` and
`duration_too_long`; legacy `out_of_bounds` remains readable. The safe diagnostic
payload includes the result and the evidence used to explain it, and follows
the existing category retention and export privacy rules.

### Export Diagnostics

```ts
const report = await hass.connection.sendMessagePromise({
  type: "velair/export_diagnostics",
  redact_entity_ids: true,
});
```

`redact_entity_ids` is an optional boolean and defaults to `true`. The result is
`{ privacy, diagnostics }`: `diagnostics` has the snapshot schema above and
`privacy` states whether entity IDs were replaced, confirms that operational
Profile, Mode, and pause identifiers are always removed, and reminds callers
that history is runtime-only and the report must be reviewed before sharing.
Setting `redact_entity_ids` to `false` keeps local entity IDs but does not
disable operational-identifier redaction. The command returns `not_loaded` if
Velair is unavailable; a non-boolean option is rejected by WebSocket schema
validation.

### Configure Diagnostics History

```ts
const diagnostics = await hass.connection.sendMessagePromise({
  type: "velair/update_diagnostics_history",
  enabled_categories: ["control", "room_assist", "delivery"],
});
```

`enabled_categories` is a required list containing only the six
`DiagnosticsCategory` values above. The exact enabled set is persisted in the
entry-specific diagnostics policy store. Events belonging to a category that
is disabled are immediately removed from the in-memory history, and future
events in that category are not retained. Current health calculation and
automation events are unaffected. The result is the refreshed
`DiagnosticsSnapshot`. Invalid category names or a missing list fail WebSocket
schema validation; `not_loaded` means the integration is unavailable. A policy
storage failure is returned as a command failure and leaves the previous
in-memory policy active.

### Clear Diagnostics History

```ts
const diagnostics = await hass.connection.sendMessagePromise({
  type: "velair/clear_diagnostics_history",
});
```

The request has no additional fields. It clears only the bounded in-memory
event list and returns the refreshed `DiagnosticsSnapshot`. It does not change
enabled categories, current health evidence, schedules, or climate control.
The command returns `not_loaded` when Velair is unavailable.

### Subscribe To Diagnostics

```ts
const unsubscribe = await hass.connection.subscribeMessage(
  (message) => {
    if (message.loaded) {
      renderDiagnostics(message.diagnostics);
    }
  },
  { type: "velair/subscribe_diagnostics" },
);
```

The request has no additional fields. Successful registration is acknowledged
first, followed immediately by an event shaped as
`{ loaded: true, diagnostics: DiagnosticsSnapshot }`. Later lightweight
diagnostic revisions use the same event shape. If the integration unloads, the
subscription receives `{ loaded: false }`; if it is already unavailable when
subscribing, registration returns `not_loaded`.

## Subscribe To Updates

```ts
const unsubscribe = await hass.connection.subscribeMessage(
  (message) => {
    if (message.loaded && message.schedule) {
      // Re-render with message.schedule.
    }
  },
  {
    type: "velair/subscribe_updates",
  },
);
```

The integration sends an event whenever scheduler state changes. The event contains the full schedule response under `schedule`.
Changes to retained learning evidence also refresh this response, including
clearing history or disabling its category from another client. Unrelated
diagnostic updates do not trigger a full schedule refresh.

## Set Daily Schedule

```ts
await hass.connection.sendMessagePromise({
  type: "velair/set_daily_schedule",
  entity_id: "climate.living_room",
  weekday: "monday",
  blocks: [
    {
      start: "06:00",
      action: "set_temperature",
      target_temp_low: 20,
      target_temp_high: 24,
      hvac_mode: "heat_cool",
      fan_mode: "quiet",
      preset_mode: "eco"
    },
    { start: "12:00", action: "set_hvac_mode", hvac_mode: "auto" },
    { start: "18:00", action: "set_climate_options", preset_mode: "comfort" },
    { start: "23:30", action: "turn_off" }
  ],
});
```

If `action` is omitted, the backend treats the block as `set_temperature` for compatibility with older schedules.

A temperature block may include `temperature_only: true`. It retains target
ownership but does not authorize an HVAC mode change or implicit turn-on.
The field must be boolean and is valid only for `set_temperature`; `true`
cannot coexist with `hvac_mode` or any optional device controls. Omission and
`false` retain existing behavior. The target remains either a single temperature
or a native low/high range. Off-state delivery requires the corresponding
advertised target capability and never starts a mode to obtain that capability.
Schedule events expose the flag, and presets, full templates, hours-only
bindings, Profiles, and portable data preserve it. Portable model v18 prevents
older importers from silently discarding this control policy. Existing older
exports remain importable through their normal migrations. External providers
must advertise `supports_temperature_only`; omission means false.

For example, an inline temperature-only block is
`{ start: "08:00", action: "set_temperature", temperature: 19, temperature_only: true }`.
`Temperature only` is an editor label, never an HVAC mode string passed to HA.

Temperature blocks contain either `temperature`, or the complete
`target_temp_low` and `target_temp_high` pair. The two representations are
mutually exclusive. Blocks may also include optional climate settings:
`fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode`, and
`humidity`. The scheduler filters these fields against the target climate
capabilities before persisting or applying them. Unsupported fields are
dropped; `turn_off` blocks never keep target or optional climate settings.
`set_hvac_mode` blocks require an explicit supported mode other than `off` and
contain no temperature target or optional climate settings. They change only
the HVAC mode and leave the device target untouched.
`set_climate_options` blocks require at least one supported climate option,
contain neither a temperature target nor `hvac_mode`, and send only the
corresponding Home Assistant climate services. Unsupported options are filtered
for a specific entity; a block with no remaining options is rejected. This
action does not turn on a climate that is off.

## Copy Day Schedule

Clone the saved Default day, preserving its template link mode, hours-only
assignments, and preset references. Other destination weekdays are unchanged.
All selected destinations are validated and committed together; an incompatible
destination rejects the operation without modifying any clone destination.

```ts
await hass.connection.sendMessagePromise({
  type: "velair/copy_day_schedule",
  entity_id: "climate.living_room",
  source_weekday: "monday",
  target_weekdays: ["tuesday", "wednesday"],
});
```

Optional `target_entity_ids` selects other managed climates; omitting it targets
the source climate. The selected source day is cloned to every combination of
target climate and weekday. Optional `expected_revision` rejects stale requests;
omitting it clones the latest saved source under the configuration lock. The
panel supplies the revision returned by saving pending source-day changes.
That source save is separate from the atomic destination clone.

```ts
await hass.connection.sendMessagePromise({
  type: "velair/copy_day_schedule",
  entity_id: "climate.living_room",
  source_weekday: "monday",
  target_weekdays: ["monday"],
  target_entity_ids: ["climate.study", "climate.bedroom"],
  expected_revision: configuration.configuration_revision,
});
```

Profile cloning operates on the draft, validates it through `preview_profile`,
and persists only when the complete Profile is saved.

## Clear Schedule

Clear one weekday:

```ts
await hass.connection.sendMessagePromise({
  type: "velair/clear_schedule",
  entity_id: "climate.living_room",
  weekday: "monday",
});
```

Clear all weekdays for one zone:

```ts
await hass.connection.sendMessagePromise({
  type: "velair/clear_schedule",
  entity_id: "climate.living_room",
});
```

## Templates

Create a template:

```ts
await hass.connection.sendMessagePromise({
  type: "velair/set_schedule_template",
  name: "Evening",
  blocks: [
    {
      start: "18:00",
      action: "set_temperature",
      temperature: 21,
      hvac_mode: "heat",
      fan_mode: "quiet"
    },
    { start: "21:00", action: "set_hvac_mode", hvac_mode: "auto" },
    { start: "23:00", action: "set_temperature", temperature: 17 }
  ],
});
```

Update a template by passing its `key`:

```ts
await hass.connection.sendMessagePromise({
  type: "velair/set_schedule_template",
  key: "evening",
  name: "Evening",
  blocks: [
    { start: "18:00", action: "set_temperature", temperature: 20 }
  ],
});
```

Delete a template:

```ts
await hass.connection.sendMessagePromise({
  type: "velair/delete_schedule_template",
  key: "evening",
});
```

## Settings

```ts
await hass.connection.sendMessagePromise({
  type: "velair/update_settings",
  first_weekday: "sunday",
  zone_order: ["climate.living_room"],
  apply_active_schedule_on_startup: true
});
```

Templates are capability-neutral storage. They can contain optional climate
settings from any managed climate. Filtering happens later when a template is
applied to one concrete climate schedule. A `set_hvac_mode` template block
follows the same contract as a daily schedule block: it requires a non-`off`
`hvac_mode` and contains neither a temperature target nor optional climate
settings. A
`set_climate_options` template block contains one or more optional climate
settings and no temperature target or `hvac_mode`; applying it fails for a
climate that supports none of them.

### Preview and apply a saved template

The template library uses `velair/preview_template_application` followed by
`velair/apply_template_application`. Both accept the same application request:

```ts
const application = {
  template_key: "workday",
  source: "default", // or "profile", with profile_key
  mode: "hours", // "copy", "hours", or "full"
  day_layout_key: "weekdays_weekend",
  groups: [{
    entity_id: "climate.living_room",
    weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    base_weekday: "monday",
    // Optional explicit bindings for hours-only review, keyed by template slot ID.
    // bindings: { morning: { preset_key: "comfort" } }
  }],
  expected_revision: data.configuration_revision,
};
const preview = await hass.connection.sendMessagePromise({
  type: "velair/preview_template_application", ...application,
});
// Complete required bases/bindings and review warnings before applying.
const updated = await hass.connection.sendMessagePromise({
  type: "velair/apply_template_application", ...application,
});
```

`source` identifies one Default or Profile context per request; `profile_key`
identifies an existing Profile for `source: "profile"`. Each group identifies a
managed entity and one complete group of the requested built-in layout.
Duplicate or overlapping destinations, incomplete groups, invalid references
and stale revisions are rejected. Only selected entities adopt that layout.

Preview returns `configuration_revision`, `can_apply`, `groups`, `warnings`
and `errors`, without writing configuration or dispatching climate actions.
Each group reports its previous layout/behavior and replaced days, raw
configuration alternatives, whether an explicit base is required, hours-only
proposals and their `exact`/`previous`/`next`/`manual` origins, pending slot
assignments and compatibility errors. The backend owns base equality, donor
selection, adaptation and full-week validation. Explicit bindings are validated
without silently substituting another donor.

Apply rebuilds and validates the candidate under the existing configuration
mutation lock and commits the complete selection once. It returns the standard
schedule response. Invalid assignments or destinations and failed storage do
not leave a partially applied selection. Profile metadata, unrelated zones and
days, active selection and resource definitions remain unchanged. Converting a
Profile zone without its own schedule starts an empty week, not inherited
Default data. Preview warnings identify conversions and mixed unselected groups;
the caller must show them before Apply. No new HA service or portable format is
introduced. Existing daily-save APIs remain compatible.

### External-change Policy

```ts
await hass.connection.sendMessagePromise({
  type: "velair/update_external_change_policy",
  entity_id: "climate.living_room",
  policy: "for_duration",
  duration_minutes: 120,
});
```

`entity_id` is required and must be managed. `policy` is required and accepts
`keep_automatic`, `until_next_block`, `for_duration`, or `until_resumed`.
`duration_minutes` is optional, is meaningful for `for_duration`, and must be
an integer from 1 through 10080. The policy is the default for future external
changes; updating it does not alter an already active Manual adjustment. The
result is the full schedule response.

Errors are `not_loaded`, `temperature_migration_required`,
`operation_in_progress`, or `invalid_external_change_policy`; malformed fields
can also fail WebSocket schema validation.

### Target-temperature Step Fallback

```ts
await hass.connection.sendMessagePromise({
  type: "velair/update_zone_target_temp_step",
  entity_id: "climate.living_room",
  target_temp_step: 0.5,
});
```

`entity_id` must be managed and `target_temp_step` must be a finite positive
number of at least `0.001` that does not exceed the climate's target range. The
value is persisted as a fallback. A valid `target_temp_step` currently published
by Home Assistant always takes priority without deleting this value. When no
valid step is currently published, this explicit write also clears the internal
last-reported observation so the saved value becomes the effective fallback; it
does not modify schedule rules. A later valid entity report is remembered and
takes priority again. The result is the full schedule response. Errors are `not_loaded`,
`temperature_migration_required`, `operation_in_progress`, or
`invalid_target_temp_step`.

### Enter Manual Adjustment

```ts
await hass.connection.sendMessagePromise({
  type: "velair/enter_manual_adjustment",
  entity_id: "climate.living_room",
});
```

The only parameter is the required managed `entity_id`. Velair captures the
live HVAC mode and scalar or native-range target, then starts a persisted
Manual adjustment using that zone's saved policy. If the saved policy is
`keep_automatic`, explicit entry uses `until_resumed` without changing the
saved default. The result is the full schedule response.

Errors are `not_loaded`, `temperature_migration_required`,
`operation_in_progress`, or `manual_adjustment_not_allowed`. The last includes
an unmanaged, unavailable, disabled, already-manual, Profile-paused, otherwise
paused, or non-automatic zone.

### Resume Automatic Control

```ts
await hass.connection.sendMessagePromise({
  type: "velair/resume_automatic_control",
  entity_id: "climate.living_room",
});
```

The only parameter is the required managed `entity_id`. Velair removes only
its Manual-adjustment pause reason, resolves the current Profile, Mode,
schedule, Boost, and remaining pause authority, and applies that intent when
allowed. It does not remove independent pause reasons. The result is the full
schedule response; calling it when the zone is already automatic is harmless.

Errors are `not_loaded`, `temperature_migration_required`,
`operation_in_progress`, or `invalid_entity`. Malformed entity IDs fail
WebSocket schema validation.

## Zone Preconditioning

```ts
await hass.connection.sendMessagePromise({
  type: "velair/update_zone_preconditioning",
  entity_id: "climate.living_room",
  preconditioning: {
    enabled: true,
    master_entity_id: "climate.hall",
    max_lead_minutes: 1440,
    minimum_delta_temperature: 0.3,
    min_start_minutes: 10,
    fallback_minutes_per_degree: 25,
    room_temperature_entity_id: "sensor.living_room_temperature",
    room_sensor_assist_enabled: true,
    room_sensor_assist_deadband: 0.3,
    room_sensor_assist_max_delta: 2.0
  }
});
```

When preconditioning moves the apply time earlier than the visible schedule block time, serialized events keep `when` as the apply time and include `target_when` as the comfort target time. These events also include `preconditioning_diagnostics`, a runtime-only calculation breakdown with selected sample counts, complete estimate, partial floor, combined estimate, rounded estimate, final lead, model source, and limit flags. The frontend uses this object for optional calculation details instead of recalculating the prediction.

`master_entity_id` is optional; `null` unlinks a room. The resulting managed
climate graph is validated atomically. Self-reference, unmanaged or externally
executed sources, cycles and chains are rejected. A disabled source can remain
configured. Portable model 19 includes these relations; older models normalize
to Independent. Partial imports validate the resulting imported-plus-local graph
before persisting it.

Linked events can additionally contain `preconditioning_dependency`, including
nominal events whose early preparation is blocked. Its fields are
`master_entity_id`, `independent_start`, `independent_lead_minutes`,
`master_start`, `master_target_when`, `master_occurrence_id`,
`master_start_accepted`, `effective_start`, `effective_lead_minutes`, `reason`
and `result`. Dates are ISO timestamps; absent source evidence is null.
An optional `reason_detail` refines the explanation without changing `reason`,
`result` or execution times. Known values are `master_not_managed`,
`master_ineligible`, `master_entity_missing`, `master_unavailable`,
`master_state_unknown`, `master_scheduling_disabled`,
`master_preconditioning_disabled`, `master_profile_paused`,
`master_override_active` and `master_no_transition`. Consumers should display
one explanation, preferring a recognized detail and otherwise using `reason`.
Missing or unknown details remain compatible with older responses and clients.
`result` distinguishes `constrained` preparation from `blocked` anticipation.
Consumers use backend `when` for execution and must not synthesize early events
from this metadata. `target_when` retains its existing early-preparation meaning.

The selected source is the closest nominal master occurrence, with ties resolved
to the earlier one; an ineligible selected source is not replaced. Heating and
cooling directions must agree. Runtime delivery also requires accepted source
execution, distinct from a planned start or physical equipment confirmation.
The same optional metadata is exposed through existing event, preparation,
sensor and Diagnostics projections. Older consumers may ignore it; clients must
accept older responses without it.

`preconditioning_accepted_anchors` is bounded HA-storage runtime continuity
evidence, not portable configuration or thermal history. It is excluded from
portable exports and revalidated against effective configuration and return
episode context on reload. Learning sessions themselves are not restored.

Preconditioning is adaptive. The scheduler predicts a lead for each concrete future event, using an initial model while learning and switching to similar local history after enough complete samples exist.

Outdoor temperature context is optional and local. In the Preconditioning tab, `outdoor_temperature_entity_id` is selected through a sensor dropdown that lists local `sensor.*` temperature entities. Velair reads the selected sensor's numeric state, stores it with learning samples, and uses it only to compare similar preconditioning samples once enough history exists. It does not call external weather services and does not apply fixed weather-based adjustments to the initial model.

Room temperature sensor support is optional and local. In the Room Assist tab, `room_temperature_entity_id` is selected through a sensor dropdown that lists local `sensor.*` temperature entities. Selecting a sensor stores the configuration, but Velair uses it as the effective room temperature only when `room_sensor_assist_enabled` is true. In that mode Velair can temporarily adjust a scalar target or move a complete native range while the real scheduled target remains unchanged. For fixed `heat` and `cool` with a scalar target or configured range reference, a non-zero `room_sensor_assist_deadband` defines a runtime hysteresis cycle between the scalar target or selected reference minus and plus that value; `room_sensor_assist_max_delta` caps correction relative to the active edge. A zero deadband preserves legacy signed correction. Scalar automatic modes retain their neutral deadband, while native `heat_cool` ranges retain their stable holding margin. Scalar non-driving targets are kept on the safe side of the scheduled target, and a valid native `heat_cool` holding band remains stable until the external room leaves it or its active target changes. `room_sensor_assist_debounce_seconds` controls how many seconds Velair waits after relevant state changes before recalculating the assisted target. Room Sensor Assist can run on normal scheduled blocks and can also provide the temperature source for Adaptive Preconditioning while it is enabled.

`room_sensor_assist` in the schedule response is runtime-only status. It is derived from Home Assistant state and scheduler state when the response is built; it is not persisted as history.

When the thermostat's physical minimum or maximum changes the target that Room
Assist actually applied, `limited_by` is `minimum` or `maximum` and
`limit_temperature` identifies that boundary. Scalar status then includes
`requested_temperature`; native ranges instead include
`requested_target_temp_low` and `requested_target_temp_high`. These optional
fields are `null` when the last applied runtime target was not limited.

For scalar targets, `scheduled_target_guard` is `cooling_floor` or
`heating_ceiling` when the scheduled target prevented a non-driving calculation
from crossing onto the demanding side. `calculated_temperature` contains the
step-aligned candidate before that protection, while `applied_temperature`
remains the target actually sent. Both fields are optional and runtime-only;
clients must treat their absence as an unguarded or older compatible payload.

For scalar targets, status can also include `pre_step_temperature` together
with `target_temp_step` when alignment to the climate's published step changed
the setpoint that was actually committed. `pre_step_temperature` is the
candidate after scheduled-target protection and min/max clamping, immediately
before alignment. The pair is absent for exact-step results, native ranges,
results changed by a final physical-limit clamp, and older compatible payloads.
Diagnostics copies these live status fields, but they are not persisted or
included in automation events or Home Assistant sensor attributes.

Fixed scalar hysteresis status can additionally include
`hysteresis_phase` (`towards_lower` or `towards_upper`), `hysteresis_target`,
`deadband_low`, and `deadband_high`. These fields are optional, runtime-only,
and absent for the zero-deadband, scalar automatic, and native-range paths.
The phase is not persisted and resets on an active block, target, or HVAC-mode
change, when assistance is cleared, and when Velair or Home Assistant reloads.

See [Adaptive preconditioning](adaptive-preconditioning.md) for the full learning lifecycle, input/output examples, prediction rules, storage behavior, and known limitations. See [Room Assist](room-assist.md) for the room sensor assistance lifecycle, target calculation, runtime status, restoration behavior, and events.

## Zone Comfort

Comfort targets are configured physical `climate.*` IDs, including grouped
members. Logical `group.*` IDs are rejected for Comfort updates. The schedule
response exposes `comfort_settings` for each physical climate and `comfort`
assessments keyed by the same physical IDs. Persisted `member_comfort` retains
settings only for grouped members; singleton settings stay in their existing
zone. Group creation and dissolution preserve these independent settings.


```ts
await hass.connection.sendMessagePromise({
  type: "velair/update_zone_comfort",
  entity_id: "climate.living_room",
  comfort: {
    enabled: true,
    temperature_entity_id: "sensor.living_room_temperature",
    humidity_enabled: true,
    humidity_entity_id: "sensor.living_room_humidity",
    co2_entity_id: "sensor.living_room_co2",
    temperature_min: 20,
    temperature_max: 24,
    humidity_min: 40,
    humidity_max: 60,
    comfort_model: "temperature_aware",
    temperature_aware: {
      at_temperature_min: { minimum: 40, maximum: 60 },
      at_temperature_max: { minimum: 35, maximum: 50 }
    },
    co2_attention: 1000,
    co2_poor: 1500,
    stale_after_minutes: 120,
    outdoor_comparison_enabled: true,
    outdoor_temperature_entity_id: "sensor.outdoor_temperature",
    outdoor_humidity_entity_id: "sensor.outdoor_humidity",
    ventilation_temperature_threshold: 1.5,
    ventilation_humidity_threshold: 7.5,
    ventilation_absolute_humidity_threshold: 1.5,
    derived_metrics: {
      dew_point: { enabled: true, source: "velair", entity_id: null },
      humidex: {
        enabled: true,
        source: "entity",
        entity_id: "sensor.living_room_humidex"
      }
    }
  }
});
```

Comfort settings are per managed climate. `comfort_model` defaults to `simple`, accepts `guided` when humidity monitoring is enabled, and keeps `temperature_aware` for explicit endpoint control. Guided reuses `humidity_min` and `humidity_max` as the midpoint reference and persists no calculated geometry. `temperature_aware` stores complete humidity ranges at the configured minimum and maximum temperatures. Both `temperature_aware` and `derived_metrics` accept deep partial updates, so omitted boundaries, metrics, and fields retain their stored values. Outdoor comparison requires an explicit temperature `sensor.*`; humidity is optional. Disabling it retains both IDs and removes them from active listeners. The three ventilation thresholds are partial, per-climate settings: temperature is a unit-aware delta, while projected humidity uses percentage points and absolute humidity uses `g/m³`. Omitted values retain their stored values. See [Environmental Comfort internals](comfort.md) for validation, interpolation, comparison policy, source selection, listener behavior, and event payloads.

`entity_id: null` is valid for an enabled external metric while configuration is
incomplete; runtime reports it as `missing`. Any non-null external entity ID
must be a syntactically valid `sensor.*` ID, including during portable import.

## Climate Profiles

Create or replace a complete profile definition. Omitting `key` creates a new
stable key; including it updates that profile. Profile zones are sparse:
omitted zones keep their default schedule.

```ts
await hass.connection.sendMessagePromise({
  type: "velair/set_profile",
  profile: {
    name: "Away",
    icon: "mdi:home-export-outline",
    color: "#546e7a",
    description: "Lower demand while nobody is home",
    zones: {
      "climate.living_room": {
        behavior: "pause",
        action: "turn_off"
      }
    }
  }
});
```

The response is the full schedule response plus `profile_id`, containing the
created or updated key. Delete a profile with:

```ts
await hass.connection.sendMessagePromise({
  type: "velair/delete_profile",
  key: "away"
});
```

Deleting an active Profile removes only that ID from the active set; its zones
return to Default and other active Profiles remain. Activate one Profile as a
Manual singleton, or empty the active set with `null` for compatibility, using:

```ts
await hass.connection.sendMessagePromise({
  type: "velair/activate_profile",
  profile_id: "away"
});
```

Activation replaces the complete active set with that Profile. Zones present in
the previous set but not covered by the selected Profile resolve immediately to
their Default schedules. It applies the current effective schedule, cancels
Boost on affected zones, and preserves global or per-zone manual pauses. Direct
activation clears `active_mode_id`, so the native selector reports
`Manual`. New automations should use `velair.deactivate_profile` explicitly to
return to default schedules.

Create or update one Mode with:

```ts
await hass.connection.sendMessagePromise({
  type: "velair/set_mode",
  mode: {
    name: "Away",
    profile_ids: ["away"]
  }
});
```

Omit `key` when creating a mode; include the stable returned key when updating
one. Names are trimmed, limited to 255 characters, case-insensitively unique,
cannot contain control characters, and cannot use the built-in names `Default`
or `Manual`, translated built-in labels such as `Predeterminado`, nor the Home
Assistant states `unknown` and `unavailable`.
Every Mode must provide one or more unique existing IDs in `profile_ids`.
Selected Profiles must not explicitly configure the same zone; conflicting
compositions are rejected. Delete a Mode with:

```ts
await hass.connection.sendMessagePromise({
  type: "velair/delete_mode",
  key: "away-mode"
});
```

The schedule response contains `modes` and `active_mode_id`.
Automations select a configured value through Home Assistant's standard
`select.select_option` action on `select.velair_mode`.

The Velair panel changes the active Mode through a structured WebSocket
command so it does not depend on the user-editable Home Assistant entity ID:

```ts
await hass.connection.sendMessagePromise({
  type: "velair/select_mode",
  selection: { kind: "custom", key: "away-mode" }
});
```

Custom selections use the stable mode `key`. The built-in selections are
`{ kind: "default" }` and `{ kind: "manual" }`. Panel custom selections report
`panel` as their profile-change source; changes made through the native select
entity continue to report `select`.

### Base And Zone Exception Selection

`profile_selection` in every schedule response is the authoritative selection:

```json
{
  "base_profile_ids": ["winter"],
  "base_mode_id": "winter-mode",
  "zone_profile_overrides": {
    "climate.office": "remote_work",
    "climate.guest_room": null
  }
}
```

An absent override inherits the base. A present `null` forces Default; a Profile
ID applies only that Profile's entry for that entity. Overrides are retained
even when they currently equal the base. There is no previous-layer stack.

The response additionally provides `effective_zone_profiles` (managed entity to
effective Profile ID or null) and descriptive `effective_profile_ids`. The latter
is not an activatable list: effective Profiles may overlap in their full
definitions while applying to disjoint zone subsets. Legacy `active_profile_ids`
continues to describe only the base. `active_mode_id` is null while any exception
exists, while `profile_selection.base_mode_id` preserves its identity.

The following WebSocket commands return the updated full schedule response;
equivalent HA actions use the same fields without `type`:

```ts
{ type: "velair/activate_profiles", profile_ids: ["winter_office", "winter_bedrooms"] }
{ type: "velair/apply_profiles", profile_ids: ["remote_work"] }
{ type: "velair/set_zone_profile", entity_id: "climate.office", profile_id: "remote_work" }
{ type: "velair/set_zone_profile", entity_id: "climate.office", profile_id: null }
{ type: "velair/clear_profile_overrides", entity_id: ["climate.office"] }
```

Activation replaces the base and clears exceptions, with an empty list selecting
Default. Applying Profiles writes exceptions only for their explicit zone scopes;
overlaps within a request reject the entire request, including explicit Default
entries. Successive requests may replace shared zones. Zone selection accepts a
fragment of a multizone Profile. Clear accepts an explicit entity or list and
restores inheritance; empty apply/clear lists do nothing. All fields are required,
IDs must be text, and duplicates or unmanaged targets are rejected.

Explicit custom Mode/Default selections clear exceptions. Manual detaches the
base Mode without clearing selection. Editing the selected base Mode preserves
exceptions. Deleting a Profile prunes its base and exception references; editing
away a zone referenced by an exception is rejected until that exception is cleared.
Import never activates new Profile IDs and prunes references removed by import.

`selection_changed` on the existing `velair_event` bus describes complete
selection changes; `profile_changed` retains its base-list semantics. See the
[event guide](../user/automation-events.md#profile-selection-changed).
External selection still cancels Return home before saving selection; the two
saves are not one transaction. Return home snapshots now retain the full base
and exception selection, migrating legacy snapshots to empty exceptions.

## Reset Zone Preconditioning Settings

```ts
await hass.connection.sendMessagePromise({
  type: "velair/reset_zone_preconditioning_settings",
  entity_id: "climate.living_room"
});
```

Restores default tuning parameters for one managed climate. The current enabled state, schedules, and all heat and cool learning samples are preserved.

## Reset Zone Preconditioning Learning

```ts
await hass.connection.sendMessagePromise({
  type: "velair/reset_zone_preconditioning_learning",
  entity_id: "climate.living_room",
  direction: "heat"
});
```

Deletes local adaptive preconditioning observations for one managed climate direction. Valid directions are `heat` and `cool`. Schedule blocks, preconditioning settings, and the other direction's observations are kept.

## Shared fixed-mode range reference

Managed zones may persist `target_range_reference`, an object with optional
`heat` and `cool` keys whose values are `"low"` or `"high"`. An omitted key
means unconfigured. This is separate from `target_range_modes`: one determines
which boundary controls fixed-mode assistance, the other determines delivery
format. Neither `auto` nor `heat_cool` accepts a reference override.

```ts
await hass.connection.sendMessagePromise({
  type: "velair/update_zone_range_reference",
  entity_id: "climate.living_room",
  target_range_reference: {heat: "high", cool: "low"},
  expected_revision: currentRevision
});
```

This replaces the reference object; send `{}` to clear both modes, or omit a
mode key to clear just that selection. The command requires a managed entity,
valid mode/boundary keys and the current configuration revision. It returns the
updated schedule response. Failed validation, revision conflicts and failed
persistence leave the previous configuration in place. A successful change
retires obsolete Room Assist corrections and incompatible learning observations.

Room Assist and Adaptive Preconditioning share this interpretation. Fixed-mode
range assistance is disabled until its reference is configured; nominal schedule
delivery remains available. The selected boundary supplies the scalar target,
while the mode fixes the heating/cooling direction. Room Assist shifts the full
pair together; preconditioning sends the full nominal pair. Auto ranges remain
unsupported; Heat/Cool bands keep their existing interpretation.

## Target-format policy review

Each managed zone includes derived `target_format_policy` data:

```ts
{
  entity_id: "climate.living_room",
  kind: "mixed", // single | range | mixed | unknown
  configured_modes: null, // null = default; [] = explicit no range modes
  range_modes: ["heat_cool"],
  formats_by_mode: {heat: "single", heat_cool: "range"},
  invalid_modes: [],
  uncertain: false
}
```

The persisted optional zone field is `target_range_modes`. The derived policy
must not be imported or written as configuration. Unknown per-mode formats use
`"unknown"`; invalid configured modes remain observable rather than being dropped.
Home Assistant feature masks are entity-wide, not a per-mode compatibility matrix.

Transient device availability does not invalidate saved target configuration.
Configuration validation uses advertised target capabilities and the saved mode
mapping when those are known, including while a climate is temporarily unavailable
or hides its target attributes while off. Missing capabilities remain uncertain.
The runtime policy still reports unknown formats while unavailable and does not
authorize device actions from the configuration-only compatibility check.

Preview a candidate without changing saved configuration or operating the device:

```ts
await hass.connection.sendMessagePromise({
  type: "velair/preview_target_range_policy",
  entity_id: "climate.living_room",
  target_range_modes: ["heat", "heat_cool"],
  expected_revision: currentRevision
});
```

The preview includes `affected_destinations`, `temporary_blockers`,
`automatic_actions` and `can_apply`.
It validates the candidate mode policy against Default, all Profiles and consumers
of shared resources. An incompatible Room Assist correction is reported as
`{ entity_id, type: "stop_room_assist" }` in `automatic_actions`, not as a blocker.
Preview does not end it. Other incompatible temporary objectives must be resolved
before application. Preview success does not prove that a physical device uses both values.

Apply uses `velair/apply_target_range_policy` with the same fields and revision.
Both operations may include a `corrections` object:

```ts
{
  destinations: [{
    source: "default", // default | profile
    // profile_key: "winter", // required for a Profile destination
    entity_id: "climate.living_room",
    schedule: correctedSchedule,
    template_links: correctedLinks
  }]
}
```

Corrections accept only `destinations` for the climate whose policy is changing.
The `templates` and `block_presets` correction fields are rejected, including empty
arrays. Use the normal resource editors to change those resources separately.
Each corrected destination includes its complete weekly schedule. The editor
materializes affected blocks locally, preserves unaffected Preset references,
and removes a Template link only for a corrected day. Policy plus corrections are saved
atomically. Revision conflicts or failed writes leave the previous configuration
and unrelated runtime overrides unchanged. No physical capability probe is run.
On a successful policy save, incompatible Room Assist corrections are ended without
restoring their former targets. Their saved configuration is retained. The current
nominal schedule target is delivered through the normal recovery path. Storage
failure leaves the old correction intact; other temporary blockers still reject
the save. The automatic-action list is derived runtime information, not configuration.
The editor first discovers affected blocks with a policy-only preview. Its Save
action then previews one complete correction request and applies that exact
request and revision only if the new preview permits it. Apply still revalidates
inside the backend transaction, including blockers that changed after preview.
Changing the proposed modes requires a new discovery; retained UI drafts do not
grant correction ownership over destinations unaffected by the new selection.

## Export Data

```ts
await hass.connection.sendMessagePromise({
  type: "velair/export_data",
  sections: ["zones", "templates", "block_presets", "settings", "preconditioning_learning", "profiles", "modes"],
});
```

Returns a versioned portable JSON payload:

```json
{
  "format": "velair_portable_data",
  "model_version": 23,
  "temperature_unit": "°C",
  "exported_at": "2026-05-25T00:00:00+00:00",
  "sections": {}
}
```

## Import Data

```ts
await hass.connection.sendMessagePromise({
  type: "velair/import_data",
  payload,
  sections: ["templates"]
});
```

Selected sections replace their existing data, except `block_presets`, which
merges by immutable key and retains local presets absent from the file.
Referenced template and preset libraries are included automatically, including
presets used by templates reached from selected Default or Profile schedules.
Portable model 16 supports complete template links and template-owned presets;
links from earlier files without a mode remain hours-only. Import
validates the complete combined graph, including existing local consumers,
before saving. Profile and Mode definitions are
portable, but the active Profile set and selected Mode are never exported or
selected by import. Replacing definitions retains active IDs that still exist
and returns to default schedules only when the active set becomes empty.

Portable model v5 payloads add the optional `modes` section. V4 payloads
remain valid. Portable payloads declare `temperature_unit`; models created before
unit metadata existed may omit it; the backend treats those values as Celsius.
Portable model v8 adds the independent `room_sensor_assist_deadband`. When a v7
or older zone omits it, import migrates the legacy
`minimum_delta_temperature` value before any unit conversion.
Portable model v9 adds each zone's optional Comfort `derived_metrics`
configuration. It preserves whether a metric is enabled, whether Velair or a
Home Assistant entity supplies it, and the retained `entity_id`. Runtime values,
availability, issues, and calculated inputs are deliberately not exported. An
enabled external metric without an entity remains a valid incomplete
configuration after import.
Portable model v10 adds the opt-in outdoor-comparison flag, retained
temperature/humidity sensor IDs, and per-zone ventilation-guidance thresholds.
Runtime readings and conclusions are not exported. Older or partial portable
models use the disabled comparison and default guidance sensitivity.
Portable model v11 adds each zone's Comfort model and retained
temperature-aware endpoint ranges. It also accepts Guided without storing its
calculated curve. Runtime `comfort_zone` geometry and its
effective range are recalculated after import and are never exported as state.
Each included endpoint must contain both `minimum` and `maximum`; incomplete or
invalid ranges are rejected instead of being silently replaced. Older payloads
normalize to the Simple model.
If the source differs from Velair's current Home Assistant unit, selected thermal
data is converted before normalization. Managed climates with known limits are
aligned to their effective published, last-reported, manual, or default target
grid. The portable zone model includes `target_temp_step_override` but excludes
the device-local `last_reported_target_temp_step`. Standalone template values use
safe fallback precision when no common exact device step can be derived. Data for
unmatched climate IDs is not applied or used to transform existing local zones.

Export is available while scheduling is blocked by a pending temperature-unit
resolution and remains a read-only operation during reset, migration, or import.

The `preconditioning_learning` section is incremental by exact control-unit ID:
an independent climate entity ID or an internal room-group ID. Matching managed
units receive the normalized imported history, unknown IDs are ignored, and
existing history for local units absent from the file is preserved. A group
history is not copied or split among physical members.

## Reset Data

```ts
await hass.connection.sendMessagePromise({
  type: "velair/reset_data",
  confirmation: "reset"
});
```

This deletes all stored Velair data, including schedules, templates, panel
preferences, active boosts and pauses, per-zone external-change policies and
persisted Manual-adjustment state, Comfort and Room Assist settings, Adaptive
Preconditioning settings and learning, and startup behavior. It then recreates
unit-aware defaults for the currently managed climates. The separate
Diagnostics category policy and runtime log are not schedule data reset by this
command. The frontend must ask the user for confirmation before calling this
command.

## Planned Return Commands

These commands require administrator access and return the complete schedule
response. Configuration uses stable Mode keys; `default` means Default.

```ts
await hass.connection.sendMessagePromise({
  type: "velair/update_planned_return",
  planned_return: {
    enabled: true,
    occupancy_entity_ids: ["zone.home", "input_boolean.guests_home"],
    away_mode_id: "away",
    destination_mode_id: "home",
    absence_delay_minutes: 10,
    weekly: {
      monday: "18:15", tuesday: "18:15", wednesday: "18:15",
      thursday: "18:15", friday: "18:15", saturday: null, sunday: null
    }
  }
});
await hass.connection.sendMessagePromise({
  type: "velair/start_planned_return",
  return_at: "2026-10-07T19:25:00+02:00",
  apply_away_now: true // Optional; omit to keep normal absence confirmation.
});
await hass.connection.sendMessagePromise({ type: "velair/cancel_planned_return" });
await hass.connection.sendMessagePromise({
  type: "velair/adjust_planned_return",
  return_at: "2026-10-07T19:45:00+02:00"
});
await hass.connection.sendMessagePromise({ type: "velair/skip_planned_return" });
await hass.connection.sendMessagePromise({ type: "velair/arrive_planned_return" });
```

Start and arrival adjustment accept a timezone-aware strictly future instant on
any arrival date, not only the current Home Assistant local date. Instants are
persisted in UTC; destination schedules use the Home Assistant local calendar. Start uses saved sources and Mode settings and can arm
a request with the automatic routine disabled. With an empty saved source list,
explicit start instead creates a confirmed manual departure immediately and
applies Away without a confirmation timer; `occupancy` remains unknown and
`sources` remains empty. Normal preparation, arrival, restart and cancellation
authority are unchanged. A pending request has episode state
`armed` and origin `manual`; while its absence delay is running, public state is
`confirming_absence`. Cancel withdraws pending and active return authority,
removes preparation, and retains a dismissed cancellation latch. For active
confirmed absence it restores the persisted `previous_selection` snapshot
(`mode_id`, ordered `profile_ids`); pending and terminal states do not restore.
The optional snapshot is captured for fresh episodes and survives arrival edits
and normalization across restart. Legacy episodes without it retain selection.
A removed/changed Mode loses its marker while its saved valid Profiles are
restored; missing/invalid/conflicting Profiles leave selection unchanged with
a runtime restoration error, without preventing accepted cancellation. It also closes
any terminal notice. Cancellation works with missing sources, a stopped scheduler,
or unresolved temperature migration; exclusive data operations still block writes. Starting during an
active absence updates its arrival date and time without reapplying Away. Any fulfilled, skipped, or cancelled episode
can be replaced by an explicit start using current saved settings: a fresh
manual pending episode and delay when sources exist, or an immediately confirmed
manual departure when the saved source list is empty. Cancellation remains an automatic
departure latch until occupancy or explicit replacement, including across restart.
Validation or save failure preserves that latch and the current Mode.

`sources` contains `{entity_id, state}` entries (`home`, `away`, `unknown`);
`occupancy` is their fixed aggregate. `origin` is `automatic`, `manual` or null;
`can_start` reports whether saved settings, episode state and scheduler conditions
permit a start. `episode_active` identifies underlying armed/away authority even when public
`state` is `error`. `can_cancel` permits withdrawal or closing any undismissed
episode independently of scheduler/configuration availability. `can_dismiss`
permits closing an unacknowledged terminal episode,
even when its public state is masked by an error; `dismissed` persists acknowledgement
of that notice while `state` retains its cancellation semantics. These fields do not
authorize climate changes. An unknown source state can wait for confirmation; a missing source
cannot start a new request. Adjustment changes a pending or active episode only.

Portable model 16 stores `occupancy_entity_ids`. Legacy singular
`occupancy_entity_id` configuration is migrated, including model 15 imports.
Imports validate references against
the resulting Mode set and always disable the imported routine. Episodes and
timers are not portable.

### Per-Room Preparation Diagnostics

`planned_return_status.preparation` is additive, derived read-only status. It
contains `context` (`configuration` or `arrival`), `mode_id`, `return_at` and
`zones` for all managed climate entities. Arrival context requires an armed or
active absence with a future arrival and uses its saved destination; other states
describe current saved configuration without invented targets or start times.

Each zone contains `entity_id`, `profile_id`, `schedule_source` (`profile`,
`default`, `paused`), `preparation` (`adaptive`, `arrival_only`, `none`), `state`
(`configured`, `pending`, `preparing`, `reached`, `suspended`, `unavailable`),
`reason`, `start_at` and an optional `target` temperature mapping. `start_at`
denotes a predicted start, never an episode's departure time. Profile normal
behavior and sparse Mode membership resolve to Default. Capability classification
is distinct from temporary delivery suspension. Existing `zones` remains for
compatibility, but the panel renders only the comprehensive preparation list.
The projection does not persist configuration, start timers, learn observations
or apply climate actions; consumers must not derive scheduler decisions from it.

## Error Behavior

- `not_loaded`: the integration is not loaded.
- `invalid_schedule`: a schedule is invalid or targets an unmanaged climate.
- `invalid_template`: a template is invalid or unknown.
- `invalid_settings`: settings are invalid.
- `invalid_planned_return`: the routine, Mode references, or episode action is invalid.
- `invalid_external_change_policy`: an external-change policy or target is invalid.
- `manual_adjustment_not_allowed`: the requested zone cannot enter Manual adjustment in its current state.
- `invalid_entity`: the requested entity is not managed by Velair.
- `invalid_preconditioning`: preconditioning settings are invalid or target an unmanaged climate.
- `invalid_comfort`: Comfort settings are invalid or target an unmanaged climate.
- `invalid_import`: the import file is invalid or incompatible.
- `invalid_temperature_migration`: the requested source, revision, or migration state is invalid.
- `operation_in_progress`: a reset, migration, or import currently owns the data write guard.
- `operation_recovery_required`: data was persisted, but runtime cleanup or option updates failed. The scheduler remains stopped until the integration is reloaded or Home Assistant restarts.
- `temperature_migration_required`: thermal writes remain stopped until the stored unit is resolved.
- `temperature_migration_failed`: the migration could not be persisted; its write guard was released and scheduling remains governed by the still-stored unit metadata.

Climate actions use blocking Home Assistant calls so explicit invocation
failures are observable. Scheduler-owned intentions may complete later through
bounded runtime recovery; delayed attempts always resolve current backend state
instead of replaying the original service payload. Manual temperature actions
remain one-shot and report an unavailable or rejected call to their caller.

## Shared climate supply

The panel calls this feature **Supply control**, its configured entries **Shared
supplies**, and their editable names **Supply name**. The persisted collection
`shared_demand_groups`, WebSocket `groups` array and `group_id` fields retain
their existing identifiers for compatibility. They describe shared supplies,
not general-purpose thermostat groups.

Portable model 21 adds `settings.shared_demand_groups`. Each shared supply contains `id`,
`name`, `enabled`, `switch_entity_id`, `direction` (`heat` or `cool`), `hysteresis`,
`minimum_off_seconds`, `off_delay_seconds`, `zones` (managed climate IDs mapped to
an empty object or `{ "hysteresis": 0.5 }`) and `suspended`. Hysteresis values are
temperature differences. Import always disables and suspends supplies; local
`settings.shared_demand_cleanup` recovery intent is never exported or imported.
Timing fields require whole seconds from 0 to 86,400 on API save and import;
fractional values are rejected before configuration is mutated. Integral numeric
values such as `1.0` are accepted.

Portable model 24 adds supply `on_delay_seconds`, defaulting to zero when absent.
It requires continuous known aggregate demand before a new start. Loss of demand,
unknown aggregate intent, suspension or disabling resets confirmation. Room-to-room
handoffs do not reset it while aggregate demand stays true. Confirmation and
minimum-off deadlines overlap; the later deadline determines when starting is
allowed. Confirmation is runtime-only and starts fresh after resume or restart.
Optional `suspension_reason` records `external_off` for an observed external
shutdown and `imported` for an imported supply. Legacy suspensions can omit it.
Import replaces the original reason with `imported`; resume clears it. Runtime
status includes the reason so the UI does not attribute imported or unknown
suspensions to an external shutdown.

Portable model 23 adds optional zone `target_range_reference`, preserving each
mode's explicit lower/upper reference through export and import. Older payloads
leave both modes unconfigured; older importers reject the newer model instead
of silently dropping this interpretation.

Portable model 22 adds optional supply `hysteresis_mode` (`at_target`, `symmetric`,
`custom`) and `hysteresis_stop`. Missing mode retains model 21's at-target behavior;
missing custom stop defaults to zero. `hysteresis` remains the start offset.
The effective stop offset is zero for at-target, the effective start offset for
symmetric, or `hysteresis_stop` for custom. Zone objects can independently override
`hysteresis` and `hysteresis_stop`, and cannot override the supply mode. Both offsets
are temperature differences, including dormant custom values preserved across
mode changes. Heating starts at target minus start and stops at target plus stop;
cooling reverses the signs. Stop wins at equality when both offsets are zero.
Room Assist's committed intent takes precedence over all three modes.

`velair/update_shared_demand` accepts a complete `groups` array and optional
`expected_revision`. `velair/resume_shared_demand` accepts `group_id` and optional
`expected_revision`. Both require administrator access, reject data-operation or
temperature-migration blocks, validate backend-owned state and return the schedule
response. Supply edits preserve an existing suspension; only resume clears it.

The schedule response includes `shared_demand_status` keyed by supply ID, with
`status`, `output_state`, `demand`, `suspended`, room demand explanations and any
`pending_until` deadline. `cleanup:<switch>` entries expose pending retired-output
failures; `_configuration` exposes malformed stored setup. These are estimates
and accepted service actions, not physical supply measurements. Status updates
exclude measured-temperature-only notification changes and introduce no polling.

`status: "on_delay"` identifies demand confirmation; `minimum_off` identifies the
minimum-off protection when that deadline is later. For either wait,
`pending_until` is the effective earliest start deadline. Reaching it triggers a
fresh backend evaluation, not a guarantee that the output will turn on. External
off suspension is reported separately from confirmed external-on corrections,
with a persistent notification and Activity entry explaining the need to resume.
