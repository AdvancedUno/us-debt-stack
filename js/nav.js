// Stack It: the chapter rail and keys 1–7.

export function createNav({ rail, chapters, reducedMotion }) {
  const list = document.createElement('ol');
  const links = chapters.map((c, i) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${c.id}`;
    a.className = 'rail__link';
    a.innerHTML = `<span class="rail__num" aria-hidden="true">${i + 1}</span><span class="rail__label"></span>`;
    a.querySelector('.rail__label').textContent = c.title;
    a.title = `${c.title} (key ${i + 1})`;
    li.append(a);
    list.append(li);
    return a;
  });
  rail.append(list);

  const go = (i) => {
    document.getElementById(chapters[i].id)?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
  };

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    const n = Number(e.key);
    if (Number.isInteger(n) && n >= 1 && n <= chapters.length) {
      e.preventDefault();
      go(n - 1);
    }
  });

  let current = '';
  return function update({ chapter, p }) {
    const id = p >= 1 ? chapters.at(-1).id : chapter.id;
    if (id === current) return;
    current = id;
    links.forEach((a, i) => {
      if (chapters[i].id === id) a.setAttribute('aria-current', 'step');
      else a.removeAttribute('aria-current');
    });
  };
}
