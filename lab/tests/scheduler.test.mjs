import test from "node:test";
import assert from "node:assert/strict";
import { createRenderScheduler } from "../src/render-scheduler.js";
function fixture() {
  let time = 0,
    frames = 0,
    active = true,
    rotate = false,
    id = 0;
  const q = new Map();
  const s = createRenderScheduler({
    raf: (f) => {
      q.set(++id, f);
      return id;
    },
    cancel: (i) => q.delete(i),
    now: () => time,
    isActive: () => active,
    isRotating: () => rotate,
    render: () => frames++,
  });
  return {
    s,
    q,
    step(t) {
      time = t;
      const a = [...q.values()];
      q.clear();
      for (const f of a) f(time);
    },
    get frames() {
      return frames;
    },
    setActive: (v) => (active = v),
    setRotate: (v) => (rotate = v),
  };
}
test("demand rendering settles and repeated invalidations coalesce", () => {
  const f = fixture();
  f.s.invalidate(50);
  f.s.invalidate(50);
  assert.equal(f.q.size, 1);
  f.step(10);
  f.step(60);
  assert.equal(f.q.size, 0);
  assert.equal(f.frames, 2);
  f.step(100);
  assert.equal(f.frames, 2);
});
test("long stalls remain visible in metrics", () => {
  const f = fixture();
  f.setRotate(true);
  f.s.invalidate();
  for (const t of [1, 17, 1517]) f.step(t);
  assert.equal(f.s.metrics().worstMs, 1500);
  assert.equal(f.s.metrics().includesLongStalls, true);
});
test("pause clears pending work and visibility resumes safely", () => {
  const f = fixture();
  f.s.invalidate();
  f.s.pause();
  assert.equal(f.q.size, 0);
  f.setActive(false);
  f.s.invalidate();
  assert.equal(f.q.size, 0);
  f.setActive(true);
  f.s.resume();
  f.step(1);
  assert.equal(f.frames, 1);
  f.s.stop();
  assert.equal(f.q.size, 0);
});
