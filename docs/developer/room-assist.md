# Room Assist Internals

Room Assist lets Velair use a separate room temperature sensor for one managed climate while the real `climate.*` entity remains the actuator.

This page documents implementation details. User-facing setup and examples are documented in [Room Assist](../user/room-assist.md).

## Scope

Room Sensor Assist is optional, local, event-driven, and disabled by default.

It can run on normal scheduled temperature blocks and on blocks that Adaptive Preconditioning has already started early. It does not require Adaptive Preconditioning to be enabled.

Velair does not create a virtual climate entity, bypass device firmware, or poll temperatures continuously. If a thermostat or TRV supports binding an external sensor directly, that device-native option remains the preferred first choice.

## Stored Configuration

Room Assist configuration is stored per managed climate together with the climate's preconditioning settings for compatibility with the current storage shape:

```json
{
  "room_temperature_entity_id": "sensor.living_room_temperature",
  "room_sensor_assist_enabled": true,
  "room_sensor_assist_deadband": 0.3,
  "room_sensor_assist_max_delta": 2.0,
  "room_sensor_assist_debounce_seconds": 20
}
```

Key meanings:

- `room_temperature_entity_id`: optional Home Assistant `sensor.*` temperature entity selected from the Room Assist tab.
- `room_sensor_assist_enabled`: enables runtime target assistance. Selecting a sensor alone does not make it operational.
- `room_sensor_assist_deadband`: suppresses correction while the absolute room error is at or below the configured delta. It is independent from Adaptive Preconditioning's `minimum_delta_temperature`; bounds are `0..5 °C` or `0..9 °F` in `0.1` degree steps.
- `room_sensor_assist_max_delta`: caps how far Velair may temporarily move the target sent to the climate entity while preserving the scheduled target as the real user target. It must be large enough to permit any known target gap the device may need to stop heating or cooling; the cap is not applied in full unless the external room error requires it.
- `room_sensor_assist_debounce_seconds`: waits this many seconds after relevant room sensor or climate state changes before recalculating assistance. The supported range is `0` to `300` seconds.

All runtime targets, readings, steps, limits, signed corrections, and range widths use the managed climate entity's native Home Assistant temperature unit. Only an external sensor that declares a different unit is converted before calculation. Absolute temperatures use offset-and-scale conversion, while the Room Assist deadband and maximum assist delta use scale-only conversion. The maximum assist delta is normalized with a broad bound so Celsius and Fahrenheit installations can both configure useful limits. The frontend should display values using the managed climate's unit.

## Effective Temperature Source

When `room_temperature_entity_id` is configured and `room_sensor_assist_enabled` is true, Velair treats the selected room sensor as the effective room temperature source for:

- Room Sensor Assist calculations;
- Adaptive Preconditioning direction checks;
- Adaptive Preconditioning initial and observed learning temperatures;
- active preconditioning learning-session listeners;
- pre-start replanning callbacks.

When Room Sensor Assist is disabled, the selected sensor remains stored but is not used as the effective room temperature source. Velair falls back to the climate entity's own `current_temperature`.

Stored Adaptive Preconditioning observations include `temperature_source: "room_sensor"` and `room_temperature_entity_id` only when a room sensor was actually used. Older observations and climate-temperature observations keep their compact shape.

## Runtime Status

The schedule response exposes a runtime-only `room_sensor_assist` snapshot for the panel and Lovelace card. It is derived from Home Assistant state and scheduler state when the response is built. It is not persisted as history.

This status can include:

- whether assistance is idle, unavailable, or assisting;
- the active scheduled target and HVAC mode;
- whether the active block was started early by Adaptive Preconditioning;
- the configured room sensor value;
- the climate entity's own temperature reading;
- the temporary target currently applied to the climate;
- the absolute logical assist delta and signed applied target offset.
- for a scalar scheduled-target protection, `scheduled_target_guard` and the
  step-aligned `calculated_temperature` before that protection was applied.

For a native range it includes `target_temp_low` and `target_temp_high`, the
corresponding `applied_target_temp_low` and `applied_target_temp_high`, the live
`climate_target_temp_low` and `climate_target_temp_high` reported by Home
Assistant, and the signed common `range_shift`. Scalar `applied_offset` is not
reused for a range.

## Assistance Lifecycle

