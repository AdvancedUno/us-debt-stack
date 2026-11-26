// Stack It: the narration bar shared by the elevator tour and the history time-lapse.
// One owner at a time; starting a new one stops the previous owner.

export function createNarrator(root) {
  const title = root.querySelector('.narrator__title');
  const body = root.querySelector('.narrator__body');
  const pauseBtn = root.querySelector('[data-act="pause"]');
  const stopBtn = root.querySelector('[data-act="stop"]');
  let owner = null;

  pauseBtn.addEventListener('click', () => owner?.togglePause());
  stopBtn.addEventListener('click', () => owner?.stop());

  return {
    /** Take over the bar. `who` has togglePause() and stop(). */
    claim(who, label) {
      if (owner && owner !== who) owner.stop();
      owner = who;
      root.setAttribute('aria-label', label);
      root.hidden = false;
      this.setPaused(false);
    },
    release(who) {
      if (owner !== who) return;
      owner = null;
      root.hidden = true;
    },
    say(heading, text = '') {
      title.textContent = heading;
      body.textContent = text;
    },
    setPaused(paused) {
      pauseBtn.textContent = paused ? 'Resume' : 'Pause';
      pauseBtn.setAttribute('aria-pressed', String(paused));
    },
  };
}

/**
 * Calls `onInterrupt` when the reader takes over the scroll themselves
 * (wheel, touch, scroll keys). Returns a function that removes the listeners.
 */
export function watchForTakeover(onInterrupt) {
  const keys = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);
  const onKey = (e) => {
    if (e.key === 'Escape' || (keys.has(e.key) && !e.target.closest?.('input, button, select, textarea'))) onInterrupt();
  };
  const opts = { passive: true };
  window.addEventListener('wheel', onInterrupt, opts);
  window.addEventListener('touchstart', onInterrupt, opts);
  window.addEventListener('keydown', onKey);
  return () => {
    window.removeEventListener('wheel', onInterrupt, opts);
    window.removeEventListener('touchstart', onInterrupt, opts);
    window.removeEventListener('keydown', onKey);
  };
}

/** Promise-based wait that a tour can cut short. */
export function wait(ms, signal) {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(t); resolve(); }, { once: true });
  });
}
