import {
  circularIntervalOverlap,
  crankAnglesFromTdcTravel,
  degreesAtRpmToMilliseconds,
  displacement,
  geometricCompressionRatio,
  integrateRectangularPortAngleArea,
  intakeTransferMargin,
  meanPistonSpeed,
  pistonTravelFromTdc,
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
  type LinearAngleSegment,
  type SymmetricPortTiming,
} from "../engine/index.ts";
import {
  parseLocaleNumber,
  type EngineProjectDraft,
  type PortDraft,
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
  valveRelationship: "overlap" | "gap" | "coincident" | "not-applicable";
}

export interface EngineProjectAnalysis {
  validGeometry: boolean;
  displacementCc: number | null;
  meanPistonSpeedMps: number | null;
  ports: PortAnalysis[];
  exhaust: PortAnalysis | null;
  transfers: TransferAnalysis[];
  rotary: {
    durationDeg: number;
    durationMs: number | null;
    interval: CircularInterval;
    unionTransferOverlapDeg: number;
    unionTransferOverlapMs: number | null;
    unionTransferOverlapSegments: LinearAngleSegment[];
    tripleOverlapDeg: number;
    tripleOverlapSegments: LinearAngleSegment[];
    idealisedAngleAreaMm2Deg: number | null;
    idealisedSpecificTimeArea: number | null;
  } | null;
  timing: {
    globalBlowdownDeg: number | null;
    globalBlowdownMs: number | null;
    transferOpeningSpreadDeg: number | null;
    exhaustTransferUnionOverlapDeg: number | null;
    exhaustTransferUnionOverlapSegments: LinearAngleSegment[];
    blowdownAngleAreaMm2Deg: number | null;
    blowdownSpecificTimeArea: number | null;
  };
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
  return degreesAtRpmToMilliseconds(degrees, rpm).value?.milliseconds ?? null;
}

