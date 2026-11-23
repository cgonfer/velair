"""Pure, unit-independent minimum Room Assist correction policy."""
from __future__ import annotations

import math

MARGIN_KEY = "room_sensor_assist_minimum_margin"


def validate_minimum_margin(config: dict, maximum: float = 10.0) -> None:
    """Validate the final merged settings without changing either limit."""
    try:
        margin = float(config.get(MARGIN_KEY, 0))
        cap = float(config.get("room_sensor_assist_max_delta", 2))
    except (TypeError, ValueError) as err:
        raise ValueError("Room Assist minimum control margin is not valid") from err
    if not math.isfinite(margin) or not 0 <= margin <= maximum:
        raise ValueError(f"Room Assist minimum control margin must be between 0 and {maximum:g}")
    if not math.isfinite(cap) or margin > cap + 0.000001:
        raise ValueError("Increase Maximum assist delta first, or reduce this margin.")


def margin_correction(config, correction, *, phase=None, eligible=True):
    """Strengthen a non-neutral correction, or a fixed-direction phase."""
    margin = config.get(MARGIN_KEY, 0.0)
    active = bool(margin > 0 and eligible and (phase is not None or correction != 0))
    if not active:
        return correction, False
    sign = (1 if phase == "towards_upper" else -1) if phase else (1 if correction > 0 else -1)
    return sign * min(config["room_sensor_assist_max_delta"], max(margin, abs(correction))), True


def margin_step_temperature(current, correction, maximum_delta, step, minimum):
    """Round towards the requested demand while respecting the correction cap.

    If a minimum and maximum coincide between grid points, choose the nearest
    point inside the cap. A device grid with no point inside the cap necessarily
    takes precedence; callers report the unavailable minimum through metadata.
    """
    if step is None or step <= 0:
        return current + correction
    requested = current + correction
    if correction > 0:
        units = math.ceil((requested - minimum) / step - 0.000001)
        cap = math.floor((current + maximum_delta - minimum) / step + 0.000001)
        units = min(units, cap)
        if minimum + units * step < current - 0.000001:
            units = math.ceil((current - minimum) / step - 0.000001)
    else:
        units = math.floor((requested - minimum) / step + 0.000001)
        cap = math.ceil((current - maximum_delta - minimum) / step - 0.000001)
        units = max(units, cap)
        if minimum + units * step > current + 0.000001:
            units = math.floor((current - minimum) / step + 0.000001)
    return round(minimum + units * step, 6)


def margin_status(config, active=False, *, correction=0.0, current=0.0, applied=0.0, limited_by=None):
    """Describe the requested policy without asserting physical device activity."""
    margin = config.get(MARGIN_KEY, 0.0)
    achieved = (applied - current) * (1 if correction > 0 else -1)
    return {"configured": margin, "active": active,
            "limited_by": (limited_by or "step") if active and (achieved < margin - 0.000001 or limited_by == "step") else None}
