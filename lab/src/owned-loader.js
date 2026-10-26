import { createResourceOwner } from "./resource-owner.js";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
// Resources resolving after cancellation are immediately released, including failed parses.
export async function parseOwnedGLB(buffer) {
  const owner = createResourceOwner(),
    track = (r) => owner.track(r),
    release = () => owner.release();
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    if (url.startsWith("data:") || url.startsWith("blob:")) return url;
    throw Error("تحميل الروابط الخارجية غير مسموح.");
  });
  const loader = new GLTFLoader(manager);
  loader.register((parser) => {
    const get = parser.getDependency.bind(parser);
    parser.getDependency = (type, index) =>
      get(type, index).then((value) => {
        if (type === "texture" || type === "material") track(value);
        if (type === "mesh" || type === "node")
          value?.traverse?.((o) => {
            if (o.geometry) track(o.geometry);
            for (const m of o.material
              ? Array.isArray(o.material)
                ? o.material
                : [o.material]
              : [])
              track(m);
          });
        return value;
      });
    return { name: "MAKA_resource_ownership" };
  });
  try {
    const parsed = await loader.parseAsync(buffer, "");
    parsed.scene.traverse((o) => {
      if (o.geometry) track(o.geometry);
      for (const m of o.material
        ? Array.isArray(o.material)
          ? o.material
          : [o.material]
        : []) {
        track(m);
        for (const v of Object.values(m)) if (v?.isTexture) track(v);
      }
    });
    parsed.scene.userData.releaseResources = release;
    return parsed.scene;
  } catch (e) {
    release();
    throw e;
  }
}
