# Room Assist Internals

Room Assist lets Velair use a separate room temperature sensor for one managed climate while the real `climate.*` entity remains the actuator.

This page documents implementation details. User-facing setup and examples are documented in [Room Assist](../user/room-assist.md).

## Scope

Room Sensor Assist is optional, local, event-driven, and disabled by default.

It can run on normal scheduled temperature blocks and on blocks that Adaptive Preconditioning has already started early. It does not require Adaptive Preconditioning to be enabled.

Velair does not create a virtual climate entity, bypass device firmware, or poll temperatures continuously. If a thermostat or TRV supports binding an external sensor directly, that device-native option remains the preferred first choice.

Range delivery compatibility is separate from band interpretation. Only an
effective `heat_cool` mode authorizes range assistance. A range-only entity in
`heat`, `cool`, or `auto` receives its nominal pair and reports
`unsupported_range_mode` rather than entering scalar or band calculations.
Clear prior runtime assistance when intent changes, without restoring its old
correction over the new target. Retain the saved assist configuration.

## Stored Configuration

Room Assist configuration is stored per managed climate together with the climate's preconditioning settings for compatibility with the current storage shape:

```json
{
  "room_temperature_entity_id": "sensor.living_room_temperature",
  "room_sensor_assist_enabled": true,
  "room_sensor_assist_deadband": 0.3,
  "room_sensor_assist_braking_level": "default",
  "room_sensor_assist_max_delta": 2.0,
  "room_sensor_assist_minimum_margin": 0.0,
  "room_sensor_assist_debounce_seconds": 20
}
```

Key meanings:

