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

1. Export in Celsius and Fahrenheit and confirm portable model v8 records the
   effective `temperature_unit`.
2. Import the portable V8 file into the opposite unit and confirm selected
   thermal sections convert. Older supported files must remain compatible.
3. Import a unitless legacy backup and confirm the UI warns that Celsius is
   assumed before the backend converts it when required.
4. Confirm known climate targets use exact published steps and standalone values
   without a common device step use safe fallback precision.

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
- zone override, preconditioning start, and Room Assist state sensors per
  managed climate.

Confirm that:

- active target sensors use each climate entity's temperature unit;
- their names use the climate friendly name;
- an active target started early by Adaptive Preconditioning exposes both
  `when` and `target_when`;
- comfort and air-quality states remain independent and do not copy raw source
  readings;
- optional features expose clear inactive states when they are disabled or not
  configured;
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
