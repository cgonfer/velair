"""Build linked-template candidates without mutating their saved snapshot."""
from copy import deepcopy

from .schedule_resources import destinations, normalize_binding


def destination_identity(destination):
    return (destination.get("source"), destination.get("profile_key"), destination.get("entity_id"), destination.get("weekday"))


def allocate_template_update(snapshot, template, validate_binding, assignments=None, *, blocked_entities=None):
    """Copy template settings first, then compatible same-day saved donors."""
    candidate = deepcopy(snapshot)
    existing = next((item for item in snapshot.get("templates", []) if item["key"] == template["key"]), None)
    old_slots = existing["blocks"] if existing else []
    old_ids = {slot["slot_id"] for slot in old_slots}
    new_ids = {slot["slot_id"] for slot in template["blocks"]} - old_ids
    templates = candidate.setdefault("templates", [])
    if existing is None:
        templates.append(deepcopy(template))
    else:
        index = next(index for index, item in enumerate(templates) if item["key"] == template["key"])
        templates[index] = deepcopy(template)
    targets = {}
    for destination, zone in destinations(candidate):
        for day, link in zone.get("template_links", {}).items():
            if link["template_key"] == template["key"]:
                dest = {**destination, "weekday": day}
                targets[destination_identity(dest)] = (dest, link)
    supplied = {}
    if assignments is not None and not isinstance(assignments, list):
        raise ValueError("Assignments must be a list")
    for item in assignments or []:
        if (
            not isinstance(item, dict)
            or item.get("source") not in ("default", "profile")
            or not isinstance(item.get("entity_id"), str)
            or not isinstance(item.get("weekday"), str)
            or ("profile_key" in item and not isinstance(item["profile_key"], str))
            or (item.get("source") == "profile" and not item.get("profile_key"))
        ):
            raise ValueError("Invalid destination assignment")
        identity = destination_identity(item)
        if identity not in targets or identity in supplied:
            raise ValueError("Unknown or duplicate destination assignments")
        if targets[identity][1].get("mode") == "full":
            raise ValueError("Full template links cannot have destination assignments")
        if set(item) - {"source", "profile_key", "entity_id", "weekday", "bindings"}:
            raise ValueError("Unsupported destination assignment fields")
        bindings = item.get("bindings")
        if not isinstance(bindings, dict) or set(bindings) - new_ids:
            raise ValueError("Assignments may only configure new template slots")
        supplied[identity] = bindings
    proposals, pending, changes = [], [], []
    for identity, (destination, link) in targets.items():
        full = link.get("mode") == "full"
        saved_bindings = deepcopy(link.get("bindings", {}))
        if not full:
            link["bindings"] = {slot: binding for slot, binding in saved_bindings.items() if slot in {item["slot_id"] for item in template["blocks"]}}
        for old in old_slots:
            new = next((slot for slot in template["blocks"] if slot["slot_id"] == old["slot_id"]), None)
            if new is None or new["start"] != old["start"]:
                changes.append({"destination": destination, "slot_id": old["slot_id"], "kind": "removed" if new is None else "moved", "previous_start": old["start"], **({"start": new["start"]} if new else {})})
            if full and new is not None and {key: value for key, value in new.items() if key != "start"} != {key: value for key, value in old.items() if key != "start"}:
                changes.append({"destination": destination, "slot_id": old["slot_id"], "kind": "configuration", "start": new["start"]})
        for slot in template["blocks"]:
            slot_id = slot["slot_id"]
            if full:
                if slot_id in new_ids:
                    changes.append({"destination": destination, "slot_id": slot_id, "kind": "added", "start": slot["start"]})
                if destination["entity_id"] in (blocked_entities or set()):
                    continue
                binding = normalize_binding({key: value for key, value in slot.items() if key not in ("start", "slot_id")})
                try:
                    effective = validate_binding(destination, binding)
                    proposals.append({"destination": destination, "slot_id": slot_id, "binding": binding, "origin": "full", "effective_config": effective})
                except (ValueError, KeyError, TypeError, AttributeError):
                    pass  # Whole-destination validation reports full-link failures.
                continue
            if slot_id not in new_ids:
                continue
            changes.append({"destination": destination, "slot_id": slot_id, "kind": "added", "start": slot["start"]})
            # Availability is a destination error, never a reason to choose
            # different climate settings or request a manual assignment.
            if destination["entity_id"] in (blocked_entities or set()):
                continue
            manual = supplied.get(identity, {}).get(slot_id)
            choices = [("manual", manual, None)] if slot_id in supplied.get(identity, {}) else [("template", {key: value for key, value in slot.items() if key not in ("start", "slot_id")}, None)]
            if manual is None and slot_id not in supplied.get(identity, {}):
                donors = sorted(old_slots, key=lambda old: (0 if old["start"] == slot["start"] else 1 if old["start"] < slot["start"] else 2, -int(old["start"].replace(":", "")) if old["start"] < slot["start"] else int(old["start"].replace(":", ""))))
                for donor in donors:
                    if donor["slot_id"] in saved_bindings:
                        origin = "saved_match" if donor["start"] == slot["start"] else "saved_previous" if donor["start"] < slot["start"] else "saved_next"
                        choices.append((origin, saved_bindings[donor["slot_id"]], donor))
            failure = None
            for origin, raw, donor in choices:
                try:
                    binding = normalize_binding(raw)
                    effective = validate_binding(destination, binding)
                except (ValueError, KeyError, TypeError, AttributeError) as err:
                    failure = err
                    continue
                link["bindings"][slot_id] = deepcopy(binding)
                proposal = {"destination": destination, "slot_id": slot_id, "binding": binding, "origin": origin, "effective_config": effective}
                if donor is not None:
                    proposal.update(donor_slot_id=donor["slot_id"], donor_start=donor["start"])
                proposals.append(proposal)
                break
            else:
                pending.append({"destination": destination, "slot_id": slot_id, "reason": getattr(failure, "code", "incompatible_configuration"), "message": str(failure)})
    return candidate, {"proposals": proposals, "pending": pending, "changes": changes}
