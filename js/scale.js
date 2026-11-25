// Stack It: the scale math.
// Pure functions only, no DOM, so this file runs in the browser and in `node --test`.

export const INCH_M = 0.0254;
export const BILL_THICKNESS_M = 0.0043 * INCH_M; // 0.10922 mm, per the Bureau of Engraving and Printing
export const BILL_DENOMINATION = 100;
export const MOON_DISTANCE_M = 384_400_000; // average Earth–Moon distance, center to center
export const EQUATOR_M = 40_075_000;
export const SECONDS_PER_DAY = 86_400;

/** Height in meters of a stack of `denomination` bills worth `dollars`. */
export function dollarsToMeters(dollars, denomination = BILL_DENOMINATION) {
  return (dollars / denomination) * BILL_THICKNESS_M;
}

/** Dollars in a stack of `denomination` bills that is `meters` tall. */
export function metersToDollars(meters, denomination = BILL_DENOMINATION) {
  return (meters / BILL_THICKNESS_M) * denomination;
}

export const LANDMARKS = Object.freeze([
  { id: 'person', name: 'A person', height: 1.75 },
  { id: 'bus', name: 'School bus', height: 3.2 },
  { id: 'house', name: 'Two-story house', height: 8 },
  { id: 'arch', name: 'Gateway Arch', height: 192 },
  { id: 'burj', name: 'Burj Khalifa', height: 828 },
  { id: 'everest', name: 'Mount Everest', height: 8_849 },
  { id: 'airliner', name: 'Airliner cruising altitude', height: 11_000 },
  { id: 'karman', name: 'Edge of space (Kármán line)', height: 100_000 },
  { id: 'iss', name: 'International Space Station', height: 400_000 },
  { id: 'gps', name: 'GPS satellites', height: 20_200_000 },
  { id: 'geo', name: 'Geostationary orbit', height: 35_786_000 },
  { id: 'moon', name: 'The Moon', height: MOON_DISTANCE_M },
].map(Object.freeze));

/** The first landmark strictly above `altitude`, or null past the last one. */
export function nextLandmark(altitude, landmarks = LANDMARKS) {
  return landmarks.find((l) => l.height > altitude) ?? null;
}

// Levels of detail for drawing the stack. Each level bundles 100 of the one below.
const LEVEL_NAMES = [
  ['bill', '$100 bill'],
  ['strap', '$10,000 strap'],
  ['brick', '$1 million brick'],
  ['pallet', '$100 million pallet'],
  ['block', '$10 billion block'],
  ['tower', '$1 trillion tower'],
];
export const DETAIL_LEVELS = Object.freeze(
  LEVEL_NAMES.map(([name, label], i) => {
    const bills = 100 ** i;
    return Object.freeze({
      name,
      label,
      bills,
      dollars: bills * BILL_DENOMINATION,
      height: bills * BILL_THICKNESS_M,
    });
  }),
);

/** The smallest unit that is at least `minPx` tall at this zoom. */
export function detailLevelFor(pxPerMeter, minPx = 5) {
  return DETAIL_LEVELS.find((lvl) => lvl.height * pxPerMeter >= minPx) ?? DETAIL_LEVELS.at(-1);
}

// ---------------------------------------------------------------------------
// Scroll mapping.
//
// The climb is split into chapters. Chapters 2–6 use a log zoom with the same
// number of screens per power of ten, so the zoom speed never jumps between
// chapters. The ground chapter is linear (log can't reach 0), sized so its zoom
// matches the human chapter where they meet. The gap is linear on purpose:
// the empty space should take real scrolling to cross.
// ---------------------------------------------------------------------------

export const SCREENS_PER_DECADE = 1.6;
export const MIN_GAP_SCREENS = 6;

const log10 = Math.log10;

