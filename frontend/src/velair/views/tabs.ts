import type { TranslationKey } from "../translations";
import type { VelairPanelView } from "../types";

export type PanelTabDefinition = {
  icon: string;
  labelKey: TranslationKey;
  view: VelairPanelView;
};

export const PANEL_TABS: PanelTabDefinition[] = [
  {
    icon: "mdi:view-dashboard-outline",
    labelKey: "overview",
    view: "overview",
  },
  {
    icon: "mdi:calendar-clock",
    labelKey: "schedules",
    view: "schedules",
  },
  {
    icon: "mdi:content-copy",
    labelKey: "templates",
    view: "templates",
  },
  {
    icon: "mdi:cog-outline",
    labelKey: "settings",
    view: "settings",
  },
];

export function panelTabIcon(view: VelairPanelView): string {
  return PANEL_TABS.find((tab) => tab.view === view)?.icon ?? "mdi:circle";
}
