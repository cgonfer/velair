"""Controllable test transport, independent of Velair's publication state."""

import asyncio


class PublicationTransport:
    def __init__(self):
        self._released = asyncio.Event()
        self._released.set()
        self.fail = False

    def configure(self, *, hold=None, fail=None):
        if fail is not None:
            self.fail = fail
        if hold is True:
            self._released.clear()
        elif hold is False:
            self._released.set()

    async def deliver(self):
        # A failed capture must never leave a service call blocked forever.
        await asyncio.wait_for(self._released.wait(), timeout=180)
        if self.fail:
            raise RuntimeError("Virtual controller rejected the schedule")
