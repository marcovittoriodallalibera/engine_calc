import { crankAnglesFromTdcTravel, type SliderCrankGeometry } from "./geometry.ts";
import {
  calculationResult,
  collectDiagnostics,
  errorDiagnostic,
  nonNegativeNumberDiagnostic,
  positiveNumberDiagnostic,
  type CalculationResult,
  type Diagnostic,
} from "./result.ts";
import { symmetricPortTimingFromOpening, type SymmetricPortTiming } from "./timing.ts";

export interface CylinderGeometry {
  boreMm: number;
  strokeMm: number;
  cylinders?: number;
}

export interface DisplacementResult {
  cylinderAreaMm2: number;
  displacementPerCylinderCc: number;
  totalDisplacementCc: number;
  cylinders: number;
}

export interface MeanPistonSpeedResult {
  strokeMm: number;
  rpm: number;
  metresPerSecond: number;
}

export interface CompressionRatioInput {
  sweptVolumeCc: number;
  clearanceVolumeCc: number;
}

export interface CompressionRatioResult {
  sweptVolumeCc: number;
  clearanceVolumeCc: number;
  ratio: number;
}

export interface TrappedCompressionInput {
  boreMm: number;
  exhaustClosureTravelFromTdcMm: number;
  clearanceVolumeCc: number;
}

export interface TrappedCompressionResult {
  trappedSweptVolumeCc: number;
  clearanceVolumeCc: number;
  ratio: number;
}

export interface TargetClearanceVolumeInput {
  boreMm: number;
  exhaustClosureTravelFromTdcMm: number;
  targetTrappedRatio: number;
}

export interface TargetClearanceVolumeResult {
  targetClearanceVolumeCc: number;
  trappedSweptVolumeCc: number;
  targetTrappedRatio: number;
}

export interface CompressionScenarioInput extends SliderCrankGeometry {
  boreMm: number;
  clearanceVolumeCc: number;
  squishGapMm: number;
  exhaustRoofTravelFromTdcMm: number;
  transferRoofTravelsFromTdcMm?: Record<string, number>;
}

export type CompressionScenarioChange =
  | { kind: "head-gasket"; thicknessMm: number }
  | { kind: "base-spacer"; thicknessMm: number }
  | { kind: "exhaust-roof-raise"; heightMm: number };

export interface CompressionScenarioState {
  clearanceVolumeCc: number;
  squishGapMm: number;
  geometricCompressionRatio: number;
  trappedCompressionRatio: number;
  exhaustRoofTravelFromTdcMm: number;
  exhaustTiming: SymmetricPortTiming;
  transferRoofTravelsFromTdcMm: Record<string, number>;
  transferTimings: Record<string, SymmetricPortTiming>;
}

export interface CompressionScenarioResult {
  change: CompressionScenarioChange;
  clearanceVolumeDeltaCc: number;
  before: CompressionScenarioState;
  after: CompressionScenarioState;
}

export function cylinderAreaMm2(boreMm: number): CalculationResult<number> {
  const diagnostics = collectDiagnostics(positiveNumberDiagnostic(boreMm, "boreMm"));
  return diagnostics.length > 0
    ? calculationResult(null, diagnostics)
    : calculationResult((Math.PI * boreMm ** 2) / 4);
}

export function displacement(input: CylinderGeometry): CalculationResult<DisplacementResult> {
  const cylinders = input.cylinders ?? 1;
  const diagnostics = collectDiagnostics(
    positiveNumberDiagnostic(input.boreMm, "boreMm"),
    positiveNumberDiagnostic(input.strokeMm, "strokeMm"),
    positiveNumberDiagnostic(cylinders, "cylinders"),
  );
  if (Number.isFinite(cylinders) && !Number.isInteger(cylinders)) {
    diagnostics.push(
      errorDiagnostic("CYLINDER_COUNT_NOT_INTEGER", "cylinders must be a whole number.", "cylinders"),
    );
  }
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }
  const area = (Math.PI * input.boreMm ** 2) / 4;
  const displacementPerCylinderCc = (area * input.strokeMm) / 1000;
  return calculationResult({
    cylinderAreaMm2: area,
    displacementPerCylinderCc,
    totalDisplacementCc: displacementPerCylinderCc * cylinders,
    cylinders,
  });
}

export function meanPistonSpeed(
  strokeMm: number,
  rpm: number,
): CalculationResult<MeanPistonSpeedResult> {
  const diagnostics = collectDiagnostics(
    positiveNumberDiagnostic(strokeMm, "strokeMm"),
    positiveNumberDiagnostic(rpm, "rpm"),
  );
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }
  return calculationResult({
    strokeMm,
    rpm,
    metresPerSecond: (2 * (strokeMm / 1000) * rpm) / 60,
  });
}

