# Usage Guide

This guide explains Velair from a Home Assistant user's point of view.

## Concepts

Velair manages schedules for the `climate.*` entities selected during integration setup. Each selected entity is a managed climate zone.

A schedule is made of weekday blocks. A block starts at a specific time and can:

- set a target temperature, optionally with an HVAC mode and supported climate options such as fan mode, preset mode, swing mode, horizontal swing mode, or target humidity;
- turn the climate entity off.

Velair calculates upcoming events in the backend and schedules exact one-shot callbacks through Home Assistant. The frontend subscribes to backend updates over WebSocket, so it does not need continuous polling.

## Home Assistant Entities

Velair creates persistent Home Assistant entities that complement its transient
automation events:

- **Next scheduled event** is a timestamp sensor for the earliest
  pending Velair action. Its attributes include every event sharing that time,
  the calculated apply time, and the original target time when Adaptive
  Preconditioning starts a block early.
- **Scheduler status** describes whether Velair is idle, scheduled, overridden,
  or paused.
  Its attributes include the global mode and pause expiry. Upcoming event and
  per-zone override details remain in their dedicated sensors to avoid
  duplicating recorder history.
- **Active target temperature** is created once per managed climate. It exposes
  the target Velair is currently managing, including boosts and blocks already
  started by Adaptive Preconditioning. Its unit follows that climate entity.
- **Environmental condition** is created once per managed climate. It exposes
  readable states such as comfortable, cold, humid, or hot and humid. It keeps
  data quality and source entity IDs as compact attributes without copying the
  original temperature or humidity readings.
- **Air quality** is created once per managed climate and keeps the independent
  CO2 assessment: good, elevated, poor, unavailable, or not monitored.
- **Zone override** shows whether that climate currently has no override, an
  active boost, or an active zone pause.
- **Preconditioning start** is a timestamp sensor containing the calculated
  start for the next or currently active early-start block. Its attributes
  include the scheduled target time, lead, direction, model source, target
  temperature, and HVAC mode.
- **Room Assist** exposes the current Room Assist runtime state and compact
  target context without duplicating the original room and climate readings.
- **Automatic scheduling** is the only writable entity. Turning it off stops
  automatic scheduling indefinitely; turning it on resumes Velair and applies
  the currently active schedule. Use the `velair.pause` action when a temporary
  pause with a duration is required.

These entities reuse backend snapshots, use dispatcher updates, and do not poll
Home Assistant. Events are useful for reacting to transitions; entities are
useful when an automation or dashboard needs to query the current state.

When a climate is removed from the Velair integration options, Velair removes
its generated zone sensors from the Home Assistant entity registry on reload.
Global Velair entities and entities belonging to other integrations are not
affected. Adding the climate again recreates its sensors with deterministic
unique IDs.

Home Assistant chooses translated entity names using the backend language when
an entity is first created. Changing only one user's interface language does not
rename existing registry entries. Existing entities can be renamed manually
from Home Assistant without changing their Velair behavior.

## Open Velair

After setup, Velair appears in the Home Assistant sidebar.

The sidebar panel is the recommended interface. The optional Lovelace card is useful when you want to embed specific Velair panels in an existing dashboard.

The Overview next-events list shows the next planned event for each managed climate, including events moved earlier by preconditioning. This list is for user visibility; Velair still schedules the earliest due action internally.

Zone overview uses compact responsive cards to answer what Velair is doing now in each room. At very wide card widths, the climate name, ordered Room Assist/Comfort/air/data signals, and activity summary share the first row. At narrower desktop, tablet, and mobile widths, the climate and activity stay together while signals move intact to a horizontally scrollable second row instead of truncating their meaning. The activity summary uses a consistent icon, current state, and relevant timing or mode context without a decorative outer badge. When Room Assist is active or holding, details are grouped as Temperature (Climate, then Sensor), Setpoint (Climate, then Scheduled), and the direction-aware Offset. Missing values are omitted. Neutral signals stay understated; warning color is reserved for conditions that need attention.

The Lovelace card supports these `view` values:

- `overview-status`;
- `overview-boosts`;
- `overview-events`;
- `overview-timeline`;
- `overview-zones`;
- `schedules`;
- `sensors`;
- `comfort`;
- `preconditioning`.

Zone-based Lovelace cards can also limit which thermostats they show. This is only a dashboard display filter; it does not change Velair's stored schedules or the scheduler behavior. Global cards such as `overview-status` do not show thermostat selection or weekday options in the card editor because they are not tied to one thermostat or schedule editor.

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

If `entities` is omitted, zone-based cards show every Velair-managed thermostat.

For `view: sensors`, the card editor can hide the on/off switch, room sensor picker, maximum assist delta, refresh delay, or live status section so a dashboard card can be display-only or more compact.

