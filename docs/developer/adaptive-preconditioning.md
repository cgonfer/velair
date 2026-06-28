# Adaptive Preconditioning

Adaptive preconditioning lets Velair apply a scheduled comfort target before the visible block time so the room is more likely to be at the requested temperature when the block starts.

Everything runs locally inside Home Assistant. Velair stores settings and learning samples in Home Assistant storage and does not send schedules, temperatures, climate history, or calibration data to any external service.

## Scope

Adaptive preconditioning currently works for managed `climate.*` entities and schedule blocks that set a target temperature with a heat or cool direction.

It does not apply to `Off` blocks, unsupported HVAC directions, blocks where Velair cannot determine whether heat or cool is needed, or sessions interrupted by boosts, pauses, scheduler stop/resume, schedule changes, or disabled preconditioning.

Preconditioning is always adaptive. Velair predicts lead minutes from the current temperature delta and local learning samples.

## Per-climate configuration

Stored per climate:

```json
{
  "enabled": true,
  "max_lead_minutes": 1440,
  "minimum_delta_temperature": 0.3,
  "learning_history_size": 120,
  "similar_sample_count": 25,
  "comfort_percentile": 80,
  "adaptive_percentile_enabled": true,
  "partial_expiry_days": 30,
  "recency_decay_days": 30,
  "min_start_minutes": 10,
  "fallback_minutes_per_degree": 25,
  "use_outdoor_temperature": true,
  "outdoor_temperature_entity_id": "sensor.outdoor_temperature"
}
```

Key meanings:

- `minimum_delta_temperature`: ignores tiny temperature gaps that are likely sensor noise.
- `min_start_minutes`: ignores predictions too small to be operationally useful.
- `max_lead_minutes`: caps any adaptive early start. The default is 1440 minutes, so a climate can plan long rural or low-insulation warm-up/cool-down periods without changing this setting first.
- `learning_history_size`: maximum stored useful samples (`complete` + `partial`) per climate direction. Diagnostic `invalid` samples use a separate fixed limit of 10 per direction.
- `similar_sample_count`: maximum nearest samples considered for one prediction.
- `comfort_percentile`: percentile used when enough complete similar samples exist.
- `adaptive_percentile_enabled`: adjusts the active history percentile from recent complete/partial outcomes of the same mode.
- `partial_expiry_days`: limits how long partial lower bounds can influence predictions.
- `recency_decay_days`: controls how quickly older samples lose influence in `exp(-age_days / recency_decay_days)`.
- `fallback_minutes_per_degree`: initial model before enough complete samples exist.
- `use_outdoor_temperature`: enables optional local outdoor temperature context for stored learning samples and history similarity.
- `outdoor_temperature_entity_id`: optional Home Assistant sensor used as the outdoor temperature source. Velair reads its numeric state. Missing or non-numeric outdoor temperature never invalidates learning, and outdoor temperature does not alter the initial model before enough history exists.

## Activation

For heat:

```text
delta_t = target_temp - current_temp
```

For cool:

```text
delta_t = current_temp - target_temp
```

If `delta_t <= minimum_delta_temperature`, Velair returns no preconditioning lead and does not start a learning session.

## Replanning Before Start

Velair schedules one Home Assistant timer for the next scheduler action. It does not poll climates continuously.

When the scheduler is in auto mode, Velair also listens to state changes for managed climates that are enabled, have preconditioning enabled, and have at least one future temperature block that could be preconditioned. If a climate reports a new `current_temperature` before preconditioning has started, Velair compares it with the last temperature that triggered planning for that climate.

Climates with preconditioning disabled are never included in either the replanning listener or the active-learning listener. They therefore create no preconditioning temperature-change callbacks, recalculation timers, learning sessions, or observation writes. Disabling preconditioning also discards any runtime session for that climate without saving it. Existing historical samples remain stored so they are available if the user enables the feature again.

A replan is scheduled only when the movement is relevant:

```text
threshold = min(0.2, minimum_delta_temperature)
```

If `minimum_delta_temperature` is configured as `0`, Velair uses `0.2` as the runtime replan threshold to avoid recalculating on unchanged or noisy sensor updates.

The replan itself is debounced by 30 seconds. Multiple temperature updates inside that window produce one scheduler recalculation.

This is runtime-only behavior:

- it does not persist data;
- it does not create learning observations;
- it is disabled outside auto mode;
- it ignores climates without preconditioning enabled;
- it ignores climates that are already inside an active preconditioning learning session, because those updates are handled by the learning-session listener.

## Automation Event

