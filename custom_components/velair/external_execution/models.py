"""Provider-neutral external execution models."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


class ExternalScheduleRequiredError(ValueError):
    """Raised when external execution has no temperature schedule to publish."""

    code = "external_schedule_required"


@dataclass(frozen=True, slots=True)
class ExternalScheduleCapabilities:
    """Schedule constraints declared by an external provider."""

    provider: str
    name: str
    can_publish: bool = True
    can_import: bool = False
    supports_profile_schedules: bool = True
    supports_temperature_only: bool = False
    supported_actions: tuple[str, ...] = ("set_temperature",)
    supported_hvac_modes: tuple[str, ...] = ("heat",)
    supported_target_types: tuple[str, ...] = ("scalar",)
    supported_option_fields: tuple[str, ...] = ()
    max_switchpoints_per_day: int = 6
    time_step_minutes: int = 5
    implicit_midnight_change_counts_toward_limit: bool = False

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class ExternalPublicationStatus:
    """Runtime-only publication status."""

    state: str
    error: str | None = None
    published_at: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "state": self.state,
            "error": self.error,
            "published_at": self.published_at,
        }
