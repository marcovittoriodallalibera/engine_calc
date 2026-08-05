import {
  calculationResult,
  collectDiagnostics,
  errorDiagnostic,
  finiteNumberDiagnostic,
  nonNegativeNumberDiagnostic,
  positiveNumberDiagnostic,
  type CalculationResult,
} from "./result.ts";

export interface SliderCrankGeometry {
  strokeMm: number;
  rodLengthMm: number;
}

export interface PistonTravelInput extends SliderCrankGeometry {
  crankAngleDeg: number;
}

export interface PistonTravelResult {
  crankAngleDeg: number;
  normalisedCrankAngleDeg: number;
  travelFromTdcMm: number;
}

export interface CrankAngleInput extends SliderCrankGeometry {
  travelFromTdcMm: number;
}

export interface CrankAngleResult {
  travelFromTdcMm: number;
  openingAngleDeg: number;
  closingAngleDeg: number;
}

export interface PortRoofTravelInput {
  roofDepthFromDeckMm: number;
  crownBelowDeckAtTdcMm: number;
  strokeMm?: number;
}

export interface PortRoofTravelResult {
  travelFromTdcMm: number;
}

export function normaliseDegrees(angleDeg: number): number {
  const normalised = angleDeg % 360;
  return normalised < 0 ? normalised + 360 : normalised;
}

function sliderCrankDiagnostics(geometry: SliderCrankGeometry) {
  const diagnostics = collectDiagnostics(
    positiveNumberDiagnostic(geometry.strokeMm, "strokeMm"),
    positiveNumberDiagnostic(geometry.rodLengthMm, "rodLengthMm"),
  );
  if (
    Number.isFinite(geometry.strokeMm) &&
    Number.isFinite(geometry.rodLengthMm) &&
    geometry.strokeMm > 0 &&
    geometry.rodLengthMm <= geometry.strokeMm / 2
  ) {
    diagnostics.push(
      errorDiagnostic(
        "ROD_NOT_LONGER_THAN_CRANK",
        "rodLengthMm must be greater than the crank radius.",
        "rodLengthMm",
      ),
    );
  }
  return diagnostics;
}

export function pistonTravelFromTdc(
  input: PistonTravelInput,
): CalculationResult<PistonTravelResult> {
  const diagnostics = [
    ...sliderCrankDiagnostics(input),
    ...collectDiagnostics(finiteNumberDiagnostic(input.crankAngleDeg, "crankAngleDeg")),
  ];
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }

  const theta = (normaliseDegrees(input.crankAngleDeg) * Math.PI) / 180;
  const radius = input.strokeMm / 2;
  const underRoot = input.rodLengthMm ** 2 - radius ** 2 * Math.sin(theta) ** 2;
  const travel =
    radius * (1 - Math.cos(theta)) +
    input.rodLengthMm -
    Math.sqrt(Math.max(0, underRoot));

  return calculationResult({
    crankAngleDeg: input.crankAngleDeg,
    normalisedCrankAngleDeg: normaliseDegrees(input.crankAngleDeg),
    travelFromTdcMm: travel,
  });
}

export function crankAnglesFromTdcTravel(
  input: CrankAngleInput,
): CalculationResult<CrankAngleResult> {
  const diagnostics = [
    ...sliderCrankDiagnostics(input),
    ...collectDiagnostics(nonNegativeNumberDiagnostic(input.travelFromTdcMm, "travelFromTdcMm")),
  ];
  if (
    Number.isFinite(input.travelFromTdcMm) &&
    Number.isFinite(input.strokeMm) &&
    input.travelFromTdcMm > input.strokeMm
  ) {
    diagnostics.push(
      errorDiagnostic(
        "TRAVEL_EXCEEDS_STROKE",
        "travelFromTdcMm cannot exceed strokeMm.",
        "travelFromTdcMm",
      ),
    );
  }
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }

  const radius = input.strokeMm / 2;
  const q = input.rodLengthMm + radius - input.travelFromTdcMm;
  const denominator = 2 * radius * q;
  if (denominator === 0) {
    return calculationResult(null, [
      ...diagnostics,
      errorDiagnostic("INVERSE_SINGULARITY", "The geometry has no unique inverse angle."),
    ]);
  }
  const rawCosine =
    (q ** 2 + radius ** 2 - input.rodLengthMm ** 2) / denominator;
  const cosine = Math.max(-1, Math.min(1, rawCosine));
  const openingAngleDeg = (Math.acos(cosine) * 180) / Math.PI;

  return calculationResult({
    travelFromTdcMm: input.travelFromTdcMm,
    openingAngleDeg,
    closingAngleDeg: normaliseDegrees(360 - openingAngleDeg),
  });
}

export function portRoofTravelFromMeasurement(
  input: PortRoofTravelInput,
): CalculationResult<PortRoofTravelResult> {
  const diagnostics = collectDiagnostics(
    nonNegativeNumberDiagnostic(input.roofDepthFromDeckMm, "roofDepthFromDeckMm"),
    finiteNumberDiagnostic(input.crownBelowDeckAtTdcMm, "crownBelowDeckAtTdcMm"),
    input.strokeMm === undefined
      ? null
      : positiveNumberDiagnostic(input.strokeMm, "strokeMm"),
  );
  const travel = input.roofDepthFromDeckMm - input.crownBelowDeckAtTdcMm;
  if (Number.isFinite(travel) && travel < 0) {
    diagnostics.push(
      errorDiagnostic(
        "ROOF_ABOVE_TDC_CROWN",
        "The port roof measurement places the roof above the piston crown at TDC.",
        "roofDepthFromDeckMm",
      ),
    );
  }
  if (
    input.strokeMm !== undefined &&
    Number.isFinite(travel) &&
    Number.isFinite(input.strokeMm) &&
    travel > input.strokeMm
  ) {
    diagnostics.push(
      errorDiagnostic(
        "ROOF_BELOW_BDC_CROWN",
        "The port roof travel exceeds the stroke.",
        "roofDepthFromDeckMm",
      ),
    );
  }
  return diagnostics.some((item) => item.severity === "error")
    ? calculationResult(null, diagnostics)
    : calculationResult({ travelFromTdcMm: travel }, diagnostics);
}
