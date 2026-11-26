// Stack It: the Explore dock. Time travel through 237 years of debt (drag, click the
// sparkline, or press play), your lifetime, or one person's share in $100 or $1 bills.
// Every change flies the camera to the new top of the stack.

import { dollarsToMeters, landmarkBelow, LANDMARKS, perPerson } from './scale.js';
import { formatDate, formatHeight, formatNumber, formatPercent, formatUSD, formatUSDCompact } from './format.js';
import { createSparkline } from './chart.js';

export function createControls({ root, data, onChange, onState = () => {}, onPlay = () => {}, onBorn = () => {}, reducedMotion }) {
  const $ = (sel) => root.querySelector(sel);
  const slider = $('[data-control="year"]');
  const amountEl = $('[data-out="amount"]');
  const labelEl = $('[data-out="label"]');
  const heightEl = $('[data-out="height"]');
  const contextEl = $('[data-out="context"]');
  const gdpEl = $('[data-out="gdp"]');
  const lifetimeEl = $('[data-out="lifetime"]');
  const nationPanel = $('[data-panel="nation"]');
  const personPanel = $('[data-panel="person"]');
  const todayBtn = $('[data-control="today"]');
  const playBtn = $('[data-control="play"]');
  const bornInput = $('[data-control="born"]');
  const copyBtn = $('[data-control="copy"]');
  const modeInputs = root.querySelectorAll('[name="mode"]');
  const denomInputs = root.querySelectorAll('[name="denomination"]');

  const sparkline = createSparkline($('.spark'), {
    onPick: (i) => self.selectIndex(i, { animate: false }),
  });

  let entries;
  let lastIndex;
  let gdpByYear;
  let latestGdp;
  let share;

  // (Re)load the data. Called again when live data replaces saved data.
  function load(next) {
    data = next;
    entries = [
      ...data.history.map((h) => ({ year: h.year, total: h.total, label: `Fiscal year ${h.year}` })),
      { year: null, total: data.debt.total, label: `Today (${formatDate(data.debt.date)})` },
    ];
    lastIndex = entries.length - 1;
    slider.min = '0';
    slider.max = String(lastIndex);
    $('[data-out="first-year"]').textContent = String(entries[0].year);
    gdpByYear = new Map(data.gdp.map((g) => [g.year, g.value]));
    latestGdp = data.gdp.at(-1);
    share = perPerson(data.debt.total, data.population.value);
    bornInput.min = String(entries[0].year);
    bornInput.max = String(entries.at(-2).year);
    sparkline.setData(entries);
  }

  load(data);
  slider.value = String(lastIndex);
  const state = { mode: 'nation', index: lastIndex, denomination: 100, bornYear: null };
  let shown = data.debt.total;
  let anim = 0;

  function countTo(target, animate) {
    cancelAnimationFrame(anim);
    const from = shown;
    if (!animate || reducedMotion() || from === target) {
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

  function renderLifetime() {
    const y = state.bornYear;
    if (!y) {
      lifetimeEl.textContent = '';
      return;
    }
    const then = entries.find((e) => e.year === y);
    if (!then) {
      lifetimeEl.textContent = `Enter a year from ${entries[0].year} to ${entries.at(-2).year}.`;
      return;
    }
    const now = entries[lastIndex].total;
    const grew = dollarsToMeters(now) - dollarsToMeters(then.total);
    const times = now / then.total;
    lifetimeEl.textContent = `Since ${y}: ${formatUSDCompact(then.total)} → ${formatUSDCompact(now)}, `
      + `${times < 10 ? formatNumber(times, 1) : formatNumber(Math.round(times))}× as much. The stack grew ${formatHeight(grew)} in your lifetime.`;
  }

  function publicState() {
    return state.mode === 'person'
      ? { mode: 'person', denomination: state.denomination }
      : { mode: 'nation', year: entries[state.index].year };
  }

  function emit({ behavior = 'instant', fly = true, animate = true } = {}) {
    nationPanel.hidden = state.mode !== 'nation';
    personPanel.hidden = state.mode !== 'person';
    modeInputs.forEach((r) => { r.checked = r.value === state.mode; });
    denomInputs.forEach((r) => { r.checked = Number(r.value) === state.denomination; });

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
      slider.value = String(state.index);
      slider.setAttribute('aria-valuetext', `${e.year ?? 'Today'}: ${formatUSDCompact(e.total)}`);
      todayBtn.disabled = e.year === null;
      sparkline.setIndex(state.index);
      countTo(e.total, animate);
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
      countTo(share, animate);
      onChange({ top, publicTop: null, denomination: state.denomination, label: 'Your share', behavior, fly });
    }
    renderLifetime();
    onState(publicState(), { fly });
  }

  const smooth = () => (reducedMotion() ? 'instant' : 'smooth');

  const self = {
    emit,
    get entries() {
      return entries;
    },
    get index() {
      return state.index;
    },
    get mode() {
      return state.mode;
    },
    selectIndex(i, opts = {}) {
      state.mode = 'nation';
      state.index = Math.max(0, Math.min(lastIndex, i));
      emit(opts);
    },
    /** year = a fiscal year, or null for today. Picks the closest year on record. */
    selectYear(year, opts = {}) {
      if (year == null) return self.selectIndex(lastIndex, opts);
      let best = 0;
      entries.forEach((e, i) => {
        if (e.year != null && Math.abs(e.year - year) < Math.abs(entries[best].year - year)) best = i;
      });
      return self.selectIndex(best, opts);
    },
    selectPerson(denomination = 100, opts = {}) {
      state.mode = 'person';
      state.denomination = denomination;
      emit(opts);
    },
    setPlaying(playing) {
      playBtn.setAttribute('aria-pressed', String(playing));
      playBtn.querySelector('.play__label').textContent = playing ? 'Pause' : 'Play 1790 → today';
      root.classList.toggle('is-playing', playing);
    },
    /** New data: keep the reader on the same year (or on today) and don't move the camera. */
    setData(next) {
      const wasToday = state.index === lastIndex;
      const year = entries[state.index]?.year;
      load(next);
      const sameYear = entries.findIndex((e) => e.year === year);
      state.index = wasToday || sameYear < 0 ? lastIndex : sameYear;
      emit({ fly: false });
    },
  };

  slider.addEventListener('input', () => self.selectIndex(Number(slider.value), { animate: false }));
  todayBtn.addEventListener('click', () => self.selectIndex(lastIndex, { behavior: smooth() }));
  playBtn.addEventListener('click', () => onPlay());
  modeInputs.forEach((radio) => radio.addEventListener('change', () => {
    state.mode = radio.value;
    emit({ behavior: smooth() });
  }));
  denomInputs.forEach((radio) => radio.addEventListener('change', () => {
    state.denomination = Number(radio.value);
    emit({ behavior: smooth() });
  }));
  bornInput.addEventListener('change', () => {
    const y = Number(bornInput.value);
    state.bornYear = Number.isInteger(y) && y > 0 ? y : null;
    const valid = state.bornYear && entries.some((e) => e.year === state.bornYear);
    sparkline.setBorn(valid ? state.bornYear : null);
    onBorn(valid ? state.bornYear : null);
    renderLifetime();
  });
  copyBtn.addEventListener('click', async () => {
    const label = copyBtn.textContent;
    try {
      await navigator.clipboard.writeText(window.location.href);
      copyBtn.textContent = 'Link copied';
    } catch {
      copyBtn.textContent = 'Copy failed';
    }
    setTimeout(() => { copyBtn.textContent = label; }, 1600);
  });

  amountEl.textContent = formatUSD(shown);
  return self;
}
