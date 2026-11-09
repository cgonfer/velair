"""Owned, loopback-only Playwright server with the pinned Linux renderer."""
from __future__ import annotations

from contextlib import contextmanager
import json
import re
import time
import uuid
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

from ha import HarnessError, docker, write_private

OWNER_LABEL = "io.velair.quality.browser"


def configuration(lock):
    browser = lock["browser"]
    version = browser["packageVersion"]
    image = browser["image"]
    if not re.fullmatch(r"\d+\.\d+\.\d+", version) or not re.fullmatch(
        rf"mcr\.microsoft\.com/playwright:v{re.escape(version)}-noble@sha256:[a-f0-9]{{64}}", image
    ):
        raise ValueError("Browser version and immutable official image must match")
    return version, image


def stop(state_file):
    state = json.loads(state_file.read_text(encoding="utf-8"))
    run_id = state.get("run_id", "")
    name = state.get("container")
    if not re.fullmatch(r"[a-f0-9]{32}", run_id) or name != "velair-browser-" + run_id:
        raise HarnessError("Invalid browser ownership state")
    exists = docker("container", "ls", "--all", "--filter", f"name=^/{name}$", "--format", "{{.Names}}", timeout=20)
    if exists:
        actual = docker("inspect", "--format", f'{{{{index .Config.Labels "{OWNER_LABEL}"}}}}', name, timeout=20)
        if actual != run_id:
            raise HarnessError("Browser container ownership does not match")
        docker("rm", "--force", name, timeout=30)
    state_file.unlink(missing_ok=True)


@contextmanager
def server(lock, private):
    """No host mounts, Docker socket or authentication material in the renderer."""
    version, image = configuration(lock)
    state_file = Path(private) / "browser-state.json"
    if state_file.exists():
        raise HarnessError("Browser recovery state already exists")
    run_id = uuid.uuid4().hex
    name = "velair-browser-" + run_id
    write_private(state_file, {"run_id": run_id, "container": name})
    try:
        docker("run", "--detach", "--rm", "--init", "--platform", "linux/amd64", "--name", name,
               "--label", f"{OWNER_LABEL}={run_id}", "--publish", "127.0.0.1::3000",
               "--shm-size", "1g", "--workdir", "/home/pwuser", "--user", "pwuser",
               image, "sh", "-c", f"npx --yes playwright@{version} run-server --port 3000 --host 0.0.0.0", timeout=300)
        address = docker("port", name, "3000/tcp", timeout=20)
        if not re.fullmatch(r"127\.0\.0\.1:\d{1,5}", address):
            raise HarnessError("Browser server must be published on loopback only")
        deadline = time.monotonic() + 180
        while True:
            try:
                with urlopen("http://" + address + "/", timeout=2) as response:
                    if response.status == 200:
                        break
            except (OSError, URLError):
                pass
            if time.monotonic() >= deadline:
                raise HarnessError("Pinned browser server did not become ready")
            time.sleep(0.5)
        yield {"endpoint": "ws://" + address + "/", "image": image,
               "imageId": docker("inspect", "--format", "{{.Image}}", name, timeout=20),
               "platform": "linux", "architecture": "amd64"}
    finally:
        # On failure retain the small recovery handle; never delete another run.
        stop(state_file)
