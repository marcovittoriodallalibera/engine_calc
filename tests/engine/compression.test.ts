import assert from "node:assert/strict";
import test from "node:test";

import {
  displacement,
  evaluateCompressionScenario,
  geometricCompressionRatio,
  meanPistonSpeed,
  squishGapStatistics,
  squishGeometryFromAreaRatio,
  squishGeometryFromBowlDiameter,
  targetClearanceVolumeForTrappedRatio,
  trappedCompressionFromGeometric,
  trappedCompressionRatio,
} from "../../lib/engine/index.ts";

function closeTo(actual: number, expected: number, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

test("displacement and mean piston speed use metric geometry", () => {
  const volume = displacement({ boreMm: 66, strokeMm: 60 });
  const speed = meanPistonSpeed(60, 9000);

  closeTo(volume.value!.displacementPerCylinderCc, 205.2716639855571);
  assert.equal(speed.value!.metresPerSecond, 18);
});

test("geometric and trapped compression ratios retain their volume basis", () => {
  const geometric = geometricCompressionRatio({ sweptVolumeCc: 100, clearanceVolumeCc: 10 });
  const trapped = trappedCompressionRatio({
    boreMm: 50,
    exhaustClosureTravelFromTdcMm: 40,
    clearanceVolumeCc: 10,
  });
  const equivalent = trappedCompressionFromGeometric(11, 40, 50);

  assert.equal(geometric.value!.ratio, 11);
  closeTo(trapped.value!.trappedSweptVolumeCc, 78.53981633974483);
  closeTo(trapped.value!.ratio, 8.853981633974483);
  assert.equal(equivalent.value, 9);
});

test("target trapped ratio solves the required clearance volume", () => {
  const target = targetClearanceVolumeForTrappedRatio({
    boreMm: 50,
    exhaustClosureTravelFromTdcMm: 40,
    targetTrappedRatio: 8.853981633974483,
  });

  closeTo(target.value!.targetClearanceVolumeCc, 10);
});

const scenarioInput = {
  boreMm: 50,
  strokeMm: 50,
  rodLengthMm: 100,
  clearanceVolumeCc: 10,
  squishGapMm: 1,
  exhaustRoofTravelFromTdcMm: 35,
  transferRoofTravelsFromTdcMm: { primary: 40 },
};

test("a head gasket changes clearance and squish but not port timing", () => {
  const result = evaluateCompressionScenario(scenarioInput, {
    kind: "head-gasket",
    thicknessMm: 1,
  });

  assert.equal(result.valid, true);
  closeTo(result.value!.clearanceVolumeDeltaCc, Math.PI * 50 ** 2 / 4 / 1000);
  assert.equal(result.value!.after.squishGapMm, 2);
  assert.equal(
    result.value!.after.exhaustTiming.durationDeg,
    result.value!.before.exhaustTiming.durationDeg,
  );
  assert.ok(
    result.value!.after.geometricCompressionRatio <
      result.value!.before.geometricCompressionRatio,
  );
});

test("a base spacer increases port duration and squish", () => {
  const result = evaluateCompressionScenario(scenarioInput, {
    kind: "base-spacer",
    thicknessMm: 1,
  });

  assert.equal(result.value!.after.exhaustRoofTravelFromTdcMm, 34);
  assert.equal(result.value!.after.transferRoofTravelsFromTdcMm.primary, 39);
  assert.equal(result.value!.after.squishGapMm, 2);
  assert.ok(
    result.value!.after.exhaustTiming.durationDeg >
      result.value!.before.exhaustTiming.durationDeg,
  );
});

test("raising only the exhaust roof reduces trapped ratio without changing geometric ratio", () => {
  const result = evaluateCompressionScenario(scenarioInput, {
    kind: "exhaust-roof-raise",
    heightMm: 1,
  });

  assert.equal(
    result.value!.after.geometricCompressionRatio,
    result.value!.before.geometricCompressionRatio,
  );
  assert.equal(result.value!.after.squishGapMm, result.value!.before.squishGapMm);
  assert.ok(
    result.value!.after.trappedCompressionRatio <
      result.value!.before.trappedCompressionRatio,
  );
  assert.ok(
    result.value!.after.exhaustTiming.durationDeg >
      result.value!.before.exhaustTiming.durationDeg,
  );
});

test("central squish geometry round-trips bowl diameter and area ratio", () => {
  const fromBowl = squishGeometryFromBowlDiameter(60, 48);
  const fromRatio = squishGeometryFromAreaRatio(60, 0.36);

  closeTo(fromBowl.value!.squishAreaRatio, 0.36);
  assert.equal(fromBowl.value!.bandWidthMm, 6);
  closeTo(fromRatio.value!.bowlDiameterMm, 48);
});

test("squish gap statistics expose minimum, mean and asymmetry", () => {
  const result = squishGapStatistics([1, 1.2, 0.8, 1]);

  assert.equal(result.value!.minimumMm, 0.8);
  assert.equal(result.value!.maximumMm, 1.2);
  assert.equal(result.value!.meanMm, 1);
  closeTo(result.value!.rangeMm, 0.4);
  closeTo(result.value!.standardDeviationMm, Math.sqrt(0.02));
});
