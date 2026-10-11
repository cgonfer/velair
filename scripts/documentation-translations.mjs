import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DOCUMENTATION_LANGUAGES = ["es", "fr", "de", "it", "nl", "pl", "pt-br", "pt-pt", "ru"];
const LANGUAGE_NAMES = { es: "Español", fr: "Français", de: "Deutsch", it: "Italiano", nl: "Nederlands", pl: "Polski", "pt-br": "Português (Brasil)", "pt-pt": "Português (Portugal)", ru: "Русский" };
const START = "<!-- velair-docs:start -->";
const END = "<!-- velair-docs:end -->";
const BLOCK = /<!-- velair-docs:start -->[\s\S]*?<!-- velair-docs:end -->/g;
const text = (root, file) => readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");

export function sourceHash(content) {
  // Removing the generated block also removes its own line terminator.
  return createHash("sha256").update(content.replace(/\r\n/g, "\n").replace(/<!-- velair-docs:start -->[\s\S]*?<!-- velair-docs:end -->\n?/g, "")).digest("hex");
}

function confinedFile(root, file, docsOnly = true) {
  if (typeof file !== "string" || file.includes("\\") || path.posix.normalize(file) !== file
    || file.startsWith("/") || file.includes(":") || (docsOnly && !file.startsWith("docs/"))) {
    throw new Error(`Invalid documentation path: ${file}`);
  }
  const base = realpathSync(root);
  const candidate = path.resolve(root, file);
  const relative = path.relative(base, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative) || !existsSync(candidate)) {
    throw new Error(`Missing or escaping documentation path: ${file}`);
  }
  const resolved = realpathSync(candidate);
  const realRelative = path.relative(base, resolved);
  if (realRelative.startsWith("..") || path.isAbsolute(realRelative)
    || (docsOnly && !realRelative.replaceAll("\\", "/").startsWith("docs/"))) {
    throw new Error(`Escaping documentation path: ${file}`);
  }
  return candidate;
}

const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);
function validateCatalogue(root, catalogue) {
  if (!isObject(catalogue) || catalogue.schemaVersion !== 1 || !isObject(catalogue.documents)
    || Object.keys(catalogue).some((key) => !["schemaVersion", "documents"].includes(key))) {
    throw new Error("Invalid documentation catalogue schema");
  }
  const registered = new Set();
  for (const [source, document] of Object.entries(catalogue.documents)) {
    confinedFile(root, source);
    if (!source.endsWith(".md") || /\.(es|fr|de|it|nl|pl|pt-br|pt-pt|ru)\.md$/.test(source)
      || !isObject(document) || !isObject(document.translations)
      || Object.keys(document).some((key) => key !== "translations")) throw new Error(`Invalid source record: ${source}`);
    for (const [language, entry] of Object.entries(document.translations)) {
      const expected = source.replace(/\.md$/, `.${language}.md`);
      if (!DOCUMENTATION_LANGUAGES.includes(language) || !isObject(entry)
        || Object.keys(entry).sort().join(",") !== "path,referenceVersion,reviewStatus,sourceHash,synchronizedAt"
        || entry.path !== expected) throw new Error(`Invalid translation record: ${source}/${language}`);
      confinedFile(root, entry.path);
      if (registered.has(entry.path)) throw new Error(`Duplicate translation: ${entry.path}`);
      registered.add(entry.path);
      if (!/^[a-f0-9]{64}$/.test(entry.sourceHash ?? "")
        || !/^\d{4}-\d{2}-\d{2}$/.test(entry.synchronizedAt ?? "")
        || Number.isNaN(Date.parse(entry.synchronizedAt))
        || new Date(entry.synchronizedAt).toISOString().slice(0, 10) !== entry.synchronizedAt
        || !/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/.test(entry.referenceVersion ?? "")
        || !["automatic", "reviewed"].includes(entry.reviewStatus)) throw new Error(`Invalid translation metadata: ${entry.path}`);
    }
  }
  return catalogue;
}

export function readCatalogue(root) {
  return validateCatalogue(root, JSON.parse(readFileSync(path.join(root, "docs/translations.json"), "utf8")));
}

