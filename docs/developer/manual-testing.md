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

1. Export in Celsius and Fahrenheit and confirm portable model v5 records the
   effective `temperature_unit`.
2. Import the portable V5 file into the opposite unit and confirm selected
   thermal sections convert. V4 files must remain compatible.
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
- scheduler status values are translated in every supported language;
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

1. Create a profile with a name, icon, and description.
2. Give one zone an alternate heat or cool schedule, pause a second zone, and
   leave a third zone on its default schedule.
3. Copy template blocks into one profile day, edit the draft, and confirm the
   template itself is unchanged.
4. Start Boost on an affected zone, activate the profile, and confirm Boost is
   cancelled and the block valid at the current time is applied immediately.
5. Confirm the omitted zone continues its default schedule.
6. Activate the profile while Global Pause and then Zone Pause are active;
   confirm selection persists without overriding either pause and applies after
   resume.
7. Select Default from Overview and through
   `velair.deactivate_profile`. Confirm an empty `profile_id` on
   `velair.activate_profile` remains a compatibility alias.
8. Restart Home Assistant with startup application disabled and enabled. In both
   cases confirm the selection persists; only the enabled case should force the
   current target during startup.
9. Export and import the `profiles` and `modes` sections and confirm
   definitions move without activating an imported profile. If the replacement
   omits the active profile, confirm Velair returns to default schedules.
10. Repeat the editor and active selector checks at desktop, tablet, and mobile
    widths in every supported language.
11. Listen for `velair_event` and confirm profile activation, return to Default,
    and deletion of the active profile emit `profile_changed` with the expected
    `profile_ids` and `previous_profile_ids`. Re-selecting the current set must
    not emit a duplicate event.
12. In Profiles, create two custom Modes and map them to stored Profiles.
    Confirm each mode row shows every mapped Profile icon and exact color, and
    that Default and Manual have short explanatory descriptions.
13. In both Overview and Profiles, confirm the shared **Active setup** card
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
14. Select each custom value through `select.velair_mode` and confirm its
    mapped Profiles change once. For compatibility, select Manual through the
    native entity and confirm the current set remains active; select Default
    and confirm it is emptied.
15. Change profile from the panel and through `velair.activate_profile`; confirm
    the native selector reports Manual, including direct reactivation of the
    already active profile without repeating climate calls or events.
    Confirm this direct selection replaces every other active Profile instead
    of extending the set.
16. Rename a selected Mode and confirm selection survives without reapplying
    Profiles. Remap it and confirm the new set applies atomically. Delete it and
    confirm the previous set remains active under Manual.
17. Add one `overview-status` Lovelace card and confirm that it contains only
    scheduler state and pause/stop/resume controls. Add three independent
    `active-setup` cards with
    `active_setup_controls` set to `modes`, `profiles`, and `both`. Confirm each
    chooser exposes only the requested actions, all three keep the current Mode
    and applied Profiles visible, and Profiles-only still provides Default.
18. Create two Profiles that configure different zones and map both to one Mode.
    Confirm both timelines, next events, and zone labels use their controlling
    Profile. Then attempt to select two Profiles that configure the same zone
    and confirm the editor and backend reject the conflict.
19. Restart with a custom mode selected and test both values of **Apply active
    schedule after startup**. The profile and mode must remain selected in both
    cases, but climate commands must only be sent when the setting is enabled.
20. Confirm duplicate, reserved, empty, over-255-character, control-character,
    and orphan profile mappings are rejected. Confirm portable V4 data without
    Modes remains importable.

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
2. Confirm the Overview, Schedules, Profiles, Templates, Room Assist, Comfort, Preconditioning, and Settings tabs render.
3. Confirm Preconditioning lists climates in the order configured in Settings and contains no general Settings sections.
4. Confirm mobile and desktop layouts do not overflow.
5. Add, edit, drag, resize, and delete blocks.
6. Save a schedule.
7. Clone the schedule to other days.
8. Clone the schedule to another managed climate.
9. Create, rename, edit, apply, and delete a template.
10. Export data on desktop.
10. Import selected sections.
11. Confirm import warns that selected data will be overwritten.
12. Confirm Settings diagnostics show climate capabilities.
13. Confirm Reset Velair asks for confirmation and restores defaults.

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
