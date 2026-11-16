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
.m-tap{position:fixed;z-index:2147483600;pointer-events:none;border-radius:50%;background:#6d28d9;opacity:.45;transform:translate(-50%,-50%) scale(.2);animation:m-tap .45s ease-out forwards}
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
#view div[style*="var(--chart)"][style*="width"]{transform-origin:left;animation:m-grow .6s cubic-bezier(.2,.8,.2,1) both}
@keyframes m-grow{from{transform:scaleX(0)}}
.nav .grp.open .sub{animation:m-sub .22s ease both}@keyframes m-sub{from{opacity:0;transform:translateY(-6px)}}
.nav .grp .chev{display:inline-block;transition:transform .2s}.nav .grp.open .chev{transform:rotate(90deg)}
.m-tabs{position:relative}.m-tabs>a.on,.m-tabs>button.on{border-bottom-color:transparent!important}
.m-tabbar{position:absolute;bottom:-1px;height:2px;border-radius:2px;background:#1e3a8a;pointer-events:none;transition:left .25s cubic-bezier(.2,.8,.2,1),width .25s cubic-bezier(.2,.8,.2,1)}
.empty:not(:has(.m-skel))::before{content:"";display:block;width:46px;height:52px;margin:0 auto 10px;opacity:.85;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 124'%3E%3Cg fill='none' stroke='%23c3c9dc' stroke-width='9' stroke-linecap='round'%3E%3Cpath d='M24 82V62C24 32 41 12 60 12s36 20 36 50v20'/%3E%3Cpath d='M24 82q0 24-10 32M48 84q0 20-6 32M72 84q0 20 6 32M96 82q0 24 10 32'/%3E%3C/g%3E%3Ccircle cx='47' cy='52' r='8.5' fill='%23c4b5fd'/%3E%3Ccircle cx='73' cy='52' r='8.5' fill='%23c4b5fd'/%3E%3C/svg%3E") center/contain no-repeat;animation:m-float 3s ease-in-out infinite}
td.empty::before,.empty.inline::before{display:none}
@keyframes m-float{50%{transform:translateY(-4px)}}
.m-fly{position:fixed;z-index:2147483600;width:22px;height:22px;border-radius:50%;background:#6d28d9;box-shadow:0 0 0 3px rgba(30,58,138,.25);pointer-events:none}
.m-swl{animation:m-swl .26s ease}.m-swr{animation:m-swr .26s ease}
@keyframes m-swl{from{opacity:.3;transform:translateX(40px)}}@keyframes m-swr{from{opacity:.3;transform:translateX(-40px)}}
.m-undo{position:fixed;left:50%;bottom:22px;transform:translate(-50%,20px);opacity:0;z-index:2147483500;display:flex;align-items:center;gap:14px;background:#172554;color:#fff;border-radius:12px;padding:10px 12px 10px 16px;font-size:14px;box-shadow:0 12px 32px rgba(20,20,50,.28);transition:transform .25s cubic-bezier(.2,.9,.3,1),opacity .2s;overflow:hidden}
.m-undo.on{transform:translate(-50%,0);opacity:1}.m-undo button{border:0;background:#6d28d9;color:#172554;font-weight:700;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:13px}
.m-undo i{position:absolute;left:0;bottom:0;height:3px;background:#6d28d9;animation:m-tb 6s linear forwards;width:100%;transform-origin:left}
.m-ptr{display:flex;align-items:center;justify-content:center;gap:8px;height:0;overflow:hidden;color:#5b5a66;font-size:13px;font-weight:600}
.m-ptr svg{width:18px;height:18px;transition:transform .2s}.m-ptr.ready svg{transform:rotate(180deg)}
.m-confetti{position:fixed;inset:0;pointer-events:none;z-index:2147483646}
.m-cele{position:fixed;left:50%;top:22%;transform:translate(-50%,-10px) scale(.9);opacity:0;z-index:2147483647;background:#172554;color:#fff;border-radius:16px;padding:14px 22px;font-size:18px;font-weight:700;box-shadow:0 16px 40px rgba(20,20,50,.3);transition:all .3s cubic-bezier(.2,.9,.3,1);pointer-events:none;text-align:center}
.m-cele.on{opacity:1;transform:translate(-50%,0) scale(1)}.m-cele small{display:block;font-size:13px;font-weight:500;color:#6d28d9;margin-top:2px}
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
  const NUMS = ".kpi .v,.kpi>b,.kpi b.kv,[data-countup]" + (POS ? ",#totals .g span:last-child" : ""), seen = new Map();
  function keyOf(el) { const k = el.closest(".kpi"); return (k?.querySelector("h3,span,.kh")?.textContent || "") + "|" + [...(k?.parentElement?.children || [])].indexOf(k); }
  function countUp(el) {
    const txt = el.textContent.trim(); if (el._mDone === txt) return;
    const m = txt.match(/^([^\d−-]*)([−-]?)([\d,]+(?:\.(\d+))?)(.*)$/); const key = keyOf(el), prev = seen.get(key); seen.set(key, txt); el._mDone = txt;
    if (!m || RM || prev === txt) return;
    const to = parseFloat(m[3].replace(/,/g, "")), dec = (m[4] || "").length, comma = m[3].includes(",") || to >= 1000;
    const pm = prev && prev.match(/[\d,]+(?:\.\d+)?/), from = pm ? parseFloat(pm[0].replace(/,/g, "")) || 0 : 0;
    if (from === to) return;
    const fmt = v => v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: comma });
    const t0 = performance.now(), dur = el.closest("#totals") ? 280 : 650;
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


  // ---- tabs: the underline slides to the chosen tab
  const tabPos = new Map();
  function tabs() {
    document.querySelectorAll(".tabs").forEach((t, i) => {
      const on = t.querySelector(":scope > a.on, :scope > button.on"); if (!on || getComputedStyle(t).display.includes("inline")) return;
      t.classList.add("m-tabs"); let bar = t.querySelector(":scope > .m-tabbar"); const key = (t.closest("#view,.scrim,.dlg")?.id || "") + i + "|" + t.children.length;
      const L = on.offsetLeft, W = on.offsetWidth; if (!W) return;
      if (!bar) { bar = document.createElement("span"); bar.className = "m-tabbar"; t.appendChild(bar); const p = tabPos.get(key); if (p && !RM) { bar.style.transition = "none"; bar.style.left = p[0] + "px"; bar.style.width = p[1] + "px"; void bar.offsetWidth; bar.style.transition = ""; } }
      if (bar.style.left !== L + "px" || bar.style.width !== W + "px") { bar.style.left = L + "px"; bar.style.width = W + "px"; }
      tabPos.set(key, [L, W]);
    });
  }

  // ---- count badges bump when their number goes up (new orders waiting, items, …)
  const badgeSeen = new Map();
  function badges() {
    document.querySelectorAll(".cnt,.badge,.nbadge,.bcount,sup").forEach(b => {
      const n = parseFloat(b.textContent.replace(/[^\d.]/g, "")); if (isNaN(n)) return;
      const k = (b.parentElement?.textContent || "").replace(/[\d.,]+/g, "") + "|" + b.className; const was = badgeSeen.get(k); badgeSeen.set(k, n);
      if (was !== undefined && n > was) Motion.bump(b);
    });
  }

  // ---- after a save, the edited row lights up for a moment
  let flashId = null, flashAt = 0;
  Motion.flash = id => { flashId = id; flashAt = Date.now(); };
  function flashRow() {
    if (!flashId || Date.now() - flashAt > 4000) return; const v = document.getElementById("view"); if (!v) return;
    const q = `"${CSS.escape(flashId).replace(/\\/g, "")}"`; const row = [...v.querySelectorAll("tr,.card,li")].find(r => r.outerHTML.length < 6000 && r.outerHTML.includes(q));
    if (row) { row.classList.remove("m-new"); void row.offsetWidth; row.classList.add("m-new"); flashId = null; }
  }

  // ---- charts: lines draw themselves in
  function charts() {
    if (RM) return;
    document.querySelectorAll("#view svg polyline:not([data-m]),#view svg path[fill=none]:not([data-m])").forEach(l => {
      l.dataset.m = 1; let len = 0; try { len = l.getTotalLength(); } catch (e) {} if (!len || len < 30) return;
      l.style.strokeDasharray = len; l.style.strokeDashoffset = len; l.getBoundingClientRect();
      l.style.transition = "stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)"; requestAnimationFrame(() => l.style.strokeDashoffset = "0");
      setTimeout(() => { l.style.strokeDasharray = ""; l.style.strokeDashoffset = ""; l.style.transition = ""; }, 900);
    });
  }

  // ---- undo bar: shows for 6 seconds after something is deleted
  Motion.undo = (text, onUndo) => {
    document.querySelector(".m-undo")?.remove(); const u = document.createElement("div"); u.className = "m-undo"; u.setAttribute("role", "status");
    u.innerHTML = `<span></span><button type="button">Undo</button><i></i>`; u.firstChild.textContent = text; document.body.appendChild(u);
    requestAnimationFrame(() => u.classList.add("on"));
    const bye = () => { u.classList.remove("on"); setTimeout(() => u.remove(), 260); };
    const t = setTimeout(bye, 6000);
    u.querySelector("button").onclick = async () => { clearTimeout(t); u.querySelector("button").disabled = true; try { await onUndo(); } finally { bye(); } };
  };

  // ---- celebration: confetti for the first sale of the day and for a big sale
  Motion.celebrate = (title, sub) => {
    if (RM) return; buzz([30, 60, 30]);
    const c = document.createElement("canvas"); c.className = "m-confetti"; c.width = innerWidth; c.height = innerHeight; document.body.appendChild(c);
    const g = c.getContext("2d"), cols = ["#6d28d9", "#1e3a8a", "#ffffff", "#60a5fa", "#a3e635"];
    const P = Array.from({ length: 120 }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 80, y: innerHeight * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 12 - 4, s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: cols[Math.random() * cols.length | 0] }));
    const t0 = performance.now();
    (function f(t) { const k = (t - t0) / 1800; g.clearRect(0, 0, c.width, c.height);
      P.forEach(p => { p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; g.save(); g.globalAlpha = Math.max(0, 1 - k); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); });
      if (k < 1) requestAnimationFrame(f); else c.remove(); })(t0);
    const b = document.createElement("div"); b.className = "m-cele"; b.innerHTML = `<span></span><small></small>`; b.firstChild.textContent = title; b.lastChild.textContent = sub || ""; document.body.appendChild(b);
    requestAnimationFrame(() => b.classList.add("on")); setTimeout(() => { b.classList.remove("on"); setTimeout(() => b.remove(), 320); }, 2200);
  };
  Motion.sale = total => {
    const d = new Date().toDateString(); let st; try { st = JSON.parse(localStorage.getItem("skwyd_sales_day") || "{}"); } catch (e) { st = {}; }
    if (st.d !== d) st = { d, n: 0, sum: 0, max: 0 };
    const avg = st.n ? st.sum / st.n : 0;
    if (st.n === 0) Motion.celebrate("First sale of the day", "Have a great shift");
    else if (st.n >= 5 && total >= avg * 3 && total > st.max) Motion.celebrate("Big sale", "The biggest one today so far");
    st.n++; st.sum += +total || 0; st.max = Math.max(st.max, +total || 0); try { localStorage.setItem("skwyd_sales_day", JSON.stringify(st)); } catch (e) {}
  };

  if (POS) {
    // ---- the item flies from the menu into the order
    document.addEventListener("click", e => {
      const t = e.target.closest?.("#grid [data-add]:not(:disabled)"); if (!t || RM) return; const dest = document.getElementById("lines") || document.querySelector(".cart"); if (!dest) return;
      const a = t.getBoundingClientRect(), d = dest.getBoundingClientRect(), dot = document.createElement("span"); dot.className = "m-fly";
      const x0 = a.left + a.width / 2 - 11, y0 = a.top + a.height / 2 - 11, x1 = d.left + Math.min(d.width / 2, 60), y1 = d.top + Math.min(d.height - 30, 40 + (dest.children.length * 44));
      dot.style.left = x0 + "px"; dot.style.top = y0 + "px"; document.body.appendChild(dot);
      dot.animate([{ transform: "translate(0,0) scale(1)" }, { transform: `translate(${(x1 - x0) / 2}px,${Math.min(y1, y0) - y0 - 60}px) scale(1.15)`, offset: .45 }, { transform: `translate(${x1 - x0}px,${y1 - y0}px) scale(.4)`, opacity: .2 }], { duration: 480, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => dot.remove();
    }, true);

    // ---- swipe left or right on the menu to change category
    let sw = null;
    document.addEventListener("pointerdown", e => { if (e.target.closest?.("#grid")) sw = { x: e.clientX, y: e.clientY, t: Date.now() }; }, { passive: true });
    document.addEventListener("pointerup", e => {
      if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y, dt = Date.now() - sw.t; sw = null;
      if (Math.abs(dx) < 80 || Math.abs(dy) > 50 || dt > 700) return;
      const cats = [...document.querySelectorAll("#mcats .mcat")], i = cats.findIndex(c => c.classList.contains("on")); if (i < 0) return;
      const nx = cats[i + (dx < 0 ? 1 : -1)]; if (!nx) return;
      const block = ev => { ev.stopPropagation(); ev.preventDefault(); }; document.addEventListener("click", block, { capture: true, once: true }); setTimeout(() => document.removeEventListener("click", block, { capture: true }), 50);
      nx.click(); nx.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      const g = document.getElementById("grid"); if (g && !RM) { g.classList.remove("m-swl", "m-swr"); void g.offsetWidth; g.classList.add(dx < 0 ? "m-swl" : "m-swr"); }
      buzz(10);
    }, { passive: true });

    // ---- order board: cards glide to their new column instead of jumping
    const cardPos = new Map();
    Motion._board = () => {
      const board = document.querySelector(".oboard"); if (!board) { cardPos.clear(); return; }
      const b = board.getBoundingClientRect(), now = new Map();
      board.querySelectorAll(".ocard[data-ov]").forEach(c => { const r = c.getBoundingClientRect(); const p = [r.left - b.left, r.top - b.top]; now.set(c.dataset.ov, p);
        const o = cardPos.get(c.dataset.ov); if (!o || RM) return; const dx = o[0] - p[0], dy = o[1] - p[1];
        if (Math.abs(dx) > 30) c.animate([{ transform: `translate(${dx}px,${dy}px)`, boxShadow: "0 10px 26px rgba(20,20,50,.2)" }, { transform: "none", boxShadow: "none" }], { duration: 380, easing: "cubic-bezier(.2,.8,.2,1)" }); });
      [...now.keys()].filter(k => !cardPos.has(k) && cardPos.size).forEach(k => board.querySelector(`.ocard[data-ov="${CSS.escape(k)}"]`)?.animate([{ opacity: 0, transform: "scale(.94)" }, { opacity: 1, transform: "none" }], { duration: 300, easing: "ease-out" }));
      cardPos.clear(); now.forEach((v, k) => cardPos.set(k, v));
    };

    // ---- pull down on the order board to refresh it
    let pull = null;
    const scroller = el => el.closest(".mb") || el.closest(".oboard")?.parentElement;
    document.addEventListener("pointerdown", e => {
      if (e.pointerType === "mouse") return; const bd = e.target.closest?.(".oboard"); if (!bd) return; const sc = scroller(bd); if (!sc || sc.scrollTop > 0) return;
      let ind = sc.querySelector(":scope > .m-ptr"); if (!ind) { ind = document.createElement("div"); ind.className = "m-ptr"; ind.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg><span>Pull to refresh</span>'; sc.prepend(ind); }
      pull = { y: e.clientY, sc, ind, h: 0 };
    }, { passive: true });
    document.addEventListener("pointermove", e => { if (!pull) return; const h = Math.max(0, Math.min(80, (e.clientY - pull.y) * .5)); if (pull.sc.scrollTop > 0) { pull.h = 0; return; } pull.h = h; pull.ind.style.height = h + "px"; pull.ind.classList.toggle("ready", h > 54); pull.ind.querySelector("span").textContent = h > 54 ? "Release to refresh" : "Pull to refresh"; }, { passive: true });
    const endPull = () => { if (!pull) return; const { ind, h } = pull; pull = null; ind.style.transition = "height .2s ease";
      if (h > 54) { buzz(20); ind.style.height = "44px"; ind.querySelector("span").textContent = "Refreshing"; try { window.WOK?.refreshAll?.(); } catch (e) {} setTimeout(() => { ind.style.height = "0"; }, 900); }
      else ind.style.height = "0"; setTimeout(() => { ind.style.transition = ""; }, 220); };
    document.addEventListener("pointerup", endPull); document.addEventListener("pointercancel", endPull);
  }

  let queued = false;
  const mo = new MutationObserver(muts => {
    if (queued) return; queued = true;
    requestAnimationFrame(() => {
      queued = false;
      skeleton(document); errors(document);
      document.querySelectorAll(NUMS).forEach(countUp);
      if (POS) { posLines(); Motion._board?.(); }
      tabs(); badges(); flashRow(); charts();
      if (rowsNext && Date.now() - rowsNext < 1500) { rowsNext = 0; document.querySelectorAll("#view tbody,#view .list,#ilist tbody").forEach(Motion.rows); }
    });
  });
  const start = () => { mo.observe(document.body, { childList: true, subtree: true, characterData: true }); skeleton(document); errors(document); };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);

  // ---- page changes: the new page's blocks fade up
  let lastRoute = location.pathname;
  addEventListener("hashchange", () => { const r = location.pathname; if (r === lastRoute) return; lastRoute = r; setTimeout(() => Motion.enter(document.getElementById("view")), 0); });
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
