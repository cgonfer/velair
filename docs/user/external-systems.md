# External schedule execution
<!-- velair-docs:start -->
Translations: [English original](external-systems.md) · [Español](external-systems.es.md) · [Français](external-systems.fr.md) · [Deutsch](external-systems.de.md) · [Italiano](external-systems.it.md) · [Nederlands](external-systems.nl.md) · [Polski](external-systems.pl.md) · [Português (Brasil)](external-systems.pt-br.md) · [Português (Portugal)](external-systems.pt-pt.md) · [Русский](external-systems.ru.md) · [Translation status](../translation-status.md)

---
<!-- velair-docs:end -->

Velair normally owns both schedule storage and climate execution. For compatible
climates, **Settings → External systems** can instead publish the effective
weekly schedule to a controller that executes it independently.

The section is shown when Velair detects a supported Home Assistant integration
with a compatible managed climate, or when a zone already has an external owner.
Before enabling external execution, create and save an effective schedule with
at least one temperature block for the zone. If there is nothing to publish,
Velair keeps local ownership and explains the missing prerequisite in Settings.
Choose the external system for a zone to persist external ownership before
Velair uploads the full week. A failed upload does not restore local execution:
the zone remains external
and shows the publication error so two schedulers never compete.
After a successful Home Assistant service call, Velair reports the schedule as
published: this means the external integration accepted the request. Velair
does not claim whether the physical controller has applied it.

External execution is deliberately schedule-only. Velair does not send any
climate action to an external zone, including startup/current schedule delivery,
Boost, pause/resume, Manual adjustment, Room Assist, or adaptive preconditioning.
Profiles and Modes are supported only as schedule selection: `normal` publishes
the zone's Default week and `schedule` publishes the Profile week. Pause behavior
is unavailable for external zones. Selecting Default, a Profile, or a Mode, and
editing an active Profile, publishes the newly effective full week after the
selection has been persisted. A publication failure does not undo the global
Profile or Mode selection and does not affect local zones.
Selecting Default, a Profile, or a Mode again also starts one new publication
when the current runtime state is `failed` or has no successful publication.
Velair does not retry automatically; this publication is caused only by the
explicit selection.

## Evohome via ramses_cc

The first supported system uses the `ramses_cc.set_zone_schedule` Home Assistant
service. Velair has no Python dependency on `ramses_cc` and communicates only
through Home Assistant services.

Settings and the Profile editor derive these conditions from the controller
capabilities and list them once under the external controller, even when several
zones use it. Controller details are collapsed by default and can be expanded
when the limits need to be reviewed.
Current limits:

- heating schedules with one scalar setpoint per switchpoint;
- exactly seven weekdays, preserving Velair's weekly continuity;
- no turn-off blocks, temperature ranges, cooling modes, or climate options;
- at most six translated switchpoints per day;
- when the first block starts after `00:00`, Velair inserts a midnight
  continuity switchpoint and that implicit change counts toward the daily
  maximum, leaving room for five editable blocks that day;
- times on the controller's 5-minute grid;
- temperatures are converted to Celsius for the controller payload.

For externally executed zones, the Default and Profile day editors show the
current controller usage directly above the blocks. The first line reports the
used and maximum switchpoints; the second separates editable schedule blocks
from an implicit midnight continuity point. The indicator changes appearance
at the limit and when the draft exceeds it. This is derived from the selected
controller's advertised capabilities; backend publication validation remains
authoritative.

Overview keeps the normal schedule activity and next-event information for an
external zone. A compact **External** indicator names the controller and uses a
status icon for publishing, accepted, failed, or unavailable states. Its
information button explains that the controller executes the planned timeline
and that Velair sends no climate actions to the zone. The scheduler status also
shows an informational notice when one or more visible zones use external
execution.

Detection requires the set-schedule service, a loaded `ramses_cc` config entry,
and a managed `climate` entity that advertises heating and scalar-temperature
support. Home Assistant's public entity metadata does not distinguish every
Evohome zone from every other `ramses_cc` climate. The service call is therefore
the final compatibility check, and an error is kept as a visible publication
failure.

This integration path has automated service coverage. Real-world testing on an
Evohome installation using `ramses_cc` has also confirmed publication and
controller retention for the tested weekly schedules. Feedback from more
installations and schedule combinations remains useful.

Publication has only three runtime states: **publishing**, **published**, and
**failed**. Before the first publication in the current Home Assistant runtime,
there is no publication state. The state is not persisted and is independent
from whether the provider is currently available.

Velair does not call `get_zone_schedule`, add delays, retry automatically, or
poll. Those mechanisms would still not let Velair make a provider-neutral claim
about what physical hardware is executing.
