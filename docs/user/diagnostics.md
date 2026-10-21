# Diagnostics
<!-- velair-docs:start -->
Translations: [English original](diagnostics.md) · [Español](diagnostics.es.md) · [Français](diagnostics.fr.md) · [Deutsch](diagnostics.de.md) · [Italiano](diagnostics.it.md) · [Nederlands](diagnostics.nl.md) · [Polski](diagnostics.pl.md) · [Português (Brasil)](diagnostics.pt-br.md) · [Português (Portugal)](diagnostics.pt-pt.md) · [Русский](diagnostics.ru.md) · [Translation status](../translation-status.md)

---
<!-- velair-docs:end -->

The **Diagnostics** section gives a local, read-only view of what Velair can
verify without requiring Home Assistant Recorder or external services.

It shows the scheduler's current status and a compact horizontal strip of
managed climates in the configured thermostat order. Selecting one climate
opens a single full-width detail panel below the strip.
The detail panel groups each fact once under status and delivery, active
configuration, functions, and device and sensors. It includes:

- availability and reported HVAC/temperature capabilities;
- detected configuration issues where Velair has direct evidence;
- the effective Mode and Profiles, calculated runtime intent, Boosts and pauses;
- the last control target accepted by Home Assistant, delivery error, and
  bounded retry state;
- Room Assist, Adaptive Preconditioning, Comfort, and explicitly associated
  sensors.

Successful `velair.set_hvac_mode` calls appear as a manual, mode-only accepted
delivery. They include the selected HVAC mode but no invented temperature.
Validation failures do not replace the previous accepted evidence, and physical
delivery failures do not publish a successful target event.

Velair does not infer a cause when the available evidence only proves a symptom
such as an unavailable entity.
Battery information is omitted unless Velair can establish a reliable
association; the first version does not attempt heuristic device matching.

For Comfort, Diagnostics includes the saved source for every enabled derived
reading, the effective input or external entity, its current availability, and
stable issue codes for missing, stale, invalid, or unverified data. Dew point, absolute
humidity, and Humidex remain observational here: their presence in a report does
not mean that they influenced scheduling or climate control. The same enabled
payloads are exposed in the `derived_metrics` attribute of the zone
**Environmental condition** sensor; Velair does not create separate proxy
entities for them. Current readings include `freshness: reported` or `unverified`; the latter stays visible with an informational label and can be traced to its source.
When outdoor comparison is enabled, the same Comfort report also contains its
explicit sensor availability, independent outdoor data quality, normalized
comparison, explicit indoor/outdoor absolute humidity, and any opportunity or
trade-off code. The `guidance_thresholds` block records the effective per-zone
sensitivity used for that conclusion, which helps distinguish a sensor problem
from intentionally stricter guidance. These values remain
observational and do not indicate that Velair opened a window or changed HVAC.
Diagnostics also includes `comfort_zone`: the configured Simple, Guided, or
custom temperature-aware geometry and the humidity range effective at the current
temperature. A `null` effective range explains why a current humidity reading
was not classified when temperature was unavailable; it is not replaced with a
guessed fallback.

The live assessment includes the current `range_summary`. Retained
`comfort_assessment_changed` entries also keep `previous_range_summary` and the
`range_summary_changed` and `range_status_changed` flags, so a downloaded
report can show whether the event represented a configured-range transition or
another Comfort change. These fields contain only stable semantic codes, not
raw Home Assistant event context.

## Learning Evidence

The existing Preconditioning function section separates heating and cooling
activity. It shows whether an observation is running or Velair is waiting for
a suitable transition, and the latest retained learning transition when one is
available. Its expandable details contain only evidence relevant to that
decision, such as initial and target temperatures, the minimum temperature
delta, observed duration and the configured maximum start.

The Preconditioning history includes observation starts, interruptions, results
and actual transitions that could not start an observation. Result entries
distinguish complete, partial and invalid observations. Invalid observations can
identify a temperature gap that was too small, a duration that was too short,
or a duration exceeding the configured maximum. Older stored observations may
retain the less specific out-of-bounds reason. Velair does not retroactively
assign a more precise cause to them.

Repeated calculations of future predictions do not create learning entries.
The last transition follows the same retention settings and global history
limit as the timeline. Disabling Preconditioning history or clearing history
removes that historical evidence; it does not stop learning or erase stored
learning samples. After a restart, previous runtime activity and history are
not restored. If no evidence is available, Diagnostics does not invent a reason
for unchanged counters or infer whether a boiler was running.

### Preconditioning dependency evidence

For a room with a configured **Preconditioning master**, inspect its dependency
details alongside the existing preparation information. These distinguish the
room's independent estimate, the master's selected transition and start, and the
effective start or reason preparation cannot begin. A command accepted by Home
Assistant is evidence of Velair's action, not a measurement of the boiler relay.
The learning observation continues to describe the dependent room's own
temperature and elapsed time.

When evidence is available, the explanation distinguishes Home Assistant
availability from disabled scheduling or Preconditioning, a paused Profile,
an active override, an ineligible master, or a missing transition. The same
explanation appears in cards and Diagnostics. An unavailable climate may still
have a calculated prediction when another configured sensor supplies its room
temperature; that prediction does not confirm that the device can receive a
command or supply heat or cooling.

