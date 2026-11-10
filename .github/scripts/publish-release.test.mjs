import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

test("missing public assets can be uploaded; existing public files cannot be replaced", () => {
  const expected = { name: "archive.zip", sha256: "a".repeat(64) };
  assert.equal(assetDecision(null, expected, true), "upload");
  assert.equal(assetDecision(expected, expected, false), "keep");
  assert.equal(assetDecision({ ...expected, sha256: "b".repeat(64) }, expected, true), "replace-draft");
  assert.throws(() => assetDecision({ ...expected, sha256: "b".repeat(64) }, expected, false), /refusing replacement/);
  assert.equal(assetDecision(null, expected, false), "upload");
  assert.throws(() => assetDecision(null, expected, false, true), /Immutable release/);
  assert.equal(assetDecision(expected, expected, false, true), "keep");
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
      const release = { id: 1, tag_name: `v${version}`, draft: true, immutable: false, assets: [], html_url: 'https://github.com/example/velair/releases/tag/test' };
      const request = async (url, options = {}) => {
        if (url.includes('/git/ref/')) { tagChecks++; return new Response(JSON.stringify({ object: { type: 'commit', sha: commit } })); }
        if (url.endsWith(`/releases/tags/v${version}`)) return new Response('', { status: 404 });
        if (url.endsWith('/releases') && options.method === 'POST') {
          assert.equal(JSON.parse(options.body).draft, true);
          return new Response(JSON.stringify(release));
        }
        if (url.startsWith('https://uploads.github.com/')) {
          const id = uploaded.size + 10; uploaded.set(id, Buffer.from(options.body));
          release.assets.push({ id, name: new URL(url).searchParams.get('name'), size: options.body.length });
          return new Response(JSON.stringify({ id, size: options.body.length }));
        }
        const match = url.match(/\/releases\/assets\/(\d+)$/);
        if (match) { downloaded++; return new Response(corrupt ? Buffer.from('corrupted') : uploaded.get(Number(match[1]))); }
        if (url.endsWith('/releases/1') && !options.method) return new Response(JSON.stringify(release));
        if (url.endsWith('/releases/1') && options.method === 'PATCH') {
          assert.equal(uploaded.size, 4); assert.ok(downloaded >= 4); assert.ok(tagChecks >= 2);
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

test("recovery refuses a missing, different or immutable release before any mutation", async () => {
  for (const change of [null, { id: 18 }, { draft: null }, { immutable: true }, { tag_name: "v1.0.0" },
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
      await assert.rejects(publishRelease({ ...fixture.options, request }), /same existing mutable release|unexpected unvalidated assets/);
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
          const asset = { id, name: new URL(url).searchParams.get('name'), size: options.body.length, digest: `sha256:${sha256(options.body)}` };
          release.assets.push(asset);
          return new Response(JSON.stringify(asset));
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
        await assert.rejects(publishRelease({ ...fixture.options, request }), /identity or state changed|404|tag changed/);
        assert.equal(published, false);
        if (mode !== "tag-moved") assert.equal(uploaded.size, 0);
      }
    } finally { fixture.clean(); }
  }
});

function existingReleaseFixture({ draft = false, immutable = false, initial = [], recovery = false } = {}) {
  const fixture = recoveryFixture();
  const { options } = fixture;
  if (!recovery) delete options.expectedReleaseId;
  const names = [`velair-custom-component-${version}.zip`, `velair-lovelace-resource-${version}.zip`, "quality-report.json", "quality-report.md"];
  const bytes = new Map(names.map((name) => [name, readFileSync(join(name.endsWith('.zip') ? options.artifactsDirectory : options.reportDirectory, name))]));
  const state = { release: { id: 17, tag_name: `v${version}`, draft, immutable, name: 'Maintainer title',
    body: 'Maintainer notes and upgrade guidance', assets: [], html_url: 'https://github.com/example/velair/releases/tag/test' },
    mutations: [], reads: 0, tagSha: commit, beforeRead: () => {}, afterDownload: () => {} };
  for (const name of initial) state.release.assets.push({ id: state.release.assets.length + 30, name,
    size: bytes.get(name).length, digest: `sha256:${sha256(bytes.get(name))}` });
  const json = (value) => new Response(JSON.stringify(value));
  options.request = async (url, request = {}) => {
    if (url.includes('/git/ref/')) return json({ object: { type: 'commit', sha: state.tagSha } });
    if (url.includes('/releases/tags/')) return json(state.release);
    if (url.endsWith('/releases/17') && !request.method) {
      state.beforeRead(++state.reads);
      return state.release ? json(state.release) : new Response('', { status: 404 });
    }
    const assetPath = url.match(/\/releases\/assets\/(\d+)$/);
    if (assetPath) {
      const asset = state.release.assets.find(item => item.id === Number(assetPath[1]));
      assert.ok(asset);
      if (request.method === 'DELETE') {
        assert.equal(state.release.draft, true);
        state.mutations.push({ method: 'DELETE', name: asset.name });
        state.release.assets = state.release.assets.filter(item => item !== asset);
        return new Response(null, { status: 204 });
      }
      const content = bytes.get(asset.name);
      state.afterDownload(asset.name);
      return new Response(content);
    }
    if (url.startsWith('https://uploads.github.com/')) {
      const name = new URL(url).searchParams.get('name');
      assert.ok(names.includes(name));
      assert.deepEqual(Buffer.from(request.body), bytes.get(name));
      const asset = { id: state.release.assets.length + 100, name, size: request.body.length, digest: `sha256:${sha256(request.body)}` };
      state.mutations.push({ method: request.method, name });
      state.release.assets.push(asset);
      return json(asset);
    }
    if (url.endsWith('/releases/17') && request.method === 'PATCH') {
      assert.deepEqual(JSON.parse(request.body), { draft: false });
      state.mutations.push({ method: 'PATCH' }); state.release.draft = false;
      return json(state.release);
    }
    throw new Error('Unexpected API request or mutation: ' + url);
  };
  return { ...fixture, state, names, bytes };
}

test("manually created releases retain their notes and visibility while missing validated assets are attached", async (t) => {
  for (const draft of [false, true]) {
    for (const count of [0, 2, 4]) {
      await t.test(`${draft ? 'draft' : 'public'} release with ${count} existing assets`, async () => {
        const fixture = existingReleaseFixture({ draft });
        try {
          fixture.state.release.assets = fixture.names.slice(0, count).map((name, id) => ({ id: id + 30, name,
            size: fixture.bytes.get(name).length, digest: `sha256:${sha256(fixture.bytes.get(name))}` }));
          await publishRelease(fixture.options);
          const { release, mutations } = fixture.state;
          assert.equal(release.name, 'Maintainer title');
          assert.equal(release.body, 'Maintainer notes and upgrade guidance');
          assert.equal(release.draft, false);
          assert.equal(release.assets.length, 4);
          assert.equal(mutations.filter(item => item.method === 'POST').length, 4 - count);
          assert.equal(mutations.filter(item => item.method === 'PATCH').length, Number(draft));
        } finally { fixture.clean(); }
      });
    }
  }
});

test("a conflicting public file is rejected before uploading other missing assets", async () => {
  const fixture = existingReleaseFixture({ initial: ['quality-report.md'] });
  try {
    fixture.state.release.assets[0].digest = `sha256:${'b'.repeat(64)}`;
    await assert.rejects(publishRelease(fixture.options), /refusing replacement/);
    assert.deepEqual(fixture.state.mutations, []);
  } finally { fixture.clean(); }
});

test("recovery also fills a public mutable release without unpublishing or changing its notes", async () => {
  const fixture = existingReleaseFixture({ recovery: true });
  try {
    await publishRelease(fixture.options);
    assert.equal(fixture.state.release.assets.length, 4);
    assert.equal(fixture.state.release.draft, false);
    assert.equal(fixture.state.release.body, 'Maintainer notes and upgrade guidance');
    assert.ok(fixture.state.mutations.every(item => item.method === 'POST'));
  } finally { fixture.clean(); }
});

test("immutable releases allow an identical replay but reject additions before mutation", async () => {
  for (const complete of [false, true]) {
    const fixture = existingReleaseFixture({ immutable: true });
    try {
      if (complete) fixture.state.release.assets = fixture.names.map((name, id) => ({ id: id + 30, name,
        size: fixture.bytes.get(name).length, digest: `sha256:${sha256(fixture.bytes.get(name))}` }));
      if (complete) await publishRelease(fixture.options);
      else await assert.rejects(publishRelease(fixture.options), /Immutable release/);
      assert.deepEqual(fixture.state.mutations, []);
    } finally { fixture.clean(); }
  }
});

test("normal publication refreshes identity, tag and visibility before changing assets", async (t) => {
  for (const change of ['deleted', 'recreated', 'tag', 'draft-to-public', 'public-to-draft', 'immutable', 'conflicting-file']) {
    await t.test(change, async () => {
      const fixture = existingReleaseFixture({ draft: change === 'draft-to-public' });
      try {
        fixture.state.beforeRead = () => {
          const state = fixture.state;
          if (change === 'deleted') state.release = null;
          if (change === 'recreated') state.release.id = 18;
          if (change === 'tag') state.tagSha = 'b'.repeat(40);
          if (change.endsWith('-to-public')) state.release.draft = false;
          if (change.endsWith('-to-draft')) state.release.draft = true;
          if (change === 'immutable') state.release.immutable = true;
          if (change === 'conflicting-file') state.release.assets = [{ id: 1, name: fixture.names[0], digest: `sha256:${'b'.repeat(64)}` }];
        };
        await assert.rejects(publishRelease(fixture.options), /404|identity or state changed|tag changed|Immutable release|refusing replacement/);
        assert.deepEqual(fixture.state.mutations, []);
      } finally { fixture.clean(); }
    });
  }
});

test("a matching concurrent upload is kept instead of uploaded twice", async () => {
  const fixture = existingReleaseFixture();
  try {
    fixture.state.beforeRead = (reads) => {
      if (reads === 1) {
        const name = fixture.names[0];
        fixture.state.release.assets.push({ id: 30, name, size: fixture.bytes.get(name).length,
          digest: `sha256:${sha256(fixture.bytes.get(name))}` });
      }
    };
    await publishRelease(fixture.options);
    assert.equal(fixture.state.release.assets.length, 4);
    assert.equal(fixture.state.mutations.filter(item => item.method === 'POST').length, 3);
  } finally { fixture.clean(); }
});

test("a differing draft asset is deleted and replaced with the verified file before publishing", async () => {
  const fixture = existingReleaseFixture({ draft: true, initial: ['quality-report.md'] });
  try {
    fixture.state.release.assets[0].digest = `sha256:${'b'.repeat(64)}`;
    await publishRelease(fixture.options);
    assert.equal(fixture.state.release.assets.length, 4);
    assert.deepEqual(fixture.state.mutations.filter(item => item.name === 'quality-report.md'),
      [{ method: 'DELETE', name: 'quality-report.md' }, { method: 'POST', name: 'quality-report.md' }]);
    assert.equal(fixture.state.release.assets.find(item => item.name === 'quality-report.md').digest,
      `sha256:${sha256(fixture.bytes.get('quality-report.md'))}`);
    assert.equal(fixture.state.mutations.at(-1).method, 'PATCH');
  } finally { fixture.clean(); }
});

test("a tag or visibility change during the final digest download prevents draft publication", async () => {
  for (const change of ['tag', 'visibility']) {
    const fixture = existingReleaseFixture({ draft: true });
    try {
      fixture.state.release.assets = fixture.names.map((name, id) => ({ id: id + 30, name,
        size: fixture.bytes.get(name).length, digest: `sha256:${sha256(fixture.bytes.get(name))}` }));
      delete fixture.state.release.assets.at(-1).digest;
      let downloads = 0;
      fixture.state.afterDownload = () => {
        // Preflight, per-file verification, then the final complete digest check.
        if (++downloads === 3) {
          if (change === 'tag') fixture.state.tagSha = 'b'.repeat(40);
          else fixture.state.release.draft = false;
        }
      };
      await assert.rejects(publishRelease(fixture.options), /tag changed|identity or state changed/);
      assert.equal(downloads, 3);
      assert.deepEqual(fixture.state.mutations, []);
    } finally { fixture.clean(); }
  }
});
