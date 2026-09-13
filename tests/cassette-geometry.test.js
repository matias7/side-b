import { describe, expect, it } from 'vitest';
import {
  COMPACT_CASSETTE,
  mmToCassetteWidthUnits,
  tapePackDiameters
} from '../src/renderer/models/cassette-geometry.js';

describe('compact cassette geometry', () => {
  it('keeps the standard shell aspect ratio', () => {
    expect(COMPACT_CASSETTE.widthMm / COMPACT_CASSETTE.heightMm).toBeCloseTo(1.5737, 4);
  });

  it('maps physical millimetres into cassette-relative width units', () => {
    expect(mmToCassetteWidthUnits(100.4)).toBe(100);
    expect(mmToCassetteWidthUnits(42.5)).toBeCloseTo(42.33, 2);
  });

  it('moves one tape pack into the other while preserving the endpoints', () => {
    const empty = mmToCassetteWidthUnits(21.5);
    const full = mmToCassetteWidthUnits(39);

    expect(tapePackDiameters(0)).toEqual({ left: full, right: empty });
    expect(tapePackDiameters(1)).toEqual({ left: empty, right: full });
    expect(tapePackDiameters(.5).left).toBeCloseTo(tapePackDiameters(.5).right, 8);
  });

  it('clamps progress outside the playable range', () => {
    expect(tapePackDiameters(-1)).toEqual(tapePackDiameters(0));
    expect(tapePackDiameters(2)).toEqual(tapePackDiameters(1));
  });
});
