# External Changes and Manual Adjustment

Velair can recognize when the HVAC mode or target temperature of a managed
`climate.*` entity changes without matching a climate command sent by Velair.
For each climate, you choose whether Velair keeps automatic authority or yields
to that external adjustment through Manual adjustment.

An external adjustment can come from:

- the standard Home Assistant climate card;
- a physical thermostat or IR remote whose integration reports the new state;
- a manufacturer application whose integration updates Home Assistant;
- a Home Assistant script or automation that calls the climate entity directly;
- any other source that changes the entity without going through Velair.

Velair calls the yielded state **Manual adjustment**. The word "manual" describes
who currently controls one climate; it does not assert that a person made the
change.

## The Two Independent Questions

Velair always keeps these concepts separate:

| Concept | Scope | Meaning |
| --- | --- | --- |
| Automatic scheduling | One managed climate | Velair may deliver the effective schedule for this climate. |
| Manual adjustment | One managed climate | An external setpoint or HVAC mode is temporarily authoritative. |
| Velair Mode **Manual** | The complete active Profile set | Profiles were selected directly instead of through a stored custom Mode. |
| Boost | One climate | Velair intentionally applies a temporary target. |
| Zone Pause | One climate | One or more independent reasons prevent schedule delivery, optionally turning the climate off. |
| Global Pause or Stop | All climates | The scheduler is paused or disabled globally. |

These states can coexist. For example, Velair Mode **Manual** can select the
`Sleep` Profile while `climate.living_room` is in **Manual adjustment**. The
Profile remains authoritative scheduling configuration, but that one climate
keeps its external setting until Manual adjustment ends.

## What Velair Observes

Velair observes these control fields on managed climates:

- `hvac_mode`, represented by the climate entity state, including `off`, `heat`,
  `cool`, and `heat_cool`;
- `temperature` for a scalar target;
- `target_temp_low` and `target_temp_high` for a native range target.

Velair does not enter Manual adjustment because only the following values
changed:

- `current_temperature` or `hvac_action`;
- humidity readings;
- availability;
- fan, preset, swing, or target-humidity options;
- capability attributes such as minimum temperature or supported modes.

For example, changing a thermostat from `cool` at `24 °C` to `cool` at `23 °C`
is a detected target change. A room warming from `24 °C` to `25 °C` while the
target remains unchanged is not.

Only climates selected in the Velair integration setup are monitored. Initial
states at startup and transitions to or from `unknown` or `unavailable` are
ignored.

## How Velair Recognizes Its Own Commands

All climate commands sent by Velair pass through one internal climate service
adapter. Before each Home Assistant service call, Velair records:

- the managed entity;
- the control fields and values it expects to observe;
- a Home Assistant `Context` for the service call;
- a short runtime-only expiry.

When the entity changes, Velair correlates each changed field with those
expectations, including the climate's published `target_temp_step`. This is done
per field: if one update contains a Velair-owned temperature and an unrelated
HVAC mode, only the temperature is classified as Velair-owned.

The expectation ledger is bounded, expires automatically, is never persisted,
and does not poll. A source does not have to preserve Home Assistant `Context`
for correlation to work, although a preserved context makes candidate matching
more precise.

Any observed control field that cannot be correlated with a Velair command is
classified as non-Velair. This is attribution, not identity: Velair does not
claim to know whether a person, remote, automation, vendor service, or device
firmware caused it.

## Choose a Policy

Open **Settings**, find the managed climate, and use **External adjustments**.
The policy is stored by the backend for that climate and is included in Velair
portable zone data. It applies from the next external change; changing it
does not alter or end a Manual adjustment that is already active.

### Keep automatic

Internal value: `keep_automatic`.

This is the default, including for configurations created before External
adjustments existed. Velair reports the external change, keeps the climate in
Automatic scheduling, and immediately re-resolves the current authoritative
intent. When an intent owns the climate, Velair reapplies it through the normal
serialized delivery path. This may be a Default or Profile schedule, a Boost,
an active preconditioning target, a Room Assist target, `off`, or a scalar or
native range target.

Existing pauses and scheduler gates are not bypassed. A pause with action
`none`, a global pause, a disabled zone, a stopped scheduler, or the absence of
a current target sends nothing. A zone or Profile pause with action `turn_off`
reasserts `off`.

