import assert from "node:assert/strict";
import test from "node:test";

import {
  developedPortWidth,
  maximumSquishVelocity,
  primaryCompressionRatio,
  tunedExhaustLength,
} from "../../lib/engine/index.ts";

test("primary compression ratio compares case volume with and without the swept volume", () => {
  const result = primaryCompressionRatio({
    crankcaseVolumeAtBdcCc: 700,
    sweptVolumeCc: 144.199103,
  });

  assert.ok(result.value);
  // (700 + 144.199103) / 700
  assert.ok(Math.abs(result.value.ratio - 1.20599872) < 1e-6);
  assert.equal(result.diagnostics.length, 0);
});

test("a crankcase smaller than the swept volume is warned about", () => {
  const result = primaryCompressionRatio({
    crankcaseVolumeAtBdcCc: 100,
    sweptVolumeCc: 144.2,
  });

  assert.ok(result.value, "the ratio is still reported");
  assert.ok(
    result.diagnostics.some(
      (item) => item.code === "CRANKCASE_VOLUME_BELOW_SWEPT",
    ),
  );
});

test("primary compression rejects a non-positive case volume", () => {
  assert.equal(
    primaryCompressionRatio({
      crankcaseVolumeAtBdcCc: 0,
      sweptVolumeCc: 144.2,
    }).value,
    null,
  );
});

test("a chord width develops into a longer width along the liner", () => {
  const result = developedPortWidth(60, 39);

  assert.ok(result.value);
  // 60 * asin(39/60)
  assert.ok(Math.abs(result.value.developedWidthMm - 42.455066) < 1e-5);
  assert.ok(result.value.developedWidthMm > 39);
  // A 39 mm chord on a 60 mm bore understates the flow-facing width by 8.1%.
  const understatement =
    (result.value.developedWidthMm - 39) / result.value.developedWidthMm;
  assert.ok(understatement > 0.081 && understatement < 0.082);
});

test("a narrow port is barely affected by the chord correction", () => {
  const result = developedPortWidth(60, 6);
  assert.ok(result.value);
  assert.ok(result.value.developedWidthMm - 6 < 0.011);
});

test("a chord wider than the bore is impossible", () => {
  const result = developedPortWidth(60, 61);
  assert.equal(result.value, null);
  assert.ok(
    result.diagnostics.some((item) => item.code === "PORT_WIDTH_EXCEEDS_BORE"),
  );
});

test("a half-bore chord subtends sixty degrees", () => {
  const result = developedPortWidth(60, 30);
  assert.ok(result.value);
  assert.ok(Math.abs(result.value.subtendedAngleDeg - 60) < 1e-9);
});

test("tuned exhaust length matches the wave return time", () => {
  const result = tunedExhaustLength({
    exhaustDurationDeg: 180,
    rpm: 8000,
    gasVelocityMps: 500,
  });

  assert.ok(result.value);
  // 1000 * 500 * 180 / (12 * 8000)
  assert.ok(Math.abs(result.value.tunedLengthMm - 937.5) < 1e-9);
});

test("tuned length shortens as the target speed rises", () => {
  const low = tunedExhaustLength({
    exhaustDurationDeg: 180,
    rpm: 6000,
    gasVelocityMps: 500,
  }).value;
  const high = tunedExhaustLength({
    exhaustDurationDeg: 180,
    rpm: 10000,
    gasVelocityMps: 500,
  }).value;

  assert.ok(low && high);
  assert.ok(low.tunedLengthMm > high.tunedLengthMm);
  // Length is inversely proportional to engine speed.
  assert.ok(
    Math.abs(low.tunedLengthMm * 6000 - high.tunedLengthMm * 10000) < 1e-6,
  );
});

test("squish velocity peaks before TDC and rises as the gap closes", () => {
  const base = {
    strokeMm: 51,
    rodLengthMm: 97,
    boreMm: 60,
    bowlDiameterMm: 42,
    rpm: 8000,
  };

  const wide = maximumSquishVelocity({ ...base, squishGapMm: 1.5 });
  const tight = maximumSquishVelocity({ ...base, squishGapMm: 0.8 });

  assert.ok(wide.value && tight.value);
  assert.ok(
    tight.value.maximumSquishVelocityMps >
      wide.value.maximumSquishVelocityMps,
    "a tighter squish band drives a faster charge",
  );
  assert.ok(
    wide.value.crankAngleAtMaximumDeg > 0 &&
      wide.value.crankAngleAtMaximumDeg < 45,
    "the peak sits between TDC and mid-stroke",
  );
  // A 60 mm bore with a 1.5 mm gap sits in the usual tens of metres per second.
  assert.ok(
    wide.value.maximumSquishVelocityMps > 1 &&
      wide.value.maximumSquishVelocityMps < 60,
  );
});

test("squish velocity scales with engine speed", () => {
  const base = {
    strokeMm: 51,
    rodLengthMm: 97,
    boreMm: 60,
    bowlDiameterMm: 42,
    squishGapMm: 1.2,
  };

  const slow = maximumSquishVelocity({ ...base, rpm: 4000 }).value;
  const fast = maximumSquishVelocity({ ...base, rpm: 8000 }).value;

  assert.ok(slow && fast);
  assert.ok(
    Math.abs(fast.maximumSquishVelocityMps / slow.maximumSquishVelocityMps - 2) <
      1e-6,
    "doubling engine speed doubles squish velocity",
  );
});

test("squish velocity needs a bowl to flow into", () => {
  const result = maximumSquishVelocity({
    strokeMm: 51,
    rodLengthMm: 97,
    boreMm: 60,
    bowlDiameterMm: 0,
    squishGapMm: 1.2,
    rpm: 8000,
  });

  assert.equal(result.value, null);
});
