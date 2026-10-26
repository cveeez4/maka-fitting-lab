import { fullExperimentReport } from "../../generated/full-experiment-report.js";
import { pilotBase64, pilotReport } from "../../generated/pilot-glb.js";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { parseOwnedGLB } from "./owned-loader.js";
import { createRenderScheduler } from "./render-scheduler.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { makeGarment } from "../../src/garments.js";
import { reconstructVertices } from "../../vendor/body-model/src/shape.js";
import { createSkeleton } from "../../vendor/body-model/src/skeleton.js";
import {
  baseModel,
  statistics,
  coefficientBase64,
} from "../../generated/body-data.js";
import { bodyCoefficients, defaults } from "../../src/measurements.js";
import { photos } from "../../generated/photos.js";
import { makeFabricData } from "./fabric-data.js";
import { inspectGLB, inspectLoaded, limits } from "./asset-policy.js";
const $ = (s) => document.querySelector(s);
const status = (t) => {
  $("#status").textContent = t;
};
const state = {
  ...defaults,
  product: "contrast",
  color: "#8e1544",
  ease: 26,
  material: "crepe",
  studio: true,
  imported: false,
  source: "pilot",
  surfaceDetail: true,
  exposure: 1,
  lightAngle: 0,
};
const decode = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer;
const coefficients = new Float32Array(decode(coefficientBase64));
const model = { baseModel, statistics };
let renderer,
  scene,
  camera,
  controls,
  garment,
  environment,
  environmentTarget,
  loadedStats,
  frame = 0,
  scheduler,
  inView = true,
  importBusy = false;
