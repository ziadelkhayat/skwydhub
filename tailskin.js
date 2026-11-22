/* TailAdmin shell for the Skwyd back office: header (menu toggle, search, theme, account), logo, breadcrumb.
   Design only: every page, list and action stays the app's own. */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const XL = matchMedia("(min-width:768px) and (min-height:501px)");
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
    /* iPad / computer: the menu button opens and closes the side menu (closed = icons only, TailAdmin style); phones: slide-in menu */
    mb.addEventListener("click", e => { if (!XL.matches) return; e.stopImmediatePropagation(); e.stopPropagation(); const on = document.body.classList.toggle("ta-mini"); document.body.classList.remove("ta-hov"); try { localStorage.setItem("ta_mini", on ? "1" : ""); } catch (_) {} }, true);
    try { if (localStorage.getItem("ta_mini")) document.body.classList.add("ta-mini"); } catch (_) {}
    if (matchMedia("(hover:hover)").matches) side.addEventListener("mouseenter", () => document.body.classList.add("ta-hov"));
    side.addEventListener("mouseleave", () => document.body.classList.remove("ta-hov"));

    /* logo: sidebar (desktop) and middle of the header (phone/tablet) */
    const sk = $(".brand.skb", side), mk = sk && $(".skmark", sk), wd = sk && $(".skword", sk);
    const clean = el => { const c = el.cloneNode(true); c.querySelectorAll("svg").forEach(v => { v.removeAttribute("style"); v.removeAttribute("width"); v.removeAttribute("height"); }); return c.innerHTML; };
    const LOGO_SK = mk && wd ? '<span class="ta-skm">' + clean(mk) + '</span><span class="ta-skw">' + clean(wd) + "</span>" : LOGO;
    const nh = $(".nuhead", side);
    const sl = document.createElement("a"); sl.href = "#dashboard"; sl.className = "ta-logo ta-slogo ta-sk"; sl.innerHTML = LOGO_SK;
    if (nh) nh.replaceWith(sl); else side.insertBefore(sl, side.firstChild);
    const hl = document.createElement("a"); hl.href = "#dashboard"; hl.className = "ta-logo ta-hlogo ta-sk"; hl.innerHTML = LOGO_SK;
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

    /* the side menu on phones opens just under the header */
    const hh = () => document.documentElement.style.setProperty("--ta-hh", Math.round(top.getBoundingClientRect().height) + "px");
    hh(); if (window.ResizeObserver) new ResizeObserver(hh).observe(top); addEventListener("resize", hh);
    /* close the drawer after picking a page on phones and tablets */
    nav.addEventListener("click", e => { if (!XL.matches && e.target.closest("a[href]")) document.body.classList.remove("navopen"); });
    return true;
  }


  /* TailAdmin's own menu icons where it has one for the page */
  const TA_ICONS = {"#dashboard": "<path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V8.99998C3.25 10.2426 4.25736 11.25 5.5 11.25H9C10.2426 11.25 11.25 10.2426 11.25 8.99998V5.5C11.25 4.25736 10.2426 3.25 9 3.25H5.5ZM4.75 5.5C4.75 5.08579 5.08579 4.75 5.5 4.75H9C9.41421 4.75 9.75 5.08579 9.75 5.5V8.99998C9.75 9.41419 9.41421 9.74998 9 9.74998H5.5C5.08579 9.74998 4.75 9.41419 4.75 8.99998V5.5ZM5.5 12.75C4.25736 12.75 3.25 13.7574 3.25 15V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H9C10.2426 20.75 11.25 19.7427 11.25 18.5V15C11.25 13.7574 10.2426 12.75 9 12.75H5.5ZM4.75 15C4.75 14.5858 5.08579 14.25 5.5 14.25H9C9.41421 14.25 9.75 14.5858 9.75 15V18.5C9.75 18.9142 9.41421 19.25 9 19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5V15ZM12.75 5.5C12.75 4.25736 13.7574 3.25 15 3.25H18.5C19.7426 3.25 20.75 4.25736 20.75 5.5V8.99998C20.75 10.2426 19.7426 11.25 18.5 11.25H15C13.7574 11.25 12.75 10.2426 12.75 8.99998V5.5ZM15 4.75C14.5858 4.75 14.25 5.08579 14.25 5.5V8.99998C14.25 9.41419 14.5858 9.74998 15 9.74998H18.5C18.9142 9.74998 19.25 9.41419 19.25 8.99998V5.5C19.25 5.08579 18.9142 4.75 18.5 4.75H15ZM15 12.75C13.7574 12.75 12.75 13.7574 12.75 15V18.5C12.75 19.7426 13.7574 20.75 15 20.75H18.5C19.7426 20.75 20.75 19.7427 20.75 18.5V15C20.75 13.7574 19.7426 12.75 18.5 12.75H15ZM14.25 15C14.25 14.5858 14.5858 14.25 15 14.25H18.5C18.9142 14.25 19.25 14.5858 19.25 15V18.5C19.25 18.9142 18.9142 19.25 18.5 19.25H15C14.5858 19.25 14.25 18.9142 14.25 18.5V15Z\" fill=\"currentColor\" />", "#customers": "<path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 14.1526 4.3002 16.1184 5.61936 17.616C6.17279 15.3096 8.24852 13.5955 10.7246 13.5955H13.2746C15.7509 13.5955 17.8268 15.31 18.38 17.6167C19.6996 16.119 20.5 14.153 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5ZM17.0246 18.8566V18.8455C17.0246 16.7744 15.3457 15.0955 13.2746 15.0955H10.7246C8.65354 15.0955 6.97461 16.7744 6.97461 18.8455V18.856C8.38223 19.8895 10.1198 20.5 12 20.5C13.8798 20.5 15.6171 19.8898 17.0246 18.8566ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM11.9991 7.25C10.8847 7.25 9.98126 8.15342 9.98126 9.26784C9.98126 10.3823 10.8847 11.2857 11.9991 11.2857C13.1135 11.2857 14.0169 10.3823 14.0169 9.26784C14.0169 8.15342 13.1135 7.25 11.9991 7.25ZM8.48126 9.26784C8.48126 7.32499 10.0563 5.75 11.9991 5.75C13.9419 5.75 15.5169 7.32499 15.5169 9.26784C15.5169 11.2107 13.9419 12.7857 11.9991 12.7857C10.0563 12.7857 8.48126 11.2107 8.48126 9.26784Z\" fill=\"currentColor\" />", "#sales-reports": "<path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M12 2C11.5858 2 11.25 2.33579 11.25 2.75V12C11.25 12.4142 11.5858 12.75 12 12.75H21.25C21.6642 12.75 22 12.4142 22 12C22 6.47715 17.5228 2 12 2ZM12.75 11.25V3.53263C13.2645 3.57761 13.7659 3.66843 14.25 3.80098V3.80099C15.6929 4.19606 16.9827 4.96184 18.0104 5.98959C19.0382 7.01734 19.8039 8.30707 20.199 9.75C20.3316 10.2341 20.4224 10.7355 20.4674 11.25H12.75ZM2 12C2 7.25083 5.31065 3.27489 9.75 2.25415V3.80099C6.14748 4.78734 3.5 8.0845 3.5 12C3.5 16.6944 7.30558 20.5 12 20.5C15.9155 20.5 19.2127 17.8525 20.199 14.25H21.7459C20.7251 18.6894 16.7492 22 12 22C6.47715 22 2 17.5229 2 12Z\" fill=\"currentColor\" />", "#inv-items": "<path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M11.665 3.75618C11.8762 3.65061 12.1247 3.65061 12.3358 3.75618L18.7807 6.97853L12.3358 10.2009C12.1247 10.3064 11.8762 10.3064 11.665 10.2009L5.22014 6.97853L11.665 3.75618ZM4.29297 8.19199V16.0946C4.29297 16.3787 4.45347 16.6384 4.70757 16.7654L11.25 20.0365V11.6512C11.1631 11.6205 11.0777 11.5843 10.9942 11.5425L4.29297 8.19199ZM12.75 20.037L19.2933 16.7654C19.5474 16.6384 19.7079 16.3787 19.7079 16.0946V8.19199L13.0066 11.5425C12.9229 11.5844 12.8372 11.6207 12.75 11.6515V20.037ZM13.0066 2.41453C12.3732 2.09783 11.6277 2.09783 10.9942 2.41453L4.03676 5.89316C3.27449 6.27429 2.79297 7.05339 2.79297 7.90563V16.0946C2.79297 16.9468 3.27448 17.7259 4.03676 18.1071L10.9942 21.5857L11.3296 20.9149L10.9942 21.5857C11.6277 21.9024 12.3732 21.9024 13.0066 21.5857L19.9641 18.1071C20.7264 17.7259 21.2079 16.9468 21.2079 16.0946V7.90563C21.2079 7.05339 20.7264 6.27429 19.9641 5.89316L13.0066 2.41453Z\" fill=\"currentColor\" />", "#marketplace": "<path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M14 2.75C14 2.33579 14.3358 2 14.75 2C15.1642 2 15.5 2.33579 15.5 2.75V5.73291L17.75 5.73291H19C19.4142 5.73291 19.75 6.0687 19.75 6.48291C19.75 6.89712 19.4142 7.23291 19 7.23291H18.5L18.5 12.2329C18.5 15.5691 15.9866 18.3183 12.75 18.6901V21.25C12.75 21.6642 12.4142 22 12 22C11.5858 22 11.25 21.6642 11.25 21.25V18.6901C8.01342 18.3183 5.5 15.5691 5.5 12.2329L5.5 7.23291H5C4.58579 7.23291 4.25 6.89712 4.25 6.48291C4.25 6.0687 4.58579 5.73291 5 5.73291L6.25 5.73291L8.5 5.73291L8.5 2.75C8.5 2.33579 8.83579 2 9.25 2C9.66421 2 10 2.33579 10 2.75L10 5.73291L14 5.73291V2.75ZM7 7.23291L7 12.2329C7 14.9943 9.23858 17.2329 12 17.2329C14.7614 17.2329 17 14.9943 17 12.2329L17 7.23291L7 7.23291Z\" fill=\"currentColor\" />", "grp:Catalog": "<path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M8.50391 4.25C8.50391 3.83579 8.83969 3.5 9.25391 3.5H15.2777C15.4766 3.5 15.6674 3.57902 15.8081 3.71967L18.2807 6.19234C18.4214 6.333 18.5004 6.52376 18.5004 6.72268V16.75C18.5004 17.1642 18.1646 17.5 17.7504 17.5H16.248V17.4993H14.748V17.5H9.25391C8.83969 17.5 8.50391 17.1642 8.50391 16.75V4.25ZM14.748 19H9.25391C8.01126 19 7.00391 17.9926 7.00391 16.75V6.49854H6.24805C5.83383 6.49854 5.49805 6.83432 5.49805 7.24854V19.75C5.49805 20.1642 5.83383 20.5 6.24805 20.5H13.998C14.4123 20.5 14.748 20.1642 14.748 19.75L14.748 19ZM7.00391 4.99854V4.25C7.00391 3.00736 8.01127 2 9.25391 2H15.2777C15.8745 2 16.4468 2.23705 16.8687 2.659L19.3414 5.13168C19.7634 5.55364 20.0004 6.12594 20.0004 6.72268V16.75C20.0004 17.9926 18.9931 19 17.7504 19H16.248L16.248 19.75C16.248 20.9926 15.2407 22 13.998 22H6.24805C5.00541 22 3.99805 20.9926 3.99805 19.75V7.24854C3.99805 6.00589 5.00541 4.99854 6.24805 4.99854H7.00391Z\" fill=\"currentColor\" />", "grp:Inventory": "<path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M11.665 3.75618C11.8762 3.65061 12.1247 3.65061 12.3358 3.75618L18.7807 6.97853L12.3358 10.2009C12.1247 10.3064 11.8762 10.3064 11.665 10.2009L5.22014 6.97853L11.665 3.75618ZM4.29297 8.19199V16.0946C4.29297 16.3787 4.45347 16.6384 4.70757 16.7654L11.25 20.0365V11.6512C11.1631 11.6205 11.0777 11.5843 10.9942 11.5425L4.29297 8.19199ZM12.75 20.037L19.2933 16.7654C19.5474 16.6384 19.7079 16.3787 19.7079 16.0946V8.19199L13.0066 11.5425C12.9229 11.5844 12.8372 11.6207 12.75 11.6515V20.037ZM13.0066 2.41453C12.3732 2.09783 11.6277 2.09783 10.9942 2.41453L4.03676 5.89316C3.27449 6.27429 2.79297 7.05339 2.79297 7.90563V16.0946C2.79297 16.9468 3.27448 17.7259 4.03676 18.1071L10.9942 21.5857L11.3296 20.9149L10.9942 21.5857C11.6277 21.9024 12.3732 21.9024 13.0066 21.5857L19.9641 18.1071C20.7264 17.7259 21.2079 16.9468 21.2079 16.0946V7.90563C21.2079 7.05339 20.7264 6.27429 19.9641 5.89316L13.0066 2.41453Z\" fill=\"currentColor\" />", "#schedule": "<path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M8 2C8.41421 2 8.75 2.33579 8.75 2.75V3.75H15.25V2.75C15.25 2.33579 15.5858 2 16 2C16.4142 2 16.75 2.33579 16.75 2.75V3.75H18.5C19.7426 3.75 20.75 4.75736 20.75 6V9V19C20.75 20.2426 19.7426 21.25 18.5 21.25H5.5C4.25736 21.25 3.25 20.2426 3.25 19V9V6C3.25 4.75736 4.25736 3.75 5.5 3.75H7.25V2.75C7.25 2.33579 7.58579 2 8 2ZM8 5.25H5.5C5.08579 5.25 4.75 5.58579 4.75 6V8.25H19.25V6C19.25 5.58579 18.9142 5.25 18.5 5.25H16H8ZM19.25 9.75H4.75V19C4.75 19.4142 5.08579 19.75 5.5 19.75H18.5C18.9142 19.75 19.25 19.4142 19.25 19V9.75Z\" fill=\"currentColor\" />"};
  function navIcons() { const nav = $("#nav"); if (!nav) return;
    const put = (el, paths) => { const n = el && $(".nti", el); if (!n || n.dataset.ta) return; n.dataset.ta = "1"; n.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + paths.replace(/fill="[^"]*"/g, "") + "</svg>"; };
    Object.entries(TA_ICONS).forEach(([k, paths]) => {
      if (k.startsWith("grp:")) { const b = $$(".grp > button", nav).find(x => x.textContent.trim() === k.slice(4)); put(b, paths); }
      else put($(":scope > a[href='" + k + "']", nav), paths); }); }

  /* page layout as in TailAdmin: title left + breadcrumb right; the page's buttons go into the list card's header; the filter card and the table are one card; numbered pages under the table */
  function layout() {
    const v = $("#view"); if (!v) return;
    const ph = $(":scope > .phead, :scope > .ostick > .phead", v);
    const card = $(":scope > .card.otabsc, :scope > .ostick > .card.otabsc", v);
    if (ph && card && !ph.dataset.ta) { ph.dataset.ta = "1"; const top = $(":scope > .ttop", card);
      const acts = [...ph.children].filter(c => !c.matches("h1,.sp,.hico,.ib,.note,[data-tip],.ta-crumb"));
      if (top && acts.length) { const box = document.createElement("div"); box.className = "ta-acts"; acts.forEach(a => box.appendChild(a)); top.appendChild(box); } }
    const cr = $(":scope > .ta-crumb", v);
    if (ph && cr && ![...ph.children].some(c => c.matches(".btn,.ddwrap,.ordtools,select,.sel"))) { ph.appendChild(cr); ph.classList.add("ta-ph"); }
    if (card) { card.classList.add("ta-jtop"); let nx = card.nextElementSibling; if (!nx && card.parentElement !== v) nx = card.parentElement.nextElementSibling; if (nx && nx.matches(".card")) nx.classList.add("ta-jbot"); }
    $$(".pager", v).forEach(pg => { if (pg.dataset.ta) return; const btns = $$(":scope > .btn", pg); if (btns.length < 2) return; pg.dataset.ta = "1";
      const [prev, next] = [btns[0], btns[btns.length - 1]]; const txt = $$(":scope > .note", pg).map(n => n.textContent).join(" ");
      const m = txt.match(/Page\s+(\d+)\s+of\s+(\d+)/i); const cur = m ? +m[1] : 1, tot = m ? +m[2] : 1;
      const nav = document.createElement("div"); nav.className = "ta-pages";
      const mk = (lbl, cls, fn, dis) => { const b = document.createElement("button"); b.type = "button"; b.className = cls; b.innerHTML = lbl; if (dis) b.disabled = true; else b.addEventListener("click", fn); return b; };
      const AR = d => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="' + (d ? "m7.5 15 5-5-5-5" : "m12.5 15-5-5 5-5") + '" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      nav.appendChild(mk(AR(0), "ta-pg ta-pga", () => prev.click(), prev.disabled));
      if (cur > 1) nav.appendChild(mk(String(cur - 1), "ta-pg", () => prev.click()));
      nav.appendChild(mk(String(cur), "ta-pg on", () => {}, false));
      if (cur < tot) nav.appendChild(mk(String(cur + 1), "ta-pg", () => next.click()));
      if (cur + 1 < tot) { const d = document.createElement("span"); d.className = "ta-pg ta-pgd"; d.textContent = "…"; nav.appendChild(d); if (cur + 2 <= tot) nav.appendChild(mk(String(tot), "ta-pg", () => {}, true)); }
      nav.appendChild(mk(AR(1), "ta-pg ta-pga", () => next.click(), next.disabled));
      pg.prepend(nav); pg.classList.add("ta-pager"); });
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
    if (!c) { c = $(".phead > .ta-crumb", v); }
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
    let t = 0; const run = () => { clearTimeout(t); t = setTimeout(() => { crumb(); try { layout(); navIcons(); } catch (e) { console.warn(e); } }, 30); };
    new MutationObserver(run).observe(v, { childList: true });
    new MutationObserver(run).observe($("#nav"), { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
    addEventListener("hashchange", run); run();
  }

  /* iPhone turned sideways: keep everything clear of the Dynamic Island / notch, also when Safari's page zoom is changed (env() alone comes up short then) */
  (function () {
    if (!/iPhone/.test(navigator.userAgent)) return;
    const root = document.documentElement;
    const set = () => {
      const land = innerWidth > innerHeight, a = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0;
      const zoom = (window.devicePixelRatio || 3) / 3, px = Math.round(60 / zoom);   // the island ends about 50pt from the edge; 60pt keeps a small gap
      root.style.setProperty("--ta-sl", land && (a === 90) ? px + "px" : "0px");
      root.style.setProperty("--ta-sr", land && (a === 270 || a === -90) ? px + "px" : "0px");
    };
    set(); addEventListener("resize", set); addEventListener("orientationchange", () => setTimeout(set, 200));
    screen.orientation?.addEventListener?.("change", set);
  })();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
