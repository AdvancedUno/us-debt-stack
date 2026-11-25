// Stack It: scenery that moves with the climb but isn't data. Clouds with parallax,
// a distant skyline on the horizon, stars, and Earth falling away below you in space.

import { SKYLINE, cloudMarkup } from './art.js';

// [altitude m, x position (% of width), scale, depth, layer]
// depth < 1 drifts slower (far away); depth > 1 drifts faster and sits in front of the stack.
const CLOUDS = [
  [420, 8, 0.8, 0.7, 'back'], [700, 70, 1.1, 0.85, 'back'], [1_100, 30, 0.9, 1.25, 'front'],
  [1_600, 84, 1.3, 0.9, 'back'], [2_300, 14, 1.0, 0.75, 'back'], [3_000, 58, 1.4, 1.3, 'front'],
  [3_900, 92, 0.9, 0.8, 'back'], [5_000, 40, 1.1, 0.95, 'back'], [6_200, 6, 1.5, 1.35, 'front'],
  [7_400, 74, 1.0, 0.8, 'back'], [9_800, 22, 1.2, 0.9, 'back', 2], [11_500, 66, 1.4, 0.85, 'back', 2],
  [13_000, 36, 1.0, 1.2, 'front', 2],
];

const EARTH_RADIUS_M = 6_371_000;
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function createScenery(stage) {
  const back = stage.querySelector('.scenery--back');
  const front = stage.querySelector('.scenery--front');

  const stars = document.createElement('div');
  stars.className = 'stars';
  stars.style.boxShadow = starField(220);
  const earth = document.createElement('div');
  earth.className = 'earth';
  const skyline = document.createElement('div');
  skyline.className = 'skyline-wrap';
  skyline.innerHTML = SKYLINE;
  back.append(stars, earth, skyline);

  const clouds = CLOUDS.map(([h, x, scale, depth, layer, shape], i) => {
    const el = document.createElement('div');
    el.className = 'cloud-wrap';
    el.innerHTML = cloudMarkup(shape ?? i % 2);
    el.style.left = `${x}%`;
    el.style.setProperty('--scale', scale);
    (layer === 'front' ? front : back).append(el);
    return { h, depth, el, shown: false };
  });

  return function update({ altitude, yAt, groundY, vh, vw, visibleY }) {
    // Skyline sits on the horizon while the ground is in view
    skyline.style.transform = `translate3d(0, ${groundY.toFixed(1)}px, 0)`;
    skyline.style.visibility = groundY < vh + 200 ? 'visible' : 'hidden';

    for (const c of clouds) {
      const y = yAt(c.h, c.depth);
      const shown = visibleY(y, 200);
      if (shown) c.el.style.transform = `translate3d(-50%, ${y.toFixed(1)}px, 0) scale(var(--scale))`;
      if (shown !== c.shown) {
        c.el.style.visibility = shown ? 'visible' : 'hidden';
        c.shown = shown;
      }
    }

    // Stars fade in between 25 and 120 km
    stars.style.opacity = smooth(25_000, 120_000, altitude).toFixed(3);

    // Earth: its apparent size shrinks with distance. Angular radius = asin(R / (R + h)).
    const earthAlpha = smooth(20_000, 80_000, altitude);
    earth.style.opacity = earthAlpha.toFixed(3);
    if (earthAlpha > 0) {
      const theta = Math.asin(EARTH_RADIUS_M / (EARTH_RADIUS_M + altitude));
      const diameter = Math.min(40_000, Math.max(90, vh * 1.1 * Math.tan(theta)));
      const horizon = vh * (0.86 - 0.1 * smooth(5e6, 4e7, altitude)); // top edge of the disc
      earth.style.width = `${diameter.toFixed(0)}px`;
      earth.style.height = `${diameter.toFixed(0)}px`;
      earth.style.transform = `translate3d(${(vw * 0.5 - diameter / 2).toFixed(0)}px, ${horizon.toFixed(0)}px, 0)`;
    }
  };
}

// Deterministic star positions so every visit sees the same sky.
function starField(count) {
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const shadows = [];
  for (let i = 0; i < count; i++) {
    const x = (rand() * 100).toFixed(2);
    const y = (rand() * 100).toFixed(2);
    const a = (0.35 + rand() * 0.65).toFixed(2);
    const size = rand() > 0.92 ? 1 : 0;
    shadows.push(`${x}vw ${y}vh 0 ${size}px rgb(255 255 255 / ${a})`);
  }
  return shadows.join(',');
}
