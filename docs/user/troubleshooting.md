# Troubleshooting
<!-- velair-docs:start -->
Translations: [English original](troubleshooting.md) · [Español](troubleshooting.es.md) · [Français](troubleshooting.fr.md) · [Deutsch](troubleshooting.de.md) · [Italiano](troubleshooting.it.md) · [Nederlands](troubleshooting.nl.md) · [Polski](troubleshooting.pl.md) · [Português (Brasil)](troubleshooting.pt-br.md) · [Português (Portugal)](troubleshooting.pt-pt.md) · [Русский](troubleshooting.ru.md) · [Translation status](../translation-status.md)

---
<!-- velair-docs:end -->

## A Lovelace Card Shows Configuration Error

Confirm that Velair is installed and configured before the dashboard loads the
card. When resources are managed through the Home Assistant interface, Velair
registers and updates its module automatically. No manual resource setup is
needed during normal installation.

If the error remains:

1. Confirm that the dashboard resource uses
   `/velair_frontend/velair-card.js` and its type is **JavaScript module**.
   An automatic `?v=...` parameter is expected when resources are managed through
   the interface; do not remove or edit it.
2. Check for duplicate or old resources such as `/local/velair-card.js`.
   Velair migrates and consolidates these exact local paths automatically in
   interface-managed resources. Other paths and external URLs need manual review.
3. Restart Home Assistant after updating the integration.
4. Reload the browser or Home Assistant companion app and open the dashboard
   directly, without visiting the Velair sidebar first.

If resources are managed in YAML, add the module manually using the stable URL
without parameters and remove old or duplicate entries there. Writing a card or
dashboard in YAML alone does not mean resources are managed in YAML. See
[installation](installation.md#resources-managed-in-yaml) for the configuration.
Check Home Assistant logs for registration failures or YAML resource warnings;
Velair does not create persistent notifications for these checks.

If automatic registration fails, you can add the resource manually through
**Settings > Dashboards > Resources** as a **JavaScript module**:

```yaml
url: /velair_frontend/velair-card.js
type: module
```

The browser console or network panel should show whether the module request
failed. Include that complete error when reporting a reproducible problem.

## Velair Does Not Appear In The Sidebar

Restart Home Assistant after installing or updating the integration. The sidebar panel is registered during integration setup.

If the integration was just updated, hard refresh the browser or reload the Home Assistant companion app.

## The Lovelace Card Shows Old UI

Restart Home Assistant and reload the affected browser or companion app first.
Velair updates interface-managed resources automatically, including migration
from `/local/velair-card.js` and consolidation of recognized duplicates.
Check Home Assistant logs if that update fails. Other paths and external URLs
need manual review.

Velair serves this resource with no-cache headers. For interface-managed
resources, Velair automatically maintains a `?v=...` parameter and uses the same
versioned URL for the sidebar and dashboard cards. The stable
`/velair_frontend/velair-card.js` URL remains valid for manual and YAML
configuration. Do not add build identifiers or edit
version parameters between releases.

An integration update normally requires only a Home Assistant restart and
browser or companion-app refresh. If the backend reports the new version but
the previous interface remains visible, perform a hard refresh or clear the site
cache before reporting the problem.

## A Climate Entity Is Missing

Open the Velair integration options and confirm the entity is selected. Velair only manages `climate.*` entities configured in the integration.

If the entity no longer exists in Home Assistant, Velair will show the verified problem in **Diagnostics**.

## A Mode Is Not Available

Velair reads supported HVAC modes from the climate entity. If a mode does not appear, the entity is not reporting that mode as supported.

When applying templates or cloning schedules, Velair rejects unsupported modes with a clear error. Change the block to `Keep` or select a mode supported by the target climate.

## Temperature Is Adjusted When Applying Templates

When applying a template, Velair validates its resolved climate settings against the destination thermostat. Velair first rejects temperatures outside the thermostat's minimum and maximum. Values within those limits can then be rounded to its supported temperature step, including near a range boundary. This validation also applies to shared presets and linked templates; an incompatible shared configuration prevents the affected operation from being saved. Adjust the temperature or choose a compatible destination before trying again.

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
the target against that entity's reported range and effective temperature step.
When `target_temp_step` is missing, configure the device's actual step in that
climate's Settings row. The field shows the last valid step Velair remembers,
then a saved manual fallback, or `1` if neither exists. Saving a manual value
while the attribute is missing replaces the remembered observation. The manual
value is ignored—but retained—whenever Home Assistant publishes a valid step.

Older backups without a recorded unit are accepted as Celsius. The import screen
shows that assumption and converts selected thermal values when the current Home
Assistant unit is Fahrenheit.

See [Temperature Units and Migration](temperature-units.md) for the full decision
guide and backup behavior.