### Manual until the next schedule block

Internal value: `until_next_block`.

Velair preserves the external state until the next effective schedule block for
that climate begins, then returns to Automatic scheduling and applies the
authoritative intent valid at that time.

The boundary is calculated when Manual adjustment begins. Another external
adjustment during the same Manual adjustment updates the preserved climate state
but does not move that boundary. If there is no future effective block, there is
no automatic expiry; use **Resume automatic scheduling** when desired.

### Manual for a duration

Internal value: `for_duration`.

Velair preserves the external state for the configured number of minutes. The
initial duration is 120 minutes and the allowed range is 1 to 10,080 minutes
(seven days). Existing saved values, including 60 minutes, are preserved. Each
newly detected external control change restarts the duration from that change
using the active session's saved duration, even if Settings changed in the meantime.
The accompanying external-change event reports that effective session policy,
not the newer Settings default.

### Manual until resumed

Internal value: `until_resumed`.

Velair preserves the external state indefinitely. The user or an automation
must explicitly resume Automatic scheduling.

## What Happens When Manual Adjustment Starts

For every eligible external adjustment using one of the three Manual policies,
Velair performs one serialized transition:

1. It captures the complete HVAC mode and scalar target or native range from
   the state-change event.
2. It persists a reserved Manual adjustment reason for the zone.
3. It ends any active Boost without restoring the Boost or previous schedule.
4. It makes Room Assist yield without restoring its previous scheduled
   correction.
5. It preserves, or if necessary reapplies, the captured external state.
6. Overview selects **Manual adjustment** and keeps **Automatic scheduling** available.

The policy enters Manual adjustment only while global Automatic scheduling is
running, the zone is enabled, the active Profile is not already pausing the
zone, and no independent non-Boost zone pause is already active. The
observational `external_climate_change_detected` event is still emitted when
these gates prevent entry. An active Boost is the exception: the external
change replaces it as described below.

The following matrix states the exact result when a non-Velair control change
is observed under a policy that would otherwise enter Manual adjustment:

| State before the external change | Event | Enter Manual adjustment | Immediate climate action |
| --- | --- | --- | --- |
| No pause or Boost | Emitted | Yes | Preserve the complete external mode and target. |
| Independent zone pause, action `none` | Emitted | No | Send nothing; the existing pause continues yielding control. |
| Independent zone pause, action `turn_off` | Emitted | No | Reassert `off`; the external turn-on cannot bypass the pause. |
| Independent zone hold, action `hold` | Emitted | Yes, per policy | Manual adjustment freezes the climate above the hold; resuming automatic control delivers the hold again. With `Keep automatic`, the composed hold target is reasserted. |
| Active Profile Pause, including Profile `turn_off` | Emitted | No | Send nothing in this detection path; do not replay the Profile action solely because of the observation. |

A globally paused scheduler or disabled zone follows the same observational
pattern: emit the external-change event, do not create Manual adjustment, and
do not send a new schedule target from this detection path.

While Manual adjustment is active, Velair continues to calculate the effective
Default, Profile, or Mode schedule, but does not deliver it to that climate.
Other managed climates continue normally.

Velair does not automatically:

- create a Boost;
- switch Profile or Velair Mode;
- infer who made the adjustment;
- copy the adjustment into a schedule;
- change the policy of another climate;
- remove independent zone pauses;
- wait for the room to reach the requested temperature.

## What Happens When Automatic Scheduling Resumes

Manual adjustment can end because its duration expires, its next-block boundary
arrives, the Overview button is pressed, or
`velair.resume_automatic_control` is called.

Velair removes only its reserved Manual adjustment reason. It then resolves the
authoritative intent at that moment:

- a Profile schedule when an active Profile owns the zone;
- the Default schedule when no active Profile owns it, or the Profile delegates
  the zone to Default;
- a Profile pause, including its `turn_off` action;
- any other independent pause or global scheduler state.

Velair does not restore the block that was active when Manual adjustment began.
This distinction matters when a Profile, Mode, schedule, pause, or clock time
changed while the climate was yielded.

If an independent zone pause still exists, the zone remains paused. If its
effective action is `turn_off`, off remains authoritative. Resuming Manual
adjustment is therefore not the same operation as resuming every zone-pause
reason.

### Resume from `off` when the block says Keep current mode

