"""Automation blueprint repository and documentation contracts."""

from __future__ import annotations

import json
from pathlib import Path
import re
from urllib.parse import quote
import unittest


ROOT = Path(__file__).resolve().parents[2]
BLUEPRINTS = ROOT / "blueprints" / "automation" / "velair"
BLUEPRINT_ROOT = ROOT / "blueprints"
MANIFEST = BLUEPRINT_ROOT / "manifest.json"
INPUT_SNAPSHOT = ROOT / "tests" / "docs" / "snapshots" / "blueprint-inputs-v1.json"
GUIDE = ROOT / "docs" / "user" / "blueprints.md"
DETAILS = ROOT / "docs" / "user" / "blueprints"
RAW_ROOT = "https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair"
REPOSITORY_ROOT = "https://github.com/cgonfer/velair/blob/main"
IMPORT_ROOT = "https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url="


def _blueprint_files() -> list[Path]:
    """Return every shipped automation blueprint in filename order."""
    return sorted(BLUEPRINTS.glob("*.yaml"))


def _blueprint_title(source: str) -> str:
    """Return the public name from one blueprint's metadata."""
    match = re.search(r"^  name: (.+)$", source, flags=re.MULTILINE)
    if match is None:
        raise AssertionError("Blueprint is missing its name metadata")
    return match.group(1)


def _import_url(raw_url: str) -> str:
    """Return the exact My Home Assistant import URL."""
    return f"{IMPORT_ROOT}{quote(raw_url, safe='')}"


def _semver_tuple(version: str) -> tuple[int, int, int]:
    """Return the comparable numeric part of a stable semantic version."""
    match = re.fullmatch(r"(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)", version)
    if match is None:
        raise AssertionError(f"Invalid stable semantic version: {version}")
    return tuple(int(part) for part in match.groups())


def _normalized_selector(lines: list[str], selector_indent: int) -> str:
    """Normalize selector behavior while excluding translated display labels."""
    normalized: list[str] = []
    index = 0
    while index < len(lines):
        item = lines[index]
        if not item.strip():
            index += 1
            continue
        relative = item[selector_indent:]
        label_match = re.match(r"^(\s*)- label:", relative)
        if label_match is not None:
            if index + 1 >= len(lines):
                raise AssertionError("Selector option label is missing its value")
            value = lines[index + 1][selector_indent:]
            value_match = re.match(r"^\s+value:\s*(.+)$", value)
            if value_match is None:
                raise AssertionError("Selector option label is missing its value")
            normalized.append(
                f"{label_match.group(1)}- value: {value_match.group(1)}"
            )
            index += 2
            continue
        normalized.append(relative)
        index += 1
    return "\n".join(normalized)


def _blueprint_input_contract(source: str) -> dict[str, dict[str, object]]:
    """Return input identifiers and normalized defaults from blueprint YAML."""
    lines = source.splitlines()
    start = lines.index("  input:") + 1
    contract: dict[str, dict[str, object]] = {}

    for index in range(start, len(lines)):
        line = lines[index]
        if line and not line.startswith(" "):
            break
        match = re.match(r"^( +)([a-z][a-z0-9_]*):\s*$", line)
        if match is None:
            continue
        indent = len(match.group(1))
        if indent not in (4, 8):
            continue

        end = index + 1
        while end < len(lines):
            candidate = lines[end]
            if candidate and len(candidate) - len(candidate.lstrip()) <= indent:
                break
            end += 1
        block = lines[index + 1:end]
        child_indent = " " * (indent + 2)
        selector_index = next(
            (
                offset
                for offset, item in enumerate(block)
                if item == f"{child_indent}selector:"
            ),
            None,
        )
        if selector_index is None:
            continue

        selector_indent = indent + 2
        selector_source = [block[selector_index]]
        for item in block[selector_index + 1:]:
            item_indent = len(item) - len(item.lstrip()) if item else 0
            if item and item_indent <= selector_indent:
                break
            selector_source.append(item)
        input_contract: dict[str, object] = {
            "selector": _normalized_selector(selector_source, selector_indent),
        }

        default_index = next(
            (
                offset
                for offset, item in enumerate(block)
                if item.startswith(f"{child_indent}default:")
            ),
            None,
        )
        input_name = match.group(2)
        if default_index is None:
            input_contract["required"] = True
            contract[input_name] = input_contract
            continue

        default_line = block[default_index]
        inline_default = default_line.split("default:", 1)[1].strip()
        if inline_default:
            normalized_default = inline_default
        else:
            default_indent = indent + 2
            nested_default: list[str] = []
            for item in block[default_index + 1:]:
                item_indent = len(item) - len(item.lstrip()) if item else 0
                if item and item_indent <= default_indent:
                    break
                if item.strip():
                    nested_default.append(item.strip())
            normalized_default = " ".join(nested_default)
        input_contract["default"] = normalized_default
        contract[input_name] = input_contract

    return contract


