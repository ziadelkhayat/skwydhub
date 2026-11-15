// Skwyd Hub motion: small, fast animations and touch feedback shared by the back office, the admin and the POS.
// Everything here is automatic (it watches the page), except Motion.saving()/saved()/reset() for Save buttons.
// Turned off when the device asks for reduced motion.
(function () {
  if (window.Motion) return;
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const POS = !!window.SKWYD_POS;
  const buzz = ms => { if (!POS) return; try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
  const CK = '<svg class="m-ck" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  const css = `
.m-tap{position:fixed;z-index:2147483600;pointer-events:none;border-radius:50%;background:#c6f432;opacity:.45;transform:translate(-50%,-50%) scale(.2);animation:m-tap .45s ease-out forwards}
@keyframes m-tap{to{transform:translate(-50%,-50%) scale(1);opacity:0}}
.m-busy{pointer-events:none}.m-spin{display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;margin-right:8px;vertical-align:-2px;animation:m-sp .7s linear infinite}
@keyframes m-sp{to{transform:rotate(360deg)}}
.m-done{background:#1f7a3d!important;border-color:#1f7a3d!important;color:#fff!important;transition:background .2s}
.m-ck{width:16px;height:16px;margin-right:6px;vertical-align:-3px}.m-ck path{stroke-dasharray:24;stroke-dashoffset:24;animation:m-dr .32s .05s ease forwards}
@keyframes m-dr{to{stroke-dashoffset:0}}
.m-shake{animation:m-sh .36s}@keyframes m-sh{20%,60%{transform:translateX(-5px)}40%,80%{transform:translateX(5px)}}
.m-skel{display:grid;gap:10px;width:100%;padding:6px 0}.m-skel i{display:block;height:12px;border-radius:6px;background:#e7e9f0;animation:m-pl 1s ease-in-out infinite}
.m-skel i:nth-child(1){width:72%}.m-skel i:nth-child(2){width:54%;animation-delay:.1s}.m-skel i:nth-child(3){width:64%;animation-delay:.2s}
@keyframes m-pl{50%{opacity:.45}}
.m-enter>*{animation:m-in .28s cubic-bezier(.2,.8,.2,1) both}
.m-enter>*:nth-child(2){animation-delay:.03s}.m-enter>*:nth-child(3){animation-delay:.06s}.m-enter>*:nth-child(4){animation-delay:.09s}.m-enter>*:nth-child(n+5){animation-delay:.12s}
.m-rows tr,.m-rows>li{animation:m-in .26s ease both}
${Array.from({ length: 12 }, (_, i) => `.m-rows tr:nth-child(${i + 1}),.m-rows>li:nth-child(${i + 1}){animation-delay:${(i * 0.025).toFixed(3)}s}`).join("")}
@keyframes m-in{from{opacity:0;transform:translateY(8px)}}
.scrim.show>*:first-child,.modal.on>.dlg,#modal.show>*:first-child{animation:m-pop .24s cubic-bezier(.2,.9,.3,1)}
@keyframes m-pop{from{opacity:0;transform:translateY(14px) scale(.97)}}
#toast.show::after,.toast.show::after{content:"";position:absolute;left:14px;right:14px;bottom:5px;height:2px;border-radius:2px;background:currentColor;opacity:.35;transform-origin:left;animation:m-tb 2.2s linear forwards}
@keyframes m-tb{from{transform:scaleX(1)}to{transform:scaleX(0)}}
#toast.ok.show::before,.toast.ok.show::before{content:"✓";display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.25);margin-right:8px;font-size:12px;font-weight:700;animation:m-bump .4s cubic-bezier(.3,1.6,.5,1)}
.m-top{position:fixed;right:22px;bottom:22px;z-index:40;width:42px;height:42px;border-radius:50%;border:0;background:#1e3a8a;color:#fff;display:grid;place-items:center;cursor:pointer;opacity:0;transform:scale(.6);pointer-events:none;transition:opacity .2s,transform .2s;box-shadow:0 6px 18px rgba(30,58,138,.3)}
.m-top.on{opacity:1;transform:none;pointer-events:auto}.m-top svg{width:20px;height:20px}
.m-scrolled .top{box-shadow:0 6px 18px rgba(20,20,50,.08);transition:box-shadow .2s}
.m-new{animation:m-new .7s ease}@keyframes m-new{0%{background:rgba(198,244,50,.55);transform:translateX(-8px)}100%{background:transparent;transform:none}}
.m-bump{animation:m-bump .35s cubic-bezier(.3,1.6,.5,1)}@keyframes m-bump{40%{transform:scale(1.25)}}
button,.btn,.prod{-webkit-tap-highlight-color:transparent}
.btn:active:not(:disabled),.prod:active:not(:disabled){transform:scale(.97)}
@media (prefers-reduced-motion:reduce){.m-tap,.m-enter>*,.m-rows tr,.m-rows>li,.m-new,.m-bump,.m-shake{animation:none!important}}`;
  const st = document.createElement("style"); st.id = "motion-css"; st.textContent = css; document.head.appendChild(st);

  // ---- touch: a soft lime circle where the finger lands; short vibration on the POS
  const TAP = "button:not(:disabled),.btn,.prod,[data-add],[role=button],.htab,.tile";
  document.addEventListener("pointerdown", e => {
    if (RM || e.button > 0 || (!POS && e.pointerType === "mouse")) return; const t = e.target.closest?.(TAP); if (!t || t.closest(".m-busy")) return;
    const r = t.getBoundingClientRect(), s = Math.min(Math.max(r.width, r.height) * 1.3, 220), d = document.createElement("span");
    d.className = "m-tap"; d.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;width:${s}px;height:${s}px`;
    document.body.appendChild(d); setTimeout(() => d.remove(), 480); buzz(10);
  }, { passive: true });

  // ---- Save buttons: spinner, then a green check, then on with the work
  const Motion = window.Motion = {
    saving(b, label = "Saving") { if (!b || b.classList.contains("m-busy")) return; b.dataset.mLbl = b.innerHTML; b.classList.add("m-busy"); b.innerHTML = `<span class="m-spin"></span>${label}`; },
    saved(b, label = "Saved") { return new Promise(res => { if (!b || !b.isConnected) return res(); b.classList.remove("m-busy"); b.classList.add("m-done"); b.innerHTML = CK + label; buzz(25); setTimeout(res, RM ? 0 : 480); }); },
    reset(b) { if (!b || b.dataset.mLbl == null) return; b.innerHTML = b.dataset.mLbl; delete b.dataset.mLbl; b.classList.remove("m-busy", "m-done"); },
    enter(el) { if (RM || !el) return; el.classList.remove("m-enter"); void el.offsetWidth; el.classList.add("m-enter"); clearTimeout(el._mE); el._mE = setTimeout(() => el.classList.remove("m-enter"), 520); },
    rows(el) { if (RM || !el) return; el.classList.remove("m-rows"); void el.offsetWidth; el.classList.add("m-rows"); clearTimeout(el._mR); el._mR = setTimeout(() => el.classList.remove("m-rows"), 700); },
    bump(el) { if (RM || !el) return; el.classList.remove("m-bump"); void el.offsetWidth; el.classList.add("m-bump"); },
    buzz
  };

  // ---- dashboard numbers count up when they change (a re-render with the same number stays still)
  const NUMS = ".kpi .v,.kpi>b,.kpi b.kv,[data-countup]", seen = new Map();
  function keyOf(el) { const k = el.closest(".kpi"); return (k?.querySelector("h3,span,.kh")?.textContent || "") + "|" + [...(k?.parentElement?.children || [])].indexOf(k); }
  function countUp(el) {
    const txt = el.textContent.trim(); if (el._mDone === txt) return;
    const m = txt.match(/^([^\d−-]*)([−-]?)([\d,]+(?:\.(\d+))?)(.*)$/); const key = keyOf(el), prev = seen.get(key); seen.set(key, txt); el._mDone = txt;
    if (!m || RM || prev === txt) return;
    const to = parseFloat(m[3].replace(/,/g, "")), dec = (m[4] || "").length, comma = m[3].includes(",") || to >= 1000;
    const pm = prev && prev.match(/[\d,]+(?:\.\d+)?/), from = pm ? parseFloat(pm[0].replace(/,/g, "")) || 0 : 0;
    if (from === to) return;
    const fmt = v => v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: comma });
    const t0 = performance.now(), dur = 650;
    (function f(t) { if (!el.isConnected) return; const p = Math.min(1, (t - t0) / dur), v = from + (to - from) * (1 - Math.pow(1 - p, 3));
      el.textContent = m[1] + m[2] + fmt(v) + m[5]; el._mDone = el.textContent.trim(); if (p < 1) requestAnimationFrame(f); else { el.textContent = txt; el._mDone = txt; } })(t0);
  }

  // ---- "Loading…" placeholders become pulsing grey bars
  function skeleton(root) {
    root.querySelectorAll(".ph,.empty,#bootLoad").forEach(el => {
      if (el._mSk || !/^\s*Loading/.test(el.textContent)) return; el._mSk = 1;
      const msg = el.textContent.trim(); el.innerHTML = `<div class="m-skel" role="status" aria-label="${msg.replace(/"/g, "")}"><i></i><i></i><i></i></div>`;
    });
  }

  // ---- error messages shake once when they appear (and buzz on the POS)
  const errText = new WeakMap();
  function errors(root) {
    root.querySelectorAll(".err,#cErr,#actErr,.ferr").forEach(el => {
      const t = el.textContent.trim(), was = errText.get(el); errText.set(el, t);
      if (t && t !== was && was !== undefined) { el.classList.remove("m-shake"); void el.offsetWidth; el.classList.add("m-shake"); buzz([20, 40, 20]); }
    });
  }

  // ---- lists animate in after a filter is applied
  let rowsNext = 0;
  document.addEventListener("change", e => { if (e.target.closest?.("select,input[type=date],input[type=checkbox],input[type=radio]") && !e.target.closest(".scrim.show,.modal.on,#modal.show,form")) rowsNext = Date.now(); }, true);
  document.addEventListener("click", e => { if (e.target.closest?.(".seg button,.chip,.tabs a,.tabs button,[data-tab],[data-f],[data-filter],.pill")) rowsNext = Date.now(); }, true);
  document.addEventListener("input", e => { if (e.target.matches?.("input[type=search],#q,#iq,.search input")) rowsNext = 0; }, true);

  // ---- POS: a new order line slides in with a lime flash
  function posLines() {
    const L = document.getElementById("lines"); if (!L) return;
    const n = L.querySelectorAll(".line:not(.vd)").length;
    if (L._mN !== undefined && n > L._mN && !RM) { const last = [...L.querySelectorAll(".line:not(.vd)")].pop(); last?.classList.add("m-new"); }
    L._mN = n;
  }

  let queued = false;
  const mo = new MutationObserver(muts => {
    if (queued) return; queued = true;
    requestAnimationFrame(() => {
      queued = false;
      skeleton(document); errors(document);
      document.querySelectorAll(NUMS).forEach(countUp);
      if (POS) posLines();
      if (rowsNext && Date.now() - rowsNext < 1500) { rowsNext = 0; document.querySelectorAll("#view tbody,#view .list,#ilist tbody").forEach(Motion.rows); }
    });
  });
  const start = () => { mo.observe(document.body, { childList: true, subtree: true, characterData: true }); skeleton(document); errors(document); };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);

  // ---- page changes: the new page's blocks fade up
  let lastRoute = location.hash;
  addEventListener("hashchange", () => { const r = location.hash.split("?")[0]; if (r === lastRoute) return; lastRoute = r; setTimeout(() => Motion.enter(document.getElementById("view")), 0); });
  document.addEventListener("click", e => { if (e.target.closest?.("[data-view]")) setTimeout(() => Motion.enter(document.getElementById("view")), 0); }, true);

  // ---- scrolling: the top bar lifts, and a back-to-top button appears on long pages (not on the POS)
  if (!POS) {
    const btn = document.createElement("button"); btn.type = "button"; btn.className = "m-top"; btn.setAttribute("aria-label", "Back to top");
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    btn.onclick = () => scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" });
    const onScroll = () => { const y = scrollY || document.documentElement.scrollTop; document.documentElement.classList.toggle("m-scrolled", y > 4); btn.classList.toggle("on", y > 700); };
    addEventListener("scroll", onScroll, { passive: true });
    const add = () => document.body.appendChild(btn); if (document.body) add(); else document.addEventListener("DOMContentLoaded", add);
  }
})();