When the authoritative scheduler plan gains a new preconditioning start or an existing start changes, Velair fires `velair_event` with `event: preconditioning_plan_updated`. Pure calculations used to render the panel or answer the WebSocket API do not fire this event, and an unchanged plan is not emitted repeatedly.

The payload contains the prediction context already available at planning time:

- `entity_id`;
- `scheduled_when`, the original schedule block time;
- `preconditioning_when`, the calculated early start;
- `lead_minutes`;
- `direction`, `heat` or `cool`;
- `target_temperature`, `current_temperature`, and `temperature_delta`;
- `hvac_mode`;
- `model_source`, `initial_model` or `history`;
- `complete_sample_count`, `partial_sample_count`, and `similar_sample_count`;
- `comfort_percentile`;
- `used_outdoor_temperature` and `outdoor_temperature` when available;
- `weekday` and `start`.

Velair does not expose a separate thermal-rate value in this event because the final lead may also include the initial startup allowance, partial-sample floor, rounding, and configured limits. `lead_minutes` is the authoritative result to use in automations.

Example:

```text
20:00 block target = 21 C
18:00 current = 18 C
initial prediction = start at 18:30

18:10 current rises to 20 C
temperature movement is relevant
Velair debounces and recalculates
new prediction = start at 19:10
```

## Stored Samples

Adaptive samples are stored per climate:

```json
{
  "entity_id": "climate.living_room",
  "mode": "heat",
  "created_at": "2026-06-16T05:20:00+02:00",
  "scheduled_time": "2026-06-16T07:00:00+02:00",
  "start_time": "2026-06-16T04:00:00+02:00",
  "target_temp": 21.0,
  "initial_temp": 18.0,
  "observed_temp": 20.8,
  "outdoor_temp_start": null,
  "outdoor_temp_target": null,
  "delta_t": 3.0,
  "startup_minutes": 180,
  "reached": true,
  "minutes_to_reach": 80,
  "quality": "complete"
}
```

In storage, observations are grouped by direction:

```json
{
  "preconditioning_learning": {
    "climate.living_room": {
      "heat": {
        "observations": []
      },
      "cool": {
        "observations": []
      }
    }
  }
}
```

Qualities:

- `complete`: the target threshold was reached before or at the scheduled comfort time.
- `partial`: the target was not reached by the scheduled comfort time; this is a censored lower bound, not a fake completion time.
- `invalid`: retained for diagnosis when a sample is unsafe for learning.

Invalid samples never participate in prediction.

## Prediction

For each event, Velair predicts from the current context:

```json
{
  "mode": "heat",
  "target_temp": 21.0,
  "current_temp": 19.0,
  "outdoor_temp_target": null
}
```

The predictor:

1. Filters valid local samples for the same mode.
2. Sorts by similarity using `delta_t`, `target_temp`, and optional `outdoor_temp_target`.
3. Keeps up to `similar_sample_count` nearest samples.
4. Uses an initial model if fewer than 5 complete similar samples exist:

```text
lead = 30 + fallback_minutes_per_degree * delta_t
```

The initial model is then rounded up to the next 5-minute boundary and capped by `max_lead_minutes`. It is intentionally simple because Velair does not yet know the real room/device thermal capacity.

Outdoor temperature is not applied as a fixed adjustment to the initial model. It is stored with learning samples and used later as part of similarity/distance when enough complete samples with outdoor context exist.

5. Uses a recency-weighted thermal potential percentile when at least 5 complete similar samples exist:

```text
minutes_per_degree = minutes_to_reach / delta_t
weight = exp(-age_days / recency_decay_days)
similarity_weight = exp(-distance)
final_weight = weight * similarity_weight
complete_estimate = percentile(minutes_per_degree) * current_delta_t
```

6. Treats partial samples as lower bounds:

```text
floor = startup_minutes + max(10, min(30, startup_minutes * 0.20))
```

If several selected partial samples are still active, Velair computes this floor for each of them and uses the largest floor. The most recent partial does not automatically win; recency only determines expiry and whether later complete samples have refuted that partial.

7. Uses `max(complete_estimate, partial_floor)`, rounds up to the next 5-minute boundary, and applies min/max limits.

Partial samples stop influencing prediction when they are older than `partial_expiry_days` or when three later complete samples are sufficiently similar.

If a climate only produces partial samples and has fewer than 5 complete similar samples, Velair still uses the initial model as the main estimate and can only increase it when an active partial floor is higher. It does not convert partial samples into complete thermal-rate evidence, because a partial only proves that the chosen lead was not enough; it does not prove when the room would actually have reached the target.

