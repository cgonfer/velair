# Manual Testing

Use this checklist before publishing a release or after changing scheduler behavior.

## Preparation

- Use a non-critical Home Assistant instance.
- Choose safe `climate.*` entities.
- Avoid hardware where unexpected temperature changes would cause discomfort or waste energy.
- Keep Home Assistant logs open.

## Install

Install through the default HACS store or copy:

```text
custom_components/velair
```

to:

```text
<home_assistant_config>/custom_components/velair
```

Restart Home Assistant.

## Climate Card Editor And Actions

Header checks:

- Verify the header with and without a reported `hvac_action`. When it is
  absent, the HVAC mode must appear only once and must not be presented as an
  active heating or cooling action.
- Check heating, cooling, idle, off, unavailable, and externally managed zones.
- Force an `off` entity with a stale `hvac_action: idle`; confirm the header uses
  the power icon and Off, does not repeat Off, and does not look paused. With an
  active Heat or Cool mode and `hvac_action: idle`, confirm the neutral thermostat
  icon and attenuated mode-colored line are used.
- Confirm the top line uses warm heating/preheating, blue cooling, steady
  drying/fan, neutral off, and an interrupted unavailable treatment. It must not
  imply progress or change for Boost, Pause, or external ownership. Enable
  reduced motion and confirm its sweep is disabled.
- At card widths around 380 px, confirm that the Velair shortcut keeps its
  slightly enlarged logo beside the two-line `Velair` / `by cgonfer` signature
  without overlapping a long climate name or losing its keyboard focus
  indication and touch target.
- Toggle the climate name and operating state independently; hidden items must
  not reserve empty header space, while the fixed Velair signature remains.

1. Add a `view: climate` card, select a climate, and confirm its friendly name
   initially fills the custom-name field.
2. Delete the complete name and confirm it stays empty after every editor
   refresh. Enter another label, reopen the editor, and confirm the exact value
   remains selected. Use Reset and confirm the current entity friendly name is
   restored.
3. Confirm Room Assist display, default presentation, and graph settings are
   grouped in one editor section. Confirm the corresponding preconditioning
   settings are grouped in their own section.
4. Reorder Boost, Pause/Resume, and scripts in the single action list. Confirm
   every row keeps its move controls first, then its icon and name, with delete
   available only for script shortcuts and the disclosure control last. Hide
   each Velair action independently and confirm it is identified as supplied and
   not customizable. Confirm external and unavailable zones never expose
   Velair-only actions, while later eligible scripts move up without leaving gaps.
5. Add at least five existing `script.*` entities. Configure distinct names, MDI
   icons, colors, order, and confirmation values. Reopen the editor and confirm
   every value and the selected climate are preserved. Confirm the editor states
   that the direct-action limit is three, does not expose a limit setting, and
   explains Automatic and More menu placement for every action.
6. Open **More** near each viewport edge on desktop and mobile. Confirm the menu
   stays fully visible, prefers opening below, opens above when required, and
   scrolls internally when its contents cannot fit.
7. Run an unconfirmed shortcut and confirm Home Assistant receives only
   `script.turn_on` with its selected `entity_id`. Cancel a confirmed shortcut
   and confirm no service call occurs; accept it and confirm exactly one call.
8. Remove or disable a configured script and confirm its shortcut is visibly
   unavailable and cannot run. Confirm arbitrary services, payloads, templates,
   and JavaScript cannot be configured through the editor.
9. Confirm the first three eligible actions using Automatic placement are direct
   and **More** contains automatically overflowing and explicitly delegated
   actions in their configured relative order, followed by **Open Velair**.
   Delegate one of three actions and confirm **More** appears; return it to
   Automatic and confirm **More** disappears. Delegate every action and confirm
   the card shows only the icon-only **More** button. Confirm the actions share
   the top of the climate control surface with Automatic/Manual as two separate
   islands aligned to opposite ends. At narrow widths, confirm both remain in one
   row and only the actions island gains horizontal scrolling, without exposing
   more than three direct actions plus **More**.
   Give a direct action a long visible name and confirm its button grows enough
   to show the complete name on one line; the actions island must scroll instead
   of truncating or wrapping the label. Confirm hidden-name actions remain compact.
   Confirm the native scrollbar remains hidden, the left and right indicators
   appear only while content remains in that direction, stay outside the
   scrollable action row, and keep their fixed outer slots when hidden so no
   indicator changes the toolbar width or height. Swipe the row on touch and
   drag it with a primary mouse or pen pointer. A drag must not execute the
   action beneath it, while a normal click must still work.
10. Open Boost and Pause. Confirm each form replaces the normal HVAC mode,
    target, and Home Assistant pane without moving to another section. Close it
    with Cancel and by pressing its selected action again, and confirm applying
    either action returns to the normal controls. Confirm the selected action
    includes a close icon. Run successful and failing custom scripts and confirm
    the direct action briefly shows distinct progress, success, and error feedback.
11. Hide every thermostat control while keeping actions visible, then hide the
    actions too. Confirm the actions-only surface remains complete and that no
    empty control container remains when every internal item is hidden.
12. In Manual adjustment, change the target repeatedly with the decrement and
    increment buttons. Confirm the Automatic/Manual selector remains visually
    stable while each Home Assistant service call is pending. Confirm the same
    for the complete lower surface: HVAC mode icon and label, selector accent,
    target value, and `−`/`+` controls must not dim, flatten, or flash while the
    request is in flight.
13. Set Current state's default presentation to collapsed and reload the card.
    Confirm temperature, humidity, outdoor context, non-zero window states, and
    Comfort appear as compact theme-safe items only when their expanded
    counterparts are enabled. The compact sensor items must wrap onto as many
    rows as the available width requires; they must not scroll horizontally or
    expose directional controls. Confirm an available Comfort assessment appears
    as a separate descriptive row below the collapsed heading, with its icon,
    condition, air-quality context, and accent. Confirm that an unavailable
    assessment is omitted without leaving an empty row and that the expand
    control remains visible. Expand it again, click outside the chevron on
    several points of the complete heading to collapse it, and confirm both
    transitions are smooth; repeat at mobile width and with reduced motion.
    Change the configured default to expanded, reload, and confirm the initial
    presentation changes without preventing later manual collapse or expansion.
14. Repeat in Home Assistant light and dark themes, with keyboard focus and
    Escape, and with an externally executed zone. Custom scripts may remain
    available externally, but Boost and Pause/Resume must not appear.

