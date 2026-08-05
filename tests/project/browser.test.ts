import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_PROJECT_BYTES,
  MAX_SHARE_FRAGMENT_LENGTH,
  LEGACY_PROJECT_STORAGE_KEY,
  PROJECT_SCHEMA_VERSION,
  PROJECT_STORAGE_KEY,
  cloneDemonstrationProject,
  serialiseProject,
} from "../../lib/project/model.ts";
import {
  buildProjectShareUrl,
  clearProjectFromStorage,
  copyTextToClipboard,
  downloadBlob,
  importProjectFile,
  loadProjectFromStorage,
  parseProjectShareUrl,
  prepareProjectDownload,
  projectJsonFilename,
  saveProjectToStorage,
  type StorageLike,
} from "../../lib/project/browser.ts";

class FakeStorage implements StorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

class FailingStorage implements StorageLike {
  getItem(): string | null {
    throw new Error("blocked");
  }

  setItem(): void {
    throw new Error("quota");
  }

  removeItem(): void {
    throw new Error("blocked");
  }
}

test("saves, restores and clears the authoritative project", () => {
  const storage = new FakeStorage();
  const project = cloneDemonstrationProject();
  project.name = "Città setup 🔧";

  const empty = loadProjectFromStorage(storage);
  assert.equal(empty.ok, true);
  assert.equal(empty.status, "empty");

  assert.equal(saveProjectToStorage(project, storage).ok, true);
  assert.equal(storage.values.has(PROJECT_STORAGE_KEY), true);

  const restored = loadProjectFromStorage(storage);
  assert.equal(restored.ok, true);
  assert.equal(restored.status, "loaded");
  if (restored.ok) assert.deepEqual(restored.project, project);

  assert.equal(clearProjectFromStorage(storage).ok, true);
  assert.equal(storage.values.has(PROJECT_STORAGE_KEY), false);
});

test("restores and migrates a legacy storage project", () => {
  const storage = new FakeStorage();
  const legacy = cloneDemonstrationProject() as unknown as {
    schemaVersion: number;
    induction: Record<string, unknown>;
  };
  legacy.schemaVersion = 1;
  delete legacy.induction.timingSource;
  delete legacy.induction.crankshaftDiameterMm;
  delete legacy.induction.crankCutawayArcMm;
  delete legacy.induction.crankcaseWindowArcMm;
  delete legacy.induction.arcAnchor;
  delete legacy.induction.arcAnchorAngleDeg;
  storage.values.set(LEGACY_PROJECT_STORAGE_KEY, JSON.stringify(legacy));

  const restored = loadProjectFromStorage(storage);

  assert.equal(restored.ok, true);
  assert.equal(restored.status, "loaded");
  if (restored.ok && restored.project) {
    assert.equal(restored.project.schemaVersion, PROJECT_SCHEMA_VERSION);
    assert.equal(restored.project.induction.timingSource, "direct-angles");
  }
});

test("reports storage failures and invalid stored state without throwing", () => {
  const failing = new FailingStorage();
  assert.doesNotThrow(() => loadProjectFromStorage(failing));
  assert.equal(loadProjectFromStorage(failing).ok, false);
  assert.equal(saveProjectToStorage(cloneDemonstrationProject(), failing).ok, false);
  assert.equal(clearProjectFromStorage(failing).ok, false);

  const corrupt = new FakeStorage();
  corrupt.values.set(PROJECT_STORAGE_KEY, "not json");
  const result = loadProjectFromStorage(corrupt);
  assert.equal(result.ok, false);
  assert.equal(result.status, "invalid");
  assert.equal(corrupt.values.get(PROJECT_STORAGE_KEY), "not json");

  assert.equal(loadProjectFromStorage(null).status, "unavailable");
  assert.equal(saveProjectToStorage(cloneDemonstrationProject(), null).ok, false);
});

