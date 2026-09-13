import { tapePackDiameters } from '../models/cassette-geometry.js';

export function createCassetteView({ cassette, mediaObject }) {
  let paletteRequest = 0;

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  }

  function updateTapeProgress(value) {
    const { left, right } = tapePackDiameters(value);
    cassette.style.setProperty('--left-tape', `${left}cqw`);
    cassette.style.setProperty('--right-tape', `${right}cqw`);
  }

  function setDefaultPalette() {
    const defaults = {
      '--cover': 'none',
      '--tape-primary': '#e5dbc0',
      '--tape-secondary': '#c8bea4',
      '--tape-ink': '#171714',
      '--brand-ink': '#171714',
      '--brand-shadow': '#ffffff88',
      '--side-ink': '#171714',
      '--side-shadow': '#ffffff88'
    };
    Object.entries(defaults).forEach(([property, value]) => mediaObject.style.setProperty(property, value));
  }

  function applyCoverPalette(cover) {
    const request = ++paletteRequest;
    mediaObject.classList.toggle('has-cover', Boolean(cover));
    if (!cover) {
      setDefaultPalette();
      return;
    }
    mediaObject.style.setProperty('--cover', `url("${cover}")`);
    const image = new Image();
    image.onload = () => {
      if (request !== paletteRequest) return;
      const canvas = document.createElement('canvas');
      canvas.width = 28;
      canvas.height = 28;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0, 28, 28);
      const pixels = context.getImageData(0, 0, 28, 28).data;
      const buckets = new Map();
      for (let index = 0; index < pixels.length; index += 16) {
        if (pixels[index + 3] < 180) continue;
        const rgb = [pixels[index], pixels[index + 1], pixels[index + 2]];
        const max = Math.max(...rgb);
        const min = Math.min(...rgb);
        if (max < 28 || min > 238) continue;
        const key = rgb.map((value) => Math.round(value / 32) * 32).join(',');
        const entry = buckets.get(key) || { rgb, score: 0 };
        entry.score += 1 + (max - min) / 90;
        buckets.set(key, entry);
      }
      const colors = [...buckets.values()].sort((a, b) => b.score - a.score).map((entry) => entry.rgb);
      const primary = colors[0] || [218, 207, 181];
      const secondary = colors.find((color) => Math.hypot(...color.map((value, index) => value - primary[index])) > 95)
        || colors[1]
        || primary.map((value) => Math.max(0, value - 35));
      const cssColor = (color) => `rgb(${color.join(' ')})`;
      const blend = (color, amount, paper = [244, 236, 217]) => color.map((value, index) => Math.round(value * amount + paper[index] * (1 - amount)));
      const luminance = (color) => color[0] * .299 + color[1] * .587 + color[2] * .114;
      const readableInk = (color) => luminance(color) > 145
        ? { ink: '#171714', shadow: '#ffffff88' }
        : { ink: '#f2ead7', shadow: '#00000099' };
      const bodyInk = readableInk(blend(primary, .55));
      const brandInk = readableInk(blend(primary, .82));
      const sideInk = readableInk(blend(secondary, .72));
      const palette = {
        '--tape-primary': cssColor(primary),
        '--tape-secondary': cssColor(secondary),
        '--tape-ink': bodyInk.ink,
        '--brand-ink': brandInk.ink,
        '--brand-shadow': brandInk.shadow,
        '--side-ink': sideInk.ink,
        '--side-shadow': sideInk.shadow
      };
      Object.entries(palette).forEach(([property, value]) => mediaObject.style.setProperty(property, value));
    };
    image.src = cover;
  }

  return { formatTime, updateTapeProgress, applyCoverPalette };
}
