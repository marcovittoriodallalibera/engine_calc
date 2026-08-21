import { boreAreaMm2 } from "./compression.ts";
import { pistonTravelFromTdc, type SliderCrankGeometry } from "./geometry.ts";
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
  const boreArea = boreAreaMm2(boreMm);
  const bowlArea = boreAreaMm2(bowlDiameterMm);
  const squishBandAreaMm2 = boreArea - bowlArea;
  const squishAreaRatio = squishBandAreaMm2 / boreArea;
  return calculationResult({
    boreMm,
    bowlDiameterMm,
    bandWidthMm: (boreMm - bowlDiameterMm) / 2,
    squishAreaRatio,
    squishAreaPercent: squishAreaRatio * 100,
    boreAreaMm2: boreArea,
    bowlAreaMm2: bowlArea,
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

export interface SquishVelocityInput extends SliderCrankGeometry {
  boreMm: number;
  bowlDiameterMm: number;
  /** Squish clearance at TDC. */
  squishGapMm: number;
  rpm: number;
  integrationStepDeg?: number;
}

export interface SquishVelocityResult {
  maximumSquishVelocityMps: number;
  crankAngleAtMaximumDeg: number;
  squishBandAreaMm2: number;
  squishGapMm: number;
  rpm: number;
}

/**
 * Maximum squish velocity, evaluated over the approach to TDC.
 *
 * The squish band holds `A_band * gap(theta)`. As the piston rises, that volume
 * is pushed through the annulus at the bowl edge, whose area is
 * `pi * bowlDiameter * gap(theta)`, giving
 * `v = A_band * pistonSpeed(theta) / (pi * bowlDiameter * gap(theta))`.
 *
 * This is the standard idealised model: one-dimensional, incompressible, and
 * blind to gas inertia, leakage past the ring and chamber shape. It describes
 * geometry, not combustion.
 */
export function maximumSquishVelocity(
  input: SquishVelocityInput,
): CalculationResult<SquishVelocityResult> {
  const integrationStepDeg = input.integrationStepDeg ?? 0.5;
  const geometry = centralGeometry(input.boreMm, input.bowlDiameterMm);
  const diagnostics = [
    ...geometry.diagnostics,
    ...collectDiagnostics(
      positiveNumberDiagnostic(input.squishGapMm, "squishGapMm"),
      positiveNumberDiagnostic(input.rpm, "rpm"),
      positiveNumberDiagnostic(input.strokeMm, "strokeMm"),
      positiveNumberDiagnostic(input.rodLengthMm, "rodLengthMm"),
      positiveNumberDiagnostic(integrationStepDeg, "integrationStepDeg"),
    ),
  ];
  if (!geometry.value || diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }
  if (input.bowlDiameterMm <= 0) {
    diagnostics.push(
      errorDiagnostic(
        "BOWL_DIAMETER_NOT_POSITIVE",
        "A squish velocity needs a bowl the displaced charge can flow into.",
        "bowlDiameterMm",
      ),
    );
    return calculationResult(null, diagnostics);
  }

  const bandAreaMm2 = geometry.value.squishBandAreaMm2;
  const radiansPerSecond = (input.rpm * 2 * Math.PI) / 60;
  const annulusPerMm = Math.PI * input.bowlDiameterMm;

  let maximumSquishVelocityMps = 0;
  let crankAngleAtMaximumDeg = 0;
  // Walk the upstroke towards TDC. Piston speed falls to zero at TDC while the
  // gap reaches its minimum, so the peak sits between the two.
  for (let angle = integrationStepDeg; angle <= 90; angle += integrationStepDeg) {
    const travel = pistonTravelFromTdc({
      strokeMm: input.strokeMm,
      rodLengthMm: input.rodLengthMm,
      crankAngleDeg: angle,
    }).value?.travelFromTdcMm;
    if (travel === undefined) continue;
    const gapMm = input.squishGapMm + travel;
    if (gapMm <= 0) continue;
    // d(travel)/d(theta) in mm per radian, converted to mm per second.
    const nextTravel = pistonTravelFromTdc({
      strokeMm: input.strokeMm,
      rodLengthMm: input.rodLengthMm,
      crankAngleDeg: angle + integrationStepDeg,
    }).value?.travelFromTdcMm;
    if (nextTravel === undefined) continue;
    const travelPerRadian =
      (nextTravel - travel) / ((integrationStepDeg * Math.PI) / 180);
    const pistonSpeedMmPerSecond = travelPerRadian * radiansPerSecond;
    const velocityMps =
      (bandAreaMm2 * pistonSpeedMmPerSecond) / (annulusPerMm * gapMm) / 1000;
    if (velocityMps > maximumSquishVelocityMps) {
      maximumSquishVelocityMps = velocityMps;
      crankAngleAtMaximumDeg = angle;
    }
  }

  return calculationResult(
    {
      maximumSquishVelocityMps,
      crankAngleAtMaximumDeg,
      squishBandAreaMm2: bandAreaMm2,
      squishGapMm: input.squishGapMm,
      rpm: input.rpm,
    },
    diagnostics,
  );
}
