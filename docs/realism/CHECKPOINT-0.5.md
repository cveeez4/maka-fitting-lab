# Checkpoint 0.5 — procedural material detail and light inspection

This is a rendering/inspection iteration, not another cloth-simulation success. The exact v0.4 authored source, guided lower-skirt GLB, collider limitations and failed full-outer experiments are unchanged.

## Implemented

- Separate deterministic tileable tangent-space normal and roughness maps for crepe, satin and dry linen-like weave. Weave generation uses periodic fiber ridges, grain and slub variations; it is artist-authored procedural data, **not** a scan or measurement of MAKA fabric.
- Normal detail and roughness distribution differ by preset, rather than sharing one bump texture. Linear data textures, mipmaps and capped anisotropic filtering reduce distant weave aliasing. GPU resources are cached/reused across switches.
- A surface-detail checkbox compares the same mesh/material with and without procedural maps. Base material roughness is restored when maps are off. Imported GLBs retain their own materials and the toggle is disabled.
- Studio hemisphere/key/fill balance revised; VSM ground shadows filtered using the light's blur pass. Self-shadowing on the thin authored garment remains disabled; no new body-contact validation is implied.
- Static shadow maps are cached and explicitly invalidated when the light or garment changes, rather than recomputing a static bake every frame. Camera orbit does not require a shadow-map update. This is a structural optimization, not a claimed phone benchmark.
- Exposure 0.7–1.3 and light rotation ±80° with synchronized environment rotation, numeric outputs and reset. Light settings apply to imported GLBs without replacing their material maps.
- Back and cuff inspection cameras alongside front, side and bodice detail. These are actual 3D views, not generated product photos.

## Evidence and unchanged gates

Unit tests verify deterministic/distinct maps, normal encoding, opacity and input bounds. Browser checks inspect assigned map names, toggle comparison (including different rendered canvas captures), static shadow cache, exposure/rotation/reset, camera selection, external-URL rejection, imported-material protection, PNG export and offline behavior on desktop/mobile viewports. Reports are under `verification/v0.5/`.

The mesh is still 149,436 triangles and one reference size. Upper body and sleeves remain anchored; only the skirt was simulated offline for 100 frames in v0.4. Body clearance, self-intersection validation, actual pattern dimensions, calibrated cloth, photorealistic quality and physical-device performance are **not accepted**. The current renderer cannot create missing construction details/backside evidence from a front photo. No hosted deployment is performed.

## Run

```sh
npm ci
npm run build:lab
npm run test:lab
npm run test:lab:browser
```

Open `dist/maka-realism-lab.html` locally. `fabric-data.js` is pure CPU generation; no new downloaded texture or network dependency is added. The main baseline remains unchanged and the PR remains draft.
