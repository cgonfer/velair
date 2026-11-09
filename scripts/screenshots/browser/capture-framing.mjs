/** Native screenshot rectangles; required scenes must never be silently cut. */
export function positionCaptureTarget(element, clearance) {
  element.scrollIntoView({ block: "start", inline: "nearest", behavior: "instant" });
  let ancestor = element.parentElement ?? element.getRootNode().host;
  while (ancestor) {
    if (ancestor.scrollTop > 0 && ancestor.scrollHeight > ancestor.clientHeight) {
      // A last section can already be bottom-aligned by native scroll limits.
      // Add only missing header clearance so its complete content stays visible.
      const missing = Math.max(0, clearance - element.getBoundingClientRect().top);
      ancestor.scrollTop = Math.max(0, ancestor.scrollTop - missing);
      break;
    }
    ancestor = ancestor.parentElement ?? ancestor.getRootNode().host;
  }
}

export function captureRectangle(start, end, viewport) {
  const boxes = [start, ...(Array.isArray(end) ? end : end ? [end] : [])];
  if (boxes.some(box => !box || ![box.x, box.y, box.width, box.height].every(Number.isFinite) || box.width <= 0 || box.height <= 0)) {
    throw new Error("Empty capture target");
  }
  const x = Math.min(...boxes.map(box => box.x));
  const y = Math.min(...boxes.map(box => box.y));
  const width = Math.max(...boxes.map(box => box.x + box.width)) - x;
  const naturalHeight = Math.max(...boxes.map(box => box.y + box.height)) - y;
  const height = Math.min(naturalHeight, viewport.maxHeight, viewport.height - y);
  if (x < 0 || y < 0 || x + width > viewport.width + 1 || width < 100 || height < 100) {
    throw new Error("Capture exceeds viewport");
  }
  if (viewport.complete && naturalHeight > height + 1) {
    throw new Error("Required screenshot content would be cut");
  }
  return { x, y, width, height };
}
