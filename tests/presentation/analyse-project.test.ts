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
  closeTo(result.transmission.result?.primaryRatio ?? null, 69 / 27);
  assert.equal(result.transmission.result?.gears.length, 4);
});

test("transmission results update independently from engine timing", () => {
  const project = cloneDemonstrationProject();
  const baseline = analyseProject(project);
  const baselineTopSpeed = baseline.transmission.result?.maximumSpeedKmh;
  assert.ok(baselineTopSpeed);

  project.transmission.primaryDrivePinionTeeth = "24";
  const shorterPrimary = analyseProject(project);
  assert.ok(
    (shorterPrimary.transmission.result?.maximumSpeedKmh ?? 0) <
      baselineTopSpeed,
  );
  closeTo(
    shorterPrimary.exhaust?.durationDeg ?? null,
    baseline.exhaust?.durationDeg ?? 0,
  );

  project.transmission.enabled = false;
  const disabled = analyseProject(project);
  assert.equal(disabled.transmission.result, null);
  assert.deepEqual(disabled.transmission.diagnostics, []);
});

test("an incomplete transmission does not invalidate other engine analysis", () => {
  const project = cloneDemonstrationProject();
  project.transmission.gears[1].clusterPinionTeeth = "";
  const result = analyseProject(project);

  assert.equal(result.validGeometry, true);
  assert.equal(result.transmission.result, null);
  assert.ok(result.transmission.diagnostics.length > 0);
  assert.ok(result.exhaust);
});

test("desired timing and the solved arc geometry drive identical rotary analysis", () => {
  const project = cloneDemonstrationProject();
  project.induction.advanceBtdcDeg = "120";
  project.induction.delayAtdcDeg = "65";
  project.induction.crankshaftDiameterMm = "50";
  project.induction.measuredArc = "crank-cutaway";
  project.induction.measuredArcMm = String((Math.PI * 50 * 150) / 360);
  project.induction.areaSource = "constant-area";
  project.induction.effectiveWindowAreaMm2 = "120";

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
    geometry.rotary?.overlapAngleAreaMm2Deg ?? null,
    direct.rotary?.overlapAngleAreaMm2Deg ?? 0,
  );
  closeTo(geometry.induction.geometry?.crankCutawayDeg ?? null, 150);
  closeTo(geometry.induction.geometry?.crankcaseWindowDeg ?? null, 35);
  closeTo(geometry.induction.direct?.equivalentCombinedArcMm ?? null, (Math.PI * 50 * 185) / 360);
});

test("a larger crankshaft diameter changes solved lengths without changing desired timing", () => {
  const project = cloneDemonstrationProject();
  project.induction.timingSource = "crank-and-case-arcs";
  project.induction.advanceBtdcDeg = "120";
  project.induction.delayAtdcDeg = "65";
  project.induction.crankshaftDiameterMm = "50";
  project.induction.measuredArc = "crank-cutaway";
  project.induction.measuredArcMm = "60";
  const smaller = analyseProject(project);

  project.induction.crankshaftDiameterMm = "60";
  const larger = analyseProject(project);

  closeTo(larger.rotary?.durationDeg ?? null, smaller.rotary?.durationDeg ?? 0);
  closeTo(larger.rotary?.advanceBeforeTdcDeg ?? null, 120);
  closeTo(larger.rotary?.delayAfterTdcDeg ?? null, 65);
  assert.ok(
    (larger.induction.geometry?.combinedArcMm ?? 0) >
      (smaller.induction.geometry?.combinedArcMm ?? 0),
  );
  assert.ok(
    (larger.induction.geometry?.derivedArcMm ?? 0) >
      (smaller.induction.geometry?.derivedArcMm ?? 0),
  );
});

test("desired timing remains visible while physical arc inputs are incomplete", () => {
  const project = cloneDemonstrationProject();
  project.induction.timingSource = "crank-and-case-arcs";
  project.induction.measuredArcMm = "";

  const result = analyseProject(project);

  assert.equal(result.induction.geometry, null);
  closeTo(result.rotary?.durationDeg ?? null, 178);
  assert.match(result.diagnostics.join(" "), /one positive measured arc/u);
});

