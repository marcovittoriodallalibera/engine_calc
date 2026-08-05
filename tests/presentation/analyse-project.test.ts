import assert from "node:assert/strict";
import test from "node:test";
import { analyseProject } from "../../lib/presentation/analyse-project.ts";
import { cloneDemonstrationProject } from "../../lib/project/model.ts";

function closeTo(actual: number | null, expected: number, tolerance = 1e-6) {
  assert.notEqual(actual, null);
  assert.ok(Math.abs((actual as number) - expected) <= tolerance);
}

test("demonstration project produces a complete integrated analysis", () => {
  const result = analyseProject(cloneDemonstrationProject());

  assert.equal(result.validGeometry, true);
  closeTo(result.displacementCc, 144.199103, 0.00001);
  closeTo(result.exhaust?.durationDeg ?? null, 175.079614, 0.00001);
  assert.ok((result.timing.globalBlowdownDeg ?? 0) > 15);
  assert.ok((result.rotary?.unionTransferOverlapDeg ?? 0) > 0);
  assert.ok((result.compression.geometricRatio ?? 0) > 12);
  assert.ok((result.compression.trappedRatio ?? 0) > 7);
  closeTo(result.squish.areaPercent, 51, 0.00001);
  assert.equal(result.ports.every((port) => port.angleAreaMm2Deg !== null), true);
});

test("equivalent source modes preserve the same physical port event", () => {
  const project = cloneDemonstrationProject();
  const first = analyseProject(project);
  const primary = first.ports.find((port) => port.id === "primary");
  assert.ok(primary);

  project.ports = project.ports.map((port) =>
    port.id === "primary"
      ? {
          ...port,
          sourceMode: "duration" as const,
          sourceValue: String(primary.durationDeg),
        }
      : port,
  );
  const second = analyseProject(project);
  const converted = second.ports.find((port) => port.id === "primary");
  assert.ok(converted);
  closeTo(converted.travelFromTdcMm, primary.travelFromTdcMm, 0.000001);
  closeTo(converted.durationDeg, primary.durationDeg, 0.000001);
});

test("deck-referenced depth accounts for the assembled piston position", () => {
  const project = cloneDemonstrationProject();
  project.geometry.deckPositionMm = "0.7";
  project.ports[0] = {
    ...project.ports[0],
    sourceMode: "depth-from-deck",
    sourceValue: "30.7",
  };
  const result = analyseProject(project);

  closeTo(result.exhaust?.travelFromTdcMm ?? null, 30);
  closeTo(result.exhaust?.durationDeg ?? null, 175.079614, 0.00001);
});

test("component clearance mode and reed mode remain explicit", () => {
  const project = cloneDemonstrationProject();
  project.compression.volumeMode = "component-breakdown";
  project.induction.mode = "reed";
  const result = analyseProject(project);

  closeTo(result.compression.clearanceVolumeCc, 12.4);
  assert.equal(result.compression.clearanceVolumeMode, "component-breakdown");
  assert.equal(result.rotary, null);
  assert.equal(
    result.transfers.every(
      (transfer) => transfer.valveRelationship === "not-applicable",
    ),
    true,
  );
});
