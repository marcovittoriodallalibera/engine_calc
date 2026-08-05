import assert from "node:assert/strict";
import test from "node:test";
import { analyseProject } from "../../lib/presentation/analyse-project.ts";
import { cloneDemonstrationProject } from "../../lib/project/model.ts";

function closeTo(actual: number | null, expected: number, tolerance = 1e-6) {
  assert.notEqual(actual, null);
  assert.ok(Math.abs((actual as number) - expected) <= tolerance);
}

test("demonstration project produces a complete integrated analysis", () => {
  const result = analyseProject(cloneDemonstrationProject());

  assert.equal(result.validGeometry, true);
  closeTo(result.displacementCc, 144.199103, 0.00001);
  closeTo(result.exhaust?.durationDeg ?? null, 175.079614, 0.00001);
  assert.ok((result.timing.globalBlowdownDeg ?? 0) > 15);
  assert.ok((result.rotary?.unionTransferOverlapDeg ?? 0) > 0);
  assert.ok((result.compression.geometricRatio ?? 0) > 12);
  assert.ok((result.compression.trappedRatio ?? 0) > 7);
  closeTo(result.squish.areaPercent, 51, 0.00001);
  assert.equal(result.ports.every((port) => port.angleAreaMm2Deg !== null), true);
});

test("direct timing and equivalent crank-and-case arcs drive identical rotary analysis", () => {
  const project = cloneDemonstrationProject();
  project.induction.advanceBtdcDeg = "120";
  project.induction.delayAtdcDeg = "65";
  project.induction.crankshaftDiameterMm = "50";
  project.induction.crankCutawayArcMm = String((Math.PI * 50 * 150) / 360);
  project.induction.crankcaseWindowArcMm = String((Math.PI * 50 * 35) / 360);
  project.induction.arcAnchor = "opening-btdc";
  project.induction.arcAnchorAngleDeg = "120";

  project.induction.timingSource = "direct-angles";
  const direct = analyseProject(project);
  project.induction.timingSource = "crank-and-case-arcs";
  const geometry = analyseProject(project);

  closeTo(geometry.rotary?.durationDeg ?? null, direct.rotary?.durationDeg ?? 0);
  assert.deepEqual(geometry.rotary?.interval, direct.rotary?.interval);
  closeTo(
    geometry.rotary?.unionTransferOverlapDeg ?? null,
    direct.rotary?.unionTransferOverlapDeg ?? 0,
  );
  closeTo(
    geometry.rotary?.tripleOverlapDeg ?? null,
    direct.rotary?.tripleOverlapDeg ?? 0,
  );
  closeTo(
    geometry.rotary?.idealisedAngleAreaMm2Deg ?? null,
    direct.rotary?.idealisedAngleAreaMm2Deg ?? 0,
  );
  closeTo(geometry.induction.geometry?.directDurationDifferenceDeg ?? null, 0);
  closeTo(geometry.induction.direct?.equivalentCombinedArcMm ?? null, (Math.PI * 50 * 185) / 360);
});

test("a larger crankshaft diameter shortens fixed arc timing while preserving its anchor", () => {
  const project = cloneDemonstrationProject();
  project.induction.timingSource = "crank-and-case-arcs";
  project.induction.crankshaftDiameterMm = "50";
  project.induction.crankCutawayArcMm = "60";
  project.induction.crankcaseWindowArcMm = "20";
  project.induction.arcAnchor = "opening-btdc";
  project.induction.arcAnchorAngleDeg = "100";
  const smaller = analyseProject(project);

  project.induction.crankshaftDiameterMm = "60";
  const larger = analyseProject(project);

  assert.ok((larger.rotary?.durationDeg ?? 0) < (smaller.rotary?.durationDeg ?? 0));
  closeTo(larger.rotary?.advanceBeforeTdcDeg ?? null, 100);
  assert.ok(
    (larger.rotary?.delayAfterTdcDeg ?? Number.POSITIVE_INFINITY) <
      (smaller.rotary?.delayAfterTdcDeg ?? 0),
  );
});

test("arc contributions remain available when the phase anchor is missing", () => {
  const project = cloneDemonstrationProject();
  project.induction.timingSource = "crank-and-case-arcs";
  project.induction.arcAnchorAngleDeg = "";

  const result = analyseProject(project);

  assert.ok((result.induction.geometry?.durationDeg ?? 0) > 0);
  assert.equal(result.induction.geometry?.advanceBeforeTdcDeg, null);
  assert.equal(result.induction.geometry?.delayAfterTdcDeg, null);
  assert.equal(result.rotary, null);
  assert.match(result.diagnostics.join(" "), /one timing anchor/u);
});

test("full-cycle arc warning remains visible while the phase anchor is missing", () => {
  const project = cloneDemonstrationProject();
  const circumference = Math.PI * 87;
  project.induction.timingSource = "crank-and-case-arcs";
  project.induction.crankshaftDiameterMm = "87";
  project.induction.crankCutawayArcMm = String(circumference / 3);
  project.induction.crankcaseWindowArcMm = String((2 * circumference) / 3);
  project.induction.arcAnchorAngleDeg = "";

  const result = analyseProject(project);

  assert.equal(result.induction.geometry?.durationDeg, 360);
  assert.match(result.diagnostics.join(" "), /full 360-degree cycle/u);
  assert.match(result.diagnostics.join(" "), /one timing anchor/u);
});

