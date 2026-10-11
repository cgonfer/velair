# Practical examples: presets and linked templates
<!-- velair-docs:start -->
Translations: [English original](linked-schedule-examples.md) · [Español](linked-schedule-examples.es.md) · [Français](linked-schedule-examples.fr.md) · [Deutsch](linked-schedule-examples.de.md) · [Italiano](linked-schedule-examples.it.md) · [Nederlands](linked-schedule-examples.nl.md) · [Polski](linked-schedule-examples.pl.md) · [Português (Brasil)](linked-schedule-examples.pt-br.md) · [Português (Portugal)](linked-schedule-examples.pt-pt.md) · [Русский](linked-schedule-examples.ru.md) · [Translation status](../translation-status.md)

---
<!-- velair-docs:end -->

This guide walks through household setups using **Default**, **Profiles**,
daily templates, and Velair presets. The names, entities, and temperatures are
examples: use modes and targets supported by your own thermostats. Temperatures
here are in Celsius; Velair also supports Fahrenheit.

For the complete rules, see [Block presets and linked templates](linked-schedules.md).

## Choose what you want to share

| Your goal | Choose | Later changes |
|---|---|---|
| Reuse a temperature and options at unrelated times | A Velair preset in each block | Editing the preset updates those blocks; their times stay independent. |
| Start from a template and customize its blocks | Copy blocks | Template edits do not update the copy. Any copied preset references remain live. |
| Duplicate a configured schedule day | Clone | The clone keeps the source's template link type, assignments, and preset references. |
| Use the same times with different heating or cooling settings | A template with **Times only** | Template time changes update every linked day; climate settings remain independent. |
| Keep several days identical in times and settings | A template with **Times and settings** | Time and climate changes follow the template; destination controls are read-only. |

A template is one day, not a weekly timetable. Link each required weekday and
thermostat explicitly. One week can contain independent days and both kinds of
link. Default is each thermostat's regular week; it is not a stored Profile.

## 1. One heating routine for two rooms

**Situation:** the living room and bedroom both need comfort at 07:00 and a
night setback at 23:00. Both thermostats support heating and these targets.

1. Open **Templates → Climate presets**. Create and save these presets:

   | Preset | Mode | Target |
   |---|---|---|
   | Heating comfort | Heat | 21 °C |
   | Heating night | Heat | 17 °C |

2. In the daily template library, create **Home weekday**. Add 07:00 and
   23:00. In each block's **Additional settings**, choose the corresponding
   **Velair preset** and save the template.
3. Open **Schedules → Default schedules**, select the living room and Monday.
   Set **Schedule source** to **Home weekday**, then choose **Times and settings**
   in **Link**. Save that day.
4. Repeat for the bedroom and for every weekday that should follow this routine.

The time, mode, target, and device options are read-only in those linked days.
The target column still shows 21 °C or 17 °C; it does not replace the target
with the preset name. The origin indicators and block details identify the
template and preset.

Now make two separate changes:

| Change you save | What happens |
|---|---|
| Move the template's 07:00 block to 07:30 | Every linked day starts that block at 07:30. Its preset reference stays unchanged. |
| Change Heating comfort from 21 °C to 21.5 °C | Every reference to that preset uses 21.5 °C, including through the template. Night targets remain 17 °C. |

Saving the template does not also save an unrelated open Profile draft.
Saving a preset does not save an unrelated schedule draft. Each resource has
its own save control.

## 2. Winter and summer with one set of times

**Situation:** an air conditioner heats in winter and cools in summer. The
household timetable stays the same, but the targets and actions change.

Create **Workday** with blocks at 07:00 and 23:00. Create the following presets
and use **Times only** when linking the living room's Monday in Default and
in the two Profiles:

| Shared time | Default assignment | Winter Profile assignment | Summer Profile assignment |
|---|---|---|---|
| 07:00 | Usual comfort: Heat, 20 °C | Winter comfort: Heat, 21 °C | Summer comfort: Cool, 25 °C |
| 23:00 | Manual Off | Winter night: Heat, 17 °C | Off preset |

