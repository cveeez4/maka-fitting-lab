# MAKA Realism Lab — first engineering checkpoint

Run from the repository root:

```sh
npm install
npm run build:lab
npm run test:lab
npm run start:lab
```

Open `http://localhost:4173/dist/maka-realism-lab.html`, or open the built HTML directly in Chrome/Edge. No runtime network resources are needed. Browser test: `npm run test:lab:browser` (Chromium path may be set with `CHROMIUM_PATH`).

The default asset is still procedural v0.2 geometry. This is a material and asset-integration lab, **not** a finished photorealistic abaya, not a physics engine, and not a fit guarantee. See `docs/realism/PLAN.md` for acceptance gates and honest implementation status.

An imported GLB uses its own embedded materials; measurement and fabric overrides are intentionally not applied. Height normalization is for display only. Arbitrary external resource URIs are rejected; files stay on the device.

If Chromium is not installed, run `npm exec playwright install chromium` before the browser tests, or set `CHROMIUM_PATH` to an installed Chromium executable. These tests are functional/offline tests, not a physical phone performance benchmark.
