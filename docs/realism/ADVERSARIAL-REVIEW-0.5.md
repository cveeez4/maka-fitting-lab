# Adversarial review — MAKA Realism Lab 0.5

**Reviewed code checkpoint:** `0ce92271af5cbee9ccc1d8cfdc5b109bc7fe6c10`.
**Decision:** NO-GO for a customer-facing measurement/fit product. Suitable for controlled internal visual review with trusted assets only. This is a bounded source review plus local probes, not a comprehensive penetration test or a physical-device certification. No application behavior is changed by this review commit.

## What was actually tested

- `node verification/adversarial-v0.5/probes.mjs`: seven bounded findings, using the real GLTFLoader for ten instances. Oversized declarations were inspected only, never allocated; the valid 4K PNG was constructed with streaming compression and never decoded/uploaded to GPU.
- `node verification/adversarial-v0.5/browser-probe.mjs`: offline Chromium imports an unrelated one-triangle asset and reproduces the still-accessible pilot report. Software GPU only.
- Source inspection of the importer, cleanup paths, animation loop, tests, Blender bake, asset packer, existing reports and licensing notices.
- No network attacks, destructive files, remote service scans, real customer data, production load test, physical-phone test or new Blender solve were performed.

The reproduction scripts intentionally demonstrate current weaknesses; they are not acceptance tests certifying the importer as safe. Machine-readable evidence is in `verification/adversarial-v0.5/`.

## Findings by priority

### P1 / IMPORT-01 and IMPORT-01b — allocation limits are not enforced before decoding
**Evidence: reproduced preflight acceptance; allocation path confirmed in installed loader source.**

`lab/src/asset-policy.js:11` budgets an indexed primitive by its index accessor only. A 724-byte fixture with an inconsistent billion-vertex POSITION accessor passes as one triangle. More importantly, a zero-initialized POSITION accessor without a bufferView also passes; `GLTFLoader.loadAccessor` directly constructs `new TypedArray(count * itemSize)` for that branch. The oversized case was deliberately not loaded; this review does not claim an observed 12 GB allocation or browser crash.

**Impact:** a tiny untrusted file can request excessive allocations or expensive decode/validation work before the later mesh check. File bytes and triangles are not memory bounds.

**Required:** validate schema, accessor component/type/count/stride/offset/sparse bounds, buffer lengths and reachable references; impose total decoded attribute/index/morph/instance byte budgets before loading. Fail closed on unsupported extensions and malformed structures. Test maximum permitted and over-budget values without dangerous allocations.

### P1 / IMPORT-02 — GPU instancing bypasses triangle accounting
**Evidence: real loader reproduction.**

A GLB with ten `EXT_mesh_gpu_instancing` instances is reported as **1 triangle before and after load**, while drawing ten triangles. `inspectLoaded` does not multiply by `InstancedMesh.count`. Increasing instances can hide rendering cost behind a small mesh. Repeated scene references also require a reachable-scene cost budget, not merely unique mesh definitions.

**Required:** reject instancing for the pilot until supported safely, or budget all instantiated geometry, instance attributes and draw calls; post-load independently verify the effective render budget. Acceptance: this fixture must report ten, or be explicitly rejected.

### P1 / IMPORT-03 and BUDGET-01 — image limits act too late and lack an aggregate memory budget
**Evidence: valid compressed-image preflight reproduction plus arithmetic, not a decode crash.**

An 87,792-byte GLB containing a valid **4096×4096** PNG passes preflight; the 2048-pixel limit is checked only after loader image decoding. The permitted 24 textures at 2K could consume **384 MiB RGBA, approximately 512 MiB with mipmaps**, before geometry/render targets. Actual formats/platform allocations vary.

**Required:** inspect allowed image formats/dimensions before decode, cap aggregate decoded texels/bytes, prohibit unsupported formats/resources, cap concurrent loads, and add abortable/failure-safe loading. Keep a local worker/isolation design explicit; a file-size cap alone does not protect the tab.

### P1 / PHYSICS-01 and PHYSICS-02 — the settling label and acceptance signal are too strong
**Evidence: source-confirmed formula and synthetic counterexample.**

`tools/blender/bake_cloth.py:94–108` stores selected frames and computes RMS **vertex displacement between frame 90 and frame 100**, not per-frame motion across the last ten frames. A synthetic 0 → 0.1 → 0 meter oscillation yields zero endpoint delta despite moving in between. The statistic also averages anchored and free vertices: 5,431 of 8,813 vertices have support-group membership in the shipped report. A hypothetical 10 mm free-vertex motion is reduced to approximately 6.19 mm when zero-motion pinned vertices are included.

This **does not prove the actual shipped cloth oscillated**; it proves the current metric cannot certify that it did not. The recorded 0.248 mm is an endpoint-displacement statistic, not an adequate convergence certificate. `pack_asset.py` derives `settlingAccepted` from that statistic alone.

**Required:** label the existing number accurately, withdraw convergence implications, record consecutive-frame velocity/displacement on free vertices over multiple windows, report percentiles/maxima and active constraints. Validate penetration against body **and fixed inner garment**, self-intersections and final exported geometry after smoothing/thickness. Do not release a new full-garment bake until those independent gates pass.

### P1 / PROVENANCE-01 — pilot report is not bound to the displayed asset
**Evidence: reproduced in the offline browser.**

