"""Task-scoped authority checks at each physical climate service boundary."""

from __future__ import annotations

import asyncio
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass
from typing import Any


class DeliverySuperseded(Exception):
    """Stop the remainder of a sequence whose authority has been replaced."""


@dataclass(frozen=True, slots=True)
class _Guard:
    task: asyncio.Task | None
    check: Callable[[], bool]


_current_guard: ContextVar[_Guard | None] = ContextVar("velair_delivery_guard", default=None)


@dataclass(slots=True)
class _ReceiptCapture:
    task: asyncio.Task | None
    targets: dict[str, dict[str, Any]]


_current_receipt: ContextVar[_ReceiptCapture | None] = ContextVar(
    "velair_delivery_receipt", default=None
)


@contextmanager
def capture_delivery_receipt() -> Iterator[dict[str, dict[str, Any]]]:
    """Capture only successfully awaited physical calls made by this task."""
    receipt: dict[str, dict[str, Any]] = {}
    token = _current_receipt.set(_ReceiptCapture(asyncio.current_task(), receipt))
    try:
        yield receipt
    finally:
        _current_receipt.reset(token)


def record_delivery_receipt(entity_id: str, expected: dict[str, Any]) -> None:
    """Merge the final requested target, excluding alternate-format cleanup."""
    capture = _current_receipt.get()
    if capture is None or capture.task is not asyncio.current_task():
        return
    fields = {key: value for key, value in expected.items() if value is not None}
    if not fields:
        return
    target = capture.targets.setdefault(entity_id, {})
    if "temperature" in fields:
        target.pop("target_temp_low", None)
        target.pop("target_temp_high", None)
    elif "target_temp_low" in fields or "target_temp_high" in fields:
        target.pop("temperature", None)
    if "hvac_mode" in fields:
        target.pop("__not_off__", None)
        if fields["hvac_mode"] == "off":
            for key in ("temperature", "target_temp_low", "target_temp_high"):
                target.pop(key, None)
    elif "__not_off__" in fields:
        target.pop("hvac_mode", None)
    target.update(fields)


@contextmanager
def delivery_guard(check: Callable[[], bool]) -> Iterator[None]:
    """Guard only this task; HA listeners can inherit context in new tasks."""
    parent = _current_guard.get()
    task = asyncio.current_task()

    def combined() -> bool:
        return (parent is None or parent.task is not task or parent.check()) and check()

    token = _current_guard.set(_Guard(task, combined))
    try:
        yield
    finally:
        _current_guard.reset(token)


def check_delivery() -> None:
    """Revalidate synchronously immediately before a physical service call."""
    guard = _current_guard.get()
    if guard is not None and guard.task is asyncio.current_task() and not guard.check():
        raise DeliverySuperseded


def delivery_guard_active() -> bool:
    """Return whether the current task owns an active physical sequence."""
    guard = _current_guard.get()
    return guard is not None and guard.task is asyncio.current_task()