**Keep current mode** means the block does not provide an HVAC mode. On resume,
Velair follows the normal climate delivery rule:

- if the climate is already on, preserve its current compatible mode;
- if the climate is `off`, choose the first compatible supported mode advertised
  by the climate that is not `off`, then apply the block target.

For a heat-only climate advertising `[off, heat]`, an active Keep-mode block at
`21 °C` resumes as `heat`, `21 °C`. For a cool-only climate advertising
`[off, cool]`, it resumes as `cool`, `21 °C`. A reversible climate can advertise
several compatible modes; Velair uses their advertised order and does not infer
heating or cooling from season, geography, or the numeric target. Set an
explicit HVAC mode in the block when that choice must be deterministic.

## Complete Real-World Examples

### Keep automatic: reject a climate-card setpoint change

Configuration:

```text
Living-room policy: Keep automatic
Current authoritative block: heat at 21 °C
```

| Time | Action | Result |
| --- | --- | --- |
| 18:00 | Velair applies `heat`, `21 °C`. | Automatic scheduling |
| 18:20 | A user selects `23 °C` in the Home Assistant climate card. | Velair emits `external_climate_change_detected` with `policy: keep_automatic`. |
| 18:20 | Velair resolves the still-current block. | `heat`, `21 °C` is reapplied; no Manual adjustment or `zone_control_changed` event is created. |

The same rule applies to cooling, `off`, native `heat_cool` ranges, Boost,
preconditioning, and Room Assist: Velair reapplies whichever of those intents
is authoritative at the moment of detection.

The examples use Celsius, but the behavior is identical in Fahrenheit.

### Home Assistant card: keep the change until bedtime

Configuration:

```text
Living room policy: Manual until the next schedule block
18:00 schedule block: cool at 24 °C
22:00 schedule block: cool at 25 °C
```

Timeline:

| Time | Action | Climate result | Velair control |
| --- | --- | --- | --- |
| 18:00 | Velair applies the block. | `cool`, `24 °C` | Automatic scheduling |
| 19:15 | A user selects `22 °C` on the HA climate card. | `cool`, `22 °C` | Manual adjustment until 22:00 |
| 20:00 | Room Assist receives a new room reading. | Still `22 °C`; no assisted correction is sent. | Manual adjustment |
| 22:00 | The next effective block begins. | Velair applies `cool`, `25 °C`. | Automatic scheduling |

The `22 °C` value is respected as a temporary instruction. It is not written
into either schedule block.

### IR remote: turn on an AC that the schedule had turned off

Configuration:

```text
Bedroom policy: Manual until resumed
Current authoritative block: Off
```

Timeline:

| Time | Action | Climate result | Velair control |
| --- | --- | --- | --- |
| 13:00 | Velair's block has the unit off. | `off` | Automatic scheduling |
| 14:10 | A household member uses the IR remote: `cool`, `23 °C`. | The device integration reports `cool`, `23 °C`. | Manual adjustment |
| 16:00 | The scheduled plan is still Off. | The unit remains `cool`, `23 °C`. | Manual adjustment |
| 17:30 | The user presses **Resume automatic scheduling**. | Velair resolves the still-current Off block and turns the unit off. | Automatic scheduling |

This only works when the climate integration reports the remote's change to
Home Assistant. An IR command invisible to Home Assistant cannot be detected.

### A 60-minute comfort adjustment, changed again

Configuration: `for_duration`, 60 minutes.

| Time | Action | Result |
| --- | --- | --- |
| 09:00 | Schedule applies `heat`, `20 °C`. | Automatic scheduling |
| 09:20 | User selects `22 °C`. | Manual adjustment expires at 10:20. |
| 09:50 | User selects `21 °C`. | The climate stays at `21 °C`; expiry restarts at 10:50. |
| 10:50 | No further external change occurred. | Velair applies the authoritative intent valid at 10:50. |

### Repeated change with next-block policy

Configuration: `until_next_block`; next block at 22:00.

| Time | Action | Result |
| --- | --- | --- |
| 19:15 | User changes `24 °C` to `22 °C`. | Manual adjustment ends at 22:00. |
| 20:30 | User changes `22 °C` to `23 °C`. | The preserved value becomes `23 °C`; expiry remains 22:00. |
| 22:00 | Next block begins. | Velair returns to Automatic and applies that block. |

