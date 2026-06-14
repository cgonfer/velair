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
      "override": null
    }
  },
  "operational_status": "scheduled",
  "next_event": null,
  "next_events": [],
  "active_overrides": {},
  "templates": [],
  "versions": {
    "export_format": "velair_portable_data",
    "portable_model": 1,
    "storage": 1,
    "model": 1,
    "integration": "1.0.0"
  }
}
```

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

## Export Data

```ts
await hass.connection.sendMessagePromise({
  type: "velair/export_data",
  sections: ["zones", "templates", "settings"],
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
- `invalid_import`: the import file is invalid or incompatible.
