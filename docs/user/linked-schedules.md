# Block presets and linked templates
<!-- velair-docs:start -->
Translations: [English original](linked-schedules.md) · [Español](linked-schedules.es.md) · [Français](linked-schedules.fr.md) · [Deutsch](linked-schedules.de.md) · [Italiano](linked-schedules.it.md) · [Nederlands](linked-schedules.nl.md) · [Polski](linked-schedules.pl.md) · [Português (Brasil)](linked-schedules.pt-br.md) · [Português (Portugal)](linked-schedules.pt-pt.md) · [Русский](linked-schedules.ru.md) · [Translation status](../translation-status.md)

---
<!-- velair-docs:end -->

Velair can reuse a climate configuration through a **block preset** and link a
day to a daily template. Choose **Times only** to share times with independent
climate settings, or **Times and settings** to follow the complete template.
Default and Profiles support both choices. A template's blocks may use manual
settings or Velair presets.

Start with [Practical examples](linked-schedule-examples.md) for shared heating,
seasonal Profiles, independent copies, link conversions, and incompatible edits.

## Block presets

A Velair block preset has a name and the same climate configuration as a
schedule block, without its start time. It can set a temperature or native
range with supported options, select an HVAC mode only, apply climate options
only, or turn the climate off. A Velair preset is different from a device's
`preset_mode`, which may be one of its configured options.

Presets belong to a shared library. Each destination is checked against its
thermostat and, where applicable, its external schedule controller. An omitted
option is not sent; omitting a fan setting does not reset the thermostat's fan.

Manage the shared library in **Templates → Climate presets**. The library
selector explains both daily templates and shared climate presets. Use the
list heading's add button to create a preset.
An empty library keeps the same list and detail layout.
Select an existing preset to inspect it; unsaved changes are shown only after you change
its name or climate settings. The optional compatibility check does not mark
the preset as edited. Uses are displayed as read-only information. The editor does
not require a thermostat: choose heating or cooling settings, a single target
or range, and optional device settings. An optional thermostat check previews
compatibility without changing the shared values. Every actual use is validated
by the backend before saving.

Save a preset with the icon beside its name. Editing preserves its position in
the library, including after reloading; new presets are appended.
Temperature fields accept either a decimal point or comma (for example,
`21.5` or `21,5`), including both limits of a native range. The editor preserves
your input while typing and sends numeric values when previewing or saving.
The optional compatibility check
shows the effective settings for a selected thermostat, with a separate success
or error result. Checking compatibility does not save the preset or change its
unsaved status.

Preset references in templates appear separately from direct references in
Default and Profiles. Usage chips count direct references, including references
in templates that have no linked days. Thermostats inheriting a preset through
a complete template are shown as additional affected destinations, without
counting the same template reference again. Device uses are grouped by thermostat,
with a separate row for Default and each Profile.

The list shows a link icon beside each usage count. Hover over the disabled
delete button to see why a preset in use cannot be deleted; unlink its blocks first.
Each preset's usage chip occupies its own last row, below its configuration summary.

Choose a preset in a schedule block to keep a live reference to it. Editing the
preset updates every reference. The block cannot also contain local climate
settings. Unlinking a preset keeps its effective configuration as manual
settings and stops future preset updates for that block.

Open a block's **Additional settings** to choose a **Velair preset**. This is
separate from **Device preset**, the thermostat's native `preset_mode` option.
The block keeps its regular time, mode, target, settings, and delete columns.
Linked climate settings appear in their usual controls and are read-only;
the time stays editable unless the day also has linked hours.

A line below the block identifies the linked preset and its additional
settings. The settings badge counts one for the Velair preset link plus each
configured device option, excluding the time, HVAC mode, and temperature target.
Values and compatibility adaptations come from the backend; loading or failed
previews do not replace the saved reference with manual settings.
Moving a block's start time keeps its resolved preset settings visible; changing
the time does not require another preset preview.

Inside Additional settings, choose another Velair preset or select **No Velair
preset** to unlink it while keeping its effective settings for manual editing.
Manage and edit shared presets in **Templates → Climate presets**. Device options
remain read-only while linked. The delete button retains its usual position and remains
disabled when the block belongs to linked template hours.

The panel shows the configuration selector first, device options next, and one
**What this block sends** summary at the end. The summary covers manual blocks
and resolved Velair presets, including temperature ranges, mode-only actions,
options-only actions, and Off. It also appears when the thermostat has no
additional device options. While a preset preview is pending or unavailable,
the summary shows that state rather than guessing its commands.

## Linked templates

### Apply a template to schedules

Open **Apply to…** on a saved daily template. The panel follows **Select →
Review → Apply**. Save pending template edits first; applying never silently
saves the shared template or applies an unsaved version.