For `view: comfort`, the card editor can limit the card to selected thermostats and hide the configuration section, temperature graph, humidity graph, or CO2 graph independently. These are dashboard-only display choices; they do not change Comfort settings, tracked sensors, thresholds, events, or generated Home Assistant entities.

```yaml
type: custom:velair-card
view: comfort
entities:
  - climate.living_room
show_comfort_configuration: false
show_comfort_temperature: true
show_comfort_humidity: false
show_comfort_co2: true
```

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

When the selected climate exposes extra controls, the block editor also shows those controls. For example, an AC may expose fan mode, preset mode, swing mode, horizontal swing mode, or humidity. Velair only stores and sends options supported by the selected climate; unsupported options are omitted instead of being sent blindly.

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

Detailed setup, heating, cooling, outdoor sensor, automation, and Lovelace examples are documented in [Adaptive Preconditioning](adaptive-preconditioning.md).

Before an early start begins, Velair listens for relevant temperature changes on managed climates that have preconditioning enabled. By default it uses the thermostat's own `current_temperature`. If Room Sensor Assist is enabled for that climate, Velair uses the selected room sensor as the effective room temperature for preconditioning decisions and learning. When the temperature changes enough to affect the current delta, Velair debounces the update and recalculates the next scheduler action locally. Open panels also group relevant indoor or configured outdoor temperature changes into a single refresh without continuous polling. If the early start for the same visible event changes, its row is highlighted briefly so the adjustment can be noticed without a dialog or global notification.

## Room Assist

The Room Assist tab lists managed climates in the order configured in Settings. For each climate it lets you configure Room Sensor Assist.

The selected room temperature sensor is useful for TRVs or thermostats whose built-in sensor is too close to a radiator, air outlet, or other local heat source. Selecting a sensor alone does not change Velair control. It becomes the effective room temperature only when Room Sensor Assist is enabled, because Velair then also adjusts the thermostat target so the actuator can keep heating or cooling toward the external room reading.

Detailed heating, cooling, automation, and Lovelace examples are documented in [Room Assist](room-assist.md).

Room Sensor Assist is an advanced option that requires a room temperature sensor but does not require Adaptive Preconditioning to be enabled. When enabled, Velair may temporarily adjust the target sent to the thermostat while a scheduled block is active. For heating, if the room sensor is still below the scheduled target, Velair can raise the thermostat target by a limited amount based on the remaining room delta. For cooling, it can lower the applied target in the same way. Maximum assist delta defaults to `2 °C` or `4 °F` and can be configured in `0.1` degree steps up to `10 °C` or `18 °F`. When the room sensor reaches the scheduled target, Velair applies a non-driving target based on the climate entity's own temperature and keeps listening, so assistance can start again if the room drifts away from the scheduled target. This helps TRVs avoid closing too early or continuing to drive after the room sensor is already comfortable while keeping the visible Velair schedule target unchanged.

Velair follows Home Assistant's configured temperature unit. There is no separate Celsius or
Fahrenheit setting. Settings shows that Home Assistant unit as a
read-only value so the active behavior can be verified; change it from Home
Assistant's unit-system settings. New schedules, built-in templates, Comfort thresholds,
Room Assist limits, and Adaptive Preconditioning defaults are physically
equivalent in both units. External temperature sensors are converted before
their readings are compared with a climate target.

Velair stores thermal values raw in the unit recorded with its data. If Home
Assistant changes unit, Velair stops scheduling and thermal writes, creates a
persistent notification, and offers one explicit migration from the stored
unit to Home Assistant's current unit in Settings. Continue only when every
stored value still uses the source unit shown; values already in the target
unit would be converted incorrectly. Schedules, templates, active and previous
override targets, Comfort limits, Room Assist values, Adaptive Preconditioning
settings, rates, and learning observations migrate atomically.

The one-time upgrade from published Celsius-only Velair data is different. If
Home Assistant already uses Fahrenheit, Velair assumes that legacy data is
Celsius without asking, keeps the scheduler stopped, and directs the user to
**Reset Velair**. Reset discards the legacy configuration and atomically creates
fresh Fahrenheit defaults. After that upgrade, later Home Assistant unit
changes use the full explicit conversion described above and preserve data.

Portable model v4 exports preserve raw values and declare their unit. Imports
convert selected thermal data when the file and the current Home Assistant unit
differ. Older files without a unit are treated as Celsius because all published
Velair versions that produced those files stored Celsius values. Export remains
available while scheduling is stopped for a unit update, so a reference copy can
be saved before resetting and imported afterward.

If a climate was unavailable while data was migrated or imported, Velair checks
its limits and exact temperature step when Home Assistant publishes them. The
panel warns when a stored schedule target is no longer compatible so it can be
edited before relying on that schedule.

The complete upgrade, migration, backup, and recovery behavior is documented in
[Temperature Units and Migration](temperature-units.md).

