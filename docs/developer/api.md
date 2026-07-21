# WebSocket API

Velair exposes WebSocket commands for the sidebar panel and optional Lovelace card.

Frontend code should use Home Assistant's WebSocket connection:

```ts
await hass.connection.sendMessagePromise({
  type: "velair/get_schedule",
});
```

## Schedule Response

Most write commands return the full schedule response:

The response includes a runtime-only `zone_runtime` mapping. It is derived by the backend and never persisted. Each managed climate reports an authoritative `state` (`stopped`, `paused`, `boost`, `preconditioning`, `scheduled`, or `idle`) plus the minimal available room, target, applied setpoint, HVAC mode, and relevant timing fields used by Overview.

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
    "active_profile_id": "away"
  },
  "active_profile_id": "away",
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
            "temperature": 21,
            "hvac_mode": "heat",
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
        "co2_attention": 1000,
        "co2_poor": 1500,
        "stale_after_minutes": 120
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
      "target_temperature": 21,
      "applied_temperature": 22.5,
      "climate_target_temperature": 22.5,
      "room_temperature": 19.8,
      "climate_temperature": 20.5,
      "assist_delta": 1.2,
      "direction": "heat",
      "hvac_mode": "heat",
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
      "target_temperature": 21,
      "applied_temperature": 22.5,
      "hvac_mode": "heat",
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
    "portable_model": 3,
    "storage": 1,
    "model": 1,
    "integration": "1.2.0"
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

`preconditioning_learning` is local runtime/storage status used by the panel. It can be included explicitly in portable exports and is never sent outside Home Assistant by Velair. Direction statuses are `learning`, `ready`, or `unsupported` when the climate does not report a compatible HVAC mode. A direction is `ready` when it has at least 5 complete local samples; before that, Adaptive predictions use the initial event-specific model.

The actual lead is calculated per future event from the current temperature delta and the selected local model source (`initial_model` or `history`).

Stored observations are trimmed per climate direction. `learning_history_size` limits useful `complete` and `partial` samples, while only the 10 newest `invalid` diagnostic samples are retained separately. Invalid samples cannot evict useful learning history. Heat and cool keep separate local histories, so seasonal cooling samples cannot evict heating samples, and heating samples cannot evict cooling samples.

`comfort` is the local runtime Environmental Comfort assessment. It contains the human environmental `condition`, independent CO2 `air_quality`, `data_quality`, `data_issues`, and raw metric payloads. Opening or refreshing the panel does not emit comfort automation events.

## Read Schedule State

```ts
await hass.connection.sendMessagePromise({
  type: "velair/get_schedule",
});
```

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
      temperature: 21,
      hvac_mode: "heat",
      fan_mode: "quiet",
      preset_mode: "eco"
    },
    { start: "23:30", action: "turn_off" }
  ],
});
```

If `action` is omitted, the backend treats the block as `set_temperature` for compatibility with older schedules.

Temperature blocks may include optional climate settings: `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode`, and `humidity`. The scheduler filters these fields against the target climate capabilities before persisting or applying them. Unsupported fields are dropped; `turn_off` blocks never keep optional climate settings.

## Copy Day Schedule

```ts
await hass.connection.sendMessagePromise({
  type: "velair/copy_day_schedule",
  entity_id: "climate.living_room",
  source_weekday: "monday",
  target_weekdays: ["tuesday", "wednesday"],
});
```

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

Templates are capability-neutral storage. They can contain optional climate settings from any managed climate. Filtering happens later when a template is applied to one concrete climate schedule.

## Zone Preconditioning

```ts
await hass.connection.sendMessagePromise({
  type: "velair/update_zone_preconditioning",
  entity_id: "climate.living_room",
  preconditioning: {
    enabled: true,
    max_lead_minutes: 1440,
    minimum_delta_temperature: 0.3,
    min_start_minutes: 10,
    fallback_minutes_per_degree: 25,
    room_temperature_entity_id: "sensor.living_room_temperature",
    room_sensor_assist_enabled: true,
    room_sensor_assist_max_delta: 2.0
  }
});
```

When preconditioning moves the apply time earlier than the visible schedule block time, serialized events keep `when` as the apply time and include `target_when` as the comfort target time. These events also include `preconditioning_diagnostics`, a runtime-only calculation breakdown with selected sample counts, complete estimate, partial floor, combined estimate, rounded estimate, final lead, model source, and limit flags. The frontend uses this object for optional calculation details instead of recalculating the prediction.

Preconditioning is adaptive. The scheduler predicts a lead for each concrete future event, using an initial model while learning and switching to similar local history after enough complete samples exist.

Outdoor temperature context is optional and local. In the Preconditioning tab, `outdoor_temperature_entity_id` is selected through a sensor dropdown that lists local `sensor.*` temperature entities. Velair reads the selected sensor's numeric state, stores it with learning samples, and uses it only to compare similar preconditioning samples once enough history exists. It does not call external weather services and does not apply fixed weather-based adjustments to the initial model.

Room temperature sensor support is optional and local. In the Room Assist tab, `room_temperature_entity_id` is selected through a sensor dropdown that lists local `sensor.*` temperature entities. Selecting a sensor stores the configuration, but Velair uses it as the effective room temperature only when `room_sensor_assist_enabled` is true. In that mode Velair can temporarily adjust the target sent to the thermostat by at most `room_sensor_assist_max_delta` while the real scheduled target remains unchanged. `room_sensor_assist_debounce_seconds` controls how many seconds Velair waits after relevant state changes before recalculating the assisted target. Room Sensor Assist can run on normal scheduled blocks and can also provide the temperature source for Adaptive Preconditioning while it is enabled.

`room_sensor_assist` in the schedule response is runtime-only status. It is derived from Home Assistant state and scheduler state when the response is built; it is not persisted as history.

See [Adaptive preconditioning](adaptive-preconditioning.md) for the full learning lifecycle, input/output examples, prediction rules, storage behavior, and known limitations. See [Room Assist](room-assist.md) for the room sensor assistance lifecycle, target calculation, runtime status, restoration behavior, and events.

## Zone Comfort

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
    co2_attention: 1000,
    co2_poor: 1500,
    stale_after_minutes: 120
  }
});
```

