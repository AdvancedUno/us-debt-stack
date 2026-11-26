// Stack It: the history time-lapse. Press play and the stack regrows from 1790 to
// today while the camera rides its top, pausing on historical markers.

import { dollarsToMeters } from './scale.js';
import { formatHeight, formatUSDCompact } from './format.js';
import { EVENTS } from './events.js';
import { wait, watchForTakeover } from './narrator.js';

const YEARS_PER_SECOND = 9;
const EVENT_DWELL_MS = 2400;

export function createTimelapse({ controls, narrator }) {
  let controller = null;
  let paused = false;

  const caption = (e, entry) =>
    `${entry.year ?? 'Today'}: ${formatUSDCompact(entry.total)}, a stack ${formatHeight(dollarsToMeters(entry.total))} tall.`;

  async function run(signal) {
    const entries = controls.entries;
    // Restart from the beginning unless we're paused partway through
    let pos = controls.index >= entries.length - 1 ? 0 : controls.index;
    const shown = new Set(EVENTS.filter((e) => e.year < (entries[pos].year ?? Infinity)).map((e) => e.year));
    let last = performance.now();

    while (!signal.aborted && pos < entries.length - 1) {
      const now = await new Promise((r) => requestAnimationFrame(r));
      if (paused) {
        last = now;
        continue;
      }
      pos = Math.min(entries.length - 1, pos + ((now - last) / 1000) * YEARS_PER_SECOND);
      last = now;
      const i = Math.floor(pos);
      const entry = entries[i];
      controls.selectIndex(i, { animate: false });

      const event = EVENTS.find((e) => !shown.has(e.year) && entry.year != null && entry.year >= e.year);
      if (event) {
        shown.add(event.year);
        narrator.say(event.title, caption(event, entry));
        await wait(EVENT_DWELL_MS, signal);
        last = performance.now();
      } else {
        narrator.say(entry.year == null ? 'Today' : String(entry.year), caption(null, entry));
      }
    }
    if (!signal.aborted) {
      controls.selectIndex(entries.length - 1, { animate: false });
      narrator.say('Today', caption(null, entries.at(-1)));
      await wait(EVENT_DWELL_MS, signal);
    }
  }

  const self = {
    get running() {
      return controller !== null;
    },
    async toggle() {
      if (controller) return self.stop();
      controller = new AbortController();
      paused = false;
      narrator.claim(self, 'History time-lapse');
      controls.setPlaying(true);
      const stopWatching = watchForTakeover(() => self.stop());
      try {
        await run(controller.signal);
      } finally {
        stopWatching();
        narrator.release(self);
        controls.setPlaying(false);
        controller = null;
      }
    },
    stop() {
      controller?.abort();
    },
    togglePause() {
      paused = !paused;
      narrator.setPaused(paused);
    },
  };
  return self;
}
