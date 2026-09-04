// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";

import type { VelairViewHost } from "../../src/velair/host-types";
import type { DiagnosticsSnapshot, UnitDiagnostics } from "../../src/velair/types";
import { VELAIR_SYSTEM_SOURCE } from "../../src/velair/domain/diagnostics-history";
import {
  DEFAULT_DIAGNOSTICS_LOG_COLUMNS,
  diagnosticsLogContentWidth,
  fitDiagnosticsLogColumns,
} from "../../src/velair/domain/diagnostics-log-layout";
import { diagnosticsStyles } from "../../src/velair/styles/diagnostics-styles";
import { responsiveStyles } from "../../src/velair/styles/responsive-styles";
import { de } from "../../src/velair/translations/de";
import { en } from "../../src/velair/translations/en";
import { es } from "../../src/velair/translations/es";
import { renderDiagnosticsView } from "../../src/velair/views/diagnostics-view";

const categories = {
  control: true,
  room_assist: true,
  preconditioning: true,
  comfort: true,
  delivery: true,
  availability: true,
};

function unit(status: UnitDiagnostics["status"]): UnitDiagnostics {
  return {
    status, issues: [], state: "heat", capabilities: { hvac_modes: ["heat", "cool"] },
    configuration: { preconditioning: {}, comfort: {} }, effective_setup: { schedule_source: "default" },
    intent: null, last_application: null, delivery: { status: "idle", retry_count: 0 },
    override: null, pauses: [], room_assist: null, comfort: null,
    preconditioning_learning: null, sensors: [],
  };
}

function diagnostics(): DiagnosticsSnapshot {
  return {
    generated_at: "2026-08-18T10:00:00Z", history_limit: 100,
    history_policy: { categories, runtime_only: true, cleared_on_restart: true },
    overall: { status: "warning", scheduler_mode: "auto", scheduler_status: "scheduled",
      unit_counts: { ok: 1, warning: 1, error: 0 }, issues: [] },
    units: { "climate.healthy": unit("ok"), "climate.warning": unit("warning") }, history: [],
  };
}

function host(snapshot = diagnostics()): VelairViewHost {
  return {
    _data: { diagnostics: snapshot }, _diagnosticsHistorySaving: false,
    _diagnosticsSourceFilterOpen: false,
    _diagnosticsSourcePlacement: "down",
    _diagnosticsSourceMaxHeight: 320,
    _diagnosticsLogColumns: { ...DEFAULT_DIAGNOSTICS_LOG_COLUMNS },
    _diagnosticsLogAvailableWidth: diagnosticsLogContentWidth(900),
    _diagnosticsExportOpen: false,
    _diagnosticsRedactEntityIds: true,
    _config: { zone_order: ["climate.healthy", "climate.warning"] },
    _friendlyEntityName: (id: string) => id === "climate.warning" ? "Needs attention" : "Healthy",
    _formatDateTime: (value: string) => value, _formatTemperature: (value: number) => `${value} °C`,
    _temperatureUnit: () => "°C",
    _language: () => "en",
    _modeLabel: (value: string) => value, _t: (key: string) => key, requestUpdate: vi.fn(),
    _schedulerModeLabel: (value: string) => `mode:${value}`,
    _schedulerStatusLabel: (value: string) => `status:${value}`,
    _setDiagnosticsSourceFilterOpen(open: boolean, returnFocus = false) {
      this._diagnosticsSourceFilterOpen = open;
      this.requestUpdate();
      if (returnFocus) window.requestAnimationFrame(() => {
        this.renderRoot.querySelector<HTMLElement>(".diagnostics-source-trigger")?.focus();
      });
    },
  } as unknown as VelairViewHost;
}