function timingFromPort(
  port: PortDraft,
  strokeMm: number,
  rodLengthMm: number,
  crownBelowDeckAtTdcMm: number,
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
  crownBelowDeckAtTdcMm: number,
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
      roofTravelFromTdcMm: source.travelFromTdcMm,
      portWidthMm: widthMm,
      portHeightMm: heightMm,
      portCount: count,
      startAngleDeg: source.timing.openingAngleDeg,
      endAngleDeg: source.timing.closingAngleDeg,
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
    const lowerTravel = Math.max(0, source.travelFromTdcMm - uncertaintyMm);
    const upperTravel = Math.min(strokeMm, source.travelFromTdcMm + uncertaintyMm);
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
      uncertainty = {
        travelMm: uncertaintyMm,
        openingMinDeg: lower.openingAngleDeg,
        openingMaxDeg: upper.openingAngleDeg,
        durationMinDeg: 360 - 2 * upper.openingAngleDeg,
        durationMaxDeg: 360 - 2 * lower.openingAngleDeg,
      };
    }
  }

  return {
    id: port.id,
    label: port.label,
    kind: port.kind,
    colour: portColours[port.kind],
    sourceMode: port.sourceMode,
    sourceValue: source.sourceValue,
    travelFromTdcMm: source.travelFromTdcMm,
    openingAngleDeg: source.timing.openingAngleDeg,
    closingAngleDeg: source.timing.closingAngleDeg,
    durationDeg: source.timing.durationDeg,
    durationMs: durationMs(source.timing.durationDeg, rpm),
    interval: source.timing.interval,
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

export function analyseProject(project: EngineProjectDraft): EngineProjectAnalysis {
  const boreMm = parseLocaleNumber(project.geometry.boreMm);
  const strokeMm = parseLocaleNumber(project.geometry.strokeMm);
  const rodLengthMm = parseLocaleNumber(project.geometry.rodLengthMm);
  const rpmValue = parseLocaleNumber(project.geometry.rpm);
  const crownBelowDeckAtTdcMm =
    parseLocaleNumber(project.geometry.deckPositionMm) ?? 0;
  const rpm = rpmValue !== null && rpmValue > 0 ? rpmValue : null;
  const validGeometry =
    boreMm !== null &&
    boreMm > 0 &&
    strokeMm !== null &&
    strokeMm > 0 &&
    rodLengthMm !== null &&
    rodLengthMm > strokeMm / 2;
  const diagnostics: string[] = [];

  if (!validGeometry || boreMm === null || strokeMm === null || rodLengthMm === null) {
    return {
      validGeometry: false,
      displacementCc: null,
      meanPistonSpeedMps: null,
      ports: [],
      exhaust: null,
      transfers: [],
      rotary: null,
      timing: {
        globalBlowdownDeg: null,
        globalBlowdownMs: null,
        transferOpeningSpreadDeg: null,
        exhaustTransferUnionOverlapDeg: null,
        exhaustTransferUnionOverlapSegments: [],
        blowdownAngleAreaMm2Deg: null,
        blowdownSpecificTimeArea: null,
      },
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
        rpm,
        displacementCc,
      ),
    )
    .filter((port): port is PortAnalysis => port !== null);
  const exhaust = ports.find((port) => port.kind === "exhaust") ?? null;
  const transferPorts = ports.filter((port) => port.kind !== "exhaust");

  const advance = parseLocaleNumber(project.induction.advanceBtdcDeg);
  const delay = parseLocaleNumber(project.induction.delayAtdcDeg);
  const rotaryResult =
    project.induction.mode === "rotary" && advance !== null && delay !== null
      ? rotaryValveTiming(advance, delay)
      : null;
  const rotaryTiming = rotaryResult?.value ?? null;
  if (rotaryResult) diagnostics.push(...diagnosticMessages(rotaryResult));

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
      rotaryTiming && advance !== null
        ? intakeTransferMargin({
            intakeAdvanceBeforeTdcDeg: advance,
            transferDurationDeg: port.durationDeg,
          }).value
        : null;
    return {
      port,
      blowdownDeg,
      blowdownMs: blowdownDeg === null ? null : durationMs(Math.abs(blowdownDeg), rpm),
      exhaustDurationDifferenceDeg: exhaust
        ? exhaust.durationDeg - port.durationDeg
        : null,
      exhaustOverlapDeg,
      valveOverlapDeg,
      valveOverlapMs:
        valveOverlapDeg === null ? null : durationMs(valveOverlapDeg, rpm),
      valveMarginDeg: margin?.signedMarginDeg ?? null,
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

  let blowdownAngleAreaMm2Deg: number | null = null;
  let blowdownSpecificTimeArea: number | null = null;
  if (
    exhaust &&
    exhaust.widthMm !== null &&
    exhaust.heightMm !== null &&
    exhaust.count !== null &&
    earliestTransferOpening !== null &&
    earliestTransferOpening > exhaust.openingAngleDeg
  ) {
    const result = integrateRectangularPortAngleArea({
      strokeMm,
      rodLengthMm,
      roofTravelFromTdcMm: exhaust.travelFromTdcMm,
      portWidthMm: exhaust.widthMm,
      portHeightMm: exhaust.heightMm,
      portCount: exhaust.count,
      startAngleDeg: exhaust.openingAngleDeg,
      endAngleDeg: earliestTransferOpening,
      integrationStepDeg: 0.1,
    });
    blowdownAngleAreaMm2Deg = result.value?.angleAreaMm2Deg ?? null;
    if (blowdownAngleAreaMm2Deg !== null && rpm && displacementCc) {
      blowdownSpecificTimeArea =
        specificTimeArea({
          angleAreaMm2Deg: blowdownAngleAreaMm2Deg,
          rpm,
          displacementCc,
        }).value?.specificTimeAreaSecondsMm2PerCc ?? null;
    }
  }

  let rotary: EngineProjectAnalysis["rotary"] = null;
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
    const windowArea = parseLocaleNumber(project.induction.effectiveWindowAreaMm2);
    const idealisedAngleAreaMm2Deg =
      windowArea !== null && windowArea > 0
        ? windowArea * rotaryTiming.durationDeg
        : null;
    const idealisedSpecificTimeArea =
      idealisedAngleAreaMm2Deg !== null && rpm && displacementCc
        ? specificTimeArea({
            angleAreaMm2Deg: idealisedAngleAreaMm2Deg,
            rpm,
            displacementCc,
          }).value?.specificTimeAreaSecondsMm2PerCc ?? null
        : null;
    rotary = {
      durationDeg: rotaryTiming.durationDeg,
      durationMs: durationMs(rotaryTiming.durationDeg, rpm),
      interval: rotaryTiming.interval,
      unionTransferOverlapDeg,
      unionTransferOverlapMs: durationMs(unionTransferOverlapDeg, rpm),
      unionTransferOverlapSegments: rotaryTransferSegments,
      tripleOverlapDeg,
      tripleOverlapSegments,
      idealisedAngleAreaMm2Deg,
      idealisedSpecificTimeArea,
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
  const clearanceVolume =
    project.compression.volumeMode === "component-breakdown"
      ? componentTotal
      : parseLocaleNumber(project.compression.clearanceVolumeCc);
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
    .filter((value): value is number => value !== null);
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

  return {
    validGeometry: true,
    displacementCc,
    meanPistonSpeedMps,
    ports,
    exhaust,
    transfers,
    rotary,
    timing: {
      globalBlowdownDeg,
      globalBlowdownMs:
        globalBlowdownDeg === null
          ? null
          : durationMs(Math.abs(globalBlowdownDeg), rpm),
      transferOpeningSpreadDeg,
      exhaustTransferUnionOverlapDeg,
      exhaustTransferUnionOverlapSegments: exhaust
        ? intersectSegments(exhaustSegments, transferUnionSegments)
        : [],
      blowdownAngleAreaMm2Deg,
      blowdownSpecificTimeArea,
    },
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
  };
}
