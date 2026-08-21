import { describe, expect, it, vi } from "vitest";

import { NoticeTransitions } from "../../src/velair/controllers/notice-transitions";

describe("notice transitions", () => {
  it("retains a removed notice during its exit and then removes it", async () => {
    vi.useFakeTimers();
    try {
      const changed = vi.fn();
      const notices = new NoticeTransitions(changed);
      notices.sync([{ id: "detail", message: "Invalid target" }]);
      expect(notices.entries[0]?.phase).toBe("entering");
      await vi.advanceTimersByTimeAsync(16);
      expect(notices.entries[0]?.phase).toBe("entering");
      await vi.advanceTimersByTimeAsync(16);
      expect(notices.entries[0]?.phase).toBe("active");

      notices.sync([]);
      expect(notices.entries[0]?.phase).toBe("leaving");
      await vi.advanceTimersByTimeAsync(139);
      expect(notices.entries).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(notices.entries).toHaveLength(0);
      notices.dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancels a pending removal when the same notice reappears", async () => {
    vi.useFakeTimers();
    try {
      const notices = new NoticeTransitions(() => undefined);
      notices.sync([{ id: "detail", message: "Invalid target" }]);
      await vi.advanceTimersByTimeAsync(32);
      notices.sync([]);
      notices.sync([{ id: "detail", message: "Still invalid" }]);

      expect(notices.entries).toHaveLength(1);
      expect(notices.entries[0]).toMatchObject({ phase: "active", message: "Still invalid" });
      await vi.advanceTimersByTimeAsync(140);
      notices.sync([{ id: "detail", message: "Still invalid" }]);
      expect(notices.entries).toHaveLength(1);
      notices.dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancels pending animation frames when disposed", async () => {
    vi.useFakeTimers();
    try {
      const changed = vi.fn();
      const notices = new NoticeTransitions(changed);
      notices.sync([{ id: "detail", message: "Invalid target" }]);
      notices.dispose();

      await vi.advanceTimersByTimeAsync(32);
      expect(notices.entries).toHaveLength(0);
      expect(changed).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps a leaving row in place until its fade completes", async () => {
    vi.useFakeTimers();
    try {
      const notices = new NoticeTransitions(() => undefined);
      notices.sync([
        { id: "success", message: "Saved" },
        { id: "error", message: "Could not save" },
      ]);
      await vi.advanceTimersByTimeAsync(32);

      notices.sync([{ id: "error", message: "Could not save" }]);
      expect(notices.entries.map((entry) => [entry.id, entry.phase])).toEqual([
        ["success", "leaving"],
        ["error", "active"],
      ]);

      await vi.advanceTimersByTimeAsync(140);
      expect(notices.entries.map((entry) => entry.id)).toEqual(["error"]);
      notices.dispose();
    } finally {
      vi.useRealTimers();
    }
  });
});
