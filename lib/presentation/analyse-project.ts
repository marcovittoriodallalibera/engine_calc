import {
  circularIntervalOverlap,
  calculateTransmission,
  crankAnglesFromTdcTravel,
  degreesToArcLength,
  degreesAtRpmToMilliseconds,
  displacement,
  geometricCompressionRatio,
  ENGINE_CHARACTER_PROFILES,
  ENGINE_CHARACTER_REFERENCE_SET,
  ENGINE_CHARACTER_REFERENCE_SET_VERSION,
  ENGINE_CHARACTER_REFERENCE_SOURCES,
  integrateRectangularPortAngleArea,
  integrateRotaryOverlapArea,
  intakeTransferMargin,
  meanPistonSpeed,
  modelEngineCharacter,
  pistonTravelFromTdc,
  resolveRotaryValveArcGeometry,
  rotaryValveTiming,
  specificTimeArea,
  splitCircularInterval,
  squishGapStatistics,
  squishGeometryFromBowlDiameter,
  symmetricPortTimingFromDuration,
  symmetricPortTimingFromOpening,
  targetClearanceVolumeForTrappedRatio,
  trappedCompressionRatio,
  type CircularInterval,
  type EngineCharacterResult,
  type LinearAngleSegment,
  type SymmetricPortTiming,
  type TransmissionResult,
} from "../engine/index.ts";
import {
  PROFILE_REFERENCE_SET_VERSION,
  parseLocaleNumber,
  type EngineProjectDraft,
  type PortDraft,
  type RotaryTimingSource,
} from "../project/model.ts";

export interface PortAnalysis {
  id: string;
  label: string;
  kind: PortDraft["kind"];
  colour: string;
  sourceMode: PortDraft["sourceMode"];
  sourceValue: number;
  travelFromTdcMm: number;
  openingAngleDeg: number;
  closingAngleDeg: number;
  durationDeg: number;
  durationMs: number | null;
  interval: CircularInterval;
  widthMm: number | null;
  heightMm: number | null;
  count: number | null;
  maximumAreaMm2: number | null;
  angleAreaMm2Deg: number | null;
  specificTimeArea: number | null;
  uncertainty: {
    travelMm: number;
    openingMinDeg: number;
    openingMaxDeg: number;
    durationMinDeg: number;
    durationMaxDeg: number;
    angleAreaMinMm2Deg: number | null;
    angleAreaMaxMm2Deg: number | null;
    specificTimeAreaMin: number | null;
    specificTimeAreaMax: number | null;
  } | null;
  diagnostics: string[];
}

export interface TransferAnalysis {
  port: PortAnalysis;
  blowdownDeg: number | null;
  blowdownMs: number | null;
  exhaustDurationDifferenceDeg: number | null;
  exhaustOverlapDeg: number | null;
  valveOverlapDeg: number | null;
  valveOverlapMs: number | null;
  valveMarginDeg: number | null;
  valveMarginUncertainty: {
    minimumDeg: number;
    maximumDeg: number;
  } | null;
  valveRelationship: "overlap" | "gap" | "coincident" | "not-applicable";
}

export type AnalysisEvidenceLevel =
  | "calculated-geometry"
  | "profile-heuristic"
  | "measured-or-modelled";

export type AnalysisEvidenceSubtype =
  | "derived-event-relationship"
  | "selected-profile-rule"
  | "practitioner-threshold-comparison"
  | "idealised-geometric-model"
  | "entered-measurement-bounds"
  | "uncalibrated-profile-annotation";

export interface AnalysisEvidenceSource {
  id: string;
  label: string;
  kind:
    | "calculation-kernel"
    | "declared-reference-set"
    | "practitioner-guidance"
    | "measurement-guidance"
    | "geometric-model";
  version: string;
  url: string | null;
}

export type AnalysisUncertaintyStatus =
  | "not-applicable"
  | "not-entered"
  | "bounded"
  | "indeterminate"
  | "outside-domain"
  | "unavailable";

export interface AnalysisAdvisory {
  id: string;
  evidence: AnalysisEvidenceLevel;
  claimLevel: AnalysisEvidenceLevel;
  evidenceSubtype: AnalysisEvidenceSubtype;
  tone: "neutral" | "caution" | "strong";
  title: string;
  message: string;
  source: AnalysisEvidenceSource;
  referenceSetVersion: string | null;
  applicability: string;
  uncertaintyStatus: AnalysisUncertaintyStatus;
  calibration: {
    status: "not-applicable" | "not-calibrated" | "calibrated";
    scope: string;
  };
  operatingScope: string;
  sourceLabel: string;
  sourceUrl: string | null;
}

export interface DeterministicMeasurementBounds {
  nominal: number;
  minimum: number;
  maximum: number;
}

export interface MeasurementBoundsProvenance {
  method: "deterministic-worst-case";
  inputs: string[];
  statement: string;
}

export interface RotaryGeometryUncertainty {
  timingTrackDiameterMm: DeterministicMeasurementBounds;
  circumferenceMm: DeterministicMeasurementBounds;
  measuredArcMm: DeterministicMeasurementBounds;
  derivedArcMm: DeterministicMeasurementBounds;
  crankCutawayArcMm: DeterministicMeasurementBounds;
  crankcaseWindowArcMm: DeterministicMeasurementBounds;
  provenance: MeasurementBoundsProvenance;
}

export interface RotaryAreaUncertainty {
  crankcaseWindowAreaMm2: DeterministicMeasurementBounds;
  maximumOpenAreaMm2: DeterministicMeasurementBounds;
  meanOpenAreaMm2: DeterministicMeasurementBounds;
  overlapAngleAreaMm2Deg: DeterministicMeasurementBounds;
  overlapSpecificTimeArea: DeterministicMeasurementBounds | null;
  provenance: MeasurementBoundsProvenance;
}

export interface RotaryInductionAnalysis {
  timingSource: RotaryTimingSource;
  direct: {
    advanceBeforeTdcDeg: number;
    delayAfterTdcDeg: number;
    durationDeg: number;
    equivalentCombinedArcMm: number | null;
  } | null;
  geometry: {
    crankshaftDiameterMm: number;
    circumferenceMm: number;
    crankCutawayArcMm: number;
    crankCutawayDeg: number;
    crankcaseWindowArcMm: number;
    crankcaseWindowDeg: number;
    combinedArcMm: number;
    durationDeg: number;
    measuredArc: EngineProjectDraft["induction"]["measuredArc"];
    measuredArcMm: number;
    derivedArcMm: number;
    advanceBeforeTdcDeg: number;
    delayAfterTdcDeg: number;
    uncertainty: RotaryGeometryUncertainty | null;
    uncertaintyStatus: "not-entered" | "available" | "outside-domain";
  } | null;
}

interface EngineProjectAnalysisCore {
  validGeometry: boolean;
  displacementCc: number | null;
  meanPistonSpeedMps: number | null;
  ports: PortAnalysis[];
  exhaust: PortAnalysis | null;
  transfers: TransferAnalysis[];
  induction: RotaryInductionAnalysis;
  rotary: {
    source: RotaryTimingSource;
    advanceBeforeTdcDeg: number;
    delayAfterTdcDeg: number;
    durationDeg: number;
    durationMs: number | null;
    interval: CircularInterval;
    unionTransferOverlapDeg: number;
    unionTransferOverlapMs: number | null;
    unionTransferOverlapSegments: LinearAngleSegment[];
    signedTransferMarginDeg: number | null;
    signedTransferMarginUncertainty: {
      minimumDeg: number;
      maximumDeg: number;
    } | null;
    transferRelationship:
      | "overlap"
      | "gap"
      | "coincident"
      | "indeterminate"
      | "not-applicable";
    tripleOverlapDeg: number;
    tripleOverlapSegments: LinearAngleSegment[];
    inletCloseAfterTdcDeg: number;
    inletCloseAfterTdcMs: number | null;
    areaModel:
      | "cylindrical-overlap"
      | "constant-area"
      | "unavailable";
    crankcaseWindowAreaMm2: number | null;
    maximumOpenAreaMm2: number | null;
    meanOpenAreaMm2: number | null;
    overlapAngleAreaMm2Deg: number | null;
    overlapSpecificTimeArea: number | null;
    areaUncertainty: RotaryAreaUncertainty | null;
    areaSamples: Array<{
      elapsedDeg: number;
      openAreaMm2: number;
      minimumOpenAreaMm2: number | null;
      maximumOpenAreaMm2: number | null;
    }>;
  } | null;
  timing: {
    globalBlowdownDeg: number | null;
    globalBlowdownMs: number | null;
    transferOpeningSpreadDeg: number | null;
    exhaustTransferUnionOverlapDeg: number | null;
    exhaustTransferUnionOverlapSegments: LinearAngleSegment[];
    blowdownAngleAreaMm2Deg: number | null;
    blowdownSpecificTimeArea: number | null;
    uncertainty: {
      globalBlowdownMinDeg: number;
      globalBlowdownMaxDeg: number;
      globalBlowdownMinMs: number | null;
      globalBlowdownMaxMs: number | null;
      blowdownAngleAreaMinMm2Deg: number | null;
      blowdownAngleAreaMaxMm2Deg: number | null;
      blowdownSpecificTimeAreaMin: number | null;
      blowdownSpecificTimeAreaMax: number | null;
    } | null;
  };
  character: EngineCharacterResult | null;
  characterGeometry: {
    rpmMinimum: number;
    rpmMaximum: number;
    rpmStep: number;
    series: Array<{
      id: string;
      label: string;
      colour: string;
      source: "full-event" | "blowdown" | "rotary-inlet";
      samples: Array<{
        rpm: number;
        specificTimeArea: number;
        minimum: number | null;
        maximum: number | null;
      }>;
    }>;
  } | null;
  compression: {
    clearanceVolumeMode: "measured-total" | "component-breakdown";
    geometricRatio: number | null;
    trappedRatio: number | null;
    trappedSweptVolumeCc: number | null;
    clearanceVolumeCc: number | null;
    targetTrappedRatio: number | null;
    targetClearanceVolumeCc: number | null;
    componentBreakdownCc: {
      headChamber: number | null;
      gasket: number | null;
      deck: number | null;
      pistonCrown: number | null;
      customCorrection: number | null;
    };
  };
  squish: {
    minimumGapMm: number | null;
    meanGapMm: number | null;
    maximumGapMm: number | null;
    gapRangeMm: number | null;
    areaPercent: number | null;
    bandWidthMm: number | null;
    bowlDiameterMm: number | null;
    manufacturerMinimumMm: number | null;
    belowManufacturerMinimum: boolean | null;
  };
  diagnostics: string[];
  advisories: AnalysisAdvisory[];
}

export interface CylinderLiftPortComparison {
  id: string;
  label: string;
  colour: string;
  baselineTravelFromTdcMm: number;
  liftedTravelFromTdcMm: number;
  baselineOpeningAngleDeg: number;
  liftedOpeningAngleDeg: number;
  openingDeltaDeg: number;
  baselineDurationDeg: number;
  liftedDurationDeg: number;
  durationDeltaDeg: number;
}

export interface CylinderLiftAnalysis {
  requestedThicknessMm: number | null;
  appliedThicknessMm: number;
  maximumThicknessMm: number | null;
  valid: boolean;
  effectiveDeckPositionMm: number | null;
  clearanceVolumeDeltaCc: number | null;
  squishGapDeltaMm: number;
  globalBlowdownDeltaDeg: number | null;
  transferOpeningSpreadDeltaDeg: number | null;
  exhaustTransferOverlapDeltaDeg: number | null;
  rotaryTransferOverlapDeltaDeg: number | null;
  ports: CylinderLiftPortComparison[];
}

