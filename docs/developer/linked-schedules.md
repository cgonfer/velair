# Block preset and template references

## Stored intent and resolved schedules

`block_presets` is a shared collection of `{key, name, config}` values. A preset
configuration has the existing block action and its valid climate fields, but
no start time. An editable block contains either an inline configuration or
`{start, preset_key}`; the two forms must not be merged.

Daily template blocks contain inline configurations or preset references and
stable `slot_id` values. Moving or reordering a slot preserves its identity.
Copies receive new identities. Both Default zones and Profile zones with schedule
behavior support hours-only and complete links:

```json
{
  "template_links": {
    "monday": {
      "mode": "hours",
      "template_key": "workday",
      "bindings": {
        "morning_slot": {"preset_key": "winter_comfort"},
        "night_slot": {"action": "turn_off"}
      }
    }
  }
}
```

The corresponding stored `schedule.monday` is empty. With `mode: hours`, the
template contributes only `start`; bindings provide all climate configuration.
With `mode: full`, a link contains only `mode` and `template_key`; `bindings` is
not accepted. Omitted modes normalize to `hours`, preserving legacy intent.
The resolver emits
ordinary concrete blocks for scheduling, preconditioning, Room Assist, and
external publication. These derived weeks are not exported or persisted.

Default remains a real zone schedule, not an artificial Profile. Usage
destinations distinguish `source: default` from `source: profile`; Profile
destinations include their `profile_key`. Both also identify the climate and
weekday.

## Shared mutations

Changing a shared resource validates all stored consumers, including inactive
Profiles and hidden Default schedules. Template additions automatically propose
bindings for every hours-only linked day; removals remove those bindings in the
same save. Full links inherit complete blocks without assignments or donor
fallback. An incompatible full destination prevents the entire save.
Deletion of used resources is rejected. Expected configuration revisions protect drafts
against concurrent edits.

A shared backend allocator builds both template previews and save candidates.
New slots in hours-only links first try the template's manual configuration or
preset reference, then compatible saved
bindings from the same destination and day: exact time, preceding times in
descending order, and following times in ascending order. Donors use the old
template's times and bindings, including slots moved or removed by the edit;
new slots are never donors. Raw preset references stay intact. Moving an
existing slot retains its binding by ID.

Configuration compatibility uses the normal resolver, climate adaptation and
validation, and external provider block capabilities. Whole-week constraints
remain separate: unavailable providers, time grids, change limits, and required
weekly actions do not trigger donor searches. Failed proposals remain draft
diagnostics; no incomplete candidate is persisted.

Resolve previous and candidate configuration using separate complete
snapshots. Reading both against a mutated library hides effective changes.
Serialize graph mutations before affected zone locks, revalidate execution
ownership, persist the candidate once, then reconcile runtime and publish
changed external weeks. Device calls are not a multi-device transaction.

Library edits preserve Boost and pause authority. Explicit Profile activation
keeps its established Boost-cancellation behavior. Default edits hidden by a
Profile's own schedule do not change that zone's current week. Profiles that
use Default receive its resolved references.

Validate template-to-preset references even when the template has no consumers.
Template configuration changes affect full links, not existing hours-only bindings.
Editing a preset validates all direct and inherited destinations. Unlinking
materializes the day while retaining preset references. Day cloning instead
deep-copies the raw schedule and daily link, including hours-only bindings or a
full link, preserving links on unrelated destination days. Copying blocks from
the template library remains independent. Saving a day as a template also
preserves preset references.
When producing independent assignments, manual configurations use the backend's
effective destination values, including step adjustment and filtered options.
The shared template and preset library remain unchanged. Frontend transitions
wait for a validated preview and retain the previous draft on failure or a stale
response; they do not implement temperature rounding locally.

## WebSocket operations

`copy_day_schedule` accepts optional `target_entity_ids` (defaulting to the source
entity) and `expected_revision`. It clones the saved source day to every selected
entity/weekday pair in one candidate under the global mutation lock. A supplied
stale revision rejects without mutation; automation services omitting the revision
clone the latest saved source. The panel supplies its revision, including the
revision returned after an explicit source-day save. Cloning preserves raw
references and delegates compatibility to the existing backend validation.
Profile clones operate on raw draft configuration and use `preview_profile`
before accepting the candidate; the complete Profile save remains authoritative.

All operations use the `velair/` prefix. The normal schedule response includes
`block_presets`, `configuration_revision`, `resource_usages`,
`resolved_default_schedules`, `resolved_profile_schedules`, and
`effective_schedules` in addition to raw editable configuration.
`resolved_template_blocks` maps template keys to structurally resolved blocks,
without adapting shared values to a reference thermostat.
`resource_diagnostics` identifies invalid destinations, while
`resolved_block_metadata` describes each block's reference origin and requested
versus effective values after destination adaptation. Neither is persisted or
exported.

Create or update a preset:

```json
{
  "type": "velair/set_block_preset",
  "key": "winter_comfort",
  "name": "Winter comfort",
  "config": {"action": "set_temperature", "hvac_mode": "heat", "temperature": 21},
  "expected_revision": 4
}
```

`delete_block_preset` accepts `key` and `expected_revision`. A used preset is
rejected and its destinations are returned with the configuration error.

`set_daily_schedule` accepts exactly one of `blocks` or `template_link`:

