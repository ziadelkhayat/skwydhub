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