Assistance is active only while Velair has applied a managed schedule target for that climate.

During that time, Velair listens to state changes from:

- the configured room temperature sensor;
- the managed climate entity.

Those listeners exist only while assistance is relevant. They are removed when the scheduler state, zone state, schedule block, sensor state, or feature state means assistance is no longer active.

When assistance refreshes during active Adaptive Preconditioning, an already-applied early target is authoritative until `target_when`. Otherwise the current schedule event is authoritative. Stored Room Assist runtime state is only a record of the last target sent; it must never select an older schedule block after a transition.

## Target Calculation

Heating and cooling use the same signed calculation:

```text
room_error = target_temperature - room_temperature
correction = 0 when abs(room_error) <= room_sensor_assist_deadband
correction = clamp(room_error, -room_sensor_assist_max_delta, room_sensor_assist_max_delta) otherwise
applied_target = climate_current_temperature + correction

if mode is fixed heat and the room no longer requests heat:
    applied_target = min(applied_target, target_temperature)

if mode is fixed cool and the room no longer requests cooling:
    applied_target = max(applied_target, target_temperature)
```

A positive correction raises the climate target; a negative correction lowers it. When the room crosses the scheduled target, the sign reverses, so Room Assist counters continued heating or cooling instead of stopping its calculations at the threshold. The configured Room Assist deadband remains symmetric with zero logical correction and is refreshed immediately when saved while assistance is active.

For explicit `heat` and `cool`, the direction remains fixed and inversion only
moves the target toward the non-driving side. For scalar targets in a
compatible `auto` or scalar `heat_cool` mode, direction is resolved from the
external room error and may change after crossing. Inside the deadband, a
scalar auto-mode target is aligned to the nearest supported step and does not
use a fixed-direction scheduled guard, because auto has no universal
non-driving side. Range-only `heat_cool` entities never receive a scalar
target; they follow the native range path.

The scheduled target is also a directional safety boundary whenever the
external room no longer requests the active direction, including the configured
deadband. A cooling target cannot fall below the schedule and a heating target
cannot rise above it. An inverse correction that is already farther into the
safe side is preserved. This breaks the feedback loop created by climate
sensors whose reading moves because the compressor, fan, valve, or radiator is
running, without removing signed correction after an overshoot.

For a cooling target of `22 °C`, an external reading of `21 °C`, and a
climate reading of `19 °C`, the signed candidate is `20 °C`; the cooling
floor changes the applied target to `22 °C`. With the same external reading
and a climate reading of `25 °C`, the signed candidate is `26 °C`; it is
already non-driving and remains unchanged. Heating uses the exact inverse
ceiling rule.

The boundary is a target-safety invariant, not an HVAC-state guarantee. For
example, a heating entity may report `16.5 °C`, receive an equal `16.5 °C`
holding target, and still run because its firmware uses a wide hysteresis or a
minimum run time. Velair continues reacting to external-room changes, but it
does not infer an undocumented device-specific stop margin. An explicit `Off`
block is the authoritative way to require shutdown.

The scalar result keeps `requested_temperature` as the target after scheduled
protection but before physical thermostat limits. `calculated_temperature` is
the step-aligned candidate before scheduled protection.
`scheduled_target_guard` is `cooling_floor`, `heating_ceiling`, or `null`.
These fields are runtime-only, optional in public payloads, and require no
storage migration. The frontend treats their absence as an older compatible
payload.

Velair keeps the runtime state and listeners active while the scheduled block remains active, so assistance can start again if the room sensor moves away from the scheduled target later.

Runtime Room Assist state is never authoritative for choosing the active schedule block. After any active Adaptive Preconditioning target is resolved, Velair uses the current schedule event. This prevents a delayed sensor or climate callback from restoring a target calculated for an earlier block.

The applied target is bounded by the climate entity's min/max target temperatures and aligned to the climate entity's `target_temp_step`. For heating, Velair rounds the assisted target down to the nearest supported step; for cooling, it rounds up. The rule follows the active HVAC direction on both sides of the scheduled target. During an inverse correction this can increase the final offset by less than one device step, while keeping the target on the conservative side for that mode.

