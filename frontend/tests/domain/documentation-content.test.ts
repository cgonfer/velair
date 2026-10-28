import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../..");
// @ts-ignore Shared dependency-free Node documentation tooling.
import { readCatalogue, renderHeader, sourceHash } from "../../../scripts/documentation-translations.mjs";
const catalogue = readCatalogue(root);
const sources = Object.keys(catalogue.documents);
const read = (file: string) => readFileSync(resolve(root, file), "utf8").replaceAll("\r\n", "\n")
  .replace(/<!-- velair-docs:start -->[\s\S]*?<!-- velair-docs:end -->\n?/g, "");
function markdownParts(content: string) {
  const code: string[] = [];
  const prose: string[] = [];
  let fence: { marker: string; length: number; lines: string[] } | undefined;
  for (const line of content.split("\n")) {
    if (fence) {
      fence.lines.push(line);
      if (new RegExp(`^ {0,3}${fence.marker}{${fence.length},}[ \\t]*$`).test(line)) {
        code.push(fence.lines.join("\n"));
        fence = undefined;
      }
    } else {
      const opening = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (opening && (opening[1][0] !== "`" || !opening[2].includes("`"))) {
        fence = { marker: opening[1][0], length: opening[1].length, lines: [line] };
      } else prose.push(line);
    }
  }
  if (fence) code.push(fence.lines.join("\n"));
  return { code, prose: prose.join("\n") };
}
const fences = (content: string) => markdownParts(content).code;
const headings = (content: string) => markdownParts(content).prose.match(/^#{1,6} .+$/gm) ?? [];
const tableRows = (content: string) => markdownParts(content).prose.split("\n")
  .filter((line) => line.trimStart().startsWith("|"))
  .map((line) => line.split("|").length);
const proseParagraphs = (content: string) => markdownParts(content).prose
  .replace(/<[^>]*>/g, "").replace(/`[^`]*`/g, "")
  .replace(/https?:\/\/[^\s)]+/g, "").split(/\n\s*\n/)
  .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
  .filter((paragraph) => paragraph.length > 140 && !paragraph.startsWith("|"));
const slugOf = (heading: string) => heading.replace(/^#{1,6} /, "").toLowerCase().replace(/<[^>]+>/g, "")
  .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
  .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, "").replace(/\s/g, "-");
function headingAnchors(content: string) {
  const used = new Map<string, number>();
  return headings(content).map((heading) => {
    const slug = slugOf(heading);
    const count = used.get(slug) ?? 0;
    used.set(slug, count + 1);
    return count ? `${slug}-${count}` : slug;
  });
}

function assertLocalizedContent(original: string, translated: string, current: boolean): void {
  expect(translated).not.toBe(original);
  const englishParagraphs = new Set(proseParagraphs(original));
  expect(proseParagraphs(translated).filter((paragraph) => englishParagraphs.has(paragraph)),
    "Long explanatory paragraphs must be translated, not copied from English").toEqual([]);
  // Stale translations remain useful with a generated warning. Only a translation
  // synchronized with the current source can promise identical examples and structure.
  if (!current) return;
  expect(fences(translated)).toEqual(fences(original));
  const externalUrls = (content: string) => (content.match(/https?:\/\/[^\s)<>"'`]+/g) ?? []).sort();
  expect(externalUrls(translated)).toEqual(externalUrls(original));
  expect(headings(translated)).toHaveLength(headings(original).length);
  expect(tableRows(translated)).toEqual(tableRows(original));
  // Attribute and configuration identifiers in prose must survive too;
  // intact YAML examples alone do not protect automation instructions.
  const sourceProse = markdownParts(original).prose;
  const translatedProse = markdownParts(translated).prose;
  const identifiers = new Set(Array.from(sourceProse.matchAll(/`([a-z][a-z0-9]*_[a-z0-9_]+)`/g),
    ([, identifier]) => identifier));
  for (const identifier of identifiers) {
    expect(translatedProse, identifier).toContain(identifier);
  }
  // Incoming English section links remain resolvable after translating titles.
  const translatedAnchors = new Set(headingAnchors(translated));
  for (const anchor of headingAnchors(original)) {
    // Unchanged technical headings (HACS, Lovelace) already supply their original slug.
    expect(translated.includes(`id="${anchor}"`) || translatedAnchors.has(anchor), anchor).toBe(true);
  }
}

describe("complete localized user documentation", () => {
  it("keeps internal AI configuration and session measurements out of public guides", () => {
    function markdownFiles(directory: string): string[] {
      return readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap((entry) => {
        const file = `${directory}/${entry.name}`;
        return entry.isDirectory() ? markdownFiles(file) : entry.isFile() && file.endsWith(".md") ? [file] : [];
      });
    }
    for (const file of markdownFiles("docs")) {
      expect(read(file), file).not.toMatch(/\.codex\/|\.agents\/|AGENTS\.md|## Pilot measurements|source tokens per language|Exact provider usage|existing assistant sessions/i);
    }
  });

  for (const source of sources) {
    for (const language of Object.keys(catalogue.documents[source].translations)) {
      it(`${source} retains all sections and literal code examples in ${language}`, () => {
        const original = read(source);
        const translated = read(source.replace(/\.md$/, `.${language}.md`));
        const entry = catalogue.documents[source].translations[language];
        const rawTranslation = readFileSync(resolve(root, entry.path), "utf8").replaceAll("\r\n", "\n");
        const header = rawTranslation.match(/<!-- velair-docs:start -->[\s\S]*?<!-- velair-docs:end -->/g);
        expect(header).toEqual([renderHeader(root, source, language, catalogue)]);
        expect(header![0]).toContain(entry.referenceVersion);
        expect(header![0]).toContain(entry.synchronizedAt);
        assertLocalizedContent(original, translated, entry.sourceHash === sourceHash(original));
      });
    }
  }
});


it("accepts pending source additions only for stale translations and never accepts English prose copies", () => {
  const original = "# Original\n\n```yaml\nnew: example\n```";
  const translated = "# Traducido\n\nOlder localized instructions.";
  expect(() => assertLocalizedContent(original, translated, false)).not.toThrow();
  expect(() => assertLocalizedContent(original, translated, true)).toThrow();
  const paragraph = "This English explanatory paragraph is intentionally long enough to exceed the prose-copy threshold and verify that stale translations must still contain localized text rather than copied English guidance.";
  expect(() => assertLocalizedContent(`# Source\n\n${paragraph}`, `# Traducido\n\n${paragraph}`, false)).toThrow();
});
