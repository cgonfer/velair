import ts from "typescript";

// Include baseline-only files so removing an entire language cannot hide coverage loss.
export function discoverCatalogs(currentFiles, baselineFiles, extension) {
  const excluded = new Set(["en.ts", "en.json", "index.ts", "types.ts", "template.ts"]);
  const isCatalog = name => name.endsWith(extension) && !name.includes("/") && !excluded.has(name);
  const current = new Set(currentFiles.filter(isCatalog));
  const baseline = new Set(baselineFiles.filter(isCatalog));
  return [...new Set([...current, ...baseline])].sort().map(filename => ({
    filename, current: current.has(filename), baseline: baseline.has(filename),
  }));
}

// Read static dictionaries without executing project code.
export function parseDictionary(source, filename = "catalog.ts") {
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  if (file.parseDiagnostics.length) throw new Error(`${filename}: invalid TypeScript`);
  function literal(node) {
    if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) return literal(node.expression);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (!ts.isObjectLiteralExpression(node)) throw new Error(`${filename}: expected static object/string`);
    const result = Object.create(null);
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property) || !property.name || ts.isComputedPropertyName(property.name)) throw new Error(`${filename}: unsupported property`);
      const key = property.name.text;
      if (Object.hasOwn(result, key)) throw new Error(`${filename}: duplicate key ${key}`);
      result[key] = literal(property.initializer);
    }
    return result;
  }
  const declarations = file.statements.filter(ts.isVariableStatement)
    .filter(statement => statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword))
    .flatMap(statement => [...statement.declarationList.declarations]);
  if (declarations.length !== 1 || !declarations[0].initializer) throw new Error(`${filename}: expected one exported dictionary`);
  return literal(declarations[0].initializer);
}

export function parseJsonDictionary(source, filename = "catalog.json") {
  JSON.parse(source); // Require JSON grammar, then detect duplicate properties via the AST.
  return parseDictionary(`export const catalog = ${source};`, filename);
}

export function entries(value, prefix = "") {
  if (typeof value === "string") return [[prefix, value]];
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${prefix || "catalog"}: expected object/string`);
  return Object.entries(value).flatMap(([key, child]) => entries(child, prefix ? `${prefix}.${key}` : key));
}

export function placeholders(value) {
  return [...value.matchAll(/\{([^}]+)\}/g)].map(match => match[1]).sort();
}

export function auditCatalog(source, locale, baselineSource, baselineLocale) {
  const current = new Map(entries(source));
  const translated = new Map(entries(locale));
  const oldSource = new Map(entries(baselineSource ?? {}));
  const oldLocale = new Map(entries(baselineLocale ?? {}));
  const findings = [];
  for (const [key, text] of translated) {
    if (!current.has(key)) findings.push({ kind: "error", key, reason: "extra key" });
    else if (!text.trim()) findings.push({ kind: "error", key, reason: "empty string; omit pending translations" });
    else if (JSON.stringify(placeholders(text)) !== JSON.stringify(placeholders(current.get(key)))) findings.push({ kind: "error", key, reason: "placeholder mismatch" });
  }
  for (const [key, text] of current) {
    if (!translated.has(key)) findings.push({ kind: "pending", key, reason: "missing translation" });
    else if (oldSource.has(key) && oldSource.get(key) !== text) findings.push({
      kind: "review", key,
      reason: oldLocale.get(key) === translated.get(key)
        ? "English changed; translation unchanged (potentially stale)"
        : "English and translation changed; confirm meaning in context",
    });
  }
  return findings;
}

export function exitStatus(findings) {
  return findings.some(finding => finding.kind === "error") ? 2 : findings.length ? 1 : 0;
}
