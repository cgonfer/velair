export type NoticePhase = "entering" | "active" | "leaving";

export interface TransitionNotice {
  id: string;
  message: string;
  phase: NoticePhase;
}

export interface DesiredNotice {
  id: string;
  message: string;
}

const NOTICE_EXIT_MS = 140;

export class NoticeTransitions {
  private _entries: TransitionNotice[] = [];
  private readonly _timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly _frames = new Map<string, number>();

  public constructor(private readonly _changed: () => void) {}

  public get entries(): readonly TransitionNotice[] {
    return this._entries;
  }

  public sync(desired: DesiredNotice[]): void {
    const desiredById = new Map(desired.map((entry) => [entry.id, entry]));

    for (const entry of this._entries) {
      const next = desiredById.get(entry.id);
      if (next) {
        this._cancelRemoval(entry.id);
        entry.message = next.message;
        if (entry.phase === "leaving") entry.phase = "active";
        desiredById.delete(entry.id);
      } else if (entry.phase !== "leaving") {
        this._cancelActivation(entry.id);
        entry.phase = "leaving";
        this._timers.set(entry.id, setTimeout(() => {
          this._timers.delete(entry.id);
          this._entries = this._entries.filter((candidate) => candidate.id !== entry.id);
          this._changed();
        }, NOTICE_EXIT_MS));
      }
    }

    for (const next of desired) {
      if (!desiredById.has(next.id)) continue;
      this._entries.push({ ...next, phase: "entering" });
      this._scheduleActivation(next.id);
    }

    // Keep existing rows in place while they leave. New notices are appended,
    // so the stack grows upward without swapping or recreating older rows.
  }

  public dispose(): void {
    for (const timer of this._timers.values()) clearTimeout(timer);
    this._timers.clear();
    for (const frame of this._frames.values()) this._cancelFrame(frame);
    this._frames.clear();
    this._entries = [];
  }

  private _scheduleActivation(id: string): void {
    this._cancelActivation(id);
    const firstFrame = this._requestFrame(() => {
      const secondFrame = this._requestFrame(() => {
        this._frames.delete(id);
        const entry = this._entries.find((candidate) => candidate.id === id);
        if (!entry || entry.phase !== "entering") return;
        entry.phase = "active";
        this._changed();
      });
      this._frames.set(id, secondFrame);
    });
    this._frames.set(id, firstFrame);
  }

  private _cancelActivation(id: string): void {
    const frame = this._frames.get(id);
    if (frame === undefined) return;
    this._cancelFrame(frame);
    this._frames.delete(id);
  }

  private _requestFrame(callback: FrameRequestCallback): number {
    if (typeof globalThis.requestAnimationFrame === "function") {
      return globalThis.requestAnimationFrame(callback);
    }
    return globalThis.setTimeout(() => callback(Date.now()), 16) as unknown as number;
  }

  private _cancelFrame(frame: number): void {
    if (typeof globalThis.cancelAnimationFrame === "function") {
      globalThis.cancelAnimationFrame(frame);
      return;
    }
    globalThis.clearTimeout(frame);
  }

  private _cancelRemoval(id: string): void {
    const timer = this._timers.get(id);
    if (timer === undefined) return;
    clearTimeout(timer);
    this._timers.delete(id);
  }
}
