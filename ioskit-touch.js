// iOS touch habits for the back office and the Team app (not the POS, which stays still):
//  · long-press a row to start selecting (checkboxes appear, like Edit on iOS); they hide again when nothing is ticked
//  · swipe from the left edge to go back
//  · drag a sheet down by its top bar to close it
//  · on iPhone, the large title shrinks into a small centred title in a bar when you scroll past it
(function () {
  const de = document.documentElement; if (de.dataset.ios === "pos") return;
  const phone = () => matchMedia("(max-width: 760px)").matches, touch = matchMedia("(pointer: coarse)").matches;
  if (!touch) { /* still set up the scroll title for narrow desktop windows */ }
  // ---- long-press to select
  let lp = 0, lpEl = null, sx = 0, sy = 0;
  document.addEventListener("touchstart", e => { const tr = e.target.closest("body.v2p #view table.ios-ltable tbody tr"); if (!tr || !tr.querySelector("td.bkc input")) return; lpEl = tr; sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    lp = setTimeout(() => { document.body.classList.add("v3sel"); const cb = lpEl.querySelector("td.bkc input"); if (cb && !cb.checked) cb.click(); lpEl.dataset.v3lp = "1"; try { navigator.vibrate?.(10); } catch (_) {} }, 480); }, { passive: true });
  document.addEventListener("touchmove", e => { if (lp && (Math.abs(e.touches[0].clientX - sx) > 8 || Math.abs(e.touches[0].clientY - sy) > 8)) { clearTimeout(lp); lp = 0; } }, { passive: true });
  document.addEventListener("touchend", () => { clearTimeout(lp); lp = 0; }, { passive: true });
  document.addEventListener("click", e => { const tr = e.target.closest("tr[data-v3lp]"); if (tr) { delete tr.dataset.v3lp; e.preventDefault(); e.stopPropagation(); } }, true);
  document.addEventListener("change", () => { if (!document.querySelector("#view td.bkc input:checked")) document.body.classList.remove("v3sel"); });
  // ---- swipe from the left edge to go back (only when installed on the home screen; Safari already does this itself)
  const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  let ex = -1, ey = 0, et = 0;
  document.addEventListener("touchstart", e => { const t = e.touches[0]; ex = standalone() && t.clientX < 22 && !document.querySelector(".scrim.show, #scrim.show") ? t.clientX : -1; ey = t.clientY; et = Date.now(); }, { passive: true });
  document.addEventListener("touchend", e => { if (ex < 0) return; const t = e.changedTouches[0], dx = t.clientX - ex, dy = Math.abs(t.clientY - ey); ex = -1;
    if (dx > 70 && dy < 60 && Date.now() - et < 700) { const back = document.querySelector("#view .ios-back, #view [data-v3back], #view .v3back, #main .v3back, #kbk, .v2btns .ios-back"); if (back) back.click(); else if (history.length > 1) history.back(); } }, { passive: true });
  // ---- drag a sheet down to close it
  let sh = null, sy0 = 0, sdy = 0;
  document.addEventListener("touchstart", e => { const h = e.target.closest(".scrim.show .modal > header, .scrim.show .modal.sk > header, .sheet .grab, .sheet > .sh, #scrim .sheet .hd"); if (!h || e.target.closest("button,input,select,a")) return; sh = h.closest(".modal, .sheet"); sy0 = e.touches[0].clientY; sdy = 0; sh.style.transition = "none"; }, { passive: true });
  document.addEventListener("touchmove", e => { if (!sh) return; sdy = Math.max(0, e.touches[0].clientY - sy0); sh.style.transform = `translateY(${sdy}px)`; }, { passive: true });
  document.addEventListener("touchend", () => { if (!sh) return; const s = sh; sh = null; s.style.transition = "transform .3s cubic-bezier(.32,.72,0,1)";
    if (sdy > 120) { s.style.transform = "translateY(100%)"; setTimeout(() => { const c = s.querySelector(".sktb:not(.skb), [data-close], [data-cclose], [data-ccclose], .x"); if (c) c.click(); else { const sc = s.closest(".scrim"); sc && sc.classList.remove("show"); } s.style.transform = ""; s.style.transition = ""; }, 220); }
    else { s.style.transform = ""; setTimeout(() => s.style.transition = "", 320); } }, { passive: true });
  // ---- small title bar on iPhone once the large title scrolls away
  const bar = document.createElement("div"); bar.className = "v3nav"; bar.setAttribute("aria-hidden", "true"); document.addEventListener("DOMContentLoaded", () => document.body.appendChild(bar)); if (document.body) document.body.appendChild(bar);
  let raf = 0;
  const upd = () => { raf = 0; if (!phone()) { bar.classList.remove("on"); return; } const h = [...document.querySelectorAll("#view h1.v2title, #main h1.v3t, #view .v2bar h1, #view .phead h1")].find(x => x.offsetParent);
    if (!h || document.querySelector(".scrim.show")) { bar.classList.remove("on"); bar.dataset.for = ""; return; } const r = h.getBoundingClientRect(), on = r.bottom < 8;
    if (on && bar.dataset.for !== h.textContent) { bar.dataset.for = h.textContent; bar.innerHTML = ""; const t = document.createElement("b"); t.textContent = h.textContent.trim(); bar.appendChild(t);
      // the page's round buttons (filter, share, +, ‹ back) stay reachable in the small bar, like an iOS navigation bar
      const src = h.parentElement && h.parentElement.querySelector(".v2btns, .v3h"); if (src) { const L = document.createElement("span"), R = document.createElement("span"); L.className = "l"; R.className = "r";
        [...src.querySelectorAll(":scope > button, :scope > a, :scope > span > button, :scope > .iewrap > button")].forEach(b => { if (!b.offsetParent) return; const c = b.cloneNode(true); c.removeAttribute("id"); c.querySelectorAll("[id]").forEach(x => x.removeAttribute("id")); c.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); b.click(); });
          (b.matches(".ios-back, .v3back, [data-v3back]") ? L : R).appendChild(c); }); bar.append(L, R); requestAnimationFrame(() => bar.style.setProperty("--sw", Math.max(L.offsetWidth, R.offsetWidth) + 16 + "px")); } }
    bar.classList.toggle("on", on); };
  addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true, capture: true });
  const st = document.createElement("style");
  st.textContent = `.v3nav{position:fixed;left:0;right:0;top:0;z-index:40;height:calc(44px + env(safe-area-inset-top));padding-top:env(safe-area-inset-top);display:flex;align-items:center;justify-content:center;font:600 17px -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;color:#000;background:rgba(249,249,249,.82);-webkit-backdrop-filter:saturate(180%) blur(20px);backdrop-filter:saturate(180%) blur(20px);border-bottom:.5px solid rgba(60,60,67,.29);opacity:0;pointer-events:none;transition:opacity .2s}
.v3nav.on{opacity:1;pointer-events:auto}.v3nav > .l,.v3nav > .r{position:absolute;top:env(safe-area-inset-top);bottom:0;display:flex;align-items:center;gap:6px}.v3nav > .l{left:10px}.v3nav > .r{right:10px}.v3nav:is(div,#_a#_b#_c#_d) :is(button,a){width:32px!important;height:32px!important;min-width:32px!important;min-height:32px!important;padding:0!important;border:0!important;border-radius:50%!important;background:rgba(118,118,128,.12)!important;color:#0066D6!important;display:grid!important;place-items:center!important;box-shadow:none!important}.v3nav:is(div,#_a#_b#_c#_d) :is(button,a) svg,.v3nav:is(div,#_a#_b#_c#_d) :is(button,a) svg *{width:17px!important;height:17px!important;stroke:#0066D6!important;color:#0066D6!important}.v3nav:is(div,#_a#_b#_c#_d) :is(button,a):is(.v3back,.ios-back){width:auto!important;background:none!important;font-size:17px}.v3nav b{font-weight:600;max-width:calc(100% - 2 * var(--sw, 120px));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}html[data-theme=dark] .v3nav{color:#fff;background:rgba(30,30,30,.8);border-color:rgba(84,84,88,.65)}`;
  document.head.appendChild(st);
})();
