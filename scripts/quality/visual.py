"""Record local Linux candidates and check repeatability, without approving them."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

import browser
import report
import run as runner


def record(component, output, *, port=8123):
    """Keep candidates and diagnostic comparisons outside live reference paths."""
    output = output.resolve()
    if output.exists():
        raise ValueError("Use a new candidate output directory")
    if output == runner.ROOT or output in runner.ROOT.parents or runner.ROOT / "frontend" in output.parents:
        raise ValueError("Candidate output must be separate from frontend sources")
    if os.getenv("GITHUB_ACTIONS") == "true":
        raise ValueError("CI cannot record or approve visual references")
    lock = report.read_json(runner.LOCK)
    output.mkdir(parents=True)
    manifest = {"schemaVersion": 1, "approvalStatus": "pending", "localOnly": True,
                "calibrationExcluded": True, "captureScope": "deterministic-rendering-fixture-v1",
                "repeatability": "not-run", "images": []}
    with runner.private_runtime() as private:
        state = private / "ha-state.json"
        ha = [sys.executable, runner.ROOT / "scripts/quality/ha.py"]
        try:
            if runner.checked([*ha, "start", "--component", component.resolve(), "--state-file", state,
                               "--output", output / "ha", "--size", "small", "--port", port], timeout=360):
                raise RuntimeError("Disposable HA did not start")
            runtime = report.read_json(state)
            with browser.server(lock, private) as renderer:
                env = dict(os.environ, VELAIR_HA_STATE=str(state), VELAIR_BROWSER_WS=renderer['endpoint'],
                           VELAIR_QUALITY_VISUAL="compare", VELAIR_QUALITY_SUITE="smoke",
                           VELAIR_VISUAL_REPEATABILITY="true",
                           VELAIR_VISUAL_REFERENCES=str(output / "candidates"))
                command = ["npm.cmd" if os.name == "nt" else "npm", "run", "test:e2e", "--", "e2e/visual.spec.mjs"]
                for name, flags in (("recorded", ["--update-snapshots=all"]),
                                    ("repeat-1", []), ("repeat-2", [])):
                    run_output = output / name
                    env["VELAIR_QUALITY_OUTPUT"] = str(run_output)
                    if runner.checked([*command, *flags], cwd=runner.ROOT / 'frontend', env=env, timeout=720):
                        raise RuntimeError("Visual candidate generation or repeatability failed")
                    runner.sanitize_browser_outputs(run_output, runtime)
                    proof = report.read_json(run_output / 'visual-results.json')
                    expected = 'recorded' if name == 'recorded' else 'compared'
                    if not runner.complete_visual_matrix(proof, 'compare', expected):
                        raise RuntimeError("Incomplete candidate matrix")
                manifest["repeatability"] = "two-local-comparisons-passed"
                manifest['environment'] = {"browserImage": renderer['image'], "browserImageId": renderer['imageId'],
                                           "renderer": "linux/amd64", "homeAssistantImage": runtime['image'],
                                           "componentSha256": runtime['component_sha256']}
                images = sorted((output / 'candidates').rglob('*.png'))
                if len(images) != 18:
                    raise RuntimeError("Expected exactly eighteen candidate images")
                manifest['images'] = [{"file": image.relative_to(output).as_posix(),
                                       "sha256": hashlib.sha256(image.read_bytes()).hexdigest()} for image in images]
        finally:
            if state.exists():
                runtime = report.read_json(state)
                for name in ('recorded', 'repeat-1', 'repeat-2'):
                    runner.sanitize_browser_outputs(output / name, runtime)
                if runner.checked([*ha, "stop", "--state-file", state, "--output", output / 'ha'], timeout=300):
                    raise RuntimeError("Disposable HA cleanup failed; private recovery handle retained")
            (output / 'candidate-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--component', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--port', type=int, default=8123)
    args = parser.parse_args()
    try:
        record(args.component, args.output, port=args.port)
        print("18 Linux candidates recorded; two local repeatability checks passed. Approval remains pending; excluded from calibration.")
        return 0
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
        print(f"Visual candidate task did not complete ({type(error).__name__}).", file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
