// Stack It: other countries, side by side. Each bar is a stack of $100 bills on one
// shared, linear scale. Data: IMF World Economic Outlook, saved by scripts/refresh-countries.mjs.

import { dollarsToMeters } from './scale.js';
import { formatHeight, formatPercent, formatUSD, formatUSDCompact } from './format.js';
import { fetchJSON } from './api.js';

const MODES = {
  total: {
    value: (c) => c.debt,
    label: (v) => formatUSDCompact(v),
    axis: (v) => `${formatUSDCompact(v)} · ${formatHeight(dollarsToMeters(v))}`,
    step: 10e12,
  },
  person: {
    value: (c) => c.debt / c.population,
    label: (v) => formatUSDCompact(v),
    axis: (v) => `${formatUSDCompact(v)} · ${formatHeight(dollarsToMeters(v))}`,
    step: 25_000,
  },
  gdp: {
    value: (c) => c.debtPctGdp / 100,
    label: (v) => formatPercent(v, 0),
    axis: (v) => formatPercent(v, 0),
    step: 0.5,
  },
};

export async function createCountries(root) {
  const bars = root.querySelector('.countries__bars');
  const axis = root.querySelector('.countries__axis');
  const tip = root.querySelector('.countries__tip');
  const meta = root.querySelector('.countries__meta');
  const table = root.querySelector('.countries__table tbody');
  let mode = 'total';
  let data;

  try {
    data = await fetchJSON('./data/countries.json', { timeoutMs: 8000 });
  } catch (err) {
    console.warn('[stack-it] countries data unavailable.', err);
    root.hidden = true;
    return;
  }

  meta.innerHTML = '';
  const source = document.createElement('a');
  source.href = data.sourceUrl;
  source.textContent = 'IMF World Economic Outlook';
  meta.append(`${data.year} figures from the `, source, `, saved ${new Date(`${data.savedAt}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. ${data.note}`);

  function render() {
    const m = MODES[mode];
    const rows = [...data.countries].sort((a, b) => m.value(b) - m.value(a));
    const max = Math.ceil(Math.max(...rows.map(m.value)) / m.step) * m.step;

    axis.replaceChildren(...Array.from({ length: Math.round(max / m.step) + 1 }, (_, i) => {
      const v = i * m.step;
      const line = document.createElement('div');
      line.className = 'countries__gridline';
      line.style.bottom = `${(v / max) * 100}%`;
      line.dataset.label = m.axis(v);
      line.dataset.short = m.label(v);
      return line;
    }));

    bars.replaceChildren(...rows.map((c, i) => {
      const v = m.value(c);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `countries__bar${c.iso === 'USA' ? ' is-us' : ''}`;
      b.style.setProperty('--h', `${(v / max) * 100}%`);
      b.style.setProperty('--i', i);
      b.setAttribute('aria-label', `${c.name}: ${describe(c)}`);
      b.innerHTML = '<span class="countries__value"></span><span class="countries__stack"></span><span class="countries__name"></span>';
      b.querySelector('.countries__value').textContent = m.label(v);
      b.querySelector('.countries__name').textContent = c.iso === 'GBR' ? 'UK' : c.iso === 'USA' ? 'U.S.' : c.name.replace('South ', 'S. ');
      const show = () => showTip(b, c);
      b.addEventListener('pointerenter', show);
      b.addEventListener('focus', show);
      b.addEventListener('pointerleave', () => { tip.hidden = true; });
      b.addEventListener('blur', () => { tip.hidden = true; });
      return b;
    }));

    table.replaceChildren(...rows.map((c) => {
      const tr = document.createElement('tr');
      for (const text of [c.name, formatUSDCompact(c.debt), formatHeight(dollarsToMeters(c.debt)), formatUSD(c.debt / c.population), formatPercent(c.debtPctGdp / 100, 0)]) {
        const td = document.createElement('td');
        td.textContent = text;
        tr.append(td);
      }
      return tr;
    }));
  }

  function describe(c) {
    return `${formatUSDCompact(c.debt)} total, a stack ${formatHeight(dollarsToMeters(c.debt))} tall; `
      + `${formatUSD(c.debt / c.population)} per person; ${formatPercent(c.debtPctGdp / 100, 0)} of GDP.`;
  }

  function showTip(bar, c) {
    tip.replaceChildren();
    const h = document.createElement('strong');
    h.textContent = c.name;
    const rows = [
      `Debt: ${formatUSDCompact(c.debt)} (stack ${formatHeight(dollarsToMeters(c.debt))})`,
      `Per person: ${formatUSD(c.debt / c.population)}`,
      `Share of GDP: ${formatPercent(c.debtPctGdp / 100, 0)}`,
    ].map((t) => {
      const s = document.createElement('span');
      s.textContent = t;
      return s;
    });
    tip.append(h, ...rows);
    tip.hidden = false;
    const r = bar.getBoundingClientRect();
    const box = root.querySelector('.countries__plot').getBoundingClientRect();
    const left = Math.min(box.width - tip.offsetWidth, Math.max(0, r.left - box.left + r.width / 2 - tip.offsetWidth / 2));
    tip.style.transform = `translate(${left}px, 0)`;
  }

  for (const input of root.querySelectorAll('[name="country-mode"]')) {
    input.addEventListener('change', () => {
      mode = input.value;
      tip.hidden = true;
      render();
    });
  }
  render();
}
