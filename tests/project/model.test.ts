import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_PROJECT_BYTES,
  MAX_SHARE_FRAGMENT_LENGTH,
  PROJECT_SCHEMA_VERSION,
  cloneDemonstrationProject,
  decodeProjectFragment,
  encodeProjectFragment,
  parseProjectJson,
  safeProjectFilename,
  serialiseProject,
  validateProjectDocument,
} from "../../lib/project/model.ts";

test("serialises and parses a complete schema version 1 project", () => {
  const project = cloneDemonstrationProject();
  const json = serialiseProject(project);
  const parsed = parseProjectJson(json);

  assert.equal(project.schemaVersion, PROJECT_SCHEMA_VERSION);
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.deepEqual(parsed.project, project);
});

test("rejects malformed JSON and a newer schema", () => {
  assert.deepEqual(parseProjectJson("{not-json"), {
    ok: false,
    message: "The project is not valid JSON.",
  });

  const newer = cloneDemonstrationProject() as unknown as Record<string, unknown>;
  newer.schemaVersion = PROJECT_SCHEMA_VERSION + 1;
  const validation = validateProjectDocument(newer);
  assert.equal(validation.ok, false);
  if (!validation.ok) assert.match(validation.message, /newer version/u);
});

test("enforces document, collection and label limits", () => {
  const tooManyPorts = cloneDemonstrationProject();
  tooManyPorts.ports = Array.from({ length: 13 }, (_, index) => ({
    ...tooManyPorts.ports[0],
    id: `port-${index}`,
  }));
  assert.equal(validateProjectDocument(tooManyPorts).ok, false);

  const longLabel = cloneDemonstrationProject();
  longLabel.ports[0].label = "x".repeat(61);
  assert.equal(validateProjectDocument(longLabel).ok, false);

  const oversized = " ".repeat(MAX_PROJECT_BYTES + 1);
  const parsed = parseProjectJson(oversized);
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.match(parsed.message, /too large/u);
});

test("preserves Unicode through a URL-safe fragment round trip", () => {
  const project = cloneDemonstrationProject();
  project.name = "L’officina di Marco 🔧";
  project.ports[0].label = "Scarico Ø39 µm test";
  project.compression.baseSpacerThicknessMm = "0,3";

  const fragment = encodeProjectFragment(project);
  assert.doesNotMatch(fragment, /[+/=]/u);
  const decoded = decodeProjectFragment(`#p=${fragment}`);

  assert.equal(decoded.ok, true);
  if (decoded.ok) assert.deepEqual(decoded.project, project);
});

test("rejects empty, corrupt and over-limit fragments", () => {
  assert.equal(decodeProjectFragment("#p=").ok, false);
  assert.equal(decodeProjectFragment("#p=%%%not-base64").ok, false);
  assert.equal(
    decodeProjectFragment(`#p=${"a".repeat(MAX_SHARE_FRAGMENT_LENGTH + 1)}`).ok,
    false,
  );
});

test("creates stable ASCII-safe project filename stems", () => {
  assert.equal(safeProjectFilename("  Màrcó / Vespa: Ø60?  "), "marco-vespa-60");
  assert.equal(safeProjectFilename("../../"), "phase-360-project");
  assert.equal(safeProjectFilename("x".repeat(100)).length, 64);
});
