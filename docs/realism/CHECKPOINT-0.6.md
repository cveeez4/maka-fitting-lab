# Checkpoint 0.6 — trust fixes, construction iteration and demand rendering

## Scope and decision

This checkpoint implements work in all three requested tracks, but **does not claim all release gates are complete**. Import/provenance hardening and rendering efficiency are implemented and tested. The garment is an improved authored approximation; a new full-outer solve was actually run and rejected. Calibrated sizes, exact product construction, comprehensive clearance and real-phone performance still require missing evidence/input.

## 1. Trust and robustness

- Conservative **static GLB subset**: one JSON+BIN, bounded JSON/depth, accessors/views/counts/strides/offsets/component types, finite coordinates, actual index bounds and bounded acyclic node graphs. Unsupported extensions, skins, animation, morph targets, sparse/unbacked accessors and GPU instancing are explicitly rejected rather than silently accepted.
- Reachable scene instances count against effective geometry budgets. Post-load costs are independently checked. Actual geometry bounds are recomputed instead of trusting supplied accessor min/max for framing.
- PNG/JPEG dimensions are inspected before image decoding. Limits: 20 MiB file, 2 MiB JSON, 150K effective triangles, 250K effective vertices, 32 MiB decoded attribute data, at most 8 images/textures, 2K per side, 48 MiB estimated aggregate RGBA+mipmap image budget. These are engineering caps, not an exhaustive browser-security guarantee.
- Import operations are serialized. Explicit ownership releases geometry/material/texture/ImageBitmap resources on normal replacement, candidate rejection, superseded results and late asynchronous resolution. Browser image decoding is not claimed to be instantly cancellable.
- The bundled report is shown **only for the bundled pilot**; legacy/imported models have no attached simulation evidence. Imported GLBs retain their original materials.
- Node regressions cover the adversarial cases; resource ownership is tested against actual GLTFLoader output plus synthetic late resolutions. Local tests are not a proof of zero memory growth on every browser.
- A GitHub Actions workflow is supplied for build, baseline/lab/motion tests and offline browser evidence. Remote workflow execution status must be reported separately; the presence of the YAML is not a green CI run.

## 2. Garment construction and honest physics

- Lower-density torso/sleeve grids and smoother oval armhole boundaries, while preserving shared-vertex sleeve connections.
- Added approximate neck loops/tails, upper-lapel stitch geometry and cuff-edge rolls. They are **fixed visual trims, not sewn simulation constraints**, and are batched by material. No authentic hidden construction is inferred from a front photograph.
- Default GLB: **87,848 triangles**, down from 149,436 (~41.2% fewer), including the new visual details. This does not alone establish faster real-device performance or improved product accuracy.
- Actually reran the guided 100-frame Blender 4.5.3 LTS bake. Only the lower skirt is free; upper body/sleeves and inner layer remain fixed. Asset source, GLB and reports are included in versioned checksummed text packs (`pilot06-*`), without overwriting the previous checkpoint's pack names.
- Replaced the misleading temporal statistic with accurately named `endpointDeltaRmsOver10FramesMeters` (explicitly **not** a convergence certificate). Recorded **20 consecutive steps on free vertices only**, with RMS/p95/max per step. Motion-only gating is separate from fit/clearance acceptance. `settlingAccepted` and `fitReleaseAccepted` stay false.
- Added postprocessed-mesh nearest-surface diagnostics against both body and inner dress, after subdivision/thickness, instead of relying only on raw cloth vertices. These are **heuristics, not triangle-intersection/self-collision certification**. The guided result still has 903 body and 488 inner-layer candidates across 40,174 tested outer-surface vertices. These counts use a different sampling surface from the old 214 raw-vertex count and must not be interpreted as a before/after quality comparison.
- Actually executed a **separate full-outer 100-frame solve** (238.36 seconds in the recorded run). Its maximum recorded free-vertex step RMS was ~6.72 mm; the motion gate failed. Postprocessed diagnostics reported 571 body and 658 inner-layer candidates. The experiment is **not promoted**; its failure report is retained and shown in the bundled pilot's evidence panel.
- The old adversarial review remains historical evidence for checkpoint 0.5; its diagnostic scripts demonstrated acceptance at that old version. The new acceptance tests explicitly reject those cases.

## 3. Efficiency and inspection

- Demand rendering with a bounded damping tail; idle scenes stop rendering. Auto-rotation continues only while visible. Intersection/visibility handlers pause work offscreen/when hidden and resume on return.
- Balanced/eco/detail pixel-ratio modes cap rendering resolution. Tiny trims are batched to reduce draw groups; no runtime garment LOD or calibrated size grading is claimed.
- Static shadow invalidation is retained. A preserved drawing buffer keeps the demand-rendered canvas visible through screenshots/compositing; this trades a bounded extra framebuffer for correctness, not zero GPU memory.
- Replaced optimistic FPS filtering with active-frame median/p95/worst time, retaining long stalls; cold first-frame latency is recorded separately. Idle gaps are not presented as continuous-render FPS. Headless software GPU figures are diagnostic only, not a phone benchmark.
- WebGL context-loss handling pauses rendering/import; context restore rebuilds PMREM lighting, shadow state and demand rendering. Test evidence records whether the actual lose/restore extension was available and passed.
- Visual tests require a nonempty material snapshot and visible garment pixels, stable repeat control captures, and a rendered map-on/off change. Camera captures are manually reviewed; these tests are not a photorealism score.

## Reproduce

```sh
npm ci
npm test
npm run build:lab
npm run test:lab
npm run test:motion
npm run test:lab:browser
```

`tools/pilot/README.md` documents actual Blender regeneration. `verification/v0.6/` contains the shipped/rejected reports and test evidence. `docs/realism/GARMENT-SPEC-TEMPLATE.json` lists missing garment dimensions, front/side/back/closure/cuff references and fabric/rights information; unknown fields remain null rather than invented.

## Remaining release gates

- Real product dimensions, approved pattern and full construction references.
- Accepted full-garment motion, body/inner clearance and self-intersection tests on final exported surfaces.
- Actual cloth calibration, reviewed garment size variants and measurement-to-body/garment validation against real samples.
- Physical Android/iOS performance, thermal/battery/memory tests and suitable LOD/quality defaults.
- Commercial rights review for the statistical body/data and supplied photographs.
- Hosted deployment and any required privacy/security review for that hosting model.

**Internal prototype only; no fit, photorealism, commercial-rights or real-device acceptance claim.**