To configure a Profile, select **Profile schedules**, create the Profile, and
set the living room to **Profile schedule**. Select the weekday, choose
**Workday → Times only**, and configure its assignments. Save the complete
Profile. In Default, save each edited day separately.

Moving the template's morning time to 07:30 moves all three schedules. Changing
the template's own target does not change these assignments. Editing **Winter
comfort** affects its preset references, including the Winter Profile, but
does not turn Summer's cooling target into a heating target.

The selected Profile still determines which week runs. Home Assistant can
select Winter or Summer using the existing Profile actions; the template does
not decide the season. For example, after creating a Profile with Automation
ID `summer`, this action selects it:

```yaml
action: velair.activate_profile
data:
  profile_id: summer
```

To return to the saved Default schedules:

```yaml
action: velair.deactivate_profile
```

Use the **Automation ID** shown in your Profile, which may differ from its
display name. See [Climate Profiles](climate-profiles.md) for Modes and profile
activation rules.

For mild weather, a locally controlled climate can have a separate Profile
whose behavior is **Pause → Turn climate off**. An automation can select
that Profile. This is different from a scheduled Off block: a paused zone does
not resume following later scheduled blocks. Pause behavior is unavailable for
externally controlled zones; their provider's supported schedule actions apply.

Forecast thresholds, periodic outdoor-temperature checks, window notifications,
and delaying the evening shutdown remain Home Assistant automation decisions.
Presets and links do not add those rules to Velair.

## 3. Copy a day, then customize a guest room

**Situation:** the guest room should start from Home weekday, but guests want
breakfast heating at 08:00 instead of 07:00.

In Schedules, select the guest room and weekday. Keep **Schedule source → Own
schedule**, then choose **Home weekday** in the separate **Templates** selector
to copy its blocks. Change the morning time to 08:00 and save. The day is
independent of the template. Moving Home weekday to
07:30 later does not move the guest room's 08:00 block.

If the copied block uses **Heating comfort**, it still refers to that preset.
Editing Heating comfort to 21.5 °C therefore also changes the guest room target.
Independent from a template does not mean independent from a preset.

To keep the guest room at 20 °C regardless of future preset edits, open the
block's Additional settings, choose **No Velair preset**, then edit the manual
target to 20 °C and save. Removing the preset first retains its effective
settings; it does not empty the block.

Cloning a schedule day is different from copying blocks from the template
library: it preserves the source day's template link. For example, clone a
Monday following **Home weekday → Times and settings** to Tuesday. Both days
now follow Home weekday; changing its 07:00 start to 07:30 updates both.

With **Times only**, the clone retains the same hours-only link and copies its
assignments, including presets. You can then change Tuesday's assignments
without changing Monday's, while both days keep following the template's times.

You can also clone Monday to Monday on another thermostat. That destination
keeps the same link type if compatible; its other weekdays keep their existing
configuration. If a shared Heat preset cannot be used by a cooling-only unit,
the clone is rejected rather than silently dropping the link. Default validates
all selected destinations together. In Profiles, the clone updates only the
validated draft until you save the Profile.

For an independent Tuesday, clone it and then choose **Unlink** before saving.
The day retains its current settings and live presets but stops following the
template. The template library's **Copy blocks** operation remains independent.

## 4. Change a link without losing the wrong draft

**Situation:** Monday is linked to Home weekday. You want to customize this
Monday but keep the other linked days unchanged.

| Choice | Result in the draft |
|---|---|
| Change **Times and settings** to **Times only** | Keep the current template settings as this day's own assignments, retaining presets. Times still follow the template. |
| Change **Times only** to **Times and settings** | Confirm replacing the day's assignments with the template's settings. Cancel keeps the original selection and draft. |
| Choose another template | Confirm replacing the draft. Cancel keeps the current template and settings. |
| Use **Unlink** | Keep the current draft's times and settings as an independent day, retaining presets. |
| Choose **Own schedule** | Confirm discarding this day's edits and restore its saved day as an independent draft. |

These operations do not save automatically. Save the Default day or the
complete Profile when ready.

For a concrete difference, suppose the saved Monday has an independent 09:00
block at 20 °C. You select a template starting at 08:00 and adjust its hours-only
assignment to 21 °C without saving:

