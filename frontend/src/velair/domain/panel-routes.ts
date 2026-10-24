import { PANEL_VIEWS } from "../constants";
import type { VelairPanelView } from "../types";

export type PanelSubsection = "default" | "profiles" | "templates" | "presets" | "preconditioning" | "planned-return";
export type PanelDestination = { view: VelairPanelView; subsection?: PanelSubsection };

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
