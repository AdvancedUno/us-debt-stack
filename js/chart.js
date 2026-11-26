// Stack It: the history charts. Hand-built SVG, one series, one axis.
//  - createSparkline: the small strip in the Explore dock (log scale), with a playhead.
//  - createHistoryChart: the full chart in "237 years of debt", with three views
//    (dollars on a log scale, dollars on a linear scale, share of GDP), event bands,
//    your birth year, a crosshair tooltip, keyboard stepping and a table view.

import { dollarsToMeters } from './scale.js';
import { formatHeight, formatPercent, formatUSD, formatUSDCompact } from './format.js';
import { EVENTS } from './events.js';

const NS = 'http://www.w3.org/2000/svg';
function svgEl(name, attrs = {}, parent = null) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent?.append(node);
  return node;
}
const linear = (d0, d1, r0, r1) => (x) => r0 + ((x - d0) / (d1 - d0)) * (r1 - r0);

/** Points for plotting: fiscal years, plus "today" just after the last one. */
export function toPoints(entries) {
  const lastYear = entries.at(-2)?.year ?? new Date().getFullYear();
  return entries.map((e, i) => ({ ...e, index: i, x: e.year ?? lastYear + 0.5 }));
}

const yearLabel = (p) => (p.year == null ? 'Today' : `FY ${p.year}`);

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------