```json
{
  "type": "velair/set_daily_schedule",
  "entity_id": "climate.living_room",
  "weekday": "monday",
  "template_link": {
    "mode": "hours",
    "template_key": "workday",
    "bindings": {
      "morning_slot": {"preset_key": "winter_comfort"},
      "night_slot": {"action": "turn_off"}
    }
  },
  "expected_revision": 5
}
```

Replacing a linked Default day with `blocks` requires explicit
`unlink_template: true` and the expected revision. `set_profile` saves the
complete Profile with its per-zone `template_links` and revision. Default is
not represented as a stored Profile.

`preview_daily_schedule` accepts the same day intent without saving;
`preview_profile` accepts a complete Profile draft. They return concrete
configuration for display and validation, not a new persisted source.
Daily previews also return `materialized_blocks`: effective manual configurations
with raw preset references preserved, suitable for explicit copy or unlink actions.
Profile previews return `materialized_schedules` per scheduled zone and weekday,
using that Profile's week for provider validation. Profile materialization must
not validate a draft day against an unrelated Default week.

`preview_schedule_template_update` accepts `key`, `name`, inline or preset `blocks`, optional
`expected_revision`, and explicit new-slot `assignments`. Its result includes
the candidate `template`, all `usages`, `added_slot_ids`, `removed_slot_ids`, and
the current `configuration_revision`, plus proposed bindings with their origins,
pending slots, and destination errors. Previews never change stored data. The
structural template retains references; resolved template values and per-destination
results are separate preview fields. Never persist adapted values as template settings.
The preview's `resolved_template_blocks` is the concrete candidate template;
`resolved_destinations` contains `{destination, blocks, metadata}` or
`{destination, error}` for affected days. Missing assignments remain in `pending`.

`proposals` contains `{destination, slot_id, binding, origin, effective_config}`.
Origins are `template`, `saved_match`, `saved_previous`, `saved_next`, or `manual`;
donor proposals also include `donor_slot_id` and `donor_start`. `binding` is the
editable raw intent; `effective_config` is adapted for that thermostat.
`pending` identifies unresolved destination/slot pairs with `reason` and
`message`. `destination_errors` reports `{destination, code, message}` separately
from those slots. `changes` identifies added, moved, and removed slots with
their old or new times. These fields are transient, not portable configuration.

Explicit additions in the template editor receive fresh slot IDs before the
debounced preview. This distinguishes deleting and recreating a slot at the
same time from moving an existing slot. The backend validates and returns those
IDs unchanged; new API slots without IDs at new times still receive backend IDs.

Preserve returned slot IDs when committing `set_schedule_template`. Send every
accepted automatic or manual binding for the added slots and affected hours-only
destinations in that single commit. Full destinations have no bindings. Never
issue one save per linked destination.
Explicit assignments must target known linked days and new slots, without
duplicates. They are revalidated without silently selecting a different fallback.
Callers omitting assignments use backend allocation and can commit only if the
result is complete and valid. The backend rechecks the dependency graph and
configuration revision under the existing mutation locks.

`resource_usages.presets` and `resource_usages.templates` map stable resource
keys to references. Preset references include template-owned uses
(`source: template`, `template_key`, `slot_id`), direct Default/Profile uses, and
indirect destinations inheriting a template preset. Chips count direct references;
inherited destinations are displayed as additional scope. Template links identify
their modality. Indirect uses carry `indirect: true` and `template_key`.
Configuration failures use distinct codes for stale
revisions, missing references, incomplete assignments, incompatible settings,
and used resources. Clients should retain drafts after a conflict.

## Units, portability, and recovery

The implementation retains the current declared-unit `runtime_v1` storage
contract. Extend the existing unit conversions to preset configurations and
inline bindings without changing IDs or converting shared values twice.
Adapt target steps and supported optional settings per destination; do not
rewrite a shared preset for one thermostat.

Portable model 16 includes referenced libraries using transitive dependency closure:
schedules include templates and those templates include presets. Earlier payloads
remain importable, with existing links normalized to hours-only. Import checks the complete
combined graph before mutation. Missing or corrupt references must remain
visible and recoverable; they must not silently become empty schedules or
Default fallback. Invalid effective schedules cannot be delivered locally or
published externally.

## Preset service updates

`velair.update_block_preset` accepts `preset_key`, `operation` (`update` by
default, or `replace`), the existing flat climate configuration fields, and
`clear_fields` for partial updates. Update preserves the action; replace requires
it. A scalar and a complete range replace each other. Null values, empty strings,
incomplete ranges, and fields both set and cleared are rejected.

The scheduler reads and merges against the latest preset under the global
configuration mutation lock. It validates the candidate and reuses the existing
snapshot commit and reconciliation path, including indirect template consumers.
Automation callers do not fetch a revision; WebSocket editors retain their
expected-revision contract. Semantic no-ops do not persist, increment revisions,
or reconcile runtime. Metadata, list order, and references remain unchanged.
The service does not create presets or change block references.

## Verification

Tests should cover both link modes across Default and Profiles, presets inside
templates, direct and inherited preset edits, stable slot
identities, inactive consumers, complete additions, failed persistence and
revision conflicts, independent overrides, unit conversion, backup round
trips, provider handoff, and legacy copy semantics. Frontend editors preserve
intent references and use backend previews for derived configuration.
