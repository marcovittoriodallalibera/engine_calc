import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_CHARACTER_PROFILES,
  modelEngineCharacter,
} from "../../lib/engine/character.ts";

const roadInput = {
  profile: "sport-box" as const,
  exhaustDurationDeg: 178,
  transferDurationDeg: 125,
  blowdownDeg: 26.5,
  inletAdvanceBtdcDeg: 120,
  inletCloseAtdcDeg: 60,
  inletTransferMarginDeg: 2.5,
  exhaustSpecificTimeArea: 4e-5,
  inletSpecificTimeArea: 4e-5,
};

test("all four selectable interpretation profiles are explicit", () => {
  assert.deepEqual(Object.keys(ENGINE_CHARACTER_PROFILES), [
    "touring-box",
    "sport-box",
    "road-expansion",
    "race-expansion",
  ]);
});

test("an expansion context shifts the same geometry towards higher-speed emphasis", () => {
  const touring = modelEngineCharacter({ ...roadInput, profile: "touring-box" });
  const race = modelEngineCharacter({ ...roadInput, profile: "race-expansion" });

  assert.ok(race.rpmBias.value > touring.rpmBias.value);
  assert.ok(race.overRevTendency.value > touring.overRevTendency.value);
  assert.ok(race.lowSpeedResponse.value < touring.lowSpeedResponse.value);
  assert.notEqual(race.speedEmphasis, touring.speedEmphasis);
  assert.ok(["upper-mid", "high-speed"].includes(race.speedEmphasis));
  assert.match(race.modelStatement, /not a dyno curve/u);
});

test("late inlet closing is kept separate and reduces the low-speed tendency", () => {
  const earlier = modelEngineCharacter({ ...roadInput, inletCloseAtdcDeg: 55 });
  const later = modelEngineCharacter({ ...roadInput, inletCloseAtdcDeg: 82 });

  assert.ok(later.rpmBias.value > earlier.rpmBias.value);
  assert.ok(later.lowSpeedResponse.value < earlier.lowSpeedResponse.value);
});

test("measurement bounds propagate into every qualitative score", () => {
  const result = modelEngineCharacter(roadInput, {
    exhaustDurationDeg: { minimum: 176, maximum: 180 },
    transferDurationDeg: { minimum: 123, maximum: 127 },
    blowdownDeg: { minimum: 24.5, maximum: 28.5 },
    inletTransferMarginDeg: { minimum: 0.5, maximum: 4.5 },
  });

  assert.ok(result.rpmBias.minimum < result.rpmBias.maximum);
  assert.ok(result.lowSpeedResponse.minimum < result.lowSpeedResponse.maximum);
  assert.ok(result.midRangeBreadth.minimum <= result.midRangeBreadth.value);
  assert.ok(result.midRangeBreadth.maximum >= result.midRangeBreadth.value);
  assert.ok(result.overRevTendency.minimum < result.overRevTendency.maximum);
});
