/** Marks the TOC link of the heading currently in view with aria-current. Vanilla, no framework. */
export function spy(root, doc, IntersectionObserver) {
  const links = [...root.querySelectorAll('.toc a')];
  if (!links.length || !IntersectionObserver) return;
  const byId = new Map(links.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
  const observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting || !byId.has(e.target.id)) continue;
      links.forEach((l) => l.removeAttribute('aria-current'));
      byId.get(e.target.id).setAttribute('aria-current', 'true');
    }
  }, { rootMargin: '0px 0px -70% 0px' });
  for (const id of byId.keys()) {
    const heading = doc.getElementById(id);
    if (heading) observer.observe(heading);
  }
}
