import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_PROJECT_BYTES,
  MAX_SHARE_FRAGMENT_LENGTH,
  PROJECT_SCHEMA_VERSION,
  changeRotaryMeasuredArc,
  cloneDemonstrationProject,
  decodeProjectFragment,
  encodeProjectFragment,
  parseProjectJson,
  safeProjectFilename,
  serialiseProject,
  validateProjectDocument,
} from "../../lib/project/model.ts";

function legacyProject(version: 1 | 2 | 3 | 4): Record<string, unknown> {
  const project = cloneDemonstrationProject() as unknown as Record<string, unknown>;
  const induction = project.induction as Record<string, unknown>;
  project.schemaVersion = version;
  delete project.character;
  delete induction.areaSource;
  delete induction.commonAxialOverlapWidthMm;
  delete induction.crankshaftDiameterUncertaintyMm;
  delete induction.measuredArcUncertaintyMm;
  delete induction.commonAxialOverlapWidthUncertaintyMm;
  induction.effectiveWindowAreaMm2 = "125";
  if (version < 4) {
    induction.crankCutawayArcMm = "95";
    induction.crankcaseWindowArcMm = "43.9";
    induction.arcAnchor = "opening-btdc";
    induction.arcAnchorAngleDeg = "125";
    delete induction.measuredArc;
    delete induction.measuredArcMm;
  }
  if (version < 3) delete project.report;
  if (version === 1) {
    delete induction.timingSource;
    delete induction.crankshaftDiameterMm;
    delete induction.crankCutawayArcMm;
    delete induction.crankcaseWindowArcMm;
    delete induction.arcAnchor;
    delete induction.arcAnchorAngleDeg;
  }
  return project;
}

test("serialises and parses a complete current-schema project", () => {
  const project = cloneDemonstrationProject();
  project.report.projectCode = "P360-001";
  project.report.projectDate = "2026-08-05";
  project.report.engineDetails =
    "Quattrini cylinder and 51 mm crankshaft\nRotary inlet and expansion exhaust\nBench setup A, città test";
  const json = serialiseProject(project);
  const parsed = parseProjectJson(json);

  assert.equal(project.schemaVersion, PROJECT_SCHEMA_VERSION);
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.deepEqual(parsed.project, project);
});

test("normalises schema version 2 projects with empty report metadata", () => {
  const legacy = legacyProject(2);

  const parsed = parseProjectJson(JSON.stringify(legacy));

  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.project.schemaVersion, PROJECT_SCHEMA_VERSION);
    assert.deepEqual(parsed.project.report, {
      projectCode: "",
      projectDate: "",
      engineDetails: "",
    });
  }
});

test("normalises legacy schema version 1 projects to direct rotary timing", () => {
  const legacy = legacyProject(1);

  const parsed = parseProjectJson(JSON.stringify(legacy));

  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.project.induction.timingSource, "direct-angles");
    assert.equal(parsed.project.induction.crankshaftDiameterMm, "");
    assert.equal(parsed.project.induction.measuredArc, "crank-cutaway");
    assert.equal(parsed.project.induction.measuredArcMm, "");
    assert.equal(parsed.project.schemaVersion, PROJECT_SCHEMA_VERSION);
  }
});

test("migrates schema version 3 arc authority without losing report or active timing", () => {
  const legacy = legacyProject(3);
  const report = legacy.report as Record<string, unknown>;
  report.projectCode = "LEGACY-3";
  report.projectDate = "2026-08-05";
  report.engineDetails = "Measured before migration";
  const induction = legacy.induction as Record<string, unknown>;
  induction.advanceBtdcDeg = "10";
  induction.delayAtdcDeg = "20";

  const parsed = parseProjectJson(JSON.stringify(legacy));

  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    const durationDeg = ((95 + 43.9) * 360) / (Math.PI * 87);
    assert.equal(parsed.project.report.projectCode, "LEGACY-3");
    assert.equal(parsed.project.induction.measuredArc, "crank-cutaway");
    assert.equal(parsed.project.induction.measuredArcMm, "95");
    assert.ok(
      Math.abs(Number(parsed.project.induction.advanceBtdcDeg) - 125) < 1e-12,
    );
    assert.ok(
      Math.abs(
        Number(parsed.project.induction.delayAtdcDeg) - (durationDeg - 125),
      ) < 1e-12,
    );
    const portable = parsed.project as unknown as Record<string, unknown>;
    const portableInduction = portable.induction as Record<string, unknown>;
    assert.equal("crankcaseWindowArcMm" in portableInduction, false);
    assert.equal("arcAnchor" in portableInduction, false);
  }
});

