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
