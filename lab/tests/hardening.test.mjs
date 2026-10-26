import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  inspectGLB,
  inspectLoaded,
  imageSize,
  limits,
} from "../src/asset-policy.js";
import { glbFixture } from "./fixture.mjs";
const doc = () => {
  const b = glbFixture();
  return JSON.parse(
    new TextDecoder()
      .decode(new Uint8Array(b, 20, new DataView(b).getUint32(12, true)))
      .trim(),
  );
};
const reject = (patch) => assert.throws(() => inspectGLB(glbFixture(patch)));
test("huge, zero-initialized and out-of-range accessors rejected before loader", () => {
  let d = doc();
  reject({ accessors: [{ ...d.accessors[0], count: 1e9 }, d.accessors[1]] });
  reject({
    accessors: [
      { componentType: 5126, count: 1e9, type: "VEC3" },
      d.accessors[1],
    ],
  });
  reject({ accessors: [{ ...d.accessors[0], byteOffset: 4 }, d.accessors[1]] });
  reject({
    accessors: [{ ...d.accessors[0], sparse: { count: 1 } }, d.accessors[1]],
  });
});
test("GPU instancing rejected even if extensionsUsed omitted", () => {
  reject({
    nodes: [
      {
        mesh: 0,
        extensions: {
          EXT_mesh_gpu_instancing: { attributes: { TRANSLATION: 0 } },
        },
      },
    ],
  });
  assert.throws(() =>
    inspectLoaded({
      traverse: (f) => f({ isMesh: true, isInstancedMesh: true }),
    }),
  );
});
test("all reachable mesh instances count, not just unique definitions", () => {
  const nodes = Array.from({ length: 10 }, () => ({ mesh: 0 }));
  const r = inspectGLB(
    glbFixture({ nodes, scenes: [{ nodes: nodes.map((_, i) => i) }] }),
  );
  assert.equal(r.triangles, 10);
  assert.equal(r.vertices, 30);
});
test("cycles, duplicate scene roots, deep and excessively large graphs rejected", () => {
  reject({ nodes: [{ children: [0], mesh: 0 }] });
  reject({ scenes: [{ nodes: [0, 0] }] });
  reject({ nodes: Array.from({ length: 129 }, () => ({ mesh: 0 })) });
  reject({
    nodes: Array.from({ length: 40 }, (_, i) =>
      i === 39 ? { mesh: 0 } : { children: [i + 1] },
    ),
  });
});
test("nonfinite source coordinates and invalid index values rejected before decode", () => {
  const mutate = (offset, value, float) => {
    const b = glbFixture(),
      v = new DataView(b),
      start = 20 + v.getUint32(12, true) + 8;
    if (float) v.setFloat32(start + offset, value, true);
    else v.setUint16(start + offset, value, true);
    assert.throws(() => inspectGLB(b));
  };
  mutate(0, NaN, true);
  mutate(36, 65535, false);
});
test("4K embedded PNG rejected before image decode", () => {
  const png = Uint8Array.from(
    atob(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jM1sAAAAASUVORK5CYII=",
    ),
    (c) => c.charCodeAt(0),
  );
  const v = new DataView(png.buffer);
  v.setUint32(16, 4096);
  v.setUint32(20, 4096);
  const uri = "data:image/png;base64," + Buffer.from(png).toString("base64");
  reject({ images: [{ uri }], textures: [{ source: 0 }] });
  assert.throws(() => imageSize(png, "image/png"));
});
test("aggregate image memory is capped, not just dimensions", () => {
  const png = Uint8Array.from(
    atob(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jM1sAAAAASUVORK5CYII=",
    ),
    (c) => c.charCodeAt(0),
  );
  new DataView(png.buffer).setUint32(16, 2048);
  new DataView(png.buffer).setUint32(20, 2048);
  const uri = "data:image/png;base64," + Buffer.from(png).toString("base64");
  reject({
    images: Array.from({ length: 3 }, () => ({ uri })),
    textures: [{ source: 0 }],
  });
  assert(limits.textureBytes < (3 * 2048 * 2048 * 4 * 4) / 3);
});
test("unsupported formats, animation, skin and morph targets fail closed", () => {
  reject({ images: [{ uri: "data:image/svg+xml;base64,PHN2Zz4=" }] });
  reject({ animations: [{}] });
  reject({ skins: [{}] });
  const d = doc();
  d.meshes[0].primitives[0].targets = [{ POSITION: 0 }];
  reject({ meshes: d.meshes });
});
test("truncated and duplicate GLB chunks fail closed", () => {
  const b = glbFixture();
  new DataView(b).setUint32(12, 3, true);
  assert.throws(() => inspectGLB(b));
});
test("the shipped construction asset passes the stricter preflight", () => {
  const b = fs.readFileSync("lab/assets/abaya-pilot.glb"),
    r = inspectGLB(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  assert(r.triangles > 0 && r.triangles < 150000);
  assert(r.decodedBytes <= limits.decodedBytes);
});
