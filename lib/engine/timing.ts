import { normaliseDegrees } from "./geometry.ts";
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

export interface CircularInterval {
  startDeg: number;
  endDeg: number;
  fullCircle?: boolean;
}

export interface LinearAngleSegment {
  startDeg: number;
  endDeg: number;
}

export interface CircularOverlapResult {
  degrees: number;
  segments: LinearAngleSegment[];
}

export interface SymmetricPortTiming {
  openingAngleDeg: number;
  closingAngleDeg: number;
  durationDeg: number;
  interval: CircularInterval;
}

export interface RotaryValveTiming {
  advanceBeforeTdcDeg: number;
  delayAfterTdcDeg: number;
  durationDeg: number;
  interval: CircularInterval;
}

export interface BlowdownResult {
  exhaustOpeningAngleDeg: number;
  transferOpeningAngleDeg: number;
  blowdownDeg: number;
}

export interface IntakeTransferMarginInput {
  intakeAdvanceBeforeTdcDeg: number;
  transferDurationDeg: number;
}

export interface IntakeTransferMarginResult {
  transferCloseBeforeTdcDeg: number;
  signedMarginDeg: number;
  relationship: "overlap" | "gap" | "coincident";
}

export interface DurationAtRpmResult {
  degrees: number;
  rpm: number;
  milliseconds: number;
}

function intervalDiagnostics(interval: CircularInterval, prefix: string): Diagnostic[] {
  return collectDiagnostics(
    finiteNumberDiagnostic(interval.startDeg, `${prefix}.startDeg`),
    finiteNumberDiagnostic(interval.endDeg, `${prefix}.endDeg`),
  );
}

export function circularIntervalDuration(
  interval: CircularInterval,
): CalculationResult<number> {
  const diagnostics = intervalDiagnostics(interval, "interval");
  if (diagnostics.length > 0) return calculationResult(null, diagnostics);
  if (interval.fullCircle) return calculationResult(360);
  const start = normaliseDegrees(interval.startDeg);
  const end = normaliseDegrees(interval.endDeg);
  return calculationResult(normaliseDegrees(end - start));
}

export function splitCircularInterval(
  interval: CircularInterval,
): CalculationResult<LinearAngleSegment[]> {
  const diagnostics = intervalDiagnostics(interval, "interval");
  if (diagnostics.length > 0) return calculationResult(null, diagnostics);
  if (interval.fullCircle) return calculationResult([{ startDeg: 0, endDeg: 360 }]);
  const start = normaliseDegrees(interval.startDeg);
  const end = normaliseDegrees(interval.endDeg);
  if (start === end) return calculationResult([]);
  return start < end
    ? calculationResult([{ startDeg: start, endDeg: end }])
    : calculationResult([
        { startDeg: start, endDeg: 360 },
        { startDeg: 0, endDeg: end },
      ]);
}

export function circularIntervalOverlap(
  first: CircularInterval,
  second: CircularInterval,
): CalculationResult<CircularOverlapResult> {
  const firstSegments = splitCircularInterval(first);
  const secondSegments = splitCircularInterval(second);
  const diagnostics = [...firstSegments.diagnostics, ...secondSegments.diagnostics];
  if (!firstSegments.value || !secondSegments.value) {
    return calculationResult(null, diagnostics);
  }

  const segments: LinearAngleSegment[] = [];
  for (const a of firstSegments.value) {
    for (const b of secondSegments.value) {
      const startDeg = Math.max(a.startDeg, b.startDeg);
      const endDeg = Math.min(a.endDeg, b.endDeg);
      if (endDeg > startDeg) segments.push({ startDeg, endDeg });
    }
  }
  segments.sort((a, b) => a.startDeg - b.startDeg);
  const merged: LinearAngleSegment[] = [];
  for (const segment of segments) {
    const previous = merged.at(-1);
    if (previous && segment.startDeg <= previous.endDeg) {
      previous.endDeg = Math.max(previous.endDeg, segment.endDeg);
    } else {
      merged.push({ ...segment });
    }
  }
  return calculationResult({
    degrees: merged.reduce((sum, segment) => sum + segment.endDeg - segment.startDeg, 0),
    segments: merged,
  });
}

export function symmetricPortTimingFromOpening(
  openingAngleDeg: number,
): CalculationResult<SymmetricPortTiming> {
  const diagnostics = collectDiagnostics(
    finiteNumberDiagnostic(openingAngleDeg, "openingAngleDeg"),
  );
  if (Number.isFinite(openingAngleDeg) && (openingAngleDeg < 0 || openingAngleDeg > 180)) {
    diagnostics.push(
      errorDiagnostic(
        "OPENING_OUTSIDE_DOWNSTROKE",
        "openingAngleDeg must be between 0 and 180 degrees.",
        "openingAngleDeg",
      ),
    );
  }
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }
  const closingAngleDeg = normaliseDegrees(360 - openingAngleDeg);
  return calculationResult({
    openingAngleDeg,
    closingAngleDeg,
    durationDeg: 360 - 2 * openingAngleDeg,
    interval: {
      startDeg: openingAngleDeg,
      endDeg: closingAngleDeg,
      fullCircle: openingAngleDeg === 0,
    },
  });
}

export function symmetricPortTimingFromDuration(
  durationDeg: number,
): CalculationResult<SymmetricPortTiming> {
  const diagnostics = collectDiagnostics(finiteNumberDiagnostic(durationDeg, "durationDeg"));
  if (Number.isFinite(durationDeg) && (durationDeg < 0 || durationDeg > 360)) {
    diagnostics.push(
      errorDiagnostic(
        "DURATION_OUTSIDE_CYCLE",
        "durationDeg must be between 0 and 360 degrees.",
        "durationDeg",
      ),
    );
  }
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }
  return symmetricPortTimingFromOpening((360 - durationDeg) / 2);
}

