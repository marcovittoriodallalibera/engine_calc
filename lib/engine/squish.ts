import {
  calculationResult,
  collectDiagnostics,
  errorDiagnostic,
  finiteNumberDiagnostic,
  nonNegativeNumberDiagnostic,
  positiveNumberDiagnostic,
  type CalculationResult,
} from "./result.ts";

export interface CentralSquishGeometry {
  boreMm: number;
  bowlDiameterMm: number;
  bandWidthMm: number;
  squishAreaRatio: number;
  squishAreaPercent: number;
  boreAreaMm2: number;
  bowlAreaMm2: number;
  squishBandAreaMm2: number;
}

export interface SquishGapStatistics {
  count: number;
  minimumMm: number;
  maximumMm: number;
  meanMm: number;
  rangeMm: number;
  maximumDeviationFromMeanMm: number;
  standardDeviationMm: number;
}

function centralGeometry(
  boreMm: number,
  bowlDiameterMm: number,
): CalculationResult<CentralSquishGeometry> {
  const diagnostics = collectDiagnostics(
    positiveNumberDiagnostic(boreMm, "boreMm"),
    nonNegativeNumberDiagnostic(bowlDiameterMm, "bowlDiameterMm"),
  );
  if (Number.isFinite(boreMm) && Number.isFinite(bowlDiameterMm) && bowlDiameterMm > boreMm) {
    diagnostics.push(
      errorDiagnostic(
        "BOWL_EXCEEDS_BORE",
        "bowlDiameterMm cannot exceed boreMm.",
        "bowlDiameterMm",
      ),
    );
  }
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }
  const boreAreaMm2 = (Math.PI * boreMm ** 2) / 4;
  const bowlAreaMm2 = (Math.PI * bowlDiameterMm ** 2) / 4;
  const squishBandAreaMm2 = boreAreaMm2 - bowlAreaMm2;
  const squishAreaRatio = squishBandAreaMm2 / boreAreaMm2;
  return calculationResult({
    boreMm,
    bowlDiameterMm,
    bandWidthMm: (boreMm - bowlDiameterMm) / 2,
    squishAreaRatio,
    squishAreaPercent: squishAreaRatio * 100,
    boreAreaMm2,
    bowlAreaMm2,
    squishBandAreaMm2,
  });
}

export function squishGeometryFromBowlDiameter(
  boreMm: number,
  bowlDiameterMm: number,
): CalculationResult<CentralSquishGeometry> {
  return centralGeometry(boreMm, bowlDiameterMm);
}

export function squishGeometryFromAreaRatio(
  boreMm: number,
  squishAreaRatio: number,
): CalculationResult<CentralSquishGeometry> {
  const diagnostics = collectDiagnostics(
    positiveNumberDiagnostic(boreMm, "boreMm"),
    finiteNumberDiagnostic(squishAreaRatio, "squishAreaRatio"),
  );
  if (
    Number.isFinite(squishAreaRatio) &&
    (squishAreaRatio < 0 || squishAreaRatio > 1)
  ) {
    diagnostics.push(
      errorDiagnostic(
        "SQUISH_RATIO_OUTSIDE_RANGE",
        "squishAreaRatio must be between zero and one.",
        "squishAreaRatio",
      ),
    );
  }
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }
  return centralGeometry(boreMm, boreMm * Math.sqrt(1 - squishAreaRatio));
}

export function squishGapStatistics(
  gapsMm: readonly number[],
): CalculationResult<SquishGapStatistics> {
  if (gapsMm.length === 0) {
    return calculationResult(null, [
      errorDiagnostic("NO_SQUISH_GAPS", "At least one squish gap measurement is required.", "gapsMm"),
    ]);
  }
  const diagnostics = gapsMm.flatMap((gap, index) =>
    collectDiagnostics(nonNegativeNumberDiagnostic(gap, `gapsMm.${index}`)),
  );
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }
  const minimumMm = Math.min(...gapsMm);
  const maximumMm = Math.max(...gapsMm);
  const meanMm = gapsMm.reduce((sum, gap) => sum + gap, 0) / gapsMm.length;
  const variance =
    gapsMm.reduce((sum, gap) => sum + (gap - meanMm) ** 2, 0) / gapsMm.length;
  return calculationResult({
    count: gapsMm.length,
    minimumMm,
    maximumMm,
    meanMm,
    rangeMm: maximumMm - minimumMm,
    maximumDeviationFromMeanMm: Math.max(...gapsMm.map((gap) => Math.abs(gap - meanMm))),
    standardDeviationMm: Math.sqrt(variance),
  });
}
