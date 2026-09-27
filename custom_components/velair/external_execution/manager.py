"""Orchestration for optional external schedule execution."""

from __future__ import annotations

import asyncio
from collections import defaultdict
from copy import deepcopy
from datetime import datetime, timezone
import logging
from typing import Any, Awaitable, Callable

from ..const import (
    ACTION_SET_CLIMATE_OPTIONS,
    ACTION_SET_TEMPERATURE,
    ATTR_FAN_MODE,
    ATTR_HUMIDITY,
    ATTR_PRESET_MODE,
    ATTR_SWING_HORIZONTAL_MODE,
    ATTR_SWING_MODE,
)
from ..models import WEEKDAYS
from ..execution import ExecutionAuthority
from .models import ExternalPublicationStatus, ExternalScheduleRequiredError
from .provider import ExternalScheduleProvider

_LOGGER = logging.getLogger(__name__)


class ExternalExecutionManager:
    """Keep vendor-specific publication outside scheduler semantics."""

    def __init__(
        self,
        data: dict[str, Any],
        providers: dict[str, ExternalScheduleProvider],
        async_save: Callable[[], Awaitable[None]],
        temperature_unit: Callable[[str], str],
        authority: ExecutionAuthority | None = None,
    ) -> None:
        self._data = data
        self._providers = providers
        self._async_save = async_save
        self._temperature_unit = temperature_unit
        self.authority = authority or ExecutionAuthority(data)
        self._publications: dict[str, ExternalPublicationStatus] = {}
        self._publish_locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)
        self._update_callback: Callable[[], None] | None = None

    def set_update_callback(self, callback: Callable[[], None] | None) -> None:
        """Register the scheduler's synchronous runtime-state notifier."""
        self._update_callback = callback

    def publication_state(self, entity_id: str) -> str | None:
        """Return factual runtime publication state without provider details."""
        publication = self._publications.get(entity_id)
        return publication.state if publication is not None else None

    def needs_publication(self, entity_id: str) -> bool:
        """Return whether an explicit user selection lacks published evidence."""
        return self.publication_state(entity_id) in (None, "failed")

    def _set_publication(
        self, entity_id: str, publication: ExternalPublicationStatus
    ) -> None:
        self._publications[entity_id] = publication
        if self._update_callback is not None:
            self._update_callback()

    def _clear_publication(self, entity_id: str) -> None:
        if self._publications.pop(entity_id, None) is not None:
            if self._update_callback is not None:
                self._update_callback()

    def describe(self) -> dict[str, Any]:
        """Describe provider availability separately from publication attempts."""
        systems: list[dict[str, Any]] = []
        eligible: dict[str, list[str]] = {}
        selected_providers = {
            execution.get("provider")
            for zone in self._data["zones"].values()
            if isinstance((execution := zone.get("execution")), dict)
        }
        for key, provider in self._providers.items():
            if not self._supports_velair_contract(provider):
                continue
            entities = provider.compatible_entities(list(self._data["zones"]))
            if not entities and key not in selected_providers:
                continue
            eligible[key] = entities
            systems.append({
                "provider": key,
                "name": provider.capabilities.name,
                "entities": entities,
                "capabilities": provider.capabilities.as_dict(),
            })
        zones: dict[str, Any] = {}
        for entity_id, zone in self._data["zones"].items():
            execution = zone.get("execution")
            if not isinstance(execution, dict):
                continue
            provider_key = execution.get("provider")
            publication = self._publications.get(entity_id)
            zones[entity_id] = {
                "type": "external",
                "provider": provider_key,
                "available": entity_id in eligible.get(provider_key, []),
                "publication": publication.as_dict() if publication is not None else None,
            }
        return {"systems": systems, "zones": zones}

    def ensure_provider_available(self, entity_id: str, provider_key: str) -> None:
        """Validate a provider before the scheduler starts a handoff."""
        provider = self._providers.get(provider_key)
        if (
            provider is None
            or not self._supports_velair_contract(provider)
            or entity_id not in provider.compatible_entities(list(self._data["zones"]))
        ):
            raise ValueError(
                f"External provider {provider_key} is not available for {entity_id}"
            )

    @staticmethod
    def _supports_velair_contract(provider: ExternalScheduleProvider) -> bool:
        capabilities = provider.capabilities
        return capabilities.can_publish and capabilities.supports_profile_schedules

    def ensure_schedule_supported(
        self,
        entity_id: str,
        schedule: dict[str, list[dict[str, Any]]],
        provider_key: str | None = None,
    ) -> None:
        """Validate one weekly schedule against provider-neutral capabilities."""
        zone = self._data["zones"].get(entity_id, {})
        execution = zone.get("execution")
        if provider_key is None and not isinstance(execution, dict):
            return
        selected_provider = provider_key or execution.get("provider")
        provider = self._providers.get(selected_provider)
        if provider is None or not self._supports_velair_contract(provider):
            raise ValueError(f"External provider is unavailable for {entity_id}")
        capabilities = provider.capabilities
        if set(schedule) != set(WEEKDAYS):
            raise ValueError("External schedules must include every weekday")
        option_fields = {
            ATTR_FAN_MODE,
            ATTR_HUMIDITY,
            ATTR_PRESET_MODE,
            ATTR_SWING_HORIZONTAL_MODE,
            ATTR_SWING_MODE,
        }
        has_temperature = False
        has_option_action = False
        for weekday in WEEKDAYS:
            blocks = schedule.get(weekday)
            if not isinstance(blocks, list):
                raise ValueError(f"Invalid {weekday} external schedule")
            change_count = len(blocks)
            if (
                capabilities.implicit_midnight_change_counts_toward_limit
                and (not blocks or blocks[0].get("start") != "00:00")
            ):
                change_count += 1
            if change_count > capabilities.max_switchpoints_per_day:
                raise ValueError(
                    f"{weekday} exceeds the {capabilities.max_switchpoints_per_day}-change external limit"
                )
            for block in blocks:
                action = block.get("action", ACTION_SET_TEMPERATURE)
                if action not in capabilities.supported_actions:
                    raise ValueError(f"External schedules do not support {action} blocks")
                start = str(block.get("start", ""))
                try:
                    hour, minute = (int(part) for part in start.split(":"))
                except (TypeError, ValueError) as err:
                    raise ValueError(f"Invalid schedule time on {weekday}: {start}") from err
                if (
                    hour not in range(24)
                    or minute not in range(60)
                    or minute % capabilities.time_step_minutes
                ):
                    raise ValueError(
                        f"{weekday} {start} is not on the required "
                        f"{capabilities.time_step_minutes}-minute grid"
                    )
                hvac_mode = block.get("hvac_mode")
                if hvac_mode is not None and hvac_mode not in capabilities.supported_hvac_modes:
                    raise ValueError(f"External schedules do not support HVAC mode {hvac_mode}")
                uses_range = "target_temp_low" in block or "target_temp_high" in block
                target_type = "range" if uses_range else "scalar"
                if (
                    action != ACTION_SET_CLIMATE_OPTIONS
                    and target_type not in capabilities.supported_target_types
                ):
                    raise ValueError(
                        f"External schedules do not support {target_type} targets"
                    )
                if action == ACTION_SET_CLIMATE_OPTIONS:
                    has_option_action = True
                if action == ACTION_SET_TEMPERATURE:
                    value = block.get("temperature")
                    if target_type == "scalar" and not isinstance(value, int | float):
                        raise ValueError(f"Missing scalar temperature on {weekday} at {start}")
                    has_temperature = True
                unsupported_options = {
                    field for field in option_fields
                    if field in block and field not in capabilities.supported_option_fields
                }
                if unsupported_options:
                    raise ValueError("External schedules do not support climate options")
        if not has_temperature and not has_option_action:
            raise ExternalScheduleRequiredError(
                "External schedules require at least one temperature block"
            )

    async def async_set_execution(
        self,
        entity_id: str,
        provider_key: str | None,
        *,
        schedule: dict[str, list[dict[str, Any]]] | None = None,
        async_after_persist: Callable[[], Awaitable[None]] | None = None,
    ) -> None:
        """Persist ownership first, then publish without rollback on failure."""
        async with self._publish_locks[entity_id]:
            await self._async_set_execution_locked(
                entity_id,
                provider_key,
                schedule=schedule,
                async_after_persist=async_after_persist,
            )

    async def _async_set_execution_locked(
        self,
        entity_id: str,
        provider_key: str | None,
        *,
        schedule: dict[str, list[dict[str, Any]]] | None = None,
        async_after_persist: Callable[[], Awaitable[None]] | None = None,
    ) -> None:
        """Change ownership while publication and handoff are serialized."""
        zone = self._data["zones"].get(entity_id)
        if zone is None:
            raise ValueError(f"Unmanaged climate entity: {entity_id}")
        previous_execution = deepcopy(zone.get("execution"))
        previous_publication = self._publications.get(entity_id)
        if provider_key is None:
            # Removing ownership from the persisted model is necessary for the
            # storage write, but physical actions must stay denied until that
            # write has completed successfully.
            self.authority.hold_external(entity_id)
            zone.pop("execution", None)
            self._clear_publication(entity_id)
            try:
                await self._async_save()
            except (asyncio.CancelledError, Exception):
                if previous_execution is not None:
                    zone["execution"] = previous_execution
                if previous_publication is not None:
                    self._set_publication(entity_id, previous_publication)
                raise
            finally:
                self.authority.release_external(entity_id)
            return
        self.ensure_provider_available(entity_id, provider_key)
        if schedule is None:
            raise ValueError("An effective schedule is required for external execution")
        self.ensure_schedule_supported(entity_id, schedule, provider_key)
        zone["execution"] = {"type": "external", "provider": provider_key}
        self._clear_publication(entity_id)
        try:
            await self._async_save()
        except (asyncio.CancelledError, Exception):
            if previous_execution is None:
                zone.pop("execution", None)
            else:
                zone["execution"] = previous_execution
            if previous_publication is None:
                self._clear_publication(entity_id)
            else:
                self._set_publication(entity_id, previous_publication)
            raise
        if async_after_persist is not None:
            await async_after_persist()
        await self._async_publish_locked(entity_id, schedule)

    async def async_publish(
        self,
        entity_id: str,
        schedule: dict[str, list[dict[str, Any]]],
    ) -> bool:
        """Publish an explicitly resolved schedule, retaining ownership on error."""
        async with self._publish_locks[entity_id]:
            return await self._async_publish_locked(entity_id, schedule)

    async def _async_publish_locked(
        self,
        entity_id: str,
        schedule: dict[str, list[dict[str, Any]]],
    ) -> bool:
        """Publish while the caller owns the per-zone transition lock."""
        zone = self._data["zones"].get(entity_id, {})
        execution = zone.get("execution")
        if not isinstance(execution, dict):
            return False
        # A saved schedule supersedes any earlier publication evidence. If the
        # provider cannot be called, the new schedule has no publication state.
        self._clear_publication(entity_id)
        provider = self._providers.get(execution.get("provider"))
        if provider is None:
            return False
        if not self._supports_velair_contract(provider):
            return False
        if entity_id not in provider.compatible_entities(list(self._data["zones"])):
            return False
        self.ensure_schedule_supported(entity_id, schedule)
        self._set_publication(entity_id, ExternalPublicationStatus("publishing"))
        try:
            await provider.async_publish(
                entity_id,
                deepcopy(schedule),
                self._temperature_unit(entity_id),
            )
        except asyncio.CancelledError:
            self._clear_publication(entity_id)
            raise
        except Exception as err:  # External integrations can raise arbitrary HA errors.
            message = _sanitized_error(err)
            self._set_publication(
                entity_id, ExternalPublicationStatus("failed", message)
            )
            _LOGGER.warning("External schedule publication failed for %s: %s", entity_id, message)
            return False
        self._set_publication(
            entity_id,
            ExternalPublicationStatus(
                "published",
                published_at=datetime.now(timezone.utc).isoformat(),
            ),
        )
        return True

    async def async_schedule_saved(
        self,
        entity_id: str,
        schedule: dict[str, list[dict[str, Any]]],
    ) -> None:
        """Publish effective schedule edits after Velair persistence succeeds."""
        if self.authority.is_external(entity_id):
            await self.async_publish(entity_id, schedule)


def _sanitized_error(err: Exception) -> str:
    message = " ".join(str(err).split()) or type(err).__name__
    return message[:240]
