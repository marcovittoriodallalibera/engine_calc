export type EngineCharacterProfile =
  | "touring-box"
  | "sport-box"
  | "road-expansion"
  | "race-expansion";

export interface NumericRange {
  minimum: number;
  maximum: number;
}

export const ENGINE_CHARACTER_REFERENCE_SET_VERSION =
  "phase360-profile-lens-1" as const;
export const ENGINE_CHARACTER_MODEL_VERSION =
  "phase360-character-annotations-2" as const;

export type CharacterReferenceSourceId =
  | "phase360-profile-taxonomy"
  | "whiteone-vespa-inlet-overlap";

export interface CharacterReferenceSource {
  id: CharacterReferenceSourceId;
  label: string;
  kind: "declared-application-rule" | "practitioner-guidance";
  version: string;
  url: string | null;
  statement: string;
}

export const ENGINE_CHARACTER_REFERENCE_SOURCES: Record<
  CharacterReferenceSourceId,
  CharacterReferenceSource
> = {
  "phase360-profile-taxonomy": {
    id: "phase360-profile-taxonomy",
    label: "Phase 360 declared profile taxonomy",
    kind: "declared-application-rule",
    version: ENGINE_CHARACTER_REFERENCE_SET_VERSION,
    url: null,
    statement:
      "Developer-authored exhaust-use categories and interpretation boundaries. They are declared application rules, not literature-derived performance bands or calibrated test results.",
  },
  "whiteone-vespa-inlet-overlap": {
    id: "whiteone-vespa-inlet-overlap",
    label: "WhiteOne Racing, Vespa rotary-inlet overlap",
    kind: "practitioner-guidance",
    version: "video reference at 08:26, accessed for profile-lens-1",
    url: "https://www.youtube.com/watch?v=jhnKO9YTaC0&t=506s",
    statement:
      "Practitioner guidance discussing a conservative maximum of 5 crank degrees for Vespa rotary-inlet opening overlap with transfer closure.",
  },
};

export type CharacterReferenceRuleId =
  | "selected-profile-is-context"
  | "blowdown-degrees-are-not-capacity"
  | "vespa-inlet-overlap-five-degree-ceiling"
  | "inlet-closing-remains-separate"
  | "time-area-stays-in-physical-units";

export interface CharacterReferenceRule {
  id: CharacterReferenceRuleId;
  label: string;
  statement: string;
  sourceIds: readonly CharacterReferenceSourceId[];
  applicability: string;
  limitations: string;
  comparison:
    | {
        metric: "inlet-transfer-margin-deg";
        operator: "maximum-inclusive";
        value: 5;
        unit: "crank-degrees";
      }
    | null;
}

export const ENGINE_CHARACTER_REFERENCE_RULES: Record<
  CharacterReferenceRuleId,
  CharacterReferenceRule
