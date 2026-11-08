"""Ten deliberate consecutive real runs; no automatic visual/gate approval."""
from __future__ import annotations

import argparse
from pathlib import Path
from types import SimpleNamespace

import report as quality
import run as runner


def execute_batch(args, execute=runner.execute):
    required = quality.read_json(runner.LOCK)["rollout"]["requiredStableRuns"]
    if type(required) is not int or not 1 <= required <= 10:
        raise ValueError("Calibration batch size must be between one and ten")
    reports = []
    for index in range(required):
        report = execute(args, args.component, args.output / f"run-{index + 1:02}")
        reports.append(report)
        evidence = quality.calibration(reports, required)
        # Never retry a fault into a green batch or mix changed environments.
        if report["outcome"] != "pass" or report.get("visualStatus") != "compared" or evidence["stableRuns"] != len(reports):
            break
    result = dict(reports[-1])
    result["calibration"] = quality.calibration(reports, required)
    result["limitations"] = [*result.get("limitations", []), "Calibration is deliberate repetition; independent review is required before enabling gates."]
    if not result["calibration"]["eligibleForReview"]:
        result["status"] = result["outcome"] = "fail"
    quality.write(result, args.output)
    return 0 if result["calibration"]["eligibleForReview"] else 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--component", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--image")
    parser.add_argument("--port", type=int, default=8123)
    args = parser.parse_args()
    options = SimpleNamespace(**vars(args), suite="calibration", size="small", visual="compare", archive=None, skip_load=False)
    options.component = options.component.resolve()
    options.output = options.output.resolve()
    raise SystemExit(execute_batch(options))


if __name__ == "__main__":
    main()
