import test from "node:test";
import assert from "node:assert/strict";
import { createResourceOwner } from "../src/resource-owner.js";
import { parseOwnedGLB } from "../src/owned-loader.js";
import { glbFixture } from "./fixture.mjs";
test("resources released once and late asynchronous resolutions released immediately", () => {
  const o = createResourceOwner();
  let disposed = 0,
    closed = 0;
  const image = { close: () => closed++ },
    a = { isTexture: true, image, dispose: () => disposed++ },
    b = { isTexture: true, image, dispose: () => disposed++ };
  o.track(a);
  o.track(a);
  assert.equal(o.count, 1);
  o.release();
  o.release();
  assert.equal(disposed, 1);
  assert.equal(closed, 1);
  o.track(a);
  o.track(b);
  assert.equal(disposed, 2);
  assert.equal(closed, 1);
  assert.equal(o.count, 0);
});
test("real imported root owns geometry and materials even before validation/attachment", async () => {
  const root = await parseOwnedGLB(glbFixture());
  let geometry = 0,
    material = 0;
  root.traverse((o) => {
    if (o.isMesh) {
      o.geometry.addEventListener("dispose", () => geometry++);
      o.material.addEventListener("dispose", () => material++);
    }
  });
  root.userData.releaseResources();
  root.userData.releaseResources();
  assert.equal(geometry, 1);
  assert.equal(material, 1);
});