> = {
  "selected-profile-is-context": {
    id: "selected-profile-is-context",
    label: "Selected profile is context only",
    statement:
      "Use the explicitly selected exhaust-use profile only to frame interpretation. Never infer it from geometry and never let it alter a calculated value.",
    sourceIds: ["phase360-profile-taxonomy"],
    applicability:
      "User-selected exhaust-use context for a Vespa-style two-stroke project.",
    limitations:
      "The category does not identify a particular exhaust, cylinder, inlet, ignition, fuel, load or measured engine response.",
    comparison: null,
  },
  "blowdown-degrees-are-not-capacity": {
    id: "blowdown-degrees-are-not-capacity",
    label: "Blowdown duration is not a capacity verdict",
    statement:
      "Report blowdown degrees as geometry and compare angle-area or specific time-area at the stated RPM before discussing flow opportunity.",
    sourceIds: ["phase360-profile-taxonomy"],
    applicability:
      "Piston-ported exhaust and transfer events with a valid exhaust-first opening order.",
    limitations:
      "No gas state, discharge coefficient, exhaust-wave behaviour, duct shape or pressure history is modelled.",
    comparison: null,
  },
  "vespa-inlet-overlap-five-degree-ceiling": {
    id: "vespa-inlet-overlap-five-degree-ceiling",
    label: "Vespa inlet-opening overlap reference",
    statement:
      "Compare the signed inlet-opening versus final-transfer-closure margin with a conservative maximum-inclusive reference of +5 crank degrees.",
    sourceIds: ["whiteone-vespa-inlet-overlap"],
    applicability:
      "Vespa-style crankshaft rotary induction where a positive signed margin means the inlet opens before every transfer has closed.",
    limitations:
      "This practitioner reference is not a statistical tolerance, universal optimum or proof of flow direction. Starting, blowback and delivery require physical verification.",
    comparison: {
      metric: "inlet-transfer-margin-deg",
      operator: "maximum-inclusive",
      value: 5,
      unit: "crank-degrees",
    },
  },
  "inlet-closing-remains-separate": {
    id: "inlet-closing-remains-separate",
    label: "Inlet closing is interpreted separately",
    statement:
      "Retain inlet closing after TDC as its own measured or calculated edge. Do not fold it into the inlet-opening overlap comparison.",
    sourceIds: ["phase360-profile-taxonomy"],
    applicability: "Crankshaft rotary induction with a valid closing edge.",
    limitations:
      "This reference set contains no universal good, bad or optimum inlet-closing band. Crankcase pressure and inlet restriction are not modelled.",
    comparison: null,
  },
  "time-area-stays-in-physical-units": {
    id: "time-area-stays-in-physical-units",
    label: "Time-area remains a geometric flow-opportunity measure",
    statement:
      "Keep calculated angle-area and specific time-area in their physical units and do not combine them into a performance score.",
    sourceIds: ["phase360-profile-taxonomy"],
    applicability:
      "Idealised geometric port or rotary opening profiles with valid area, displacement and RPM inputs.",
    limitations:
      "The geometric result excludes discharge, pressure, temperature, combustion, wave action and mechanical losses.",
    comparison: null,
  },
};

export interface EngineCharacterProfileDefinition {
  id: EngineCharacterProfile;
  label: string;
  shortLabel: string;
  description: string;
  intendedUse: string;
  exhaustContext: string;
  referenceSetVersion: typeof ENGINE_CHARACTER_REFERENCE_SET_VERSION;
  sourceIds: readonly CharacterReferenceSourceId[];
  ruleIds: readonly CharacterReferenceRuleId[];
  applicability: string;
  limitations: readonly string[];
}

const sharedRuleIds: readonly CharacterReferenceRuleId[] = [
  "selected-profile-is-context",
  "blowdown-degrees-are-not-capacity",
  "vespa-inlet-overlap-five-degree-ceiling",
  "inlet-closing-remains-separate",
  "time-area-stays-in-physical-units",
];

const sharedProfileLimits = [
  "No built-in profile is a dyno-derived or statistically calibrated performance band.",
  "The selected category does not predict torque, power, peak output, acceleration, vehicle speed or safe RPM.",
  "Hardware identity, pipe dimensions, carburation, ignition, gas state, load and losses remain outside this reference set.",
] as const;

export const ENGINE_CHARACTER_PROFILES: Record<
  EngineCharacterProfile,
  EngineCharacterProfileDefinition