When Room Sensor Assist is enabled, the Room Assist tab shows a compact live temperature scale while a managed temperature block is active. The scale marks the scheduled target, the room sensor temperature, the climate entity's target, and the thermostat's own room reading so the adjustment can be understood at a glance. These values are derived from Home Assistant state and Velair runtime state; they are not persisted as a new history. If no managed temperature block is active, the tab shows a waiting state instead of placeholder values. If a sensor is selected but Assist is off, the tab shows that the sensor is saved but not operational.

Room Sensor Assist is event-driven. Velair does not poll temperatures. It listens only to the configured room sensor and climate entity while assistance is active, debounces changes using the per-climate Refresh delay setting, aligns temporary targets to the climate entity's supported temperature step, ignores movements smaller than that step, and restores the real scheduled target when the scheduler is paused, a zone is paused, a boost starts, the block turns off, the sensor becomes unusable, or the feature is disabled. If Adaptive Preconditioning has already started a future block early, Room Sensor Assist follows that future target until the scheduled comfort time instead of falling back to the previous time block.

When preconditioning is disabled for a climate, Velair does not register preconditioning temperature listeners, schedule recalculation callbacks, start learning sessions, or save new observations for that climate. Previously learned samples are preserved and can be reused if preconditioning is enabled again.

Velair also keeps a compact local learning history for preconditioning attempts. It opens a runtime learning session when it applies an early comfort target, then stores a compact observation when the climate reaches the target threshold or when the comfort time arrives. Sessions interrupted by boosts, pauses, scheduler stops, or schedule changes are discarded.

The Preconditioning tab shows the local learning state per climate. Heat and cool are tracked separately, and a direction that the climate entity does not support is shown as unavailable. Once Velair has enough complete observations for a supported direction, it can use similar local history instead of the initial model.

Each supported direction has a compact status card showing whether learning is ready, which model source is active, and the counts of complete, partial, and invalid samples.

The tab also provides a reset learning action for each supported direction. This recalibrates heat or cool from zero independently while keeping schedules, preconditioning settings, and the other direction's learning history.

The per-climate restore action is separate from learning reset. It restores only Adaptive Preconditioning tuning parameters, keeps the current enabled state, preserves room sensor settings, and preserves every stored heat and cool sample.

Partial observations do not become fake completion times. They act as lower bounds, meaning Velair knows the required time was longer than the attempted start window. If enough later complete observations prove that less lead time is working, older partial observations stop forcing the prediction upward. This keeps learning conservative without making high leads permanent.

Velair keeps separate compact histories for heat and cool so seasonal use in one direction cannot evict learning from the other.

All preconditioning settings and calculations run locally inside Home Assistant. Velair does not send climate history or schedule data to any external service.

Developer-oriented details about local learning states, API output, and prediction rules are documented in [Adaptive preconditioning internals](../developer/adaptive-preconditioning.md).

## Environmental Comfort

The Comfort tab lists managed climates in the order configured in Settings. For each climate it can monitor room temperature, humidity, and CO2.

Comfort is monitoring-only. It does not change schedule blocks, climate targets, fan modes, presets, or pauses. Instead, Velair describes the room with human conditions such as `Cold and humid`, keeps CO2 air quality separate, indicates whether readings are complete, and emits automation events when that assessment changes.

Temperature can use a dedicated Comfort temperature sensor, the Room Assist room temperature sensor when one is configured, or the climate entity's own `current_temperature`. Humidity can use a selected humidity sensor or the climate entity's `current_humidity` when available. CO2 is only evaluated when a CO2 sensor is selected.

When Comfort is disabled for a climate, Velair does not register comfort sensor listeners for that climate. When enabled, it listens only to the relevant selected sensors and climate entity. There is no continuous polling.

Detailed setup, heating, cooling, CO2, automation, and privacy examples are documented in [Environmental Comfort](comfort.md).

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

Templates can include every optional climate setting available across the managed climates. This makes one template useful for mixed installations. When a template is applied to a specific climate, Velair keeps only the options that climate supports. For example, a template can contain `fan_mode: quiet` for an AC, but that field is dropped automatically when the same template is applied to a TRV that does not expose fan modes.

## Climate Profiles

Climate profiles switch several zones between coordinated weekly plans without overwriting their Normal schedules. Each profile can give a zone an alternate weekly schedule, pause it, pause and turn it off, or leave it on Normal. Zones omitted from a profile continue using Normal.

Only one profile is active at a time, but its behavior can differ for every zone. Activating a profile applies the block active at the current time and cancels Boosts in affected zones. Global and per-zone pauses retain priority. Home Assistant automations can activate a profile through `velair.activate_profile`; conditions and helper state remain owned by Home Assistant.

See [Climate Profiles](climate-profiles.md) for setup, automation, restart, interaction, and portability details.

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
- panel settings;
- adaptive preconditioning learning.
- climate profile definitions.

