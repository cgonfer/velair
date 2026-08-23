# Room Assist

Room Assist lets Velair use a separate room temperature sensor for one managed climate while still controlling the real `climate.*` entity.

This is useful for TRVs, radiator valves, wall thermostats, or AC units whose built-in temperature reading does not represent the real room temperature. For example, a TRV mounted next to a radiator may report `22 °C` while the room sensor still reports `20.5 °C`.

All calculations use the managed climate entity's native Home Assistant unit. The examples below use Celsius for readability, but the same hysteresis limits, signed correction, scheduled-target protection, range width, target step, and physical-limit handling apply directly in Fahrenheit. For example, a `4 °F` room error is a `4 °F` correction; it is not treated as an absolute temperature or given the Celsius-to-Fahrenheit offset.

Room Assist is local and event-driven. Velair does not poll continuously and does not send sensor data outside Home Assistant.

## What It Does

Velair keeps the scheduled target as the real user target, but temporarily adjusts the target sent to the climate entity from the external room sensor and the climate's own reading.

For a single target in fixed `heat` or `cool`, a non-zero deadband creates two switching limits. Room Assist remembers which limit it is moving toward and changes direction only when the external room sensor reaches the opposite limit. This creates a real external-sensor hysteresis cycle instead of allowing the climate's internal sensor to start a new cycle near the central target. Maximum assist delta caps the signed correction calculated from the active limit.

Scalar `auto` and `heat_cool` targets, and native `heat_cool` ranges, retain their neutral or range-margin behavior. Velair does not force those modes to alternate between active heating and cooling across a scalar hysteresis cycle.

The climate entity remains the actuator. Velair does not create a virtual climate entity and does not bypass device firmware. If your thermostat or TRV supports binding an external sensor directly, that device-native option is still usually the best first choice.

## Setup

1. Open the Room Assist tab.
2. Expand the climate you want to configure.
3. Select a room temperature sensor.
4. Enable Room Sensor Assist.
5. Adjust Room Assist deadband to set the lower and upper switching limits for
   fixed heating or cooling, or the neutral margin for automatic modes and
   native ranges.
6. Adjust Maximum assist delta if the default is too small for that room or
   lower than the target gap the thermostat may need to stop heating or
   cooling.
7. Adjust Refresh delay if sensor updates feel too slow or too chatty.

Selecting a room sensor alone only stores the sensor. Velair starts using it as the effective room temperature only when Room Sensor Assist is enabled.

Room Sensor Assist does not require Adaptive Preconditioning. It can run on normal scheduled blocks and on blocks that Adaptive Preconditioning has started early.

A block set to **Keep current mode** still applies its scheduled target. Room
Assist uses the mode that the climate is actually running; if the climate is
off, Velair starts it in a compatible supported mode. **Keep current mode**
does not mean "keep the thermostat target unchanged".

Refresh delay is the debounce applied after the room sensor or climate temperature changes. The default is `20` seconds. Set it to `0` for immediate recalculation, or up to `300` seconds to group frequent sensor updates.

Room Assist deadband is independent from Adaptive Preconditioning's minimum
delta. It defaults to `0.3 °C` or `1 °F`, accepts `0` to disable the deadband,
and can be configured in `0.1` degree steps up to `5 °C` or `9 °F`. Saving it
while Room Assist is active refreshes the assisted target immediately.

The live temperature scale draws the configured deadband as a neutral striped
band. For a fixed single target, its two edges are the hysteresis switching
limits and the live status identifies which one Room Assist is currently
moving toward. For scalar automatic modes, the same band remains a neutral
margin. For a native `heat_cool` range, it spans from the lower limit minus the
deadband to the upper limit plus the deadband. The scale
expands to keep both edges visible. Its compact legend follows the visible
part of the band while the graph is scrolled horizontally and stops at either
edge, so it is shown only while that zone is relevant. The label keeps a short
description such as `Deadband · ±1 °C` whenever the visible width permits it;
bands use a translated `Zone ±1 °C` label, and only truly narrow bands fall
back to `±`. The complete explanation
remains available to assistive technology and as hover text. With a deadband of `0`,
no surface is drawn and the static legend explicitly
states that there is no deadband. The graph and legend update from the saved
backend value; hiding `show_room_assist_deadband` in a Lovelace Room Assist
card hides the setting, band, and legend together.

When upgrading from a version where Room Assist shared Adaptive
Preconditioning's minimum delta, Velair copies the existing value into the new
Room Assist deadband once. This preserves the previously configured band width,
including a historical value that is not on the newer 0.1-degree input step;
fixed `heat` and `cool` then use that value with the hysteresis cycle described
below.
After migration the two settings are independent: changing one never changes
the other. A newly configured or reset zone uses the unit-aware default above.