> = {
  "touring-box": {
    id: "touring-box",
    label: "Touring box",
    shortLabel: "Touring",
    description: "Broad road-use interpretation with low and mid-range intent.",
    intendedUse: "Road touring, flexibility and sustained part-throttle use.",
    exhaustContext:
      "A conventional box exhaust selected by the user as a touring context.",
    referenceSetVersion: ENGINE_CHARACTER_REFERENCE_SET_VERSION,
    sourceIds: ["phase360-profile-taxonomy", "whiteone-vespa-inlet-overlap"],
    ruleIds: sharedRuleIds,
    applicability:
      "Vespa-style two-stroke projects explicitly paired with a touring box exhaust context.",
    limitations: sharedProfileLimits,
  },
  "sport-box": {
    id: "sport-box",
    label: "Sport box",
    shortLabel: "Sport",
    description:
      "Road-use interpretation with stronger upper mid-range intent than a touring box.",
    intendedUse: "Responsive road use with a sport-oriented box exhaust.",
    exhaustContext:
      "A box-format sport exhaust selected by the user, not inferred from timing.",
    referenceSetVersion: ENGINE_CHARACTER_REFERENCE_SET_VERSION,
    sourceIds: ["phase360-profile-taxonomy", "whiteone-vespa-inlet-overlap"],
    ruleIds: sharedRuleIds,
    applicability:
      "Vespa-style two-stroke projects explicitly paired with a sport box exhaust context.",
    limitations: sharedProfileLimits,
  },
  "road-expansion": {
    id: "road-expansion",
    label: "Road expansion",
    shortLabel: "Road pipe",
    description:
      "Road-use expansion-chamber interpretation with upper mid-range intent.",
    intendedUse:
      "Road use where an expansion chamber is selected for a more focused speed region.",
    exhaustContext:
      "A road-oriented expansion chamber selected by the user, without pipe dimensions or wave simulation.",
    referenceSetVersion: ENGINE_CHARACTER_REFERENCE_SET_VERSION,
    sourceIds: ["phase360-profile-taxonomy", "whiteone-vespa-inlet-overlap"],
    ruleIds: sharedRuleIds,
    applicability:
      "Vespa-style two-stroke projects explicitly paired with a road expansion-chamber context.",
    limitations: sharedProfileLimits,
  },
  "race-expansion": {
    id: "race-expansion",
    label: "Race expansion",
    shortLabel: "Race pipe",
    description:
      "Competition expansion-chamber interpretation with a focused high-speed intent.",
    intendedUse:
      "Competition use where a narrower operating region is an explicit design choice.",
    exhaustContext:
      "A competition expansion chamber selected by the user, without pipe dimensions or wave simulation.",
    referenceSetVersion: ENGINE_CHARACTER_REFERENCE_SET_VERSION,
    sourceIds: ["phase360-profile-taxonomy", "whiteone-vespa-inlet-overlap"],
    ruleIds: sharedRuleIds,
    applicability:
      "Vespa-style two-stroke projects explicitly paired with a race expansion-chamber context.",
    limitations: sharedProfileLimits,
  },
};

export const ENGINE_CHARACTER_REFERENCE_SET = {
  id: "phase360-vespa-character-reference",
  version: ENGINE_CHARACTER_REFERENCE_SET_VERSION,
  label: "Phase 360 Vespa character reference",
  status: "uncalibrated-contextual" as const,
  sources: ENGINE_CHARACTER_REFERENCE_SOURCES,
  rules: ENGINE_CHARACTER_REFERENCE_RULES,
  applicability:
    "Vespa-style piston-ported two-stroke geometry with optional crankshaft rotary induction and an explicitly selected exhaust-use context.",
  limitations: sharedProfileLimits,
};

export interface EngineCharacterInputs {
  profile: EngineCharacterProfile;
  exhaustDurationDeg: number;
  transferDurationDeg: number;
  blowdownDeg: number;
  inletAdvanceBtdcDeg: number;
  inletCloseAtdcDeg: number;
  inletTransferMarginDeg: number;
  exhaustSpecificTimeArea?: number | null;
  inletSpecificTimeArea?: number | null;
}

export interface EngineCharacterUncertainty {
  exhaustDurationDeg?: NumericRange;
  transferDurationDeg?: NumericRange;
  blowdownDeg?: NumericRange;
  inletTransferMarginDeg?: NumericRange;
}

export type CharacterObservationUnit =
  | "crank-degrees"
  | "specific-time-area";

export interface CharacterObservation {
  metric:
    | "exhaust-duration"
    | "transfer-duration"
    | "blowdown"
    | "inlet-advance"
    | "inlet-closing"
    | "inlet-transfer-margin"
    | "exhaust-specific-time-area"
    | "inlet-specific-time-area";
  label: string;
  value: number | null;
  minimum: number | null;
  maximum: number | null;
  unit: CharacterObservationUnit;
}

