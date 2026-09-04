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
  climate_change_monitor.py event-driven attribution of external climate control changes
  config_flow.py       setup flow and options flow
  config_helpers.py    config entry helpers
  const.py             constants and service keys
  entity.py            shared entity base
  entity_registry.py   cleanup for retired and removed-climate entities
  frontend.py          panel and static frontend registration
  models.py            typed normalization, preconditioning prediction, serialization
  runtime_diagnostics.py bounded runtime health/history projection and report redaction
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
  "version": 7,
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
      "pauses": [
        {
          "pause_id": "velair.manual_adjustment",
          "started_at": "2026-08-20T18:00:00+02:00",
          "until": "2026-08-20T20:00:00+02:00",
          "action": "none",
          "manual_policy": "for_duration",
          "manual_source": "external_change",
          "duration_minutes": 120,
          "changed_fields": ["temperature"]
        }
      ],
      "preconditioning": {
        "enabled": true,
        "minimum_delta_temperature": 0.3,
        "room_sensor_assist_enabled": true,
        "room_sensor_assist_deadband": 0.3,
        "room_sensor_assist_max_delta": 2.0
      },
      "external_change_policy": {
        "action": "for_duration",
        "duration_minutes": 120
      },
      "delivery": {
        "confirm": false,
        "confirm_timeout_seconds": 25,
        "confirm_attempts": 3
      }
    }
  },
  "global": {
    "mode": "auto",
    "paused_until": null,
    "paused_started_at": null,
    "active_profile_ids": ["away"],
    "active_mode_id": "away-mode"
  },
  "settings": {
    "first_weekday": "monday",
    "zone_order": [],
    "min_temperature": 5.0,
    "max_temperature": 35.0,
    "delivery_stagger_seconds": 0
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
  "modes": [
    {
      "key": "away-mode",
      "name": "Away",
      "profile_ids": ["away"]
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

Climate profiles are backend-owned effective schedule overlays. The persisted
`active_profile_ids` list is empty for the built-in Default state. A Mode may
activate several profiles together, but the backend rejects any composition in
which two profiles explicitly configure the same zone. A zone omitted from all
active profiles keeps using its default schedule. A profile zone can instead
embed a complete weekly schedule or pause the zone, optionally turning it off.
Templates only copy blocks into a profile draft; no template reference is
persisted.

Externally executed zones participate in Profiles and Modes only through their
effective weekly schedule. The scheduler resolves Default versus Profile data
and passes an explicit week to the provider-neutral external execution manager.
Providers do not know about Profile or Mode models. Pause behavior and all
direct climate actions remain unavailable for external zones, while publication
failure never rolls back the persisted global Profile or Mode selection.
Profile/Mode mutations take the global Profile lock before the minimal union of
zone locks whose Profile effect or complete effective week changes, regardless
of current execution ownership. Authority is revalidated after acquiring those
locks, so an in-flight handoff cannot publish a stale Default week after a
Profile selection. Unaffected local zones remain unlocked. Validation and
persistence remain cancelable and roll back without publication; once persistence succeeds,
publication, runtime cleanup, replanning, and change notification finish before
task cancellation is propagated. An explicit Default/Profile/Mode selection
also republishes an unchanged week when the current runtime has no successful
publication evidence; this is a user-requested attempt, not automatic retry.

The scheduler resolves each zone's effective behavior before calculating
current or future events, Adaptive Preconditioning, or Room Assist. Global and
manual zone pauses retain priority. Activating a profile cancels Boost only for
zones whose effective behavior changes, persists the new selection, and then
applies the current effective block immediately where pauses allow it. Comfort
configuration remains independent. The active selection survives restart, while
the existing startup option continues to decide whether climate targets are
physically applied during startup.

Backend-owned `modes` map stable mode keys and user-editable names to
stable profile IDs. A single native `SelectEntity` projects this state as
`select.velair_mode`. Its canonical built-ins are `Default`, which deactivates
profiles and restores each zone's default schedule, and `Manual`, which clears
the selected mode marker while retaining the current active profiles. Custom
selection atomically activates the mapped profile set and records its mode key.
Direct panel or service activation clears the marker to Manual, including
same-profile activation without repeating climate actions or emitting a
duplicate profile change event. Direct activation also replaces the complete
active set with one Profile, so zones no longer covered resolve to Default.

The select entity is dispatcher-driven and does not use `RestoreEntity`, polling,
or an external state listener. Storage remains canonical across startup.
`apply_active_schedule_on_startup` remains the only startup gate for physical
application; restoring a selected mode never causes separate climate calls.
Deleting the selected mode retains the active profile set and resolves to
Manual, while deleting an active profile cascades its Modes and removes only
that profile from the active set.

Each Mode stores one or more unique IDs in `profile_ids`. Validation rejects
unknown profiles and any set where two profiles explicitly configure the same
zone. This keeps effective ownership deterministic without a priority system.

## External Change Attribution And Manual Control

`ClimateManager` is the only adapter that sends Velair-owned climate commands.
Before each logical action it creates a Home Assistant `Context` and registers
a bounded, 120-second expectation for the HVAC mode and scalar/range target
that should become observable. A single mode-and-target action shares one
context. The expectation ledger is capped per entity and globally, and failed
service calls remove their expectations.

`ClimateChangeMonitor` listens only to state-change events for managed climates.
It compares the changed control fields with the ledger. Context narrows the
candidate action when a device integration propagates it, but ownership still
requires field-and-value correlation because an integration can reuse a context
while reporting an unrelated device-side change. When an integration omits the
context, matching expected values, ordered multi-stage transitions, and
captured disappearance/appearance of setpoints around `off` transitions cover
the known device echo patterns. Any changed HVAC-mode or target field that
cannot be attributed to Velair is external. Environmental attributes, fan,
preset, swing, and humidity changes are outside this feature's trigger scope.

Each zone persists an `external_change_policy`; its default is
`keep_automatic`. That setting governs only the next eligible external change.
A Manual adjustment is represented by the reserved
`velair.manual_adjustment` pause reason, including its policy, source, start and
optional expiry, so it survives restart and composes with independent pause
reasons. The live climate snapshot being preserved is runtime-only: it is
captured from the triggering state event or explicit action and is not stored
as a second climate state model. A later Profile, Mode, or schedule mutation is
persisted normally but cannot physically overwrite a zone while this pause
reason owns it. Resuming removes only the reserved reason and resolves current
backend authority instead of replaying the schedule that was active on entry.

`keep_automatic` creates no Manual session. It re-resolves and reapplies the
current authoritative intent only when normal scheduler gates allow delivery.
An explicit Manual request made while this policy is saved uses
`until_resumed` for that session without changing the saved future default.

## Runtime Diagnostics Boundaries

`RuntimeDiagnosticsManager` passively observes existing scheduler, delivery,
availability, Room Assist, Preconditioning, Comfort, and Velair event signals.
It does not poll and cannot issue climate commands. Its current snapshot is
derived from authoritative runtime and storage state. Its event history is a
sanitized `deque` capped at 100 entries and is never restored after integration
or Home Assistant restart.

Only the per-category retention policy is stored, in a separate
entry-specific Home Assistant Store. Disabling a category also removes its
existing in-memory entries; clearing history leaves current health evidence and
the policy untouched. Diagnostics history is distinct from raw
`velair_event` events: those event-bus notifications remain transient even when
Diagnostics retains a sanitized summary of a selected event.

The diagnostics WebSocket subscription publishes a cached snapshot only when
the diagnostics revision changes. Exports build a fresh snapshot, replace
entity IDs with stable report-local aliases by default, and always remove
operational Profile, Mode, and pause identifiers. No telemetry or Recorder
dependency is introduced.

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
- Zone pause stores one or more independent reasons on a zone and suppresses scheduled events until the final reason expires or is removed. A reason may optionally turn the climate off. Automated callers can attach a `pause_id`; an identified resume removes only the matching reason, while legacy/manual calls without an ID retain full resume authority. See [Pause, Stop, And Resume](../user/usage.md#pause-stop-and-resume) for the public service contract.

## Climate Application Rules

When applying a temperature:

1. If an HVAC mode is provided, Velair applies that mode.
2. If no mode is provided and the climate is already on, Velair preserves the current mode.
3. If no mode is provided and the climate is off, Velair uses the first supported mode that is not `off`.

This keeps schedule blocks useful across heating-only, cooling-only, and mixed systems.

Physical delivery is coordinated in runtime memory per managed entity.
Blocking Home Assistant calls expose invocation failures; generation
invalidation and an async lock prevent obsolete or overlapping commits.
Availability recovery is state-event driven, and every delayed attempt resolves
current scheduler intent rather than retaining an old payload. Zones can opt
into readback confirmation, which watches the entity after acceptance and
re-resolves the current intent when it does not converge, and a global stagger
can space the start of sequences across climates. See
[Climate delivery coordination](climate-delivery.md).

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
  "model_version": 8,
  "temperature_unit": "°F",
  "exported_at": "2026-05-25T00:00:00+00:00",
  "sections": {
    "zones": {},
    "templates": [],
    "settings": {},
    "preconditioning_learning": {},
    "profiles": [],
    "modes": []
  }
}
```

Portable profile data contains profile and Mode definitions but never
the active profile or selected mode intent, so importing a backup cannot
activate a profile implicitly. V4 payloads without `modes` remain valid.

Portable model v8 separates `room_sensor_assist_deadband` from Adaptive
Preconditioning's `minimum_delta_temperature`. When an older stored zone or v7
portable zone does not contain the new field, normalization copies that zone's
legacy minimum delta before any Celsius/Fahrenheit conversion. Explicit values,
including non-step-aligned historical values, remain unchanged during the
migration. New and reset zones instead receive unit-aware defaults of `0.3 °C`
or `1 °F`; subsequent public writes require 0.1-degree steps within `0–5 °C`
or `0–9 °F`. Adaptive Preconditioning and Room Assist then persist and evaluate
their values independently.

`preconditioning_learning` is an optional incremental section keyed by the exact climate entity ID. Import replaces learning only for matching managed climates contained in the section. Unknown IDs are ignored, while existing learning for local climates absent from the file is preserved.

The complete persistence, conversion, validation, and recovery boundaries are
documented in [Temperature unit internals](temperature-units.md).