### Activate a Profile while one climate is manual

Configuration:

```text
Default living-room intent: cool at 24 °C
Sleep Profile living-room intent: cool at 25 °C
Manual policy: until resumed
```

| Time | Action | Living room | Other Profile zones |
| --- | --- | --- | --- |
| 20:00 | User changes living room to `22 °C`. | Manual adjustment at `22 °C` | Continue normally |
| 21:00 | User activates `Sleep`. | Remains `22 °C`; `Sleep` becomes authoritative configuration. | `Sleep` applies immediately where not otherwise overridden. |
| 21:30 | User resumes the living room. | Velair applies `Sleep`: `cool`, `25 °C`. | Unchanged |

Selecting a custom Velair Mode behaves the same way: it can change the active
Profile set, but it does not cancel a zone's Manual adjustment. If Profiles are
selected directly, Velair Mode may display **Manual** at the same time that the
zone displays **Manual adjustment**; the labels describe different things.

### Activate several Profiles or Modes while manual

Suppose the external state is `heat`, `22 °C`. While it remains manual, the user
selects Home (`21 °C`), Away (`17 °C`), then Sleep (`18 °C`). Velair preserves
`22 °C` throughout. On resume it applies only the current Sleep intent of
`18 °C`; it does not replay Home or Away and does not restore the old Default
target.

### Profile pause and `turn_off`

If a Profile that pauses the zone is activated while Manual adjustment is
already active, the external state remains in place until Manual adjustment
ends. On resume:

- Profile Pause with no turn-off sends no new target; the zone returns to
  Automatic control but remains governed by the Profile pause;
- Profile Pause with `turn_off` turns the climate off.

If the Profile pause was already active before the external change, Velair
still emits `external_climate_change_detected`, but does not enter Manual
adjustment. That detection path does not immediately replay the Profile pause
or its `turn_off` call; it only reports the observation. A later Profile change,
explicit schedule application, or other scheduler transition resolves the
Profile behavior again.

### External adjustment during a Boost

| Time | Action | Result |
| --- | --- | --- |
| 12:00 | Velair starts a Boost at `cool`, `20 °C` until 13:00. | Boost |
| 12:20 | User changes the climate to `cool`, `23 °C`. | Boost ends with no restoration; Manual adjustment preserves `23 °C`. |
| 12:45 | User resumes Automatic scheduling. | Velair resolves and applies the schedule valid at 12:45. |

The old Boost does not resume and its original 13:00 expiry no longer controls
the climate.

### Room Assist without a control fight

Assume the scheduled cooling target is `24 °C`, Room Assist temporarily applied
`26 °C`, and the user selects `23 °C` externally.

Velair captures the event state before queued Room Assist work can replace it,
stops Room Assist for the yielded zone without restoring `24 °C`, and preserves
`23 °C`. When Automatic scheduling resumes, Velair resolves the current schedule
and Room Assist may calculate a new assisted target from current readings.

### Native `heat_cool` range

```text
Scheduled range: 20–25 °C
External range: 19–24 °C
Policy: until resumed
```

Velair detects `target_temp_low` and `target_temp_high`, captures the complete
`heat_cool` state, and preserves `19–24 °C` during Manual adjustment. On resume
it applies the complete range from the current authoritative block. It never
collapses the range into a scalar target.

### Independent window pause while manual

Suppose a climate is manual at `23 °C`, then a window automation calls
`velair.pause_zone` with `pause_id: window` and `action: turn_off`. The combined
pause action is off, so the climate turns off. Calling
`velair.resume_automatic_control` removes only Manual adjustment; the `window`
reason remains and the climate stays off. The window automation must remove its
own reason with `velair.resume_zone`.

### Hold a zone at a temperature

`velair.pause_zone` with `action: hold` keeps delivering a temperature target
instead of freezing the climate. It is the building block for automations that
own a temporary setback or comfort target without editing the schedule:

```yaml
action: velair.pause_zone
data:
  entity_id: climate.guest_room
  action: hold
  pause_id: vacancy
  temperature: 26
  constraint: raise_only
  hvac_mode: cool
  fan_mode: auto
  label: vacant 30 min
```

- A hold starts from the block the Default schedule or active Profile would
  apply now. `constraint: absolute` replaces that target, `raise_only` keeps
  the warmer of the two values and `lower_only` keeps the cooler one.
