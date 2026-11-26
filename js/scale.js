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
  { id: 'person', name: 'A person', height: 1.75,
    fact: 'About average adult height. Counting the bills at one per second would take about four and a half hours.' },
  { id: 'bus', name: 'School bus', height: 3.2,
    fact: 'A standard full-size school bus stands about 3.2 m (10.5 ft) tall.' },
  { id: 'house', name: 'Two-story house', height: 8,
    fact: 'A typical two-story house reaches about 8 m to the top of the roof.' },
  { id: 'arch', name: 'Gateway Arch', height: 192,
    fact: 'Completed in St. Louis in 1965, it is 630 ft tall and exactly as wide as it is tall.' },
  { id: 'burj', name: 'Burj Khalifa', height: 828,
    fact: 'The tallest building in the world since it opened in Dubai in 2010.' },
  { id: 'everest', name: 'Mount Everest', height: 8_849,
    fact: 'Earth’s highest point above sea level, re-measured at 8,848.86 m in 2020.' },
  { id: 'airliner', name: 'Airliner cruising altitude', height: 11_000,
    fact: 'Most passenger jets cruise between about 10 and 12 km (33,000 to 39,000 ft).' },
  { id: 'karman', name: 'Edge of space (Kármán line)', height: 100_000,
    fact: 'A widely used boundary for where space begins, 100 km up.' },
  { id: 'iss', name: 'International Space Station', height: 400_000,
    fact: 'Orbits roughly 400 km up and circles Earth about every 90 minutes.' },
  { id: 'gps', name: 'GPS satellites', height: 20_200_000,
    fact: 'About 30 GPS satellites orbit at this height, each circling Earth twice a day.' },
  { id: 'geo', name: 'Geostationary orbit', height: 35_786_000,
    fact: 'Here an orbit takes exactly one day, so a satellite seems to hang over one spot on Earth.' },
  { id: 'moon', name: 'The Moon', height: MOON_DISTANCE_M,
    fact: 'This is the average distance. It varies from about 363,000 to 406,000 km over each orbit.' },
].map(Object.freeze));

/** The first landmark strictly above `altitude`, or null past the last one. */
export function nextLandmark(altitude, landmarks = LANDMARKS) {
  return landmarks.find((l) => l.height > altitude) ?? null;
}

/** The highest landmark at or below `altitude`, or null below the first one. */
export function landmarkBelow(altitude, landmarks = LANDMARKS) {
  return landmarks.filter((l) => l.height <= altitude).at(-1) ?? null;
}

/** "$1", "$10,000", "$1 million", "$10 billion", "$1 trillion" */
export function moneyWords(dollars) {
  for (const [value, word] of [[1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million']]) {
    if (dollars >= value) return `$${Number((dollars / value).toPrecision(3))} ${word}`;
  }
  return `$${dollars.toLocaleString('en-US')}`;
}

// Levels of detail for drawing the stack. Each level bundles 100 of the one below:
// bill, strap, brick, pallet, block, tower. Labels depend on the bill denomination.
const LEVEL_NAMES = ['bill', 'strap', 'brick', 'pallet', 'block', 'tower'];
const levelCache = new Map();

export function detailLevels(denomination = BILL_DENOMINATION) {
  if (!levelCache.has(denomination)) {
    levelCache.set(denomination, Object.freeze(LEVEL_NAMES.map((name, i) => {
      const bills = 100 ** i;
      const dollars = bills * denomination;
      return Object.freeze({ name, bills, dollars, height: bills * BILL_THICKNESS_M, label: `${moneyWords(dollars)} ${name}` });
    })));
  }
  return levelCache.get(denomination);
}

export const DETAIL_LEVELS = detailLevels(BILL_DENOMINATION);

/** The smallest unit that is at least `minPx` tall at this zoom. */
export function detailLevelFor(pxPerMeter, minPx = 5, levels = DETAIL_LEVELS) {
  return levels.find((lvl) => lvl.height * pxPerMeter >= minPx) ?? levels.at(-1);
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

// ---------------------------------------------------------------------------
// Other ways to see the same pile of bills.
// ---------------------------------------------------------------------------

export const BILL_LENGTH_M = 6.14 * INCH_M; // 15.6 cm
export const BILL_WIDTH_M = 2.61 * INCH_M; //  6.63 cm
export const BILL_MASS_KG = 0.001; //          about one gram, per the BEP
export const SUN_DISTANCE_M = 149_597_870_700; // one astronomical unit
const SECONDS_PER_YEAR = 365.25 * SECONDS_PER_DAY;

/** The same number of $100 bills, measured several ways. */
export function waysToSee(dollars) {
  const bills = dollars / BILL_DENOMINATION;
  const height = bills * BILL_THICKNESS_M;
  const endToEnd = bills * BILL_LENGTH_M;
  return {
    bills,
    height,
    aroundEquator: height / EQUATOR_M,
    tonnes: (bills * BILL_MASS_KG) / 1000,
    endToEnd,
    moonTrips: endToEnd / MOON_DISTANCE_M,
    sunFraction: endToEnd / SUN_DISTANCE_M,
    areaKm2: (bills * BILL_LENGTH_M * BILL_WIDTH_M) / 1e6,
    countingYears: bills / SECONDS_PER_YEAR, // one bill per second, nonstop
    oneDollarHeight: height * BILL_DENOMINATION,
  };
}

/** Growth per second, day and year, in dollars and in stack height. */
export function paceOf(ratePerSecond) {
  const per = (seconds) => ({ dollars: ratePerSecond * seconds, height: dollarsToMeters(ratePerSecond * seconds) });
  return { second: per(1), day: per(SECONDS_PER_DAY), year: per(SECONDS_PER_YEAR) };
}

/** When `current` reaches the next multiple of `step` at a constant rate. */
export function nextMilestone(current, ratePerSecond, step = 1e12) {
  const target = (Math.floor(current / step) + 1) * step;
  return { target, seconds: ratePerSecond > 0 ? (target - current) / ratePerSecond : Infinity };
}
