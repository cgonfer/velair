# Room Assist

Room Assist lets Velair use a separate room temperature sensor for one managed climate while still controlling the real `climate.*` entity.

This is useful for TRVs, radiator valves, wall thermostats, or AC units whose built-in temperature reading does not represent the real room temperature. For example, a TRV mounted next to a radiator may report `22 °C` while the room sensor still reports `20.5 °C`.

All calculations use the managed climate entity's native Home Assistant unit. The examples below use Celsius for readability, but the same signed correction, scheduled-target protection, range width, target step, and physical-limit handling apply directly in Fahrenheit. For example, a `4 °F` room error is a `4 °F` correction; it is not treated as an absolute temperature or given the Celsius-to-Fahrenheit offset.

Room Assist is local and event-driven. Velair does not poll continuously and does not send sensor data outside Home Assistant.

## What It Does

Velair keeps the scheduled target as the real user target, but temporarily adjusts the target sent to the climate entity from the signed difference between that target and the external room sensor. The correction can move in either direction: toward heating or cooling while the room needs it, and inversely if the room crosses the scheduled target. Once the external room no longer needs the active direction, Velair also keeps the temporary target on the safe side of the scheduled target. This prevents a climate entity's own sensor from pulling a cooling target below the schedule, or a heating target above it, as that internal reading drifts while the unit runs.

The climate entity remains the actuator. Velair does not create a virtual climate entity and does not bypass device firmware. If your thermostat or TRV supports binding an external sensor directly, that device-native option is still usually the best first choice.

## Setup

1. Open the Room Assist tab.
2. Expand the climate you want to configure.
3. Select a room temperature sensor.
4. Enable Room Sensor Assist.
5. Adjust Room Assist deadband if small sensor differences should be ignored.
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

The live temperature scale draws this no-correction zone as a neutral striped
band. For a single target, the band spans the scheduled target plus and minus
the configured deadband. For a native `heat_cool` range, it spans from the
lower limit minus the deadband to the upper limit plus the deadband. The scale
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
Room Assist deadband once. This preserves the zone's previous behavior,
including a historical value that is not on the newer 0.1-degree input step.
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
| **Holding** | The external room is at the target or inside the scheduled range, or scheduled-target protection is keeping a fixed-mode target on the safe side. |
| **Blocked** | A pause, Boost, Manual state, or another scheduler state currently has priority over Room Assist. |
| **Unavailable** | The managed climate or required target capability cannot currently be used. The interface shows the available reason when one is known. |

When Room Assist is active, Overview condenses this information into
**Active**, **Holding**, or **Scheduled protection** and shows the scheduled and
applied values. A thermostat minimum or maximum is different from scheduled
protection: the Room Assist tab displays a warning with the requested, applied,
and supported values, and Home Assistant receives one persistent notification
until that physical limit clears.

## Heating Example

Scenario:

- Scheduled block: `21 °C`, `heat`
- Room sensor: `18 °C`
- Climate current temperature: `17.1 °C`
- Maximum assist delta: `5 °C`
- Climate temperature step: `0.5 °C`

Velair calculates the remaining room gap:

```text
21 - 18 = 3 °C
```

The remaining gap is below the configured maximum assist delta, so Velair uses `3 °C`.

```text
climate target = climate current temperature + assist delta
climate target = 17.1 + 3 = 20.1 °C
```

With a `0.5 °C` climate step, Velair rounds the assisted target to a supported heating target:

```text
20.1 °C -> 20 °C
```

The visible schedule target remains `21 °C`. The temporary `20 °C` target is only the value sent to the thermostat so the room sensor can keep moving toward `21 °C`.

If the room sensor later reports `21 °C`, the signed correction becomes zero. For heating, Velair will not let this non-driving target rise above the scheduled `21 °C`, even if the climate entity's internal reading rises while the unit is running. If the room continues warming past `21 °C`, the correction becomes negative and can move the climate target farther below the schedule. Cooling behaves symmetrically: once cooling is no longer needed, the temporary target never falls below the scheduled target, and crossing below it can move the climate target farther upward.

For example, with a `22 °C` cooling block, an external room reading of `21 °C`, and an internal climate reading of `19 °C`, the raw signed calculation would request `20 °C`. That would still ask a cooling-only device to cool. Velair therefore applies `22 °C`, the scheduled safety boundary. If the same climate instead reads `25 °C`, the inverse calculation can request `26 °C`; that stronger non-driving target is already on the safe side and is preserved.