export interface EngineProjectAnalysis extends EngineProjectAnalysisCore {
  cylinderLift: CylinderLiftAnalysis;
  transmission: {
    enabled: boolean;
    result: TransmissionResult | null;
    diagnostics: string[];
  };
}

const portColours: Record<PortDraft["kind"], string> = {
  exhaust: "#ff6a3d",
  "primary-transfer": "#43b39c",
  "secondary-transfer": "#45a3d6",
  "boost-transfer": "#b58ae8",
};

function diagnosticMessages(
  result: { diagnostics: readonly { message: string }[] },
): string[] {
  return result.diagnostics.map((diagnostic) => diagnostic.message);
}

function durationMs(degrees: number, rpm: number | null): number | null {
  if (rpm === null) return null;
  const sign = Math.sign(degrees);
  const milliseconds = degreesAtRpmToMilliseconds(
    Math.abs(degrees),
    rpm,
  ).value?.milliseconds;
  return milliseconds === undefined ? null : milliseconds * sign;
}

const deterministicBoundsStatement =
  "These are deterministic worst-case limits from the entered plus-or-minus measurement bounds. No probability distribution, confidence interval or statistical coverage is implied.";

const deterministicGeometrySource: AnalysisEvidenceSource = {
  id: "phase360-deterministic-geometry",
  label: "Phase 360 deterministic geometry kernel",
  kind: "calculation-kernel",
  version: "project-schema-6",
  url: null,
};

const declaredProfileSource: AnalysisEvidenceSource = {
  id: ENGINE_CHARACTER_REFERENCE_SOURCES["phase360-profile-taxonomy"].id,
  label:
    ENGINE_CHARACTER_REFERENCE_SOURCES["phase360-profile-taxonomy"].label,
  kind: "declared-reference-set",
  version:
    ENGINE_CHARACTER_REFERENCE_SOURCES["phase360-profile-taxonomy"].version,
  url: ENGINE_CHARACTER_REFERENCE_SOURCES["phase360-profile-taxonomy"].url,
};

const inletOverlapReferenceSource: AnalysisEvidenceSource = {
  id: ENGINE_CHARACTER_REFERENCE_SOURCES["whiteone-vespa-inlet-overlap"].id,
  label:
    ENGINE_CHARACTER_REFERENCE_SOURCES["whiteone-vespa-inlet-overlap"].label,
  kind: "practitioner-guidance",
  version:
    ENGINE_CHARACTER_REFERENCE_SOURCES["whiteone-vespa-inlet-overlap"].version,
  url: ENGINE_CHARACTER_REFERENCE_SOURCES["whiteone-vespa-inlet-overlap"].url,
};

const rotaryAreaModelSource: AnalysisEvidenceSource = {
  id: "phase360-rotary-area-model",
  label: "Phase 360 geometric rotary overlap model",
  kind: "geometric-model",
  version: "cylindrical-overlap-1",
  url: null,
};

const measurementGuidanceSource: AnalysisEvidenceSource = {
  id: "gsf-timing-measurement-guidance",
  label: "GSF timing measurement guidance",
  kind: "measurement-guidance",
  version: "unversioned-web-reference",
  url: "https://wiki.germanscooterforum.de/index.php/Steuerzeiten_messen",
};

function analysisAdvisory(input: {
  id: string;
  claimLevel: AnalysisEvidenceLevel;
  evidenceSubtype: AnalysisEvidenceSubtype;
  tone: AnalysisAdvisory["tone"];
  title: string;
  message: string;
  source: AnalysisEvidenceSource;
  referenceSetVersion?: string | null;
  applicability: string;
  uncertaintyStatus: AnalysisUncertaintyStatus;
  calibration: AnalysisAdvisory["calibration"];
  operatingScope: string;
}): AnalysisAdvisory {
  return {
    ...input,
    evidence: input.claimLevel,
    referenceSetVersion: input.referenceSetVersion ?? null,
    sourceLabel: input.source.label,
    sourceUrl: input.source.url,
  };
}

function measurementBounds(
  nominal: number,
  minimum: number,
  maximum: number,
): DeterministicMeasurementBounds {
  return { nominal, minimum, maximum };
}

function positiveEnteredUncertainty(value: string): number {
  const parsed = parseLocaleNumber(value);
  return parsed !== null && parsed > 0 ? parsed : 0;
}

function resolveRotaryGeometryUncertainty(input: {
  timingTrackDiameterMm: number;
  timingTrackDiameterUncertaintyMm: number;
  measuredArcMm: number;
  measuredArcUncertaintyMm: number;
  measuredArc: EngineProjectDraft["induction"]["measuredArc"];
  durationDeg: number;
  nominalDerivedArcMm: number;
  nominalCrankCutawayArcMm: number;
  nominalCrankcaseWindowArcMm: number;
}): {
  status: "not-entered" | "available" | "outside-domain";
  value: RotaryGeometryUncertainty | null;
  diagnostic: string | null;
} {
  const requested =
    input.timingTrackDiameterUncertaintyMm > 0 ||
    input.measuredArcUncertaintyMm > 0;
  if (!requested) {
    return { status: "not-entered", value: null, diagnostic: null };
  }

  const diameterMinimum =
    input.timingTrackDiameterMm - input.timingTrackDiameterUncertaintyMm;
  const diameterMaximum =
    input.timingTrackDiameterMm + input.timingTrackDiameterUncertaintyMm;
  const measuredMinimum = input.measuredArcMm - input.measuredArcUncertaintyMm;
  const measuredMaximum = input.measuredArcMm + input.measuredArcUncertaintyMm;
  const durationFraction = input.durationDeg / 360;
  const circumferenceMinimum = Math.PI * diameterMinimum;
  const circumferenceMaximum = Math.PI * diameterMaximum;
  const derivedMinimum =
    circumferenceMinimum * durationFraction - measuredMaximum;
  const derivedMaximum =
    circumferenceMaximum * durationFraction - measuredMinimum;

  if (
    diameterMinimum <= 0 ||
    measuredMinimum <= 0 ||
    derivedMinimum <= 0 ||
    !Number.isFinite(derivedMaximum)
  ) {
    return {
      status: "outside-domain",
      value: null,
      diagnostic:
        "Rotary diameter or arc measurement bounds leave the positive complementary-arc domain. Nominal geometry remains available, but no rotary uncertainty range is reported.",
    };
  }

  const measured = measurementBounds(
    input.measuredArcMm,
    measuredMinimum,
    measuredMaximum,
  );
  const derived = measurementBounds(
    input.nominalDerivedArcMm,
    derivedMinimum,
    derivedMaximum,
  );
  const crankCutaway =
    input.measuredArc === "crank-cutaway" ? measured : derived;
  const crankcaseWindow =
    input.measuredArc === "crankcase-opening" ? measured : derived;
  const inputs: string[] = [];
  if (input.timingTrackDiameterUncertaintyMm > 0) {
    inputs.push("rotary sealing-track diameter");
  }
  if (input.measuredArcUncertaintyMm > 0) {
    inputs.push(
      input.measuredArc === "crank-cutaway"
        ? "measured crank cut-away arc"
        : "measured crankcase opening arc",
    );
  }

  return {
    status: "available",
    diagnostic: null,
    value: {
      timingTrackDiameterMm: measurementBounds(
        input.timingTrackDiameterMm,
        diameterMinimum,
        diameterMaximum,
      ),
      circumferenceMm: measurementBounds(
        Math.PI * input.timingTrackDiameterMm,
        circumferenceMinimum,
        circumferenceMaximum,
      ),
      measuredArcMm: measured,
      derivedArcMm: derived,
      crankCutawayArcMm: crankCutaway,
      crankcaseWindowArcMm: crankcaseWindow,
      provenance: {
        method: "deterministic-worst-case",
        inputs,
        statement: deterministicBoundsStatement,
      },
    },
  };
}

