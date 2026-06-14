# Troubleshooting

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

Browser custom elements cannot be redefined once loaded, so a stale resource can keep old code active until the page is fully reloaded.

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

Use **Settings > Maintenance > Reset Velair**. This clears stored schedules, templates, panel preferences, active boosts, and startup behavior, then recreates defaults for the currently managed climates.

Export first if you might need to recover existing data.
