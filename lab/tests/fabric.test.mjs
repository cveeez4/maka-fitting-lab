import test from "node:test";
import assert from "node:assert/strict";
import { makeFabricData, fabricKinds } from "../src/fabric-data.js";
test("all procedural maps deterministic, finite and opaque", () => {
  for (const kind of fabricKinds) {
    const a = makeFabricData(kind),
      b = makeFabricData(kind);
    assert.deepEqual(a.normal, b.normal);
    assert.deepEqual(a.roughness, b.roughness);
    assert.equal(a.normal.length, 256 * 256 * 4);
    for (let i = 0; i < a.normal.length; i += 4) {
      assert.equal(a.normal[i + 3], 255);
      assert.equal(a.roughness[i + 3], 255);
      assert(a.normal[i + 2] >= 128);
    }
  }
});
test("three weaves and roughness distributions are distinct", () => {
  const maps = fabricKinds.map((k) => makeFabricData(k, 64));
  assert.notDeepEqual(maps[0].normal, maps[1].normal);
  assert.notDeepEqual(maps[0].normal, maps[2].normal);
  const mean = (m) =>
    m.roughness.filter((_, i) => i % 4 === 0).reduce((a, b) => a + b, 0) /
    (64 * 64);
  assert(mean(maps[1]) < mean(maps[0]));
  assert(mean(maps[0]) < mean(maps[2]));
});
test("invalid procedural preset and dimensions rejected", () => {
  assert.throws(() => makeFabricData("unknown"));
  assert.throws(() => makeFabricData("satin", 33));
});
