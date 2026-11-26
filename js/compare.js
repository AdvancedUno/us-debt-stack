// Stack It: "Other ways to see it". The same bills restated as weight, length, area,
// time to count and $1 bills, plus how fast the stack grows, live.

import { MOON_DISTANCE_M, nextMilestone, paceOf, waysToSee } from './scale.js';
import { formatHeight, formatNumber, formatUSD, formatUSDCompact } from './format.js';

const CARRIER_TONNES = 100_000; // a Nimitz-class aircraft carrier, roughly, fully loaded
const RHODE_ISLAND_KM2 = 4_001; // total area
const RECORDED_HISTORY_YEARS = 5_000;
const EVEREST_M = 8_849;

const n = (x, d = 0) => formatNumber(x, d);
const compactNumber = (x) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(x);

// Each view: a big figure, a plain-language comparison, and an icon row (capped).
const VIEWS = [
  {
    id: 'height', tab: 'Height', icon: 'ring',
    build: (w) => ({
      figure: formatHeight(w.height),
      text: `Stacked flat, the bills reach past geostationary orbit. Laid along the equator instead, the stack would wrap around Earth ${n(w.aroundEquator, 2)} times.`,
      count: w.aroundEquator, unit: 'trips around Earth',
    }),
  },
  {
    id: 'weight', tab: 'Weight', icon: 'ship',
    build: (w) => ({
      figure: `${compactNumber(w.tonnes)} tonnes`,
      text: `At about one gram per bill, that’s roughly ${n(w.tonnes / CARRIER_TONNES, 1)} fully loaded aircraft carriers of paper money.`,
      count: w.tonnes / CARRIER_TONNES, unit: 'aircraft carriers',
    }),
  },
  {
    id: 'length', tab: 'End to end', icon: 'moon',
    build: (w) => ({
      figure: `${compactNumber(w.endToEnd / 1000)} km`,
      text: `Laid end to end, the bills would stretch to the Moon and back ${n(w.moonTrips / 2, 0)} times, or ${n(w.sunFraction * 100, 0)}% of the way to the Sun.`,
      count: w.moonTrips, unit: 'Earth–Moon distances',
    }),
  },
  {
    id: 'area', tab: 'Area', icon: 'tile',
    build: (w) => ({
      figure: `${n(w.areaKm2)} km²`,
      text: `Spread out flat, one layer deep, the bills would cover ${n(w.areaKm2 / RHODE_ISLAND_KM2, 2)} times the area of Rhode Island.`,
      count: w.areaKm2 / RHODE_ISLAND_KM2, unit: 'Rhode Islands',
    }),
  },
  {
    id: 'count', tab: 'Counting', icon: 'glass',
    build: (w) => ({
      figure: `${n(w.countingYears)} years`,
      text: `Counting one bill per second, day and night, would take about ${n(w.countingYears / RECORDED_HISTORY_YEARS, 1)} times as long as all of recorded history.`,
      count: w.countingYears / RECORDED_HISTORY_YEARS, unit: 'spans of recorded history',
    }),
  },
  {
    id: 'ones', tab: 'In $1 bills', icon: 'moon',
    build: (w) => ({
      figure: formatHeight(w.oneDollarHeight),
      text: `In $1 bills the stack is 100 times taller: it would pass the Moon and keep going, ${n(w.oneDollarHeight / MOON_DISTANCE_M, 1)} times the Earth–Moon distance.`,
      count: w.oneDollarHeight / MOON_DISTANCE_M, unit: 'Earth–Moon distances',
    }),
  },
];

const ICONS = {
  ring: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  ship: '<path d="M2 15h20l-3 4H5z"/><path d="M5 15V12h9l2-3h3v6"/>',
  moon: '<circle cx="12" cy="12" r="8"/><circle cx="9" cy="10" r="1.6"/><circle cx="14.5" cy="14.5" r="2"/>',
  tile: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 12h16M12 4v16"/>',
  glass: '<path d="M7 3h10M7 21h10M8 3c0 6 8 6 8 9s-8 3-8 9M16 3c0 6-8 6-8 9s8 3 8 9"/>',
};
const MAX_ICONS = 24;

