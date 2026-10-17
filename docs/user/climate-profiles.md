# Climate Profiles
<!-- velair-docs:start -->
Translations: [English original](climate-profiles.md) · [Español](climate-profiles.es.md) · [Français](climate-profiles.fr.md) · [Deutsch](climate-profiles.de.md) · [Italiano](climate-profiles.it.md) · [Nederlands](climate-profiles.nl.md) · [Polski](climate-profiles.pl.md) · [Português (Brasil)](climate-profiles.pt-br.md) · [Português (Portugal)](climate-profiles.pt-pt.md) · [Русский](climate-profiles.ru.md) · [Translation status](../translation-status.md)

---
<!-- velair-docs:end -->

Climate profiles let Velair switch several climate zones between coordinated
weekly plans without replacing their default schedules. Home Assistant remains
the decision layer: presence, windows, seasons, selectors, sensors, or other
automations decide when a profile changes, while Velair stores, applies, and
shows the resulting climate behavior.

A **Profile** defines one alternative climate routine for its configured zones.
A **Mode** selects one or more non-overlapping Profiles as the household's
**base**. You can then apply Profiles as **zone exceptions**, including only
part of a multizone Profile, without changing other rooms. Establish a base
when the whole setup should change; apply exceptions for independent routines.

Examples include Home, Away, Vacation, Summer, Guest, or Sleep. Profiles also
support installations whose heating and cooling schedules use different block
times, targets, and HVAC modes.

## Default

`Default` is the built-in selection and always means the weekly schedules
configured in the Schedules tab. It is not a stored profile, so it cannot be
renamed or deleted.

Activating another profile never overwrites those schedules. Returning to
Default immediately applies the default block that is active at that time.

## Configure A Profile

Open **Schedules**, choose **Profile schedules**, and use the add button to
create an empty Profile. Select it from the list to edit its color, icon, name,
description, and thermostat behavior. The Profile workspace shows one selected
thermostat at a time so the full editor remains usable on desktop, tablet, and
mobile.
The profile name is edited from the heading, beside the pencil icon. Its stable
automation ID appears directly below the name and in the profile list so it can
be copied into services, scripts, and automations without confusing it with the
editable display name.
Icons use Material Design Icons keys such as `mdi:briefcase-outline`; the editor
shows a preview painted with the selected profile color, links to the searchable Material Design Icons catalogue, and
reports keys that do not use the expected `mdi:icon-name` format. Descriptions
are limited to 500 characters and the editor shows the remaining count. Velair
assigns a stable color to new and existing profiles; it can be changed in the
editor with either the color picker or an editable `#RRGGBB` value. Invalid
values are highlighted and cannot be saved. The color is included in portable
exports. The built-in Default selection keeps
its fixed color.

Each Profile row keeps its actions in a separate right-hand column: set as
base, apply as a zone exception, then delete. Actions remain beside the name
at narrow widths instead of wrapping below it. The buttons have transparent
backgrounds and space from the edge; active states use their icon and color.
The description stays visible, with compact **Base** and **Exception** chips
underneath for its current uses. Unused Profiles have no usage chips, and the
base action stays neutral until the Profile belongs to the base. A Profile used only
as an exception highlights its layers action, not its base action. A fully
overridden base still retains its base identity. These states describe saved
selection, not whether a thermostat is currently running. Selecting the row
opens its editor; activation and exception actions do not change the editing
selection. Confirming deletion of the edited Profile clears that editor.

For each managed climate, choose one behavior:

- **Does not participate**: this Profile does not claim the zone.
- **Default schedule**: keep using that zone's regular weekly schedule.
- **Profile schedule**: use a complete weekly schedule stored in the Profile.
- **Pause** with **Leave thermostat unchanged**: stop scheduled changes and
  leave the climate as it is.
- **Pause** with **Turn climate off**: stop scheduled changes and turn the
  climate off.

