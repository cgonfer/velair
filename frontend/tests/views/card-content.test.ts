// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";

import type { VelairViewHost } from "../../src/velair/host-types";
import { noticeStyles } from "../../src/velair/styles/notice-styles";
import { renderCardContent } from "../../src/velair/views/card-content";

describe("card content", () => {
  it("stacks simultaneous operational error and success notices with distinct live roles", () => {
    const container = document.createElement("div");
    const host = {
      _data: undefined,
      _dismissNotice: vi.fn(),
      _effectiveView: () => "overview",
      _error: "Could not save",
      _hasExternalConfig: false,
      _loading: false,
      _noticeStackEntries: () => [
        { id: "success", type: "success", message: "Previous change saved" },
        { id: "error", type: "error", message: "Could not save" },
      ],
      _orderedZoneIds: (ids: string[]) => ids,
      _saveMessage: "Previous change saved",
      _schedulerMenuOpen: false,
      _showInitialLoading: false,
      _successNoticeProgress: () => 60,
      _t: (key: string) => key,
      _visibleZoneIds: (ids: string[]) => ids,
    } as unknown as VelairViewHost;

    render(renderCardContent(host), container);

    const stack = container.querySelector(".notice-stack.floating");
    expect(stack?.querySelectorAll(".notice-row")).toHaveLength(2);
    expect(stack?.querySelector('[role="alert"]')?.textContent).toContain("Could not save");
    expect(stack?.querySelector('[role="status"]')?.textContent).toContain("Previous change saved");
  });

  it("finishes a leaving success notice progress bar at zero", () => {
    const container = document.createElement("div");
    const host = {
      _data: undefined,
      _dismissNotice: vi.fn(),
      _effectiveView: () => "overview",
      _hasExternalConfig: false,
      _loading: false,
      _noticeStackEntries: () => [
        { id: "success", type: "success", message: "Saved", phase: "leaving" },
      ],
      _orderedZoneIds: (ids: string[]) => ids,
      _schedulerMenuOpen: false,
      _showInitialLoading: false,
      _successNoticeProgress: () => 60,
      _t: (key: string) => key,
      _visibleZoneIds: (ids: string[]) => ids,
    } as unknown as VelairViewHost;

    render(renderCardContent(host), container);

    expect(container.querySelector<HTMLElement>(".notice-progress-fill")?.style.width).toBe("0%");
  });

  it("preserves the remaining notice DOM identity while another row leaves", () => {
    const container = document.createElement("div");
    let entries = [
      { id: "success", type: "success" as const, message: "Saved", phase: "active" as const },
      { id: "error", type: "error" as const, message: "Could not save", phase: "active" as const },
    ];
    const host = {
      _data: undefined,
      _dismissNotice: vi.fn(),
      _effectiveView: () => "overview",
      _hasExternalConfig: false,
      _loading: false,
      _noticeStackEntries: () => entries,
      _orderedZoneIds: (ids: string[]) => ids,
      _schedulerMenuOpen: false,
      _showInitialLoading: false,
      _successNoticeProgress: () => 60,
      _t: (key: string) => key,
      _visibleZoneIds: (ids: string[]) => ids,
    } as unknown as VelairViewHost;

    render(renderCardContent(host), container);
    const alert = container.querySelector('[role="alert"]');
    entries = [
      { id: "success", type: "success", message: "Saved", phase: "leaving" },
      { id: "error", type: "error", message: "Could not save", phase: "active" },
    ];
    render(renderCardContent(host), container);

    expect(container.querySelector('[role="alert"]')).toBe(alert);
    expect([...container.querySelectorAll(".notice-row")].map((row) => row.getAttribute("data-notice-id")))
      .toEqual(["success", "error"]);
  });

  it("keeps notice positioning on one responsive stack and respects reduced motion", () => {
    const cssText = noticeStyles.cssText;
    expect(cssText).toMatch(/\.notice-stack\.floating\s*\{[^}]*bottom:\s*max\(16px, env\(safe-area-inset-bottom\)\)/);
    expect(cssText).toMatch(/\.notice-stack\s*\{[^}]*max-width:\s*min\(520px, calc\(100vw - 32px\)\)/);
    expect(cssText).toMatch(/\.notice-row\.leaving\s*\{[^}]*grid-template-rows:\s*0fr[^}]*opacity:\s*0/);
    expect(cssText).toMatch(/\.notice-row\.entering\s*\{[^}]*grid-template-rows:\s*0fr[^}]*opacity:\s*0/);
    expect(cssText).toMatch(/\.notice\s*>\s*span\s*\{[^}]*min-width:\s*0[^}]*overflow-wrap:\s*anywhere/);
    expect(cssText).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*transition-duration:\s*0ms/);
    expect(cssText).not.toMatch(/\.notice\.error\s*\{[^}]*bottom:/);
  });

  it("shows the branded initial state only after its loading delay is released", () => {
    const container = document.createElement("div");
    const host = {
      _data: undefined,
      _effectiveView: () => "overview",
      _error: undefined,
      _hasExternalConfig: false,
      _loading: true,
      _orderedZoneIds: (ids: string[]) => ids,
      _noticeStackEntries: () => [],
      _saveMessage: undefined,
      _schedulerMenuOpen: false,
      _showInitialLoading: false,
      _t: (key: string) => key,
      _visibleZoneIds: (ids: string[]) => ids,
    } as unknown as VelairViewHost;

    render(renderCardContent(host), container);
    expect(container.querySelector(".initial-loading")).toBeNull();
    expect(container.querySelector(".notice")).toBeNull();

    host._showInitialLoading = true;
    render(renderCardContent(host), container);

    const loading = container.querySelector(".initial-loading");
    const logo = loading?.querySelector("img");
    expect(loading?.getAttribute("role")).toBe("status");
    expect(loading?.textContent).toContain("Velair");
    expect(loading?.textContent).toContain("loading");
    expect(logo?.getAttribute("src")).toBe("/velair_frontend/velair-icon.png");
    expect(logo?.getAttribute("alt")).toBe("");
  });

  it("hides operation status from Lovelace views other than Active setup", () => {
    const container = document.createElement("div");
    const host = {
      _canResumeScheduler: () => false,
      _config: { active_setup_controls: "profiles" },
      _hasExternalConfig: true,
      _data: {
        configured_entities: [],
        global: { mode: "auto", active_profile_ids: [] },
        next_events: [],
        operation_status: {
          id: "operation-1",
          kind: "profile_activation",
          state: "running",
          target_id: null,
          completed: 0,
          total: 0,
          failed_entity_ids: [],
          started_at: "2026-07-29T12:00:00+00:00",
          finished_at: null,
        },
        operational_status: "running",
        profiles: [],
        temperature_migration: { required: false },
        zones: {},
      },
      _effectiveView: () => "overview-status",
      _entityTemperatureLimits: () => [5, 35],
      _entityTemperatureStep: () => 0.5,
      _friendlyEntityName: (entityId: string) => entityId,
      _inputValue: (event: Event) => (event.currentTarget as HTMLInputElement).value,
      _orderedZoneIds: (ids: string[]) => ids,
      _pauseDurationMinutes: 60,
      _pauseExpirationMs: () => undefined,
      _pauseScheduler: async () => undefined,
      _resumeScheduler: async () => undefined,
      _t: (key: string) => key,
      _visibleZoneIds: (ids: string[]) => ids,
    } as unknown as VelairViewHost;

    render(renderCardContent(host), container);

    const summary = container.querySelector(".overview-summary");
    const operation = container.querySelector(".operation-status");
    const profiles = container.querySelector("velair-profiles-view");
    expect(summary).not.toBeNull();
    expect(operation).toBeNull();
    expect(profiles).toBeNull();
  });

  it("renders operation status in the Lovelace Active setup card", () => {
    const container = document.createElement("div");
    const host = {
      _config: { active_setup_controls: "profiles" },
      _hasExternalConfig: true,
      _data: {
        configured_entities: [],
        global: { mode: "auto", active_profile_ids: [] },
        operation_status: {
          id: "operation-2",
          kind: "mode_change",
          state: "running",
          target_id: "default",
          completed: 0,
          total: 0,
          failed_entity_ids: [],
          started_at: "2026-07-29T12:00:00+00:00",
          finished_at: null,
        },
        profiles: [],
        temperature_migration: { required: false },
        zones: {},
      },
      _dismissOperationStatus: () => undefined,
      _effectiveView: () => "active-setup",
      _entityTemperatureLimits: () => [5, 35],
      _entityTemperatureStep: () => 0.5,
      _friendlyEntityName: (entityId: string) => entityId,
      _orderedZoneIds: (ids: string[]) => ids,
      _t: (key: string) => key,
      _visibleZoneIds: (ids: string[]) => ids,
    } as unknown as VelairViewHost;

    render(renderCardContent(host), container);

    const profiles = container.querySelector("velair-profiles-view");
    expect(container.querySelector(".operation-status")?.textContent)
      .toContain("operationDefaultRunning");
    expect(container.querySelector(".overview-summary")).toBeNull();
    expect(profiles?.hasAttribute("compact")).toBe(true);
    expect((profiles as HTMLElement & { activeSetupControls?: string })?.activeSetupControls)
      .toBe("profiles");
  });

  it("keeps operation status visible across sidebar panel views", () => {
    const container = document.createElement("div");
    const host = {
      _config: {},
      _hasExternalConfig: false,
      _data: {
        configured_entities: [],
        global: { mode: "auto", active_profile_ids: [] },
        operation_status: {
          id: "operation-3",
          kind: "profile_activation",
          state: "running",
          target_id: null,
          completed: 0,
          total: 0,
          failed_entity_ids: [],
          started_at: "2026-07-29T12:00:00+00:00",
          finished_at: null,
        },
        profiles: [],
        temperature_migration: { required: false },
        zones: {},
      },
      _dismissOperationStatus: () => undefined,
      _effectiveView: () => "profiles",
      _entityTemperatureLimits: () => [5, 35],
      _entityTemperatureStep: () => 0.5,
      _friendlyEntityName: (entityId: string) => entityId,
      _orderedZoneIds: (ids: string[]) => ids,
      _t: (key: string) => key,
      _visibleZoneIds: (ids: string[]) => ids,
    } as unknown as VelairViewHost;

    render(renderCardContent(host), container);

    expect(container.querySelector(".operation-status")?.textContent)
      .toContain("operationDefaultRunning");
  });

  it("routes profile confirmations through the standard timed notice", () => {
    const container = document.createElement("div");
    const showSuccess = vi.fn();
    const host = {
      _hasExternalConfig: false,
      _data: {
        configured_entities: [],
        global: { mode: "auto", active_profile_ids: [] },
        profiles: [],
        temperature_migration: { required: false },
        zones: {},
      },
      _effectiveView: () => "profiles",
      _entityTemperatureLimits: () => [5, 35],
      _entityTemperatureStep: () => 0.5,
      _orderedZoneIds: (ids: string[]) => ids,
      _showSuccess: showSuccess,
      _t: (key: string) => key,
      _visibleZoneIds: (ids: string[]) => ids,
    } as unknown as VelairViewHost;

    render(renderCardContent(host), container);
    container.querySelector("velair-profiles-view")?.dispatchEvent(new CustomEvent(
      "profile-success",
      { bubbles: true, composed: true, detail: "Profile activated" },
    ));

    expect(showSuccess).toHaveBeenCalledWith("Profile activated");
  });

  it.each(["profiles", "modes", "active-setup"] as const)(
    "routes profile failures from the %s Profiles instance through the standard operational notice",
    (view) => {
    const container = document.createElement("div");
    const showError = vi.fn();
    const host = {
      _config: {},
      _hasExternalConfig: false,
      _data: {
        configured_entities: [],
        global: { mode: "auto", active_profile_ids: [] },
        profiles: [],
        temperature_migration: { required: false },
        zones: {},
      },
      _effectiveView: () => view,
      _orderedZoneIds: (ids: string[]) => ids,
      _showError: showError,
      _t: (key: string) => key,
      _visibleZoneIds: (ids: string[]) => ids,
    } as unknown as VelairViewHost;

    render(renderCardContent(host), container);
    container.querySelector("velair-profiles-view")?.dispatchEvent(new CustomEvent(
      "profile-error",
      { bubbles: true, composed: true, detail: "Profile could not be saved" },
    ));

    expect(showError).toHaveBeenCalledWith("Profile could not be saved");
    container.querySelector("velair-profiles-view")?.dispatchEvent(new CustomEvent(
      "profile-error",
      { bubbles: true, composed: true, detail: undefined },
    ));
    expect(showError).toHaveBeenLastCalledWith(undefined);
    },
  );
});
