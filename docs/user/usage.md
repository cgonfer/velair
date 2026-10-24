# Usage Guide
<!-- velair-docs:start -->
Translations: [English original](usage.md) · [Español](usage.es.md) · [Français](usage.fr.md) · [Deutsch](usage.de.md) · [Italiano](usage.it.md) · [Nederlands](usage.nl.md) · [Polski](usage.pl.md) · [Português (Brasil)](usage.pt-br.md) · [Português (Portugal)](usage.pt-pt.md) · [Русский](usage.ru.md) · [Translation status](../translation-status.md)

---
<!-- velair-docs:end -->

This guide explains Velair from a Home Assistant user's point of view.

## Panel navigation and direct links

The sidebar panel updates its URL when you change tabs or switch between the
Schedules and Templates subsections. Refreshing or opening a copied URL restores
that section. Browser Back and Forward also follow this navigation.

| Section | Path |
| --- | --- |
| Overview | `/velair` |
| Schedules: Default | `/velair/schedules/default` |
| Schedules: Profiles | `/velair/schedules/profiles` |
| Modes | `/velair/modes` |
| Templates: Templates | `/velair/templates/templates` |
| Templates: Climate presets | `/velair/templates/presets` |
| [Supply control](shared-climate-supply.md) | `/velair/supply-control` |
| Sensors | `/velair/sensors` |
| Comfort | `/velair/comfort` |
| Preconditioning | `/velair/preconditioning` |
| Planned return | `/velair/planned-return` |
| Diagnostics | `/velair/diagnostics` |
| Settings | `/velair/settings` |

Use these paths in Home Assistant dashboard navigation actions, or append them
to your Home Assistant address to create a full link. Opening a link selects a
section; it does not activate a Mode or change climate settings.

For example, a dashboard button can open the Climate presets library:

```yaml
type: button
name: Velair climate presets
icon: mdi:thermometer-lines
tap_action:
  action: navigate
  navigation_path: /velair/templates/presets
```