test("migrates schema version 4 without inventing a profile or losing constant area", () => {
  const parsed = parseProjectJson(JSON.stringify(legacyProject(4)));

  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.project.schemaVersion, PROJECT_SCHEMA_VERSION);
    assert.equal(parsed.project.character.profile, "none");
    assert.equal(parsed.project.character.rpmMinimum, "3000");
    assert.equal(parsed.project.induction.areaSource, "constant-area");
    assert.equal(parsed.project.induction.effectiveWindowAreaMm2, "125");
    assert.equal(parsed.project.induction.commonAxialOverlapWidthMm, "");
    assert.equal(
      parsed.project.induction.crankshaftDiameterUncertaintyMm,
      "",
    );
    assert.equal(parsed.project.induction.measuredArcUncertaintyMm, "");
    assert.equal(
      parsed.project.induction.commonAxialOverlapWidthUncertaintyMm,
      "",
    );
  }
});

test("normalises missing optional schema 5 rotary uncertainties without inventing values", () => {
  const project = cloneDemonstrationProject() as unknown as Record<
    string,
    unknown
  >;
  const induction = project.induction as Record<string, unknown>;
  delete induction.crankshaftDiameterUncertaintyMm;
  delete induction.measuredArcUncertaintyMm;
  delete induction.commonAxialOverlapWidthUncertaintyMm;

  const parsed = validateProjectDocument(project);

  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.project.induction.crankshaftDiameterUncertaintyMm, "");
    assert.equal(parsed.project.induction.measuredArcUncertaintyMm, "");
    assert.equal(
      parsed.project.induction.commonAxialOverlapWidthUncertaintyMm,
      "",
    );
  }
});

test("accepts blank or non-negative rotary uncertainties and rejects negative values", () => {
  const project = cloneDemonstrationProject();
  project.induction.crankshaftDiameterUncertaintyMm = "";
  project.induction.measuredArcUncertaintyMm = "0";
  project.induction.commonAxialOverlapWidthUncertaintyMm = "0,25";
  assert.equal(validateProjectDocument(project).ok, true);

  project.induction.measuredArcUncertaintyMm = "-0.01";
  assert.equal(validateProjectDocument(project).ok, false);
});

test("rejects an unsupported profile and invalid character RPM sweep", () => {
  const invalidProfile = cloneDemonstrationProject() as unknown as Record<
    string,
    unknown
  >;
  (invalidProfile.character as Record<string, unknown>).profile = "sprint";
  assert.equal(validateProjectDocument(invalidProfile).ok, false);

  const invalidSweep = cloneDemonstrationProject();
  invalidSweep.character.rpmMinimum = "12000";
  invalidSweep.character.rpmMaximum = "8000";
  assert.equal(validateProjectDocument(invalidSweep).ok, false);
});

test("switching the measured rotary component promotes only a valid complement", () => {
  const project = cloneDemonstrationProject();
  const solvedCaseMm = 43.93693510500859;
  const switched = changeRotaryMeasuredArc(
    project.induction,
    "crankcase-opening",
    {
      crankCutawayArcMm: 95,
      crankcaseWindowArcMm: solvedCaseMm,
    },
  );

  assert.equal(switched.measuredArc, "crankcase-opening");
  assert.equal(switched.measuredArcMm, String(solvedCaseMm));
  assert.equal(switched.measuredArcUncertaintyMm, "");
  const incomplete = changeRotaryMeasuredArc(
    project.induction,
    "crankcase-opening",
    null,
  );
  assert.equal(incomplete.measuredArcMm, "");
  assert.equal(incomplete.measuredArcUncertaintyMm, "");
});

test("rejects impossible active rotary geometry and strips unknown imported fields", () => {
  const impossible = cloneDemonstrationProject();
  impossible.induction.crankshaftDiameterMm = "0";
  assert.equal(validateProjectDocument(impossible).ok, false);

  const noComplement = cloneDemonstrationProject();
  noComplement.induction.measuredArcMm = "200";
  assert.equal(validateProjectDocument(noComplement).ok, false);

  const untrusted = cloneDemonstrationProject() as unknown as Record<string, unknown>;
  untrusted.derived = { powerHp: 99 };
  const validation = validateProjectDocument(untrusted);
  assert.equal(validation.ok, true);
  if (validation.ok) {
    assert.equal("derived" in (validation.project as unknown as Record<string, unknown>), false);
  }
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

test("validates bounded project report metadata", () => {
  const invalidDate = cloneDemonstrationProject();
  invalidDate.report.projectDate = "2026-02-30";
  assert.equal(validateProjectDocument(invalidDate).ok, false);

  const fourthLine = cloneDemonstrationProject();
  fourthLine.report.engineDetails = "one\ntwo\nthree\nfour";
  assert.equal(validateProjectDocument(fourthLine).ok, false);

  const longCode = cloneDemonstrationProject();
  longCode.report.projectCode = "x".repeat(41);
  assert.equal(validateProjectDocument(longCode).ok, false);
});

test("preserves Unicode through a URL-safe fragment round trip", () => {
  const project = cloneDemonstrationProject();
  project.name = "L’officina di Marco 🔧";
  project.ports[0].label = "Scarico Ø39 µm test";
  project.compression.baseSpacerThicknessMm = "0,3";
  project.report.projectCode = "VSP-Ø60";
  project.report.projectDate = "2026-08-05";
  project.report.engineDetails = "Cilindro città\nAlbero 51 mm\nProva banco 🔧";

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
