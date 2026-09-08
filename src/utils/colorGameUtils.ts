/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ColorGameMode } from '../types';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface GeneratedColor {
  hex: string;
  r: number;
  g: number;
  b: number;
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  const toHex = (c: number) => clamp(c).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgb(hex: string): RGB {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let rPrime = 0, gPrime = 0, bPrime = 0;
  if (h >= 0 && h < 60) {
    rPrime = c; gPrime = x; bPrime = 0;
  } else if (h >= 60 && h < 120) {
    rPrime = x; gPrime = c; bPrime = 0;
  } else if (h >= 120 && h < 180) {
    rPrime = 0; gPrime = c; bPrime = x;
  } else if (h >= 180 && h < 240) {
    rPrime = 0; gPrime = x; bPrime = c;
  } else if (h >= 240 && h < 300) {
    rPrime = x; gPrime = 0; bPrime = c;
  } else {
    rPrime = c; gPrime = 0; bPrime = x;
  }

  return {
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255),
  };
}

/**
 * Generate 5 distinct target colors for the given difficulty mode.
 */
export function generate5TargetColors(mode: ColorGameMode): GeneratedColor[] {
  const colors: GeneratedColor[] = [];
  const baseHues = [
    Math.floor(Math.random() * 60),
    Math.floor(60 + Math.random() * 60),
    Math.floor(120 + Math.random() * 60),
    Math.floor(180 + Math.random() * 60),
    Math.floor(270 + Math.random() * 60),
  ].sort(() => Math.random() - 0.5);

  for (let i = 0; i < 5; i++) {
    let r = 0, g = 0, b = 0;

    if (mode === 'easy') {
      // High saturation (80-100%), good lightness (45-60%), very clear primary/secondary hues
      const hue = baseHues[i];
      const sat = 85 + Math.floor(Math.random() * 15);
      const light = 45 + Math.floor(Math.random() * 15);
      const rgb = hslToRgb(hue, sat, light);
      r = rgb.r; g = rgb.g; b = rgb.b;
    } else if (mode === 'medium') {
      // Varied saturation (50-85%), lightness (35-70%), pastels, earth tones, jewel hues
      const hue = baseHues[i] + Math.floor(Math.random() * 20 - 10);
      const sat = 50 + Math.floor(Math.random() * 35);
      const light = 35 + Math.floor(Math.random() * 35);
      const rgb = hslToRgb(hue, sat, light);
      r = rgb.r; g = rgb.g; b = rgb.b;
    } else {
      // Hard: subtle nuanced shades, desaturated or closely related tones (sat 30-65%, light 30-75%)
      const hue = (baseHues[0] + i * 25 + Math.floor(Math.random() * 15)) % 360;
      const sat = 30 + Math.floor(Math.random() * 35);
      const light = 30 + Math.floor(Math.random() * 45);
      const rgb = hslToRgb(hue, sat, light);
      r = rgb.r; g = rgb.g; b = rgb.b;
    }

    colors.push({
      hex: rgbToHex(r, g, b),
      r,
      g,
      b,
    });
  }

  return colors;
}

/**
 * Calculates Euclidean RGB distance between target and guess.
 * Max possible distance: sqrt(255^2 + 255^2 + 255^2) ≈ 441.67295593
 */
export function calculateColorDistance(
  target: { r: number; g: number; b: number },
  guess: { r: number; g: number; b: number }
): { distance: number; score: number; accuracyPercentage: number } {
  const dr = target.r - guess.r;
  const dg = target.g - guess.g;
  const db = target.b - guess.b;

  const distance = Math.sqrt(dr * dr + dg * dg + db * db);
  const maxDistance = 441.673;

  // Closeness ratio (0.0 to 1.0)
  const closeness = Math.max(0, 1 - distance / maxDistance);

  // Score from 0.00 to 10.00
  const score = Number((closeness * 10).toFixed(2));
  const accuracyPercentage = Number((closeness * 100).toFixed(1));

  return {
    distance: Number(distance.toFixed(2)),
    score,
    accuracyPercentage,
  };
}
