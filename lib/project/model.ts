export const PROJECT_SCHEMA_VERSION = 2 as const;
export const PROJECT_STORAGE_KEY = "phase360.project.v2";
export const LEGACY_PROJECT_STORAGE_KEY = "phase360.project.v1";
export const MAX_PROJECT_BYTES = 48_000;
export const MAX_SHARE_FRAGMENT_LENGTH = 7_500;

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
export type RotaryArcAnchor = "opening-btdc" | "closing-atdc";

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
    crankCutawayArcMm: string;
    crankcaseWindowArcMm: string;
    arcAnchor: RotaryArcAnchor;
    arcAnchorAngleDeg: string;
    effectiveWindowAreaMm2: string;
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
    advanceBtdcDeg: "125",
    delayAtdcDeg: "58",
    crankshaftDiameterMm: "87",
    crankCutawayArcMm: "95",
    crankcaseWindowArcMm: "43.9",
    arcAnchor: "opening-btdc",
    arcAnchorAngleDeg: "125",
    effectiveWindowAreaMm2: "180",
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

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
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
const rotaryArcAnchors = new Set<RotaryArcAnchor>([
  "opening-btdc",
  "closing-atdc",
]);

export type ProjectValidation =
  | { ok: true; project: EngineProjectDraft }
  | { ok: false; message: string };

export function validateProjectDocument(value: unknown): ProjectValidation {
  if (!isRecord(value)) {
    return { ok: false, message: "The project must be a JSON object." };
  }
  if (value.schemaVersion !== 1 && value.schemaVersion !== PROJECT_SCHEMA_VERSION) {
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
  if (
    !isText(value.induction.advanceBtdcDeg, 32) ||
    !isText(value.induction.delayAtdcDeg, 32) ||
    !isText(value.induction.effectiveWindowAreaMm2, 32)
  ) {
    return { ok: false, message: "Rotary inlet timing is invalid." };
  }
  const timingSource =
    value.schemaVersion === 1 && value.induction.timingSource === undefined
      ? "direct-angles"
      : value.induction.timingSource;
  const arcAnchor =
    value.schemaVersion === 1 && value.induction.arcAnchor === undefined
      ? "opening-btdc"
      : value.induction.arcAnchor;
  const crankshaftDiameterMm =
    value.schemaVersion === 1
      ? value.induction.crankshaftDiameterMm ?? ""
      : value.induction.crankshaftDiameterMm;
  const crankCutawayArcMm =
    value.schemaVersion === 1
      ? value.induction.crankCutawayArcMm ?? ""
      : value.induction.crankCutawayArcMm;
  const crankcaseWindowArcMm =
    value.schemaVersion === 1
      ? value.induction.crankcaseWindowArcMm ?? ""
      : value.induction.crankcaseWindowArcMm;
  const arcAnchorAngleDeg =
    value.schemaVersion === 1
      ? value.induction.arcAnchorAngleDeg ?? ""
      : value.induction.arcAnchorAngleDeg;
  if (
    !rotaryTimingSources.has(timingSource as RotaryTimingSource) ||
    !rotaryArcAnchors.has(arcAnchor as RotaryArcAnchor) ||
    !isText(crankshaftDiameterMm, 32) ||
    !isText(crankCutawayArcMm, 32) ||
    !isText(crankcaseWindowArcMm, 32) ||
    !isText(arcAnchorAngleDeg, 32)
  ) {
    return { ok: false, message: "Rotary inlet geometry is invalid." };
  }
  if (value.induction.mode === "rotary") {
    const advance = parseLocaleNumber(value.induction.advanceBtdcDeg);
    const delay = parseLocaleNumber(value.induction.delayAtdcDeg);
    if (timingSource === "direct-angles") {
      if (
        advance === null ||
        delay === null ||
        advance < 0 ||
        delay < 0 ||
        advance + delay > 360
      ) {
        return {
          ok: false,
          message: "Direct rotary timing must define a valid opening and closing edge.",
        };
      }
    } else {
      const diameter = parseLocaleNumber(crankshaftDiameterMm);
      const crankArc = parseLocaleNumber(crankCutawayArcMm);
      const caseArc = parseLocaleNumber(crankcaseWindowArcMm);
      const anchorAngle = parseLocaleNumber(arcAnchorAngleDeg);
      const circumference = diameter === null ? null : Math.PI * diameter;
      const tolerance = circumference === null ? 0 : Math.max(1, circumference) * 1e-12;
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
        crankArc > circumference + tolerance ||
        caseArc > circumference + tolerance ||
        crankArc + caseArc > circumference + tolerance
      ) {
        return {
          ok: false,
          message: "Rotary arc geometry contains an invalid physical value.",
        };
      }
      const durationDeg = ((crankArc + caseArc) * 360) / circumference;
      if (anchorAngle > durationDeg + 1e-10) {
        return {
          ok: false,
          message: "The rotary timing anchor exceeds the arc-derived duration.",
        };
      }
    }
  }
  if (!isRecord(value.compression) || !isRecord(value.squish) || !isRecord(value.presentation)) {
    return { ok: false, message: "Compression, squish or display data is missing." };
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
        advanceBtdcDeg: value.induction.advanceBtdcDeg,
        delayAtdcDeg: value.induction.delayAtdcDeg,
        crankshaftDiameterMm,
        crankCutawayArcMm,
        crankcaseWindowArcMm,
        arcAnchor: arcAnchor as RotaryArcAnchor,
        arcAnchorAngleDeg,
        effectiveWindowAreaMm2: value.induction.effectiveWindowAreaMm2,
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
