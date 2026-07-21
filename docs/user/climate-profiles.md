# Climate Profiles

Climate profiles let Velair switch several climate zones between coordinated
weekly plans without replacing their Normal schedules. Home Assistant remains
the decision layer: presence, windows, seasons, selectors, sensors, or other
automations decide when a profile changes, while Velair stores, applies, and
shows the resulting climate behavior.

Examples include Home, Away, Vacation, Summer, Guest, or Sleep. Profiles also
support installations whose heating and cooling schedules use different block
times, targets, and HVAC modes.

## Normal

`Normal` is the built-in selection and always means the weekly schedules
configured in the Schedules tab. It is not a stored profile, so it cannot be
renamed or deleted.

Activating another profile never overwrites those schedules. Returning to
Normal immediately applies the Normal block that is active at that time.

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
exports. The built-in Normal selection keeps
its fixed color.
For each managed climate, choose one behavior:

- **Normal schedule**: keep using that zone's regular weekly schedule.
- **Alternate schedule**: use a complete weekly schedule stored in the profile.
- **Pause**: stop scheduled changes and leave the climate as it is.
- **Pause and turn off**: stop scheduled changes and turn the climate off.

Zones that are not configured in a profile continue using their Normal
schedules. Schedule templates can be copied into profile days as editing aids,
but profiles do not keep live links to templates. Each profile day also uses
the same editable timeline as Normal schedules and templates, including drag
and resize interactions for adjusting block times. Climate editors are collapsed
by default and show both their friendly name and entity ID; expand only the zones
you need while editing a profile.

Velair supports one active profile at a time. A single profile can still give
every zone a different schedule or behavior.

## Activate A Profile

Use the same compact climate-profile control in Overview or at the top of the
Profiles tab for a manual change. Its icon, description, and accent color
identify the current selection, while **Normal schedules** means that no
alternate profile is active. Profiles can also be activated with the play
button in the profile list. Velair applies
the block that is active at the current time instead of waiting for the next
scheduled boundary.

Activation cancels active Boosts in zones whose effective profile behavior
changes. An existing global pause or per-zone pause remains in control; Velair
records the new profile and applies it when that scheduler or zone resumes.

Overview uses each zone's effective schedule in Today's timeline and Next
events. Zones changed by the active profile show a compact, colored Profile
label with its icon and name, while
temporary Boost or Pause state remains visually in control until it ends.
Profile save, activation, and deletion confirmations use Velair's standard
temporary notification with a dismiss button and countdown bar.

Automations and scripts can use:

```yaml
action: velair.activate_profile
data:
  profile_id: vacation
```

Omit `profile_id` to return to Normal:

```yaml
action: velair.activate_profile
```

Profile identifiers are stable even if the visible profile name changes.

## Home Assistant Decides When

A profile does not contain arbitrary conditions. Use a Home Assistant
automation to observe a helper or any other local state and call
`velair.activate_profile`.

For example, an `input_select` can contain `Normal`, `Away`, and `Vacation`.
The automation maps each helper state to the matching Velair profile. This
keeps presence and house-state rules in Home Assistant rather than duplicating
an automation engine inside Velair.

## Interactions

- Global and per-zone pauses take priority over a profile change.
- Boosts in affected zones are cancelled when a profile is activated.
- Adaptive Preconditioning recalculates against the effective profile schedule.
- Room Assist follows the target from the effective profile schedule.
- Environmental Comfort remains monitoring-only and is not changed.
- Heating, cooling, heat/cool, Off blocks, and supported optional climate
  controls work the same way as in Normal schedules.

## Restart And Portability

The active profile is stored in the Velair backend and remains selected after a
Home Assistant restart. The existing **Apply active schedule after startup**
setting still controls whether Velair immediately sends the current target to
climate devices during startup. When it is disabled, Velair keeps the profile
selected and calculates future events from it without changing the current
device state during startup. When enabled, Velair immediately applies the
effective current behavior: a profile schedule applies its current block,
`Pause and turn off` switches the zone off, and plain `Pause` leaves it unchanged.
Active Boosts and pauses retain their normal priority. A global scheduler pause
also prevents immediate startup application. Future scheduled events always use
the stored active profile once scheduling is able to run.

Portable exports can include profile definitions. Importing definitions does
not activate a profile automatically.
