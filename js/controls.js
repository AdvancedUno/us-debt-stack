// Stack It: the Explore dock. Time travel through 237 years of debt, or switch to
// one person's share in $100 or $1 bills. Every change flies the camera to the new top.

import { dollarsToMeters, landmarkBelow, LANDMARKS, perPerson } from './scale.js';
import { formatDate, formatHeight, formatNumber, formatPercent, formatUSD, formatUSDCompact } from './format.js';

export function createControls({ root, data, onChange, reducedMotion }) {
  const $ = (sel) => root.querySelector(sel);
  const slider = $('[data-control="year"]');
  const amountEl = $('[data-out="amount"]');
  const labelEl = $('[data-out="label"]');
  const heightEl = $('[data-out="height"]');
  const contextEl = $('[data-out="context"]');
  const gdpEl = $('[data-out="gdp"]');
  const nationPanel = $('[data-panel="nation"]');
  const personPanel = $('[data-panel="person"]');
  const todayBtn = $('[data-control="today"]');

  const entries = [
    ...data.history.map((h) => ({ year: h.year, total: h.total, label: `Fiscal year ${h.year}` })),
    { year: null, total: data.debt.total, label: `Today (${formatDate(data.debt.date)})` },
  ];
  const lastIndex = entries.length - 1;
  slider.min = '0';
  slider.max = String(lastIndex);
  slider.value = String(lastIndex);
  $('[data-out="first-year"]').textContent = String(entries[0].year);

  const gdpByYear = new Map(data.gdp.map((g) => [g.year, g.value]));
  const latestGdp = data.gdp.at(-1);
  const share = perPerson(data.debt.total, data.population.value);

  const state = { mode: 'nation', index: lastIndex, denomination: 100 };
  let shown = data.debt.total;
  let anim = 0;

  function countTo(target) {
    cancelAnimationFrame(anim);
    const from = shown;
    if (reducedMotion() || from === target) {
      shown = target;
      amountEl.textContent = formatUSD(target);
      return;
    }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 450);
      shown = from + (target - from) * (1 - (1 - t) ** 3);
      amountEl.textContent = formatUSD(shown);
      if (t < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }

  function context(top) {
    const below = landmarkBelow(top);
    const next = LANDMARKS.find((l) => l.height > top);
    const parts = [];
    if (below) parts.push(`Above: ${below.name}.`);
    if (next) parts.push(`Below: ${next.name}.`);
    return parts.join(' ');
  }

  function emit({ behavior = 'auto', fly = true } = {}) {
    nationPanel.hidden = state.mode !== 'nation';
    personPanel.hidden = state.mode !== 'person';

    if (state.mode === 'nation') {
      const e = entries[state.index];
      const top = dollarsToMeters(e.total);
      labelEl.textContent = e.label;
      heightEl.textContent = `Stack: ${formatHeight(top)} of $100 bills.`;
      contextEl.textContent = context(top);
      const gdpYear = e.year ?? latestGdp.year;
      const gdp = gdpByYear.get(gdpYear);
      gdpEl.textContent = gdp
        ? `About ${formatPercent(e.total / gdp, 0)} of ${gdpYear} GDP.`
        : 'GDP figures start in 1960.';
      slider.setAttribute('aria-valuetext', `${e.year ?? 'Today'}: ${formatUSDCompact(e.total)}`);
      todayBtn.disabled = e.year === null;
      countTo(e.total);
      onChange({
        top,
        publicTop: e.year === null ? dollarsToMeters(data.debt.public) : null,
        denomination: 100,
        label: e.year === null ? formatDate(data.debt.date) : `FY ${e.year}`,
        behavior,
        fly,
      });
    } else {
      const top = dollarsToMeters(share, state.denomination);
      labelEl.textContent = `One person’s share (÷ ${formatNumber(data.population.value / 1e6, 1)} million people, ${data.population.year})`;
      heightEl.textContent = `Stack: ${formatHeight(top)} of $${state.denomination} bills.`;
      contextEl.textContent = context(top);
      gdpEl.textContent = 'Total debt, including intragovernmental holdings, divided by population.';
      countTo(share);
      onChange({ top, publicTop: null, denomination: state.denomination, label: 'Your share', behavior, fly });
    }
  }

  const smooth = () => (reducedMotion() ? 'auto' : 'smooth');

  slider.addEventListener('input', () => {
    state.index = Number(slider.value);
    emit();
  });
  todayBtn.addEventListener('click', () => {
    state.index = lastIndex;
    slider.value = String(lastIndex);
    emit({ behavior: smooth() });
  });
  for (const radio of root.querySelectorAll('[name="mode"]')) {
    radio.addEventListener('change', () => {
      state.mode = radio.value;
      emit({ behavior: smooth() });
    });
  }
  for (const radio of root.querySelectorAll('[name="denomination"]')) {
    radio.addEventListener('change', () => {
      state.denomination = Number(radio.value);
      emit({ behavior: smooth() });
    });
  }

  amountEl.textContent = formatUSD(shown);
  return { emit };
}