function resolveRotaryAreaUncertainty(input: {
  geometry: NonNullable<RotaryInductionAnalysis["geometry"]>;
  windowWidthMm: number;
  windowWidthUncertaintyMm: number;
  durationDeg: number;
  rpm: number | null;
  displacementCc: number | null;
  nominal: {
    crankcaseWindowAreaMm2: number;
    maximumOpenAreaMm2: number;
    meanOpenAreaMm2: number;
    angleAreaMm2Deg: number;
    samples: Array<{ elapsedDeg: number; openAreaMm2: number }>;
  };
}): {
  value: RotaryAreaUncertainty | null;
  samples: Array<{
    elapsedDeg: number;
    openAreaMm2: number;
    minimumOpenAreaMm2: number | null;
    maximumOpenAreaMm2: number | null;
  }>;
  diagnostic: string | null;
} {
  const geometryUncertainty = input.geometry.uncertainty;
  const requested =
    input.windowWidthUncertaintyMm > 0 ||
    input.geometry.uncertaintyStatus !== "not-entered";
  const nominalSamples = input.nominal.samples.map((sample) => ({
    ...sample,
    minimumOpenAreaMm2: null,
    maximumOpenAreaMm2: null,
  }));
  if (!requested) {
    return { value: null, samples: nominalSamples, diagnostic: null };
  }
  if (input.geometry.uncertaintyStatus === "outside-domain") {
    return { value: null, samples: nominalSamples, diagnostic: null };
  }

  const widthMinimum = input.windowWidthMm - input.windowWidthUncertaintyMm;
  const widthMaximum = input.windowWidthMm + input.windowWidthUncertaintyMm;
  if (widthMinimum <= 0) {
    return {
      value: null,
      samples: nominalSamples,
      diagnostic:
        "The common axial overlap-width bounds leave the positive-area domain. Nominal inlet area remains available, but no rotary area uncertainty range is reported.",
    };
  }

  const diameter =
    geometryUncertainty?.timingTrackDiameterMm ??
    measurementBounds(
      input.geometry.crankshaftDiameterMm,
      input.geometry.crankshaftDiameterMm,
      input.geometry.crankshaftDiameterMm,
    );
  const circumference =
    geometryUncertainty?.circumferenceMm ??
    measurementBounds(
      input.geometry.circumferenceMm,
      input.geometry.circumferenceMm,
      input.geometry.circumferenceMm,
    );
  const measured =
    geometryUncertainty?.measuredArcMm ??
    measurementBounds(
      input.geometry.measuredArcMm,
      input.geometry.measuredArcMm,
      input.geometry.measuredArcMm,
    );
  const derived =
    geometryUncertainty?.derivedArcMm ??
    measurementBounds(
      input.geometry.derivedArcMm,
      input.geometry.derivedArcMm,
      input.geometry.derivedArcMm,
    );
  const crankCutaway =
    input.geometry.measuredArc === "crank-cutaway" ? measured : derived;
  const crankcaseWindow =
    input.geometry.measuredArc === "crankcase-opening" ? measured : derived;
  const durationFraction = input.durationDeg / 360;
  const angleAreaWithoutWidth = (diameterMm: number, measuredArcMm: number) => {
    const totalArcMm = Math.PI * diameterMm * durationFraction;
    return (
      measuredArcMm *
      (totalArcMm - measuredArcMm) *
      (360 / (Math.PI * diameterMm))
    );
  };
  const minimumAreaBase = Math.min(
    angleAreaWithoutWidth(diameter.minimum, measured.minimum),
    angleAreaWithoutWidth(diameter.minimum, measured.maximum),
  );
  // For fixed diameter the measured-arc product is concave. Include its
  // stationary point so the upper bound cannot miss a maximum inside the
  // entered interval.
  const stationaryMeasuredArc =
    (Math.PI * diameter.maximum * durationFraction) / 2;
  const maximumCandidateMeasuredArc = Math.max(
    measured.minimum,
    Math.min(measured.maximum, stationaryMeasuredArc),
  );
  const maximumAreaBase = angleAreaWithoutWidth(
    diameter.maximum,
    maximumCandidateMeasuredArc,
  );
  const angleAreaMinimum = widthMinimum * minimumAreaBase;
  const angleAreaMaximum = widthMaximum * maximumAreaBase;

  const maximumOverlapArc = (diameterMm: number, measuredArcMm: number) =>
    Math.min(
      measuredArcMm,
      Math.PI * diameterMm * durationFraction - measuredArcMm,
    );
  const minimumOverlapArc = Math.min(
    maximumOverlapArc(diameter.minimum, measured.minimum),
    maximumOverlapArc(diameter.minimum, measured.maximum),
  );
  const maximumOverlapCandidate = Math.max(
    measured.minimum,
    Math.min(measured.maximum, stationaryMeasuredArc),
  );
  const maximumOverlapArcValue = maximumOverlapArc(
    diameter.maximum,
    maximumOverlapCandidate,
  );
  const maximumAreaMinimum = widthMinimum * minimumOverlapArc;
  const maximumAreaMaximum = widthMaximum * maximumOverlapArcValue;
  const crankcaseAreaMinimum =
    widthMinimum * crankcaseWindow.minimum;
  const crankcaseAreaMaximum =
    widthMaximum * crankcaseWindow.maximum;
  const meanAreaMinimum = angleAreaMinimum / input.durationDeg;
  const meanAreaMaximum = angleAreaMaximum / input.durationDeg;
  const specificDivisor =
    input.rpm && input.displacementCc
      ? 6 * input.rpm * input.displacementCc
      : null;
  const specificTimeAreaBounds = specificDivisor
    ? measurementBounds(
        input.nominal.angleAreaMm2Deg / specificDivisor,
        angleAreaMinimum / specificDivisor,
        angleAreaMaximum / specificDivisor,
      )
    : null;
  const provenanceInputs = [
    ...(geometryUncertainty?.provenance.inputs ?? []),
    ...(input.windowWidthUncertaintyMm > 0
      ? ["common axial overlap width"]
      : []),
  ];
  const areaUncertainty: RotaryAreaUncertainty = {
    crankcaseWindowAreaMm2: measurementBounds(
      input.nominal.crankcaseWindowAreaMm2,
      crankcaseAreaMinimum,
      crankcaseAreaMaximum,
    ),
    maximumOpenAreaMm2: measurementBounds(
      input.nominal.maximumOpenAreaMm2,
      maximumAreaMinimum,
      maximumAreaMaximum,
    ),
    meanOpenAreaMm2: measurementBounds(
      input.nominal.meanOpenAreaMm2,
      meanAreaMinimum,
      meanAreaMaximum,
    ),
    overlapAngleAreaMm2Deg: measurementBounds(
      input.nominal.angleAreaMm2Deg,
      angleAreaMinimum,
      angleAreaMaximum,
    ),
    overlapSpecificTimeArea: specificTimeAreaBounds,
    provenance: {
      method: "deterministic-worst-case",
      inputs: provenanceInputs,
      statement: deterministicBoundsStatement,
    },
  };

  const boundedSamples = input.nominal.samples.map((sample) => {
    const openingTravelMinimum =
      (sample.elapsedDeg * circumference.minimum) / 360;
    const openingTravelMaximum =
      (sample.elapsedDeg * circumference.maximum) / 360;
    const closingTravelMinimum =
      ((input.durationDeg - sample.elapsedDeg) * circumference.minimum) / 360;
    const closingTravelMaximum =
      ((input.durationDeg - sample.elapsedDeg) * circumference.maximum) / 360;
    const overlapMinimum = Math.max(
      0,
      Math.min(
        openingTravelMinimum,
        closingTravelMinimum,
        crankCutaway.minimum,
        crankcaseWindow.minimum,
      ),
    );
    const overlapMaximum = Math.max(
      0,
      Math.min(
        openingTravelMaximum,
        closingTravelMaximum,
        crankCutaway.maximum,
        crankcaseWindow.maximum,
      ),
    );
    const conservativeMinimum = Math.min(
      sample.openAreaMm2,
      widthMinimum * overlapMinimum,
    );
    const conservativeMaximum = Math.max(
      sample.openAreaMm2,
      Math.min(maximumAreaMaximum, widthMaximum * overlapMaximum),
    );
    return {
      ...sample,
      minimumOpenAreaMm2: conservativeMinimum,
      maximumOpenAreaMm2: conservativeMaximum,
    };
  });

  return {
    value: areaUncertainty,
    samples: boundedSamples,
    diagnostic: null,
  };
}

function analyseRotaryInduction(
  project: EngineProjectDraft,
): {
  analysis: RotaryInductionAnalysis;
  timing: ReturnType<typeof rotaryValveTiming>["value"];
  diagnostics: string[];
} {
  const timingSource = project.induction.timingSource ?? "direct-angles";
  const advance = parseLocaleNumber(project.induction.advanceBtdcDeg);
  const delay = parseLocaleNumber(project.induction.delayAtdcDeg);
  const directResult =
    advance !== null && delay !== null ? rotaryValveTiming(advance, delay) : null;
  const direct = directResult?.value
    ? {
        advanceBeforeTdcDeg: directResult.value.advanceBeforeTdcDeg,
        delayAfterTdcDeg: directResult.value.delayAfterTdcDeg,
        durationDeg: directResult.value.durationDeg,
        equivalentCombinedArcMm: null as number | null,
      }
    : null;

  const crankshaftDiameterMm = parseLocaleNumber(
    project.induction.crankshaftDiameterMm,
  );
  const measuredArcMm = parseLocaleNumber(project.induction.measuredArcMm);
  const crankshaftDiameterUncertaintyMm = positiveEnteredUncertainty(
    project.induction.crankshaftDiameterUncertaintyMm,
  );
  const measuredArcUncertaintyMm = positiveEnteredUncertainty(
    project.induction.measuredArcUncertaintyMm,
  );
  const geometryResult =
    advance !== null &&
    delay !== null &&
    crankshaftDiameterMm !== null &&
    measuredArcMm !== null
      ? resolveRotaryValveArcGeometry({
          advanceBeforeTdcDeg: advance,
          delayAfterTdcDeg: delay,
          crankshaftDiameterMm,
          measuredArc: project.induction.measuredArc,
          measuredArcMm,
        })
      : null;

  if (direct && crankshaftDiameterMm !== null && crankshaftDiameterMm > 0) {
    direct.equivalentCombinedArcMm =
      degreesToArcLength(direct.durationDeg, crankshaftDiameterMm).value
        ?.arcLengthMm ?? null;
  }
  const geometryUncertainty = geometryResult?.value
    ? resolveRotaryGeometryUncertainty({
        timingTrackDiameterMm: geometryResult.value.crankshaftDiameterMm,
        timingTrackDiameterUncertaintyMm: crankshaftDiameterUncertaintyMm,
        measuredArcMm: geometryResult.value.measuredArcMm,
        measuredArcUncertaintyMm,
        measuredArc: project.induction.measuredArc,
        durationDeg: geometryResult.value.durationDeg,
        nominalDerivedArcMm: geometryResult.value.derivedArcMm,
        nominalCrankCutawayArcMm: geometryResult.value.crankCutawayArcMm,
        nominalCrankcaseWindowArcMm:
          geometryResult.value.crankcaseWindowArcMm,
      })
    : {
        status: "not-entered" as const,
        value: null,
        diagnostic: null,
      };
  const geometry = geometryResult?.value
    ? {
        crankshaftDiameterMm: geometryResult.value.crankshaftDiameterMm,
        circumferenceMm: geometryResult.value.circumferenceMm,
        crankCutawayArcMm: geometryResult.value.crankCutawayArcMm,
        crankCutawayDeg: geometryResult.value.crankCutawayDeg,
        crankcaseWindowArcMm: geometryResult.value.crankcaseWindowArcMm,
        crankcaseWindowDeg: geometryResult.value.crankcaseWindowDeg,
        combinedArcMm: geometryResult.value.combinedArcMm,
        durationDeg: geometryResult.value.durationDeg,
        measuredArc: project.induction.measuredArc,
        measuredArcMm: geometryResult.value.measuredArcMm,
        derivedArcMm: geometryResult.value.derivedArcMm,
        advanceBeforeTdcDeg: geometryResult.value.advanceBeforeTdcDeg,
        delayAfterTdcDeg: geometryResult.value.delayAfterTdcDeg,
        uncertainty: geometryUncertainty.value,
        uncertaintyStatus: geometryUncertainty.status,
      }
    : null;

  const diagnostics: string[] = [];
  if (project.induction.mode === "rotary") {
    if (directResult) diagnostics.push(...diagnosticMessages(directResult));
    if (!directResult?.value) {
      diagnostics.push(
        "Enter both desired rotary timing edges to position the inlet relative to TDC.",
      );
    }
    if (timingSource === "crank-and-case-arcs") {
      if (geometryResult) diagnostics.push(...diagnosticMessages(geometryResult));
      if (!geometryResult?.value) {
        diagnostics.push(
          "Enter the timing-track diameter and one positive measured arc shorter than the total required by the desired timing.",
        );
      }
    }
    if (geometryUncertainty.diagnostic) {
      diagnostics.push(geometryUncertainty.diagnostic);
    }
  }
  return {
    analysis: { timingSource, direct, geometry },
    timing:
      project.induction.mode === "rotary" ? directResult?.value ?? null : null,
    diagnostics: [...new Set(diagnostics)],
  };
}

function timingFromPort(
  port: PortDraft,
  strokeMm: number,
  rodLengthMm: number,
  crownBelowDeckAtTdcMm: number | null,
): {
  sourceValue: number;
  travelFromTdcMm: number;
  timing: SymmetricPortTiming;
  diagnostics: string[];
} | null {
  const sourceValue = parseLocaleNumber(port.sourceValue);
  if (sourceValue === null) return null;
  let travelFromTdcMm: number | null = null;
  let timing: SymmetricPortTiming | null = null;
  const diagnostics: string[] = [];

  if (port.sourceMode === "travel-from-tdc") {
    travelFromTdcMm = sourceValue;
  } else if (port.sourceMode === "height-above-bdc") {
    travelFromTdcMm = strokeMm - sourceValue;
  } else if (port.sourceMode === "depth-from-deck") {
    if (crownBelowDeckAtTdcMm === null) return null;
    travelFromTdcMm = sourceValue - crownBelowDeckAtTdcMm;
  } else if (port.sourceMode === "opening-angle") {
    const result = symmetricPortTimingFromOpening(sourceValue);
    diagnostics.push(...diagnosticMessages(result));
    timing = result.value;
    if (timing) {
      travelFromTdcMm =
        pistonTravelFromTdc({
          strokeMm,
          rodLengthMm,
          crankAngleDeg: timing.openingAngleDeg,
        }).value?.travelFromTdcMm ?? null;
    }
  } else {
    const result = symmetricPortTimingFromDuration(sourceValue);
    diagnostics.push(...diagnosticMessages(result));
    timing = result.value;
    if (timing) {
      travelFromTdcMm =
        pistonTravelFromTdc({
          strokeMm,
          rodLengthMm,
          crankAngleDeg: timing.openingAngleDeg,
        }).value?.travelFromTdcMm ?? null;
    }
  }

  if (travelFromTdcMm === null) return null;
  if (!timing) {
    const angle = crankAnglesFromTdcTravel({
      strokeMm,
      rodLengthMm,
      travelFromTdcMm,
    });
    diagnostics.push(...diagnosticMessages(angle));
    if (!angle.value) return null;
    const timingResult = symmetricPortTimingFromOpening(angle.value.openingAngleDeg);
    diagnostics.push(...diagnosticMessages(timingResult));
    timing = timingResult.value;
  }
  return timing
    ? { sourceValue, travelFromTdcMm, timing, diagnostics }
    : null;
}

