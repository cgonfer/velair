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

```json
{
  "configured_entities": ["climate.living_room"],
  "global": {
    "mode": "auto",
    "paused_started_at": null,
    "paused_until": null
  },
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
            "hvac_mode": "heat"
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
        "outdoor_temperature_entity_id": "sensor.outdoor_temperature"
      }
    }
  },
  "operational_status": "scheduled",
  "next_event": null,
  "next_events": [],
  "active_overrides": {},
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
    "portable_model": 1,
    "storage": 1,
    "model": 1,
    "integration": "1.1.0"
  }
}
```

`next_event` is the scheduler's earliest due action. `next_events` is the UI-oriented list of the next visible event per managed climate, sorted by apply time; preconditioning events include `target_when` so the panel can show both the early start and the comfort target time.

`preconditioning_learning` is local runtime/storage status used by the panel. It can be included explicitly in portable exports and is never sent outside Home Assistant by Velair. Direction statuses are `learning`, `ready`, or `unsupported` when the climate does not report a compatible HVAC mode. A direction is `ready` when it has at least 5 complete local samples; before that, Adaptive predictions use the initial event-specific model.

The actual lead is calculated per future event from the current temperature delta and the selected local model source (`initial_model` or `history`).

Stored observations are trimmed per climate direction. `learning_history_size` limits useful `complete` and `partial` samples, while only the 10 newest `invalid` diagnostic samples are retained separately. Invalid samples cannot evict useful learning history. Heat and cool keep separate local histories, so seasonal cooling samples cannot evict heating samples, and heating samples cannot evict cooling samples.

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
    { start: "06:00", action: "set_temperature", temperature: 21, hvac_mode: "heat" },
    { start: "23:30", action: "turn_off" }
  ],
});
```

If `action` is omitted, the backend treats the block as `set_temperature` for compatibility with older schedules.

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
    { start: "18:00", action: "set_temperature", temperature: 21, hvac_mode: "heat" },
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
    fallback_minutes_per_degree: 25
  }
});
```

When preconditioning moves the apply time earlier than the visible schedule block time, serialized events keep `when` as the apply time and include `target_when` as the comfort target time.

Preconditioning is adaptive. The scheduler predicts a lead for each concrete future event, using an initial model while learning and switching to similar local history after enough complete samples exist.

Outdoor temperature context is optional and local. In the Preconditioning tab, `outdoor_temperature_entity_id` is selected through a sensor dropdown that lists local `sensor.*` temperature entities. Velair reads the selected sensor's numeric state, stores it with learning samples, and uses it only to compare similar preconditioning samples once enough history exists. It does not call external weather services and does not apply fixed weather-based adjustments to the initial model.

See [Adaptive preconditioning](adaptive-preconditioning.md) for the full learning lifecycle, input/output examples, prediction rules, storage behavior, and known limitations.

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
  sections: ["zones", "templates", "settings", "preconditioning_learning"],
});
```

Returns a versioned portable JSON payload:

```json
{
  "format": "velair_portable_data",
  "model_version": 1,
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

Selected sections overwrite existing data.

The `preconditioning_learning` section is incremental by climate entity ID: matching managed climates receive the normalized imported history, unknown climate IDs are ignored, and existing history for local climates absent from the file is preserved.

## Reset Data

```ts
await hass.connection.sendMessagePromise({
  type: "velair/reset_data",
  confirmation: "reset"
});
```

This resets stored schedules, templates, panel preferences, active boosts, and startup behavior. The frontend must ask the user for confirmation before calling this command.

## Error Behavior

- `not_loaded`: the integration is not loaded.
- `invalid_schedule`: a schedule is invalid or targets an unmanaged climate.
- `invalid_template`: a template is invalid or unknown.
- `invalid_settings`: settings are invalid.
- `invalid_preconditioning`: preconditioning settings are invalid or target an unmanaged climate.
- `invalid_import`: the import file is invalid or incompatible.
