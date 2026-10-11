import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { auditCatalog, discoverCatalogs, entries, exitStatus, parseDictionary, parseJsonDictionary } from "./translation-audit.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const findings = [];
try {
  if (args.length !== 2 || args[0] !== "--base" || !args[1] || args[1].startsWith("-")) throw new Error("Usage: npm run translations:check -- --base <published-tag>");
  const base = args[1];
  execFileSync("git", ["rev-parse", "--verify", `refs/tags/${base}^{commit}`], { cwd: root, stdio: "pipe" });
  function historical(path, required = false) {
    try { return execFileSync("git", ["show", `refs/tags/${base}:${path}`], { cwd: root, encoding: "utf8", stdio: "pipe" }); }
    catch { if (required) throw new Error(`Baseline ${base} does not contain ${path}`); return undefined; }
  }
  const frontendPath = "frontend/src/velair/translations";
  const integrationPath = "custom_components/velair/translations";
  for (const [directory, extension, parse] of [[frontendPath, ".ts", parseDictionary], [integrationPath, ".json", parseJsonDictionary]]) {
    const sourcePath = `${directory}/en${extension}`;
    const source = parse(readFileSync(resolve(root, sourcePath), "utf8"), sourcePath);
    const baselineSource = parse(historical(sourcePath, true), sourcePath);
    for (const [key, value] of entries(source)) if (!value.trim()) findings.push({ catalog: sourcePath, kind: "error", key, reason: "empty English string" });
    const baselineFiles = execFileSync("git", ["ls-tree", "-r", "--name-only", `refs/tags/${base}`, "--", `${directory}/`], { cwd: root, encoding: "utf8", stdio: "pipe" })
      .split(/\r?\n/).filter(Boolean).map(path => path.slice(directory.length + 1));
    for (const { filename, current, baseline } of discoverCatalogs(readdirSync(resolve(root, directory)), baselineFiles, extension)) {
      const path = `${directory}/${filename}`;
      if (!current) {
        findings.push({ catalog: path, kind: "pending", key: "catalog", reason: "language catalog removed since baseline; confirm coverage exception" });
        console.log(`${path}: removed since baseline`);
        continue;
      }
      if (!baseline) findings.push({ catalog: path, kind: "review", key: "catalog", reason: "new language catalog; review translations in context" });
      const locale = parse(readFileSync(resolve(root, path), "utf8"), path);
      const previous = historical(path);
      const results = auditCatalog(source, locale, baselineSource, previous === undefined ? undefined : parse(previous, path));
      findings.push(...results.map(finding => ({ catalog: path, ...finding })));
      console.log(`${path}: ${results.length ? `${results.length} findings` : "OK"}`);
    }
  }
  const template = new Map(entries(parseDictionary(readFileSync(resolve(root, frontendPath, "template.ts"), "utf8"))));
  const english = new Map(entries(parseDictionary(readFileSync(resolve(root, frontendPath, "en.ts"), "utf8"))));
  if (JSON.stringify([...template.keys()].sort()) !== JSON.stringify([...english.keys()].sort()) || [...template.values()].some(value => value !== "")) findings.push({ catalog: "template.ts", kind: "error", key: "template", reason: "template must match English keys with empty values" });
  for (const finding of findings) console.log(`[${finding.kind}] ${finding.catalog} ${finding.key}: ${finding.reason}`);
  console.log(`Baseline: ${base}. ${findings.length} findings. Semantic review remains necessary; equal source and translated text is not automatically an error.`);
  process.exitCode = exitStatus(findings);
} catch (error) {
  console.error(`Translation audit failed: ${error.message}`);
  process.exitCode = 2;
}
