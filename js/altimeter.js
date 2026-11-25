// Stack It: the fixed altimeter. Always shows the true height, whatever the zoom.

import { metersToDollars, nextLandmark } from './scale.js';
import { formatHeight, formatUSDCompact } from './format.js';

export function createAltimeter(root, { stackTop, stackDollars }) {
  const field = (name) => root.querySelector(`[data-alt="${name}"]`);
  const fields = { height: field('height'), dollars: field('dollars'), next: field('next'), level: field('level') };
  const last = {};

  const set = (name, text) => {
    if (last[name] !== text) {
      fields[name].textContent = text;
      last[name] = text;
    }
  };

  root.hidden = false;

  return {
    update({ altitude, level }) {
      set('height', formatHeight(altitude));
      set('dollars', altitude <= stackTop
        ? formatUSDCompact(metersToDollars(altitude))
        : `Above the top (${formatUSDCompact(stackDollars)})`);
      const next = nextLandmark(altitude);
      set('next', next ? `${next.name}, ${formatHeight(next.height - altitude)} up` : 'You reached the Moon');
      set('level', `one ${level.label}`);
    },
  };
}
