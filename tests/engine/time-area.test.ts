import assert from "node:assert/strict";
import test from "node:test";

import {
  integrateRectangularPortAngleArea,
  rectangularPortOpenArea,
  specificTimeArea,
} from "../../lib/engine/index.ts";

const port = {
  strokeMm: 50,
  rodLengthMm: 100,
  roofTravelFromTdcMm: 30,
  portWidthMm: 20,
  portHeightMm: 10,
  portCount: 2,
};

function closeTo(actual: number, expected: number, tolerance = 1e-8) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

test("rectangular port area follows piston uncovering", () => {
  const closed = rectangularPortOpenArea({ ...port, crankAngleDeg: 0 });
  const fullyOpen = rectangularPortOpenArea({ ...port, crankAngleDeg: 180 });

  assert.equal(closed.value!.openAreaMm2, 0);
  assert.equal(closed.value!.uncoveredHeightMm, 0);
  assert.equal(fullyOpen.value!.uncoveredHeightMm, 10);
  assert.equal(fullyOpen.value!.openAreaMm2, 400);
  assert.equal(fullyOpen.value!.maximumAreaMm2, 400);
});

test("geometric angle-area is symmetric around BDC", () => {
  const downstroke = integrateRectangularPortAngleArea({
    ...port,
    startAngleDeg: 0,
    endAngleDeg: 180,
    integrationStepDeg: 0.25,
  });
  const upstroke = integrateRectangularPortAngleArea({
    ...port,
    startAngleDeg: 180,
    endAngleDeg: 360,
    integrationStepDeg: 0.25,
  });
  const fullCycle = integrateRectangularPortAngleArea({
    ...port,
    integrationStepDeg: 0.25,
  });

  closeTo(downstroke.value!.angleAreaMm2Deg, upstroke.value!.angleAreaMm2Deg);
  closeTo(
    fullCycle.value!.angleAreaMm2Deg,
    downstroke.value!.angleAreaMm2Deg + upstroke.value!.angleAreaMm2Deg,
  );
});

test("integration can isolate a blowdown angle window", () => {
  const window = integrateRectangularPortAngleArea({
    ...port,
    startAngleDeg: 100,
    endAngleDeg: 120,
    integrationStepDeg: 0.1,
  });

  assert.equal(window.value!.integratedDurationDeg, 20);
  assert.ok(window.value!.angleAreaMm2Deg > 0);
});

test("specific time-area converts angle-area through rpm and displacement", () => {
  const result = specificTimeArea({
    angleAreaMm2Deg: 600_000,
    rpm: 10_000,
    displacementCc: 100,
  });

  assert.equal(result.value!.areaTimeMm2Seconds, 10);
  assert.equal(result.value!.specificTimeAreaSecondsMm2PerCc, 0.1);
});

test("invalid port geometry is diagnostic and does not throw", () => {
  const result = rectangularPortOpenArea({
    ...port,
    portWidthMm: -1,
    crankAngleDeg: 180,
  });

  assert.equal(result.valid, false);
  assert.equal(result.value, null);
  assert.ok(result.diagnostics.some((item) => item.field === "portWidthMm"));
});

test("a port that never closes integrates the whole cycle", () => {
  const geometry = {
    strokeMm: 51,
    rodLengthMm: 97,
    roofTravelFromTdcMm: 0,
    portWidthMm: 39,
    portHeightMm: 17,
    portCount: 1,
  };

  const collapsed = integrateRectangularPortAngleArea({
    ...geometry,
    startAngleDeg: 0,
    endAngleDeg: 0,
    integrationStepDeg: 0.25,
  });
  assert.equal(collapsed.value?.angleAreaMm2Deg, 0);

  const fullCycle = integrateRectangularPortAngleArea({
    ...geometry,
    startAngleDeg: 0,
    endAngleDeg: 0,
    fullCycle: true,
    integrationStepDeg: 0.25,
  });
  const explicit = integrateRectangularPortAngleArea({
    ...geometry,
    startAngleDeg: 0,
    endAngleDeg: 360,
    integrationStepDeg: 0.25,
  });

  assert.ok((fullCycle.value?.angleAreaMm2Deg ?? 0) > 0);
  assert.equal(fullCycle.value?.integratedDurationDeg, 360);
  assert.equal(
    fullCycle.value?.angleAreaMm2Deg,
    explicit.value?.angleAreaMm2Deg,
    "the full-cycle flag must match an explicit 0-360 sweep",
  );
});
