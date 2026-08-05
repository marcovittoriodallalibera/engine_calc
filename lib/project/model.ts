export const PROJECT_SCHEMA_VERSION = 5 as const;
export const PROJECT_STORAGE_KEY = "phase360.project.v5";
export const LEGACY_SCHEMA_4_PROJECT_STORAGE_KEY = "phase360.project.v4";
export const LEGACY_SCHEMA_3_PROJECT_STORAGE_KEY = "phase360.project.v3";
export const LEGACY_SCHEMA_2_PROJECT_STORAGE_KEY = "phase360.project.v2";
export const LEGACY_PROJECT_STORAGE_KEY = "phase360.project.v1";
export const LEGACY_PROJECT_STORAGE_KEYS = [
  LEGACY_SCHEMA_4_PROJECT_STORAGE_KEY,
  LEGACY_SCHEMA_3_PROJECT_STORAGE_KEY,
  LEGACY_SCHEMA_2_PROJECT_STORAGE_KEY,
  LEGACY_PROJECT_STORAGE_KEY,
] as const;
export const MAX_PROJECT_BYTES = 48_000;
export const MAX_SHARE_FRAGMENT_LENGTH = 7_500;
export const PROFILE_REFERENCE_SET_VERSION = "phase360-profile-lens-1";

export type PortKind =
  | "exhaust"
  | "primary-transfer"
  | "secondary-transfer"
  | "boost-transfer";

export type PortSourceMode =
  | "travel-from-tdc"
  | "height-above-bdc"
  | "depth-from-deck"
  | "opening-angle"
  | "duration";

export type InductionMode = "rotary" | "reed" | "none";
export type RotaryTimingSource = "direct-angles" | "crank-and-case-arcs";
export type RotaryMeasuredArc = "crank-cutaway" | "crankcase-opening";
export type RotaryAreaSource = "constant-area" | "cylindrical-overlap";
export type CharacterProfile =
  | "none"
  | "touring-box"
  | "sport-box"
  | "road-expansion"
  | "race-expansion";

export interface PortDraft {
  id: string;
  label: string;
  kind: PortKind;
  enabled: boolean;
  sourceMode: PortSourceMode;
  sourceValue: string;
  widthMm: string;
  heightMm: string;
  count: string;
  uncertaintyMm: string;
}

export interface EngineProjectDraft {
  schemaVersion: typeof PROJECT_SCHEMA_VERSION;
  name: string;
  report: {
    projectCode: string;
    projectDate: string;
    engineDetails: string;
  };
  geometry: {
    boreMm: string;
    strokeMm: string;
    rodLengthMm: string;
    deckPositionMm: string;
    rpm: string;
  };
  ports: PortDraft[];
  induction: {
    mode: InductionMode;
    timingSource: RotaryTimingSource;
    advanceBtdcDeg: string;
    delayAtdcDeg: string;
    crankshaftDiameterMm: string;
    crankshaftDiameterUncertaintyMm: string;
    measuredArc: RotaryMeasuredArc;
    measuredArcMm: string;
    measuredArcUncertaintyMm: string;
    areaSource: RotaryAreaSource;
    effectiveWindowAreaMm2: string;
    commonAxialOverlapWidthMm: string;
    commonAxialOverlapWidthUncertaintyMm: string;
  };
  character: {
    profile: CharacterProfile;
    referenceSetVersion: string;
    rpmMinimum: string;
    rpmMaximum: string;
    rpmStep: string;
  };
  compression: {
    volumeMode: "measured-total" | "component-breakdown";
    clearanceVolumeCc: string;
    headChamberVolumeCc: string;
    gasketVolumeCc: string;
    deckVolumeCc: string;
    pistonCrownVolumeCc: string;
    customCorrectionCc: string;
    targetTrappedRatio: string;
    headGasketThicknessMm: string;
    baseSpacerThicknessMm: string;
    exhaustRaiseMm: string;
  };
  squish: {
    geometryMode: "bowl-diameter" | "band-width";
    gapNorthMm: string;
    gapEastMm: string;
    gapSouthMm: string;
    gapWestMm: string;
    bowlDiameterMm: string;
    bandWidthMm: string;
    manufacturerMinimumMm: string;
  };
  presentation: {
    showAnalysisOverlays: boolean;
    showReferenceLabels: boolean;
  };
}

