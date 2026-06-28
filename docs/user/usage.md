# Usage Guide

This guide explains Velair from a Home Assistant user's point of view.

## Concepts

Velair manages schedules for the `climate.*` entities selected during integration setup. Each selected entity is a managed climate zone.

A schedule is made of weekday blocks. A block starts at a specific time and can:

- set a target temperature, optionally with an HVAC mode;
- turn the climate entity off.

Velair calculates upcoming events in the backend and schedules exact one-shot callbacks through Home Assistant. The frontend subscribes to backend updates over WebSocket, so it does not need continuous polling.

## Open Velair

After setup, Velair appears in the Home Assistant sidebar.

The sidebar panel is the recommended interface. The optional Lovelace card is useful when you want to embed specific Velair panels in an existing dashboard.

The Overview next-events list shows the next planned event for each managed climate, including events moved earlier by preconditioning. This list is for user visibility; Velair still schedules the earliest due action internally.

The Lovelace card supports these `view` values:

- `overview-status`;
- `overview-boosts`;
- `overview-events`;
- `overview-timeline`;
- `overview-zones`;
- `schedules`;
- `preconditioning`.

Each Lovelace card can also limit which thermostats it shows. This is only a dashboard display filter; it does not change Velair's stored schedules or the scheduler behavior.

```yaml
type: custom:velair-card
view: preconditioning
entities:
  - climate.living_room
  - climate.bedroom
zone_order:
  - climate.bedroom
  - climate.living_room
```

If `entities` is omitted, the card shows every Velair-managed thermostat. Global cards such as `overview-status` keep showing the scheduler state and controls normally because they are not tied to one thermostat.

## Create A Daily Schedule

1. Select the climate you want to configure.
2. Select the weekday.
3. Choose a template or configure the blocks manually.
4. Add a block.
5. Choose the start time.
6. Choose an HVAC mode or leave it as `Keep`.
7. Enter the target temperature.
8. Save.

Velair uses the selected climate entity capabilities when editing a schedule. Unsupported modes are not offered for that climate, and temperatures are constrained to the climate entity range.

If a block uses `Off`, the temperature field is not used because the block turns the climate entity off.

## Timeline Editing

The timeline is a visual 24-hour representation of the selected day.

- Drag a block to move its start time.
- Drag a block edge to resize the range between adjacent blocks.
- Use the block list for exact time, mode, and temperature values.

## Preconditioning

Preconditioning lets Velair start a scheduled comfort target before the visible block time for one managed climate.

When enabled for a climate in the Preconditioning tab, the block time represents the desired comfort time. Velair may apply the target earlier using its adaptive prediction, while keeping the original target time visible in upcoming events.

If Velair recalculates while it is already inside the preconditioning window, it applies the target immediately when the current temperature still needs heating or cooling.

The Preconditioning tab lists managed climates in the order configured in Settings. For each climate it lets you:

- enable or disable preconditioning;
- set a maximum lead time, up to 1440 minutes;
- set the adaptive model parameters and minimum temperature difference;
- inspect heat and cool learning independently;
- restore tuning parameters to their defaults without deleting learning samples;
- reset one learning direction without affecting the other.

Configuration is grouped into timing and limits, learning model, history, and optional outdoor context. When outdoor context is disabled, its sensor selector is disabled as well. Unavailable climates cannot enable preconditioning and the tab explains why.

Each tuning control includes compact contextual help. Hover, focus, or tap its information icon to see how increasing, decreasing, or enabling that setting affects preconditioning.

Preconditioning is adaptive. Velair predicts each future event from the current temperature difference, first with a local initial model and later with similar local history after enough complete observations exist. Historical predictions learn thermal potential per degree, so small past temperature changes can scale up for larger future gaps and large past changes can scale down for smaller ones. More similar and more recent observations have more influence.

Velair does not start early for `Off` blocks. If the current temperature is already close enough to the target, Velair keeps the normal block time.

Before an early start begins, Velair listens for relevant `current_temperature` changes on managed climates that have preconditioning enabled. When the temperature changes enough to affect the current delta, Velair debounces the update and recalculates the next scheduler action locally. Open panels also group relevant indoor or configured outdoor temperature changes into a single refresh without continuous polling. If the early start for the same visible event changes, its row is highlighted briefly so the adjustment can be noticed without a dialog or global notification.

