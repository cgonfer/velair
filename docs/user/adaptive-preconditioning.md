# Adaptive Preconditioning

Adaptive Preconditioning lets Velair start heating or cooling before a scheduled block so the room is closer to the target temperature when the block begins.

For example, a schedule block at `07:00` with `21 °C` means "be close to `21 °C` at `07:00`", not "start changing to `21 °C` at `07:00`".

Everything runs locally inside Home Assistant. Velair stores settings and learning samples in Home Assistant storage and does not send schedules, temperatures, climate history, or calibration data to any external service.

## Setup

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

If you want to verify a specific calculation, open **Calculation details** in the live prediction card. This optional section shows the backend values used for that prediction, including sample counts, the estimate from completed observations, the partial lower bound, the combined estimate, rounding, and the final lead. It is hidden by default so the normal view stays simple.

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