## Setup Flow

1. Go to **Settings > Devices & services**.
2. Add Velair.
3. Select one or more `climate.*` entities.
4. Confirm setup completes without log errors.
5. Confirm Velair appears in the sidebar.
6. Open Velair Settings and confirm the read-only temperature unit matches Home
   Assistant's configured unit system.

## Legacy Temperature Migration

1. Load published unitless v1.1 storage under Fahrenheit and confirm it is
   treated as Celsius without automatic conversion.
2. Confirm no climate action is applied,
   the scheduler status is `temperature_migration_required`, and Home Assistant
   creates one persistent Velair notification.
3. Confirm services, normal configuration writes, and import are rejected, while
   export remains available as a reference backup and Reset Velair is offered.
4. Reset and confirm fresh schedules, templates, Comfort, Room Assist, and
   Adaptive Preconditioning defaults are valid Fahrenheit values.
5. Confirm the notification is dismissed and scheduling resumes only after the
   reset payload is stored and runtime cleanup succeeds.

## Home Assistant Unit Change

1. Start with runtime-unit storage whose declared unit matches Home Assistant,
   then change Home Assistant to the other temperature unit.
2. Confirm scheduling and thermal writes stop, export remains available, and
   Settings shows the stored source and current target units.
3. Leave the action untouched and confirm Velair does not convert or resume
   automatically.
4. Run the explicit migration and confirm schedules, templates, overrides,
   Comfort, Room Assist, Adaptive Preconditioning settings, rates, and learning
   remain physically equivalent.
5. Confirm known climate targets align to the exact published target step. Test
   an unavailable climate and confirm incompatible schedules are reported after
   its capabilities return.
6. Repeat the same migration id and confirm it is a no-op. Repeat with a stale
   revision and confirm it is rejected.
7. Simulate a storage failure and confirm original runtime values remain intact.
   Simulate a post-persist runtime failure and confirm Velair stays stopped with
   recovery guidance until the integration reloads or Home Assistant restarts.

## Portable Temperature Data

1. Export in Celsius and Fahrenheit and confirm portable model v11 records the
   effective `temperature_unit`.
2. Import each newly exported portable v10 file back into the same installation
   and confirm the frontend accepts it and the selected sections round-trip.
3. Import a portable v10 file into the opposite unit and confirm selected
   thermal sections convert. Confirm its Comfort derived-metric and outdoor-
   comparison configuration is retained without importing runtime readings.
   Older supported files, including v8 and v9, must remain compatible.
4. Import a unitless legacy backup and confirm the UI warns that Celsius is
   assumed before the backend converts it when required.
5. Confirm known climate targets use exact published steps. For an entity that
   omits its step, configure the per-zone fallback and confirm migration and
   import align its values to that grid.

## Options Flow

1. Open Velair integration options.
2. Add or remove a climate entity.
3. Toggle startup behavior.
4. Save.
5. Confirm the integration reloads.
6. Confirm removed climates are no longer managed.

## Entities

The integration should create scheduler status/control entities. Exact entity IDs may differ if Home Assistant adds suffixes.

Expected entity types include:

- one Automatic scheduling switch and one Mode select entity;
- one next scheduled event sensor;
- one scheduler status sensor;
- one active target temperature sensor per managed climate;
- environmental condition and air-quality sensors per managed climate;
- zone override, Zone control, preconditioning start, and Room Assist state
  sensors per managed climate;
- one disabled-by-default Zone delivery diagnostics sensor per managed climate.

Confirm that:

- active target sensors use each climate entity's temperature unit;
- their names use the climate friendly name;
- an active target started early by Adaptive Preconditioning exposes both
  `when` and `target_when`;
- comfort and air-quality states remain independent and do not copy raw source
  readings;
- optional features expose clear inactive states when they are disabled or not
  configured;
- Zone control reports `automatic`, `manual`, or `external` while keeping
  pause, Boost, preconditioning, and scheduler activity in `runtime_state`;
- during a required temperature migration, Zone control remains available and
  reports `runtime_state: temperature_migration_required` without projecting a
  stale scheduled or idle state;
- after one accepted scalar, range, and `turn_off` delivery, the enabled Zone
  delivery diagnostics sensor exposes only the applicable target fields,
  recorded temperature unit, timestamps, retry count, and stable error codes;
  it must not expose raw error text or imply device confirmation;
- after reloading the integration, Zone control is reconstructed while Zone
  delivery diagnostics returns to `idle` without a last accepted target;
- turning Automatic scheduling off stops indefinitely and turning it on resumes
  the current schedule;
- removing a climate through the integration options removes its generated zone
  sensors after the integration reloads, without removing global Velair
  entities or entities from other integrations;
- scheduler status values are translated in every supported frontend and backend language;
- changing only a user profile language does not rename existing entities,
  because Home Assistant stores their original names at entity creation.

## Services

Confirm these services are available in Developer Tools > Actions:

- `velair.set_temperature`
- `velair.set_hvac_mode`
- `velair.apply_schedule`
- `velair.boost`
- `velair.pause`
- `velair.pause_zone`
- `velair.resume`
- `velair.resume_zone`
- `velair.set_daily_schedule`
- `velair.copy_day_schedule`
- `velair.clear_schedule`
- `velair.activate_profile`
- `velair.deactivate_profile`

Services with `entity_id` must reject climates that were not selected during setup.

For `velair.set_hvac_mode`, test one supported heating mode and one supported
cooling mode. Confirm the action changes only HVAC mode, preserves the device
target, emits `climate_target_applied` with `source: service_set_hvac_mode`, and
does not enter Manual adjustment. Also confirm `off`, an unadvertised mode, an
externally executed zone, and an unmanaged climate are rejected. Make the
underlying climate call fail while Room Assist is active and confirm no success
event is emitted and Room Assist remains active. Start from `off` on a climate
that restores its previous target when enabled, call the service, and confirm
the restored target is treated as part of Velair's mode change rather than an
external adjustment.

## Climate Profiles Smoke Test

1. Open **Schedules** and switch between **Default schedules** and **Profile
   schedules**. Confirm the current local weekday is selected on entry, remains
   selected while navigating within the workspace, and Lovelace
   `view: schedules` remains Default-only.
2. Edit a Default day, then try to change thermostat, weekday, schedule source,
   and top-level tab. Cancel each prompt and confirm the draft remains exactly
   unchanged. Repeat and accept each prompt; confirm the stored destination is
   loaded and the discarded draft does not return after a WebSocket update.
