export const COMPACT_CASSETTE = Object.freeze({
  widthMm: 100.4,
  heightMm: 63.8,
  hubDiameterMm: 21.5,
  reelCenterDistanceMm: 42.5,
  maxTapePackDiameterMm: 39
});

export function mmToCassetteWidthUnits(value) {
  return (value / COMPACT_CASSETTE.widthMm) * 100;
}

export function tapePackDiameters(progress) {
  const ratio = Math.max(0, Math.min(1, Number(progress) || 0));
  const minimum = mmToCassetteWidthUnits(COMPACT_CASSETTE.hubDiameterMm);
  const maximum = mmToCassetteWidthUnits(COMPACT_CASSETTE.maxTapePackDiameterMm);
  const travel = maximum - minimum;

  return {
    left: maximum - travel * ratio,
    right: minimum + travel * ratio
  };
}