## Runtime History And Privacy

Diagnostics keeps at most 100 relevant events in one global timeline.
The **History settings** section lets you independently retain control and
schedule activity, Room Assist, Preconditioning, Comfort, climate delivery,
and availability events. New Velair event types that are not yet classified
are retained under control and schedules instead of being silently discarded.
External adjustments and transitions between Automatic and Manual control also
remain in this category. Their log entries show only the changed HVAC mode or
scalar/range target, the effective external-change policy, and any expiry or resume
reason; arbitrary climate attributes and Home Assistant Context identifiers are
not retained.
All categories are enabled by default. These choices are stored locally by the
backend; disabling a category immediately removes its already retained events.
**Clear history** removes all retained events without changing current health,
delivery, or configuration evidence.

The runtime log can be filtered locally without changing what Velair retains.
Choose any combination of the Velair system source and managed climates, or use
the **All** master option; then optionally narrow the list by category and an
inclusive From/To date range. **Clear filters** restores the complete retained timeline.
An empty history is shown differently from a filter combination with no
matches. These filters are temporary UI state and are not persisted.

On desktop, the runtime log columns can be resized by dragging their separators
or using the keyboard while a separator is focused. Arrow keys resize in small
steps, Shift+Arrow uses larger steps, Home/End moves to the allowed limits, and
a double-click restores the default width. Column widths are temporary and are
not persisted. Mobile shows time, climate, type, and message on four separate
rows. A row can scroll horizontally when one value cannot fit without wrapping.

Only the category choices are persisted. Event history exists only in memory,
is cleared when the integration or Home Assistant restarts, and does not use
Recorder. It is populated from existing Velair events, availability changes,
and delivery outcomes, so it adds no polling.

**Download report** opens privacy options before creating JSON suitable for an
issue. Managed climate entity IDs are replaced with stable aliases by default;
you may retain raw entity IDs for local inspection. Profile, Mode and pause
identifiers are always removed. Closing the panel or completing a download
restores the safer default. Home Assistant's standard config-entry diagnostics
download always uses the redacted snapshot.
The report export section is hidden on phone-sized layouts because downloads
are not reliable inside the Home Assistant companion app webview. Open Velair
from a tablet or desktop browser when you need to download a report.
Review any report before publishing it. Associated sensor entity IDs are also
replaced; the live local view keeps them visible because they are useful when
checking configuration.

The local Diagnostics view uses Home Assistant's friendly climate names while
filtering, but its detail panel intentionally shows local entity IDs so the
user can verify configuration. With the default privacy option enabled,
downloaded reports replace both structured IDs and IDs embedded in retained
error text with deterministic aliases such as `climate_unit_1` and
`associated_entity_1`. Repeated references keep the same alias so relationships
remain useful without exposing the original local IDs. If you explicitly keep
raw entity IDs, those local identifiers remain in the report; Profile, Mode and
pause identifiers are still removed. Review every report before sharing it.

Diagnostics has no scheduler, retry, rollback, or climate controls. Settings
continues to contain configuration and maintenance actions; climate capability
and health details now belong to Diagnostics.

Each managed climate also reports runtime-only command-settling evidence. While
a recent Velair command is stabilizing, Diagnostics lists the affected control
fields in its runtime snapshot. If the climate has not converged by the bounded
deadline, the next fresh snapshot marks the unit with a
`command_settling_mismatch` warning. Expand that warning in the selected
climate's Diagnostics panel to compare each affected field's expected value
with the value reported by the thermostat. Temperatures include the climate's
unit, HVAC modes use their normal labels, and missing values are identified
explicitly. This uses the recorded comparison, not the current schedule or a
new reading. The downloaded report also retains the `command_settling` block.
This is
evidence for troubleshooting: Diagnostics does not retry the command, change
the climate, or create a Manual adjustment. The evidence is cleared by a newer
command for that field or by restart.

## Automating Diagnostic Health

Velair creates a **Diagnostics status** entity with `ok`, `warning`, and
`error` states. It is updated from the same backend snapshot as this view and
does not poll. Its compact attributes include scheduler state, unit counts,
issue counts, and stable issue codes; raw errors and operational identifiers
are not included.

Use a state trigger when an automation only needs the aggregate current health.
Use the `diagnostic_issue_changed` event when it needs to react to one issue
being detected or resolved while other issues remain active. See
[Automation events](automation-events.md#diagnostic-issue-changed) for the
event payload and examples.

Each managed climate also has a disabled-by-default **Zone delivery
diagnostics** sensor. It projects the same runtime-only delivery status and last
accepted control target used by Diagnostics, without raw error text. An
accepted target means that Home Assistant accepted Velair's related service
sequence; it does not establish the state of the device or transport. Room
Assist may subsequently adjust the sent target and exposes that context through
its own sensor. Delivery evidence is never restored after a restart and is
cleared by a successful Velair data reset. See
[Zone Control and Delivery Sensors](zone-sensors.md#zone-delivery-diagnostics)
for the complete state and attribute contract, enablement steps, and automation
examples.
