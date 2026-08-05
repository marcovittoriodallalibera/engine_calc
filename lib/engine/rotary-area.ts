import {
  calculationResult,
  collectDiagnostics,
  errorDiagnostic,
  positiveNumberDiagnostic,
  warningDiagnostic,
  type CalculationResult,
} from "./result.ts";

export interface RotaryOverlapAreaInput {
  circumferenceMm: number;
  crankCutawayArcMm: number;
  crankcaseWindowArcMm: number;
  windowWidthMm: number;
  integrationStepDeg?: number;
}

export interface RotaryOverlapAreaSample {
  elapsedDeg: number;
  overlapArcMm: number;
  openAreaMm2: number;
}

export interface RotaryOverlapAreaResult {
  durationDeg: number;
  integrationStepDeg: number;
  crankcaseWindowAreaMm2: number;
  maximumOverlapArcMm: number;
  maximumOpenAreaMm2: number;
  meanOpenAreaMm2: number;
  angleAreaMm2Deg: number;
  samples: RotaryOverlapAreaSample[];
}

function overlapArcAtTravel(
  travelMm: number,
  crankCutawayArcMm: number,
  crankcaseWindowArcMm: number,
): number {
  const totalArcMm = crankCutawayArcMm + crankcaseWindowArcMm;
  return Math.max(
    0,
    Math.min(
      travelMm,
      crankCutawayArcMm,
      crankcaseWindowArcMm,
      totalArcMm - travelMm,
    ),
  );
}

/**
 * Calculates the changing geometric inlet area while one sharp-edged,
 * rectangular crank cut-away sweeps across one sharp-edged crankcase window.
 * Both arcs are measured on the same circular timing track.
 */
export function integrateRotaryOverlapArea(
  input: RotaryOverlapAreaInput,
): CalculationResult<RotaryOverlapAreaResult> {
  const integrationStepDeg = input.integrationStepDeg ?? 0.25;
  const diagnostics = collectDiagnostics(
    positiveNumberDiagnostic(input.circumferenceMm, "circumferenceMm"),
    positiveNumberDiagnostic(input.crankCutawayArcMm, "crankCutawayArcMm"),
    positiveNumberDiagnostic(input.crankcaseWindowArcMm, "crankcaseWindowArcMm"),
    positiveNumberDiagnostic(input.windowWidthMm, "windowWidthMm"),
    positiveNumberDiagnostic(integrationStepDeg, "integrationStepDeg"),
  );
  const totalArcMm = input.crankCutawayArcMm + input.crankcaseWindowArcMm;
  const tolerance = Math.max(1, input.circumferenceMm) * 1e-12;

  if (
    Number.isFinite(totalArcMm) &&
    Number.isFinite(input.circumferenceMm) &&
    totalArcMm > input.circumferenceMm + tolerance
  ) {
    diagnostics.push(
      errorDiagnostic(
        "ROTARY_OVERLAP_ARCS_EXCEED_TRACK",
        "The two opening arcs cannot exceed one timing-track circumference.",
      ),
    );
  }
  if (Number.isFinite(integrationStepDeg) && integrationStepDeg > 5) {
    diagnostics.push(
      warningDiagnostic(
        "COARSE_ROTARY_AREA_STEP",
        "An integration step above 5 degrees can visibly reduce overlap-area accuracy.",
        "integrationStepDeg",
      ),
    );
  }
  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return calculationResult(null, diagnostics);
  }

  const durationDeg = (totalArcMm * 360) / input.circumferenceMm;
  const maximumOverlapArcMm = Math.min(
    input.crankCutawayArcMm,
    input.crankcaseWindowArcMm,
  );
  const maximumOpenAreaMm2 = maximumOverlapArcMm * input.windowWidthMm;
  const crankcaseWindowAreaMm2 =
    input.crankcaseWindowArcMm * input.windowWidthMm;
  const samples: RotaryOverlapAreaSample[] = [];
  let elapsedDeg = 0;

  samples.push({ elapsedDeg: 0, overlapArcMm: 0, openAreaMm2: 0 });
  while (elapsedDeg < durationDeg) {
    const nextElapsedDeg = Math.min(durationDeg, elapsedDeg + integrationStepDeg);
    const nextTravelMm =
      (nextElapsedDeg * input.circumferenceMm) / 360;
    const nextOverlapArcMm = overlapArcAtTravel(
      nextTravelMm,
      input.crankCutawayArcMm,
      input.crankcaseWindowArcMm,
    );
    samples.push({
      elapsedDeg: nextElapsedDeg,
      overlapArcMm: nextOverlapArcMm,
      openAreaMm2: nextOverlapArcMm * input.windowWidthMm,
    });
    elapsedDeg = nextElapsedDeg;
  }

  // The integral of the overlap between two one-dimensional intervals while
  // one passes fully across the other is the product of their lengths. Convert
  // linear travel back to crank degrees to keep the area result exact even when
  // a visual sampling step does not land on either trapezoid corner.
  const angleAreaMm2Deg =
    input.windowWidthMm *
    input.crankCutawayArcMm *
    input.crankcaseWindowArcMm *
    (360 / input.circumferenceMm);

  return calculationResult(
    {
      durationDeg,
      integrationStepDeg,
      crankcaseWindowAreaMm2,
      maximumOverlapArcMm,
      maximumOpenAreaMm2,
      meanOpenAreaMm2:
        durationDeg > 0 ? angleAreaMm2Deg / durationDeg : 0,
      angleAreaMm2Deg,
      samples,
    },
    diagnostics,
  );
}
