// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";

import type { VelairViewHost } from "../../src/velair/host-types";
import { renderCardContent } from "../../src/velair/views/card-content";

describe("card content", () => {
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
});