## Understanding The Live Status

The Room Assist tab reports what Velair can currently do for each managed
climate instead of requiring you to infer it from the thermostat target:

| Status | Meaning |
| --- | --- |
| **Not configured** | No external room sensor has been selected. |
| **Disabled** | A room sensor is stored, but Room Assist is switched off. |
| **Idle** | Room Assist is enabled, but there is no active compatible temperature block or no usable calculation yet. |
| **Ready** | Velair has the readings and target needed to calculate assistance, but no assisted target has been applied yet. |
| **Assisting** | Velair has applied a temporary corrected target or shifted range. |
| **Holding** | Room Assist is keeping an automatic scalar target neutral, holding a native range, or scheduled-target protection is keeping a target on the safe side. A fixed `heat` or `cool` cycle can instead remain **Assisting** while it travels through the deadband. |
| **Blocked** | A pause, Boost, Manual state, or another scheduler state currently has priority over Room Assist. |
| **Unavailable** | The managed climate or required target capability cannot currently be used. The interface shows the available reason when one is known. |

When Room Assist is active, Overview condenses this information into **Toward
lower limit**, **Toward upper limit**, **Active**, **Holding**, or **Scheduled
protection**, as applicable, and shows the scheduled and applied values. A
thermostat minimum or maximum is different from scheduled
protection: the Room Assist tab displays a warning with the requested, applied,
and supported values, and Home Assistant receives one persistent notification
until that physical limit clears.

## Fixed Heating Hysteresis Example

Scenario:

- Scheduled block: `21 °C`, `heat`
- Room Assist deadband: `±0.3 °C`
- Lower limit: `20.7 °C`
- Upper limit: `21.3 °C`
- Maximum assist delta: `2 °C`
- Climate temperature step: `0.1 °C`

The cycle works step by step:

1. The room and climate sensors both report `21.0 °C`. Because this is a new
   fixed-heating cycle inside the band, Velair initializes safely **towards the
   lower limit**.
2. The active hysteresis target is `20.7 °C`. The correction is calculated
   from that edge, not from the central `21 °C` schedule:

   ```text
   correction = 20.7 - 21.0 = -0.3 °C
   climate target = 21.0 + (-0.3) = 20.7 °C
   ```

   This is a deliberately non-driving heating target, subject to the climate's
   supported step and physical limits.
3. If the room passes through `20.9 °C`, Velair remains in the same phase. It
   does not request heat merely because the room crossed the central `21 °C`
   schedule.
4. When the external room reaches `20.7 °C`, Velair switches **towards the
   upper limit** at `21.3 °C`.
5. Suppose the room is `20.7 °C` and the climate sensor is `20.5 °C`. The new
   correction requests heat:

   ```text
   correction = 21.3 - 20.7 = +0.6 °C
   climate target = 20.5 + 0.6 = 21.1 °C
   ```

6. Velair keeps targeting the upper limit while the room passes through
   `21.0 °C`. At `21.3 °C` it switches back towards `20.7 °C`, applies a
   negative correction, and repeats the cycle.

The visible schedule target remains `21 °C`. The temporary target is only the
value sent to the thermostat. If the calculated correction exceeds Maximum
assist delta, Velair caps it before adding it to the climate's current reading.

The fixed-mode phase is runtime-only. A new block, target or HVAC mode, clearing
Room Assist, or reloading Velair starts a fresh cycle. If a fresh `heat` cycle
begins while the room is inside the band, it starts towards the lower limit so
it does not immediately request heat.

When this protection changes the result, the Room Assist live status explains
both values. It identifies the calculated target and the target actually kept
by Velair, and Overview shows a compact `Scheduled protection` state. This is
normal protective behavior rather than a thermostat error, so it does not
create a persistent Home Assistant notification. Physical thermostat limits
continue to use their separate warning and notification.

The climate device remains responsible for compressor protection, minimum run
times, and its physical response. The hysteresis cycle gives Velair a stronger
setpoint strategy, but it cannot guarantee the exact moment at which the
device's relay, valve, or compressor changes state.

## Heating With A Capped Delta

Scenario:

- Scheduled block: `25 °C`, `heat`
- Room sensor: `18 °C`
- Climate current temperature: `17.1 °C`
- Room Assist deadband: `0 °C` (legacy signed correction)
- Maximum assist delta: `5 °C`

The real room gap is large:

