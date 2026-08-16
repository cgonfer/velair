# Automation Blueprints

Velair keeps presence, doors, guests, and household-specific conditions in Home Assistant instead of building a second automation engine. These optional blueprints provide guided starting points for common cases while remaining fully local and event-driven.

Importing a blueprint does not change Velair by itself. Home Assistant first adds the reusable blueprint; you then create and configure an automation from it. Existing automations can receive blueprint updates through re-import, or you can use **Take control** to turn one into an independent Home Assistant automation.

HACS integration packages do not copy automation blueprints into Home Assistant's blueprint directory automatically. Use the import links below.

## Available blueprints

Blueprints are listed alphabetically.

- [Home and Away from occupancy](#home-and-away-from-occupancy)
- [Pause a zone while windows are open](#pause-a-zone-while-windows-are-open)

<hr>

### Home and Away from occupancy

Run your chosen Home Assistant actions when one consolidated occupancy entity becomes occupied or empty. The actions can select a Velair Mode, activate a Profile, or coordinate Velair with the rest of the home. A delayed notification reports when occupancy becomes unavailable.

**Version:** 1.0.0 · **Requires:** Home Assistant 2024.6.0+

<p>
  <a href="blueprints/home-away-from-occupancy.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="View the Home and Away from occupancy documentation"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Foccupancy_home_away.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Open Home Assistant and import the Home and Away from occupancy blueprint" height="28"></a>
</p>

<hr>

### Pause a zone while windows are open

Pause one or more Velair-managed climates while any selected window or door remains open, then resume their schedules only where the automation still owns the active pause. A delayed Home Assistant notification identifies unavailable contacts and the affected thermostats.

**Version:** 1.0.0 · **Requires:** Home Assistant 2024.6.0+ and Velair 1.6.0+

<p>
  <a href="blueprints/pause-zone-for-open-windows.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="View the Pause a zone while windows are open documentation"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fwindow_pause.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Open Home Assistant and import the Pause a zone while windows are open blueprint" height="28"></a>
</p>

<hr>

## Shared behavior

- Blueprints react to Home Assistant state and startup events; they do not poll.
- Configurable delays filter brief state changes.
- `unknown` and `unavailable` states are handled conservatively.
- The occupancy blueprint reports sustained occupancy availability problems and dismisses the warning after recovery.
- The window blueprint reports persistent contact availability problems without delaying control of contacts that still work.
- Blueprint configuration remains in Home Assistant, not in Velair storage.
- Re-importing the same URL updates the blueprint used by existing automations.

Each blueprint page documents its own requirements, configuration, example, safety behavior, limitations, and troubleshooting steps.

## Versions and updates

Blueprints use their own semantic versions independently of the Velair
integration. The import links intentionally follow the rolling `main` version.
Re-import the same URL when you want a compatible update for an existing
automation. Home Assistant does not update imported blueprints automatically.

Updates within version 1 preserve existing input names, and any new input has a
default. A breaking change is published under a new filename and major version,
leaving the existing URL available. Velair does not inspect or migrate Home
Assistant automations or `.storage` data. **Take control** keeps an automation
independent, but it also stops receiving later blueprint updates.
