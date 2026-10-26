import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { glbFixture } from "./fixture.mjs";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (fs.existsSync("/usr/local/bin/chromium")
      ? "/usr/local/bin/chromium"
      : undefined),
  headless: true,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
fs.mkdirSync("qa/lab", { recursive: true });
const reports = [];
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 1050],
    ["mobile", 390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      acceptDownloads: true,
    });
    await context.setOffline(true);
    const page = await context.newPage(),
      errors = [],
      network = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("request", (r) => {
      if (/^https?:/.test(r.url())) network.push(r.url());
    });
    await page.goto("file://" + path.resolve("dist/maka-realism-lab.html"));
    await page.waitForFunction(
      () => window.__lab?.ready && window.__lab.frames >= 1,
    );
    const visibleGarment = async () => {
      const count = await page.evaluate(() => {
        const c = document.querySelector("#viewport canvas"),
          b = document.createElement("canvas");
        b.width = c.width;
        b.height = c.height;
        const ctx = b.getContext("2d");
        ctx.drawImage(c, 0, 0);
        const d = ctx.getImageData(0, 0, b.width, b.height).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4)
          if (d[i + 3] > 0 && d[i] > d[i + 1] + 20) n++;
        return n;
      });
      assert(
        count > 1000,
        "garment must be visibly rendered, not a blank stable canvas",
      );
    };
    const state = () =>
      page.evaluate(() => ({
        source: window.__lab.source,
        report: window.__lab.bakeReport,
        stats: window.__lab.stats,
      }));
    assert.equal((await state()).source, "pilot");
    assert.equal((await state()).report.frames, 100);
    assert(
      (await page.locator("#full-experiment-note").textContent()).includes(
        "100",
      ),
    );
    assert((await state()).stats.triangles < 100000);
    assert.equal((await state()).report.settlingAccepted, false);
    assert.equal(
      (await state()).report.convergence.consecutiveStepSamples.length,
      20,
    );
    await page.screenshot({
      path: `qa/lab/${name}-studio.png`,
      fullPage: true,
    });
    const material = async (expected) => {
      const a = await page.evaluate(() => window.__lab.materialSnapshot());
      assert(a.length > 0);
      assert(a.every((m) => m.normal === expected));
    };
    await material("MAKA_crepe_normal");
    await page.locator("#surface-detail").uncheck();
    await material(null);
    await page.locator("#surface-detail").check();
    await page.locator('[data-fabric="satin"]').click();
    await material("MAKA_satin_normal");
    await page.locator('[data-fabric="crepe"]').click();
    for (const kind of ["back", "side", "cuff"]) {
      await page.locator(`[data-view="${kind}"]`).click();
      assert.equal(await page.evaluate(() => window.__lab.view), kind);
      await page.locator("#viewport").scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await visibleGarment();
      await page.screenshot({
        path: `qa/lab/${name}-${kind}.png`,
        fullPage: true,
      });
    }
    await page.locator("#viewport").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1400);
    await visibleGarment();
    const canvas = page.locator("#viewport canvas"),
      control = await canvas.screenshot(),
      control2 = await canvas.screenshot();
    assert.deepEqual(control, control2, "stable control captures must match");
    await page.locator("#surface-detail").uncheck();
    await page.locator("#viewport").scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    const plain = await canvas.screenshot();
    assert.notDeepEqual(control, plain);
    await page.locator("#surface-detail").check();
    await page.locator("#exposure").fill("1.2");
    await page.locator("#exposure").dispatchEvent("input");
    await page.locator("#light-angle").fill("45");
    await page.locator("#light-angle").dispatchEvent("input");
    assert.equal(await page.evaluate(() => window.__lab.lighting.angle), 45);
    assert.equal(
      await page.evaluate(() => window.__lab.lighting.exposure),
      1.2,
    );
    await page.locator("#reset-light").click();
    assert.equal(await page.evaluate(() => window.__lab.lighting.angle), 0);
    assert.equal(await page.evaluate(() => window.__lab.lighting.exposure), 1);
    await page.locator("#quality").selectOption("eco");
    assert.equal(await page.evaluate(() => window.__lab.pixelRatio), 0.75);
    await page.locator("#quality").selectOption("balanced");
    assert((await page.evaluate(() => window.__lab.pixelRatio)) <= 1);
    await page.locator('[data-light="simple"]').click();
    assert.equal(
      await page.locator('[data-light="simple"]').getAttribute("aria-pressed"),
      "true",
    );
    await page.locator('[data-light="studio"]').click();
    await page.locator('#swatches button[aria-label="رملي"]').click();
    await page.locator('[data-view="detail"]').click();
    await page.screenshot({
      path: `qa/lab/${name}-detail.png`,
      fullPage: true,
    });
    await page.locator('#swatches button[aria-label="فوشيا"]').click();
    await page.locator("#open-reference").click();
    assert(await page.locator("#reference-dialog").isVisible());
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#reference-dialog").isVisible(), false);
    await page.locator('[data-source="legacy"]').click();
    assert.equal((await state()).report, null);
    assert(await page.locator(".simulation-report").isHidden());
    await page.locator('[data-source="pilot"]').click();
    await page.waitForFunction(() => window.__lab.source === "pilot");
    for (let i = 0; i < 3; i++) {
      await page.locator("#file").setInputFiles({
        name: `tiny-${i}.glb`,
        mimeType: "model/gltf-binary",
        buffer: Buffer.from(glbFixture()),
      });
      await page.waitForFunction(
        () => !window.__lab.importBusy && window.__lab.imported,
      );
      assert.equal((await state()).report, null);
      assert.equal((await state()).stats.triangles, 1);
      assert(await page.locator(".simulation-report").isHidden());
      assert(await page.locator("#surface-detail").isDisabled());
    }
    for (const [id, patch] of [
      ["external", { images: [{ uri: "https://example.com/blocked.png" }] }],
      [
        "instanced",
        {
          nodes: [
            {
              mesh: 0,
              extensions: {
                EXT_mesh_gpu_instancing: { attributes: { TRANSLATION: 0 } },
              },
            },
          ],
        },
      ],
      [
        "oversized",
        {
          accessors: [
            { componentType: 5126, count: 1e9, type: "VEC3" },
            { bufferView: 1, componentType: 5123, count: 3, type: "SCALAR" },
          ],
        },
      ],
    ]) {
      await page.evaluate(() => (window.__lab.lastImportError = null));
      await page.locator("#file").setInputFiles({
        name: id + ".glb",
        mimeType: "model/gltf-binary",
        buffer: Buffer.from(glbFixture(patch)),
      });
      await page.waitForFunction(
        () => !window.__lab.importBusy && !!window.__lab.lastImportError,
      );
      assert.equal((await state()).source, "imported");
      assert.equal((await state()).stats.triangles, 1);
    }
    await page.locator("#restore").click();
    await page.waitForFunction(() => window.__lab.source === "pilot");
    assert.equal((await state()).report.frames, 100);
    assert(await page.locator("#surface-detail").isEnabled());
    await page.locator('[data-view="front"]').click();
    await page.locator("#viewport").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1800);
    const before = await page.evaluate(() => window.__lab.frames);
    await page.waitForTimeout(800);
    const after = await page.evaluate(() => window.__lab.frames);
    assert(after - before <= 1, "static demand rendering must stop");
    await page.locator("#rotate").click();
    await page.locator("#viewport").scrollIntoViewIfNeeded();
    const rotating = await page.evaluate(() => window.__lab.frames);
    // Observe a real frame, rather than assuming a slow software runner draws within 1 second.
    await page.waitForFunction(
      (before) => window.__lab.frames > before,
      rotating,
      { timeout: 15000 },
    );
    assert((await page.evaluate(() => window.__lab.frames)) > rotating);
    // Rotation keeps demand rendering active; offscreen rendering must still pause.
    // A tall desktop viewport can still intersect the canvas even at the footer.
    // Force an actually offscreen rectangle, then test the observer (not a scroll assumption).
    await page.setViewportSize({ width, height: Math.min(height, 600) });
    await page.locator("footer").scrollIntoViewIfNeeded();
    assert(
      await page.locator("#viewport").evaluate((e) => {
        const r = e.getBoundingClientRect();
        return r.bottom <= 0 || r.top >= innerHeight;
      }),
      "offscreen test precondition must hold",
    );
    await page.waitForTimeout(700);
    const offscreen = await page.evaluate(() => window.__lab.frames);
    await page.waitForTimeout(600);
    assert((await page.evaluate(() => window.__lab.frames)) - offscreen <= 1);
    await page.locator("#viewport").scrollIntoViewIfNeeded();
    await page.waitForFunction(
      (before) => window.__lab.frames > before,
      offscreen,
      { timeout: 15000 },
    );
    assert((await page.evaluate(() => window.__lab.frames)) > offscreen);
    await page.locator("#rotate").click();
    await page.setViewportSize({ width, height });
    await page.locator("#viewport").scrollIntoViewIfNeeded();
    let contextRecovery = "not attempted on this viewport";
    if (name === "desktop") {
      const supported = await page.evaluate(() => {
        const gl = document
            .querySelector("#viewport canvas")
            .getContext("webgl2"),
          ext = gl.getExtension("WEBGL_lose_context");
        if (!ext) return false;
        window.__restoreTestContext = () => ext.restoreContext();
        ext.loseContext();
        return true;
      });
      if (supported) {
        await page.waitForFunction(() => !window.__lab.ready);
        assert(await page.locator("#file").isDisabled());
        await page.waitForTimeout(700);
        await page.evaluate(() => window.__restoreTestContext());
        await page.waitForFunction(() => window.__lab.ready);
        const afterRestore = await page.evaluate(() => window.__lab.frames);
        await page.waitForFunction(
          (before) => window.__lab.frames > before,
          afterRestore,
          { timeout: 15000 },
        );
        assert.equal(
          await page.evaluate(() => window.__lab.shadowCaching),
          true,
        );
        assert(await page.locator("#file").isEnabled());
        await visibleGarment();
        contextRecovery =
          "PASS: real WebGL lose/restore extension, environment rebuilt";
      } else contextRecovery = "extension unavailable";
    }
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("#save-shot").click(),
    ]);
    assert.equal(download.suggestedFilename(), "maka-realism-pilot.png");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.equal(await page.evaluate(() => localStorage.length), 0);
    assert.equal(await page.evaluate(() => window.__lab.shadowCaching), true);
    assert.deepEqual(errors, []);
    assert.deepEqual(network, []);
    reports.push({
      viewport: name,
      browserVersion: browser.version(),
      size: [width, height],
      result: "PASS",
      renderMetrics: await page.evaluate(() => window.__lab.performanceMetrics),
      physicalPhoneBenchmark: false,
      contextRecovery,
      checks: [
        "strict budget default asset <100K triangles",
        "20 consecutive free-vertex motion samples; fit not accepted",
        "nonempty distinct fabric maps",
        "stable control screenshots and changed texture comparison",
        "back/side/cuff visual captures",
        "light angle/exposure/reset",
        "quality resolution modes",
        "source-bound provenance on legacy/import/restore",
        "three owned imports",
        "external URL, instancing and huge accessor rejected preserving model",
        "demand rendering idle stop, rotation restart and offscreen pause",
        "reference modal/Escape",
        "PNG export",
        "no network/storage/errors/overflow",
      ],
    });
    await context.close();
  }
} catch (error) {
  if (process.env.GITHUB_ACTIONS) {
    const text = String(error.stack || error)
      .slice(0, 7000)
      .replaceAll("%", "%25")
      .replaceAll("\r", "%0D")
      .replaceAll("\n", "%0A");
    console.log("::error title=Browser quality gate::" + text);
  }
  throw error;
} finally {
  await browser.close();
}
fs.writeFileSync(
  "qa/lab/browser-results.json",
  JSON.stringify(reports, null, 2),
);
console.log(JSON.stringify(reports, null, 2));