test("full-cycle solved geometry retains its explicit warning", () => {
  const project = cloneDemonstrationProject();
  const circumference = Math.PI * 87;
  project.induction.timingSource = "crank-and-case-arcs";
  project.induction.advanceBtdcDeg = "180";
  project.induction.delayAtdcDeg = "180";
  project.induction.crankshaftDiameterMm = "87";
  project.induction.measuredArc = "crank-cutaway";
  project.induction.measuredArcMm = String(circumference / 3);

  const result = analyseProject(project);

  assert.equal(result.induction.geometry?.durationDeg, 360);
  assert.match(result.diagnostics.join(" "), /full 360-degree cycle/u);
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

test("an invalid deck token is never coerced to zero", () => {
  const project = cloneDemonstrationProject();
  project.geometry.deckPositionMm = "-";
  project.ports[0] = {
    ...project.ports[0],
    sourceMode: "depth-from-deck",
    sourceValue: "30.7",
  };

  const result = analyseProject(project);

  assert.equal(result.cylinderLift.effectiveDeckPositionMm, null);
  assert.equal(result.exhaust, null);
  assert.ok(result.ports.some((port) => port.id === "primary"));
  assert.match(result.diagnostics.join(" "), /piston crown position/iu);
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

test("signed inlet margin uses the worst transfer and keeps closing separate", () => {
  const project = cloneDemonstrationProject();
  project.induction.advanceBtdcDeg = "120";
  project.induction.delayAtdcDeg = "55";
  const earlierClose = analyseProject(project);
  const margins = earlierClose.transfers
    .map((transfer) => transfer.valveMarginDeg)
    .filter((value): value is number => value !== null);

  closeTo(earlierClose.rotary?.signedTransferMarginDeg ?? null, Math.max(...margins));
  closeTo(earlierClose.rotary?.inletCloseAfterTdcDeg ?? null, 55);

  project.induction.delayAtdcDeg = "80";
  const laterClose = analyseProject(project);
  closeTo(
    laterClose.rotary?.signedTransferMarginDeg ?? null,
    earlierClose.rotary?.signedTransferMarginDeg ?? 0,
  );
  closeTo(laterClose.rotary?.inletCloseAfterTdcDeg ?? null, 80);
  closeTo(
    (laterClose.rotary?.durationDeg ?? 0) -
      (earlierClose.rotary?.durationDeg ?? 0),
    25,
  );
});

test("the sourced Vespa overlap heuristic warns above plus five degrees", () => {
  const project = cloneDemonstrationProject();
  project.induction.advanceBtdcDeg = "130";
  const result = analyseProject(project);
  const advisory = result.advisories.find(
    (candidate) => candidate.id === "profile-inlet-transfer-margin",
  );

  assert.ok((result.rotary?.signedTransferMarginDeg ?? 0) > 5);
  assert.equal(advisory?.evidence, "profile-heuristic");
  assert.equal(advisory?.claimLevel, "profile-heuristic");
  assert.equal(
    advisory?.evidenceSubtype,
    "practitioner-threshold-comparison",
  );
  assert.equal(advisory?.tone, "strong");
  assert.equal(advisory?.referenceSetVersion, "phase360-profile-lens-1");
  assert.equal(advisory?.uncertaintyStatus, "bounded");
  assert.equal(advisory?.calibration.status, "not-calibrated");
  assert.match(advisory?.applicability ?? "", /Vespa-style/u);
  assert.match(advisory?.message ?? "", /above the \+5 degree/u);
  assert.match(advisory?.sourceUrl ?? "", /youtube\.com/u);
  assert.equal(advisory?.source.kind, "practitioner-guidance");
});

test("no selected profile emits no profile heuristic or character judgement", () => {
  const project = cloneDemonstrationProject();
  project.character.profile = "none";

  const result = analyseProject(project);

  assert.equal(result.character, null);
  assert.equal(
    result.advisories.some(
      (advisory) => advisory.claimLevel === "profile-heuristic",
    ),
    false,
  );
  assert.ok(
    result.advisories.some(
      (advisory) => advisory.claimLevel === "calculated-geometry",
    ),
  );
});

test("an unavailable profile reference is reported without silent substitution", () => {
  const project = cloneDemonstrationProject();
  project.character.referenceSetVersion = "future-profile-reference";

  const result = analyseProject(project);
  const advisory = result.advisories.find(
    (candidate) => candidate.id === "profile-reference-unavailable",
  );

  assert.equal(result.character, null);
  assert.ok(advisory);
  assert.equal(advisory.claimLevel, "profile-heuristic");
  assert.equal(advisory.referenceSetVersion, "future-profile-reference");
  assert.equal(advisory.source.version, "future-profile-reference");
  assert.equal(advisory.uncertaintyStatus, "unavailable");
  assert.match(advisory.message, /no profile rule or character annotation has been substituted/u);
  assert.equal(
    result.advisories.filter(
      (candidate) => candidate.claimLevel === "profile-heuristic",
    ).length,
    1,
  );
});

test("port uncertainty propagates through blowdown, margin and time-area bounds", () => {
  const project = cloneDemonstrationProject();
  const result = analyseProject(project);

  assert.ok(result.timing.uncertainty);
  assert.ok(
    result.timing.uncertainty.globalBlowdownMinDeg <
      (result.timing.globalBlowdownDeg ?? 0),
  );
  assert.ok(
    result.timing.uncertainty.globalBlowdownMaxDeg >
      (result.timing.globalBlowdownDeg ?? 0),
  );
  assert.ok(result.timing.uncertainty.blowdownSpecificTimeAreaMin !== null);
  assert.ok(result.timing.uncertainty.blowdownSpecificTimeAreaMax !== null);
  assert.ok(result.rotary?.signedTransferMarginUncertainty);
});

test("rotary measurement bounds propagate through the complementary arc and area", () => {
  const project = cloneDemonstrationProject();
  project.induction.advanceBtdcDeg = "120";
  project.induction.delayAtdcDeg = "60";
  project.induction.crankshaftDiameterMm = "100";
  project.induction.crankshaftDiameterUncertaintyMm = "1";
  project.induction.measuredArc = "crank-cutaway";
  project.induction.measuredArcMm = "79";
  project.induction.measuredArcUncertaintyMm = "2";
  project.induction.areaSource = "cylindrical-overlap";
  project.induction.commonAxialOverlapWidthMm = "10";
  project.induction.commonAxialOverlapWidthUncertaintyMm = "1";

  const result = analyseProject(project);
  const geometry = result.induction.geometry;
  const area = result.rotary?.areaUncertainty;

  assert.equal(geometry?.uncertaintyStatus, "available");
  assert.ok(geometry?.uncertainty);
  closeTo(
    geometry?.uncertainty?.derivedArcMm.minimum ?? null,
    Math.PI * 99 * 0.5 - 81,
  );
  closeTo(
    geometry?.uncertainty?.derivedArcMm.maximum ?? null,
    Math.PI * 101 * 0.5 - 77,
  );
  assert.equal(area?.provenance.method, "deterministic-worst-case");
  assert.match(area?.provenance.statement ?? "", /No probability distribution/u);

  const areaWithoutWidth = (diameterMm: number, measuredArcMm: number) =>
    measuredArcMm *
    (Math.PI * diameterMm * 0.5 - measuredArcMm) *
    (360 / (Math.PI * diameterMm));
  const expectedMinimum =
    9 * Math.min(areaWithoutWidth(99, 77), areaWithoutWidth(99, 81));
  const stationaryArc = Math.PI * 101 * 0.5 * 0.5;
  const expectedMaximum = 11 * areaWithoutWidth(101, stationaryArc);
  closeTo(area?.overlapAngleAreaMm2Deg.minimum ?? null, expectedMinimum);
  closeTo(area?.overlapAngleAreaMm2Deg.maximum ?? null, expectedMaximum);
  assert.ok(area?.overlapSpecificTimeArea);

  for (const sample of result.rotary?.areaSamples ?? []) {
    assert.notEqual(sample.minimumOpenAreaMm2, null);
    assert.notEqual(sample.maximumOpenAreaMm2, null);
    assert.ok((sample.minimumOpenAreaMm2 ?? Infinity) <= sample.openAreaMm2);
    assert.ok((sample.maximumOpenAreaMm2 ?? -Infinity) >= sample.openAreaMm2);
  }
  const rotarySeries = result.characterGeometry?.series.find(
    (series) => series.id === "rotary-inlet",
  );
  assert.ok(rotarySeries);
  assert.equal(
    rotarySeries?.samples.every(
      (sample) => sample.minimum !== null && sample.maximum !== null,
    ),
    true,
  );
});

test("rotary uncertainty is withheld when its bounds leave the physical domain", () => {
  const project = cloneDemonstrationProject();
  project.induction.crankshaftDiameterUncertaintyMm = "87";

  const result = analyseProject(project);

  assert.equal(result.induction.geometry?.uncertaintyStatus, "outside-domain");
  assert.equal(result.induction.geometry?.uncertainty, null);
  assert.equal(result.rotary?.areaUncertainty, null);
  assert.ok((result.rotary?.overlapAngleAreaMm2Deg ?? 0) > 0);
  assert.match(result.diagnostics.join(" "), /leave the positive complementary-arc domain/u);
});

test("constant-area projects remain compatible without inventing rotary area bounds", () => {
  const project = cloneDemonstrationProject();
  project.induction.areaSource = "constant-area";
  project.induction.effectiveWindowAreaMm2 = "123";

  const result = analyseProject(project);

  closeTo(
    result.rotary?.overlapAngleAreaMm2Deg ?? null,
    123 * (120 + 58),
  );
  assert.equal(result.rotary?.areaModel, "constant-area");
  assert.equal(result.rotary?.areaUncertainty, null);
  assert.equal(
    result.rotary?.areaSamples.every(
      (sample) =>
        sample.minimumOpenAreaMm2 === null &&
        sample.maximumOpenAreaMm2 === null,
    ),
    true,
  );
});

test("the plus-five heuristic is indeterminate when measurement bounds cross it", () => {
  const project = cloneDemonstrationProject();
  const baseline = analyseProject(project);
  const baselineMargin = baseline.rotary?.signedTransferMarginDeg ?? 0;
  project.induction.advanceBtdcDeg = String(120 + (5 - baselineMargin));

  const result = analyseProject(project);
  const advisory = result.advisories.find(
    (candidate) => candidate.id === "profile-inlet-transfer-margin",
  );

  assert.ok(
    (result.rotary?.signedTransferMarginUncertainty?.minimumDeg ?? Infinity) <=
      5,
  );
  assert.ok(
    (result.rotary?.signedTransferMarginUncertainty?.maximumDeg ?? -Infinity) >
      5,
  );
  assert.equal(advisory?.tone, "caution");
  assert.equal(advisory?.uncertaintyStatus, "indeterminate");
  assert.match(advisory?.message ?? "", /indeterminate/u);
});

test("changing only the profile leaves every calculated geometry result unchanged", () => {
  const project = cloneDemonstrationProject();
  project.character.profile = "touring-box";
  const touring = analyseProject(project);
  project.character.profile = "race-expansion";
  const race = analyseProject(project);

  assert.deepEqual(race.ports, touring.ports);
  assert.deepEqual(race.timing, touring.timing);
  assert.deepEqual(race.rotary, touring.rotary);
  assert.notDeepEqual(race.character, touring.character);
});

test("character geometry uses real area units over the bounded RPM sweep", () => {
  const project = cloneDemonstrationProject();
  project.character.rpmMinimum = "4000";
  project.character.rpmMaximum = "5000";
  project.character.rpmStep = "500";
  const result = analyseProject(project);

  assert.ok(result.characterGeometry);
  assert.deepEqual(
    result.characterGeometry.series[0].samples.map((sample) => sample.rpm),
    [4000, 4500, 5000],
  );
  for (const series of result.characterGeometry.series) {
    assert.ok(
      series.samples[0].specificTimeArea >
        series.samples.at(-1)!.specificTimeArea,
    );
  }
  assert.equal(
    result.advisories.some(
      (advisory) => advisory.evidence === "profile-heuristic",
    ),
    true,
  );
  assert.deepEqual(
    new Set(result.advisories.map((advisory) => advisory.evidence)),
    new Set([
      "calculated-geometry",
      "profile-heuristic",
      "measured-or-modelled",
    ]),
  );
});

test("every advisory exposes complete claim, provenance and scope metadata", () => {
  const result = analyseProject(cloneDemonstrationProject());

  assert.ok(result.advisories.length > 0);
  for (const advisory of result.advisories) {
    assert.equal(advisory.claimLevel, advisory.evidence);
    assert.ok(advisory.evidenceSubtype.length > 0);
    assert.ok(advisory.source.id.length > 0);
    assert.ok(advisory.source.label.length > 0);
    assert.ok(advisory.source.version.length > 0);
    assert.equal(advisory.sourceLabel, advisory.source.label);
    assert.equal(advisory.sourceUrl, advisory.source.url);
    assert.ok(advisory.applicability.length > 20);
    assert.ok(advisory.operatingScope.length > 20);
    assert.ok(advisory.calibration.scope.length > 20);
    assert.ok(advisory.uncertaintyStatus.length > 0);

    if (advisory.claimLevel === "profile-heuristic") {
      assert.equal(advisory.referenceSetVersion, "phase360-profile-lens-1");
      assert.equal(advisory.calibration.status, "not-calibrated");
    }
    if (advisory.claimLevel === "calculated-geometry") {
      assert.equal(advisory.referenceSetVersion, null);
      assert.equal(advisory.calibration.status, "not-applicable");
    }
    if (advisory.evidenceSubtype === "idealised-geometric-model") {
      assert.equal(advisory.calibration.status, "not-calibrated");
      assert.match(advisory.calibration.scope, /No discharge coefficient/u);
    }
  }
});
