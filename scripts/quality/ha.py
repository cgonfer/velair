"""Disposable real Home Assistant for browser/quality tests (Python stdlib only).

Authentication and mutable HA configuration stay outside public output. No
production data, trusted-network authentication or fabricated .storage files.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import secrets
import shutil
import subprocess
import sys
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import uuid
import zipfile

ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "tests/quality/ha_components/velair_test"
OWNER_LABEL = "io.velair.quality.run"
MARKER = ".velair-quality-owner.json"
WEEKDAYS = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")


class HarnessError(RuntimeError):
    """A bounded diagnostic safe to print without credentials."""


def docker(*args: str, input: str | None = None, timeout: int = 120) -> str:
    try:
        completed = subprocess.run(["docker", *args], input=input, text=True, capture_output=True, timeout=timeout, check=False)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise HarnessError(f"Docker command {args[0]} unavailable or timed out") from error
    if completed.returncode:
        # Never print stdin, process output or an HTTP response containing tokens.
        raise HarnessError(f"Docker command {args[0]} failed (exit {completed.returncode})")
    return completed.stdout.strip()


def write_private(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    path.chmod(0o600)


def read_state(path: Path) -> dict:
    state = json.loads(path.read_text(encoding="utf-8"))
    run_id = state.get("run_id", "")
    if not re.fullmatch(r"[0-9a-f]{32}", run_id) or state.get("container") != f"velair-quality-{run_id}":
        raise HarnessError("Invalid quality state ownership")
    return state


def validate_owned_directory(state: dict) -> Path:
    path = Path(state["config_dir"]).resolve()
    expected_parent = Path(tempfile.gettempdir()).resolve()
    if path.parent != expected_parent or not path.name.startswith("velair-quality-") or path.is_symlink():
        raise HarnessError("Refusing to remove configuration outside the task temporary directory")
    marker = path / MARKER
    if not marker.is_file() or json.loads(marker.read_text(encoding="utf-8")) != {"run_id": state["run_id"]}:
        raise HarnessError("Configuration ownership marker does not match")
    return path


def component_digest(source: Path) -> str:
    digest = hashlib.sha256()
    if source.is_file():
        return hashlib.sha256(source.read_bytes()).hexdigest()
    for path in sorted(source.rglob("*")):
        if path.is_file() and "__pycache__" not in path.parts and path.suffix != ".pyc":
            digest.update(path.relative_to(source).as_posix().encode())
            digest.update(b"\0")
            digest.update(path.read_bytes())
    return digest.hexdigest()


def copy_component(source: Path, target: Path) -> None:
    if source.is_dir():
        if not (source / "manifest.json").is_file():
            raise HarnessError("Component directory has no manifest.json")
        if any(path.is_symlink() for path in source.rglob("*")):
            raise HarnessError("Component directory must not contain symlinks")
        shutil.copytree(source, target, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
    elif source.is_file() and zipfile.is_zipfile(source):
        with zipfile.ZipFile(source) as archive:
            files = archive.infolist()
            if len(files) > 5000 or sum(item.file_size for item in files) > 250_000_000:
                raise HarnessError("Component archive exceeds extraction limits")
            for item in files:
                name = PurePosixPath(item.filename)
                if "\\" in item.filename or any(":" in part for part in name.parts) or name.is_absolute() or ".." in name.parts or not name.parts or name.parts[0] != "velair" or (item.external_attr >> 16) & 0o170000 == 0o120000:
                    raise HarnessError("Component archive contains an unsafe path")
            for item in files:
                relative = PurePosixPath(item.filename).parts[1:]
                if not relative:
                    continue
                destination = target.joinpath(*relative)
                if item.is_dir():
                    destination.mkdir(parents=True, exist_ok=True)
                else:
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    destination.write_bytes(archive.read(item))
        if not (target / "manifest.json").is_file():
            raise HarnessError("Component archive has no velair/manifest.json")
    else:
        raise HarnessError("Component must be an integration directory or ZIP")


def request(state: dict, method: str, path: str, payload=None, authenticated=True, form=False):
    headers = {}
    if authenticated:
        headers["Authorization"] = f"Bearer {state['access_token']}"
    body = None
    if payload is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded" if form else "application/json"
        body = (urlencode(payload) if form else json.dumps(payload)).encode()
    try:
        with urlopen(Request(state["base_url"] + path, data=body, headers=headers, method=method), timeout=15) as response:
            content = response.read()
            return json.loads(content) if content else None
    except HTTPError as error:
        raise HarnessError(f"HA {method} {path.split('?')[0]} returned HTTP {error.code}") from error
    except (URLError, TimeoutError, ConnectionError, json.JSONDecodeError) as error:
        raise HarnessError(f"HA {method} {path.split('?')[0]} is not available") from error


def wait_for(operation, description: str, timeout: int = 180):
    deadline = time.monotonic() + timeout
    last_error = None
    while time.monotonic() < deadline:
        try:
            result = operation()
            if result:
                return result
        except HarnessError as error:
            last_error = error
        time.sleep(1)
    raise HarnessError(f"Timed out waiting for {description}" + (f": {last_error}" if last_error else ""))


WS_SCRIPT = """
import asyncio,json,sys,aiohttp
async def main():
    data=json.load(sys.stdin)
    async with aiohttp.ClientSession() as session:
        async with session.ws_connect(data['url']+'/api/websocket',timeout=20) as ws:
            await ws.receive_json()
            await ws.send_json({'type':'auth','access_token':data['token']})
            if (await ws.receive_json()).get('type')!='auth_ok': raise RuntimeError('WS authentication failed')
            results=[]
            revision=0
            for index,message in enumerate(data['messages'],1):
                message=dict(message)
                if message.pop('_revision',False): message['expected_revision']=revision
                await ws.send_json({'id':index,**message})
                while True:
                    reply=await asyncio.wait_for(ws.receive_json(),60)
                    if reply.get('id')==index and reply.get('type')=='result': break
                if not reply.get('success'): raise RuntimeError('WS command failed: '+message['type']+' '+str(reply.get('error',{}).get('code')))
                result=reply.get('result')
                if isinstance(result,dict): revision=result.get('configuration_revision',revision)
                results.append(result)
            print(json.dumps(results))
