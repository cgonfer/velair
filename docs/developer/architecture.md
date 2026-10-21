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
  save_timing.py       opt-in DEBUG phase timings without configuration payloads
  scheduler.py         event calculation, timers, overrides, preconditioning runtime
  sensor.py            scheduler and per-zone state sensors
  services.py          Home Assistant service actions
  services.yaml        service descriptions
  storage.py           Home Assistant Store wrapper
  switch.py            automatic scheduling control
  translations/        Home Assistant translations
```

## Data Model

Planned Return adds backend-owned `planned_return` configuration and a persisted
`planned_return_episode`. `planned_return.py` owns combined-occupancy
listeners, absence confirmation and arrival timers. It resolves arrival targets
through the existing effective weekly schedule, predictor and serialized delivery
authority. Temporary preparation participates in Room Assist without changing
weekly blocks. Completed/cancelled episodes remain latched until occupied.
Automatic Mode transitions preserve explicit overrides; manual selections cancel
pending or active episodes. Fresh episodes persist the previous selected Mode
and ordered Profile IDs: one-off returns record them at manual registration,
weekly returns immediately before confirmed departure applies Away. Explicit
episode cancellation restores that selection
only after confirmed departure; pending confirmation and terminal acknowledgement
do not change selection. Restoration and withdrawal commit atomically. Selection
restoration preserves explicit overrides and does not restore historical device
states. Legacy episodes without metadata and invalid saved Profiles cannot invent
a replacement selection. See the
[cancellation examples](../user/planned-return.md#cancelling-a-return-examples). Sources use a fixed any-home/all-away/otherwise-unknown
rule; the home zone consumes Home Assistant's existing person count. A persisted
manual `armed` episode waits for confirmed departure and expires at its deadline
without Mode changes if departure was not confirmed. Manual episodes are independent
of automatic enable state; one-off times override only their absence. Terminal
episodes remain latched until known occupancy, including when automation is disabled.
See [Planned Return](../user/planned-return.md).

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
      "comfort": {
        "enabled": true,
        "derived_metrics": {
          "dew_point": {"enabled": true, "source": "velair", "entity_id": null},
          "absolute_humidity": {"enabled": false, "source": "velair", "entity_id": null},
          "humidex": {"enabled": true, "source": "entity", "entity_id": "sensor.living_room_humidex"}
        }
      },
      "external_change_policy": {
        "action": "for_duration",
        "duration_minutes": 120
      },
      "target_temp_step_override": 0.5,
      "last_reported_target_temp_step": 0.5
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

Comfort derived metrics are backend-owned and disabled by default. Each uses
either a Velair calculation from effective Comfort temperature and humidity or
one generic `sensor.*` entity. They are observational and do not modify climate
control or the existing Comfort classifications. Per-metric configuration is
deep-merged so partial updates preserve sibling settings.

Climate Profiles are backend-owned routines. Persisted `base_profile_ids`,
`base_mode_id` and `zone_profile_overrides` describe the active selection.
Legacy `active_profile_ids` projects the base only. Base Profiles cannot overlap;
exceptions can replace individual rooms from multizone Profiles. An absent
override inherits the base; a present null explicitly uses Default. Profiles
are live references, but an applied exception retains its original room scope.
No historical layer stack or schedule-block merging exists. Each effective zone
resolves one Profile entry, or its regular schedule. Profile days may retain
independent schedules, hours-only links or full template links.

The scheduler resolves ownership directly per entity. Transition snapshots
materialize disjoint Profile fragments for the existing execution machinery;
they never pass a union of overlapping whole Profiles as an effective selection.
Configuration mutation locks serialize read/modify/write operations. Selection
rollback restores the complete base, marker and exception intent. Zone actions
restrict unchanged external publication attempts to their requested scope.

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
the base Mode marker while retaining base Profiles and exceptions. Custom
selection atomically activates the mapped base, clears exceptions and records its mode key.
Direct panel or service activation clears the marker to Manual, including
same-profile activation without repeating climate actions or emitting a
duplicate profile change event. Direct activation also replaces the complete
active set with one Profile, so zones no longer covered resolve to Default.

While exceptions exist the native select shows Manual, but the full response
retains the base Mode identity so the panel can show its name with exceptions.
Editing that Mode updates its base while retaining exceptions; explicitly
selecting it clears them. Default requires an empty base and no exceptions.
Selection events expose full intent separately from the legacy base-list event.
Return home snapshots retain the complete selection; legacy snapshots migrate
to base-only snapshots. External selection still cancels Return home separately
before saving selection, preserving its existing two-commit limitation.

The select entity is dispatcher-driven and does not use `RestoreEntity`, polling,
or an external state listener. Storage remains canonical across startup.
`apply_active_schedule_on_startup` remains the only startup gate for physical
application; restoring a selected mode never causes separate climate calls.
Deleting the selected mode retains the active profile set and resolves to
Manual, while deleting an active profile cascades its Modes and removes only
that profile from the active set.

Per-zone control and delivery sensors are projections over these existing
authorities, not new state owners. Control context comes from the scheduler's
single effective-setup projection. Accepted-target evidence is delivered to
Diagnostics through a direct internal callback after a successful commit; the
public `velair_event` remains an informational projection and cannot replace
that evidence. Public attribute values are normalized to the bounded contract
documented in the user guide, so internal reason strings are not an automation
API.

Each Mode stores one or more unique IDs in `profile_ids`. Validation rejects
unknown profiles and any set where two profiles explicitly configure the same
zone. This keeps effective ownership deterministic without a priority system.

## External Change Attribution And Manual Control

`ClimateManager` is the only adapter that sends Velair-owned climate commands.
Before each logical action it creates a Home Assistant `Context` and registers
a bounded, 120-second expectation for the HVAC mode and scalar/range target
that should become observable. A single mode-and-target action shares one
context. Each affected field also receives a 45-second, generation-scoped
settling window. The window starts when the command is registered, has an
initial deadline and is finalized once when the complete Home Assistant service
sequence returns. Device echoes cannot extend that final deadline, and the
window remains available after the first expected value is observed. The
expectation ledger is capped per entity and globally, and failed service calls
remove their expectations.

`ClimateChangeMonitor` listens only to state-change events for managed climates.
It compares the changed control fields with the ledger. Context narrows the
candidate action when a device integration propagates it, but ownership still
requires field-and-value correlation because an integration can reuse a context
while reporting an unrelated device-side change. When an integration omits the
context, matching expected values, ordered multi-stage transitions, and
captured disappearance/appearance of setpoints around `off` transitions cover
the known device echo patterns. During a field's settling window, anonymous
intermediate, stale, or out-of-order values remain attributed to that command;
a Home Assistant context with a user ID is positive evidence of a new user
command and is not suppressed. An unrelated parent context likewise identifies
a different script or automation. A newer command generation supersedes the
older one for that field. After the absolute deadline, later changes use normal
external attribution. Persistent ambiguity does not schedule a delayed Manual
transition: failure to converge and proof of an external command are different
conditions. A non-converged command is instead exposed as a runtime Diagnostics
warning with expected and observed values. Environmental attributes, fan,
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

Two per-zone entity projections reuse these existing runtime sources. **Zone
control** exposes the scheduler's reconstructable control owner and compact
Default/Profile, Mode, and Manual-adjustment context without temperatures or
delivery timestamps. **Zone delivery diagnostics** is disabled by default and
exposes only sanitized, runtime-only coordinator status and the last Velair
control target whose complete service sequence Home Assistant accepted. It
preserves the temperature unit recorded with that target, never exposes raw
error text, and does not claim device or transport confirmation. Room Assist
keeps its separate applied-target projection. Neither entity adds persistence,
polling, or another delivery boundary. A successful full data reset clears the
runtime delivery evidence together with the bounded diagnostic history.

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

Single-zone early-start target queries generate future events only for their
destination; timer and global next-event queries continue to scan all eligible
zones. Each synchronous scan resolves an effective week once per visited zone,
preserving date/entity/block ordering. This reuse ends with the call, so later
queries resolve current configuration and state again. Scoped scans preserve
the existing global cleanup of expired preconditioning markers.

The scheduler distinguishes three views of the same effective schedule:

- The visible next-event projection keeps one event per zone for panel and
  prediction output. An applied early-start target can remain visible until its
  comfort time; this projection is not the complete timer queue.
- Action deadlines include pending weekly starts and nominal block boundaries
  across all eligible zones, together with temporary-state and learning
  expirations. Each applied early start is represented by its remaining comfort
  boundary before choosing the earliest deadline. One zone's visible plan cannot
  hide another zone's transition.
- Current authorized intent is resolved at delivery time, using current schedules,
  time and runtime gates. The climate delivery coordinator remains the single
  serialized delivery boundary.

A weekly predicted early-start window must start strictly after the preceding
nominal effective block for that zone, including `Off`; a crossing prediction
falls back to its nominal comfort time. Predecessor lookup includes overnight and
weekly wraparound. Heating, cooling and native ranges use the same boundary rule.
This restriction belongs to weekly scheduling, not the raw thermal predictor or
Planned Return's destination-arrival calculation. The `until_next_block` manual
policy also uses nominal effective block times, including `Off`, independently
of the visible preconditioning projection.

Serialized timer processing retains a runtime transition cursor. If a callback
or climate delivery spans further transitions, the scheduler identifies affected
zones and re-resolves their current authorized intent before sending an action.
It does not replay each obsolete intermediate command. Pauses, boosts, manual
control, disabled zones and externally executed schedules retain their normal
authority. This cursor does not add storage or continuous polling, and startup
continues to respect the configured active-schedule application option.

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

An opt-in `temperature_only: true` policy on `set_temperature` blocks is the
exception to implicit activation: it owns the target without owning HVAC mode.
It forbids explicit modes and optional device controls, preserves the actual
HVAC mode, and requires advertised target support for off-state delivery.
Existing blocks are unchanged. Pure external HVAC changes do not create Manual
adjustments under this policy; target changes retain their configured policy.
Room Assist clears without restoration while off, and preparation/learning is
suspended. Current authority and policy are re-resolved for retries, resume,
startup, and Profile transitions. Explicit Boost remains a separate authority.

A schedule block may instead persist `action: set_hvac_mode` with one explicit
non-off `hvac_mode` and no temperature or optional climate fields. Local
execution validates that the entity still advertises the mode and sends exactly
one `climate.set_hvac_mode` call. This action is distinct from
`set_temperature`, so existing mode-plus-target blocks retain their behavior.
It does not participate in preconditioning or Room Assist. External execution
rejects it unless the provider explicitly lists `set_hvac_mode` in its supported
actions.

A block may also persist `action: set_climate_options` with one or more of
`preset_mode`, `fan_mode`, `swing_mode`, `swing_horizontal_mode`, or
`humidity`, and no temperature or HVAC mode. Local delivery calls only the
corresponding Home Assistant services without turning the climate on. When
applied to an entity, unsupported options are filtered; an empty result is
rejected. No target-dependent preconditioning or Room Assist runs. Since this
action owns no target or HVAC mode, subsequent device-computed setpoint changes
do not trigger an automatic reassertion or Manual adjustment. Option changes
between scheduled events are not continuously enforced. External providers
reject this action unless they explicitly advertise support.

Physical delivery is coordinated in runtime memory per managed entity.
Blocking Home Assistant calls expose invocation failures; generation
invalidation and an async lock prevent obsolete or overlapping commits.
Availability recovery is state-event driven, and every delayed attempt resolves
current scheduler intent rather than retaining an old payload. See
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

### Panel route ownership

The sidebar panel owns URL and browser-history synchronization. Routes identify
a panel tab and, for Schedules and Templates, a library subsection. The panel
passes the subsection to its child card and receives accepted subsection changes
through an event; child components do not register global history listeners.
Route parsing and canonical path generation are pure frontend helpers.

Navigation follows Home Assistant's history semantics, respects existing draft
discard confirmations, and keeps the child card mounted for changes within the
same tab. URL state contains no saved configuration or editor drafts and triggers
no climate actions. Lovelace cards retain their dashboard's routing ownership.
See the [Usage Guide](../user/usage.md#panel-navigation-and-direct-links) for the
public paths and aliases.

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

The internal zone model retains both an optional user-owned
`target_temp_step_override` and the latest valid
`last_reported_target_temp_step` observed from Home Assistant. Runtime target
alignment resolves a valid currently published step first, then the remembered
step, the manual fallback, and finally `1` in the active unit. Saving a manual
fallback while no valid step is published clears the remembered observation;
the next valid report is stored again. Both stored steps are temperature deltas.
Portable zone exports include only the manual fallback because the remembered
value is device-local runtime context.

Persisted thermal values use the raw runtime unit recorded in storage metadata.
Load, save, and Home Assistant unit-change events never convert them. Current
portable model v18 preserves those raw values and declares the stored unit.
Imports convert selected thermal sections when the source and current Home
Assistant units differ. Model v2 and unitless v1 exports are treated as Celsius
for backward compatibility.

Model v17 additionally retains per-schedule `day_layout_key` values for the
three predefined layouts: individual days, weekdays/weekend and all days.
Earlier custom libraries are ignored on load/import and custom references
normalize to individual-day editing without changing blocks or template links.
New layout assignments accept only predefined keys. Layouts control presentation
and grouped editing only; execution still resolves seven weekdays.

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
  "model_version": 19,
  "temperature_unit": "°F",
  "exported_at": "2026-05-25T00:00:00+00:00",
  "sections": {
    "zones": {},
    "templates": [],
    "block_presets": [],
    "settings": {},
    "preconditioning_learning": {},
    "profiles": [],
    "modes": []
  }
}
```