```text
25 - 18 = 7 °C
```

Velair caps the assist delta at the configured limit:

```text
assist delta = 5 °C
climate target = 17.1 + 5 = 22.1 °C
```

With a `0.5 °C` step, the heating target is rounded down to `22 °C`.

This prevents Room Assist from sending unrealistic targets to the thermostat while still keeping it open enough to heat the room.

## Fixed Cooling Hysteresis Example

Scenario:

- Scheduled block: `24 °C`, `cool`
- Room Assist deadband: `±0.5 °C`
- Lower limit: `23.5 °C`
- Upper limit: `24.5 °C`
- Maximum assist delta: `2 °C`
- Climate temperature step: `0.5 °C`

Cooling is symmetric, but a fresh cycle inside the band initializes safely
**towards the upper limit** so it does not immediately request cooling:

1. With both sensors at `24.0 °C`, the active edge is `24.5 °C`:

   ```text
   correction = 24.5 - 24.0 = +0.5 °C
   climate target = 24.0 + 0.5 = 24.5 °C
   ```

   Raising a fixed-cooling target discourages cooling.
2. The phase remains unchanged as the room moves through the band. When the
   external sensor reaches `24.5 °C`, Velair switches towards `23.5 °C`.
3. If the room is then `24.5 °C` and the climate sensor reports `25.0 °C`:

   ```text
   correction = 23.5 - 24.5 = -1.0 °C
   climate target = 25.0 - 1.0 = 24.0 °C
   ```

   This requests cooling.
4. Velair keeps targeting the lower edge while the room passes through
   `24.0 °C`. At `23.5 °C`, it switches back towards `24.5 °C` and repeats.

Target-step alignment and physical limits still apply to every temporary
target. Device firmware still owns the actual cooling cycle.

## How Legacy Inversion And Scheduled Protection Work Together

Signed inversion and scheduled-target protection solve two different parts of
the same control problem. Inversion changes the correction's direction after
the external room crosses the target. Scheduled protection is the final safety
boundary when that inverse correction still leaves a fixed-mode target on the
demanding side of the schedule.

The following cooling examples use a `22 °C` schedule, a `0 °C` deadband, a
`0.5 °C` target step, and a Maximum assist delta large enough not to cap the calculation. The
"without inversion" and "before protection" columns are explanatory
intermediate values; they are not selectable Room Assist modes.

| External room | Climate reading | Without inversion after crossing | Signed result before protection | Final target | Why |
| --- | --- | --- | --- | --- | --- |
| `24 °C` | `25.1 °C` | Not applicable | `23.5 °C` | `23.5 °C` | The room still needs cooling. |
| `21 °C` | `19 °C` | `19 °C` | `20 °C` | `22 °C` | Inversion raises the target, but it would still request cooling, so the scheduled floor applies. |
| `21 °C` | `25 °C` | `25 °C` | `26 °C` | `26 °C` | The stronger inverse target is already safely above the schedule, so it is preserved. |

Heating is symmetric. With a `20 °C` heating schedule, an external reading
of `21 °C`, and an internal reading of `24 °C`, the signed result is
`23 °C`; protection applies the scheduled `20 °C` ceiling instead. If
the external room is `24 °C` and the internal reading is `21.5 °C`, the
stronger inverse result is `17.5 °C`, which is already safe and remains
unchanged.

This is why inversion is still useful even with scheduled protection: it can
move farther into the non-driving side when the climate reading allows it,
while protection covers the cases where the internal reading has drifted to
the wrong side.

With a non-zero deadband, fixed `heat` and `cool` use the stateful cycle above
rather than changing direction at the central target. A deadband of `0`
preserves the legacy signed calculation: correction changes sign as the room
crosses the scheduled target and no hysteresis phase is retained.

A compatible scalar `auto` or scalar `heat_cool` target also retains the
legacy signed calculation. Inside its deadband Velair uses the nearest
supported target to the climate reading instead of forcing the unit to
alternate actively between heating and cooling. A native `heat_cool` climate
keeps both user boundaries and receives the complete assisted range described
below.

## Device Hysteresis And Minimum Run Time

Room Assist controls the target sent through Home Assistant. It cannot replace
the thermostat firmware's hysteresis, compressor protection, minimum run time,
or decision about when an equal target is considered idle.

For example, a fixed-heating cycle travelling towards its lower limit sends a
target intended to discourage heating until the external sensor reaches that
edge. A device with a wide internal hysteresis or minimum run time may still
start or continue heating temporarily. Velair does not infer an undocumented
device-specific stop margin or inspect `hvac_action` to change its phase.

