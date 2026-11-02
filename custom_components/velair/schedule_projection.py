"""Pure, detached nominal occurrences for backend-owned schedules."""
from __future__ import annotations

from bisect import bisect_right
from copy import deepcopy
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

from .models import ClimateEvent, WEEKDAYS


def utc(value: datetime) -> datetime:
    return value.astimezone(timezone.utc)


@dataclass(frozen=True)
class NominalOccurrence:
    """One canonical local weekly transition and its input context."""
    day: date
    event: ClimateEvent
    block: dict


class PreparedSchedule:
    """Detached occurrence index, including weekly carry-over and DST."""
    def __init__(self, entity_id, schedule, now, resolve_occurrences, parse_start, make_event):
        self.entity_id = entity_id
        self.week = deepcopy(schedule)
        self.day = now.date()
        self.timezone_key = (type(now.tzinfo), repr(now.tzinfo), getattr(now.tzinfo, "key", None))
        rows = []
        if schedule is not None:
            for offset in range(-8, 9):
                day = self.day + timedelta(days=offset)
                weekday = WEEKDAYS[day.weekday()]
                coalesced = {}
                for block in schedule.get(weekday, []):
                    wall_time = parse_start(block.get("start"))
                    if wall_time is None:
                        continue
                    instants = resolve_occurrences(day, wall_time, now.tzinfo)
                    when = min(instants, key=utc)
                    event = make_event(entity_id, weekday, block, when)
                    key = utc(when)
                    old = coalesced.get(key)
                    if old is None or wall_time >= parse_start(old.event.start):
                        coalesced[key] = NominalOccurrence(day, event, deepcopy(block))
                rows.extend(coalesced.values())
        self.occurrences = tuple(sorted(rows, key=lambda row: utc(row.event.when)))
        self.instants = tuple(utc(row.event.when) for row in self.occurrences)
        self.blocks = {(weekday, block.get("start")): deepcopy(block)
                       for weekday, blocks in (schedule or {}).items() for block in blocks}
        self.has_temperature_target = any(
            block.get("action", "set_temperature") == "set_temperature"
            and any(key in block for key in ("temperature", "target_temp_low", "target_temp_high"))
            for block in self.blocks.values())
        self.thermal_contexts = {}
        self.thermal_context_ids = {}
        for identity, block in self.blocks.items():
            key = (block.get("action", "set_temperature"), block.get("temperature"),
                   block.get("target_temp_low"), block.get("target_temp_high"),
                   block.get("hvac_mode"), block.get("temperature_only", False))
            self.thermal_contexts.setdefault(key, deepcopy(block))
            self.thermal_context_ids[identity] = key

    def is_current_horizon(self, now):
        return abs((self.day - now.date()).days) <= 1 and self.timezone_key == (
            type(now.tzinfo), repr(now.tzinfo), getattr(now.tzinfo, "key", None))

    def needs_horizon_refresh(self, now):
        return self.day != now.date() or self.timezone_key != (
            type(now.tzinfo), repr(now.tzinfo), getattr(now.tzinfo, "key", None))

    def current(self, now, *, copy=True):
        index = bisect_right(self.instants, utc(now)) - 1
        if index < 0:
            return None
        row = self.occurrences[index]
        if not (0 <= (now.date() - row.day).days <= 7):
            return None
        return deepcopy(row.event) if copy else row.event

    def next_nominal(self, now):
        index = bisect_right(self.instants, utc(now))
        return deepcopy(self.occurrences[index].event) if index < len(self.occurrences) else None

    def future(self, now):
        cutoff = utc(now)
        last = now.date() + timedelta(days=7)
        return tuple(row for row in self.occurrences
                     if now.date() <= row.day <= last and utc(row.event.when) > cutoff)

    def window_is_valid(self, active_from, target_when):
        if utc(active_from) >= utc(target_when):
            return True
        before = (utc(target_when) - timedelta(microseconds=1)).astimezone(target_when.tzinfo)
        predecessor = self.current(before, copy=False)
        return predecessor is None or utc(active_from) > utc(predecessor.when)