3. In **Profile schedules**, create a Profile with a name, icon, and description.
   Confirm Profile rows provide create, edit, delete, and direct activation.
   The activation and delete buttons must remain aligned with the create button
   above the list.
4. Give one zone an alternate heat or cool schedule, pause a second zone, and
   leave a third zone on its default schedule.
5. Copy template blocks into one profile day, edit the draft, and confirm the
   template itself is unchanged.
6. Confirm Default and Profile weekly editors present the same sequence:
   weekday, timeline, template, blocks, save actions, cloning to days, and
   cloning to thermostats. Exercise scalar targets, heat/cool ranges, Off
   blocks, and supported fan, preset, swing, horizontal swing, and humidity
   options. Save once and confirm all Profile metadata and thermostat schedules
   are sent as one Profile operation.
7. Enter an invalid target in a non-selected thermostat. Confirm its selector
   is marked as invalid, the visible message names that thermostat/day/block,
   and Save Profile is disabled with an explanation.
8. Start Boost on an affected zone, activate the profile from **Modes**, and confirm Boost is
   cancelled and the block valid at the current time is applied immediately.
9. Confirm the omitted zone continues its default schedule.
10. Activate the profile while Global Pause and then Zone Pause are active;
   confirm selection persists without overriding either pause and applies after
   resume.
11. Select Default from Overview and through
   `velair.deactivate_profile`. Confirm an empty `profile_id` on
   `velair.activate_profile` remains a compatibility alias.
12. Restart Home Assistant with startup application disabled and enabled. In both
   cases confirm the selection persists; only the enabled case should force the
   current target during startup.
13. Export and import the `profiles` and `modes` sections and confirm
   definitions move without activating an imported profile. If the replacement
   omits the active profile, confirm Velair returns to default schedules.
14. Repeat the editor and active selector checks at desktop, tablet, and mobile
    widths in every supported language. At a typical 390 px mobile width,
    confirm each schedule block keeps time, mode, target, options, and delete
    controls in one compact row without horizontal overflow. At exceptionally
    narrow widths, confirm the fallback layout remains readable and usable.
    For every supported non-off HVAC mode, disable the Target input with its
    compact thermometer button and confirm the grey field shows a dash without
    adding a column or depending on visible explanatory text. Enable it again,
    confirm the previous draft target returns, and verify Save requires that
    restored target to be valid.
15. Listen for `velair_event` and confirm profile activation, return to Default,
    and deletion of the active profile emit `profile_changed` with the expected
    `profile_ids` and `previous_profile_ids`. Re-selecting the current set must
    not emit a duplicate event.
16. In **Modes**, create two custom Modes and map them to stored Profiles.
    Confirm each mode row shows every mapped Profile icon and exact color, and
    that Default and Manual have short explanatory descriptions.
17. In both Overview and Modes, confirm the shared **Active setup** card
    shows the current Mode and its applied Profiles as one relationship. Open
    its single chooser and confirm Default and custom Modes appear separately
    from direct Profile activation. Confirm Manual is visible as the current
    state when applicable but is never offered as a chooser action. A Mode must
    activate its mapped set, while a direct Profile selection must replace it
    with one Profile and switch the Mode to Manual. Confirm explanatory text
    inside the chooser can be clicked without closing or crashing the browser.
    Confirm the chooser closes after selection, with Escape, and when clicking
    outside it. Repeat at desktop and mobile widths.
    Confirm `Default` and `Manual` cannot be renamed or deleted.
18. Select each custom value through `select.velair_mode` and confirm its
    mapped Profiles change once. For compatibility, select Manual through the
    native entity and confirm the current set remains active; select Default
    and confirm it is emptied.
19. Change Profile through **Modes** and through `velair.activate_profile`; confirm
    the native selector reports Manual, including direct reactivation of the
    already active profile without repeating climate calls or events.
    Confirm this direct selection replaces every other active Profile instead
    of extending the set.
20. Rename a selected Mode and confirm selection survives without reapplying
    Profiles. Remap it and confirm the new set applies atomically. Delete it and
    confirm the previous set remains active under Manual.
21. Add one `overview-status` Lovelace card and confirm that it contains only
    scheduler state and pause/stop/resume controls. Add three independent
    `active-setup` cards with
    `active_setup_controls` set to `modes`, `profiles`, and `both`. Confirm each
    chooser exposes only the requested actions, all three keep the current Mode
    and applied Profiles visible, and Profiles-only still provides Default.
22. Create two Profiles that configure different zones and map both to one Mode.
    Confirm both timelines, next events, and zone labels use their controlling
    Profile. Then attempt to select two Profiles that configure the same zone
    and confirm the editor and backend reject the conflict.
23. Restart with a custom mode selected and test both values of **Apply active
    schedule after startup**. The profile and mode must remain selected in both
    cases, but climate commands must only be sent when the setting is enabled.
24. Confirm duplicate, reserved, empty, over-255-character, control-character,
    and orphan profile mappings are rejected. Confirm portable V4 data without
    Modes remains importable.

## External Schedule Execution Smoke Test

Use a test Home Assistant instance with simulated provider services unless real
hardware testing was intentionally arranged. Do not use private production
entity names or data in screenshots.

1. Start without a supported provider. Confirm Settings offers no external
   execution choice and local zones retain the normal Velair controls.
2. Register the simulated `ramses_cc.set_zone_schedule` service and a compatible
   scalar heating climate. Confirm the provider appears only for eligible zones
   and its conditions are listed once below all zone selectors.
3. Select external execution and capture the service call. Confirm ownership is
   saved before one complete seven-day schedule is published, with no direct
   `climate.*` service call.
4. Select Default, activate a Profile schedule, and activate a Mode containing
   that Profile. Confirm each explicit selection publishes the corresponding
   effective full week. A Profile using Default behavior must publish the
   zone's Default week; Pause behavior must be rejected for the external zone.
5. Edit the active Profile and confirm the updated effective week is published.
   Confirm unrelated local zones continue normally and are not blocked by the
   external provider call.
6. Verify the 5-minute grid, scalar heating target, six-switchpoint daily limit,
   and implicit midnight switchpoint validation. Confirm turn-off, ranges,
   cooling, and climate option fields are rejected before publication.
7. Exercise Publishing, Published, and Failed. Confirm Published appears only
   after the provider service returns without error, Failed does not restore
   local ownership, and no polling, readback, delay, or automatic retry occurs.