test("does not save, export or share an invalid active rotary source", () => {
  const project = cloneDemonstrationProject();
  project.induction.crankcaseWindowArcMm = "0";
  const storage = new FakeStorage();

  assert.equal(saveProjectToStorage(project, storage).ok, false);
  assert.equal(prepareProjectDownload(project).ok, false);
  assert.equal(
    buildProjectShareUrl(project, "https://example.test/").ok,
    false,
  );
  assert.equal(storage.values.has(PROJECT_STORAGE_KEY), false);
});

test("imports a bounded project file atomically", async () => {
  const project = cloneDemonstrationProject();
  const json = serialiseProject(project);
  const valid = await importProjectFile({
    size: new TextEncoder().encode(json).byteLength,
    async text() {
      return json;
    },
  });
  assert.equal(valid.ok, true);
  if (valid.ok) assert.deepEqual(valid.project, project);

  const oversized = await importProjectFile({
    size: MAX_PROJECT_BYTES + 1,
    async text() {
      throw new Error("must not be read");
    },
  });
  assert.equal(oversized.ok, false);
  if (!oversized.ok) assert.match(oversized.message, /too large/u);

  const unreadable = await importProjectFile({
    size: 100,
    async text() {
      throw new Error("read failure");
    },
  });
  assert.equal(unreadable.ok, false);
  if (!unreadable.ok) assert.match(unreadable.message, /could not be read/u);
});

test("prepares a Unicode-safe JSON Blob and a sanitised filename", async () => {
  const project = cloneDemonstrationProject();
  project.name = "Màrcó / Vespa: Ø60?";
  const prepared = prepareProjectDownload(project);

  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;
  assert.equal(prepared.value.filename, "marco-vespa-60.phase360.json");
  assert.equal(prepared.value.blob.type, "application/json;charset=utf-8");
  assert.equal(await prepared.value.blob.text(), prepared.value.json);
  assert.equal(projectJsonFilename("../../"), "phase-360-project.phase360.json");
});

test("builds a private fragment URL and reconstructs the same project", () => {
  const project = cloneDemonstrationProject();
  project.name = "Officina 🔧";
  const shared = buildProjectShareUrl(
    project,
    "https://example.test/tools/phase360?mode=study#old-state",
  );

  assert.equal(shared.ok, true);
  if (!shared.ok) return;
  assert.match(shared.value, /^https:\/\/example\.test\/tools\/phase360\?mode=study#p=/u);
  assert.doesNotMatch(shared.value, /old-state/u);

  const parsed = parseProjectShareUrl(shared.value);
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.deepEqual(parsed.project, project);
});

test("declines an encoded project beyond the share fragment limit", () => {
  const project = cloneDemonstrationProject();
  project.name = "漢".repeat(80);
  for (const key of Object.keys(project.geometry) as Array<keyof typeof project.geometry>) {
    project.geometry[key] = "漢".repeat(32);
  }
  project.ports = Array.from({ length: 12 }, (_, index) => ({
    ...project.ports[0],
    id: `${index}${"漢".repeat(39)}`.slice(0, 40),
    label: "漢".repeat(60),
    sourceValue: "漢".repeat(32),
    widthMm: "漢".repeat(32),
    heightMm: "漢".repeat(32),
    count: "漢".repeat(16),
    uncertaintyMm: "漢".repeat(32),
  }));

  const shared = buildProjectShareUrl(project, "https://example.test/");
  assert.equal(shared.ok, false);
  if (!shared.ok) assert.match(shared.message, /JSON/u);

  const compactBytes = new TextEncoder().encode(JSON.stringify(project)).byteLength;
  assert.ok(Math.ceil((compactBytes * 4) / 3) > MAX_SHARE_FRAGMENT_LENGTH);
});

test("download and clipboard helpers fail safely outside a browser document", async () => {
  assert.equal(downloadBlob(new Blob(["test"]), "test.txt").ok, false);
  assert.equal((await copyTextToClipboard("test")).ok, false);
});
