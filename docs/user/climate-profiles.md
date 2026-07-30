# Climate Profiles

Climate profiles let Velair switch several climate zones between coordinated
weekly plans without replacing their default schedules. Home Assistant remains
the decision layer: presence, windows, seasons, selectors, sensors, or other
automations decide when a profile changes, while Velair stores, applies, and
shows the resulting climate behavior.

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

Open the Profiles tab and use the add button to create an empty profile, then
select it from the list to edit its color, icon, name, description, and zone behavior.
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
For each managed climate, choose one behavior:

- **Default schedule**: keep using that zone's regular weekly schedule.
- **Alternate schedule**: use a complete weekly schedule stored in the profile.
- **Pause**: stop scheduled changes and leave the climate as it is.
- **Pause and turn off**: stop scheduled changes and turn the climate off.

Zones that are not configured in a profile continue using their default
schedules. Schedule templates can be copied into profile days as editing aids,
but profiles do not keep live links to templates. A configured profile day can
also be cloned to one or more other weekdays in the same zone. The copied
blocks keep their complete climate configuration, including supported HVAC,
fan, preset, swing, and humidity options.

Each profile day uses the same editable timeline as default schedules and
templates, including drag and resize interactions for adjusting block times.
While a Profile remains open for editing, temporarily changing a zone from
**Alternate schedule** to **Default schedule** or **Pause** keeps its draft
weekly schedule. Selecting **Alternate schedule** again restores those
unsaved blocks. Saving the Profile with Default or Pause still stores only that
selected behavior; the hidden draft schedule is not persisted. Climate editors
are collapsed by default and show both their friendly name and entity ID;
expand only the zones you need while editing a profile.

Several profiles can be active together when a Mode coordinates them. Their
configured zones must not overlap: each managed climate always has at most one
profile controlling its effective behavior. Zones not owned by any active
profile continue using their default schedule.

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
4. In the Profiles tab, switch the library control to **Modes**, choose
   **New mode**, name it **Away**, select both Profiles, and save.
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

Use the shared **Active setup** card in Overview or at the top of the Profiles
tab. It shows the current Mode and the Profiles that it applies as one
relationship. Select **Change** to choose a Mode or use the separate
**Activate a Profile manually** group. A direct Profile choice replaces the
active set with that Profile and changes the Mode to **Manual**, while
**Default** means that no alternate Profile is active. Profiles can also be
activated with the play button in the profile list. Velair applies
the block that is active at the current time instead of waiting for the next
scheduled boundary.

Direct activation never adds a Profile to the existing set, even when its zones
would not overlap. Create a Mode that maps every required non-overlapping
Profile when they should be activated together.

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
values used by automations can be managed from the Profiles tab without creating
another Home Assistant helper.

Two built-in values always exist and cannot be renamed or deleted:

- **Default** deactivates profiles and restores each zone's default schedule.
- **Manual** retains profiles chosen directly and indicates that no custom Mode
  controls the selection. When no profile is active, the selector resolves to
  **Default** instead.

Create custom values such as Away, Vacation, or Home and map each one to one or
more stored Climate Profiles. In the Profiles tab, switch the library control
to **Modes**, choose **New mode**, enter the option name that Home Assistant
will show, select one or more non-overlapping Profiles, and save. Selecting a
custom value activates the complete set atomically. Profiles in the same Mode
must configure different zones;
Velair rejects overlaps instead of applying an implicit priority. Multiple
Modes may still reference the same profile. Names are trimmed,
limited to 255 characters, unique without regard to letter case, and cannot use
either built-in name or Home Assistant's reserved `unknown` and `unavailable`
states.

The Profiles tab shows the active Mode and applied Climate Profiles together in
one **Active setup** card. Its single grouped chooser lists Modes first and
manual Profile activation separately. Selecting a Mode activates all its mapped
Profiles, while selecting a Profile directly replaces the active set with that
single Profile and changes the Mode to **Manual**. Mode rows show the mapped
Profiles' icons and colors, so Modes and Profiles remain distinguishable even
when they share a name. The built-in rows include a short explanation of when
they apply.

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

## Interactions

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
