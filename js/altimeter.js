// Stack It: the fixed altimeter. Always shows the true height, whatever the zoom.

import { metersToDollars, nextLandmark } from './scale.js';
import { formatHeight, formatUSDCompact } from './format.js';

export function createAltimeter(root) {
  const field = (name) => root.querySelector(`[data-alt="${name}"]`);
  const fields = { height: field('height'), dollars: field('dollars'), next: field('next'), level: field('level') };
  const gauge = root.querySelector('.altimeter__fill');
  const last = {};

  const set = (name, text) => {
    if (last[name] !== text) {
      fields[name].textContent = text;
      last[name] = text;
    }
  };

  root.hidden = false;

  const html = document.documentElement;
  const intro = document.querySelector('.intro');
  const finale = document.querySelector('.finale');

  return function update({ altitude, level, stack, p, vh }) {
    // Shown only during the climb: not on the intro screen, not over the finale.
    const y = window.scrollY;
    html.classList.toggle('is-climbing', y > intro.offsetHeight * 0.4 && y < finale.offsetTop - vh * 0.45);
    set('height', formatHeight(altitude));
    const topDollars = metersToDollars(stack.top, stack.denomination);
    set('dollars', altitude <= stack.top * 1.0001 // standing on the top still counts as on the stack
      ? formatUSDCompact(metersToDollars(altitude, stack.denomination))
      : `Above the top (${formatUSDCompact(topDollars)})`);
    const next = nextLandmark(altitude);
    set('next', next ? `${next.name}, ${formatHeight(next.height - altitude)} up` : 'You reached the Moon');
    set('level', `one ${level.label}`);
    gauge.style.transform = `scaleY(${p.toFixed(4)})`;
  };
}
