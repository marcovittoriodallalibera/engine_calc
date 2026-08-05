import { normaliseDegrees, pistonTravelFromTdc, type SliderCrankGeometry } from "./geometry.ts";
import {
  calculationResult,
  collectDiagnostics,
  errorDiagnostic,
  finiteNumberDiagnostic,
  nonNegativeNumberDiagnostic,
  positiveNumberDiagnostic,
  warningDiagnostic,
  type CalculationResult,
  type Diagnostic,
} from "./result.ts";

export interface RectangularPortGeometry extends SliderCrankGeometry {
  roofTravelFromTdcMm: number;
  portWidthMm: number;
  portHeightMm: number;
  portCount?: number;
}

export interface RectangularPortAreaInput extends RectangularPortGeometry {
  crankAngleDeg: number;
}

export interface RectangularPortAreaResult {
  crankAngleDeg: number;
  pistonTravelFromTdcMm: number;
  uncoveredHeightMm: number;
  openAreaMm2: number;
  maximumAreaMm2: number;
}

export interface RectangularPortAngleAreaInput extends RectangularPortGeometry {
  startAngleDeg?: number;
  endAngleDeg?: number;
  integrationStepDeg?: number;
}

export interface RectangularPortAngleAreaResult {
  startAngleDeg: number;
  endAngleDeg: number;
  integratedDurationDeg: number;
  integrationStepDeg: number;
  angleAreaMm2Deg: number;
  maximumAreaMm2: number;
}

export interface SpecificTimeAreaInput {
  angleAreaMm2Deg: number;
  rpm: number;
  displacementCc: number;
}

export interface SpecificTimeAreaResult extends SpecificTimeAreaInput {
  areaTimeMm2Seconds: number;
  specificTimeAreaSecondsMm2PerCc: number;
}

function portGeometryDiagnostics(input: RectangularPortGeometry): Diagnostic[] {
  const count = input.portCount ?? 1;
  const diagnostics = collectDiagnostics(
    positiveNumberDiagnostic(input.strokeMm, "strokeMm"),
    positiveNumberDiagnostic(input.rodLengthMm, "rodLengthMm"),
    nonNegativeNumberDiagnostic(input.roofTravelFromTdcMm, "roofTravelFromTdcMm"),
    positiveNumberDiagnostic(input.portWidthMm, "portWidthMm"),
    positiveNumberDiagnostic(input.portHeightMm, "portHeightMm"),
    positiveNumberDiagnostic(count, "portCount"),
  );
  if (
    Number.isFinite(input.strokeMm) &&
    Number.isFinite(input.rodLengthMm) &&
    input.strokeMm > 0 &&
    input.rodLengthMm <= input.strokeMm / 2
  ) {
    diagnostics.push(
      errorDiagnostic(
        "ROD_NOT_LONGER_THAN_CRANK",
        "rodLengthMm must be greater than the crank radius.",
        "rodLengthMm",
      ),
    );
  }
  if (Number.isFinite(count) && !Number.isInteger(count)) {
    diagnostics.push(
      errorDiagnostic("PORT_COUNT_NOT_INTEGER", "portCount must be a whole number.", "portCount"),
    );
  }
  if (
    Number.isFinite(input.roofTravelFromTdcMm) &&
    Number.isFinite(input.strokeMm) &&
    input.roofTravelFromTdcMm > input.strokeMm
  ) {
    diagnostics.push(
      errorDiagnostic(
        "PORT_ROOF_BELOW_BDC",
        "roofTravelFromTdcMm cannot exceed strokeMm.",
        "roofTravelFromTdcMm",
      ),
    );
  }
  if (
    Number.isFinite(input.roofTravelFromTdcMm) &&
    Number.isFinite(input.portHeightMm) &&
    Number.isFinite(input.strokeMm) &&
    input.roofTravelFromTdcMm + input.portHeightMm > input.strokeMm
  ) {
    diagnostics.push(
      warningDiagnostic(
        "PORT_NOT_FULLY_UNCOVERED_AT_BDC",
        "The rectangular port extends below the piston travel at BDC, so maximum geometric area is not reached.",
        "portHeightMm",
      ),
    );
  }
  return diagnostics;
}

function rawPistonTravel(input: SliderCrankGeometry, crankAngleDeg: number): number {
  const theta = (normaliseDegrees(crankAngleDeg) * Math.PI) / 180;
  const radius = input.strokeMm / 2;
  return (
    radius * (1 - Math.cos(theta)) +
    input.rodLengthMm -
    Math.sqrt(input.rodLengthMm ** 2 - radius ** 2 * Math.sin(theta) ** 2)
  );
}