export const demonstrationProject: EngineProjectDraft = {
  schemaVersion: PROJECT_SCHEMA_VERSION,
  name: "Vespa 51 mm study",
  report: {
    projectCode: "",
    projectDate: "",
    engineDetails: "",
  },
  geometry: {
    boreMm: "60",
    strokeMm: "51",
    rodLengthMm: "97",
    deckPositionMm: "0",
    rpm: "8000",
  },
  ports: [
    {
      id: "exhaust",
      label: "Exhaust",
      kind: "exhaust",
      enabled: true,
      sourceMode: "travel-from-tdc",
      sourceValue: "30",
      widthMm: "39",
      heightMm: "17",
      count: "1",
      uncertaintyMm: "0.10",
    },
    {
      id: "primary",
      label: "Primary transfers",
      kind: "primary-transfer",
      enabled: true,
      sourceMode: "travel-from-tdc",
      sourceValue: "40",
      widthMm: "16",
      heightMm: "9",
      count: "2",
      uncertaintyMm: "0.10",
    },
    {
      id: "secondary",
      label: "Secondary transfers",
      kind: "secondary-transfer",
      enabled: true,
      sourceMode: "travel-from-tdc",
      sourceValue: "39.2",
      widthMm: "11",
      heightMm: "9",
      count: "2",
      uncertaintyMm: "0.10",
    },
    {
      id: "boost",
      label: "Boost port",
      kind: "boost-transfer",
      enabled: true,
      sourceMode: "travel-from-tdc",
      sourceValue: "39.8",
      widthMm: "14",
      heightMm: "9",
      count: "1",
      uncertaintyMm: "0.10",
    },
  ],
  induction: {
    mode: "rotary",
    timingSource: "crank-and-case-arcs",
    advanceBtdcDeg: "120",
    delayAtdcDeg: "58",
    crankshaftDiameterMm: "87",
    crankshaftDiameterUncertaintyMm: "0.10",
    measuredArc: "crank-cutaway",
    measuredArcMm: "95",
    measuredArcUncertaintyMm: "0.10",
    areaSource: "cylindrical-overlap",
    effectiveWindowAreaMm2: "",
    commonAxialOverlapWidthMm: "10",
    commonAxialOverlapWidthUncertaintyMm: "0.10",
  },
  character: {
    profile: "sport-box",
    referenceSetVersion: PROFILE_REFERENCE_SET_VERSION,
    rpmMinimum: "3000",
    rpmMaximum: "11000",
    rpmStep: "500",
  },
  compression: {
    volumeMode: "measured-total",
    clearanceVolumeCc: "12.4",
    headChamberVolumeCc: "10.8",
    gasketVolumeCc: "0.6",
    deckVolumeCc: "1.0",
    pistonCrownVolumeCc: "0",
    customCorrectionCc: "0",
    targetTrappedRatio: "7.2",
    headGasketThicknessMm: "0",
    baseSpacerThicknessMm: "0",
    exhaustRaiseMm: "0",
  },
  squish: {
    geometryMode: "bowl-diameter",
    gapNorthMm: "1.15",
    gapEastMm: "1.10",
    gapSouthMm: "1.12",
    gapWestMm: "1.08",
    bowlDiameterMm: "42",
    bandWidthMm: "9",
    manufacturerMinimumMm: "",
  },
  presentation: {
    showAnalysisOverlays: true,
    showReferenceLabels: true,
  },
};

export function cloneDemonstrationProject(): EngineProjectDraft {
  return JSON.parse(JSON.stringify(demonstrationProject)) as EngineProjectDraft;
}

export function changeRotaryMeasuredArc(
  induction: EngineProjectDraft["induction"],
  measuredArc: RotaryMeasuredArc,
  solvedGeometry: {
    crankCutawayArcMm: number;
    crankcaseWindowArcMm: number;
  } | null,
): EngineProjectDraft["induction"] {
  if (measuredArc === induction.measuredArc) return induction;
  const promotedMeasurement = solvedGeometry
    ? measuredArc === "crank-cutaway"
      ? solvedGeometry.crankCutawayArcMm
      : solvedGeometry.crankcaseWindowArcMm
    : null;
  return {
    ...induction,
    measuredArc,
    measuredArcMm:
      promotedMeasurement === null ? "" : String(promotedMeasurement),
    measuredArcUncertaintyMm: "",
  };
}