When preconditioning is disabled for a climate, Velair does not register preconditioning temperature listeners, schedule recalculation callbacks, start learning sessions, or save new observations for that climate. Previously learned samples are preserved and can be reused if preconditioning is enabled again.

Velair also keeps a compact local learning history for preconditioning attempts. It opens a runtime learning session when it applies an early comfort target, then stores a compact observation when the climate reaches the target threshold or when the comfort time arrives. Sessions interrupted by boosts, pauses, scheduler stops, or schedule changes are discarded.

The Preconditioning tab shows the local learning state per climate. Heat and cool are tracked separately, and a direction that the climate entity does not support is shown as unavailable. Once Velair has enough complete observations for a supported direction, it can use similar local history instead of the initial model.

Each supported direction has a compact status card showing whether learning is ready, which model source is active, and the counts of complete, partial, and invalid samples.

The tab also provides a reset learning action for each supported direction. This recalibrates heat or cool from zero independently while keeping schedules, preconditioning settings, and the other direction's learning history.

The per-climate restore action is separate from learning reset. It restores only tuning parameters, keeps the current enabled state, and preserves every stored heat and cool sample.

Partial observations do not become fake completion times. They act as lower bounds, meaning Velair knows the required time was longer than the attempted start window. If enough later complete observations prove that less lead time is working, older partial observations stop forcing the prediction upward. This keeps learning conservative without making high leads permanent.

Velair keeps separate compact histories for heat and cool so seasonal use in one direction cannot evict learning from the other.

All preconditioning settings and calculations run locally inside Home Assistant. Velair does not send climate history or schedule data to any external service.

Developer-oriented examples of the local learning states, API output, and prediction rules are documented in [Adaptive preconditioning](../developer/adaptive-preconditioning.md).

## Templates

Templates are reusable sets of blocks.

The Templates tab lets you:

- create a new template;
- rename a template;
- edit template blocks;
- apply a template to selected climates and weekdays;
- delete templates.

The Schedule tab can also save the current day as a new template.

When applying a template to a climate, Velair validates HVAC modes and temperature limits. If a template temperature is outside the target climate range, Velair clamps it to the climate minimum or maximum. If a template uses an unsupported HVAC mode, Velair shows an error so the user can change the block to `Keep` or a supported mode.

## Clone Schedules

Below the editor, Velair can clone the current day:

- to other weekdays on the same climate;
- to the same weekday on other managed climates.

Clone actions save pending changes first when needed.

## Pause, Stop, And Resume

Velair has global scheduler controls:

- **Pause** suspends automatic schedule execution for a duration in minutes.
- **Stop** suspends automatic schedule execution indefinitely.
- **Resume** returns the scheduler to automatic mode.

When a temporary pause is active, the overview shows the remaining time and progress.

Pause and boost durations are entered in minutes. The Home Assistant service UI allows values up to 10080 minutes, which is seven days.

Velair also supports per-zone pause through services and automations. A zone pause only affects one managed climate entity. Other climates continue following their schedules. When a zone is resumed, Velair applies the current schedule only if a block is active for that climate at that moment; otherwise it leaves the climate untouched.

## Boost

Boost is per climate zone. It temporarily overrides the schedule for one climate entity and leaves other zones running normally.

When a boost starts, Velair captures the current restorable climate state for that zone, including the HVAC mode and target temperature when Home Assistant exposes them. This snapshot is used only to decide what should happen when the boost ends.

Boost is exposed through Home Assistant services, scripts, automations, and dashboard controls. This keeps the main schedule editor focused while allowing advanced automations such as:

- boost a room from a button;
- boost after motion;
- boost from a voice assistant;
- boost with a preferred HVAC mode.

When a boost expires, Velair resolves the affected zone in this order:

1. If there is an active schedule block with an explicit HVAC mode, Velair applies that scheduled target.
2. If there is an active schedule block that turns the climate off, Velair turns the climate off.
3. If there is no active schedule block, Velair restores the state captured before the boost.
4. If the active schedule block uses `Keep`, Velair also restores the state captured before the boost, because `Keep` does not define a new HVAC mode to apply after the temporary override.

This means a boost should not cause Velair to invent a new heating or cooling target when the current schedule does not explicitly define one.

## Startup Behavior

By default, Velair restores its stored scheduler state after Home Assistant starts but does not force climate devices to a schedule target.

From Settings, you can enable **Apply active schedule after startup**. When enabled, Velair applies the current active schedule block to managed climates after Home Assistant starts, as long as the scheduler is in automatic mode. Active boosts are respected.

