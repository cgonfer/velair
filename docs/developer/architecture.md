# Architecture

Velair is a vendor-neutral Home Assistant custom integration. It does not depend on any thermostat manufacturer API. Its runtime contract with devices is Home Assistant's `climate.*` entity model and climate service actions.

## Design Principles

- Keep setup in Config Flow and options flow.
- Keep runtime code asynchronous.
- Avoid continuous polling when Home Assistant callbacks, dispatcher signals, or scheduled timers are enough.
- Keep scheduler rules in the backend.
- Keep frontend state ephemeral unless it is explicitly persisted through the backend.
- Validate every climate-targeting action against the configured entities.
- Preserve support for heating and cooling systems.
- Prefer Home Assistant components and theme variables in the frontend.
- Keep the sidebar panel as the primary app experience; keep the Lovelace card optional.

## Backend Modules

```text
custom_components/velair/
  __init__.py          integration setup and unload
  api.py               WebSocket API used by the frontend
  climate_manager.py   adapter around Home Assistant climate services
  config_flow.py       setup flow and options flow
  config_helpers.py    config entry helpers
  const.py             constants and service keys
  entity.py            shared entity base
  frontend.py          panel and static frontend registration
  models.py            typed model normalization and serialization
  scheduler.py         event calculation, timers, overrides, logbook entries
  sensor.py            diagnostic/status sensors
  services.py          Home Assistant service actions
  services.yaml        service descriptions
  storage.py           Home Assistant Store wrapper
  switch.py            schedule enable/disable entity
  select.py            scheduler mode entity
  translations/        Home Assistant translations
```

## Data Model

The storage model is intentionally simple and versioned:

```json
{
  "version": 1,
  "zones": {
    "climate.living_room": {
      "enabled": true,
      "schedule": {
        "monday": [
          {
            "start": "06:00",
            "action": "set_temperature",
            "temperature": 21.0,
            "hvac_mode": "heat"
          },
          {
            "start": "23:30",
            "action": "turn_off"
          }
        ]
      },
      "override": null
    }
  },
  "global": {
    "mode": "auto",
    "paused_until": null,
    "paused_started_at": null
  },
  "settings": {
    "first_weekday": "monday",
    "zone_order": [],
    "min_temperature": 5.0,
    "max_temperature": 35.0
  },
  "templates": [],
  "templates_seeded": true
}
```

`models.py` normalizes stored data on load. This allows Velair to tolerate old or partial storage data and gives future migrations a single place to evolve.

## Scheduler Flow

```text
Home Assistant setup
|
+-- Load and normalize storage
+-- Create ClimateManager
+-- Create VelairScheduler
+-- Register services, entities, frontend, and WebSocket API
+-- Schedule next event

Timer callback
|
+-- Clear expired global pause, zone boost, or zone pause
+-- Resolve due schedule events
+-- Apply climate action
+-- Log operational action to Home Assistant logbook when available
+-- Recalculate and schedule the next event
```

Velair stores temporary modes as timestamps:

- Global pause suspends every schedule until it expires or the scheduler is resumed.
- Zone boost stores an override on one zone and suppresses scheduled events only for that zone until the boost expires.
- Zone pause stores an override on one zone and suppresses scheduled events only for that zone until it expires or that zone is resumed. A zone pause may optionally turn the climate off when it starts.

## Climate Application Rules

When applying a temperature:

1. If an HVAC mode is provided, Velair applies that mode.
2. If no mode is provided and the climate is already on, Velair preserves the current mode.
3. If no mode is provided and the climate is off, Velair uses the first supported mode that is not `off`.

This keeps schedule blocks useful across heating-only, cooling-only, and mixed systems.

## Frontend Contract

The frontend communicates with the backend through `api.py` WebSocket commands. The frontend edits and validates user input, but the backend remains the source of truth for:

- persisted schedules;
- templates;
- settings;
- scheduler mode;
- next events;
- active overrides;
- version metadata;
- reset behavior.

The frontend should never persist Velair configuration to `localStorage`.

## Frontend Modules

```text
frontend/src/
  velair-card.ts        public bundle entry point and custom element registration
  velair/
    api/                WebSocket client used by the frontend
    components/         Lit custom element classes, lifecycle, state, and composition
    controllers/        user actions, validation, draft state updates, orchestration, and derived view data
    domain/             pure helpers for schedules, formatting, templates, portability, climate display, and timelines
    styles/             CSS modules composed into the Velair card and panel
    translations/       typed frontend language dictionaries
    views/              Lit templates for panel and card UI
    build-info.ts       generated build and release metadata constants
    constants.ts        shared frontend constants and view keys
    host-types.ts       shared host contracts used by view modules
    i18n.ts             language resolution and translation helper
    registration.ts     custom element and custom card registration helper
    schedule-time.ts    schedule time parsing and formatting helpers
    types.ts            shared frontend TypeScript types
```

The preferred dependency direction is:

```text
components -> views -> controllers -> domain
components -> api
views -> host-types
```

Domain modules should not depend on Lit, Home Assistant UI elements, browser storage, or generated bundles.

## Schedule Save Flow

This is the normal flow when a user updates and saves a schedule day:

```text
Schedules view
|
+-- User changes draft blocks
+-- draft-actions controller updates temporary frontend state
+-- draft-validation controller validates temperature limits and steps
+-- schedule-actions controller normalizes blocks and validates HVAC mode compatibility
+-- api/client.ts sends the update to the backend WebSocket API
+-- api.py validates and persists the change through storage.py/models.py
+-- scheduler.py recalculates next events
+-- backend response returns fresh ScheduleResponse data
+-- schedule-state controller applies backend-owned data to the frontend
+-- views rerender from the refreshed state
```

This flow allows responsive editing while preserving backend-owned persistence.

## Template Apply Flow

Templates are edited in the frontend as drafts, but applying them still goes through backend-owned schedules:

```text
Templates view
|
+-- User selects a template and target climates/days
+-- template-actions controller builds the target operation
+-- schedule-actions controller clamps temperatures to each target climate limits
+-- unsupported HVAC modes are rejected with a user-visible error
+-- api/client.ts sends the operation to the backend
+-- backend persists resulting schedules and returns fresh data
```

If a template temperature is outside a target climate range, the frontend clamps it to the climate's supported minimum or maximum before applying. If a template uses an HVAC mode unsupported by the target climate, Velair rejects the operation so the user can adjust the template or choose compatible targets.

## Portability Model

Exports use a separate portable model version. This lets future imports handle old files even if the internal storage model changes.

The current export format is:

```json
{
  "format": "velair_portable_data",
  "model_version": 1,
  "exported_at": "2026-05-25T00:00:00+00:00",
  "sections": {
    "zones": {},
    "templates": [],
    "settings": {}
  }
}
```
