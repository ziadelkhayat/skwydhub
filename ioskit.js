// Skwyd iOS kit: the small iPhone/iPad behaviours shared by the back office, admin, team app, web ordering and POS.
// Load with <script src="ioskit.js" data-app="portal|admin|team|order|pos" defer>. POS gets no motion and no gestures.
(function () {
  const APP = (document.currentScript && document.currentScript.dataset.app) || "portal";
  const root = document.documentElement; root.dataset.ios = APP;
  const STILL = APP === "pos" || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phone = () => innerWidth <= 760;
  const touch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  const CFG = {
    portal: { bar: ".main > .top", title: "#view h1", tabbar: null },
    admin: { bar: ".main > .top", title: "#view h1", tabbar: "[data-view]" },
    team: { bar: ".top", title: "#main h2", tabbar: null },
    order: { bar: null, title: null, tabbar: null },
    pos: { bar: null, title: null, tabbar: null }
  }[APP] || {};
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  let raf = 0; const soon = f => { cancelAnimationFrame(raf); raf = requestAnimationFrame(f); };

  // ---------- iOS alert: window.iosConfirm(msg, {title, yes, no, danger}) → Promise<boolean>
  window.iosConfirm = (msg, o = {}) => new Promise(done => {
    const e = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const danger = o.danger ?? /\b(delete|remove|void|decline|reject|sign out|discard)\b/i.test(msg);
    const w = document.createElement("div"); w.className = "slk-ask";
    w.innerHTML = `<div class="slk-ask-b" role="alertdialog" aria-modal="true"><h3 class="slk-ask-h">${e(o.title || msg)}</h3>${o.title ? `<p>${e(msg)}</p>` : ""}<div class="slk-ask-f"><button type="button" class="slk-ask-no">${e(o.no || "Cancel")}</button><button type="button" class="slk-ask-yes${danger ? " red" : ""}">${e(o.yes || "OK")}</button></div></div>`;
    const end = v => { removeEventListener("keydown", key, true); w.remove(); done(v); };
    const key = ev => { if (ev.key === "Escape") { ev.preventDefault(); end(false); } else if (ev.key === "Enter") { ev.preventDefault(); end(true); } };
    w.onclick = ev => { if (ev.target === w || ev.target.closest(".slk-ask-no")) end(false); else if (ev.target.closest(".slk-ask-yes")) end(true); };
    addEventListener("keydown", key, true); document.body.appendChild(w); w.querySelector(".slk-ask-yes").focus();
  });

  if (APP === "pos") return; // the till keeps its fixed layout: alerts and dark mode come from CSS only

  // ---------- back buttons read "‹ Back"-style: drop the old arrow characters
  const BACK = ".morebk,.ptback,.adback,[data-kbback],[data-detback],[data-cusback],[data-brback],[data-devback],[data-scback],[data-tbback],[data-dsback],[data-otback],[data-scbrback],[data-scbrandback]";
  function backs() {
    $$(BACK).forEach(b => {
      if (b._ios) return; b._ios = 1; b.classList.add("ios-back");
      b.childNodes.forEach(n => { if (n.nodeType === 3) n.textContent = n.textContent.replace(/^\s*[←‹<]\s*/, ""); });
      if (!b.textContent.trim()) b.insertAdjacentHTML("beforeend", "<span>Back</span>");
    });
  }

  // ---------- collapsing large title: the page title shrinks into the glass bar once it scrolls under it
  function title() {
    if (!CFG.bar) return; const bar = document.querySelector(CFG.bar), h = document.querySelector(CFG.title);
    if (!bar) return;
    let t = bar.querySelector(":scope > .ios-ttl"); if (!t) { t = document.createElement("div"); t.className = "ios-ttl"; t.setAttribute("aria-hidden", "true"); bar.appendChild(t); }
    const txt = h ? h.textContent.trim() : ""; if (t.textContent !== txt) t.textContent = txt;
    const under = !!h && h.getBoundingClientRect().bottom < bar.getBoundingClientRect().bottom + 2;
    document.body.classList.toggle("ios-compact", under);
    document.body.classList.toggle("ios-scrolled", (document.scrollingElement.scrollTop || 0) > 4 || under);
  }
  addEventListener("scroll", () => soon(title), { capture: true, passive: true });

  // ---------- admin phone tab bar, made from the side menu
  function tabbar() {
    if (!CFG.tabbar) return; const links = $$(".side " + CFG.tabbar + ", nav " + CFG.tabbar).filter(a => !a.closest(".ios-tabbar"));
    if (!links.length) return;
    let bar = document.querySelector(".ios-tabbar");
    if (!bar) { bar = document.createElement("nav"); bar.className = "ios-tabbar"; bar.setAttribute("aria-label", "Main"); document.body.appendChild(bar);
      bar.addEventListener("click", e => { const a = e.target.closest("[data-to]"); if (!a) return; e.preventDefault(); const src = $$(CFG.tabbar).find(x => !x.closest(".ios-tabbar") && x.dataset.view === a.dataset.to); src && src.click(); }); }
    const html = links.slice(0, 5).map(a => `<a href="#" data-to="${a.dataset.view}" class="${a.classList.contains("on") ? "on" : ""}"><i>${(a.querySelector("svg") || {}).outerHTML || ""}</i><span>${a.textContent.trim()}</span></a>`).join("");
    if (bar._h !== html) { bar._h = html; bar.innerHTML = html; }
  }

  // ---------- sliding segmented control: one white thumb glides to the chosen segment
  const SEG = ".ttabs:not(.rqtabs),.dmseg,.vtog,#view .tabs.dtabs,.ptabs:not(.ptset),.seg,.thsw";
  const MEM = new Map();
  function segs() {
    if (STILL) return;
    const all = $$(SEG); const seen = new Map();
    all.forEach(c => {
      const on = c.querySelector(":scope > .on"); const key = c.className.replace(/\bios-segc\b/g, "").trim() + "|" + (seen.get(c.className) || 0);
      seen.set(c.className, (seen.get(c.className) || 0) + 1);
      let th = c.querySelector(":scope > .ios-thumb");
      if (!on || c.offsetParent === null) { if (th) th.style.opacity = "0"; return; }
      c.classList.add("ios-segc");
      const fresh = !th; if (fresh) { th = document.createElement("i"); th.className = "ios-thumb"; th.setAttribute("aria-hidden", "true"); c.appendChild(th); }
      const now = { x: on.offsetLeft, y: on.offsetTop, w: on.offsetWidth, h: on.offsetHeight };
      const put = (p, anim) => { th.style.transition = anim ? "" : "none"; th.style.width = p.w + "px"; th.style.height = p.h + "px"; th.style.transform = `translate(${p.x}px,${p.y}px)`; th.style.opacity = "1"; };
      const was = MEM.get(key);
      if (fresh && was && (was.x !== now.x || was.w !== now.w)) { put(was, false); void th.offsetWidth; put(now, true); }
      else if (!th._p || th._p.x !== now.x || th._p.w !== now.w || th._p.y !== now.y || th._p.h !== now.h) put(now, !fresh);
      th._p = now; MEM.set(key, now);
    });
  }
  addEventListener("resize", () => soon(segs));

  // ---------- search fields show Cancel while you type (phones and tablets)
  const SRCH = ".nusearch input,#view input[type=search],.srch input,.lsrch input,.top input[type=search]";
  document.addEventListener("focusin", e => {
    const i = e.target.closest && e.target.closest(SRCH); if (!i || innerWidth > 1180) return;
    const w = i.parentElement; if (!w || w.querySelector(":scope > .ios-cancel")) { w && w.classList.add("ios-srch"); return; }
    w.classList.add("ios-srch", "ios-srchw");
    const b = document.createElement("button"); b.type = "button"; b.className = "ios-cancel"; b.textContent = "Cancel";
    b.addEventListener("pointerdown", ev => ev.preventDefault());
    b.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); if (i.value) { i.value = ""; i.dispatchEvent(new Event("input", { bubbles: true })); } i.blur(); w.classList.remove("ios-srch"); });
    w.appendChild(b);
  });
  document.addEventListener("focusout", e => { const i = e.target.closest && e.target.closest(SRCH); if (!i) return; setTimeout(() => { if (document.activeElement !== i) i.parentElement && i.parentElement.classList.remove("ios-srch"); }, 120); });

  // ---------- long-press (touch) or right-click (mouse) on a list row opens a small iOS menu
  const ROW = "tr.clk,tr.ios-tap,tr[data-oid],.orow,.ccard[data-oid]";
  function rowMenu(row, x, y) {
    closeMenu();
    const cb = row.querySelector("input[type=checkbox]"); const name = (row.querySelector(".omain b,td:not(.bkc):not(.noedit),b,strong") || row).textContent.trim().split("\n")[0].slice(0, 80);
    const items = [["Open", "open"]]; if (cb) items.push([cb.checked ? "Deselect" : "Select", "sel"]); if (name && navigator.clipboard) items.push(["Copy Name", "copy"]);
    const m = document.createElement("div"); m.className = "ios-cmenu"; m.setAttribute("role", "menu");
    m.innerHTML = `<div class="ios-cm-b">${items.map(([t, k]) => `<button type="button" role="menuitem" data-cm="${k}">${t}</button>`).join("")}</div>`;
    document.body.appendChild(m); row.classList.add("ios-lift");
    const b = m.firstChild, r = b.getBoundingClientRect();
    b.style.left = Math.max(10, Math.min(x, innerWidth - r.width - 10)) + "px"; b.style.top = Math.max(10, Math.min(y, innerHeight - r.height - 10)) + "px";
    m.addEventListener("click", e => { const k = e.target.closest("[data-cm]")?.dataset.cm; closeMenu();
      if (k === "open") row.click(); else if (k === "sel") cb.click(); else if (k === "copy") navigator.clipboard.writeText(name).catch(() => {}); });
    m.addEventListener("contextmenu", e => { e.preventDefault(); closeMenu(); });
  }
  function closeMenu() { $$(".ios-cmenu").forEach(x => x.remove()); $$(".ios-lift").forEach(x => x.classList.remove("ios-lift")); }
  addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });
  document.addEventListener("contextmenu", e => { const row = e.target.closest(ROW); if (!row || e.target.closest("input,textarea,a[href^=http]")) return; e.preventDefault(); rowMenu(row, e.clientX, e.clientY); });
  let lp = null, lpXY = null, lpFired = false;
  document.addEventListener("touchstart", e => { const row = e.target.closest(ROW); if (!row || e.touches.length > 1) return; const t = e.touches[0]; lpXY = [t.clientX, t.clientY]; lpFired = false;
    clearTimeout(lp); lp = setTimeout(() => { lpFired = true; navigator.vibrate && navigator.vibrate(8); rowMenu(row, lpXY[0], lpXY[1]); }, 480); }, { passive: true });
  document.addEventListener("touchmove", e => { if (!lpXY) return; const t = e.touches[0]; if (Math.abs(t.clientX - lpXY[0]) + Math.abs(t.clientY - lpXY[1]) > 10) clearTimeout(lp); }, { passive: true });
  document.addEventListener("touchend", e => { clearTimeout(lp); if (lpFired) { e.preventDefault(); lpFired = false; } });
  document.addEventListener("click", e => { if (lpFired) { e.preventDefault(); e.stopPropagation(); } }, true);

  // ---------- bottom sheets on phones: a grabber, and swipe down to close
  const SHEET = ".scrim .modal,#dlg .dlgb,#dlg > div,#m.modal > div,#sheet,.scrim > .sheet,.odrawer";
  function grabbers() {
    if (!phone() || !touch) return;
    $$(SHEET).forEach(s => { if (s.offsetParent === null || s.querySelector(":scope > .ios-grab")) return; const g = document.createElement("i"); g.className = "ios-grab"; g.setAttribute("aria-hidden", "true"); s.prepend(g); s.classList.add("ios-sheet"); });
  }
  function closeSheetOf(s) {
    const x = s.querySelector('[aria-label="Close"],.x,[data-close],[data-coback]');
    if (x) { x.click(); return; }
    const scrim = s.closest(".scrim,#dlg,#m,.dlg") || s.parentElement; scrim && scrim.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    if (APP === "team") document.getElementById("scrim")?.remove();
  }
  let sw = null;
  document.addEventListener("touchstart", e => {
    if (!phone() || STILL) return; const s = e.target.closest(".ios-sheet"); if (!s) return;
    const sc = e.target.closest("textarea,input,select,[contenteditable]"); if (sc) return;
    let el = e.target, scrolled = false; while (el && el !== s.parentElement) { if (el.scrollTop > 0) { scrolled = true; break; } el = el.parentElement; }
    const r = s.getBoundingClientRect(); const top = e.touches[0].clientY - r.top < 64;
    if (scrolled && !top) return; sw = { s, y0: e.touches[0].clientY, t0: Date.now(), dy: 0 };
  }, { passive: true });
  document.addEventListener("touchmove", e => {
    if (!sw) return; const dy = e.touches[0].clientY - sw.y0; if (dy <= 0) { if (sw.dy) { sw.s.style.transform = ""; } sw.dy = 0; return; }
    sw.dy = dy; sw.s.style.transition = "none"; sw.s.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  document.addEventListener("touchend", () => {
    if (!sw) return; const { s, dy, t0 } = sw; sw = null; s.style.transition = ""; if (!dy) return;
    const fast = dy / Math.max(1, Date.now() - t0) > .6;
    if (dy > 120 || (fast && dy > 40)) { s.style.transform = "translateY(110%)"; setTimeout(() => { closeSheetOf(s); s.style.transform = ""; }, 220); }
    else s.style.transform = "";
  });

  // ---------- pull to refresh (touch, top of the page, no sheet open)
  if (touch && APP !== "order") {
    const ptr = document.createElement("div"); ptr.className = "ios-ptr"; ptr.innerHTML = '<i></i>'; let pull = null;
    const open = () => document.querySelector(".scrim.show,.scrim[style*=flex],#scrim,#dlg.on,#dlg.show,.slk-ask,.ios-cmenu,body.navopen,body.modal-open") || $$(".ios-sheet").some(s => s.offsetParent !== null);
    document.addEventListener("touchstart", e => { if ((document.scrollingElement.scrollTop || 0) > 0 || open() || e.target.closest(".ios-sheet,.side,input,textarea,select,.tabbar,.ios-tabbar,.board,[draggable=true]")) return;
      pull = { y0: e.touches[0].clientY, d: 0 }; }, { passive: true });
    document.addEventListener("touchmove", e => { if (!pull) return; const d = (e.touches[0].clientY - pull.y0) * .5; if (d <= 0) { pull.d = 0; ptr.remove(); return; }
      pull.d = d; if (!ptr.isConnected) document.body.appendChild(ptr); ptr.style.transform = `translate(-50%,${Math.min(d, 90) - 40}px)`; ptr.style.opacity = Math.min(1, d / 60); ptr.firstChild.style.transform = `rotate(${d * 4}deg)`; ptr.classList.toggle("ready", d > 70); }, { passive: true });
    document.addEventListener("touchend", () => { if (!pull) return; const d = pull.d; pull = null;
      if (d > 70) { ptr.classList.add("spin"); ptr.style.transform = "translate(-50%,24px)"; setTimeout(() => { if (typeof window.iosRefresh === "function") { Promise.resolve(window.iosRefresh()).finally(() => { ptr.classList.remove("spin"); ptr.remove(); }); } else location.reload(); }, 350); }
      else ptr.remove(); });
  }

  // ---------- lists: tables of tappable rows become iOS rows on phones (labels come from the header)
  function lists() {
    $$("#view table").forEach(t => {
      if (t.classList.contains("olisttbl") || t.closest(".modal,.odrawer")) return;
      if (!phone() && !t.closest(".splitl") && !document.body.classList.contains("ios-splitm")) return;
      const rows = $$(":scope > tbody > tr", t); if (!t.tHead || !rows.length) return;
      const tap = r => r.classList.contains("clk") || r.classList.contains("click") || [...r.attributes].some(a => /^data-(.*open|cid|oid|co|inv)$/.test(a.name));
      if ((t.tHead.rows[t.tHead.rows.length - 1] || { cells: [] }).cells.length > 8 && !rows.some(tap)) return;   // wide reports keep their columns and scroll sideways
      if (rows.some(r => r.querySelector("input:not([type=checkbox]),select,textarea"))) return;
      t.classList.add("ios-ltable"); rows.forEach(r => r.classList.toggle("ios-tap", tap(r)));
      const hr = t.tHead && t.tHead.rows[t.tHead.rows.length - 1]; const heads = hr ? [...hr.cells].map(c => c.textContent.trim()) : [];
      rows.forEach(r => {
        if (r._iosN === r.cells.length && r._iosT === r.textContent.length) return; r._iosN = r.cells.length; r._iosT = r.textContent.length;
        let first = null, last = null;
        [...r.cells].forEach((c, i) => {
          const tx = c.textContent.trim(); c.classList.toggle("ios-empty", (!tx && !c.querySelector("input,img,svg,button")) || tx === "—" || tx === "-");
          if (heads[i] && !c.hasAttribute("colspan")) c.dataset.l = heads[i];
          if (!first && tx && !c.classList.contains("bkc") && !c.classList.contains("grc") && !c.hasAttribute("colspan")) first = c;
          if (tx && /^(USD|LBP|\$)?\s?-?[\d.,]+\s?(USD|LBP|%)?$/.test(tx)) last = c;
        });
        [...r.cells].forEach(c => { c.classList.toggle("ios-t1", c === first); c.classList.toggle("ios-num", c === last && c !== first); });
      });
    });
  }

  // ---------- keep it all in step with the page
  const split = () => { const v = document.querySelector("#view .splitv[data-split]"); if (!v) return; const id = v.dataset.split;
    $$(".splitl tbody > tr", v).forEach(r => r.classList.toggle("ios-sel", [...r.attributes].some(a => a.name.startsWith("data-") && (a.value === id || a.value.endsWith(":" + id))))); };
  const splitm = () => { if (APP !== "admin") return; const m = document.getElementById("m"); const on = !!(m && m.classList.contains("on") && innerWidth >= 1100 && document.querySelector("#view [data-co]"));
    document.body.classList.toggle("ios-splitm", on); if (!on) return; const v = document.getElementById("view"); if (v) root.style.setProperty("--ios-splitx", Math.round(v.getBoundingClientRect().right + 16) + "px"); };
  let coSel = ""; document.addEventListener("click", e => { const r = e.target.closest && e.target.closest("[data-co]"); if (r) coSel = r.dataset.co; }, true);
  const run = () => { splitm(); if (APP === "admin") $$("#view tr[data-co]").forEach(r => r.classList.toggle("ios-sel", document.body.classList.contains("ios-splitm") && r.dataset.co === coSel)); backs(); title(); tabbar(); segs(); grabbers(); if (phone() || document.querySelector(".splitl") || document.body.classList.contains("ios-splitm")) lists(); split(); };
  const start = () => { run(); new MutationObserver(() => soon(run)).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden", "style"] }); };
  document.addEventListener("click", () => setTimeout(() => soon(run), 30), true);
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
