// Wheel events have no gesture-end event. A quiet interval separates deliberate
// gestures from the continuing wheel/trackpad momentum at the queue boundary.
export function createHistoryScrollGate(pauseMs = 220) {
  let lastWheel = -Infinity;
  let stopped = false;
  return {
    reset() { lastWheel = -Infinity; stopped = false; },
    wheel({ top, boundary, delta, time }) {
      const newGesture = time - lastWheel >= pauseMs;
      lastWheel = time;
      if (boundary <= 0 || delta === 0) return null;
      if (delta > 0) { stopped = false; return null; }
      if (top < boundary - 1) return null;
      if (top > boundary + 1) stopped = false;
      if (top + delta > boundary) return null;
      if (stopped && newGesture && top <= boundary + 1) {
        stopped = false;
        return null;
      }
      stopped = true;
      return boundary;
    }
  };
}