export function buildChapters(stackTopM, { screensPerDecade = SCREENS_PER_DECADE } = {}) {
  const orbitEnd = Math.max(stackTopM * 1.05, 40_000_000);
  const logScreens = (from, to) => log10(to / from) * screensPerDecade;
  // Matching zoom at the top of the linear ground chapter (height a):
  // linear rate a / s1 equals log rate a * ln(10) / screensPerDecade.
  const groundScreens = screensPerDecade / Math.LN10;
  // Same idea at the start of the gap, but never shorter than MIN_GAP_SCREENS.
  const gapContinuous = (MOON_DISTANCE_M - orbitEnd) / (orbitEnd * Math.LN10 / screensPerDecade);

  const raw = [
    { id: 'ground', title: 'Ground level', from: 0, to: 0.01, mode: 'linear', screens: groundScreens },
    { id: 'human', title: 'Human scale', from: 0.01, to: 20, mode: 'log' },
    { id: 'city', title: 'City scale', from: 20, to: 1_000, mode: 'log' },
    { id: 'mountain', title: 'Mountain scale', from: 1_000, to: 20_000, mode: 'log' },
    { id: 'space', title: 'Space', from: 20_000, to: 2_000_000, mode: 'log' },
    { id: 'orbit', title: 'Orbit', from: 2_000_000, to: orbitEnd, mode: 'log' },
    { id: 'gap', title: 'The gap', from: orbitEnd, to: MOON_DISTANCE_M, mode: 'linear', screens: Math.max(gapContinuous, MIN_GAP_SCREENS) },
  ].map((c) => ({ ...c, screens: c.screens ?? logScreens(c.from, c.to) }));

  const total = raw.reduce((sum, c) => sum + c.screens, 0);
  let acc = 0;
  return Object.freeze(
    raw.map((c) => {
      const start = acc / total;
      acc += c.screens;
      return Object.freeze({ ...c, start, end: acc / total });
    }),
  );
}

export function totalScreens(chapters) {
  return chapters.reduce((sum, c) => sum + c.screens, 0);
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

function chapterForProgress(p, chapters) {
  return chapters.find((c) => p <= c.end) ?? chapters.at(-1);
}

function chapterForAltitude(h, chapters) {
  return chapters.find((c) => h <= c.to) ?? chapters.at(-1);
}

/** Altitude (m) at scroll progress p in [0, 1]. */
export function altitudeAt(progress, chapters) {
  const p = clamp(progress, 0, 1);
  const c = chapterForProgress(p, chapters);
  const t = (p - c.start) / (c.end - c.start);
  return c.mode === 'log' ? c.from * (c.to / c.from) ** t : c.from + (c.to - c.from) * t;
}

/** Scroll progress in [0, 1] at altitude h (m). Inverse of altitudeAt. */
export function progressAt(altitude, chapters) {
  const last = chapters.at(-1);
  if (altitude <= 0) return 0;
  if (altitude >= last.to) return 1;
  const c = chapterForAltitude(altitude, chapters);
  const t = c.mode === 'log'
    ? Math.log(altitude / c.from) / Math.log(c.to / c.from)
    : (altitude - c.from) / (c.to - c.from);
  return c.start + t * (c.end - c.start);
}

/** The chapter that contains scroll progress p. */
export function chapterAt(progress, chapters) {
  return chapterForProgress(clamp(progress, 0, 1), chapters);
}

/** Local zoom: meters climbed per unit of progress at altitude h. */
export function metersPerProgress(altitude, chapters) {
  const c = chapterForAltitude(Math.max(altitude, 0), chapters);
  const span = c.end - c.start;
  return c.mode === 'log'
    ? (Math.max(altitude, c.from) * Math.log(c.to / c.from)) / span
    : (c.to - c.from) / span;
}

// ---------------------------------------------------------------------------
// Derived figures.
// ---------------------------------------------------------------------------

/**
 * Estimated growth in dollars per second, from two dated readings
 * ({ date: 'YYYY-MM-DD', total }). Uses the real number of days between them.
 */
export function growthPerSecond(latest, earlier) {
  const days = (Date.parse(latest.date) - Date.parse(earlier.date)) / (SECONDS_PER_DAY * 1000);
  if (!(days > 0)) return 0;
  return (latest.total - earlier.total) / days / SECONDS_PER_DAY;
}

export function perPerson(debt, population) {
  return debt / population;
}