- **Unlink** keeps 08:00 and 21 °C in the independent draft.
- **Own schedule** restores the saved 09:00 and 20 °C.

If the saved Monday was itself linked, Own schedule uses that saved linked
day's current values and makes them independent. It does not recover an older
manual schedule from before the link was created.

Materializing a day uses values adapted to its thermostat. For example, a
shared manual 18.3 °C target may appear as 18.5 °C on a device with 0.5 °C steps.
After Unlink, that manual target remains 18.5 °C. A block using a preset keeps
its preset reference instead. Neither operation changes the shared library.

## 5. Add a lunchtime block to a shared template

**Situation:** Workday already has 07:00 and 23:00 blocks. You add 12:00 with
manual Heat, 18 °C. Different rooms and Profiles use this template.

### A compatible hours-only destination

If the destination supports Heat at 18 °C, Velair proposes copying that
configuration into its new 12:00 assignment. Review it in **Linked days** and
save the template.

Only the time remains shared. Later changing the template's 12:00 target to
19 °C does not change this hours-only assignment. If the new block references
a compatible preset instead, the assignment retains that preset reference;
later edits to that preset still propagate.

### An incompatible hours-only destination

Suppose another thermostat has a minimum target of 19 °C. Its existing 07:00
assignment uses the valid preset **Office comfort: Heat, 21 °C**. The new 18 °C
target is incompatible, so Velair looks for a saved assignment in that same
thermostat's day:

1. A block at exactly 12:00, if one existed before this edit.
2. Earlier blocks, starting with the closest.
3. Later blocks, starting with the closest.

Here it proposes Office comfort from 07:00. Linked days identifies the fallback
and its source. You can accept it or choose a different valid assignment before
saving. Its preset remains live.

An incompatible donor is skipped. A block moved or deleted in this edit can
still donate its previously saved assignment; another newly added block cannot.
If no valid donor exists, Linked days shows a pending assignment. Complete it
manually or choose a compatible preset; nothing is saved while it is pending.

### A completely linked destination

For **Times and settings**, the new 12:00 block comes directly from the
template. There is no fallback to a room's old settings.

If the template's 18 °C target is incompatible with any complete destination,
the entire template save is blocked. Change the template target to something
all those destinations support, or change the affected destination to Times
only or an independent day and save that change first.

This check includes inactive Profiles and Default schedules hidden by another
active Profile. Until a valid template save completes, all saved destinations
keep their previous programming.

### Move or remove an existing block

Moving 07:00 to 07:30 preserves each hours-only destination's morning assignment;
it does not replace it with the template's target. Complete destinations follow
the updated template. Removing a block removes the matching hours-only
assignments and the corresponding complete-link block in the same save.

A block has a stable identity. Deleting it and adding another at the same time
creates a new block; it is not treated as moving the original.

## 6. Understand uses before editing or deleting

**Situation:** the preset Heating comfort is selected in:

- One block of Home weekday.
- One independent Default block on Friday.
- One hours-only assignment in a Winter Profile.

The preset has **three direct references**. If two additional days use Home
weekday with Times and settings, they inherit its preset through the template.
They appear as additional affected destinations, without increasing the direct
reference count to five.

Editing the preset affects all those references and inherited destinations.
They must all be compatible before the edit can save. A preset referenced by a
template cannot be deleted even if that template has no linked days: remove
the reference in the template first.

A template's **Linked days** count means something different. Linking Monday
and Tuesday creates two linked days. Copying it into Friday creates no link
and does not increase that count. Copies are not tracked as template uses.

Delete a template only after unlinking all its saved days in Default and
Profiles. Editing its name, times, or settings keeps its position in the library.

## 7. What happens while a schedule is active?

Suppose the living room is automatically following Heating comfort at 21 °C.
Saving that preset at 21.5 °C updates the active intention. The physical device
still needs to accept the action; saving does not prove the room has warmed up.

