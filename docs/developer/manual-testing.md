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

## Automation Event Smoke Test

1. Create a temporary automation with an event trigger for `velair_event` filtered by `event: scheduler_mode_changed`.
2. Pause and resume Velair.
3. Confirm the automation fires and receives the expected `mode` and `previous_mode` event data.
4. Create a temporary automation with an event trigger for `velair_event` filtered by `event: climate_target_applied`.
5. Apply a schedule block and confirm the automation receives `entity_id`, `action`, `temperature`, `hvac_mode`, and `source`.
6. Create a temporary automation with an event trigger for `velair_event` filtered by `event: zone_paused`.
7. Pause one zone and confirm the automation receives `entity_id`, `until`, and `action`.

## Frontend Smoke Test

1. Open the sidebar panel.
2. Confirm the Overview, Schedules, Templates, and Settings tabs render.
3. Confirm mobile and desktop layouts do not overflow.
4. Add, edit, drag, resize, and delete blocks.
5. Save a schedule.
6. Clone the schedule to other days.
7. Clone the schedule to another managed climate.
8. Create, rename, edit, apply, and delete a template.
9. Export data on desktop.
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