When this protection changes the result, the Room Assist live status explains
both values. It identifies the calculated target and the target actually kept
by Velair, and Overview shows a compact `Scheduled protection` state. This is
normal protective behavior rather than a thermostat error, so it does not
create a persistent Home Assistant notification. Physical thermostat limits
continue to use their separate warning and notification.

If the room later drops again during the same active block, Velair can assist again.

The configured Room Assist deadband acts symmetrically around the scheduled target. Inside it, the logical correction is zero. The climate device remains responsible for hysteresis, compressor protection, minimum run times, and its physical response, so it may continue briefly before a correction produces another supported target step.

## Heating With A Capped Delta

Scenario:

- Scheduled block: `25 °C`, `heat`
- Room sensor: `18 °C`
- Climate current temperature: `17.1 °C`
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

## Cooling Example

Scenario:

- Scheduled block: `22 °C`, `cool`
- Room sensor: `24 °C`
- Climate current temperature: `25.1 °C`
- Maximum assist delta: `2 °C`
- Climate temperature step: `0.5 °C`

Velair calculates the remaining cooling gap:

```text
24 - 22 = 2 °C
```

For cooling, Velair moves the climate target below the climate current temperature:

```text
climate target = climate current temperature - assist delta
climate target = 25.1 - 2 = 23.1 °C
```

With a `0.5 °C` climate step, Velair rounds to a supported cooling target:

```text
23.1 °C -> 23.5 °C
```

The scheduled target remains `22 °C`. The temporary climate target is only used to help the room sensor move toward the real scheduled target.

If the room later falls below `22 °C`, the room error changes sign. Room Assist then raises the temporary climate target relative to the climate reading instead of continuing to lower it.

## How Inversion And Scheduled Protection Work Together

Signed inversion and scheduled-target protection solve two different parts of
the same control problem. Inversion changes the correction's direction after
the external room crosses the target. Scheduled protection is the final safety
boundary when that inverse correction still leaves a fixed-mode target on the
demanding side of the schedule.

The following cooling examples use a `22 °C` schedule, a `0.5 °C` target
step, and a Maximum assist delta large enough not to cap the calculation. The
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

Inversion changes a temporary target, not necessarily the HVAC mode. A fixed
`heat` block can reduce or remove heating demand but cannot actively cool; a
fixed `cool` block can reduce or remove cooling demand but cannot actively
heat. A compatible scalar `auto` climate can change direction as the external
room crosses one target; while the room is inside the deadband, Velair uses the
nearest supported target to the climate reading rather than inventing a fixed
heating ceiling or cooling floor. A native `heat_cool` climate instead keeps
both user boundaries and receives the complete assisted range described below.

## Device Hysteresis And Minimum Run Time

Room Assist controls the target sent through Home Assistant. It cannot replace
the thermostat firmware's hysteresis, compressor protection, minimum run time,
or decision about when an equal target is considered idle.

For example, consider a `18 °C` heating schedule, an external room already at
`18 °C`, and a climate entity reading `16.5 °C`. The signed correction is
zero, so the calculated target is `16.5 °C`. That target is already below the
scheduled heating ceiling, so scheduled protection does not change it. A
device with a large heating hysteresis may nevertheless start or continue
heating at that value. If the external room rises above `18 °C`, signed
inversion lowers the target further, but the device may still run briefly
before its own stopping rule is reached.

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
the current sensor readings; it does not revive its old `26 °C` correction.

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
assist_delta: 3
applied_offset: 2.9
direction: heat
hvac_mode: heat
reason: current_schedule
```

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

The live temperature scale separates two relationships. For a single target, the upper neutral line compares the room sensor with the scheduled target and the lower control line compares the climate reading with the climate target. For a native range, red and blue brackets identify the complete scheduled and applied bands, including both limits. One signed `Range shift` connector runs between their centers so it represents the movement of the whole band rather than either boundary alone. Inside the configured deadband the logical correction is zero, although the scheduled safety boundary, target-step alignment, or a stable holding range can still leave a visible offset. These indicators describe only the setpoint sent by Velair; they do not claim that the thermostat, valve, or compressor is actively heating or cooling.

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