export function buildDocumentationAvailability(root, catalogue = readCatalogue(root)) {
  validateCatalogue(root, catalogue);
  return Object.fromEntries(Object.entries(catalogue.documents).filter(([, record]) => Object.keys(record.translations).length).map(([source, record]) => [
    source, Object.fromEntries(Object.entries(record.translations).map(([language, entry]) => [language, entry.path])),
  ]));
}

function relativeLink(from, to) {
  return path.posix.relative(path.posix.dirname(from), to) || path.posix.basename(to);
}

export function renderHeader(root, source, language = "en", catalogue = readCatalogue(root)) {
  const record = catalogue.documents[source];
  if (!record) throw new Error(`Unregistered document: ${source}`);
  const entry = language === "en" ? undefined : record.translations[language];
  if (language !== "en" && !entry) throw new Error(`Unregistered translation: ${source}/${language}`);
  const currentPath = entry?.path ?? source;
  const headerCopy = {
    es: {
      original: "Original en inglés", translations: "Traducciones", status: "Estado de las traducciones", details: "Estado de esta traducción", version: "Versión de referencia", date: "Última sincronización",
      field: "Dato", value: "Estado", review: "Revisión lingüística", source: "Respecto al original", pending: "Cambios pendientes",
      automatic: "Traducción asistida por IA", reviewed: "Traducción revisada", current: "Sin cambios pendientes respecto al original inglés.", stale: "El original ha cambiado; esta traducción puede estar desactualizada.",
    }, fr: {
      original: "Original en anglais", translations: "Traductions", status: "État des traductions", details: "État de cette traduction", version: "Version de référence", date: "Dernière synchronisation",
      field: "Information", value: "État", review: "Révision linguistique", source: "Par rapport à l’original", pending: "Modifications en attente",
      automatic: "Traduction assistée par IA", reviewed: "Traduction révisée", current: "Synchronisée avec l’original anglais.", stale: "L’original a changé ; cette traduction peut être obsolète.",
    }, de: {
      original: "Englisches Original", translations: "Übersetzungen", status: "Übersetzungsstatus", details: "Status dieser Übersetzung", version: "Referenzversion", date: "Letzte Synchronisierung",
      field: "Angabe", value: "Status", review: "Sprachliche Prüfung", source: "Vergleich mit dem Original", pending: "Änderungen ausstehend",
      automatic: "KI-gestützte Übersetzung", reviewed: "Sprachlich geprüfte Übersetzung", current: "Mit dem englischen Original synchronisiert.", stale: "Das Original wurde geändert; diese Übersetzung ist möglicherweise nicht mehr aktuell.",
    }, it: {
      original: "Originale in inglese", translations: "Traduzioni", status: "Stato delle traduzioni", details: "Stato di questa traduzione", version: "Versione di riferimento", date: "Ultima sincronizzazione",
      field: "Voce", value: "Stato", review: "Revisione linguistica", source: "Rispetto all’originale", pending: "Modifiche da recepire",
      automatic: "Traduzione assistita dall’IA", reviewed: "Traduzione revisionata", current: "Sincronizzata con l’originale inglese.", stale: "L’originale è cambiato; questa traduzione potrebbe non essere aggiornata.",
    }, nl: {
      original: "Engels origineel", translations: "Vertalingen", status: "Vertaalstatus", details: "Status van deze vertaling", version: "Referentieversie", date: "Laatst gesynchroniseerd",
      field: "Gegeven", value: "Status", review: "Taalcontrole", source: "Vergeleken met het origineel", pending: "Wijzigingen nog niet verwerkt",
      automatic: "AI-ondersteunde vertaling", reviewed: "Taalkundig gecontroleerde vertaling", current: "Gesynchroniseerd met het Engelse origineel.", stale: "Het origineel is gewijzigd; deze vertaling is mogelijk verouderd.",
    }, pl: {
      original: "Oryginał w języku angielskim", translations: "Tłumaczenia", status: "Status tłumaczeń", details: "Status tego tłumaczenia", version: "Wersja odniesienia", date: "Ostatnia synchronizacja",
      field: "Informacja", value: "Status", review: "Korekta językowa", source: "Zgodność z oryginałem", pending: "Zmiany oczekujące na uwzględnienie",
      automatic: "Tłumaczenie wspomagane przez AI", reviewed: "Tłumaczenie po korekcie językowej", current: "Zgodne z aktualnym angielskim oryginałem.", stale: "Oryginał został zmieniony; to tłumaczenie może być nieaktualne.",
    }, "pt-br": {
      original: "Original em inglês", translations: "Traduções", status: "Status das traduções", details: "Status desta tradução", version: "Versão de referência", date: "Última sincronização",
      field: "Informação", value: "Status", review: "Revisão linguística", source: "Em relação ao original", pending: "Alterações pendentes",
      automatic: "Tradução assistida por IA", reviewed: "Tradução revisada", current: "Sincronizada com o original em inglês.", stale: "O original foi alterado; esta tradução pode estar desatualizada.",
    }, "pt-pt": {
      original: "Original em inglês", translations: "Traduções", status: "Estado das traduções", details: "Estado desta tradução", version: "Versão de referência", date: "Última sincronização",
      field: "Informação", value: "Estado", review: "Revisão linguística", source: "Em relação ao original", pending: "Alterações pendentes",
      automatic: "Tradução assistida por IA", reviewed: "Tradução revista", current: "Sincronizada com o original em inglês.", stale: "O original foi alterado; esta tradução pode estar desatualizada.",
    }, ru: {
      original: "Оригинал на английском", translations: "Переводы", status: "Статус переводов", details: "Статус этого перевода", version: "Версия для сверки", date: "Последняя синхронизация",
      field: "Сведения", value: "Статус", review: "Языковая проверка", source: "Соответствие оригиналу", pending: "Изменения ещё не учтены",
      automatic: "Перевод с помощью ИИ", reviewed: "Перевод прошёл языковую проверку", current: "Соответствует актуальному английскому оригиналу.", stale: "Оригинал изменился; этот перевод может быть неактуальным.",
    }, en: {
      original: "English original", translations: "Translations", status: "Translation status", details: "About this translation", version: "Reference version", date: "Last synchronization",
      field: "Field", value: "Status", review: "Linguistic review", source: "Compared with the original", pending: "Pending changes",
      automatic: "AI-assisted translation", reviewed: "Reviewed translation", current: "Synchronized with the English source.", stale: "The original has changed; this translation may be outdated.",
    },
  };
  const copy = headerCopy[language] ?? headerCopy.en;
  const links = [`[${copy.original}](${relativeLink(currentPath, source)})`, ...DOCUMENTATION_LANGUAGES
    .filter((locale) => record.translations[locale])
    .map((locale) => `[${LANGUAGE_NAMES[locale]}](${relativeLink(currentPath, record.translations[locale].path)})`)];
  links.push(`[${copy.status}](${relativeLink(currentPath, "docs/translation-status.md")})`);
  const lines = [START, `${copy.translations}: ${links.join(" · ")}`];
  if (entry) {
    const stale = entry.sourceHash !== sourceHash(text(root, source));
    lines.push("", "<details>", `<summary>${copy.details}</summary>`, "",
      `| ${copy.field} | ${copy.value} |`, "| --- | --- |",
      `| ${copy.version} | ${entry.referenceVersion} |`,
      `| ${copy.date} | ${entry.synchronizedAt} |`,
      `| ${copy.review} | ${entry.reviewStatus === "reviewed" ? copy.reviewed : copy.automatic} |`,
      `| ${copy.source} | ${stale ? copy.pending : copy.current} |`);
    lines.push("", "</details>");
    if (stale) lines.push("", `> ${copy.stale} [${copy.original}](${relativeLink(currentPath, source)})`);
  }
  lines.push("", "---", END);
  return lines.join("\n");
}

