import type { DraftScheduleBlock, ScheduleBlock } from "../types";

type PreviewEntry = { status: "loading" | "unavailable"; block?: ScheduleBlock };

/** Cache backend previews, accepting replies only while their complete context is current. */
export class PresetPreviewCache {
  private readonly entries = new Map<string, PreviewEntry>();

  get(key: string): PreviewEntry | undefined { return this.entries.get(key); }
  remember(key: string, block: ScheduleBlock): void { this.entries.set(key, { status: "loading", block }); }
  invalidate(key: string): void { this.entries.delete(key); }
  retain(keys: Set<string>): void {
    for (const key of this.entries.keys()) if (!keys.has(key)) this.entries.delete(key);
  }

  request(key: string, load: () => Promise<ScheduleBlock | undefined>, current: () => boolean, changed: () => void, failed: (error: unknown) => void): void {
    if (this.entries.has(key)) return;
    const entry: PreviewEntry = { status: "loading" };
    this.entries.set(key, entry);
    changed();
    void load().then((block) => {
      if (!current() || this.entries.get(key) !== entry) { if (this.entries.get(key) === entry) this.entries.delete(key); return; }
      if (!block) throw new Error("The backend returned no preset configuration.");
      entry.block = block;
      changed();
    }).catch((error: unknown) => {
      if (!current() || this.entries.get(key) !== entry) { if (this.entries.get(key) === entry) this.entries.delete(key); return; }
      entry.status = "unavailable";
      failed(error);
      changed();
    });
  }
}

export function presetPreviewKey(context: unknown, block: DraftScheduleBlock): string {
  // Moving a block changes its time, not the backend-adapted preset settings.
  const { start: _start, ...settings } = block;
  return JSON.stringify([context, settings]);
}