## Portability

The Settings tab can export and import a versioned JSON file.

The file can contain:

- thermostat schedules;
- templates;
- panel settings.
- adaptive preconditioning learning.

When importing, Velair lets you choose which sections to overwrite. Importing replaces selected data, so export first if you need a recovery point.

Adaptive preconditioning learning is matched by the exact Home Assistant climate entity ID. Learning from climates that are not currently managed is shown before import and skipped. For matching climates, the imported learning replaces that climate's existing calibration. Learning for local climates that are not present in the file is kept unchanged.

Preconditioning configuration values are already included with **Thermostat schedules**. The separate **Preconditioning learning** section contains the costly local calibration history.

## Maintenance

The Settings tab shows technical version information:

- frontend build;
- portable export model version;
- storage/model version;
- integration version.

It also includes a reset action. Reset deletes stored schedules, templates, panel preferences, active boosts, and startup behavior, then recreates defaults for the currently managed climates. Velair asks for confirmation before doing this.

## Services

Velair exposes Home Assistant services for automations and scripts:

- `velair.set_temperature`
- `velair.apply_schedule`
- `velair.boost`
- `velair.cancel_boost`
- `velair.pause`
- `velair.pause_zone`
- `velair.resume`
- `velair.resume_zone`
- `velair.set_daily_schedule`
- `velair.copy_day_schedule`
- `velair.clear_schedule`

Services that target an entity only work with climates selected during setup. If an unmanaged climate entity is passed, Velair rejects the service call before changing anything.

### `velair.set_temperature`

Set one managed climate entity to a temperature. `hvac_mode` is optional.

This is a Velair-scoped convenience service, not a replacement for Home Assistant's `climate.set_temperature`. The differences are:

- it only accepts climate entities managed by Velair;
- it validates the target temperature against the climate range known by Velair;
- it uses Velair's HVAC mode fallback rules when a mode is provided or when the climate needs to be turned on.

Use Home Assistant's native climate services when you want generic climate control. Use `velair.set_temperature` when an automation should only act on Velair-managed climates.

```yaml
action: velair.set_temperature
data:
  entity_id: climate.living_room
  temperature: 21
  hvac_mode: heat
```

### `velair.apply_schedule`

Apply the currently active schedule block immediately. If `entity_id` is omitted, Velair applies the active block to all managed climates.

```yaml
action: velair.apply_schedule
data:
  entity_id: climate.living_room
```

### `velair.boost`

Temporarily override one climate entity. When the boost expires, Velair applies the active explicit schedule target when one exists, or restores the climate state captured before the boost when there is no explicit target to apply.

```yaml
action: velair.boost
data:
  entity_id: climate.living_room
  temperature: 22
  duration_minutes: 45
  hvac_mode: heat
```

Velair captures the restorable climate state before applying the boost. A boost is rejected when the climate is unavailable and this state cannot be captured safely.

### `velair.cancel_boost`

Cancel an active boost early. This always uses the same return behavior as normal expiration: Velair applies the active explicit schedule target when one exists; otherwise, including a `Keep` block, it restores the HVAC mode and target captured before the boost. Calling it when no boost is active has no effect.

```yaml
action: velair.cancel_boost
data:
  entity_id: climate.living_room
```

### `velair.pause`

Pause automatic schedule execution. Omit `duration_minutes` to stop automatic execution indefinitely.

```yaml
action: velair.pause
data:
  duration_minutes: 60
```

### `velair.resume`

Resume automatic schedule execution and apply the current schedule.

```yaml
action: velair.resume
```

### `velair.pause_zone`

Pause automatic schedule execution for one managed climate entity while the rest of Velair keeps running. Omit `duration_minutes` to pause that zone indefinitely.

The optional `action` field can be:

- `none`: leave the climate exactly as it is and only stop Velair from changing it automatically;
- `turn_off`: turn the climate off immediately and keep it paused.

```yaml
action: velair.pause_zone
data:
  entity_id: climate.guest_room
  duration_minutes: 120
  action: turn_off
```

### `velair.resume_zone`

Resume automatic schedule execution for one managed climate entity. By default, Velair applies the currently active schedule block for that climate when one exists. If no block applies at that moment, Velair leaves the climate untouched.

```yaml
action: velair.resume_zone
data:
  entity_id: climate.guest_room
  apply_current_schedule: true
```