export function rotaryValveTiming(
  advanceBeforeTdcDeg: number,
  delayAfterTdcDeg: number,
): CalculationResult<RotaryValveTiming> {
  const diagnostics = collectDiagnostics(
    nonNegativeNumberDiagnostic(advanceBeforeTdcDeg, "advanceBeforeTdcDeg"),
    nonNegativeNumberDiagnostic(delayAfterTdcDeg, "delayAfterTdcDeg"),
  );
  const durationDeg = advanceBeforeTdcDeg + delayAfterTdcDeg;
  if (Number.isFinite(durationDeg) && durationDeg > 360) {
    diagnostics.push(
      errorDiagnostic(
        "ROTARY_DURATION_EXCEEDS_CYCLE",
        "Advance plus delay cannot exceed 360 degrees.",
      ),
    );
  }
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }
  return calculationResult({
    advanceBeforeTdcDeg,
    delayAfterTdcDeg,
    durationDeg,
    interval: {
      startDeg: normaliseDegrees(360 - advanceBeforeTdcDeg),
      endDeg: normaliseDegrees(delayAfterTdcDeg),
      fullCircle: durationDeg === 360,
    },
  });
}

export function blowdownFromOpeningAngles(
  exhaustOpeningAngleDeg: number,
  transferOpeningAngleDeg: number,
): CalculationResult<BlowdownResult> {
  const exhaust = symmetricPortTimingFromOpening(exhaustOpeningAngleDeg);
  const transfer = symmetricPortTimingFromOpening(transferOpeningAngleDeg);
  const diagnostics = [...exhaust.diagnostics, ...transfer.diagnostics];
  if (!exhaust.value || !transfer.value) return calculationResult(null, diagnostics);
  const blowdownDeg = transferOpeningAngleDeg - exhaustOpeningAngleDeg;
  if (blowdownDeg < 0) {
    diagnostics.push(
      warningDiagnostic(
        "TRANSFER_OPENS_BEFORE_EXHAUST",
        "The transfer event opens before the exhaust event in this geometry.",
      ),
    );
  }
  return calculationResult(
    { exhaustOpeningAngleDeg, transferOpeningAngleDeg, blowdownDeg },
    diagnostics,
  );
}

export function blowdownFromDurations(
  exhaustDurationDeg: number,
  transferDurationDeg: number,
): CalculationResult<BlowdownResult> {
  const exhaust = symmetricPortTimingFromDuration(exhaustDurationDeg);
  const transfer = symmetricPortTimingFromDuration(transferDurationDeg);
  const diagnostics = [...exhaust.diagnostics, ...transfer.diagnostics];
  if (!exhaust.value || !transfer.value) return calculationResult(null, diagnostics);
  const calculated = blowdownFromOpeningAngles(
    exhaust.value.openingAngleDeg,
    transfer.value.openingAngleDeg,
  );
  const combinedDiagnostics = [...diagnostics, ...calculated.diagnostics];
  return calculated.value
    ? calculationResult(calculated.value, combinedDiagnostics)
    : calculationResult(null, combinedDiagnostics);
}

export function intakeTransferMargin(
  input: IntakeTransferMarginInput,
): CalculationResult<IntakeTransferMarginResult> {
  const diagnostics = collectDiagnostics(
    nonNegativeNumberDiagnostic(
      input.intakeAdvanceBeforeTdcDeg,
      "intakeAdvanceBeforeTdcDeg",
    ),
    finiteNumberDiagnostic(input.transferDurationDeg, "transferDurationDeg"),
  );
  if (
    Number.isFinite(input.intakeAdvanceBeforeTdcDeg) &&
    input.intakeAdvanceBeforeTdcDeg > 360
  ) {
    diagnostics.push(
      errorDiagnostic(
        "INTAKE_ADVANCE_EXCEEDS_CYCLE",
        "intakeAdvanceBeforeTdcDeg cannot exceed 360 degrees.",
        "intakeAdvanceBeforeTdcDeg",
      ),
    );
  }
  if (
    Number.isFinite(input.transferDurationDeg) &&
    (input.transferDurationDeg < 0 || input.transferDurationDeg > 360)
  ) {
    diagnostics.push(
      errorDiagnostic(
        "TRANSFER_DURATION_OUTSIDE_CYCLE",
        "transferDurationDeg must be between 0 and 360 degrees.",
        "transferDurationDeg",
      ),
    );
  }
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }
  const transferCloseBeforeTdcDeg = (360 - input.transferDurationDeg) / 2;
  const signedMarginDeg = input.intakeAdvanceBeforeTdcDeg - transferCloseBeforeTdcDeg;
  return calculationResult({
    transferCloseBeforeTdcDeg,
    signedMarginDeg,
    relationship: signedMarginDeg > 0 ? "overlap" : signedMarginDeg < 0 ? "gap" : "coincident",
  });
}

export function degreesAtRpmToMilliseconds(
  degrees: number,
  rpm: number,
): CalculationResult<DurationAtRpmResult> {
  const diagnostics = collectDiagnostics(
    nonNegativeNumberDiagnostic(degrees, "degrees"),
    positiveNumberDiagnostic(rpm, "rpm"),
  );
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }
  return calculationResult({
    degrees,
    rpm,
    milliseconds: (degrees * 1000) / (6 * rpm),
  });
}
