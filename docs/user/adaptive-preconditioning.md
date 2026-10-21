# Adaptive Preconditioning
<!-- velair-docs:start -->
Translations: [English original](adaptive-preconditioning.md) · [Español](adaptive-preconditioning.es.md) · [Français](adaptive-preconditioning.fr.md) · [Deutsch](adaptive-preconditioning.de.md) · [Italiano](adaptive-preconditioning.it.md) · [Nederlands](adaptive-preconditioning.nl.md) · [Polski](adaptive-preconditioning.pl.md) · [Português (Brasil)](adaptive-preconditioning.pt-br.md) · [Português (Portugal)](adaptive-preconditioning.pt-pt.md) · [Русский](adaptive-preconditioning.ru.md) · [Translation status](../translation-status.md)

---
<!-- velair-docs:end -->

Adaptive Preconditioning lets Velair start heating or cooling before a scheduled block so the room is closer to the target temperature when the block begins.

A **Temperature only** block does not authorize an HVAC mode change. While its
climate is off, Velair does not start advance preparation or collect thermal
learning samples for that target. Turning it on externally allows preparation
to be recalculated using the actual compatible mode. This option cannot
promise comfort by the block time while the equipment remains off.

For example, a schedule block at `07:00` with `21 °C` means "be close to `21 °C` at `07:00`", not "start changing to `21 °C` at `07:00`".

Adaptive Preconditioning runs locally inside Home Assistant. Velair stores its
settings and learning samples in Home Assistant storage and never sends its
temperature history, observations, or calibration data to an external
controller. Zones delegated through External schedule execution do not use
Adaptive Preconditioning; only their effective weekly schedule is published.

## Setup

The Preconditioning tab contains per-climate adaptive settings and learning.
Planned return has its own tab for occupancy, weekly arrivals and the current
absence. Both tabs include an introduction and contextual help. Their direct
panel paths are `/velair/preconditioning` and `/velair/planned-return`.
Previously saved subsection links still open the corresponding tab.
See [Planned Return](planned-return.md).

1. Open the Preconditioning tab.
2. Expand the climate you want to configure.
3. Enable preconditioning.
4. Leave the default model settings unless you have a specific reason to tune them.
5. Optionally select an outdoor temperature sensor.

Preconditioning is configured per climate. Heat and cool learning are tracked separately, so cooling samples do not replace heating samples and heating samples do not replace cooling samples.

Native `heat_cool` ranges are supported. If the room is below the lower target
by more than Minimum temperature delta, Velair predicts from the lower boundary
and starts the complete range early for heating. If the room is above the upper
target by more than that delta, it predicts from the upper boundary and starts
the complete range early for cooling. Readings inside the range or its boundary
deadbands keep the normal scheduled time. Velair always sends both range limits;
it never collapses a range into one temperature.

When a climate is expanded, each supported mode shows a live prediction card. It uses the same backend next-event data as the Overview tab, so pauses, boosts, unsupported modes, and blocks that cannot be preconditioned are handled consistently. When a matching future block exists, the card shows the calculated start time, the target time, the lead time, the scheduled temperature and mode, and whether Velair is using the initial model or similar local history.

