// Stack It: "Take the elevator". A guided ride from the ground to the Moon that
// stops at each landmark and reads out its card. Wheel, touch or a scroll key hands
// control back to the reader at once.

import { LANDMARKS, metersToDollars } from './scale.js';
import { formatHeight, formatUSDCompact } from './format.js';
import { wait, watchForTakeover } from './narrator.js';

const DWELL_MS = 2800;
const SCREENS_PER_SECOND = 1.4;

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function createElevator({ climb, narrator, reducedMotion, getStack, onFinish = () => {} }) {
  let controller = null;
  let paused = false;
  let resumeWaiters = [];

  const untilResumed = () => (paused ? new Promise((r) => resumeWaiters.push(r)) : Promise.resolve());

  /** Animate the scroll to `target` px; respects pause and abort. */
  function glide(target, signal) {
    const from = window.scrollY;
    const distance = Math.abs(target - from);
    if (reducedMotion() || distance < 2) {
      window.scrollTo({ top: target, behavior: 'instant' });
      return Promise.resolve();
    }
    const duration = Math.min(4200, Math.max(700, (distance / (window.innerHeight * SCREENS_PER_SECOND)) * 1000));
    return new Promise((resolve) => {
      let start = null;
      let elapsedBeforePause = 0;
      const step = (now) => {
        if (signal.aborted) return resolve();
        if (paused) {
          start = null;
          return untilResumed().then(() => requestAnimationFrame(step));
        }
        if (start === null) start = now - elapsedBeforePause;
        elapsedBeforePause = now - start;
        const t = Math.min(1, elapsedBeforePause / duration);
        window.scrollTo({ top: from + (target - from) * ease(t), behavior: 'instant' });
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  async function ride(signal) {
    const stack = getStack();
    const stops = [
      ...LANDMARKS.filter((l) => l.height < stack.top),
      { name: 'Top of the stack', height: stack.top, fact: `${stack.label}. Every bill below you is part of it.` },
      ...LANDMARKS.filter((l) => l.height > stack.top),
    ];
    narrator.say('Going up', 'Starting at the ground. Scroll any time to take over.');
    await glide(climb.scrollTopFor(0), signal);
    await wait(1200, signal);

    for (const stop of stops) {
      if (signal.aborted) return;
      narrator.say(`Next: ${stop.name}`, `${formatHeight(stop.height)} up.`);
      await glide(climb.scrollTopFor(stop.height), signal);
      if (signal.aborted) return;
      const dollars = formatUSDCompact(metersToDollars(stop.height, stack.denomination));
      narrator.say(`${stop.name} · ${formatHeight(stop.height)} · ${dollars}`, stop.fact);
      await wait(DWELL_MS, signal);
      await untilResumed();
    }
    if (!signal.aborted) {
      narrator.say('End of the line', 'That’s the whole climb. Below: the same trip on one true-to-scale ruler.');
      await wait(DWELL_MS, signal);
      document.getElementById('finale')?.scrollIntoView({ behavior: reducedMotion() ? 'instant' : 'smooth' });
    }
  }

  const self = {
    get running() {
      return controller !== null;
    },
    async start() {
      if (controller) return;
      controller = new AbortController();
      paused = false;
      narrator.claim(self, 'Elevator tour');
      const stopWatching = watchForTakeover(() => self.stop());
      try {
        await ride(controller.signal);
      } finally {
        stopWatching();
        narrator.release(self);
        controller = null;
        onFinish();
      }
    },
    stop() {
      controller?.abort();
      paused = false;
      resumeWaiters.forEach((r) => r());
      resumeWaiters = [];
    },
    togglePause() {
      paused = !paused;
      narrator.setPaused(paused);
      if (!paused) {
        resumeWaiters.forEach((r) => r());
        resumeWaiters = [];
      }
    },
  };
  return self;
}
