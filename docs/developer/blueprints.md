# Blueprint Maintenance

Velair automation blueprints are stored under:

```text
blueprints/automation/velair/
```

`blueprints/manifest.json` is the canonical machine-readable catalog. It must
contain exactly one entry for every shipped YAML file. Individual release
history lives under `blueprints/changelogs/`, and version 1 input contracts are
snapshotted in `tests/docs/snapshots/blueprint-inputs-v1.json`.

## Version and compatibility policy

Blueprints use semantic versions independently of the Velair integration.
Both initial blueprints are version 1.0.0 and were released with Velair 1.6.0.
The occupancy blueprint has no intrinsic minimum Velair version because it runs
arbitrary Home Assistant actions; the actions a user chooses may still depend
on Velair. The window blueprint requires Velair 1.6.0 for owned simultaneous
pause reasons. Both require Home Assistant 2024.6.0 or newer.

Keep the version and compatibility statement inside `blueprint.description` so
Home Assistant shows it during import and configuration. A header comment may
repeat the statement. Do not add custom version or Velair requirement keys to
the Home Assistant `blueprint:` mapping.

The compatibility rules are:

- Treat filenames and `source_url` values as stable public identifiers.
- Keep documentation import URLs on `main`; it is the rolling update channel.
- Keep the input snapshot append-only within a major version. Its key set must
  exactly match the YAML: never remove an existing entry, and append an entry
  whenever a compatible input is added.
- Record `introduced_in` for every input. It must be in the same major, cannot
  exceed the blueprint version, and any input introduced after `N.0.0` must
  have a default so existing automations remain valid.
- Snapshot normalized selector behavior, including selector type, filters,
  `multiple`, option values, and mode. Exclude option display labels so copy
  changes and translations are not treated as breaking behavior.
- Publish a breaking change under a new filename ending in `_vN.yaml`, where
  `N` is the new major version. Keep the previous major available at its
  established URL.
- Update the manifest entry and the blueprint's own changelog in the same
  change. Do not change the Velair integration version solely for a blueprint
  release.
- Never inspect or migrate Home Assistant automations or `.storage`. Home
  Assistant owns instantiated automation configuration; users opt into rolling
  updates by re-importing, or opt out with **Take control**.

This policy is the public maintenance contract for Velair blueprints.

User documentation uses one stable catalog and one detail page per blueprint:

```text
docs/user/blueprints.md
docs/user/blueprints/<descriptive-slug>.md
```

## Adding a blueprint

1. Add the YAML blueprint with a new stable filename, version and requirements
   in its description, stable `source_url`, author, domain, and minimum Home
   Assistant version.
2. Add exactly one entry to `blueprints/manifest.json` and create its individual
   changelog.
3. Add it alphabetically to `docs/user/blueprints.md` with a short purpose,
   version, compatibility, category labels, detail link, and import link.
4. Add one detail page using every required section below.
5. Add the initial major-version input snapshot and update the blueprint
   documentation contract tests.
6. Run the relevant checks required by `AGENTS.md`.

Do not add blueprint configuration to Velair storage. Home Assistant owns the resulting automation.

## Detail-page template

Every user-facing blueprint page must use this order:

```md
# Blueprint name

Short purpose.

[Import into Home Assistant](...)

[View raw YAML](...) · [Back to the blueprint index](../blueprints.md)

## When to use it
## Requirements
## Configuration
## Example
## How it works
## Safety and precedence
## Limitations
## Troubleshooting
## Updating and customizing
```

Keep behavior shared by every blueprint in the catalog. Detail pages should contain only blueprint-specific requirements, examples, safety rules, and limitations.

## Import links

Documentation links to Home Assistant's blueprint importer with the complete raw GitHub URL encoded as the `blueprint_url` query parameter. The raw URL remains on the `main` branch so published links stay stable after a release.

HACS integration installation does not copy these files into a Home Assistant blueprint directory. Do not imply that installing Velair automatically installs its blueprints.

## Tests

`tests/docs/test_blueprints.py` checks:

- a one-to-one mapping between YAML files and the canonical manifest;
- semantic version, compatibility, stable `source_url`, and changelog metadata;
- the version and requirements visible in each blueprint description without
  unsupported metadata keys;
- exact, append-only snapshot coverage for every version 1 blueprint, including
  input identifiers, defaults, `introduced_in`, and normalized selector
  behavior, plus defaults for inputs introduced after 1.0.0;
- required blueprint metadata and event-driven behavior;
- ownership and all-closed safety contracts for the window blueprint;
- continuous aggregate window template triggers with native `for` durations, short parallel and revalidated actions, bounded startup reconciliation, deterministic persistent notifications, and aggregate recovery dismissal;
- multi-climate per-entity service calls with isolated Home Assistant service errors, per-call state revalidation, and an automation-scoped notification ID;
- occupancy continuity through native state `for` triggers, aggregate availability/recovery triggers, automation-scoped notifications, and interruptible startup reconciliation;
- matching repository, catalog, import, and detail URLs;
- alphabetical catalog order;
- the complete section template for every detail page.

Blueprint discovery remains documentation-owned; adding a blueprint does not
add frontend state or panel configuration. The manifest is a repository and
tooling contract, not runtime persistence or an integration-owned automation
registry.