8. While external ownership is active, attempt Boost, pause/resume, Manual
   adjustment, Room Assist, and Adaptive Preconditioning. Confirm every path is
   unavailable and no `climate.*` action is issued.
9. Return the zone to local execution. Confirm external publication state is
   cleared and normal local scheduling resumes only after the ownership change.
10. Repeat Settings and Overview checks at desktop, tablet, and mobile widths in
    English and Spanish. Confirm one controller used by several zones is still
    rendered once and that publication wording never claims hardware delivery.

## Scheduler Smoke Test

1. Create one block for today a few minutes in the future.
2. Save the day.
3. Confirm the next event appears.
4. Wait for the scheduled minute.
5. Confirm the climate entity receives the expected temperature and HVAC mode.
6. Pause for one minute.
7. Confirm the scheduler resumes automatically.
8. Trigger a short boost.
9. Confirm the affected climate shows the boost and returns to the explicit active schedule block after expiration.
10. Trigger a short boost while the zone has no active block and confirm the previous climate state is restored after expiration.
11. Trigger a short boost while the active block uses `Keep` and confirm the previous climate state is restored after expiration.
12. Pause one zone with `velair.pause_zone` and confirm other zones keep scheduling normally.
13. Resume the paused zone and confirm Velair applies its active block only when one exists.

## Manual Adjustment Smoke Test

Use at least one scalar heat or cool climate and, when available, one native
`heat_cool` climate. Listen to `velair_event` while testing.

1. Leave the default policy at **Keep automatic**. Change the scalar target
   through the standard Home Assistant climate card. Confirm one
   `external_climate_change_detected` payload identifies `temperature` and
   `policy: keep_automatic`, Overview remains Automatic, no
   `zone_control_changed` event is emitted, and Velair reapplies the current
   authoritative target. Repeat with heat, cool, off, a native range, Room
   Assist, preconditioning, and a Boost.
2. Still using **Keep automatic**, repeat while a zone pause uses `none` and
   `turn_off`, while a Profile pause uses each action, while globally paused,
   disabled, stopped, and with no active target. Confirm only an authoritative
   `turn_off` is physically reapplied; all yield/no-target gates send nothing.
3. In **Settings**, select **Until resumed** for the climate. Change HVAC mode and target externally.
   Confirm Overview shows **Manual adjustment**, the external mode and target
   remain applied, and `zone_control_changed` contains `control_mode: manual`.
4. With Room Assist applying a visibly different temporary target, make another
   external target change. Confirm Room Assist yields without briefly restoring
   either its assisted target or the scheduled target.
5. Select **Automatic scheduling**. Confirm the Manual selection disappears,
   the event contains `control_mode: automatic` and `reason: resumed`, and the
   schedule intent valid now is applied.
6. Select **Manual for a duration**, use a short safe duration, and make two
   external changes. Confirm the second change restarts the expiry and the
   current authoritative intent applies only after the new expiry.
7. Select **Until next block**. Make two adjustments before
   the same next block. Confirm the preserved target changes but the displayed
   expiry remains the real block boundary. Confirm that block applies at its
   scheduled time.
8. Enter Manual adjustment, then activate a Profile or Mode with a different
   target. Confirm other affected zones change immediately while this zone
   retains its external state. Resume and confirm only the currently active
   Profile/Mode intent applies.
9. Repeat with a Profile that pauses the zone without turn-off and one with
   `turn_off`. Confirm the pause behavior wins when Manual adjustment ends.
10. Start a Boost, then change the climate externally. Confirm the Boost ends
   without restoring its previous state, Manual adjustment preserves the new
   external state, and the old Boost expiry does not act later.
11. On a native range climate, change `20–25 °C` to `19–24 °C`. Confirm both
    boundaries are reported and preserved, and resume restores the complete
    currently authoritative range.
12. Add an identified `pause_zone` reason with `action: turn_off` while Manual
    adjustment is active. Confirm off wins. Resume automatic control and confirm
    only the Manual reason is removed; the independent pause still keeps the
    climate off.
13. Restart Home Assistant with an unexpired Manual adjustment and test both
    values of **Apply active schedule after startup**. Confirm Manual adjustment
    survives and startup application does not bypass it. Confirm its later
    expiry applies current intent.
14. Make the climate unavailable, change the underlying device if possible,
    and restore availability. Confirm availability recovery alone does not enter
    Manual adjustment. Make a later available-state target change and confirm it
    is detected.
15. Change only `current_temperature`, `hvac_action`, fan, preset, swing, or
    humidity. Confirm none enters Manual adjustment.
16. Call `velair.set_external_change_policy`,
    `velair.enter_manual_adjustment`, and `velair.resume_automatic_control` for
    a managed and unmanaged climate.
    Confirm the managed operation succeeds and the unmanaged target is rejected.
17. While already manual, change Settings from `until_resumed` to
    `for_duration`, then to `keep_automatic`. Confirm the active session and
    expiry do not change; the new default is used only after resuming and a
    later external adjustment.
18. With **Keep automatic** saved, select **Manual adjustment** explicitly in
    Overview. Confirm it starts an `until_resumed` session without changing the
    saved setting. Resume it and confirm the setting still says **Keep automatic**.
19. Save each of the three Manual policies in turn. From Automatic scheduling,
    select **Manual adjustment** in Overview. Verify
    both segmented options remain visible, the active option is a no-op, the
    saved policy is used, busy state is per climate, policy detail appears below
    the selector, and heating, cooling, off, and native ranges are preserved.
20. In Settings, verify **External adjustments** has four compact choices with
    **Keep automatic** first and selected by default,
    shows duration inline when space allows, and exposes its explanation through
    the shared inline tooltip. Confirm it opens on hover, keyboard focus, or tap;
    remains hoverable; toggles on repeated tap/click; closes with Escape or when
    focus leaves; and stays within every viewport edge. On mobile, confirm it is
    shown as a fixed bottom band without horizontal overflow.
21. With a temperature-data migration pending, confirm **Manual adjustment**
    is disabled with an explanation. Confirm the policy, explicit
    entry, and resume services are rejected; an observed external change does
    not create a Manual adjustment or log a monitor failure; and an active
    Manual adjustment remains intact.
22. In the single-climate card, confirm its compact Automatic/Manual selector
    starts and resumes Manual adjustment like the Overview selector. Controls
    must be read-only in Automatic and enabled only after the backend confirms
    Manual. Confirm this remains independent of the quick-actions section.