Rounding always moves the final prediction up to the next 5-minute boundary. This prevents a partial lower bound from being weakened by rounding. For example, a partial floor of `96` minutes becomes `100`, not `95`.

### Dynamic Comfort Percentile

When `adaptive_percentile_enabled` is `true`, Velair examines up to the last 10 `complete` or `partial` observations for the same mode (`heat` or `cool`):

```text
partial_rate = partial_count / recent_complete_or_partial_count
```

`invalid` observations and observations from the other mode do not count. If fewer than 10 matching observations exist, Velair uses all available matching observations. With no matching observations, it keeps the configured `comfort_percentile`.

The active percentile is selected as follows:

```text
partial_rate > 20%  -> max(configured_percentile, 90)
partial_rate < 10%  -> min(configured_percentile, 80)
10% to 20%          -> configured_percentile
```

The boundaries are strict: exactly `10%` or exactly `20%` keeps the configured percentile. Disabling `adaptive_percentile_enabled` also keeps the configured percentile unchanged.

Examples with `comfort_percentile = 80`:

```text
8 complete + 2 partial = 20% partial -> active percentile 80
7 complete + 3 partial = 30% partial -> active percentile 90
3 complete + 2 partial = 40% partial -> active percentile 90
```

Example with `comfort_percentile = 90`:

```text
10 complete + 0 partial = 0% partial -> active percentile 80
```

This adjustment affects the weighted history percentile. It does not change the initial model used before enough complete similar samples exist.

## Examples

No samples, heat from 19 to 21:

```json
{
  "source": "initial_model",
  "recommended_lead_minutes": 80,
  "complete_sample_count": 0
}
```

Five complete similar samples with `delta_t = 2` and `minutes_to_reach` of 40, 50, 60, 70, and 80:

```json
{
  "source": "history",
  "comfort_percentile": 80,
  "recommended_lead_minutes": 70,
  "complete_sample_count": 5
}
```

Same samples plus a partial with `startup_minutes` 90:

```json
{
  "source": "history",
  "recommended_lead_minutes": 110,
  "partial_sample_count": 1
}
```

Heat and cool are independent. A climate may learn strong heat performance and weak cool performance, or vice versa.

History is scaled by learned thermal potential. For example, if five similar complete samples all represent `delta_t = 1` and their 80th percentile is `35` minutes per degree, a new `delta_t = 5` prediction becomes:

```text
35 min/degree * 5 degrees = 175 minutes
```

The opposite also scales down:

```text
35 min/degree * 1 degree = 35 minutes
```

### Partial Refuted By Later Complete Samples

A partial sample can stop acting as a lower bound before it expires if later local evidence proves that similar conditions are now reaching comfort successfully.

Example, all for `heat` and a similar `target_temp` / `delta_t`:

```text
P1 partial  created 08:00  startup_minutes 90
R1 complete created 09:00  minutes_to_reach 60
R2 complete created 10:00  minutes_to_reach 65
R3 complete created 11:00  minutes_to_reach 70
```

When Velair evaluates `P1`, it looks for later complete samples that are sufficiently similar:

```text
R1 is later than P1 and similar -> counts
R2 is later than P1 and similar -> counts
R3 is later than P1 and similar -> counts
```

Because there are at least 3 later similar complete samples, `P1` is ignored as a partial floor:

```text
P1 floor would be 90 + max(10, min(30, round(90 * 0.20))) = 108
rounded up would be 110
but P1 is refuted -> no partial floor from P1
```

The later complete samples can still participate in the recency-weighted percentile. Earlier complete samples are not removed by this rule; they only lose influence naturally through recency weighting and similarity selection.

The same partial would still count if only two later similar complete samples existed:

```text
P1 partial
R1 complete later and similar
R2 complete later and similar

later similar complete count = 2
P1 still acts as a lower bound until it expires or a third later similar complete sample appears
```

### Worked Prediction Example

This example shows the full current predictor behavior with local data only.

Configuration:

```text
minimum_delta_temperature = 0.3
min_start_minutes = 5
max_lead_minutes = 120
fallback_minutes_per_degree = 25
comfort_percentile = 80
similar_sample_count = 5
partial_expiry_days = 30
recency_decay_days = 30
adaptive_percentile_enabled = false
```

Current event:

```text
now = 2026-05-20
mode = heat
target_temp = 21.0
current_temp = 18.8
delta_t = 21.0 - 18.8 = 2.2
```

Because `2.2 > 0.3`, Velair can predict an early start.

Stored local observations:

