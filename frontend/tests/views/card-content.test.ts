// @vitest-environment jsdom

import { render } from "lit";
import { describe, expect, it, vi } from "vitest";

import type { VelairViewHost } from "../../src/velair/host-types";
import { renderCardContent } from "../../src/velair/views/card-content";

describe("card content", () => {
  it("keeps the scheduler status card independent from Active setup", () => {
    const container = document.createElement("div");
    const host = {
      _canResumeScheduler: () => false,
      _config: { active_setup_controls: "profiles" },
      _data: {
        configured_entities: [],
        global: { mode: "auto", active_profile_ids: [] },
        next_events: [],
        operational_status: "running",
        profiles: [],
        temperature_migration: { required: false },
        zones: {},
      },
      _effectiveView: () => "overview-status",
      _entityTemperatureLimits: () => [5, 35],
      _entityTemperatureStep: () => 0.5,
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
    const profiles = container.querySelector("velair-profiles-view");
    expect(summary).not.toBeNull();
    expect(profiles).toBeNull();
  });

  it("renders Active setup as an independent compact card view", () => {
    const container = document.createElement("div");
    const host = {
      _config: { active_setup_controls: "profiles" },
      _data: {
        configured_entities: [],
        global: { mode: "auto", active_profile_ids: [] },
        profiles: [],
        temperature_migration: { required: false },
        zones: {},
      },
      _effectiveView: () => "active-setup",
      _entityTemperatureLimits: () => [5, 35],
      _entityTemperatureStep: () => 0.5,
      _orderedZoneIds: (ids: string[]) => ids,
      _t: (key: string) => key,
      _visibleZoneIds: (ids: string[]) => ids,
    } as unknown as VelairViewHost;

    render(renderCardContent(host), container);

    const profiles = container.querySelector("velair-profiles-view");
    expect(container.querySelector(".overview-summary")).toBeNull();
    expect(profiles?.hasAttribute("compact")).toBe(true);
    expect((profiles as HTMLElement & { activeSetupControls?: string })?.activeSetupControls)
      .toBe("profiles");
  });

  it("routes profile confirmations through the standard timed notice", () => {
    const container = document.createElement("div");
    const showSuccess = vi.fn();
    const host = {
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