Choose **Default** or one existing Profile, then **Independent copy**, **Times
only**, or **Times and settings**. An independent copy has no template link;
Velair preset references remain live. Times-only links retain independent
climate assignments. Complete links follow both the template's times and settings.

Choose a common **Day layout** and mark the required groups for each thermostat.
Individual days offers seven choices; Weekdays / Weekend offers two groups;
All days offers the entire week. Changing the layout clears the selection.
Changing the destination or application mode keeps selected groups but requires
a new review. Select a day header to select that column for every visible
thermostat; select it again to clear a fully selected column. On phones, the
table scrolls horizontally while thermostat names stay visible.

Only thermostats with selected groups adopt the chosen layout. Unselected days
keep their blocks and links. If the new layout groups unselected days with
different configurations, Review warns that they will retain **Different
schedules**; accepting does not equalize those days.

For **Times only**, select a base when a destination group has different saved
configurations. This choice is temporary until Apply. Velair proposes climate
assignments from that base: exact time first, then preceding times from nearest
to farthest, then following times. Presets stay references. The review identifies
each proposal's origin and lets you edit settings while template times remain
fixed. Missing compatible assignments must be completed; template settings are
not used as a silent fallback. All selected days in that group receive the same
reviewed assignments. A Profile zone without its own schedule requires manual
assignments rather than borrowing Default settings.

Review lists replaced days and links, layout changes, compatibility problems,
and any Profile zones that will change to **Profile schedule**. Back returns to
selection without saving. Apply validates and saves the entire selection once;
an invalid destination or revision conflict does not partially apply other zones.
An unsuccessful storage save preserves the prior configuration. Re-review after
the source or configuration changes. Closing with pending review edits uses the
normal discard protection.

Applying to a Profile saves that Profile's selected schedules directly; it does
not activate the Profile, select a Mode, or alter base/exception selection.
Changes to an already effective schedule can affect climate control. External
publication and physical device responses retain their normal delivery limits;
a coherent saved configuration is not a simultaneous physical response.

Template links are read-only and grouped by thermostat, then by Default or
Profile, with the linked weekdays listed together. **Linked days** counts one
linked day, regardless of how many blocks the template contains. The list shows
these day counts in a separate last row below each template's block count.
Independent copies are not counted
and do not appear in this list. Unlink all days before deleting a
template; the disabled delete button explains this requirement.

Default and Profile schedules can link each thermostat's weekday to a daily
template. With **Times only**, configure each slot's climate action in its
destination; settings may be manual or use a block preset. Different destinations
can use different actions at the same shared hour.

With **Times and settings**, the template supplies both times and climate
settings. Its blocks can contain manual settings or live preset references.
Every destination control is read-only and displays its effective values; edit
the template or unlink the day to change them. There are no per-block overrides.
Changing a template's settings affects its complete links, while hours-only
links keep their own climate settings.

For example, a Workday template starts at 07:00 and 23:00. Default can assign
its usual comfort preset, a Winter Profile can assign heating presets, and
a Summer Profile can assign cooling and Off. Moving 07:00 to 07:30 updates
all three without exchanging their configurations.

Linked hours are edited in the template, not by dragging a destination's
timeline. Changing the template's temperatures or modes does not change its
hours-only destinations. A week may mix independent days and both link types.

The **Schedule source** selector chooses an independent schedule or a template.
For a template, choose **Times only** or **Times and settings**. The information
icon explains the choices. Changing from hours-only to full asks before replacing
the day's climate assignments. Changing from full to hours-only retains the
current template settings, including preset references, as independent assignments.
**Unlink** keeps the draft's current times and configurations, including presets.
Manual settings become the effective values adapted by the backend for that
thermostat; for example, a shared 18.3 °C target becomes 18.5 °C on a device with
0.5 °C steps. Preset references stay live and the shared definitions are unchanged.
Hover, tap, or focus a locked control to see how to edit its shared configuration.
Default and Profiles use the same help controls.

Changing the Schedule source selector asks before replacing the day's draft, including
when its settings are incomplete. Settings at exactly matching times are
retained; new times require their own assignments. Cancel keeps the previous
selection and draft. Changes take effect only after saving.

Choosing **Own schedule** asks before discarding edits to that day and restores
its saved schedule in the same source: Default or the selected Profile. If the
saved day has linked hours, those saved hours and assignments become an
independent draft, keeping preset references. This does not recover a historic
manual schedule. Other weekdays are preserved.

**Unlink** is different: it retains the current draft's hours and settings,
including changes made since the last save.

## Copy or link

- **Copy blocks** copies a template's hours and climate settings, retaining
  preset references and adapting manual settings for the destination. The result
  does not follow the template.
