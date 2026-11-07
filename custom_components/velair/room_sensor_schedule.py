"""Validated weekly Room Assist references and prepared, clock-bound resolution.

This module has no Home Assistant side effects. Native references are represented
by ``None``; they do not bind or select a sensor inside the physical thermostat.
"""
from __future__ import annotations

from bisect import bisect_right
from collections import OrderedDict
from dataclasses import dataclass
from datetime import UTC, datetime, time, timedelta
import re

WEEKDAYS = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")
_WEEK = 7 * 24 * 60
_SENSOR = re.compile(r"sensor\.[a-z0-9_]+\Z")
_TIME = re.compile(r"(?:[01][0-9]|2[0-3]):[0-5][0-9]\Z")


def _source(value):
    if value is not None and (not isinstance(value, str) or not _SENSOR.fullmatch(value)):
        raise ValueError("Room Assist references must be temperature sensor entities or native")
    return value


def _minute(value):
    if not isinstance(value, str) or not _TIME.fullmatch(value):
        raise ValueError("Room Assist period times must use HH:MM")
    return int(value[:2]) * 60 + int(value[3:])


def normalize_room_sensor_schedule(value):
    """Validate a whole schedule; malformed imports and updates must be rejected."""
    if not isinstance(value, dict) or set(value) - {"enabled", "default_source", "periods"}:
        raise ValueError("Invalid Room Assist sensor schedule")
    if not isinstance(value.get("enabled", False), bool):
        raise ValueError("Room Assist sensor schedule enabled must be a boolean")
    raw = value.get("periods", [])
    if not isinstance(raw, list):
        raise ValueError("Room Assist sensor schedule periods must be a list")
    periods, intervals = [], []
    for row in raw:
        if not isinstance(row, dict) or set(row) != {"weekdays", "start", "end", "source"}:
            raise ValueError("Invalid Room Assist sensor schedule period")
        days = row["weekdays"]
        if (not isinstance(days, list) or not days
                or any(not isinstance(day, str) or day not in WEEKDAYS for day in days)
                or len(set(days)) != len(days)):
            raise ValueError("Room Assist periods need unique weekdays")
        start, end = _minute(row["start"]), _minute(row["end"])
        if start == end:
            raise ValueError("Room Assist periods must have different start and end times")
        source = _source(row["source"])
        days = sorted(days, key=WEEKDAYS.index)
        periods.append({"weekdays": days, "start": row["start"], "end": row["end"], "source": source})
        for day in days:
            lower = WEEKDAYS.index(day) * 1440 + start
            upper = WEEKDAYS.index(day) * 1440 + end + (1440 if end < start else 0)
            if upper > _WEEK:
                intervals.extend(((lower, _WEEK), (0, upper - _WEEK)))
            else:
                intervals.append((lower, upper))
    intervals.sort()
    if any(left[1] > right[0] for left, right in zip(intervals, intervals[1:])):
        raise ValueError("Room Assist sensor schedule periods must not overlap")
    return {"enabled": value.get("enabled", False),
            "default_source": _source(value.get("default_source")), "periods": periods}


def copy_room_sensor_schedule(value):
    """Detach a validated JSON calendar without recursively copying scalar leaves.

    Public responses remain ordinary mutable dictionaries/lists. The fixed-shape
    calendar contains only immutable scalar leaves, period dictionaries and their
    weekday lists; validation remains at the configuration producer boundary.
    """
    copied = dict(value)
    if "periods" in value:
        copied["periods"] = [{**period, "weekdays": list(period["weekdays"])}
                             for period in value["periods"]]
    return copied


@dataclass(frozen=True, slots=True)
class SourceResolution:
    source: str | None
    next_change: datetime | None
    next_source: str | None


