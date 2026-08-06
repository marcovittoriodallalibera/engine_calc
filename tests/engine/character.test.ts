import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_CHARACTER_PROFILES,
  ENGINE_CHARACTER_REFERENCE_RULES,
  ENGINE_CHARACTER_REFERENCE_SET,
  ENGINE_CHARACTER_REFERENCE_SET_VERSION,
  ENGINE_CHARACTER_REFERENCE_SOURCES,
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

function annotation(
  result: ReturnType<typeof modelEngineCharacter>,
  id: string,
) {
  const match = result.annotations.find((candidate) => candidate.id === id);
  assert.ok(match, `missing character annotation ${id}`);
  return match;
}

function observation(
  result: ReturnType<typeof modelEngineCharacter>,
  metric: (typeof result.observations)[number]["metric"],
) {
  const match = result.observations.find(
    (candidate) => candidate.metric === metric,
  );
  assert.ok(match, `missing character observation ${metric}`);
  return match;
}

test("all profiles belong to one explicit sourced and limited reference set", () => {
  assert.deepEqual(Object.keys(ENGINE_CHARACTER_PROFILES), [
    "touring-box",
    "sport-box",
    "road-expansion",
    "race-expansion",
  ]);
  assert.equal(
    ENGINE_CHARACTER_REFERENCE_SET.version,
    ENGINE_CHARACTER_REFERENCE_SET_VERSION,
  );
  assert.equal(ENGINE_CHARACTER_REFERENCE_SET.status, "uncalibrated-contextual");
  assert.match(ENGINE_CHARACTER_REFERENCE_SET.applicability, /Vespa-style/u);
  assert.ok(ENGINE_CHARACTER_REFERENCE_SET.limitations.length >= 3);

  for (const profile of Object.values(ENGINE_CHARACTER_PROFILES)) {
    assert.equal(profile.referenceSetVersion, ENGINE_CHARACTER_REFERENCE_SET_VERSION);
    assert.ok(profile.intendedUse.length > 20);
    assert.ok(profile.exhaustContext.length > 20);
    assert.ok(profile.applicability.length > 20);
    assert.ok(profile.limitations.length >= 3);
    assert.ok(profile.sourceIds.length >= 2);
    assert.ok(profile.ruleIds.length >= 4);
    for (const sourceId of profile.sourceIds) {
      assert.ok(ENGINE_CHARACTER_REFERENCE_SOURCES[sourceId]);
    }
    for (const ruleId of profile.ruleIds) {
      assert.ok(ENGINE_CHARACTER_REFERENCE_RULES[ruleId]);
    }
  }

  const overlapRule =
    ENGINE_CHARACTER_REFERENCE_RULES[
      "vespa-inlet-overlap-five-degree-ceiling"
    ];
  assert.deepEqual(overlapRule.comparison, {
    metric: "inlet-transfer-margin-deg",
    operator: "maximum-inclusive",
    value: 5,
    unit: "crank-degrees",
  });
  assert.match(
    ENGINE_CHARACTER_REFERENCE_SOURCES["whiteone-vespa-inlet-overlap"].url ??
      "",
    /youtube\.com/u,
  );
});

test("changing profile changes declared context but never geometry or a hidden score", () => {
  const touring = modelEngineCharacter({ ...roadInput, profile: "touring-box" });
  const race = modelEngineCharacter({ ...roadInput, profile: "race-expansion" });

  assert.deepEqual(race.observations, touring.observations);
  assert.notEqual(race.profile.id, touring.profile.id);
  assert.notEqual(
    annotation(race, "selected-profile-context").statement,
    annotation(touring, "selected-profile-context").statement,
  );
  assert.equal("rpmBias" in race, false);
  assert.equal("lowSpeedResponse" in race, false);
  assert.equal("midRangeBreadth" in race, false);
  assert.equal("overRevTendency" in race, false);
  assert.match(race.modelStatement, /No 0-to-100 performance score/u);
  assert.match(race.modelStatement, /No .*torque, power/u);
});

test("inlet closing remains a real-unit observation separate from opening overlap", () => {
  const earlier = modelEngineCharacter({ ...roadInput, inletCloseAtdcDeg: 55 });
  const later = modelEngineCharacter({ ...roadInput, inletCloseAtdcDeg: 82 });

  assert.equal(observation(earlier, "inlet-closing").value, 55);
  assert.equal(observation(later, "inlet-closing").value, 82);
  assert.deepEqual(
    observation(later, "inlet-transfer-margin"),
    observation(earlier, "inlet-transfer-margin"),
  );
  assert.deepEqual(
    annotation(later, "inlet-transfer-reference"),
    annotation(earlier, "inlet-transfer-reference"),
  );
  assert.match(
    annotation(later, "inlet-closing-context").statement,
    /no universal optimum or speed-performance band/u,
  );
});

test("measurement bounds stay attached to real metrics and can make a rule indeterminate", () => {
  const result = modelEngineCharacter(
    { ...roadInput, inletTransferMarginDeg: 5 },
    {
      exhaustDurationDeg: { minimum: 176, maximum: 180 },
      transferDurationDeg: { minimum: 123, maximum: 127 },
      blowdownDeg: { minimum: 24.5, maximum: 28.5 },
      inletTransferMarginDeg: { minimum: 4.5, maximum: 5.5 },
    },
  );

  assert.deepEqual(observation(result, "exhaust-duration"), {
    metric: "exhaust-duration",
    label: "Exhaust duration",
    value: 178,
    minimum: 176,
    maximum: 180,
    unit: "crank-degrees",
  });
  assert.deepEqual(observation(result, "blowdown"), {
    metric: "blowdown",
    label: "Blowdown",
    value: 26.5,
    minimum: 24.5,
    maximum: 28.5,
    unit: "crank-degrees",
  });
  const overlap = annotation(result, "inlet-transfer-reference");
  assert.equal(overlap.status, "indeterminate");
  assert.equal(overlap.uncertaintyStatus, "indeterminate");
  assert.equal(overlap.claimLevel, "profile-heuristic");
  assert.equal(overlap.evidenceSubtype, "practitioner-threshold-comparison");
  assert.match(overlap.statement, /crosses the \+5 degree/u);
});

test("the five-degree comparison is advisory and never becomes a performance verdict", () => {
  const result = modelEngineCharacter({
    ...roadInput,
    inletTransferMarginDeg: 7,
  });
  const overlap = annotation(result, "inlet-transfer-reference");

  assert.equal(overlap.status, "above-reference");
  assert.equal(overlap.rule.comparison?.value, 5);
  assert.equal(overlap.referenceSetVersion, ENGINE_CHARACTER_REFERENCE_SET_VERSION);
  assert.equal(overlap.calibrationScope.startsWith("Not calibrated."), true);
  assert.match(overlap.limitations, /not a statistical tolerance/u);
  assert.doesNotMatch(overlap.statement, /power|torque|safe RPM|optimum/iu);
});

test("missing time-area remains unavailable instead of being replaced by timing scores", () => {
  const result = modelEngineCharacter({
    ...roadInput,
    exhaustSpecificTimeArea: null,
    inletSpecificTimeArea: null,
  });
  const timeArea = annotation(result, "time-area-boundary");

  assert.equal(timeArea.status, "unavailable");
  assert.equal(timeArea.uncertaintyStatus, "unavailable");
  assert.match(timeArea.statement, /No replacement score/u);
});
