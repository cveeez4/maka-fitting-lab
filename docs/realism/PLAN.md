# Realism pilot — engineering checkpoint, not a finished realistic garment

## What is implemented in this branch

- The complete v0.2 baseline remains unchanged in `src/` and `build.mjs`.
- `lab/` is a separate offline viewer with a Three.js studio environment, three experimental fabric presets, front/side/detail camera, static reference photographs and local PNG export.
- Its default geometry is explicitly the existing procedural v0.2 geometry. This checkpoint does **not** claim photorealistic reconstruction, an authored production pattern, or better fit.
- Embedded GLB 2.0 assets can be imported from the user's device without network upload, external resources, or persistent storage. Imported materials are retained. Fabric and color overrides are disabled on imported assets. Normalizing the display height is not body fitting.
- The importer rejects external buffers/images before loading, oversized files, unsupported compression and declared triangle/material budgets. Decoded vertices and texture dimensions are checked before display.
- `tools/blender/bake_cloth.py` is an offline cloth-bake pipeline for an **authored input .blend scene** with reviewed pin weights and collision geometry. It has been syntax checked only: Blender is not installed here; no bake has run and no real garment result is shipped.

## Why this order

The v0.2 radial surface cannot reveal the actual pattern, armhole construction or fabric response from one product photograph. More lighting alone can make the mesh look shinier without making its construction true. The new viewer is the integration point for a properly authored garment asset and a separately reviewed offline drape; no live browser cloth simulation is assumed.

## Pilot garment

Open abaya with a light inner dress, neck tie and embellished cuffs, using the four owner-provided color references. The back, unseen seam geometry, fabric weight and thickness remain unknown. Do not invent them as product facts.

## Asset authoring contract

- Units: meters, transforms applied; use a documented reference mannequin and pose.
- Export named outer, inner, left sleeve, right sleeve and trims as separate meshes/material slots.
- Develop front/back and sleeve panels from a reviewed block or actual pattern; use continuous armhole seams and real cuff width. A draft block is not an actual MAKA pattern.
- Prepare UVs with consistent scale, preserve the neckline opening, hem thickness and shoulder continuity.
- Author materials from owned/licensed references. Do not turn the full product photo into a stretched texture.
- In Blender, garments that should drape use `MAKA_CLOTH_*` with non-empty `MAKA_PIN` weights. Bodies use `MAKA_COLLIDER_*`. Fixed/deformation-following trims use `MAKA_TRIM_*`; their attachment must be reviewed by the author. The bake script does not sew arbitrary panels or infer pin groups.
- Bake externally, inspect frame convergence and intersections, then export a self-contained GLB with textures <=2048px, file <=20MiB, triangles <=150k, materials <=32. Current viewer does not configure Draco/Meshopt/KTX2 decoders.
- Import into the lab and inspect front/side/back and close-up cuffs. Keep reference photographs clearly labeled as static.

## Milestones and acceptance gates

| Milestone | Acceptance evidence | Current state |
|---|---|---|
| Preserve baseline | Full assets restored with checksum, HTML builds, 6 unit tests | Complete |
| Integration/material viewer | Offline desktop/mobile tests, local GLB import and external resource rejection | Implemented; test report accompanies branch |
| Authored garment | Reviewed pattern/mesh, UVs, no visible armhole gaps, front/side/back screenshots | Not started with a real product asset |
| Offline drape | Actual Blender execution report, settled cache, no visible penetration | Script prepared; execution pending |
| Material realism | Matched roughness/weave scale, cuff close-up, comparison to the same source lighting | Not accepted; presets are illustrative |
| Size behavior | Reviewed size variants or calibrated retargeting, clearance and length tests | Pending; imported GLB remains static |
| Mobile budget | Measured device frame time/memory; target >=30fps on named mid-range phone | Not measured on a physical phone; emulator not a performance certification |

## No silent substitutions

Do not call this checkpoint photorealistic or size-accurate. Do not substitute a generated product image for an interactive garment, or claim a photograph updates with measurements. Quality gates must be supported by actual assets and tests before merging as a realism release.