Planned Return preparation is identified separately from weekly schedule
anticipation. For an accepted future return, the climate's preparation information
shows its return state, estimated start, arrival target and any suspension or
availability reason. Overview, Planned Return and climate cards use the same
backend return information; it is not another weekly schedule event. A room may
still follow Away while showing a future return estimate. **Preparing** describes
Velair's control intent, not confirmation that a device received a command or is
physically heating or cooling. The return timeline shows elapsed time toward the
saved arrival, not a percentage of thermal progress. See
[Room Preparation](planned-return.md#room-preparation) for the state meanings.

If you want to verify a specific calculation, open **Calculation details** in the live prediction card. This optional section shows the backend values used for that prediction, including sample counts, the estimate from completed observations, the partial lower bound, the combined estimate, rounding, and the final lead. It is hidden by default so the normal view stays simple.

## Preconditioning Master

Leave **Preconditioning master** set to **Independent** for the existing behavior.
To make one climate's early preparation depend on another, select that managed
climate in the dependent room's settings. Select **Independent** again to unlink
them. This setting applies to the room's effective schedule, including Profiles,
zone exceptions and Planned Return. It does not replace its temperatures or blocks.

A master can serve several dependent rooms. A room cannot depend on itself, and
chains or cycles are not supported: a dependent cannot also be a master.

Velair selects the master's block whose target time is closest to the dependent
block's target time. A tie uses the earlier block. The target times need not be
equal. The dependent starts at the later of its own predicted start and that
master block's preparation start:

| Room's own start | Master's start | Room's target | Effective start |
| --- | --- | --- | --- |
| 17:40 | 17:55 | 18:45 | 17:55 |
| 18:10 | 17:55 | 18:45 | 18:10 |
| 17:40 | No early preparation | 18:45 | Normal block at 18:45 |
| 17:40 | 19:00 | 18:45 | Normal block at 18:45 |

If that selected master block cannot prepare early, Velair does not substitute
another block. A heating preparation cannot release a cooling preparation, or
vice versa. Existing pauses, overrides, availability checks and maximum lead
limits still apply. An unavailable or disabled master remains configured; it
does not silently turn the dependent into an independent room.

**Minimum start (min)** still excludes short independent predictions.
Waiting for the master, like a late command delivery, can leave a shorter actual
window. Learning uses that remaining window rather than inventing an earlier
start or moving the scheduled target.

The displayed start is a forecast. At execution, the master's corresponding
preparation command must be accepted before a dependent can begin. This is not
confirmation of a boiler relay, water flow or actual heating/cooling. Velair does
not raise the master's temperature to request heat on behalf of other rooms.
The normal scheduled block still runs at its own time.

Learning starts when the dependent actually begins its constrained preparation,
using its temperature then and the time remaining until its own block. Reaching
the target early, partial observations and invalid samples keep their existing
rules. The master's later completion does not stop preparation already underway
in the dependent. Linking or unlinking does not erase saved learning samples.

Open **Calculation details** for the independent estimate, selected master and
effective start. Diagnostics provides the dependency reason alongside the room's
existing preparation and learning evidence. Saved command-start references allow
runtime continuity across a restart; an interrupted learning observation is not
resumed, and these technical references are excluded from portable exports.

## Understanding Learning Activity

Each supported direction can show a short explanation beside its existing
learning information: Velair is observing a transition, waiting for a suitable
transition, or cannot observe for a known reason. This describes learning, not
confirmation that equipment is physically heating or cooling. A previous
transition is explicitly dated and is not presented as current activity.

Use the accompanying **Diagnostics** action to open that climate and its
Preconditioning history, without a date filter hiding earlier entries. The
existing function section shows current activity and the latest retained
learning transition. Expand its details to inspect the temperatures, configured
thresholds and durations available for that decision. See
[Learning evidence](diagnostics.md#learning-evidence).

An unchanged sample count does not establish a fault. A transition may not
provide a usable temperature difference, an observation may still be running,
or its result may be partial or invalid. Explanations use only evidence Velair
has recorded; they do not infer boiler operation or a shared heat supply.
Learning status and the prediction for the next block remain separate: a room
can have little learned history and still need no early start for a particular
target.

## How It Starts

Velair calculates the current temperature gap for the next scheduled temperature block.

For a `heat_cool` range, "target temperature" below means the lower boundary
while heating and the upper boundary while cooling.

For heating:

```text
delta = target temperature - current temperature
```

For cooling:

```text
delta = current temperature - target temperature
```

If the gap is smaller than Minimum temperature delta, Velair keeps the normal block time and does not start early.

## Schedule Boundaries And Other Climates

A weekly early start must not reach or cross the immediately preceding effective schedule block for the same climate, including an `Off` block. If the calculated window reaches or crosses that boundary, Velair keeps the normal comfort time. For example, with `Off` at `19:00` and `heat` at `20:00`, a calculated start at `18:00` is suppressed: `Off` applies at `19:00` and heating starts at `20:00`. An `Off` block at `22:00` the previous evening does not prevent a `05:35` start for `07:00` when there is no intervening block. This rule also applies to cooling and native `heat_cool` ranges; it does not change Planned Return arrival predictions.

A climate already preconditioning does not delay scheduled blocks or early starts for other climates. If processing an action crosses another transition, Velair resolves the currently authorized target for the affected climate instead of replaying obsolete orders. Pauses, boosts, Manual adjustment, disabled zones and External schedule execution still control whether a target can be delivered. This recovery applies while the scheduler is running; the configured startup application behavior is unchanged.

## Initial Model Example

When there is not enough local history, Velair uses the initial model:

```text
lead = Minimum start + Initial model min/degree * temperature delta
```

Scenario:

- Scheduled block: `21 °C`, `heat`, target time `07:00`
- Room temperature: `18 °C`
- Minimum start: `10 min`
- Initial model: `25 min/°C` or the equivalent `13.89 min/°F`
- Maximum start: `24 h`

Calculation:

```text
delta = 21 - 18 = 3 °C
lead = 10 + 25 * 3 = 85 min
start = 07:00 - 85 min = 05:35
```

Velair applies the scheduled target at `05:35` and keeps `07:00` as the visible comfort target time.

## Heating With Learned History

After enough successful observations, Velair can use similar local history instead of the initial model.

Scenario:

- Scheduled block: `21 °C`, `heat`, target time `07:00`
- Current room temperature: `18.5 °C`
- Current delta: `2.5 °C`
- Similar completed observations:

```text
A: 2.0 °C in 50 min -> 25.0 min/°C
B: 2.4 °C in 72 min -> 30.0 min/°C
C: 2.8 °C in 84 min -> 30.0 min/°C
D: 2.1 °C in 63 min -> 30.0 min/°C
E: 2.6 °C in 91 min -> 35.0 min/°C
```

With Comfort percentile set to `80`, Velair chooses a conservative value from the similar completed samples. In this example that is `35.0 min/°C`.

```text
lead = 2.5 * 35 = 87.5 min
```

Velair rounds the final lead up to the next supported scheduler minute instead of rounding below the calculated value.

```text
87.5 min -> 90 min
start = 07:00 - 90 min = 05:30
```

## Cooling Example

Scenario:

- Scheduled block: `23 °C`, `cool`, target time `22:00`
- Room temperature: `27 °C`
- Minimum start: `10 min`
- Initial model: `25 min/°C`
- Maximum start: `24 h`

Calculation:

```text
delta = 27 - 23 = 4 °C
lead = 10 + 25 * 4 = 110 min
start = 22:00 - 110 min = 20:10
```

If the climate later has enough cooling observations, Velair uses cooling history only. Heating history is not mixed with cooling history because the same room and device may heat and cool at different rates.

## Partial And Invalid Observations

Velair stores compact local observations after preconditioning attempts.

Completed observations are useful examples where the room reached the target threshold in time.

Partial observations mean Velair started early but the room did not reach the target threshold by the scheduled comfort time. They act as lower bounds: Velair knows more time was needed, but it does not invent a fake completion time.

Invalid observations are kept only as diagnostics and do not drive the model. Examples include tiny deltas, impossible durations, interrupted sessions, missing temperatures, boosts, pauses, or scheduler state changes.

If older partial observations are followed by enough completed observations that prove the room now reaches target reliably, those older partial observations stop forcing the prediction upward.

## Outdoor Temperature Sensor

The outdoor temperature sensor is optional.

If configured, Velair stores its value as local context for observations and later compares current conditions with similar past observations. It does not call weather services, does not require internet, and does not apply a fixed offset to the initial model.

If the outdoor sensor is unavailable when a sample is saved, Velair simply stores the observation without that context.

## Room Assist Interaction

By default, Adaptive Preconditioning uses the climate entity's `current_temperature`.

If Room Sensor Assist is enabled for that climate and a room sensor is selected, Adaptive Preconditioning uses that room sensor as the effective room temperature for decisions and learning.

This is useful for TRVs or thermostats whose built-in sensor is too close to a radiator, air outlet, or other local heat source. See [Room Assist](room-assist.md) for the actuator-side behavior.

## Automation Events

Velair uses three `velair_event` events for this lifecycle:

- `preconditioning_plan_updated` when a calculated plan appears or changes;
- `preconditioning_plan_cancelled` when a published plan no longer applies;
- `preconditioning_observation_recorded` after a learning sample is persisted.

See [Automation Events](automation-events.md#preconditioning-plan-updated) for
the precise emission rules and complete payload examples.

Example automation trigger:

```yaml
trigger:
  - platform: event
    event_type: velair_event
    event_data:
      event: preconditioning_plan_updated
      entity_id: climate.living_room
```

## When Velair Does Nothing

Adaptive Preconditioning does not start early when:

- preconditioning is disabled for that climate;
- the scheduler is not in automatic mode;
- the zone is paused or boosted;
- the next block is `Off`;
- the climate does not support the needed heat or cool direction;
- the temperature gap is smaller than Minimum temperature delta;
- the required temperature is unavailable or non-numeric.

## Lovelace

The Preconditioning view is available as a Lovelace card:

```yaml
type: custom:velair-card
view: preconditioning
entities:
  - climate.living_room
```

The Lovelace card uses the same backend configuration as the main Velair panel.

## Technical Details

Developer-oriented details about storage, the learning algorithm, partial handling, similarity weighting, and API output are documented in [Adaptive preconditioning internals](../developer/adaptive-preconditioning.md).
