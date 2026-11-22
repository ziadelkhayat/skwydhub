/* TailAdmin shell for the Skwyd back office: header (menu toggle, search, theme, account), logo, breadcrumb.
   Design only: every page, list and action stays the app's own. */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const XL = matchMedia("(min-width:1280px)");
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const ICON = {
    menu: '<svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M.583 1A.75.75 0 0 1 1.333.25h13.334a.75.75 0 0 1 0 1.5H1.333A.75.75 0 0 1 .583 1Zm0 10a.75.75 0 0 1 .75-.75h13.334a.75.75 0 0 1 0 1.5H1.333a.75.75 0 0 1-.75-.75Zm.75-5.75a.75.75 0 0 0 0 1.5H8a.75.75 0 0 0 0-1.5H1.333Z" fill="currentColor"/></svg>',
    close: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    search: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m14.382 14.383 3.325 3.326m-1.249-8.334a7.082 7.082 0 1 1-14.165 0 7.082 7.082 0 0 1 14.165 0Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    moon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M17.455 11.97 18.188 12.146a.75.75 0 0 0-1.083-.84l.35.664Zm-9.425-9.425.664.35a.75.75 0 0 0-.84-1.083l.176.733ZM12.708 13.333A6.042 6.042 0 0 1 6.667 7.292h-1.5a7.542 7.542 0 0 0 7.541 7.541v-1.5Zm4.398-2.026a6.012 6.012 0 0 1-4.398 2.026v1.5a7.512 7.512 0 0 0 5.098-2.198l-.7-1.328ZM6.667 7.292c0-1.024.255-1.986.703-2.83l-1.33-.7a7.512 7.512 0 0 0-.873 3.53h1.5Zm4.375 10.416A7.917 7.917 0 0 1 3.125 9.79h-1.5a9.417 9.417 0 0 0 9.417 9.417v-1.5ZM3.125 9.79A7.92 7.92 0 0 1 8.206 3.278l-.352-1.458A9.42 9.42 0 0 0 1.625 9.79h1.5Zm13.597 2.003a7.92 7.92 0 0 1-5.68 5.915l.352 1.458a9.42 9.42 0 0 0 6.794-7.02l-1.466-.353Z" fill="currentColor"/></svg>',
    sun: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
    dots: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',
    chev: '<svg width="18" height="20" viewBox="0 0 18 20" fill="none" aria-hidden="true"><path d="m4.313 7.854 4.687 4.688 4.688-4.688" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    crumb: '<svg width="17" height="16" viewBox="0 0 17 16" fill="none" aria-hidden="true"><path d="M6.083 12.667 10.25 8.5 6.083 4.333" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    user: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 3.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9.5 7.5a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0ZM5.75 18.5c0-2.21 2.799-4 6.25-4s6.25 1.79 6.25 4V20h-1.5v-1.5c0-1.06-1.79-2.5-4.75-2.5s-4.75 1.44-4.75 2.5V20h-1.5v-1.5Z" fill="currentColor"/></svg>',
    out: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15.1 19.247c-.414 0-.75-.336-.75-.75v-2.252h-1.5v2.252a2.25 2.25 0 0 0 2.25 2.25H18.5a2.25 2.25 0 0 0 2.25-2.25V5.497A2.25 2.25 0 0 0 18.5 3.247h-3.4a2.25 2.25 0 0 0-2.25 2.25v2.252h1.5V5.497c0-.414.336-.75.75-.75h3.4c.414 0 .75.336.75.75v13c0 .414-.336.75-.75.75h-3.4ZM3.251 11.998c0 .216.091.41.237.547l4.607 4.608a.75.75 0 1 0 1.06-1.06l-3.344-3.345h10.437a.75.75 0 0 0 0-1.5H5.814l3.341-3.341a.75.75 0 1 0-1.06-1.06l-4.585 4.585a.749.749 0 0 0-.259.566Z" fill="currentColor"/></svg>',
    gear: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 4.3a1.7 1.7 0 0 1 3.4 0 1.7 1.7 0 0 0 2.6 1.1 1.7 1.7 0 0 1 2.4 2.4 1.7 1.7 0 0 0 1 2.5 1.7 1.7 0 0 1 0 3.4 1.7 1.7 0 0 0-1 2.6 1.7 1.7 0 0 1-2.4 2.4 1.7 1.7 0 0 0-2.6 1 1.7 1.7 0 0 1-3.4 0 1.7 1.7 0 0 0-2.5-1 1.7 1.7 0 0 1-2.4-2.4 1.7 1.7 0 0 0-1.1-2.6 1.7 1.7 0 0 1 0-3.4 1.7 1.7 0 0 0 1.1-2.5A1.7 1.7 0 0 1 7.8 5.4a1.7 1.7 0 0 0 2.5-1.1Z"/><circle cx="12" cy="12" r="3"/></svg>'
  };
  const SEED = [["#modifiers","Modifiers Groups","Catalog"],["#modifier-options","Modifier Options","Catalog"],["#categories","Categories","Catalog"],["#combos","Combos","Catalog"],["#allergens","Allergens","Catalog"],["#variants","Variants","Catalog"],
    ["#inv-categories","Inventory Categories","Inventory"],["#inv-levels","Inventory Levels","Inventory"],["#inv-history","Inventory History","Inventory"],["#inventory-count","Inventory Count","Inventory"],["#production","Production","Inventory"],["#purchasing","Purchasing","Inventory"],["#purchase-orders","Purchase Orders","Inventory"],["#transfers","Transfers","Inventory"],["#warehouses","Warehouses","Inventory"],["#suppliers","Suppliers","Inventory"],
    ["#delivery-zones","Delivery Zones","Web Ordering"],["#delivery-charges","Delivery Charges","Web Ordering"],["#coupons","Coupons","Marketing"],["#gift-cards","Gift Cards","Marketing"],["#loyalty","Loyalty","Marketing"],
    ["#roles","Roles","Employees"],["#schedule","Schedule","Employees"],["#time-clock","Time Clock","Employees"],["#requests","Requests","Employees"],["#payroll","Payroll","Employees"],["#documents","Documents","Employees"],["#tasks","Tasks","Employees"],["#knowledge","Knowledge Base","Employees"],
    ["#brands","Brands","Manage"],["#branches","Stores","Manage"],["#devices","Devices","Manage"],["#taxes","Taxes & Groups","Manage"],["#currency","Currency","Manage"],["#payment-methods","Payment Methods","Manage"],["#order-sources","Order Sources","Manage"],["#charges","Charges","Manage"],["#kitchen-flows","Kitchen Flows","Manage"],["#reasons","Reasons","Manage"],["#tags","Tags","Manage"],["#applications","Applications","Manage"],
    ["#sales-reports","Sales Reports","Reports"],["#inventory-reports","Inventory Reports","Reports"],["#business-reports","Business Reports","Reports"],["#analysis-reports","Analysis Reports","Reports"],["#employee-reports","Employee Reports","Reports"],["#account","Account Settings","Account"]];
  const LOGO = '<span class="ta-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M7 6v12M12 10v8M17 8v10"/></svg></span><span class="ta-word">Skwyd</span>';

  function build() {
    const top = $(".main > .top"), side = $("aside.side"), nav = $("#nav");
    if (!top || !side || !nav || top.dataset.ta) return !!(top && top.dataset.ta);
    top.dataset.ta = "1"; document.body.classList.add("ta");

    /* menu toggle: drawer below 1280, narrow icon menu from 1280 (TailAdmin "sidebarToggle") */
    const mb = $("#menuBtn");
    mb.innerHTML = '<span class="ta-i-menu">' + ICON.menu + '</span><span class="ta-i-x">' + ICON.close + "</span>";
    mb.setAttribute("aria-label", "Toggle sidebar");
    mb.addEventListener("click", e => { if (!XL.matches) return; e.stopImmediatePropagation(); e.stopPropagation(); document.body.classList.toggle("ta-mini"); try { localStorage.setItem("ta_mini", document.body.classList.contains("ta-mini") ? "1" : ""); } catch (_) {} }, true);
    try { if (localStorage.getItem("ta_mini")) document.body.classList.add("ta-mini"); } catch (_) {}
    side.addEventListener("mouseenter", () => document.body.classList.add("ta-hov"));
    side.addEventListener("mouseleave", () => document.body.classList.remove("ta-hov"));

    /* logo: sidebar (desktop) and middle of the header (phone/tablet) */
    const nh = $(".nuhead", side);
    const sl = document.createElement("a"); sl.href = "#dashboard"; sl.className = "ta-logo ta-slogo"; sl.innerHTML = LOGO;
    if (nh) nh.replaceWith(sl); else side.insertBefore(sl, side.firstChild);
    const hl = document.createElement("a"); hl.href = "#dashboard"; hl.className = "ta-logo ta-hlogo"; hl.innerHTML = LOGO;
    mb.after(hl);

    /* header search ("Search or type command…  ⌘K"): finds any page of the menu */
    const sw = document.createElement("div"); sw.className = "ta-search";
    sw.innerHTML = '<span class="ta-si">' + ICON.search + '</span><input type="text" id="taQ" placeholder="Search pages..." autocomplete="off" aria-label="Search pages"><kbd><span>⌘</span><span>K</span></kbd><div class="ta-sres" hidden></div>';
    hl.after(sw);
    const q = $("#taQ", sw), res = $(".ta-sres", sw);
    const pages = () => { const seen = new Set(), out = [];
      $$("a[href^='#']", nav).filter(a => a.textContent.trim()).forEach(a => { const g = a.closest(".grp"), h = a.getAttribute("href"); seen.add(h);
        out.push({ h, t: a.textContent.trim(), g: g ? $(":scope > button", g)?.textContent.trim() : "" }); });
      SEED.forEach(([h, t, g]) => { if (!seen.has(h)) { seen.add(h); out.push({ h, t, g }); } });
      return out; };
    let sel = 0, hits = [];
    const draw = () => { const v = q.value.trim().toLowerCase(); if (!v) { res.hidden = true; return; }
      hits = pages().filter(p => (p.t + " " + p.g).toLowerCase().includes(v)).slice(0, 8); sel = 0;
      res.innerHTML = hits.length ? hits.map((p, i) => `<a href="${esc(p.h)}" class="${i === sel ? "on" : ""}" data-i="${i}"><b>${esc(p.t)}</b>${p.g && p.g !== p.t ? `<span>${esc(p.g)}</span>` : ""}</a>`).join("") : '<div class="ta-snone">No pages found</div>';
      res.hidden = false; };
    q.addEventListener("input", draw);
    q.addEventListener("focus", draw);
    q.addEventListener("keydown", e => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!hits.length) return; sel = (sel + (e.key === "ArrowDown" ? 1 : hits.length - 1)) % hits.length; $$("a", res).forEach((x, i) => x.classList.toggle("on", i === sel)); }
      else if (e.key === "Enter") { e.preventDefault(); const h = hits[sel]; if (h) { location.hash = h.h; q.value = ""; res.hidden = true; q.blur(); } }
      else if (e.key === "Escape") { q.value = ""; res.hidden = true; q.blur(); } });
    res.addEventListener("mousedown", e => { const a = e.target.closest("a"); if (!a) return; e.preventDefault(); location.hash = a.getAttribute("href"); q.value = ""; res.hidden = true; q.blur(); });
    q.addEventListener("blur", () => setTimeout(() => { res.hidden = true; }, 120));
    addEventListener("keydown", e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); q.focus(); } });

    /* right side: theme switch + account (on phones they sit on a second row opened by ⋯) */
    const more = document.createElement("button"); more.type = "button"; more.className = "ta-more"; more.setAttribute("aria-label", "More"); more.innerHTML = ICON.dots;
    const right = document.createElement("div"); right.className = "ta-right";
    const th = document.createElement("button"); th.type = "button"; th.className = "ta-ibtn ta-theme"; th.setAttribute("aria-label", "Toggle theme");
    th.innerHTML = '<span class="ta-moon">' + ICON.moon + '</span><span class="ta-sun">' + ICON.sun + "</span>";
    th.addEventListener("click", () => { const dark = document.documentElement.getAttribute("data-theme") === "dark"; if (window.SkwydTheme) SkwydTheme.set(dark ? "light" : "dark"); else document.documentElement.toggleAttribute("data-theme"); });
    right.appendChild(th);
    sw.after(more); more.after(right);
    more.addEventListener("click", () => document.body.classList.toggle("ta-row2"));
    document.addEventListener("click", e => { if (!e.target.closest(".ta-more,.ta-right")) document.body.classList.remove("ta-row2"); });

    /* the account button lives in the header only (the app moves it into the side menu on big screens) */
    const place = () => { const ac = $(".acct"); if (ac && ac.parentElement !== right) right.appendChild(ac); document.body.classList.remove("notop"); };
    place(); new MutationObserver(place).observe($(".sidefoot") || side, { childList: true });
    XL.addEventListener?.("change", place);
    const ab = $("#acctBtn"); if (ab && !$(".ta-chev", ab)) { const c = $(".chev", ab); const s = document.createElement("span"); s.className = "ta-chev"; s.innerHTML = ICON.chev; c ? c.replaceWith(s) : ab.appendChild(s); }

    /* account menu in TailAdmin's order: name + email, links with icons, sign out */
    const am = $("#acctMenu");
    if (am && !am.dataset.ta) { am.dataset.ta = "1";
      const set = $("a[href='#account']", am); if (set) set.innerHTML = ICON.gear + "<span>Account settings</span>";
      if (set && !$("a[href='#users']", am)) set.insertAdjacentHTML("beforebegin", `<a href="#users" role="menuitem">${ICON.user}<span>Employees</span></a>`);
      const so = $("#amSignOut", am); if (so) so.innerHTML = ICON.out + "<span>Sign out</span>"; }
    const bz = () => { const b = ($("#coNm")?.textContent || "").trim(), h = $(".acchead", am); if (!h) return; let s = $(".ta-biz", h); if (!s) { s = document.createElement("span"); s.className = "ta-biz"; h.appendChild(s); } s.textContent = b; };
    bz(); const cn = $("#coNm"); if (cn) new MutationObserver(bz).observe(cn, { childList: true, characterData: true, subtree: true });

    /* close the drawer after picking a page on phones and tablets */
    nav.addEventListener("click", e => { if (!XL.matches && e.target.closest("a[href]")) document.body.classList.remove("navopen"); });
    return true;
  }

  /* breadcrumb (Home › Section › Page) above every page, from the menu */
  function crumb() {
    const v = $("#view"), nav = $("#nav"); if (!v || !nav) return;
    const on = $("a.on", nav); let c = $(":scope > .ta-crumb", v);
    if (!on) { if (c) c.remove(); return; }
    const g = on.closest(".grp"), gp = g ? $(":scope > button", g)?.textContent.trim() : "";
    const t = on.textContent.trim(), parts = ["Home"].concat(gp && gp !== t ? [gp] : [], [t]);
    if (t === "Summary") parts.splice(1);
    const h = parts.map((p, i) => i < parts.length - 1 ? `<li><a href="#dashboard">${esc(p)}</a>${ICON.crumb}</li>` : `<li aria-current="page">${esc(p)}</li>`).join("");
    if (!c) { c = document.createElement("nav"); c.className = "ta-crumb"; c.setAttribute("aria-label", "Breadcrumb"); v.prepend(c); }
    if (c.dataset.h !== h) { c.innerHTML = "<ol>" + h + "</ol>"; c.dataset.h = h; }
    $$("li:not([aria-current]) a", c).forEach((a, i) => { if (i > 0) a.removeAttribute("href"); });
  }

  function start() {
    if (!build()) { const mo = new MutationObserver(() => { if (build()) { mo.disconnect(); hook(); } }); mo.observe(document.body, { childList: true, subtree: true }); return; }
    hook();
  }
  function hook() {
    const v = $("#view"); if (!v) return;
    let t = 0; const run = () => { clearTimeout(t); t = setTimeout(crumb, 30); };
    new MutationObserver(run).observe(v, { childList: true });
    new MutationObserver(run).observe($("#nav"), { subtree: true, attributes: true, attributeFilter: ["class"] });
    addEventListener("hashchange", run); run();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
