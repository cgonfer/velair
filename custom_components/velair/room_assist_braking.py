"""Pure fixed-direction Room Assist braking policy."""
from __future__ import annotations

LEVELS = ("default", "moderate", "high")
LEVEL_KEY = "room_sensor_assist_braking_level"
HIGH_STEPS_KEY = "room_sensor_assist_high_braking_steps"
DEFAULT_HIGH_STEPS = 2
MAX_HIGH_STEPS = 10


def validate_high_braking_steps(value):
    """Validate a dimensionless whole step count without truncation or coercion."""
    if type(value) is not int or not DEFAULT_HIGH_STEPS <= value <= MAX_HIGH_STEPS:
        raise ValueError("High braking steps must be an integer between 2 and 10")
    return value


def normalize_high_braking_steps(value):
    """Keep existing installations and malformed stored data on the default."""
    try:
        return validate_high_braking_steps(value)
    except ValueError:
        return DEFAULT_HIGH_STEPS


def validate_braking_settings(settings: dict) -> None:
    """Validate an explicit or merged settings object without normalizing it."""
    validate_high_braking_steps(settings.get(HIGH_STEPS_KEY, DEFAULT_HIGH_STEPS))
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
    high_steps = normalize_high_braking_steps(config.get(HIGH_STEPS_KEY, DEFAULT_HIGH_STEPS))
    steps = high_steps if effective == "high" else 1 if effective == "moderate" else 0
    supported = mode in ("heat", "cool") and target is not None and band > 0
    stop = resume = bound = None
    active = False
    if supported:
        sign = 1 if mode == "heat" else -1
        stop = round(target + sign * (0 if effective == "high" else band), 6)
        resume = round(target - sign * band, 6)
        if effective != "default" and step is not None:
            bound = round(target - sign * step * steps, 6)
            active = phase == ("towards_lower" if mode == "heat" else "towards_upper")
    return {"configured_level": configured, "effective_level": effective,
            "active": active, "stop_temperature": stop, "resume_temperature": resume,
            "setpoint_bound": bound, "reason": reason, "high_steps": high_steps,
            "steps": steps, "temperature_delta": round(step * steps, 6) if step is not None else None}
