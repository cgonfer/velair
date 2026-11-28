"""Public storage round trips for optional completed-preparation evidence."""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta, timezone
import unittest
from unittest.mock import patch

from .helpers import normalize_schedule_data
from custom_components.velair.models import ClimateEvent, serialize_schedule_data
from custom_components.velair.preconditioning_dependencies import occurrence_id


class _AnchorNormalizationClock(datetime):
    @classmethod
    def now(cls, tz=None):
        instant = cls(2026, 5, 19, 18, 30, tzinfo=timezone.utc)
        return instant.astimezone(tz) if tz else instant.replace(tzinfo=None)


class CompletedPreconditioningAnchorModelTest(unittest.TestCase):
    """Completion opt-in must not reinterpret or destroy legacy source evidence."""

    entity = "climate.room"

    def source_anchor(self, **changes):
        anchor = {
            "entity_id": self.entity,
            "accepted_start": "2026-05-19T17:00:00+00:00",
            "target_when": "2026-05-19T19:00:00+00:00",
            "expires_at": "2026-05-19T20:00:00+00:00",
            "direction": "heat",
            "context": "b" * 64,
            "episode": None,
        }
        anchor.update(changes)
        return anchor

    def completed_anchor(self, **changes):
        anchor = self.source_anchor(
            completed_at="2026-05-19T18:00:00+00:00",
            weekday="tuesday",
            start="19:00",
            completion_context="a" * 64,
        )
        anchor.update(changes)
        return anchor

    def occurrence_key(self, anchor):
        target = datetime.fromisoformat(
            anchor["target_when"].replace("Z", "+00:00")
        )
        return occurrence_id(
            ClimateEvent(
                entity_id=anchor["entity_id"],
                when=datetime.fromisoformat(anchor["accepted_start"].replace("Z", "+00:00")),
                temperature=21,
                weekday=anchor["weekday"],
                start=anchor["start"],
                target_when=target,
            )
        )

    def normalized_anchors(self, anchors, entities=None):
        normalized = normalize_schedule_data(
            {"preconditioning_accepted_anchors": anchors},
            entities or [self.entity],
        )
        return normalized["preconditioning_accepted_anchors"]

    def without_completion(self, anchor):
        return {
            key: deepcopy(value)
            for key, value in anchor.items()
            if key not in ("completed_at", "weekday", "start", "completion_context")
        }

    def test_completed_heat_and_cool_survive_public_storage_round_trip(self):
        for direction in ("heat", "cool"):
            with self.subTest(direction=direction):
                anchor = self.completed_anchor(direction=direction)
                key = self.occurrence_key(anchor)
                raw = {"preconditioning_accepted_anchors": {key: anchor}}
                normalized = normalize_schedule_data(raw, [self.entity])
                serialized = serialize_schedule_data(normalized)
                reloaded = normalize_schedule_data(serialized, [self.entity])
                self.assertEqual(serialized["preconditioning_accepted_anchors"], {key: anchor})
                self.assertEqual(reloaded["preconditioning_accepted_anchors"], {key: anchor})

    def test_legacy_source_anchor_does_not_gain_implicit_completion(self):
        anchor = self.source_anchor()
        anchors = {"legacy-accepted-occurrence": anchor}
        normalized = normalize_schedule_data(
            {"preconditioning_accepted_anchors": anchors}, [self.entity]
        )
        self.assertEqual(normalized["preconditioning_accepted_anchors"], anchors)
        self.assertEqual(
            serialize_schedule_data(normalized)["preconditioning_accepted_anchors"],
            anchors,
        )
        self.assertNotIn("completed_at", anchor)

    def test_each_incomplete_completion_group_preserves_legacy_source(self):
        complete = self.completed_anchor()
        key = self.occurrence_key(complete)
        for missing in ("completed_at", "weekday", "start", "completion_context"):
            with self.subTest(missing=missing):
                anchor = deepcopy(complete)
                del anchor[missing]
                self.assertEqual(
                    self.normalized_anchors({key: anchor}),
                    {key: self.source_anchor()},
                )
        for only in ("completed_at", "weekday", "start", "completion_context"):
            with self.subTest(only=only):
                anchor = self.source_anchor(**{only: complete[only]})
                self.assertEqual(
                    self.normalized_anchors({key: anchor}),
                    {key: self.source_anchor()},
                )

    def test_malformed_or_naive_completion_strips_only_completion_group(self):
        for value in (
            None, False, 42, [], {}, "", "not-a-date",
            "2026-05-19", "2026-05-19T18:00:00",
            "2026-05-19T18:00:00+99:00",
        ):
            with self.subTest(completed_at=value):
                anchor = self.completed_anchor(completed_at=value)
                key = self.occurrence_key(anchor)
                self.assertEqual(
                    self.normalized_anchors({key: anchor}),
                    {key: self.without_completion(anchor)},
                )

    def test_completion_must_be_ordered_within_accepted_early_occurrence(self):
        for value in (
            "2026-05-19T16:59:59+00:00",
            "2026-05-19T19:00:00+00:00",
            "2026-05-19T19:00:01+00:00",
        ):
            with self.subTest(completed_at=value):
                anchor = self.completed_anchor(completed_at=value)
                key = self.occurrence_key(anchor)
                self.assertEqual(
                    self.normalized_anchors({key: anchor}),
                    {key: self.without_completion(anchor)},
                )
        anchor = self.completed_anchor(completed_at="2026-05-19T17:00:00+00:00")
        key = self.occurrence_key(anchor)
        self.assertEqual(self.normalized_anchors({key: anchor}), {key: anchor})

    def test_aware_offset_instants_and_dst_overlap_use_utc_order(self):
        cases = [
            self.completed_anchor(
                accepted_start="2026-05-19T19:00:00+02:00",
                completed_at="2026-05-19T18:00:00Z",
                target_when="2026-05-19T21:00:00+02:00",
                start="21:00",
            ),
            self.completed_anchor(
                accepted_start="2026-10-25T02:50:00+02:00",
                completed_at="2026-10-25T02:10:00+01:00",
                target_when="2026-10-25T03:00:00+01:00",
                expires_at="2026-10-25T04:00:00+01:00",
                weekday="sunday", start="03:00",
            ),
        ]
        for anchor in cases:
            with self.subTest(completed_at=anchor["completed_at"]):
                key = self.occurrence_key(anchor)
                self.assertEqual(self.normalized_anchors({key: anchor}), {key: anchor})

    def test_real_event_occurrence_ids_distinguish_repeated_dst_wall_time(self):
        anchors = {}
        for offset in ("+02:00", "+01:00"):
            anchor = self.completed_anchor(
                accepted_start="2026-10-25T01:00:00+02:00",
                completed_at=f"2026-10-25T02:00:00{offset}",
                target_when=f"2026-10-25T02:30:00{offset}",
                expires_at="2026-10-25T04:00:00+01:00",
                weekday="sunday", start="02:30",
            )
            anchors[self.occurrence_key(anchor)] = anchor
        self.assertEqual(len(anchors), 2)
        self.assertEqual(self.normalized_anchors(anchors), anchors)

    def test_malformed_completion_context_strips_completion_without_changing_source_hash(self):
        for value in (None, False, 42, [], {}, "", "a" * 63, "a" * 65, "g" * 64, "A" * 64):
            with self.subTest(completion_context=value):
                anchor = self.completed_anchor(completion_context=value)
                key = self.occurrence_key(anchor)
                self.assertEqual(
                    self.normalized_anchors({key: anchor}),
                    {key: self.without_completion(anchor)},
                )

    def test_bad_locator_or_direction_preserves_source_without_completion(self):
        for changes in (
            {"weekday": "Wednesday"}, {"weekday": "invalid"}, {"weekday": None},
            {"start": "25:00"}, {"start": "19:60"}, {"start": "no-time"},
            {"start": None}, {"start": {}},
            {"direction": "off"}, {"direction": "auto"}, {"direction": None},
        ):
            with self.subTest(changes=changes):
                anchor = self.completed_anchor(**changes)
                key = self.occurrence_key(self.completed_anchor())
                self.assertEqual(
                    self.normalized_anchors({key: anchor}),
                    {key: self.without_completion(anchor)},
                )

    def test_completion_requires_matching_canonical_occurrence_key(self):
        anchor = self.completed_anchor()
        canonical = self.occurrence_key(anchor)
        for key in (
            canonical.replace(self.entity, "climate.other"),
            canonical.replace("tuesday", "monday"),
            canonical.replace("|19:00|", "|18:00|"),
            canonical.replace("2026-05-19", "2026-05-26"),
            canonical.replace("19:00:00+00:00", "21:00:00+02:00"),
        ):
            with self.subTest(key=key):
                self.assertEqual(
                    self.normalized_anchors({key: anchor}),
                    {key: self.without_completion(anchor)},
                )

    def test_missing_entity_cannot_opt_in_to_completion(self):
        anchor = self.completed_anchor()
        key = self.occurrence_key(anchor)
        del anchor["entity_id"]
        self.assertEqual(
            self.normalized_anchors({key: anchor}),
            {key: self.without_completion(anchor)},
        )

    def test_repaired_completion_stays_legacy_after_serialization_and_reload(self):
        anchor = self.completed_anchor(completed_at="not-a-date")
        key = self.occurrence_key(anchor)
        expected = {key: self.without_completion(anchor)}
        normalized = normalize_schedule_data(
            {"preconditioning_accepted_anchors": {key: anchor}}, [self.entity]
        )
        serialized = serialize_schedule_data(normalized)
        self.assertEqual(serialized["preconditioning_accepted_anchors"], expected)
        self.assertEqual(
            normalize_schedule_data(serialized, [self.entity])["preconditioning_accepted_anchors"],
            expected,
        )

    def test_invalid_base_timestamps_reject_entire_anchor(self):
        for field in ("accepted_start", "target_when", "expires_at"):
            for value in (None, "invalid", "2026-05-19T18:00:00"):
                with self.subTest(field=field, value=value):
                    anchor = self.completed_anchor(**{field: value})
                    self.assertEqual(self.normalized_anchors({"key": anchor}), {})
            with self.subTest(missing=field):
                anchor = self.completed_anchor()
                del anchor[field]
                self.assertEqual(self.normalized_anchors({"key": anchor}), {})

    def test_malformed_anchor_envelopes_are_ignored(self):
        for raw in (None, [], "not-an-anchor-map", 1):
            with self.subTest(raw=raw):
                self.assertEqual(self.normalized_anchors(raw), {})
        self.assertEqual(self.normalized_anchors({1: self.source_anchor(), "bad": []}), {})

    def test_existing_anchor_bound_keeps_latest_entries_for_zone_count(self):
        for zone_count, entry_count, retained in ((1, 40, 32), (3, 60, 48)):
            with self.subTest(zone_count=zone_count):
                entities = [f"climate.room_{index}" for index in range(zone_count)]
                anchors = {
                    f"source-{index}": self.source_anchor(entity_id=entities[0])
                    for index in range(entry_count)
                }
                self.assertEqual(
                    list(self.normalized_anchors(anchors, entities)),
                    [f"source-{index}" for index in range(entry_count - retained, entry_count)],
                )

    def test_expired_completions_do_not_evict_newer_live_dependency_source(self):
        anchors = {}
        for index in range(40):
            target = datetime(2026, 1, 1, 19, tzinfo=timezone.utc) + timedelta(days=index)
            anchor = self.completed_anchor(
                accepted_start=(target - timedelta(hours=2)).isoformat(),
                completed_at=(target - timedelta(hours=1)).isoformat(),
                target_when=target.isoformat(),
                expires_at=(target + timedelta(hours=1)).isoformat(),
                weekday=target.strftime("%A").lower(),
            )
            anchors[self.occurrence_key(anchor)] = anchor
        anchors["live-source"] = self.source_anchor()
        with patch("custom_components.velair.models.datetime", _AnchorNormalizationClock):
            retained = self.normalized_anchors(anchors)
        self.assertEqual(len(retained), 32)
        self.assertEqual(retained["live-source"], anchors["live-source"])
        self.assertEqual(list(retained), list(anchors)[-32:])

    def test_older_live_own_completion_survives_more_than_cap_later_sources(self):
        completed = self.completed_anchor()
        key = self.occurrence_key(completed)
        anchors = {key: completed}
        anchors.update({f"live-source-{index}": self.source_anchor() for index in range(40)})
        with patch("custom_components.velair.models.datetime", _AnchorNormalizationClock):
            retained = self.normalized_anchors(anchors)
        self.assertEqual(len(retained), 32)
        self.assertEqual(retained[key], completed)
        self.assertEqual(list(retained), [key, *[f"live-source-{index}" for index in range(9, 40)]])

    def test_normalization_does_not_mutate_input_or_share_nested_evidence(self):
        anchor = self.completed_anchor(completed_at="invalid")
        key = self.occurrence_key(anchor)
        raw = {"preconditioning_accepted_anchors": {key: anchor}}
        before = deepcopy(raw)
        normalized = normalize_schedule_data(raw, [self.entity])
        self.assertEqual(raw, before)
        normalized["preconditioning_accepted_anchors"][key]["context"] = "changed"
        self.assertEqual(raw, before)

    def test_serialized_completion_evidence_is_detached_from_runtime_data(self):
        anchor = self.completed_anchor()
        key = self.occurrence_key(anchor)
        normalized = normalize_schedule_data(
            {"preconditioning_accepted_anchors": {key: anchor}}, [self.entity]
        )
        serialized = serialize_schedule_data(normalized)
        serialized["preconditioning_accepted_anchors"][key]["completed_at"] = "changed"
        serialized["preconditioning_accepted_anchors"][key]["context"] = "changed"
        self.assertEqual(normalized["preconditioning_accepted_anchors"], {key: anchor})