### `velair.set_daily_schedule`

Replace one weekday schedule for one managed climate.

```yaml
action: velair.set_daily_schedule
data:
  entity_id: climate.living_room
  weekday: monday
  blocks:
    - start: "06:30"
      action: set_temperature
      temperature: 21
      hvac_mode: heat
    - start: "09:00"
      action: turn_off
    - start: "18:00"
      action: set_temperature
      temperature: 20
      hvac_mode: heat
```

### `velair.copy_day_schedule`

Copy one weekday schedule to other weekdays for the same managed climate.

```yaml
action: velair.copy_day_schedule
data:
  entity_id: climate.living_room
  source_weekday: monday
  target_weekdays:
    - tuesday
    - wednesday
    - thursday
```

### `velair.clear_schedule`

Clear one weekday schedule. Omit `weekday` to clear all weekdays for that managed climate.

```yaml
action: velair.clear_schedule
data:
  entity_id: climate.living_room
  weekday: sunday
```

## Automation Events

Velair also fires Home Assistant events that can be used as automation triggers. These events are transient; they are not stored as configuration and do not replace the diagnostic entities.

All Velair automation events use the same Home Assistant event type:

```text
velair_event
```

The event payload includes an `event` field that identifies what happened:

- `scheduler_mode_changed`: fired when the scheduler changes mode, such as pause, stop/resume through automatic mode, or another scheduler mode selection.
- `climate_target_applied`: fired when Velair applies a schedule target or turn-off action to a managed climate.
- `preconditioning_plan_updated`: fired when the scheduler calculates a new early start or changes an existing one.
- `boost_started`: fired when a zone boost starts.
- `boost_ended`: fired when a zone boost expires or is cancelled. Its `reason` is `expired` or `manual`.
- `zone_paused`: fired when automatic schedule execution is paused for one managed climate.
- `zone_resumed`: fired when automatic schedule execution resumes for one managed climate.

This keeps discovery simple: listen to `velair_event`, then filter by `event_data.event` when an automation only needs one kind of Velair event.

`preconditioning_plan_updated` is emitted by scheduler planning, not by opening or refreshing the panel. Recalculating the same plan does not emit a duplicate event. Its payload includes the original and calculated start times, lead, direction, temperatures, HVAC mode, model source, sample counts, comfort percentile, optional outdoor context, weekday, and block start.

Example: react when Velair moves a heating block earlier.

```yaml
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: preconditioning_plan_updated
      entity_id: climate.living_room
      direction: heat
actions:
  - action: logbook.log
    data:
      name: Velair prediction
      message: >
        Starts {{ trigger.event.data.lead_minutes }} minutes early using
        {{ trigger.event.data.model_source }}
```

Example: react when the scheduler is paused.

```yaml
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: scheduler_mode_changed
      mode: paused
actions:
  - action: notify.mobile_app_phone
    data:
      message: Velair scheduler was paused
```

Example: react when Velair applies a climate target.

```yaml
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: climate_target_applied
      entity_id: climate.living_room
actions:
  - action: logbook.log
    data:
      name: Velair automation
      message: >
        Velair applied {{ trigger.event.data.action }} to
        {{ trigger.event.data.entity_id }}
```

The `climate_target_applied` payload includes:

- `entity_id`;
- `action`;
- `temperature`;
- `hvac_mode`;
- `weekday`;
- `start`;
- `target_when`, when preconditioning applied the target before the visible block time;
- `source`.

Common `source` values are `scheduled_event`, `current_schedule`, `schedule_saved`, `scheduler_resumed`, `startup`, `service_set_temperature`, `boost_ended`, `zone_paused`, `zone_resumed`, and `zone_pause_expired`.

Boost payloads include `entity_id`, `temperature`, `hvac_mode`, `started_at`, and `until`. `boost_ended` also includes `reason: manual` when `velair.cancel_boost` ends it early, or `reason: expired` when its timer ends. Scheduler mode payloads include `mode`, `previous_mode`, `paused_until`, and `paused_started_at`.

Zone pause and resume payloads include `entity_id`, `started_at`, `until`, and `action`. Resume payloads also include `reason`, such as `manual` or `expired`.

These events cover runtime actions: scheduler mode changes, applied climate targets, preconditioning plans, boosts, and zone pause/resume. Schedule, template, settings, import, and reset operations update configuration but do not emit automation events.
