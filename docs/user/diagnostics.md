# Diagnostics

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
- the last confirmed application, delivery error, and bounded retry state;
- Room Assist, Adaptive Preconditioning, Comfort, and explicitly associated
  sensors.

Velair does not infer a cause when the available evidence only proves a symptom
such as an unavailable entity.
Battery information is omitted unless Velair can establish a reliable
association; the first version does not attempt heuristic device matching.

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