export function geometricCompressionRatio(
  input: CompressionRatioInput,
): CalculationResult<CompressionRatioResult> {
  const diagnostics = collectDiagnostics(
    positiveNumberDiagnostic(input.sweptVolumeCc, "sweptVolumeCc"),
    positiveNumberDiagnostic(input.clearanceVolumeCc, "clearanceVolumeCc"),
  );
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }
  return calculationResult({
    ...input,
    ratio: (input.sweptVolumeCc + input.clearanceVolumeCc) / input.clearanceVolumeCc,
  });
}

export function trappedCompressionRatio(
  input: TrappedCompressionInput,
): CalculationResult<TrappedCompressionResult> {
  const diagnostics = collectDiagnostics(
    positiveNumberDiagnostic(input.boreMm, "boreMm"),
    nonNegativeNumberDiagnostic(
      input.exhaustClosureTravelFromTdcMm,
      "exhaustClosureTravelFromTdcMm",
    ),
    positiveNumberDiagnostic(input.clearanceVolumeCc, "clearanceVolumeCc"),
  );
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }
  const trappedSweptVolumeCc =
    ((Math.PI * input.boreMm ** 2) / 4) * input.exhaustClosureTravelFromTdcMm / 1000;
  return calculationResult({
    trappedSweptVolumeCc,
    clearanceVolumeCc: input.clearanceVolumeCc,
    ratio: (trappedSweptVolumeCc + input.clearanceVolumeCc) / input.clearanceVolumeCc,
  });
}

export function trappedCompressionFromGeometric(
  geometricRatio: number,
  exhaustClosureTravelFromTdcMm: number,
  strokeMm: number,
): CalculationResult<number> {
  const diagnostics = collectDiagnostics(
    positiveNumberDiagnostic(geometricRatio, "geometricRatio"),
    nonNegativeNumberDiagnostic(
      exhaustClosureTravelFromTdcMm,
      "exhaustClosureTravelFromTdcMm",
    ),
    positiveNumberDiagnostic(strokeMm, "strokeMm"),
  );
  if (Number.isFinite(geometricRatio) && geometricRatio <= 1) {
    diagnostics.push(
      errorDiagnostic(
        "COMPRESSION_RATIO_NOT_ABOVE_ONE",
        "geometricRatio must be greater than one.",
        "geometricRatio",
      ),
    );
  }
  if (
    Number.isFinite(exhaustClosureTravelFromTdcMm) &&
    Number.isFinite(strokeMm) &&
    exhaustClosureTravelFromTdcMm > strokeMm
  ) {
    diagnostics.push(
      errorDiagnostic(
        "CLOSURE_TRAVEL_EXCEEDS_STROKE",
        "exhaustClosureTravelFromTdcMm cannot exceed strokeMm.",
        "exhaustClosureTravelFromTdcMm",
      ),
    );
  }
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }
  return calculationResult(
    1 + (geometricRatio - 1) * exhaustClosureTravelFromTdcMm / strokeMm,
  );
}

export function targetClearanceVolumeForTrappedRatio(
  input: TargetClearanceVolumeInput,
): CalculationResult<TargetClearanceVolumeResult> {
  const diagnostics = collectDiagnostics(
    positiveNumberDiagnostic(input.boreMm, "boreMm"),
    positiveNumberDiagnostic(
      input.exhaustClosureTravelFromTdcMm,
      "exhaustClosureTravelFromTdcMm",
    ),
    positiveNumberDiagnostic(input.targetTrappedRatio, "targetTrappedRatio"),
  );
  if (Number.isFinite(input.targetTrappedRatio) && input.targetTrappedRatio <= 1) {
    diagnostics.push(
      errorDiagnostic(
        "TARGET_RATIO_NOT_ABOVE_ONE",
        "targetTrappedRatio must be greater than one.",
        "targetTrappedRatio",
      ),
    );
  }
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }
  const trappedSweptVolumeCc =
    ((Math.PI * input.boreMm ** 2) / 4) * input.exhaustClosureTravelFromTdcMm / 1000;
  return calculationResult({
    targetClearanceVolumeCc: trappedSweptVolumeCc / (input.targetTrappedRatio - 1),
    trappedSweptVolumeCc,
    targetTrappedRatio: input.targetTrappedRatio,
  });
}

function scenarioInputDiagnostics(input: CompressionScenarioInput): Diagnostic[] {
  const diagnostics = collectDiagnostics(
    positiveNumberDiagnostic(input.boreMm, "boreMm"),
    positiveNumberDiagnostic(input.strokeMm, "strokeMm"),
    positiveNumberDiagnostic(input.rodLengthMm, "rodLengthMm"),
    positiveNumberDiagnostic(input.clearanceVolumeCc, "clearanceVolumeCc"),
    nonNegativeNumberDiagnostic(input.squishGapMm, "squishGapMm"),
    nonNegativeNumberDiagnostic(
      input.exhaustRoofTravelFromTdcMm,
      "exhaustRoofTravelFromTdcMm",
    ),
  );
  for (const [name, travel] of Object.entries(input.transferRoofTravelsFromTdcMm ?? {})) {
    const issue = nonNegativeNumberDiagnostic(travel, `transferRoofTravelsFromTdcMm.${name}`);
    if (issue) diagnostics.push(issue);
  }
  return diagnostics;
}

