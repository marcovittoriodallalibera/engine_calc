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

export type RotaryValveArcAnchor = "opening-btdc" | "closing-atdc";

export interface RotaryValveArcGeometryInput {
  crankshaftDiameterMm: number;
  crankCutawayArcMm: number;
  crankcaseWindowArcMm: number;
  anchor: RotaryValveArcAnchor;
  anchorAngleDeg: number;
}

export interface RotaryValveArcGeometry extends RotaryValveTiming {
  crankshaftDiameterMm: number;
  circumferenceMm: number;
  crankCutawayArcMm: number;
  crankCutawayDeg: number;
  crankcaseWindowArcMm: number;
  crankcaseWindowDeg: number;
  combinedArcMm: number;
  anchor: RotaryValveArcAnchor;
  anchorAngleDeg: number;
}

export interface RotaryValveArcDuration {
  crankshaftDiameterMm: number;
  circumferenceMm: number;
  crankCutawayArcMm: number;
  crankCutawayDeg: number;
  crankcaseWindowArcMm: number;
  crankcaseWindowDeg: number;
  combinedArcMm: number;
  durationDeg: number;
}

export type RotaryValveMeasuredArc =
  | "crank-cutaway"
  | "crankcase-opening";

export interface RotaryValveArcSolverInput {
  advanceBeforeTdcDeg: number;
  delayAfterTdcDeg: number;
  crankshaftDiameterMm: number;
  measuredArc: RotaryValveMeasuredArc;
  measuredArcMm: number;
}

export interface RotaryValveSolvedArcGeometry extends RotaryValveArcDuration {
  advanceBeforeTdcDeg: number;
  delayAfterTdcDeg: number;
  interval: CircularInterval;
  measuredArc: RotaryValveMeasuredArc;
  measuredArcMm: number;
  derivedArcMm: number;
}

export interface ArcLengthAngleConversion {
  diameterMm: number;
  circumferenceMm: number;
  arcLengthMm: number;
  degrees: number;
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
  if (durationDeg === 360) {
    diagnostics.push(
      warningDiagnostic(
        "ROTARY_INLET_LEAVES_NO_CLOSED_INTERVAL",
        "The rotary inlet remains open for the full 360-degree cycle.",
      ),
    );
  }
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }
  return calculationResult(
    {
      advanceBeforeTdcDeg,
      delayAfterTdcDeg,
      durationDeg,
      interval: {
        startDeg: normaliseDegrees(360 - advanceBeforeTdcDeg),
        endDeg: normaliseDegrees(delayAfterTdcDeg),
        fullCircle: durationDeg === 360,
      },
    },
    diagnostics,
  );
}

export function arcLengthToDegrees(
  arcLengthMm: number,
  diameterMm: number,
): CalculationResult<ArcLengthAngleConversion> {
  const diagnostics = collectDiagnostics(
    nonNegativeNumberDiagnostic(arcLengthMm, "arcLengthMm"),
    positiveNumberDiagnostic(diameterMm, "diameterMm"),
  );
  const circumferenceMm = Math.PI * diameterMm;
  const toleranceMm =
    Number.isFinite(circumferenceMm) && circumferenceMm > 0
      ? Math.max(1, circumferenceMm) * 1e-12
      : 0;
  if (
    Number.isFinite(arcLengthMm) &&
    Number.isFinite(circumferenceMm) &&
    circumferenceMm > 0 &&
    arcLengthMm > circumferenceMm + toleranceMm
  ) {
    diagnostics.push(
      errorDiagnostic(
        "ARC_EXCEEDS_CIRCUMFERENCE",
        "arcLengthMm cannot exceed one circumference at the selected diameter.",
        "arcLengthMm",
      ),
    );
  }
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }
  return calculationResult({
    diameterMm,
    circumferenceMm,
    arcLengthMm,
    degrees:
      Math.abs(arcLengthMm - circumferenceMm) <= toleranceMm
        ? 360
        : (arcLengthMm * 360) / circumferenceMm,
  });
}