asyncio.run(main())
"""


def websocket(state: dict, messages: list[dict]) -> list:
    raw = docker("exec", "-i", state["container"], "python", "-c", WS_SCRIPT, input=json.dumps({"url": "http://127.0.0.1:8123", "token": state["access_token"], "messages": messages}), timeout=max(120, len(messages) * 60))
    try:
        return json.loads(raw)
    except json.JSONDecodeError as error:
        raise HarnessError("HA WebSocket returned an invalid result") from error


def fixture_entities(size: str) -> dict:
    count = 3 if size == "small" else 30
    return {
        "climate": [f"climate.quality_{('heat', 'cool', 'range')[index % 3]}_{index + 1:02}" for index in range(count)],
        "sensor": [f"sensor.quality_temperature_{index + 1:02}" for index in range(count)] + ["sensor.quality_humidity_01", "sensor.quality_event_loop_lag"],
        "binary_sensor": ["binary_sensor.quality_occupancy"],
        "light": [f"light.quality_light_{index + 1:02}" for index in range(5 if size == "small" else 10)],
        "switch": [f"switch.quality_switch_{index + 1:02}" for index in range(5 if size == "small" else 10)],
        "cover": [f"cover.quality_cover_{index + 1:02}" for index in range(3 if size == "small" else 10)],
    }


def schedule_blocks(entity_id: str, offset: float = 0) -> list[dict]:
    mode = "heat_cool" if "range" in entity_id else "cool" if "cool" in entity_id else "heat"
    blocks = []
    for index, start in enumerate(("00:00", "06:00", "09:00", "12:00", "18:00", "22:00")):
        block = {"start": start, "action": "set_temperature", "hvac_mode": mode}
        if mode == "heat_cool":
            block.update(target_temp_low=19 + offset + (index % 2), target_temp_high=24 + offset)
        else:
            block["temperature"] = (24 if mode == "cool" else 19) + offset + (index % 2)
        blocks.append(block)
    return blocks


def seed(state: dict) -> None:
    messages = [{"type": "velair/get_schedule"}]
    for entity in state["climate_entities"]:
        messages.append({"type": "velair/set_schedule_days", "entity_id": entity, "weekdays": list(WEEKDAYS), "blocks": schedule_blocks(entity), "_revision": True})
    for key, name, offset in (("quality_winter", "Quality Winter", 0), ("quality_summer", "Quality Summer", 1)):
        profile = {"key": key, "name": name, "zones": {entity: {"behavior": "schedule", "schedule": {day: schedule_blocks(entity, offset) for day in WEEKDAYS}} for entity in state["climate_entities"]}}
        messages.append({"type": "velair/set_profile", "profile": profile, "_revision": True})
    websocket(state, messages)


def bootstrap(state: dict) -> None:
    wait_for(lambda: request(state, "GET", "/api/onboarding", authenticated=False), "HA onboarding", 240)
    client_id = state["base_url"] + "/"
    owner = request(state, "POST", "/api/onboarding/users", {"client_id": client_id, "name": "Velair CI", "username": state["username"], "password": state["password"], "language": "en"}, authenticated=False)
    tokens = request(state, "POST", "/auth/token", {"grant_type": "authorization_code", "code": owner["auth_code"], "client_id": client_id}, authenticated=False, form=True)
    state.update({key: tokens[key] for key in ("access_token", "refresh_token", "expires_in", "token_type")})
    for path, payload in (("core_config", {}), ("analytics", {}), ("integration", {"client_id": client_id, "redirect_uri": client_id})):
        request(state, "POST", f"/api/onboarding/{path}", payload)
    expected = {entity for values in state["fixture_entities"].values() for entity in values}
    wait_for(lambda: expected <= {item["entity_id"] for item in request(state, "GET", "/api/states")}, "CI fixture entities", 120)
    flow = request(state, "POST", "/api/config/config_entries/flow", {"handler": "velair", "show_advanced_options": False})
    if flow.get("type") != "form":
        raise HarnessError("Velair config flow did not expose its user form")
    result = request(state, "POST", f"/api/config/config_entries/flow/{flow['flow_id']}", {"climate_entities": state["climate_entities"], "apply_active_schedule_on_startup": False})
    if result.get("type") != "create_entry":
        raise HarnessError("Velair config flow did not create an integration entry")
    wait_for(lambda: websocket(state, [{"type": "velair/get_schedule"}])[0].get("configured_entities") == state["climate_entities"], "Velair API", 120)
    seed(state)
    # The OAuth access token lasts about 30 minutes, shorter than a soak plus
    # setup. This token exists only in the disposable instance/private state.
    state["oauth_access_token"] = state["access_token"]
    state["access_token"] = websocket(state, [{"type": "auth/long_lived_access_token", "client_name": f"Velair CI {state['run_id']}", "lifespan": 1}])[0]
    state["expires_in"] = 86400


def sanitized_logs(state: dict, output: Path) -> None:
    output = output / "logs"
    output.mkdir(parents=True, exist_ok=True)
    try:
        result = subprocess.run(["docker", "logs", "--tail", "1500", state["container"]], text=True, capture_output=True, timeout=20, check=False)
        text = result.stdout + result.stderr
        for key in ("username", "password", "access_token", "oauth_access_token", "refresh_token"):
            if state.get(key):
                text = text.replace(str(state[key]), "[redacted]")
        text = re.sub(r"(?i)(authorization|access_token|refresh_token|auth_code|password)([\s\"':=]+)[^\s,}\"]+", r"\1\2[redacted]", text)
        (output / "home-assistant.log").write_text(text, encoding="utf-8")
    except (OSError, subprocess.TimeoutExpired):
        (output / "home-assistant.log").write_text("Container logs unavailable.\n", encoding="utf-8")


def restore_host_ownership(state: dict, directory: Path) -> None:
    """HA runs as root; restore only this verified bind mount for Linux cleanup."""
    if os.name == "nt":
        return
    script = """
