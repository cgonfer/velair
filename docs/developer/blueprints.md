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

Seasonal climate selection is version 1.0.0, included with Velair 1.9.0-beta.1.
It requires Home Assistant 2024.6.0 and no intrinsic minimum Velair version
because its actions are generic.

The occupancy and window blueprints retain their version and compatibility
statements inside `blueprint.description`. Seasonal climate selection uses a
short behavior-focused description; its technical versions and compatibility
are recorded in YAML header comments, the canonical manifest, changelog, and
user documentation. Keep these records consistent. The native
`homeassistant.min_version` continues to enforce the minimum runtime during
import. Do not add custom version or Velair requirement keys to the Home
Assistant `blueprint:` mapping.

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
- Adding notification-language options while retaining existing values and the
  default is compatible. Extend the selector snapshot additively; do not remove
  or rename existing language values. The seasonal language contract follows
  the same discovered translation modules as Velair's translation index.
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

## Temperature-only schedule compatibility

Blueprints do not reinterpret schedule blocks or store `temperature_only`.
The window blueprint still adds/removes its owned pause reason through
`velair.pause_zone` and `velair.resume_zone`. Resume applies current schedule
authority: a temperature-only block must not restore a captured on mode, even
when this blueprint caused the off state. Existing Keep blocks retain implicit
restart. Cover both paths and simultaneous pause reasons in scheduler tests.
Occupancy and seasonal blueprints execute user-selected actions unchanged;
Mode/Profile selection respects the destination block policy, while direct
climate service actions remain explicit. No YAML inputs, versions, URLs, or
snapshots change for this integration feature.

User documentation uses one stable catalog and one detail page per blueprint:

```text
docs/user/blueprints.md
docs/user/blueprints/<descriptive-slug>.md
```

## Adding a blueprint

1. Add the YAML blueprint with a new stable filename, version and requirements
   in its description or technical headers, stable `source_url`, author, domain, and minimum Home
   Assistant version.
2. Add exactly one entry to `blueprints/manifest.json` and create its individual
   changelog.
3. Add it alphabetically to `docs/user/blueprints.md` with a short purpose,
   version, compatibility, category labels, detail link, and import link.
4. Add one detail page using every required section below.
5. Add the initial major-version input snapshot and update the blueprint
   documentation contract tests.
6. Run `python -m unittest discover -s tests/docs` and
   `node scripts/documentation-translations.mjs check`. If the blueprint changes
   runtime behavior, also run the applicable backend and Home Assistant tests.

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
- version and compatibility statements in legacy blueprint descriptions or
  seasonal technical headers, with native minimum-runtime metadata and no
  unsupported schema keys;
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

Seasonal behavior also has isolated real Home Assistant automation-engine
tests, separately from the integration's stub-based unit suite. Keep this suite
in CI when changing triggers or templates: static YAML checks cannot verify
native timers, availability interruption, and notification behavior.

In a separate Python 3.12 environment, install the pinned requirements and run:

```shell
python -m pip install -r tests/ha_blueprints/requirements.txt
python -m pytest -c tests/ha_blueprints/pytest.ini tests/ha_blueprints -q
```

This suite targets Home Assistant 2024.6.4, checking the blueprint's declared
minimum runtime. CI runs it as the separate `blueprint-runtime-tests` job.
Do not run it in the same Python process as the integration tests: their Home
Assistant stubs deliberately replace modules used by the real runtime.

Blueprint discovery remains documentation-owned; adding a blueprint does not
add frontend state or panel configuration. The manifest is a repository and
tooling contract, not runtime persistence or an integration-owned automation
registry.
