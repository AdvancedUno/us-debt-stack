// Stack It: entry point. Loads the data, fills in the text, and wires the modules together.

import { loadData } from './api.js';
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

const $ = (sel) => document.querySelector(sel);
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion = () => motionQuery.matches;

const DATA_LABELS = { debt: 'today’s debt', yearAgo: 'last year’s debt', history: 'debt history', population: 'population', gdp: 'GDP' };

function setField(name, text) {
  for (const el of document.querySelectorAll(`[data-field="${name}"]`)) el.textContent = text;
}

function showDataNote(data) {
  const saved = Object.entries(data.origin).filter(([, origin]) => origin === 'snapshot').map(([key]) => DATA_LABELS[key]);
  if (!saved.length) return;
  const note = $('[data-field="data-note"]');
  note.textContent = `Showing saved data from ${formatDate(data.snapshotDate)} for ${saved.join(', ')}: the live source didn’t respond.`;
  note.hidden = false;
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

async function init() {
  $('.intro__bill').innerHTML = BILL;

  let data;
  try {
    data = await loadData();
  } catch (err) {
    console.error(err);
    setField('debt-total', 'Data unavailable');
    const note = $('[data-field="data-note"]');
    note.textContent = 'The live data and the saved copy both failed to load. Please try again in a moment.';
    note.hidden = false;
    return;
  }

  const debt = data.debt.total;
  const stackTop = dollarsToMeters(debt);
  const rate = growthPerSecond(data.debt, data.yearAgo);

  setField('debt-total', formatUSD(debt));
  setField('debt-date', formatDate(data.debt.date));
  setField('stack-height', formatHeight(stackTop));
  setField('growth-per-second', formatUSD(rate));
  setField('gap-distance', formatHeight(MOON_DISTANCE_M - stackTop));
  setField('moon-percent', formatPercent(stackTop / MOON_DISTANCE_M));
  showDataNote(data);
  renderRuler(stackTop);

  const stage = $('.stage');
  const chapters = buildChapters(stackTop);
  const climb = createClimb({ stage, track: $('.track'), chapters });

  climb.subscribe(createScenery(stage));
  climb.subscribe(createLandmarks({ markerLayer: stage.querySelector('.markers'), artLayer: stage.querySelector('.art-layer') }));
  climb.subscribe(createAltimeter($('.altimeter')));
  climb.subscribe(createNav({ rail: $('.rail'), chapters, reducedMotion }));

  const breakdown = createBreakdown({ stage, stackEl: stage.querySelector('.stack'), tip: $('.tip'), debt: data.debt });

  const controls = createControls({
    root: $('.dock'),
    data,
    reducedMotion,
    onChange({ top, publicTop, denomination, label, behavior, fly }) {
      climb.setStack({ top, publicTop, denomination, label });
      breakdown.setEnabled(publicTop != null);
      if (fly) climb.scrollToAltitude(top, { behavior });
    },
  });
  controls.emit({ fly: false });

  createTicker({
    valueEl: $('[data-field="ticker"]'),
    arrivedEl: $('[data-field="arrived"]'),
    elapsedEl: $('[data-field="arrived-time"]'),
    pileEl: $('.pile'),
    debt,
    recordDate: data.debt.date,
    ratePerSecond: rate,
    reducedMotion,
  });

  // Start the explore dock collapsed on small screens.
  if (window.matchMedia('(max-width: 720px)').matches) $('.dock').open = false;
  document.documentElement.classList.add('is-ready');
}

init();
