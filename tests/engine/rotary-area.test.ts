import assert from "node:assert/strict";
import test from "node:test";

import { integrateRotaryOverlapArea } from "../../lib/engine/rotary-area.ts";

function closeTo(actual: number, expected: number, tolerance = 1e-8): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected}`,
  );
}

test("rotary overlap area grows, plateaus and closes from the two physical arcs", () => {
  const result = integrateRotaryOverlapArea({
    circumferenceMm: 100,
    crankCutawayArcMm: 20,
    crankcaseWindowArcMm: 30,
    windowWidthMm: 5,
    integrationStepDeg: 0.25,
  });

  assert.ok(result.value);
  closeTo(result.value.durationDeg, 180);
  closeTo(result.value.crankcaseWindowAreaMm2, 150);
  closeTo(result.value.maximumOverlapArcMm, 20);
  closeTo(result.value.maximumOpenAreaMm2, 100);
  closeTo(result.value.angleAreaMm2Deg, 10_800);
  closeTo(result.value.meanOpenAreaMm2, 60);
  assert.equal(result.value.samples[0].openAreaMm2, 0);
  closeTo(result.value.samples.at(-1)?.openAreaMm2 ?? -1, 0);
});

test("swapping the two arcs preserves the geometric overlap integral", () => {
  const first = integrateRotaryOverlapArea({
    circumferenceMm: 157.07963267948966,
    crankCutawayArcMm: 65.44984694978736,
    crankcaseWindowArcMm: 15.271630954950382,
    windowWidthMm: 8,
  });
  const second = integrateRotaryOverlapArea({
    circumferenceMm: 157.07963267948966,
    crankCutawayArcMm: 15.271630954950382,
    crankcaseWindowArcMm: 65.44984694978736,
    windowWidthMm: 8,
  });

  assert.ok(first.value);
  assert.ok(second.value);
  closeTo(first.value.durationDeg, 185);
  closeTo(second.value.durationDeg, 185);
  closeTo(first.value.maximumOpenAreaMm2, second.value.maximumOpenAreaMm2);
  closeTo(first.value.angleAreaMm2Deg, second.value.angleAreaMm2Deg);
});

test("rotary overlap rejects arcs beyond one timing-track circumference", () => {
  const result = integrateRotaryOverlapArea({
    circumferenceMm: 100,
    crankCutawayArcMm: 70,
    crankcaseWindowArcMm: 40,
    windowWidthMm: 5,
  });

  assert.equal(result.value, null);
  assert.equal(result.valid, false);
  assert.ok(
    result.diagnostics.some(
      (diagnostic) => diagnostic.code === "ROTARY_OVERLAP_ARCS_EXCEED_TRACK",
    ),
  );
});

test("the exact overlap integral is independent of a step that misses both corners", () => {
  const result = integrateRotaryOverlapArea({
    circumferenceMm: 137,
    crankCutawayArcMm: 19.3,
    crankcaseWindowArcMm: 31.7,
    windowWidthMm: 7.2,
    integrationStepDeg: 1.7,
  });

  assert.ok(result.value);
  closeTo(
    result.value.angleAreaMm2Deg,
    7.2 * 19.3 * 31.7 * (360 / 137),
  );
});
