import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateTransmission,
  engineRpmAtRoadSpeed,
  theoreticalRoadSpeedKmh,
  type TransmissionInput,
} from "../../lib/engine/transmission.ts";

function fourSpeedInput(): TransmissionInput {
  return {
    primaryDrivePinionTeeth: 27,
    primaryDrivenGearTeeth: 69,
    wheelRollingCircumferenceMm: 1235,
    maximumRpm: 11_000,
    gears: [
      ["gear-1", "1st gear", 10, 58],
      ["gear-2", "2nd gear", 14, 54],
      ["gear-3", "3rd gear", 18, 50],
      ["gear-4", "4th gear", 22, 46],
    ].map(([id, label, clusterPinionTeeth, drivenGearTeeth]) => ({
      id: id as string,
      label: label as string,
      clusterPinionTeeth: clusterPinionTeeth as number,
      drivenGearTeeth: drivenGearTeeth as number,
    })),
  };
}

function closeTo(actual: number, expected: number, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

test("calculates primary, gear and overall Vespa reductions", () => {
  const input = fourSpeedInput();
  const result = calculateTransmission(input);

  assert.equal(result.valid, true);
  assert.ok(result.value);
  closeTo(result.value.primaryRatio, 69 / 27);
  closeTo(result.value.gears[0].gearRatio, 58 / 10);
  closeTo(result.value.gears[0].overallReduction, (69 / 27) * (58 / 10));
  closeTo(
    result.value.gears[0].wheelRpmAtMaximumRpm,
    11_000 / ((69 / 27) * (58 / 10)),
  );
  closeTo(result.value.gears[3].gearRatio, 46 / 22);
});

test("converts engine speed and theoretical road speed in both directions", () => {
  const overallReduction = (69 / 27) * (46 / 22);
  const speedKmh = theoreticalRoadSpeedKmh({
    engineRpm: 8_000,
    overallReduction,
    wheelRollingCircumferenceMm: 1235,
  });
  const recoveredRpm = engineRpmAtRoadSpeed({
    speedKmh,
    overallReduction,
    wheelRollingCircumferenceMm: 1235,
  });

  closeTo(recoveredRpm, 8_000);
  closeTo(
    speedKmh,
    (8_000 * 1235 * 60) / (overallReduction * 1_000_000),
  );
});

test("reports speed per 1,000 RPM and the constant-speed upshift drop", () => {
  const result = calculateTransmission(fourSpeedInput()).value;
  assert.ok(result);

  closeTo(
    result.gears[3].speedAtMaximumRpmKmh,
    result.gears[3].speedKmhPer1000Rpm * 11,
  );
  closeTo(
    result.gears[0].rpmAfterUpshiftAtMaximumRpm ?? 0,
    11_000 * (result.gears[1].overallReduction / result.gears[0].overallReduction),
  );
  closeTo(
    result.gears[0].rpmDropPercent ?? 0,
    100 * (1 - result.gears[1].overallReduction / result.gears[0].overallReduction),
  );
  assert.equal(result.gears[3].rpmAfterUpshiftAtMaximumRpm, null);
});

test("accepts a complete five-speed transmission", () => {
  const input = fourSpeedInput();
  input.gears = [
    ["gear-1", "1st gear", 11, 56],
    ["gear-2", "2nd gear", 15, 53],
    ["gear-3", "3rd gear", 18, 50],
    ["gear-4", "4th gear", 20, 47],
    ["gear-5", "5th gear", 22, 46],
  ].map(([id, label, clusterPinionTeeth, drivenGearTeeth]) => ({
    id: id as string,
    label: label as string,
    clusterPinionTeeth: clusterPinionTeeth as number,
    drivenGearTeeth: drivenGearTeeth as number,
  }));

  const result = calculateTransmission(input);
  assert.equal(result.valid, true);
  assert.equal(result.value?.gears.length, 5);
});

test("rejects invalid tooth counts, gear counts and duplicate ids", () => {
  const fractional = fourSpeedInput();
  fractional.gears[0].clusterPinionTeeth = 10.5;
  assert.equal(calculateTransmission(fractional).valid, false);

  const zero = fourSpeedInput();
  zero.primaryDrivePinionTeeth = 0;
  assert.equal(calculateTransmission(zero).valid, false);

  const infinite = fourSpeedInput();
  infinite.wheelRollingCircumferenceMm = Number.POSITIVE_INFINITY;
  assert.equal(calculateTransmission(infinite).valid, false);

  const tooFew = fourSpeedInput();
  tooFew.gears.pop();
  assert.equal(calculateTransmission(tooFew).valid, false);

  const duplicate = fourSpeedInput();
  duplicate.gears[1].id = duplicate.gears[0].id;
  assert.equal(calculateTransmission(duplicate).valid, false);

  const excessiveTeeth = fourSpeedInput();
  excessiveTeeth.gears[0].drivenGearTeeth = 201;
  assert.equal(calculateTransmission(excessiveTeeth).valid, false);

  const circumferenceOutOfRange = fourSpeedInput();
  circumferenceOutOfRange.wheelRollingCircumferenceMm = 5_001;
  assert.equal(calculateTransmission(circumferenceOutOfRange).valid, false);

  const rpmOutOfRange = fourSpeedInput();
  rpmOutOfRange.maximumRpm = 20_001;
  assert.equal(calculateTransmission(rpmOutOfRange).valid, false);

  const fractionalRpm = fourSpeedInput();
  fractionalRpm.maximumRpm = 10_000.5;
  assert.equal(calculateTransmission(fractionalRpm).valid, false);
});

test("keeps a non-descending special progression calculable but warns", () => {
  const input = fourSpeedInput();
  input.gears[1] = {
    ...input.gears[1],
    clusterPinionTeeth: 9,
    drivenGearTeeth: 60,
  };
  const result = calculateTransmission(input);

  assert.equal(result.valid, true);
  assert.ok(
    result.diagnostics.some(
      (diagnostic) => diagnostic.code === "GEAR_PROGRESSION_NOT_DESCENDING",
    ),
  );
});
