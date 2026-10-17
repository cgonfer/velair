"""Opt-in DEBUG timings for saves and schedule responses; never log payloads.

Phases are inclusive and can overlap (for example, reschedule inside reconcile).
Their durations must not be added together. All state is local to one operation.
"""

from contextlib import AsyncExitStack, asynccontextmanager, contextmanager
from contextvars import ContextVar
from dataclasses import dataclass, field
from functools import wraps
import logging
from time import perf_counter
from uuid import uuid4

_LOGGER = logging.getLogger(__name__)


@dataclass
class _SaveTrace:
    phases: dict[str, float] = field(default_factory=dict)
    calls: dict[str, int] = field(default_factory=dict)
    active: bool = True


_CURRENT_TRACE: ContextVar[_SaveTrace | None] = ContextVar("velair_save_trace", default=None)


@contextmanager
def measure_save_phase(name: str):
    """Measure a fixed internal phase only within an active DEBUG trace."""
    trace = _CURRENT_TRACE.get()
    if trace is None or not trace.active:
        yield
        return
    started = perf_counter()
    try:
        yield
    finally:
        if trace.active:
            trace.phases[name] = trace.phases.get(name, 0.0) + (perf_counter() - started) * 1000
            trace.calls[name] = trace.calls.get(name, 0) + 1


@contextmanager
def trace_save_operation(operation: str):
    """Log one bounded summary, or measure a nested response in its save trace."""
    current = _CURRENT_TRACE.get()
    if current is not None and current.active:
        with measure_save_phase(operation):
            yield
        return
    if not _LOGGER.isEnabledFor(logging.DEBUG):
        yield
        return
    trace = _SaveTrace()
    token = _CURRENT_TRACE.set(trace)
    started = perf_counter()
    trace_id = uuid4().hex[:12]
    outcome = "returned"
    try:
        yield
    except BaseException:
        # A returned handler can also have sent a validation error. Do not label
        # completion as a successful save or include exception text in the log.
        outcome = "raised"
        raise
    finally:
        total_ms = (perf_counter() - started) * 1000
        trace.active = False
        _CURRENT_TRACE.reset(token)
        _LOGGER.debug(
            "Schedule save timing: operation=%s trace=%s outcome=%s total_ms=%.2f phases_ms=%s calls=%s",
            operation, trace_id, outcome, total_ms,
            {name: round(value, 2) for name, value in sorted(trace.phases.items())},
            dict(sorted(trace.calls.items())),
        )


def trace_schedule_save(operation: str):
    """Wrap a WebSocket save without changing its return/error semantics."""
    def decorate(function):
        @wraps(function)
        async def wrapped(*args, **kwargs):
            with trace_save_operation(operation):
                return await function(*args, **kwargs)
        return wrapped
    return decorate


@asynccontextmanager
async def timed_save_lock(lock, phase: str):
    """Measure acquisition while preserving the original context's lifetime."""
    async with AsyncExitStack() as stack:
        with measure_save_phase(phase):
            await stack.enter_async_context(lock)
        yield