export function createCompare(root) {
  const tabs = root.querySelector('.compare__tabs');
  const panel = root.querySelector('.compare__panel');
  const pace = root.querySelector('.pace');
  let ways = null;
  let current = VIEWS[0].id;
  let paceBase = null;

  tabs.replaceChildren(...VIEWS.map((v) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.role = 'tab';
    b.id = `tab-${v.id}`;
    b.className = 'compare__tab';
    b.dataset.view = v.id;
    b.setAttribute('aria-controls', panel.id);
    b.textContent = v.tab;
    b.addEventListener('click', () => select(v.id));
    return b;
  }));
  tabs.addEventListener('keydown', (e) => {
    const i = VIEWS.findIndex((v) => v.id === current);
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: VIEWS.length - 1 }[e.key];
    if (next == null) return;
    e.preventDefault();
    const v = VIEWS[(next + VIEWS.length) % VIEWS.length];
    select(v.id);
    tabs.querySelector(`[data-view="${v.id}"]`).focus();
  });

  function select(id) {
    current = id;
    for (const b of tabs.children) {
      const on = b.dataset.view === id;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    }
    panel.setAttribute('aria-labelledby', `tab-${id}`);
    render();
  }

  function render() {
    if (!ways) return;
    const view = VIEWS.find((v) => v.id === current);
    const { figure, text, count, unit } = view.build(ways);
    panel.querySelector('.compare__figure').textContent = figure;
    panel.querySelector('.compare__text').textContent = text;
    const icons = panel.querySelector('.compare__icons');
    const whole = Math.floor(count);
    const shownIcons = Math.min(MAX_ICONS, whole);
    const nodes = [];
    for (let i = 0; i < shownIcons; i++) nodes.push(icon(view.icon, 1, i));
    const frac = count - whole;
    if (whole < MAX_ICONS && frac >= 0.05) nodes.push(icon(view.icon, frac, shownIcons));
    icons.replaceChildren(...nodes);
    icons.setAttribute('aria-label', `${n(count, count < 10 ? 1 : 0)} ${unit}`);
    panel.querySelector('.compare__more').textContent = whole > MAX_ICONS ? `× ${n(count)} ${unit}` : `${n(count, count < 10 ? 2 : 0)} ${unit}`;
  }

  function icon(kind, fraction, i) {
    const wrap = document.createElement('span');
    wrap.className = 'compare__icon';
    wrap.style.setProperty('--i', i);
    wrap.style.setProperty('--fill', `${Math.round(fraction * 100)}%`);
    wrap.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[kind]}</svg>`;
    return wrap;
  }

  // Live pace: per second / day / year, and the next whole trillion
  const out = (k) => pace.querySelector(`[data-pace="${k}"]`);
  function tickPace() {
    if (!paceBase) return;
    const { debt, recordEnd, rate } = paceBase;
    const est = debt + rate * Math.max(0, Date.now() - recordEnd) / 1000;
    const p = paceOf(rate);
    out('second').textContent = `${formatUSD(p.second.dollars)} · ${formatHeight(p.second.height)} taller`;
    out('day').textContent = `${formatUSDCompact(p.day.dollars)} · ${formatHeight(p.day.height)} taller`;
    out('year').textContent = `${formatUSDCompact(p.year.dollars)} · ${formatHeight(p.year.height)} taller`;
    out('everest').textContent = `${n((EVEREST_M / p.day.height) * 24, 0)} hours`;
    const m = nextMilestone(est, rate);
    const when = new Date(Date.now() + m.seconds * 1000);
    out('milestone').textContent = Number.isFinite(m.seconds)
      ? `${formatUSDCompact(m.target)} around ${when.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
      : '—';
  }
  setInterval(tickPace, 1000);

  select(current);
  return {
    setData({ debt, recordDate, rate }) {
      ways = waysToSee(debt);
      paceBase = { debt, recordEnd: Date.parse(`${recordDate}T23:59:59-05:00`), rate };
      root.querySelectorAll('[data-field="compare-total"]').forEach((el) => { el.textContent = formatUSDCompact(debt); });
      render();
      tickPace();
    },
  };
}

