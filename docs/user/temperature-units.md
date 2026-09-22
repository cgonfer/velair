# Temperature Units and Migration

Velair supports Celsius and Fahrenheit by following Home Assistant's configured
temperature unit. Velair does not provide a separate unit selector. The detected
unit appears read-only in **Settings > Temperature unit**; change it from Home
Assistant's unit-system settings.

## New Installations and Resets

On first setup, Velair creates schedules, built-in templates, Comfort thresholds,
Room Assist limits, and Adaptive Preconditioning settings in the unit detected
from Home Assistant. Resetting Velair recreates those defaults for the currently
detected unit.

Climate targets are validated against each managed climate's minimum, maximum,
and effective temperature step. Velair uses `target_temp_step` directly when
Home Assistant provides it. Otherwise, Settings shows the effective fallback:
the last valid step reported by that entity, the saved manual per-zone value, or
`1` when neither exists. It can be set to the device's actual increment. Saving
it while the attribute is missing clears the remembered observation without
changing schedule rules. A later valid report becomes authoritative and is
remembered again, so an inconsistent entity cannot invalidate existing decimal
schedules merely by omitting the attribute.

The valid target grid starts at the climate's published minimum temperature,
not at zero. This preserves the device's real setpoints in both Celsius and
Fahrenheit, including climates whose minimum is not an exact multiple of their
step.

## Existing Stored Data

Velair stores thermal configuration in the unit recorded with the data. It does
not silently reinterpret stored numbers when Home Assistant's unit changes.

When stored data already declares a unit and Home Assistant later reports the
other unit, Velair:

1. stops automatic scheduling and thermal writes;
2. preserves active Room Assist recovery state while stopping its listeners;
3. creates a persistent Home Assistant notification;
4. shows the source and target units in Velair Settings; and
5. offers an explicit migration of all stored thermal data.

Run that migration only when every stored value still uses the source unit shown.
The operation converts schedules, templates, active and previous override
targets, target-step fallbacks, Comfort thresholds, Room Assist settings, Adaptive Preconditioning
configuration, last-reported target steps, rates, and learning observations. Targets tied to a known climate
are aligned to its effective step when available. Other converted editable
values use safe precision instead of inventing a device step.

The scheduler resumes only after the converted data is stored successfully and
runtime state has been restored. After a successful operation, Room Assist
restores the converted scheduled target and clears its saved recovery state. If
data was saved but runtime recovery fails, Velair stays stopped and reports that
the integration must be reloaded or Home Assistant restarted.

## Upgrading Published Celsius-Only Data

Published Velair versions before unit metadata treated stored thermal values as
Celsius. Velair therefore assumes that older unitless storage is Celsius.

- When Home Assistant uses Celsius, Velair can continue with those values and
  records the unit metadata.
- When Home Assistant uses Fahrenheit, Velair does not guess whether individual
  values were edited manually. It stops the scheduler and asks for **Reset
  Velair**, which replaces the legacy data with fresh Fahrenheit defaults.

Export remains available while this reset is pending, so you can keep a reference
copy before clearing the old schedules and settings.

## Export and Import

Current exports include a `temperature_unit` field. When an imported file uses
the other unit, Velair converts the selected thermal sections to the current Home
Assistant unit before storing them.

Older backups without `temperature_unit` are accepted and treated as Celsius.
The import screen displays this assumption before the import. On a Fahrenheit
installation, those legacy values are converted to Fahrenheit automatically.

Importing remains destructive for the selected sections: matching schedules,
templates, settings, or learning data are overwritten. Export the current setup
first when you may need a recovery point.

The manual per-zone target-step fallback is included with portable zone data and
is converted as a temperature delta when units differ. The last step observed
from a local climate entity is internal device context and is not exported.

## Temporarily Unavailable Climates

A climate may not expose its range or target step while it is unavailable. Velair
can still migrate or import the stored data, then validates schedules when the
climate publishes its capabilities again. An incompatible schedule is identified
in the panel and must be corrected before it can be relied upon.

## What Velair Converts

Stored configuration and imported backup data are converted only during an
explicit migration or import. Live climate readings and targets already belong to
Home Assistant and are not converted again. External room or outdoor sensor
readings are converted only at the comparison boundary when their declared unit
differs from the managed climate.