function withHeader(content, header) {
  const blocks = content.match(BLOCK) ?? [];
  if (blocks.length > 1 || (content.includes(START) && !blocks.length) || (content.includes(END) && !blocks.length)) {
    throw new Error("Malformed or duplicate generated documentation header");
  }
  if (blocks.length) return content.replace(BLOCK, header);
  // Insert below the title without changing source bytes outside the block.
  const title = /^# [^\n]*\n/m.exec(content);
  if (!title) throw new Error("Documentation requires a level-one title followed by a newline");
  const offset = title.index + title[0].length;
  return `${content.slice(0, offset)}${header}\n${content.slice(offset)}`;
}

export function updateHeaders(root, catalogue = readCatalogue(root)) {
  validateCatalogue(root, catalogue);
  for (const [source, record] of Object.entries(catalogue.documents)) {
    if (!Object.keys(record.translations).length) continue;
    for (const [language, file] of [["en", source], ...Object.entries(record.translations).map(([locale, entry]) => [locale, entry.path])]) {
      const before = text(root, file);
      const after = withHeader(before, renderHeader(root, source, language, catalogue));
      if (after !== before) writeFileSync(path.join(root, file), after);
    }
  }
  writeFileSync(path.join(root, "docs/translation-status.md"), reportDocumentation(root, catalogue));
}

