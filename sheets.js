/* Phones: pull a pop-up sheet down to close it (from its top bar, or anywhere once its content is scrolled to the top). */
(function () {
  const phone = () => matchMedia("(max-width:760px)").matches;
  let d = null;
  const sheetOf = t => { const m = t.closest && t.closest(".scrim.show > .modal, .scrim.show > *:first-child"); return m && m.parentElement.classList.contains("scrim") ? m : null; };
  const scroller = (t, m) => { for (let e = t; e && e !== m.parentElement; e = e.parentElement) { if (e.scrollHeight > e.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)) return e; } return null; };
  const close = m => {
    const b = m.querySelector('header .x, [data-ccclose], [data-cclose], [data-close], [aria-label="Close"]');
    if (b) { b.click(); return; }
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  };
  addEventListener("touchstart", e => {
    if (!phone() || e.touches.length !== 1) return;
    const t = e.target, m = sheetOf(t); if (!m) return;
    if (t.closest("input,textarea,select,[contenteditable],.ptabs,.tscroll,.cutabs,.ttabs,.mselect")) return;
    const top = e.touches[0].clientY - m.getBoundingClientRect().top < 72, sc = scroller(t, m);
    if (!top && sc && sc.scrollTop > 0) return;      // content is scrolled: let it scroll
    d = { m, y0: e.touches[0].clientY, t0: Date.now(), dy: 0, on: false, sc };
  }, { passive: true, capture: true });
  addEventListener("touchmove", e => {
    if (!d) return;
    const dy = e.touches[0].clientY - d.y0;
    if (!d.on) { if (dy < 8) { if (dy < -4) d = null; return; } if (d.sc && d.sc.scrollTop > 0) { d = null; return; } d.on = true; d.m.style.transition = "none"; d.m.style.animation = "none"; }
    d.dy = Math.max(0, dy); d.m.style.transform = "translateY(" + d.dy + "px)";
    if (e.cancelable) e.preventDefault();
  }, { passive: false, capture: true });
  const end = () => {
    if (!d) return; const { m, dy, t0, on } = d; d = null; if (!on) return;
    const fast = dy > 40 && dy / Math.max(1, Date.now() - t0) > 0.5;
    m.style.transition = "transform .2s ease-out";
    if (dy > Math.min(140, m.offsetHeight * 0.3) || fast) { m.style.transform = "translateY(100%)"; setTimeout(() => { close(m); m.style.transform = ""; m.style.transition = ""; m.style.animation = ""; }, 180); }
    else { m.style.transform = ""; setTimeout(() => { m.style.transition = ""; m.style.animation = ""; }, 220); }
  };
  addEventListener("touchend", end, { capture: true }); addEventListener("touchcancel", end, { capture: true });
})();
/* Phones: swipe the side menu to the left to close it */
(function () {
  let s = null;
  addEventListener("touchstart", e => {
    if (!document.body.classList.contains("navopen") || e.touches.length !== 1 || !matchMedia("(max-width:760px)").matches) return;
    const m = document.querySelector(".app aside.side"); if (!m) return;
    s = { m, x0: e.touches[0].clientX, y0: e.touches[0].clientY, dx: 0, on: false };
  }, { passive: true, capture: true });
  addEventListener("touchmove", e => {
    if (!s) return;
    const dx = e.touches[0].clientX - s.x0, dy = e.touches[0].clientY - s.y0;
    if (!s.on) { if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { s = null; return; } if (dx > -10) return; s.on = true; s.m.style.transition = "none"; }
    s.dx = Math.min(0, dx); s.m.style.transform = "translateX(" + s.dx + "px)"; if (e.cancelable) e.preventDefault();
  }, { passive: false, capture: true });
  const end = () => {
    if (!s) return; const { m, dx, on } = s; s = null; if (!on) return;
    m.style.transition = "transform .2s ease-out";
    if (dx < -70) { m.style.transform = "translateX(-100%)"; setTimeout(() => { document.body.classList.remove("navopen"); m.style.transform = ""; m.style.transition = ""; }, 180); }
    else { m.style.transform = ""; setTimeout(() => m.style.transition = "", 220); }
  };
  addEventListener("touchend", end, { capture: true }); addEventListener("touchcancel", end, { capture: true });
})();
/* Touch screens: wide tables scroll in one direction per swipe (no diagonal drift).
   Up/down swipes move the page only; sideways swipes move the table only (with a glide after letting go). */
(function () {
  if (!matchMedia("(hover:none)").matches) return;
  const SEL = "#view .tscroll, #view .card.tbl, #view .rptbl, #view .mmtbl, #view .schwrap, #view .bmdtw, #view .card.otbl";
  const st = document.createElement("style");
  st.textContent = "@media (hover:none){" + SEL.split(",").map(s => s.trim()).join(",") + "{touch-action:pan-y}}";
  document.head.appendChild(st);
  let g = null, raf = 0;
  const box = t => { let e = t.closest && t.closest(SEL); while (e && !(e.scrollWidth > e.clientWidth + 2)) e = e.parentElement && e.parentElement.closest(SEL); return e; };
  addEventListener("touchstart", e => {
    cancelAnimationFrame(raf); if (e.touches.length !== 1) { g = null; return; }
    const el = box(e.target); if (!el) { g = null; return; }
    const p = e.touches[0]; g = { el, x: p.clientX, y: p.clientY, sl: el.scrollLeft, dir: 0, lx: p.clientX, lt: performance.now(), v: 0 };
  }, { passive: true, capture: true });
  addEventListener("touchmove", e => {
    if (!g) return; const p = e.touches[0], dx = p.clientX - g.x, dy = p.clientY - g.y;
    if (!g.dir) { if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return; g.dir = Math.abs(dx) > Math.abs(dy) ? 1 : 2; }
    if (g.dir !== 1) return;                                   // up/down: the page scrolls natively, the table stays put
    if (e.cancelable) e.preventDefault();
    g.el.scrollLeft = g.sl - dx;
    const now = performance.now(), dt = Math.max(1, now - g.lt); g.v = 0.8 * ((g.lx - p.clientX) / dt) + 0.2 * g.v; g.lx = p.clientX; g.lt = now;
  }, { passive: false, capture: true });
  const end = () => {
    if (!g || g.dir !== 1) { g = null; return; }
    const el = g.el; let v = g.v * 16; g = null;           // px per frame
    const step = () => { if (Math.abs(v) < 0.4) return; el.scrollLeft += v; v *= 0.94; raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  };
  addEventListener("touchend", end, { capture: true }); addEventListener("touchcancel", end, { capture: true });
})();
