# Planned Return

<!-- velair-docs:start -->
Translations: [English original](planned-return.md) · [Español](planned-return.es.md) · [Français](planned-return.fr.md) · [Deutsch](planned-return.de.md) · [Italiano](planned-return.it.md) · [Nederlands](planned-return.nl.md) · [Polski](planned-return.pl.md) · [Português (Brasil)](planned-return.pt-br.md) · [Português (Portugal)](planned-return.pt-pt.md) · [Русский](planned-return.ru.md) · [Translation status](../translation-status.md)

---
<!-- velair-docs:end -->

The previous setup recorded by Return home includes the base Mode/Profile
selection and all per-zone Profile exceptions. Confirmed departure selects the
Away base and clears exceptions; a completed arrival selects the destination
base. Cancelling a confirmed episode through Return home's Cancel action restores
the complete recorded selection, including its exceptions, when its references
remain valid. An external Profile/Mode selection instead cancels the pending
return and applies the requested selection. It does not restore the previous
setup. See [base and zone exceptions](climate-profiles.md#a-base-with-independent-zone-exceptions).

Planned Return prepares the home for a regular or one-off arrival time after
the selected occupancy signals confirm that the whole home is empty, or after
an explicit one-off start when no occupancy sources are configured. Configure it in Velair;
no additional blueprint or daily action is required for a stable weekly routine.
The automatic routine is disabled by default and runs locally in Home Assistant.
One-off returns need saved Away/Return Modes and operational Automatic scheduling;
occupancy sources are optional for explicit starts. The weekly routine requires
at least one occupancy source.

## Setup

**Away and return** contains shared settings for one-off returns and the weekly
routine. Absence detection takes effect for a started one-off return or when
the saved weekly routine is enabled. These fields do not define a separate
always-running Home/Away automation. The confirmation time measures continuous
detected absence, not elapsed time since saving the configuration. The Away
Mode is applied after departure is confirmed; eligible rooms may prepare before
the destination Mode is applied at arrival.

Without occupancy sources, starting a one-off return applies the Away Mode
immediately and does not use the confirmation delay. The settings show this
exception beside the delay when no sources are selected.

Destination **Temperature only** blocks retain external control of the HVAC
mode. Planned Return does not turn an off climate on to prepare such a block;
that room cannot be promised ready on arrival while it remains off. Use an
explicit **Heat** or **Cool** destination block when return preparation should
start the equipment. Selecting the destination at arrival still respects the
block's policy.

1. Create the desired Away and Home Modes, or use Default as the destination.
   Away Profiles can turn climates off or use lower-demand weekly schedules.
2. Open **Preconditioning**, choose **Planned Return** in the subsection selector,
   and add occupancy signals for monitored or weekly departures. Use binary sensors, input booleans, groups or the
   Home Assistant home zone (`zone.home`). Include signals for anyone who can
   remain in the home, including guests. Home Assistant remains responsible for
   tracking people and locations; complex rules can still be combined in a helper.
3. In **Away and return**, choose how long the home must remain empty, which
   Away Mode to activate and which destination Mode to use when you return.
   The default delay is ten minutes; the compact control accepts minutes or
   hours. Arrival is acknowledged immediately. The destination Mode's help
   explains adaptive preparation and operation at arrival without a valid estimate.
4. In **Arrival times**, enter the usual time for each applicable weekday.
   Weekly arrivals apply to the day the home becomes empty. Days without a time
   use Away after absence confirmation and restore the destination when occupancy
   is detected, without advance preparation. Velair uses the destination's schedule
   at arrival to prepare each zone.
5. Enable Adaptive Preconditioning for zones that should start early. Existing
   settings and local heating/cooling learning are reused.
6. Enable **Weekly routine** with its switch in the status bar, then Save.
   This activates automatic absence confirmation, Away Mode selection and the
   weekly **Arrival times**. Entering arrival times alone does not enable the
   routine. One-off returns can still be started with the switch off. The switch
   edits the draft; Cancel restores the saved setting. Stop any Home/Away automation that selects Modes
   for this same household; two controllers would compete.

Weekdays follow the **First weekday** preference saved in Velair Settings.
Enter an arrival time directly for each day. If you leave on a day without a time,
Velair applies Away after absence confirmation, schedules no advance preparation,
and restores the destination when occupancy is detected. The Home Assistant time
zone is shown beside the weekly routine. Changes remain in the draft until you
save. Cancel and Save are at the
right of the configuration footer.

The top summary groups three parts of the routine in separate bordered containers
matching the settings sections, without an enclosing card or shared side rule. The weekly routine shows the
Away Mode, absence confirmation delay, adaptive preparation and destination Mode
as a simple flow; the switch edits the routine's enabled setting. The delay is
the time the home must stay empty, not an estimate of preparation time.
The occupancy section shows the combined result and source counts; expand it to
review each signal. Unknown signals prevent a new absence and are distinguished
from confirmed presence. The quick return section keeps the one-off departure and
the current episode's arrival controls together. Runtime actions use the saved
configuration, so save or cancel pending configuration changes before announcing
a new departure.

The form groups occupancy sources, absence delay, Away Mode and destination Mode
in **Away and return**. On wide containers, the delay and both Modes share a row.
On tablets, the delay sits above the two Modes; on mobile, all three controls stack
in that order. Each control keeps its help beside it. **Arrival times** contains
only the weekday time fields, their explanation and the Home Assistant time zone. Presence sources
use the block editor's circular green Add action when a source is selected.
Disabled Add and Remove keep their transparent appearance; enabled actions have
hover and focus feedback.
The configured source list starts collapsed. Its summary shows the total and
counts of occupied, empty and unknown signals; expand it to review or remove
individual sources. On mobile, the summary spans the whole selector and Add row;
state icons and numbers keep the counts together, with full accessible labels.
The state counters align to the summary's trailing edge. On mobile, the expanded
list shares the summary width, with Remove at the end of each row and more room
for names and IDs. Desktop lists match the selector width. Expanding the list does not
change the configuration.
Delays entered in hours are rounded to the nearest minute; the equivalent delay
is shown beside the control.

Recognized occupied states are `on` and `home`; empty states are `off` and
`not_home`. For the home zone, zero persons means empty and a positive count
means occupied. Any occupied signal makes the home occupied; only all signals
reporting absence make it empty. If no signal reports presence and one is unknown
or unavailable, occupancy is unknown: new absences cannot start. An accepted
return remains scheduled. The panel shows the combined result and each source.

Select signals that represent occupancy: a motion sensor being off does not
necessarily mean nobody is home.

## Room Preparation

Expand **Room preparation** beneath the routine flow to see every managed climate.
The list starts collapsed. Without an accepted future return, its counts describe
saved capability: advance preparation, arrival-only operation and no preparation.
For an accepted return, the shared summary counts rooms waiting to prepare,
preparing, at target, suspended, unavailable or set to act at arrival only.
It shows the saved arrival and the earliest eligible estimated start when available;
individual rooms may start at different times. Expanding the list does not change
settings or send climate commands. The same overview applies to weekly and one-off
returns.

Each row identifies the room, its destination schedule source and preparation
status. A climate absent from the destination Mode's Profiles still uses its
**Default** schedule; an explicit normal behavior also uses Default. A Profile
schedule uses that Profile's name. A destination Profile pause, disabled zone or
external execution is identified separately rather than labelled arrival-only.
Without Adaptive Preconditioning, a local enabled room follows its effective
schedule at arrival; it is not automatically excluded from Mode changes.

Without a future return, this list describes saved configuration capability,
not a prediction that the room will start early. Once a return is accepted, it
resolves each destination target at that arrival time and shows pending,
preparing, target reached, suspended or unavailable status with the relevant
reason. Missing temperature data or a valid estimate prevents advance preparation;
Boost, Manual adjustment and explicit pauses retain their normal priority.
An unconfirmed departure cannot be shown as preparing.
**Preparing** describes Velair's active preparation intent, not confirmation that
the device received a command or is physically running. **Target reached** is a
current measured temperature within the preparation tolerance and can already be
true before departure; it does not start an absence or bypass confirmation.

**Planned start** is an estimate, not proof of a climate command or physical
readiness. Targets support heating, cooling and temperature ranges. Completed,
cancelled and skipped returns revert to configuration information instead of
showing obsolete preparation times. Diagnostics continue to use the backend's
saved settings until Save succeeds, without an additional preparation reminder.
This comprehensive list replaces the older episode-only zone list.

## One-Off Return

In **One-off return**, choose a future arrival date and time and choose **Plan return**.
Date and time sit together. On mobile, **Plan return** sits on the next row,
aligned with the time field's right edge; larger layouts keep the action beside
the fields. The explanation is below the controls.
You can do this before leaving or when already away. Velair
uses the saved Mode and presence settings. With configured occupancy sources,
it keeps the request pending and applies Away only after every source reports
absence for the confirmation delay, protecting people who remain at home.
With no saved occupancy sources, pressing **Plan return** is your explicit
departure confirmation: Away starts immediately, with no absence delay. Velair
does not infer an empty home or detect your physical return in this case; it
prepares rooms normally and activates the destination at the saved arrival.
A configured unknown/unavailable source still waits; a missing entity cannot
be treated as an empty source list.

The one-off date and time override the weekly time for this absence only. It also works
with the automatic routine disabled. You can change or cancel the pending notice;
if departure is not confirmed before its arrival time, it expires without changing
Modes. If all sources already indicate absence and there is no active episode,
planning the return starts the configured confirmation delay immediately; no
new sensor change is required. If an absence is already active, change the
arrival date and time using the episode's existing editor;
this makes the return a one-off exception without applying Away again.
Postponing an arrival ends its previous preparation and restores the current Away
behavior until the new preparation becomes due. Boost and manual overrides remain
protected. The destination target is resolved on the selected local arrival date,
including when preparation begins the previous day. Submitting the same instant
does not reset preparation. Past or current arrivals and nonexistent daylight-saving
wall times are rejected; a repeated wall time uses its earliest future occurrence.

Completed, skipped and cancelled episodes remain latched for the automatic
routine until occupancy is detected, so an empty home does not start another
weekly departure by itself. You can explicitly choose **Plan return** after any
inactive episode without waiting to be home. The new request uses the current
presence sources and Modes. With sources, it confirms absence again for the
configured delay even if everyone is already away, without immediately changing
the Mode. With no sources, explicit registration activates Away immediately. Both the sidebar and dashboard card show a fresh planning form as soon as an
episode becomes inactive. If planning is unavailable, the form remains visible
with **Plan return** disabled and an explanation of the required saved settings
and scheduler state. An active return can still be cancelled in that situation.

After confirmed departure, use **Cancel** to stop the return and restore the
recorded previous Mode and Profiles, or **Change arrival** to update its date
and time. During absence confirmation, cancelling leaves the active selection
unchanged because the Away Mode has not been applied. Disabling the automatic routine or editing weekly times
does not cancel a manual return. Changing its presence sources or Modes invalidates
the previous notice. Explicit Mode/Profile selections cancel pending and active
returns. A stopped scheduler does not execute the return.

The first row keeps the One-off return title on the left and card-only occupancy
indicators on the right. The current phase
is a compact subtitle attached to the title, without a separate pill or row.
During confirmation the timer process heading supplies the phase instead. The
dashboard card groups occupancy counts at the top right when sources are
configured. Without sources, counters and the unused delay icon are omitted,
and the sidebar reports **Not monitored** rather than unknown occupancy. The
confirmation-delay icon appears only before an active absence is confirmed; it
is hidden during Away/Preparing and active errors with a confirmed departure.
The sidebar does not repeat those indicators. Hover it for a short explanation of that phase.
During absence confirmation, a light timer row explains that Velair is checking
whether the home stays empty. **Until** shows the backend confirmation deadline
in Home Assistant local time, including the date if it differs from today.
Velair activates the Away Mode after confirmation only if every selected source
still indicates absence. This is a deadline, not a live countdown or a confirmed
departure. The same process appears while the weekly routine is confirming an
absence before an episode exists; missing deadline data does not invent a time.
Before departure is confirmed, an arrival icon and **Expected arrival** label identify the saved
return, with an accessible label and tooltip. This row aligns with the title
and state text. Its saved date/time is a compact clickable chip, without a
pencil or underline. The confirmed timeline uses the same icon; its saved
arrival date/time is a darker field-like edit surface, with the same typography
as the departure date. Select that value to open the inline date/time
editor. Its action row has a blue **Back** button with a left arrow on the
left and green **Change arrival** on the right. Back discards unsaved arrival edits and closes the editor without changing the return.
On a wide sidebar panel, the arrival editor stays compact and aligns with the
arrival endpoint; the change action stays on the right below the editor. Narrow screens and the dashboard card retain their responsive layout.
Inputs stay hidden until requested. **Back** restores the latest saved arrival
and hides the inputs. It clears the arrival warning and navigation guard;
independent unsaved routine configuration remains protected. Reopening starts
from the saved arrival. During a confirmed absence the timeline's
arrival endpoint is that same edit button, so there is no duplicated arrival.
Cancel appears below the episode content on the left only while
the arrival editor is closed. While editing, Cancel is hidden and **Change arrival**
is on the right and **Back** is on the left, discarding the arrival edit locally. Changing the input
does not change the planned return until **Change arrival** succeeds. Successful
changes close the editor and return focus to the saved arrival. Failed changes
and sensor updates preserve the open draft.
An unsaved-change notice identifies a pending edit, and navigation or reload warns
before discarding it. Saving routine configuration does not apply an arrival edit.
Back and Change arrival use compact blue and green filled surfaces, respectively.
Their visible surfaces are 32 pixels high inside 44-pixel touch targets. Cancellation uses a compact
red filled surface with white icon/text below the episode data. Its visible surface is
32 pixels high, inside a 44-pixel touch target; hover and focus remain clear. Foregrounds adapt to the theme so text and icons remain readable.
Unavailable actions use a neutral background and muted text and icons, with a
not-allowed cursor. Change arrival gains its green color when the arrival is edited.
The phase stays attached to the title. Cancel stays left below the data when
not editing; Change arrival is right-aligned below the open editor. Both the
sidebar and card preserve this grouping on mobile. Plan return remains right-aligned on the fresh planning form.
Successful actions update the episode without an additional saved message.
### Home Assistant Actions

Automations, scripts, and dashboards can announce a departure using
`velair.start_planned_return`. Both `return_date` (`YYYY-MM-DD`) and
`return_time` (24-hour `HH:MM`) are required. Together they must identify a future
arrival in Home Assistant's time zone. The native time selector may send
`HH:MM:00`; zero seconds are accepted and normalized to minute precision.
Choose a future date for the following example:

```yaml
action: velair.start_planned_return
data:
  return_date: "2026-10-09"
  return_time: "19:25"
```

This uses the saved presence and Mode settings and the same confirmation,
preparation, and override behavior as **Plan return**. It works while the weekly
routine is disabled and updates the arrival date and time if an absence is already
active, without applying Away again. Saved Modes and Automatic scheduling must be operational. Sources are optional
for one-off returns: an empty saved source list applies Away immediately;
configured sources retain the normal confirmation rules. An arrival in the past or at the current instant
is rejected without replacing the previous return.
An expired or nonexistent daylight-saving time is rejected; during a repeated
hour Velair chooses the earliest occurrence that is still in the future.

Cancel a pending or active return:

```yaml
action: velair.cancel_planned_return
data: {}
```

The same cancel action also closes an inactive episode notice. It stops
preparation and the timed return, retaining the automatic cancellation latch.
After confirmed departure, it restores the Mode and exact Profile selection
saved before the episode started. During absence confirmation, it leaves the
current selection unchanged. A fresh explicit **Plan return** can replace that
inactive episode. Both the sidebar and card use this same cancellation action.

## Cancelling a Return: Examples

The absence confirmation delay happens **before** the Away Mode is applied.
Cancelling during that delay does not need to restore anything: the previous
Mode and Profiles are still active. Cancelling after confirmed departure
restores the selection recorded at the start of that episode, rather than
activating the configured Return Mode immediately.

For the following examples, assume:

- **Comfort** is active, selecting the **Living room comfort** and
  **Bedroom comfort** Profiles.
- The Away Mode is **Away**, the Return Mode is **Evening**, and arrival is
  planned for 18:00.
- Occupancy sources report an empty home at 13:00 and the confirmation delay
  is five minutes.

### Cancel before confirmation finishes

| Time | What happens | Selected Mode and Profiles |
| --- | --- | --- |
| 13:00 | Start a return. Velair checks that the home stays empty until 13:05. | Comfort and its two Profiles remain active. |
| 13:02 | Select **Cancel** while absence is still being confirmed. | Comfort and its two Profiles remain active; Away was never applied. |

The planned 18:00 arrival is withdrawn. There is no later Away or Evening
activation from this cancelled episode.

### Cancel after departure is confirmed

This is a separate episode using the same starting configuration:

| Time | What happens | Selected Mode and Profiles |
| --- | --- | --- |
| 13:00 | Start a return and begin confirmation. | Comfort and its two Profiles remain active. |
| 13:05 | Every configured source still reports absence. | Velair applies Away and its Profiles. |
| 13:10 | Select **Cancel**. | Velair restores Comfort and the original two Profiles, then withdraws the arrival. |

The result is Comfort, **not** the configured Evening Return Mode. If
preparation for Evening had already started, cancellation also removes that
preparation and restores the original selection. Active Boosts, Manual
adjustments and independent pauses keep their priority.

### Start without occupancy sensors

With no configured occupancy sources, **Plan return** applies Away immediately.
There is no five-minute confirmation step. Cancelling that active return
restores Comfort and the two Profiles recorded immediately before starting it.
A configured sensor that is unknown or unavailable does not count as having no
sensors: it continues to block a new absence confirmation.

### Default, arrival edits and restart

If the episode starts from **Default** with no active Profiles, cancellation
after confirmed departure returns to Default with no active Profiles. A manual
combination of Profiles is restored in its original order.

Changing arrival from 18:00 to 19:00 or restarting Home Assistant does not replace
the recorded previous selection. Cancelling still restores the selection from
before this episode started. It does not recover past device temperatures or
HVAC states: the restored selection uses its current schedules, subject to
existing overrides.

### Choose another Mode instead of cancelling

If you explicitly select **Eco** while a return is active, that selection
withdraws the return and keeps Eco. Velair does not restore Comfort later when
occupancy changes or the terminal notice is closed. This preserves your explicit
choice; it is a different action from the episode's **Cancel** button.

### Distinguish the controls

- **Cancel** in the return controls withdraws the episode as described above.
- **Back** in the arrival editor discards unapplied arrival edits; the saved
  return continues.
- The generic climate card action pane's **X** closes that pane without
  cancelling the return.
- **Cancel** beside the routine's configuration **Save** discards unsaved
  settings, rather than cancelling an episode.

For older episodes without a recorded previous selection, or if the saved
Profiles are no longer valid, see [the restoration limits](#restoration-limits).

## Daily Behavior

For example, configure Monday through Friday at 18:15. After the home remains
empty for the confirmation delay, Velair activates Away and resolves the Home
schedule at 18:15. Each zone uses its own preparation estimate. A zone that needs
an hour can start at 17:15 while a faster zone starts later.

The target is the block effective **at arrival**, including weekly continuity.
If Home requests 17 degrees before 18:00 and 21 degrees afterward, a return at
18:15 prepares 21 degrees even when preparation starts before 18:00. The weekly
schedule is not edited or populated with temporary blocks.

At the expected time, Velair selects the destination and continues its ordinary
schedule. An early occupied report selects the destination immediately. A late
arrival does not switch the home back to Away. Pauses, Boost, Manual adjustment,
disabled zones, and a stopped scheduler keep their existing delivery gates.
Preparation supports heating, cooling, and native temperature ranges. It aims
to bring the room close to the target; it cannot guarantee an exact temperature.

### Preparation And Room Assist

The destination Mode defines the configuration needed at arrival. Each zone
starts at its own estimated time; the whole Mode is selected at arrival, rather
than when the first zone starts preparing. Zones that have not started yet
continue following the Away schedule.

Once a zone starts preparing, its temporary arrival target takes priority over
later blocks in the Away schedule. For example, with a ten-hour absence and a
return at 19:25:

| Time | Target for this room |
|---|---|
| 09:25, absence confirmed | Away requests 16 degrees |
| 16:25, this zone starts preparing | The arrival schedule requests 21 degrees |
| 17:00, an Away block requests 18 degrees | Preparation continues toward 21 degrees |
| 19:25, planned arrival | The destination Mode starts its normal schedule |

An Away schedule block does not cancel the zone's return preparation. This
priority also applies to cooling and temperature ranges.

If Room Assist is enabled, it follows the same temporary arrival target. In this
example it helps the room reach 21 degrees, rather than correcting it back toward
the Away target of 16 degrees. The setpoint sent to the climate may differ from
21 degrees because Room Assist compensates for differences between the room
sensor and the climate's own reading. Queued corrections are revalidated against
the current target before delivery.

A user's direct temperature change follows the zone's external-adjustment
policy. **Keep automatic** reapplies the current authoritative target, which
during preparation is the arrival target. A **Manual adjustment** hold suspends
automatic delivery and Room Assist for that zone while the hold is active.
Boost and explicit zone pauses retain their existing priority; they do not cancel
the whole household return. See [Room Assist](room-assist.md) and
[Manual adjustment](manual-control.md).

## Exceptions And Restarts

The Planned Return subsection shows the accepted return, each zone's preparation,
and the saved routine together. Open it directly with
`/velair/preconditioning/planned-return`; `/velair/preconditioning/preconditioning`
opens Adaptive Preconditioning, which is the tab's default subsection. Adjusting the
arrival time changes only this absence, not the saved week. **Cancel** removes
preparation and the automatic destination change. Before absence is confirmed,
it leaves the active selection unchanged; after confirmation, it restores the
Mode and Profiles recorded before this episode started.

An explicit Mode or Profile selection cancels the episode's automatic return.
A later presence report or restart must not overwrite that selection. Velair
remembers completed or cancelled absences until the home is occupied again.

This explicit selection also cancels preparation already running for the episode,
including when the selected Mode or Profile configuration is already active.
It differs from a scheduled temperature change inside the Away Mode, which does
not cancel preparation. Neither the sidebar nor card includes Skip, I'm home
or Close buttons; the shared return controls are Cancel and Change arrival. The
backend retains separate skip and arrival operations for API consumers; their
contracts are documented in the [developer API](../developer/api.md).
The `velair.cancel_planned_return` action cancels a pending or active confirmed
return, or closes an inactive episode notice. Cancellation stops preparation and
the timed return and prevents automatic restart for this absence. For a
confirmed departure it restores the saved previous Mode/Profile selection; for
a pending confirmation or terminal notice it does not change the selection. A fresh explicit **Plan return** can still start a new episode.

### Restoration limits

For a one-off return, Velair records the selection when you select **Plan
return**. For the weekly routine, it records the selection when absence is
confirmed, immediately before applying the Away Mode.

The previous selection survives arrival edits and Home Assistant restarts. This
restores Profile selection, not historical temperatures or device states; the
restored Profiles use their current schedules and existing override priorities.
If the previous Mode was removed or changed, the original Profiles can be
restored as a manual selection. If a saved Profile is missing, invalid or
conflicts with another saved Profile, cancellation still succeeds but retains
the current selection and reports that restoration was unavailable. Episodes
created before this restoration metadata existed retain the current selection,
because Velair cannot infer their previous one.

On restart, pending one-off notices and confirmed absences are recovered instead of starting again. An
unconfirmed absence starts its confirmation delay again. A sensor that reports
occupied reconciles the previous absence even when the arrival happened while
Home Assistant was offline.

## Limits And Backups

- One whole-home routine is supported. Weekly arrivals remain same-day: a
  departure after today's time, or on a day without a time, activates Away
  without scheduling tomorrow's return. One-off returns may use any future date.
- Calendars, rotating shifts, and automatic overnight routines are not interpreted.
- Without enabled preconditioning, a temperature reading, or a thermal target,
  the destination still changes at arrival but that zone does not prepare early.
- Transitions affecting externally executed zones are rejected before changing
  the Mode; Velair does not take local control from their controller.
- The existing generic Home/Away blueprint is unchanged and remains useful for
  other installations and actions.
- Portable backups include the routine's configuration, not occupancy episodes
  or timers. Imported routines stay disabled until explicitly enabled.

See [Climate Profiles](climate-profiles.md), [Adaptive Preconditioning](adaptive-preconditioning.md),
and [Manual adjustment](manual-control.md) for the underlying controls.

## Overview and Diagnostics

Overview displays a compact household summary during a weekly or one-off episode
or when an incidence needs attention. It identifies the origin and state, and
shows the confirmation deadline or expected arrival where applicable. For an
accepted return, compact icon counters provide preparation counts with help on
hover, keyboard focus or tap. A confirmed departure adds a read-only timeline
with departure and arrival times, the Modes selected for those endpoints and
estimated preparation points for each eligible climate, with a matching color
and name in the legend below. Each legend entry also shows its estimated
preparation start beside the name on the same line, using Home Assistant's time zone and time
format; starts on a later date include the date. Preparation dots match the legend's 8px circles;
a neutral vertical tick identifies the current time. The legend stays on one
line by default: long names are shortened visually, and the "+N climates" button
expands the remaining rooms into additional rows inside the summary. Select
"Show less" to restore the single-row legend. Each room retains its color and
full-name/estimated-start helper, available by hover, focus or tap. Expanding
and collapsing the legend does not navigate or change the planned return.
Only adaptive preparation with a valid start
estimate is plotted; arrival-only, suspended, already-at-target and unavailable
rooms are excluded. Overlapping points share a circle divided into equal colored
sectors, one per climate. Hover, focus or tap a point or legend entry to see each
room's estimated start time. These are current estimates, not a history of actual
device activity. The timeline sits beside the summary when
space permits and moves below it in narrower containers. It measures elapsed
absence time, not thermal progress. Select the summary outside its helpers to open this
feature's full detail in Preconditioning; the helpers do not navigate or
change the return.

**Next events during an active return**

Overview and dashboard next-event cards show the next projected control change
for each climate, with its source identified as the weekly schedule or Planned
Return. A weekly action before the preparation start remains eligible. Once
return preparation owns a climate, its next transition is arrival rather than
an unrelated Away schedule block, even when the room has reached its target.
Climates without return intervention retain their weekly events.

Preparation starts are estimates based on current measurements. Arrival may
change temperature, HVAC options, switch off, or activate a paused Profile;
it is not necessarily a temperature command. Boost, manual control and pauses
keep their existing priority. Suspended rows explain the blocker and show a
known expiry only when all active blockers have one; the expiry does not promise
that preparation will start then. Rows use the same compact layout for weekly
and return events: climate name, short source label, times, action and HVAC mode.
The information helper at the end of each row provides the full phase, arrival
Mode, suspension reason/known expiry and current weekly event reference when
return takes priority. Open it by hover, keyboard focus or tap. No state subtitle
is added below the climate name. Column widths are shared across all rows and
fit the widest displayed value, avoiding fixed empty space in time, action and
HVAC columns. Narrow lists retain single-row events with
horizontal scrolling and a sticky climate-name column; event data does not
move to an additional row.

These predictions do not confirm device delivery and do not change execution.
The existing next-event sensors and dedicated weekly anticipation views retain
their weekly meaning. Install matching integration and frontend updates to see
the effective forecasts; an older backend continues to provide weekly events.

A violet signal on a climate identifies current Planned Return authority. The
existing operating state remains visible: this signal explains the origin rather
than replacing heating, cooling, paused, scheduled or preconditioning status.
Future start estimates are labelled separately. Manual control, Boost and
independent pauses retain their priority. Away attribution covers the episode's
effective Away Profiles, or Default when explicitly selected as the Away Mode;
it does not cover an unmapped climate merely retaining its Default schedule.
Preparation can legitimately use the destination's Default fallback when the
backend selects that climate's arrival target.

Overview zones show one compact return indicator alongside their existing
Profile and comfort indicators: the room's preparation state and arrival
temperature or range, when available. The helper covers the full indicator and
opens by hover, keyboard focus or tap. It explains the state, estimated start,
arrival time, suspension or availability reason and current return control
attribution, without adding a multi-line preparation panel to the zone.
A room still following Away can therefore show its future preparation without
claiming it already controls the room. Missing estimates are not invented;
completed, cancelled and skipped returns do not retain an active preparation
preview. Climate cards retain their existing detailed preparation presentation.

Diagnostics shows current household state, per-climate control origin and
preparation status, including why preparation is suspended or unavailable. The
Planned Return history category records meaningful accepted transitions without
duplicate entries from refreshing the panel. Its entries share the existing
100-event runtime limit and are cleared on restart. Saved category preferences
are retained. Downloaded reports include this information and remove operational
Mode and Profile identifiers. Control intent and delivery success remain separate.

## Dashboard card

The optional Lovelace card shows the compact One-off return controls. Its
header includes occupied, empty and unknown source counts and the saved absence
confirmation delay. An accepted return shows compact preparation-state badges;
their hover, keyboard and touch helpers retain the room counts, arrival timing
and earliest eligible estimated start. The household timeline uses the panel's
graphic: matching date typography, a dark editable arrival field, a neutral Now
tick and individual eligible climate preparation points. Its legend initially
occupies one line, expands inside the card with +N and collapses with Show less.
Mode labels remain below the rail. Each climate's name and estimated start
remain accessible through point and legend helpers. Contextual helpers also
explain the departure time, arrival icon, current phase, presence counters and
confirmation delay using hover, keyboard focus or tap. Presence help lists the
matching configured source names. The arrival field remains an edit button;
its information helper is on the adjacent arrival icon. Weekly
configuration, the source list and the full room preparation list remain in the
sidebar. Configure the household in the sidebar first.

```yaml
type: custom:velair-card
view: planned-return
```

Select **Planned return** in the visual card editor. The card operates on the
same persisted episode as the sidebar and other cards. It supports future
return dates and times. Active episodes offer **Cancel** and **Change arrival**;
Cancel stops the accepted return and restores the recorded previous Mode/Profile
selection after confirmed departure; during confirmation it leaves selection
unchanged. After
completion, cancellation or any other inactive episode, the card shows a fresh
planning form without waiting for household occupancy to change. Invalid saved
configuration or a stopped scheduler disables planning and changes, but an
active return can still be cancelled. The sidebar uses the same buttons and
episode lifecycle; weekly configuration and its enable switch remain there.
Only the trailing source/delay indicators are exclusive to the card; the
sidebar and card share the title-attached phase subtitle, arrival editing and
timeline. During confirmation, the timer process block replaces the subtitle.
This household view has no thermostat filter.

The **Climate: status and control** card can also expose **One-off return** as a
Velair-provided quick action alongside Boost and Pause. Enable it in that card's
action editor, choose whether to show its name, or place it in More. The editor
groups Boost, Pause and One-off return first, even when they are disabled.
It opens these same compact controls in the lower control pane, with a plain
heading matching Boost and Pause. All three forms use the existing compact 38-pixel field height.
An active departure uses the refined timeline from the Planned Return tab:
matching departure/arrival typography, a darker editable arrival surface, a
neutral Now tick and a preparation point only for the card's selected climate.
The pane omits preparation-state badges and shows the selected climate's name
and estimated preparation start in the legend. If that climate has no
valid current advance-preparation estimate, the timeline is replaced by a brief
explanation: arrival-only control, target reached, suspension and its reason,
unavailable preparation or a missing estimate. Another climate's estimate never
substitutes for the selected room. The saved arrival remains editable and
cancellation remains available even without a timeline. Presence indicators
remain in its header. This action controls the household return, including
other managed climates; it is not limited to the climate shown by the card.
Repeated countdown paragraphs and the first-start disclosure are omitted.
The dedicated household Planned Return card shows the same graphic for all
eligible managed climates and retains its household state badges and legend.
The pane's X closes
the controls without cancelling the departure. Closing with unsaved arrival
changes asks whether to discard them; closing is blocked while an action runs.
This action always controls the household, regardless of the selected climate.
Existing card configurations keep it hidden. New cards created from Home
Assistant's card picker include it enabled; YAML configurations must opt in with
`type: planned-return` in `climate_actions`.

During **Away** and **Preparing for arrival**, the card shows the confirmed
departure and the saved arrival with the episode's Away and Return Mode names.
A current-time indicator, identified by its **Now** helper, advances according to elapsed UTC time, including across clock
changes, and stays within the bar. Endpoints include dates when their Home
Assistant calendar dates differ. Unsaved arrival edits do not change this bar.
Pending and terminal states, or episodes without a confirmed departure timestamp,
keep a static status without a timeline. Both the sidebar and card update their local clocks once
per minute only while visible and active, and immediately after becoming visible;
this display refresh never requests backend data.

In the Planned Return tab, the timeline omits preparation counters and the
multi-line countdown summary, since room states are already explained above. Saved
departure and editable arrival times sit above the rail. Both dates use the same
typography. The arrival date
appears in a darker field-like surface that opens the editor when pressed,
without a pencil icon or link underline. Away and destination
Mode labels sit below it. A neutral vertical tick shows Now at the end of the
elapsed segment. Eligible climates have small colored preparation points and
a matching legend showing each name and estimated preparation start, with
their own estimated-start helpers. Overlapping points
share a segmented circle. The legend expands inside the panel on request and
can be collapsed again. Suspended, reached, arrival-only and unavailable climates
remain represented in the Room preparation details above rather than receiving
invented timeline points. The household card retains its preparation-state badges.
The detailed Room preparation section remains available above; the timeline
does not repeat the first estimated start in an additional disclosure panel.
Changing the saved arrival or destination resets the legend expansion and
discards stale estimates. Editing an arrival draft does not alter the saved
projection. The existing cancellation and arrival-edit controls are retained.

Dashboard controls use this same graphic. The household card retains state
badges because it does not include the tab's full preparation section. It keeps
all current eligible climate points, while the embedded climate-card action
shows only its selected room, with its name and estimated start in the legend.
Date/time edit fields retain
their compact sizing and existing Back/Change controls. Opening the arrival
editor leaves the accepted timeline unchanged; Back restores the saved arrival.
Accepting a different arrival or destination resets household legend expansion
and discards stale estimates. Suspended, reached, unavailable and arrival-only
rooms do not receive preparation points. A point outside the departure boundary
is positioned at the edge while its helper retains the actual estimate.
Elapsed progress measures time toward arrival, not thermal progress. When a
household estimate is unavailable, its preparation helpers explain the known
state without implying that preparation is disabled.