import json,os,pathlib,sys
root=pathlib.Path('/config')
if json.loads((root/'.velair-quality-owner.json').read_text()) != {'run_id':sys.argv[1]}:
    raise SystemExit('Quality ownership marker mismatch')
uid,gid=int(sys.argv[2]),int(sys.argv[3])
for current,directories,files in os.walk(root,followlinks=False):
    for name in files+directories:
        os.chown(os.path.join(current,name),uid,gid,follow_symlinks=False)
    os.chown(current,uid,gid,follow_symlinks=False)
"""
    docker("run", "--rm", "--network", "none", "--label", f"{OWNER_LABEL}={state['run_id']}", "--entrypoint", "python", "--mount", f"type=bind,source={directory},target=/config", state["image"], "-c", script, state["run_id"], str(os.getuid()), str(os.getgid()), timeout=60)


def stop(state: dict, output: Path | None = None) -> None:
    directory = validate_owned_directory(state)
    exists = docker("container", "ls", "--all", "--filter", f"name=^/{state['container']}$", "--format", "{{.Names}}", timeout=20)
    if exists:
        label = docker("inspect", "--format", f'{{{{index .Config.Labels "{OWNER_LABEL}"}}}}', state["container"], timeout=20)
        if label != state["run_id"]:
            raise HarnessError("Container ownership label does not match")
        try:
            docker("stop", "--time", "60", state["container"], timeout=90)
        finally:
            if output is not None:
                sanitized_logs(state, output)
        restore_host_ownership(state, directory)
        docker("rm", state["container"], timeout=20)
    shutil.rmtree(directory)


def start(args, prepare_config=None) -> None:
    output = args.output.resolve()
    state_file = args.state_file.resolve()
    if state_file == output or output in state_file.parents:
        raise HarnessError("Private state must not be stored inside public output")
    if state_file.exists():
        raise HarnessError("State file already exists; stop its owned environment first")
    component = args.component.resolve()
    docker("version", "--format", "{{.Server.Version}}", timeout=20)
    image = args.image
    if not image:
        environment = json.loads((ROOT / "scripts/quality/environment.json").read_text(encoding="utf-8"))
        image = environment["homeAssistant"]["image"]
    digest = component_digest(component)
    run_id = uuid.uuid4().hex
    directory = Path(tempfile.mkdtemp(prefix="velair-quality-"))
    state = {"schemaVersion": 1, "run_id": run_id, "container": f"velair-quality-{run_id}", "config_dir": str(directory), "base_url": f"http://127.0.0.1:{args.port}", "username": "velair_ci", "password": secrets.token_urlsafe(24), "size": args.size, "image": image, "fixture_entities": fixture_entities(args.size), "component_sha256": digest}
    state["climate_entities"] = state["fixture_entities"]["climate"]
    write_private(directory / MARKER, {"run_id": run_id})
    write_private(state_file, state)
    try:
        copy_component(component, directory / "custom_components/velair")
        shutil.copytree(FIXTURE, directory / "custom_components/velair_test", ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
        (directory / "configuration.yaml").write_text("homeassistant:\n  name: Velair CI\n  latitude: 40.4168\n  longitude: -3.7038\n  elevation: 650\n  unit_system: metric\n  time_zone: Europe/Madrid\n  country: ES\ndefault_config:\nvelair_test:\n  size: " + args.size + "\n", encoding="utf-8")
        if prepare_config is not None:
            prepare_config(directory)
        docker("run", "--detach", "--name", state["container"], "--label", f"{OWNER_LABEL}={run_id}", "--publish", f"127.0.0.1:{args.port}:8123", "--mount", f"type=bind,source={directory},target=/config", "--env", "TZ=Europe/Madrid", image, timeout=300)
        state["image_id"] = docker("inspect", "--format", "{{.Image}}", state["container"])
        bootstrap(state)
        state["ready"] = True
        write_private(state_file, state)
        output.mkdir(parents=True, exist_ok=True)
        (output / "environment.json").write_text(json.dumps({key: state[key] for key in ("schemaVersion", "size", "image", "image_id", "component_sha256")}, indent=2) + "\n", encoding="utf-8")
        print("Home Assistant ready at " + state["base_url"])
    except BaseException:
        write_private(state_file, state)
        sanitized_logs(state, output)
        try:
            stop(state)
            state_file.unlink(missing_ok=True)
        except (HarnessError, OSError, subprocess.TimeoutExpired):
            print("Cleanup incomplete; run the stop command with the private state file.", file=sys.stderr)
        raise


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("start")
    create.add_argument("--component", required=True, type=Path)
    create.add_argument("--state-file", required=True, type=Path)
    create.add_argument("--output", required=True, type=Path)
    create.add_argument("--size", choices=("small", "large"), default="small")
    create.add_argument("--image")
    create.add_argument("--port", type=int, default=8123)
    for command in ("stop", "restart", "status", "logs", "stats"):
        sub = commands.add_parser(command)
        sub.add_argument("--state-file", required=True, type=Path)
        if command in ("stop", "logs", "stats"):
            sub.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        if args.command == "start":
            if not 1024 <= args.port <= 65535:
                raise HarnessError("Port must be between 1024 and 65535")
            start(args)
        else:
            state = read_state(args.state_file)
            validate_owned_directory(state)
            if args.command == "stop":
                stop(state, args.output)
                args.state_file.unlink(missing_ok=True)
            elif args.command == "restart":
                docker("restart", "--time", "60", state["container"], timeout=120)
                wait_for(lambda: request(state, "GET", "/api/") is not None, "HA after restart", 180)
                wait_for(lambda: websocket(state, [{"type": "velair/get_schedule"}]), "Velair after restart", 120)
                print("Home Assistant restarted")
            elif args.command == "logs":
                if args.output is None:
                    raise HarnessError("logs requires --output")
                sanitized_logs(state, args.output)
            elif args.command == "stats":
                stats = json.loads(docker("stats", "--no-stream", "--format", "{{json .}}", state["container"]))
                safe = {key: stats.get(key) for key in ("CPUPerc", "MemUsage", "MemPerc", "PIDs", "NetIO", "BlockIO")}
                if args.output:
                    args.output.parent.mkdir(parents=True, exist_ok=True)
                    args.output.write_text(json.dumps(safe) + "\n", encoding="utf-8")
                else:
                    print(json.dumps(safe))
            elif args.command == "status":
                print(json.dumps({"ready": bool(request(state, "GET", "/api/")), "base_url": state["base_url"], "size": state["size"]}))
        return 0
    except (HarnessError, OSError, ValueError, KeyError, subprocess.TimeoutExpired) as error:
        print(f"Infrastructure error: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
