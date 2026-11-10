import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { assetDecision, publishRelease, releaseIdentityFromEnvironment, sha256, tagCommit, validatePublication } from "./publish-release.mjs";

const version = "2.0.0-beta.1";
const commit = "a".repeat(40);
test("CLI identity follows the tested product commit rather than recovery workflow HEAD", () => {
  const env = { RELEASE_VERSION: version, RELEASE_TAG: `v${version}`, GITHUB_SHA: "b".repeat(40), RELEASE_COMMIT: commit, RELEASE_ID: "17" };
  assert.deepEqual(releaseIdentityFromEnvironment(env), { version, tag: `v${version}`, commit, expectedReleaseId: "17" });
  delete env.RELEASE_COMMIT; delete env.RELEASE_ID;
  assert.deepEqual(releaseIdentityFromEnvironment(env), { version, tag: `v${version}`, commit: env.GITHUB_SHA, expectedReleaseId: undefined });
});
function example() {
  const assets = [`velair-custom-component-${version}.zip`, `velair-lovelace-resource-${version}.zip`, "quality-report.json", "quality-report.md"]
    .map((name) => ({ name, sha256: sha256(Buffer.from(name)) }));
  const report = { schemaVersion: 1, outcome: "pass", commit, releaseVersion: version,
    executions: [{ artifactRole: "release-package", outcome: "pass" }, { artifactRole: "committed-integration", outcome: "pass" }], artifacts: assets.slice(0, 2) };
  return { assets, report, identity: { version, tag: `v${version}`, commit } };
}

test("publication requires both paths, exact tag/commit and tested archive hashes", () => {
  const { assets, report, identity } = example();
  assert.equal(validatePublication(report, assets, identity), true);
  for (const patch of [{ commit: "b".repeat(40) }, { outcome: "fail" }, { releaseVersion: "1.0.0" }, { executions: report.executions.slice(0, 1) }, { artifacts: [] }]) {
    assert.throws(() => validatePublication({ ...report, ...patch }, assets, identity));
  }
  assert.throws(() => validatePublication(report, [{ ...assets[0], sha256: "f".repeat(64) }, ...assets.slice(1)], identity));
  assert.throws(() => validatePublication(report, [...assets, assets[0]], identity));
  assert.throws(() => validatePublication(report, assets, { ...identity, tag: "v1.0.0" }));
});

test("published assets are immutable; draft replacements are explicit", () => {
  const expected = { name: "archive.zip", sha256: "a".repeat(64) };
  assert.equal(assetDecision(null, expected, true), "upload");
  assert.equal(assetDecision(expected, expected, false), "keep");
  assert.equal(assetDecision({ ...expected, sha256: "b".repeat(64) }, expected, true), "replace-draft");
  assert.throws(() => assetDecision({ ...expected, sha256: "b".repeat(64) }, expected, false), /refusing replacement/);
  assert.throws(() => assetDecision(null, expected, false), /refusing to modify/);
});

test("remote tag peeling handles annotated tags and rejects loops", async () => {
  const json = (value) => new Response(JSON.stringify(value));
  const annotated = "b".repeat(40);
  const calls = [];
  assert.equal(await tagCommit(async (path) => {
    calls.push(path);
    return json({ object: path.includes('/git/ref/') ? { sha: annotated, type: 'tag' } : { sha: commit, type: 'commit' } });
  }, `v${version}`), commit);
  assert.equal(calls.length, 2);
  await assert.rejects(tagCommit(async () => json({ object: { sha: annotated, type: 'tag' } }), `v${version}`), /cyclic/);
  await assert.rejects(tagCommit(async () => json({ object: { sha: annotated, type: 'tree' } }), `v${version}`), /does not resolve/);
});

