"""Resolve publication identity without modifying GitHub or release state."""
from __future__ import annotations

import base64
import json
import os
import re
from urllib.parse import quote
from urllib.request import Request, urlopen

SHA = re.compile(r"[a-f0-9]{40}")
TAG = re.compile(r"v\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?")


def tag_commit(api, tag):
    item = api(f"/git/ref/tags/{quote(tag, safe='')}")["object"]
    seen = set()
    for _ in range(8):
        sha = item.get("sha", "")
        if not SHA.fullmatch(sha) or sha in seen:
            raise ValueError("Invalid or cyclic release tag")
        if item.get("type") == "commit":
            return sha
        if item.get("type") != "tag":
            raise ValueError("Release tag does not resolve to a commit")
        seen.add(sha)
        item = api(f"/git/tags/{sha}")["object"]
    raise ValueError("Release tag nesting exceeds limit")


def resolve_identity(env, api):
    requested = [env.get(key, "") for key in ("RECOVERY_TAG", "RECOVERY_COMMIT", "VALIDATION_RUN_ID")]
    recovery = any(requested)
    commit = env["GITHUB_SHA"]
    if not SHA.fullmatch(commit):
        raise ValueError("Invalid workflow commit")
    publish = env.get("GITHUB_EVENT_NAME") == "push" and env.get("GITHUB_REF", "").startswith("refs/tags/")
    tag = env.get("GITHUB_REF_NAME", "") if publish else ""
    result = {"commit": commit, "tag": tag, "publish": str(publish).lower(), "recovery": "false",
              "release_id": "", "validation_url": "", "validation_attempt": ""}
    if recovery:
        if not all(requested) or env.get("GITHUB_EVENT_NAME") != "workflow_dispatch" or env.get("GITHUB_REF") != "refs/heads/main":
            raise ValueError("Recovery requires all three inputs and a dispatch from main")
        tag, commit, run_id = requested
        if not TAG.fullmatch(tag) or not SHA.fullmatch(commit) or not re.fullmatch(r"[1-9]\d*", run_id):
            raise ValueError("Invalid recovery identity")
        release = api(f"/releases/tags/{quote(tag, safe='')}")
        if release.get("tag_name") != tag or release.get("draft") is not True or release.get("immutable") is not False:
            raise ValueError("Recovery requires the existing release to be a mutable draft")
        if not isinstance(release.get("id"), int) or release["id"] <= 0:
            raise ValueError("Invalid existing release identity")
        run = api(f"/actions/runs/{run_id}")
        if (run.get("head_sha") != commit or run.get("head_branch") != tag or run.get("event") != "push"
                or run.get("status") != "completed" or run.get("path") != ".github/workflows/release.yml"
                or run.get("repository", {}).get("full_name") != env["GITHUB_REPOSITORY"]):
            raise ValueError("Original validation run does not match the requested tag and commit")
        attempt = run.get("run_attempt")
        if not isinstance(attempt, int) or attempt <= 0:
            raise ValueError("Invalid validation run attempt")
        jobs = []
        for page in range(1, 101):
            batch = api(f"/actions/runs/{run_id}/attempts/{attempt}/jobs?per_page=100&page={page}")["jobs"]
            jobs.extend(batch)
            if len(batch) < 100:
                break
        else:
            raise ValueError("Validation job pagination exceeds limit")
        for name in ("Release HACS validation", "Release Hassfest validation"):
            matches = [job for job in jobs if job.get("name") == name]
            if len(matches) != 1 or matches[0].get("status") != "completed" or matches[0].get("conclusion") != "success":
                raise ValueError(f"Missing unambiguous successful validation: {name}")
        result.update(commit=commit, tag=tag, publish="true", recovery="true", release_id=str(release["id"]),
                      validation_url=f"https://github.com/{env['GITHUB_REPOSITORY']}/actions/runs/{run_id}/attempts/{attempt}",
                      validation_attempt=str(attempt))
    if result["publish"] == "true":
        if not TAG.fullmatch(tag) or tag_commit(api, tag) != commit:
            raise ValueError("Remote tag does not match the expected release commit")
        content = api(f"/contents/custom_components/velair/manifest.json?ref={commit}")
        manifest = json.loads(base64.b64decode(content["content"]).decode("utf-8"))
        if tag != "v" + manifest["version"]:
            raise ValueError("Release tag does not match the target manifest version")
    return result


def main():
    repository = os.environ["GITHUB_REPOSITORY"]
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
        raise ValueError("Invalid repository")

    def api(path):
        request = Request(f"https://api.github.com/repos/{repository}{path}", headers={
            "Authorization": "Bearer " + os.environ["GH_TOKEN"], "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        })
        with urlopen(request, timeout=30) as response:
            return json.load(response)

    result = resolve_identity(os.environ, api)
    with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as stream:
        for key, value in result.items():
            stream.write(f"{key}={value}\n")
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as stream:
        stream.write(f"Workflow commit: {os.environ['GITHUB_SHA']}\n\nTested product commit: {result['commit']}\n\n")
        if result["recovery"] == "true":
            stream.write(f"Recovery of {result['tag']}, existing draft ID {result['release_id']}. "
                         f"HACS/Hassfest evidence: {result['validation_url']}. Both product journeys run again.\n")


if __name__ == "__main__":
    main()
