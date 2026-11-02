"""Task-scoped authority checks at each physical climate service boundary."""

from __future__ import annotations

import asyncio
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass


class DeliverySuperseded(Exception):
    """Stop the remainder of a sequence whose authority has been replaced."""


@dataclass(frozen=True, slots=True)
class _Guard:
    task: asyncio.Task | None
    check: Callable[[], bool]


_current_guard: ContextVar[_Guard | None] = ContextVar("velair_delivery_guard", default=None)


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