When a physical target limit changes an applied result, runtime state adds
`limited_by` (`minimum` or `maximum`), `limit_temperature`, and either
`requested_temperature` or `requested_target_temp_low` plus
`requested_target_temp_high`. These fields describe only the last target that
was actually applied; ready-state calculations do not publish limit warnings.

Limit notifications are event-driven inside the existing per-climate lock. A
stable notification ID and block-based fingerprint prevent duplicates without
using changing room or climate readings. Notification failures are isolated
from climate control. Recovery, disablement, clearing, and scheduler shutdown
dismiss tracked notifications.

If the climate does not publish a finite, positive `target_temp_step`, Room Assist
reports `missing_target_step`, does not calculate a fallback step, and sends no
assisted climate service call.

### Native Range Calculation

For a scheduled range `[low, high]`, Room Assist treats both boundaries as one
band:

```text
room < low - deadband   -> heating boundary
room > high + deadband  -> cooling boundary
otherwise               -> holding
```

For heating, the capped error from `low` positions the applied lower boundary
relative to the climate reading. For cooling, the capped error from `high`
positions the applied upper boundary. The other boundary is derived using the
original range width. On entering holding, Velair moves the whole band so the
climate reading is strictly inside it by one supported target step when physical
limits allow. That valid holding band is then kept stable for the same active
block while the external room remains in holding. Later movement of the climate
entity's internal reading does not reposition it. A new block, a changed target
or capability, a physical-limit condition, or the external room leaving the
band causes a fresh calculation.

The common shift is step-aligned and clamped as one value so neither individual
boundary can narrow or widen the user's range. `assist_delta` is the capped
active-boundary correction, or zero while holding. `range_shift` is the signed
scheduled-to-applied displacement after step alignment and physical limits.

Velair ignores target movements smaller than the climate entity's `target_temp_step`.

## Clearing And Restoring

Assistance is cleared when:

- the scheduler leaves auto mode;
- a zone boost starts;
- a zone is paused;
- a scheduled `Off` block is applied;
- the schedule changes or is cleared;
- Room Sensor Assist is disabled;
- the room sensor or climate temperature is missing or non-numeric;
- the active HVAC mode cannot be interpreted as heating or cooling.

When assistance is cleared because the block or Velair control path ends, Velair restores the real scheduled target when possible.

## Automation Events

Velair emits the standard `velair_event` Home Assistant event.

Room Assist emits:

- `room_sensor_assist_state_changed` when enablement changes;
- `room_sensor_assist_updated`: Velair applied a temporary assisted climate target.
- `room_sensor_assist_restored`: Velair stopped managing the temporary assisted target and restored the normal scheduled target where possible.

The event payload includes the climate entity, room sensor entity, scheduled target, applied target, measured temperatures, the absolute logical correction (`assist_delta`), direction, HVAC mode, and reason. Scalar events use `target_temperature`, `applied_temperature`, and signed `applied_offset`. When scheduled protection changes a scalar result, the update also includes `scheduled_target_guard` and `calculated_temperature`; older consumers can ignore these additive fields. Range events use the complete scheduled and applied boundary pairs plus signed `range_shift`. Restoration events return the scheduled target form and report correction or shift as zero.

The public payload contract is centralized in
[Automation Events](../user/automation-events.md#room-sensor-assist-state-changed).

## API Summary

Room Assist settings are updated through the same per-climate preconditioning API payload because they share the current storage object:

```ts
await hass.connection.sendMessagePromise({
  type: "velair/update_zone_preconditioning",
  entity_id: "climate.living_room",
  preconditioning: {
    room_temperature_entity_id: "sensor.living_room_temperature",
    room_sensor_assist_enabled: true,
    room_sensor_assist_deadband: 0.3,
    room_sensor_assist_max_delta: 2.0,
    room_sensor_assist_debounce_seconds: 20
  }
});
```

Automation services are also available:

- `velair.enable_room_sensor_assist`
- `velair.disable_room_sensor_assist`

The detailed WebSocket contract is documented in [WebSocket API](api.md).

## Limitations

Room Sensor Assist depends on Home Assistant state updates from the selected room sensor and the managed climate entity. If those entities do not publish useful updates, Velair cannot infer intermediate room movement.

The climate entity remains responsible for the actual hardware behavior. Velair can request target changes, but device firmware, valve logic, compressor protection, HVAC mode support, min/max target limits, and vendor-specific behavior still apply.
