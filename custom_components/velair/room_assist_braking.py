"""Pure fixed-direction Room Assist braking policy."""
from __future__ import annotations

LEVELS = ("default", "moderate", "high")
LEVEL_KEY = "room_sensor_assist_braking_level"


def validate_braking_settings(settings: dict) -> None:
    """Validate an explicit or merged settings object without normalizing it."""
    level = settings.get(LEVEL_KEY, "default")
    if level not in LEVELS:
        raise ValueError("Room Assist braking must be default, moderate, or high")
    if level != "default" and float(settings.get("room_sensor_assist_deadband", .3)) <= 0:
        raise ValueError("Room Assist braking requires a positive deadband")


def braking_policy(config, mode, target, step, phase=None, *, reason=None):
    """Resolve fixed thresholds and guard; never mutate or advance a phase."""
    configured = config.get(LEVEL_KEY, "default")
    configured = configured if configured in LEVELS else "default"
    band = config.get("room_sensor_assist_deadband", 0)
    if reason is None and configured != "default":
        reason = ("unsupported_mode" if mode not in ("heat", "cool") else
                  "missing_target" if target is None else
                  "zero_deadband" if band <= 0 else
                  "missing_target_step" if step is None else None)
    effective = configured if reason is None else "default"
    supported = mode in ("heat", "cool") and target is not None and band > 0
    stop = resume = bound = None
    active = False
    if supported:
        sign = 1 if mode == "heat" else -1
        stop = round(target + sign * (0 if effective == "high" else band), 6)
        resume = round(target - sign * band, 6)
        if effective != "default" and step is not None:
            bound = round(target - sign * step * (2 if effective == "high" else 1), 6)
            active = phase == ("towards_lower" if mode == "heat" else "towards_upper")
    return {"configured_level": configured, "effective_level": effective,
            "active": active, "stop_temperature": stop, "resume_temperature": resume,
            "setpoint_bound": bound, "reason": reason}