test("invalid lineage aborts before any GitHub request or draft creation", async () => {
  const temporary = mkdtempSync(join(tmpdir(), "velair-publish-test-"));
  try {
    const artifacts = join(temporary, "assets"); const evidence = join(temporary, "evidence");
    mkdirSync(artifacts); mkdirSync(evidence);
    const { report } = example();
    for (const name of [`velair-custom-component-${version}.zip`, `velair-lovelace-resource-${version}.zip`]) writeFileSync(join(artifacts, name), "modified");
    writeFileSync(join(evidence, "quality-report.json"), JSON.stringify(report));
    writeFileSync(join(evidence, "quality-report.md"), "evidence");
    let calls = 0;
    await assert.rejects(publishRelease({ repository: "example/velair", token: "test", version, tag: `v${version}`, commit,
      artifactsDirectory: artifacts, reportDirectory: evidence, notesPath: join(temporary, "unused.md"),
      request: async () => { calls++; throw new Error("must not be called"); },
    }), /Untested or modified/);
    assert.equal(calls, 0);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});

test("uploads without server digests are downloaded and hashed before publication", async () => {
  for (const corrupt of [false, true]) {
    const temporary = mkdtempSync(join(tmpdir(), "velair-upload-test-"));
    try {
      const artifacts = join(temporary, "assets"); const evidence = join(temporary, "evidence");
      mkdirSync(artifacts); mkdirSync(evidence);
      const { report } = example();
      for (const asset of report.artifacts) writeFileSync(join(artifacts, asset.name), asset.name);
      writeFileSync(join(evidence, "quality-report.json"), JSON.stringify(report));
      writeFileSync(join(evidence, "quality-report.md"), "quality evidence");
      const notesPath = join(temporary, "notes.md"); writeFileSync(notesPath, `# Velair ${version}\n\n- Test\n`);
      const uploaded = new Map(); let published = false; let tagChecks = 0; let downloaded = 0;
      const request = async (url, options = {}) => {
        if (url.includes('/git/ref/')) { tagChecks++; return new Response(JSON.stringify({ object: { type: 'commit', sha: commit } })); }
        if (url.endsWith(`/releases/tags/v${version}`)) return new Response('', { status: 404 });
        if (url.endsWith('/releases') && options.method === 'POST') {
          assert.equal(JSON.parse(options.body).draft, true);
          return new Response(JSON.stringify({ id: 1, draft: true, assets: [], html_url: 'https://github.com/example/velair/releases/tag/test' }));
        }
        if (url.startsWith('https://uploads.github.com/')) {
          const id = uploaded.size + 10; uploaded.set(id, Buffer.from(options.body));
          return new Response(JSON.stringify({ id, size: options.body.length }));
        }
        const match = url.match(/\/releases\/assets\/(\d+)$/);
        if (match) { downloaded++; return new Response(corrupt ? Buffer.from('corrupted') : uploaded.get(Number(match[1]))); }
        if (url.endsWith('/releases/1') && options.method === 'PATCH') {
          assert.equal(uploaded.size, 4); assert.equal(downloaded, 4); assert.equal(tagChecks, 2);
          published = true; return new Response('{}');
        }
        throw new Error('Unexpected request ' + url);
      };
      const task = publishRelease({ repository: 'example/velair', token: 'test', version, tag: `v${version}`, commit,
        artifactsDirectory: artifacts, reportDirectory: evidence, notesPath, request });
      if (corrupt) { await assert.rejects(task, /identity mismatch/); assert.equal(published, false); }
      else { await task; assert.equal(published, true); }
    } finally { rmSync(temporary, { recursive: true, force: true }); }
  }
});

function recoveryFixture() {
  const temporary = mkdtempSync(join(tmpdir(), "velair-recovery-test-"));
  const artifacts = join(temporary, "assets"), evidence = join(temporary, "evidence");
  mkdirSync(artifacts); mkdirSync(evidence);
  const { report } = example();
  for (const asset of report.artifacts) writeFileSync(join(artifacts, asset.name), asset.name);
  writeFileSync(join(evidence, "quality-report.json"), JSON.stringify(report));
  writeFileSync(join(evidence, "quality-report.md"), "evidence");
  return { options: { repository: "example/velair", token: "test", version, tag: `v${version}`, commit,
    artifactsDirectory: artifacts, reportDirectory: evidence, notesPath: join(temporary, "must-not-read"), expectedReleaseId: "17" },
    clean: () => rmSync(temporary, { recursive: true, force: true }) };
}

test("recovery refuses a missing, different, public or immutable release before any mutation", async () => {
  for (const change of [null, { id: 18 }, { draft: false }, { immutable: true }, { tag_name: "v1.0.0" },
    { assets: [{ name: "unreviewed.zip", id: 4 }] }]) {
    const fixture = recoveryFixture(); let mutations = 0;
    try {
      const request = async (url, options = {}) => {
        if (options.method) { mutations++; throw new Error("Unexpected mutation"); }
        if (url.includes('/git/ref/')) return new Response(JSON.stringify({ object: { type: 'commit', sha: commit } }));
        if (url.includes('/releases/tags/')) return change === null ? new Response('', { status: 404 })
          : new Response(JSON.stringify({ id: 17, tag_name: `v${version}`, draft: true, immutable: false, assets: [], ...change }));
        throw new Error("Unexpected request");
      };
      await assert.rejects(publishRelease({ ...fixture.options, request }), /same existing mutable draft|unexpected unvalidated assets/);
      assert.equal(mutations, 0);
    } finally { fixture.clean(); }
  }
});

test("recovery keeps release ID and notes, and aborts if draft state or tag changes", async () => {
  for (const mode of ["success", "deleted", "public", "different-id", "tag-moved"]) {
    const fixture = recoveryFixture(); const uploaded = new Map(); let published = false, tagChecks = 0;
    try {
      const release = { id: 17, tag_name: `v${version}`, draft: true, immutable: false, assets: [], html_url: "https://github.com/example/velair/releases/tag/test" };
      const request = async (url, options = {}) => {
        if (url.includes('/git/ref/')) {
          tagChecks++;
          return new Response(JSON.stringify({ object: { type: 'commit', sha: mode === "tag-moved" && tagChecks > 1 ? "b".repeat(40) : commit } }));
        }
        if (url.includes('/releases/tags/')) return new Response(JSON.stringify(release));
        if (url.endsWith('/releases/17') && !options.method) {
          if (mode === "deleted") return new Response('', { status: 404 });
          return new Response(JSON.stringify({ ...release, ...(mode === "public" ? { draft: false } : {}), ...(mode === "different-id" ? { id: 18 } : {}) }));
        }
        if (url.startsWith('https://uploads.github.com/')) {
          const id = uploaded.size + 20; uploaded.set(id, Buffer.from(options.body));
          return new Response(JSON.stringify({ id, size: options.body.length, digest: `sha256:${sha256(options.body)}` }));
        }
        if (url.endsWith('/releases/17') && options.method === 'PATCH') {
          assert.deepEqual(JSON.parse(options.body), { draft: false });
          assert.equal(uploaded.size, 4); published = true;
          return new Response('{}');
        }
        throw new Error("Unexpected mutation or request " + url);
      };
      if (mode === "success") {
        assert.equal(await publishRelease({ ...fixture.options, request }), release.html_url);
        assert.equal(published, true);
      } else {
        await assert.rejects(publishRelease({ ...fixture.options, request }), /same existing mutable draft|404|tag changed/);
        assert.equal(published, false);
        if (mode !== "tag-moved") assert.equal(uploaded.size, 0);
      }
    } finally { fixture.clean(); }
  }
});
