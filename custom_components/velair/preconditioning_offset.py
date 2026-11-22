"""Width-preserving temporary setpoint displacement (temperature deltas)."""
from __future__ import annotations

import math


def displace_target(base: dict[str, float], direction: str, requested: float,
                    minimum: float, maximum: float, step: float) -> tuple[dict, dict]:
    """Floor the extra to the available capacity and delta grid, never its base."""
    sign = 1 if direction == "heat" else -1
    capacity = max(0.0, maximum - max(base.values()) if sign > 0
                   else min(base.values()) - minimum)
    available = min(requested, capacity)
    applied = math.floor((available + 0.000001) / step) * step if step > 0 else available
    applied = max(0.0, min(applied, available))
    limitation = ("maximum" if sign > 0 else "minimum") if capacity + 0.000001 < requested else (
        "step" if applied + 0.000001 < requested else None)
    return ({key: round(value + sign * applied, 6) for key, value in base.items()},
            {"direction": direction, "requested": round(sign * requested, 6),
             "applied": round(sign * applied, 6), "base_target": dict(base),
             "limited_by": limitation})