Model 19 includes the optional per-zone Preconditioning master relationship.
Older files normalize missing relationships to Independent. Accepted master
execution anchors are local runtime continuity data: they are stored through
Home Assistant storage but excluded from portable exports. Learning sessions
are not restored after restart.

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

Portable model v9 adds the optional per-zone Comfort derived-metric
configuration. Portable model v10 adds the opt-in outdoor comparison and its
retained temperature and humidity sensor IDs. Both versions export
configuration only: calculated readings, availability, insights, and comparison
results remain runtime state. Older supported models continue to import with
the defaults for fields introduced later.

Portable model v11 adds the optional Guided and custom temperature-aware Comfort configuration.
The backend persists two humidity ranges at the configured temperature
endpoints, interpolates and clamps the effective range at runtime, and exposes
one `comfort_zone` projection to all consumers. Guided derives a sampled
constant-vapour-pressure curve from one midpoint humidity reference; no derived
geometry is persisted. The frontend draws that
projection but never owns or persists the calculation. Existing and older
configurations continue to normalize to the Simple rectangular model.

`preconditioning_learning` is an optional incremental section keyed by the exact climate entity ID. Import replaces learning only for matching managed climates contained in the section. Unknown IDs are ignored, while existing learning for local climates absent from the file is preserved.

The complete persistence, conversion, validation, and recovery boundaries are
documented in [Temperature unit internals](temperature-units.md).