function analysePort(
  port: PortDraft,
  strokeMm: number,
  rodLengthMm: number,
  crownBelowDeckAtTdcMm: number | null,
  cylinderLiftMm: number,
  rpm: number | null,
  displacementCc: number | null,
): PortAnalysis | null {
  const source = timingFromPort(
    port,
    strokeMm,
    rodLengthMm,
    crownBelowDeckAtTdcMm,
  );
  if (!source) return null;
  const widthMm = parseLocaleNumber(port.widthMm);
  const heightMm = parseLocaleNumber(port.heightMm);
  const count = parseLocaleNumber(port.count);
  const uncertaintyMm = parseLocaleNumber(port.uncertaintyMm);
  const diagnostics = [...source.diagnostics];
  const effectiveTravelFromTdcMm = source.travelFromTdcMm - cylinderLiftMm;
  let effectiveTiming = source.timing;

  if (cylinderLiftMm > 0) {
    const shiftedAngle = crankAnglesFromTdcTravel({
      strokeMm,
      rodLengthMm,
      travelFromTdcMm: effectiveTravelFromTdcMm,
    });
    diagnostics.push(...diagnosticMessages(shiftedAngle));
    if (!shiftedAngle.value) return null;
    const shiftedTiming = symmetricPortTimingFromOpening(
      shiftedAngle.value.openingAngleDeg,
    );
    diagnostics.push(...diagnosticMessages(shiftedTiming));
    if (!shiftedTiming.value) return null;
    effectiveTiming = shiftedTiming.value;
  }

  let maximumAreaMm2: number | null = null;
  let angleAreaMm2Deg: number | null = null;
  let portSpecificTimeArea: number | null = null;
  if (
    widthMm !== null &&
    widthMm > 0 &&
    heightMm !== null &&
    heightMm > 0 &&
    count !== null &&
    Number.isInteger(count) &&
    count > 0
  ) {
    const integrated = integrateRectangularPortAngleArea({
      strokeMm,
      rodLengthMm,
      roofTravelFromTdcMm: effectiveTravelFromTdcMm,
      portWidthMm: widthMm,
      portHeightMm: heightMm,
      portCount: count,
      startAngleDeg: effectiveTiming.openingAngleDeg,
      endAngleDeg: effectiveTiming.closingAngleDeg,
      integrationStepDeg: 0.25,
    });
    diagnostics.push(...diagnosticMessages(integrated));
    if (integrated.value) {
      maximumAreaMm2 = integrated.value.maximumAreaMm2;
      angleAreaMm2Deg = integrated.value.angleAreaMm2Deg;
      if (rpm !== null && displacementCc !== null) {
        portSpecificTimeArea =
          specificTimeArea({
            angleAreaMm2Deg,
            rpm,
            displacementCc,
          }).value?.specificTimeAreaSecondsMm2PerCc ?? null;
      }
    }
  }

  let uncertainty: PortAnalysis["uncertainty"] = null;
  if (
    uncertaintyMm !== null &&
    uncertaintyMm > 0 &&
    (port.sourceMode === "travel-from-tdc" ||
      port.sourceMode === "height-above-bdc" ||
      port.sourceMode === "depth-from-deck")
  ) {
    const lowerTravel = effectiveTravelFromTdcMm - uncertaintyMm;
    const upperTravel = effectiveTravelFromTdcMm + uncertaintyMm;
    if (lowerTravel < 0 || upperTravel > strokeMm) {
      diagnostics.push(
        `${port.label} measurement uncertainty extends outside the reachable 0 mm to ${strokeMm.toFixed(2)} mm piston-travel range.`,
      );
    } else {
      const lower = crankAnglesFromTdcTravel({
        strokeMm,
        rodLengthMm,
        travelFromTdcMm: lowerTravel,
      }).value;
      const upper = crankAnglesFromTdcTravel({
        strokeMm,
        rodLengthMm,
        travelFromTdcMm: upperTravel,
      }).value;
      if (lower && upper) {
        const integrateAtTravel = (
          roofTravelFromTdcMm: number,
          openingAngleDeg: number,
        ): { angleArea: number | null; timeArea: number | null } => {
          if (
            widthMm === null ||
            widthMm <= 0 ||
            heightMm === null ||
            heightMm <= 0 ||
            count === null ||
            !Number.isInteger(count) ||
            count <= 0
          ) {
            return { angleArea: null, timeArea: null };
          }
          const integrated = integrateRectangularPortAngleArea({
            strokeMm,
            rodLengthMm,
            roofTravelFromTdcMm,
            portWidthMm: widthMm,
            portHeightMm: heightMm,
            portCount: count,
            startAngleDeg: openingAngleDeg,
            endAngleDeg: 360 - openingAngleDeg,
            integrationStepDeg: 0.25,
          }).value;
          const angleArea = integrated?.angleAreaMm2Deg ?? null;
          const timeArea =
            angleArea !== null && rpm !== null && displacementCc !== null
              ? specificTimeArea({ angleAreaMm2Deg: angleArea, rpm, displacementCc })
                  .value?.specificTimeAreaSecondsMm2PerCc ?? null
              : null;
          return { angleArea, timeArea };
        };
        const maximumArea = integrateAtTravel(
          lowerTravel,
          lower.openingAngleDeg,
        );
        const minimumArea = integrateAtTravel(
          upperTravel,
          upper.openingAngleDeg,
        );
        uncertainty = {
          travelMm: uncertaintyMm,
          openingMinDeg: lower.openingAngleDeg,
          openingMaxDeg: upper.openingAngleDeg,
          durationMinDeg: 360 - 2 * upper.openingAngleDeg,
          durationMaxDeg: 360 - 2 * lower.openingAngleDeg,
          angleAreaMinMm2Deg: minimumArea.angleArea,
          angleAreaMaxMm2Deg: maximumArea.angleArea,
          specificTimeAreaMin: minimumArea.timeArea,
          specificTimeAreaMax: maximumArea.timeArea,
        };
      }
    }
  }

  return {
    id: port.id,
    label: port.label,
    kind: port.kind,
    colour: portColours[port.kind],
    sourceMode: port.sourceMode,
    sourceValue: source.sourceValue,
    travelFromTdcMm: effectiveTravelFromTdcMm,
    openingAngleDeg: effectiveTiming.openingAngleDeg,
    closingAngleDeg: effectiveTiming.closingAngleDeg,
    durationDeg: effectiveTiming.durationDeg,
    durationMs: durationMs(effectiveTiming.durationDeg, rpm),
    interval: effectiveTiming.interval,
    widthMm,
    heightMm,
    count,
    maximumAreaMm2,
    angleAreaMm2Deg,
    specificTimeArea: portSpecificTimeArea,
    uncertainty,
    diagnostics: Array.from(new Set(diagnostics)),
  };
}

function mergeSegments(segments: LinearAngleSegment[]): LinearAngleSegment[] {
  const sorted = segments
    .filter((segment) => segment.endDeg > segment.startDeg)
    .sort((first, second) => first.startDeg - second.startDeg);
  const merged: LinearAngleSegment[] = [];
  for (const segment of sorted) {
    const previous = merged.at(-1);
    if (previous && segment.startDeg <= previous.endDeg) {
      previous.endDeg = Math.max(previous.endDeg, segment.endDeg);
    } else {
      merged.push({ ...segment });
    }
  }
  return merged;
}

function intervalSegments(interval: CircularInterval): LinearAngleSegment[] {
  return splitCircularInterval(interval).value ?? [];
}

function unionSegments(intervals: CircularInterval[]): LinearAngleSegment[] {
  return mergeSegments(intervals.flatMap(intervalSegments));
}

function intersectSegments(
  first: LinearAngleSegment[],
  second: LinearAngleSegment[],
): LinearAngleSegment[] {
  const intersections: LinearAngleSegment[] = [];
  for (const a of first) {
    for (const b of second) {
      const startDeg = Math.max(a.startDeg, b.startDeg);
      const endDeg = Math.min(a.endDeg, b.endDeg);
      if (endDeg > startDeg) intersections.push({ startDeg, endDeg });
    }
  }
  return mergeSegments(intersections);
}

function segmentDuration(segments: LinearAngleSegment[]): number {
  return segments.reduce(
    (sum, segment) => sum + segment.endDeg - segment.startDeg,
    0,
  );
}

