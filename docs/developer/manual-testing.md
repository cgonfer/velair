# Manual Testing

Use this checklist before publishing a release or after changing scheduler behavior.

## Preparation

- Use a non-critical Home Assistant instance.
- Choose safe `climate.*` entities.
- Avoid hardware where unexpected temperature changes would cause discomfort or waste energy.
- Keep Home Assistant logs open.

## Install

Install through HACS custom repository or copy:

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

- scheduler enabled switch;
- scheduler mode select;
- next climate event sensor;
- current schedule state sensor;
- active target sensors for managed climates.

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

Services with `entity_id` must reject climates that were not selected during setup.

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
11. Disable preconditioning, change that climate's temperature, and confirm no new plan event or learning sample is produced.
12. Start and cancel a boost and confirm `boost_ended` is emitted with `reason: manual`.

## Frontend Smoke Test

1. Open the sidebar panel.
2. Confirm the Overview, Schedules, Templates, Preconditioning, and Settings tabs render.
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
