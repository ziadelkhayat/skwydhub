// Skwyd v2 (approved iOS design): reshapes each back-office page into iOS columns on iPad and computer.
// Section column (the page's tabs or categories) · List column (title bar, search, segments, rows) · Detail column.
// Only moves the page's own elements, so every button keeps working.
(function () {
  const WIDE = () => innerWidth >= 1100;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const ICO = {
    plus: '<path d="M12 5v14M5 12h14"/>', filter: '<path d="M4 7h16M7 12h10M10 17h4"/>', share: '<path d="M12 15V3M7.5 7.5L12 3l4.5 4.5M5 12v8h14v-8"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>', cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>'
  };
  const svg = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[n]}</svg>`;
  // a page button becomes a round icon button in the title bar (its label stays as the accessible name)
  function roundify(b, icon, tint) {
    if (b._v2) return b; b._v2 = 1;
    const label = (b.getAttribute("aria-label") || b.textContent || "").replace(/\s+/g, " ").replace(/[▾▼]/g, "").trim();
    b.setAttribute("aria-label", label); b.title = label; b.classList.add("v2rb"); if (tint) b.classList.add("v2tint");
    b.dataset.v2label = label; b.innerHTML = svg(icon) + (b.querySelector(".fcount") ? b.querySelector(".fcount").outerHTML : "");
    return b;
  }
  const SIMPLE = /^([a-z]+-reports|schedule|time-clock|payroll|dashboard|call-center|team-chat|tasks|knowledge|online-ordering|loyalty|subscription|marketplace)$/;
  function sectionTitle() { const on = $(".side a.on, .side .on > a, .side [aria-current=page]"); const grp = on && on.closest(".grp"); const g = grp && grp.querySelector(":scope > button"); return ((g || on || {}).textContent || "").replace(/[^\p{L}\p{N} &'-]/gu, "").replace(/\s+/g, " ").trim().replace(/^Employee Management$/, "Employees"); }

  function shape() {
    const v = $("#view"); if (!v) return;
    document.body.classList.toggle("v2", WIDE());
    document.body.classList.toggle("v2p", innerWidth <= 760);
    if (!WIDE()) { if (innerWidth <= 760) phoneBar(v); return; }
    if (v.querySelector(":scope > .v2cols, :scope > .v3")) return;
    const split = v.querySelector(":scope > .splitv, :scope .catr > .splitv"), src = split ? split.querySelector(".splitl") : v;
    const phead = src.querySelector(".phead"), list = src.querySelector(".card.tbl, .card:has(> table), .card:has(.olisttbl)");
    const ptabs = v.querySelector(":scope > .ptabs:not(.ptset), :scope > nav.ptabs"), catl = v.querySelector(".catl"), ptset = v.querySelector(".ptset");
    let route = ""; try { route = HASH().slice(1); } catch (_) { route = location.pathname.split("/").filter(Boolean)[0] || ""; }
    if (!phead || !list || SIMPLE.test(route)) { v.classList.add("v2simple"); shapeSimple(v, ptabs); return; }
    v.classList.remove("v2simple");
    // --- list column
    const col = document.createElement("section"); col.className = "v2list"; col.setAttribute("aria-label", "List");
    const bar = document.createElement("div"); bar.className = "v2bar";
    const btns = document.createElement("div"); btns.className = "v2btns";
    const h1 = phead.querySelector("h1"); const title = document.createElement("h1"); title.className = "v2title"; title.textContent = h1 ? h1.textContent.trim() : "";
    // actions: filter, import/export, export, create
    const flt = list.querySelector(".fltbtn, [data-ordflt], [data-cfltbtn]") || src.querySelector(".fltbtn"); if (flt) btns.appendChild(roundify(flt, "filter"));
    const ie = phead.querySelector(".iewrap"); if (ie) { roundify(ie.querySelector("button"), "share"); btns.appendChild(ie); }
    phead.querySelectorAll("button.btn:not(.pri), a.btn:not(.pri):not(.ios-back)").forEach(b => { if (b.closest(".iewrap") || b.closest(".ordtools")) return; btns.appendChild(roundify(b, /csv|export|print/i.test(b.textContent) ? "share" : "more")); });
    phead.querySelectorAll(".btn.pri").forEach(b => btns.appendChild(roundify(b, "plus", true)));
    bar.appendChild(btns); bar.appendChild(title); col.appendChild(bar);
    const tools = phead.querySelector(".ordtools"); const search = list.querySelector(".crsrch, .osrch") || src.querySelector(".osrch");
    const ttop = list.querySelector(".ttop") || src.querySelector(".ttop");
    if (search) col.appendChild(search);
    if (ttop) { const seg = ttop.querySelector(".ttabs"); if (seg) { const w = document.createElement("div"); w.className = "v2seg"; w.appendChild(seg); col.appendChild(w); } }
    if (tools) { tools.classList.add("v2chips"); col.appendChild(tools); }
    const chips = src.querySelector(".fchips"); if (chips) col.appendChild(chips);
    list.classList.add("v2rows"); col.appendChild(list);
    // --- detail column
    const det = document.createElement("section"); det.className = "v2det"; det.setAttribute("aria-label", "Details");
    if (split) { det.dataset.split = split.dataset.split || ""; const r = split.querySelector(".splitr"); while (r.firstChild) det.appendChild(r.firstChild); }
    else det.innerHTML = `<div class="v2empty">${svg("doc")}<b>Nothing selected</b><span>Choose ${title.textContent ? "one of the " + title.textContent.toLowerCase() : "a row"} to see it here.</span></div>`;
    // --- section column (the page's tabs, or the categories)
    const cols = document.createElement("div"); cols.className = "v2cols";
    const sec = sectionColumn(ptabs, catl, ptset); if (sec) cols.appendChild(sec);
    cols.appendChild(col); cols.appendChild(det);
    // everything else that was on the page (banners, notes) goes above the rows
    $$(":scope > *", v).forEach(x => { if (x !== cols && x !== ptabs && !x.contains(list) && !x.classList.contains("ptset")) { if (x.matches(".banner, .note, .warnbar")) col.insertBefore(x, list); else x.remove(); } });
    if (ptabs) ptabs.remove(); if (ptset) ptset.remove();
    v.appendChild(cols);
  }
  // phones: the page title bar becomes the iOS large title with round buttons above it
  function phoneBar(v) {
    if (v.querySelector(".v2bar")) return; const phead = v.querySelector(".phead"); if (!phead || phead.closest(".modal")) return;
    const bar = document.createElement("div"); bar.className = "v2bar"; const btns = document.createElement("div"); btns.className = "v2btns";
    const back = phead.querySelector(".ios-back"); if (back) { btns.appendChild(back); btns.classList.add("v2hasback"); }
    const sp = document.createElement("span"); sp.style.flex = "1"; btns.appendChild(sp);
    const flt = v.querySelector(".fltbtn"); if (flt) btns.appendChild(roundify(flt, "filter"));
    const ie = phead.querySelector(".iewrap"); if (ie) { roundify(ie.querySelector("button"), "share"); btns.appendChild(ie); }
    phead.querySelectorAll("button.btn:not(.pri), a.btn:not(.pri):not(.ios-back)").forEach(b => { if (b.closest(".iewrap") || b.closest(".ordtools")) return; btns.appendChild(roundify(b, /csv|export|print/i.test(b.textContent) ? "share" : "more")); });
    phead.querySelectorAll(".btn.pri").forEach(b => btns.appendChild(roundify(b, "plus", true)));
    const h1 = phead.querySelector("h1"); const t = document.createElement("h1"); t.className = "v2title"; t.textContent = h1 ? h1.textContent.trim() : "";
    bar.appendChild(btns); bar.appendChild(t); phead.classList.add("v2gone"); phead.parentElement.insertBefore(bar, phead);
  }
  function sectionColumn(ptabs, catl, ptset) {
    const src = ptset || ptabs; if (!src && !catl) return null;
    const s = document.createElement("nav"); s.className = "v2sec"; s.setAttribute("aria-label", "Section");
    s.innerHTML = `<h1 class="v2title">${sectionTitle() || "Menu"}</h1>`;
    if (catl) { const h = catl.querySelector("h2"); if (h) h.remove(); s.appendChild(catl); if (src) { const m = document.createElement("h3"); m.textContent = "More"; s.appendChild(m); } }
    if (src) { const box = document.createElement("div"); box.className = "v2secl"; $$("a", src).forEach(a => { if (catl && a.classList.contains("on")) return; box.appendChild(a); }); s.appendChild(box); }
    return s;
  }
  function shapeSimple(v, ptabs) {
    if (v.querySelector(":scope > .v2cols")) return;
    const rc = v.querySelector(".rptv > .catl"); if (rc) { const r = rc.closest(".rptv"); r.classList.remove("catv"); }
    const sec = rc ? sectionColumn(null, rc, null) : sectionColumn(ptabs, null, v.querySelector(".ptset")); const cols = document.createElement("div"); cols.className = "v2cols v2one";
    const main = document.createElement("section"); main.className = "v2main";
    $$(":scope > *", v).forEach(x => { if (x !== ptabs && !x.classList.contains("ptset")) main.appendChild(x); });
    if (ptabs) ptabs.remove(); const ps = v.querySelector(".ptset"); if (ps) ps.remove();
    if (sec) cols.appendChild(sec); cols.appendChild(main); v.appendChild(cols);
  }
  let raf = 0; const soon = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { try { shape(); } catch (e) { console.warn("v2", e); } }); };
  const start = () => { new MutationObserver(muts => { if (muts.some(m => m.target.id === "view" || [...m.addedNodes].some(n => n.id === "view" || (n.querySelector && n.querySelector("#view"))))) soon(); }).observe(document.body, { childList: true, subtree: true }); soon(); };
  addEventListener("resize", soon);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
