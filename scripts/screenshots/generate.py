"""Capture maintained website or documentation images in disposable real HA."""
from __future__ import annotations

import argparse
from hashlib import sha256
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import sys
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts/quality"))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import ha
import browser as quality_browser
from run import private_runtime
from scenario import prepare_fixture, seed

PLAN_PATH = Path(__file__).with_name("capture-plan.json")
DOCUMENTATION_PLAN_PATH = Path(__file__).with_name("documentation-plan.json")
WEBSITE = ROOT / "website/public"
DOCUMENTATION_GALLERY = ROOT / "docs/project/screenshots.md"
DOCUMENTATION_SCREENSHOTS = ROOT / "screenshots"


def collection_sources(collection: str) -> tuple[Path, Path]:
    if collection == "website":
        return PLAN_PATH, WEBSITE / "index.html"
    if collection == "documentation":
        return DOCUMENTATION_PLAN_PATH, DOCUMENTATION_GALLERY
    raise ValueError("Unknown screenshot collection")


def capture_contract(plan: dict, html: str, collection: str = "website") -> set[str]:
    """Refuse extra, missing or mismatched theme assets before starting Docker."""
    collection_sources(collection)
    themes = ["light", "dark"] if collection == "website" else ["dark"]
    if plan.get("schemaVersion") != 1 or plan.get("language") != "en" or plan.get("themes") != themes:
        raise ValueError("Capture plan must specify the collection's themes and English")
    captures = plan.get("captures", [])
    names = [item["name"] for item in captures]
    if not names or len(names) != len(set(names)) or any(not re.fullmatch(r"[a-z][a-z0-9-]+\.png", name) for name in names):
        raise ValueError("Capture names must be unique safe PNG basenames")
    if collection == "website":
        expected = {f"{theme}/{name}" for theme in plan["themes"] for name in names}
        referenced = set(re.findall(r"assets/screenshots/((?:light|dark)/[a-z0-9-]+\.png)", html))
    else:
        expected = set(names)
        referenced = set(re.findall(r"\.\./\.\./screenshots/([a-z0-9-]+\.png)", html))
    if expected != referenced:
        raise ValueError(f"{collection.title()} capture contract differs: missing={sorted(referenced-expected)}, unused={sorted(expected-referenced)}")
    return expected


def update_website(output: Path, expected: set[str]) -> None:
    """Copy a complete validated candidate set; never delete unrelated assets."""
    update_collection(output, expected, "website")