const started = performance.now();
let firstFrameMs = null;
const invalidate = (ms = 350) => scheduler?.invalidate(ms);
const presets = {
  crepe: {
    label: "كريب مطفي",
    roughness: 0.82,
    sheen: 0.32,
    anisotropy: 0.08,
    normal: 0.28,
  },
  satin: {
    label: "ساتان",
    roughness: 0.36,
    sheen: 0.28,
    anisotropy: 0.55,
    normal: 0.16,
  },
  linen: {
    label: "نسيج جاف",
    roughness: 0.93,
    sheen: 0.16,
    anisotropy: 0.04,
    normal: 0.42,
  },
};
const fabricMaps = new Map();
function fabricTexture(kind) {
  if (fabricMaps.has(kind)) return fabricMaps.get(kind);
  const data = makeFabricData(kind),
    maps = {};
  for (const key of ["normal", "roughness"]) {
    const texture = new THREE.DataTexture(
      data[key],
      data.size,
      data.size,
      THREE.RGBAFormat,
    );
    texture.name = `MAKA_${kind}_${key}`;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 3);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;
    maps[key] = texture;
  }
  fabricMaps.set(kind, maps);
  return maps;
}
function dispose(root) {
  if (!root) return;
  if (root.userData.releaseResources) {
    root.userData.releaseResources();
    root.removeFromParent();
    return;
  }
  const geoms = new Set(),
    mats = new Set();
  root.traverse((o) => {
    if (o.geometry) geoms.add(o.geometry);
    if (o.material)
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        mats.add(m);
  });
  for (const g of geoms) g.dispose();
  for (const m of mats) {
    if (root.userData.localImport)
      for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
    m.dispose();
  }
  root.removeFromParent();
}
function geometry() {
  const v = reconstructVertices(
    baseModel,
    coefficients,
    bodyCoefficients(model, state),
  );
  let min = Infinity,
    max = -Infinity;
  for (let i = 1; i < v.length; i += 3) {
    min = Math.min(min, v[i]);
    max = Math.max(max, v[i]);
  }
  return makeGarment(
    state,
    createSkeleton(baseModel, v),
    state.height / 100 / (max - min),
    min,
  );
}
function applyMaterial() {
  if (!garment || state.imported) return;
  const p = presets[state.material],
    maps = fabricTexture(state.material);
  garment.traverse((o) => {
    if (!o.material) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m.isMeshPhysicalMaterial || m.userData.fixedLayer) continue;
      if (state.source === "pilot" && m.name.startsWith("MAKA_outer"))
        m.color.set(state.color);
      const detail = state.surfaceDetail && !m.userData.noFabricUV;
      m.roughness = detail ? 1 : p.roughness;
      m.sheen = p.sheen;
      m.sheenRoughness = 0.75;
      m.sheenColor.copy(m.color).lerp(new THREE.Color("#fff4e8"), 0.12);
      m.anisotropy = p.anisotropy;
      m.anisotropyRotation = Math.PI / 2;
      m.bumpMap = null;
      m.normalMap = detail ? maps.normal : null;
      m.roughnessMap = detail ? maps.roughness : null;
      m.normalScale.setScalar(p.normal);
      m.envMapIntensity = state.studio ? 0.9 : 0;
      m.needsUpdate = true;
    }
  });
  $("#fabric-description").textContent =
    p.label + " — نسيج إجرائي بصري، مش مسح أو قياس لخامة المنتج.";
  if (window.__lab) window.__lab.surfaceDetail = state.surfaceDetail;
  invalidate();
}
function updateStats() {
  const s = inspectLoaded(garment);
  loadedStats = s;
  $("#triangles").textContent = s.triangles.toLocaleString("en-US");
  $("#meshes").textContent = s.meshes;
  $("#asset-kind").textContent = state.imported
    ? "GLB محلي — خاماته الأصلية"
    : state.source === "pilot"
      ? "محاكاة جزئية مثبتة"
      : "هندسة 0.2 — خامة تجريبية";
  window.__lab.stats = s;
  window.__lab.imported = state.imported;
  window.__lab.source = state.source;
  window.__lab.bakeReport = state.source === "pilot" ? pilotReport : null;
  const report = $(".simulation-report");
  report.hidden = state.source !== "pilot";
  $("#asset-provenance").textContent =
    state.source === "pilot"
      ? "تقرير مرتبط بالمسودة المضمّنة فقط"
      : state.source === "imported"
        ? "الملف المستورد: لا يوجد دليل محاكاة أو دقة مقاس مرفق"
        : "هندسة إجرائية قديمة: بدون تقرير محاكاة";
  invalidate();
}
function build() {
  state.source = "legacy";
  dispose(garment);
  garment = geometry();
  scene.add(garment);
  renderer.shadowMap.needsUpdate = true;
  applyMaterial();
  updateStats();
}
function updateLighting() {
  renderer.shadowMap.needsUpdate = true;
  const studio = state.studio,
    angle = (state.lightAngle * Math.PI) / 180,
    key = scene.getObjectByName("key");
  scene.environment = studio ? environment : null;
  scene.environmentRotation.y = angle;
  key.position.set(
    -2 * Math.cos(angle) + 3 * Math.sin(angle),
    3,
    3 * Math.cos(angle) + 2 * Math.sin(angle),
  );
  key.intensity = studio ? 2.4 : 3;
  scene.getObjectByName("fill").intensity = studio ? 0.65 : 1.5;
  scene.getObjectByName("hemisphere").intensity = studio ? 0.65 : 1.3;
  renderer.toneMappingExposure = state.exposure * (studio ? 0.95 : 1.15);
  $("#exposure-value").textContent = state.exposure.toFixed(2);
  $("#angle-value").textContent = state.lightAngle + "°";
  if (window.__lab)
    window.__lab.lighting = {
      angle: state.lightAngle,
      exposure: state.exposure,
      studio,
    };
  invalidate();
}
function lighting(studio) {
  state.studio = studio;
  updateLighting();
  document
    .querySelectorAll("[data-light]")
    .forEach((b) =>
      b.setAttribute(
        "aria-pressed",
        String((b.dataset.light === "studio") === studio),
      ),
    );
  applyMaterial();
}
function view(kind) {
  const poses = {
    front: [0, 0.96, 2.9, 0, 0.73, 0],
    back: [0, 0.96, -2.9, 0, 0.73, 0],
    side: [2.8, 0.96, 0, 0, 0.73, 0],
    detail: [0.18, 1.1, 0.95, 0.1, 1.07, 0.02],
    cuff: [0.93, 0.95, 1.05, 0.4, 0.96, 0],
  };
  const p = poses[kind] || poses.front;
  controls.target.set(...p.slice(3));
  camera.position.set(...p.slice(0, 3));
  controls.update();
  document
    .querySelectorAll("[data-view]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.view === kind)),
    );
  if (window.__lab) window.__lab.view = kind;
  invalidate(600);
}
$("#surface-detail").onchange = (e) => {
  state.surfaceDetail = e.target.checked;
  applyMaterial();
};
$("#exposure").oninput = (e) => {
  state.exposure = Number(e.target.value);
  updateLighting();
};
$("#light-angle").oninput = (e) => {
  state.lightAngle = Number(e.target.value);
  updateLighting();
};
$("#reset-light").onclick = () => {
  state.exposure = 1;
  state.lightAngle = 0;
  $("#exposure").value = "1";
  $("#light-angle").value = "0";
  lighting(true);
};
function cleanGLTF(g) {
  g.traverse((o) => {
    if (o.isMesh) {
      o.geometry.computeBoundingBox();
      o.geometry.computeBoundingSphere();
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  const box = new THREE.Box3().setFromObject(g),
    size = box.getSize(new THREE.Vector3());
  if (
    ![...box.min.toArray(), ...box.max.toArray()].every(
      (n) => Number.isFinite(n) && Math.abs(n) <= 1e6,
    ) ||
    size.y < 1e-6 ||
    Math.max(size.x, size.z) / size.y > 20
  )
    throw Error("أبعاد الموديل غير صالحة.");
  const scale = 1.4 / size.y;
  g.scale.multiplyScalar(scale);
  const after = new THREE.Box3().setFromObject(g),
    center = after.getCenter(new THREE.Vector3());
  g.position.x -= center.x;
  g.position.z -= center.z;
  g.position.y -= after.min.y;
  return g;
}
let loadSequence = 0;
$("#file").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file || importBusy) return;
  const seq = ++loadSequence;
  let candidate;
  importBusy = true;
  $("#file").disabled = true;
  try {
    if (file.size > limits.bytes) throw Error("الحد الأقصى 20 ميجابايت.");
    status("بنراجع الملف وحدود الذاكرة قبل الفك…");
    const buffer = await file.arrayBuffer();
    const preflight = inspectGLB(buffer);
    candidate = await parseOwnedGLB(buffer);
    if (seq !== loadSequence) {
      dispose(candidate);
      candidate = null;
      return;
    }
    const stats = inspectLoaded(candidate);
    if (stats.triangles !== preflight.triangles)
      throw Error("تكلفة الموديل بعد الفك مختلفة عن الفحص الأولي.");
    const g = cleanGLTF(candidate);
    state.source = "imported";
    setSourceButtons();
    dispose(garment);
    garment = g;
    candidate = null;
    state.imported = true;
    scene.add(g);
    renderer.shadowMap.needsUpdate = true;
    $("#asset-name").textContent = file.name;
    $("#source-note").textContent =
      "أصل مستورد بخاماته الأصلية، بدون دليل محاكاة أو دقة مقاس. توحيد الارتفاع للعرض فقط.";
    $("#material-controls").disabled = true;
    $("#color-controls").disabled = true;
    updateStats();
    view("front");
    status("اتفتح الموديل محليًا بعد فحص الموارد. لا يوجد اعتماد للمقاس.");
  } catch (err) {
    if (candidate) dispose(candidate);
    status("تعذّر فتح الموديل: " + err.message);
    window.__lab.lastImportError = err.message;
  } finally {
    e.target.value = "";
    importBusy = false;
    $("#file").disabled = !window.__lab.ready;
    invalidate();
  }
};
function setSourceButtons() {
  document
    .querySelectorAll("[data-source]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.source === state.source)),
    );
}
async function loadPilot() {
  const seq = ++loadSequence;
  const parsed = await new GLTFLoader().parseAsync(decode(pilotBase64), "");
  if (seq !== loadSequence) {
    dispose(parsed.scene);
    return;
  }
  inspectLoaded(parsed.scene);
  const g = cleanGLTF(parsed.scene);
  g.traverse((o) => {
    if (!o.isMesh) return;
    const upgrade = (m) => {
      if (!m.name.startsWith("MAKA_outer")) {
        m.userData.fixedLayer = true;
        return m;
      }
      const next = new THREE.MeshPhysicalMaterial({
        name: m.name,
        color: m.color.clone(),
        roughness: m.roughness,
        metalness: m.metalness,
        side: THREE.FrontSide,
        sheenColor: m.color.clone().lerp(new THREE.Color("#fff5ef"), 0.1),
        map: m.map,
        normalMap: m.normalMap,
        roughnessMap: m.roughnessMap,
      });
      next.userData.noFabricUV = !o.geometry.hasAttribute("uv");
      m.dispose();
      return next;
    };
    o.material = Array.isArray(o.material)
      ? o.material.map(upgrade)
      : upgrade(o.material);
    o.receiveShadow = false;
  });
  dispose(garment);
  garment = g;
  state.imported = false;
  state.source = "pilot";
  scene.add(g);
  renderer.shadowMap.needsUpdate = true;
  $("#asset-name").textContent = "المفتوحة بأساور — مسودة جزئية";
  $("#source-note").textContent =
    "قطعة متصلة الأكمام. الصدر والكم ثابتين؛ محاكاة Blender للجزء السفلي فقط. حجم واحد، ومش ضمان للمقاس.";
  $("#material-controls").disabled = false;
  $("#color-controls").disabled = false;
  applyMaterial();
  updateStats();
  setSourceButtons();
  view("front");
}
$("#restore").onclick = () =>
  loadPilot()
    .then(() => status("رجعنا لمسودة القماش المحاكى."))
    .catch((e) => status(e.message));
for (const b of document.querySelectorAll("[data-source]"))
  b.onclick = () => {
    if (b.dataset.source === "pilot") {
      loadPilot().catch((e) => status(e.message));
    } else {
      loadSequence++;
      state.imported = false;
      build();
      $("#asset-name").textContent = "هندسة 0.2 — للمقارنة";
      $("#source-note").textContent =
        "الشكل الإجرائي القديم للمقارنة. مش محاكاة قماش.";
      $("#material-controls").disabled = false;
      $("#color-controls").disabled = false;
      setSourceButtons();
      view("front");
    }
  };
for (const [id, p] of Object.entries(presets)) {
  const b = document.createElement("button");
  b.textContent = p.label;
  b.dataset.fabric = id;
  b.setAttribute("aria-pressed", String(id === state.material));
  b.onclick = () => {
    state.material = id;
    document
      .querySelectorAll("[data-fabric]")
      .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    applyMaterial();
  };
  $("#fabrics").append(b);
}
for (const c of [
  { name: "فوشيا", hex: "#8e1544", ref: "contrast-magenta" },
  { name: "رملي", hex: "#b99e84", ref: "contrast-sand" },
  { name: "أزرق", hex: "#163ca2", ref: "contrast-blue" },
  { name: "بني", hex: "#704547", ref: "contrast-brown" },
]) {
  const b = document.createElement("button");
  b.style.setProperty("--swatch", c.hex);
  b.setAttribute("aria-label", c.name);
  b.setAttribute("aria-pressed", String(c.hex === state.color));
  b.onclick = () => {
    state.color = c.hex;
    document
      .querySelectorAll("#swatches button")
      .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    $("#reference").src = photos[c.ref];
    $("#reference-full").src = photos[c.ref];
    if (state.source === "pilot") {
      applyMaterial();
    } else {
      build();
    }
  };
  $("#swatches").append(b);
}
const convergence = pilotReport.convergence;
$("#simulation-report-text").textContent =
  `Blender ${pilotReport.blender} · ${pilotReport.frames} إطارًا. فرق موضع طرفَي نافذة 10 إطارات (ليس إثبات استقرار): ${((pilotReport.endpointDeltaRmsOver10FramesMeters ?? pilotReport.rmsMotionLast10FramesMeters) * 1000).toFixed(2)} مم. ` +
  (convergence
    ? `فحص ${convergence.consecutiveStepSamples.length} خطوة متتالية على ${convergence.freeVertexCount} رأس حرّ فقط. اختبار الحركة المحدود: ${convergence.limitedMotionGatePassed ? "اجتاز" : "لم يجتز"}؛ اعتماد المقاس والتداخل: غير مقبول.`
    : "التقرير القديم لا يحتوي على قياس حركة متتالية؛ الاستقرار غير معتمد.");
$("#full-experiment-note").textContent = fullExperimentReport
  ? `تجربة كاملة منفصلة للأكمام والجسم: ${fullExperimentReport.frames} إطارًا؛ لم تُعتمد. أعلى RMS خطوة للرؤوس الحرة: ${(Math.max(...fullExperimentReport.convergence.consecutiveStepSamples.map((s) => s.freeVertexRmsMeters)) * 1000).toFixed(2)} مم. العرض الحالي محاكاة للذيل فقط.`
  : "لا توجد تجربة كاملة معتمدة.";
$("#reference").src = photos["contrast-magenta"];
$("#reference-full").src = photos["contrast-magenta"];
const dialog = $("#reference-dialog");
$("#open-reference").onclick = () => dialog.showModal();
$("#close-reference").onclick = () => dialog.close();
dialog.onclick = (e) => {
  if (e.target === dialog) dialog.close();
};
for (const b of document.querySelectorAll("[data-light]"))
  b.onclick = () => lighting(b.dataset.light === "studio");
for (const b of document.querySelectorAll("[data-view]"))
  b.onclick = () => view(b.dataset.view);
$("#rotate").onclick = () => {
  controls.autoRotate = !controls.autoRotate;
  $("#rotate").setAttribute("aria-pressed", String(controls.autoRotate));
  invalidate(600);
};
$("#save-shot").onclick = () => {
  renderer.render(scene, camera);
  renderer.domElement.toBlob((blob) => {
    if (!blob) {
      status("تعذّر حفظ الصورة.");
      return;
    }
    const a = document.createElement("a"),
      url = URL.createObjectURL(blob);
    a.href = url;
    a.download = "maka-realism-pilot.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status("اتحفظت لقطة محليًا. اللقطة عرض تجريبي، مش ضمان للمقاس.");
  });
};
window.__lab = {
  ready: false,
  stats: null,
  imported: false,
  get shadowCaching() {
    return renderer?.shadowMap.autoUpdate === false;
  },
  materialSnapshot: () => {
    const found = [];
    garment?.traverse((o) => {
      for (const m of o.material
        ? Array.isArray(o.material)
          ? o.material
          : [o.material]
        : [])
        if (
          m.isMeshPhysicalMaterial &&
          !m.userData.fixedLayer &&
          !m.userData.noFabricUV
        )
          found.push({
            normal: m.normalMap?.name || null,
            roughness: m.roughnessMap?.name || null,
          });
    });
    return found;
  },
  get frames() {
    return frame;
  },
  get performanceMetrics() {
    return {
      ...scheduler?.metrics(),
      firstFrameMs,
      physicalDeviceBenchmark: false,
    };
  },
  get importBusy() {
    return importBusy;
  },
  limits,
};
$("#file").disabled = true;
try {
  scene = new THREE.Scene();
  scene.background = new THREE.Color("#eae3d8");
  scene.environmentIntensity = 0.5;
  camera = new THREE.PerspectiveCamera(35, 1, 0.05, 15);
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute(
    "aria-label",
    "معاينة تجريبية للعباية. ليست محاكاة للمقاس.",
  );
  $("#viewport").append(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 0.65;
  controls.maxDistance = 5;
  controls.maxPolarAngle = Math.PI * 0.59;
  controls.minPolarAngle = Math.PI * 0.27;
  controls.autoRotateSpeed = 0.6;
  function rebuildEnvironment() {
    environmentTarget?.dispose();
    const pmrem = new THREE.PMREMGenerator(renderer),
      room = new RoomEnvironment();
    environmentTarget = pmrem.fromScene(room, 0.04);
    environment = environmentTarget.texture;
    room.dispose();
    pmrem.dispose();
    scene.environment = state.studio ? environment : null;
  }
  rebuildEnvironment();
  const hemi = new THREE.HemisphereLight("#fff8ed", "#a29586", 1.3);
  hemi.name = "hemisphere";
  scene.add(hemi);
  const key = new THREE.DirectionalLight("#fff8f0", 2.5);
  key.name = "key";
  key.position.set(-2, 3, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, {
    left: -1.2,
    right: 1.2,
    top: 1.9,
    bottom: -0.6,
  });
  key.shadow.normalBias = 0.004;
  key.shadow.bias = -0.0002;
  key.shadow.radius = 4;
  key.shadow.blurSamples = 8;
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 8;
  scene.add(key);
  const fill = new THREE.DirectionalLight("#ebe9ff", 1.4);
  fill.name = "fill";
  fill.position.set(2, 2, -2);
  scene.add(fill);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.ShadowMaterial({ opacity: 0.17 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);
  const quality = () => {
    const mode = $("#quality").value,
      ratio =
        mode === "detail"
          ? Math.min(devicePixelRatio, 1.5)
          : mode === "eco"
            ? 0.75
            : Math.min(devicePixelRatio, 1);
    renderer.setPixelRatio(ratio);
    window.__lab.pixelRatio = ratio;
    invalidate();
  };
  $("#quality").onchange = quality;
  quality();
  const resize = () => {
    const box = $("#viewport").getBoundingClientRect();
    renderer.setSize(box.width, box.height);
    camera.aspect = box.width / box.height;
    camera.fov = box.width < 440 ? 39 : 35;
    camera.updateProjectionMatrix();
    invalidate();
  };
  new ResizeObserver(resize).observe($("#viewport"));
  resize();
  let lastActive = null;
  scheduler = createRenderScheduler({
    isActive: () => window.__lab.ready && !document.hidden && inView,
    isRotating: () => controls.autoRotate,
    render: (now) => {
      controls.update(
        lastActive === null ? 0 : Math.min(0.1, (now - lastActive) / 1000),
      );
      lastActive = now;
      renderer.render(scene, camera);
      frame++;
      if (firstFrameMs === null) firstFrameMs = performance.now() - started;
      const m = scheduler.metrics();
      if (m.p95Ms !== null) $("#fps").textContent = Math.round(m.p95Ms) + " ms";
    },
  });
  controls.addEventListener("change", () => invalidate(250));
  controls.addEventListener("start", () => invalidate(600));
  controls.addEventListener("end", () => invalidate(600));
  document.addEventListener("visibilitychange", () => {
    lastActive = null;
    if (document.hidden) scheduler.pause();
    else scheduler.resume();
  });
  new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    lastActive = null;
    if (inView) scheduler.resume();
    else scheduler.pause();
  }).observe($("#viewport"));
  lighting(true);
  view("front");
  loadPilot()
    .then(() => {
      window.__lab.ready = true;
      $("#loading").hidden = true;
      $("#file").disabled = false;
      invalidate(650);
    })
    .catch((e) => {
      $("#loading").textContent = "تعذّر فتح أصل المحاكاة: " + e.message;
      window.__lab.error = e.message;
    });
  renderer.domElement.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    window.__lab.ready = false;
    $("#file").disabled = true;
    scheduler.pause();
    $("#loading").hidden = false;
    $("#loading").textContent = "العرض اتوقف؛ بننتظر رجوع الرسوم.";
  });
  renderer.domElement.addEventListener("webglcontextrestored", () => {
    rebuildEnvironment();
    window.__lab.ready = true;
    $("#loading").hidden = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.shadowMap.needsUpdate = true;
    $("#file").disabled = false;
    scheduler.resume();
    status("رجع عرض الرسوم.");
  });
} catch (e) {
  $("#loading").textContent =
    "العرض غير متاح. جرّبي Chrome أو Edge مع تسريع الرسوم.";
  status(e.message);
  window.__lab.error = e.message;
  console.error(e);
}
