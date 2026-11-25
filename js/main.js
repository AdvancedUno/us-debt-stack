// Stack It: entry point. Loads the data, fills in the text, starts the climb.

import { loadData } from './api.js';
import { LANDMARKS, MOON_DISTANCE_M, buildChapters, dollarsToMeters, growthPerSecond } from './scale.js';
import { formatDate, formatHeight, formatPercent, formatUSD, formatUSDCompact } from './format.js';
import { createClimb } from './climb.js';
import { createAltimeter } from './altimeter.js';

const DATA_LABELS = { debt: 'today’s debt', yearAgo: 'last year’s debt', history: 'debt history', population: 'population', gdp: 'GDP' };

function setField(name, text) {
  for (const el of document.querySelectorAll(`[data-field="${name}"]`)) el.textContent = text;
}

function showDataNote(data) {
  const saved = Object.entries(data.origin).filter(([, origin]) => origin === 'snapshot').map(([key]) => DATA_LABELS[key]);
  if (!saved.length) return;
  const note = document.querySelector('[data-field="data-note"]');
  note.textContent = `Showing saved data from ${formatDate(data.snapshotDate)} for ${saved.join(', ')}: the live source didn’t respond.`;
  note.hidden = false;
}

function renderRuler(stackTop) {
  const ruler = document.querySelector('.ruler');
  const fraction = stackTop / MOON_DISTANCE_M;
  ruler.style.setProperty('--stack-fraction', `${(fraction * 100).toFixed(3)}%`);
  ruler.setAttribute('aria-label', `A linear ruler from the ground to the Moon. The stack fills ${formatPercent(fraction)} of it.`);

  const ticks = [
    { label: 'Ground', at: 0, cls: 'ruler__tick--start' },
    { label: `Stack top\n${formatHeight(stackTop)}`, at: stackTop },
    { label: `The Moon\n${formatHeight(MOON_DISTANCE_M)}`, at: MOON_DISTANCE_M, cls: 'ruler__tick--end' },
  ];
  const nodes = ticks.map(({ label, at, cls }) => {
    const tick = document.createElement('span');
    tick.className = `ruler__tick ${cls ?? ''}`.trim();
    tick.style.left = `${(at / MOON_DISTANCE_M) * 100}%`;
    tick.style.whiteSpace = 'pre';
    tick.textContent = label;
    return tick;
  });
  ruler.querySelector('.ruler__ticks').replaceChildren(...nodes);
}

async function init() {
  let data;
  try {
    data = await loadData();
  } catch (err) {
    console.error(err);
    setField('debt-total', 'Data unavailable');
    const note = document.querySelector('[data-field="data-note"]');
    note.textContent = 'The live data and the saved copy both failed to load. Please try again in a moment.';
    note.hidden = false;
    return;
  }

  const debt = data.debt.total;
  const stackTop = dollarsToMeters(debt);
  const moonFraction = stackTop / MOON_DISTANCE_M;

  setField('debt-total', formatUSD(debt));
  setField('debt-date', formatDate(data.debt.date));
  setField('stack-height', formatHeight(stackTop));
  setField('growth-per-second', formatUSD(growthPerSecond(data.debt, data.yearAgo)));
  setField('gap-distance', formatHeight(MOON_DISTANCE_M - stackTop));
  setField('moon-percent', formatPercent(moonFraction));
  showDataNote(data);
  renderRuler(stackTop);

  const altimeter = createAltimeter(document.querySelector('.altimeter'), { stackTop, stackDollars: debt });
  createClimb({
    stage: document.querySelector('.stage'),
    track: document.querySelector('.track'),
    chapters: buildChapters(stackTop),
    stackTop,
    stackLabel: formatDate(data.debt.date),
    onUpdate: altimeter.update,
  });

  // Handy in the console while building: window.stackIt.data, .landmarks
  window.stackIt = { data, landmarks: LANDMARKS, debtCompact: formatUSDCompact(debt) };
}

init();