23. Repeat with scalar heat, scalar cool, and native `heat_cool`. Confirm the
    card follows the entity's effective step and limits, sends both range
    boundaries, offers only published HVAC modes, and does not optimistically
    change displayed values before Home Assistant updates the entity. Remove
    `target_temp_step` and confirm Settings exposes a fallback of `1`; change it
    to `0.5` and confirm schedule inputs and card buttons use that increment.
24. With Automatic scheduling active, use a climate that publishes delayed or
    out-of-order command echoes. Apply a scheduled target and reproduce both
    `expected -> old/intermediate -> expected` and
    `old/intermediate -> expected`. Confirm no
    `external_climate_change_detected` or Manual adjustment is created during
    the bounded settling period. Repeat with Room Assist using different
    scheduled and effective targets, then with **Keep automatic**, and confirm
    there is no reapply loop. During the same period, change an unrelated
    control field and make an explicit user-originated Home Assistant target
    change; confirm those remain external. Finally, wait beyond the settling
    deadline and confirm a later target change is detected normally. Simulate
    a service handler that completes slowly and confirm the full settling
    budget remains after the logical mode-and-target sequence finishes. Leave
    the entity at a value different from the requested target until the
    deadline and confirm Diagnostics reports `command_settling_mismatch` with
    expected and observed values without entering Manual or retrying blindly.
    Restore a published step and confirm it takes priority while the configured
    fallback is hidden and retained. Remove the attribute again and confirm the
    last reported step remains effective, including after reload, so existing
    decimal schedules remain valid. While the attribute is missing, save a
    different manual value and confirm it clears the remembered step without
    changing schedule rules. Restore another valid published value, remove it,
    and confirm that newer observation is remembered. In Manual adjustment, confirm the enabled
    HVAC selector has a subtle theme-safe surface and distinct hover, keyboard
    focus, and open states without visually dominating the target controls.
24. Confirm that the exclusive `velair.manual_adjustment` pause permits direct
    editing while Manual adjustment owns the climate. Add a second pause reason
    and confirm editing becomes unavailable. Also confirm Boost, any independent
    pause, stopped, unavailable, and external ownership prevent direct editing.
    External ownership must retain only **Open in Home
    Assistant**. Disable each Thermostat controls option in the card editor and
    verify the strip collapses cleanly on desktop, tablet, and mobile in light
    and dark themes. While the entity is `off`, confirm the shared surface keeps
    only the HVAC selector and Home Assistant icon; target values and `−`/`+`
    must not be rendered.

## Room Assist Smoke Test

Prefer a simulated or template-backed climate so its internal temperature can
be changed independently from the external room sensor.

1. Configure a fixed `21 °C` `heat` block with a `0.3 °C` deadband, a
   `0.1 °C` target step, and a Maximum assist delta large enough not to cap the
   test. Select an independently controllable external sensor and enable Room
   Assist.
2. Start with the external sensor inside `20.7–21.3 °C`. Confirm the fresh
   phase is `towards_lower`, its target is `20.7 °C`, the status names that
   limit, and the applied target uses the signed error from `20.7 °C` rather
   than from the central schedule.
3. Lower the external sensor through `21.0 °C` without reaching `20.7 °C`.
   Confirm the phase remains `towards_lower`. At `20.7 °C`, confirm it changes
   once to `towards_upper`, targets `21.3 °C`, and requests heat.
4. Raise the sensor through `21.0 °C`. Confirm it remains `towards_upper` until
   `21.3 °C`, then changes once back to `towards_lower`. Repeated updates at an
   edge must not oscillate the phase.
5. Repeat symmetrically with a fixed `24 °C` `cool` block and a `0.5 °C`
   deadband. Confirm a fresh in-band cycle initializes `towards_upper`, changes
   to `towards_lower` only at `24.5 °C`, and changes back only at `23.5 °C`.
6. Set Maximum assist delta below the room-to-active-edge error in each fixed
   direction. Confirm the signed correction is capped relative to the active
   edge, then aligned to the native target step and physical limits.
7. While a fixed-mode phase is active, change the block start, scheduled
   target, HVAC mode, or selected sensor. Confirm the old phase is not retained
   for the new runtime identity. Change only the deadband and confirm the phase
   is retained with recalculated limits, switching immediately only if the
   current room reading has reached the new active edge. Also clear/disable Room Assist,
   reload the integration, and restart Home Assistant; each fresh eligible
   cycle must initialize safely from the current fixed mode and room reading.
8. Enter Manual adjustment while hysteresis is active. Confirm Room Assist
   yields and does not restore its temporary target. Resume Automatic control
   and confirm current intent is resolved with a fresh phase rather than the
   phase from before Manual adjustment. With **Keep automatic**, confirm an
   external target change is corrected and runtime control remains eligible;
   it must not preserve the external target as Velair intent.
9. Set the deadband to `0` for fixed heat and cool. Confirm no
   `hysteresis_phase`, `hysteresis_target`, `deadband_low`, or `deadband_high`
   is reported and the legacy signed correction reverses around the central
   target.
10. Test scalar `auto` and scalar `heat_cool` with a non-zero deadband. Confirm
    they retain neutral in-band correction and do not enter a fixed hysteresis
    phase or actively alternate modes.
11. For a native `heat_cool` range, place the external room inside the
    scheduled band and note the first applied holding range. Move only the
    climate entity's internal reading and confirm the complete applied range
    remains unchanged.
12. Move the external room below the native range's lower boundary and then
    above its upper boundary. Confirm Room Assist resumes boundary-based
    calculations, preserves range width, and never reports a scalar hysteresis
    phase.
13. Change the active block or range target while holding. Confirm the previous
    scalar target, phase, or range is not reused for the new block.
14. While fixed heat is travelling towards its lower edge, change only
    `hvac_action`. Confirm the phase does not change: Velair controls the
    setpoint but does not infer device hysteresis or promise an exact relay,
    valve, or compressor transition.
15. Repeat a non-driving fixed scalar case and confirm the scheduled heating
    ceiling or cooling floor applies without being reported as a physical
    thermostat limit. Then force a real minimum or maximum limit and confirm
    the separate warning and persistent notification.
16. Repeat the fixed heating and cooling cycles in Fahrenheit, including both
    edge transitions and Maximum assist delta capping. Confirm all four
    hysteresis values and the graph remain in Fahrenheit and differences are
    not converted as absolute Celsius temperatures.