export function degreesToArcLength(
  degrees: number,
  diameterMm: number,
): CalculationResult<ArcLengthAngleConversion> {
  const diagnostics = collectDiagnostics(
    nonNegativeNumberDiagnostic(degrees, "degrees"),
    positiveNumberDiagnostic(diameterMm, "diameterMm"),
  );
  if (Number.isFinite(degrees) && degrees > 360) {
    diagnostics.push(
      errorDiagnostic(
        "ANGLE_EXCEEDS_CYCLE",
        "degrees cannot exceed 360 degrees.",
        "degrees",
      ),
    );
  }
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }
  const circumferenceMm = Math.PI * diameterMm;
  const arcLengthMm = (circumferenceMm * degrees) / 360;
  return calculationResult({
    diameterMm,
    circumferenceMm,
    arcLengthMm,
    degrees,
  });
}

export function resolveRotaryValveArcGeometry(
  input: RotaryValveArcSolverInput,
): CalculationResult<RotaryValveSolvedArcGeometry> {
  const timing = rotaryValveTiming(
    input.advanceBeforeTdcDeg,
    input.delayAfterTdcDeg,
  );
  const totalArc = timing.value
    ? degreesToArcLength(
        timing.value.durationDeg,
        input.crankshaftDiameterMm,
      )
    : null;
  const diagnostics = [
    ...timing.diagnostics,
    ...(totalArc?.diagnostics ?? []),
    ...collectDiagnostics(
      positiveNumberDiagnostic(input.measuredArcMm, "measuredArcMm"),
    ),
  ];

  if (
    input.measuredArc !== "crank-cutaway" &&
    input.measuredArc !== "crankcase-opening"
  ) {
    diagnostics.push(
      errorDiagnostic(
        "UNKNOWN_ROTARY_MEASURED_ARC",
        "measuredArc must identify the crank cut-away or crankcase window.",
        "measuredArc",
      ),
    );
  }
  if (!timing.value || !totalArc?.value) {
    return calculationResult(null, diagnostics);
  }

  const toleranceMm =
    Math.max(
      1,
      totalArc.value.circumferenceMm,
      totalArc.value.arcLengthMm,
    ) * 1e-12;
  const derivedArcMm = totalArc.value.arcLengthMm - input.measuredArcMm;
  if (derivedArcMm <= toleranceMm) {
    diagnostics.push(
      errorDiagnostic(
        "ROTARY_MEASURED_ARC_LEAVES_NO_COMPLEMENT",
        "The measured arc must be shorter than the total arc required by the desired timing.",
        "measuredArcMm",
      ),
    );
  }
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }

  const crankCutawayArcMm =
    input.measuredArc === "crank-cutaway"
      ? input.measuredArcMm
      : derivedArcMm;
  const crankcaseWindowArcMm =
    input.measuredArc === "crankcase-opening"
      ? input.measuredArcMm
      : derivedArcMm;
  const duration = rotaryValveDurationFromArcGeometry({
    crankshaftDiameterMm: input.crankshaftDiameterMm,
    crankCutawayArcMm,
    crankcaseWindowArcMm,
  });
  diagnostics.push(...duration.diagnostics);
  if (!duration.value) return calculationResult(null, diagnostics);

  return calculationResult(
    {
      ...duration.value,
      advanceBeforeTdcDeg: timing.value.advanceBeforeTdcDeg,
      delayAfterTdcDeg: timing.value.delayAfterTdcDeg,
      interval: timing.value.interval,
      measuredArc: input.measuredArc,
      measuredArcMm: input.measuredArcMm,
      derivedArcMm,
    },
    diagnostics,
  );
}

