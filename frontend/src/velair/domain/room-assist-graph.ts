/** Geometry only: all thermal decisions arrive in the committed runtime projection. */
export type GraphChipInput = { id: string; x: number; width: number; height: number; below?: boolean };
export type GraphChipLayout = GraphChipInput & { left: number; top: number; lane: number };
export function layoutRoomAssistChips(inputs: GraphChipInput[], width: number) {
  const lanes: Array<Array<{ left: number; right: number }>> = [];
  const chips: GraphChipLayout[] = [];
  let rowHeight = 32;
  for (const input of inputs) rowHeight = Math.max(rowHeight, input.height + 8);
  for (const input of [...inputs].sort((a, b) => a.x - b.x)) {
    const chipWidth = Math.min(input.width, Math.max(0, width - 8));
    const left = Math.max(4, Math.min(width - chipWidth - 4, input.x - chipWidth / 2));
    let lane = 0;
    if (!input.below) {
      while (lanes[lane]?.some((item) => left < item.right + 6 && left + chipWidth > item.left - 6)) lane++;
      (lanes[lane] ??= []).push({ left, right: left + chipWidth });
    }
    chips.push({ ...input, width: chipWidth, left, top: lane * rowHeight + 2, lane });
  }
  const axis = Math.max(1, lanes.length) * rowHeight + 18;
  for (const chip of chips) if (chip.below) chip.top = axis + 58;
  return { chips, axis };
}
export function roomAssistRailLabelPlacement(from: number, to: number, labelWidth: number) {
  const center = (from + to) / 2;
  return { center, inline: Math.abs(to - from) >= labelWidth + 24 };
}
export function roomAssistGraphDomain(values: number[]) {
  const finite = values.filter(Number.isFinite);
  const low = finite.length ? Math.min(...finite) : 0;
  const high = finite.length ? Math.max(...finite) : 1;
  const span = Math.max(high - low, .5);
  return { low: low - span * .07, high: high + span * .07 };
}
