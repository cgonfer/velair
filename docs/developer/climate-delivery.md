# Climate Delivery Coordination

Velair separates authoritative intent from delivery. Persisted configuration
and scheduler runtime determine *what* should happen; the runtime-only climate
delivery coordinator controls *when* an accepted Home Assistant call can be
completed safely.

## Contract

A delivery request supplies a resolver rather than a captured payload. The
coordinator invokes the resolver immediately before each attempt. The resolver
returns an async delivery sequence for the current generation or `None` when
there is no longer an authoritative action.

Per managed climate, the coordinator provides:

- a generation that invalidates older work;
- an async lock around the complete mode/target/options sequence;
- an event-driven availability wait for `unknown` and `unavailable`;
- two retries, after 2 and 10 seconds, only after recoverable physical-call
  `HomeAssistantError` exceptions;
- teardown cancellation with no persisted recovery state.

The scheduler must resolve the priority stack again on recovery: stop and
temperature-migration gates, global mode, zone Pause or Boost, effective Mode
and Profile schedule, active Adaptive Preconditioning, then Room Assist's
current calculated target. A closure containing yesterday's service data is
not an authoritative resolver.

## Success boundary

`ClimateManager` uses blocking Home Assistant service calls for every physical
target operation. A scalar or range application can include HVAC mode and
supported fan, preset, swing, horizontal swing, and humidity calls. The entire
sequence must complete before the scheduler:

- emits `climate_target_applied` or Room Assist applied/restored events;
- writes an applied logbook entry;
- marks an early target applied;
- starts an Adaptive Preconditioning learning session.

That success boundary records command acceptance, not physical convergence.
Physical confirmation remains the responsibility of the climate integration's
state reporting.

Room Assist listener refreshes, target restoration, and clearing use the same
per-climate delivery boundary as schedule delivery. The lock order is always
delivery first and Room Assist runtime state second. Success commits contain
only logs, events, notifications, and learning/session bookkeeping; a failure
in those side effects is logged but never causes the physical sequence to be
retried.

Manual services are intentionally non-resilient one-shots. They may use the
same serialization boundary, but must not register delayed availability work
or retry an obsolete manual payload.

## Readback confirmation

`Delivery.confirm` optionally carries a `DeliveryConfirmation`. The scheduler
attaches one only when the zone's persisted `delivery.confirm` flag is on, so
the default path is unchanged. Confirmation starts inside `_async_attempt`
right after the success boundary above: commit timing, `climate_target_applied`
and runtime bookkeeping are untouched, and confirmation is a later, additional
outcome.

- `requested` is a resolver invoked when the watch starts, after the complete
  physical sequence was accepted. The scheduler resolves it against the event
  that was delivered and the current Room Assist runtime state, so the check
  compares the entity with what was actually sent. It returns `None` when there
  is nothing observable to confirm.
- The watch is one `async_track_state_change_event` listener plus one
  `async_call_later` timeout per entity; there is no polling. The current state
  is checked once immediately so an entity that already converged is confirmed
  without waiting.
- Convergence is `_target_converged`: `turn_off` requires `off`; otherwise the
  mode must equal the requested mode (any non-off mode when `hvac_mode` is
  `None`), and each requested scalar or range field must be within half of the
  target step, taken from the request, then `target_temp_step`, then 0.5.
- On timeout with attempts remaining, the coordinator re-runs the eligible
  recovery resolver through `_async_redeliver_current(confirm_attempt=n + 1)`,
  so the attempt counter survives the new generation while the payload is
  re-resolved. After the final attempt the outcome is `unconfirmed`.
- `_replace` (new intent, `cancel`, `retry_current`) and `async_stop` tear down
  the listener and timer and clear a pending outcome. A confirmation watch is
  not "active work", so superseding it does not publish a cancelled entry.
- Observer statuses `confirming`, `confirmed`, and `unconfirmed` feed the
  diagnostics history and per-unit `delivery.confirmation`; `on_outcome` lets
  the scheduler fire `delivery_outcome` and refresh projections.
  `confirmation_status(entity_id)` backs `get_zone_runtime_statuses()`.

Manual one-shot services never attach a confirmation because the coordinator
would otherwise need to replay an obsolete manual payload.

## Cross-entity stagger

`stagger_seconds` is a resolver read on every attempt, so a settings change
applies immediately. When it is positive, `_async_wait_for_stagger_slot` takes
one coordinator-level lock after the per-entity lock and sleeps until the
previous sequence start is at least that far in the past. The lock order is
always per-entity first and stagger second, and `async_serialize` never takes
the stagger lock, so the two cannot deadlock. A waiter sleeps on a future that
`_replace` resolves, so a superseded generation is dropped immediately instead
of holding the slot or executing. Zero keeps deliveries fully parallel.