function analyseProjectCore(
  project: EngineProjectDraft,
  cylinderLiftMm: number,
): EngineProjectAnalysisCore {
  const boreMm = parseLocaleNumber(project.geometry.boreMm);
  const strokeMm = parseLocaleNumber(project.geometry.strokeMm);
  const rodLengthMm = parseLocaleNumber(project.geometry.rodLengthMm);
  const rpmValue = parseLocaleNumber(project.geometry.rpm);
  const crownBelowDeckAtTdcMm = parseLocaleNumber(
    project.geometry.deckPositionMm,
  );
  const rpm = rpmValue !== null && rpmValue > 0 ? rpmValue : null;
  const validGeometry =
    boreMm !== null &&
    boreMm > 0 &&
    strokeMm !== null &&
    strokeMm > 0 &&
    rodLengthMm !== null &&
      rodLengthMm > strokeMm / 2;
  const diagnostics: string[] = [];
  const rotaryInduction = analyseRotaryInduction(project);
  diagnostics.push(...rotaryInduction.diagnostics);

  if (!validGeometry || boreMm === null || strokeMm === null || rodLengthMm === null) {
    return {
      validGeometry: false,
      displacementCc: null,
      meanPistonSpeedMps: null,
      ports: [],
      exhaust: null,
      transfers: [],
      induction: rotaryInduction.analysis,
      rotary: null,
      timing: {
        globalBlowdownDeg: null,
        globalBlowdownMs: null,
        transferOpeningSpreadDeg: null,
        exhaustTransferUnionOverlapDeg: null,
        exhaustTransferUnionOverlapSegments: [],
        blowdownAngleAreaMm2Deg: null,
        blowdownSpecificTimeArea: null,
        uncertainty: null,
      },
      character: null,
      characterGeometry: null,
      compression: {
        clearanceVolumeMode: project.compression.volumeMode,
        geometricRatio: null,
        trappedRatio: null,
        trappedSweptVolumeCc: null,
        clearanceVolumeCc: null,
        targetTrappedRatio: null,
        targetClearanceVolumeCc: null,
        componentBreakdownCc: {
          headChamber: null,
          gasket: null,
          deck: null,
          pistonCrown: null,
          customCorrection: null,
        },
      },
      squish: {
        minimumGapMm: null,
        meanGapMm: null,
        maximumGapMm: null,
        gapRangeMm: null,
        areaPercent: null,
        bandWidthMm: null,
        bowlDiameterMm: null,
        manufacturerMinimumMm: null,
        belowManufacturerMinimum: null,
      },
      diagnostics: [
        "Enter a positive bore, stroke and rod length. Rod length must exceed half the stroke.",
      ],
      advisories: [],
    };
  }

  const displacementResult = displacement({ boreMm, strokeMm });
  const displacementCc = displacementResult.value?.displacementPerCylinderCc ?? null;
  diagnostics.push(...diagnosticMessages(displacementResult));
  const pistonSpeed = rpm ? meanPistonSpeed(strokeMm, rpm) : null;
  const meanPistonSpeedMps = pistonSpeed?.value?.metresPerSecond ?? null;

  const ports = project.ports
    .filter((port) => port.enabled)
    .map((port) =>
      analysePort(
        port,
        strokeMm,
        rodLengthMm,
        crownBelowDeckAtTdcMm,
        cylinderLiftMm,
        rpm,
        displacementCc,
      ),
    )
    .filter((port): port is PortAnalysis => port !== null);
  const exhaust = ports.find((port) => port.kind === "exhaust") ?? null;
  const transferPorts = ports.filter((port) => port.kind !== "exhaust");

  const rotaryTiming = rotaryInduction.timing;

  const transfers: TransferAnalysis[] = transferPorts.map((port) => {
    const blowdownDeg = exhaust
      ? port.openingAngleDeg - exhaust.openingAngleDeg
      : null;
    const exhaustOverlapDeg = exhaust
      ? circularIntervalOverlap(exhaust.interval, port.interval).value?.degrees ?? null
      : null;
    const valveOverlapDeg = rotaryTiming
      ? circularIntervalOverlap(rotaryTiming.interval, port.interval).value?.degrees ?? null
      : null;
    const margin =
      rotaryTiming
        ? intakeTransferMargin({
            intakeAdvanceBeforeTdcDeg: rotaryTiming.advanceBeforeTdcDeg,
            transferDurationDeg: port.durationDeg,
          }).value
        : null;
    const valveMarginUncertainty =
      rotaryTiming && port.uncertainty
        ? {
            minimumDeg:
              rotaryTiming.advanceBeforeTdcDeg -
              port.uncertainty.openingMaxDeg,
            maximumDeg:
              rotaryTiming.advanceBeforeTdcDeg -
              port.uncertainty.openingMinDeg,
          }
        : null;
    return {
      port,
      blowdownDeg,
      blowdownMs: blowdownDeg === null ? null : durationMs(blowdownDeg, rpm),
      exhaustDurationDifferenceDeg: exhaust
        ? exhaust.durationDeg - port.durationDeg
        : null,
      exhaustOverlapDeg,
      valveOverlapDeg,
      valveOverlapMs:
        valveOverlapDeg === null ? null : durationMs(valveOverlapDeg, rpm),
      valveMarginDeg: margin?.signedMarginDeg ?? null,
      valveMarginUncertainty,
      valveRelationship: margin?.relationship ?? "not-applicable",
    };
  });

  const transferUnionSegments = unionSegments(transferPorts.map((port) => port.interval));
  const exhaustSegments = exhaust ? intervalSegments(exhaust.interval) : [];
  const exhaustTransferUnionOverlapDeg = exhaust
    ? segmentDuration(intersectSegments(exhaustSegments, transferUnionSegments))
    : null;
  const openings = transferPorts.map((port) => port.openingAngleDeg);
  const earliestTransferOpening = openings.length ? Math.min(...openings) : null;
  const globalBlowdownDeg =
    exhaust && earliestTransferOpening !== null
      ? earliestTransferOpening - exhaust.openingAngleDeg
      : null;
  const transferOpeningSpreadDeg = openings.length
    ? Math.max(...openings) - Math.min(...openings)
    : null;
  const hasTimingUncertainty =
    Boolean(exhaust?.uncertainty) ||
    transferPorts.some((port) => port.uncertainty !== null);
  const exhaustOpeningMinimum = exhaust
    ? exhaust.uncertainty?.openingMinDeg ?? exhaust.openingAngleDeg
    : null;
  const exhaustOpeningMaximum = exhaust
    ? exhaust.uncertainty?.openingMaxDeg ?? exhaust.openingAngleDeg
    : null;
  const earliestTransferOpeningMinimum = transferPorts.length
    ? Math.min(
        ...transferPorts.map(
          (port) => port.uncertainty?.openingMinDeg ?? port.openingAngleDeg,
        ),
      )
    : null;
  const earliestTransferOpeningMaximum = transferPorts.length
    ? Math.min(
        ...transferPorts.map(
          (port) => port.uncertainty?.openingMaxDeg ?? port.openingAngleDeg,
        ),
      )
    : null;
  const globalBlowdownMinimum =
    exhaustOpeningMaximum !== null && earliestTransferOpeningMinimum !== null
      ? earliestTransferOpeningMinimum - exhaustOpeningMaximum
      : null;
  const globalBlowdownMaximum =
    exhaustOpeningMinimum !== null && earliestTransferOpeningMaximum !== null
      ? earliestTransferOpeningMaximum - exhaustOpeningMinimum
      : null;

  let blowdownAngleAreaMm2Deg: number | null = null;
  let blowdownSpecificTimeArea: number | null = null;
  let blowdownAngleAreaMinimum: number | null = null;
  let blowdownAngleAreaMaximum: number | null = null;
  let blowdownSpecificTimeAreaMinimum: number | null = null;
  let blowdownSpecificTimeAreaMaximum: number | null = null;
  if (
    exhaust &&
    exhaust.widthMm !== null &&
    exhaust.heightMm !== null &&
    exhaust.count !== null &&
    earliestTransferOpening !== null &&
    earliestTransferOpening > exhaust.openingAngleDeg
  ) {
    const integrateBlowdownAt = (
      roofTravelFromTdcMm: number,
      endAngleDeg: number,
    ): number | null => {
      const opening = crankAnglesFromTdcTravel({
        strokeMm,
        rodLengthMm,
        travelFromTdcMm: roofTravelFromTdcMm,
      }).value?.openingAngleDeg;
      if (opening === undefined) return null;
      if (endAngleDeg <= opening) return 0;
      return integrateRectangularPortAngleArea({
        strokeMm,
        rodLengthMm,
        roofTravelFromTdcMm,
        portWidthMm: exhaust.widthMm!,
        portHeightMm: exhaust.heightMm!,
        portCount: exhaust.count!,
        startAngleDeg: opening,
        endAngleDeg,
        integrationStepDeg: 0.1,
      }).value?.angleAreaMm2Deg ?? null;
    };
    blowdownAngleAreaMm2Deg = integrateBlowdownAt(
      exhaust.travelFromTdcMm,
      earliestTransferOpening,
    );
    if (blowdownAngleAreaMm2Deg !== null && rpm && displacementCc) {
      blowdownSpecificTimeArea =
        specificTimeArea({
          angleAreaMm2Deg: blowdownAngleAreaMm2Deg,
          rpm,
          displacementCc,
        }).value?.specificTimeAreaSecondsMm2PerCc ?? null;
    }
    if (
      hasTimingUncertainty &&
      earliestTransferOpeningMinimum !== null &&
      earliestTransferOpeningMaximum !== null
    ) {
      const exhaustTravelUncertainty = exhaust.uncertainty?.travelMm ?? 0;
      blowdownAngleAreaMinimum = integrateBlowdownAt(
        exhaust.travelFromTdcMm + exhaustTravelUncertainty,
        earliestTransferOpeningMinimum,
      );
      blowdownAngleAreaMaximum = integrateBlowdownAt(
        exhaust.travelFromTdcMm - exhaustTravelUncertainty,
        earliestTransferOpeningMaximum,
      );
      if (
        blowdownAngleAreaMinimum !== null &&
        blowdownAngleAreaMaximum !== null &&
        rpm &&
        displacementCc
      ) {
        blowdownSpecificTimeAreaMinimum =
          specificTimeArea({
            angleAreaMm2Deg: blowdownAngleAreaMinimum,
            rpm,
            displacementCc,
          }).value?.specificTimeAreaSecondsMm2PerCc ?? null;
        blowdownSpecificTimeAreaMaximum =
          specificTimeArea({
            angleAreaMm2Deg: blowdownAngleAreaMaximum,
            rpm,
            displacementCc,
          }).value?.specificTimeAreaSecondsMm2PerCc ?? null;
      }
    }
  }

  let rotary: EngineProjectAnalysisCore["rotary"] = null;
  if (rotaryTiming) {
    const rotarySegments = intervalSegments(rotaryTiming.interval);
    const rotaryTransferSegments = intersectSegments(
      rotarySegments,
      transferUnionSegments,
    );
    const unionTransferOverlapDeg = segmentDuration(rotaryTransferSegments);
    const tripleOverlapDeg = segmentDuration(
      intersectSegments(rotaryTransferSegments, exhaustSegments),
    );
    const tripleOverlapSegments = intersectSegments(
      rotaryTransferSegments,
      exhaustSegments,
    );
    const signedMargins = transfers
      .map((transfer) => transfer.valveMarginDeg)
      .filter((value): value is number => value !== null);
    const signedTransferMarginDeg = signedMargins.length
      ? Math.max(...signedMargins)
      : null;
    const signedTransferMarginUncertainty = transfers.some(
      (transfer) => transfer.valveMarginUncertainty !== null,
    )
      ? {
          minimumDeg: Math.max(
            ...transfers.map(
              (transfer) =>
                transfer.valveMarginUncertainty?.minimumDeg ??
                transfer.valveMarginDeg ??
                Number.NEGATIVE_INFINITY,
            ),
          ),
          maximumDeg: Math.max(
            ...transfers.map(
              (transfer) =>
                transfer.valveMarginUncertainty?.maximumDeg ??
                transfer.valveMarginDeg ??
                Number.NEGATIVE_INFINITY,
            ),
          ),
        }
      : null;
    const transferRelationship =
      signedTransferMarginDeg === null
        ? "not-applicable"
        : signedTransferMarginUncertainty &&
            signedTransferMarginUncertainty.minimumDeg <= 0 &&
            signedTransferMarginUncertainty.maximumDeg >= 0
          ? "indeterminate"
          : signedTransferMarginDeg > 0
            ? "overlap"
            : signedTransferMarginDeg < 0
              ? "gap"
              : "coincident";
    const commonAxialOverlapWidthMm = parseLocaleNumber(
      project.induction.commonAxialOverlapWidthMm,
    );
    const commonAxialOverlapWidthUncertaintyMm = positiveEnteredUncertainty(
      project.induction.commonAxialOverlapWidthUncertaintyMm,
    );
    const constantAreaMm2 = parseLocaleNumber(
      project.induction.effectiveWindowAreaMm2,
    );
    const geometry = rotaryInduction.analysis.geometry;
    const overlapArea =
      project.induction.areaSource === "cylindrical-overlap" &&
      geometry &&
      commonAxialOverlapWidthMm !== null &&
      commonAxialOverlapWidthMm > 0
        ? integrateRotaryOverlapArea({
            circumferenceMm: geometry.circumferenceMm,
            crankCutawayArcMm: geometry.crankCutawayArcMm,
            crankcaseWindowArcMm: geometry.crankcaseWindowArcMm,
            windowWidthMm: commonAxialOverlapWidthMm,
            integrationStepDeg: 0.25,
          }).value
        : null;
    const constantAngleAreaMm2Deg =
      project.induction.areaSource === "constant-area" &&
      constantAreaMm2 !== null &&
      constantAreaMm2 > 0
        ? constantAreaMm2 * rotaryTiming.durationDeg
        : null;
    const inletAngleAreaMm2Deg =
      overlapArea?.angleAreaMm2Deg ?? constantAngleAreaMm2Deg;
    const overlapSpecificTimeArea =
      inletAngleAreaMm2Deg !== null && rpm && displacementCc
        ? specificTimeArea({
            angleAreaMm2Deg: inletAngleAreaMm2Deg,
            rpm,
            displacementCc,
          }).value?.specificTimeAreaSecondsMm2PerCc ?? null
        : null;
    const areaUncertaintyResolution =
      overlapArea && geometry && commonAxialOverlapWidthMm !== null
        ? resolveRotaryAreaUncertainty({
            geometry,
            windowWidthMm: commonAxialOverlapWidthMm,
            windowWidthUncertaintyMm:
              commonAxialOverlapWidthUncertaintyMm,
            durationDeg: rotaryTiming.durationDeg,
            rpm,
            displacementCc,
            nominal: overlapArea,
          })
        : null;
    if (areaUncertaintyResolution?.diagnostic) {
      diagnostics.push(areaUncertaintyResolution.diagnostic);
    }
    rotary = {
      source: rotaryInduction.analysis.timingSource,
      advanceBeforeTdcDeg: rotaryTiming.advanceBeforeTdcDeg,
      delayAfterTdcDeg: rotaryTiming.delayAfterTdcDeg,
      durationDeg: rotaryTiming.durationDeg,
      durationMs: durationMs(rotaryTiming.durationDeg, rpm),
      interval: rotaryTiming.interval,
      unionTransferOverlapDeg,
      unionTransferOverlapMs: durationMs(unionTransferOverlapDeg, rpm),
      unionTransferOverlapSegments: rotaryTransferSegments,
      signedTransferMarginDeg,
      signedTransferMarginUncertainty,
      transferRelationship,
      tripleOverlapDeg,
      tripleOverlapSegments,
      inletCloseAfterTdcDeg: rotaryTiming.delayAfterTdcDeg,
      inletCloseAfterTdcMs: durationMs(rotaryTiming.delayAfterTdcDeg, rpm),
      areaModel: overlapArea
        ? "cylindrical-overlap"
        : constantAngleAreaMm2Deg !== null
          ? "constant-area"
          : "unavailable",
      crankcaseWindowAreaMm2: overlapArea?.crankcaseWindowAreaMm2 ?? null,
      maximumOpenAreaMm2:
        overlapArea?.maximumOpenAreaMm2 ??
        (constantAngleAreaMm2Deg !== null ? constantAreaMm2 : null),
      meanOpenAreaMm2:
        overlapArea?.meanOpenAreaMm2 ??
        (constantAngleAreaMm2Deg !== null ? constantAreaMm2 : null),
      overlapAngleAreaMm2Deg: inletAngleAreaMm2Deg,
      overlapSpecificTimeArea,
      areaUncertainty: areaUncertaintyResolution?.value ?? null,
      areaSamples: overlapArea
        ? areaUncertaintyResolution?.samples ??
          overlapArea.samples.map(({ elapsedDeg, openAreaMm2 }) => ({
            elapsedDeg,
            openAreaMm2,
            minimumOpenAreaMm2: null,
            maximumOpenAreaMm2: null,
          }))
        : constantAngleAreaMm2Deg !== null && constantAreaMm2 !== null
          ? [
              {
                elapsedDeg: 0,
                openAreaMm2: constantAreaMm2,
                minimumOpenAreaMm2: null,
                maximumOpenAreaMm2: null,
              },
              {
                elapsedDeg: rotaryTiming.durationDeg,
                openAreaMm2: constantAreaMm2,
                minimumOpenAreaMm2: null,
                maximumOpenAreaMm2: null,
              },
            ]
          : [],
    };
  }

  const componentBreakdownCc = {
    headChamber: parseLocaleNumber(project.compression.headChamberVolumeCc),
    gasket: parseLocaleNumber(project.compression.gasketVolumeCc),
    deck: parseLocaleNumber(project.compression.deckVolumeCc),
    pistonCrown: parseLocaleNumber(project.compression.pistonCrownVolumeCc),
    customCorrection: parseLocaleNumber(project.compression.customCorrectionCc),
  };
  const componentValues = Object.values(componentBreakdownCc);
  const componentTotal = componentValues.every(
    (value): value is number => value !== null,
  )
    ? componentValues.reduce((sum, value) => sum + value, 0)
    : null;
  const baselineClearanceVolume =
    project.compression.volumeMode === "component-breakdown"
      ? componentTotal
      : parseLocaleNumber(project.compression.clearanceVolumeCc);
  const cylinderLiftVolumeDeltaCc =
    ((Math.PI * boreMm ** 2) / 4) * cylinderLiftMm / 1000;
  const clearanceVolume =
    baselineClearanceVolume === null
      ? null
      : baselineClearanceVolume + cylinderLiftVolumeDeltaCc;
  const targetTrappedRatio = parseLocaleNumber(
    project.compression.targetTrappedRatio,
  );
  const geometric =
    displacementCc && clearanceVolume && clearanceVolume > 0
      ? geometricCompressionRatio({
          sweptVolumeCc: displacementCc,
          clearanceVolumeCc: clearanceVolume,
        }).value
      : null;
  const trapped =
    exhaust && clearanceVolume && clearanceVolume > 0
      ? trappedCompressionRatio({
          boreMm,
          exhaustClosureTravelFromTdcMm: exhaust.travelFromTdcMm,
          clearanceVolumeCc: clearanceVolume,
        }).value
      : null;
  const target =
    exhaust && targetTrappedRatio && targetTrappedRatio > 1
      ? targetClearanceVolumeForTrappedRatio({
          boreMm,
          exhaustClosureTravelFromTdcMm: exhaust.travelFromTdcMm,
          targetTrappedRatio,
        }).value
      : null;

  const gaps = [
    project.squish.gapNorthMm,
    project.squish.gapEastMm,
    project.squish.gapSouthMm,
    project.squish.gapWestMm,
  ]
    .map(parseLocaleNumber)
    .filter((value): value is number => value !== null)
    .map((value) => value + cylinderLiftMm);
  const gapStatistics = gaps.length ? squishGapStatistics(gaps).value : null;
  const enteredBowlDiameterMm = parseLocaleNumber(project.squish.bowlDiameterMm);
  const enteredBandWidthMm = parseLocaleNumber(project.squish.bandWidthMm);
  const bowlDiameterMm =
    project.squish.geometryMode === "band-width" &&
    enteredBandWidthMm !== null
      ? boreMm - 2 * enteredBandWidthMm
      : enteredBowlDiameterMm;
  const squishGeometry =
    bowlDiameterMm !== null
      ? squishGeometryFromBowlDiameter(boreMm, bowlDiameterMm).value
      : null;
  const manufacturerMinimumMm = parseLocaleNumber(
    project.squish.manufacturerMinimumMm,
  );
  const characterRpmMinimum = parseLocaleNumber(project.character.rpmMinimum);
  const characterRpmMaximum = parseLocaleNumber(project.character.rpmMaximum);
  const characterRpmStep = parseLocaleNumber(project.character.rpmStep);
  const rpmSweep =
    characterRpmMinimum !== null &&
    characterRpmMinimum >= 500 &&
    characterRpmMaximum !== null &&
    characterRpmMaximum > characterRpmMinimum &&
    characterRpmMaximum <= 20_000 &&
    characterRpmStep !== null &&
    characterRpmStep >= 100 &&
    characterRpmStep <= 2_000 &&
    (characterRpmMaximum - characterRpmMinimum) / characterRpmStep <= 80
      ? Array.from(
          {
            length:
              Math.floor(
                (characterRpmMaximum - characterRpmMinimum) /
                  characterRpmStep,
              ) + 1,
          },
          (_, index) => characterRpmMinimum + index * characterRpmStep,
        ).concat(
          (characterRpmMaximum - characterRpmMinimum) % characterRpmStep === 0
            ? []
            : [characterRpmMaximum],
        )
      : null;
  const timeAreaInputs: Array<{
    id: string;
    label: string;
    colour: string;
    source: "full-event" | "blowdown" | "rotary-inlet";
    angleArea: number | null;
    minimum: number | null;
    maximum: number | null;
  }> = [
    ...ports.map((port) => ({
      id: port.id,
      label: port.label,
      colour: port.colour,
      source: "full-event" as const,
      angleArea: port.angleAreaMm2Deg,
      minimum: port.uncertainty?.angleAreaMinMm2Deg ?? null,
      maximum: port.uncertainty?.angleAreaMaxMm2Deg ?? null,
    })),
    {
      id: "blowdown",
      label: "Exhaust blowdown",
      colour: "#8f341c",
      source: "blowdown" as const,
      angleArea: blowdownAngleAreaMm2Deg,
      minimum: blowdownAngleAreaMinimum,
      maximum: blowdownAngleAreaMaximum,
    },
    {
      id: "rotary-inlet",
      label: "Rotary inlet",
      colour: "#d2a42e",
      source: "rotary-inlet" as const,
      angleArea: rotary?.overlapAngleAreaMm2Deg ?? null,
      minimum:
        rotary?.areaUncertainty?.overlapAngleAreaMm2Deg.minimum ?? null,
      maximum:
        rotary?.areaUncertainty?.overlapAngleAreaMm2Deg.maximum ?? null,
    },
  ];
  const characterGeometry =
    rpmSweep && displacementCc && displacementCc > 0
      ? {
          rpmMinimum: characterRpmMinimum!,
          rpmMaximum: characterRpmMaximum!,
          rpmStep: characterRpmStep!,
          series: timeAreaInputs.flatMap((entry) => {
            if (entry.angleArea === null) return [];
            return [
              {
                id: entry.id,
                label: entry.label,
                colour: entry.colour,
                source: entry.source,
                samples: rpmSweep.map((sampleRpm) => ({
                  rpm: sampleRpm,
                  specificTimeArea:
                    entry.angleArea! / (6 * sampleRpm * displacementCc),
                  minimum:
                    entry.minimum === null
                      ? null
                      : entry.minimum / (6 * sampleRpm * displacementCc),
                  maximum:
                    entry.maximum === null
                      ? null
                      : entry.maximum / (6 * sampleRpm * displacementCc),
                })),
              },
            ];
          }),
        }
      : null;
  const characterTransfer = transferPorts.reduce<PortAnalysis | null>(
    (selected, port) =>
      selected === null || port.durationDeg > selected.durationDeg
        ? port
        : selected,
    null,
  );
  const profileReferenceSupported =
    project.character.referenceSetVersion === PROFILE_REFERENCE_SET_VERSION &&
    project.character.referenceSetVersion ===
      ENGINE_CHARACTER_REFERENCE_SET.version &&
    ENGINE_CHARACTER_REFERENCE_SET_VERSION === PROFILE_REFERENCE_SET_VERSION;
  const character =
    profileReferenceSupported &&
    project.character.profile !== "none" &&
    exhaust &&
    characterTransfer &&
    rotary &&
    globalBlowdownDeg !== null &&
    rotary.signedTransferMarginDeg !== null
      ? modelEngineCharacter(
          {
            profile: project.character.profile,
            exhaustDurationDeg: exhaust.durationDeg,
            transferDurationDeg: characterTransfer.durationDeg,
            blowdownDeg: globalBlowdownDeg,
            inletAdvanceBtdcDeg: rotary.advanceBeforeTdcDeg,
            inletCloseAtdcDeg: rotary.inletCloseAfterTdcDeg,
            inletTransferMarginDeg: rotary.signedTransferMarginDeg,
            exhaustSpecificTimeArea: blowdownSpecificTimeArea,
            inletSpecificTimeArea: rotary.overlapSpecificTimeArea,
          },
          hasTimingUncertainty &&
          globalBlowdownMinimum !== null &&
          globalBlowdownMaximum !== null
            ? {
                exhaustDurationDeg: exhaust.uncertainty
                  ? {
                      minimum: exhaust.uncertainty.durationMinDeg,
                      maximum: exhaust.uncertainty.durationMaxDeg,
                    }
                  : undefined,
                transferDurationDeg: characterTransfer.uncertainty
                  ? {
                      minimum: characterTransfer.uncertainty.durationMinDeg,
                      maximum: characterTransfer.uncertainty.durationMaxDeg,
                    }
                  : undefined,
                blowdownDeg: {
                  minimum: globalBlowdownMinimum,
                  maximum: globalBlowdownMaximum,
                },
                inletTransferMarginDeg:
                  rotary.signedTransferMarginUncertainty === null
                    ? undefined
                    : {
                        minimum:
                          rotary.signedTransferMarginUncertainty.minimumDeg,
                        maximum:
                          rotary.signedTransferMarginUncertainty.maximumDeg,
                      },
              }
            : undefined,
        )
      : null;
  const profile =
    project.character.profile === "none" ||
    !profileReferenceSupported
      ? null
      : ENGINE_CHARACTER_PROFILES[project.character.profile];
  const advisories: AnalysisAdvisory[] = [];
  const geometryCalibration: AnalysisAdvisory["calibration"] = {
    status: "not-applicable",
    scope:
      "Deterministic geometry is evaluated directly from the entered dimensions and event definitions; empirical calibration is not used.",
  };
  const profileCalibration: AnalysisAdvisory["calibration"] = {
    status: "not-calibrated",
    scope:
      "The profile reference set is not fitted to road, pressure, flow-bench or dyno data.",
  };
  const timingUncertaintyStatus: AnalysisUncertaintyStatus =
    hasTimingUncertainty &&
    globalBlowdownMinimum !== null &&
    globalBlowdownMaximum !== null
      ? "bounded"
      : "not-entered";
  if (
    project.character.profile !== "none" &&
    !profileReferenceSupported
  ) {
    const requestedProfile = ENGINE_CHARACTER_PROFILES[project.character.profile];
    advisories.push(analysisAdvisory({
      id: "profile-reference-unavailable",
      claimLevel: "profile-heuristic",
      evidenceSubtype: "selected-profile-rule",
      tone: "caution",
      title: `${requestedProfile.label} reference unavailable`,
      message: `The project requests profile reference ${project.character.referenceSetVersion}, which this application does not provide. Geometry remains available, but no profile rule or character annotation has been substituted.`,
      source: {
        id: "requested-profile-reference",
        label: `Requested profile reference ${project.character.referenceSetVersion}`,
        kind: "declared-reference-set",
        version: project.character.referenceSetVersion,
        url: null,
      },
      referenceSetVersion: project.character.referenceSetVersion,
      applicability:
        "A recognised profile identifier whose saved reference-set version is unavailable in this application.",
      uncertaintyStatus: "unavailable",
      calibration: {
        status: "not-calibrated",
        scope:
          "No contextual rule is evaluated because the requested reference set is unavailable.",
      },
      operatingScope:
        "Profile interpretation is withheld for the current project; deterministic geometry remains in scope.",
    }));
  }
  if (globalBlowdownDeg !== null) {
    const rangeCopy =
      hasTimingUncertainty &&
      globalBlowdownMinimum !== null &&
      globalBlowdownMaximum !== null
        ? ` Measurement bounds span ${globalBlowdownMinimum.toFixed(1)}-${globalBlowdownMaximum.toFixed(1)} degrees.`
        : "";
    advisories.push(analysisAdvisory({
      id: "geometry-blowdown",
      claimLevel: "calculated-geometry",
      evidenceSubtype: "derived-event-relationship",
      tone: globalBlowdownDeg <= 0 ? "strong" : "neutral",
      title: "Exhaust-to-transfer blowdown",
      message: `${globalBlowdownDeg.toFixed(1)} degrees from exhaust opening to the earliest transfer opening.${rangeCopy}`,
      source: deterministicGeometrySource,
      applicability:
        "Piston-ported two-stroke geometry with valid exhaust and transfer opening events.",
      uncertaintyStatus: timingUncertaintyStatus,
      calibration: geometryCalibration,
      operatingScope:
        "Current stroke, connecting-rod and port geometry; elapsed time and specific time-area additionally use the entered RPM.",
    }));
    const blowdownAnnotation = character?.annotations.find(
      (annotation) => annotation.id === "blowdown-context",
    );
    if (profile && blowdownAnnotation) {
      advisories.push(analysisAdvisory({
        id: "profile-blowdown",
        claimLevel: "profile-heuristic",
        evidenceSubtype: "selected-profile-rule",
        tone: "neutral",
        title: `${profile.label} blowdown context`,
        message: blowdownAnnotation.statement,
        source: declaredProfileSource,
        referenceSetVersion: profile.referenceSetVersion,
        applicability: blowdownAnnotation.applicability,
        uncertaintyStatus: timingUncertaintyStatus,
        calibration: profileCalibration,
        operatingScope: blowdownAnnotation.operatingScope,
      }));
    }
  }
  if (rotary) {
    const signedMargin = rotary.signedTransferMarginDeg;
    if (signedMargin !== null) {
      const relationshipCopy =
        rotary.transferRelationship === "indeterminate"
          ? signedMargin > 0
            ? "The nominal geometry overlaps, but the measurement bounds cross zero, so overlap versus gap is indeterminate."
            : signedMargin < 0
              ? "The nominal geometry has a gap, but the measurement bounds cross zero, so overlap versus gap is indeterminate."
              : "The nominal edges coincide and the measurement bounds leave overlap versus gap indeterminate."
          : signedMargin > 0
            ? "The inlet opens while at least one transfer is still open."
            : signedMargin < 0
              ? "All transfers close before the inlet opens."
              : "The inlet opening and final transfer closure coincide geometrically.";
      const marginUncertaintyStatus: AnalysisUncertaintyStatus =
        rotary.transferRelationship === "indeterminate"
          ? "indeterminate"
          : rotary.signedTransferMarginUncertainty
            ? "bounded"
            : "not-entered";
      advisories.push(analysisAdvisory({
        id: "geometry-inlet-transfer-margin",
        claimLevel: "calculated-geometry",
        evidenceSubtype: "derived-event-relationship",
        tone:
          rotary.transferRelationship === "indeterminate"
            ? "caution"
            : "neutral",
        title: "Signed inlet-to-transfer margin",
        message: `${signedMargin > 0 ? "+" : ""}${signedMargin.toFixed(1)} degrees. ${relationshipCopy}`,
        source: deterministicGeometrySource,
        applicability:
          "Crankshaft rotary induction and at least one valid piston-controlled transfer event.",
        uncertaintyStatus: marginUncertaintyStatus,
        calibration: geometryCalibration,
        operatingScope:
          "Current rotary inlet opening edge compared with the latest-closing enabled transfer event.",
      }));
      const overlapAnnotation = character?.annotations.find(
        (annotation) => annotation.id === "inlet-transfer-reference",
      );
      if (profile && overlapAnnotation) {
        advisories.push(analysisAdvisory({
          id: "profile-inlet-transfer-margin",
          claimLevel: "profile-heuristic",
          evidenceSubtype: "practitioner-threshold-comparison",
          tone:
            overlapAnnotation.status === "indeterminate"
              ? "caution"
              : overlapAnnotation.status === "above-reference"
                ? "strong"
                : "neutral",
          title: `${profile.label} overlap context`,
          message: overlapAnnotation.statement,
          source: inletOverlapReferenceSource,
          referenceSetVersion: profile.referenceSetVersion,
          applicability: overlapAnnotation.applicability,
          uncertaintyStatus:
            overlapAnnotation.uncertaintyStatus === "indeterminate"
              ? "indeterminate"
              : overlapAnnotation.uncertaintyStatus === "bounded"
                ? "bounded"
                : overlapAnnotation.uncertaintyStatus === "unavailable"
                  ? "unavailable"
                  : "not-entered",
          calibration: profileCalibration,
          operatingScope: overlapAnnotation.operatingScope,
        }));
      }
    }
    advisories.push(analysisAdvisory({
      id: "geometry-inlet-closing",
      claimLevel: "calculated-geometry",
      evidenceSubtype: "derived-event-relationship",
      tone: "neutral",
      title: "Inlet closing is a separate event",
      message: `${rotary.inletCloseAfterTdcDeg.toFixed(1)} degrees ATDC. This edge is not part of the inlet-to-transfer opening margin.`,
      source: deterministicGeometrySource,
      applicability: "Crankshaft rotary induction with a valid closing edge.",
      uncertaintyStatus: "not-entered",
      calibration: geometryCalibration,
      operatingScope: "Current rotary inlet closing edge after TDC.",
    }));
    const closingAnnotation = character?.annotations.find(
      (annotation) => annotation.id === "inlet-closing-context",
    );
    if (profile && closingAnnotation) {
      advisories.push(analysisAdvisory({
        id: "profile-inlet-closing",
        claimLevel: "profile-heuristic",
        evidenceSubtype: "selected-profile-rule",
        tone: "neutral",
        title: `${profile.label} inlet-closing context`,
        message: closingAnnotation.statement,
        source: declaredProfileSource,
        referenceSetVersion: profile.referenceSetVersion,
        applicability: closingAnnotation.applicability,
        uncertaintyStatus: "not-entered",
        calibration: profileCalibration,
        operatingScope: closingAnnotation.operatingScope,
      }));
    }
    const rotaryUncertaintyStatus: AnalysisUncertaintyStatus =
      rotaryInduction.analysis.geometry?.uncertaintyStatus === "outside-domain"
        ? "outside-domain"
        : rotary.overlapAngleAreaMm2Deg === null
          ? "unavailable"
          : rotary.areaUncertainty
            ? "bounded"
            : "not-entered";
    advisories.push(analysisAdvisory({
      id: "modelled-rotary-area",
      claimLevel: "measured-or-modelled",
      evidenceSubtype: "idealised-geometric-model",
      tone: rotary.overlapAngleAreaMm2Deg === null ? "caution" : "neutral",
      title: "Rotary inlet overlap area",
      message:
        rotary.overlapAngleAreaMm2Deg === null
          ? "Select an area source and enter its required measurement to calculate inlet angle-area."
          : rotary.areaModel === "constant-area"
            ? "This project uses the legacy constant-area approximation across the inlet duration. Switch to cylindrical overlap and enter a common axial width to model the changing geometric opening."
            : "Area is integrated from the instantaneous overlap of the measured and calculated arcs across a sharp-edged rectangular window. Duct shape, leakage and discharge are excluded.",
      source: rotaryAreaModelSource,
      applicability:
        rotary.areaModel === "constant-area"
          ? "Rotary-inlet projects with a manually entered constant effective-window area approximation."
          : "Rotary-inlet projects using one measured component arc, the solved complementary arc and a measured common axial overlap width.",
      uncertaintyStatus: rotaryUncertaintyStatus,
      calibration: {
        status: "not-calibrated",
        scope:
          "Geometric overlap only. No discharge coefficient, pressure history, mass-flow or measured engine-response dataset is fitted.",
      },
      operatingScope:
        "Current desired rotary timing and selected area source; specific time-area additionally uses the entered RPM and displacement.",
    }));
  }
  const hasRotaryMeasurementUncertainty =
    (rotaryInduction.analysis.geometry?.uncertaintyStatus ?? "not-entered") !==
      "not-entered" ||
    positiveEnteredUncertainty(
      project.induction.commonAxialOverlapWidthUncertaintyMm,
    ) > 0;
  if (hasTimingUncertainty || hasRotaryMeasurementUncertainty) {
    const uncertaintyOutsideDomain =
      rotaryInduction.analysis.geometry?.uncertaintyStatus ===
      "outside-domain";
    advisories.push(analysisAdvisory({
      id: "modelled-measurement-uncertainty",
      claimLevel: "measured-or-modelled",
      evidenceSubtype: "entered-measurement-bounds",
      tone: "caution",
      title: "Measurement uncertainty propagated",
      message: uncertaintyOutsideDomain
        ? "At least one entered plus-or-minus range leaves the physical rotary domain, so the affected bounded result is withheld while valid nominal geometry remains available. No probability distribution or confidence level is implied."
        : "Entered millimetre uncertainty is propagated through every valid affected geometry, area and time-area result. Bounds are deterministic worst cases from the entered plus-or-minus values, with no probability distribution or confidence level implied. Near a dead centre, equal linear uncertainty need not produce equal angular uncertainty.",
      source: measurementGuidanceSource,
      applicability:
        "Only explicitly entered dimensional plus-or-minus bounds whose complete range remains in the dependent calculation's physical domain.",
      uncertaintyStatus: uncertaintyOutsideDomain
        ? "outside-domain"
        : "bounded",
      calibration: geometryCalibration,
      operatingScope:
        "Current entered dimensional bounds and every valid dependent timing, rotary-area and time-area calculation.",
    }));
  }
  if (character && profile) {
    advisories.push(analysisAdvisory({
      id: "modelled-engine-character",
      claimLevel: "profile-heuristic",
      evidenceSubtype: "uncalibrated-profile-annotation",
      tone: "neutral",
      title: "Uncalibrated character annotations",
      message: character.modelStatement,
      source: declaredProfileSource,
      referenceSetVersion: character.referenceSet.version,
      applicability: profile.applicability,
      uncertaintyStatus:
        character.annotations.some(
          (annotation) => annotation.uncertaintyStatus === "indeterminate",
        )
          ? "indeterminate"
          : character.annotations.some(
                (annotation) => annotation.uncertaintyStatus === "bounded",
              )
            ? "bounded"
            : "not-entered",
      calibration: profileCalibration,
      operatingScope:
        "Current calculated geometry and specific time-area, interpreted only through the explicitly selected exhaust-use context.",
    }));
  }

  return {
    validGeometry: true,
    displacementCc,
    meanPistonSpeedMps,
    ports,
    exhaust,
    transfers,
    induction: rotaryInduction.analysis,
    rotary,
    timing: {
      globalBlowdownDeg,
      globalBlowdownMs:
        globalBlowdownDeg === null
          ? null
          : durationMs(globalBlowdownDeg, rpm),
      transferOpeningSpreadDeg,
      exhaustTransferUnionOverlapDeg,
      exhaustTransferUnionOverlapSegments: exhaust
        ? intersectSegments(exhaustSegments, transferUnionSegments)
        : [],
      blowdownAngleAreaMm2Deg,
      blowdownSpecificTimeArea,
      uncertainty:
        hasTimingUncertainty &&
        globalBlowdownMinimum !== null &&
        globalBlowdownMaximum !== null
          ? {
              globalBlowdownMinDeg: globalBlowdownMinimum,
              globalBlowdownMaxDeg: globalBlowdownMaximum,
              globalBlowdownMinMs: durationMs(
                globalBlowdownMinimum,
                rpm,
              ),
              globalBlowdownMaxMs: durationMs(
                globalBlowdownMaximum,
                rpm,
              ),
              blowdownAngleAreaMinMm2Deg: blowdownAngleAreaMinimum,
              blowdownAngleAreaMaxMm2Deg: blowdownAngleAreaMaximum,
              blowdownSpecificTimeAreaMin: blowdownSpecificTimeAreaMinimum,
              blowdownSpecificTimeAreaMax: blowdownSpecificTimeAreaMaximum,
            }
          : null,
    },
    character,
    characterGeometry,
    compression: {
      clearanceVolumeMode: project.compression.volumeMode,
      geometricRatio: geometric?.ratio ?? null,
      trappedRatio: trapped?.ratio ?? null,
      trappedSweptVolumeCc: trapped?.trappedSweptVolumeCc ?? null,
      clearanceVolumeCc: clearanceVolume,
      targetTrappedRatio,
      targetClearanceVolumeCc: target?.targetClearanceVolumeCc ?? null,
      componentBreakdownCc,
    },
    squish: {
      minimumGapMm: gapStatistics?.minimumMm ?? null,
      meanGapMm: gapStatistics?.meanMm ?? null,
      maximumGapMm: gapStatistics?.maximumMm ?? null,
      gapRangeMm: gapStatistics?.rangeMm ?? null,
      areaPercent: squishGeometry?.squishAreaPercent ?? null,
      bandWidthMm: squishGeometry?.bandWidthMm ?? null,
      bowlDiameterMm,
      manufacturerMinimumMm,
      belowManufacturerMinimum:
        gapStatistics && manufacturerMinimumMm !== null
          ? gapStatistics.minimumMm < manufacturerMinimumMm
          : null,
    },
    diagnostics: Array.from(
      new Set([
        ...diagnostics,
        ...ports.flatMap((port) => port.diagnostics),
      ]),
    ),
    advisories,
  };
}

