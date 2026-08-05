import assert from "node:assert/strict";
import test from "node:test";

import {
  ENGINE_PROJECT_SCHEMA_VERSION,
  engineProjectDiagnostics,
  type EngineProject,
} from "../../lib/engine/index.ts";

function projectFixture(): EngineProject {
  return {
    schemaVersion: ENGINE_PROJECT_SCHEMA_VERSION,
    id: "test-project",
    name: "Test project",
    geometry: {
      boreMm: 66,
      strokeMm: 60,
      rodLengthMm: 110,
      crownBelowDeckAtTdcMm: 0.5,
      referenceRpm: 8000,
    },
    ports: [
      {
        id: "exhaust",
        label: "Exhaust",
        role: "exhaust",
        measurement: { mode: "roof-depth-from-deck", roofDepthFromDeckMm: 31 },
        widthMm: 40,
        heightMm: 20,
        count: 1,
        enabled: true,
      },
      {
        id: "primary",
        label: "Primary transfers",
        role: "primary-transfer",
        measurement: { mode: "travel-from-tdc", travelFromTdcMm: 39 },
        widthMm: 15,
        heightMm: 12,
        count: 2,
        enabled: true,
      },
    ],
    rotaryValve: {
      enabled: true,
      advanceBeforeTdcDeg: 115,
      delayAfterTdcDeg: 65,
    },
    combustion: {
      clearanceVolumeCc: 20,
      bowlDiameterMm: 50,
      squishGapMeasurementsMm: [1.1, 1.2],
    },
  };
}

test("the project schema covers geometry, ports, rotary timing and combustion", () => {
  assert.deepEqual(engineProjectDiagnostics(projectFixture()), []);
});

test("project validation reports duplicate port ids and invalid geometry", () => {
  const project = projectFixture();
  project.ports[1]!.id = "exhaust";
  project.geometry.rodLengthMm = 20;

  const diagnostics = engineProjectDiagnostics(project);

  assert.ok(diagnostics.some((item) => item.code === "PORT_ID_DUPLICATE"));
  assert.ok(diagnostics.some((item) => item.code === "ROD_NOT_LONGER_THAN_CRANK"));
});
