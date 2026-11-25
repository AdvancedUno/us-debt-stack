import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BILL_THICKNESS_M,
  DETAIL_LEVELS,
  LANDMARKS,
  MOON_DISTANCE_M,
  altitudeAt,
  buildChapters,
  chapterAt,
  detailLevelFor,
  dollarsToMeters,
  growthPerSecond,
  metersPerProgress,
  metersToDollars,
  nextLandmark,
  perPerson,
  progressAt,
} from '../js/scale.js';

const close = (actual, expected, relTol = 1e-9) =>
  assert.ok(
    Math.abs(actual - expected) <= Math.abs(expected) * relTol,
    `expected ${actual} to be within ${relTol} of ${expected}`,
  );

const DEBT = 40_727_354_329_919.53; // Debt to the Penny, 2026-11-23
const chapters = buildChapters(dollarsToMeters(DEBT));

test('bill thickness is 0.0043 inches', () => {
  close(BILL_THICKNESS_M, 0.00010922);
});

test('$1 trillion in $100 bills is about 1,092 km', () => {
  close(dollarsToMeters(1e12), 1_092_200);
});

test('$1 bills stack 100x taller than $100 bills', () => {
  close(dollarsToMeters(1000, 1), dollarsToMeters(1000) * 100);
});

test('metersToDollars inverts dollarsToMeters', () => {
  for (const d of [100, 1.6e6, 8.1e9, DEBT]) close(metersToDollars(dollarsToMeters(d)), d);
});

test('landmark dollar figures match the proposal table', () => {
  const expected = { person: 1.6e6, arch: 176e6, burj: 758e6, everest: 8.1e9, airliner: 10e9,
    karman: 92e9, iss: 366e9, gps: 18.5e12, geo: 32.8e12, moon: 352e12 };
  for (const [id, dollars] of Object.entries(expected)) {
    const lm = LANDMARKS.find((l) => l.id === id);
    close(metersToDollars(lm.height), dollars, 0.01);
  }
});

test("today's stack passes geostationary orbit, about 11.6% of the way to the Moon", () => {
  const h = dollarsToMeters(DEBT);
  assert.ok(h > 35_786_000);
  close(h / MOON_DISTANCE_M, 0.1157, 0.001);
});

test('nextLandmark finds the first landmark above', () => {
  assert.equal(nextLandmark(0).id, 'person');
  assert.equal(nextLandmark(1.75).id, 'bus');
  assert.equal(nextLandmark(9_000).id, 'airliner');
  assert.equal(nextLandmark(MOON_DISTANCE_M), null);
});

test('detail levels go up by 100x and start at one bill', () => {
  assert.equal(DETAIL_LEVELS[0].dollars, 100);
  close(DETAIL_LEVELS[1].height, 0.010922);
  assert.equal(DETAIL_LEVELS.at(-1).dollars, 1e12);
  for (let i = 1; i < DETAIL_LEVELS.length; i++) {
    close(DETAIL_LEVELS[i].height / DETAIL_LEVELS[i - 1].height, 100);
  }
});

test('detailLevelFor picks the smallest unit at least minPx tall', () => {
  assert.equal(detailLevelFor(1 / BILL_THICKNESS_M * 5).name, 'bill'); // a bill is exactly 5px
  assert.equal(detailLevelFor(1 / BILL_THICKNESS_M * 4.9).name, 'strap');
  assert.equal(detailLevelFor(1e-12).name, 'tower');
});

test('chapters are contiguous and cover 0 to the Moon', () => {
  assert.equal(chapters[0].from, 0);
  assert.equal(chapters[0].start, 0);
  assert.equal(chapters.at(-1).to, MOON_DISTANCE_M);
  close(chapters.at(-1).end, 1);
  for (let i = 1; i < chapters.length; i++) {
    assert.equal(chapters[i].from, chapters[i - 1].to);
    assert.equal(chapters[i].start, chapters[i - 1].end);
  }
});

test('orbit chapter ends just above the stack top', () => {
  const orbit = chapters.find((c) => c.id === 'orbit');
  assert.ok(orbit.to > dollarsToMeters(DEBT));
});

test('altitudeAt and progressAt are inverses and monotonic', () => {
  let prev = -1;
  for (let i = 0; i <= 1000; i++) {
    const p = i / 1000;
    const h = altitudeAt(p, chapters);
    assert.ok(h > prev || (i === 0 && h === 0), `not increasing at p=${p}`);
    prev = h;
    close(progressAt(h, chapters), p, 1e-9);
  }
});

test('altitude endpoints and clamping', () => {
  assert.equal(altitudeAt(0, chapters), 0);
  close(altitudeAt(1, chapters), MOON_DISTANCE_M);
  assert.equal(altitudeAt(-1, chapters), 0);
  assert.equal(progressAt(-5, chapters), 0);
  assert.equal(progressAt(1e12, chapters), 1);
});

test('zoom is continuous across log chapter boundaries and from ground into human scale', () => {
  for (let i = 0; i < chapters.length - 2; i++) {
    const h = chapters[i].to;
    const below = metersPerProgress(h * (1 - 1e-9), chapters);
    const above = metersPerProgress(h * (1 + 1e-9), chapters);
    close(below, above, 1e-6);
  }
});

test('chapterAt returns the chapter for a progress value', () => {
  assert.equal(chapterAt(0, chapters).id, 'ground');
  assert.equal(chapterAt(progressAt(8_849, chapters), chapters).id, 'mountain');
  assert.equal(chapterAt(1, chapters).id, 'gap');
});

test('growthPerSecond uses the real day count', () => {
  const rate = growthPerSecond(
    { date: '2026-11-23', total: 40_727_354_329_919.53 },
    { date: '2025-11-24', total: 38_336_291_718_985.39 },
  );
  close(rate, 76_028.39, 1e-6);
  assert.equal(growthPerSecond({ date: '2026-01-01', total: 1 }, { date: '2026-01-01', total: 0 }), 0);
});

test('per-person share', () => {
  close(perPerson(DEBT, 341_784_857), 119_160.79, 1e-6);
});