describe("diagnostics view", () => {
  it("uses a horizontal climate strip above one detail panel", () => {
    expect(diagnosticsStyles.cssText).toContain(".diagnostics-unit-list { display: flex; gap: 8px");
    expect(diagnosticsStyles.cssText).toContain("overflow-x: auto; padding: 2px 0 4px");
    expect(diagnosticsStyles.cssText).not.toContain("scrollbar-gutter");
    expect(diagnosticsStyles.cssText).toContain("180px) 12px");
    expect(diagnosticsStyles.cssText).toContain(".diagnostics-unit-option:not(.selected)");
    expect(diagnosticsStyles.cssText).toContain("flex: 0 0 18px; height: 18px");
    expect(diagnosticsStyles.cssText).toContain("@container (max-width: 609px)");
    expect(diagnosticsStyles.cssText).toContain("background: var(--card-background-color); border: 1px solid var(--divider-color)");
    expect(diagnosticsStyles.cssText).toContain("display: flex");
    expect(diagnosticsStyles.cssText).toContain("overflow-x: auto");
    expect(diagnosticsStyles.cssText).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(diagnosticsStyles.cssText).toContain("@media (max-width: 899px)");
    expect(diagnosticsStyles.cssText).not.toContain(".diagnostics-unit-option:hover");
    expect(diagnosticsStyles.cssText).toContain("border-left: 3px");
    expect(diagnosticsStyles.cssText).toContain("grid-template-columns: 20px minmax(0, 1fr)");
    expect(diagnosticsStyles.cssText).toContain("font-size: 14px; font-weight: 600");
  });

  it("stacks every runtime-log value on its own non-wrapping row on phones", () => {
    expect(diagnosticsStyles.cssText).toMatch(
      /@media \(max-width:\s*600px\)[\s\S]*\.diagnostics-history li\s*\{[^}]*grid-template-columns:\s*max-content;[^}]*overflow-x:\s*auto/,
    );
    expect(diagnosticsStyles.cssText).toMatch(
      /\.diagnostics-history li time,\s*\.diagnostics-history-climate,\s*\.diagnostics-history-type,\s*\.diagnostics-history-message\s*\{[^}]*grid-column:\s*1;[^}]*white-space:\s*nowrap;[^}]*width:\s*max-content/,
    );
  });

  it("keeps Clear filters at the top right of the runtime-log header on phones", () => {
    expect(diagnosticsStyles.cssText).toContain(
      ".diagnostics-history > header { align-items: start; display: flex; gap: 12px; justify-content: space-between; }",
    );
    const phoneRules = diagnosticsStyles.cssText.split("@media (max-width: 600px)")[1] ?? "";
    expect(phoneRules).not.toContain(".diagnostics-history > header { display: grid; }");
    expect(phoneRules).not.toContain(".diagnostics-clear-filters { width: 100%; }");
    expect(responsiveStyles.cssText).toMatch(
      /@media \(max-width:\s*600px\)[\s\S]*\.command-button\s*\{[^}]*width:\s*100%;[^}]*\}[\s\S]*\.diagnostics-clear-filters\s*\{[^}]*flex:\s*0 0 auto;[^}]*width:\s*auto/,
    );
  });

  it("hides report export on phone layouts where app downloads are unreliable", () => {
    expect(responsiveStyles.cssText).toMatch(
      /@media \(max-width:\s*600px\)[\s\S]*\.diagnostics-export-section,\s*\.portability-export-card\s*\{[^}]*display:\s*none/,
    );
  });

  it("uses configured climate order and waits for an explicit selection", () => {
    const container = document.createElement("div");
    render(renderDiagnosticsView(host()), container);
    const options = [...container.querySelectorAll(".diagnostics-unit-option")];
    expect(options[0].textContent).toContain("Healthy");
    expect(options[1].textContent).toContain("Needs attention");
    expect(container.querySelector(".diagnostics-unit-option.selected")).toBeNull();
    expect(container.querySelector(".diagnostics-unit-placeholder")?.textContent)
      .toContain("diagnosticsSelectUnit");
    expect(container.querySelectorAll(".diagnostics-detail-panel")).toHaveLength(1);
  });

  it("keeps an established selection when live severity ordering changes", () => {
    const viewHost = host();
    viewHost._selectedDiagnosticEntity = "climate.healthy";
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);
    expect(container.querySelector(".diagnostics-unit-option.selected")?.textContent).toContain("Healthy");
    expect(container.querySelector(".diagnostics-status-dot")?.getAttribute("role")).toBe("img");
    expect(container.querySelector(".diagnostics-status-dot")?.getAttribute("aria-label")).toBe("diagnosticsStatusHealthy");
    expect(container.querySelector(".diagnostics-status-dot")?.getAttribute("title")).toBe("diagnosticsStatusHealthy");
  });

  it("adds localized issue evidence to warning status dots", () => {
    const snapshot = diagnostics();
    snapshot.units["climate.warning"].issues = [
      { severity: "warning", code: "entity_unavailable" },
      { severity: "warning", code: "associated_sensor_unavailable" },
    ];
    const viewHost = host(snapshot);
    viewHost._selectedDiagnosticEntity = "climate.warning";
    viewHost._t = ((key: string, replacements?: Record<string, string>) =>
      key === "diagnosticsStatusWithIssues"
        ? `${replacements?.status}: ${replacements?.issues}`
        : key) as VelairViewHost["_t"];
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);
    const expected = "diagnosticsStatusWarning: diagnosticsEntityUnavailable; diagnosticsSensorUnavailable";
    const warningDots = container.querySelectorAll(".diagnostics-status-dot.warning");
    expect(warningDots).toHaveLength(2);
    for (const dot of warningDots) {
      expect(dot.getAttribute("title")).toBe(expected);
      expect(dot.getAttribute("aria-label")).toBe(expected);
    }
  });

  it("adds localized issue evidence to error status dots", () => {
    const snapshot = diagnostics();
    snapshot.units["climate.warning"].status = "error";
    snapshot.units["climate.warning"].issues = [
      { severity: "error", code: "delivery_exhausted" },
    ];
    const viewHost = host(snapshot);
    viewHost._selectedDiagnosticEntity = "climate.warning";
    viewHost._t = ((key: string, replacements?: Record<string, string>) =>
      key === "diagnosticsStatusWithIssues"
        ? `${replacements?.status}: ${replacements?.issues}`
        : key) as VelairViewHost["_t"];
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);
    const expected = "diagnosticsStatusError: diagnosticsDeliveryExhausted";
    const errorDots = container.querySelectorAll(".diagnostics-status-dot.error");
    expect(errorDots).toHaveLength(2);
    for (const dot of errorDots) {
      expect(dot.getAttribute("title")).toBe(expected);
      expect(dot.getAttribute("aria-label")).toBe(expected);
    }
  });

  it("shows the actual applied scalar target instead of the scheduled target", () => {
    const snapshot = diagnostics();
    snapshot.units["climate.warning"].configuration.preconditioning = {
      room_sensor_assist_enabled: true,
    };
    snapshot.units["climate.warning"].room_assist = {
      target_temperature: 22,
      applied_temperature: 19.5,
    };
    const container = document.createElement("div");
    const viewHost = host(snapshot); viewHost._selectedDiagnosticEntity = "climate.warning";
    render(renderDiagnosticsView(viewHost), container);
    const roomAssist = container.querySelector(".diagnostics-function");
    expect(roomAssist?.textContent).toContain("19.5 °C");
    expect(roomAssist?.textContent).not.toContain("22 °C");
  });

  it("shows the actual applied Room Assist range", () => {
    const snapshot = diagnostics();
    snapshot.units["climate.warning"].configuration.preconditioning = {
      room_sensor_assist_enabled: true,
    };
    snapshot.units["climate.warning"].room_assist = {
      target_temp_low: 19,
      target_temp_high: 23,
      applied_target_temp_low: 18.5,
      applied_target_temp_high: 22.5,
    };
    const container = document.createElement("div");
    const viewHost = host(snapshot); viewHost._selectedDiagnosticEntity = "climate.warning";
    render(renderDiagnosticsView(viewHost), container);
    const roomAssist = container.querySelector(".diagnostics-function");
    expect(roomAssist?.textContent).toContain("18.5 °C – 22.5 °C");
    expect(roomAssist?.textContent).not.toContain("19 °C – 23 °C");
  });

  it("formats scalar and heat/cool range targets in Fahrenheit", () => {
    const snapshot = diagnostics();
    const diagnosticUnit = snapshot.units["climate.warning"];
    diagnosticUnit.capabilities.hvac_modes = ["heat", "cool", "heat_cool"];
    diagnosticUnit.last_application = {
      hvac_mode: "heat",
      temperature: 72,
    };
    diagnosticUnit.configuration.preconditioning = {
      room_sensor_assist_enabled: true,
    };
    diagnosticUnit.room_assist = {
      state: "assisting",
      direction: "heat_cool",
      applied_target_temp_low: 68,
      applied_target_temp_high: 74,
    };
    const viewHost = host(snapshot);
    viewHost._selectedDiagnosticEntity = "climate.warning";
    viewHost._temperatureUnit = () => "°F";
    viewHost._formatTemperature = (value: number) => `${value} °F`;
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);
    const text = container.textContent ?? "";
    expect(text).toContain("72 °F");
    expect(text).toContain("68 °F – 74 °F");
    expect(text).toContain("heat_cool");
  });

  it("shows concise report copy and explains every retained category", () => {
    const container = document.createElement("div");
    render(renderDiagnosticsView(host()), container);
    expect(container.querySelector(".diagnostics-download")?.textContent).toContain("diagnosticsDownloadAction");
    expect(container.querySelector(".diagnostics-download")?.getAttribute("title")).toBe("diagnosticsDownloadActionDescription");
    expect(container.querySelector(".diagnostics-download small")?.textContent)
      .toContain("diagnosticsDownloadActionDescription");
    expect(container.querySelector("#diagnostics-export-options")).toBeNull();
    expect(container.querySelectorAll(".diagnostics-category-grid label")).toHaveLength(6);
    expect(container.querySelector(".diagnostics-clear-history ha-icon")?.getAttribute("icon"))
      .toBe("mdi:delete-outline");
  });

  it("keeps report entity redaction enabled by default and resets it on close", () => {
    const viewHost = host();
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);

    (container.querySelector(".diagnostics-download") as HTMLButtonElement).click();
    render(renderDiagnosticsView(viewHost), container);
    const trigger = container.querySelector(".diagnostics-download");
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(trigger?.getAttribute("aria-controls")).toBe("diagnostics-export-options");
    expect(container.querySelector("#diagnostics-export-options")?.getAttribute("aria-labelledby"))
      .toBe("diagnostics-export-heading");
    const checkbox = container.querySelector<HTMLInputElement>(
      ".diagnostics-export-panel input[type=checkbox]",
    );
    expect(viewHost._diagnosticsExportOpen).toBe(true);
    expect(checkbox?.checked).toBe(true);
    expect(checkbox?.closest("label")?.classList.contains("diagnostics-export-checkbox")).toBe(true);
    expect(container.querySelector(".diagnostics-export-section")?.classList.contains("open")).toBe(true);
    expect(container.querySelector(".diagnostics-export-panel .success")?.textContent)
      .toContain("diagnosticsDownloadNow");

    if (checkbox) {
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event("change"));
    }
    expect(viewHost._diagnosticsRedactEntityIds).toBe(false);
    render(renderDiagnosticsView(viewHost), container);
    expect(container.querySelector('[role="alert"]')?.textContent)
      .toContain("diagnosticsRawEntityIdsWarning");
    expect(container.querySelector(".diagnostics-export-panel .success")?.textContent)
      .toContain("diagnosticsDownloadWithEntityIds");
    (container.querySelector(".diagnostics-export-panel .command-button") as HTMLButtonElement)
      .click();
    expect(viewHost._diagnosticsExportOpen).toBe(false);
    expect(viewHost._diagnosticsRedactEntityIds).toBe(true);
  });

  it("passes the report privacy choice to the API and resets after download", async () => {
    const sendMessagePromise = vi.fn().mockResolvedValue({ diagnostics: {} });
    const viewHost = host();
    viewHost.hass = { connection: { sendMessagePromise }, states: {} } as never;
    viewHost._diagnosticsExportOpen = true;
    viewHost._diagnosticsRedactEntityIds = false;
    const container = document.createElement("div");
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const append = vi.spyOn(document.body, "append");
    render(renderDiagnosticsView(viewHost), container);

    const actions = container.querySelectorAll<HTMLButtonElement>(
      ".diagnostics-export-panel .command-button",
    );
    actions[1].click();
    await vi.waitFor(() => expect(sendMessagePromise).toHaveBeenCalledWith({
      type: "velair/export_diagnostics",
      redact_entity_ids: false,
    }));
    await vi.waitFor(() => expect(viewHost._diagnosticsExportOpen).toBe(false));
    expect(viewHost._diagnosticsRedactEntityIds).toBe(true);
    expect(anchorClick).toHaveBeenCalledOnce();
    expect(append).toHaveBeenCalledWith(expect.any(HTMLAnchorElement));
    await vi.waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith("blob:test"));

    append.mockRestore();
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
    anchorClick.mockRestore();
  });

  it("shows enabled feature chips in the selected detail without Configured On rows", () => {
    const snapshot = diagnostics();
    snapshot.units["climate.warning"].configuration = {
      preconditioning: { enabled: true, room_sensor_assist_enabled: true },
      comfort: { enabled: true },
    };
    const viewHost = host(snapshot);
    viewHost._selectedDiagnosticEntity = "climate.warning";
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);

    const chips = container.querySelectorAll(".diagnostics-feature-chips > span");
    expect(chips).toHaveLength(3);
    for (const chip of chips) {
      expect(chip.getAttribute("title")).toBe(chip.textContent);
      expect(chip.getAttribute("aria-label")).toBe(chip.textContent);
    }
    expect(container.querySelector(".diagnostics-unit-identity > .diagnostics-feature-chips"))
      .not.toBeNull();
    expect(diagnosticsStyles.cssText).toContain("flex-wrap: wrap");
    expect(container.querySelector(".diagnostics-unit-list .diagnostics-feature-chips")).toBeNull();
    expect(container.querySelector(".diagnostics-function-grid")?.textContent ?? "")
      .not.toContain("diagnosticsConfigured");
  });

  it("shows Off only when disabled configuration still has residual function runtime", () => {
    const snapshot = diagnostics();
    snapshot.units["climate.warning"].configuration.preconditioning = {
      enabled: false,
      room_sensor_assist_enabled: false,
    };
    snapshot.units["climate.warning"].room_assist = { status: "holding" };
    snapshot.units["climate.warning"].preconditioning_learning = { heat: {}, cool: {} };
    const viewHost = host(snapshot);
    viewHost._selectedDiagnosticEntity = "climate.warning";
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);

    expect(container.querySelectorAll(".diagnostics-feature-chips > span")).toHaveLength(0);
    const configuredRows = [...container.querySelectorAll(".diagnostics-function dt")]
      .filter((item) => item.textContent === "diagnosticsConfigured");
    expect(configuredRows).toHaveLength(2);
    expect(container.querySelector(".diagnostics-function-grid")?.textContent)
      .toContain("diagnosticsOff");
  });

  it("filters the runtime log ephemerally and distinguishes no matches", () => {
    const snapshot = diagnostics();
    snapshot.history = [
      { at: "2026-08-18T08:00:00Z", kind: "event", category: "control", severity: "info", data: { event: "profile_changed" } },
      { at: "2026-08-18T09:00:00Z", kind: "delivery", category: "delivery", severity: "warning", entity_id: "climate.warning", data: { status: "failed" } },
    ];
    const viewHost = host(snapshot);
    viewHost._diagnosticsHistoryFilters = {
      sources: new Set(["climate.warning"]), category: "delivery", from: "", to: "",
    };
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);
    const rows = container.querySelectorAll(".diagnostics-history li");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent?.match(/Needs attention/g)).toHaveLength(1);
    expect(container.querySelectorAll(".diagnostics-history-filters > label")).toHaveLength(3);
    expect(container.querySelector(".diagnostics-clear-filters")?.classList).toContain("success");
    expect((container.querySelector(".diagnostics-clear-filters") as HTMLButtonElement).disabled).toBe(false);

    viewHost._diagnosticsHistoryFilters = {
      sources: new Set(["climate.healthy"]), category: "delivery",
      from: "2026-08-18T08:30", to: "2026-08-18T09:30",
    };
    render(renderDiagnosticsView(viewHost), container);
    expect(container.querySelector(".diagnostics-history .empty")?.textContent)
      .toContain("diagnosticsHistoryNoMatches");
    (container.querySelector(".diagnostics-clear-filters") as HTMLButtonElement).click();
    expect(viewHost._diagnosticsHistoryFilters).toEqual({
      sources: null, category: "all", from: "", to: "",
    });
  });

  it("selects multiple event sources from an accessible disclosure", () => {
    const snapshot = diagnostics();
    snapshot.history = [
      { at: "2026-08-18T08:00:00Z", kind: "event", category: "control", severity: "info", data: { event: "profile_changed" } },
      { at: "2026-08-18T09:00:00Z", kind: "delivery", category: "delivery", severity: "warning", entity_id: "climate.warning", data: { status: "failed" } },
      { at: "2026-08-18T10:00:00Z", kind: "delivery", category: "delivery", severity: "info", entity_id: "climate.healthy", data: { status: "delivered" } },
    ];
    const viewHost = host(snapshot);
    const container = document.createElement("div");
    document.body.append(container);
    render(renderDiagnosticsView(viewHost), container);

    const trigger = container.querySelector(".diagnostics-source-trigger") as HTMLButtonElement;
    expect(trigger.hasAttribute("aria-haspopup")).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    trigger.click();
    expect(viewHost._diagnosticsSourceFilterOpen).toBe(true);

    render(renderDiagnosticsView(viewHost), container);
    expect(container.querySelector("fieldset legend")?.textContent)
      .toBe("diagnosticsHistorySourcesLegend");
    const sourceInputs = () => [...container.querySelectorAll<HTMLInputElement>(
      ".diagnostics-source-popover input[type=checkbox]",
    )];
    const all = sourceInputs()[0];
    all.checked = false;
    all.dispatchEvent(new Event("change"));
    expect(viewHost._diagnosticsHistoryFilters.sources).toEqual(new Set());

    render(renderDiagnosticsView(viewHost), container);
    const velair = sourceInputs()[1];
    velair.checked = true;
    velair.dispatchEvent(new Event("change"));
    render(renderDiagnosticsView(viewHost), container);
    const warning = sourceInputs()[3];
    warning.checked = true;
    warning.dispatchEvent(new Event("change"));
    render(renderDiagnosticsView(viewHost), container);

    expect(viewHost._diagnosticsHistoryFilters.sources)
      .toEqual(new Set([VELAIR_SYSTEM_SOURCE, "climate.warning"]));
    expect(container.querySelectorAll(".diagnostics-history li")).toHaveLength(2);
    expect(container.querySelector(".diagnostics-source-trigger")?.textContent)
      .toContain("diagnosticsHistoryClimateWithVelair");

    let focusCallback: FrameRequestCallback | undefined;
    const animationFrame = vi.spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => { focusCallback = callback; return 1; });
    Object.assign(viewHost, { renderRoot: container });
    const activeTrigger = container.querySelector(".diagnostics-source-trigger") as HTMLButtonElement;
    activeTrigger.focus();
    expect(document.activeElement).toBe(activeTrigger);
    activeTrigger.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(viewHost._diagnosticsSourceFilterOpen).toBe(false);
    render(renderDiagnosticsView(viewHost), container);
    focusCallback?.(0);
    expect(document.activeElement).toBe(container.querySelector(".diagnostics-source-trigger"));
    animationFrame.mockRestore();
    container.remove();
  });

  it("uses a static full-width source disclosure with touch-sized controls on mobile", () => {
    expect(diagnosticsStyles.cssText).toContain("max-width: 100%");
    expect(diagnosticsStyles.cssText).toContain("width: min(320px, calc(100vw - 48px))");
    expect(diagnosticsStyles.cssText).toContain(".diagnostics-source-popover label span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }");
    expect(diagnosticsStyles.cssText).toContain(".diagnostics-source-popover { box-shadow: none; min-width: 0; position: static; width: 100%");
    expect(diagnosticsStyles.cssText).toContain(".diagnostics-source-popover label { min-height: 44px");
    expect(diagnosticsStyles.cssText).toContain(".diagnostics-history-message { grid-column: 1 / -1; }");
  });

  it("validates the runtime log date range and distinguishes an empty log", () => {
    const snapshot = diagnostics();
    const viewHost = host(snapshot);
    viewHost._diagnosticsHistoryFilters = {
      sources: null, category: "all", from: "2026-08-18T11:00", to: "2026-08-18T10:00",
    };
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);
    expect(container.querySelector('[role="alert"]')?.textContent)
      .toContain("diagnosticsHistoryInvalidRange");

    viewHost._diagnosticsHistoryFilters = {
      sources: null, category: "all", from: "", to: "",
    };
    render(renderDiagnosticsView(viewHost), container);
    expect(container.querySelector(".diagnostics-history .empty")?.textContent)
      .toContain("diagnosticsNoHistory");
    expect((container.querySelector(".diagnostics-clear-filters") as HTMLButtonElement).disabled).toBe(true);
    expect(container.querySelector(".diagnostics-clear-filters")?.classList).not.toContain("success");
  });

  it("renders accessible desktop log columns and resizes them with the keyboard", () => {
    const snapshot = diagnostics();
    snapshot.history = [{
      at: "2026-08-18T10:00:00Z", kind: "event", category: "control",
      severity: "info", entity_id: "climate.healthy", data: { event: "profile_changed" },
    }];
    const viewHost = host(snapshot);
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);

    expect(container.querySelectorAll(".diagnostics-history-header > span")).toHaveLength(7);
    const handles = container.querySelectorAll<HTMLElement>('[role="separator"]');
    expect(handles).toHaveLength(3);
    expect(handles[0].getAttribute("aria-orientation")).toBe("vertical");
    expect(Number(handles[0].getAttribute("aria-valuemax"))).toBeGreaterThan(150);
    expect(handles[0].getAttribute("aria-valuenow")).toBe("180");
    handles[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(viewHost._diagnosticsLogColumns.time).toBe(190);
    handles[0].dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    expect(viewHost._diagnosticsLogColumns.time).toBe(180);

    render(renderDiagnosticsView(viewHost), container);
    const resizedHandle = container.querySelector<HTMLElement>('[role="separator"]')!;
    resizedHandle.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, button: 0, clientX: 100, isPrimary: true, pointerId: 1,
    }));
    resizedHandle.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, clientX: 300, pointerId: 2,
    }));
    expect(viewHost._diagnosticsLogColumns.time).toBe(180);
    resizedHandle.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, clientX: 125, pointerId: 1,
    }));
    resizedHandle.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, pointerId: 1,
    }));
    expect(viewHost._diagnosticsLogColumns.time).toBe(205);
    resizedHandle.dispatchEvent(new KeyboardEvent("keydown", {
      key: "ArrowRight", shiftKey: true, bubbles: true,
    }));
    expect(viewHost._diagnosticsLogColumns.time).toBe(230);
    resizedHandle.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(viewHost._diagnosticsLogColumns.time).toBe(180);

    resizedHandle.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, button: 0, clientX: 100, isPrimary: true, pointerId: 3,
    }));
    resizedHandle.dispatchEvent(new PointerEvent("lostpointercapture", {
      bubbles: true, pointerId: 3,
    }));
    resizedHandle.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, clientX: 200, pointerId: 3,
    }));
    expect(viewHost._diagnosticsLogColumns.time).toBe(180);

    resizedHandle.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, button: 0, clientX: 100, isPrimary: true, pointerId: 4,
    }));
    resizedHandle.dispatchEvent(new PointerEvent("pointercancel", {
      bubbles: true, pointerId: 4,
    }));
    resizedHandle.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, clientX: 200, pointerId: 4,
    }));
    expect(viewHost._diagnosticsLogColumns.time).toBe(180);
  });

  it("keeps separator aria ranges coherent with narrow and wide container widths", () => {
    const snapshot = diagnostics();
    snapshot.history = [{
      at: "2026-08-18T10:00:00Z", kind: "event", category: "control",
      severity: "info", data: { event: "profile_changed" },
    }];
    const viewHost = host(snapshot);
    const container = document.createElement("div");
    for (const width of [700, 1_100]) {
      viewHost._diagnosticsLogAvailableWidth = diagnosticsLogContentWidth(width);
      viewHost._diagnosticsLogColumns = fitDiagnosticsLogColumns(
        DEFAULT_DIAGNOSTICS_LOG_COLUMNS,
        diagnosticsLogContentWidth(width),
      );
      render(renderDiagnosticsView(viewHost), container);
      for (const handle of container.querySelectorAll<HTMLElement>('[role="separator"]')) {
        expect(Number(handle.getAttribute("aria-valuenow")))
          .toBeLessThanOrEqual(Number(handle.getAttribute("aria-valuemax")));
      }
    }
  });

  it("renders sensor magnitudes with reported and purpose fallback units", () => {
    const snapshot = diagnostics();
    snapshot.units["climate.warning"].sensors = [
      { purpose: "comfort_temperature", entity_id: "sensor.room_c", state: "21.5" },
      { purpose: "outdoor_temperature", entity_id: "sensor.outdoor_f", state: "71" },
      { purpose: "comfort_humidity", entity_id: "sensor.humidity", state: "48" },
      { purpose: "comfort_co2", entity_id: "sensor.co2", state: "650" },
    ];
    const viewHost = host(snapshot);
    viewHost._selectedDiagnosticEntity = "climate.warning";
    viewHost.hass = {
      states: {
        "sensor.room_c": { state: "21.5", attributes: { unit_of_measurement: "°C" } },
        "sensor.outdoor_f": { state: "71", attributes: { unit_of_measurement: "°F" } },
        "sensor.humidity": { state: "48", attributes: {} },
        "sensor.co2": { state: "650", attributes: {} },
      },
    } as VelairViewHost["hass"];
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);
    const sensors = container.querySelector(".diagnostics-sensors")?.textContent ?? "";
    expect(sensors).toContain("21.5 °C");
    expect(sensors).toContain("71 °F");
    expect(sensors).toContain("48 %");
    expect(sensors).toContain("650 ppm");
    expect(container.querySelectorAll(".diagnostics-sensor-detail")).toHaveLength(4);
    expect(container.querySelectorAll(".diagnostics-sensor-value")).toHaveLength(4);
    expect(container.querySelector(".diagnostics-sensor-detail ha-icon")).not.toBeNull();
  });

  it("uses restrained semantic chips for HVAC modes and delivery status", () => {
    const snapshot = diagnostics();
    snapshot.units["climate.warning"].capabilities.hvac_modes = ["heat", "cool", "off"];
    snapshot.units["climate.warning"].delivery.status = "success";
    const viewHost = host(snapshot);
    viewHost._selectedDiagnosticEntity = "climate.warning";
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);

    expect(container.querySelector(".diagnostics-state-chip.success")?.textContent)
      .toContain("diagnosticsDeliverySuccess");
    expect(container.querySelectorAll(".diagnostics-mode-list .mode-chip")).toHaveLength(3);
    expect(container.querySelector(".diagnostics-mode-list .mode-heat")).not.toBeNull();
    expect(container.querySelector(".diagnostics-mode-list .mode-cool")).not.toBeNull();
    expect(container.querySelector(".diagnostics-mode-list .mode-off")).not.toBeNull();
  });

  it("localizes unavailable, unknown and missing climate states without empty mode rows", () => {
    const snapshot = diagnostics();
    snapshot.units["climate.warning"].state = "unavailable";
    snapshot.units["climate.warning"].capabilities.hvac_modes = [];
    const viewHost = host(snapshot);
    viewHost._selectedDiagnosticEntity = "climate.warning";
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);

    expect(container.querySelector(".diagnostics-state-chip.warning")?.textContent)
      .toContain("roomSensorStatusUnavailable");
    expect(container.textContent).not.toContain("diagnosticsHvacModes");

    snapshot.units["climate.warning"].state = "unknown";
    render(renderDiagnosticsView(viewHost), container);
    expect(container.querySelector(".diagnostics-state-chip.warning")?.textContent)
      .toContain("diagnosticsEntityUnknown");

    snapshot.units["climate.warning"].state = "missing";
    viewHost._t = ((key: keyof typeof es) => String(es[key] ?? key)) as VelairViewHost["_t"];
    render(renderDiagnosticsView(viewHost), container);
    expect(container.querySelector(".diagnostics-state-chip.error")?.textContent)
      .toContain(es.entityDiagnosticMissing);
  });

  it("selects a climate without scheduling automatic scrolling", () => {
    const requestAnimationFrame = vi.spyOn(window, "requestAnimationFrame");
    const viewHost = host();
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);
    (container.querySelector(".diagnostics-unit-option") as HTMLButtonElement).click();
    expect(viewHost._selectedDiagnosticEntity).toBe("climate.healthy");
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("localizes operational codes instead of exposing backend text", () => {
    const snapshot = diagnostics();
    const diagnosticUnit = snapshot.units["climate.warning"];
    diagnosticUnit.effective_setup.schedule_source = "profile_pause";
    diagnosticUnit.override = { action: "turn_off" };
    diagnosticUnit.delivery.last_error = { code: "service_call_failed", message: "raw backend failure" };
    diagnosticUnit.delivery.retry_count = 1000;
    snapshot.history = [{
      at: "2026-08-18T10:00:00Z", kind: "delivery", category: "delivery",
      severity: "info", entity_id: "climate.warning",
      data: { status: "cancelled", reason: "replaced" },
    }];
    const viewHost = host(snapshot); viewHost._selectedDiagnosticEntity = "climate.warning";
    viewHost._t = ((key: keyof typeof es) => String(es[key] ?? key)) as VelairViewHost["_t"];
    viewHost._language = () => "de";
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);
    const text = container.textContent ?? "";
    expect(text).toContain(es.diagnosticsScheduleSourceProfilePause);
    expect(text).toContain(es.diagnosticsOverrideTurnOff);
    expect(text).toContain(es.diagnosticsDeliveryFailed);
    expect(text).toContain("Sustituido por una solicitud más reciente");
    expect(text).toContain("1.000");
    expect(text).not.toMatch(/profile_pause|turn_off|service_call_failed|raw backend|replaced/);
  });

  it("localizes empty overrides and stopped deliveries in German", () => {
    const snapshot = diagnostics();
    snapshot.units["climate.warning"].override = { status: "none" };
    snapshot.units["climate.warning"].intent = { state: "stopped" };
    snapshot.history = [{
      at: "2026-08-18T10:00:00Z", kind: "delivery", category: "delivery",
      severity: "info", entity_id: "climate.warning",
      data: { status: "cancelled", reason: "stopped" },
    }];
    const viewHost = host(snapshot);
    viewHost._selectedDiagnosticEntity = "climate.warning";
    viewHost._t = ((key: keyof typeof de) => String(de[key] ?? key)) as VelairViewHost["_t"];
    viewHost._language = () => "de";
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);
    const text = container.textContent ?? "";
    expect(text).toContain("Keine");
    expect(text).toContain("Gestoppt");
    expect(text).not.toMatch(/\bnone\b|\bstopped\b/);
  });

  it("uses climate state icons and a dedicated successful delivery label", () => {
    const snapshot = diagnostics();
    snapshot.units["climate.warning"].delivery.status = "success";
    const viewHost = host(snapshot);
    viewHost._selectedDiagnosticEntity = "climate.warning";
    viewHost.hass = {
      states: {
        "climate.warning": { state: "heat", attributes: {} },
      },
    } as VelairViewHost["hass"];
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);

    expect(container.querySelector("ha-state-icon.diagnostics-climate-icon")).not.toBeNull();
    expect(container.textContent).toContain("diagnosticsDeliverySuccess");
    expect(container.querySelector(".diagnostics-ok")).toBeNull();
    expect(container.querySelectorAll(".diagnostics-group h4 ha-icon").length).toBeGreaterThan(1);
  });

  it("shows safe feature evidence in retained history", () => {
    const snapshot = diagnostics();
    snapshot.history = [
      {
        at: "2026-08-18T10:00:00Z", kind: "event", category: "room_assist",
        severity: "info", entity_id: "climate.warning",
        data: {
          event: "room_sensor_assist_updated", direction: "heat",
          target_temperature: 22, applied_temperature: 19.5,
          room_temperature: 21, climate_temperature: 20,
        },
      },
      {
        at: "2026-08-18T10:01:00Z", kind: "event", category: "preconditioning",
        severity: "info", entity_id: "climate.warning",
        data: {
          event: "preconditioning_plan_updated", direction: "cool", lead_minutes: 35,
          model_source: "history", target_temperature: 23,
        },
      },
      {
        at: "2026-08-18T10:02:00Z", kind: "event", category: "comfort",
        severity: "info", entity_id: "climate.warning",
        data: {
          event: "comfort_assessment_changed", condition: "comfortable",
          air_quality: "good", data_quality: "complete",
        },
      },
      {
        at: "2026-08-18T10:03:00Z", kind: "event", category: "preconditioning",
        severity: "info", entity_id: "climate.warning",
        data: { event: "preconditioning_plan_cancelled" },
      },
      {
        at: "2026-08-18T10:04:00Z", kind: "event", category: "preconditioning",
        severity: "info", entity_id: "climate.warning",
        data: { event: "preconditioning_observation_recorded" },
      },
      {
        at: "2026-08-18T10:05:00Z", kind: "event", category: "room_assist",
        severity: "info", entity_id: "climate.warning",
        data: { event: "room_sensor_assist_restored" },
      },
      {
        at: "2026-08-18T10:06:00Z", kind: "event", category: "room_assist",
        severity: "info", entity_id: "climate.warning",
        data: { event: "room_sensor_assist_state_changed" },
      },
    ];
    const container = document.createElement("div");
    render(renderDiagnosticsView(host(snapshot)), container);
    const rows = [...container.querySelectorAll(".diagnostics-history li")]
      .map((row) => row.textContent ?? "");

    expect(rows[0]).toContain("roomSensorAppliedTarget: 19.5 °C");
    expect(rows[0]).toContain("diagnosticsEventRoomAssistUpdated");
    expect(rows[0]).toContain("roomSensorRoomTemperature: 21 °C");
    expect(rows[0]).toContain("roomSensorClimateTemperature: 20 °C");
    expect(rows[0]).not.toContain("22 °C");
    expect(rows[1]).toContain("preconditioningLeadTime");
    expect(rows[1]).toContain("diagnosticsEventPreconditioningPlanUpdated");
    expect(rows[1]).toContain("preconditioningModelHistory");
    expect(rows[1]).toContain("23 °C");
    expect(rows[2]).toContain("comfortConditionComfortable");
    expect(rows[2]).toContain("diagnosticsEventComfortAssessmentChanged");
    expect(rows[2]).toContain("comfortAirQualityGood");
    expect(rows[2]).toContain("comfortCurrentReadings");
    expect(rows[3]).toContain("diagnosticsEventPreconditioningPlanCancelled");
    expect(rows[4]).toContain("diagnosticsEventPreconditioningObservationRecorded");
    expect(rows[5]).toContain("diagnosticsEventRoomAssistRestored");
    expect(rows[6]).toContain("diagnosticsEventRoomAssistStateChanged");
  });

  it("localizes scheduler context and keeps control and availability evidence readable", () => {
    const snapshot = diagnostics();
    snapshot.history = [
      {
        at: "2026-08-18T10:00:00Z", kind: "event", category: "control",
        severity: "info", entity_id: "climate.warning",
        data: { event: "schedule_block_applied", hvac_mode: "heat", temperature: 20 },
      },
      {
        at: "2026-08-18T10:01:00Z", kind: "event", category: "availability",
        severity: "warning", entity_id: "climate.warning",
        data: { state: "unavailable" },
      },
    ];
    const container = document.createElement("div");
    render(renderDiagnosticsView(host(snapshot)), container);

    expect(container.querySelector(".diagnostics-summary")?.textContent)
      .toContain("diagnosticsSchedulerSummary");
    const rows = [...container.querySelectorAll(".diagnostics-history li")]
      .map((row) => row.textContent ?? "");
    expect(rows[0]).toContain("Schedule block applied");
    expect(rows[0]).toContain("20 °C");
    expect(rows[1]).toContain("roomSensorStatusUnavailable");
  });

  it("summarizes external adjustments and Automatic/Manual control changes", () => {
    const snapshot = diagnostics();
    snapshot.history = [
      {
        at: "2026-08-20T10:00:00Z", kind: "event", category: "control",
        severity: "info", entity_id: "climate.warning",
        data: {
          event: "external_climate_change_detected",
          changed_fields: ["temperature"],
          previous: { temperature: 20 }, current: { temperature: 22 },
          policy: "keep_automatic",
        },
      },
      {
        at: "2026-08-20T10:01:00Z", kind: "event", category: "control",
        severity: "info", entity_id: "climate.warning",
        data: {
          event: "external_climate_change_detected",
          changed_fields: ["target_temp_low", "target_temp_high"],
          previous: { target_temp_low: 20, target_temp_high: 24 },
          current: { target_temp_low: 19, target_temp_high: 25 },
          policy: "until_resumed",
        },
      },
      {
        at: "2026-08-20T10:02:00Z", kind: "event", category: "control",
        severity: "info", entity_id: "climate.warning",
        data: {
          event: "external_climate_change_detected", changed_fields: ["hvac_mode"],
          previous: { hvac_mode: "heat" }, current: { hvac_mode: "cool" },
        },
      },
      {
        at: "2026-08-20T10:03:00Z", kind: "event", category: "control",
        severity: "info", entity_id: "climate.warning",
        data: {
          event: "zone_control_changed", previous_control_mode: "automatic",
          control_mode: "manual", policy: "for_duration", duration_minutes: 60,
          until: "2026-08-20T11:03:00Z",
        },
      },
      {
        at: "2026-08-20T10:04:00Z", kind: "event", category: "control",
        severity: "info", entity_id: "climate.warning",
        data: {
          event: "zone_control_changed", previous_control_mode: "manual",
          control_mode: "automatic", reason: "resumed",
        },
      },
    ];
    const viewHost = host(snapshot);
    viewHost._t = ((key: string, replacements?: Record<string, string>) =>
      `${key}${replacements ? ` ${Object.values(replacements).join(" ")}` : ""}`) as VelairViewHost["_t"];
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);
    const rows = [...container.querySelectorAll(".diagnostics-history li")]
      .map((row) => row.textContent ?? "");

    expect(rows[0]).toContain("diagnosticsEventExternalAdjustment");
    expect(rows[0]).toContain("diagnosticsTargetChanged 20 °C 22 °C");
    expect(rows[0]).toContain("externalChangeKeepAutomatic");
    expect(rows[1]).toContain("diagnosticsRangeChanged 20 °C – 24 °C 19 °C – 25 °C");
    expect(rows[2]).toContain("diagnosticsHvacModeChanged heat cool");
    expect(rows[3]).toContain("diagnosticsEventZoneControlChanged");
    expect(rows[3]).toContain("diagnosticsControlChanged diagnosticsControlAutomatic diagnosticsControlManual");
    expect(rows[3]).toContain("manualSessionDuration 60");
    expect(rows[3]).toContain("diagnosticsUntil 2026-08-20T11:03:00Z");
    expect(rows[4]).toContain("diagnosticsReasonResumed");
  });

  it("keeps one-sided range adjustments readable without inventing a full range", () => {
    const snapshot = diagnostics();
    snapshot.history = [
      {
        at: "2026-08-20T10:00:00Z", kind: "event", category: "control",
        severity: "info", entity_id: "climate.warning",
        data: {
          event: "external_climate_change_detected", changed_fields: ["target_temp_low"],
          previous: { target_temp_low: 20 }, current: { target_temp_low: 19 },
        },
      },
      {
        at: "2026-08-20T10:01:00Z", kind: "event", category: "control",
        severity: "info", entity_id: "climate.warning",
        data: {
          event: "external_climate_change_detected", changed_fields: ["target_temp_high"],
          previous: { target_temp_high: 24 }, current: { target_temp_high: 25 },
        },
      },
      {
        at: "2026-08-20T10:02:00Z", kind: "event", category: "control",
        severity: "info", entity_id: "climate.warning",
        data: {
          event: "external_climate_change_detected",
          changed_fields: ["target_temp_low", "target_temp_high"],
          previous: { target_temp_low: 20, target_temp_high: 24 },
          current: { target_temp_low: 19, target_temp_high: 25 },
        },
      },
    ];
    const viewHost = host(snapshot);
    viewHost._t = ((key: string, replacements?: Record<string, string>) =>
      `${key}${replacements ? ` ${Object.values(replacements).join(" ")}` : ""}`) as VelairViewHost["_t"];
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);
    const rows = [...container.querySelectorAll(".diagnostics-history li")]
      .map((row) => row.textContent ?? "");

    expect(rows[0]).toContain("diagnosticsLowerTargetChanged 20 °C 19 °C");
    expect(rows[0]).not.toContain("diagnosticsRangeChanged");
    expect(rows[1]).toContain("diagnosticsUpperTargetChanged 24 °C 25 °C");
    expect(rows[1]).not.toContain("diagnosticsRangeChanged");
    expect(rows[2]).toContain("diagnosticsRangeChanged 20 °C – 24 °C 19 °C – 25 °C");
    expect(rows[2]).not.toContain("diagnosticsLowerTargetChanged");
    expect(rows[2]).not.toContain("diagnosticsUpperTargetChanged");
  });

  it("prefixes the calculated intent with Manual or Automatic ownership", () => {
    const snapshot = diagnostics();
    snapshot.units["climate.warning"].intent = {
      control_mode: "manual", state: "paused", hvac_mode: "cool", temperature: 23,
    };
    const viewHost = host(snapshot);
    viewHost._selectedDiagnosticEntity = "climate.warning";
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);
    const calculated = [...container.querySelectorAll(".diagnostics-rows > div")]
      .find((row) => row.textContent?.includes("diagnosticsCalculatedIntent"));
    expect(calculated?.textContent).toContain("diagnosticsControlManual");
    expect(calculated?.textContent).toContain("status:paused");
    expect(calculated?.textContent).toContain("cool");
    expect(calculated?.textContent).toContain("23 °C");
  });

  it("shows control event types once instead of repeating them in the message", () => {
    const snapshot = diagnostics();
    snapshot.history = [
      {
        at: "2026-08-18T10:00:00Z", kind: "event", category: "control",
        severity: "info", data: { event: "profile_changed" },
      },
      {
        at: "2026-08-18T10:01:00Z", kind: "event", category: "control",
        severity: "info", data: { event: "scheduler_mode_changed" },
      },
      {
        at: "2026-08-18T10:02:00Z", kind: "event", category: "control",
        severity: "info", data: { event: "boost_started" },
      },
    ];
    const viewHost = host(snapshot);
    viewHost._t = ((key: keyof typeof es) => String(es[key] ?? key)) as VelairViewHost["_t"];
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);
    const rows = [...container.querySelectorAll(".diagnostics-history li")];
    const labels = [
      es.diagnosticsEventProfileChanged,
      es.diagnosticsEventSchedulerModeChanged,
      es.diagnosticsEventBoostStarted,
    ];
    rows.forEach((row, index) => {
      expect((row.textContent ?? "").split(labels[index])).toHaveLength(2);
    });
  });

  it("localizes known diagnostic identifiers in Spanish and humanizes future values", () => {
    const snapshot = diagnostics();
    snapshot.history = [
      {
        at: "2026-08-18T10:00:00Z", kind: "event", category: "preconditioning",
        severity: "info", entity_id: "climate.warning",
        data: { event: "preconditioning_plan_cancelled", reason: "scheduler_not_auto" },
      },
      {
        at: "2026-08-18T10:01:00Z", kind: "event", category: "control",
        severity: "info", entity_id: "climate.warning",
        data: { event: "zone_paused", reason: "future_reason_code" },
      },
    ];
    const spanishHost = host(snapshot);
    spanishHost._t = ((key: keyof typeof es) => String(es[key] ?? key)) as VelairViewHost["_t"];
    const container = document.createElement("div");
    render(renderDiagnosticsView(spanishHost), container);
    const rows = [...container.querySelectorAll(".diagnostics-history li")]
      .map((row) => row.textContent ?? "");

    expect(rows[0]).toContain("El planificador no está en modo Automático");
    expect(rows[0]).not.toContain("scheduler_not_auto");
    expect(rows[1]).toContain("Zona pausada");
    expect(rows[1]).toContain("Future reason code");
    expect(rows[1]).not.toMatch(/zone_paused|future_reason_code/);
  });

  it("localizes every current backend reason and control operation", () => {
    const reasons = [
      ["assist_disabled", "diagnosticsReasonAssistDisabled"],
      ["boost_started", "diagnosticsEventBoostStarted"],
      ["cancelled", "operationCancelled"],
      ["current_schedule", "diagnosticsReasonCurrentSchedule"],
      ["data_reset", "diagnosticsReasonDataReset"],
      ["expired", "diagnosticsReasonExpired"],
      ["manual", "diagnosticsReasonManual"],
      ["manual_target", "diagnosticsReasonManualTarget"],
      ["missing_target", "diagnosticsReasonMissingTarget"],
      ["missing_target_step", "diagnosticsReasonMissingTargetStep"],
      ["missing_temperature", "diagnosticsReasonMissingTemperature"],
      ["no_active_target", "diagnosticsReasonNoActiveTarget"],
      ["no_longer_planned", "diagnosticsReasonNoLongerPlanned"],
      ["not_auto", "diagnosticsReasonSchedulerNotAuto"],
      ["portable_import", "diagnosticsReasonPortableImport"],
      ["profile_changed", "diagnosticsEventProfileChanged"],
      ["replaced", "diagnosticsReasonReplaced"],
      ["schedule_changed", "diagnosticsReasonScheduleChanged"],
      ["schedule_cleared", "diagnosticsReasonScheduleCleared"],
      ["scheduler_mode_changed", "diagnosticsEventSchedulerModeChanged"],
      ["scheduler_not_auto", "diagnosticsReasonSchedulerNotAuto"],
      ["scheduler_stopped", "diagnosticsReasonSchedulerStopped"],
      ["settings_updated", "diagnosticsReasonSettingsUpdated"],
      ["stopped", "diagnosticsReasonStopped"],
      ["temperature_migration", "diagnosticsReasonTemperatureMigration"],
      ["turn_off", "diagnosticsOverrideTurnOff"],
      ["unsupported_mode", "diagnosticsReasonUnsupportedMode"],
      ["unsupported_temperature_range", "diagnosticsReasonUnsupportedTemperatureRange"],
      ["zone_paused", "diagnosticsEventZonePaused"],
      ["zone_unavailable", "diagnosticsReasonZoneUnavailable"],
    ] as const;
    const operations = [
      ["turn_off", "diagnosticsOverrideTurnOff"],
      ["none", "diagnosticsNone"],
      ["added", "diagnosticsOperationAdded"],
      ["updated", "diagnosticsOperationUpdated"],
      ["removed", "diagnosticsOperationRemoved"],
      ["set_temperature", "diagnosticsOperationSetTemperature"],
    ] as const;
    const snapshot = diagnostics();
    snapshot.history = [
      ...reasons.map(([reason], index) => ({
        at: `2026-08-18T10:${String(index).padStart(2, "0")}:00Z`,
        kind: "event" as const,
        category: "control" as const,
        severity: "info" as const,
        entity_id: "climate.warning",
        data: { reason },
      })),
      ...operations.map(([operation], index) => ({
        at: `2026-08-18T11:${String(index).padStart(2, "0")}:00Z`,
        kind: "event" as const,
        category: "control" as const,
        severity: "info" as const,
        entity_id: "climate.warning",
        data: { operation },
      })),
    ];
    const spanishHost = host(snapshot);
    spanishHost._t = ((key: keyof typeof es) => String(es[key] ?? key)) as VelairViewHost["_t"];
    spanishHost._language = () => "es";
    const container = document.createElement("div");
    render(renderDiagnosticsView(spanishHost), container);
    const text = container.textContent ?? "";

    for (const [, translationKey] of [...reasons, ...operations]) {
      expect(text).toContain(es[translationKey]);
    }
    for (const [identifier] of [...reasons, ...operations]) {
      if (identifier.includes("_")) expect(text).not.toContain(identifier);
    }
  });
});