Change `navigation_path` to any path in the table. This uses Home Assistant's
standard [dashboard navigation action](https://www.home-assistant.io/dashboards/actions/).
For a bookmark or link from another application, use your own Home Assistant
address followed by the path, for example
`https://your-home-assistant.example/velair/schedules/profiles`.

`/velair/schedules` opens Default and `/velair/templates` opens Templates.
`/velair/preconditioning` opens Adaptive Preconditioning and
`/velair/planned-return` opens the separate Planned return tab. Former
Preconditioning subsection links still open the corresponding tab.
`/velair/overview` opens Overview, and the legacy `/velair/profiles` path opens
Modes. An unknown subsection opens its tab's default subsection; an unknown tab
opens Overview. These paths are normalized without adding a history entry.

Links do not preserve an individual climate, weekday, Profile, template, or
preset selection. Unsaved edits are not recovered after a refresh. Existing
discard confirmations apply when navigation would discard unsaved changes;
cancelling keeps the current section and URL. Optional Lovelace cards keep their
dashboard URLs.

While the sidebar panel is open, its tabs share the latest confirmed backend
data. After the first load, switching tabs does not repeat that initial load.
Updates continue during navigation, and existing unsaved-edit confirmations
still apply. Refreshing the page loads data again and does not recover drafts.
Optional Lovelace cards use a separate session from the panel. Mounted cards on
the same Home Assistant connection share their initial data load and live
updates, while keeping their own controls and unsaved edits. Lovelace may keep
cards mounted when you visit another dashboard view, allowing you to return
without loading them again. The shared session closes when the last card is
unmounted; refreshing the page starts a fresh load. No YAML changes are needed.

## Help and documentation

Open **Settings → Help and community** to browse the documentation, report a
problem in GitHub Issues, or share questions and suggestions in Discussions.
Use the help icon beside a section heading or on the right of a submenu choice
to open a brief explanation and an **Open guide** link. Opening help on a submenu
does not select it or change your edits. The explanation and guide correspond
to that choice, including when it is not the active section. In Settings, the
help icon for **External adjustments** also offers its guide. Help icons use a
consistent question-mark symbol and become highlighted on hover; information
icons continue to provide brief field explanations.
Close the help dialog with its close button, Escape, or a click outside it;
keyboard focus returns to the help icon.

Brief explanations remain available inside Velair in all supported interface
languages, including without an Internet connection. Guide links use your Home
Assistant language when a translation is available and fall back to English per
guide. The link only shows **In English** when English is the fallback for your
language. Translated guides show their source synchronization and linguistic review
status, with a link to the English original when changes are pending. Published
release builds open documentation from their matching version tag; development
builds open the current `main` documentation. Documentation and community links open GitHub in a new tab
and require Internet access only when opened; they do not upload diagnostics or
local configuration automatically.

## Concepts

Velair manages schedules for the `climate.*` entities selected during integration setup. Each selected entity is a managed climate zone.

A schedule is made of weekday blocks. A block starts at a specific time and can:

- set a target temperature, optionally with an HVAC mode and supported climate options such as fan mode, preset mode, swing mode, horizontal swing mode, or target humidity;
- set one or more supported climate options without sending a target temperature or changing the HVAC mode;
- change only the HVAC mode and leave the target under device control;
- turn the climate entity off.

A block remains active until the next block in the weekly schedule starts. This
includes midnight and empty weekdays: before a day's first block, Velair keeps
the most recent block from an earlier day. The timeline shows this inherited
period separately so it is clear where the block was originally configured.

## External adjustments and Manual adjustment

Each zone can choose what Velair does when its HVAC mode or setpoint changes
outside Velair, for example from a Home Assistant climate card, an IR remote, or
another automation. Configure **External adjustments** inside each managed
climate row in **Settings**:

- **Keep automatic** is the default and reapplies the current Velair intent.
- **Until next block** respects the adjustment until the
  next effective block begins.
- **For a duration** resumes after the configured number of minutes.
- **Until resumed** waits for an explicit action.

While yielded, Overview selects **Manual adjustment** in its permanent
Automatic/Manual control. This is not Velair Mode **Manual**: Mode Manual describes how
Profiles were selected, while Manual adjustment describes who currently controls
one climate. Resuming reapplies the active Profile schedule, Default schedule, or
other current scheduler intent. Other independent pause reasons remain in force.

Overview selects **Automatic scheduling** while Velair owns the climate. Select
**Manual adjustment** to hold the current climate without first changing the
device; it uses the Manual policy already saved in Settings. If **Keep automatic**
is saved, an explicit Manual action stays Manual until resumed without changing
that setting. The same operation is available as
`velair.enter_manual_adjustment`; it captures the live heating, cooling, off, or
native range state and accepts only the climate entity ID.

With **Keep automatic**, Room Assist recalculates and reapplies its authoritative
target. With a Manual policy, it yields without restoring its scheduled
correction. Both scalar and native range targets are supported.

The complete guide explains detection boundaries, every policy, repeated
adjustments, Profiles and Modes, Boost and pause priority, restart behavior,
exact service/event YAML, and step-by-step real-world timelines. See
[External Changes and Manual Adjustment](manual-control.md).

Velair calculates upcoming events in the backend and schedules exact one-shot callbacks through Home Assistant. The frontend subscribes to backend updates over WebSocket, so it does not need continuous polling.

During a Planned Return episode, Overview shows a compact household summary
with the weekly or one-off origin, current process and applicable confirmation
or arrival time. It uses the usual theme card background, with a subtle violet
border and main return icon; other icons keep their surrounding text color.
An accepted future return adds preparation counts as icons with
hover, keyboard and touch help. Confirmed departures show a compact read-only
timeline with departure/arrival times and Modes, beside the summary when space
permits or below it in narrower containers. Its navigation button opens the
Planned return tab; the summary
does not duplicate the departure controls. An incidence can remain visible even
when no departure is currently running.

Each affected climate shows a violet Planned Return signal when the backend
reports current Away or arrival-preparation authority. Its normal operating
state, Profile and Room Assist information remain visible. Future preparation
times are prospective information, not an active-control signal. Manual control,
Boost, independent pauses, stopped scheduling and external execution retain their
priority. A climate that simply keeps Default scheduling under a custom Away Mode
does not acquire an Away signal. The indicator describes control intent, not
proof that a command was successfully delivered or that the room has reached its
target.

Return preparation information is separate from that authority indicator: each
climate can show its waiting, preparing, reached, suspended, unavailable or
arrival-only state, estimated start, arrival target and relevant reason even
while it still follows Away. Missing estimates are not replaced with guessed
times. Inactive returns do not retain a future preparation preview.

When a managed climate does not publish `target_temp_step`, its row in
**Settings** shows **Temperature step**. Velair uses `1` by default and lets the
user provide the device's actual positive step. Velair remembers the last valid
step reported by Home Assistant, so an entity that stops publishing it does not
invalidate existing decimal targets. A currently published step always takes
priority. Saving a manual value while the attribute is missing replaces the
remembered value as the fallback. If the entity later publishes a step again,
Velair remembers that newer grid even though the manual fallback remains stored.

The panel's **Diagnostics** section provides a read-only scheduler and per-zone
snapshot, a bounded runtime-only history, and a redacted JSON report for issue
attachments. It does not add polling or depend on Recorder.
On desktop, the runtime log columns can be resized for the current session;
their widths reset when the panel reloads and are never persisted. On mobile,
the same events use a compact responsive layout instead of resize controls.

Diagnostics also shows the household's Planned Return state and the selected
climate's effective participation, preparation estimate and any suspension reason.
A disabled weekly routine is separate from the availability of one-off returns.
The **Planned Return** history category records accepted planning, confirmation,
departure, arrival adjustments, preparation starts, completion, cancellation and
errors. It shares the existing 100-event limit and clears on restart; category
preferences remain saved. Refreshing either view does not add history entries.
Reports include this context, with Mode and Profile identifiers removed even
when entity IDs are explicitly included.

## Home Assistant Entities

Velair creates persistent Home Assistant entities that complement its transient
automation events:

- **Next scheduled event** is a timestamp sensor for the earliest
  pending Velair action. Its attributes include every event sharing that time,
  the calculated apply time, and the original target time when Adaptive
  Preconditioning starts a block early.
- **Scheduler status** describes whether Velair is idle, scheduled, overridden,
  or paused.
  Its attributes include the global mode and pause expiry. Upcoming event and
  per-zone override details remain in their dedicated sensors to avoid
  duplicating recorder history.
- **Diagnostics status** is a diagnostic enum sensor with `ok`, `warning`, and
  `error` states. It exposes only compact attributes: scheduler state, counts
  of healthy/warning/error units, issue counts, and active issue codes. This
  makes current health available to dashboards and state-triggered
  automations without exposing raw exception text.
- **Active target temperature** is created once per managed climate. It exposes
  the target Velair is currently managing, including boosts and blocks already
  started by Adaptive Preconditioning. Its unit follows that climate entity.
  For a native range, its scalar state is unavailable because there is no
  single correct value; use the `target_temp_low` and `target_temp_high`
  attributes instead.
- **Environmental condition** is created once per managed climate. It exposes
  readable states such as comfortable, cold, humid, or hot and humid. It keeps
  data quality and source entity IDs as compact attributes without copying the
  original temperature or humidity readings.
- **Ventilation opportunity** is created once per managed climate. It exposes a
  conservative, observational enum describing whether outdoor air may move the
  room toward its configured Comfort zone. It does not open windows or control
  the climate.
- **Air quality** is created once per managed climate and keeps the independent
  CO2 assessment: good, elevated, poor, unavailable, or not monitored.
- **Zone override** shows whether that climate currently has no override, an
  active boost, or an active zone pause.
- **Zone control** is created once per managed climate and exposes whether
  local control is `automatic`, a Manual adjustment is active, or an external
  schedule provider owns physical execution. Its attributes provide the
  current scheduler, Profile, Mode, and Manual-adjustment context.
- **Zone delivery diagnostics** is created once per managed climate as a
  disabled-by-default diagnostic sensor. It exposes the latest runtime-only
  climate delivery outcome and the last target whose complete service sequence
  Home Assistant accepted, without raw error text or a claim about what the
  physical device did.
- **Preconditioning start** is a timestamp sensor containing the calculated
  start for the next or currently active early-start block. Its attributes
  include the scheduled target time, lead, direction, model source, target
  temperature, and HVAC mode.
- **Room Assist** exposes the current Room Assist runtime state and compact
  target context without duplicating the original room and climate readings.
- **Automatic scheduling** and **Mode** are Velair's writable control entities.
  Turning Automatic scheduling off stops scheduling indefinitely; turning it
  on resumes the active schedule. Selecting a custom Mode activates its mapped
  Profiles, while **Default** clears the active set. **Manual** means no custom
  Mode controls the active Profile set; direct activation normally enters that
  state. Velair shows it instead of offering it as an action. Use the
  `velair.pause` action when a temporary pause with a
  duration is required.

These entities reuse backend snapshots, use dispatcher updates, and do not poll
Home Assistant. Events are useful for reacting to transitions; entities are
useful when an automation or dashboard needs to query the current state.
Room Assist can adjust the target sent after the accepted control target; use
the dedicated **Room Assist** sensor for that applied adjustment context.
See [Sensor Reference](sensors.md) for a complete list of Velair sensors with
their main attributes and examples. See
[Zone Control and Delivery Sensors](zone-sensors.md) for the deeper ownership,
Comfort, ventilation, and delivery contracts.

When a climate is removed from the Velair integration options, Velair removes
its generated zone sensors from the Home Assistant entity registry on reload.
Global Velair entities and entities belonging to other integrations are not
affected. Adding the climate again recreates its sensors with deterministic
unique IDs.

Home Assistant chooses translated entity names using the backend language when
an entity is first created. Changing only one user's interface language does not
rename existing registry entries. Existing entities can be renamed manually
from Home Assistant without changing their Velair behavior.

## Open Velair

After setup, Velair appears in the Home Assistant sidebar.

The sidebar panel is the recommended interface. The optional Lovelace card is useful when you want to embed specific Velair panels in an existing dashboard.

In Sections dashboards, Velair cards use automatic height so expanded controls,
additional zones and wrapped text reserve space above the next card. If an
existing card still overlaps another card after updating, check its dashboard
YAML: remove a numeric `grid_options.rows` override or change it to `auto`.
Saved layout options override the card's defaults:

```yaml
grid_options:
  columns: 12
  rows: auto
```

The Overview next-events list and dashboard next-event cards show the next projected control change for each managed climate, including estimated preparation and arrival transitions during a confirmed Planned Return. All rows share a compact name/source/time/action/HVAC layout, without a state subtitle under the climate name. The trailing information helper explains the phase and, when return takes priority, provides the arrival Mode, suspension details and current weekly reference. Helpers open by hover, keyboard focus or tap. Suspensions explain higher-priority blockers rather than promising a blocked start. Existing next-event sensors and dedicated weekly anticipation views retain their weekly meaning. This forecast is for user visibility; it does not change scheduler execution or confirm device delivery.

Zone overview uses compact responsive cards to answer what Velair and the
climate device are doing now in each room. When the climate entity reports
`hvac_action`, the status summary uses its live Heating, Cooling, Drying, Fan,
Idle, Off, Preheating, or Defrosting value as the main status. The same summary
then identifies Velair's scheduled, manual, boost, pause, preconditioning, or
automation-off state, the reported HVAC mode, and relevant timing without
repeating the activity in a separate signal. If `hvac_action` is missing or
invalid, Velair shows its own runtime state without inferring what the climate
device is doing. Each card presents the climate name and entity ID first,
followed by its active Profile and the ordered Room Assist/Comfort/air/data
signals. At very wide card widths these signals and the compact status summary
share the card header. In narrow cards, including mobile and compact Lovelace
layouts, the climate identity and compact status remain aligned side by side,
while Profile/Comfort signals use the full row below. Profile, return, Room
Assist and Comfort/air/data chips share compact typography and a split
icon/label-and-value layout. Return uses a subdued purple accent; Comfort
accents continue to distinguish normal, information, warning and error states.
Long signal values may be shortened visually to preserve the compact height;
their full text remains available through hover, keyboard focus or tap help.
The summary uses a consistent icon,
balanced text, and restrained activity accent without a fixed heading or
decorative outer badge. When Room Assist is active or holding, details are
grouped as
Temperature (Climate, then Sensor), Setpoint (Climate, then Scheduled), and the
direction-aware Offset. Missing values are omitted. Neutral signals stay
understated; warning color is reserved for conditions that need attention.

The Lovelace card supports these `view` values:

- `climate`;
- `overview-status`;
- `overview-boosts`;
- `overview-events`;
- `overview-timeline`;
- `overview-zones`;
- `active-setup`;
- `schedules`;
- `sensors`;
- `comfort`;
- `preconditioning`;
- `planned-return`;
- `diagnostics`.

### Planned Return card

Add the same household return controls used by the sidebar to any dashboard:

```yaml
type: custom:velair-card
view: planned-return
```

For a normal pending departure, a timer row explains the empty-home check and
shows its backend deadline in Home Assistant local time. The Away Mode activates
only after confirmation if all sources still report absence. There is no live
countdown or departure timeline before confirmation. With **Apply Away mode now**,
Away and its timeline start immediately; departure confirmation separately gates
automatic return from presence while scheduled preparation and arrival stay active.

The visual card editor calls this view **Planned return**. It shows only the
compact **One-off return** controls, with occupied, empty and unknown source
counts at the top right of the header. The saved absence confirmation
delay appears there only before a confirmed active absence. Without saved
occupancy sources, these indicators are omitted: **Plan return** explicitly
confirms departure and activates Away immediately, without waiting. The saved
arrival still controls preparation and destination activation; Velair cannot
detect physical arrival without sources. Configured unknown/unavailable sources
keep their normal waiting behavior unless **Apply Away mode now** is selected,
and the weekly routine requires sources. Set a future return date and time before leaving or
while already away. An active episode offers only **Cancel** and **Change
arrival**. Cancel stops the return automation and restores the previous
Mode/Profile selection after confirmed departure or an immediate manual Away,
even before monitored departure confirmation. Normal pending confirmation does
not change selection. For example, start from Comfort with a five-minute delay:
cancelling after two minutes leaves Comfort active; cancelling after Away is
applied restores Comfort and its original Profiles. See the
[cancellation examples](planned-return.md#cancelling-a-return-examples), including
sensorless starts, arrival edits and explicit Mode selections. Once the return finishes or is cancelled, the card shows a fresh date/time form,
even if household presence still says everyone is away. **Plan return** remains
visible but disabled when the saved configuration or scheduler is unavailable.
The sidebar uses the same Cancel/Change arrival buttons and fresh planning form.
Only trailing occupancy/delay indicators are card-specific; the sidebar retains
the complete weekly, presence and preparation configuration. Both surfaces show a
compact phase subtitle attached to the title, with contextual help explaining
the phase. During confirmation the process heading supplies that context. Before confirmed departure, an accessible arrival icon and **Expected arrival** label identify the saved
return, aligned with the title/state text; its saved value is a compact
clickable chip without pencil or underline. The confirmed graph uses a dark
field-like arrival surface with the same typography as departure, without a
pencil or underline. Either opens the same arrival editor. The blue **Back** button with a left arrow in the editor action row discards the arrival edit and closes it locally, restoring the latest saved
arrival. Its warning and navigation guard clear; independent unsaved routine
configuration remains protected. Reopening starts from the saved value. Success closes
it, while failed saves and live updates preserve the draft. Departure and arrival
values use matching typography; Cancel is a compact red filled action with white text below the episode data on
the left, shown only when an active return can be cancelled and its editor is
closed. While editing, **Back** closes the editor from the left and Change arrival stays
on the right with a compact green surface. Back and Change arrival have
32-pixel visible surfaces within 44-pixel touch targets. Card occupancy indicators stay in the header at the top right; the delay indicator disappears after confirmed departure.

Configure occupancy sources, modes, absence confirmation and the weekly
routine in the **Planned return** tab in the sidebar. The card uses
that saved household configuration; it does not expose configuration fields
or the weekly routine switch. Thermostat display filters do not limit this
household card. Dashboard and sidebar controls update the same backend episode;
arrival drafts remain local to each open card until submitted.

During a confirmed absence, saved departure and editable arrival times sit
above the timeline; Away and Return Mode labels sit below it. Departure time,
arrival icon and Mode helpers explain their meaning by hover, keyboard focus
or tap. The arrival date remains a separate edit button. A neutral vertical
Now tick marks elapsed UTC time and aligns with the end of the colored rail.
Dates appear when the endpoints are on different days in Home Assistant's time
zone. Editing an arrival draft does not move the endpoint until accepted.
Pending and terminal states, or missing confirmed departure data, have no
moving timeline. An active error episode with valid departure data retains
its timeline and cancellation. The local clock refreshes once per minute while
visible and active; it does not poll Home Assistant.

Eligible adaptive climates have individual colored preparation points and
matching legends with names and visible estimated start times, plus full-detail helpers. Overlapping points share a segmented
circle. Suspended, reached, unavailable and arrival-only rooms do not receive
points. The household card's legend starts on one line; +N expands more rooms
inside the card and Show less collapses it. Ordinary updates preserve expansion;
a changed saved arrival, destination or episode resets it. Household preparation
badges retain counts and arrival/earliest-start details in contextual helpers.
Presence counters, confirmation delay and the current phase also have keyboard
and mobile helpers. Weekly configuration, the source list and the full room
preparation detail remain in the sidebar. Estimated preparation and elapsed
time do not confirm physical HVAC operation or thermal progress.
### Climate status and control card

Use `view: climate` for a compact card dedicated to one Velair-managed
`climate.*` entity. It follows the active Home Assistant theme through Home
Assistant color and surface variables, and it adapts to light, dark, mobile,
tablet, and desktop layouts.

The card combines the device-reported temperature, humidity, HVAC mode and
`hvac_action` with Velair's current ownership and runtime data. It reuses the
same effective daily timeline, Profile icon and Profile color as the Overview
tab. Mode, Profile, Comfort, Room Assist, and preconditioning information is
shown only when it is configured and relevant. An externally executed climate
shows the external provider and publication state instead of local-only Velair
features or climate-specific actions. The optional One-off return action controls
the household and remains independent of the selected climate's ownership.

```yaml
type: custom:velair-card
view: climate
selected_entity: climate.living_room
climate_name: Living room
climate_humidity_entity: sensor.living_room_humidity
climate_outdoor_temperature_entity: sensor.outdoor_temperature
climate_window_entities:
  - binary_sensor.living_room_window
  - binary_sensor.patio_door
climate_window_display: grouped
climate_room_assist_display: both
climate_preconditioning_display: both
climate_show_control_mode: true
climate_show_target_control: true
climate_show_hvac_mode_control: true
climate_show_native_climate_link: true
climate_actions:
  - type: boost
  - type: pause
    placement: more
  - type: planned-return
    enabled: true
  - type: script
    name: Ventilate room
    script: script.ventilate_living_room
    icon: mdi:window-open-variant
    color: "#03a9f4"
    confirmation: true
    placement: auto
```

The climate control surface combines ordered quick actions with the independently
configurable Automatic/Manual selector, using the same ownership model as
Overview. Its lower pane keeps the HVAC mode, the current target when the climate
is on, and a shortcut to Home Assistant's native climate dialog together. Each
published HVAC mode is shown with its icon. Direct
changes remain read-only while Velair owns the active schedule:
select **Manual** first, wait for the Manual adjustment to be confirmed, and
then use the target and mode controls. Select **Automatic** to resume scheduling.
Boost,
independent pauses, stopped, and unavailable states block direct editing with an
explanation. The internal pause that represents Manual adjustment itself does
not block these controls.
Externally executed zones keep the native Home Assistant shortcut; an enabled
One-off return action can still open the household departure controls.

Scalar targets and compatible native ranges are supported, including ranges
in Heat, Cool and Auto on entities that only accept two setpoints. Range changes send
both boundaries together. Velair uses `min_temp`, `max_temp`, and `hvac_modes`
published by the climate entity. Target adjustments use `target_temp_step` when
published. If that attribute disappears, Velair keeps using the last valid step
it reported so existing decimal targets remain valid. A manual per-zone fallback
configured in Settings is next, followed by `1` when no step has ever been
reported or configured. It does not invent HVAC modes.

Cards created before the ordered action list used
`climate_show_boost_action`, `climate_show_pause_action`, and
`climate_custom_actions`. Velair continues to read those legacy fields, while
the visual editor writes `climate_actions` when the action list changes.

**One-off return** is another Velair-provided action. It supports the same
visibility, hidden-name and automatic/More placement options as Boost
and Pause. The editor lists the provided actions first: Boost, Pause, then
One-off return, including actions that are hidden. One-off return uses a violet
accent to distinguish it from Pause. Opening it replaces the lower control pane with the compact departure
form or the current episode's timeline and controls. Close the pane with its X
to return to the climate controls; closing does not cancel an active departure.
Unsaved arrival edits require confirmation before closing, and a pending action
must finish first. Departure settings and effects apply to the whole household,
not just the selected climate.

The Boost, Pause and One-off return panes join the toolbar's border and surface,
like the normal thermostat controls. Direct icon-only actions keep their compact
width and center their icon; opening a pane adds space for its close icon.

Existing cards keep this action hidden unless explicitly enabled. Cards created
through Home Assistant's card picker include it enabled in their initial action
list; this also applies when changing that new card's view to `climate`. A YAML
card without a `planned-return` action keeps it hidden. Enable it in the visual
editor or add the action shown above.

The editor keeps the provided actions in their fixed section and offers ordering
controls for custom actions. Opening the editor does not reorder the saved
dashboard action list.

By default, current humidity and its history shortcut use the attributes of the
selected climate entity. Set `climate_humidity_entity` to use the live value and
native Home Assistant history of a dedicated humidity sensor instead. Velair
does not infer this relationship because Home Assistant integrations do not
publish it consistently.

The outdoor temperature and window entities are optional dashboard context.
Velair does not discover, manage, or automate them through this card. Window
states are informational only, including when a separate automation or the
Velair [window blueprint](blueprints/pause-zone-for-open-windows.md)
uses those entities. Set `climate_window_display` to `grouped` or `individual`;
the visual editor provides separate checkboxes for the outdoor reading and
windows, and it does not show either section until an entity is selected.
The complete Current state heading collapses the panel when it is expanded. Its
compact readings and context use wrapping chips instead of horizontal scrolling,
so every enabled sensor remains visible at narrow widths. An available Comfort
assessment uses a separate descriptive row below the collapsed heading, with its
condition, contextual Comfort insight, icon, and state accent. The card editor
can also show enabled derived Comfort readings in that collapsed row; otherwise
those values stay in the expanded row. The Comfort row is omitted when the
assessment is unavailable. The expand control remains fixed while the chips use
as many compact rows as the available card width requires. This presentation
state is kept only for the live card session. Current state starts collapsed by
default. The visual editor can instead make it start expanded; changing that
default does not prevent manual collapse or expansion during use.

The visual editor follows the same top-to-bottom order as the card. It can
independently hide the state bar, climate name, operating
state, individual thermostat controls and actions, current temperature, humidity, outdoor reading, windows,
Comfort, optional collapsed Comfort readings, timeline, Room Assist, and preconditioning. The climate name can
also be replaced with an independent card-local label, including an empty
label, and reset to the entity's current friendly name. If every Current state
item is disabled, the complete Current state container is omitted. Omitted
visibility values default to visible so existing cards keep their current
presentation. Each visible current-temperature or humidity reading includes a
compact shortcut to its configured source's native Home Assistant history; the
shortcut is omitted together with its reading. Each configuration category can be collapsed, and individual
custom script actions stay collapsed until they need to be edited, keeping the
editor practical on narrow screens. Selecting another script refreshes that
shortcut's name from the script entity; it can then be customized again.
The Velair header shortcut is always present so the card remains identifiable
and provides a consistent way back to the integration. Every direct action can
hide its visible name and collapse to an icon-sized button; its accessible label
and its full name inside the More menu are preserved.

Quick actions share the top row of the climate control surface with the
Automatic/Manual selector. They remain in an independent island aligned to the
opposite end of the same row at every card width. If their labels exceed the
available space, every complete label keeps its natural width and that island
scrolls horizontally instead of wrapping or truncating it. Opening Boost
or Pause replaces the normal thermostat pane in place, and either Cancel or a
second press on the selected action returns to the normal controls.
The native scrollbar stays hidden. When actions overflow, directional controls
use fixed outer slots and become visible only while more actions remain off-screen,
without covering or resizing the action row; when every action fits, those slots
are removed entirely. The same row supports touch swiping and mouse or pen
dragging without executing the action used to begin a drag. Script actions briefly confirm accepted execution or
failure on the button itself, and an open Boost or Pause action shows a close icon.

The climate header uses the current operating action as its leading visual
signal and keeps the action, execution source, and HVAC mode together below the
climate name. A compact Velair signature remains available as the shortcut to
the main panel, keeping the project name and author on two lines at every card
width.

The timeline and Room Assist sections reuse the corresponding Velair graphics,
including horizontal scrolling on narrow screens. Set
`climate_room_assist_display` to `text`, `chart`, or `both` to choose whether
the concise runtime explanation, temperature graphic, or both are shown. The
Room Assist state always remains beside its title, while the explanation uses a
second line when enabled. Only displays that include the graphic can collapse;
text-only mode stays visible and has no misleading expansion control.

`climate_preconditioning_display` follows the same `text`, `chart`, or `both`
model. Accepted return preparation is identified separately from weekly schedule
anticipation, with the room's state, estimated start, arrival target and relevant
reason. These details describe the saved return and current control intent;
they do not confirm physical device operation. Embedded One-off return controls
show only the selected climate's eligible preparation point, without preparation
badges, and retain its name and estimated start in the legend. If no current point is available, a brief state/reason
explanation replaces the timeline. The saved arrival remains editable and
cancellation remains available; these actions still affect the household return.
Its timeline measures time toward arrival, not thermal progress.
The preconditioning heading keeps the scheduled or active state visible, and its optional
second line identifies the target and calculated start. The graphic-only mode
keeps just that state above the expandable preview. Both graphical sections
start collapsed unless configured otherwise, and the initial-state option is
shown in the visual editor only when a graphic is selected. Timeline title,
active Profile, and active Mode each retain their own visibility option; the
Mode and Profile chips use a reduced card-specific height. Manual expansion
state remains local to the live card session.

Boost opens an in-card form for every option supported by the climate and the
service: target or range, duration, HVAC mode, fan, preset, swing, horizontal
swing, and humidity. Pause lets the user choose a finite or indefinite duration
and whether to leave the climate unchanged or turn it off. The card does not
expose `pause_id`, which is reserved for identifying automation-owned reasons.
When a pause may have another owner or reason, the card opens Velair instead of
clearing reasons implicitly. Manual control can be returned to automatic
control from the card. These local actions are never shown for externally
executed zones. Boost and Pause/Resume can be hidden independently and moved in
the same ordered action list as script shortcuts. Their behavior, labels, icons,
and forms are supplied by Velair and are not customizable.

The action list can also contain user-selected Home Assistant `script.*`
entities. Each shortcut has a card-local name, MDI icon, color, and optional
confirmation. Velair stores only those presentation settings in the Lovelace
card and runs the selected entity through `script.turn_on`; the script itself,
its permissions, and its actions remain owned by Home Assistant. The card does
not accept arbitrary JavaScript, templates, service payloads, or embedded action
sequences. Script shortcuts must therefore be able to run without required input
fields; define any required values inside the Home Assistant script or provide
defaults there. Each action can use `placement: auto` or `placement: more`.
Automatic actions use the first three available direct positions and overflow
into **More** when those positions are full. Actions assigned to `more` always
stay in that menu, independently of their position in the ordered list. The
three-position limit is fixed rather than another display setting. **More** is
omitted when it contains no actions; **Open Velair** remains its fixed final item
and does not make the menu appear by itself.
Script shortcuts remain available for externally executed zones because they
are independent Home Assistant actions, while Velair-only actions keep their
normal ownership and availability restrictions.

The thin line at the top is a semantic operating-state indicator, not progress.
Heating and preheating use a warm accent, cooling a cool accent, drying and fan
remain steady, idle is an attenuated form of the active mode, off is neutral, and
unavailable uses an interrupted error treatment. Motion is a brief state-change
cue and is disabled when reduced motion is requested. An `off` HVAC mode takes
priority over a stale `idle` action, so the card shows **Off** with a power icon;
idle while an active mode remains selected uses a neutral thermostat icon and
does not resemble a Velair pause.

Zone-based Lovelace cards can also limit which thermostats they show. This is only a dashboard display filter; it does not change Velair's stored schedules or the scheduler behavior. Global cards such as `overview-status` and `active-setup` do not show thermostat selection or weekday options in the card editor because they are not tied to one thermostat or schedule editor.

Add `view: active-setup` independently from the scheduler status card. Use the visual editor or
`active_setup_controls` to choose whether Active setup can change `modes`,
`profiles`, or `both`:

```yaml
type: custom:velair-card
view: active-setup
active_setup_controls: profiles
```

The option defaults to `both`, and every variant still shows **Base** and
**Exceptions**, with the base's actual Mode/Profile/Default identity and
exception groups showing their room counts. Base and its type share a small
context row above the name; long names wrap on phones and narrow cards.
The base also shows how many of its included zones still inherit it; exceptions
are excluded, as are zones using Default outside a Profile's scope. Default
bases include all managed zones. This is selection coverage, not device activity.
The **Household distribution** disclosure beneath the base summary is closed
initially. Select its label to show the bar and legend together; select again
or press Escape to collapse, leaving the header in place. The bar covers all
managed zones, with a label stating their total. Its compact legend uses Profile
colors, smaller icons and a right-aligned count column. Exception counts match
the list, including zones outside
the base. Uncovered zones without exceptions form a neutral Default segment.
This household total is separate from the base's own coverage denominator.
No managed zones means no distribution bar.
Base Profiles are identified in the expanded legend without a separate Mode
component list. Wider layouts give more space to
exceptions, while narrow cards retain the stacked summary.
Select anywhere on an exception row to expand its rooms beneath that row,
keeping all exceptions visible. Select it again or press Escape to collapse it;
the selected header and count stay in place as the content grows downwards.
Opening another group closes the previous one. Room names are not shown
in the compact summary, and long lists scroll inside the expanded area. This detail is
read-only in every control variant; Active setup contains no separate per-zone
editing menu. The Profiles-only control retains a Default schedules
action. Selecting a Profile directly replaces all previously active Profiles
and changes the Mode to Manual. Zones no longer covered by the new Profile
return to their Default schedules instead of keeping the previous Mode's
configuration. Use a Mode when several non-overlapping Profiles should be
activated together as a base. The compact layers icon applies a Profile only
to its configured zones as exceptions and preserves other room selections.
See [base and zone exceptions](climate-profiles.md#a-base-with-independent-zone-exceptions).

```yaml
type: custom:velair-card
view: preconditioning
entities:
  - climate.living_room
  - climate.bedroom
zone_order:
  - climate.bedroom
  - climate.living_room
```

If `entities` is omitted, zone-based cards show every Velair-managed thermostat.

For `view: sensors`, the card editor can hide the on/off switch, room sensor picker, Room Assist deadband, maximum assist delta, refresh delay, or live status section so a dashboard card can be display-only or more compact.

For `view: comfort`, the card editor can limit the card to selected thermostats and hide the configuration section, temperature graph, humidity graph, or CO2 graph independently. These are dashboard-only display choices; they do not change Comfort settings, tracked sensors, thresholds, events, or generated Home Assistant entities.

```yaml
type: custom:velair-card
view: comfort
entities:
  - climate.living_room
show_comfort_configuration: false
show_comfort_temperature: true
show_comfort_humidity: false
show_comfort_co2: true
```

## Create A Daily Schedule

When you enter **Schedules**, Velair opens the current local weekday. Your
selection is then preserved while you move between thermostats, Default and
Profile schedules, or refreshed backend data.

1. Select the climate you want to configure.
2. Choose a **Day layout**, then select a day or a group of days.
3. Use **Own schedule** for independent blocks, or select a template with
   **Times only** or **Times and settings**. For independent blocks, continue below.
4. Add a block.
5. Choose the start time.
6. Choose an HVAC mode or leave it as `Keep current mode`.
7. Enter a target temperature or range, or select climate options without a target.
8. Save.

In Additional settings, a **Velair preset** can supply the block's climate
configuration while keeping its time independent. Linked days follow the
chosen template scope. See [the complete rules](linked-schedules.md) and
[practical household examples](linked-schedule-examples.md) before choosing
between copying and linking.

After selecting an explicit non-off HVAC mode, use the compact thermometer
button in the Target cell to disable its temperature input. The grey input then
shows a dash, and the block calls only Home Assistant's
`climate.set_hvac_mode` service without sending a scalar or range target. This
is useful for modes such as `auto`, where the climate integration or device may
resume its own program, but it is available for every non-off HVAC mode reported
by the entity. Use the same button to enable the input again; Velair restores
the previous draft target, which must be valid before the schedule can be saved.
Existing blocks keep their current target behavior.

Mode-only blocks do not run preconditioning or Room Assist because
Velair has no temperature target to reach or adjust. Optional climate settings
are also unavailable for these blocks so the persisted action remains one
unambiguous HVAC-mode change. External schedule providers must explicitly
advertise support for this action; Velair never converts it into a temperature
block.

To schedule a preset or another climate option without a target temperature,
choose the option in the block's additional controls and disable the Target
input. The block may combine preset, fan, swing, horizontal swing, and target
humidity settings. It calls only the corresponding Home Assistant climate
services; it does not send `climate.set_temperature`, change the HVAC mode, or
turn on a climate that is off. A block must contain at least one supported
option. Changes made directly to those options between scheduled events are
not immediately restored by Velair. Option-only blocks do not run
preconditioning or Room Assist. When a block has several controls, Home
Assistant receives separate service calls in sequence. If a later call fails,
earlier controls may already have changed; Velair reports the failed delivery.

When a template or Profile is applied to another climate, Velair keeps the
options that climate supports. If none remain in an option-only block, the
destination schedule is rejected rather than storing an empty action.

Velair uses the selected climate entity capabilities when editing a schedule. Unsupported modes are not offered for that climate, and temperatures are constrained to the climate entity range.

In a temperature block, `Keep current mode` sends the target and any selected
climate options without requesting another mode while the climate is on. If
the climate is off, Velair starts it in the first supported mode compatible
with the target. A Keep block can be saved when the climate advertises at
least one non-off mode compatible with its target type; this does not
guarantee that the running mode will be compatible when the block executes.
If the running mode cannot accept the target, delivery fails without
switching to another mode. Some integrations only advertise their
single-temperature target feature after a mode starts, so Velair starts
the compatible mode before sending the target and lets the Home Assistant
service report any device-specific failure. Native ranges still require
explicit range support, and Velair never converts a single target into a
range or a range into a single target.

Choose **Temperature only** in the block's mode selector to update its target
without asking Velair to turn the climate on or change its HVAC mode. An off
climate stays off when its integration accepts target updates while off; a
running climate retains its actual mode. This is a separate choice: existing
**Keep current mode**, explicit modes, and saved schedules keep their behavior.
Temperature-only blocks cannot include additional climate options such as a
preset, because those commands could change the device's operating state.

This choice applies throughout the active block, including manual HVAC mode
changes, startup, resume, and delivery recovery. Changing only the HVAC mode
does not start a Manual adjustment; changing the temperature still follows the
configured external-change policy. Room Assist and advance preparation do not
operate while that temperature-only climate is off. They may resume after an
external turn-on, using the current compatible mode. An explicit Boost remains
a separate request that can turn the climate on.

Support depends on the climate integration. Some integrations hide or reject
temperature targets while off, or turn on internally when receiving one. Velair
does not send a mode change or turn-on as a fallback for a temperature-only
block. A failed update is reported; Velair does not briefly turn the device on
to set its target. Native ranges require the corresponding range capability.
External schedule providers must explicitly support this block policy.

The editor keeps selected climate options visible in a compact line. For a
block with climate options, open its options control to see what it will send:
the target (if any), how the HVAC mode is handled, and the selected options.
The explanation also clarifies that a single temperature is not converted
into a range. This works in schedules, Profiles, and templates. The editor
warns without blocking a save if an earlier block on that day selects a mode that may
not accept the target type. When no earlier explicit mode or turn-off
block determines the mode, it uses the climate's current mode for this
hint. The mode can change before the block runs, so the warning is
conditional.

Temperature blocks contain either one target temperature or a complete lower and upper target range. The editor uses the capabilities published by the climate entity and defaults new `heat_cool` blocks to a range when supported. A range is shown as, for example, `20–24 °C`. Velair never invents a range from one temperature and rejects incomplete, inverted, or incompatible targets before sending a command.

Entities that only support ranges use both limits in their advertised `heat`,
`cool`, `auto`, or `heat_cool` modes. The editor preserves those values when
switching between compatible modes, **Keep current mode**, and **Temperature
only**. Both limits may be equal. For entities supporting both target formats,
the format follows the per-climate mode policy configured in Settings.
For range-only entities, Dry and Fan only remain mode-only blocks without a
temperature. For mixed-format entities, the configured policy determines the
target format; the integration can still reject an unsupported operation.

With a range-only entity, Keep starts an off climate in its first advertised
compatible mode; it does not skip an incompatible running mode by changing it.
For entities supporting both formats, a range Keep block retains the preference
for `heat_cool` when off. Temperature only can send both limits while off when
the entity advertises range support and a compatible conditioning mode, without
turning the climate on or changing its mode. A known range-only entity cannot
accept a single-temperature target, even while off.

The range editor uses **Lower target** and **Upper target** for these entities.
These are the two values the integration accepts; Velair does not infer that
Auto has the automatic heating/cooling band behavior of `heat_cool`. The same
capability checks apply to Profiles, presets, Boost, and copied or linked templates.
Templates and Presets use the formats configured for their possible destinations.
Velair checks compatibility against each actual destination when applying them.
If Boost has no usable current limits, enter both values before applying it.

Room Assist and Adaptive Preconditioning support ranges only in `heat_cool`.
For a range in Heat, Cool or Auto, the nominal pair still applies at the scheduled
time, with no Room Assist shift, early start, or thermal learning. The affected
views explain the limitation. Planned Return applies the arrival target at
arrival, without advance preparation for those ranges.

When the selected climate exposes extra controls, the block editor also shows those controls. For example, an AC may expose fan mode, preset mode, swing mode, horizontal swing mode, or humidity. Velair only stores and sends options supported by the selected climate; unsupported options are omitted instead of being sent blindly.

If a block uses `Off`, target fields are not used because the block turns the climate entity off.

**Day layouts and editing several days**

Each climate's Default schedule and each climate schedule inside a Profile
remembers its own **Day layout**. Choose **Individual days**, **Weekdays / Weekend**,
or **All days** before selecting a day tab. Existing schedules
start with Individual days.

All layouts keep the same seven day cells in your configured week order.
Individual days selects one cell. Weekdays / Weekend selects Monday through
Friday together, or Saturday and Sunday together, whichever day you click.
With Sunday first, selecting Saturday also selects Sunday at the opposite end
of the strip. All days selects every cell regardless of which one you click.
Adjacent selected cells are visually connected; separated cells keep their
positions. Clicking a cell in the already selected group preserves your draft.

Selecting a division also preserves the existing blocks. Save the selection
with the Default schedule, or use **Save profile** for a Profile. Each zone can
use a different division. Daily templates remain daily block lists.

When the selected days have identical saved configurations, edit their common
schedule directly. If they differ, **Different schedules** lets you inspect
the available schedules and explicitly choose a base. Days with identical
blocks and template links share one alternative, with their day labels visible.
Each alternative uses Overview's compact timeline bars, with target and mode
labels inside the colored segments and no permanent block list underneath.
The information icon opens the complete schedule, including times, settings
and references, on hover, keyboard focus or tap. Inspecting this information
does not select the alternative. Click or tap an alternative
to select it as the base; its background and border identify the single
selected configuration. Keyboard users can select with the arrow keys, Space
or Enter. The alternatives remain available so you can choose another base
before saving. With **All days** or **Weekdays / Weekend**, select an alternative
and save it for the selected group first: seven days, five weekdays or two
weekend days. Selecting the alternative and pressing **Save** applies it
directly, without another replacement confirmation. The common block editor
opens only after that save succeeds; you can then change the shared schedule.
A failed save keeps your selection and the comparison available to retry.
Empty alternatives show **No own blocks** without repeating a zero-block count.
Their information explains that applying them removes the selected days' own
blocks; an empty day is not an off command, and weekly continuity can still apply.
The layout fits mobile widths.
Choosing a base does not save anything. **Save** is disabled until a base is
selected and appears below the content, aligned to the right. A summary beside
Save identifies the chosen source day and the days that will receive its schedule.
Saving then
replaces the selected group's days with the chosen configuration, leaving other
days intact. Identical visible temperatures do not imply identical
configuration when template links or preset references differ. When alternatives
look alike because their effective settings match, compact dependency labels
identify their template and link scope, preset names or independent configuration.
Complete reference details remain available from the information icon.

Adding, removing or moving blocks, applying a template, changing its link
scope, and unlinking apply to all selected days when saved. Other days remain
unchanged. **Save as template** saves one reusable daily list. Copying to other
climates targets the same selected weekdays and keeps their own day layouts.
To use day-to-day cloning, return to Individual days.

The grouped timeline shows the common blocks you are editing, without a
separate day-preview selector or a day-specific inherited segment. Individual
days still shows continuity from the preceding day. The scheduler's weekly
continuity remains unchanged, and inherited blocks are never copied into saved
blocks. Device limits are validated for each affected day before a complete save.

Day layouts survive Home Assistant restarts and portable exports. Older exports
without a layout import with Individual days. Earlier custom layout references
also open as Individual days, preserving every day's blocks and template links.

## Target format by climate and mode

Home Assistant reports support for single temperatures and temperature ranges,
but does not provide a compatibility table for each HVAC mode. Under **Settings
→ Managed climates**, each mixed-format climate has a **Modes with two setpoints**
dropdown. Its closed summary shows the selected modes; open it to select or clear
individual modes. Only modes advertised
by that climate are offered, excluding Off. Heat/Cool is selected initially when
available; other modes are not selected automatically. An empty selection is
valid. Climates supporting only one format use that format without a selector.
The help beside the label explains the limits of this setting. Changes still go
through the incompatibility review before they are applied.

This setting describes how Velair should send targets; it does not prove the
physical device accepts or uses both values. The integration may reject or ignore
a parameter. Velair reports known incompatibilities before saving and delivery
errors when received. There is no automatic device test or mode switching probe.

**Default**, each zone in **Profiles**, **Boost**, and the climate controls use
this policy to show one or two fields for an explicit mode. Changing modes keeps
separate temporary drafts for each format. Returning to a format restores the
values typed during that edit; missing values must be completed. Velair does not
invent a range or collapse two limits into a single target. These alternative
drafts are not saved or recovered after a refresh.

**Keep current mode** and **Temperature only** do not name an explicit mode. If
the climate can use either format across its modes, choose the intended format
in the block's Additional settings. The actual mode is validated again at
execution. Temperature only does not activate or change the HVAC mode.

### Formats in Templates and Presets

For an explicit mode, Velair considers managed climates that advertise that mode:

- If all use a single temperature, the editor shows one field.
- If all use two setpoints, the editor shows two fields.
- If both formats occur, the first action in Additional settings switches between
  **Use two setpoints** and **Use one temperature**. New blocks start with one
  temperature, except Heat/Cool, which starts with two.
- With no compatible climates or uncertain capabilities, format choice remains
  available instead of assuming agreement.

Keep and Temperature only combine the possible effective modes. Heat/Cool also
allows switching when actual destinations use different formats. The action uses
the existing settings button on desktop and mobile; it adds no column beside the
temperature fields. Linked preset values remain read-only until unlinked.

Existing Templates and Presets retain their saved values when device settings
change. A now-incompatible format is identified with an explicit correction action;
opening an editor does not convert or remove its values. Assigning resources and
copying schedules validate the format for each destination.

### Reviewing changes to the mode policy

Changing the selection first previews affected Default schedules, all Profiles,
and uses of shared Templates or Presets. Corrections apply locally to the affected
day and climate within Default or its Profile. Enter missing targets;
Velair does not choose replacement temperatures. If an active Room Assist correction
is incompatible with the new format, the review explains that saving will end it
automatically. Room Assist settings are kept for compatible modes. Other incompatible
temporary objectives must be resolved or ended before applying the change.

The review groups affected days under Default or their Profile. After **Check
changes**, groups and days are collapsed so their counts are easy to scan. Open a day to
edit its blocks; only one day editor is expanded at a time. Large lists are
split into pages. **Next item to review** takes you to the next correction,
even on another page. Closing a section or changing pages preserves the values entered.
Before the first review, only **Check changes** is offered alongside Cancel.
After that review, **Save** replaces Check changes. Complete the required values
and select Save: Velair validates the current corrections and blockers with the
backend, then saves only if that validation succeeds. You do not need a separate
second check. Validation, connection or storage errors keep the entered values.

Adding or removing a two-setpoint mode while editing returns to Check changes
and hides Save until the new selection has been reviewed. Existing temperature
drafts are retained, including alternate single/range values when returning to a
previous format. Only blocks affected by the current selection are corrected;
blocks that are now compatible keep their original references.

There is no correction-scope selector. Repairing a block that uses a Preset creates
an inline local value for that block. Repairing a day linked to a Template removes
that day's template link; its remaining blocks keep their existing values and
unaffected Preset references. Other days keep their links. The review displays
the unlinking consequence before saving. Templates, Presets and other destinations
are not changed, so each affected day needs its own completed corrections.
Future edits to the original resource no longer update the detached blocks or day.

The review keeps the current configuration intact until the policy and corrections
can be saved together. A concurrent edit requires a fresh review. Failed storage
leaves the previous configuration in place. If a climate stops advertising a saved
mode, Velair preserves the setting and reports it rather than silently deleting it.
Room Assist is ended only after the settings have been saved successfully, without
restoring its old target. Velair then applies the current nominal scheduled target;
failed delivery uses normal recovery. A failed settings save leaves the previous
correction and configuration intact.

Selecting two setpoints for Heat, Cool or Auto does not enable Room Assist or
Adaptive Preconditioning for them. Range thermal assistance remains limited to
Heat/Cool; Planned Return still applies the nominal target at arrival.

## Timeline Editing

The timeline is a visual 24-hour representation of the selected day.

- Drag a block to move its start time.
- Drag a block edge to resize the range between adjacent blocks.
- Use the block list for exact time, mode, and temperature values.

## Preconditioning

For occupancy-driven absence with preconfigured weekly or one-off arrivals, see
[Planned Return](planned-return.md). Configure the routine in the
Planned return tab and use
its live status for individual source states and one-off arrival changes without
editing the saved week. **Plan return** can wait for confirmed departure with a
one-off time even when the automatic weekly routine is disabled. With no saved
occupancy sources, the explicit start instead applies Away immediately; normal
preparation and the saved arrival still run.

Preconditioning lets Velair start a scheduled comfort target before the visible block time for one managed climate.

When enabled for a climate in the Preconditioning tab, the block time represents the desired comfort time. Velair may apply the target earlier using its adaptive prediction, while keeping the original target time visible in upcoming events.

If Velair recalculates while it is already inside the preconditioning window, it applies the target immediately when the current temperature still needs heating or cooling.

The Preconditioning tab lists managed climates in the order configured in Settings. For each climate it lets you:

- enable or disable preconditioning;
- set a maximum lead time, up to 1440 minutes;
- set the adaptive model parameters and minimum temperature difference;
- inspect heat and cool learning independently;
- restore tuning parameters to their defaults without deleting learning samples;
- reset one learning direction without affecting the other.

Configuration is grouped into timing and limits, learning model, history, and optional outdoor context. When outdoor context is disabled, its sensor selector is disabled as well. Unavailable climates cannot enable preconditioning and the tab explains why.

Each tuning control includes compact contextual help. Hover, focus, or tap its information icon to see how increasing, decreasing, or enabling that setting affects preconditioning.

Preconditioning is adaptive. Velair predicts each future event from the current temperature difference, first with a local initial model and later with similar local history after enough complete observations exist. Historical predictions learn thermal potential per degree, so small past temperature changes can scale up for larger future gaps and large past changes can scale down for smaller ones. More similar and more recent observations have more influence.

Velair does not start early for `Off` blocks. If the current temperature is already close enough to the target, Velair keeps the normal block time.

For native `heat_cool` ranges, Velair uses the lower boundary when the room
needs heating and the upper boundary when it needs cooling. The complete range
is still applied early, and learning records which boundary drove the session.

Detailed setup, heating, cooling, outdoor sensor, automation, and Lovelace examples are documented in [Adaptive Preconditioning](adaptive-preconditioning.md).

Before an early start begins, Velair listens for relevant temperature changes on managed climates that have preconditioning enabled. By default it uses the thermostat's own `current_temperature`. If Room Sensor Assist is enabled for that climate, Velair uses the selected room sensor as the effective room temperature for preconditioning decisions and learning. When the temperature changes enough to affect the current delta, Velair debounces the update and recalculates the next scheduler action locally. Open panels also group relevant indoor or configured outdoor temperature changes into a single refresh without continuous polling. If the early start for the same visible event changes, its row is highlighted briefly so the adjustment can be noticed without a dialog or global notification.

## Room Assist

The Room Assist tab lists managed climates in the order configured in Settings. For each climate it lets you configure Room Sensor Assist.

The selected room temperature sensor is useful for TRVs or thermostats whose built-in sensor is too close to a radiator, air outlet, or other local heat source. Selecting a sensor alone does not change Velair control. It becomes the effective room temperature only when Room Sensor Assist is enabled, because Velair then also adjusts the thermostat target so the actuator can keep heating or cooling toward the external room reading.

Detailed heating, cooling, automation, and Lovelace examples are documented in [Room Assist](room-assist.md).

Room Sensor Assist is an advanced option that requires a room temperature sensor but does not require Adaptive Preconditioning. For a fixed `heat` or `cool` block with a non-zero deadband, Velair treats the lower and upper deadband edges as switching limits. It retains one runtime phase until the external sensor reaches the opposite edge, then reverses: fixed heating initializes safely towards the lower edge and fixed cooling towards the upper edge. Maximum assist delta caps the signed correction from the currently active edge. A deadband of `0` preserves the previous signed correction around the central target. Scalar `auto` and `heat_cool` targets retain that neutral behavior, and native `heat_cool` ranges retain their stable holding-band behavior, so Velair does not force an automatic unit to alternate actively between heating and cooling. The deadband defaults to `0.3 °C` or `1 °F`, supports `0.1` degree steps from `0` through `5 °C` or `9 °F`, and applies immediately when saved. Maximum assist delta defaults to `2 °C` or `4 °F` and can be configured in `0.1` degree steps up to `10 °C` or `18 °F`. The visible schedule target or range remains unchanged, and target-step alignment, scheduled protection, and physical climate limits still apply. The phase is runtime-only and starts fresh after a block, target or mode change, Room Assist clearing, or integration reload. Velair influences the unit through its target; it cannot override device hysteresis, compressor protection, or minimum run time, so use an `Off` block when an explicit shutdown is required.

Velair follows Home Assistant's configured temperature unit. There is no separate Celsius or
Fahrenheit setting. Settings shows that Home Assistant unit as a
read-only value so the active behavior can be verified; change it from Home
Assistant's unit-system settings. New schedules, built-in templates, Comfort thresholds,
Room Assist limits, and Adaptive Preconditioning defaults are physically
equivalent in both units. External temperature sensors are converted before
their readings are compared with a climate target.

Velair stores thermal values raw in the unit recorded with its data. If Home
Assistant changes unit, Velair stops scheduling and thermal writes, creates a
persistent notification, and offers one explicit migration from the stored
unit to Home Assistant's current unit in Settings. Continue only when every
stored value still uses the source unit shown; values already in the target
unit would be converted incorrectly. Schedules, templates, active and previous
override targets, Comfort limits, Room Assist values, Adaptive Preconditioning
settings, rates, and learning observations migrate atomically.

The one-time upgrade from published Celsius-only Velair data is different. If
Home Assistant already uses Fahrenheit, Velair assumes that legacy data is
Celsius without asking, keeps the scheduler stopped, and directs the user to
**Reset Velair**. Reset discards the legacy configuration and atomically creates
fresh Fahrenheit defaults. After that upgrade, later Home Assistant unit
changes use the full explicit conversion described above and preserve data.

Current portable model v22 exports preserve raw values and declare their unit.
Earlier Velair versions cannot import v22 exports; use a version that supports
v22 to restore them. Older supported files, including v4, v5, v8, and v9,
remain importable. Imports
convert selected thermal data when the file and the current Home Assistant unit
differ. Older files without a unit are treated as Celsius because all published
Velair versions that produced those files stored Celsius values. Export remains
available while scheduling is stopped for a unit update, so a reference copy can
be saved before resetting and imported afterward.

If a climate was unavailable while data was migrated or imported, Velair checks
its limits and effective temperature step. A valid `target_temp_step` published
by Home Assistant takes priority over the last reported step, then the manually
configured per-zone fallback. The panel warns when a stored schedule target is
no longer compatible so it can be edited before relying on that schedule.

The complete upgrade, migration, backup, and recovery behavior is documented in
[Temperature Units and Migration](temperature-units.md).

When Room Sensor Assist is enabled, the Room Assist tab shows a compact live temperature scale while a managed temperature block is active. For one target it marks the scheduled target, room sensor, climate target, and thermostat reading. A neutral striped band marks the lower and upper deadband limits. With fixed `heat` or `cool`, the status also shows whether control is moving towards the lower or upper limit; with scalar automatic modes, the band remains a neutral margin. For a native range it extends from the scheduled low minus the deadband to the scheduled high plus the deadband; separate brackets still show the complete scheduled and applied bands, with one connector between their centers showing the signed movement of the whole range. The room sensor and climate readings remain individual markers. The complete translated legend stays centered on the represented deadband range, including when that range is narrower than the label; a zero deadband removes the surface and is stated explicitly. Hiding `show_room_assist_deadband` hides its setting, band, and legend together. These values are derived from Home Assistant state and Velair runtime state; they are not persisted as a new history. If no managed temperature block is active, the tab shows a waiting state instead of placeholder values. If a sensor is selected but Assist is off, the tab shows that the sensor is saved but not operational.

Room Sensor Assist is event-driven. Velair does not poll temperatures. It listens only to the configured room sensor and climate entity while assistance is active, debounces changes using the per-climate Refresh delay setting, aligns temporary targets to the effective published, last-reported, or configured temperature step, ignores movements smaller than that step, and restores the real scheduled target when the scheduler is paused, a zone is paused, a boost starts, the block turns off, the sensor becomes unusable, or the feature is disabled. Clearing that runtime state also clears any fixed-mode hysteresis phase. If Adaptive Preconditioning has already started a future block early, Room Sensor Assist follows that future target until the scheduled comfort time instead of falling back to the previous time block.

When preconditioning is disabled for a climate, Velair does not register preconditioning temperature listeners, schedule recalculation callbacks, start learning sessions, or save new observations for that climate. Previously learned samples are preserved and can be reused if preconditioning is enabled again.

Velair also keeps a compact local learning history for preconditioning attempts. It opens a runtime learning session when it applies an early comfort target, then stores a compact observation when the climate reaches the target threshold or when the comfort time arrives. Sessions interrupted by boosts, pauses, scheduler stops, or schedule changes are discarded.

The Preconditioning tab shows the local learning state per climate. Heat and cool are tracked separately, and a direction that the climate entity does not support is shown as unavailable. Once Velair has enough complete observations for a supported direction, it can use similar local history instead of the initial model.

Each supported direction has a compact status card showing whether learning is ready, which model source is active, and the counts of complete, partial, and invalid samples.

The tab also provides a reset learning action for each supported direction. This recalibrates heat or cool from zero independently while keeping schedules, preconditioning settings, and the other direction's learning history.

The per-climate restore action is separate from learning reset. It restores only Adaptive Preconditioning tuning parameters, keeps the current enabled state, preserves room sensor settings, and preserves every stored heat and cool sample.

Partial observations do not become fake completion times. They act as lower bounds, meaning Velair knows the required time was longer than the attempted start window. If enough later complete observations prove that less lead time is working, older partial observations stop forcing the prediction upward. This keeps learning conservative without making high leads permanent.

Velair keeps separate compact histories for heat and cool so seasonal use in one direction cannot evict learning from the other.

All preconditioning settings and calculations run locally inside Home Assistant. Velair does not send climate history or schedule data to any external service.

Developer-oriented details about local learning states, API output, and prediction rules are documented in [Adaptive preconditioning internals](../developer/adaptive-preconditioning.md).

## Environmental Comfort

The Comfort tab lists managed climates in the order configured in Settings. For each climate it can monitor room temperature, humidity, and CO2. It can also show optional dew point, absolute humidity, and Humidex readings calculated locally from the effective temperature and humidity or supplied by an existing Home Assistant sensor.

Comfort is monitoring-only. It does not change schedule blocks, climate targets, fan modes, presets, or pauses. Instead, Velair describes the room with human conditions such as `Cold and humid`, keeps CO2 air quality separate, indicates whether readings are complete, and emits automation events when that assessment changes.

Temperature can use a dedicated Comfort temperature sensor, the Room Assist room temperature sensor when one is configured, or the climate entity's own `current_temperature`. Humidity can use a selected humidity sensor or the climate entity's `current_humidity` when available. CO2 is only evaluated when a CO2 sensor is selected.

The default Simple Comfort model uses one rectangular temperature-and-humidity
range. Guided mode turns one midpoint humidity reference into a
temperature-dependent psychrometric curve. The custom temperature-aware model lets the humidity limits differ at
the cooler and warmer temperature endpoints; Velair interpolates the effective
range and shows its sloped target area without making a universal comfort
claim. Existing zones remain on the Simple model unless changed explicitly.

These additional readings are disabled by default and remain informational: they do not change Comfort classifications or climate behavior. When Comfort is disabled for a climate, Velair does not register comfort sensor listeners for that climate. When enabled, it listens only to the relevant selected sensors and climate entity. There is no continuous polling.

Comfort can also compare the room with explicit outdoor temperature and
optional humidity sensors. The **Indoor vs outdoor** block shows the temperature
difference, indoor and outdoor absolute humidity, and the relative humidity the
outdoor air would have at the indoor temperature. When the backend identifies a
useful direction or a conflict, Velair shows one cautious ventilation message;
it never treats the comparison as a command. Configuration is kept inside the
collapsed Comfort setup panel, and disabling the comparison preserves the
selected sensor IDs. Per-climate **Ventilation guidance** controls let users
require larger or smaller temperature, projected-humidity, and air-moisture
differences before that message appears; the original cautious margins remain
the defaults.

Detailed setup, heating, cooling, CO2, automation, and privacy examples are documented in [Environmental Comfort](comfort.md).

## Templates

Templates are reusable daily sets of blocks. Their settings may be manual or
use shared Velair presets. The Templates tab also contains the Climate presets
library; a Velair preset shares climate settings without sharing block times.

The Templates tab lets you:

- create a new template;
- rename a template;
- edit template blocks;
- apply a template to selected climates and weekdays;
- delete templates that have no linked days.

In Schedules, select a template as a day's source to link its times or its
complete configuration. Copying a template remains a separate operation.

The Schedules tab can also save the current day as a new template.

When copying or linking a template to a climate, Velair validates its HVAC modes,
target types, temperature limits, and provider restrictions. Out-of-range targets
and incompatible modes are rejected. Manual settings are adapted to supported
temperature steps; shared preset values are adapted for each destination without
changing the library. Unsupported optional settings are filtered, provided the
block still has a valid action.

Copying blocks creates independent template times, but retains live preset
references. **Times only** links share times with independent climate assignments.
**Times and settings** links share the complete template, with read-only controls
in the destination. Template changes validate every linked day, including
inactive Profiles. Editing preserves the template's library position.

See [Block presets and linked templates](linked-schedules.md) for all rules and
[Practical examples](linked-schedule-examples.md) for worked setups, new-block
fallbacks, link conversions, usage counts, and troubleshooting.

Templates can include every optional climate setting available across the managed climates. This makes one template useful for mixed installations. When a template is applied to a specific climate, Velair keeps only the options that climate supports. For example, a template can contain `fan_mode: quiet` for an AC, but that field is dropped automatically when the same template is applied to a TRV that does not expose fan modes.

## Climate Profiles

Climate profiles switch several zones between coordinated weekly plans without
overwriting their default schedules. Each profile can give a zone an alternate
weekly schedule, pause it, pause and turn it off, or leave it on its Default
schedule. Zones omitted from a profile continue using their default schedules.

A Mode can activate several Profiles together when their configured zones do
not overlap. Direct activation replaces the active set with one Profile and
selects Manual. Zones that were covered by the previous active set but not by
that Profile return to their Default schedules. Activation applies the blocks
active at the current time, including blocks that started on an earlier day,
and cancels Boosts in affected zones. Global and
per-zone pauses retain priority.

The sidebar uses **Schedules** as the complete planning workspace. Choose
**Default schedules** to edit the normal weekly plan, or **Profile schedules**
to create a Profile and configure one thermostat at a time with **Default
schedule**, **Profile schedule**, or **Pause**. Both sources expose the same
timeline, block options, templates, and cloning tools, but their save semantics
remain intentional: a Default day is saved directly, while Profile metadata and
thermostat behavior are saved atomically as one Profile. A Profile can still be
activated directly from its row. The separate **Modes** tab composes Profiles
into reusable setups and does not duplicate their schedule editor.
While Velair processes the affected zones, a global operation strip shows the
current zone, processed count, and final success or partial-error result across
panel tabs. In Lovelace, it appears only in the Active setup card, where Mode
and Profile activations are performed. Processed means that Home Assistant and
Velair have finished handling that zone, including cases where a pause or
override means no climate command is needed. It does not mean that the room has
already reached its target temperature.
Successful operation results disappear automatically after a short confirmation
period. Partial and failed results remain visible until dismissed.
Home Assistant automations can activate one Profile through
`velair.activate_profile` or select a configurable value from Velair's native
`select.velair_mode` entity.

See [Climate Profiles](climate-profiles.md) for setup, automation, restart, interaction, and portability details.

## External Schedule Execution

Velair normally stores a zone's weekly plan and executes it through its Home
Assistant `climate.*` entity. When **Settings → External systems** detects a
compatible controller, an eligible zone can instead delegate execution to that
system. Velair then publishes the complete effective week selected by Default,
a Profile, or a Mode. The zone must first have a saved effective schedule with
at least one temperature block; otherwise Velair keeps local execution and
explains the prerequisite in Settings.

An externally managed zone remains schedule-only. Velair does not send direct
climate actions for Boost, pause or resume, Manual adjustment, Room Assist, or
Adaptive Preconditioning. Profile **Pause** behavior is unavailable, while
**Default schedule** and **Profile schedule** select the week that is published.
Controller-specific limits are shown once per in-use system in Settings and are
also enforced while editing compatible Default and Profile schedules. When a
controller requires an implicit midnight continuity point, the editor includes
it in the visible daily switchpoint usage.

Overview reports only **Publishing**, **Published**, or **Failed** after an
attempt in the current Home Assistant runtime. **Published** means that the
external integration accepted the service call; it is not confirmation that
the physical controller applied the schedule. The zone keeps its normal
schedule activity and next event, while a compact **External** indicator shows
the controller and publication state. Velair does not poll, read back, or retry
automatically. See [External schedule execution](external-systems.md) for
supported systems, limits, handoff behavior, and current validation status.

## Clone Schedules

Below the editor, Velair can clone the current day:

- to other weekdays on the same climate;
- to the same weekday on other managed climates.

For weekday cloning, **Mon–Fri**, **Weekend**, **All days**, and **Clear
selection** provide quick target selection while leaving individual weekdays
available. These shortcuts only change the selected targets; **Clone** remains
an explicit action and the source day is never included.

Clone actions save pending changes first when needed.
They copy the source configuration, including the template, link type, hours-only
assignments, and preset references. Cloning an independent day removes a
destination's link for that day; unrelated days keep their links. Incompatible
destinations reject the clone without changing any selected destination.
Use **Unlink** after cloning when the new day should stop following its template.

## Pause, Stop, And Resume

Velair has global scheduler controls:

- **Pause** suspends automatic schedule execution for a duration in minutes.
- **Stop** suspends automatic schedule execution indefinitely.
- **Resume** returns the scheduler to automatic mode.

When a temporary pause is active, the overview shows the remaining time and progress.

Pause and boost durations are entered in minutes. The Home Assistant service UI allows values up to 10080 minutes, which is seven days.

Velair also supports per-zone pause through services and automations. A zone pause only affects one managed climate entity. Other climates continue following their schedules. When a zone is resumed, Velair applies the current schedule only if a block is active for that climate at that moment; otherwise it leaves the climate untouched.

## Boost

Boost is per climate zone. It temporarily overrides the schedule for one climate entity and leaves other zones running normally.

When a boost starts, Velair captures the current restorable climate state for that zone, including the HVAC mode and either its single target or complete target range when Home Assistant exposes them. This snapshot is used only to decide what should happen when the boost ends.

Boost is exposed through Home Assistant services, scripts, automations, and dashboard controls. This keeps the main schedule editor focused while allowing advanced automations such as:

- boost a room from a button;
- boost after motion;
- boost from a voice assistant;
- boost with a preferred HVAC mode.

When a boost expires, Velair resolves the affected zone in this order:

1. If there is an active schedule block with an explicit HVAC mode, Velair applies that scheduled target.
2. If there is an active schedule block that turns the climate off, Velair turns the climate off.
3. If there is no active schedule block, Velair restores the state captured before the boost.
4. If the active schedule block uses `Keep`, Velair also restores the state captured before the boost, because `Keep` does not define a new HVAC mode to apply after the temporary override.

This means a boost should not cause Velair to invent a new heating or cooling target when the current schedule does not explicitly define one.

## Startup Behavior

By default, Velair restores its stored scheduler state after Home Assistant starts but does not force climate devices to a schedule target.

From Settings, you can enable **Apply active schedule after startup**. When enabled, Velair applies the current active schedule block to managed climates after Home Assistant starts, as long as the scheduler is in automatic mode. A block that started on an earlier day still counts as the active block until the next weekly block starts. Active boosts are respected.

## Automation Blueprints

Velair provides optional Home Assistant blueprints through its documentation:

- switch between chosen Home/Away actions from one consolidated occupancy entity;
- pause one or more managed climates while any selected window or door remains open;
- select seasonal Modes or other actions once after a new seasonal range is confirmed, with immediate notifications for invalid readings.

They use Home Assistant state events and configurable delays, not polling. The
occupancy blueprint can report when its consolidated group, template sensor, or
helper remains unavailable, without running either Home or Away actions. The
window blueprint identifies the pause it creates, so closing a window cannot
remove a manual pause or a pause owned by another automation. If a contact
remains unknown or unavailable, Home Assistant shows one delayed diagnostic
notification for the thermostat set and dismisses it automatically after recovery;
the affected contact still blocks resumption. See
[Automation Blueprints](blueprints.md) for setup, examples, startup behavior,
and the one-automation-per-zone rule for window contacts.

The [seasonal blueprint](blueprints/seasonal-climate-selection.md) confirms a new
seasonal range for 30 minutes by default. Changes within that range keep the original deadline; actions
run once per range entry. Startup checks diagnostics only. Use its
normal Home Assistant action editor to select Velair Modes. Configure a real
pause-and-off Mode if mild weather should stop climatization; empty actions
leave current operation unchanged.

## Portability

The Settings tab can export and import a versioned JSON file.

The file can contain:

- thermostat schedules;
- templates;
- shared block presets;
- panel settings;
- adaptive preconditioning learning.
- climate profile definitions.
- mode definitions.

Current model 22 exports preserve both template link types, preset references,
Preconditioning master relationships and per-climate target-format policies. Accepted master execution anchors
remain local and are not exported. Exporting
schedules or Profiles includes required templates and presets, shown as additional
selected sections. Imports validate the combined configuration, including existing
consumers of replaced shared resources. Presets merge by stable key: matching keys
are replaced, while local presets absent from the file remain. Existing backups
remain importable; older Velair versions cannot import model 22 files. See
[the backup example](linked-schedule-examples.md#back-up-the-whole-setup).

When importing, Velair lets you choose which sections to overwrite. Importing
replaces selected data, so export first if you need a recovery point. Profile
and Mode definitions are portable, but their active selection is not. Velair
retains active Profile IDs that still exist and returns to default schedules
only when none remain.

Every new export records its temperature unit. When importing a file from the
other unit system, Velair converts the selected thermal values to the current
Home Assistant unit. Values tied to an available climate are aligned with its
effective target step; standalone values use safe precision when no common
device step is available. The manual per-zone fallback is portable, while the
last step observed from a local climate entity is intentionally not exported.
Legacy exports without a recorded unit are announced in the import screen and
interpreted as Celsius.

Adaptive preconditioning learning is matched by the exact Home Assistant climate entity ID. Learning from climates that are not currently managed is shown before import and skipped. For matching climates, the imported learning replaces that climate's existing calibration. Learning for local climates that are not present in the file is kept unchanged.

Preconditioning configuration values are already included with **Thermostat schedules**. The separate **Preconditioning learning** section contains the costly local calibration history.

## Maintenance

The Settings tab shows technical version information:

- frontend build;
- portable export model version;
- storage/model version;
- integration version.

It also includes a reset action. Reset deletes all stored Velair schedule data,
including schedules, templates, panel preferences, active boosts and pauses,
per-climate external-adjustment policies and active Manual adjustments, Comfort
and Room Assist settings, Adaptive Preconditioning settings and learning, and
startup behavior. It then recreates unit-aware defaults for the currently
managed climates. The separate Diagnostics category selection and its current
runtime log are not part of this schedule-data reset. Velair asks for
confirmation before doing this.

## Services

Velair exposes Home Assistant services for automations and scripts:

- `velair.set_temperature`
- `velair.set_hvac_mode`
- `velair.apply_schedule`
- `velair.boost`
- `velair.cancel_boost`
- `velair.activate_profile`
- `velair.deactivate_profile`
- `velair.enable_room_sensor_assist`
- `velair.disable_room_sensor_assist`
- `velair.pause`
- `velair.pause_zone`
- `velair.resume`
- `velair.resume_zone`
- `velair.set_external_change_policy`
- `velair.enter_manual_adjustment`
- `velair.resume_automatic_control`
- `velair.set_daily_schedule`
- `velair.copy_day_schedule`
- `velair.clear_schedule`
- `velair.update_block_preset`

Services that target an entity only work with climates selected during setup. If an unmanaged climate entity is passed, Velair rejects the service call before changing anything.

### `velair.update_block_preset`

Update a saved shared preset using its stable `preset_key`. Partial updates
preserve omitted fields; explicit replacement can change its action. Changes
affect every reference and use the normal validation, override authority, and
Preconditioning recalculation. See [Preset automations](preset-automations.md)
for the field reference and outdoor-temperature, range, device-option, and
Off/restore examples. This service changes a shared definition; it does not
select another preset for a block.

### `velair.activate_profile`

Activate one stored climate profile and immediately apply the effective current behavior. This replaces the complete active Profile set; zones not covered by the selected Profile return to their Default schedules. Use the stable profile ID shown by Velair rather than its editable display name. A direct activation sets the Mode selector to `Manual`. Omitting `profile_id` still returns to default schedules for compatibility; new automations should use `velair.deactivate_profile` explicitly.

```yaml
action: velair.activate_profile
data:
  profile_id: vacation
```

### `velair.deactivate_profile`

Deactivate all active Profiles and immediately return every zone to its default schedule.

```yaml
action: velair.deactivate_profile
```

### `velair.set_temperature`

Set one managed climate entity to a single temperature or a lower and upper target range. `hvac_mode` is optional.

This is a Velair-scoped convenience service, not a replacement for Home Assistant's `climate.set_temperature`. The differences are:

- it only accepts climate entities managed by Velair;
- it validates the target against the capabilities and temperature limits known by Velair;
- it uses Velair's HVAC mode fallback rules when a mode is provided or when the climate needs to be turned on.

Use Home Assistant's native climate services when you want generic climate control. Use `velair.set_temperature` when an automation should only act on Velair-managed climates.

Optional `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode`, and `humidity` fields can also be provided. Velair applies only the fields supported by the target climate.

```yaml
action: velair.set_temperature
data:
  entity_id: climate.living_room
  temperature: 21
  hvac_mode: heat
  fan_mode: quiet
```

For a range, omit `temperature` and provide both limits:

```yaml
action: velair.set_temperature
data:
  entity_id: climate.living_room
  target_temp_low: 20
  target_temp_high: 24
  hvac_mode: heat_cool
```

`temperature` and the range fields are mutually exclusive. Both range limits
are required together.

### `velair.set_hvac_mode`

Set one advertised non-off HVAC mode without sending a target temperature.
Velair accepts only managed climates whose execution is local, validates the
mode against the entity, and records the command as a Velair-owned action so it
is not mistaken for an external adjustment.

```yaml
action: velair.set_hvac_mode
data:
  entity_id: climate.living_room
  hvac_mode: auto
```

Use this service when a Velair automation should change only HVAC mode. Velair
does not include a scalar or range target in the call; the climate integration
or device may still adjust its own state internally when the mode changes. A
successful delivery disables active Room Assist because Velair no longer owns a
temperature target for that command. A failed delivery leaves Room Assist
unchanged and emits no successful target event.

Use Home Assistant's native `climate.set_hvac_mode` for generic control outside
Velair. The `off` mode is deliberately rejected; use the appropriate Velair
pause, schedule, or climate action for that separate intent.

### `velair.apply_schedule`

Apply the currently active schedule block immediately. If `entity_id` is omitted, Velair applies the active block to all managed climates.

```yaml
action: velair.apply_schedule
data:
  entity_id: climate.living_room
```

### `velair.boost`

Temporarily override one climate entity. When the boost expires, Velair applies the active explicit schedule target when one exists, or restores the climate state captured before the boost when there is no explicit target to apply.

```yaml
action: velair.boost
data:
  entity_id: climate.living_room
  temperature: 22
  duration_minutes: 45
  hvac_mode: heat
  fan_mode: high
```

Velair captures the restorable climate state before applying the boost. A boost is rejected when the climate is unavailable and this state cannot be captured safely.

A range Boost uses `target_temp_low` and `target_temp_high` in place of
`temperature`, following the same rules as `velair.set_temperature`.

### `velair.cancel_boost`

Cancel an active boost early. This always uses the same return behavior as normal expiration: Velair applies the active explicit schedule target when one exists; otherwise, including a `Keep` block, it restores the HVAC mode and target captured before the boost. Calling it when no boost is active has no effect.

```yaml
action: velair.cancel_boost
data:
  entity_id: climate.living_room
```

### `velair.enable_room_sensor_assist`

Enable Room Sensor Assist for one managed climate. The climate must already have a room temperature sensor configured in the Room Assist tab.

```yaml
action: velair.enable_room_sensor_assist
data:
  entity_id: climate.living_room
```

### `velair.disable_room_sensor_assist`

Disable Room Sensor Assist for one managed climate. If Velair was applying an assisted target, it restores the current scheduled target.

```yaml
action: velair.disable_room_sensor_assist
data:
  entity_id: climate.living_room
```

### `velair.pause`

Pause automatic schedule execution. Omit `duration_minutes` to stop automatic execution indefinitely.

```yaml
action: velair.pause
data:
  duration_minutes: 60
```

### `velair.resume`

Resume automatic schedule execution and apply the current schedule.

```yaml
action: velair.resume
```

### `velair.pause_zone`

Pause automatic schedule execution for one managed climate entity while the rest of Velair keeps running. Omit both `duration_minutes` and `until_next_block` to pause that zone indefinitely.

Set `until_next_block: true` to end this pause at the next block start in the
zone's effective schedule. This uses the nominal block time, not an earlier
Adaptive Preconditioning start. The expiry is fixed when the service is called
and survives restarts; later schedule edits do not move it.
It cannot be combined with `duration_minutes`, and the call fails without
changing the zone if no future block exists. Other pause reasons continue to
keep the zone paused until they also end.

```yaml
action: velair.pause_zone
data:
  entity_id: climate.guest_room
  pause_id: external_control
  action: none
  until_next_block: true
```

The optional `action` field can be:

- `none`: leave the climate exactly as it is and only stop Velair from changing it automatically;
- `turn_off`: turn the climate off immediately and keep it paused.

Automations may also send an optional `pause_id` containing 1 to 128 letters,
numbers, dots, underscores, colons, or hyphens, beginning with a letter or
number. An identified pause adds a reason without replacing reasons with other
IDs. Reusing the ID updates only that reason; an exact replay has no effect.
Calls without `pause_id` retain manual authority and replace every reason with
one manual pause.

```yaml
action: velair.pause_zone
data:
  entity_id: climate.guest_room
  duration_minutes: 120
  action: turn_off
  pause_id: window_guard
```

### `velair.resume_zone`

Resume automatic schedule execution for one managed climate entity. By default, Velair applies the currently active schedule block for that climate when one exists. If no block applies at that moment, Velair leaves the climate untouched.

When `pause_id` is provided, Velair removes only that reason. Other reasons keep
the zone paused, and the schedule is applied only after the last reason ends.
Use `resume_all: true` to explicitly clear every reason. Omitting both fields
retains legacy resume-all behavior. The fields cannot be combined, and
`resume_all: false` without an ID is rejected.

Reasons expire independently. If any remaining reason uses `turn_off`, the
effective pause action remains off. Boosts are rejected while a zone is paused.

```yaml
action: velair.resume_zone
data:
  entity_id: climate.guest_room
  apply_current_schedule: true
  pause_id: window_guard
```

### `velair.set_daily_schedule`

Replace one weekday schedule for one managed climate.

```yaml
action: velair.set_daily_schedule
data:
  entity_id: climate.living_room
  weekday: monday
  blocks:
    - start: "06:30"
      action: set_temperature
      temperature: 21
      hvac_mode: heat
      fan_mode: quiet
    - start: "09:00"
      action: turn_off
    - start: "18:00"
      action: set_temperature
      temperature: 20
      hvac_mode: heat
```

Schedule blocks may include optional `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode`, and `humidity` values. Unsupported values are removed for the target climate before the schedule is stored or applied.

Use `action: set_climate_options` with one or more of these fields and no
temperature or `hvac_mode` to call only their Home Assistant services. For example:

```yaml
action: velair.set_daily_schedule
data:
  entity_id: climate.living_room
  weekday: monday
  blocks:
    - start: "06:30"
      action: set_climate_options
      preset_mode: comfort
    - start: "22:00"
      action: set_climate_options
      preset_mode: eco
      fan_mode: quiet
```

### `velair.copy_day_schedule`

Copy a saved Default day, including its template link and preset references,
to selected weekdays. Omit `target_entity_ids` to copy within the source climate,
or provide that list to copy to other managed climates. Every selected
climate/weekday combination is validated and saved in one transaction.

```yaml
action: velair.copy_day_schedule
data:
  entity_id: climate.living_room
  source_weekday: monday
  target_weekdays:
    - tuesday
    - wednesday
    - thursday
```

To copy the same Monday configuration to other thermostats:

```yaml
action: velair.copy_day_schedule
data:
  entity_id: climate.living_room
  source_weekday: monday
  target_weekdays:
    - monday
  target_entity_ids:
    - climate.study
    - climate.bedroom
```

The service copies the latest saved source under the configuration lock.
Optional `expected_revision` rejects the operation if configuration has changed;
the panel supplies its current revision automatically. Profiles are edited and
saved through their own complete-Profile workflow. Copying a saved independent
day removes the selected destination days' template links; other days are kept.

### `velair.clear_schedule`

Clear one weekday schedule. Omit `weekday` to clear all weekdays for that managed climate.

```yaml
action: velair.clear_schedule
data:
  entity_id: climate.living_room
  weekday: sunday
```

## Automation Events

Velair also fires Home Assistant events that can be used as automation triggers. These events are transient; they are not stored as configuration and do not replace the diagnostic entities.

All runtime events use the same Home Assistant event type:

```text
velair_event
```

The payload field `event` identifies Profile set changes, scheduler mode changes, applied targets,
Adaptive Preconditioning plans and observations, Environmental Comfort changes,
Room Assist state and target changes, boosts, and zone pauses.

See [Automation Events](automation-events.md) for the exact emission rules,
deduplication behavior, available fields, and one complete payload example for
every event type.