17. Configure a Fahrenheit `68–75 °F` native range with a `1 °F` target step. Confirm Room Assist preserves the `7 °F` width, the graph and any physical-limit warning remain in Fahrenheit, and Maximum assist delta is treated as a temperature difference rather than an absolute Celsius conversion.
18. In Celsius, verify Room Assist deadband appears immediately before Maximum
    assist delta, both fields display `°C`, and the deadband accepts `0`, `0.1`,
    and `5` but does not save negatives, letters, non-finite values, values above
    `5`, or values between 0.1-degree steps. Repeat in Fahrenheit with `°F`, the
    `1 °F` default, and the `0–9 °F` range. Confirm changing either deadband does
    not change Adaptive Preconditioning's Minimum delta.
19. Upgrade stored and portable pre-v8 data in both unit systems with no
    `room_sensor_assist_deadband`. Confirm Velair copies the legacy
    `minimum_delta_temperature` once before unit conversion. Confirm an existing
    `0.35` value remains `0.35`, while a new or reset climate receives `0.3 °C`
    or `1 °F`.
20. Use a scalar target whose Room Assist result falls between two published
    climate steps. Confirm **Climate target** keeps its compact label and its
    information button describes the currently reported climate setpoint in
    Ready or Blocked and the temporary setpoint sent by Velair in Assisting or
    Holding, never the room target. Confirm the same help then shows the exact
    pre-step result, target step, and applied setpoint. Repeat with an exact-step
    result, a scheduled-target guard, and a physical min/max clamp; the base
    explanation must remain, while step detail appears only for genuine step
    alignment. Repeat in fixed heat, fixed cool, scalar automatic mode, and
    Fahrenheit, then confirm native ranges retain their Range shift help. Change
    the published target step so a new aligned result differs by less than one
    step and no service call is sent; confirm no step explanation is combined
    with the retained target.

## Adaptive Preconditioning Smoke Test

Prefer a non-critical test climate. Do not use real heating or cooling hardware when an unexpected target change would waste energy or create discomfort.

For seasonal testing, use a simulated or template-backed climate in Home Assistant. Add that test climate to Velair, set `hvac_modes` to the direction you need to test, and control the reported `current_temperature` from a helper or test sensor. This lets you simulate a cold room in summer or a warm room in winter without turning on real equipment.

Heat-only example:

1. Use a test climate that reports `hvac_modes: ["off", "heat"]`.
2. Enable preconditioning for that climate in the Velair Preconditioning tab.
3. Create a heat block for today, such as `21 °C` with mode `heat`, far enough in the future for the initial model lead.
4. Set the test climate `current_temperature` below the target, such as `18 °C`.
5. Confirm Next events shows an early start and a later target time.
6. Before the early start, raise `current_temperature` enough to reduce the delta. Without refreshing the browser, confirm Next events recalculates to a later early start or the normal block time and briefly highlights the changed row when it is visible.
7. At or after the early start, simulate warming by increasing `current_temperature` toward the target threshold.
8. Confirm the Preconditioning tab shows heat learning samples increasing and the model source moving from initial model to similar history after enough complete samples exist.
9. Confirm cooling is shown as not supported for that heat-only climate.
10. Disable outdoor context and confirm its sensor selector is disabled and displays the disabled state.
11. Make the test climate unavailable and confirm the enable switch explains why it is disabled on desktop and mobile widths.
12. Change several tuning values, restore defaults, and confirm the enabled state and learning sample counts are unchanged.

If you only need to verify next-event scheduling, Home Assistant Developer Tools > States can temporarily change the displayed `current_temperature` for a climate state. This is useful for checking whether Velair calculates an early start, but it is not a complete learning test because Velair may still call services on the real climate entity when the event is due.

## Environmental Comfort Smoke Test

1. Open the Comfort tab.
2. Enable Comfort for one managed climate.
3. Select a temperature sensor, or leave it automatic and confirm Velair uses the Room Assist room sensor or the climate `current_temperature`.
4. Set a temperature range that contains the current value and confirm the condition reports that temperature is in range.
5. Move the test sensor below and above the range and confirm the condition changes to Cold and Hot.
6. Add a humidity sensor or use a climate that reports `current_humidity`; verify all nine temperature/humidity combinations and the two-dimensional map.
7. Select `Do not monitor humidity` and confirm the humidity thresholds disappear, the condition uses temperature only, and humidity changes no longer refresh the assessment.
8. Restore automatic humidity and confirm the saved or automatic source is used again.
9. Remove one current environmental reading and confirm the UI switches to a single scale with partial data instead of claiming full comfort.
10. Add a CO2 sensor and confirm Good air, CO2 elevated, and Poor air quality remain separate from the environmental condition.
11. Make every monitored reading unavailable or stale and confirm No readings or Readings outdated is shown.
12. Disable Comfort for that climate and confirm changing those sensors no longer emits comfort events.
13. Enable dew point, absolute humidity, and Humidex with **Calculated by Velair**. Confirm they use the effective Comfort temperature and humidity, display dew point in the zone temperature unit, absolute humidity in `g/m³`, and Humidex without a unit.
14. Disable humidity monitoring and confirm all three Velair-calculated readings become missing without changing the established Comfort `data_quality` or `data_issues` contract.
15. Use each metric's single source selector for **Calculated by Velair** and
    compatible Home Assistant sensors. Confirm switching back retains the
    previous entity, a missing retained entity remains visible, and an external
    source without an entity shows a disabled placeholder without auto-saving.
    Verify all documented units are normalized.
16. Test an empty external selection, `unknown`, `unavailable`, stale, non-numeric, incompatible-unit, and negative absolute-humidity source. Confirm the derived payload reports missing, stale, or invalid and never reuses an old value.
17. In a Fahrenheit Home Assistant installation, confirm native calculations still match their Celsius equivalents, dew point is displayed in Fahrenheit, absolute humidity remains `g/m³`, and Humidex remains unitless.
18. Confirm enabled readings appear in the panel, card, Environmental condition
    attributes, Diagnostics, and API. Confirm no per-metric proxy entities are
    created.
19. Change only a derived numeric value while availability and source validity remain unchanged. Confirm the UI and sensor attribute refresh without a duplicate `comfort_assessment_changed` event; then change availability and confirm one event is emitted.
20. Export and import the zone with mixed Velair and external sources. Confirm
    current model v11 preserves `enabled`, `source`, and retained `entity_id`,
    but exports no calculated values or runtime availability. Import a legacy v9
    backup and confirm its derived-metric configuration receives the disabled
    outdoor-comparison defaults.
