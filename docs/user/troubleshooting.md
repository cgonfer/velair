# Troubleshooting

## A Lovelace Card Shows Configuration Error

Confirm that Velair is installed and configured before the dashboard loads the
card. The integration exposes its frontend resource early during Home Assistant
startup so normal restarts do not leave cards waiting for the module.

If the error remains:

1. Confirm that the dashboard resource URL is exactly
   `/velair_frontend/velair-card.js` and its type is **JavaScript module**.
2. Remove duplicate or old resources such as `/local/velair-card.js`.
3. Restart Home Assistant after updating the integration.
4. Reload the browser or Home Assistant companion app.

The browser console or network panel should show whether the module request
failed. Include that complete error when reporting a reproducible problem.

## Velair Does Not Appear In The Sidebar

Restart Home Assistant after installing or updating the integration. The sidebar panel is registered during integration setup.

If the integration was just updated, hard refresh the browser or reload the Home Assistant companion app.

## The Lovelace Card Shows Old UI

Check dashboard resources. Remove old development resources such as:

```yaml
url: /local/velair-card.js
type: module
```

Use the integration-served resource instead:

```yaml
url: /velair_frontend/velair-card.js
type: module
```

Velair serves this resource with no-cache headers. The sidebar uses an automatically versioned URL and isolated internal elements so an older cached Lovelace card cannot block a panel update. An integration update only requires the normal Home Assistant restart and browser refresh; users should not add build identifiers or edit the resource URL between releases.

## A Climate Entity Is Missing

Open the Velair integration options and confirm the entity is selected. Velair only manages `climate.*` entities configured in the integration.

If the entity no longer exists in Home Assistant, Velair will show a diagnostic warning in Settings.

## A Mode Is Not Available

Velair reads supported HVAC modes from the climate entity. If a mode does not appear, the entity is not reporting that mode as supported.

When applying templates or cloning schedules, Velair rejects unsupported modes with a clear error. Change the block to `Keep` or select a mode supported by the target climate.

## Temperature Is Adjusted When Applying Templates

Template temperatures are portable. If a template temperature is outside a target climate range, Velair clamps it to the climate minimum or maximum when applying it.

## Export Does Not Download On Mobile

Export is intentionally only shown on desktop for now because mobile companion apps handle downloads inconsistently. Import remains available on both desktop and mobile.

## Scheduler Does Not Apply After Restart

By default, Velair restores state without forcing climate devices after Home Assistant starts.

Enable **Apply active schedule after startup** in Settings if you want Velair to apply the active schedule after restart.

## Reset To Defaults

Use **Settings > Maintenance > Reset Velair**. This clears all stored Velair data, including schedules, templates, panel preferences, active boosts and pauses, Comfort and Room Assist settings, Adaptive Preconditioning settings and learning, and startup behavior. It then recreates unit-aware defaults for the currently managed climates.

Export first if you might need to recover existing data.

## Temperature Unit Requires Attention

Velair reads the temperature unit from Home Assistant. If Settings reports that
the stored unit and Home Assistant unit differ, automatic scheduling and thermal
writes remain stopped so an old target cannot be applied with the wrong meaning.

- If Velair offers a stored-temperature migration, verify that all stored values
  still use the source unit shown, then run the migration once. Leaving it
  untouched simply keeps scheduling stopped; Velair never converts it silently.
- If an upgrade from published legacy Celsius data requires a reset, export a
  reference copy first if useful, then use **Reset Velair** to create defaults in
  Home Assistant's current unit.
- If a reset, migration, or import was saved but runtime recovery failed, reload
  the Velair integration or restart Home Assistant. Velair intentionally remains
  stopped until recovery.

If a schedule is marked incompatible after a climate becomes available, review
the target against that entity's reported range and exact temperature step.
Velair does not invent a missing `target_temp_step`.

Older backups without a recorded unit are accepted as Celsius. The import screen
shows that assumption and converts selected thermal values when the current Home
Assistant unit is Fahrenheit.

See [Temperature Units and Migration](temperature-units.md) for the full decision
guide and backup behavior.
