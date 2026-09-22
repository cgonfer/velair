export type ClimateCardMenuRect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
};

export type ClimateCardViewport = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type ClimateCardMenuPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  placement: "up" | "down";
};

const VIEWPORT_MARGIN = 8;
const TRIGGER_GAP = 6;
const MIN_MENU_WIDTH = 220;
const MAX_MENU_WIDTH = 320;

export function climateCardMenuPosition(
  trigger: ClimateCardMenuRect,
  desiredWidth: number,
  desiredHeight: number,
  viewport: ClimateCardViewport,
): ClimateCardMenuPosition {
  const viewportRight = viewport.left + viewport.width;
  const viewportBottom = viewport.top + viewport.height;
  const maximumWidth = Math.max(0, viewport.width - VIEWPORT_MARGIN * 2);
  const width = Math.min(
    maximumWidth,
    Math.max(MIN_MENU_WIDTH, Math.min(MAX_MENU_WIDTH, desiredWidth || trigger.width)),
  );
  const below = Math.max(0, viewportBottom - VIEWPORT_MARGIN - trigger.bottom - TRIGGER_GAP);
  const above = Math.max(0, trigger.top - TRIGGER_GAP - viewport.top - VIEWPORT_MARGIN);
  const placement = below >= desiredHeight || below >= above ? "down" : "up";
  const availableHeight = placement === "down" ? below : above;
  const maxHeight = Math.max(0, Math.min(desiredHeight, availableHeight));
  const unclampedLeft = trigger.right - width;
  const left = Math.min(
    Math.max(unclampedLeft, viewport.left + VIEWPORT_MARGIN),
    Math.max(viewport.left + VIEWPORT_MARGIN, viewportRight - VIEWPORT_MARGIN - width),
  );
  const requestedTop = placement === "down"
    ? trigger.bottom + TRIGGER_GAP
    : trigger.top - TRIGGER_GAP - maxHeight;
  const top = Math.min(
    Math.max(requestedTop, viewport.top + VIEWPORT_MARGIN),
    Math.max(viewport.top + VIEWPORT_MARGIN, viewportBottom - VIEWPORT_MARGIN - maxHeight),
  );
  return { left, top, width, maxHeight, placement };
}

export function validClimateCardActionIcon(icon?: unknown): string | undefined {
  const value = typeof icon === "string" ? icon.trim() : undefined;
  return value && /^mdi:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? value : undefined;
}

export function validClimateCardActionColor(color?: unknown): string | undefined {
  const value = typeof color === "string" ? color.trim() : undefined;
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : undefined;
}
