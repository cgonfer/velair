// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { VelairCard } from "../../src/velair/components/velair-card-element";
import type { ScheduleResponse } from "../../src/velair/types";

const TEST_CARD_TAG = "test-velair-operation-card";
if (!customElements.get(TEST_CARD_TAG)) {
  customElements.define(TEST_CARD_TAG, VelairCard);
}

function createCard(): VelairCard {
  return document.createElement(TEST_CARD_TAG) as VelairCard;
}

const baseData = {
  configured_entities: [],
  temperature_unit: "°C",
  home_assistant_temperature_unit: "°C",
  temperature_migration: { required: false },
  global: { mode: "running", active_profile_ids: [] },
  settings: { first_weekday: "monday", zone_order: [] },
  zones: {},
  operational_status: "running",
  next_event: null,
  next_events: [],
  active_overrides: {},
} as unknown as ScheduleResponse;

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("operation status lifecycle", () => {
  it("auto-hides success after five seconds and shows a later operation", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T12:00:00+00:00"));
    const element = createCard();
    const internal = element as unknown as { _data?: ScheduleResponse };
    internal._data = {
      ...baseData,
      operation_status: {
        id: "auto-dismiss-test",
        kind: "mode_change",
        state: "completed",
        target_id: "default",
        completed: 2,
        total: 2,
        current_entity_id: null,
        failed_entity_ids: [],
        started_at: "2026-07-29T11:59:58+00:00",
        finished_at: "2026-07-29T12:00:00+00:00",
      },
    };
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector(".operation-status")).not.toBeNull();

    await vi.advanceTimersByTimeAsync(5_000);
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector(".operation-status")).toBeNull();

    internal._data = {
      ...baseData,
      operation_status: {
        id: "later-operation-test",
        kind: "profile_activation",
        state: "running",
        target_id: "away",
        completed: 0,
        total: 1,
        current_entity_id: "climate.office",
        failed_entity_ids: [],
        started_at: "2026-07-29T12:00:05+00:00",
        finished_at: null,
      },
    };
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector(".operation-status")).not.toBeNull();
  });

  it("keeps a dismissed attention state hidden after the card is remounted", async () => {
    const operation = {
      id: "dismiss-remount-test",
      kind: "mode_change" as const,
      state: "completed_with_errors" as const,
      target_id: "away",
      completed: 2,
      total: 2,
      current_entity_id: null,
      failed_entity_ids: ["climate.office"],
      started_at: "2026-07-29T12:00:00+00:00",
      finished_at: "2026-07-29T12:00:02+00:00",
    };
    const first = createCard();
    (first as unknown as { _data?: ScheduleResponse })._data = {
      ...baseData,
      operation_status: operation,
    };
    document.body.append(first);
    await first.updateComplete;

    (first.shadowRoot?.querySelector(".operation-status-dismiss") as HTMLButtonElement).click();
    await first.updateComplete;
    expect(first.shadowRoot?.querySelector(".operation-status")).toBeNull();
    first.remove();

    const remounted = createCard();
    (remounted as unknown as { _data?: ScheduleResponse })._data = {
      ...baseData,
      operation_status: operation,
    };
    document.body.append(remounted);
    await remounted.updateComplete;

    expect(remounted.shadowRoot?.querySelector(".operation-status")).toBeNull();
  });
});