export function createSparkline(svg, { onPick }) {
  const W = 300;
  const H = 44;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  let points = [];
  let x = () => 0;
  const y = linear(4, 14, H - 3, 3); // log10 dollars: $10K .. $100T
  const base = svgEl('g', {}, svg);
  const born = svgEl('line', { class: 'spark__born', y1: 0, y2: H, visibility: 'hidden' }, svg);
  const head = svgEl('line', { class: 'spark__head', y1: 0, y2: H }, svg);
  const dot = svgEl('circle', { class: 'spark__dot', r: 3 }, svg);

  function setData(entries) {
    points = toPoints(entries);
    x = linear(points[0].x, points.at(-1).x, 2, W - 2);
    base.replaceChildren();
    for (const e of EVENTS) {
      svgEl('rect', { class: 'spark__event', x: x(e.year), width: Math.max(1.5, x(e.end + 1) - x(e.year)), y: 0, height: H }, base);
    }
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.x).toFixed(1)} ${y(Math.log10(p.total)).toFixed(1)}`).join('');
    svgEl('path', { class: 'spark__area', d: `${d}L${x(points.at(-1).x)} ${H}L${x(points[0].x)} ${H}Z` }, base);
    svgEl('path', { class: 'spark__line', d }, base);
  }

  function setIndex(i) {
    const p = points[i];
    if (!p) return;
    head.setAttribute('x1', x(p.x));
    head.setAttribute('x2', x(p.x));
    dot.setAttribute('cx', x(p.x));
    dot.setAttribute('cy', y(Math.log10(p.total)));
  }

  function setBorn(year) {
    born.setAttribute('visibility', year ? 'visible' : 'hidden');
    if (year) {
      born.setAttribute('x1', x(year));
      born.setAttribute('x2', x(year));
    }
  }

  // Click or drag along the strip to pick a year
  const pick = (e) => {
    const r = svg.getBoundingClientRect();
    const xp = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.x) - xp) < Math.abs(x(points[best].x) - xp)) best = i;
    });
    onPick(best);
  };
  svg.addEventListener('pointerdown', (e) => {
    svg.setPointerCapture(e.pointerId);
    pick(e);
  });
  svg.addEventListener('pointermove', (e) => {
    if (svg.hasPointerCapture(e.pointerId)) pick(e);
  });

  return { setData, setIndex, setBorn };
}

// ---------------------------------------------------------------------------
// Full history chart
// ---------------------------------------------------------------------------

const MODES = {
  log: { label: 'Dollars (log scale)' },
  linear: { label: 'Dollars' },
  gdp: { label: 'Share of GDP' },
};

export function createHistoryChart(root, { onPick }) {
  const figure = root.querySelector('.chart');
  const svg = root.querySelector('.chart__svg');
  const tip = root.querySelector('.chart__tip');
  const live = root.querySelector('.chart__live');
  const table = root.querySelector('.chart__table tbody');
  const modeInputs = root.querySelectorAll('[name="chart-mode"]');

  let mode = 'log';
  let points = [];
  let gdpByYear = new Map();
  let latestGdp = null;
  let bornYear = null;
  let focusIndex = -1;
  let scales = null;

  const pctOf = (p) => {
    const gdp = p.year == null ? latestGdp?.value : gdpByYear.get(p.year);
    return gdp ? p.total / gdp : null;
  };

  function visiblePoints() {
    return mode === 'gdp' ? points.filter((p) => pctOf(p) != null) : points;
  }

  function render() {
    const width = Math.max(300, figure.clientWidth);
    const height = Math.round(Math.min(420, Math.max(260, width * 0.46)));
    const m = { l: mode === 'gdp' ? 44 : 72, r: 14, t: 34, b: 30 };
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.replaceChildren();

    const pts = visiblePoints();
    if (!pts.length) return;
    const x = linear(pts[0].x, pts.at(-1).x, m.l, width - m.r);
    let y;
    let yValue;
    let ticks;
    if (mode === 'log') {
      yValue = (p) => Math.log10(p.total);
      y = linear(4, 14, height - m.b, m.t);
      ticks = [4, 6, 8, 10, 12, 14].map((t) => ({ v: t, label: formatUSDCompact(10 ** t), sub: formatHeight(dollarsToMeters(10 ** t)) }));
    } else if (mode === 'linear') {
      yValue = (p) => p.total;
      const max = Math.ceil(Math.max(...pts.map((p) => p.total)) / 10e12) * 10e12;
      y = linear(0, max, height - m.b, m.t);
      ticks = Array.from({ length: max / 10e12 + 1 }, (_, i) => ({ v: i * 10e12, label: formatUSDCompact(i * 10e12), sub: formatHeight(dollarsToMeters(i * 10e12)) }));
    } else {
      yValue = (p) => pctOf(p);
      const max = Math.ceil(Math.max(...pts.map(pctOf)) / 0.25) * 0.25;
      y = linear(0, max, height - m.b, m.t);
      ticks = Array.from({ length: Math.round(max / 0.25) + 1 }, (_, i) => ({ v: i * 0.25, label: formatPercent(i * 0.25, 0) }));
    }
    scales = { x, y, yValue, pts, m, width, height };

    // Grid and y labels (recessive)
    const grid = svgEl('g', { class: 'chart__grid' }, svg);
    for (const t of ticks) {
      const ty = y(t.v);
      svgEl('line', { x1: m.l, x2: width - m.r, y1: ty, y2: ty }, grid);
      const label = svgEl('text', { x: m.l - 8, y: ty - (t.sub ? 2 : -4), 'text-anchor': 'end', class: 'chart__ylabel' }, grid);
      label.textContent = t.label;
      if (t.sub) {
        const sub = svgEl('text', { x: m.l - 8, y: ty + 10, 'text-anchor': 'end', class: 'chart__ysub' }, grid);
        sub.textContent = t.sub;
      }
    }
    // X labels
    const step = pts.at(-1).x - pts[0].x > 100 ? 50 : 10;
    for (let yr = Math.ceil(pts[0].x / step) * step; yr <= pts.at(-1).x; yr += step) {
      const t = svgEl('text', { x: x(yr), y: height - m.b + 18, 'text-anchor': 'middle', class: 'chart__xlabel' }, grid);
      t.textContent = String(yr);
    }

    // Event bands with short labels on alternating rows
    const events = svgEl('g', { class: 'chart__events' }, svg);
    EVENTS.filter((e) => e.end >= pts[0].x && e.year <= pts.at(-1).x).forEach((e, i) => {
      const x0 = x(Math.max(e.year, pts[0].x));
      const x1 = Math.max(x0 + 2, x(Math.min(e.end + 1, pts.at(-1).x)));
      svgEl('rect', { x: x0, y: m.t, width: x1 - x0, height: height - m.t - m.b }, events);
      if (width >= 560) {
        const label = svgEl('text', { x: x0, y: m.t - 6 - (i % 2) * 12, class: 'chart__event-label' }, events);
        label.textContent = e.short;
      }
    });

    // Area and line
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.x).toFixed(1)} ${y(yValue(p)).toFixed(1)}`).join('');
    svgEl('path', { class: 'chart__area', d: `${d}L${x(pts.at(-1).x)} ${height - m.b}L${x(pts[0].x)} ${height - m.b}Z` }, svg);
    svgEl('path', { class: 'chart__line', d }, svg);

    // Birth year
    if (bornYear && bornYear >= pts[0].x && bornYear <= pts.at(-1).x) {
      const bx = x(bornYear);
      svgEl('rect', { class: 'chart__lifetime', x: bx, y: m.t, width: x(pts.at(-1).x) - bx, height: height - m.t - m.b }, svg);
      svgEl('line', { class: 'chart__born', x1: bx, x2: bx, y1: m.t, y2: height - m.b }, svg);
      const t = svgEl('text', { x: bx + 4, y: height - m.b - 6, class: 'chart__born-label' }, svg);
      t.textContent = `You, ${bornYear}`;
    }

    // Crosshair layer
    svgEl('line', { class: 'chart__cross', y1: m.t, y2: height - m.b, visibility: 'hidden' }, svg);
    svgEl('circle', { class: 'chart__dot', r: 5, visibility: 'hidden' }, svg);
    if (focusIndex >= 0) show(focusIndex, false);
  }

  function show(i, announce = true) {
    if (!scales) return;
    const { x, y, yValue, pts } = scales;
    const p = pts[Math.max(0, Math.min(pts.length - 1, i))];
    focusIndex = pts.indexOf(p);
    const cx = x(p.x);
    const cy = y(yValue(p));
    const cross = svg.querySelector('.chart__cross');
    const dot = svg.querySelector('.chart__dot');
    cross.setAttribute('x1', cx);
    cross.setAttribute('x2', cx);
    cross.setAttribute('visibility', 'visible');
    dot.setAttribute('cx', cx);
    dot.setAttribute('cy', cy);
    dot.setAttribute('visibility', 'visible');

    const pct = pctOf(p);
    const event = EVENTS.find((e) => p.year != null && p.year >= e.year && p.year <= e.end);
    tip.innerHTML = '';
    const add = (cls, text) => {
      const s = document.createElement('span');
      s.className = cls;
      s.textContent = text;
      tip.append(s);
    };
    add('chart__tip-year', yearLabel(p));
    add('chart__tip-value', formatUSD(p.total));
    add('chart__tip-row', `Stack: ${formatHeight(dollarsToMeters(p.total))}`);
    if (pct != null) add('chart__tip-row', `${formatPercent(pct, 0)} of GDP`);
    if (event) add('chart__tip-event', event.short);
    add('chart__tip-hint', 'Click to see it on the stack');
    tip.hidden = false;
    const tw = tip.offsetWidth;
    const left = cx + 14 + tw > scales.width ? cx - 14 - tw : cx + 14;
    tip.style.transform = `translate(${left}px, ${Math.max(8, cy - 40)}px)`;
    if (announce) live.textContent = `${yearLabel(p)}: ${formatUSDCompact(p.total)}${pct != null ? `, ${formatPercent(pct, 0)} of GDP` : ''}.`;
  }

  function hide() {
    tip.hidden = true;
    svg.querySelector('.chart__cross')?.setAttribute('visibility', 'hidden');
    svg.querySelector('.chart__dot')?.setAttribute('visibility', 'hidden');
  }

  function nearest(clientX) {
    const r = svg.getBoundingClientRect();
    const px = clientX - r.left;
    let best = 0;
    scales.pts.forEach((p, i) => {
      if (Math.abs(scales.x(p.x) - px) < Math.abs(scales.x(scales.pts[best].x) - px)) best = i;
    });
    return best;
  }

  svg.addEventListener('pointermove', (e) => scales && show(nearest(e.clientX), false));
  svg.addEventListener('pointerleave', () => {
    if (document.activeElement !== figure) hide();
  });
  svg.addEventListener('click', (e) => {
    if (!scales) return;
    onPick(scales.pts[nearest(e.clientX)].year);
  });
  figure.addEventListener('focus', () => show(focusIndex >= 0 ? focusIndex : scales.pts.length - 1));
  figure.addEventListener('blur', hide);
  figure.addEventListener('keydown', (e) => {
    if (!scales) return;
    const jump = { ArrowLeft: -1, ArrowRight: 1, PageDown: -10, PageUp: 10 }[e.key];
    if (jump) {
      e.preventDefault();
      show(focusIndex + jump);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      show(e.key === 'Home' ? 0 : scales.pts.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPick(scales.pts[focusIndex].year);
    }
  });
  for (const input of modeInputs) {
    input.addEventListener('change', () => {
      mode = input.value;
      focusIndex = -1;
      hide();
      render();
    });
  }
  new ResizeObserver(() => render()).observe(figure);

  function renderTable() {
    const rows = points.filter((p, i) => p.year == null || p.year % 10 === 0 || i === 0);
    table.replaceChildren(...rows.map((p) => {
      const tr = document.createElement('tr');
      const pct = pctOf(p);
      for (const text of [yearLabel(p), formatUSD(p.total), formatHeight(dollarsToMeters(p.total)), pct == null ? '' : formatPercent(pct, 0)]) {
        const td = document.createElement('td');
        td.textContent = text;
        tr.append(td);
      }
      return tr;
    }));
  }

  return {
    setData(entries, gdp) {
      points = toPoints(entries);
      gdpByYear = new Map(gdp.map((g) => [g.year, g.value]));
      latestGdp = gdp.at(-1);
      render();
      renderTable();
    },
    setBorn(year) {
      bornYear = year;
      render();
    },
    modes: MODES,
  };
}
