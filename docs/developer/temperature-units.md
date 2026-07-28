# Temperature Unit Internals

Velair's persisted thermal model uses runtime-unit values plus explicit metadata.
It does not use canonical Celsius storage.

## Ownership and Metadata

`VelairStorage` detects Home Assistant's configured unit and persists:

- `temperature_format: runtime_v1`;
- `temperature_unit` (`°C` or `°F`);
- `temperature_revision`; and
- the last successful migration identifier and source/target units.

Fresh data and resets are generated directly for Home Assistant's current unit.
Normal load and save operations preserve raw values; they do not convert them.

Published storage without runtime-unit metadata and the historical `celsius_v1`
format are treated as Celsius. When that legacy data is loaded in a Fahrenheit
installation, `legacy_celsius_upgrade_reset_required` blocks the scheduler and
permits reset rather than the normal migration command.

## Runtime Boundary

Home Assistant owns live climate state. Velair accepts a finite climate target
only when it fits the entity's declared minimum and maximum. It does not infer a
unit from the magnitude of a value.

External temperature sensors may declare a different unit. Room Assist, Comfort,
and Adaptive Preconditioning convert those readings at the comparison boundary.
Absolute temperatures, temperature deltas, and minutes-per-degree rates use
separate conversion helpers because their transforms are different.

Defaults and normal schedule editing use each climate's exact
`target_temp_step` when available. Velair never converts a default step from one
unit to another. During migration or import, values tied to a known climate are
aligned to that exact step. Migrated editable targets without a usable exact step
are range-limited and rounded to safe `0.1` precision; this normalization is not
treated as a reported device step. Default schedule validation and Room Assist
still require the real `target_temp_step` where their behavior depends on it.
Editable Room Assist, Adaptive Preconditioning, and rate fields use their own
valid precision rules.

## Unit-Change Guard

When the stored and Home Assistant units differ, storage exposes
`temperature_migration.required`. The scheduler blocks queued and new climate
actions, thermal WebSocket mutations are rejected, and runtime Comfort and Room
Assist status is hidden until resolution. Export remains available so a reference
copy can be saved.

Migration is an exclusive, revision-checked operation:

1. the source must match the stored unit;
2. a unique migration id makes an exact retry idempotent;
3. every persisted thermal scope is converted on a detached data graph;
4. the new payload is stored before the runtime model is replaced;
5. Room Assist and scheduler runtime are rebuilt; and
6. scheduling resumes only if no migration or recovery block remains.

A persistence failure leaves the original runtime values intact. A failure after
persistence records an operation-recovery state and keeps the scheduler stopped
until the integration reloads or Home Assistant restarts.

## Portable Data

Portable model v5 exports raw stored values and declares `temperature_unit`.
The only V5 addition is the non-thermal `modes` section; V4 files remain
supported.
Imports convert selected sections from that unit to the effective Home Assistant
unit. Unitless model v1 files are interpreted as Celsius; model v2 is also Celsius
for compatibility with the format that produced it.

Conversion covers zone schedules and thermal feature settings, templates, global
settings, and selected Adaptive Preconditioning learning. Unknown climate IDs are
not applied. Known climates use their exact reported target range and step when
editable values are normalized; standalone template values use safe `0.1`
precision when no common exact device step can be derived.

See [WebSocket API](api.md) for command schemas and error codes, and [Manual
Testing](manual-testing.md) for release scenarios.
