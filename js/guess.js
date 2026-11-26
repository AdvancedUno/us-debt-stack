// Stack It: guess first. Before the answer, the reader drags a marker to guess how
// high the stack reaches. The guess then appears as its own marker on the climb.

import { LANDMARKS, MOON_DISTANCE_M, landmarkBelow } from './scale.js';
import { formatHeight, formatNumber } from './format.js';

const MIN_H = 1; // the slider runs on a log scale from 1 m to the Moon
const LOG_SPAN = Math.log10(MOON_DISTANCE_M / MIN_H);
const STEPS = 1000;
const TICKS = ['person', 'arch', 'everest', 'iss', 'geo', 'moon'];

const heightAt = (v) => MIN_H * 10 ** ((v / STEPS) * LOG_SPAN);
const valueAt = (h) => (Math.log10(h / MIN_H) / LOG_SPAN) * STEPS;

export function ratioText(actual, guess) {
  const r = actual / guess;
  const fmt = (x) => (x < 10 ? formatNumber(x, 1) : formatNumber(Math.round(x)));
  if (r >= 0.8 && r <= 1.25) return 'Spot on: within 25% of the real height.';
  return r > 1
    ? `The real stack is ${fmt(r)} times higher than your guess.`
    : `Your guess was ${fmt(1 / r)} times too high.`;
}

export function createGuess({ root, onGuess, onReveal }) {
  const range = root.querySelector('.guess__range');
  const valueEl = root.querySelector('[data-guess="value"]');
  const nearEl = root.querySelector('[data-guess="near"]');
  const ticks = root.querySelector('.guess__ticks');
  const ask = root.querySelector('.guess__ask');
  const result = root.querySelector('.guess__result');
  const resultText = root.querySelector('[data-guess="result"]');
  let actual = 0;
  let revealed = false;
  let lastGuess = null;

  const renderResult = () => {
    resultText.textContent = lastGuess == null
      ? `It would reach ${formatHeight(actual)}.`
      : `You guessed ${formatHeight(lastGuess)}. It would reach ${formatHeight(actual)}. ${ratioText(actual, lastGuess)}`;
  };

  range.min = '0';
  range.max = String(STEPS);
  range.value = String(Math.round(valueAt(10_000))); // start around 10 km

  ticks.replaceChildren(...TICKS.map((id) => {
    const l = LANDMARKS.find((x) => x.id === id);
    const tick = document.createElement('span');
    tick.className = 'guess__tick';
    tick.style.left = `${(valueAt(l.height) / STEPS) * 100}%`;
    const SHORT = { person: 'Person', arch: 'Arch', everest: 'Everest', iss: 'ISS', geo: 'Satellites', moon: 'Moon' };
    tick.textContent = SHORT[l.id];
    return tick;
  }));

  function describe() {
    const h = heightAt(Number(range.value));
    const below = landmarkBelow(h);
    valueEl.textContent = formatHeight(h);
    nearEl.textContent = below ? `higher than ${below.id === 'person' ? 'a person' : below.name}` : 'shorter than a person';
    range.setAttribute('aria-valuetext', `${formatHeight(h)}, ${nearEl.textContent}`);
    return h;
  }

  function reveal(guess) {
    if (revealed) return;
    revealed = true;
    ask.hidden = true;
    result.hidden = false;
    root.dataset.state = 'revealed';
    lastGuess = guess;
    renderResult();
    if (guess != null) onGuess(guess);
    onReveal();
    result.querySelector('.button')?.focus({ preventScroll: true });
  }

  range.addEventListener('input', describe);
  root.querySelector('[data-guess="lock"]').addEventListener('click', () => reveal(describe()));
  root.querySelector('[data-guess="skip"]').addEventListener('click', () => reveal(null));
  describe();

  return {
    setActual(h) {
      actual = h;
      if (revealed) renderResult();
    },
    /** Arriving by a shared link or the elevator: skip the game. */
    skip: () => reveal(null),
  };
}
