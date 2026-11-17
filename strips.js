/* Sideways strips (page tabs, section tabs, chips): keep where the person scrolled them when the page redraws,
   and always bring the selected one into view. */
(function () {
  const SEL = ".ptabs,.ttabs,.tabs.dtabs,.cutabs,.olseg,.tscroll,.side .nav,.cats,.kbc";
  const ACT = ".on,.active,.sel,[aria-selected='true'],[aria-current='page'],[aria-current='true']";
  const pos = new Map(), seen = new WeakSet();
  const key = el => {
    const c = String(el.className || "").split(/\s+/)[0] || el.tagName;
    const same = Array.from(document.querySelectorAll(SEL)).filter(x => (String(x.className || "").split(/\s+/)[0] || x.tagName) === c);
    return c + "|" + (el.getAttribute("aria-label") || "") + "|" + same.indexOf(el);
  };
  const scrolls = el => el.scrollWidth > el.clientWidth + 2;
  const show = el => {
    const a = el.querySelector(ACT); if (!a || !el.contains(a)) return;
    const r = a.getBoundingClientRect(), s = el.getBoundingClientRect();
    if (r.width && (r.left < s.left + 8 || r.right > s.right - 8)) el.scrollLeft += (r.left + r.width / 2) - (s.left + s.width / 2);
  };
  const save = t => { const k = t._sk || key(t), o = pos.get(k); pos.set(k, { x: t.scrollLeft, on: o ? o.on : null }); };
  const fix = () => {
    document.querySelectorAll(SEL).forEach(el => {
      if (seen.has(el)) return; seen.add(el);
      if (!scrolls(el)) return;
      const k = key(el); el._sk = k;
      const a = el.querySelector(ACT), now = a ? a.textContent.trim() : "", was = pos.get(k);
      if (was) el.scrollLeft = was.x;
      if (!was || was.on !== now) show(el);          // a new tab was picked: bring it into view; a plain redraw keeps the spot
      pos.set(k, { x: el.scrollLeft, on: now });
    });
  };
  let q = 0;
  const later = () => { if (q) return; q = requestAnimationFrame(() => { q = 0; fix(); }); };
  document.addEventListener("scroll", e => { const t = e.target; if (t && t.matches && t.matches(SEL)) save(t); }, { capture: true, passive: true });
  // a tap on a strip item: remember the spot right away, so the redraw that follows keeps it
  document.addEventListener("click", e => { const t = e.target.closest && e.target.closest(SEL); if (t) save(t); }, true);
  const start = () => { new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); fix(); };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
  addEventListener("resize", () => document.querySelectorAll(SEL).forEach(el => scrolls(el) && show(el)), { passive: true });
})();
