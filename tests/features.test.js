import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dollarsToMeters, nextMilestone, paceOf, waysToSee } from '../js/scale.js';
import { hashFor, isStateHash, parseHash } from '../js/share.js';
import { EVENTS } from '../js/events.js';

const close = (a, b, rel = 0.01) => assert.ok(Math.abs(a - b) <= Math.abs(b) * rel, `${a} vs ${b}`);
const DEBT = 40_727_354_329_919.53;

test('waysToSee: the same bills, measured other ways', () => {
  const w = waysToSee(DEBT);
  close(w.bills, 407.27e9);
  close(w.height, 44_482_416);
  close(w.aroundEquator, 1.11);
  close(w.tonnes, 407_274); // one gram a bill
  close(w.endToEnd, 63.5e9); // 63.5 million km
  close(w.moonTrips, 165.2);
  close(w.sunFraction, 0.4245);
  close(w.areaKm2, 4_211); // a little more than Rhode Island's 4,001 km²
  close(w.countingYears, 12_906);
  close(w.oneDollarHeight, 4_448_241_640);
});

test('paceOf: per second, day and year', () => {
  const p = paceOf(76_028.39);
  close(p.second.height, 0.083); // 8.3 cm a second
  close(p.day.dollars, 6.569e9);
  close(p.day.height, 7_175); // about 7.2 km a day
  close(p.year.height, dollarsToMeters(76_028.39 * 365.25 * 86_400));
});

test('nextMilestone: the next whole trillion', () => {
  const m = nextMilestone(40.738e12, 76_028.39);
  assert.equal(m.target, 41e12);
  close(m.seconds, (41e12 - 40.738e12) / 76_028.39);
  assert.equal(nextMilestone(1, 0).seconds, Infinity);
  assert.equal(nextMilestone(41e12, 1).target, 42e12); // exactly on a trillion: the next one
});

test('share links round-trip', () => {
  assert.deepEqual(parseHash('#year-1945'), { mode: 'nation', year: 1945 });
  assert.deepEqual(parseHash('#person-1'), { mode: 'person', denomination: 1 });
  assert.equal(parseHash('#space'), null);
  assert.equal(parseHash(''), null);
  assert.equal(hashFor({ mode: 'nation', year: null }), '');
  assert.equal(hashFor({ mode: 'nation', year: 1945 }), '#year-1945');
  assert.equal(hashFor({ mode: 'person', denomination: 100 }), '#person-100');
  assert.ok(isStateHash('#year-2008'));
  assert.ok(!isStateHash('#orbit'));
});

test('events are in order and well-formed', () => {
  for (let i = 0; i < EVENTS.length; i++) {
    const e = EVENTS[i];
    assert.ok(e.end >= e.year && e.short && e.title.endsWith('.'), e.short);
    if (i) assert.ok(e.year > EVENTS[i - 1].year);
  }
});
