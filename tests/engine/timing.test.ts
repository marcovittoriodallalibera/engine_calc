import assert from "node:assert/strict";
import test from "node:test";

import {
  arcLengthToDegrees,
  blowdownFromDurations,
  circularIntervalDuration,
  circularIntervalOverlap,
  degreesToArcLength,
  degreesAtRpmToMilliseconds,
  intakeTransferMargin,
  resolveRotaryValveArcGeometry,
  rotaryValveTiming,
  rotaryValveTimingFromArcGeometry,
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

test("direct rotary timing warns when the inlet remains open for the full cycle", () => {
  const result = rotaryValveTiming(180, 180);

  assert.equal(result.value?.durationDeg, 360);
  assert.equal(result.value?.interval.fullCircle, true);
  assert.ok(
    result.diagnostics.some(
      (item) => item.code === "ROTARY_INLET_LEAVES_NO_CLOSED_INTERVAL",
    ),
  );
});

test("circumferential arc length converts to crank degrees without intermediate rounding", () => {
  const converted = arcLengthToDegrees(20, 50);
  const reversed = degreesToArcLength(converted.value!.degrees, 50);

  assert.ok(Math.abs(converted.value!.degrees - 45.83662361046586) < 1e-12);
  assert.ok(Math.abs(reversed.value!.arcLengthMm - 20) < 1e-12);
});

test("desired rotary timing solves the unmeasured crankcase arc", () => {
  const measuredCrankArcMm = (Math.PI * 50 * 150) / 360;
  const result = resolveRotaryValveArcGeometry({
    advanceBeforeTdcDeg: 120,
    delayAfterTdcDeg: 65,
    crankshaftDiameterMm: 50,
    measuredArc: "crank-cutaway",
    measuredArcMm: measuredCrankArcMm,
  });

  assert.ok(result.value);
  assert.ok(Math.abs(result.value.combinedArcMm - (Math.PI * 50 * 185) / 360) < 1e-12);
  assert.ok(Math.abs(result.value.crankCutawayDeg - 150) < 1e-12);
  assert.ok(Math.abs(result.value.crankcaseWindowDeg - 35) < 1e-12);
  assert.ok(Math.abs(result.value.derivedArcMm - (Math.PI * 50 * 35) / 360) < 1e-12);
  assert.deepEqual(result.value.interval, {
    startDeg: 240,
    endDeg: 65,
    fullCircle: false,
  });
});

test("either rotary arc can be the sole measured input", () => {
  const measuredCaseArcMm = (Math.PI * 50 * 35) / 360;
  const result = resolveRotaryValveArcGeometry({
    advanceBeforeTdcDeg: 120,
    delayAfterTdcDeg: 65,
    crankshaftDiameterMm: 50,
    measuredArc: "crankcase-opening",
    measuredArcMm: measuredCaseArcMm,
  });

  assert.ok(result.value);
  assert.equal(result.value.measuredArcMm, measuredCaseArcMm);
  assert.ok(Math.abs(result.value.crankCutawayDeg - 150) < 1e-12);
  assert.ok(Math.abs(result.value.crankcaseWindowDeg - 35) < 1e-12);
});

test("rotary arc solving rejects a measured length that leaves no complement", () => {
  const totalArcMm = (Math.PI * 50 * 185) / 360;
  const equal = resolveRotaryValveArcGeometry({
    advanceBeforeTdcDeg: 120,
    delayAfterTdcDeg: 65,
    crankshaftDiameterMm: 50,
    measuredArc: "crank-cutaway",
    measuredArcMm: totalArcMm,
  });
  const longer = resolveRotaryValveArcGeometry({
    advanceBeforeTdcDeg: 120,
    delayAfterTdcDeg: 65,
    crankshaftDiameterMm: 50,
    measuredArc: "crank-cutaway",
    measuredArcMm: totalArcMm + 1,
  });

  for (const result of [equal, longer]) {
    assert.equal(result.value, null);
    assert.ok(
      result.diagnostics.some(
        (item) => item.code === "ROTARY_MEASURED_ARC_LEAVES_NO_COMPLEMENT",
      ),
    );
  }
});

test("crank cutaway and crankcase window arcs combine into inlet duration", () => {
  const result = rotaryValveTimingFromArcGeometry({
    crankshaftDiameterMm: 50,
    crankCutawayArcMm: (Math.PI * 50 * 150) / 360,
    crankcaseWindowArcMm: (Math.PI * 50 * 35) / 360,
    anchor: "opening-btdc",
    anchorAngleDeg: 120,
  });

  assert.ok(result.value);
  assert.ok(Math.abs(result.value.crankCutawayDeg - 150) < 1e-12);
  assert.ok(Math.abs(result.value.crankcaseWindowDeg - 35) < 1e-12);
  assert.ok(Math.abs(result.value.durationDeg - 185) < 1e-12);
  assert.ok(Math.abs(result.value.delayAfterTdcDeg - 65) < 1e-12);
  assert.deepEqual(result.value.interval, {
    startDeg: 240,
    endDeg: 65,
    fullCircle: false,
  });
});

test("either inlet edge can anchor the same arc-derived timing", () => {
  const common = {
    crankshaftDiameterMm: 50,
    crankCutawayArcMm: (Math.PI * 50 * 150) / 360,
    crankcaseWindowArcMm: (Math.PI * 50 * 35) / 360,
  };
  const opening = rotaryValveTimingFromArcGeometry({
    ...common,
    anchor: "opening-btdc",
    anchorAngleDeg: 120,
  });
  const closing = rotaryValveTimingFromArcGeometry({
    ...common,
    anchor: "closing-atdc",
    anchorAngleDeg: 65,
  });

  assert.deepEqual(opening.value?.interval, closing.value?.interval);
  assert.equal(opening.value?.advanceBeforeTdcDeg, closing.value?.advanceBeforeTdcDeg);
  assert.ok(
    Math.abs(
      (opening.value?.delayAfterTdcDeg ?? 0) -
        (closing.value?.delayAfterTdcDeg ?? 0),
    ) < 1e-12,
  );
});

test("impossible rotary arc geometry returns diagnostics", () => {
  const circumference = Math.PI * 50;
  const tooLong = rotaryValveTimingFromArcGeometry({
    crankshaftDiameterMm: 50,
    crankCutawayArcMm: circumference * 0.75,
    crankcaseWindowArcMm: circumference * 0.5,
    anchor: "opening-btdc",
    anchorAngleDeg: 120,
  });
  const anchorOutsideDuration = rotaryValveTimingFromArcGeometry({
    crankshaftDiameterMm: 50,
    crankCutawayArcMm: circumference / 9,
    crankcaseWindowArcMm: circumference / 18,
    anchor: "opening-btdc",
    anchorAngleDeg: 90,
  });

  assert.equal(tooLong.value, null);
  assert.ok(
    tooLong.diagnostics.some(
      (item) => item.code === "COMBINED_ROTARY_ARCS_EXCEED_CYCLE",
    ),
  );
  assert.equal(anchorOutsideDuration.value, null);
  assert.ok(
    anchorOutsideDuration.diagnostics.some(
      (item) => item.code === "ROTARY_ARC_ANCHOR_OUTSIDE_DURATION",
    ),
  );
});

test("rotary timing requires two positive arcs and tolerates a full circumference", () => {
  const circumference = Math.PI * 87;
  const missingWindow = rotaryValveTimingFromArcGeometry({
    crankshaftDiameterMm: 87,
    crankCutawayArcMm: circumference / 2,
    crankcaseWindowArcMm: 0,
    anchor: "opening-btdc",
    anchorAngleDeg: 90,
  });
  const fullCycle = rotaryValveTimingFromArcGeometry({
    crankshaftDiameterMm: 87,
    crankCutawayArcMm: circumference / 7,
    crankcaseWindowArcMm: (6 * circumference) / 7,
    anchor: "opening-btdc",
    anchorAngleDeg: 120,
  });

  assert.equal(missingWindow.value, null);
  assert.ok(
    missingWindow.diagnostics.some(
      (item) => item.code === "NOT_POSITIVE" && item.field === "crankcaseWindowArcMm",
    ),
  );
  assert.equal(fullCycle.value?.durationDeg, 360);
  assert.equal(fullCycle.value?.interval.fullCircle, true);
  assert.ok(
    fullCycle.diagnostics.some(
      (item) => item.code === "ROTARY_INLET_LEAVES_NO_CLOSED_INTERVAL",
    ),
  );
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