export type CharacterAnnotationStatus =
  | "context-only"
  | "at-or-below-reference"
  | "above-reference"
  | "indeterminate"
  | "unavailable";

export type CharacterUncertaintyStatus =
  | "not-applicable"
  | "not-entered"
  | "bounded"
  | "indeterminate"
  | "unavailable";

export interface EngineCharacterAnnotation {
  id: string;
  claimLevel: "profile-heuristic";
  evidenceSubtype:
    | "selected-profile-context"
    | "declared-interpretation-rule"
    | "practitioner-threshold-comparison";
  label: string;
  status: CharacterAnnotationStatus;
  statement: string;
  rule: CharacterReferenceRule;
  sourceIds: readonly CharacterReferenceSourceId[];
  referenceSetVersion: typeof ENGINE_CHARACTER_REFERENCE_SET_VERSION;
  applicability: string;
  limitations: string;
  uncertaintyStatus: CharacterUncertaintyStatus;
  calibrationScope: string;
  operatingScope: string;
  observations: readonly CharacterObservation[];
}

export interface EngineCharacterResult {
  profile: EngineCharacterProfileDefinition;
  referenceSet: {
    id: typeof ENGINE_CHARACTER_REFERENCE_SET.id;
    version: typeof ENGINE_CHARACTER_REFERENCE_SET_VERSION;
    status: typeof ENGINE_CHARACTER_REFERENCE_SET.status;
  };
  observations: readonly CharacterObservation[];
  annotations: readonly EngineCharacterAnnotation[];
  summary: string;
  modelStatement: string;
  modelVersion: typeof ENGINE_CHARACTER_MODEL_VERSION;
}

function orderedRange(range: NumericRange | undefined): NumericRange | null {
  if (
    range === undefined ||
    !Number.isFinite(range.minimum) ||
    !Number.isFinite(range.maximum)
  ) {
    return null;
  }
  return {
    minimum: Math.min(range.minimum, range.maximum),
    maximum: Math.max(range.minimum, range.maximum),
  };
}

function observation(
  metric: CharacterObservation["metric"],
  label: string,
  value: number | null | undefined,
  unit: CharacterObservationUnit,
  range?: NumericRange,
): CharacterObservation {
  const bounds = orderedRange(range);
  return {
    metric,
    label,
    value: value !== null && value !== undefined && Number.isFinite(value) ? value : null,
    minimum: bounds?.minimum ?? null,
    maximum: bounds?.maximum ?? null,
    unit,
  };
}

function rangeStatement(observationValue: CharacterObservation): string {
  if (observationValue.value === null) return "unavailable";
  if (
    observationValue.minimum !== null &&
    observationValue.maximum !== null
  ) {
    return `${observationValue.value.toFixed(1)} nominal, ${observationValue.minimum.toFixed(1)} to ${observationValue.maximum.toFixed(1)} bounded`;
  }
  return observationValue.value.toFixed(1);
}

function annotation(input: {
  id: string;
  evidenceSubtype: EngineCharacterAnnotation["evidenceSubtype"];
  label: string;
  status: CharacterAnnotationStatus;
  statement: string;
  ruleId: CharacterReferenceRuleId;
  uncertaintyStatus: CharacterUncertaintyStatus;
  operatingScope: string;
  observations: readonly CharacterObservation[];
}): EngineCharacterAnnotation {
  const rule = ENGINE_CHARACTER_REFERENCE_RULES[input.ruleId];
  return {
    id: input.id,
    claimLevel: "profile-heuristic",
    evidenceSubtype: input.evidenceSubtype,
    label: input.label,
    status: input.status,
    statement: input.statement,
    rule,
    sourceIds: rule.sourceIds,
    referenceSetVersion: ENGINE_CHARACTER_REFERENCE_SET_VERSION,
    applicability: rule.applicability,
    limitations: rule.limitations,
    uncertaintyStatus: input.uncertaintyStatus,
    calibrationScope:
      "Not calibrated. No road, pressure, flow-bench or dyno dataset is fitted by this reference set.",
    operatingScope: input.operatingScope,
    observations: input.observations,
  };
}

