import assert from "node:assert/strict";
import test from "node:test";

import {
  blowdownFromDurations,
  circularIntervalDuration,
  circularIntervalOverlap,
  degreesAtRpmToMilliseconds,
  intakeTransferMargin,
  rotaryValveTiming,
  splitCircularInterval,
  symmetricPortTimingFromOpening,
} from "../../lib/engine/index.ts";

test("a symmetric piston port mirrors around BDC", () => {
  const result = symmetricPortTimingFromOpening(112);

  assert.deepEqual(result.value, {
    openingAngleDeg: 112,
    closingAngleDeg: 248,
    durationDeg: 136,
    interval: { startDeg: 112, endDeg: 248, fullCircle: false },
  });
});

test("wrapped circular intervals split and retain their duration", () => {
  const interval = { startDeg: 350, endDeg: 10 };

  assert.equal(circularIntervalDuration(interval).value, 20);
  assert.deepEqual(splitCircularInterval(interval).value, [
    { startDeg: 350, endDeg: 360 },
    { startDeg: 0, endDeg: 10 },
  ]);
});

test("circular overlap works across TDC", () => {
  const overlap = circularIntervalOverlap(
    { startDeg: 350, endDeg: 30 },
    { startDeg: 10, endDeg: 40 },
  );

  assert.equal(overlap.value!.degrees, 20);
  assert.deepEqual(overlap.value!.segments, [{ startDeg: 10, endDeg: 30 }]);
});

test("rotary valve advance and delay form a wrapped interval", () => {
  const timing = rotaryValveTiming(120, 65);

  assert.deepEqual(timing.value, {
    advanceBeforeTdcDeg: 120,
    delayAfterTdcDeg: 65,
    durationDeg: 185,
    interval: { startDeg: 240, endDeg: 65, fullCircle: false },
  });
});

test("blowdown from symmetric durations is half their duration difference", () => {
  const result = blowdownFromDurations(180, 120);

  assert.equal(result.value!.exhaustOpeningAngleDeg, 90);
  assert.equal(result.value!.transferOpeningAngleDeg, 120);
  assert.equal(result.value!.blowdownDeg, 30);
});

test("intake-transfer signed margin distinguishes overlap, gap and coincidence", () => {
  const overlap = intakeTransferMargin({
    intakeAdvanceBeforeTdcDeg: 130,
    transferDurationDeg: 120,
  });
  const gap = intakeTransferMargin({
    intakeAdvanceBeforeTdcDeg: 100,
    transferDurationDeg: 120,
  });
  const coincident = intakeTransferMargin({
    intakeAdvanceBeforeTdcDeg: 120,
    transferDurationDeg: 120,
  });

  assert.equal(overlap.value!.signedMarginDeg, 10);
  assert.equal(overlap.value!.relationship, "overlap");
  assert.equal(gap.value!.signedMarginDeg, -20);
  assert.equal(gap.value!.relationship, "gap");
  assert.equal(coincident.value!.relationship, "coincident");
});

test("degrees convert to elapsed milliseconds at engine speed", () => {
  const result = degreesAtRpmToMilliseconds(180, 6000);

  assert.equal(result.value!.milliseconds, 5);
});

test("invalid rotary timing is reported without an exception", () => {
  const result = rotaryValveTiming(300, 80);

  assert.equal(result.valid, false);
  assert.equal(result.value, null);
  assert.ok(result.diagnostics.some((item) => item.code === "ROTARY_DURATION_EXCEEDS_CYCLE"));
});
