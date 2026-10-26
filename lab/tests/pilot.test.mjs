import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { inspectGLB } from "../src/asset-policy.js";
const b = fs.readFileSync("lab/assets/abaya-pilot.glb");
const glb = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
const report = JSON.parse(
  fs.readFileSync("lab/assets/abaya-pilot.report.json"),
);
test("actual pilot GLB is embedded, finite-budget and contains no external resources", () => {
  const meta = inspectGLB(glb);
  assert(meta.triangles > 20000);
  assert(meta.triangles < 150000);
  assert(meta.materials <= 4);
});
test("bake report records actual cloth movement and single-size limitations", () => {
  assert.equal(report.frames, 100);
  assert.equal(report.settlingAccepted, false);
  assert.equal(report.convergence.consecutiveStepSamples.length, 20);
  assert(report.convergence.freeVertexCount > 0);
  assert.equal(report.endpointDeltaIsConvergenceCertificate, false);
  assert(report.postprocessedClearance.MAKA_COLLIDER_inner_dress);
  assert(report.postprocessedClearance.MAKA_COLLIDER_body);
  assert(report.rmsDisplacementMeters > 0.001);
  assert(report.maximumDisplacementMeters > report.rmsDisplacementMeters);
  assert.equal(report.calibratedFit, false);
  assert.equal(report.runtimeClothSimulation, false);
  assert.equal(report.selfIntersectionsValidated, false);
  assert.equal(report.authoringReport.connectedArmholes, 2);
  assert.equal(report.simulatedMeshes.length, 1);
  assert.match(report.simulationScope, /lower skirt only/);
});
test("packed baked asset matches its recorded SHA256", () => {
  const manifest = JSON.parse(
    fs.readFileSync("lab/assets/pilot-manifest.json"),
  );
  assert.equal(
    crypto.createHash("sha256").update(b).digest("hex"),
    manifest.files.find((f) => f.path.endsWith(".glb")).sha256,
  );
});
