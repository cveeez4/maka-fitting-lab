# Approximate connected-abaya cloth pilot

This pipeline authors a **geometric draft**, not a production sewing pattern or an automatic reconstruction from one photograph. The garment mesh has two real armholes with sleeves connected through shared boundary vertices. Cuffs are material regions of the same mesh; no detached cylinders are used. A fixed inner dress supports the guided skirt simulation. Draft UVs and reviewed support weights are created explicitly.

## Reproduce

Blender 4.5.3 LTS was used on CPU. Install Blender separately; it is a development tool, not a runtime dependency or part of the repository asset pack.

```sh
npm install
node restore-assets.mjs
node tools/pilot/export_body.mjs
blender -b --threads 4 --python tools/pilot/create_scene.py -- --guided-skirt --output generated/pilot/authored.blend
blender -b generated/pilot/authored.blend --threads 4 --python tools/blender/bake_cloth.py -- --output generated/pilot/abaya-pilot.glb --frames 100
python tools/pilot/pack_asset.py
npm run build:lab
```

The exact delivered `.blend`, exported GLB and simulation report are included in `lab/assets/pilot-*.b64` with per-file SHA256 verification. These parts are public transport encoding, not encryption or omitted files. `lab/restore-pilot.mjs` restores them automatically during the lab build.

## Physics and limitations

- Only the lower skirt of the connected outer garment is free to simulate. All upper vertices above Blender Z=0.78m (including the sleeves) are anchored. This is a guided lower-skirt demonstration, not a successful full-garment free drape. The inner dress is a fixed authored underlayer/collider; the body collider uses the original experimental body asset.
- Gravity and cloth/body/self-collision are evaluated in Blender, then a static frame is exported. There is **no** browser cloth simulation or automatic size fitting.
- Material parameters are generic engineering values, not measured MAKA fabric properties.
- The report includes displacement, motion over the last ten frames and a nearest-body penetration diagnostic. This diagnostic is not a full triangle/triangle or self-intersection certification.
- The final-frame mesh is smoothed, given approximate 0.8mm thickness without decimation of the cuff material boundaries; the export must still satisfy the viewer triangle budget. Postprocessing can alter clearance: inspect front, side, back and cuffs; do not infer production fit from the preview.
- One default reference-size drape is shipped, not multiple fitted sizes. No weight is collected.
- Artist review, actual garment dimensions/pattern, calibrated cloth, settling and comprehensive intersection checks remain necessary before release.
