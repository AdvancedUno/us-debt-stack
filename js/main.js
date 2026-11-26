// Stack It: entry point. Loads the data, fills in the text, and wires the modules together.

import { streamData } from './api.js';
import { MOON_DISTANCE_M, buildChapters, dollarsToMeters, growthPerSecond } from './scale.js';
import { formatDate, formatHeight, formatPercent, formatUSD } from './format.js';
import { BILL } from './art.js';
import { createClimb } from './climb.js';
import { createAltimeter } from './altimeter.js';
import { createScenery } from './scenery.js';
import { createLandmarks } from './landmarks.js';
import { createBreakdown } from './breakdown.js';
import { createControls } from './controls.js';
import { createTicker } from './ticker.js';
import { createNav } from './nav.js';
import { createNarrator } from './narrator.js';
import { createElevator } from './elevator.js';
import { createGuess } from './guess.js';
import { createTimelapse } from './timelapse.js';
import { createHistoryChart } from './chart.js';
import { createCompare } from './compare.js';
import { createCountries } from './countries.js';
import { hashFor, isStateHash, parseHash } from './share.js';

const $ = (sel) => document.querySelector(sel);
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion = () => motionQuery.matches;

const DATA_LABELS = { debt: 'today’s debt', yearAgo: 'last year’s debt', history: 'debt history', population: 'population', gdp: 'GDP' };

function setField(name, text) {
  for (const el of document.querySelectorAll(`[data-field="${name}"]`)) el.textContent = text;
}

function showDataNote(data, { final }) {
  const saved = Object.entries(data.origin).filter(([, origin]) => origin === 'snapshot').map(([key]) => DATA_LABELS[key]);
  const note = $('[data-field="data-note"]');
  note.hidden = !saved.length;
  if (!saved.length) return;
  note.textContent = final
    ? `Showing saved data from ${formatDate(data.snapshotDate)} for ${saved.join(', ')}: the live source didn’t respond.`
    : `Showing saved data from ${formatDate(data.snapshotDate)} while live data loads…`;
}

/** Every text figure that depends on the data. Safe to call again with newer data. */
function renderFigures(data) {
  const debt = data.debt.total;
  const stackTop = dollarsToMeters(debt);
  setField('debt-total', formatUSD(debt));
  setField('debt-date', formatDate(data.debt.date));
  setField('stack-height', formatHeight(stackTop));
  setField('growth-per-second', formatUSD(growthPerSecond(data.debt, data.yearAgo)));
  setField('gap-distance', formatHeight(MOON_DISTANCE_M - stackTop));
  setField('moon-percent', formatPercent(stackTop / MOON_DISTANCE_M));
  renderRuler(stackTop);
}

function renderRuler(stackTop) {
  const ruler = $('.ruler');
  const fraction = stackTop / MOON_DISTANCE_M;
  ruler.style.setProperty('--stack-fraction', `${(fraction * 100).toFixed(3)}%`);
  ruler.setAttribute('aria-label', `A linear ruler from the ground to the Moon. The stack fills ${formatPercent(fraction)} of it.`);
  const ticks = [
    { label: 'Ground', at: 0, cls: 'ruler__tick--start' },
    { label: `Stack top\n${formatHeight(stackTop)}`, at: stackTop },
    { label: `The Moon\n${formatHeight(MOON_DISTANCE_M)}`, at: MOON_DISTANCE_M, cls: 'ruler__tick--end' },
  ];
  $('.ruler__ticks').replaceChildren(...ticks.map(({ label, at, cls }) => {
    const tick = document.createElement('span');
    tick.className = `ruler__tick ${cls ?? ''}`.trim();
    tick.style.left = `${(at / MOON_DISTANCE_M) * 100}%`;
    tick.textContent = label;
    return tick;
  }));
}

