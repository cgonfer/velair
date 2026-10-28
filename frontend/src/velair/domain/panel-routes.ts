import { PANEL_VIEWS, WEEKDAYS } from "../constants";
import type { ResourceUsage, VelairPanelView } from "../types";

export type PanelSubsection = "default" | "profiles" | "templates" | "presets" | "preconditioning" | "planned-return";
export type PanelDestination = { view: VelairPanelView; subsection?: PanelSubsection };

/** A transient cross-dashboard jump; the panel consumes it after accepting navigation. */
export function scheduleUsagePath(usage: ResourceUsage, prefix = "/velair"): string {
  const params = new URLSearchParams({ entity_id: usage.entity_id, weekday: usage.weekday });
  if (usage.source === "profile" && usage.profile_key) params.set("profile_key", usage.profile_key);
  return `${panelPath({ view: "schedules", subsection: usage.source === "profile" ? "profiles" : "default" }, prefix)}?${params}`;
}

export function scheduleUsageFromSearch(search: string, subsection?: PanelSubsection): ResourceUsage | undefined {
  const params = new URLSearchParams(search);
  const entity_id = params.get("entity_id");
  const weekday = params.get("weekday");
  if (!entity_id || !weekday || !WEEKDAYS.includes(weekday)) return undefined;
  const profile_key = params.get("profile_key");
  return subsection === "profiles"
    ? profile_key ? { source: "profile", entity_id, weekday, profile_key } : undefined
    : { source: "default", entity_id, weekday };
}

export function panelDestination(view: VelairPanelView, subsection?: string): PanelDestination {
  if (view === "schedules") return { view, subsection: subsection === "profiles" ? "profiles" : "default" };
  if (view === "templates") return { view, subsection: subsection === "presets" ? "presets" : "templates" };
  // Keep links to the former subsection working after moving it to its own tab.
  if (view === "preconditioning" && subsection === "planned-return") return { view: "planned-return" };
  return { view };
}

export function parsePanelPath(path: string, prefix = "/velair"): PanelDestination {
  const relative = path === prefix ? "" : path.startsWith(`${prefix}/`) ? path.slice(prefix.length) : path;
  const [rawView, subsection] = relative.replace(/^\/+/, "").split("/");
  // Preserve bookmarks from the feature's initial Groups tab.
  const view = rawView === "profiles" ? "modes" : rawView === "groups" ? "supply-control" : rawView;
  return panelDestination(PANEL_VIEWS.includes(view as VelairPanelView) ? view as VelairPanelView : "overview", subsection);
}

export function panelPath(destination: PanelDestination, prefix = "/velair"): string {
  const normalized = panelDestination(destination.view, destination.subsection);
  return normalized.view === "overview" ? prefix : `${prefix}/${normalized.view}${normalized.subsection ? `/${normalized.subsection}` : ""}`;
}
