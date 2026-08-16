# Pause a zone while windows are open

Pause one or more Velair-managed climates when any selected window or door remains open, then resume their schedules only when every contact is confirmed closed and each active pause still belongs to this automation. Home Assistant warns when an unavailable contact prevents a safe resume.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fwindow_pause.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Open Home Assistant and import the Pause a zone while windows are open blueprint" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/window_pause.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="View the Pause a zone while windows are open YAML source"></a>
</p>

[View changelog](../../../blueprints/changelogs/window_pause.md) · [Back to the blueprint index](../blueprints.md)

## When to use it

Use this blueprint when opening a window or door should temporarily stop Velair from changing one or more climates that share the same openings. It is useful for heating and cooling systems and can either leave every climate in its current state or turn them off while paused.

## Requirements

- Blueprint version 1.0.0, Velair 1.6.0 or newer, and Home Assistant 2024.6.0
  or newer. Velair 1.6.0 supplies the owned simultaneous pause reasons used by
  this blueprint.
- One or more climate entities already managed by Velair.
- One or more `binary_sensor` entities with the `window`, `door`, or `opening` device class.
- `on` must mean open and `off` must mean closed for every selected contact.

## Configuration

- **Managed thermostats:** all Velair-managed climates to pause and resume together.
- **Windows and doors:** every opening that affects this zone.
- **Climate action while paused:** keep the current state or turn the climate off.
- **Pause ID:** a stable ownership identifier. Keep the default for one automation, or use a different ID for each separate automation that targets the same thermostat.
- **Open delay:** how long at least one opening must remain open before pausing.
- **Close delay:** how long all openings must remain closed before resuming.
- **Availability warning delay:** how long a contact must remain `unknown` or `unavailable` before showing a Home Assistant notification. The default is 5 minutes.

## Example

For a living-room climate with two windows:

```text
Managed thermostats:
  - climate.living_room
  - climate.living_room_radiator
Windows and doors:
  - binary_sensor.living_room_left_window
  - binary_sensor.living_room_right_window
Climate action while paused: Turn off
Open delay: 2 minutes
Close delay: 30 seconds
Availability warning delay: 5 minutes
```

If either window remains open for two minutes, the blueprint pauses both living-room climates and turns them off. After the last window closes and both contacts remain closed for 30 seconds, it resumes each active schedule.

## How it works

Home Assistant observes three aggregate conditions: at least one contact is open, every contact is closed, and at least one contact is `unknown` or `unavailable`. Each condition uses a native template trigger with its configured `for` duration. If the aggregate condition becomes false before that duration ends, Home Assistant resets its timer and no action runs. When a timer completes, the short action checks the complete contact set again before it can pause, resume, or create a warning.

Open control, closed control, and availability diagnostics use independent event-driven triggers. An open contact can therefore pause the zone after the open delay even when another selected contact is unavailable. The unavailable contact still prevents the all-closed condition from becoming true and resuming it.

If a contact remains `unknown` or `unavailable` for the configured warning delay, Home Assistant creates one persistent notification for the complete thermostat set. It lists both the affected contacts and the selected thermostats, and explains why they are not being resumed. The state is checked again after the delay, so an older execution ends before notification creation when every contact has recovered. An aggregate recovery trigger dismisses the warning. The deterministic notification ID means later executions update the same warning instead of producing duplicates.

After Home Assistant starts, one reconciliation execution runs the three checks as internal parallel branches. Each branch first verifies its aggregate condition, waits up to the configured duration for the opposite condition, and stops immediately if that opposite condition appears. The open branch can therefore pause climates even while the availability branch is waiting. It acts only when the wait times out and a final aggregate check still passes. Home Assistant cannot reconstruct how long a condition was true before startup, so these interruptible startup timers begin again from zero. Normal operation then uses the continuous template-trigger timers described above. There is no polling.

Automation runs may overlap, so an `opened_due` event is not blocked while the startup availability branch waits. That startup wait occupies only one of the bounded parallel slots. The actions converge safely because every climate iteration revalidates the current aggregate contact state, Velair serializes override mutations per climate, and an opposite aggregate trigger applies the later pause or resume decision when conditions change.

## Safety and precedence

The blueprint creates each pause with the configured **Pause ID**. Its default is `velair_window_guard`; Velair persists that ownership independently for every selected thermostat.

- It does not replace a manual pause or a pause owned by another automation.
- Closing every window resumes only pauses carrying the same ID.
- A manual pause or resume in Velair remains authoritative.
- Existing scripts and automations without `pause_id` keep their previous behavior.
- `unknown` and `unavailable` contacts are never treated as safely closed.
- Availability warnings do not bypass or change pause ownership. They only explain why a safe resume cannot occur.

Each climate receives an individual service call and the relevant aggregate contact state is checked again immediately before every call. A Home Assistant service error is recorded in the automation trace, but `continue_on_error` lets the blueprint continue with the remaining climates. Boost, pause, resume, and expiry changes remain serialized independently per climate zone.

## Limitations

- Prefer one automation containing every relevant opening for the same thermostat set.
- If separate window automations must target the same thermostat, give each one a different stable **Pause ID**. They then create independent pause reasons, and each automation can remove only its own reason.
- The blueprint cannot reliably interpret changes made with an infrared remote when the underlying climate integration does not report them to Home Assistant.
- Interruptible startup reconciliation timers begin from zero because Home Assistant cannot recover pre-restart timer history.
- Notifications depend on Home Assistant's built-in `persistent_notification` integration.
- The notification ID uses the Home Assistant automation entity ID, keeping it short and independent of thermostat selection or ordering. Renaming the automation can leave its previous notification available for manual dismissal.
- Up to 50 runs may overlap. Home Assistant emits a warning if a pathological event burst fills those slots; normal condition-triggered runs remain short.

## Troubleshooting

- If the zone never pauses, confirm at least one selected contact reports `on` while open and remains open longer than the open delay.
- If the zone does not resume, confirm every selected contact reports `off`. After the availability warning delay, the persistent notification lists contacts that still report `unknown` or `unavailable`.
- If an availability warning remains after recovery, verify that the contact produced a new state event. Reloading or running the automation also re-evaluates the full set and dismisses a stale warning.
- If a service reports an unmanaged entity, add that climate to Velair. Home Assistant service errors do not stop the remaining climates; inspect the automation trace to identify individual failures.
- If closing the windows leaves the zone paused, check whether the active pause was created manually or by another automation. The blueprint intentionally leaves it unchanged.
- If multiple automations target the same climate, either consolidate their openings or verify that every automation uses a different stable **Pause ID**.

## Updating and customizing

Re-import the rolling `main` URL to install a compatible update. Version 1
updates preserve existing input names, and any new input has a default, so no
automation migration is required. A future breaking version will use a new
filename and major version instead of replacing this URL. Velair never edits
Home Assistant automations or `.storage` to migrate a blueprint. Use **Take
control** only when the installation needs custom behavior beyond the provided
contacts, actions, and delays; the independent automation then stops receiving
blueprint updates.