export function rotaryValveDurationFromArcGeometry(
  input: Omit<RotaryValveArcGeometryInput, "anchor" | "anchorAngleDeg">,
): CalculationResult<RotaryValveArcDuration> {
  const crankArc = arcLengthToDegrees(
    input.crankCutawayArcMm,
    input.crankshaftDiameterMm,
  );
  const crankcaseArc = arcLengthToDegrees(
    input.crankcaseWindowArcMm,
    input.crankshaftDiameterMm,
  );
  const diagnostics = [...crankArc.diagnostics, ...crankcaseArc.diagnostics];
  diagnostics.push(
    ...collectDiagnostics(
      positiveNumberDiagnostic(input.crankCutawayArcMm, "crankCutawayArcMm"),
      positiveNumberDiagnostic(
        input.crankcaseWindowArcMm,
        "crankcaseWindowArcMm",
      ),
    ),
  );
  if (!crankArc.value || !crankcaseArc.value) {
    return calculationResult(null, diagnostics);
  }

  const combinedArcMm = input.crankCutawayArcMm + input.crankcaseWindowArcMm;
  const toleranceMm = Math.max(1, crankArc.value.circumferenceMm) * 1e-12;
  const durationDeg =
    Math.abs(combinedArcMm - crankArc.value.circumferenceMm) <= toleranceMm
      ? 360
      : (combinedArcMm * 360) / crankArc.value.circumferenceMm;
  if (combinedArcMm > crankArc.value.circumferenceMm + toleranceMm) {
    diagnostics.push(
      errorDiagnostic(
        "COMBINED_ROTARY_ARCS_EXCEED_CYCLE",
        "The crank cutaway and crankcase window combine to more than 360 degrees.",
      ),
    );
  }
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }
  if (durationDeg === 360) {
    diagnostics.push(
      warningDiagnostic(
        "ROTARY_INLET_LEAVES_NO_CLOSED_INTERVAL",
        "The combined arcs keep the rotary inlet open for the full 360-degree cycle.",
      ),
    );
  }

  return calculationResult(
    {
      crankshaftDiameterMm: input.crankshaftDiameterMm,
      circumferenceMm: crankArc.value.circumferenceMm,
      crankCutawayArcMm: input.crankCutawayArcMm,
      crankCutawayDeg: crankArc.value.degrees,
      crankcaseWindowArcMm: input.crankcaseWindowArcMm,
      crankcaseWindowDeg: crankcaseArc.value.degrees,
      combinedArcMm,
      durationDeg,
    },
    diagnostics,
  );
}

export function rotaryValveTimingFromArcGeometry(
  input: RotaryValveArcGeometryInput,
): CalculationResult<RotaryValveArcGeometry> {
  const duration = rotaryValveDurationFromArcGeometry(input);
  const diagnostics = [...duration.diagnostics];
  diagnostics.push(
    ...collectDiagnostics(
      nonNegativeNumberDiagnostic(input.anchorAngleDeg, "anchorAngleDeg"),
    ),
  );
  if (input.anchor !== "opening-btdc" && input.anchor !== "closing-atdc") {
    diagnostics.push(
      errorDiagnostic(
        "UNKNOWN_ROTARY_ARC_ANCHOR",
        "anchor must identify the opening or closing edge.",
        "anchor",
      ),
    );
  }
  if (!duration.value) return calculationResult(null, diagnostics);
  if (
    Number.isFinite(input.anchorAngleDeg) &&
    input.anchorAngleDeg > duration.value.durationDeg + 1e-10
  ) {
    diagnostics.push(
      errorDiagnostic(
        "ROTARY_ARC_ANCHOR_OUTSIDE_DURATION",
        "The fixed edge angle cannot exceed the combined inlet duration.",
        "anchorAngleDeg",
      ),
    );
  }
  if (diagnostics.some((item) => item.severity === "error")) {
    return calculationResult(null, diagnostics);
  }

  const resolvedAnchorAngleDeg = Math.min(
    input.anchorAngleDeg,
    duration.value.durationDeg,
  );
  const advanceBeforeTdcDeg =
    input.anchor === "opening-btdc"
      ? resolvedAnchorAngleDeg
      : duration.value.durationDeg - resolvedAnchorAngleDeg;
  const delayAfterTdcDeg =
    input.anchor === "closing-atdc"
      ? resolvedAnchorAngleDeg
      : duration.value.durationDeg - resolvedAnchorAngleDeg;
  const timing = rotaryValveTiming(advanceBeforeTdcDeg, delayAfterTdcDeg);
  diagnostics.push(...timing.diagnostics);
  if (!timing.value) return calculationResult(null, diagnostics);

  return calculationResult(
    {
      ...timing.value,
      ...duration.value,
      anchor: input.anchor,
      anchorAngleDeg: resolvedAnchorAngleDeg,
    },
    diagnostics,
  );
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
