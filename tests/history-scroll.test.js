import { describe, expect, it } from 'vitest';
import { createHistoryScrollGate } from '../src/renderer/models/history-scroll.js';

describe('history scroll boundary', () => {
  it('stops overshoot and momentum, then permits a new gesture', () => {
    const gate = createHistoryScrollGate();
    expect(gate.wheel({ top: 600, boundary: 500, delta: -150, time: 0 })).toBe(500);
    expect(gate.wheel({ top: 500, boundary: 500, delta: -80, time: 90 })).toBe(500);
    expect(gate.wheel({ top: 500, boundary: 500, delta: -20, time: 190 })).toBe(500);
    expect(gate.wheel({ top: 500, boundary: 500, delta: -60, time: 450 })).toBeNull();
    expect(gate.wheel({ top: 440, boundary: 500, delta: -60, time: 470 })).toBeNull();
  });
  it('requires two gestures even when the view starts at NOW PLAYING', () => {
    const gate = createHistoryScrollGate();
    expect(gate.wheel({ top: 500, boundary: 500, delta: -40, time: 0 })).toBe(500);
    expect(gate.wheel({ top: 500, boundary: 500, delta: -40, time: 300 })).toBeNull();
  });
  it('leaves normal queue scrolling and empty history alone', () => {
    const gate = createHistoryScrollGate();
    expect(gate.wheel({ top: 700, boundary: 500, delta: -20, time: 0 })).toBeNull();
    expect(gate.wheel({ top: 700, boundary: 500, delta: 20, time: 20 })).toBeNull();
    expect(gate.wheel({ top: 0, boundary: 0, delta: -20, time: 50 })).toBeNull();
  });
  it('rearms after returning to the pending queue or rebuilding the view', () => {
    const gate = createHistoryScrollGate();
    gate.wheel({ top: 500, boundary: 500, delta: -40, time: 0 });
    gate.wheel({ top: 500, boundary: 500, delta: -40, time: 300 });
    gate.wheel({ top: 490, boundary: 500, delta: 100, time: 330 });
    expect(gate.wheel({ top: 590, boundary: 500, delta: -120, time: 700 })).toBe(500);
    gate.reset();
    expect(gate.wheel({ top: 500, boundary: 500, delta: -40, time: 1000 })).toBe(500);
  });
});
