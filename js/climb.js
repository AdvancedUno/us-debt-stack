// Stack It: the climb. Maps scroll position to altitude and draws the stack and ground.
// Other modules (scenery, landmarks, altimeter, nav) subscribe and draw from the same frame.
//
// Model: the chapter sections are laid out one after another, each `chapter.screens`
// viewport-heights tall. Scroll progress p in [0, 1] runs from the top of the first
// chapter to the bottom of the last. Something at altitude h is drawn at
//   y = eye - (progressAt(h) - p) * P
// where P is the climb's total height in px, so the world moves 1:1 with the scroll
// and scrolling down climbs up. Passing a depth < 1 moves distant things more slowly.

import { altitudeAt, chapterAt, detailLevelFor, detailLevels, metersPerProgress, progressAt, totalScreens } from './scale.js';
import { skyAt } from './sky.js';

const EYE = 0.62; // the camera's altitude sits this far down the viewport
const OFFSCREEN = 160; // px of slack before hiding things outside the viewport
const BOLD_MIN_PX = 14; // bold texture lines are at least this far apart

const clamp01 = (x) => Math.min(1, Math.max(0, x));

export function createClimb({ stage, track, chapters }) {
  const sections = chapters.map((c) => {
    const el = track.querySelector(`[data-chapter="${c.id}"]`);
    if (!el) throw new Error(`Missing section for chapter "${c.id}"`);
    return el;
  });
  const screens = totalScreens(chapters);
  const root = document.documentElement;
  const ground = stage.querySelector('.ground');
  const stackEl = stage.querySelector('.stack');
  const texture = stackEl.querySelector('.stack__texture');
  const upper = stackEl.querySelector('.stack__upper');
  const flag = stage.querySelector('.flag');
  const flagText = flag.querySelector('.flag__text');

  let stack = { top: 0, publicTop: null, denomination: 100, label: '' };
  let levels = detailLevels(100);
  const subscribers = new Set();

  let vw = 0;
  let vh = 0;
  let climbTop = 0;
  let P = 1;
  let frame = 0;
  let lastSky = '';

  function measure() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    chapters.forEach((c, i) => {
      sections[i].style.minHeight = '0';
      sections[i].style.height = `${(c.screens * vh).toFixed(1)}px`;
    });
    climbTop = sections[0].getBoundingClientRect().top + window.scrollY;
    P = screens * vh;
  }

  function progressFromScroll() {
    const scrolled = window.scrollY - climbTop;
    // Snap the last pixel to the Moon so rounding in section heights can't leave you short.
    return scrolled >= P - 1 ? 1 : clamp01(scrolled / P);
  }

  function render() {
    frame = 0;
    const p = progressFromScroll();
    const altitude = altitudeAt(p, chapters);
    const eye = vh * EYE;
    const yAt = (h, depth = 1) => eye - (progressAt(h, chapters) - p) * P * depth;
    const visibleY = (y, slack = OFFSCREEN) => y > -slack && y < vh + slack;

    // Sky
    const sky = skyAt(altitude);
    if (sky.color !== lastSky) {
      root.style.setProperty('--sky', sky.color);
      root.dataset.sky = sky.dark ? 'dark' : 'light';
      lastSky = sky.color;
    }

    // Ground: its top edge is altitude 0
    const groundY = yAt(0);
    ground.style.transform = `translate3d(0, ${groundY.toFixed(1)}px, 0)`;
    ground.style.visibility = groundY > vh + OFFSCREEN ? 'hidden' : 'visible';

    // Stack: from the ground to its top, clipped to the viewport
    const topY = yAt(stack.top);
    const top = Math.max(topY, -OFFSCREEN);
    const bottom = Math.min(groundY, vh + OFFSCREEN);
    const pxPerMeter = P / metersPerProgress(altitude, chapters);
    const level = detailLevelFor(pxPerMeter, BOLD_MIN_PX, levels);
    const fine = levels[levels.indexOf(level) - 1];

    if (bottom > top) {
      stackEl.style.visibility = 'visible';
      stackEl.style.transform = `translate3d(0, ${top.toFixed(1)}px, 0)`;
      stackEl.style.height = `${(bottom - top).toFixed(1)}px`;
      // Lines are spaced at the local zoom around the eye line and phased so they
      // line up with whole units and move with the scroll.
      const altAtBottom = altitudeAt(p + (eye - bottom) / P, chapters);
      setLines(texture, '', level, pxPerMeter, altAtBottom);
      if (fine) setLines(texture, '-fine', fine, pxPerMeter, altAtBottom);
      const finePx = fine ? fine.height * pxPerMeter : 0;
      texture.style.setProperty('--fine-alpha', Math.min(0.5, Math.max(0, (finePx - 1.5) / 8)).toFixed(3));
      // Currency straps wrap the middle of each strap; visible while straps are distinguishable.
      const strapPx = levels[1].height * pxPerMeter;
      texture.style.setProperty('--band-alpha', Math.min(1, Math.max(0, (strapPx - 0.4) / 2)).toFixed(3));
      if (texture.dataset.level !== level.name) texture.dataset.level = level.name;

      // Public vs. intragovernmental split (shown on hover)
      if (stack.publicTop != null) {
        const splitY = Math.min(Math.max(yAt(stack.publicTop), top), bottom);
        upper.style.height = `${(splitY - top).toFixed(1)}px`;
      } else {
        upper.style.height = '0px';
      }
    } else {
      stackEl.style.visibility = 'hidden';
    }

    // Flag planted on top of the stack
    const flagVisible = visibleY(topY, 0);
    flag.style.visibility = flagVisible ? 'visible' : 'hidden';
    if (flagVisible) flag.style.transform = `translate3d(0, ${topY.toFixed(1)}px, 0)`;

    const ctx = {
      altitude, p, P, vw, vh, eye, yAt, visibleY, groundY,
      chapter: chapterAt(p, chapters), level, stack,
    };
    for (const fn of subscribers) fn(ctx);
  }

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };
  const onResize = () => {
    measure();
    schedule();
  };

  measure();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', onResize);

  return {
    chapters,
    /** Replace what the stack shows: { top, publicTop, denomination, label }. */
    setStack(next) {
      stack = { ...stack, ...next };
      levels = detailLevels(stack.denomination);
      stackEl.dataset.denomination = String(stack.denomination);
      flagText.textContent = stack.label;
      schedule();
    },
    /** Scroll so the camera sits at altitude h. */
    scrollToAltitude(h, { behavior = 'auto' } = {}) {
      window.scrollTo({ top: climbTop + progressAt(h, chapters) * P, behavior });
    },
    subscribe(fn) {
      subscribers.add(fn);
      schedule();
      return () => subscribers.delete(fn);
    },
    refresh: schedule,
  };
}

function setLines(el, suffix, level, pxPerMeter, altAtBottom) {
  const unitPx = level.height * pxPerMeter;
  const frac = (altAtBottom / level.height) % 1;
  el.style.setProperty(`--unit${suffix}`, `${unitPx.toFixed(2)}px`);
  el.style.setProperty(`--phase${suffix}`, `${(((1 - frac) % 1) * unitPx).toFixed(2)}px`);
}
