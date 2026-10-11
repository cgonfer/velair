import { PANEL_VIEWS } from "../constants";
import type { VelairPanelView } from "../types";

export type PanelSubsection = "default" | "profiles" | "templates" | "presets" | "preconditioning" | "planned-return";
export type PanelDestination = { view: VelairPanelView; subsection?: PanelSubsection };

export function panelDestination(view: VelairPanelView, subsection?: string): PanelDestination {
  if (view === "schedules") return { view, subsection: subsection === "profiles" ? "profiles" : "default" };
  if (view === "templates") return { view, subsection: subsection === "presets" ? "presets" : "templates" };
  if (view === "preconditioning") return { view, subsection: subsection === "planned-return" ? "planned-return" : "preconditioning" };
  return { view };
}

export function parsePanelPath(path: string, prefix = "/velair"): PanelDestination {
  const relative = path === prefix ? "" : path.startsWith(`${prefix}/`) ? path.slice(prefix.length) : path;
  const [rawView, subsection] = relative.replace(/^\/+/, "").split("/");
  const view = rawView === "profiles" ? "modes" : rawView;
  return panelDestination(PANEL_VIEWS.includes(view as VelairPanelView) ? view as VelairPanelView : "overview", subsection);
}

export function panelPath(destination: PanelDestination, prefix = "/velair"): string {
  const normalized = panelDestination(destination.view, destination.subsection);
  return normalized.view === "overview" ? prefix : `${prefix}/${normalized.view}${normalized.subsection ? `/${normalized.subsection}` : ""}`;
}
