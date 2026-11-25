// Stack It: sky color by altitude. Morning blue at the ground, dusk orange at the
// mountains, indigo at the edge of space, near-black in orbit.
// Stops are interpolated on a log scale of altitude.

const STOPS = [
  [0, [214, 236, 248]],
  [150, [172, 212, 240]],
  [2_000, [238, 214, 186]],
  [9_000, [232, 160, 118]],
  [30_000, [92, 66, 128]],
  [100_000, [40, 32, 92]],
  [1_000_000, [14, 13, 40]],
  [10_000_000, [6, 6, 16]],
];

const DARK_FROM = 30_000; // marker text switches to light ink above this

const t = (h) => Math.log10(Math.max(h, 0) + 1);

export function skyAt(altitude) {
  const x = t(altitude);
  let rgb = STOPS.at(-1)[1];
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [h0, c0] = STOPS[i];
    const [h1, c1] = STOPS[i + 1];
    if (altitude <= h1) {
      const k = (x - t(h0)) / (t(h1) - t(h0));
      rgb = c0.map((v, j) => Math.round(v + (c1[j] - v) * k));
      break;
    }
  }
  return { color: `rgb(${rgb.join(' ')})`, dark: altitude >= DARK_FROM };
}