function metricDelta(
  current: number | null,
  baseline: number | null,
): number | null {
  return current === null || baseline === null ? null : current - baseline;
}

function analyseTransmission(
  project: EngineProjectDraft,
): EngineProjectAnalysis["transmission"] {
  if (!project.transmission.enabled) {
    return { enabled: false, result: null, diagnostics: [] };
  }

  const result = calculateTransmission({
    primaryDrivePinionTeeth:
      parseLocaleNumber(project.transmission.primaryDrivePinionTeeth) ??
      Number.NaN,
    primaryDrivenGearTeeth:
      parseLocaleNumber(project.transmission.primaryDrivenGearTeeth) ??
      Number.NaN,
    wheelRollingCircumferenceMm:
      parseLocaleNumber(project.transmission.wheelRollingCircumferenceMm) ??
      Number.NaN,
    maximumRpm:
      parseLocaleNumber(project.transmission.maximumRpm) ?? Number.NaN,
    gears: project.transmission.gears
      .slice(0, project.transmission.gearCount)
      .map((gear) => ({
        id: gear.id,
        label: gear.label,
        clusterPinionTeeth:
          parseLocaleNumber(gear.clusterPinionTeeth) ?? Number.NaN,
        drivenGearTeeth:
          parseLocaleNumber(gear.drivenGearTeeth) ?? Number.NaN,
      })),
  });

  return {
    enabled: true,
    result: result.value,
    diagnostics: result.diagnostics.map((diagnostic) => diagnostic.message),
  };
}

