import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// The CLI intentionally stays a dependency-free Node ES module.
// @ts-ignore Node library is also imported by the Vite configuration.
import { buildDocumentationAvailability, checkDocumentation, readCatalogue, reportDocumentation, sourceHash, syncTranslation, updateHeaders } from "../../../scripts/documentation-translations.mjs";

const roots: string[] = [];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "velair-docs-"));
  roots.push(root);
  mkdirSync(join(root, "docs/user"), { recursive: true });
  mkdirSync(join(root, "custom_components/velair"), { recursive: true });
  writeFileSync(join(root, "custom_components/velair/manifest.json"), '{"version":"1.8.0"}');
  writeFileSync(join(root, "docs/user/guide.md"), "# Guide\n\n## Controls\n\n```yaml\nmode: cool\n```\n");
  writeFileSync(join(root, "docs/user/guide.es.md"), '# Guía\n\n<a id="controls"></a>\n## Controles\n\n[Controls](#controls)\n');
  writeFileSync(join(root, "docs/translations.json"), JSON.stringify({ schemaVersion: 1, documents: { "docs/user/guide.md": { translations: {} } } }));
  return root;
}
const sync = (root: string, options = {}) => syncTranslation(root, { document: "docs/user/guide.md", language: "es", date: "2026-10-11", ...options });
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

