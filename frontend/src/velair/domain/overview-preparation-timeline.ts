import type { ArrivalPreparationSummary } from "./planned-return-preparation";

export type OverviewPreparationPoint = { entityId: string; start: number; progress: number; color: string };
export type OverviewPreparationGroup = { position: number; points: OverviewPreparationPoint[]; background: string };

/** Color assignment uses the complete configured roster, never the visible subset. */
export function overviewPreparationPoints(summary: ArrivalPreparationSummary | undefined, departure: number, configured: readonly string[]): OverviewPreparationPoint[] {
  if (!summary || !Number.isFinite(departure) || summary.arrival <= departure) return [];
  const roster = [...new Set([...configured, ...summary.zones.map(zone => zone.entityId)])].sort();
  const seen = new Set<string>();
  return summary.zones.flatMap(zone => {
    if (seen.has(zone.entityId) || zone.source.preparation !== "adaptive" || !["waiting", "preparing"].includes(zone.state)
      || zone.start === undefined || !Number.isFinite(zone.start) || zone.start >= summary.arrival) return [];
    seen.add(zone.entityId);
    const hue = (20 + roster.indexOf(zone.entityId) * 137.508) % 360;
    return [{ entityId: zone.entityId, start: zone.start, progress: Math.max(0, Math.min(1, (zone.start - departure) / (summary.arrival - departure))), color: `hsl(${hue.toFixed(3)} 70% 55%)` }];
  }).sort((a, b) => a.start - b.start || a.entityId.localeCompare(b.entityId));
}

/** Connected overlapping 32px help targets form one group, preserving every time. */
export function overviewPreparationGroups(points: readonly OverviewPreparationPoint[], width: number): OverviewPreparationGroup[] {
  if (!Number.isFinite(width) || width <= 0) return [];
  const inset = Math.min(16, width / 2);
  const positioned = points.map(point => ({ point, x: Math.max(inset, Math.min(width - inset, point.progress * width)) }))
    .sort((a, b) => a.x - b.x || a.point.start - b.point.start || a.point.entityId.localeCompare(b.point.entityId));
  const clusters: typeof positioned[] = [];
  for (const item of positioned) {
    const last = clusters.at(-1);
    if (last && item.x - last.at(-1)!.x < 32) last.push(item);
    else clusters.push([item]);
  }
  return clusters.map(cluster => {
    const members = cluster.map(item => item.point);
    const sectors = members.map((point, index) => `${point.color} ${index * 100 / members.length}% ${(index + 1) * 100 / members.length}%`);
    return { position: cluster.reduce((sum, item) => sum + item.x, 0) / cluster.length,
      points: members, background: members.length === 1 ? members[0].color : `conic-gradient(${sectors.join(", ")})` };
  });
}
