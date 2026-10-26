> Current implementation and remaining gates: `CHECKPOINT-0.6.md`. The 0.4/0.5 descriptions below are historical and their old endpoint-motion statistic is not a convergence certificate.

> Latest rendering iteration: see `CHECKPOINT-0.5.md`. The physical simulation described below is unchanged.

# Checkpoint 0.4 — connected draft + guided lower-skirt simulation

## Implemented and actually executed

- The complete v0.2 baseline remains on `main`; the work stays on the draft realism branch.
- An original **geometric draft** of the open abaya now has two armholes and sleeves connected through shared vertices, material-region cuffs, draft UVs and explicit support weights. It is not a recovered or production sewing pattern.
- Blender **4.5.3 LTS** has been installed and run on CPU. Authoring and actual 100-frame cloth runs completed; this is no longer an unexecuted Blender script.
- **The shipped default frees only the lower skirt. The upper garment and sleeves are anchored; the inner dress is fixed.** Full-outer attempts were unstable/unsatisfactory and are retained as failed reports, not presented as successful full-garment simulation.
- The selected static bake is embedded in the offline HTML, with a switch to compare it against v0.2 geometry. It is not a live browser solver and does not fit arbitrary measurements.
- Full authored `.blend`, GLB and report are included in checksummed public transport parts under `lab/assets/`, restored by `lab/restore-pilot.mjs` during the build. No source/asset is redacted from this checkpoint; Blender itself is an independently installed development tool.

## Quality evidence and unresolved defects

See `verification/v0.4/shipping-bake-report.json` for exact metrics and mesh counts. The guided run reaches a low last-ten-frame **RMS motion** under the engineering threshold. This is a limited settling diagnostic, not a quality or fit certificate.

The report still flags nearest-body penetration candidates. These are measured on raw simulation vertices before render smoothing and thickness. The detector is a nearest-surface signed-distance heuristic, not a complete triangle/triangle, body-clearance or self-intersection proof. The shipped mesh is not decimated, to preserve the cuff boundaries. Postprocessing can change clearance; it is not re-certified. **Fit release remains false.**

Full-outer runs are recorded in `rejected-100-frame-report.json` and `rejected-refined-100-frame-report.json`. They showed excessive movement/interpenetration; do not describe them as production-ready or settled.

Rendering uses illustrative crepe/satin/dry-weave presets, not measured MAKA fabric parameters. The default baked mesh casts a ground shadow but does not receive self-shadows, to avoid thin-surface shadow acne; that is a rendering compromise, not cloth validation. Reference photos stay clearly labeled as static.

## Reproduction

```sh
npm install
npm run build:lab
npm run test:lab
npm run start:lab
```

Open `http://localhost:4173/dist/maka-realism-lab.html` or the standalone built HTML. `tools/pilot/README.md` documents regenerating the authored scene and the guided physical bake in Blender. Do not omit `--guided-skirt` when reproducing the shipped asset.

## Acceptance gates

| Gate | State |
|---|---|
| Preserve full baseline/assets | Complete, baseline build + 6 unit tests |
| Connected garment draft / UVs / support groups | Implemented as an authored approximation |
| Actual offline solver execution | Complete for a guided lower-skirt bake; upper/sleeves fixed |
| Full outer garment drape | Failed experiments; pending a better pattern/contact/support model |
| Functional offline viewer/importer | Desktop/mobile browser tests recorded with checkpoint |
| Body/self-intersection clearance | Not accepted; diagnostic candidates remain |
| Real product pattern, dimensions, backside | Unknown/not provided; cannot infer accurately from front photos |
| Real cloth/material calibration | Not accepted |
| Size variants / calibrated retargeting | Pending; one static reference size only |
| Physical phone performance | Not certified; emulated viewport tests are not device benchmarks |
| Public hosted deployment | Not performed |

## Next engineering work

1. Review actual product dimensions and front/side/back construction; replace the geometric block with a reviewed sewing pattern or artist-authored garment.
2. Fix initial garment/body clearance, seam supports and collision topology before another full-outer solve. Do not simply increase simulation frames.
3. Validate full-garment settling, body clearance and self-intersections before replacing the guided default.
4. Tune measured or owned fabric references; review cuffs and armhole close-ups.
5. Only then develop reviewed size variants/retargeting and physical-device performance evidence.

No photorealistic or size-accuracy acceptance claim is made at this checkpoint.