- Several holds with different `pause_id`s fold in start order, each applying
  its own constraint to the running result. Reusing a `pause_id` updates that
  hold in place and keeps its original start time. Omit `duration_minutes`
  for an indefinite hold; `velair.resume_zone` with the same `pause_id`
  releases only that hold and immediately delivers the remaining holds or the
  schedule.
- Holds never win against a freeze. A plain pause (`action: none`), including
  Manual adjustment, keeps the climate where it is until it is removed;
  `turn_off` still beats everything. The zone override sensor reports `hold`
  with the composed `effective_temperature`, the latest hold's `constraint`
  and `label`, and every active hold.
- Boost is not available while any pause reason, including a hold, is active.
  Use a hold with `constraint: absolute` and `duration_minutes` for a
  temporary override on top of other holds.
- Room Assist is suspended while a hold is active. Hold temperatures are
  snapped to the climate entity's step and limits when the hold is created.

## Changing the Policy with a Service

All examples below use Home Assistant's current action syntax.

Keep Velair automatic and reapply its current authority:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: keep_automatic
```

Keep the external state until the next block:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: until_next_block
```

Keep it for 90 minutes:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: for_duration
  duration_minutes: 90
```

Keep it until explicitly resumed:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: until_resumed
```

`duration_minutes` is used by `for_duration`; it is retained as the zone's
duration setting when another policy is selected. Services reject unmanaged
climate entities, unknown policy values, and durations outside 1–10,080.

Changing this setting while the climate is already manual affects only the next
external adjustment after that session. The active session retains its policy, duration, source, and
expiry. Use Overview or `velair.resume_automatic_control` to end it.

## Enter Manual Adjustment Explicitly

Overview always shows **Velair control** as either **Automatic scheduling** or
**Manual adjustment** for each managed climate. Both choices remain visible in
a segmented control. Select **Manual adjustment** to capture the live HVAC mode
and complete scalar or range target. It normally uses the Manual policy and
duration saved under **Settings > External adjustments**. When **Keep
automatic** is saved, this explicit action uses **Manual until resumed** without
changing the saved external-change policy. Select **Automatic scheduling** to
resume the current authoritative Velair intent. Selecting the already active
choice is a no-op.

When Manual adjustment is active, Overview shows its exact exit policy and
expiry below the selector and projects the held physical scalar target or native
range rather than the latent schedule target. When Manual cannot start, its
segment remains visible with an accessible explanation of whether the climate is unavailable or disabled,
Automatic scheduling is stopped, an active Profile pauses the zone, or another
zone pause owns control. It is also disabled while a temperature-data migration
is unresolved, because Velair keeps Manual-control configuration and sessions
immutable until the migration finishes. A Boost does not block the action
because the hold replaces it.

The equivalent action also uses the saved policy and accepts only `entity_id`:

```yaml
action: velair.enter_manual_adjustment
data:
  entity_id: climate.living_room
```

To create a 90-minute hold, first save `for_duration` and `duration_minutes: 90`
with `velair.set_external_change_policy`, then call this action. The explicit
action rejects unmanaged, disabled, `unknown`, or `unavailable` climates,
and climates blocked by a global stop, active Profile Pause, or independent
zone pause. An active Boost is replaced. Heating, cooling, `off`, scalar
targets, and native `heat_cool` ranges are captured through the same serialized
delivery path.

## Resume with a Service

```yaml
action: velair.resume_automatic_control
data:
  entity_id: climate.living_room
```

This action is idempotent: calling it for an already automatic managed climate
does nothing. It rejects unmanaged climate entities.

Do not use the reserved internal pause ID `velair.manual_adjustment` with
`velair.pause_zone` or `velair.resume_zone`. Velair rejects it so that one
authoritative mechanism owns Manual adjustment. A generic
`velair.resume_zone` does not clear Manual adjustment.

## Automations and Events

All Velair runtime events use `event_type: velair_event`.

### Observe every external control change

This event is emitted whenever at least one observed mode or target field cannot
be attributed to Velair:

```yaml
event_type: velair_event
event_data:
  domain: velair
  event: external_climate_change_detected
  entity_id: climate.living_room
  changed_fields:
    - hvac_mode
    - temperature
  previous:
    hvac_mode: "off"
    temperature: 24
  current:
    hvac_mode: "cool"
    temperature: 23
  policy: keep_automatic
```