- **Link hours** keeps times connected to the template and uses separate
  climate settings in each destination.
- **Link full configuration** follows the template's times and climate settings,
  including its live presets, with no local overrides.
- Cloning a schedule day copies its configuration, including its template link
  type, hours-only assignments, and preset references. A linked source creates
  another linked day; an independent source creates another independent day.
  Links on destination days outside the clone selection are preserved.
- Saving a day as a template retains its effective manual settings and preset
  references. It does not change the original template or shared presets.
- Clearing a day removes its local blocks and template link, without changing
  the template or other destinations.

Cloning to another thermostat checks the copied configuration against that
destination. Incompatible shared settings reject the clone rather than removing
the link or substituting manual settings. Existing per-device step adjustment
and optional-setting adaptation still apply. In Default, selected destinations
are saved together; a failing destination leaves all clone destinations unchanged.
Pending source-day changes are saved first, as with other Default clone actions.
Profile cloning changes its draft and validates the proposed Profile; saving
still commits the whole Profile.

To start an independent day from a linked one, **Unlink** it after cloning and
save. **Copy blocks** from the template library is still an independent copy.

## Shared edits

Editing a template keeps its position in the library, including after reloading.

Adding a template slot proposes a configuration for every hours-only linked day, including
inactive Profiles and Default schedules hidden by an active Profile. Velair
first tries the new slot's climate settings. If those settings are incompatible,
it tries that destination's previously saved blocks: an exact time match,
earlier blocks from nearest to farthest, then later blocks from nearest to
farthest. The first compatible configuration is copied. A donor's Velair preset
reference stays linked to that preset.

Donors belong to the same destination and weekday, using their times before
the edit. A block being moved or removed can still supply its saved settings;
another newly added block cannot. The copied settings are independent of the
template's climate settings: only the hours remain linked. If the new template
slot uses a preset, a compatible proposal retains that preset reference.

Complete links receive the new template slot unchanged, without donor selection.
If its settings are incompatible with any complete destination, the entire save
is rejected. This includes inactive Profiles and hidden Default schedules.

Review the proposals in **Linked days**, grouped by thermostat and Default or
Profile, with the link type identified. Complete links show effective settings
and errors without an assignment editor. Fallback assignments identify their source. If no compatible
configuration exists, complete the new slot there, using manual settings or a
Velair preset. Errors applying to the whole schedule, such as an external
controller's time grid or change limit, must also be resolved before saving.

The template's normal save control commits the template and all assignments
together, without a separate confirmation panel. Incomplete or incompatible
edits remain drafts; the saved schedules continue running. Moving an existing
slot keeps its destination settings, and removing a slot removes its
assignments in the same save.

Velair prevents deletion of a preset or template while it is used. A preset
referenced by an unused template is still in use. Replace or
unlink its uses first. Conflicting edits require refreshing the configuration;
they must not partially update linked destinations.

Changes to an active automatic target apply after saving. Pauses, Manual
adjustment and Boost remain authoritative. A Default edit hidden by a Profile's
own schedule does not replace that Profile; returning to Default uses the
latest Default configuration. External controllers receive resolved weeks,
not references, and failures do not enable local execution.

## Seasonal automations

Use [`velair.update_block_preset`](preset-automations.md) to update a shared
preset from an automation. Partial updates preserve other fields; explicit
replacement can change the action. Updates are persistent and affect every
reference, with normal validation and runtime authority. The guide includes
outdoor-temperature, native-range, device-option, and Off/restore examples.

Home Assistant still decides when to select a Profile or Mode. Reusing template
hours and presets avoids duplicated configuration; it does not add outdoor
temperature rules or polling to Velair. Window logic should use independently
owned zone pauses. A preset does not add an anticipation-aware return date or
extend a scheduled cooling period automatically.

## Backups and compatibility

Portable model 16 preserves presets, template slot identities and both link types.
Exports include required templates and their presets. Imports are checked
against the complete resulting configuration; existing backups without links
remain usable. Existing links without a type remain hours-only. Existing schedules
are not linked automatically during upgrade.

Temperatures retain the declared Velair temperature unit and participate in
the existing unit-migration process. A shared preset is adapted per destination
without rewriting its value to match a single thermostat's temperature step.

Scheduling timelines show the effective temperature or range returned by the
backend. A link icon marks a Velair preset; a copy icon beside the time marks
hours linked to a template. The block's native tooltip includes its action,
mode, device options and shared resource names. Pending or unavailable preset
settings are shown explicitly. Carry-over blocks describe the configuration
and resources of their source day.

Very short intervals prioritize the time and target over origin icons and
additional settings. Their details retain the complete values and resource
names without changing the interval's duration.
