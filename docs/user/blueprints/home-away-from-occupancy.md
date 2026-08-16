# Home and Away from occupancy

Run your chosen Home Assistant actions when one consolidated occupancy entity becomes occupied or empty. This keeps people, guest, and household-specific presence logic in Home Assistant while making common Velair Mode and Profile changes easier to configure. A delayed notification explains when the entity cannot provide a safe Home/Away decision.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Foccupancy_home_away.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Open Home Assistant and import the Home and Away from occupancy blueprint" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/occupancy_home_away.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="View the Home and Away from occupancy YAML source"></a>
</p>

[View changelog](../../../blueprints/changelogs/occupancy_home_away.md) · [Back to the blueprint index](../blueprints.md)

## When to use it

Use this blueprint when Home Assistant already has one entity that represents whether the home is occupied. It is suitable for Home, Away, or similar changes where the final actions should be delayed and rechecked before they run.

## Requirements

- Blueprint version 1.0.0 and Home Assistant 2024.6.0 or newer.
- One `binary_sensor` or `input_boolean` with `on`/`off`, or a person group with `home`/`not_home`.
- Velair is required only when the actions you configure use its Modes,
  Profiles, entities, or services. The blueprint can otherwise run standard
  Home Assistant actions without Velair.

Build people, guest, zone, and presence rules in Home Assistant before selecting the resulting entity here. A person group can represent whether any tracked person is `home`, while a template binary sensor can also include a guest helper or other household exceptions. The blueprint accepts both `on`/`off` and `home`/`not_home` instead of recreating that decision.

## Configuration

- **Consolidated occupancy state:** the single entity that already represents whole-home occupancy.
- **When occupied:** one or more standard Home Assistant actions.
- **When empty:** one or more standard Home Assistant actions.
- **Occupied delay:** how long the entity must remain `on` or `home`.
- **Empty delay:** how long the entity must remain `off` or `not_home`.
- **Availability warning delay:** how long `unknown` or `unavailable` must persist before Home Assistant creates a diagnostic notification. The default is 5 minutes.

## Example

For the occupied action, add **Select: Select**, choose the visible Velair Mode entity offered by Home Assistant, and select `Home`. Configure the empty action in the same way with `Away`. Select the entity from the UI rather than assuming a particular entity ID.

The generated actions are equivalent to:

```yaml
action: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Home
```

To activate a Profile directly instead:

```yaml
action: velair.activate_profile
data:
  profile_id: home
```

Using Modes is normally clearer for Home, Away, and Vacation choices because the current state remains visible through Home Assistant's Velair Mode selector.

## How it works

The occupied (`on`/`home`) and empty (`off`/`not_home`) state triggers use Home Assistant's native `for` durations, so the state must remain continuous for the complete delay. Separate availability template triggers detect a sustained `unknown`/`unavailable` state and recovery to any supported state. Home Assistant creates one automation-scoped persistent notification after the availability warning delay, updates rather than duplicates it, and dismisses it after recovery. Home and Away actions do not run while the entity lacks a valid state.

On startup, occupied, empty, and availability checks run as internal parallel branches. Each checks its initial state, waits interruptibly for the opposite state up to the configured timeout, continues only after a timeout, and rechecks before acting. Bounded outer parallel mode means a startup availability wait cannot block a later valid occupancy transition. There is no polling.

## Safety and precedence

The blueprint only runs the actions you configure. Velair's existing Mode, Profile, Boost, and pause precedence continues to apply. An `unknown` or `unavailable` occupancy entity activates neither Home nor Away; the warning identifies the entity and explains that actions remain suspended until it reports a supported occupied or empty state.

## Limitations

- The blueprint deliberately accepts one already-resolved occupancy entity; it does not combine people or guest rules itself.
- Home Assistant `for` timers do not survive a restart, so the startup path begins the configured delay again.
- The notification ID uses the automation entity ID. Renaming the automation can leave its previous notification available for manual dismissal.
- Parallel execution is limited to 20 runs and warns if a pathological event burst fills every slot.
- Actions created with **Take control** no longer receive blueprint updates automatically.

## Troubleshooting

- If neither branch runs, confirm the selected entity reports `on`/`home` or `off`/`not_home`.
- If a warning appears, inspect the named occupancy entity and its source group, template, people, or guest helper.
- If Away activates too quickly, increase the empty delay.
- If the expected Mode is not selected, run the chosen action manually in Home Assistant and verify the option name.
- If a Profile action fails, use the Profile's stable ID rather than its editable display name.

## Updating and customizing

Re-import the rolling `main` URL to install a compatible update. Version 1
updates preserve existing input names, and any new input has a default, so no
automation migration is required. A future breaking version will use a new
filename and major version instead of replacing this URL. Velair never edits
Home Assistant automations or `.storage` to migrate a blueprint. Use **Take
control** only when the installation needs logic that cannot be expressed
through the provided inputs; the independent automation then stops receiving
blueprint updates.