export function analyseProject(project: EngineProjectDraft): EngineProjectAnalysis {
  const baseline = analyseProjectCore(project, 0);
  const rawLift = project.compression.baseSpacerThicknessMm;
  const parsedLift = parseLocaleNumber(rawLift);
  const requestedThicknessMm = rawLift.trim() === "" ? 0 : parsedLift;
  const maximumThicknessMm = baseline.ports.length
    ? Math.min(...baseline.ports.map((port) => port.travelFromTdcMm))
    : null;
  const hasValidNumber =
    requestedThicknessMm !== null && requestedThicknessMm >= 0;
  const withinPortTravel =
    hasValidNumber &&
    (maximumThicknessMm === null || requestedThicknessMm <= maximumThicknessMm);
  const valid = hasValidNumber && withinPortTravel;
  const appliedThicknessMm = valid ? requestedThicknessMm : 0;
  const current =
    appliedThicknessMm > 0
      ? analyseProjectCore(project, appliedThicknessMm)
      : baseline;
  const deckPositionMm = parseLocaleNumber(project.geometry.deckPositionMm);
  const boreMm = parseLocaleNumber(project.geometry.boreMm);
  const clearanceVolumeDeltaCc =
    boreMm !== null && boreMm > 0
      ? ((Math.PI * boreMm ** 2) / 4) * appliedThicknessMm / 1000
      : null;
  const ports = current.ports.flatMap((port) => {
    const baselinePort = baseline.ports.find((item) => item.id === port.id);
    if (!baselinePort) return [];
    return [{
      id: port.id,
      label: port.label,
      colour: port.colour,
      baselineTravelFromTdcMm: baselinePort.travelFromTdcMm,
      liftedTravelFromTdcMm: port.travelFromTdcMm,
      baselineOpeningAngleDeg: baselinePort.openingAngleDeg,
      liftedOpeningAngleDeg: port.openingAngleDeg,
      openingDeltaDeg: port.openingAngleDeg - baselinePort.openingAngleDeg,
      baselineDurationDeg: baselinePort.durationDeg,
      liftedDurationDeg: port.durationDeg,
      durationDeltaDeg: port.durationDeg - baselinePort.durationDeg,
    }];
  });
  const extraDiagnostics: string[] = [];
  const transmission = analyseTransmission(project);

  if (deckPositionMm === null) {
    extraDiagnostics.push(
      "Piston crown position at TDC must be a valid signed number; deck-referenced results are unavailable.",
    );
  }

  if (!hasValidNumber) {
    extraDiagnostics.push("Cylinder lift must be a non-negative number.");
  } else if (!withinPortTravel && maximumThicknessMm !== null) {
    extraDiagnostics.push(
      `Cylinder lift exceeds the highest enabled port roof. Use ${maximumThicknessMm.toFixed(2)} mm or less.`,
    );
  } else if (
    appliedThicknessMm > 0 &&
    maximumThicknessMm !== null &&
    Math.abs(appliedThicknessMm - maximumThicknessMm) < 1e-9
  ) {
    extraDiagnostics.push(
      "The highest enabled port reaches the TDC boundary and is geometrically open for the full cycle.",
    );
  }

  return {
    ...current,
    transmission,
    diagnostics: Array.from(new Set([...current.diagnostics, ...extraDiagnostics])),
    cylinderLift: {
      requestedThicknessMm,
      appliedThicknessMm,
      maximumThicknessMm,
      valid,
      effectiveDeckPositionMm:
        deckPositionMm === null ? null : deckPositionMm + appliedThicknessMm,
      clearanceVolumeDeltaCc,
      squishGapDeltaMm: appliedThicknessMm,
      globalBlowdownDeltaDeg: metricDelta(
        current.timing.globalBlowdownDeg,
        baseline.timing.globalBlowdownDeg,
      ),
      transferOpeningSpreadDeltaDeg: metricDelta(
        current.timing.transferOpeningSpreadDeg,
        baseline.timing.transferOpeningSpreadDeg,
      ),
      exhaustTransferOverlapDeltaDeg: metricDelta(
        current.timing.exhaustTransferUnionOverlapDeg,
        baseline.timing.exhaustTransferUnionOverlapDeg,
      ),
      rotaryTransferOverlapDeltaDeg: metricDelta(
        current.rotary?.unionTransferOverlapDeg ?? null,
        baseline.rotary?.unionTransferOverlapDeg ?? null,
      ),
      ports,
    },
  };
}