class PreparedRoomSensorSchedule:
    """Compile weekly intervals once; resolve local wall-clock occurrences."""
    def __init__(self, config):
        self.default = config["default_source"]
        intervals = []
        for row in config["periods"]:
            start, end = _minute(row["start"]), _minute(row["end"])
            for day in row["weekdays"]:
                lower = WEEKDAYS.index(day) * 1440 + start
                upper = WEEKDAYS.index(day) * 1440 + end + (1440 if end < start else 0)
                if upper > _WEEK:
                    intervals.extend(((lower, _WEEK, row["source"]), (0, upper - _WEEK, row["source"])))
                else:
                    intervals.append((lower, upper, row["source"]))
        self.intervals = tuple(sorted(intervals))
        self.starts = tuple(row[0] for row in self.intervals)
        points = sorted({point % _WEEK for row in self.intervals for point in row[:2]})
        self.boundaries = tuple(point for point in points
                                if self.source_at_minute(point) != self.source_at_minute((point - 0.001) % _WEEK))
        self._windows = OrderedDict()

    def source_at_minute(self, minute):
        index = bisect_right(self.starts, minute) - 1
        if index >= 0 and minute < self.intervals[index][1]:
            return self.intervals[index][2]
        return self.default

    def source_at(self, when):
        return self.source_at_minute(when.weekday() * 1440 + when.hour * 60 + when.minute)

    def resolve(self, now):
        source = self.source_at(now)
        if not self.boundaries:
            return SourceResolution(source, None, None)
        instant, zone = now.astimezone(UTC), now.tzinfo
        monday = now.date() - timedelta(days=now.weekday())
        key = (monday, zone)
        window = self._windows.get(key)
        if window is None:
            window = self._build_window(monday, zone)
            self._windows[key] = window
            if len(self._windows) > 4:
                self._windows.popitem(last=False)
        else:
            self._windows.move_to_end(key)
        instants, sources = window
        index = bisect_right(instants, instant)
        if index < len(instants):
            return SourceResolution(source, instants[index].astimezone(zone), sources[index])
        return SourceResolution(source, None, None)

    def _build_window(self, monday, zone):
        """Index actual UTC source changes once for a bounded local-week window."""
        candidates = set()
        for minute in self.boundaries:
            day, minute_of_day = divmod(minute, 1440)
            for week in (-1, 0, 1, 2):
                wall = datetime.combine(monday + timedelta(days=day + week * 7),
                                        time(minute_of_day // 60, minute_of_day % 60))
                for fold in (0, 1):
                    local = wall.replace(tzinfo=zone, fold=fold)
                    utc = local.astimezone(UTC)
                    # Nonexistent spring times are handled at the actual offset
                    # transition, not normalized to an invented wall-clock time.
                    if utc.astimezone(zone).replace(tzinfo=None) == wall:
                        candidates.add(utc)
        # A fall-back/spring-forward can itself cross a period even when the
        # transition is not a configured start or end. Discover those infrequent
        # instants only when preparing an index, never on cached sensor reads.
        lower = datetime.combine(monday - timedelta(days=1), time())
        upper = datetime.combine(monday + timedelta(days=22), time())
        left = min(lower.replace(tzinfo=zone, fold=fold).astimezone(UTC) for fold in (0, 1))
        stop = max(upper.replace(tzinfo=zone, fold=fold).astimezone(UTC) for fold in (0, 1))
        while left < stop:
            right = min(left + timedelta(hours=6), stop)
            if left.astimezone(zone).utcoffset() != right.astimezone(zone).utcoffset():
                low, high = left, right
                offset = low.astimezone(zone).utcoffset()
                while (high - low).total_seconds() > 1:
                    middle = low + timedelta(seconds=int((high - low).total_seconds()) // 2)
                    if middle.astimezone(zone).utcoffset() == offset:
                        low = middle
                    else:
                        high = middle
                candidates.add(high)
            left = right
        instants, sources = [], []
        for candidate in sorted(candidates):
            next_source = self.source_at(candidate.astimezone(zone))
            previous_source = self.source_at((candidate - timedelta(microseconds=1)).astimezone(zone))
            if next_source != previous_source:
                instants.append(candidate)
                sources.append(next_source)
        return tuple(instants), tuple(sources)


class RoomSensorScheduleRuntime:
    """Sparse prepared state, present only for enabled, master-enabled zones."""
    def __init__(self):
        self.entries = {}

    def configure(self, entity, config, now):
        schedule = config.get("room_sensor_schedule")
        if not config["room_sensor_assist_enabled"] or not schedule or not schedule["enabled"]:
            self.entries.pop(entity, None)
            return
        previous = self.entries.get(entity)
        if previous is not None and previous["config"].get("room_sensor_schedule") == schedule:
            previous["config"] = config
            previous["effective"] = {**config, "room_temperature_entity_id": self.resolve(entity, now).source}
            return
        prepared = PreparedRoomSensorSchedule(schedule)
        resolution = prepared.resolve(now)
        self.entries[entity] = {"prepared": prepared, "config": config, "resolution": resolution,
                                "at": now.astimezone(UTC), "zone": now.tzinfo,
                                "deadline": resolution.next_change, "authority_source": resolution.source,
                                "effective": {**config, "room_temperature_entity_id": resolution.source}}

    def resolve(self, entity, now):
        entry = self.entries[entity]
        instant = now.astimezone(UTC)
        previous = entry["resolution"]
        discontinuity = instant < entry["at"] or entry["zone"] != now.tzinfo
        if (discontinuity
                or previous.next_change is not None and instant >= previous.next_change.astimezone(UTC)):
            resolution = entry["prepared"].resolve(now)
            entry.update(resolution=resolution, at=instant, zone=now.tzinfo)
            if discontinuity:
                # Unlike a forward read, the old deadline no longer describes
                # this clock. Queue immediate retirement when authority changed.
                entry["deadline"] = (now if resolution.source != entry["authority_source"]
                                     else resolution.next_change)
            if resolution.source != previous.source:
                entry["effective"] = {**entry["config"], "room_temperature_entity_id": resolution.source}
        return entry["resolution"]

    def config(self, entity, now):
        self.resolve(entity, now)
        return self.entries[entity]["effective"]

    def query(self, entity, when):
        """Resolve a forecast predicate without changing live source authority."""
        entry = self.entries[entity]
        instant = when.astimezone(UTC)
        current = entry["resolution"]
        if (entry["zone"] == when.tzinfo and entry["at"] <= instant
                and (current.next_change is None or instant < current.next_change.astimezone(UTC))):
            return current
        return entry["prepared"].resolve(when)

    def next_deadline(self):
        return min((entry["deadline"] for entry in self.entries.values()
                    if entry["deadline"] is not None), key=lambda value: value.astimezone(UTC), default=None)

    def drain(self, now):
        due = []
        for entity, entry in self.entries.items():
            deadline = entry["deadline"]
            if deadline is not None and deadline.astimezone(UTC) <= now.astimezone(UTC):
                resolution = self.resolve(entity, now)
                entry["deadline"] = resolution.next_change
                if resolution.source != entry["authority_source"]:
                    due.append(entity)
                entry["authority_source"] = resolution.source
        return due

    def window_valid(self, entity, start, end, now=None):
        entry = self.entries.get(entity)
        if entry is None:
            return True
        if now is not None and entry["prepared"].source_at(end) != self.query(entity, now).source:
            return False
        boundary = entry["prepared"].resolve(start).next_change
        return boundary is None or boundary.astimezone(UTC) > end.astimezone(UTC)

    def earliest_start(self, entity, start, end, now):
        """Keep preparation inside the current uninterrupted reference window."""
        entry = self.entries.get(entity)
        if entry is None:
            return start
        current = self.query(entity, now)
        if entry["prepared"].source_at(end) != current.source:
            return end
        if current.next_change is not None and current.next_change.astimezone(UTC) <= end.astimezone(UTC):
            return end
        if start.astimezone(UTC) >= now.astimezone(UTC):
            return start
        boundary = entry["prepared"].resolve(start).next_change
        if boundary is None or boundary.astimezone(UTC) > end.astimezone(UTC):
            return start
        return max(start, now, key=lambda value: value.astimezone(UTC))
