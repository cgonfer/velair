/** Attach tested archives to a new, draft or public release. No shell execution. */
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

const VERSION = /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/;
export function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
export function releaseIdentityFromEnvironment(env) {
  return { version: env.RELEASE_VERSION, tag: env.RELEASE_TAG,
    commit: env.RELEASE_COMMIT || env.GITHUB_SHA, expectedReleaseId: env.RELEASE_ID || undefined };
}

export function validatePublication(report, assets, { version, commit, tag }) {
  if (!VERSION.test(version) || tag !== `v${version}` || !/^[a-f0-9]{40}$/.test(commit)) throw new Error("Invalid release identity");
  if (report?.schemaVersion !== 1 || report.outcome !== "pass" || report.commit !== commit
      || report.releaseVersion !== version || report.provenance?.workspaceDirty === true
      || !Array.isArray(report.executions)) throw new Error("Release evidence is missing or does not match this tag");
  for (const role of ["release-package", "committed-integration"]) {
    if (!report.executions.some((item) => item.artifactRole === role && item.outcome === "pass")) {
      throw new Error(`Missing successful validation: ${role}`);
    }
  }
  const required = [`velair-custom-component-${version}.zip`, `velair-lovelace-resource-${version}.zip`, "quality-report.json", "quality-report.md"];
  if (new Set(assets.map((item) => item.name)).size !== assets.length || assets.length !== required.length
      || required.some((name) => !assets.some((item) => item.name === name))) throw new Error("Unexpected release assets");
  for (const asset of assets.filter((item) => item.name.endsWith(".zip"))) {
    if (!report.artifacts?.some((item) => item.name === asset.name && item.sha256 === asset.sha256)) throw new Error(`Untested or modified asset: ${asset.name}`);
  }
  return true;
}

export function assetDecision(existing, expected, draft, immutable = false) {
  if (existing?.sha256 === expected.sha256) return "keep";
  if (immutable) throw new Error(`Immutable release cannot change asset ${expected.name}`);
  if (!existing) return "upload";
  if (!draft) throw new Error(`Published asset differs: ${expected.name}; refusing replacement`);
  return "replace-draft";
}

export async function tagCommit(api, tag) {
  let object = (await (await api(`/git/ref/tags/${encodeURIComponent(tag)}`)).json()).object;
  const seen = new Set();
  for (let depth = 0; depth < 8; depth++) {
    if (!/^[a-f0-9]{40}$/.test(object?.sha ?? "") || seen.has(object.sha)) throw new Error("Invalid or cyclic release tag");
    if (object.type === "commit") return object.sha;
    if (object.type !== "tag") throw new Error("Release tag does not resolve to a commit");
    seen.add(object.sha);
    object = (await (await api(`/git/tags/${object.sha}`)).json()).object;
  }
  throw new Error("Release tag nesting exceeds limit");
}