21. Verify elevated/poor CO2 follows configured thresholds and unusable metrics create no insight. Confirm Humidex appears only with a Celsius-normalized margin of at least 1 °C. Confirm dew point and absolute humidity remain values without permanent insight cards, and that their information help opens by hover and keyboard focus without crossing the viewport on mobile or desktop. Check the compact climate card shows only the first prioritized contextual insight.
22. In the derived panels, confirm Humidex shows a directional room-temperature comparison (including an equivalent Fahrenheit delta without a 32-degree offset), dew point says how far it is above or below room air without claiming risk, and absolute humidity shows only its neutral `g/m³` value. Make a reading missing, stale, or invalid and confirm its relationship disappears.
23. Enable outdoor comparison, select explicit outdoor temperature and humidity
    sensors, and confirm both selectors retain and display the selected entities
    after a Velair reload and after a Home Assistant restart. Disable the
    comparison and confirm the retained selections return when it is enabled
    again.
24. With current indoor and outdoor readings, confirm **Indoor vs outdoor** shows
    the normalized indoor and outdoor temperatures, indoor and outdoor absolute
    humidity, and adjusted outdoor humidity at the indoor temperature. Confirm
    the same values and source IDs appear in the schedule API, Diagnostics, the
    Environmental condition sensor attributes, and the Comfort event payload.
25. Exercise a useful heating case, a useful cooling case, a useful moisture
    case, and a case where one dimension would improve while another would get
    worse. Confirm Velair uses cautious opportunity or trade-off language and
    never presents opening a window as a command or changes the climate.
26. Remove the optional outdoor humidity selection. Confirm temperature
    comparison remains available, moisture comparison becomes unavailable, and
    no humidity opportunity is produced. Restore it and confirm the complete
    comparison returns without changing the indoor Comfort quality.
27. Make one configured outdoor source missing, stale, invalid, and current in
    turn while the other remains current. Confirm outdoor `data_quality` becomes
    `partial` where applicable, each comparison dimension reports its own
    availability, and no conclusion uses an old or unusable value. Then make all
    configured outdoor inputs stale or unavailable and confirm the outdoor block
    reports that state without altering indoor `data_quality` or `data_issues`.
28. Repeat the complete outdoor comparison in Fahrenheit with physically
    equivalent inputs. Confirm temperatures and temperature differences use
    Fahrenheit, absolute humidity remains `g/m³`, adjusted humidity remains a
    percentage, and opportunity thresholds remain physically equivalent to the
    Celsius case.
29. Establish a stable current assessment, open the event listener for
    `velair_event` filtered by `event: comfort_assessment_changed`, and note
    its `range_summary`. Confirm the summary contains `status`, `thermal_relation`, and nullable `temperature`,
    `humidity`, and `humidex` positions using only the documented stable values.
30. Move one reading across a configured boundary. Confirm the event contains
    the complete new `range_summary`, the previous complete summary in
    `previous_range_summary`, `range_summary_changed: true`, and
    `range_status_changed: true` only when the aggregate status also changes.
31. Create a transition where temperature and Humidex move between aligned and
    mixed positions without changing the aggregate status. Confirm
    `range_summary_changed` is true and `range_status_changed` is false. Change
    only CO2, an insight, or outdoor semantics and confirm both flags are false.
32. Make a required physical reading or enabled Humidex missing, stale, or
    invalid. Confirm `range_summary.status` and the relevant thermal relation or
    positions become unavailable without changing the backward-compatible
    `condition` contract.
33. Reload Velair and restart Home Assistant while the sensors already represent
    an established non-default range summary. Confirm the first reconstructed
    snapshot becomes the baseline and emits no false transition event. A later
    real semantic change must emit exactly one event with the restored baseline
    as `previous_range_summary`.
34. In **Ventilation guidance**, change each per-climate margin and reload the
    panel and Home Assistant. Confirm the values persist, appear under
    `outdoor.guidance_thresholds` in the schedule API, Diagnostics, Environmental
    condition attributes, and Comfort events, and alter opportunities only when
    the configured margin is crossed. Removing the outdoor humidity sensor must
    hide its two controls without deleting their values. Repeat in Fahrenheit:
    the temperature default must be `1.8 °F`, while percentage points and
    `g/m³` remain unchanged. Editing a threshold without changing the semantic
    result must not emit an event.

35. Leave the Comfort model on **Simple** and confirm the established rectangle,
    humidity condition, outdoor guidance, and existing zone configuration are
    unchanged.
36. Select **Guided psychrometric range** with a humidity source configured.
    Confirm only one reference humidity range is requested, the map becomes a
    smooth curved target, and the reference equals the effective range at the
    midpoint temperature. Remove humidity monitoring and confirm the model is
    changed atomically rather than leaving invalid configuration.
37. Make the configured humidity sensor temporarily unavailable. Confirm Guided
    remains selected and stored while humidity-dependent status waits for data.
38. Confirm collapsed and expanded headings keep the physical condition. Create
    mixed temperature/Humidex positions and confirm a second Humidex chip
    appears in both headings, then disappears when positions align. Enable the
    single-climate card option for extra collapsed Comfort readings and confirm
    Humidex, dew point, and absolute humidity chips appear only while that
    dashboard option is enabled.
39. Exercise every **Ventilation opportunity** state. Confirm attributes match
    the API, Diagnostics, Environmental condition attribute, and event. Without
    optional outdoor humidity, monitored humidity limits the result to
    `may_help`; deliberately disabled humidity permits temperature-only
    `comfort_possible`. Unusable configured dependencies produce
    `unavailable`.
    Restore the sensor and confirm evaluation resumes. Repeat in Fahrenheit.
40. Select **Custom range by temperature**. Configure different humidity ranges at the
    displayed minimum and maximum temperatures and confirm the map becomes a
    four-sided sloped target. At both endpoints and one midpoint, verify the
    shown effective range, humidity condition, `range_summary`, Environmental
    condition attributes, Diagnostics, API, and event payload all agree.
41. Move temperature below and above the configured interval. Confirm the
    nearest endpoint range is used without extrapolation. Repeat with the two
    endpoint ranges rising, falling, and equal to ensure no direction is
    imposed.