test("equivalent source modes preserve the same physical port event", () => {
  const project = cloneDemonstrationProject();
  const first = analyseProject(project);
  const primary = first.ports.find((port) => port.id === "primary");
  assert.ok(primary);

  project.ports = project.ports.map((port) =>
    port.id === "primary"
      ? {
          ...port,
          sourceMode: "duration" as const,
          sourceValue: String(primary.durationDeg),
        }
      : port,
  );
  const second = analyseProject(project);
  const converted = second.ports.find((port) => port.id === "primary");
  assert.ok(converted);
  closeTo(converted.travelFromTdcMm, primary.travelFromTdcMm, 0.000001);
  closeTo(converted.durationDeg, primary.durationDeg, 0.000001);
});

test("deck-referenced depth accounts for the assembled piston position", () => {
  const project = cloneDemonstrationProject();
  project.geometry.deckPositionMm = "0.7";
  project.ports[0] = {
    ...project.ports[0],
    sourceMode: "depth-from-deck",
    sourceValue: "30.7",
  };
  const result = analyseProject(project);

  closeTo(result.exhaust?.travelFromTdcMm ?? null, 30);
  closeTo(result.exhaust?.durationDeg ?? null, 175.079614, 0.00001);
});

test("a 0.1 mm cylinder lift recalculates every port from unchanged crank geometry", () => {
  const project = cloneDemonstrationProject();
  const baseline = analyseProject(project);
  project.compression.baseSpacerThicknessMm = "0.1";
  const lifted = analyseProject(project);

  assert.equal(lifted.cylinderLift.valid, true);
  closeTo(lifted.cylinderLift.appliedThicknessMm, 0.1);
  closeTo(lifted.exhaust?.durationDeg ?? null, 175.5344, 0.0001);
  closeTo(lifted.cylinderLift.globalBlowdownDeltaDeg, -0.0533, 0.0001);
  closeTo(
    lifted.squish.meanGapMm,
    (baseline.squish.meanGapMm ?? 0) + 0.1,
  );
  assert.ok(
    (lifted.compression.geometricRatio ?? Number.POSITIVE_INFINITY) <
      (baseline.compression.geometricRatio ?? 0),
  );
  assert.equal(lifted.rotary?.durationDeg, baseline.rotary?.durationDeg);
  assert.equal(project.geometry.strokeMm, "51");
  assert.equal(project.geometry.rodLengthMm, "97");

  for (const comparison of lifted.cylinderLift.ports) {
    closeTo(
      comparison.liftedTravelFromTdcMm,
      comparison.baselineTravelFromTdcMm - 0.1,
    );
    assert.ok(comparison.openingDeltaDeg < 0);
    assert.ok(comparison.durationDeltaDeg > 0);
  }
});

test("cylinder lift is applied after normalising an angle-authoritative port", () => {
  const linearProject = cloneDemonstrationProject();
  const baseline = analyseProject(linearProject);
  const primaryBaseline = baseline.ports.find((port) => port.id === "primary");
  assert.ok(primaryBaseline);

  const angularProject = cloneDemonstrationProject();
  angularProject.ports = angularProject.ports.map((port) =>
    port.id === "primary"
      ? {
          ...port,
          sourceMode: "duration" as const,
          sourceValue: String(primaryBaseline.durationDeg),
        }
      : port,
  );
  linearProject.compression.baseSpacerThicknessMm = "0.3";
  angularProject.compression.baseSpacerThicknessMm = "0.3";

  const linear = analyseProject(linearProject).ports.find(
    (port) => port.id === "primary",
  );
  const angular = analyseProject(angularProject).ports.find(
    (port) => port.id === "primary",
  );
  assert.ok(linear);
  assert.ok(angular);
  closeTo(angular.travelFromTdcMm, linear.travelFromTdcMm);
  closeTo(angular.durationDeg, linear.durationDeg);
});

test("an excessive cylinder lift is rejected without silently moving ports", () => {
  const project = cloneDemonstrationProject();
  const baseline = analyseProject(project);
  project.compression.baseSpacerThicknessMm = "31";
  const result = analyseProject(project);

  assert.equal(result.cylinderLift.valid, false);
  assert.equal(result.cylinderLift.appliedThicknessMm, 0);
  closeTo(
    result.exhaust?.durationDeg ?? null,
    baseline.exhaust?.durationDeg ?? 0,
  );
  assert.match(result.diagnostics.join(" "), /highest enabled port roof/u);
});

test("cylinder lift does not clip an uncertainty range that crosses TDC", () => {
  const project = cloneDemonstrationProject();
  project.ports[0] = {
    ...project.ports[0],
    sourceMode: "travel-from-tdc",
    sourceValue: "0.15",
    uncertaintyMm: "0.10",
  };
  project.compression.baseSpacerThicknessMm = "0.10";
  const result = analyseProject(project);

  assert.equal(result.cylinderLift.valid, true);
  assert.equal(result.exhaust?.uncertainty, null);
  assert.match(result.diagnostics.join(" "), /uncertainty extends outside/u);
});

test("component clearance mode and reed mode remain explicit", () => {
  const project = cloneDemonstrationProject();
  project.compression.volumeMode = "component-breakdown";
  project.induction.mode = "reed";
  const result = analyseProject(project);

  closeTo(result.compression.clearanceVolumeCc, 12.4);
  assert.equal(result.compression.clearanceVolumeMode, "component-breakdown");
  assert.equal(result.rotary, null);
  assert.equal(
    result.transfers.every(
      (transfer) => transfer.valveRelationship === "not-applicable",
    ),
    true,
  );
});
