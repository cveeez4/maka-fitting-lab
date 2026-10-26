# Shape review 0.7 — first construction revision, not visual acceptance

The 0.6 visual asset was rejected as a realistic product replica. This checkpoint changes the authoring and review process, not just the lighting, while preserving 0.2 and 0.6 unchanged.

## What changed
- Visible fixed original statistical mannequin, with no body-face masking.
- Revised torso/shoulder profile, tapered wrist sleeves, separate inner layer, finite-width ribbon surfaces and approximate raised cuff motifs in place of a plain highly metallic ring.
- Actual evaluated-mesh static nearest-body projection corrected visible chest/shoulder penetrations found in the first screenshots. This is heuristic cleanup, not a physics or collision-free certificate.
- Neutral clay review is the default. Equal-width reference comparison, six inspection cameras, optional illustrative color and explicit mannequin visibility toggle.
- Engineering/import controls are not the principal journey in this review page.

## Not accepted
The silhouette remains too generic and smooth; natural fabric drape and reference trim detail still need work. Neither likeness, authentic pattern construction, surface clearance, full-garment dynamics nor size fitting is accepted. No new cloth solve was run and no old simulation report is applied to this asset. The mannequin is fixed and uncalibrated. One photo does not determine exact dimensions or unseen back construction.

## Build and inspect
```
npm install
npm run build:shape
# Open dist/maka-shape-review-v0.7.html
CHROMIUM_PATH=/path/to/chromium npm run test:shape:browser
```
The standalone output embeds libraries, fonts, model and reference. No network is required. Browser checks verify operation, not realism. See `verification/shape-07/` for their scope.

## Author the model again (Blender 4.5 required separately)
```
npm run build
node tools/pilot/export_body.mjs
/path/to/blender -b --python tools/pilot/create_shape_study.py -- --output generated/shape/shape-study.blend
```
`shape/assets/` holds the complete checksummed GLB and Blender source in text transport. `shape/restore.mjs` restores both; no asset is redacted. Reauthoring changes the generated files; refresh the pack intentionally with `python3 shape/pack.py` before committing a new asset. Existing baseline packs are unchanged.

## Next acceptance gate
Inspect the neutral front, side and shoulder on the visible mannequin alongside the original, without flattering lighting. Human approval of the garment silhouette comes before a further material pass or renewed measurements work. The new detailed cuff and ribbon are still approximations, not exact reconstructions of the photographed decoration.
