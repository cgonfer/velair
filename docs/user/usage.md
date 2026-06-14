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

The Lovelace card supports these `view` values:

- `overview-status`;
- `overview-boosts`;
- `overview-events`;
- `overview-timeline`;
- `overview-zones`;
- `schedules`.

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

When importing, Velair lets you choose which sections to overwrite. Importing replaces selected data, so export first if you need a recovery point.

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
- `boost_started`: fired when a zone boost starts.
- `boost_ended`: fired when a zone boost expires.
- `zone_paused`: fired when automatic schedule execution is paused for one managed climate.
- `zone_resumed`: fired when automatic schedule execution resumes for one managed climate.

This keeps discovery simple: listen to `velair_event`, then filter by `event_data.event` when an automation only needs one kind of Velair event.

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
- `source`.

Common `source` values are `scheduled_event`, `current_schedule`, `schedule_saved`, `scheduler_resumed`, `startup`, `boost_ended`, `zone_paused`, `zone_resumed`, and `zone_pause_expired`.

Boost payloads include `entity_id`, `temperature`, `hvac_mode`, `started_at`, and `until`. Scheduler mode payloads include `mode`, `previous_mode`, `paused_until`, and `paused_started_at`.

Zone pause and resume payloads include `entity_id`, `started_at`, `until`, and `action`. Resume payloads also include `reason`, such as `manual` or `expired`.
