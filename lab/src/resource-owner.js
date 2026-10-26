export function createResourceOwner() {
  let released = false;
  const pending = new Set(),
    seen = new WeakSet(),
    closed = new WeakSet();
  const free = (r) => {
    if (r.isTexture && r.image?.close && !closed.has(r.image)) {
      closed.add(r.image);
      r.image.close();
    }
    r.dispose?.();
  };
  return {
    track(r) {
      if (!r || seen.has(r)) return r;
      seen.add(r);
      if (released) free(r);
      else pending.add(r);
      return r;
    },
    release() {
      if (released) return;
      released = true;
      for (const r of pending) free(r);
      pending.clear();
    },
    get count() {
      return pending.size;
    },
  };
}