Comfort settings are per managed climate. The scheduler only listens to comfort-related entities for climates where `comfort.enabled` is true. See [Environmental Comfort internals](comfort.md) for source selection, assessment calculation, runtime listener behavior, and event payloads.

## Climate Profiles

Create or replace a complete profile definition. Omitting `key` creates a new
stable key; including it updates that profile. Profile zones are sparse:
omitted zones keep their Normal schedule.

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

Deleting the active profile returns Velair to Normal. Activate a profile, or
return to Normal with `null`, using:

```ts
await hass.connection.sendMessagePromise({
  type: "velair/activate_profile",
  profile_id: "away"
});
```

Activation applies the current effective schedule immediately, cancels Boost
on affected zones, and preserves global or per-zone manual pauses.

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

## Export Data

```ts
await hass.connection.sendMessagePromise({
  type: "velair/export_data",
  sections: ["zones", "templates", "settings", "preconditioning_learning", "profiles"],
});
```

Returns a versioned portable JSON payload:

```json
{
  "format": "velair_portable_data",
  "model_version": 4,
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

Selected sections overwrite existing data. Profile definitions are portable,
but the active profile is never exported or selected by import. If replacing
definitions removes the active profile, Velair returns to Normal.

Portable model v4 payloads declare `temperature_unit`. Models created before
unit metadata existed may omit it; the backend treats those values as Celsius.
If the source differs from Velair's current Home Assistant unit, selected thermal
data is converted before normalization. Managed climates with known limits and
`target_temp_step` are aligned to that exact grid. Standalone template values use
safe fallback precision when no common exact device step can be derived. Data for
unmatched climate IDs is not applied or used to transform existing local zones.

Export is available while scheduling is blocked by a pending temperature-unit
resolution and remains a read-only operation during reset, migration, or import.

The `preconditioning_learning` section is incremental by climate entity ID: matching managed climates receive the normalized imported history, unknown climate IDs are ignored, and existing history for local climates absent from the file is preserved.

## Reset Data

```ts
await hass.connection.sendMessagePromise({
  type: "velair/reset_data",
  confirmation: "reset"
});
```

This deletes all stored Velair data, including schedules, templates, panel preferences, active boosts and pauses, Comfort and Room Assist settings, Adaptive Preconditioning settings and learning, and startup behavior. It then recreates unit-aware defaults for the currently managed climates. The frontend must ask the user for confirmation before calling this command.

## Error Behavior

- `not_loaded`: the integration is not loaded.
- `invalid_schedule`: a schedule is invalid or targets an unmanaged climate.
- `invalid_template`: a template is invalid or unknown.
- `invalid_settings`: settings are invalid.
- `invalid_preconditioning`: preconditioning settings are invalid or target an unmanaged climate.
- `invalid_comfort`: Comfort settings are invalid or target an unmanaged climate.
- `invalid_import`: the import file is invalid or incompatible.
- `invalid_temperature_migration`: the requested source, revision, or migration state is invalid.
- `operation_in_progress`: a reset, migration, or import currently owns the data write guard.
- `operation_recovery_required`: data was persisted, but runtime cleanup or option updates failed. The scheduler remains stopped until the integration is reloaded or Home Assistant restarts.
- `temperature_migration_required`: thermal writes remain stopped until the stored unit is resolved.
- `temperature_migration_failed`: the migration could not be persisted; its write guard was released and scheduling remains governed by the still-stored unit metadata.