def update_collection(output: Path, expected: set[str], collection: str) -> None:
    """Validate the entire exact set before replacing only its owned assets."""
    collection_sources(collection)
    pattern = r"(?:light|dark)/[a-z][a-z0-9-]+\.png" if collection == "website" else r"[a-z][a-z0-9-]+\.png"
    if not expected or any(not re.fullmatch(pattern, name) for name in expected):
        raise ValueError("Unsafe screenshot installation paths")
    manifest = json.loads((output / "capture-manifest.json").read_text(encoding="utf-8"))
    if manifest.get("collection", "website") != collection:
        raise ValueError("Candidate screenshot collection differs")
    rows = manifest.get("captures", [])
    if {row["file"] for row in rows} != expected or len(rows) != len(expected):
        raise ValueError("Incomplete capture manifest")
    for row in rows:
        image = output / row["file"]
        data = image.read_bytes() if image.is_file() else b""
        if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR" or sha256(data).hexdigest() != row["sha256"]:
            raise ValueError(f"Missing or changed capture: {row['file']}")
        if (row.get("width"), row.get("height")) != (int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")):
            raise ValueError(f"Capture dimensions do not match PNG: {row['file']}")
    destination = WEBSITE / "assets/screenshots" if collection == "website" else DOCUMENTATION_SCREENSHOTS
    for name in sorted(expected):
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(output / name, target)
    shutil.copy2(output / "capture-manifest.json", destination / "capture-manifest.json")


def free_port() -> int:
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        return listener.getsockname()[1]


def capture_phases(plan: dict, collection: str = "website") -> list[str]:
    """Return changes household ownership, so capture it after the baseline views."""
    phases = list(dict.fromkeys(item.get("phase", "household") for item in plan["captures"]))
    collection_sources(collection)
    allowed = ("household", "return") if collection == "website" else (
        "household", "external-publishing", "external-error", "diagnostics-errors", "return")
    if not phases or phases[0] != "household" or any(phase not in allowed for phase in phases):
        raise ValueError("Capture phases must start with the household and use supported phases")
    ordered = [allowed.index(item.get("phase", "household")) for item in plan["captures"]]
    if ordered != sorted(ordered):
        raise ValueError("Capture phases must stay in their declared order")
    if any((item["view"] == "planned-return") != (item.get("phase") == "return") for item in plan["captures"]):
        raise ValueError("Planned Return must use its separate final capture phase")
    return phases


def validate_scenario(scenario: dict, plan: dict, phase: str = "household") -> None:
    required = {
        "schedules": ("schedule_entity",), "modes": ("mode_name",),
        "sensors": ("assist_name",), "preconditioning": ("preconditioning_name",),
        "external": ("external_name",), "room-groups": ("room_group", "group_name"),
        "presets": ("preset_name",), "supply-control": ("supply_id", "supply_name"),
        "planned-return": ("arrival_at", "planned_return_destination"),
        "profiles": ("profile_key", "profile_name", "schedule_entity"),
        "climate-card": ("dashboard_path",), "sensors-holding": ("holding_name", "holding_entity"),
        "comfort": ("comfort_name",), "active-setup": ("mode_name",),
        "external-settings": ("external_name",),
    }
    for item in plan["captures"]:
        if item.get("phase", "household") != phase:
            continue
        for key in required.get(item["view"], ()):
            if not isinstance(scenario.get(key), str) or not scenario[key]:
                raise ValueError(f"Screenshot scenario is missing {key} for {item['view']}")


def install_candidates(output: Path, collection: str = "website") -> None:
    """Install the exact reviewed set, without rerunning HA or changing its images."""
    plan_path, source = collection_sources(collection)
    expected = capture_contract(json.loads(plan_path.read_text(encoding="utf-8")),
                                source.read_text(encoding="utf-8"), collection)
    manifest = json.loads((output / "capture-manifest.json").read_text(encoding="utf-8"))
    version = json.loads((ROOT / "custom_components/velair/manifest.json").read_text(encoding="utf-8"))["version"]
    bundle_hash = sha256((ROOT / "custom_components/velair/frontend/velair-card.js").read_bytes()).hexdigest()
    if manifest.get("version") != version or manifest.get("language") != "en" or manifest.get("responseOverrides") is not False or manifest.get("bundleSha256") != bundle_hash:
        raise ValueError("Candidates must come from the current English real-HA bundle")
    if manifest.get("collection", "website") != collection:
        raise ValueError("Candidate screenshot collection differs")
    if collection == "website":
        update_website(output, expected)
    else:
        update_collection(output, expected, collection)
    print(f"Installed the reviewed local {collection} screenshots; nothing was published.")


def generate(output: Path, update: bool = False, collection: str = "website") -> None:
    plan_path, source = collection_sources(collection)
    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    expected = capture_contract(plan, source.read_text(encoding="utf-8"), collection)
    phases = capture_phases(plan, collection)
    output = output.resolve()
    if output.exists() and any(output.iterdir()):
        raise ValueError("Use an empty task-specific capture output directory")
    if any(output == directory.resolve() or directory.resolve() in output.parents
           for directory in (WEBSITE, DOCUMENTATION_SCREENSHOTS, ROOT / ".private")):
        raise ValueError("Generate candidates outside maintained screenshots, website/public and .private")
    output.mkdir(parents=True, exist_ok=True)
    lock = json.loads((ROOT / "scripts/quality/environment.json").read_text(encoding="utf-8"))
    # HA authentication/configuration are siblings of the candidate output.
    with private_runtime() as private:
        state_file = Path(private) / "ha-state.json"
        args = SimpleNamespace(output=output / "environment", state_file=state_file,
                               component=ROOT / "custom_components/velair", size="large",
                               image=lock["homeAssistant"]["image"], port=free_port())
        try:
            fixture = prepare_fixture
            if collection == "documentation":
                from documentation_scenario import prepare_documentation_fixture
                fixture = prepare_documentation_fixture
            ha.start(args, prepare_config=fixture)
            state = ha.read_state(state_file)
            scenario = seed(state)
            if collection == "documentation":
                from scenario import prepare_documentation_phase
                scenario = prepare_documentation_phase(state, scenario, "household")
            validate_scenario(scenario, plan)
            scenario_path = Path(private) / "scenario.json"
            ha.write_private(scenario_path, scenario)
            with quality_browser.server(lock, private) as renderer:
                env = dict(os.environ, VELAIR_HA_STATE=str(state_file), VELAIR_QUALITY_OUTPUT=str(output),
                           VELAIR_BROWSER_WS=renderer["endpoint"], VELAIR_CAPTURE_SCENARIO=str(scenario_path),
                           VELAIR_CAPTURE_PLAN=str(plan_path), VELAIR_CAPTURE_COLLECTION=collection)
                for index, phase in enumerate(phases):
                    if collection == "documentation" and index:
                        scenario = prepare_documentation_phase(state, scenario, phase)
                        validate_scenario(scenario, plan, phase)
                        ha.write_private(scenario_path, scenario)
                    elif phase == "return":
                        from scenario import prepare_planned_return
                        scenario = prepare_planned_return(state, scenario)
                        validate_scenario(scenario, plan, phase)
                        ha.write_private(scenario_path, scenario)
                    env.update(VELAIR_CAPTURE_PHASE=phase, VELAIR_CAPTURE_APPEND="1" if index else "0")
                    runner = "capture-website.mjs" if collection == "website" else "capture-documentation.mjs"
                    result = subprocess.run(["node", str(ROOT / "scripts/screenshots/browser" / runner)], cwd=ROOT, env=env, timeout=600, check=False)
                    if result.returncode:
                        raise RuntimeError(f"{collection.title()} browser capture failed in {phase} phase")
                manifest_path = output / "capture-manifest.json"
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                manifest.update({"collection": collection, "homeAssistantVersion": lock["homeAssistant"]["version"],
                                 "homeAssistantImage": state["image"], "browserImage": renderer["image"],
                                 "componentSha256": state["component_sha256"],
                                 "bundleSha256": sha256((args.component / "frontend/velair-card.js").read_bytes()).hexdigest(),
                                 "data": "Fictional English household with virtual devices in real Home Assistant",
                                 "scenarioProvenance": scenario["provenance"],
                                 "responseOverrides": False})
                manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        finally:
            if state_file.exists():
                owned_state = ha.read_state(state_file)
                try:
                    if collection == "documentation":
                        from scenario import cleanup_documentation
                        cleanup_documentation(owned_state)
                finally:
                    ha.stop(owned_state)
                    state_file.unlink()
    if update:
        if collection == "website":
            update_website(output, expected)
        else:
            update_collection(output, expected, collection)
        print(f"Updated the {len(expected)} local {collection} screenshot assets; nothing was published.")
    print(f"Review the English {collection} capture gallery at {output / 'index.html'}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path, help="Empty task-specific candidate directory")
    parser.add_argument("--collection", choices=("website", "documentation"), default="website")
    actions = parser.add_mutually_exclusive_group()
    actions.add_argument("--update-website", action="store_true", help="Generate and replace only the homepage's local screenshot files after validation")
    actions.add_argument("--update-assets", action="store_true", help="Generate and replace only the selected collection after validation")
    actions.add_argument("--install-candidates", action="store_true", help="Install an already reviewed candidate set without rerunning Docker")
    args = parser.parse_args()
    try:
        if not args.output.is_absolute():
            raise ValueError("--output must be absolute")
        if args.update_website and args.collection != "website":
            raise ValueError("--update-website applies only to the website collection; use --update-assets")
        if args.install_candidates:
            install_candidates(args.output, args.collection)
        else:
            generate(args.output, args.update_website or args.update_assets, args.collection)
        return 0
    except (ha.HarnessError, OSError, ValueError, RuntimeError, subprocess.TimeoutExpired) as error:
        print(f"Screenshot capture failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
