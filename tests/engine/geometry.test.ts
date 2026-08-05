import assert from "node:assert/strict";
import test from "node:test";

import {
  crankAnglesFromTdcTravel,
  pistonTravelFromTdc,
  portRoofTravelFromMeasurement,
} from "../../lib/engine/index.ts";

function closeTo(actual: number, expected: number, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

test("exact slider-crank matches the 51 mm stroke, 97 mm rod reference", () => {
  const result = pistonTravelFromTdc({
    strokeMm: 51,
    rodLengthMm: 97,
    crankAngleDeg: 33,
  });

  assert.equal(result.valid, true);
  closeTo(result.value!.travelFromTdcMm, 5.113300253226569);
});

test("slider-crank gives TDC and BDC travel and normalises angles", () => {
  const tdc = pistonTravelFromTdc({ strokeMm: 60, rodLengthMm: 110, crankAngleDeg: 360 });
  const bdc = pistonTravelFromTdc({ strokeMm: 60, rodLengthMm: 110, crankAngleDeg: -180 });

  closeTo(tdc.value!.travelFromTdcMm, 0);
  closeTo(bdc.value!.travelFromTdcMm, 60);
  assert.equal(tdc.value!.normalisedCrankAngleDeg, 0);
  assert.equal(bdc.value!.normalisedCrankAngleDeg, 180);
});

test("inverse slider-crank round-trips opening and closing angles", () => {
  const forward = pistonTravelFromTdc({
    strokeMm: 51,
    rodLengthMm: 97,
    crankAngleDeg: 112.4,
  });
  const inverse = crankAnglesFromTdcTravel({
    strokeMm: 51,
    rodLengthMm: 97,
    travelFromTdcMm: forward.value!.travelFromTdcMm,
  });

  assert.equal(inverse.valid, true);
  closeTo(inverse.value!.openingAngleDeg, 112.4, 1e-10);
  closeTo(inverse.value!.closingAngleDeg, 247.6, 1e-10);
});

test("port roof measurement accounts for piston crown position at TDC", () => {
  const result = portRoofTravelFromMeasurement({
    roofDepthFromDeckMm: 34.2,
    crownBelowDeckAtTdcMm: 0.7,
    strokeMm: 51,
  });

  assert.equal(result.valid, true);
  closeTo(result.value!.travelFromTdcMm, 33.5);
});

test("normal invalid geometry produces diagnostics instead of throwing", () => {
  const shortRod = pistonTravelFromTdc({
    strokeMm: 60,
    rodLengthMm: 30,
    crankAngleDeg: 90,
  });
  const excessiveTravel = crankAnglesFromTdcTravel({
    strokeMm: 51,
    rodLengthMm: 97,
    travelFromTdcMm: 52,
  });

  assert.equal(shortRod.valid, false);
  assert.equal(shortRod.value, null);
  assert.ok(shortRod.diagnostics.some((item) => item.code === "ROD_NOT_LONGER_THAN_CRANK"));
  assert.equal(excessiveTravel.valid, false);
  assert.ok(excessiveTravel.diagnostics.some((item) => item.code === "TRAVEL_EXCEEDS_STROKE"));
});