If the living room has a Boost to 23 °C, editing the preset does not cancel that
Boost. When it expires, Velair uses the current schedule configuration. Pauses
and Manual adjustment keep their authority too. Activating a Profile is a separate
action: it cancels Boosts in affected zones, while global and per-zone pauses
still take priority. See [Profile authority rules](climate-profiles.md).

If Winter supplies its own week, editing Default does not replace Winter's
active schedule. Returning to Default uses the latest saved Default settings.
A Profile configured to use **Default schedule** inherits Default's links and
presets rather than storing another copy.

An empty weekday does not implicitly turn the climate off. A Friday 23:00
night block continues into an empty Saturday until another scheduled block
starts. Add an explicit Off block if that is the intended action.

## 8. Device options, cooling, and temperature ranges

**Situation:** a bedroom air conditioner exposes a native `sleep` preset and
a `quiet` fan setting. You want both at 23:00 with cooling at 25 °C.

Create a Velair preset named **Bedroom summer night** with Cool, 25 °C,
Device preset `sleep`, and Fan mode `quiet`. Select it in the bedroom's 23:00
block through Additional settings. **Velair preset** is the shared Velair
configuration; **Device preset** is one command within that configuration.
The block's summary shows the target, mode, and both device options together.

At a destination that supports those options, the settings badge counts three:
one Velair link plus two device options. Temperature and HVAC mode do not add
to that badge. An omitted device option is not reset: removing `quiet` from the
shared configuration stops sending a fan command, rather than setting the fan
to another value.

For another routine, create **Quiet fan only** with just the fan option and no
target or HVAC mode. A scheduled reference sends the fan setting without
requesting an HVAC-mode change or turning on an off climate. It has no target
for Preconditioning or Room Assist. If copied to a thermostat with no fan
control, it would become an empty action and is rejected.

A climate with native Heat/cool range support can instead use a preset named
**Home range** with Heat/cool, lower target 19 °C, and upper target 24 °C. Both
limits appear in the block's target columns and come from the same preset.
Changing the upper limit to 25 °C updates its references while preserving the
lower limit. A single-target thermostat cannot use this range preset; Velair
does not invent a scalar target or a missing range limit. Use a separate
compatible preset for that device.

Mode-only presets select an HVAC mode without a temperature or additional
device options. An Off preset requests shutdown and has no target or extra
options. These actions retain their existing semantics when referenced through
a template; sharing them does not add continuous temperature control.

## Troubleshooting shared configurations


| What you see | What to check or do |
|---|---|
| A time is locked | The day follows template times. Edit the template or Unlink. |
| The mode and target are locked too | The day follows the complete template, or the block uses a Velair preset. Edit its shared source. |
| A copied day still changes temperature | It retained a preset reference. Choose No Velair preset to make that block manual. |
| A template edit fails although the active room looks valid | Check Linked days for inactive Profiles, hidden Default days, and other thermostats. |
| A new hours-only slot is pending | Choose a valid manual configuration or preset in Linked days. |
| A whole-week provider error remains | Resolve the provider's time grid, action support, or block limit. Choosing a donor cannot fix these restrictions. |
| The compatibility check passes but saving fails | The check tested one thermostat. Saving validates every actual saved destination. |
| A delete button is disabled | Remove all saved references first; templates can reference presets without having linked days. |
| Another session changed the configuration | Refresh the configuration and review the retained draft before retrying. |
| A preview fails or is still loading | Keep the draft and retry. Velair does not guess settings or remove references to make it save. |

Optional device settings unsupported by a destination can be filtered from its
effective configuration. Out-of-range targets and incompatible modes are
rejected. An options-only action cannot become empty after filtering. External
controllers impose additional restrictions; publishing a schedule never falls
back to local climate execution.

## Back up the whole setup

Use Velair's export rather than copying only a visible resolved day. Model 16
exports preserve both link types, presets, and block identities. Exporting
schedules or Profiles includes the templates and presets they depend on;
the export screen shows the sections added automatically.

On import, inspect replacements before confirming. Replacing a shared resource
can also affect existing local consumers. The combined configuration must be
valid; new Profiles are not activated just because they were imported.
Older backups remain importable, while older Velair versions cannot import a
model 16 export. See [Portability](usage.md#portability).
