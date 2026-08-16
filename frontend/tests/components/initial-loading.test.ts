// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { INITIAL_LOADING_DELAY_MS } from "../../src/velair/constants";
import { VelairCard } from "../../src/velair/components/velair-card-element";

class TestInitialLoadingCard extends VelairCard {}

const TEST_TAG = "test-velair-initial-loading-card";
if (!customElements.get(TEST_TAG)) {
  customElements.define(TEST_TAG, TestInitialLoadingCard);
}

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("initial loading state", () => {
  it("suppresses fast loads and reveals the static brand only after the threshold", async () => {
    vi.useFakeTimers();
    const element = document.createElement(TEST_TAG) as TestInitialLoadingCard;
    const internal = element as unknown as {
      _loading: boolean;
      updateComplete: Promise<boolean>;
    };
    document.body.append(element);

    internal._loading = true;
    await internal.updateComplete;
    vi.advanceTimersByTime(INITIAL_LOADING_DELAY_MS - 1);
    await internal.updateComplete;
    expect(element.shadowRoot?.querySelector(".initial-loading")).toBeNull();

    vi.advanceTimersByTime(1);
    await internal.updateComplete;
    expect(element.shadowRoot?.querySelector(".initial-loading-logo")).not.toBeNull();

    internal._loading = false;
    await internal.updateComplete;
    expect(element.shadowRoot?.querySelector(".initial-loading")).toBeNull();
  });

  it("cancels the delayed state when the card disconnects", async () => {
    vi.useFakeTimers();
    const element = document.createElement(TEST_TAG) as TestInitialLoadingCard;
    const internal = element as unknown as {
      _loading: boolean;
      updateComplete: Promise<boolean>;
    };
    document.body.append(element);
    internal._loading = true;
    await internal.updateComplete;

    element.remove();
    vi.advanceTimersByTime(INITIAL_LOADING_DELAY_MS);

    expect(element.shadowRoot?.querySelector(".initial-loading")).toBeNull();
  });
});
