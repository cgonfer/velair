import { clampMinute, timeFromMinutes } from "../schedule-time";
import {
  minuteFromTimelinePosition,
  sortDraftBlocksByStart,
  timelineBlocksFromDrafts,
  type TimelineBlock,
} from "../domain/timeline";
import type { BlockDraftSource, DraftScheduleBlock } from "../types";

type TimelineResizeState = {
  edge: "start" | "end";
  index: number;
  source: BlockDraftSource;
  track: HTMLElement;
};

type TimelineHost = {
  readonly classList: DOMTokenList;
  _draggedTimelineIndex?: number;
  _previousBodyCursor?: string;
  _previousDocumentCursor?: string;
  _timelineResize?: TimelineResizeState;
  _blocksForSource(source: BlockDraftSource): DraftScheduleBlock[];
  _handleTimelineResizeEnd(event: PointerEvent): void;
  _handleTimelineResizeMove(event: PointerEvent): void;
  _resizeTimelineBlock(index: number, edge: "start" | "end", minute: number, source?: BlockDraftSource): void;
  _setBlocksForSource(source: BlockDraftSource, blocks: DraftScheduleBlock[]): void;
  _setDraftBlockStart(index: number, start: string, options?: { sort?: boolean }, source?: BlockDraftSource): void;
  _sortDraftBlocksByStart(source?: BlockDraftSource): void;
};

export function asTimelineHost(host: unknown): TimelineHost {
  return host as TimelineHost;
}

export function handleTimelineDragStart(
  host: TimelineHost,
  index: number,
  source: BlockDraftSource,
  event: DragEvent,
): void {
  host._draggedTimelineIndex = index;
  event.dataTransfer?.setData("text/plain", JSON.stringify({ index, source }));
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
}

export function handleTimelineDragOver(event: DragEvent): void {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
}

export function handleTimelineDrop(
  host: TimelineHost,
  event: DragEvent,
  fallbackSource: BlockDraftSource = "schedule",
): void {
  event.preventDefault();
  const dragData = timelineDragData(host, event, fallbackSource);
  const { index, source } = dragData;
  host._draggedTimelineIndex = undefined;
  if (!Number.isInteger(index) || !host._blocksForSource(source)[index]) {
    return;
  }

  const target = event.currentTarget as HTMLElement;
  const nextStart = timeFromTimelinePosition(host, event.clientX, target);
  host._setDraftBlockStart(index, nextStart, { sort: true }, source);
}

export function timelineDragData(
  host: TimelineHost,
  event: DragEvent,
  fallbackSource: BlockDraftSource,
): { index: number; source: BlockDraftSource } {
  const rawValue = event.dataTransfer?.getData("text/plain");
  if (rawValue) {
    try {
      const parsed = JSON.parse(rawValue) as { index?: unknown; source?: unknown };
      if (typeof parsed.index === "number" && (parsed.source === "schedule" || parsed.source === "template")) {
        return { index: parsed.index, source: parsed.source };
      }
    } catch {
      const index = Number(rawValue);
      if (Number.isInteger(index)) {
        return { index, source: fallbackSource };
      }
    }
  }

  return { index: Number(host._draggedTimelineIndex), source: fallbackSource };
}

export function handleTimelineDragEnd(host: TimelineHost): void {
  host._draggedTimelineIndex = undefined;
}

export function handleTimelineResizeStart(
  host: TimelineHost,
  index: number,
  edge: "start" | "end",
  source: BlockDraftSource,
  event: PointerEvent,
): void {
  event.preventDefault();
  event.stopPropagation();
  const track = (event.currentTarget as HTMLElement).closest(".timeline-track");
  if (!(track instanceof HTMLElement)) {
    return;
  }

  host._timelineResize = { edge, index, source, track };
  host.classList.add("timeline-resizing");
  setBodyCursor(host, "ew-resize");
  window.addEventListener("pointermove", host._handleTimelineResizeMove);
  window.addEventListener("pointerup", host._handleTimelineResizeEnd, { once: true });
  host._resizeTimelineBlock(index, edge, minuteFromTimelineClientX(event.clientX, track), source);
}

export function handleTimelineResizeMove(host: TimelineHost, event: PointerEvent): void {
  if (!host._timelineResize) {
    return;
  }

  event.preventDefault();
  const { edge, index, source, track } = host._timelineResize;
  host._resizeTimelineBlock(index, edge, minuteFromTimelineClientX(event.clientX, track), source);
}

export function handleTimelineResizeEnd(host: TimelineHost): void {
  window.removeEventListener("pointermove", host._handleTimelineResizeMove);
  const source = host._timelineResize?.source ?? "schedule";
  host.classList.remove("timeline-resizing");
  host._timelineResize = undefined;
  resetBodyCursor(host);
  host._sortDraftBlocksByStart(source);
}

export function resizeTimelineBlock(
  host: TimelineHost,
  index: number,
  edge: "start" | "end",
  minute: number,
  source: BlockDraftSource = "schedule",
): void {
  const blocks = timelineBlocks(host, source);
  const blockIndex = blocks.findIndex((block) => block.index === index);
  const block = blocks[blockIndex];
  if (!block) {
    return;
  }

  if (edge === "start") {
    const previousStart = blocks[blockIndex - 1]?.startMinute;
    const minMinute = typeof previousStart === "number" ? previousStart + 15 : 0;
    const maxMinute = block.endMinute - 15;
    host._setDraftBlockStart(index, timeFromMinutes(clampMinute(minute, minMinute, maxMinute)), {}, source);
    return;
  }

  const nextBlock = blocks[blockIndex + 1];
  if (!nextBlock) {
    return;
  }

  const nextAfterStart = blocks[blockIndex + 2]?.startMinute;
  const minMinute = block.startMinute + 15;
  const maxMinute = typeof nextAfterStart === "number" ? nextAfterStart - 15 : 1425;
  host._setDraftBlockStart(nextBlock.index, timeFromMinutes(clampMinute(minute, minMinute, maxMinute)), {}, source);
}

export function sortDraftBlocks(host: TimelineHost, source: BlockDraftSource = "schedule"): void {
  host._setBlocksForSource(source, sortDraftBlocksByStart(host._blocksForSource(source)));
}

export function timelineBlocks(host: TimelineHost, source: BlockDraftSource = "schedule"): TimelineBlock[] {
  return timelineBlocksFromDrafts(host._blocksForSource(source));
}

export function timeFromTimelinePosition(host: TimelineHost, clientX: number, target: HTMLElement): string {
  return timeFromMinutes(minuteFromTimelineClientX(clientX, target));
}

export function minuteFromTimelineClientX(clientX: number, target: HTMLElement): number {
  const rect = target.getBoundingClientRect();
  return minuteFromTimelinePosition(clientX, rect.left, rect.width);
}

export function setBodyCursor(host: TimelineHost, cursor: string): void {
  if (!document.body) {
    return;
  }
  if (host._previousBodyCursor === undefined) {
    host._previousBodyCursor = document.body.style.cursor;
  }
  if (host._previousDocumentCursor === undefined) {
    host._previousDocumentCursor = document.documentElement.style.cursor;
  }
  document.body.style.cursor = cursor;
  document.documentElement.style.cursor = cursor;
}

export function resetBodyCursor(host: TimelineHost): void {
  if (!document.body || host._previousBodyCursor === undefined) {
    return;
  }
  document.body.style.cursor = host._previousBodyCursor;
  document.documentElement.style.cursor = host._previousDocumentCursor ?? "";
  host._previousBodyCursor = undefined;
  host._previousDocumentCursor = undefined;
}