export function parseLocaleNumber(value: string): number | null {
  const token = value.trim().replace(",", ".");
  if (!token || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) {
    return null;
  }
  const number = Number(token);
  return Number.isFinite(number) ? number : null;
}

function isText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

function isOptionalNonNegativeNumberText(
  value: unknown,
  maxLength: number,
): value is string {
  if (!isText(value, maxLength)) return false;
  if (value.trim() === "") return true;
  const parsed = parseLocaleNumber(value);
  return parsed !== null && parsed >= 0;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isValidIsoDate(value: string): boolean {
  if (value === "") return true;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function hasAtMostThreeLines(value: string): boolean {
  return value.split(/\r\n?|\n/u).length <= 3;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const portKinds = new Set<PortKind>([
  "exhaust",
  "primary-transfer",
  "secondary-transfer",
  "boost-transfer",
]);
const sourceModes = new Set<PortSourceMode>([
  "travel-from-tdc",
  "height-above-bdc",
  "depth-from-deck",
  "opening-angle",
  "duration",
]);
const inductionModes = new Set<InductionMode>(["rotary", "reed", "none"]);
const rotaryTimingSources = new Set<RotaryTimingSource>([
  "direct-angles",
  "crank-and-case-arcs",
]);
const rotaryMeasuredArcs = new Set<RotaryMeasuredArc>([
  "crank-cutaway",
  "crankcase-opening",
]);
const rotaryAreaSources = new Set<RotaryAreaSource>([
  "constant-area",
  "cylindrical-overlap",
]);
const characterProfiles = new Set<CharacterProfile>([
  "none",
  "touring-box",
  "sport-box",
  "road-expansion",
  "race-expansion",
]);

export type ProjectValidation =
  | { ok: true; project: EngineProjectDraft }
  | { ok: false; message: string };

export function validateProjectDocument(value: unknown): ProjectValidation {
  if (!isRecord(value)) {
    return { ok: false, message: "The project must be a JSON object." };
  }
  if (
    value.schemaVersion !== 1 &&
    value.schemaVersion !== 2 &&
    value.schemaVersion !== 3 &&
    value.schemaVersion !== 4 &&
    value.schemaVersion !== PROJECT_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      message:
        typeof value.schemaVersion === "number" &&
        value.schemaVersion > PROJECT_SCHEMA_VERSION
          ? "This project requires a newer version of Phase 360."
          : "The project schema version is not supported.",
    };
  }
  if (!isText(value.name, 80)) {
    return { ok: false, message: "Project name is missing or too long." };
  }
  const schemaVersion = value.schemaVersion;
  const report =
    schemaVersion >= 3 && isRecord(value.report) ? value.report : null;
  if (
    schemaVersion >= 3 &&
    (report === null ||
      !isText(report.projectCode, 40) ||
      !isText(report.projectDate, 10) ||
      !isValidIsoDate(report.projectDate) ||
      !isText(report.engineDetails, 360) ||
      !hasAtMostThreeLines(report.engineDetails))
  ) {
    return {
      ok: false,
      message:
        "Project report details must use a valid date and no more than three bounded lines.",
    };
  }
  if (!isRecord(value.geometry)) {
    return { ok: false, message: "Engine geometry is missing." };
  }
  const geometry = value.geometry;
  const geometryFields = [
    "boreMm",
    "strokeMm",
    "rodLengthMm",
    "deckPositionMm",
    "rpm",
  ];
  if (!geometryFields.every((key) => isText(geometry[key], 32))) {
    return { ok: false, message: "Engine geometry contains an invalid value." };
  }
  if (!Array.isArray(value.ports) || value.ports.length < 1 || value.ports.length > 12) {
    return { ok: false, message: "The project must contain between 1 and 12 ports." };
  }
  const validPorts = value.ports.every((item) => {
    if (!isRecord(item)) return false;
    return (
      isText(item.id, 40) &&
      isText(item.label, 60) &&
      portKinds.has(item.kind as PortKind) &&
      typeof item.enabled === "boolean" &&
      sourceModes.has(item.sourceMode as PortSourceMode) &&
      isText(item.sourceValue, 32) &&
      isText(item.widthMm, 32) &&
      isText(item.heightMm, 32) &&
      isText(item.count, 16) &&
      isText(item.uncertaintyMm, 32)
    );
  });
  if (!validPorts) {
    return { ok: false, message: "A port definition is invalid." };
  }
  if (!isRecord(value.induction) || !inductionModes.has(value.induction.mode as InductionMode)) {
    return { ok: false, message: "Induction configuration is invalid." };
  }
  const legacyEffectiveWindowAreaMm2 =
    schemaVersion < PROJECT_SCHEMA_VERSION
      ? value.induction.effectiveWindowAreaMm2 ?? ""
      : "";
  const areaSource =
    schemaVersion === PROJECT_SCHEMA_VERSION
      ? value.induction.areaSource
      : typeof legacyEffectiveWindowAreaMm2 === "string" &&
          legacyEffectiveWindowAreaMm2.trim() !== ""
        ? "constant-area"
        : "cylindrical-overlap";
  const effectiveWindowAreaMm2 =
    schemaVersion === PROJECT_SCHEMA_VERSION
      ? value.induction.effectiveWindowAreaMm2
      : legacyEffectiveWindowAreaMm2;
  const commonAxialOverlapWidthMm =
    schemaVersion === PROJECT_SCHEMA_VERSION
      ? value.induction.commonAxialOverlapWidthMm
      : "";
  const crankshaftDiameterUncertaintyMm =
    schemaVersion === PROJECT_SCHEMA_VERSION
      ? value.induction.crankshaftDiameterUncertaintyMm ?? ""
      : "";
  const measuredArcUncertaintyMm =
    schemaVersion === PROJECT_SCHEMA_VERSION
      ? value.induction.measuredArcUncertaintyMm ?? ""
      : "";
  const commonAxialOverlapWidthUncertaintyMm =
    schemaVersion === PROJECT_SCHEMA_VERSION
      ? value.induction.commonAxialOverlapWidthUncertaintyMm ?? ""
      : "";
  if (
    !isText(value.induction.advanceBtdcDeg, 32) ||
    !isText(value.induction.delayAtdcDeg, 32) ||
    !rotaryAreaSources.has(areaSource as RotaryAreaSource) ||
    !isText(effectiveWindowAreaMm2, 32) ||
    !isText(commonAxialOverlapWidthMm, 32) ||
    !isOptionalNonNegativeNumberText(
      crankshaftDiameterUncertaintyMm,
      32,
    ) ||
    !isOptionalNonNegativeNumberText(measuredArcUncertaintyMm, 32) ||
    !isOptionalNonNegativeNumberText(
      commonAxialOverlapWidthUncertaintyMm,
      32,
    )
  ) {
    return { ok: false, message: "Rotary inlet timing is invalid." };
  }
  const timingSource =
    schemaVersion === 1 && value.induction.timingSource === undefined
      ? "direct-angles"
      : value.induction.timingSource;
  const crankshaftDiameterMm =
    schemaVersion === 1
      ? value.induction.crankshaftDiameterMm ?? ""
      : value.induction.crankshaftDiameterMm;
  const legacyCrankArcMm =
    schemaVersion === 1
      ? value.induction.crankCutawayArcMm ?? ""
      : value.induction.crankCutawayArcMm;
  const legacyCaseArcMm =
    schemaVersion === 1
      ? value.induction.crankcaseWindowArcMm ?? ""
      : value.induction.crankcaseWindowArcMm;
  const legacyAnchor =
    schemaVersion === 1 && value.induction.arcAnchor === undefined
      ? "opening-btdc"
      : value.induction.arcAnchor;
  const legacyAnchorAngleDeg =
    schemaVersion === 1
      ? value.induction.arcAnchorAngleDeg ?? ""
      : value.induction.arcAnchorAngleDeg;
  const measuredArc =
    schemaVersion >= 4
      ? value.induction.measuredArc
      : "crank-cutaway";
  const measuredArcMm =
    schemaVersion >= 4
      ? value.induction.measuredArcMm
      : legacyCrankArcMm;
  if (
    !rotaryTimingSources.has(timingSource as RotaryTimingSource) ||
    !isText(crankshaftDiameterMm, 32) ||
    !rotaryMeasuredArcs.has(measuredArc as RotaryMeasuredArc) ||
    !isText(measuredArcMm, 32)
  ) {
    return { ok: false, message: "Rotary inlet geometry is invalid." };
  }
  if (
    schemaVersion < 4 &&
    (!isText(legacyCrankArcMm, 32) ||
      !isText(legacyCaseArcMm, 32) ||
      !isText(legacyAnchorAngleDeg, 32) ||
      (legacyAnchor !== "opening-btdc" && legacyAnchor !== "closing-atdc"))
  ) {
    return { ok: false, message: "Legacy rotary inlet geometry is invalid." };
  }

  let advanceBtdcDeg = value.induction.advanceBtdcDeg;
  let delayAtdcDeg = value.induction.delayAtdcDeg;
  if (
    schemaVersion < 4 &&
    timingSource === "crank-and-case-arcs" &&
    value.induction.mode === "rotary"
  ) {
    const diameter = parseLocaleNumber(crankshaftDiameterMm);
    const crankArc = parseLocaleNumber(legacyCrankArcMm as string);
    const caseArc = parseLocaleNumber(legacyCaseArcMm as string);
    const anchorAngle = parseLocaleNumber(legacyAnchorAngleDeg as string);
    const circumference = diameter === null ? null : Math.PI * diameter;
    const tolerance =
      circumference === null ? 0 : Math.max(1, circumference) * 1e-12;
    if (
      diameter === null ||
      diameter <= 0 ||
      crankArc === null ||
      crankArc <= 0 ||
      caseArc === null ||
      caseArc <= 0 ||
      anchorAngle === null ||
      anchorAngle < 0 ||
      circumference === null ||
      crankArc + caseArc > circumference + tolerance
    ) {
      return {
        ok: false,
        message: "Legacy rotary arc geometry contains an invalid physical value.",
      };
    }
    const durationDeg = ((crankArc + caseArc) * 360) / circumference;
    if (anchorAngle > durationDeg + 1e-10) {
      return {
        ok: false,
        message: "The legacy rotary timing anchor exceeds its duration.",
      };
    }
    const advance =
      legacyAnchor === "opening-btdc" ? anchorAngle : durationDeg - anchorAngle;
    const delay =
      legacyAnchor === "closing-atdc" ? anchorAngle : durationDeg - anchorAngle;
    advanceBtdcDeg = String(advance);
    delayAtdcDeg = String(delay);
  }

  if (value.induction.mode === "rotary") {
    const advance = parseLocaleNumber(advanceBtdcDeg);
    const delay = parseLocaleNumber(delayAtdcDeg);
    if (
      advance === null ||
      delay === null ||
      advance < 0 ||
      delay < 0 ||
      advance + delay > 360
    ) {
      return {
        ok: false,
        message: "Rotary timing must define a valid desired opening and closing edge.",
      };
    }
    if (
      schemaVersion >= 4 &&
      timingSource === "crank-and-case-arcs"
    ) {
      const diameter = parseLocaleNumber(crankshaftDiameterMm);
      const manualArc = parseLocaleNumber(measuredArcMm as string);
      const circumference = diameter === null ? null : Math.PI * diameter;
      const requiredArc =
        circumference === null ? null : (circumference * (advance + delay)) / 360;
      const tolerance =
        circumference === null || requiredArc === null
          ? 0
          : Math.max(1, circumference, requiredArc) * 1e-12;
      if (
        diameter === null ||
        diameter <= 0 ||
        manualArc === null ||
        manualArc <= 0 ||
        advance + delay <= 0 ||
        circumference === null ||
        requiredArc === null ||
        requiredArc - manualArc <= tolerance
      ) {
        return {
          ok: false,
          message:
            "Rotary geometry requires a positive diameter, a positive measured arc and a positive calculated counterpart.",
        };
      }
    }
  }
  if (!isRecord(value.compression) || !isRecord(value.squish) || !isRecord(value.presentation)) {
    return { ok: false, message: "Compression, squish or display data is missing." };
  }
  const character =
    schemaVersion === PROJECT_SCHEMA_VERSION && isRecord(value.character)
      ? value.character
      : null;
  const characterProfile = character === null ? "none" : character.profile;
  const characterReferenceSetVersion =
    character === null
      ? PROFILE_REFERENCE_SET_VERSION
      : character.referenceSetVersion;
  const characterRpmMinimum = character === null ? "3000" : character.rpmMinimum;
  const characterRpmMaximum = character === null ? "11000" : character.rpmMaximum;
  const characterRpmStep = character === null ? "500" : character.rpmStep;
  if (
    !characterProfiles.has(characterProfile as CharacterProfile) ||
    !isText(characterReferenceSetVersion, 48) ||
    !isText(characterRpmMinimum, 32) ||
    !isText(characterRpmMaximum, 32) ||
    !isText(characterRpmStep, 32)
  ) {
    return { ok: false, message: "Engine character profile is invalid." };
  }
  const rpmMinimum = parseLocaleNumber(characterRpmMinimum as string);
  const rpmMaximum = parseLocaleNumber(characterRpmMaximum as string);
  const rpmStep = parseLocaleNumber(characterRpmStep as string);
  if (
    rpmMinimum === null ||
    rpmMaximum === null ||
    rpmStep === null ||
    rpmMinimum < 500 ||
    rpmMaximum > 20_000 ||
    rpmMaximum <= rpmMinimum ||
    rpmStep < 100 ||
    rpmStep > 2_000 ||
    (rpmMaximum - rpmMinimum) / rpmStep > 80
  ) {
    return {
      ok: false,
      message: "The engine-character RPM sweep is invalid or too large.",
    };
  }
  const compression = value.compression;
  const squish = value.squish;
  const presentation = value.presentation;
  const compressionFields = [
    "clearanceVolumeCc",
    "headChamberVolumeCc",
    "gasketVolumeCc",
    "deckVolumeCc",
    "pistonCrownVolumeCc",
    "customCorrectionCc",
    "targetTrappedRatio",
    "headGasketThicknessMm",
    "baseSpacerThicknessMm",
    "exhaustRaiseMm",
  ];
  const squishFields = [
    "gapNorthMm",
    "gapEastMm",
    "gapSouthMm",
    "gapWestMm",
    "bowlDiameterMm",
    "bandWidthMm",
    "manufacturerMinimumMm",
  ];
  if (!compressionFields.every((key) => isText(compression[key], 32))) {
    return { ok: false, message: "Compression data is invalid." };
  }
  if (!squishFields.every((key) => isText(squish[key], 32))) {
    return { ok: false, message: "Squish data is invalid." };
  }
  if (
    compression.volumeMode !== "measured-total" &&
    compression.volumeMode !== "component-breakdown"
  ) {
    return { ok: false, message: "Compression volume mode is invalid." };
  }
  if (
    squish.geometryMode !== "bowl-diameter" &&
    squish.geometryMode !== "band-width"
  ) {
    return { ok: false, message: "Squish geometry mode is invalid." };
  }
  if (
    !isBoolean(presentation.showAnalysisOverlays) ||
    !isBoolean(presentation.showReferenceLabels)
  ) {
    return { ok: false, message: "Display preferences are invalid." };
  }
  return {
    ok: true,
    project: {
      schemaVersion: PROJECT_SCHEMA_VERSION,
      name: value.name,
      report:
        report === null
          ? {
              projectCode: "",
              projectDate: "",
              engineDetails: "",
            }
          : {
              projectCode: report.projectCode as string,
              projectDate: report.projectDate as string,
              engineDetails: (report.engineDetails as string).replace(/\r\n?/gu, "\n"),
            },
      geometry: {
        boreMm: geometry.boreMm as string,
        strokeMm: geometry.strokeMm as string,
        rodLengthMm: geometry.rodLengthMm as string,
        deckPositionMm: geometry.deckPositionMm as string,
        rpm: geometry.rpm as string,
      },
      ports: value.ports.map((item) => {
        const port = item as Record<string, unknown>;
        return {
          id: port.id as string,
          label: port.label as string,
          kind: port.kind as PortKind,
          enabled: port.enabled as boolean,
          sourceMode: port.sourceMode as PortSourceMode,
          sourceValue: port.sourceValue as string,
          widthMm: port.widthMm as string,
          heightMm: port.heightMm as string,
          count: port.count as string,
          uncertaintyMm: port.uncertaintyMm as string,
        };
      }),
      induction: {
        mode: value.induction.mode as InductionMode,
        timingSource: timingSource as RotaryTimingSource,
        advanceBtdcDeg,
        delayAtdcDeg,
        crankshaftDiameterMm,
        crankshaftDiameterUncertaintyMm,
        measuredArc: measuredArc as RotaryMeasuredArc,
        measuredArcMm: measuredArcMm as string,
        measuredArcUncertaintyMm,
        areaSource: areaSource as RotaryAreaSource,
        effectiveWindowAreaMm2: effectiveWindowAreaMm2 as string,
        commonAxialOverlapWidthMm: commonAxialOverlapWidthMm as string,
        commonAxialOverlapWidthUncertaintyMm,
      },
      character: {
        profile: characterProfile as CharacterProfile,
        referenceSetVersion: characterReferenceSetVersion as string,
        rpmMinimum: characterRpmMinimum as string,
        rpmMaximum: characterRpmMaximum as string,
        rpmStep: characterRpmStep as string,
      },
      compression: {
        volumeMode: compression.volumeMode as EngineProjectDraft["compression"]["volumeMode"],
        clearanceVolumeCc: compression.clearanceVolumeCc as string,
        headChamberVolumeCc: compression.headChamberVolumeCc as string,
        gasketVolumeCc: compression.gasketVolumeCc as string,
        deckVolumeCc: compression.deckVolumeCc as string,
        pistonCrownVolumeCc: compression.pistonCrownVolumeCc as string,
        customCorrectionCc: compression.customCorrectionCc as string,
        targetTrappedRatio: compression.targetTrappedRatio as string,
        headGasketThicknessMm: compression.headGasketThicknessMm as string,
        baseSpacerThicknessMm: compression.baseSpacerThicknessMm as string,
        exhaustRaiseMm: compression.exhaustRaiseMm as string,
      },
      squish: {
        geometryMode: squish.geometryMode as EngineProjectDraft["squish"]["geometryMode"],
        gapNorthMm: squish.gapNorthMm as string,
        gapEastMm: squish.gapEastMm as string,
        gapSouthMm: squish.gapSouthMm as string,
        gapWestMm: squish.gapWestMm as string,
        bowlDiameterMm: squish.bowlDiameterMm as string,
        bandWidthMm: squish.bandWidthMm as string,
        manufacturerMinimumMm: squish.manufacturerMinimumMm as string,
      },
      presentation: {
        showAnalysisOverlays: presentation.showAnalysisOverlays as boolean,
        showReferenceLabels: presentation.showReferenceLabels as boolean,
      },
    },
  };
}

export function serialiseProject(project: EngineProjectDraft): string {
  return JSON.stringify(project, null, 2);
}

export function parseProjectJson(json: string): ProjectValidation {
  if (new TextEncoder().encode(json).byteLength > MAX_PROJECT_BYTES) {
    return { ok: false, message: "The project file is too large." };
  }
  try {
    return validateProjectDocument(JSON.parse(json));
  } catch {
    return { ok: false, message: "The project is not valid JSON." };
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function encodeProjectFragment(project: EngineProjectDraft): string {
  const bytes = new TextEncoder().encode(JSON.stringify(project));
  return bytesToBase64(bytes)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

export function decodeProjectFragment(fragment: string): ProjectValidation {
  try {
    const encoded = fragment.replace(/^#?p=/u, "");
    if (!encoded || encoded.length > MAX_SHARE_FRAGMENT_LENGTH) {
      return { ok: false, message: "The shared project link is empty or too long." };
    }
    const padded = encoded.replaceAll("-", "+").replaceAll("_", "/").padEnd(
      Math.ceil(encoded.length / 4) * 4,
      "=",
    );
    const json = new TextDecoder().decode(base64ToBytes(padded));
    return parseProjectJson(json);
  } catch {
    return { ok: false, message: "The shared project link is corrupt." };
  }
}

export function safeProjectFilename(name: string): string {
  const safe = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-zA-Z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .toLowerCase()
    .slice(0, 64);
  return safe || "phase-360-project";
}
