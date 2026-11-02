"""Detached configuration resources prepared at the scheduler commit boundary."""
from __future__ import annotations
from copy import deepcopy
from .day_layouts import validate_day_layout_references
from .schedule_resources import resolution_metadata, resource_usages


class PreparedConfiguration:
    """Publish configuration resources without resolving them from readers."""

    def __init__(self):
        self._resources = None
        self.generation = 0

    def rebuild(self, owner):
        """Build privately and replace one complete publication atomically."""
        data = owner._data
        diagnostics = []
        try:
            validate_day_layout_references(data)
        except (ValueError, TypeError, KeyError) as err:
            diagnostics.append({"source": "day_layout", "code": getattr(err, "code", "incompatible_configuration"), "message": str(err)})
        metadata = {"default": {}, "profiles": {}}
        resolved_templates = {}
        for template in data.get("templates", []):
            resolved_templates[template["key"]] = owner._resolved_template_blocks_safe(template)
            if resolved_templates[template["key"]] is None:
                diagnostics.append({"source": "template", "template_key": template["key"], "code": "incompatible_configuration", "message": "Template settings contain invalid configuration or references"})

        def resolve(destination, zone):
            entity = destination["entity_id"]
            try:
                week = owner._resolved_resource_week(data, entity, zone)
                details = resolution_metadata(data, zone, week)
                target = metadata["default"] if destination["source"] == "default" else metadata["profiles"].setdefault(destination["profile_key"], {})
                target[entity] = details
                return week
            except (ValueError, KeyError, TypeError, AttributeError) as err:
                diagnostics.append({**destination, "code": getattr(err, "code", "incompatible_configuration"), "message": str(err)})
                return None
        defaults = {entity: resolve({"source": "default", "entity_id": entity}, zone) for entity, zone in data["zones"].items()}
        profiles = {profile["key"]: {entity: resolve({"source": "profile", "profile_key": profile["key"], "entity_id": entity}, zone) for entity, zone in profile["zones"].items() if zone["behavior"] == "schedule"} for profile in data.get("profiles", [])}
        resources = {
            "effective_schedules": {entity: owner._effective_schedule(entity, zone) for entity, zone in data["zones"].items()},
            "block_presets": data.get("block_presets", []),
            "resolved_template_blocks": resolved_templates,
            "configuration_revision": data.get("configuration_revision", 0),
            "resource_usages": resource_usages(data),
            "resolved_default_schedules": defaults,
            "resolved_profile_schedules": profiles,
            "resolved_block_metadata": metadata,
            "resource_diagnostics": diagnostics,
        }
        self._resources = deepcopy(resources)
        self.generation += 1

    def snapshot(self):
        """Return a defensive copy without consulting storage or HA."""
        if self._resources is None:
            raise RuntimeError("Configuration resources have not been prepared")
        return deepcopy(self._resources)