export function modelEngineCharacter(
  input: EngineCharacterInputs,
  uncertainty?: EngineCharacterUncertainty,
): EngineCharacterResult {
  const profile = ENGINE_CHARACTER_PROFILES[input.profile];
  const observations = [
    observation(
      "exhaust-duration",
      "Exhaust duration",
      input.exhaustDurationDeg,
      "crank-degrees",
      uncertainty?.exhaustDurationDeg,
    ),
    observation(
      "transfer-duration",
      "Transfer duration",
      input.transferDurationDeg,
      "crank-degrees",
      uncertainty?.transferDurationDeg,
    ),
    observation(
      "blowdown",
      "Blowdown",
      input.blowdownDeg,
      "crank-degrees",
      uncertainty?.blowdownDeg,
    ),
    observation(
      "inlet-advance",
      "Inlet opening before TDC",
      input.inletAdvanceBtdcDeg,
      "crank-degrees",
    ),
    observation(
      "inlet-closing",
      "Inlet closing after TDC",
      input.inletCloseAtdcDeg,
      "crank-degrees",
    ),
    observation(
      "inlet-transfer-margin",
      "Signed inlet-to-transfer margin",
      input.inletTransferMarginDeg,
      "crank-degrees",
      uncertainty?.inletTransferMarginDeg,
    ),
    observation(
      "exhaust-specific-time-area",
      "Exhaust blowdown specific time-area",
      input.exhaustSpecificTimeArea,
      "specific-time-area",
    ),
    observation(
      "inlet-specific-time-area",
      "Rotary inlet specific time-area",
      input.inletSpecificTimeArea,
      "specific-time-area",
    ),
  ] as const;
  const blowdown = observations[2];
  const inletClosing = observations[4];
  const inletMargin = observations[5];
  const overlapLimit =
    ENGINE_CHARACTER_REFERENCE_RULES[
      "vespa-inlet-overlap-five-degree-ceiling"
    ].comparison!.value;
  const overlapMinimum = inletMargin.minimum ?? inletMargin.value;
  const overlapMaximum = inletMargin.maximum ?? inletMargin.value;
  const overlapStatus: CharacterAnnotationStatus =
    overlapMinimum === null || overlapMaximum === null
      ? "unavailable"
      : overlapMinimum <= overlapLimit && overlapMaximum > overlapLimit
        ? "indeterminate"
        : overlapMinimum > overlapLimit
          ? "above-reference"
          : "at-or-below-reference";
  const overlapUncertaintyStatus: CharacterUncertaintyStatus =
    overlapStatus === "unavailable"
      ? "unavailable"
      : overlapStatus === "indeterminate"
        ? "indeterminate"
        : inletMargin.minimum === null
          ? "not-entered"
          : "bounded";
  const overlapStatement =
    overlapStatus === "unavailable"
      ? "The signed inlet-to-transfer margin is unavailable, so the +5 degree practitioner reference is not compared."
      : overlapStatus === "indeterminate"
        ? `${rangeStatement(inletMargin)} crank degrees crosses the +5 degree practitioner reference. The comparison is indeterminate.`
        : overlapStatus === "above-reference"
          ? `${rangeStatement(inletMargin)} crank degrees is above the +5 degree practitioner reference across the available bounds.`
          : `${rangeStatement(inletMargin)} crank degrees is at or below the +5 degree practitioner reference across the available bounds.`;
  const hasBothTimeAreas =
    observations[6].value !== null && observations[7].value !== null;
  const timeAreaStatement = hasBothTimeAreas
    ? "Exhaust blowdown and rotary inlet specific time-area remain separate calculated quantities in their original units. This uncalibrated profile does not convert them into a performance rank."
    : "One or both specific time-area inputs are unavailable. No replacement score or timing-only performance curve is generated.";
  const boundedBlowdown =
    blowdown.minimum !== null && blowdown.maximum !== null;

  const annotations: readonly EngineCharacterAnnotation[] = [
    annotation({
      id: "selected-profile-context",
      evidenceSubtype: "selected-profile-context",
      label: `${profile.label} context`,
      status: "context-only",
      statement: `${profile.label} was explicitly selected as the interpretation context. ${profile.description} The selection is not inferred from geometry and does not change any calculation.`,
      ruleId: "selected-profile-is-context",
      uncertaintyStatus: "not-applicable",
      operatingScope: `${profile.intendedUse} ${profile.exhaustContext}`,
      observations: [],
    }),
    annotation({
      id: "blowdown-context",
      evidenceSubtype: "declared-interpretation-rule",
      label: "Blowdown context",
      status: blowdown.value === null ? "unavailable" : "context-only",
      statement:
        blowdown.value === null
          ? "Blowdown geometry is unavailable. No capacity interpretation is generated."
          : `${rangeStatement(blowdown)} crank degrees is retained as geometry. Degrees alone do not establish blowdown capacity; use the separately calculated area and time-area where available.`,
      ruleId: "blowdown-degrees-are-not-capacity",
      uncertaintyStatus:
        blowdown.value === null
          ? "unavailable"
          : boundedBlowdown
            ? "bounded"
            : "not-entered",
      operatingScope:
        "Current calculated exhaust opening and earliest transfer opening; time-area remains tied to the entered RPM.",
      observations: [blowdown],
    }),
    annotation({
      id: "inlet-transfer-reference",
      evidenceSubtype: "practitioner-threshold-comparison",
      label: "Inlet-opening overlap reference",
      status: overlapStatus,
      statement: overlapStatement,
      ruleId: "vespa-inlet-overlap-five-degree-ceiling",
      uncertaintyStatus: overlapUncertaintyStatus,
      operatingScope:
        "Current rotary inlet opening edge compared with the latest-closing enabled transfer event.",
      observations: [inletMargin],
    }),
    annotation({
      id: "inlet-closing-context",
      evidenceSubtype: "declared-interpretation-rule",
      label: "Separate inlet closing",
      status: inletClosing.value === null ? "unavailable" : "context-only",
      statement:
        inletClosing.value === null
          ? "Inlet closing is unavailable and no closing interpretation is generated."
          : `${rangeStatement(inletClosing)} crank degrees ATDC is retained as a separate edge. This reference set asserts no universal optimum or speed-performance band for it.`,
      ruleId: "inlet-closing-remains-separate",
      uncertaintyStatus:
        inletClosing.value === null ? "unavailable" : "not-entered",
      operatingScope: "Current rotary inlet closing edge after TDC.",
      observations: [inletClosing],
    }),
    annotation({
      id: "time-area-boundary",
      evidenceSubtype: "declared-interpretation-rule",
      label: "Geometric time-area boundary",
      status: hasBothTimeAreas ? "context-only" : "unavailable",
      statement: timeAreaStatement,
      ruleId: "time-area-stays-in-physical-units",
      uncertaintyStatus: hasBothTimeAreas ? "not-entered" : "unavailable",
      operatingScope:
        "Current idealised exhaust blowdown and rotary inlet geometry at the entered RPM and displacement.",
      observations: [observations[6], observations[7]],
    }),
  ];

  return {
    profile,
    referenceSet: {
      id: ENGINE_CHARACTER_REFERENCE_SET.id,
      version: ENGINE_CHARACTER_REFERENCE_SET.version,
      status: ENGINE_CHARACTER_REFERENCE_SET.status,
    },
    observations,
    annotations,
    summary: `${profile.shortLabel} is the selected interpretation context. Calculated geometry remains primary and no performance score is produced.`,
    modelStatement:
      "Profile-qualified annotations only. No 0-to-100 performance score, torque, power, airflow, peak output, acceleration, vehicle speed or safe RPM is calculated. Geometry and specific time-area must remain visible in their real units and measured engine behaviour remains the verification source.",
    modelVersion: ENGINE_CHARACTER_MODEL_VERSION,
  };
}
