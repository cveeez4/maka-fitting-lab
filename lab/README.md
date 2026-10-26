# MAKA Realism Lab — first engineering checkpoint

Run from the repository root:

```sh
npm install
npm run build:lab
npm run test:lab
npm run start:lab
```

Open `http://localhost:4173/dist/maka-realism-lab.html`, or open the built HTML directly in Chrome/Edge. No runtime network resources are needed. Browser test: `npm run test:lab:browser` (Chromium path may be set with `CHROMIUM_PATH`).

The default asset is now an authored connected-sleeve abaya draft with an actual Blender cloth bake of the lower skirt, with the upper garment and sleeves anchored. It is a **static, single-reference-size approximation**, not a production pattern, calibrated fit, or browser physics. A built-in switch compares it against v0.2 geometry. See `docs/realism/PLAN.md` and `verification/v0.4/` for actual simulation diagnostics and open quality gates.

An imported GLB uses its own embedded materials; measurement and fabric overrides are intentionally not applied. Height normalization is for display only. Arbitrary external resource URIs are rejected; files stay on the device.

If Chromium is not installed, run `npm exec playwright install chromium` before the browser tests, or set `CHROMIUM_PATH` to an installed Chromium executable. These tests are functional/offline tests, not a physical phone performance benchmark.