```text
A complete age 1d   target 21 delta 2.0 minutes_to_reach 55
B complete age 2d   target 21 delta 2.3 minutes_to_reach 65
C partial  age 3d   target 21 delta 2.1 startup_minutes 70
D complete age 5d   target 20 delta 2.2 minutes_to_reach 50
E complete age 8d   target 21 delta 3.5 minutes_to_reach 95
F complete age 12d  target 22 delta 2.0 minutes_to_reach 75
G partial  age 49d  target 21 delta 2.2 startup_minutes 80
H invalid  age 1d   target 21 delta 2.2 minutes_to_reach 2
I complete age 20d  target 21 delta 1.8 minutes_to_reach 45
J partial  age 6d   target 21 delta 2.8 startup_minutes 100
```

`H` is invalid, so it is counted for diagnostics but never used for prediction.

Similarity is currently:

```text
distance = abs(current_delta_t - sample_delta_t) + abs(current_target - sample_target)
```

If no outdoor entity is configured, or the configured entity has no numeric temperature, distance is:

```text
G: abs(2.2 - 2.2) + abs(21 - 21) = 0.0
B: abs(2.2 - 2.3) + abs(21 - 21) = 0.1
C: abs(2.2 - 2.1) + abs(21 - 21) = 0.1
A: abs(2.2 - 2.0) + abs(21 - 21) = 0.2
I: abs(2.2 - 1.8) + abs(21 - 21) = 0.4
J: abs(2.2 - 2.8) + abs(21 - 21) = 0.6
D: abs(2.2 - 2.2) + abs(21 - 20) = 1.0
F: abs(2.2 - 2.0) + abs(21 - 22) = 1.2
E: abs(2.2 - 3.5) + abs(21 - 21) = 1.3
```

With `similar_sample_count = 5`, Velair keeps:

```text
G, B, C, A, I
```

That gives:

```text
complete samples = B, A, I
partial samples = G, C
```

There are only 3 complete similar samples. Velair needs 5 complete similar samples before using the history percentile, so the main estimate comes from the initial model:

```text
initial = 30 + fallback_minutes_per_degree * delta_t
initial = 30 + 25 * 2.2
initial = 85
```

Partial handling:

```text
G is 49 days old -> older than partial_expiry_days -> ignored as a floor
C is 3 days old -> active
C floor = 70 + max(10, min(30, round(70 * 0.20)))
C floor = 70 + 14 = 84
```

`J` is not selected when `similar_sample_count = 5`, so it does not affect this prediction.

If `C` had 3 later complete samples with similar `delta_t`, `target_temp`, and optional outdoor temperature, `C` would also be ignored as a floor even though it is not expired.

The combined estimate is:

```text
estimate = max(initial, active_partial_floor)
estimate = max(85, 84)
estimate = 85
```

After rounding up and applying min/max limits:

```json
{
  "source": "initial_model",
  "recommended_lead_minutes": 85,
  "similar_sample_count": 5,
  "complete_sample_count": 3,
  "partial_sample_count": 2,
  "invalid_sample_count": 1
}
```

If the same data is evaluated with `similar_sample_count = 9`, all non-invalid observations above enter the similar set. Velair then has 6 complete similar samples, so it uses the history percentile.

Velair first converts each complete sample to thermal effort:

```text
minutes_per_degree = minutes_to_reach / sample_delta_t
```

Then it applies both recency and similarity weights:

```text
recency_weight = exp(-age_days / recency_decay_days)
similarity_weight = exp(-distance)
final_weight = recency_weight * similarity_weight
```

With `similar_sample_count = 9`, the selected samples keep the similarity order:

```text
G, B, C, A, I, J, D, F, E
```

Only complete samples participate in the history percentile. In selected-sample order, those complete samples are:

```text
B 65 min / 2.3 C = 28.3 min/C, distance 0.1, age 2d  -> final weight 0.85
A 55 min / 2.0 C = 27.5 min/C, distance 0.2, age 1d  -> final weight 0.79
I 45 min / 1.8 C = 25.0 min/C, distance 0.4, age 20d -> final weight 0.34
D 50 min / 2.2 C = 22.7 min/C, distance 1.0, age 5d  -> final weight 0.31
F 75 min / 2.0 C = 37.5 min/C, distance 1.2, age 12d -> final weight 0.20
E 95 min / 3.5 C = 27.1 min/C, distance 1.3, age 8d  -> final weight 0.21
```

For the percentile, Velair then sorts those complete samples by `minutes_per_degree` from lowest to highest and accumulates their weights:

