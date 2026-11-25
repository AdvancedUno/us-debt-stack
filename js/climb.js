// Stack It: the climb. Maps scroll position to altitude and draws the stage.
//
// Model: the climb's chapter sections are laid out one after another, each
// `chapter.screens` viewport-heights tall. Scroll progress p in [0, 1] runs from
// the top of the first chapter to the bottom of the last. Anything at altitude h
// is drawn at   y = eye - (progressAt(h) - p) * P   where P is the climb's total
// height in px, so the world moves 1:1 with the scroll and scrolling down climbs up.

import {
  DETAIL_LEVELS, LANDMARKS, altitudeAt, chapterAt, detailLevelFor, metersPerProgress, metersToDollars, progressAt, totalScreens,
} from './scale.js';
import { formatHeight, formatUSDCompact } from './format.js';
import { skyAt } from './sky.js';

const EYE = 0.62; // the camera's altitude sits this far down the viewport
const BOLD_MIN_PX = 14; // bold texture lines are at least this far apart
const OFFSCREEN = 160; // px of slack before hiding things outside the viewport

export function createClimb({ stage, track, chapters, stackTop, stackLabel, onUpdate = () => {} }) {
  const sections = chapters.map((c) => {
    const el = track.querySelector(`[data-chapter="${c.id}"]`);
    if (!el) throw new Error(`Missing section for chapter "${c.id}"`);
    return el;
  });
  const screens = totalScreens(chapters);
  const ground = stage.querySelector('.ground');
  const stack = stage.querySelector('.stack');
  const texture = stage.querySelector('.stack__texture');
  const markerLayer = stage.querySelector('.markers');

  const markers = [
    ...LANDMARKS.map((l) => ({ ...l, kind: l.id === 'moon' ? 'moon' : 'landmark' })),
    { id: 'top', name: `Top of the stack, ${stackLabel}`, height: stackTop, kind: 'top' },
  ].map((m) => ({ ...m, el: renderMarker(m), progress: 0, visible: false }));
  markerLayer.replaceChildren(...markers.map((m) => m.el));

  let vh = 0;
  let climbTop = 0;
  let P = 0;
  let stackTopProgress = 0;
  let frame = 0;

  function measure() {
    vh = window.innerHeight;
    chapters.forEach((c, i) => {
      sections[i].style.minHeight = '0';
      sections[i].style.height = `${(c.screens * vh).toFixed(1)}px`;
    });
    climbTop = sections[0].getBoundingClientRect().top + window.scrollY;
    P = screens * vh;
    stackTopProgress = progressAt(stackTop, chapters);
    for (const m of markers) m.progress = progressAt(m.height, chapters);
  }

  const yFor = (progress, p, eye) => eye - (progress - p) * P;

  function render() {
    frame = 0;
    const scrolled = window.scrollY - climbTop;
    // Snap the last pixel to the Moon so rounding in section heights can't leave you 14 km short.
    const p = scrolled >= P - 1 ? 1 : Math.max(0, scrolled / P);
    const altitude = altitudeAt(p, chapters);
    const eye = vh * EYE;

    // Sky
    const sky = skyAt(altitude);
    document.documentElement.style.setProperty('--sky', sky.color);
    stage.dataset.sky = sky.dark ? 'dark' : 'light';

    // Ground: its top edge is altitude 0
    const groundY = yFor(0, p, eye);
    ground.style.transform = `translate3d(0, ${groundY.toFixed(1)}px, 0)`;
    ground.style.visibility = groundY > vh + OFFSCREEN ? 'hidden' : 'visible';

    // Stack: from the ground to its top, clipped to the viewport
    const top = Math.max(yFor(stackTopProgress, p, eye), -OFFSCREEN);
    const bottom = Math.min(groundY, vh + OFFSCREEN);
    const pxPerMeter = P / metersPerProgress(altitude, chapters);
    // Bold lines: the smallest unit at least BOLD_MIN_PX apart. Faint lines: the unit below it.
    const level = detailLevelFor(pxPerMeter, BOLD_MIN_PX);
    const fine = DETAIL_LEVELS[DETAIL_LEVELS.indexOf(level) - 1];
    if (bottom > top) {
      stack.style.visibility = 'visible';
      stack.style.transform = `translate3d(0, ${top.toFixed(1)}px, 0)`;
      stack.style.height = `${(bottom - top).toFixed(1)}px`;
      // Lines are spaced at the local zoom around the eye line and phased so they
      // line up with whole units and move with the scroll.
      const altAtBottom = altitudeAt(p + (eye - bottom) / P, chapters);
      setLines(texture, '', level, pxPerMeter, altAtBottom);
      if (fine) {
        const finePx = fine.height * pxPerMeter;
        setLines(texture, '-fine', fine, pxPerMeter, altAtBottom);
        texture.style.setProperty('--fine-alpha', Math.min(0.5, Math.max(0, (finePx - 1.5) / 8)).toFixed(3));
      } else {
        texture.style.setProperty('--fine-alpha', '0');
      }
    } else {
      stack.style.visibility = 'hidden';
    }

    // Markers
    for (const m of markers) {
      const y = yFor(m.progress, p, eye);
      const visible = y > -OFFSCREEN && y < vh + OFFSCREEN;
      if (visible) m.el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
      if (visible !== m.visible) {
        m.el.style.visibility = visible ? 'visible' : 'hidden';
        m.visible = visible;
      }
    }

    onUpdate({ altitude, progress: p, chapter: chapterAt(p, chapters), level });
  }

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };
  const onResize = () => {
    measure();
    schedule();
  };

  measure();
  render();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', onResize);

  return {
    destroy() {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frame);
    },
  };
}

function setLines(el, suffix, level, pxPerMeter, altAtBottom) {
  const unitPx = level.height * pxPerMeter;
  const frac = (altAtBottom / level.height) % 1;
  el.style.setProperty(`--unit${suffix}`, `${unitPx.toFixed(2)}px`);
  el.style.setProperty(`--phase${suffix}`, `${(((1 - frac) % 1) * unitPx).toFixed(2)}px`);
}

function renderMarker(m) {
  const el = document.createElement('div');
  el.className = `marker marker--${m.kind}`;
  el.style.visibility = 'hidden';
  const line = document.createElement('span');
  line.className = 'marker__line';
  const label = document.createElement('span');
  label.className = 'marker__label';
  const name = document.createElement('span');
  name.className = 'marker__name';
  name.textContent = m.name;
  const detail = document.createElement('span');
  detail.textContent = `${formatHeight(m.height)} · ${formatUSDCompact(metersToDollars(m.height))}`;
  label.append(name, detail);
  el.append(line, label);
  return el;
}