Scheduled protection prevents Velair from walking the target across the user
schedule as the internal sensor drifts; it does not promise an immediate HVAC
stop. Device-native external sensor binding or calibration remains the best
option when available. Use an `Off` block when the required behavior is an
explicit stop rather than thermostat-controlled holding.

Maximum assist delta must be large enough to permit the inverse correction the
device may need. The Room Assist editor keeps this guidance visible below the
setting name so it is not missed during configuration. For example:

```text
Thermostat stopping gap: 2.5 °C
Maximum assist delta:    2.0 °C  -> may be insufficient
Maximum assist delta:    3.0 °C  -> permits enough inverse correction
```

Setting `3 °C` does not immediately apply a `3 °C` correction. It only
allows Room Assist to reach that value when the external room difference
requires it.

### Why Climate target can differ from the calculation

**Climate target** is the setpoint currently reported by the climate entity
while Room Assist is ready or blocked. While Room Assist is assisting or
holding an applied scalar target, it instead shows the temporary setpoint
Velair sent to the entity. Neither value is the scheduled room target or the
active hysteresis limit. A climate can
only accept the `target_temp_step` it reports to Home Assistant, so Velair may
need to align the final setpoint to that step.

For example, in fixed cooling Room Assist may calculate `23.9 °C` for a
climate that accepts `0.5 °C` steps. Velair applies `24.0 °C`: cooling is
aligned upward so it does not cool more aggressively than the calculation.
Fixed heating is aligned downward, while scalar automatic modes use the nearest
step. The information button beside **Climate target** adapts its explanation
to the value currently shown and, when alignment actually changed the committed setpoint,
shows the calculation, published step, and applied value. Physical minimum or
maximum limits and scheduled-target protection are reported separately and are
not described as step alignment.

## Heat/Cool Range Example

Room Assist also supports native `heat_cool` ranges. It treats the lower and
upper targets as one comfort band and always moves them together, so their
separation never changes.

Scenario:

- Scheduled range: `19–24 °C`
- Room sensor: `18 °C`
- Climate current temperature: `22 °C`
- Maximum assist delta: `2 °C`
- Climate temperature step: `0.5 °C`

The room is `1 °C` below the heating boundary. Velair positions the lower
boundary `1 °C` above the climate reading and moves the upper boundary by the
same amount:

```text
applied range = 23–28 °C
```

The climate reads `22 °C`, so it is below the applied lower boundary and can
request heat. If the room later rises above `24 °C`, Velair uses the upper
boundary in the same way to request cooling. When the room first enters the
scheduled band, including the configured deadband around its boundaries,
Velair positions the applied band so the climate reading is inside it. It then
keeps that holding band stable while the external room remains inside the band.
It does not chase later movement of the climate entity's internal sensor,
because that reading may itself move when a compressor, fan, valve, or radiator
is active.

The applied range is always aligned to the climate step and shifted as a whole
when physical target limits are reached. Velair never adjusts Min and Max
independently.

If a calculated scalar target or range exceeds the thermostat's supported
minimum or maximum, Velair applies the nearest valid result. The live status
shows the requested target, applied target, and reached limit before the graph.
Home Assistant also creates one persistent notification for the active limit;
repeated sensor updates do not create duplicates, and Velair dismisses it after
recovery.

## When Velair Does Nothing

Room Assist requires the managed climate to publish a valid positive
`target_temp_step`. If that capability is missing, Velair reports Room Assist as
unavailable with `missing_target_step` and does not infer a fallback or send an
assisted target.

Room Assist does not apply an assisted target when:

- no room sensor is selected;
- Room Sensor Assist is disabled;
- the scheduler is not in automatic mode;
- the climate is paused or boosted;
- there is no active temperature block;
- the active block is `Off`;
- the room sensor or climate temperature is unavailable or non-numeric;
- the calculated change is smaller than the climate entity's temperature step;
- the HVAC mode cannot be interpreted as heating or cooling.

In these cases Velair keeps or restores the normal scheduled target where that is safe.

## External Adjustments and Manual Adjustment

With the default **Keep automatic** policy, Room Assist remains authoritative
and Velair recalculates and reapplies its current assisted target after a
detected external setpoint or HVAC-mode change. With any Manual policy, Room
Assist intentionally yields when the change places the climate in **Manual
adjustment**. Velair captures the complete
external climate state from the Home Assistant state-change event, clears the
active Room Assist correction without restoring the scheduled target, and
preserves the external scalar target or native `heat_cool` range. This prevents
Room Assist from immediately fighting a climate-card, physical remote, or other
non-Velair adjustment.

