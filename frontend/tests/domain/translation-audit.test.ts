import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { auditCatalog, discoverCatalogs, entries, exitStatus, parseDictionary, parseJsonDictionary } from "../../scripts/translation-audit.mjs";

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("release translation audit", () => {
  it("discovers removed and newly added locale catalogs while excluding support files", () => {
    expect(discoverCatalogs(["en.ts", "es.ts", "nl.ts", "template.ts", "index.ts", "types.ts"], ["en.ts", "es.ts", "fr.ts", "template.ts", "index.ts", "types.ts"], ".ts")).toEqual([
      { filename: "es.ts", current: true, baseline: true },
      { filename: "fr.ts", current: false, baseline: true },
      { filename: "nl.ts", current: true, baseline: false },
    ]);
    expect(discoverCatalogs(["en.json"], ["en.json", "de.json"], ".json")).toEqual([
      { filename: "de.json", current: false, baseline: true },
    ]);
  });
  it("parses typed static dictionaries without executing code", () => {
    expect(parseDictionary('export const en = { a: "HVAC", nested: { b: "Hi {name}" } } as const satisfies Dictionary;')).toEqual({ a: "HVAC", nested: { b: "Hi {name}" } });
    expect(() => parseDictionary('export const en = { a: run() };')).toThrow();
    expect(() => parseDictionary('export const en = { a: "x", a: "y" };')).toThrow(/duplicate/);
    expect(() => parseJsonDictionary('{"a":"x","a":"y"}')).toThrow(/duplicate/);
  });
  it("requires an explicit existing published tag as baseline", () => {
    const missing = spawnSync(process.execPath, ["scripts/check-translations.mjs"], { cwd: frontendRoot, encoding: "utf8" });
    expect(missing.status).toBe(2);
    expect(missing.stderr).toContain("--base");
    const invalid = spawnSync(process.execPath, ["scripts/check-translations.mjs", "--base", "nonexistent-audit-test-tag"], { cwd: frontendRoot, encoding: "utf8" });
    expect(invalid.status).toBe(2);
  });
  it("validates present integration strings without requiring complete locale coverage", () => {
    const directory = resolve(frontendRoot, "../custom_components/velair/translations");
    const source = parseJsonDictionary(readFileSync(resolve(directory, "en.json"), "utf8"));
    expect(entries(source).every(([, text]) => text.trim())).toBe(true);
    for (const filename of readdirSync(directory).filter(name => name.endsWith(".json") && name !== "en.json")) {
      const locale = parseJsonDictionary(readFileSync(resolve(directory, filename), "utf8"), filename);
      expect(auditCatalog(source, locale).filter(finding => finding.kind === "error"), filename).toEqual([]);
    }
  });
  it("distinguishes deferred missing keys from invalid present translations", () => {
    const findings = auditCatalog({ a: "Hi {name}", b: "HVAC" }, { a: "Hola", old: "old" });
    expect(findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "a", reason: "placeholder mismatch", kind: "error" }),
      expect.objectContaining({ key: "old", reason: "extra key", kind: "error" }),
      expect.objectContaining({ key: "b", reason: "missing translation", kind: "pending" }),
    ]));
    expect(exitStatus(findings)).toBe(2);
    expect(exitStatus(auditCatalog({ a: "New" }, {}))).toBe(1);
    expect(exitStatus(auditCatalog({ a: "HVAC" }, { a: "HVAC" }))).toBe(0);
    expect(exitStatus(auditCatalog({ a: "Value" }, { a: " " }))).toBe(2);
  });
  it("flags source meaning changes even when locale coverage is complete", () => {
    expect(auditCatalog({ a: "Cooling" }, { a: "Calor" }, { a: "Heating" }, { a: "Calor" })[0]).toMatchObject({ kind: "review", reason: expect.stringContaining("unchanged") });
    expect(auditCatalog({ a: "Cooling" }, { a: "Frío" }, { a: "Heating" }, { a: "Calor" })[0]).toMatchObject({ kind: "review", reason: expect.stringContaining("confirm meaning") });
  });
});