function withoutFencedCode(content) {
  const lines = [];
  let fence;
  for (const line of content.split("\n")) {
    if (fence) {
      if (new RegExp(`^ {0,3}${fence.character}{${fence.length},}[ \\t]*$`).test(line)) fence = undefined;
      continue;
    }
    const opening = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (opening && (opening[1][0] !== "`" || !opening[2].includes("`"))) {
      fence = { character: opening[1][0], length: opening[1].length };
    } else lines.push(line);
  }
  return lines.join("\n");
}

function markdownAnchors(content) {
  const anchors = new Set();
  const used = new Map();
  const withoutCode = withoutFencedCode(content);
  for (const match of withoutCode.matchAll(/\bid=["']([^"']+)["']/g)) anchors.add(match[1]);
  for (const match of withoutCode.matchAll(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const slug = match[1].toLowerCase().replace(/<[^>]+>/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, "").replace(/\s/g, "-");
    const count = used.get(slug) ?? 0;
    used.set(slug, count + 1);
    anchors.add(count ? `${slug}-${count}` : slug);
  }
  return anchors;
}

function localLinkErrors(root, file) {
  const errors = [];
  const content = withoutFencedCode(text(root, file));
  const links = [...content.matchAll(/\!?\[[^\]]*\]\(<?([^\s)>]+)>?(?:\s+"[^"]*")?\)/g),
    ...content.matchAll(/^\s*\[[^\]]+\]:\s*<?([^\s>]+)>?/gm)];
  for (const [, link] of links) {
    if (/^[a-z][a-z\d+.-]*:|^\/\//i.test(link)) continue;
    try {
      const [targetPart, fragment] = link.split("#");
      const target = targetPart ? path.posix.normalize(path.posix.join(path.posix.dirname(file), decodeURIComponent(targetPart.split("?")[0]))) : file;
      confinedFile(root, target, false);
      if (fragment && target.endsWith(".md") && !markdownAnchors(text(root, target)).has(decodeURIComponent(fragment))) {
        errors.push(`${file}: missing anchor ${link}`);
      }
    } catch (error) { errors.push(`${file}: invalid link ${link} (${error.message})`); }
  }
  return errors;
}

function markdownFiles(root, directory = "docs") {
  return readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const file = `${directory}/${entry.name}`;
    return entry.isDirectory() ? markdownFiles(root, file) : entry.isFile() && file.endsWith(".md") ? [file] : [];
  });
}