Example:

```text
Scheduled cooling target: 24 °C
Room Assist temporary target: 26 °C
External adjustment: 23 °C
Result during Manual adjustment: 23 °C
```

When Automatic scheduling resumes, Velair resolves the schedule or Profile
intent valid at that time. Room Assist can then calculate a new correction from
the current sensor readings; it does not revive its old `26 °C` correction or
fixed-mode hysteresis phase. Reloading Velair or Home Assistant has the same
runtime-only reset: the current block is resolved again and a safe fresh phase
is selected from the current mode and room reading.

An eligible external change either keeps automatic authority or enters/updates
Manual adjustment according to the policy saved for that climate. For policies, service examples, Boost/Profile
interactions, and attribution limits, see
[External Changes and Manual Adjustment](manual-control.md).

## Adaptive Preconditioning

When Adaptive Preconditioning is enabled and starts a future block early, Room Assist follows that future target until the scheduled comfort time.

This matters because the current clock time may still belong to an older block. Velair treats the already-started preconditioning block as the active managed target, so Room Assist does not recalculate against the previous block.

When Room Sensor Assist is enabled, Adaptive Preconditioning also uses the selected room sensor as the effective room temperature source for decisions and learning.

## Automation Events

Velair emits the standard `velair_event` Home Assistant event.

Room Assist emits:

- `room_sensor_assist_state_changed`: Room Assist was enabled or disabled.
- `room_sensor_assist_updated`: Velair applied a temporary assisted climate target.
- `room_sensor_assist_restored`: Velair stopped managing the temporary assisted target and restored the normal scheduled target where possible.

See [Automation Events](automation-events.md#room-sensor-assist-state-changed)
for complete payloads and all restoration reasons.

Example event data:

```yaml
event: room_sensor_assist_updated
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
target_temperature: 21
applied_temperature: 20
room_temperature: 18
climate_temperature: 17.1
assist_delta: 3.3
applied_offset: 2.9
direction: heat
hvac_mode: heat
hysteresis_phase: towards_upper
hysteresis_target: 21.3
deadband_low: 20.7
deadband_high: 21.3
reason: current_schedule
```

The four hysteresis fields are optional. They appear for a fixed scalar
`heat` or `cool` cycle with a non-zero deadband and are absent for legacy
zero-deadband correction, scalar automatic modes, and native ranges.

A range update uses the complete scheduled and applied bands instead of scalar
target fields:

```yaml
event: room_sensor_assist_updated
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
target_temp_low: 19
target_temp_high: 24
applied_target_temp_low: 23
applied_target_temp_high: 28
room_temperature: 18
climate_temperature: 22
assist_delta: 1
range_shift: 4
direction: heat
hvac_mode: heat_cool
reason: current_schedule
```

Example automation trigger:

```yaml
trigger:
  - platform: event
    event_type: velair_event
    event_data:
      event: room_sensor_assist_updated
      entity_id: climate.living_room
```

Room Assist can also be controlled from automations with:

- `velair.enable_room_sensor_assist`
- `velair.disable_room_sensor_assist`

## Lovelace

The Room Assist view is available as a Lovelace card:

```yaml
type: custom:velair-card
view: sensors
entities:
  - climate.living_room
```

The live temperature scale separates two relationships. For a single target, the upper line compares the room sensor with the scheduled target and the lower control line compares the climate reading with the climate target. In fixed `heat` or `cool`, the striped band marks both hysteresis limits and the status names the active limit. In scalar automatic modes it remains a neutral margin. For a native range, red and blue brackets identify the complete scheduled and applied bands, including both limits. One signed `Range shift` connector runs between their centers so it represents the movement of the whole band rather than either boundary alone. These indicators describe only the setpoint sent by Velair; they do not claim that the thermostat, valve, or compressor is actively heating or cooling.

In narrow dashboard columns, the live temperature scale scrolls horizontally so temperature markers remain readable.

The Room Assist Lovelace card can also hide individual parts when you want a compact dashboard-only view:

```yaml
type: custom:velair-card
view: sensors
entities:
  - climate.living_room
show_room_assist_switch: false
show_room_assist_sensor: false
show_room_assist_deadband: false
show_room_assist_max_delta: false
show_room_assist_debounce: false
show_room_assist_live_status: true
```

Omitted `show_room_assist_*` options default to `true`.

## Technical Details

Developer-oriented details about storage fields, runtime status, assisted target calculation, restoration behavior, and events are documented in [Room Assist internals](../developer/room-assist.md).
