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
  entity_registry.py   cleanup for retired and removed-climate entities
  frontend.py          panel and static frontend registration
  models.py            typed normalization, preconditioning prediction, serialization
  scheduler.py         event calculation, timers, overrides, preconditioning runtime
  sensor.py            scheduler and per-zone state sensors
  services.py          Home Assistant service actions
  services.yaml        service descriptions
  storage.py           Home Assistant Store wrapper
  switch.py            automatic scheduling control
  translations/        Home Assistant translations
```

## Data Model

The storage model is intentionally simple and versioned:

```json
{
  "version": 2,
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
      "override": null,
      "preconditioning": {
        "enabled": true
      }
    }
  },
  "global": {
    "mode": "auto",
    "paused_until": null,
    "paused_started_at": null,
    "active_profile_id": "away"
  },
  "settings": {
    "first_weekday": "monday",
    "zone_order": [],
    "min_temperature": 5.0,
    "max_temperature": 35.0
  },
  "templates": [],
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
  "preconditioning_learning": {
    "climate.living_room": {
      "heat": {
        "observations": []
      },
      "cool": {
        "observations": []
      }
    }
  },
  "templates_seeded": true
}
```

`models.py` normalizes stored data on load. This allows Velair to tolerate old or partial storage data and gives future migrations a single place to evolve.

Climate profiles are backend-owned effective schedule overlays. Only one global
profile can be active. `active_profile_id: null` is the built-in Normal state,
and a zone omitted from an active profile keeps using its Normal schedule. A
profile zone can instead embed a complete weekly schedule or pause the zone,
optionally turning it off. Templates only copy blocks into a profile draft; no
template reference is persisted.

The scheduler resolves each zone's effective behavior before calculating
current or future events, Adaptive Preconditioning, or Room Assist. Global and
manual zone pauses retain priority. Activating a profile cancels Boost only for
zones whose effective behavior changes, persists the new selection, and then
applies the current effective block immediately where pauses allow it. Comfort
configuration remains independent. The active selection survives restart, while
the existing startup option continues to decide whether climate targets are
physically applied during startup.

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
+-- Predict and apply any due preconditioning action
+-- Apply climate action
+-- Open, complete, or discard preconditioning learning sessions
+-- Log operational action to Home Assistant logbook when available
+-- Recalculate and schedule the next event
```

Before an early start begins, relevant climate temperature changes are debounced and may recalculate the next action. During an active learning session, emitted temperature changes can complete the observation as soon as the target threshold is reached. Velair uses Home Assistant state listeners and timers rather than continuous polling.

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

Persisted thermal values use the raw runtime unit recorded in storage metadata.
Load, save, and Home Assistant unit-change events never convert them. Portable
model v4 preserves those raw values and declares the stored unit. Imports convert
selected thermal sections when the source and current Home Assistant units
differ. Model v2 and unitless v1 exports are treated as Celsius for backward
compatibility.

Live climate state belongs to Home Assistant and is not converted or
reinterpreted by Velair. Finite `current_temperature` readings are consumed in
the unit reported by the climate entity. Live target temperatures are accepted
only when they fall inside that climate's declared target range; invalid values
are excluded instead of being guessed from their magnitude. When Velair
compares an external temperature sensor with a climate, it converts the sensor
from its declared unit to the climate unit at that comparison boundary.

Published v1.1 storage without unit metadata and `celsius_v1` storage are
treated as Celsius. Whenever the stored unit differs from Home Assistant's
current unit, scheduler execution and thermal writes are blocked and a
persistent notification directs the user to Settings. Migration requires a
unique id and expected revision under a lock, converts all thermal scopes, and
persists before replacing runtime data. An exact retry is a no-op and a failed
write leaves the original runtime untouched.

The current export format is:

```json
{
  "format": "velair_portable_data",
  "model_version": 4,
  "temperature_unit": "°F",
  "exported_at": "2026-05-25T00:00:00+00:00",
  "sections": {
    "zones": {},
    "templates": [],
    "settings": {},
    "preconditioning_learning": {},
    "profiles": []
  }
}
```

Portable profile data contains profile definitions but never the active
selection, so importing a backup cannot activate a profile implicitly.

`preconditioning_learning` is an optional incremental section keyed by the exact climate entity ID. Import replaces learning only for matching managed climates contained in the section. Unknown IDs are ignored, while existing learning for local climates absent from the file is preserved.

The complete persistence, conversion, validation, and recovery boundaries are
documented in [Temperature unit internals](temperature-units.md).