```text
D 22.7 min/C -> cumulative 0.31
I 25.0 min/C -> cumulative 0.65
E 27.1 min/C -> cumulative 0.86
A 27.5 min/C -> cumulative 1.65
B 28.3 min/C -> cumulative 2.50
F 37.5 min/C -> cumulative 2.70
```

Percentile threshold:

```text
total_weight = 2.70
threshold = 2.70 * 0.80 = 2.16
```

The cumulative weight first passes `2.16` at `28.3 min/C`, so:

```text
complete_rate = 28.3 min/C
complete_estimate = 28.3 * current_delta_t
complete_estimate = 28.3 * 2.2 = 62.3
rounded up to next 5 = 65
```

Partial handling now checks all selected partial samples:

```text
G is expired by partial_expiry_days -> ignored
C is active -> floor 84
J is not expired, but it has 3 later similar complete samples:
  B complete age 2d target 21 delta 2.3 -> later and similar
  A complete age 1d target 21 delta 2.0 -> later and similar
  D complete age 5d target 20 delta 2.2 -> later and similar
J floor would be 100 + max(10, min(30, round(100 * 0.20))) = 120
but J is refuted -> ignored as a floor
```

The active partial floor from `C` is still `84`, while `G` is expired and `J` is refuted:

```text
estimate = max(65, 84) = 84
rounded up to next 5 = 85
```

Result:

```json
{
  "source": "history",
  "recommended_lead_minutes": 85,
  "similar_sample_count": 9,
  "complete_sample_count": 6,
  "partial_sample_count": 3,
  "invalid_sample_count": 1,
  "comfort_percentile": 80
}
```

This shows the current roles of the main knobs:

- `similar_sample_count` decides whether enough nearby complete samples exist to use history.
- `recency_decay_days` makes recent complete samples matter more inside the thermal-potential percentile.
- Similarity distance also affects the percentile weight, so closer samples matter more than farther samples even after both were selected.
- `comfort_percentile` chooses how conservative the complete-sample thermal potential is.
- `partial_expiry_days` prevents old partial lower bounds from forcing high lead times forever.
- Active partials can still raise the final estimate above the complete-sample percentile.
- A selected partial is ignored as a floor when 3 later complete samples are sufficiently similar.
- Invalid samples are retained for visibility but excluded from prediction.

## API Summary

`preconditioning_learning` is local status for the panel. Users may explicitly include it in a local portable export. Imports match the exact climate entity ID, ignore unmanaged IDs, replace learning only for matching climates present in the file, and preserve learning for local climates omitted from the backup.

```json
{
  "status": "ready",
  "required_samples": 5,
  "total_samples": 6,
  "heat": {
    "status": "ready",
    "sample_count": 5,
    "total_samples": 6,
    "required_samples": 5,
    "effective_lead_minutes": null,
    "effective_lead_source": "history",
    "partial_sample_count": 1,
    "complete_sample_count": 5,
    "invalid_sample_count": 0,
    "lead_limited_by_max": false,
    "last_quality": "partial",
    "model_source": "history",
    "comfort_percentile": 80,
    "similar_sample_count": 25
  }
}
```

Direction statuses are `learning`, `ready`, or `unsupported`.

Effective lead sources:

- `initial_model`: Velair is using the initial model for future event-specific predictions.
- `history`: Velair has enough complete similar samples for event-specific predictions.
- `unsupported`: the direction cannot be used for that climate.

## Retention And Reset

Velair keeps up to `learning_history_size` useful samples (`complete` + `partial`) per climate direction, preserving the newest useful samples. It also keeps only the 10 newest `invalid` samples per direction for diagnostics. Invalid samples never consume the useful learning quota and therefore cannot evict data used by the predictor.

Heat and cool samples are stored separately, so a long cooling season cannot evict heating calibration data, and a long heating season cannot evict cooling calibration data. Retention is bounded and applied only when an observation is already being saved; it introduces no polling, background task, or additional storage write.

Users can reset learning for one climate direction from the Preconditioning tab. The reset deletes only that direction's samples; schedules, settings, templates, and the other direction's learning history are kept.

Users can also restore one climate's tuning parameters to defaults. This keeps the current preconditioning enabled state and does not modify heat or cool learning samples.

## Limitations

Velair can close a session early only when the climate entity emits a state update with a new `current_temperature`. If the climate does not publish temperature changes during the preconditioning window, Velair evaluates the result at the scheduled comfort time.

Outdoor temperature support is local-only and optional. The Preconditioning tab uses a dropdown filtered to local `sensor.*` temperature entities, and Velair reads the selected sensor's numeric state. It does not call external weather services, and missing outdoor temperature never invalidates learning.
