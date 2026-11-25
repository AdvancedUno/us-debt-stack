// Stack It: landmark drawings, their height markers, and the expandable fact cards.

import { LANDMARKS, metersToDollars, moneyWords } from './scale.js';
import { formatHeight, formatNumber, formatUSDCompact } from './format.js';
import { LANDMARK_ART } from './art.js';

const FEET_PER_METER = 3.28084;

export function createLandmarks({ markerLayer, artLayer }) {
  const card = buildCard();
  let open = null;

  const items = LANDMARKS.map((l) => {
    const marker = document.createElement('div');
    marker.className = `marker marker--${l.id}`;
    marker.style.visibility = 'hidden';

    const line = document.createElement('span');
    line.className = 'marker__line';
    line.setAttribute('aria-hidden', 'true');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'marker__label';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', card.id);
    button.innerHTML = `<span class="marker__name"></span><span class="marker__detail"></span>`;
    button.querySelector('.marker__name').textContent = l.name;
    button.querySelector('.marker__detail').textContent = `${formatHeight(l.height)} · ${formatUSDCompact(metersToDollars(l.height))}`;
    marker.append(line, button);
    markerLayer.append(marker);

    const art = LANDMARK_ART[l.id];
    let artEl = null;
    if (art) {
      artEl = document.createElement('div');
      artEl.className = `art art--${l.id} art--${art.anchor}`;
      artEl.setAttribute('aria-hidden', 'true');
      artEl.innerHTML = art.markup;
      artEl.style.visibility = 'hidden';
      artLayer.append(artEl);
    }

    const item = { ...l, marker, button, artEl, anchor: art?.anchor ?? 'top', visible: false, artHeight: 0 };
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      if (open === item) closeCard();
      else openCard(item);
    });
    return item;
  });

  const measureArt = () => {
    for (const it of items) if (it.artEl) it.artHeight = it.artEl.offsetHeight;
  };
  measureArt();
  window.addEventListener('resize', measureArt);

  // On phones the card is a fixed sheet; a transformed marker would break position: fixed.
  const narrow = window.matchMedia('(max-width: 720px)');

  function openCard(item) {
    closeCard();
    fillCard(card, item);
    (narrow.matches ? document.body : item.marker).append(card);
    // Open upward for landmarks in the lower half, so the card stays clear of the dock.
    card.classList.toggle('lm-card--up', item.marker.getBoundingClientRect().top > window.innerHeight * 0.45);
    card.hidden = false;
    item.button.setAttribute('aria-expanded', 'true');
    item.marker.classList.add('is-open');
    open = item;
  }

  function closeCard() {
    if (!open) return;
    card.hidden = true;
    open.button.setAttribute('aria-expanded', 'false');
    open.marker.classList.remove('is-open');
    open = null;
  }

  document.addEventListener('click', (e) => {
    if (open && !card.contains(e.target)) closeCard();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) {
      const button = open.button;
      closeCard();
      button.focus();
    }
  });
  card.querySelector('.lm-card__close').addEventListener('click', (e) => {
    e.stopPropagation();
    const button = open?.button;
    closeCard();
    button?.focus();
  });

  let denomination = 100;

  return function update({ yAt, visibleY, stack }) {
    if (stack.denomination !== denomination) {
      denomination = stack.denomination;
      for (const it of items) {
        it.button.querySelector('.marker__detail').textContent =
          `${formatHeight(it.height)} · ${formatUSDCompact(metersToDollars(it.height, denomination))}`;
      }
    }
    for (const it of items) {
      const y = yAt(it.height);
      const visible = visibleY(y, 320);
      if (visible) {
        it.marker.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
        if (it.artEl) {
          // On phones there is no room beside the label, so centered art hangs below the line too.
          const center = narrow.matches ? 6 : -it.artHeight / 2;
          const offset = it.anchor === 'center' ? center : it.anchor === 'line' ? 0 : 2;
          it.artEl.style.transform = `translate3d(0, ${(y + offset).toFixed(1)}px, 0)`;
        }
      }
      if (visible !== it.visible) {
        it.marker.style.visibility = visible ? 'visible' : 'hidden';
        if (it.artEl) it.artEl.style.visibility = visible ? 'visible' : 'hidden';
        it.visible = visible;
        if (!visible && open === it) closeCard();
      }
    }
  };
}

function buildCard() {
  const card = document.createElement('div');
  card.className = 'lm-card';
  card.id = 'landmark-card';
  card.hidden = true;
  card.setAttribute('role', 'region');
  card.setAttribute('aria-label', 'Landmark details');
  card.innerHTML = `
    <button type="button" class="lm-card__close" aria-label="Close">&times;</button>
    <h3 class="lm-card__title"></h3>
    <dl class="lm-card__facts">
      <div><dt>Height</dt><dd data-card="height"></dd></div>
      <div><dt>To reach it</dt><dd data-card="dollars"></dd></div>
      <div><dt>$100 bills</dt><dd data-card="bills"></dd></div>
    </dl>
    <p class="lm-card__fact"></p>`;
  card.addEventListener('click', (e) => e.stopPropagation());
  return card;
}

function fillCard(card, item) {
  const dollars = metersToDollars(item.height);
  const bills = dollars / 100;
  card.querySelector('.lm-card__title').textContent = item.name;
  card.querySelector('[data-card="height"]').textContent =
    `${formatHeight(item.height)} (${formatNumber(item.height * FEET_PER_METER)} ft)`;
  card.querySelector('[data-card="dollars"]').textContent = moneyWords(Number(dollars.toPrecision(3)));
  card.querySelector('[data-card="bills"]').textContent = bills < 1e6
    ? formatNumber(Math.round(bills / 100) * 100)
    : moneyWords(Number(bills.toPrecision(3))).replace('$', '');
  card.querySelector('.lm-card__fact').textContent = item.fact;
}
