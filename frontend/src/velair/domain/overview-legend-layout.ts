/** Fit a prefix into one row, reserving space for the overflow helper. */
export function overviewLegendLayout(widths: readonly number[], available: number, overflowWidth: number, minimumFirstWidth = 32) {
  const gap = 12;
  const full = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, widths.length - 1) * gap;
  if (full <= available) return { count: widths.length, firstMaxWidth: 160 };
  const room = Math.max(0, available - overflowWidth - gap);
  let used = 0;
  let count = 0;
  for (const width of widths) {
    const next = used + (count ? gap : 0) + width;
    if (next > room) break;
    used = next; count++;
  }
  if (!count && widths.length && room >= minimumFirstWidth) return { count: 1, firstMaxWidth: Math.min(160, room) };
  return { count, firstMaxWidth: 160 };
}
