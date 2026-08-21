// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

import { VelairCard } from "../../src/velair/components/velair-card-element";

const TEST_TAG = "velair-notice-lifecycle-test";
if (!customElements.get(TEST_TAG)) customElements.define(TEST_TAG, VelairCard);

type NoticeInternals = {
  _error?: string;
  _saveMessage?: string;
  _noticeStackEntries(): readonly {
    id: string;
    message: string;
    phase?: "entering" | "active" | "leaving";
    type: "error" | "success";
  }[];
  willUpdate(): void;
};

describe("operational notice lifecycle", () => {
  it.each([
    { field: "_saveMessage" as const, id: "success", type: "success" as const },
    { field: "_error" as const, id: "error", type: "error" as const },
  ])("keeps a dismissed global $type notice for the fade and then removes it", async ({ field, id, type }) => {
    vi.useFakeTimers();
    try {
      const card = document.createElement(TEST_TAG) as VelairCard;
      const host = card as unknown as NoticeInternals;
      host[field] = "Message";
      host.willUpdate();

      host[field] = undefined;
      host.willUpdate();
      expect(host._noticeStackEntries()[0]).toMatchObject({
        id,
        phase: "leaving",
        type,
      });
      await vi.advanceTimersByTimeAsync(140);
      expect(host._noticeStackEntries()).toHaveLength(0);
      card.remove();
    } finally {
      vi.useRealTimers();
    }
  });
});