function buildScenarioState(
  input: CompressionScenarioInput,
): CalculationResult<CompressionScenarioState> {
  const diagnostics = scenarioInputDiagnostics(input);
  const displacementResult = displacement({ boreMm: input.boreMm, strokeMm: input.strokeMm });
  const exhaustAngles = crankAnglesFromTdcTravel({
    strokeMm: input.strokeMm,
    rodLengthMm: input.rodLengthMm,
    travelFromTdcMm: input.exhaustRoofTravelFromTdcMm,
  });
  diagnostics.push(...displacementResult.diagnostics, ...exhaustAngles.diagnostics);
  const exhaustTiming = exhaustAngles.value
    ? symmetricPortTimingFromOpening(exhaustAngles.value.openingAngleDeg)
    : calculationResult<SymmetricPortTiming>(null);
  diagnostics.push(...exhaustTiming.diagnostics);

  const transferTimings: Record<string, SymmetricPortTiming> = {};
  for (const [name, travel] of Object.entries(input.transferRoofTravelsFromTdcMm ?? {})) {
    const angle = crankAnglesFromTdcTravel({
      strokeMm: input.strokeMm,
      rodLengthMm: input.rodLengthMm,
      travelFromTdcMm: travel,
    });
    diagnostics.push(...angle.diagnostics);
    if (angle.value) {
      const timing = symmetricPortTimingFromOpening(angle.value.openingAngleDeg);
      diagnostics.push(...timing.diagnostics);
      if (timing.value) transferTimings[name] = timing.value;
    }
  }

  const geometric = displacementResult.value
    ? geometricCompressionRatio({
        sweptVolumeCc: displacementResult.value.displacementPerCylinderCc,
        clearanceVolumeCc: input.clearanceVolumeCc,
      })
    : calculationResult<CompressionRatioResult>(null);
  const trapped = trappedCompressionRatio({
    boreMm: input.boreMm,
    exhaustClosureTravelFromTdcMm: input.exhaustRoofTravelFromTdcMm,
    clearanceVolumeCc: input.clearanceVolumeCc,
  });
  diagnostics.push(...geometric.diagnostics, ...trapped.diagnostics);

  if (!exhaustTiming.value || !geometric.value || !trapped.value) {
    return calculationResult(null, diagnostics);
  }
  return calculationResult(
    {
      clearanceVolumeCc: input.clearanceVolumeCc,
      squishGapMm: input.squishGapMm,
      geometricCompressionRatio: geometric.value.ratio,
      trappedCompressionRatio: trapped.value.ratio,
      exhaustRoofTravelFromTdcMm: input.exhaustRoofTravelFromTdcMm,
      exhaustTiming: exhaustTiming.value,
      transferRoofTravelsFromTdcMm: { ...(input.transferRoofTravelsFromTdcMm ?? {}) },
      transferTimings,
    },
    diagnostics,
  );
}

export function evaluateCompressionScenario(
  input: CompressionScenarioInput,
  change: CompressionScenarioChange,
): CalculationResult<CompressionScenarioResult> {
  const diagnostics = scenarioInputDiagnostics(input);
  const changeAmount = change.kind === "exhaust-roof-raise" ? change.heightMm : change.thicknessMm;
  const changeField = change.kind === "exhaust-roof-raise" ? "heightMm" : "thicknessMm";
  const changeIssue = nonNegativeNumberDiagnostic(changeAmount, changeField);
  if (changeIssue) diagnostics.push(changeIssue);
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }

  const before = buildScenarioState(input);
  diagnostics.push(...before.diagnostics);
  const area = (Math.PI * input.boreMm ** 2) / 4;
  const clearanceVolumeDeltaCc =
    change.kind === "head-gasket" || change.kind === "base-spacer"
      ? area * change.thicknessMm / 1000
      : 0;
  const shift = change.kind === "base-spacer" ? change.thicknessMm : 0;
  const exhaustRaise = change.kind === "exhaust-roof-raise" ? change.heightMm : 0;
  const afterInput: CompressionScenarioInput = {
    ...input,
    clearanceVolumeCc: input.clearanceVolumeCc + clearanceVolumeDeltaCc,
    squishGapMm:
      input.squishGapMm +
      (change.kind === "head-gasket" || change.kind === "base-spacer"
        ? change.thicknessMm
        : 0),
    exhaustRoofTravelFromTdcMm:
      input.exhaustRoofTravelFromTdcMm - shift - exhaustRaise,
    transferRoofTravelsFromTdcMm: Object.fromEntries(
      Object.entries(input.transferRoofTravelsFromTdcMm ?? {}).map(([name, travel]) => [
        name,
        travel - shift,
      ]),
    ),
  };
  const after = buildScenarioState(afterInput);
  diagnostics.push(...after.diagnostics);
  if (!before.value || !after.value) return calculationResult(null, diagnostics);
  return calculationResult(
    { change, clearanceVolumeDeltaCc, before: before.value, after: after.value },
    diagnostics,
  );
}