export function checkDocumentation(root, catalogue = readCatalogue(root)) {
  const errors = [];
  try { validateCatalogue(root, catalogue); } catch (error) { return [error.message]; }
  const translations = new Set();
  for (const [source, record] of Object.entries(catalogue.documents)) {
    if (!Object.keys(record.translations).length) continue;
    for (const [language, file] of [["en", source], ...Object.entries(record.translations).map(([locale, entry]) => [locale, entry.path])]) {
      const content = text(root, file);
      const blocks = content.match(BLOCK) ?? [];
      if (blocks.length !== 1 || content.split(START).length !== 2 || content.split(END).length !== 2
        || blocks[0] !== renderHeader(root, source, language, catalogue)) errors.push(`${file}: generated header needs update`);
      if (language !== "en") {
        translations.add(file);
        errors.push(...localLinkErrors(root, file));
      }
    }
  }
  for (const file of markdownFiles(root)) {
    if (/\.(es|fr|de|it|nl|pl|pt-br|pt-pt|ru)\.md$/.test(file) && !translations.has(file)) errors.push(`${file}: unregistered translation`);
  }
  const reportPath = path.join(root, "docs/translation-status.md");
  if (!existsSync(reportPath) || text(root, "docs/translation-status.md") !== reportDocumentation(root, catalogue)) {
    errors.push("docs/translation-status.md: generated report needs update");
  }
  return errors;
}

export function reportDocumentation(root, catalogue = readCatalogue(root)) {
  validateCatalogue(root, catalogue);
  const lines = ["# Documentation translation status", "", "Generated by `node scripts/documentation-translations.mjs report`. Synchronization and review are tracked independently.", "",
    "| English source | Language | Synchronization | Review | Reference version | Synchronized |", "| --- | --- | --- | --- | --- | --- |"];
  for (const [source, record] of Object.entries(catalogue.documents).sort(([a], [b]) => a.localeCompare(b))) {
    const hash = sourceHash(text(root, source));
    for (const language of DOCUMENTATION_LANGUAGES) {
      const entry = record.translations[language];
      lines.push(`| [${source.slice(5)}](${source.slice(5)}) | ${entry ? `[${language}](${entry.path.slice(5)})` : language} | ${!entry ? "Pending" : entry.sourceHash === hash ? "Current" : "Stale"} | ${entry?.reviewStatus ?? "—"} | ${entry?.referenceVersion ?? "—"} | ${entry?.synchronizedAt ?? "—"} |`);
    }
  }
  return `${lines.join("\n")}\n`;
}

export function syncTranslation(root, options, catalogue = readCatalogue(root)) {
  const { document, language } = options;
  if (!document || !DOCUMENTATION_LANGUAGES.includes(language)) throw new Error("sync requires --document and a supported --language");
  confinedFile(root, document);
  const translatedPath = document.replace(/\.md$/, `.${language}.md`);
  confinedFile(root, translatedPath);
  const version = options.version ?? JSON.parse(readFileSync(path.join(root, "custom_components/velair/manifest.json"), "utf8")).version;
  const record = catalogue.documents[document] ?? { translations: {} };
  const next = structuredClone(catalogue);
  next.documents[document] = { translations: { ...record.translations, [language]: {
    path: translatedPath, sourceHash: sourceHash(text(root, document)), synchronizedAt: options.date ?? new Date().toISOString().slice(0, 10),
    referenceVersion: version, reviewStatus: options.reviewStatus ?? "automatic",
  } } };
  validateCatalogue(root, next);
  const linkErrors = localLinkErrors(root, translatedPath);
  if (linkErrors.length) throw new Error(linkErrors.join("\n"));
  writeFileSync(path.join(root, "docs/translations.json"), `${JSON.stringify(next, null, 2)}\n`);
  updateHeaders(root, next);
  return next;
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const [command = "report", ...args] = process.argv.slice(2);
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    if (!["--document", "--language", "--version", "--review-status", "--date"].includes(key) || !args[index + 1]) throw new Error(`Invalid option: ${key}`);
    options[key.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = args[index + 1];
  }
  const catalogue = readCatalogue(root);
  if (command === "report") process.stdout.write(reportDocumentation(root, catalogue));
  else if (command === "update-headers") updateHeaders(root, catalogue);
  else if (command === "sync") syncTranslation(root, options, catalogue);
  else if (command === "check") {
    const errors = checkDocumentation(root, catalogue);
    if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; }
    else console.log("Documentation catalogue, headers and translated links are valid.");
  } else throw new Error(`Unknown command: ${command}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
