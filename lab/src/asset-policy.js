// Conservative static GLB subset. Budgets are checked before the Three loader.
export const limits = Object.freeze({
  bytes: 20 * 1024 * 1024,
  jsonBytes: 2 * 1024 * 1024,
  triangles: 150000,
  vertices: 250000,
  decodedBytes: 32 * 1024 * 1024,
  materials: 32,
  textures: 8,
  textureDimension: 2048,
  textureBytes: 48 * 1024 * 1024,
  nodes: 128,
  primitives: 128,
  accessors: 512,
  bufferViews: 512,
});
const fail = (s) => {
  throw Error(s);
};
const integer = (v, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  Number.isSafeInteger(v) && v >= min && v <= max;
const finite = (a) =>
  Array.isArray(a) && a.every((v) => Number.isFinite(v) && Math.abs(v) <= 1e6);
const widths = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 },
  items = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const supported = new Set([
  "KHR_materials_unlit",
  "KHR_materials_ior",
  "KHR_materials_specular",
  "KHR_materials_clearcoat",
  "KHR_materials_sheen",
  "KHR_materials_transmission",
  "KHR_materials_volume",
  "KHR_materials_emissive_strength",
  "KHR_materials_anisotropy",
  "KHR_texture_transform",
]);
export function imageSize(bytes, mime) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width, height;
  if (mime === "image/png") {
    if (
      bytes.length < 33 ||
      v.getUint32(0) !== 0x89504e47 ||
      v.getUint32(4) !== 0x0d0a1a0a ||
      v.getUint32(8) !== 13 ||
      v.getUint32(12) !== 0x49484452
    )
      fail("رأس PNG غير صالح.");
    width = v.getUint32(16);
    height = v.getUint32(20);
  } else if (mime === "image/jpeg") {
    if (bytes.length < 4 || v.getUint16(0) !== 0xffd8)
      fail("رأس JPEG غير صالح.");
    let o = 2;
    while (o < bytes.length) {
      if (bytes[o++] !== 255) fail("بنية JPEG غير صالحة.");
      while (bytes[o] === 255) o++;
      const marker = bytes[o++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (o + 2 > bytes.length) fail("JPEG ناقص.");
      const n = v.getUint16(o);
      if (n < 2 || o + n > bytes.length) fail("JPEG ناقص.");
      if ([0xc0, 0xc1, 0xc2].includes(marker)) {
        if (n < 8) fail("JPEG ناقص.");
        height = v.getUint16(o + 3);
        width = v.getUint16(o + 5);
        break;
      }
      o += n;
    }
  } else fail("الخامات في التجربة تدعم PNG وJPEG فقط.");
  if (
    !integer(width, 1, limits.textureDimension) ||
    !integer(height, 1, limits.textureDimension)
  )
    fail("صور الخامات أكبر من 2048 بكسل أو أبعادها غير صالحة.");
  return { width, height };
}
export function inspectGLB(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 28)
    fail("الملف مش GLB صالح.");
  if (buffer.byteLength > limits.bytes) fail("الحد الأقصى للملف 20 ميجابايت.");
  const d = new DataView(buffer);
  if (
    d.getUint32(0, true) !== 0x46546c67 ||
    d.getUint32(4, true) !== 2 ||
    d.getUint32(8, true) !== buffer.byteLength
  )
    fail("مطلوب ملف GLB 2.0 كامل.");
  let json, bin;
  for (let o = 12, chunk = 0; o < buffer.byteLength; chunk++) {
    if (o + 8 > buffer.byteLength) fail("بنية GLB غير مكتملة.");
    const n = d.getUint32(o, true),
      type = d.getUint32(o + 4, true);
    if (n % 4 || o + 8 + n > buffer.byteLength)
      fail("بنية GLB أو محاذاة المقاطع غير صالحة.");
    if (chunk === 0 && type === 0x4e4f534a && n <= limits.jsonBytes) {
      json = JSON.parse(
        new TextDecoder("utf-8", { fatal: true })
          .decode(new Uint8Array(buffer, o + 8, n))
          .trim(),
      );
    } else if (chunk === 1 && type === 0x004e4942)
      bin = new Uint8Array(buffer, o + 8, n);
    else fail("مطلوب JSON واحد ثم BIN واحد ضمن الميزانية.");
    o += 8 + n;
  }
  if (!json || !bin || json.asset?.version !== "2.0")
    fail("بيانات GLB غير صالحة.");
  const arrays = [
    "buffers",
    "bufferViews",
    "accessors",
    "meshes",
    "nodes",
    "scenes",
    "materials",
    "textures",
    "images",
    "samplers",
  ];
  for (const k of arrays)
    if (json[k] !== undefined && !Array.isArray(json[k]))
      fail("بنية قوائم GLB غير صالحة.");
  // Reject unsupported features even if an asset forgot extensionsUsed.
  function walk(value, depth = 0) {
    if (depth > 48) fail("بنية JSON متداخلة أكثر من المسموح.");
    if (!value || typeof value !== "object") return;
    if (value.extensions) {
      if (
        typeof value.extensions !== "object" ||
        Array.isArray(value.extensions)
      )
        fail("امتدادات غير صالحة.");
      for (const k of Object.keys(value.extensions))
        if (!supported.has(k))
          fail("امتداد غير مدعوم في الاستيراد الآمن: " + k);
    }
    for (const [k, v] of Object.entries(value)) {
      if (k === "uri" && (typeof v !== "string" || !v.startsWith("data:")))
        fail("الملف فيه روابط خارجية غير مسموحة.");
      walk(v, depth + 1);
    }
  }
  walk(json);
  for (const k of [
    ...(json.extensionsUsed || []),
    ...(json.extensionsRequired || []),
  ])
    if (!supported.has(k)) fail("امتداد غير مدعوم: " + k);
  if (json.skins?.length || json.animations?.length)
    fail("الاستيراد الحالي للموديلات الثابتة فقط، بدون تحريك أو هيكل عظمي.");
  const views = json.bufferViews || [],
    accessors = json.accessors || [],
    meshes = json.meshes || [],
    nodes = json.nodes || [],
    images = json.images || [],
    textures = json.textures || [],
    materials = json.materials || [],
    scenes = json.scenes || [];
  if (
    json.buffers?.length !== 1 ||
    json.buffers[0].uri ||
    !integer(json.buffers[0].byteLength, 1, bin.length) ||
    bin.length - json.buffers[0].byteLength > 3
  )
    fail("مطلوب مخزن BIN واحد مضمّن وبطول صحيح.");
  if (
    views.length > limits.bufferViews ||
    accessors.length > limits.accessors ||
    nodes.length > limits.nodes ||
    meshes.length > 64 ||
    scenes.length > 8 ||
    materials.length > limits.materials ||
    textures.length > limits.textures ||
    images.length > limits.textures
  )
    fail("عدد عناصر الموديل أكبر من الميزانية.");
  const ref = (list, i) => {
    if (!integer(i, 0, list.length - 1)) fail("مرجع عنصر خارج الحدود.");
    return list[i];
  };
  for (const v of views) {
    if (
      v.buffer !== 0 ||
      !integer(v.byteOffset ?? 0) ||
      !integer(v.byteLength, 1) ||
      (v.byteOffset ?? 0) + v.byteLength > json.buffers[0].byteLength
    )
      fail("حدود bufferView غير صالحة.");
    if (
      v.byteStride !== undefined &&
      (!integer(v.byteStride, 4, 252) || v.byteStride % 4)
    )
      fail("خطوة رؤوس غير صالحة.");
  }
  let decodedBytes = 0;
  const layouts = accessors.map((a) => {
    if (a.sparse || a.bufferView === undefined)
      fail("الـ accessor المتناثر أو بلا bufferView غير مدعوم.");
    const view = ref(views, a.bufferView),
      w = widths[a.componentType],
      count = items[a.type];
    if (
      !w ||
      !count ||
      !integer(
        a.count,
        1,
        a.type === "SCALAR" ? limits.triangles * 3 : limits.vertices,
      ) ||
      !integer(a.byteOffset ?? 0) ||
      (a.byteOffset ?? 0) % w
    )
      fail("نوع أو عدد أو محاذاة accessor غير صالحة.");
    const stride = view.byteStride ?? w * count,
      needed = (a.count - 1) * stride + w * count;
    if (
      stride < w * count ||
      stride % w ||
      (a.byteOffset ?? 0) + needed > view.byteLength ||
      ((view.byteOffset ?? 0) + (a.byteOffset ?? 0)) % w
    )
      fail("الـ accessor يتجاوز المخزن أو خطواته غير صالحة.");
    decodedBytes += a.count * count * w;
    if (decodedBytes > limits.decodedBytes)
      fail("ميزانية الذاكرة الهندسية بعد الفك اتجاوزت الحد.");
    if (a.componentType === 5126) {
      const x = new DataView(
        bin.buffer,
        bin.byteOffset + (view.byteOffset ?? 0) + (a.byteOffset ?? 0),
        needed,
      );
      for (let i = 0; i < a.count; i++)
        for (let j = 0; j < count; j++)
          if (
            !Number.isFinite(x.getFloat32(i * stride + j * w, true)) ||
            Math.abs(x.getFloat32(i * stride + j * w, true)) > 1e6
          )
            fail("بيانات هندسية غير محدودة.");
    }
    return { a, view, w, count, stride };
  });
  let primitives = 0;
  const meshCosts = meshes.map((mesh) => {
    if (mesh.weights || !Array.isArray(mesh.primitives))
      fail("مطلوب شبكة ثابتة بدون morph targets.");
    let triangles = 0,
      vertices = 0;
    for (const p of mesh.primitives) {
      if (
        ++primitives > limits.primitives ||
        p.targets ||
        (p.mode !== undefined && p.mode !== 4)
      )
        fail("مطلوب شبكة مثلثات ثابتة ضمن الميزانية.");
      if (
        !p.attributes ||
        Object.keys(p.attributes).some(
          (k) =>
            ![
              "POSITION",
              "NORMAL",
              "TANGENT",
              "TEXCOORD_0",
              "TEXCOORD_1",
              "COLOR_0",
            ].includes(k),
        )
      )
        fail("صفات رؤوس غير مدعومة.");
      const pos = ref(layouts, p.attributes.POSITION);
      if (pos.a.type !== "VEC3" || pos.a.componentType !== 5126)
        fail("POSITION لازم يكون FLOAT VEC3.");
      vertices += pos.a.count;
      for (const [kind, id] of Object.entries(p.attributes)) {
        const l = ref(layouts, id);
        if (l.a.count !== pos.a.count) fail("أعداد صفات الرؤوس غير متطابقة.");
        const allowed =
          kind === "NORMAL"
            ? ["VEC3"]
            : kind === "TANGENT"
              ? ["VEC4"]
              : kind.startsWith("TEXCOORD")
                ? ["VEC2"]
                : kind === "COLOR_0"
                  ? ["VEC3", "VEC4"]
                  : ["VEC3"];
        if (!allowed.includes(l.a.type)) fail("أبعاد صفة رؤوس غير صالحة.");
      }
      const index = p.indices === undefined ? null : ref(layouts, p.indices),
        n = index?.a.count ?? pos.a.count;
      if (n % 3) fail("عدد رؤوس المثلثات غير مكتمل.");
      if (index) {
        if (
          index.a.type !== "SCALAR" ||
          ![5121, 5123, 5125].includes(index.a.componentType) ||
          index.a.normalized ||
          index.view.byteStride
        )
          fail("فهارس غير صالحة.");
        const v = new DataView(
          bin.buffer,
          bin.byteOffset +
            (index.view.byteOffset ?? 0) +
            (index.a.byteOffset ?? 0),
        );
        for (let i = 0; i < n; i++) {
          const k =
            index.w === 1
              ? v.getUint8(i)
              : index.w === 2
                ? v.getUint16(i * 2, true)
                : v.getUint32(i * 4, true);
          if (k >= pos.a.count) fail("فهرس رأس خارج الحدود.");
        }
      }
      if (p.material !== undefined) ref(materials, p.material);
      triangles += n / 3;
    }
    return { triangles, vertices };
  });
  let textureBytes = 0;
  for (const image of images) {
    let bytes,
      mime = image.mimeType;
    if (image.uri !== undefined) {
      if (image.bufferView !== undefined || typeof image.uri !== "string")
        fail("صورة غير صالحة.");
      const m =
        /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/]*={0,2})$/.exec(
          image.uri,
        );
      if (!m || m[2].length % 4)
        fail("مطلوب صورة PNG أو JPEG مضمّنة بدون روابط.");
      mime = m[1];
      bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    } else {
      const v = ref(views, image.bufferView);
      bytes = bin.subarray(
        v.byteOffset ?? 0,
        (v.byteOffset ?? 0) + v.byteLength,
      );
    }
    const s = imageSize(bytes, mime);
    textureBytes += Math.ceil((s.width * s.height * 4 * 4) / 3);
    if (textureBytes > limits.textureBytes)
      fail("إجمالي ذاكرة صور الخامات أكبر من الميزانية.");
  }
  for (const texture of textures) {
    ref(images, texture.source);
    if (texture.sampler !== undefined)
      ref(json.samplers || [], texture.sampler);
  }
  function checkTextures(value) {
    if (!value || typeof value !== "object") return;
    for (const [k, v] of Object.entries(value)) {
      if (k.endsWith("Texture") && v && typeof v === "object")
        ref(textures, v.index);
      checkTextures(v);
    }
  }
  for (const m of materials) checkTextures(m);
  const parents = new Uint8Array(nodes.length);
  for (const n of nodes) {
    if (n.skin !== undefined || n.weights || n.camera !== undefined)
      fail("الموديل الثابت لا يدعم skin/weights/camera.");
    for (const key of ["matrix", "translation", "rotation", "scale"])
      if (
        n[key] !== undefined &&
        (!finite(n[key]) ||
          n[key].length !==
            { matrix: 16, translation: 3, rotation: 4, scale: 3 }[key])
      )
        fail("تحويل هندسي غير صالح.");
    if (n.matrix && [n.translation, n.rotation, n.scale].some(Boolean))
      fail("تحويلات متعارضة.");
    if (n.mesh !== undefined) ref(meshes, n.mesh);
    if (n.children !== undefined && !Array.isArray(n.children))
      fail("أبناء العقدة غير صالحين.");
    for (const id of n.children || []) {
      ref(nodes, id);
      if (++parents[id] > 1) fail("العقدة لها أكثر من أصل.");
    }
  }
  const marks = new Uint8Array(nodes.length);
  function cycle(i, depth = 0) {
    if (depth > 32 || marks[i] === 1)
      fail("رسم العقد دائري أو عميق أكثر من المسموح.");
    if (marks[i] === 2) return;
    marks[i] = 1;
    for (const j of nodes[i].children || []) cycle(j, depth + 1);
    marks[i] = 2;
  }
  for (let i = 0; i < nodes.length; i++) cycle(i);
  let triangles = 0,
    vertices = 0;
  const active = ref(scenes, json.scene ?? 0);
  if (!Array.isArray(active.nodes)) fail("المشهد بلا عقد.");
  const seen = new Set();
  function cost(i) {
    ref(nodes, i);
    if (seen.has(i)) fail("عقدة مكررة في المشهد.");
    seen.add(i);
    const n = nodes[i];
    if (n.mesh !== undefined) {
      triangles += meshCosts[n.mesh].triangles;
      vertices += meshCosts[n.mesh].vertices;
    }
    for (const j of n.children || []) cost(j);
  }
  for (const id of active.nodes) cost(id);
  if (!triangles || triangles > limits.triangles || vertices > limits.vertices)
    fail("الموديل فارغ أو أكبر من ميزانية المثلثات/الرؤوس.");
  return {
    triangles,
    vertices,
    decodedBytes,
    textureBytes,
    materials: materials.length,
    textures: textures.length,
  };
}
export function inspectLoaded(root) {
  let triangles = 0,
    meshes = 0,
    vertices = 0,
    textureBytes = 0;
  const seen = new Set();
  root.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    if (o.isSkinnedMesh || o.isInstancedMesh)
      fail("الموديلات المتحركة أو المتكررة غير مدعومة.");
    const pos = o.geometry?.attributes?.position;
    if (!pos) fail("شبكة من غير رؤوس.");
    vertices += pos.count;
    for (const a of Object.values(o.geometry.attributes))
      for (const n of a.array ?? a.data?.array ?? [])
        if (!Number.isFinite(n)) fail("الشبكة فيها أرقام غير صالحة.");
    triangles += (o.geometry.index?.count ?? pos.count) / 3;
    for (const m of Array.isArray(o.material) ? o.material : [o.material])
      for (const t of Object.values(m || {}))
        if (t?.isTexture && !seen.has(t)) {
          seen.add(t);
          const im = t.image;
          if (
            !im ||
            !integer(im.width, 1, limits.textureDimension) ||
            !integer(im.height, 1, limits.textureDimension)
          )
            fail("صور الخامات أكبر من 2048 بكسل أو أبعادها غير صالحة.");
          textureBytes += Math.ceil((im.width * im.height * 4 * 4) / 3);
        }
  });
  if (
    !meshes ||
    meshes > limits.primitives ||
    triangles > limits.triangles ||
    vertices > limits.vertices ||
    textureBytes > limits.textureBytes
  )
    fail("الموديل أكبر من الميزانية بعد التحميل.");
  return { triangles, meshes, vertices, textureBytes };
}