export async function publishRelease({ repository, token, version, tag, commit, artifactsDirectory, reportDirectory, notesPath, expectedReleaseId, request = fetch }) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? "")) throw new Error("Invalid repository");
  if (expectedReleaseId !== undefined && !/^[1-9]\d*$/.test(String(expectedReleaseId))) throw new Error("Invalid recovery release ID");
  const load = (path) => {
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 100_000_000) throw new Error("Invalid release asset file");
    const bytes = readFileSync(path);
    return { name: basename(path), bytes, sha256: sha256(bytes) };
  };
  const assets = readdirSync(artifactsDirectory).filter((name) => name.endsWith(".zip")).map((name) => load(join(artifactsDirectory, name)));
  assets.push(load(join(reportDirectory, "quality-report.json")), load(join(reportDirectory, "quality-report.md")));
  const reportAsset = assets.find((item) => item.name === "quality-report.json");
  if (reportAsset.bytes.length > 2_000_000) throw new Error("Quality report exceeds limit");
  const report = JSON.parse(reportAsset.bytes.toString("utf8"));
  validatePublication(report, assets, { version, tag, commit });
  const api = async (path, options = {}, allow404 = false) => {
    const response = await request(`https://api.github.com/repos/${repository}${path}`, { ...options,
      headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", ...options.headers } });
    if (allow404 && response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub release request failed (${response.status})`);
    return response;
  };
  const verifyTag = async () => {
    if (await tagCommit(api, tag) !== commit) throw new Error("Remote release tag changed after testing");
  };
  const remoteHash = async (asset) => {
    if (typeof asset.digest === "string" && /^sha256:[a-f0-9]{64}$/.test(asset.digest)) return asset.digest.slice(7);
    const response = await api(`/releases/assets/${asset.id}`, { headers: { accept: "application/octet-stream" } });
    if (Number(response.headers.get("content-length") ?? 0) > 100_000_000) throw new Error("Existing release asset exceeds limit");
    const chunks = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 100_000_000) throw new Error("Existing release asset exceeds limit");
      chunks.push(chunk);
    }
    return sha256(Buffer.concat(chunks));
  };
  await verifyTag();
  const previous = await api(`/releases/tags/${encodeURIComponent(tag)}`, {}, true);
  let release = previous ? await previous.json() : null;
  const verifyExistingAssets = (current) => {
    if (current?.assets?.some((asset) => !assets.some((expected) => expected.name === asset.name))) {
      throw new Error("Release contains unexpected unvalidated assets; refusing publication");
    }
  };
  verifyExistingAssets(release);
  const verifyRecoveryRelease = (current) => {
    if (expectedReleaseId !== undefined && (String(current?.id) !== String(expectedReleaseId)
        || current?.tag_name !== tag || typeof current?.draft !== "boolean" || current?.immutable !== false)) {
      throw new Error("Recovery requires the same existing mutable release");
    }
  };
  verifyRecoveryRelease(release);
  if (!release) {
    const notes = readFileSync(notesPath, "utf8");
    if (notes.length > 200_000 || !notes.startsWith(`# Velair ${version}\n`)) throw new Error("Invalid versioned release notes");
    release = await (await api("/releases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      tag_name: tag, target_commitish: commit, name: `Velair ${version}`, draft: true, prerelease: version.includes("-"),
      body: notes + `\n\nQuality evidence: see the attached quality-report.md and quality-report.json. Tested commit: ${commit}. Performance is informational; consult the report for visual-review status and limitations.\n`,
    }) })).json();
  }
  const releaseId = release.id;
  const startedDraft = release.draft;
  const verifyRelease = (current) => {
    if (!Number.isSafeInteger(releaseId) || releaseId <= 0 || current?.id !== releaseId
        || current?.tag_name !== tag || typeof startedDraft !== "boolean" || current?.draft !== startedDraft
        || typeof current?.immutable !== "boolean") throw new Error("Release identity or state changed during publication");
    verifyRecoveryRelease(current);
    verifyExistingAssets(current);
  };
  verifyRelease(release);
  const decisionFor = async (current, asset) => {
    const existing = current.assets?.find((item) => item.name === asset.name);
    const known = existing ? await remoteHash(existing) : undefined;
    return { existing, decision: assetDecision(existing ? { ...existing, sha256: known } : null, asset, current.draft, current.immutable) };
  };
  const refreshRelease = async () => {
    const current = await (await api(`/releases/${releaseId}`)).json();
    verifyRelease(current);
    await verifyTag();
    return current;
  };
  // Reject any conflicting public asset before uploading even the first missing file.
  for (const asset of assets) await decisionFor(release, asset);
  for (const asset of assets) {
    release = await refreshRelease();
    const { existing, decision } = await decisionFor(release, asset);
    if (decision === "keep") continue;
    if (decision === "replace-draft") {
      await api(`/releases/assets/${existing.id}`, { method: "DELETE" });
      release = await refreshRelease();
      const replacement = await decisionFor(release, asset);
      if (replacement.decision === "keep") continue;
      if (replacement.existing) throw new Error("Release asset changed during replacement");
    }
    const url = `https://uploads.github.com/repos/${repository}/releases/${release.id}/assets?name=${encodeURIComponent(asset.name)}`;
    const response = await request(url, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": asset.name.endsWith(".zip") ? "application/zip" : "application/octet-stream", "content-length": String(asset.bytes.length) }, body: asset.bytes });
    if (!response.ok) throw new Error(`Release asset upload failed (${response.status}); rerun to attach missing files`);
    const uploaded = await response.json();
    if (uploaded.size !== asset.bytes.length || await remoteHash(uploaded) !== asset.sha256) throw new Error("Uploaded asset identity mismatch; publication stopped");
  }
  release = await refreshRelease();
  for (const asset of assets) {
    if ((await decisionFor(release, asset)).decision !== "keep") throw new Error("Release assets changed after upload");
  }
  // Digest downloads can take time; check identity again immediately before publication.
  release = await refreshRelease();
  if (release.draft && release.immutable) throw new Error("Immutable release cannot be published by this workflow");
  if (release.draft) await api(`/releases/${release.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ draft: false }) });
  return release.html_url;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  publishRelease({ repository: process.env.GITHUB_REPOSITORY, token: process.env.GH_TOKEN,
    ...releaseIdentityFromEnvironment(process.env),
    artifactsDirectory: process.env.RELEASE_ARTIFACTS, reportDirectory: process.env.RELEASE_REPORT,
    notesPath: process.env.RELEASE_NOTES,
  }).then((url) => console.log(`Published validated release: ${url}`))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