describe("diagnostics view delivery confirmation", () => {
  it("shows the readback outcome and attempt count for a selected climate", () => {
    const snapshot = diagnostics();
    snapshot.units["climate.warning"].delivery = {
      status: "unconfirmed",
      retry_count: 0,
      last_error: null,
      confirmation: {
        outcome: "unconfirmed",
        attempts: 3,
        confirmed_at: null,
        last_attempt_at: "2026-08-18T10:05:00Z",
      },
    };
    snapshot.units["climate.warning"].issues = [{ severity: "warning", code: "delivery_unconfirmed" }];
    const viewHost = host(snapshot);
    viewHost._selectedDiagnosticEntity = "climate.warning";
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);

    const panel = container.querySelector(".diagnostics-detail-panel")?.textContent ?? "";
    expect(panel).toContain("diagnosticsDeliveryConfirmation");
    expect(panel).toContain("diagnosticsDeliveryUnconfirmed");
    expect(panel).toContain("2026-08-18T10:05:00Z");
    expect(panel).toContain("diagnosticsDeliveryAttempts");
    expect(container.querySelector(".diagnostics-detail-panel .diagnostics-issue")?.textContent)
      .toContain("diagnosticsDeliveryUnconfirmed");
    expect(container.querySelector(".diagnostics-state-chip.warning")?.textContent?.trim())
      .toBe("diagnosticsDeliveryUnconfirmed");
  });

  it("shows a pending confirmation and confirmed evidence with their timestamps", () => {
    const snapshot = diagnostics();
    snapshot.units["climate.healthy"].delivery = {
      status: "confirmed",
      retry_count: 0,
      confirmation: { outcome: "confirmed", attempts: 2, confirmed_at: "2026-08-18T10:06:00Z", last_attempt_at: "2026-08-18T10:05:30Z" },
    };
    snapshot.units["climate.warning"].delivery = {
      status: "confirming",
      retry_count: 0,
      confirmation: { outcome: "pending", attempts: 1, confirmed_at: null, last_attempt_at: "2026-08-18T10:05:00Z" },
    };
    const viewHost = host(snapshot);
    viewHost._selectedDiagnosticEntity = "climate.healthy";
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);
    const confirmed = container.querySelector(".diagnostics-detail-panel")?.textContent ?? "";
    expect(confirmed).toContain("diagnosticsDeliveryConfirmed");
    expect(confirmed).toContain("2026-08-18T10:06:00Z");
    expect(container.querySelector(".diagnostics-state-chip.success")?.textContent?.trim())
      .toBe("diagnosticsDeliveryConfirmed");

    viewHost._selectedDiagnosticEntity = "climate.warning";
    render(renderDiagnosticsView(viewHost), container);
    const pending = container.querySelector(".diagnostics-detail-panel")?.textContent ?? "";
    expect(pending).toContain("diagnosticsDeliveryConfirming");
    expect(pending).toContain("2026-08-18T10:05:00Z");
  });

  it("omits confirmation rows when a climate has no readback evidence", () => {
    const viewHost = host();
    viewHost._selectedDiagnosticEntity = "climate.healthy";
    const container = document.createElement("div");
    render(renderDiagnosticsView(viewHost), container);

    const panel = container.querySelector(".diagnostics-detail-panel")?.textContent ?? "";
    expect(panel).not.toContain("diagnosticsDeliveryConfirmation");
    expect(panel).not.toContain("diagnosticsDeliveryAttempts");
  });

  it("describes confirmation attempts and outcomes in the runtime log", () => {
    const snapshot = diagnostics();
    snapshot.history = [
      {
        at: "2026-08-18T10:05:00Z", kind: "delivery", category: "delivery", severity: "info",
        entity_id: "climate.warning",
        data: { status: "confirming", attempt: 2, attempts: 3, requested: { hvac_mode: "heat", temperature: 21 } },
      },
      {
        at: "2026-08-18T10:06:00Z", kind: "delivery", category: "delivery", severity: "warning",
        entity_id: "climate.warning",
        data: {
          status: "unconfirmed", attempts: 3,
          requested: { hvac_mode: "heat", temperature: 21 },
          observed: { hvac_mode: "heat", temperature: 18 },
        },
      },
    ];
    const container = document.createElement("div");
    render(renderDiagnosticsView(host(snapshot)), container);

    const log = container.querySelector(".diagnostics-history")?.textContent ?? "";
    expect(log).toContain("diagnosticsDeliveryConfirming");
    expect(log).toContain("diagnosticsDeliveryAttemptOf");
    expect(log).toContain("diagnosticsDeliveryUnconfirmed");
    expect(log).toContain("diagnosticsDeliveryAttempts: 3");
    expect(log).toContain("diagnosticsCurrentState: heat 18 °C");
    expect(log).toContain("21 °C");
  });

  it("localizes the confirmation catalogue", () => {
    expect(es.diagnosticsDeliveryUnconfirmed).not.toBe(en.diagnosticsDeliveryUnconfirmed);
    expect(de.diagnosticsDeliveryConfirmed).toBe("Vom Klimagerät bestätigt");
    expect(en.diagnosticsDeliveryAttemptOf).toBe("Attempt {attempt} of {attempts}");
  });
});
