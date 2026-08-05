import {
  collectDiagnostics,
  errorDiagnostic,
  finiteNumberDiagnostic,
  nonNegativeNumberDiagnostic,
  positiveNumberDiagnostic,
  type Diagnostic,
} from "./result.ts";

export const ENGINE_PROJECT_SCHEMA_VERSION = 1 as const;

export type PortRole =
  | "exhaust"
  | "primary-transfer"
  | "secondary-transfer"
  | "boost-transfer";

export type PortRoofMeasurement =
  | {
      mode: "roof-depth-from-deck";
      roofDepthFromDeckMm: number;
    }
  | {
      mode: "travel-from-tdc";
      travelFromTdcMm: number;
    };

export interface EnginePortDefinition {
  id: string;
  label: string;
  role: PortRole;
  measurement: PortRoofMeasurement;
  widthMm: number;
  heightMm: number;
  count: number;
  enabled: boolean;
}

export interface EngineGeometryDefinition {
  boreMm: number;
  strokeMm: number;
  rodLengthMm: number;
  crownBelowDeckAtTdcMm: number;
  referenceRpm: number;
}

export interface RotaryValveDefinition {
  enabled: boolean;
  advanceBeforeTdcDeg: number;
  delayAfterTdcDeg: number;
}

export interface CombustionDefinition {
  clearanceVolumeCc: number;
  bowlDiameterMm: number;
  squishGapMeasurementsMm: number[];
}

export interface EngineProject {
  schemaVersion: typeof ENGINE_PROJECT_SCHEMA_VERSION;
  id: string;
  name: string;
  geometry: EngineGeometryDefinition;
  ports: EnginePortDefinition[];
  rotaryValve: RotaryValveDefinition;
  combustion: CombustionDefinition;
}

export function engineProjectDiagnostics(project: EngineProject): Diagnostic[] {
  const diagnostics = collectDiagnostics(
    project.schemaVersion === ENGINE_PROJECT_SCHEMA_VERSION
      ? null
      : errorDiagnostic(
          "UNSUPPORTED_PROJECT_SCHEMA",
          `schemaVersion must be ${ENGINE_PROJECT_SCHEMA_VERSION}.`,
          "schemaVersion",
        ),
    project.id.trim().length > 0
      ? null
      : errorDiagnostic("PROJECT_ID_EMPTY", "id cannot be empty.", "id"),
    project.name.trim().length > 0
      ? null
      : errorDiagnostic("PROJECT_NAME_EMPTY", "name cannot be empty.", "name"),
    positiveNumberDiagnostic(project.geometry.boreMm, "geometry.boreMm"),
    positiveNumberDiagnostic(project.geometry.strokeMm, "geometry.strokeMm"),
    positiveNumberDiagnostic(project.geometry.rodLengthMm, "geometry.rodLengthMm"),
    finiteNumberDiagnostic(
      project.geometry.crownBelowDeckAtTdcMm,
      "geometry.crownBelowDeckAtTdcMm",
    ),
    positiveNumberDiagnostic(project.geometry.referenceRpm, "geometry.referenceRpm"),
    nonNegativeNumberDiagnostic(
      project.rotaryValve.advanceBeforeTdcDeg,
      "rotaryValve.advanceBeforeTdcDeg",
    ),
    nonNegativeNumberDiagnostic(
      project.rotaryValve.delayAfterTdcDeg,
      "rotaryValve.delayAfterTdcDeg",
    ),
    positiveNumberDiagnostic(
      project.combustion.clearanceVolumeCc,
      "combustion.clearanceVolumeCc",
    ),
    nonNegativeNumberDiagnostic(
      project.combustion.bowlDiameterMm,
      "combustion.bowlDiameterMm",
    ),
  );

  if (project.geometry.rodLengthMm <= project.geometry.strokeMm / 2) {
    diagnostics.push(
      errorDiagnostic(
        "ROD_NOT_LONGER_THAN_CRANK",
        "geometry.rodLengthMm must be greater than the crank radius.",
        "geometry.rodLengthMm",
      ),
    );
  }
  if (
    project.rotaryValve.advanceBeforeTdcDeg + project.rotaryValve.delayAfterTdcDeg >
    360
  ) {
    diagnostics.push(
      errorDiagnostic(
        "ROTARY_DURATION_EXCEEDS_CYCLE",
        "Rotary valve advance plus delay cannot exceed 360 degrees.",
        "rotaryValve",
      ),
    );
  }
  if (project.combustion.bowlDiameterMm > project.geometry.boreMm) {
    diagnostics.push(
      errorDiagnostic(
        "BOWL_EXCEEDS_BORE",
        "combustion.bowlDiameterMm cannot exceed geometry.boreMm.",
        "combustion.bowlDiameterMm",
      ),
    );
  }
  if (project.ports.length === 0) {
    diagnostics.push(errorDiagnostic("NO_PORTS", "At least one port is required.", "ports"));
  }

  const portIds = new Set<string>();
  project.ports.forEach((port, index) => {
    const prefix = `ports.${index}`;
    if (port.id.trim().length === 0) {
      diagnostics.push(errorDiagnostic("PORT_ID_EMPTY", "Port id cannot be empty.", `${prefix}.id`));
    } else if (portIds.has(port.id)) {
      diagnostics.push(
        errorDiagnostic("PORT_ID_DUPLICATE", "Port ids must be unique.", `${prefix}.id`),
      );
    }
    portIds.add(port.id);
    if (port.label.trim().length === 0) {
      diagnostics.push(
        errorDiagnostic("PORT_LABEL_EMPTY", "Port label cannot be empty.", `${prefix}.label`),
      );
    }
    diagnostics.push(
      ...collectDiagnostics(
        positiveNumberDiagnostic(port.widthMm, `${prefix}.widthMm`),
        positiveNumberDiagnostic(port.heightMm, `${prefix}.heightMm`),
        positiveNumberDiagnostic(port.count, `${prefix}.count`),
        port.measurement.mode === "roof-depth-from-deck"
          ? nonNegativeNumberDiagnostic(
              port.measurement.roofDepthFromDeckMm,
              `${prefix}.measurement.roofDepthFromDeckMm`,
            )
          : nonNegativeNumberDiagnostic(
              port.measurement.travelFromTdcMm,
              `${prefix}.measurement.travelFromTdcMm`,
            ),
      ),
    );
    if (!Number.isInteger(port.count)) {
      diagnostics.push(
        errorDiagnostic("PORT_COUNT_NOT_INTEGER", "Port count must be a whole number.", `${prefix}.count`),
      );
    }
  });

  project.combustion.squishGapMeasurementsMm.forEach((gap, index) => {
    const issue = nonNegativeNumberDiagnostic(
      gap,
      `combustion.squishGapMeasurementsMm.${index}`,
    );
    if (issue) diagnostics.push(issue);
  });
  return diagnostics;
}