When importing, Velair lets you choose which sections to overwrite. Importing replaces selected data, so export first if you need a recovery point. Profile definitions are portable, but their active selection is not. If an imported replacement no longer contains the active profile, Velair returns to Normal.

Every new export records its temperature unit. When importing a file from the
other unit system, Velair converts the selected thermal values to the current
Home Assistant unit. Values tied to an available climate are aligned with that
entity's exact target step; standalone values use safe precision when no common
device step is available. Legacy exports without a recorded unit are announced
in the import screen and interpreted as Celsius.

Adaptive preconditioning learning is matched by the exact Home Assistant climate entity ID. Learning from climates that are not currently managed is shown before import and skipped. For matching climates, the imported learning replaces that climate's existing calibration. Learning for local climates that are not present in the file is kept unchanged.

Preconditioning configuration values are already included with **Thermostat schedules**. The separate **Preconditioning learning** section contains the costly local calibration history.

## Maintenance

The Settings tab shows technical version information:

- frontend build;
- portable export model version;
- storage/model version;
- integration version.

It also includes a reset action. Reset deletes all stored Velair data, including schedules, templates, panel preferences, active boosts and pauses, Comfort and Room Assist settings, Adaptive Preconditioning settings and learning, and startup behavior. It then recreates unit-aware defaults for the currently managed climates. Velair asks for confirmation before doing this.

## Services

Velair exposes Home Assistant services for automations and scripts:

- `velair.set_temperature`
- `velair.apply_schedule`
- `velair.boost`
- `velair.cancel_boost`
- `velair.activate_profile`
- `velair.enable_room_sensor_assist`
- `velair.disable_room_sensor_assist`
- `velair.pause`
- `velair.pause_zone`
- `velair.resume`
- `velair.resume_zone`
- `velair.set_daily_schedule`
- `velair.copy_day_schedule`
- `velair.clear_schedule`

Services that target an entity only work with climates selected during setup. If an unmanaged climate entity is passed, Velair rejects the service call before changing anything.

### `velair.activate_profile`

Activate one stored climate profile and immediately apply the effective current behavior. Use the stable profile ID shown by Velair rather than its editable display name. Omit `profile_id` to return to Normal.

```yaml
action: velair.activate_profile
data:
  profile_id: vacation
```

### `velair.set_temperature`

Set one managed climate entity to a temperature. `hvac_mode` is optional.

This is a Velair-scoped convenience service, not a replacement for Home Assistant's `climate.set_temperature`. The differences are:

- it only accepts climate entities managed by Velair;
- it validates the target temperature against the climate range known by Velair;
- it uses Velair's HVAC mode fallback rules when a mode is provided or when the climate needs to be turned on.

Use Home Assistant's native climate services when you want generic climate control. Use `velair.set_temperature` when an automation should only act on Velair-managed climates.

Optional `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode`, and `humidity` fields can also be provided. Velair applies only the fields supported by the target climate.

```yaml
action: velair.set_temperature
data:
  entity_id: climate.living_room
  temperature: 21
  hvac_mode: heat
  fan_mode: quiet
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
  fan_mode: high
```

Velair captures the restorable climate state before applying the boost. A boost is rejected when the climate is unavailable and this state cannot be captured safely.

### `velair.cancel_boost`

Cancel an active boost early. This always uses the same return behavior as normal expiration: Velair applies the active explicit schedule target when one exists; otherwise, including a `Keep` block, it restores the HVAC mode and target captured before the boost. Calling it when no boost is active has no effect.

```yaml
action: velair.cancel_boost
data:
  entity_id: climate.living_room
```

### `velair.enable_room_sensor_assist`

Enable Room Sensor Assist for one managed climate. The climate must already have a room temperature sensor configured in the Room Assist tab.

```yaml
action: velair.enable_room_sensor_assist
data:
  entity_id: climate.living_room
```

### `velair.disable_room_sensor_assist`

Disable Room Sensor Assist for one managed climate. If Velair was applying an assisted target, it restores the current scheduled target.

```yaml
action: velair.disable_room_sensor_assist
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
      fan_mode: quiet
    - start: "09:00"
      action: turn_off
    - start: "18:00"
      action: set_temperature
      temperature: 20
      hvac_mode: heat
```

Schedule blocks may include optional `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode`, and `humidity` values. Unsupported values are removed for the target climate before the schedule is stored or applied.

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

All runtime events use the same Home Assistant event type:

```text
velair_event
```

The payload field `event` identifies scheduler mode changes, applied targets,
Adaptive Preconditioning plans and observations, Environmental Comfort changes,
Room Assist state and target changes, boosts, and zone pauses.

See [Automation Events](automation-events.md) for the exact emission rules,
deduplication behavior, available fields, and one complete payload example for
every event type.