For a native range, `changed_fields`, `previous`, and `current` use
`target_temp_low` and `target_temp_high` instead of `temperature` as applicable.
Only external fields appear; a field correlated with a Velair action is omitted
even if it arrived in the same Home Assistant state update.

Example notification automation:

```yaml
alias: Notify when the living-room climate changes outside Velair
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: external_climate_change_detected
      entity_id: climate.living_room
actions:
  - action: notify.notify
    data:
      message: >-
        Living-room climate changed outside Velair:
        {{ trigger.event.data.changed_fields | join(', ') }}.
```

### Observe entry into or exit from Manual adjustment

Entry payload:

```yaml
event_type: velair_event
event_data:
  domain: velair
  event: zone_control_changed
  entity_id: climate.living_room
  control_mode: manual
  previous_control_mode: automatic
  policy: for_duration
  started_at: "2026-08-20T18:00:00+02:00"
  until: "2026-08-20T19:00:00+02:00"
```

For `until_resumed`, `until` is absent. Exit payload:

```yaml
event_type: velair_event
event_data:
  domain: velair
  event: zone_control_changed
  entity_id: climate.living_room
  control_mode: automatic
  previous_control_mode: manual
  reason: resumed
```

An automatic expiry uses `reason: expired`. The event means the Manual
adjustment reason changed; another pause can still prevent physical schedule
delivery.

For the complete event contract, see [Automation Events](automation-events.md).

## Restart and Availability Behavior

The per-zone policy and an active Manual adjustment reason are persisted. After
a Home Assistant restart:

- an unexpired or indefinite Manual adjustment remains manual;
- enabling **Apply active schedule after startup** does not bypass the active
  Manual adjustment;
- when its persisted expiry is reached, Velair removes it and resolves the
  current authoritative intent;
- portable export includes the policy but deliberately excludes live Manual
  adjustment runtime state.

The captured external mode/target snapshot is runtime-only and is not persisted
or replayed after restart. Normally the physical climate device retains and
reports its own manual state, while Velair's persisted Manual adjustment reason
continues to suppress schedule delivery. If the device resets or reports a
different target during restart, Velair does not reconstruct the old external
snapshot; it waits for Manual adjustment to expire or be resumed, then resolves
current authoritative intent.

Velair ignores state transitions to or from `unknown` and `unavailable`. If a
remote change occurs while the integration cannot report the climate and the
only later update is an `unavailable` to available transition, Velair does not
classify that recovery as a new external adjustment. Once the climate is
available, later mode or target changes can be detected normally.

## Attribution Limits

Attribution is deliberately best effort because Home Assistant climate
integrations and physical devices report state differently.

- A physical or vendor-side action that never reaches Home Assistant cannot be
  detected.
- Some devices publish mode and target in several state updates; this can emit
  more than one observational event. Automations should be idempotent.
- A non-Velair action that reports exactly the value of a still-valid expected
  Velair field can be correlated as Velair-owned.
- A device that never echoes an accepted Velair target can leave that
  expectation alive until its short expiry.
- Availability recovery itself is ignored, as described above.
- Fan, preset, swing, humidity, and environmental-only changes are outside this
  feature's first contract.

The safe interpretation of `external_climate_change_detected` is therefore:
"Velair observed a control change that it could not attribute to one of its own
commands," not "Velair proved that this named person changed the thermostat."

## Troubleshooting Checklist

If an expected Manual adjustment does not appear:

1. Confirm the climate is managed by Velair.
2. Confirm Automatic scheduling is globally active and the zone is enabled.
3. Confirm the active Profile does not already pause the zone.
4. Confirm the external source changes `hvac_mode`, `temperature`, or a native
   range in Home Assistant, not only a vendor display or fan/preset option.
5. Confirm the entity was not `unknown` or `unavailable` during the transition.
6. Listen for `velair_event` and filter
   `event: external_climate_change_detected`.
7. Review Velair Diagnostics and Home Assistant logs for a failed state
   preservation or climate service call.

If the zone resumes but does not apply the temperature you expected, inspect
the current Profile/Mode, Default schedule, independent pause reasons, global
scheduler state, and whether the current block is Off or Keep. Resume always
uses current authoritative intent, never a historical snapshot of the old
schedule.