function rawOpenArea(input: RectangularPortGeometry, crankAngleDeg: number): number {
  const travel = rawPistonTravel(input, crankAngleDeg);
  const uncoveredHeight = Math.min(
    input.portHeightMm,
    Math.max(0, travel - input.roofTravelFromTdcMm),
  );
  return uncoveredHeight * input.portWidthMm * (input.portCount ?? 1);
}

export function rectangularPortOpenArea(
  input: RectangularPortAreaInput,
): CalculationResult<RectangularPortAreaResult> {
  const diagnostics = [
    ...portGeometryDiagnostics(input),
    ...collectDiagnostics(finiteNumberDiagnostic(input.crankAngleDeg, "crankAngleDeg")),
  ];
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }
  const travelResult = pistonTravelFromTdc(input);
  diagnostics.push(...travelResult.diagnostics);
  if (!travelResult.value) return calculationResult(null, diagnostics);
  const uncoveredHeightMm = Math.min(
    input.portHeightMm,
    Math.max(0, travelResult.value.travelFromTdcMm - input.roofTravelFromTdcMm),
  );
  const count = input.portCount ?? 1;
  return calculationResult(
    {
      crankAngleDeg: normaliseDegrees(input.crankAngleDeg),
      pistonTravelFromTdcMm: travelResult.value.travelFromTdcMm,
      uncoveredHeightMm,
      openAreaMm2: uncoveredHeightMm * input.portWidthMm * count,
      maximumAreaMm2: input.portHeightMm * input.portWidthMm * count,
    },
    diagnostics,
  );
}

export function integrateRectangularPortAngleArea(
  input: RectangularPortAngleAreaInput,
): CalculationResult<RectangularPortAngleAreaResult> {
  const startAngleDeg = input.startAngleDeg ?? 0;
  const suppliedEnd = input.endAngleDeg ?? 360;
  const integrationStepDeg = input.integrationStepDeg ?? 0.25;
  const diagnostics = [
    ...portGeometryDiagnostics(input),
    ...collectDiagnostics(
      finiteNumberDiagnostic(startAngleDeg, "startAngleDeg"),
      finiteNumberDiagnostic(suppliedEnd, "endAngleDeg"),
      positiveNumberDiagnostic(integrationStepDeg, "integrationStepDeg"),
    ),
  ];
  if (Number.isFinite(integrationStepDeg) && integrationStepDeg > 10) {
    diagnostics.push(
      warningDiagnostic(
        "COARSE_INTEGRATION_STEP",
        "An integration step above 10 degrees can materially reduce geometric time-area accuracy.",
        "integrationStepDeg",
      ),
    );
  }
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }

  let endAngleDeg = suppliedEnd;
  while (endAngleDeg < startAngleDeg) endAngleDeg += 360;
  if (endAngleDeg - startAngleDeg > 360) {
    diagnostics.push(
      errorDiagnostic(
        "INTEGRATION_EXCEEDS_CYCLE",
        "The integration interval cannot exceed 360 degrees.",
      ),
    );
    return calculationResult(null, diagnostics);
  }

  let angleAreaMm2Deg = 0;
  let angle = startAngleDeg;
  let area = rawOpenArea(input, angle);
  while (angle < endAngleDeg) {
    const nextAngle = Math.min(endAngleDeg, angle + integrationStepDeg);
    const nextArea = rawOpenArea(input, nextAngle);
    angleAreaMm2Deg += ((area + nextArea) / 2) * (nextAngle - angle);
    angle = nextAngle;
    area = nextArea;
  }
  return calculationResult(
    {
      startAngleDeg,
      endAngleDeg,
      integratedDurationDeg: endAngleDeg - startAngleDeg,
      integrationStepDeg,
      angleAreaMm2Deg,
      maximumAreaMm2: input.portWidthMm * input.portHeightMm * (input.portCount ?? 1),
    },
    diagnostics,
  );
}

export function specificTimeArea(
  input: SpecificTimeAreaInput,
): CalculationResult<SpecificTimeAreaResult> {
  const diagnostics = collectDiagnostics(
    nonNegativeNumberDiagnostic(input.angleAreaMm2Deg, "angleAreaMm2Deg"),
    positiveNumberDiagnostic(input.rpm, "rpm"),
    positiveNumberDiagnostic(input.displacementCc, "displacementCc"),
  );
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }
  const areaTimeMm2Seconds = input.angleAreaMm2Deg / (6 * input.rpm);
  return calculationResult({
    ...input,
    areaTimeMm2Seconds,
    specificTimeAreaSecondsMm2PerCc: areaTimeMm2Seconds / input.displacementCc,
  });
}