describe("documentation translation catalogue", () => {
  it.each([
    ["es", "Estado de esta traducción", "Traducción asistida por IA"],
    ["fr", "État de cette traduction", "Traduction assistée par IA"],
    ["de", "Status dieser Übersetzung", "KI-gestützte Übersetzung"],
    ["it", "Stato di questa traduzione", "Traduzione assistita dall’IA"],
    ["nl", "Status van deze vertaling", "AI-ondersteunde vertaling"],
    ["pl", "Status tego tłumaczenia", "Tłumaczenie wspomagane przez AI"],
    ["pt-br", "Status desta tradução", "Tradução assistida por IA"],
    ["pt-pt", "Estado desta tradução", "Tradução assistida por IA"],
    ["ru", "Статус этого перевода", "Перевод с помощью ИИ"],
  ])("folds update details in %s while keeping stale warnings and English links outside", (language, summary, automaticLabel) => {
    const root = fixture();
    if (language !== "es") {
      rmSync(join(root, "docs/user/guide.es.md"));
      writeFileSync(join(root, `docs/user/guide.${language}.md`), '# Guide\n\n<a id="controls"></a>\n## Controls\n');
    }
    sync(root, { language });
    const file = join(root, `docs/user/guide.${language}.md`);
    const current = readFileSync(file, "utf8");
    const disclosure = current.match(/<details>\n([\s\S]*?)\n<\/details>/)?.[1];
    expect(disclosure).toContain(`<summary>${summary}</summary>`);
    expect(disclosure).toContain(automaticLabel);
    expect(readCatalogue(root).documents["docs/user/guide.md"].translations[language].reviewStatus).toBe("automatic");
    expect(disclosure).toContain("1.8.0");
    expect(disclosure).toContain("2026-10-11");
    const rows = disclosure!.split("\n").filter((line: string) => line.startsWith("| "));
    expect(rows).toHaveLength(6); // Two column headings, delimiter and four data rows.
    expect(rows.every((line: string) => line.split("|").length === 4)).toBe(true);
    expect(disclosure).toContain(`</summary>\n\n${rows[0]}`);
    expect(current).not.toMatch(/<details\s+open/);
    expect(current).not.toMatch(/^> /m);
    expect(current).toContain("\n---\n<!-- velair-docs:end -->");
    const original = readFileSync(join(root, "docs/user/guide.md"), "utf8");
    expect(original).not.toContain("<details>");
    expect(original).toContain("\n---\n<!-- velair-docs:end -->");

    const catalogue = readFileSync(join(root, "docs/translations.json"), "utf8");
    writeFileSync(join(root, "docs/user/guide.md"), original.replace("mode: cool", "mode: heat"));
    updateHeaders(root);
    const stale = readFileSync(file, "utf8");
    const staleTable = stale.match(/<details>\n([\s\S]*?)\n<\/details>/)?.[1];
    expect(staleTable!.split("\n").filter((line: string) => line.startsWith("| "))).toHaveLength(6);
    expect(staleTable).not.toContain(rows[5]);
    const warning = stale.match(/^> .+$/m)?.[0];
    expect(warning).toContain("](guide.md)");
    expect(stale.indexOf(warning!)).toBeGreaterThan(stale.indexOf("</details>"));
    expect(stale.indexOf(warning!)).toBeLessThan(stale.indexOf("\n---\n"));
    expect(readFileSync(join(root, "docs/translations.json"), "utf8")).toBe(catalogue);
    expect(checkDocumentation(root)).toEqual([]);
  });

  it("tracks automatic review independently of synchronization and exposes paths only", () => {
    const root = fixture();
    sync(root);
    expect(checkDocumentation(root)).toEqual([]);
    expect(buildDocumentationAvailability(root)).toEqual({ "docs/user/guide.md": { es: "docs/user/guide.es.md" } });
    expect(reportDocumentation(root)).toContain("Current | automatic");
    expect(reportDocumentation(root)).toContain("fr | Pending");
    expect(readFileSync(join(root, "docs/user/guide.es.md"), "utf8")).toContain("Traducción asistida por IA");
  });

  it("never refreshes stamps when source changes or headers are updated", () => {
    const root = fixture();
    sync(root, { reviewStatus: "reviewed" });
    const before = readFileSync(join(root, "docs/translations.json"), "utf8");
    writeFileSync(join(root, "docs/user/guide.md"), "# Guide\n\n## Controls\n\n```yaml\nmode: heat\n```\n");
    expect(checkDocumentation(root)).toContain("docs/user/guide.es.md: generated header needs update");
    updateHeaders(root);
    expect(readFileSync(join(root, "docs/translations.json"), "utf8")).toBe(before);
    expect(reportDocumentation(root)).toContain("Stale | reviewed");
    expect(checkDocumentation(root)).toEqual([]);
    expect(readFileSync(join(root, "docs/user/guide.es.md"), "utf8")).toContain("desactualizada");
  });

  it("normalizes line endings, preserves missing final newlines and hashes code changes", () => {
    const root = fixture();
    const source = "# Guide\n\n```yaml\nmode: cool\n```";
    writeFileSync(join(root, "docs/user/guide.md"), source);
    expect(sourceHash(source.replaceAll("\n", "\r\n"))).toBe(sourceHash(source));
    sync(root);
    const withHeader = readFileSync(join(root, "docs/user/guide.md"), "utf8");
    expect(withHeader.startsWith("# Guide\n<!-- velair-docs:start -->")).toBe(true);
    expect(sourceHash(withHeader)).toBe(sourceHash(source));
    expect(sourceHash(source.replace("cool", "heat"))).not.toBe(sourceHash(source));
    updateHeaders(root);
    expect(readFileSync(join(root, "docs/user/guide.md"), "utf8")).toBe(withHeader);
  });

  it("stamps only the requested source and locale", () => {
    const root = fixture();
    sync(root);
    const spanish = readCatalogue(root).documents["docs/user/guide.md"].translations.es;
    writeFileSync(join(root, "docs/user/guide.fr.md"), '# Guide\n\n<a id="controls"></a>\n## Contrôles\n');
    sync(root, { language: "fr", date: "2026-10-12", reviewStatus: "reviewed" });
    const record = readCatalogue(root).documents["docs/user/guide.md"].translations;
    expect(record.es).toEqual(spanish);
    expect(record.fr.reviewStatus).toBe("reviewed");
  });

  it("rejects traversal, missing mapped files, unknown languages and malformed metadata", () => {
    const root = fixture();
    sync(root);
    const catalogue = readCatalogue(root);
    catalogue.documents["docs/user/guide.md"].translations.es.path = "docs/../../outside.es.md";
    expect(() => buildDocumentationAvailability(root, catalogue)).toThrow();
    expect(() => sync(root, { language: "xx" })).toThrow();
    expect(() => sync(root, { date: "2026-02-30" })).toThrow();
    expect(() => sync(root, { version: "unversioned" })).toThrow();
    expect(() => sync(root, { reviewStatus: "pending" })).toThrow();
    rmSync(join(root, "docs/user/guide.es.md"));
    expect(() => buildDocumentationAvailability(root)).toThrow();
  });

  it("validates fragments against explicit anchors and ignores links inside fenced examples", () => {
    const root = fixture();
    sync(root);
    writeFileSync(join(root, "docs/user/guide.es.md"), '# Guía\n\n<a id="controls"></a>\n## Controles\n\n[English](guide.md#controls)\n```md\n[Example](missing.md)\n```\n');
    sync(root);
    expect(checkDocumentation(root)).toEqual([]);
    writeFileSync(join(root, "docs/user/guide.es.md"), '# Guía\n\n[Broken](guide.md#absent)\n');
    expect(() => sync(root)).toThrow("missing anchor");
    writeFileSync(join(root, "docs/user/guide.es.md"), '# Guía\n\n[Missing](missing.md)\n');
    expect(() => sync(root)).toThrow("invalid link");
  });

  it("rejects unregistered files, duplicate blocks and outdated generated reports", () => {
    const root = fixture();
    sync(root);
    writeFileSync(join(root, "docs/user/guide.fr.md"), "# Guide\n");
    expect(checkDocumentation(root)).toContain("docs/user/guide.fr.md: unregistered translation");
    writeFileSync(join(root, "docs/translation-status.md"), "outdated");
    expect(checkDocumentation(root)).toContain("docs/translation-status.md: generated report needs update");
    const file = join(root, "docs/user/guide.es.md");
    writeFileSync(file, `${readFileSync(file, "utf8")}\n<!-- velair-docs:start --><!-- velair-docs:end -->`);
    expect(() => updateHeaders(root)).toThrow("duplicate");
  });

  it("ignores links and headings inside indented variable-length fences", () => {
    const root = fixture();
    writeFileSync(join(root, "docs/user/guide.es.md"), [
      "# Guía", "", "  ````markdown", "[Example](missing.md)", "```",
      "# Example heading", "  ````", "", "   ~~~~~", "[Example](also-missing.md)",
      "   ~~~~~~", "", '<a id="controls"></a>', "## Controles", "",
    ].join("\n"));
    sync(root);
    expect(checkDocumentation(root)).toEqual([]);
  });
});