Each zone with **Profile schedule** also stores its own **Day layout**. Select
individual days, weekdays/weekend, or all days
before choosing a day. The seven cells keep the same positions; the layout
selects one day, weekdays/weekend, or the complete week together. Editing the
selected group updates those days in the Profile
draft; **Save profile** persists the complete Profile together. When days differ,
inspect them and explicitly choose a base before replacing their configurations.
Other days remain unchanged. The layout is remembered alongside the draft
schedule when temporarily switching a zone's behavior. Selected contiguous
cells connect visually and the timeline shows the common blocks. Differences
appear as compact visual alternatives: identical day configurations are grouped,
with Overview's compact read-only timeline bars and target/mode labels.
There is no permanent block list underneath; the information icon opens all
times and settings on hover, keyboard focus or tap without selecting the base.
Click or tap an alternative to
select a single base, identified by its background and border. Alternatives
stay visible so you can change the base before saving. In **All days** and
**Weekdays / Weekend**, select the schedule and use **Save profile** before the
common block editor becomes available, without an additional replacement
confirmation. The selected group contains seven days, five weekdays or two
weekend days; other days retain their schedules. A failed save preserves
the selected alternative. Changes to the shared blocks can then be saved with
the Profile as usual. Arrow keys, Space and Enter support keyboard selection. A
mixed group needs a selected base before **Save profile** is available. See
the summaries beside Save for each chosen source, zone and destination days.
Save profile also includes other pending Profile changes. Visually
matching alternatives identify differing template or preset dependencies with
compact labels. Empty alternatives show **No own blocks**; their information
explains that applying them removes own blocks; an empty day is not an off command.
See
[Day layouts and editing several days](usage.md#create-a-daily-schedule)
for grouped editing, mixed days, and portability.

Default schedule explicitly claims the zone, including for overlap validation.
A zone that does not participate inherits the base, or Default when no base
Profile includes it. Templates can still be copied as independent blocks, or a Default
or Profile weekday can link only its hours to a template and keep its own
climate settings, or follow the complete template with all controls read-only.
Templates and independent blocks can reference shared Velair presets. See
[Block presets and linked templates](linked-schedules.md) for propagation,
unlinking, compatibility, and shared-edit rules, and
[the Winter/Summer example](linked-schedule-examples.md#2-winter-and-summer-with-one-set-of-times)
for different climate settings sharing the same hours. Cloning a day preserves
its template link type, hours-only assignments, and block-preset references.
Cloning to another thermostat validates the proposed Profile before applying
the draft; other destination days keep their existing links. Use Unlink after
cloning if the new day should be independent of the template.

For a zone delegated to an external controller, Profiles and Modes select the
effective full week that Velair publishes instead of causing direct
`climate.*` actions. **Default schedule** publishes the regular week and
**Profile schedule** publishes the Profile week. **Pause** behavior is not
available for an externally managed zone. The Profile editor applies the
controller capabilities as additional validation, and a publication failure
does not undo the saved Profile or Mode selection or affect locally executed
zones. See [External schedule execution](external-systems.md) for the current
controller limits and publication semantics.

From an edited Profile schedule day, **Save as template** stores only a
reusable template through the backend and leaves the unsaved Profile draft
unchanged. To reuse the selection in other managed climates, select them in the
**Other thermostats** clone panel and choose **Clone**. Its label follows the
selected layout: one day, Monday–Friday, Saturday–Sunday, or All days. The confirmation
summarizes the selected climates and identifies any Default or Pause zones that
will change to **Profile schedule** and lists the selected days. Cloning replaces
only those matching weekdays, preserves all other remembered days and the target's
day layout, and remains part of the Profile draft. Day-to-day cloning is available
only with **Individual days**. Grouped editors omit that panel and the shortcut
to change layouts; use the regular **Day layout** selector instead. Default and
Profile editors use the same selected-group scope for copies to other thermostats.
Velair validates target type, HVAC mode, temperature limits, and temperature
step for every selected climate before changing the draft. It removes optional
controls unsupported by each destination climate. If an option-only block has
no supported controls left, or a target or mode is incompatible, none of the
draft changes. Cloned days are persisted only when the Profile is saved.

Each profile day uses the same editable timeline as default schedules and
templates, including drag and resize interactions for adjusting block times.
Schedule blocks have a start time but no separate end time, so the last block
continues across midnight and empty weekdays until another block starts. The
timeline represents the inherited part of the day with a distinct, non-editable
segment and identifies the weekday where that block is actually configured.
While a Profile remains open for editing, temporarily changing a zone from
**Profile schedule** to **Default schedule** or **Pause** keeps its draft
weekly schedule. Selecting **Profile schedule** again restores those
unsaved blocks. Saving the Profile with Default or Pause still stores only that
selected behavior; the hidden draft schedule is not persisted. The thermostat
selector shows friendly names, while the active editor also shows the entity
ID. Profile metadata and schedules are still saved together as one atomic
Profile; changing the selected thermostat does not save a partial draft.

Several Profiles can form a base when a Mode coordinates them. Their
configured zones must not overlap. Exceptions may replace individual zones from that base:
each managed climate still has exactly one effective routine. There is no merging
of schedule blocks and no priority stack of previous exceptions.

## Worked Example: An Away Mode

Suppose the home has living-area and bedroom climates that need different
behavior while nobody is home:

1. Create a Profile named **Away · Living areas**. Give the living room and
   kitchen alternate schedules with targets appropriate to the installation,
   whether it heats, cools, or supports both.
2. Create a Profile named **Away · Bedrooms**. Configure the bedroom zones with
   another alternate schedule, **Pause**, or **Pause and turn off**.
3. Leave any unaffected zones out of both Profiles. They will continue using
   their Default schedules.
4. Open **Modes**, choose **New mode**, name it **Away**, select both Profiles,
   and save.
5. In **Active setup**, choose **Change**, then select **Away**. Velair applies
   both Profiles as one atomic selection.

This arrangement is valid because the two Profiles configure different zones.
If both configured the same climate, Velair would reject the Mode and ask you
to remove the overlap.

The same Mode can be selected from a Home Assistant automation:

```yaml
alias: Use Away climate mode
triggers:
  - trigger: state
    entity_id: person.resident
    to: "not_home"
actions:
  - action: select.select_option
    target:
      entity_id: select.velair_mode
    data:
      option: Away
```

Another automation can restore every zone's regular schedule:

```yaml
alias: Restore default climate schedules
triggers:
  - trigger: state
    entity_id: person.resident
    to: "home"
actions:
  - action: select.select_option
    target:
      entity_id: select.velair_mode
    data:
      option: Default
```

Replace the person entity and visible Mode names with those used in the Home
Assistant installation. If a Mode is renamed, update automations that select
its visible option.

## Activate A Profile

Use the play button on a Profile row in **Schedules > Profile schedules** for
direct activation, or use the shared **Active setup** card in Overview or at
the top of **Modes**. It separates the **Base** from **Exceptions**, identifying
whether the base comes from a Mode, one Profile, several Profiles or Default.
Select **Change** to choose a Mode or use the separate **Profiles** group.
Selecting a Profile row establishes that Profile as the complete base; the
compact layers icon beside it applies only its configured zones as exceptions.
A direct Profile choice replaces the
active set with that Profile and changes the Mode to **Manual**, while
**Default** means that no alternate Profile is active. Profiles can also be
activated directly from its Profile row, from Active setup, or with the
`velair.activate_profile` action. Velair applies
the block that is active at the current time instead of waiting for the next
scheduled boundary. This includes the latest block from an earlier day when no
new block has started yet in the current day.

Direct activation never adds a Profile to the existing set, even when its zones
would not overlap. Zones controlled by the previous Mode or Profile set but not
included in the newly activated Profile immediately return to their Default
schedules; they do not retain the previous configuration.
Create a Mode that maps every required non-overlapping Profile when they should
be activated together.

Activation cancels active Boosts in zones whose effective profile behavior
changes. An existing global pause or per-zone pause remains in control; Velair
records the new profile and applies it when that scheduler or zone resumes.

Overview uses each zone's effective schedule in Today's timeline and Next
events. Zones changed by the active profile show a compact, colored Profile
label with its icon and name, while
temporary Boost or Pause state remains visually in control until it ends.
Profile save, activation, and deletion confirmations use Velair's standard
temporary notification with a dismiss button and countdown bar.

Mode changes and Profile activations also show a global operation strip while
Velair processes the affected zones. It remains visible when moving between
panel tabs. In Lovelace, the strip appears only in the Active setup card, where
Mode and Profile activations are performed. The counter reports zones that
Velair has finished processing,
including zones whose current pause or override means that no climate command
is required; it does not claim that a physical room has already reached its target.
The final state distinguishes complete success from a transition that finished
with one or more zone errors. Successful results disappear automatically after
a short confirmation period; partial and failed results remain available until
they are dismissed, including while moving between panel tabs.

Automations and scripts can use:

```yaml
action: velair.activate_profile
data:
  profile_id: vacation
```

In Home Assistant's visual automation editor, add an action and search for
**Velair: Activate climate profile**. This integration action is separate from
the switch and select actions shown when filtering by the Velair device. Enter
the Profile's **Automation ID**, shown below its name in Velair.

Use the explicit deactivation service to return to default schedules:

```yaml
action: velair.deactivate_profile
```

Omitting `profile_id` from `velair.activate_profile` remains supported for
compatibility. Profile identifiers are stable even if the visible profile name
changes. A direct activation from the panel or service sets the native Mode
selector to `Manual`, including when the same profile was already active.

## Modes

A profile does not contain arbitrary conditions. Home Assistant remains the
decision layer. Velair owns a native `select.velair_mode` entity so the
values used by automations can be managed from the Modes tab without creating
another Home Assistant helper.

Two built-in values always exist and cannot be renamed or deleted:

- **Default** deactivates profiles and restores each zone's default schedule.
- **Manual** means that no custom Mode currently controls the active Profile
  set. Direct Profile activation normally enters this state. It is shown as the
  current state but is not an action in Velair's chooser. Select **Default** or
  a custom Mode to leave it. The native Home Assistant entity retains its
  Manual option for compatibility; selecting it keeps the active Profiles but
  detaches them from their custom Mode.

Create custom values such as Away, Vacation, or Home and map each one to one or
more stored Climate Profiles. In **Modes**, choose **New mode**, enter the
option name that Home Assistant
will show, select one or more non-overlapping Profiles, and save. Selecting a
custom value activates the complete set atomically. Profiles in the same Mode
must configure different zones;
Velair rejects overlaps instead of applying an implicit priority. Multiple
Modes may still reference the same profile. Names are trimmed,
limited to 255 characters, unique without regard to letter case, and cannot use
either built-in name or Home Assistant's reserved `unknown` and `unavailable`
states.

The Modes tab shows the selected base and its zone exceptions together in
one **Active setup** card. Its grouped chooser lists Default and custom
Modes first, with Profile base and exception actions separately. Manual remains
a native Home Assistant select state, rather than the panel's base name.
Selecting a Mode activates
all its mapped Profiles, while selecting a Profile directly replaces the active
set with that single Profile and changes the Mode to **Manual**. Mode rows show
the mapped Profiles' icons and colors, so Modes and Profiles remain
distinguishable even when they share a name. The built-in rows include a short
explanation of when they apply.

Use Home Assistant's standard select action in automations:

```yaml
action: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Vacation
```

Mode identifiers remain stable when their visible names change, so the current
selection survives a rename. The visible option name is the Home Assistant
entity state, however, so automations that refer to a renamed or deleted option
must be updated.

Remapping the currently selected mode activates its new profile set as one
atomic change. Deleting the selected mode leaves its active profiles in place
and changes the selector to **Manual**. Deleting a profile also removes the
Modes mapped to it and removes only that profile from the active set; Velair
returns to **Default** when the set becomes empty.

## A Base With Independent Zone Exceptions

A Profile can include several rooms. Applying it as an exception replaces the
routine only in its explicitly configured rooms; it does not change other rooms
or rewrite the Profile. Each room uses one complete weekly routine, never a
mixture of blocks from multiple Profiles.

For example, a **Winter** base covers the office, living room and bedroom.
**Remote work** includes the office and living room; **Guests** includes the
living room and guest room:

| Change | Office | Living room | Bedroom | Guest room |
| --- | --- | --- | --- | --- |
| Select Winter base | Winter | Winter | Winter | Default |
| Apply Remote work | Remote work | Remote work | Winter | Default |
| Apply Guests later | Remote work | Guests | Winter | Guests |
| Restore living room to base | Remote work | Winter | Winter | Guests |

Restoring the living room to its base does not revive Remote work. Exceptions
have no history stack. Explicitly choosing Default is different: it uses the
zone's regular schedule even when the base includes another routine for it.

Use **Apply as exception** in Active setup, or an automation:

```yaml
action: velair.apply_profiles
data:
  profile_ids: [remote_work]
```

One request may apply several Profiles only when they include different zones.
For example, `[remote_work, guests]` is rejected completely because both include
the living room. Applying Guests in a later request intentionally replaces that
room's exception and preserves the office.

To apply just one room from a multizone Profile:

```yaml
action: velair.set_zone_profile
data:
  entity_id: climate.office
  profile_id: remote_work
```

The Profile must explicitly include that managed room. Use `profile_id: null`
to impose Default. To remove an exception and inherit the current base:

```yaml
action: velair.clear_profile_overrides
data:
  entity_id: [climate.office, climate.living_room]
```

To replace the whole base and remove every exception without creating a Mode:

```yaml
action: velair.activate_profiles
data:
  profile_ids: [winter_office, winter_bedrooms]
```

Base Profiles must not overlap. An empty activation list selects Default;
empty application or clear lists do nothing. New actions require their fields:
an omitted value never means "all rooms" or "Default".

Active setup shows **Base** and its type together above the base name, using
two compact levels on phones and narrow dashboard cards. Long names wrap when
needed. A coverage line shows how many of the base's included managed zones
still inherit it. Exceptions, including explicit Default or the same Profile,
are excluded from this count. Zones outside a Profile base use Default and are
not counted as part of that base. A Default base includes every managed zone.
This describes selection ownership, not whether devices are currently running.
An empty base scope is distinguished from one fully replaced by exceptions.
Below the base's own coverage summary, **Household distribution** is a disclosure
closed initially. Its label states the household total, independently of the
base's included-zone count. Select it to reveal the 6px bar and its entire
legend; select it again or press Escape to collapse them. The header stays
fixed while content expands downwards, with a short transition that respects
reduced-motion preferences. The bar represents every managed zone using the
Profiles' colors.
Exception segments include zones outside the base, so their counts match the
Exceptions list. Zones outside the base with no exception have a separate
neutral Default segment. A compact legend uses 14px Profile icons, names and
origin, with counts in a separate right-aligned column. Explicit Default
exceptions also use a neutral color. Base,
exception and fallback references remain distinct even when colors coincide.
The base's own coverage count stays separate and appears once. An empty Profile
base can still have a household bar with Default zones; no managed zones means
no bar. These figures describe selection ownership, not physical device state.
Participating base Profiles are identified in the expanded legend; Mode bases
do not repeat a separate component list above it.
On desktop, the base occupies less width than the exceptions. Its icon stays
aligned with the top of its name and type. The Exceptions heading uses the
layers icon to identify the same concept as Profile exception actions.
**Exceptions** lists each Profile and a button with
its zone count; explicit Default exceptions have their own group. Room names
stay hidden until requested. Select anywhere on an exception row to expand that group's
rooms beneath its row without replacing the other exceptions. Select it again
or press Escape to collapse it; opening another group closes the previous one.
Expansion uses a short transition and respects reduced-motion preferences.
The selected row and its count stay in place; room details grow downwards and
push subsequent rows down, so the same button can be used to collapse them.
Long room lists scroll inside the expanded area instead of filling the overview.
An unmodified base shows **No exceptions**. The base remains visible even when
every room is currently overridden. Active setup does not include a separate
per-zone editing workspace; use the documented zone actions for targeted changes.
The native Mode select shows Manual while
exceptions exist. Clearing all exceptions restores the original Mode label if
it still exists. Selecting a custom Mode or Default, activating a single Profile,
or activating a complete list explicitly replaces the base and clears exceptions.
The native Manual option only releases the base Mode association and keeps the
base and exceptions.

Editing a base Mode preserves its exceptions. Renaming or editing a Profile
keeps references live: changed schedules affect the rooms using them. Adding a
room to a Profile does not expand an exception previously applied to other rooms.
Remove an exception before editing its Profile to remove the referenced room.
Deleting a Profile, or importing definitions that remove it, removes its
exceptions and returns those rooms to the remaining base or Default.

Home Assistant still decides the combination of season, presence and personal
routine. A seasonal Mode is a complete selection, not an extra layer above
room exceptions. Recalculate the relevant room selections after changing season.
Different room actions compose safely; competing actions for the same room are
accepted in order. A complete base selection can replace all of them.

All explicit selection actions cancel a pending Return home, including a repeated
selection. Empty apply/clear lists do not. Return home cancellation can affect
preparation elsewhere in the house. It is saved separately from the subsequent
selection: if the latter save fails, the previous selection can remain with
Return home already cancelled. Invalid requests never cancel it.

Selection changes are persisted together, but devices may apply them at different
times or report individual failures. Existing pauses and delivery restrictions
remain in control. A change only to selection attribution does not cancel Boost
or send duplicate climate actions when the effective routine is unchanged.
Externally executed rooms publish their effective week with the provider's
existing restrictions. Profiles do not remove shared equipment constraints.

The complete base and exception intent survives restart. Portable exports contain
definitions, not this active intent; import never activates new Profiles.

## Seasonal selection

The [seasonal climate selection blueprint](blueprints/seasonal-climate-selection.md)
can choose a Mode from a daily maximum or other temperature sensor after a
stable change. Link winter and summer Profiles to the same template's hours
and give them different presets. Configure a mild-weather Profile with pause
and turn-off when no climatization is wanted. Coordinate this automation with
presence rules: another stable reading can replace a manually selected Away Mode.

## Interactions

- **Temperature only** blocks retain their policy in Profiles, reusable presets,
  templates, and linked template bindings. Activating a Profile or Mode with such
  a block updates its target without requesting an HVAC mode change. It does
  not turn an off climate on; the integration must accept targets while off.
- Global and per-zone pauses take priority over a profile change.
- Boosts in affected zones are cancelled when a profile is activated.
- Adaptive Preconditioning recalculates against the effective profile schedule.
- Room Assist follows the target from the effective profile schedule.
- Environmental Comfort remains monitoring-only and is not changed.
- Heating, cooling, heat/cool, Off blocks, and supported optional climate
  controls work the same way as in default schedules.

## Restart And Portability

The active profile set, custom Modes, and selected mode identifier are stored
in the Velair backend. After a Home Assistant restart, the native select entity
is reconstructed from that state; it does not independently activate a profile.
The existing **Apply active schedule after startup** setting controls only
whether Velair immediately sends the current effective target to climate devices.
When disabled, Velair retains the profile and calculates future events from it
without changing device state during startup. When enabled, a profile schedule
applies its current block, `Pause and turn off` switches the zone off, and plain
`Pause` leaves it unchanged. Active Boosts, pauses, and a global scheduler pause
retain their normal priority.

Portable V5 exports can include profile definitions and Mode definitions
as separate sections. They never include the active profile or selected mode
intent, so import cannot activate a different profile implicitly. Importing only
profiles prunes Modes whose mapped profiles no longer exist. Importing Modes
validates every mapping and rejects overlapping configured zones.

In **Settings > Portability**, select **Climate profiles** and **Modes** when
exporting. On import, review and select both sections before confirming. The
selected definitions are overwritten, but the currently active Profile set and
Mode selection are never imported.

Each Mode maps to one or more Profiles with non-overlapping configured zones.
The complete set activates atomically, while direct Profile activation replaces
the set with a single Profile and selects Manual.