class AutomationBlueprintContractTest(unittest.TestCase):
    """Keep blueprint behavior, ownership, and import links aligned."""

    def test_manifest_is_canonical_and_complete(self) -> None:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        self.assertEqual(manifest["schema_version"], 1)
        entries = manifest["blueprints"]
        self.assertEqual(len({entry["id"] for entry in entries}), len(entries))

        expected_files = {
            path.relative_to(BLUEPRINT_ROOT).as_posix()
            for path in _blueprint_files()
        }
        manifest_files = [entry["file"] for entry in entries]
        manifest_changelogs = [entry["changelog"] for entry in entries]
        self.assertEqual(len(manifest_files), len(set(manifest_files)))
        self.assertEqual(len(manifest_changelogs), len(set(manifest_changelogs)))
        self.assertEqual(set(manifest_files), expected_files)
        self.assertEqual(
            set(manifest_changelogs),
            {
                path.relative_to(BLUEPRINT_ROOT).as_posix()
                for path in (BLUEPRINT_ROOT / "changelogs").glob("*.md")
            },
        )
        compatibility = {
            entry["id"]: entry["minimum_velair"]
            for entry in entries
        }
        self.assertEqual(
            compatibility,
            {"occupancy_home_away": None, "window_pause": "1.6.0"},
        )

        for entry in entries:
            path = BLUEPRINT_ROOT / entry["file"]
            source = path.read_text(encoding="utf-8")
            self.assertEqual(entry["name"], _blueprint_title(source))
            self.assertEqual(entry["domain"], "automation")
            self.assertRegex(entry["version"], r"^[1-9]\d*\.\d+\.\d+$")
            self.assertRegex(
                entry["released_with_velair"],
                r"^[1-9]\d*\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$",
            )
            major_version = int(entry["version"].split(".", 1)[0])
            if major_version > 1:
                self.assertTrue(
                    path.stem.endswith(f"_v{major_version}"),
                    "A new major must use a new _vN filename",
                )
            self.assertEqual(
                entry["source_url"],
                f"{REPOSITORY_ROOT}/blueprints/{entry['file']}",
            )
            self.assertEqual(
                re.findall(r"^  source_url: (.+)$", source, flags=re.MULTILINE),
                [entry["source_url"]],
            )
            changelog = BLUEPRINT_ROOT / entry["changelog"]
            self.assertTrue(changelog.is_file())
            self.assertIn(
                f"## {entry['version']} - Velair {entry['released_with_velair']}",
                changelog.read_text(encoding="utf-8"),
            )

    def test_version_and_compatibility_are_visible_and_schema_safe(self) -> None:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        for entry in manifest["blueprints"]:
            source = (BLUEPRINT_ROOT / entry["file"]).read_text(encoding="utf-8")
            metadata = source[:source.index("  input:")]
            description = metadata[
                metadata.index("  description:"):metadata.index("  domain:")
            ]

            self.assertIn(f"Blueprint version {entry['version']}.", description)
            self.assertIn(
                f"Home Assistant {entry['minimum_home_assistant']} or newer",
                description,
            )
            self.assertIn(
                f"homeassistant:\n    min_version: {entry['minimum_home_assistant']}",
                metadata,
            )
            self.assertEqual(
                set(re.findall(r"^  ([a-z_]+):", metadata, flags=re.MULTILINE)),
                {"name", "description", "domain", "author", "source_url", "homeassistant"},
            )
            self.assertNotRegex(
                metadata,
                re.compile(r"^  (?:version|velair|min_velair):", re.MULTILINE),
            )

            minimum_velair = entry["minimum_velair"]
            if minimum_velair is None:
                self.assertIn("does not require Velair", description)
                self.assertIn(
                    f"Released with Velair {entry['released_with_velair']}",
                    description,
                )
            else:
                self.assertIn(
                    f"Requires Velair {minimum_velair} or newer",
                    description,
                )

    def test_version_one_input_contract_is_backward_compatible(self) -> None:
        snapshot = json.loads(INPUT_SNAPSHOT.read_text(encoding="utf-8"))
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        versions = {
            entry["file"]: entry["version"]
            for entry in manifest["blueprints"]
        }
        self.assertEqual(snapshot["schema_version"], 1)
        self.assertEqual(
            set(snapshot["blueprints"]),
            {
                path
                for path, version in versions.items()
                if version.startswith("1.")
            },
        )

        for relative_path, expected in snapshot["blueprints"].items():
            self.assertIn(relative_path, versions)
            self.assertEqual(
                int(versions[relative_path].split(".", 1)[0]),
                expected["major_version"],
            )
            source = (BLUEPRINT_ROOT / relative_path).read_text(encoding="utf-8")
            actual_inputs = _blueprint_input_contract(source)
            self.assertEqual(set(actual_inputs), set(expected["inputs"]))
            for input_name, contract in expected["inputs"].items():
                introduced_in = contract["introduced_in"]
                introduced_version = _semver_tuple(introduced_in)
                blueprint_version = _semver_tuple(versions[relative_path])
                self.assertEqual(introduced_version[0], expected["major_version"])
                self.assertLessEqual(introduced_version, blueprint_version)
                input_contract = {
                    key: value
                    for key, value in contract.items()
                    if key != "introduced_in"
                }
                self.assertEqual(actual_inputs[input_name], input_contract)
                if introduced_version > (expected["major_version"], 0, 0):
                    self.assertIn(
                        "default",
                        input_contract,
                        f"Compatible input {input_name} must define a default",
                    )

    def test_blueprints_declare_native_automation_contract(self) -> None:
        blueprints = _blueprint_files()
        self.assertTrue(blueprints)
        for path in blueprints:
            source = path.read_text(encoding="utf-8")
            expected_source_url = (
                f"{REPOSITORY_ROOT}/blueprints/automation/velair/{path.name}"
            )

            self.assertIn("domain: automation", source)
            self.assertIn("min_version: 2024.6.0", source)
            self.assertIn("platform: homeassistant", source)
            self.assertEqual(
                re.findall(r"^  source_url: (.+)$", source, flags=re.MULTILINE),
                [expected_source_url],
            )
            self.assertNotIn("time_pattern", source)

    def test_window_blueprint_owns_only_its_pause(self) -> None:
        source = (BLUEPRINTS / "window_pause.yaml").read_text(encoding="utf-8")

        self.assertIn(
            "climate_entity:\n"
            "      name: Managed thermostats",
            source,
        )
        climate_input = source[
            source.index("    climate_entity:"):
            source.index("    opening_entities:")
        ]
        self.assertIn("multiple: true", climate_input)
        self.assertIn("default: velair_window_guard", source)
        self.assertIn("owned_pause_id: !input pause_id", source)
        self.assertGreaterEqual(source.count('pause_id: "{{ owned_pause_id }}"'), 4)
        self.assertIn("service: velair.pause_zone", source)
        self.assertIn("service: velair.resume_zone", source)
        self.assertIn("rejectattr('state', 'eq', 'off')", source)
        self.assertIn("for: !input close_delay", source)
        self.assertNotIn("trigger.id == 'opened'", source)
        self.assertNotIn("trigger.id == 'closed'", source)
        self.assertIn("mode: parallel", source)
        self.assertIn("max: 50", source)
        self.assertIn("max_exceeded: warning", source)
        self.assertNotIn("mode: restart", source)
        self.assertNotIn("mode: queued", source)

        self.assertIn("managed_climates: !input climate_entity", source)
        self.assertNotIn("managed_climate_input", source)
        self.assertIn("velair_window_guard_{{ this.entity_id | replace", source)
        self.assertEqual(source.count("- repeat:"), 4)
        self.assertEqual(source.count('for_each: "{{ managed_climates }}"'), 4)
        self.assertEqual(source.count("service: velair.pause_zone"), 2)
        self.assertEqual(source.count("service: velair.resume_zone"), 2)
        self.assertEqual(source.count("continue_on_error: true"), 4)
        self.assertEqual(source.count('entity_id: "{{ repeat.item }}"'), 4)
        repeated_calls = re.findall(
            r"- repeat:\s+for_each: \"\{\{ managed_climates \}\}\"\s+"
            r"sequence:\s+- condition: template.*?"
            r"- service: velair\.(pause|resume)_zone",
            source,
            flags=re.DOTALL,
        )
        self.assertEqual(repeated_calls, ["pause", "resume", "pause", "resume"])

        self.assertIn("trigger_variables:\n  opening_entities: !input opening_entities", source)
        for trigger_id, delay_input in (
            ("opened_due", "open_delay"),
            ("closed_due", "close_delay"),
            ("availability_due", "availability_warning_delay"),
        ):
            self.assertIn("- platform: template", source)
            self.assertIn(f"for: !input {delay_input}", source)
            self.assertIn(f"id: {trigger_id}", source)
            self.assertIn(f"trigger.id == '{trigger_id}'", source)
            self.assertEqual(source.count(f"timeout: !input {delay_input}"), 1)

        normal_actions = source[
            source.index("action:"):
            source.index("value_template: \"{{ trigger.id == 'startup' }}\"")
        ]
        self.assertNotIn("- delay:", normal_actions)
        self.assertNotIn("- delay:", source)
        self.assertEqual(source.count("- wait_for_trigger:"), 3)
        self.assertEqual(source.count("continue_on_timeout: true"), 3)
        self.assertEqual(source.count('value_template: "{{ not wait.completed }}"'), 3)
        self.assertNotIn("platform: state", source)
        self.assertEqual(source.count("id: availability_recovered"), 1)
        self.assertIn("trigger.id == 'availability_recovered'", source)

    def test_window_blueprint_reports_availability_without_blocking_control(self) -> None:
        source = (BLUEPRINTS / "window_pause.yaml").read_text(encoding="utf-8")

        self.assertIn("- parallel:", source)
        self.assertIn("availability_warning_delay:", source)
        self.assertIn("minutes: 5", source)
        problem_filter = (
            "| selectattr('state', 'in', ['unknown', 'unavailable'])"
        )
        self.assertGreaterEqual(source.count(problem_filter), 3)
        self.assertIn("service: persistent_notification.create", source)
        self.assertIn("service: persistent_notification.dismiss", source)
        availability_action = source[
            source.index("trigger.id == 'availability_due'"):
            source.index("trigger.id == 'availability_recovered'")
        ]
        self.assertIn("service: persistent_notification.create", availability_action)
        self.assertIn("- if:", availability_action)
        self.assertIn("service: persistent_notification.dismiss", availability_action)
        self.assertIn(
            "availability_notification_id: >-\n"
            "    velair_window_guard_{{ this.entity_id | replace('.', '_') | replace('-', '_') }}",
            source,
        )
        self.assertGreaterEqual(
            source.count('notification_id: "{{ availability_notification_id }}"'),
            4,
        )
        self.assertIn("contact.name or contact.entity_id", source)
        self.assertIn("Affected thermostats:", source)
        self.assertIn("for climate in managed_climates", source)
        self.assertIn("will not resume these climates", source)
        self.assertIn("reports closed (`off`)", source)
        self.assertNotIn("time_pattern", source)

    def test_window_startup_availability_wait_does_not_block_open_trigger(self) -> None:
        source = (BLUEPRINTS / "window_pause.yaml").read_text(encoding="utf-8")

        self.assertIn("mode: parallel", source)
        self.assertIn("max: 50", source)
        self.assertIn("id: opened_due", source)
        self.assertIn("id: startup", source)
        startup = source[
            source.index("trigger.id == 'startup'"):
        ]
        self.assertIn("- parallel:", startup)
        self.assertIn("timeout: !input availability_warning_delay", startup)
        self.assertIn("service: velair.pause_zone", startup)
        self.assertIn("continue_on_error: true", startup)

    def test_window_availability_behavior_is_documented(self) -> None:
        detail = (
            DETAILS / "pause-zone-for-open-windows.md"
        ).read_text(encoding="utf-8")
        catalog = GUIDE.read_text(encoding="utf-8")

        for phrase in (
            "native template trigger with its configured `for` duration",
            "resets its timer",
            "short action checks the complete contact set again",
            "independent event-driven triggers",
            "An aggregate recovery trigger dismisses the warning",
            "deterministic notification ID",
            "one reconciliation execution",
            "waits up to the configured duration for the opposite condition",
            "stops immediately if that opposite condition appears",
            "only when the wait times out",
            "There is no polling",
            "Each climate receives an individual service call",
            "checked again immediately before every call",
            "automation trace",
            "notification ID uses the Home Assistant automation entity ID",
            "Automation runs may overlap",
            "an `opened_due` event is not blocked",
            "startup wait occupies only one",
            "every climate iteration revalidates",
            "serializes override mutations per climate",
            "opposite aggregate trigger applies the later",
        ):
            self.assertIn(phrase, detail)
        self.assertIn("persistent contact availability problems", catalog)

    def test_occupancy_blueprint_delegates_home_and_away_actions(self) -> None:
        source = (BLUEPRINTS / "occupancy_home_away.yaml").read_text(encoding="utf-8")

        self.assertGreaterEqual(source.count("selector:\n        action: {}"), 2)
        self.assertIn("occupied_actions", source)
        self.assertIn("empty_actions", source)
        self.assertIn("to: \"home\"", source)
        self.assertIn("to: \"not_home\"", source)
        self.assertIn("states(occupancy_entity) in ['on', 'home']", source)
        self.assertIn("states(occupancy_entity) in ['off', 'not_home']", source)
        self.assertIn("Consolidated occupancy state", source)
        self.assertIn("group, template binary sensor, or helper", source)
        self.assertIn(
            "trigger_variables:\n  occupancy_entity: !input occupancy",
            source,
        )
        self.assertIn("mode: parallel", source)
        self.assertIn("max: 20", source)
        self.assertIn("max_exceeded: warning", source)
        self.assertNotIn("mode: restart", source)
        self.assertIn("for: !input occupied_delay", source)
        self.assertIn("for: !input empty_delay", source)
        self.assertIn("for: !input availability_warning_delay", source)
        self.assertIn("id: availability_due", source)
        self.assertIn("id: availability_recovered", source)
        self.assertIn(
            "states(occupancy_entity) in ['on', 'home', 'off', 'not_home']",
            source,
        )
        self.assertIn("velair_occupancy_{{ this.entity_id | replace", source)
        self.assertIn("service: persistent_notification.create", source)
        self.assertIn("service: persistent_notification.dismiss", source)
        self.assertIn("Home and Away actions are not run", source)
        self.assertEqual(source.count("- wait_for_trigger:"), 3)
        self.assertEqual(source.count("continue_on_timeout: true"), 3)
        self.assertEqual(source.count('value_template: "{{ not wait.completed }}"'), 3)
        self.assertIn("- parallel:", source)
        self.assertNotIn("- delay:", source)

    def test_occupancy_availability_and_startup_are_documented(self) -> None:
        detail = (DETAILS / "home-away-from-occupancy.md").read_text(
            encoding="utf-8"
        )
        normalized_detail = " ".join(detail.split())
        catalog = GUIDE.read_text(encoding="utf-8")

        for phrase in (
            "person group can represent whether any tracked person is `home`",
            "accepts both `on`/`off` and `home`/`not_home`",
            "template binary sensor",
            "Velair is required only when the actions you configure use its Modes",
            "standard Home Assistant actions without Velair",
            "visible Velair Mode entity offered by Home Assistant",
            "rather than assuming a particular entity ID",
            "native `for` durations",
            "one automation-scoped persistent notification",
            "actions do not run while the entity lacks a valid state",
            "waits interruptibly for the opposite state",
            "startup availability wait cannot block",
            "There is no polling",
        ):
            self.assertIn(phrase, normalized_detail)
        self.assertIn("occupancy becomes unavailable", catalog)

    def test_every_blueprint_has_exactly_one_catalog_and_detail_page(self) -> None:
        guide = GUIDE.read_text(encoding="utf-8")
        detail_paths = sorted(DETAILS.glob("*.md"))
        blueprints = _blueprint_files()
        self.assertEqual(len(detail_paths), len(blueprints))

        catalog_entries: list[tuple[str, int]] = []
        required_sections = (
            "## When to use it",
            "## Requirements",
            "## Configuration",
            "## Example",
            "## How it works",
            "## Safety and precedence",
            "## Limitations",
            "## Troubleshooting",
            "## Updating and customizing",
        )

        claimed_details: set[Path] = set()
        for blueprint_path in blueprints:
            source = blueprint_path.read_text(encoding="utf-8")
            _blueprint_title(source)
            raw_url = f"{RAW_ROOT}/{blueprint_path.name}"
            import_url = _import_url(raw_url)
            matching_details = [
                path
                for path in detail_paths
                if raw_url in path.read_text(encoding="utf-8")
            ]
            self.assertEqual(
                len(matching_details),
                1,
                f"{blueprint_path.name} must have exactly one detail page",
            )
            detail_path = matching_details[0]
            claimed_details.add(detail_path)
            detail = detail_path.read_text(encoding="utf-8")
            detail_title_match = re.match(r"^# (.+)$", detail, flags=re.MULTILINE)
            self.assertIsNotNone(detail_title_match)
            detail_title = detail_title_match.group(1)
            self.assertTrue(detail.startswith(f"# {detail_title}\n"))
            self.assertEqual(detail.count(f'<a href="{import_url}">'), 1)
            self.assertEqual(detail.count(f'<a href="{raw_url}">'), 1)
            self.assertIn(
                'src="https://my.home-assistant.io/badges/blueprint_import.svg"',
                detail,
            )
            self.assertIn(
                "img.shields.io/badge/YAML_source-View-24292F",
                detail,
            )
            self.assertIn(
                f'alt="Open Home Assistant and import the {detail_title} blueprint"',
                detail,
            )
            self.assertIn(
                f'alt="View the {detail_title} YAML source"',
                detail,
            )
            self.assertLess(detail.index(import_url), detail.index(raw_url))
            self.assertIn("[Back to the blueprint index](../blueprints.md)", detail)
            for section in required_sections:
                self.assertIn(section, detail)

            catalog_heading = f"### {detail_title}"
            self.assertEqual(guide.count(catalog_heading), 1)
            self.assertEqual(guide.count(f"- [{detail_title}](#"), 1)
            self.assertEqual(
                guide.count(f"blueprints/{detail_path.name}"),
                1,
            )
            self.assertEqual(guide.count(import_url), 1)
            heading_position = guide.index(catalog_heading)
            self.assertTrue(
                guide[:heading_position].rstrip().endswith("<hr>"),
                f"{detail_title} must begin as a visually separated entry",
            )
            next_separator = guide.index("<hr>", heading_position)
            catalog_entry = guide[heading_position:next_separator]
            self.assertIn("**Version:**", catalog_entry)
            self.assertIn("**Requires:**", catalog_entry)
            self.assertNotIn("**Blueprint ", catalog_entry)
            self.assertIn(
                f'<a href="blueprints/{detail_path.name}">',
                catalog_entry,
            )
            self.assertIn(
                "img.shields.io/badge/Documentation-View-24292F",
                catalog_entry,
            )
            self.assertIn(
                f'alt="View the {detail_title} documentation"',
                catalog_entry,
            )
            self.assertIn(f'<a href="{import_url}">', catalog_entry)
            self.assertIn(
                'src="https://my.home-assistant.io/badges/blueprint_import.svg"',
                catalog_entry,
            )
            self.assertIn(
                f'alt="Open Home Assistant and import the {detail_title} blueprint"',
                catalog_entry,
            )
            catalog_entries.append(
                (detail_title.casefold(), guide.index(catalog_heading))
            )

        self.assertEqual(claimed_details, set(detail_paths))
        self.assertEqual(
            [position for _title, position in catalog_entries],
            [
                position
                for _title, position in sorted(catalog_entries, key=lambda item: item[0])
            ],
        )

if __name__ == "__main__":
    unittest.main()
