// Stack It: the section rail. Keys 1–7 jump to the climb's chapters; 8, 9 and 0 to
// the sections after it.

export function createNav({ rail, chapters, extras = [], reducedMotion }) {
  const sections = [
    ...chapters.map((c, i) => ({ id: c.id, title: c.title, key: String(i + 1), climb: true })),
    ...extras.map((x, i) => ({ ...x, key: String((chapters.length + i + 1) % 10), climb: false })),
  ];

  const list = document.createElement('ol');
  const links = sections.map((s) => {
    const li = document.createElement('li');
    if (!s.climb && s === sections.find((x) => !x.climb)) li.className = 'rail__gap';
    const a = document.createElement('a');
    a.href = `#${s.id}`;
    a.className = `rail__link${s.climb ? '' : ' rail__link--extra'}`;
    a.innerHTML = `<span class="rail__num" aria-hidden="true">${s.key}</span><span class="rail__label"></span>`;
    a.querySelector('.rail__label').textContent = s.title;
    a.title = `${s.title} (key ${s.key})`;
    li.append(a);
    list.append(li);
    return a;
  });
  rail.append(list);

  const go = (s) => {
    document.getElementById(s.id)?.scrollIntoView({ behavior: reducedMotion() ? 'instant' : 'smooth' });
  };

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable="true"], [role="tablist"], .chart')) return;
    const s = sections.find((x) => x.key === e.key);
    if (s) {
      e.preventDefault();
      go(s);
    }
  });

  let current = '';
  return function update({ chapter, p, vh }) {
    let id = p >= 1 ? chapters.at(-1).id : chapter.id;
    for (const s of sections) {
      if (s.climb) continue;
      const el = document.getElementById(s.id);
      if (el && el.getBoundingClientRect().top < vh * 0.5) id = s.id;
    }
    document.documentElement.classList.toggle('in-appendix', !sections.find((s) => s.id === id)?.climb);
    if (id === current) return;
    current = id;
    links.forEach((a, i) => {
      if (sections[i].id === id) a.setAttribute('aria-current', 'step');
      else a.removeAttribute('aria-current');
    });
  };
}
