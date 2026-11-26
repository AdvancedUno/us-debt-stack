// Stack It: hover (or focus, or tap) the stack to split it into debt held by the
// public and intragovernmental holdings.

import { formatHeight, formatPercent, formatUSDCompact } from './format.js';
import { dollarsToMeters } from './scale.js';

export function createBreakdown({ stage, stackEl, tip, debt }) {
  let share = debt.public / debt.total;
  let enabled = true;
  let pinned = false;

  const html = () => enabled
    ? `<strong>Who holds this debt</strong>
       <span class="tip__row"><i class="swatch swatch--public"></i>Held by the public: ${formatUSDCompact(debt.public)} (${formatPercent(share)})</span>
       <span class="tip__row"><i class="swatch swatch--intra"></i>Intragovernmental: ${formatUSDCompact(debt.intragov)} (${formatPercent(1 - share)})</span>
       <span class="tip__note">The intragovernmental part is drawn on top, from ${formatHeight(dollarsToMeters(debt.public))} up.</span>`
    : `<strong>Who holds this debt</strong><span class="tip__note">The public / intragovernmental split is available for today’s figure only.</span>`;

  function show(x, y) {
    tip.innerHTML = html();
    tip.hidden = false;
    place(x, y);
    stage.classList.toggle('is-split', enabled);
  }
  function hide() {
    if (pinned) return;
    tip.hidden = true;
    stage.classList.remove('is-split');
  }
  function place(x, y) {
    const pad = 16;
    const { width, height } = tip.getBoundingClientRect();
    const left = Math.min(window.innerWidth - width - pad, x + 18);
    const top = Math.min(window.innerHeight - height - pad, Math.max(pad, y - height / 2));
    tip.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  }
  const center = () => {
    const r = stackEl.getBoundingClientRect();
    return [r.right, Math.min(window.innerHeight * 0.5, r.top + r.height / 2)];
  };

  stackEl.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse') show(e.clientX, e.clientY);
  });
  stackEl.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' && !tip.hidden) place(e.clientX, e.clientY);
  });
  stackEl.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') hide();
  });
  stackEl.addEventListener('focus', () => show(...center()));
  stackEl.addEventListener('blur', () => {
    pinned = false;
    hide();
  });
  // Tap or Enter/Space pins it open (touch has no hover)
  const toggle = () => {
    pinned = !pinned;
    if (pinned) show(...center());
    else hide();
  };
  stackEl.addEventListener('click', toggle);
  stackEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
    if (e.key === 'Escape') {
      pinned = false;
      hide();
    }
  });
  window.addEventListener('scroll', () => {
    if (pinned && !tip.hidden) place(...center());
  }, { passive: true });

  return {
    setDebt(next) {
      debt = next;
      share = debt.public / debt.total;
      if (!tip.hidden) show(...center());
    },
    setEnabled(value) {
      enabled = value;
      if (!tip.hidden) show(...center());
    },
  };
}