Importing an unrelated one-triangle GLB leaves `window.__lab.bakeReport.frames === 100` and the expandable UI still shows the bundled pilot's Blender report / 214 diagnostic candidates. The asset name is correct, but the report is not scoped to the active source. The same fixed report also remains for the legacy source.

**Required:** source-bound provenance state; display the pilot report only for the exact bundled asset. Imported models must say “no simulation evidence supplied.” Hash-bound imported reports require a separately designed schema/verification flow. Test source changes and restore.

### P2 / LIFE-01 — rejected/cancelled imports have incomplete resource ownership
**Evidence: source review; repeated-import memory growth was not benchmarked.**

`dispose(root)` disposes textures only when `root.userData.localImport` is true. That flag is assigned only after candidate validation succeeds. Rejected or superseded parsed candidates use `dispose(candidate)` without this ownership flag, so that cleanup path does not dispose their material textures. Parser failures before a root is returned require additional ownership handling too. Concurrent operations are sequence-discarded, not truly aborted.

**Required:** explicit resource tracker covering textures, ImageBitmaps, geometries, materials and loading cancellation across all success/reject/supersede paths. Test many bounded imports/rejections and record memory/resource counts, not just visible restoration.

### P2 / PERF-01 — current FPS and rendering loop are not reliable performance acceptance
**Evidence: source review; no new hardware benchmark.**

The loop continuously renders a static scene, even when idle. FPS calculations omit frame gaps of one second or more (`dt < 1000`), potentially hiding the worst stalls. Shadow caching is useful but does not stop full-scene rendering.

**Required:** demand rendering with damping/auto-rotation scheduling; pause offscreen/hidden rendering; measure load-to-first-frame, median/p95 frame time and worst stalls without filtering them away. Test real midrange Android and iOS devices. Set explicit budgets for effective triangles, draw calls, aggregate textures and cold-start memory; prototype a silhouette-reviewed LOD rather than assuming more triangles improve realism.

### P2 / QA-01 — passing tests overstate visual and quality evidence
**Evidence: source review of the existing tests.**

Material checks use `.every(...)` without requiring a non-empty snapshot. Camera checks assert a debug label rather than validating framing. PNG inequality proves a change, not a correct weave or improved realism; roughness changes too, and no repeated control capture rules out rendering/camera noise. There is no clinical/production fit validation. A small set of happy-path checks cannot establish robust import safety. No CI workflow is present in the local files reviewed; remote Actions settings were not independently audited.

**Required:** non-vacuous assertions, stable visual baselines/ROIs with tolerances and repeated controls, front/side/back/cuff framing checks, adversarial failure tests, bounded repeated-import tests, and CI enforcing independent budgets. Keep geometry validity, material appearance, simulation correctness, measurement accuracy and device performance as separate acceptance gates.

## Product blockers, not merely code bugs

1. **The new lab is a static single-size material viewer, not a fitting system.** Measurement-driven behavior in the v0.2 baseline does not validate measurement-driven fit for this new baked asset. Main is preserved, but the lab does not yet fulfil that product goal.
2. **Geometry/physical evidence is the realism bottleneck.** Current shoulders/cuffs/neckline and drape remain approximate; the upper garment and sleeves are anchored. A dense 149,436-triangle asset cannot recover missing pattern construction. Obtain reviewed front/side/back references and actual garment dimensions, then implement neckline/closure, cuffs, facings, hem and seams to those references. Do not invent hidden construction and label it authentic.
3. **Fit/clearance is not accepted.** The 214 raw-vertex candidates are not 214 proven exported-surface defects; they still prevent a clean-fit claim without a better detector. Validate the final postprocessed asset and all layers, not only raw vertices near the body.
4. **Commercial rights remain an explicit gate.** The owner's publication permission does not establish all underlying statistical body/data or photograph rights. Current notices contain historical private/public wording despite an update banner. Consolidate the documentation without changing repository visibility or licensing assets on the owner's behalf.

## Recommended order of work

### 0.5.1 — trust and robustness first
- Import preflight/decoded-resource/instance budgets and full failure-path ownership.
- Bind reports to sources; correct the endpoint statistic label and make convergence status unaccepted until stronger evidence exists.
- Turn the reproduced cases into rejection/correct-count regression tests; add CI and non-vacuous visual assertions.
- **Exit:** every documented failure mode is rejected or accounted for before expensive processing, rejected imports preserve the current asset and release their resources, and unrelated assets never inherit the pilot report.

### 0.6 — one credible garment before more designs
- Collect/reference actual construction and dimensions; review one product's pattern and all camera views.
- Fix initial body/underlayer clearance, seams/supports/topology, then attempt full-sleeve and full-outer drape using measured or clearly generic parameters.
- Evaluate motion over consecutive frames/free vertices, final-layer clearance and self-intersections; retain failed evidence rather than hiding it.
- **Exit:** reviewed visual match and independent geometry/simulation gates; no measurement accuracy claim yet.

### 0.7 — device performance and real size behavior
- Demand rendering, tested LOD, aggregate memory limits and real-device measurements.
- Introduce independently reviewed garment sizes/body retargeting with known dimensions and comparisons to actual samples. Keep visual approximation distinct from a fit recommendation.
- **Exit:** measured runtime budgets and explicit accuracy/limitations for the supported sizes, not merely functioning sliders.

**Recommendation:** do not spend the next iteration on more colors, more polygons or another lighting-only pass. Close import/evidence defects, then spend effort on the actual garment and valid physics.