42. Make temperature missing or stale while humidity remains current. Confirm
    humidity stays visible but has no condition, the effective range is absent,
    the summary is unavailable, and no humidity ventilation opportunity is
    produced. Restore temperature and confirm evaluation returns.
43. Reload Velair and Home Assistant, export/import portable model v11, and
    confirm the selected model and both endpoint ranges survive. Import a v10
    payload and confirm it uses the Simple model. In Fahrenheit, confirm endpoint
    temperature labels and exported thermal values use Fahrenheit while the
    humidity percentages remain unchanged.

## Automation Event Smoke Test

1. Create a temporary automation with an event trigger for `velair_event` filtered by `event: scheduler_mode_changed`.
2. Pause and resume Velair.
3. Confirm the automation fires and receives the expected `mode` and `previous_mode` event data.
4. Create a temporary automation with an event trigger for `velair_event` filtered by `event: climate_target_applied`.
5. Apply a schedule block and confirm the automation receives `entity_id`, `action`, `temperature`, `hvac_mode`, and `source`.
6. Create a temporary automation with an event trigger for `velair_event` filtered by `event: zone_paused`.
7. Pause one zone and confirm the automation receives `entity_id`, `until`, and `action`.
8. Enable preconditioning for one climate with a future heat or cool block and listen for `event: preconditioning_plan_updated`.
9. Confirm its payload includes the original and calculated start times, lead, direction, temperatures, and model source.
10. Refresh Overview and confirm the unchanged plan does not emit another event.
11. Disable preconditioning and confirm one `preconditioning_plan_cancelled` event contains the last plan and a cancellation reason.
12. Complete or expire a preconditioning session and confirm `preconditioning_observation_recorded` reports the final quality and stored sample count.
13. Enable and disable Room Assist and confirm `room_sensor_assist_state_changed` only fires when enablement actually changes.
14. Start and cancel a boost and confirm `boost_ended` contains `reason: manual` and the selected `restoration`.
15. Enable Comfort for one climate and listen for `event: comfort_assessment_changed`.
16. Move a tracked temperature, humidity, or CO2 sensor across a configured threshold and confirm the event includes `entity_id`, `condition`, `air_quality`, `data_quality`, `data_issues`, and metric payloads.

## Frontend Smoke Test

1. Open the sidebar panel.
2. With the initial schedule response completing in under 300 ms, confirm no
   loading message flashes. Throttle the response beyond 300 ms and confirm a
   small local Velair icon with a static **Loading...** label appears inline,
   without a floating notice or animation. Existing content must remain visible
   during later refreshes.
3. Confirm the Overview, Schedules, Modes, Templates, Room Assist, Comfort,
   Preconditioning, Diagnostics, and Settings tabs render in that order.
   Confirm existing links and Lovelace `view` values still open the same named
   views.
4. Confirm Preconditioning lists climates in the order configured in Settings and contains no general Settings sections.
5. Confirm mobile and desktop layouts do not overflow.
6. Add, edit, drag, resize, and delete blocks.
7. Save a schedule.
8. Clone the schedule to other days.
9. Clone the schedule to another managed climate.
10. Create, rename, edit, apply, and delete a template.
11. Export data on desktop.
12. Import selected sections.
13. Confirm import warns that selected data will be overwritten.
14. Open Diagnostics and confirm its managed-climate status shows the climate
    capabilities and current runtime health. Confirm Settings contains no
    diagnostics workspace.
15. Confirm Reset Velair asks for confirmation and restores defaults.
16. Trigger two validation errors in quick succession. Confirm the notices stack
    without overlapping, the older notice moves up smoothly, both remain
    readable at desktop and mobile widths, and each leaves with a short fade.
17. In Overview, confirm every managed climate always shows both compact
    **Automatic scheduling** and **Manual adjustment** segments, with icons and
    a theme-safe selected state. Hover each enabled segment and verify visible
    affordance; keyboard focus, click/tap, busy state, and the active no-op must
    remain usable without nested or double borders.
18. Resize Overview through `743`, `742`, and `741` pixels. Confirm the Zone
    overview information container neither gains an isolated right gap nor
    jumps horizontally at the breakpoint, and remains correctly aligned at
    wider desktop and narrower phone widths.
19. Add an active Boost to Today's timeline and shrink the viewport until its
    block becomes narrow. Confirm the moving Boost highlight is clipped to that
    block at every width and never begins or paints outside it. Enter Manual
    adjustment and confirm the timeline pause marker also identifies Manual
    control without requiring two separate space-consuming icons.

## Diagnostics Smoke Test

1. Open Diagnostics and confirm it loads without polling, reports the current
   scheduler and each managed climate, and updates after a real runtime change.
2. Enable and disable each history category. Confirm the selection survives a
   Velair reload, disabled categories immediately disappear from the current
   log, current health remains available, and newly disabled events are not
   retained.
3. Generate more than 100 eligible events and confirm only the newest 100 are
   kept. Restart Velair or Home Assistant and confirm history is empty while the
   saved category selection remains.
4. Apply schedule, Profile, Mode, Boost, pause, external-adjustment, Automatic/
   Manual-control, Room Assist, Preconditioning, Comfort, failed delivery, and
   unavailable/available transitions. Confirm each retained row uses the
   expected category, event label, reason, climate, and timestamp.
5. Resize log columns on desktop and confirm widths last only for the open panel
   session. At mobile width, confirm the compact event layout has no horizontal
   overflow and does not expose column resize controls.
6. Clear history and confirm the rows disappear while current health and enabled
   categories do not change.
7. Download the default report and confirm climate and associated sensor IDs are
   replaced by stable aliases and Profile, Mode, and pause IDs are absent. Then
   explicitly export with entity IDs, confirm the warning is visible, verify
   operational IDs remain removed, and review the JSON before sharing.
8. Listen for raw `velair_event` events while recording is enabled and disabled.
   Confirm category retention does not suppress or replay automation events and
   that opening or refreshing Diagnostics emits no duplicate runtime events.

## Startup Behavior

1. Enable startup apply behavior.
2. Restart Home Assistant.
3. Confirm active schedules apply in automatic mode.
4. Disable startup apply behavior.
5. Restart Home Assistant.
6. Confirm Velair restores state without forcing climate targets.

## Release UI Checks

1. Run `npm.cmd run build:release`.
2. Confirm the Settings maintenance section shows `v<version>`.
3. Confirm Settings maintenance shows the same integration version.
4. Run the normal development build again if you are returning to local development.
