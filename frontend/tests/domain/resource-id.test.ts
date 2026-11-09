import { afterEach, describe, expect, it, vi } from "vitest";
import { resourceId } from "../../src/velair/domain/resource-id";

afterEach(() => vi.unstubAllGlobals());

describe("resource identifiers", () => {
  it("uses the native UUID method with its Crypto receiver when available", () => {
    const crypto = {
      randomUUID() { expect(this).toBe(crypto); return "12345678-1234-4321-8123-123456789abc"; },
      getRandomValues: vi.fn(),
    };
    vi.stubGlobal("crypto", crypto);
    expect(resourceId()).toBe("12345678-1234-4321-8123-123456789abc");
    expect(crypto.getRandomValues).not.toHaveBeenCalled();
  });

  it.each([
    [0x00, "00000000-0000-4000-8000-000000000000"],
    [0xff, "ffffffff-ffff-4fff-bfff-ffffffffffff"],
  ])("generates a UUID v4 without randomUUID, preserving version and variant bits (%i)", (byte, expected) => {
    const crypto = {
      getRandomValues(bytes: Uint8Array) {
        expect(this).toBe(crypto);
        expect(bytes).toHaveLength(16);
        return bytes.fill(byte);
      },
    };
    vi.stubGlobal("crypto", crypto);
    expect(resourceId()).toBe(expected);
  });

  it("generates distinct UUIDs using browser randomness without randomUUID", () => {
    const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
    vi.stubGlobal("crypto", { getRandomValues });
    const ids = Array.from({ length: 256 }, resourceId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