/** Build the page from the first data available. Returns update(data) for newer data. */
function start(data) {
  const debt = data.debt.total;
  const stackTop = dollarsToMeters(debt);
  const rate = growthPerSecond(data.debt, data.yearAgo);

  renderFigures(data);

  const stage = $('.stage');
  // Chapter lengths are fixed from the first figure so the page never re-lays out under
  // the reader; a newer figure only moves the top of the stack (by a few km per day).
  const chapters = buildChapters(stackTop);
  const climb = createClimb({ stage, track: $('.track'), chapters });
  const narrator = createNarrator($('.narrator'));

  climb.subscribe(createScenery(stage));
  const landmarks = createLandmarks({ markerLayer: stage.querySelector('.markers'), artLayer: stage.querySelector('.art-layer') });
  climb.subscribe(landmarks.update);
  climb.subscribe(createAltimeter($('.altimeter')));
  climb.subscribe(createNav({
    rail: $('.rail'),
    chapters,
    extras: [
      { id: 'history', title: 'History' },
      { id: 'compare', title: 'Ways to see it' },
      { id: 'countries', title: 'Countries' },
    ],
    reducedMotion,
  }));

  const breakdown = createBreakdown({ stage, stackEl: stage.querySelector('.stack'), tip: $('.tip'), debt: data.debt });

  // Explore dock, history chart and shareable links all drive the same stack.
  let stack = null;
  let timelapse = null;
  let hashTimer = 0;
  const historyChart = createHistoryChart($('#history'), {
    onPick: (year) => controls.selectYear(year, { behavior: reducedMotion() ? 'instant' : 'smooth' }),
  });
  const controls = createControls({
    root: $('.dock'),
    data,
    reducedMotion,
    onChange({ top, publicTop, denomination, label, behavior, fly }) {
      stack = { top, denomination, label };
      climb.setStack({ top, publicTop, denomination, label });
      breakdown.setEnabled(publicTop != null);
      if (fly) climb.scrollToAltitude(top, { behavior });
    },
    onState(state, { fly }) {
      if (!fly) return; // only reader-driven changes rewrite the URL
      // Debounced: dragging or the time-lapse would otherwise call replaceState every
      // frame, and Safari throws after 100 calls in 30 seconds.
      clearTimeout(hashTimer);
      hashTimer = setTimeout(() => {
        const hash = hashFor(state);
        if (hash || isStateHash(window.location.hash)) {
          history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
        }
      }, 400);
    },
    onPlay: () => timelapse.toggle(),
    onBorn: (year) => historyChart.setBorn(year),
  });
  timelapse = createTimelapse({ controls, narrator });
  // Grabbing the slider or sparkline takes over from the time-lapse.
  for (const el of document.querySelectorAll('.dock [data-control="year"], .dock .spark')) {
    el.addEventListener('pointerdown', () => timelapse.stop());
  }
  controls.emit({ fly: false });
  historyChart.setData(controls.entries, data.gdp);

  const compare = createCompare($('#compare'));
  compare.setData({ debt, recordDate: data.debt.date, rate });
  createCountries($('#countries'));

  const ticker = createTicker({
    valueEl: $('[data-field="ticker"]'),
    arrivedEl: $('[data-field="arrived"]'),
    elapsedEl: $('[data-field="arrived-time"]'),
    pileEl: $('.pile'),
    debt,
    recordDate: data.debt.date,
    ratePerSecond: rate,
    reducedMotion,
  });

  // Guess first, then the elevator.
  const elevator = createElevator({ climb, narrator, reducedMotion, getStack: () => stack });
  const guess = createGuess({
    root: $('.guess'),
    onGuess: (h) => landmarks.setGuess(h, dollarsToMeters(debt)),
    onReveal: () => {},
  });
  guess.setActual(stackTop);
  for (const button of document.querySelectorAll('[data-action="elevator"]')) {
    button.addEventListener('click', () => {
      guess.skip();
      timelapse.stop();
      if (controls.mode !== 'nation' || controls.index !== controls.entries.length - 1) controls.selectYear(null, { fly: false });
      elevator.start();
    });
  }

  // A shared link (#year-1945, #person-1) opens straight onto that stack.
  const shared = parseHash(window.location.hash);
  if (shared) {
    guess.skip();
    if (shared.mode === 'person') controls.selectPerson(shared.denomination);
    else controls.selectYear(shared.year);
  }

  // Start the explore dock collapsed on small screens.
  if (window.matchMedia('(max-width: 720px)').matches) $('.dock').open = false;
  document.documentElement.classList.add('is-ready');
  window.stackIt = { data }; // handy in the console: stackIt.data.origin shows live vs. saved

  return function update(next) {
    const nextRate = growthPerSecond(next.debt, next.yearAgo);
    renderFigures(next);
    breakdown.setDebt(next.debt);
    controls.setData(next);
    historyChart.setData(controls.entries, next.gdp);
    compare.setData({ debt: next.debt.total, recordDate: next.debt.date, rate: nextRate });
    guess.setActual(dollarsToMeters(next.debt.total));
    ticker.setBase({ debt: next.debt.total, recordDate: next.debt.date, ratePerSecond: nextRate });
    window.stackIt.data = next;
  };
}

async function init() {
  $('.intro__bill').innerHTML = BILL;

  let update = null;
  let latest = null;
  try {
    await streamData({
      onUpdate(data) {
        latest = data;
        if (update) update(data);
        else update = start(data);
        showDataNote(data, { final: false });
      },
    });
    showDataNote(latest, { final: true });
  } catch (err) {
    console.error(err);
    setField('debt-total', 'Data unavailable');
    const note = $('[data-field="data-note"]');
    note.textContent = 'The live data and the saved copy both failed to load. Please try again in a moment.';
    note.hidden = false;
  }
}

init();