- `room_temperature_entity_id`: optional Home Assistant `sensor.*` temperature entity selected from the Room Assist tab.
- `room_sensor_assist_enabled`: enables runtime target assistance. Selecting a sensor alone does not make it operational.
- `room_sensor_assist_deadband`: defines the lower and upper runtime-hysteresis limits for fixed `heat` and `cool` around the scalar target or configured range reference, and the neutral margin for scalar automatic modes and native `heat_cool` ranges. A zero value preserves the legacy signed correction without phase state. It is independent from Adaptive Preconditioning's `minimum_delta_temperature`; bounds are `0..5 °C` or `0..9 °F` in `0.1` degree steps.
- `room_sensor_assist_braking_level`: `default`, `moderate`, or `high`; omission means `default`. Additional braking requires a positive deadband and a fixed heating or cooling mode with a scalar target or selected range reference. Normal settings updates validate the final merged configuration, so a non-default level with zero deadband is rejected. Inconsistent stored combinations retain their settings but suspend additional braking with an explicit runtime reason.
- `room_sensor_assist_max_delta`: caps the signed Room Assist correction, including a configured minimum margin, not the final setpoint after scheduled-target protection or preparation offsets. With a zero minimum margin the cap is not applied in full unless the external room error requires it. Optional braking strengthens the scheduled-target guard without redefining this cap.
- `room_sensor_assist_minimum_margin`: optional minimum requested correction magnitude, default `0`, bounded by `0..10 °C` or `0..18 °F` and by `room_sensor_assist_max_delta`. Settings updates and imports validate the final merged configuration; increasing the margin never raises the maximum automatically. See [Minimum control margin](#minimum-control-margin).
- `room_sensor_assist_debounce_seconds`: waits this many seconds after relevant room sensor or climate state changes before recalculating assistance. The supported range is `0` to `300` seconds.

All runtime targets, readings, steps, limits, signed corrections, and range widths use the managed climate entity's native Home Assistant temperature unit. Only an external sensor that declares a different unit is converted before calculation. Absolute temperatures use offset-and-scale conversion, while the Room Assist deadband, minimum control margin and maximum assist delta use scale-only conversion. The maximum assist delta is normalized with a broad bound so Celsius and Fahrenheit installations can both configure useful limits. The frontend should display values using the managed climate's unit.

## Effective Temperature Source

When `room_temperature_entity_id` is configured and `room_sensor_assist_enabled` is true, Velair treats the selected room sensor as the effective room temperature source for:

- Room Sensor Assist calculations;
- Adaptive Preconditioning direction checks;
- Adaptive Preconditioning initial and observed learning temperatures;
- active preconditioning learning-session listeners;
- pre-start replanning callbacks.

When Room Sensor Assist is disabled, the selected sensor remains stored but is not used as the effective room temperature source. Velair falls back to the climate entity's own `current_temperature`.

Stored Adaptive Preconditioning observations include `temperature_source: "room_sensor"` and `room_temperature_entity_id` only when a room sensor was actually used. Older observations and climate-temperature observations keep their compact shape.

## Optional weekly temperature references

The optional `preconditioning.room_sensor_schedule` configuration selects a
temperature reference independently of thermal blocks. Absence of this field
preserves the legacy fixed-sensor configuration and runtime path. A stored,
disabled schedule is retained without enabling source-boundary processing.

```json
{
  "room_sensor_schedule": {
    "enabled": true,
    "default_source": null,
    "periods": [
      {
        "weekdays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
        "start": "08:00",
        "end": "17:00",
        "source": "sensor.office_temperature"
      }
    ]
  }
}
```

A source is a temperature `sensor.*` entity ID or `null` for the control unit's
native temperature reference. Native group measurements retain their existing
selected-member semantics. Native reference bypasses correction; it does not
toggle persisted Room Assist enablement or configure device firmware. The
original `room_temperature_entity_id` is preserved for fixed-sensor operation.

Periods use half-open local-time intervals, with overnight intervals anchored
to the selected start day. Reject overlaps, invalid days/times, zero-duration
periods and invalid source IDs. Saving replaces the complete nested schedule
atomically through the existing zone-settings boundary. Portable exports use
model 27; older exports without a sensor schedule retain their fixed-source
behavior.

Prepare the schedule on configuration changes. Resolve a shared effective source
and next real boundary for control, candidates, status, listeners and learning;
do not independently select sources in each consumer. Reuse prepared results
between boundaries and integrate the next boundary into the scheduler's existing
deadline drain. Delayed wakeups resolve the latest reference once rather than
replaying missed transitions. A source identity change matters even if both
readings are equal.

Before reconciling the current thermal intent, retire obsolete delivery work,
correction/hysteresis state and learning sessions. Preserve all execution-authority
gates and avoid duplicate delivery when thermal and reference boundaries coincide.
Runtime transitions do not write configuration. Unavailable external references
retain their identity and nominal-target fallback instead of selecting another
room. Comfort and history retain their existing source-selection policies.

In this beta, early thermal application cannot cross a reference boundary.
Replanning at the boundary uses the newly effective source. Only zones that opt
in use source-compatible learning samples; existing observations are retained.

Routine schedule responses carry only the calendar summary: `enabled`,
`default_source`, and `period_count`. Complete periods are read on demand through
`velair/get_room_sensor_schedule` for a managed control unit. That endpoint reads
the committed published configuration and returns a detached, mutable calendar
or `null`. The editor must not interpret an omitted `periods` array as an empty
calendar. It loads detail before editing, retains dirty drafts through live
updates, and verifies the committed detail after saving. Failed detail loads or
verification leave the draft available rather than replacing it with a summary.
Storage and portable exports keep the complete calendar.

The reference editor presents **Fixed sensor** and **By schedule** as mutually
exclusive modes backed by the existing calendar `enabled` flag. The unit header
retains the only Room Assist switch. Changing modes edits a detached draft;
Save applies the selected mode and Cancel restores committed values. Both fixed
and scheduled settings survive mode changes. Fixed-sensor edits save immediately
only outside a pending mode draft. Valid calendar edits are retained when saving
fixed mode; an invalid calendar draft falls back to the saved valid calendar.
Read-only cards keep their existing effective-reference status.

## Runtime Status

The schedule response exposes a runtime-only `room_sensor_assist` snapshot for the panel and Lovelace card. It is derived from Home Assistant state and scheduler state when the response is built. It is not persisted as history.

The additive `control_intent` display projection reuses the validated, committed
Room Assist intent already consumed by Shared Climate Supply. It exposes
`active`, `valid`, `demand`, `direction` and, when valid, `source` and directional
`thresholds` (`target`, `start_temperature`, `stop_temperature`). It does not
depend on a configured supply. Invalid or uncommitted intent retains an unknown
demand; the frontend must not infer demand from `status`, signed correction or
the relative sensor temperatures. Preparation uses the committed stop threshold
to display its arrival margin, including when its effective extra is zero.

This projection is read-only: fetching status or opening the graph must not
advance hysteresis, accept delivery, change learning or write storage. Internal
preparation keys are not exposed. The shared graph has temporary presentation
state for Normal/Detailed and Data only; it adds no configuration or polling.

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
- for fixed-mode scalar or configured-reference range hysteresis, optional `hysteresis_phase`,
  `hysteresis_target`, `deadband_low`, and `deadband_high` fields. The phase is
  `towards_lower` or `towards_upper`; the target is the active edge.

The additive `braking` object describes the configured and effective braking
policy: `configured_level`, `effective_level`, `active`, `stop_temperature`,
`resume_temperature`, `setpoint_bound`, and `reason`. Thresholds and bound are
temperatures or `null`; an inactivity reason is a string or `null`. Additional
braking is active only in the committed non-driving phase of an applicable
non-default policy. Unsupported contexts retain the configured level while
exposing the effective default policy and an explanation. Older payloads without
the object retain their existing frontend behavior.

The nominal `deadband_low` and `deadband_high` remain centered on the scheduled
target. Effective braking thresholds are separate: neither a graph nor Supply
may infer High's stop threshold from those nominal bounds. Status reads do not
advance phases, commit a preview, or send climate commands. Published active
metadata remains tied to the committed control state until a control refresh
succeeds.

Missing room-sensor or climate-temperature readings suspend additional braking
with `room_sensor_unavailable` or `climate_temperature_unavailable`, rather than
presenting an active braking prediction from incomplete inputs. When the device's
effective target step changes, committed braking bounds remain those of the
accepted delivery until the next control refresh commits the new calculation.

For a native range it includes `target_temp_low` and `target_temp_high`, the
corresponding `applied_target_temp_low` and `applied_target_temp_high`, the live
`climate_target_temp_low` and `climate_target_temp_high` reported by Home
Assistant, and the signed common `range_shift`. Scalar `applied_offset` is not
reused for a range.

## Assistance Lifecycle

Assistance is active only while Velair has applied a managed schedule target for that climate.

A scheduled scalar or native-range block calculates applicable Room Assist before
sending its target. Delivery sends the assisted target once, with the block's
HVAC mode and options; it does not send the nominal target first. When assistance
is disabled or cannot calculate a target, delivery sends the nominal target once.
A skipped initial calculation clears prior assistance without restoring an older
block. Superseded work and service failures never trigger nominal-target fallback.
No additional delay is introduced. Listener-driven recalculations retain their
existing debounce and restoration behavior.

During that time, Velair listens to state changes from:

- the configured room temperature sensor;
- the managed climate entity.

Those listeners exist only while assistance is relevant. They are removed when the scheduler state, zone state, schedule block, sensor state, or feature state means assistance is no longer active.

When assistance refreshes during active Adaptive Preconditioning, an already-applied early target is authoritative until `target_when`. Otherwise the current schedule event is authoritative. Stored Room Assist runtime state is only a record of the last target sent; it must never select an older schedule block after a transition.

## Target Calculation

The calculation below describes **Default** braking with a zero minimum control
margin. A positive margin strengthens applicable corrections as described in
[Minimum control margin](#minimum-control-margin). Moderate retains its
switching thresholds and strengthens the non-driving scheduled guard. High
changes the driving-to-non-driving switch to the central target, as described
in [Optional braking policy](#optional-braking-policy).

Fixed scalar `heat` and `cool` with a non-zero deadband use stateful
hysteresis. First derive the two room limits:

```text
deadband_low = target_temperature - room_sensor_assist_deadband
deadband_high = target_temperature + room_sensor_assist_deadband

if the retained phase is towards_lower and room_temperature <= deadband_low:
    phase = towards_upper
else if the retained phase is towards_upper and room_temperature >= deadband_high:
    phase = towards_lower
else if a retained phase exists:
    phase = retained phase
else if room_temperature <= deadband_low:
    phase = towards_upper
else if room_temperature >= deadband_high:
    phase = towards_lower
else:
    phase = towards_lower for heat, towards_upper for cool

hysteresis_target = deadband_low when phase is towards_lower else deadband_high
room_error = hysteresis_target - room_temperature
correction = clamp(room_error, -room_sensor_assist_max_delta, room_sensor_assist_max_delta)
applied_target = climate_current_temperature + correction
```

The phase is retained while the room travels through the band, including when
it crosses the central scheduled target. It reverses only at the active edge.
Initialization inside the band deliberately chooses the non-driving journey:
fixed heat moves towards the lower edge and fixed cool towards the upper edge.
If initialization occurs outside the band, the next phase points back across
the band from the edge already reached.

The configured Maximum assist delta caps error relative to the active edge,
not relative to the central scheduled target. Target-step alignment and
physical target limits run after this calculation.

Fixed scalar modes with a zero deadband, scalar `auto` and scalar `heat_cool`
retain the legacy signed calculation:

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

A positive correction raises the climate target; a negative correction lowers
it. In the legacy and automatic paths, crossing the scheduled target reverses
the sign outside the neutral deadband. Saving changed deadband or braking
settings refreshes active assistance after a successful save. A braking-level
change invalidates the previous phase. For Moderate and High, a deadband change
also invalidates it so obsolete switching rules are not reused. Default keeps
its established deadband-edit behavior: a matching fixed-mode cycle retains its
phase, uses the new limits and reverses when the room has reached the newly
active edge. A failed save leaves the previous committed configuration and
control state authoritative.

For explicit `heat` and `cool`, the HVAC direction remains fixed: hysteresis
changes the temporary target but never asks fixed heat to cool or fixed cool to
heat. For scalar targets in a compatible `auto` or scalar `heat_cool` mode,
direction continues to resolve from the external room error and may change
after crossing. Inside the deadband, a scalar automatic target is aligned to
the nearest supported step and does not use a fixed-direction scheduled guard,
because automatic modes have no universal non-driving side. Range-only
`heat_cool` entities never receive a scalar target; they follow the native
range path.

The scheduled target is also a directional safety boundary during the
non-driving fixed-mode phase: `towards_lower` for heat and `towards_upper` for
cool. In the legacy zero-deadband path, the external-room error selects the
same non-driving condition. A cooling target cannot fall below the schedule
and a heating target cannot rise above it. A correction already farther into
the safe side is preserved. This breaks the feedback loop created by climate
sensors whose reading moves because the compressor, fan, valve, or radiator is
running.

For the legacy zero-deadband calculation, with a cooling target of `22 °C`, an external reading of `21 °C`, and a
climate reading of `19 °C`, the signed candidate is `20 °C`; the cooling
floor changes the applied target to `22 °C`. With the same external reading
and a climate reading of `25 °C`, the signed candidate is `26 °C`; it is
already non-driving and remains unchanged. Heating uses the exact inverse
ceiling rule.

The hysteresis phase and scheduled boundary are target-control invariants, not
HVAC-state guarantees. A heating entity can receive a deliberately
non-driving target while travelling towards the lower edge and still run
because its firmware uses a wide hysteresis or minimum run time. Velair does
not inspect `hvac_action` to advance the phase or infer an undocumented
device-specific stop margin. An explicit `Off` block is the authoritative way
to require shutdown.

The scalar result keeps `requested_temperature` as the target after scheduled
protection but before physical thermostat limits. `calculated_temperature` is
the step-aligned candidate before scheduled protection.
`scheduled_target_guard` is `cooling_floor`, `heating_ceiling`, or `null`.
These fields are runtime-only, optional in public payloads, and require no
storage migration. The frontend treats their absence as an older compatible
payload.

When scalar step alignment changes the committed setpoint, runtime state also
adds `pre_step_temperature` and `target_temp_step`. The first is the candidate
after scheduled-target protection and physical min/max clamping, immediately
before step alignment; it deliberately does not reuse
`calculated_temperature`. The pair is omitted unless a valid effective step
actually changes that candidate and the committed target is the aligned
result. A final physical-limit clamp is therefore never attributed to the
step. If a refresh skips its service call because the committed target moved by
less than one step, metadata comes from the new calculation while the unchanged
applied target remains authoritative only when both targets are equal. If the
new aligned target differs, the pair is cleared because neither the previous
nor the new calculation would explain the retained target. This avoids a
hybrid payload after a target-step capability change. These fields are exposed by live status and its
Diagnostics snapshot only; they are not persisted or added to automation
events or Home Assistant sensor attributes.

Velair keeps the runtime state and listeners active while the scheduled block remains active, including the fixed-mode phase needed to reach the opposite edge.

Runtime Room Assist state is never authoritative for choosing the active schedule block. After any active Adaptive Preconditioning target is resolved, Velair uses the current schedule event. This prevents a delayed sensor or climate callback from restoring a target calculated for an earlier block.

The applied target is bounded by the climate entity's min/max target temperatures and aligned to the effective published, last-reported, manual, or default target step. With a zero minimum control margin, for heating Velair rounds the assisted target down to the nearest supported step; for cooling, it rounds up. The rule follows the active HVAC direction on both sides of the scheduled target. During an inverse correction this can increase the final offset by less than one device step, while keeping the target on the conservative side for that mode. A positive minimum margin uses the step/cap selection described below.

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
uses its persisted last-reported step, followed by the manual per-zone fallback.
Missing fallback data resolves to `1` in the active temperature unit; Settings
exposes the effective fallback so the user can match the physical device.

### Minimum control margin

Apply the margin to the existing proportional correction before scheduled guards,
physical limits and any preparation offset. A zero margin takes the unchanged
legacy path, including its rounding behavior.

For a positive margin M and maximum D, resolve a signed request as follows:

- In fixed scalar hysteresis, use positive sign for `towards_upper` and negative
  sign for `towards_lower`; request at least M and at most D in that direction.
- Without a phase, strengthen only a non-zero correction. Scalar automatic
  holding remains neutral even if the retained state has a heat/cool direction.
- Native `heat_cool` ranges strengthen only the currently active boundary.
  Holding keeps its existing stable band. Configured fixed-mode references
  reuse scalar behavior and shift the complete pair without changing its width.
- During preparation, the preparation objective and direction take priority
  over a retained phase. Add the existing temporary offset after this base result.

For an active margin, choose a point on the effective device grid that reaches
the requested correction without exceeding D when one exists. If the grid and
cap cannot both satisfy the request, use the nearest valid correction within
the cap when possible. Physical limits and complete-pair width can further
reduce the result. Preserve stronger scheduled guards and braking; these and
preparation offsets can exceed D in the final delivered setpoint.

The additive `minimum_margin` metadata contains `configured` (a runtime-unit
delta), `active` (applicable to this calculation, not proof of physical demand),
and `limited_by` (`step`, `minimum`, `maximum`, `range_width`, or `null`). Carry
this detached metadata through committed state, calculation evidence and update
events. Preserve existing meanings of `assist_delta`, `applied_offset`, and
`range_shift`. Do not infer Supply demand from the sign of the final offset.

Changing only the margin recalculates after a successful save while retaining
a valid hysteresis phase. Failed saves or failed/superseded deliveries do not
commit a new demand state. Presentation reads cannot advance the phase.

Storage and export convert the margin as a delta, never an absolute temperature.
Portable model 29 includes it; older files default to zero. Preserve it through
unrelated Adaptive Preconditioning resets and group snapshot round trips.

### Optional braking policy

Resolve one pure policy from the saved level, effective mode, target, positive
deadband, effective target step and committed phase. Use it in scalar control,
fixed-mode range adaptation, runtime presentation and Supply threshold reporting.
Do not duplicate switching comparisons in the frontend.

With target **T**, deadband **H** and step **S**:

| Level | Heat stop / resume | Cool stop / resume | Non-driving setpoint guard |
| --- | --- | --- | --- |
| Default | Existing T + H / T − H | Existing T − H / T + H | Existing scheduled guard |
| Moderate | T + H / T − H | T − H / T + H | Heat ceiling T − S; cool floor T + S |
| High | T / T − H | T / T + H | Heat ceiling T − 2S; cool floor T + 2S |

Equality completes a phase. High changes only the stop threshold, not the
driving error target: heat still calculates assistance towards the original
upper nominal edge and cool towards the original lower nominal edge until
withdrawal begins. In the non-driving phase, retain the opposite nominal edge
as the correction target and strengthen the scheduled guard. Preserve a
candidate already farther into the non-driving side. The guard is a fixed
total bound, never a repeated increment or decrement.

Initialize within the band on the non-driving side as before. Reuse a phase
only while its intent, source, mode, target and braking level still match;
Moderate and High additionally require an unchanged deadband. Default preserves
its existing phase reuse for deadband-only edits as described above. No braking
state is persisted. There are no new periodic tasks, timers,
historical queries or runtime configuration writes; the existing grouped refresh
and authoritative delivery path applies the result, including suppression of
target changes smaller than one effective step.

For fixed-mode ranges with a configured reference, pass this policy through
the shared scalar calculation and translate the complete pair by its result.
Preserve range width and clamp the shift against both physical boundaries.
Default, scalar automatic modes and native bidirectional ranges retain their
existing behavior. Invalid stored zero-band/non-default combinations keep the
saved level, expose an inactivity reason and use the legacy zero-band path.

Physical clamping can prevent a one-step or two-step guard from being reached;
the existing requested/applied limit metadata must report that outcome. Braking
does not inspect `hvac_action`, guarantee a physical stop, anticipate residual
temperature rise before the target, learn cycles, or add a recovery controller.

Portable model 27 carries `room_sensor_assist_braking_level`; older imports
default it when absent. The Home Assistant storage helper version is unchanged.
Older portable-model consumers reject model 27 rather than silently losing the
saved policy.

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

Velair ignores target movements smaller than the effective published or
configured target step.

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

The hysteresis phase is runtime-only and is never stored. It resets when the
active block, scheduled target, or HVAC mode changes; when Room Assist is
cleared for any reason above; and when the integration or Home Assistant
reloads. The next eligible refresh initializes a safe phase from the fixed
mode and current room reading. Resuming Automatic control after a Manual
adjustment therefore resolves current intent and starts a fresh phase rather
than reviving the previous one.

## Automation Events

Velair emits the standard `velair_event` Home Assistant event.

Room Assist emits:

- `room_sensor_assist_state_changed` when enablement changes;
- `room_sensor_assist_updated`: Velair applied a temporary assisted climate target.
- `room_sensor_assist_restored`: Velair stopped managing the temporary assisted target and restored the normal scheduled target where possible.

The event payload includes the climate entity, room sensor entity, scheduled target, applied target, measured temperatures, the absolute logical correction (`assist_delta`), direction, HVAC mode, and reason. Scalar events use `target_temperature`, `applied_temperature`, and signed `applied_offset`. A fixed scalar hysteresis event update can additionally include `hysteresis_phase`, `hysteresis_target`, `deadband_low`, and `deadband_high`. When scheduled protection changes a scalar result, the update also includes `scheduled_target_guard` and `calculated_temperature`; older consumers can ignore these additive fields. Range events use the complete scheduled and applied boundary pairs plus signed `range_shift`; they omit hysteresis fields even when a configured fixed-mode reference exposes those fields in live runtime status. Updated events also carry the additive `braking` policy metadata described above, including for fixed-mode ranges. Restoration events return the scheduled target form and report correction or shift as zero; they do not require braking metadata. All hysteresis fields are optional so older consumers and non-hysteresis paths remain compatible.

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
    room_sensor_assist_braking_level: "moderate",
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
