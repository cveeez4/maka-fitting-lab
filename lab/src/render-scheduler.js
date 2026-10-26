// Demand rendering; a small damping tail follows interactions, not an endless loop.
export function createRenderScheduler({
  raf = (cb) => requestAnimationFrame(cb),
  cancel = (id) => cancelAnimationFrame(id),
  now = () => performance.now(),
  render,
  isActive = () => true,
  isRotating = () => false,
}) {
  let pending = 0,
    until = 0,
    stopped = false;
  const samples = [];
  let previous = null,
    totalFrames = 0;
  const request = () => {
    if (!stopped && !pending && isActive()) pending = raf(tick);
  };
  function tick(t) {
    pending = 0;
    if (stopped || !isActive()) {
      previous = null;
      return;
    }
    if (previous !== null) {
      samples.push(t - previous);
      if (samples.length > 180) samples.shift();
    }
    previous = t;
    render(t);
    totalFrames++;
    if (isRotating() || t < until) request();
    else previous = null;
  }
  return {
    invalidate(ms = 350) {
      until = Math.max(until, now() + ms);
      request();
    },
    pause() {
      if (pending) cancel(pending);
      pending = 0;
      previous = null;
    },
    resume() {
      stopped = false;
      this.invalidate();
    },
    stop() {
      stopped = true;
      this.pause();
    },
    metrics() {
      const sorted = [...samples].sort((a, b) => a - b);
      return {
        frames: totalFrames,
        samples: samples.length,
        medianMs: sorted.length
          ? sorted[Math.floor(sorted.length * 0.5)]
          : null,
        p95Ms: sorted.length
          ? sorted[
              Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))
            ]
          : null,
        worstMs: sorted.length ? sorted.at(-1) : null,
        includesLongStalls: true,
      };
    },
  };
}
