// Skwyd v3: screens drawn from the approved design file itself (same markup and sizes as the artboards), filled with live data.
// The old handlers keep working because the same ids and data- attributes are used.
(function () {
  const T = "#0066D6", TF = "#0A66D8", SEP = "#E3E3E8", L2 = "#6C6C70";
  const GREEN = "#248A3D", RED = "#D70015", ORANGE = "#C93400", PURPLE = "#8944AB", TEAL = "#0071A4";
  const P = {
    filter: '<path d="M4 7h16M7 12h10M10 17h4"/>', share: '<path d="M12 15V3M7.5 7.5L12 3l4.5 4.5M5 12v8h14v-8"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>', search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8"/>',
    chev: '<path d="M9 5l7 7-7 7"/>', printer: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>', bag: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
    store: '<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5 11v9h14v-9"/>', phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>', people: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/>', pin: '<path d="M12 21s-6-6-6-11a6 6 0 0 1 12 0c0 5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
    cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>'
  };
  const e = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ic = (n, s = 22, c = "currentColor", w = 1.8) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
  const tile = (n, bg, s = 36, is = 20, r = 18) => `<span style="width:${s}px;height:${s}px;border-radius:${r}px;background:${bg};display:inline-grid;place-items:center;flex:none">${ic(n, is, "#FFFFFF", 2)}</span>`;
  const chev = () => `<span style="display:inline-flex;flex:none">${ic("chev", 14, "#C4C4C7", 2.4)}</span>`;
  const chip = (t, c, bg) => `<span style="display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:999px;background:${bg};color:${c};font-size:12px;font-weight:600;white-space:nowrap">${e(t)}</span>`;
  const gbtn = (n, label, attrs = "", tint) => `<button type="button" aria-label="${e(label)}" title="${e(label)}" ${attrs} class="v3g" style="width:40px;height:40px;border-radius:999px;border:0;background:rgba(118,118,128,.12);display:grid;place-items:center;cursor:pointer;color:${tint ? T : "#000"};padding:0;position:relative">${ic(n, 20, "currentColor", 2)}</button>`;
  const pill = (t, primary, n, attrs = "") => `<button type="button" ${attrs} class="v3p" style="height:40px;padding:0 18px;border-radius:999px;border:0;background:${primary ? TF : "rgba(118,118,128,.12)"};color:${primary ? "#fff" : T};font:inherit;font-size:15px;font-weight:600;display:inline-flex;align-items:center;gap:6px;cursor:pointer;white-space:nowrap">${n ? ic(n, 18, "currentColor", 2.2) : ""}${e(t)}</button>`;
  const group = (rows, header, mx = 16) => `<div style="margin:0 ${mx}px">${header ? `<div style="padding:0 16px 7px;font-size:13px;color:${L2};text-transform:uppercase;letter-spacing:.2px">${e(header)}</div>` : ""}<div style="background:#fff;border-radius:12px;overflow:hidden">${rows.map((r, i) => (i ? `<div style="height:1px;background:${SEP};margin-left:16px"></div>` : "") + r).join("")}</div></div>`;
  const row = (label, value, o = {}) => `<div style="display:flex;align-items:center;gap:12px;min-height:${o.sub ? 58 : 44}px;padding:0 16px">${o.icon ? tile(o.icon, o.icolor, 30, 18, 8) : ""}<div style="flex:1;min-width:0;padding:10px 0"><div style="font-size:17px;font-weight:${o.bold ? 600 : 400};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(label)}</div>${o.sub ? `<div style="font-size:13px;color:${L2};margin-top:1px">${e(o.sub)}</div>` : ""}</div>${value != null ? `<span style="color:${o.vcol || L2};font-size:17px;white-space:nowrap">${e(value)}</span>` : ""}${o.chev ? chev() : ""}</div>`;
  const SC = { pending: ORANGE, review: PURPLE, draft: L2, active: TF, closed: GREEN, declined: RED, void: RED, returned: RED, refund: RED };
  const TYI = t => t === "delivery" ? "truck" : t === "dinein" || t === "fast" ? "store" : "bag";
  const ago = t => { if (!t) return ""; const m = Math.round((Date.now() - new Date(t)) / 60000); return m < 1 ? "Now" : m < 60 ? m + " min" : m < 1440 ? Math.floor(m / 60) + " h" : new Date(t).dmy(); };

  let C = {};
  const V3 = window.V3 = {
    on: () => innerWidth >= 1100 && !document.documentElement.hasAttribute("data-v3off"),
    orders(ctx) {
      if (ctx) C = ctx; C.loadOrders();
      const st = C.ORD_ST, rows = C.ORD.rows || [];
      const bname = id => (C.branches.find(b => b.id === id) || {}).name || "";
      const list = rows.map(o => { const c = SC[o.status] || L2, sel = C.ORD.open === o.id, who = o.customerName || (o.phone ? C.telFmt(o.phone) : "") || (o.table ? "Table " + o.table : "");
        return `<a href="#orders" data-oid="${e(o.id)}" style="display:flex;gap:12px;padding:11px 16px;text-decoration:none;color:#000;background:${sel ? "rgba(10,102,216,.1)" : "transparent"};border-radius:${sel ? 10 : 0}px;margin:0 ${sel ? 8 : 0}px">
${tile(TYI(o.type), c)}<div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:17px;font-weight:600">${e(o.ref || "—")}</b><span style="font-size:15px;color:${L2}">${e(ago(o.createdAt))}</span></div>
<div style="display:flex;justify-content:space-between;gap:8px;font-size:15px;color:${L2};margin-top:1px"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(C.ordTypeLbl(o.type))}${who ? " · " + e(who) : ""}${bname(o.branchId) ? " · " + e(bname(o.branchId)) : ""}</span><span style="color:#000;white-space:nowrap">${e(C.money(+o.total || 0))}</span></div>
<div style="margin-top:5px">${chip(st[o.status] || o.status, c, c + "1A")}</div></div></a><div style="height:1px;background:${SEP};margin-left:64px"></div>`; }).join("")
        || `<div style="padding:40px 16px;text-align:center;color:${L2};font-size:15px">${C.ORD.loading ? "Loading orders…" : "No orders match these filters."}</div>`;
      const segs = C.ORD_TABS.map(([k, t]) => `<a href="#orders" data-otab="${k}" style="flex:none;height:28px;padding:0 12px;border-radius:7px;display:grid;place-items:center;font-size:13px;font-weight:${C.ORD.tab === k ? 600 : 500};color:#000;text-decoration:none;background:${C.ORD.tab === k ? "#fff" : "transparent"};box-shadow:${C.ORD.tab === k ? "0 3px 8px rgba(0,0,0,.12),0 0 0 .5px rgba(0,0,0,.04)" : "none"};white-space:nowrap">${e(t)}</a>`).join("");
      const flt = C.fltBtn ? C.fltBtn("data-ordflt", "orders", !!(C.ORD.channel || C.ORD.type || C.ORD.pay || C.ORD.source || C.ORD.branch || C.ORD.brand), [C.ORD.channel, C.ORD.type, C.ORD.pay, C.ORD.source, C.ORD.branch, C.ORD.brand].filter(Boolean).length) : "";
      const pages = Math.max(1, Math.ceil(C.ORD.count / C.ORD.per));
      const chipsRow = `<div style="display:flex;gap:6px;padding:0 16px 8px;flex-wrap:wrap">
<select class="v3sel" id="ordBrand" aria-label="Brand"><option value="">All Brands</option>${C.brandList().map(b => `<option value="${e(b.id)}" ${C.ORD.brand === b.id ? "selected" : ""}>${e(b.name)}</option>`).join("")}</select>
<select class="v3sel" id="ordBranch" aria-label="Store"><option value="">All Stores</option>${C.branches.filter(b => !C.ORD.brand || b.brandId === C.ORD.brand).map(b => `<option value="${e(b.id)}" ${C.ORD.branch === b.id ? "selected" : ""}>${e(b.name)}</option>`).join("")}</select>
<button type="button" class="v3sel drpbtn" id="ordRange">${C.ORD.from ? e(C.drpLabel(C.ORD.from, C.ORD.to)) : "Any Date"}</button></div>`;
      const left = `<section class="v3col" aria-label="Orders" style="width:400px;flex:none;border-right:1px solid ${SEP};background:#fff;overflow:auto;height:100vh;box-sizing:border-box">
<div style="padding:10px 16px 0"><div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;min-height:44px"><span class="v3flt">${flt}</span>${gbtn("share", "Export CSV", 'id="ordCsv"')}</div>
<div style="padding:2px 0 8px"><h1 style="margin:0;font-size:34px;line-height:41px;font-weight:700;letter-spacing:-.8px">Orders</h1></div></div>
<div style="padding:0 16px 10px"><label style="display:flex;align-items:center;gap:6px;height:36px;padding:0 10px;border-radius:10px;background:rgba(118,118,128,.12);color:${L2};font-size:17px">${ic("search", 17, L2, 2)}<input type="search" id="ordQ" value="${e(C.ORD.q || "")}" placeholder="Order, customer or phone" aria-label="Search orders" autocomplete="off" style="border:0;background:transparent;outline:none;font:inherit;font-size:17px;color:#000;flex:1;min-width:0"></label></div>
<div style="padding:0 16px 10px;overflow-x:auto;scrollbar-width:none"><div role="group" style="display:flex;width:max-content;gap:2px;padding:2px;border-radius:9px;background:rgba(118,118,128,.12)">${segs}</div></div>
${chipsRow}<div>${list}</div>
<div style="display:flex;align-items:center;gap:8px;padding:12px 16px;font-size:13px;color:${L2}"><span style="flex:1">${C.ORD.count ? ((C.ORD.page - 1) * C.ORD.per + 1) + "–" + Math.min(C.ORD.count, C.ORD.page * C.ORD.per) + " of " + C.ORD.count.toLocaleString() : ""}</span>${C.ORD.page > 1 ? pill("Previous", false, null, 'id="ordPrev"') : ""}${C.ORD.page < pages ? pill("Next", false, null, 'id="ordNext"') : ""}</div></section>`;
      return `<div class="v3" style="display:flex;height:100vh">${left}<main class="v3col" style="flex:1;min-width:0;overflow:auto;height:100vh">${V3.orderDetail()}</main></div>`;
    },
    orderDetail() {
      const o = window.__ordOpen; if (!C.ORD.open || !o || o.id !== C.ORD.open) return `<div style="height:80vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:${L2};text-align:center">${ic("doc", 44, "#C7C7CC", 1.6)}<b style="font-size:20px;color:#000;font-weight:600;margin-top:6px">No Order Selected</b><span style="font-size:15px">Choose an order to see it here.</span></div>`;
      const c = SC[o.status] || L2, items = Array.isArray(o.items) ? o.items : [];
      const bname = (C.branches.find(b => b.id === o.branchId) || {}).name || "";
      const lines = items.map(i => row(`${+i.qty || 1} × ${i.name}`, C.money((+i.price || 0) * (+i.qty || 1)), { sub: (C.modLines ? C.modLines(i).join(" · ") : "") || null }));
      const tot = [row("Subtotal", C.money((+o.total || 0) - (+o.tax || 0)))];
      if (+o.deliveryFee) tot.push(row("Delivery", C.money(+o.deliveryFee)));
      if (+o.discount) tot.push(row("Discount", "− " + C.money(+o.discount), { vcol: GREEN }));
      if (+o.tax) tot.push(row("Tax", C.money(+o.tax)));
      tot.push(row("Total", C.money(+o.total || 0), { bold: true, vcol: "#000" }));
      const cus = []; if (o.customerName || o.phone) cus.push(row(o.customerName || "Customer", null, { icon: "people", icolor: TEAL, sub: o.phone ? C.telFmt(o.phone) : null, chev: true }));
      if (o.address) cus.push(row(typeof o.address === "string" ? o.address : [o.address.area, o.address.street, o.address.building].filter(Boolean).join(", "), null, { icon: "pin", icolor: RED, sub: o.address.extra || null }));
      const det = [row("Store", bname || "—"), row("Channel", C.salesChName ? C.salesChName(o.channel) : o.channel), row("Created", o.createdAt ? new Date(o.createdAt).dmy(true) : "—"), row("Payment", o.payment ? (C.PAY_LBL[o.payment.method] || o.payment.method) : "—")];
      if (o.invoiceNo) det.unshift(row("Check Number", C.invNo ? C.invNo(o.invoiceNo) : o.invoiceNo));
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 20px">${pill("More Details", false, "doc", 'data-v3more')}<div style="display:flex;gap:8px">${gbtn("x", "Close order", 'data-v3close')}</div></div>
<div style="padding:0 20px 12px"><div style="display:flex;align-items:center;gap:10px"><h1 style="margin:0;font-size:34px;font-weight:700;letter-spacing:-.8px">${e(o.ref || "")}</h1>${chip(C.ORD_ST[o.status] || o.status, c, c + "1A")}</div><div style="font-size:15px;color:${L2};margin-top:2px">${e(C.ordTypeLbl(o.type))}${bname ? " · " + e(bname) : ""}${o.createdAt ? " · " + e(ago(o.createdAt)) + " ago" : ""}</div></div>
<div style="display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);padding:0 4px">
<div style="display:flex;flex-direction:column;gap:18px">${lines.length ? group(lines, "Items") : ""}${group(tot)}</div>
<div style="display:flex;flex-direction:column;gap:18px">${cus.length ? group(cus, "Customer") : ""}${group(det, "Details")}</div></div>`;
    }
  };
  // open order: draw it in the detail column (the old sheet stays available under "More Details")
  document.addEventListener("click", ev => {
    const oa = ev.target.closest("#view .v3 a[data-oid]"); if (oa) { ev.preventDefault(); ev.stopPropagation(); C.ORD.open = oa.dataset.oid; Promise.resolve(C.openOrderDetail(oa.dataset.oid)).then(() => { document.documentElement.classList.remove("v3showsheet"); C.render(); }); return; }
    if (ev.target.closest("[data-v3close]")) { ev.preventDefault(); C.ORD.open = null; window.__ordOpen = null; $$scrimHide(); C.render(); }
    if (ev.target.closest("[data-v3more]")) { ev.preventDefault(); document.documentElement.classList.add("v3showsheet"); document.getElementById("ccScrim")?.classList.add("show"); }
  });
  function $$scrimHide() { document.getElementById("ccScrim")?.classList.remove("show"); document.documentElement.classList.remove("v3showsheet"); }
})();
// sidebar exactly like the design: business name under the title, a "Today" section, "Employees"
(function () {
  const fix = () => {
    const side = document.querySelector("aside.side"); if (!side) return;
    const head = side.querySelector(".nuhead"); const biz = (side.querySelector(".cocard b, .nuacct b") || {}).textContent;
    if (head && biz && !head.querySelector(".v3sub")) head.insertAdjacentHTML("beforeend", `<span class="v3sub">${biz.replace(/[<>&]/g, "")}</span>`);
    const nav = side.querySelector("nav") || side; const first = [...nav.querySelectorAll(":scope > a, :scope > .grp")][0];
    if (first && !nav.querySelector(".v3today")) first.insertAdjacentHTML("beforebegin", '<div class="nsec v3today">Today</div>');
    side.querySelectorAll("a, .grp > button").forEach(a => a.childNodes.forEach(n => { if (n.nodeType === 3 && n.textContent.trim() === "Employee Management") n.textContent = "Employees"; }));
    side.querySelectorAll("a span, .grp > button span").forEach(s => { if (s.children.length === 0 && s.textContent.trim() === "Employee Management") s.textContent = "Employees"; });
  };
  const go = () => { fix(); const s = document.querySelector("aside.side"); if (s) new MutationObserver(() => { clearTimeout(go.t); go.t = setTimeout(fix, 30); }).observe(s, { childList: true, subtree: true }); else setTimeout(go, 300); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
})();
// ---------- Catalog (items): categories · items · item, drawn from the design file
(function () {
  const T = "#0066D6", TF = "#0A66D8", SEP = "#E3E3E8", L2 = "#6C6C70", RED = "#D70015";
  const e = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const svg = (d, s = 20, c = "currentColor", w = 2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const D = { plus: '<path d="M12 5v14M5 12h14"/>', share: '<path d="M12 15V3M7.5 7.5L12 3l4.5 4.5M5 12v8h14v-8"/>', search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8"/>', fork: '<path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M16 3c-2 2-2 6 0 8v10"/>', doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>' };
  const gbtn = (d, label, attrs, tint) => `<button type="button" aria-label="${e(label)}" title="${e(label)}" ${attrs} class="v3g" style="width:40px;height:40px;border-radius:999px;border:0;background:rgba(118,118,128,.12);display:grid;place-items:center;cursor:pointer;color:${tint ? T : "#000"};padding:0;position:relative">${svg(d)}</button>`;
  const thumb = (p, s) => p.imageUrl ? `<img src="${e(p.imageUrl)}" alt="" style="width:${s}px;height:${s}px;border-radius:${Math.round(s / 4.8)}px;object-fit:cover;flex:none">` : `<span style="width:${s}px;height:${s}px;border-radius:${Math.round(s / 4.8)}px;background:linear-gradient(135deg,#FFE3C2,#F7B977);display:grid;place-items:center;flex:none">${svg(D.fork, Math.round(s / 2.2), "#8A4B08", 1.8)}</span>`;
  window.V3.catalog = function (C) {
    const { S, state, DET, CRUD, money, live, bySort, crudFltBtn, ptabs } = C, key = "products", cfg = CRUD[key];
    const f = ((state.cflt ||= {})[key] ||= {}), cat = f.cat || "", tab = state.tabs[key] || "all", q = (state.q[key] || "").toLowerCase();
    const cats = S.categories.filter(c => live(c) && !c.channel).sort(bySort), all = S.products.filter(p => live(p));
    let list = S.products.filter(cfg.tabs.find(t => t[0] === tab)[2]).filter(p => !cat || p.categoryId === cat).filter(r => !q || cfg.search(r).toLowerCase().includes(q)).filter(C.crudFltOk(key));
    list.sort(cfg.sort);
    const catName = id => (cats.find(c => c.id === id) || {}).name || "";
    const title = cat ? catName(cat) || "Items" : "All Items";
    const catRow = (id, name, n) => { const on = cur => cur === id; return `<a href="#products" data-catpick="${e(id)}" style="display:flex;justify-content:space-between;align-items:center;height:44px;padding:0 16px;margin:0 8px;border-radius:10px;text-decoration:none;color:${on(cat) ? "#fff" : "#000"};background:${on(cat) ? TF : "transparent"};font-size:17px"><span>${e(name)}</span><span style="color:${on(cat) ? "#fff" : L2}">${n}</span></a>`; };
    const more = (ptabs || []).filter(([r]) => r !== "products").map(([r, t, ico]) => `<a href="#${r}" style="display:flex;align-items:center;gap:10px;height:44px;padding:0 16px;margin:0 8px;text-decoration:none;color:#000;font-size:17px;border-radius:10px">${ico || ""}${e(t)}</a>`).join("");
    const sec = `<section class="v3col" aria-label="Categories" style="width:230px;flex:none;border-right:1px solid ${SEP};background:#F7F7FA;overflow:auto;height:100vh;box-sizing:border-box">
<div style="padding:10px 16px 0"><div style="display:flex;justify-content:flex-end;min-height:44px;align-items:center">${gbtn(D.plus, "New category", 'data-create="categories"', true)}</div><div style="padding:2px 0 8px"><h1>Catalog</h1></div></div>
<div style="padding:4px 0">${catRow("", "All Items", all.length)}${cats.map(c => catRow(c.id, c.name, all.filter(p => p.categoryId === c.id).length)).join("")}</div>
${more ? `<div style="padding:16px 24px 4px;font-size:13px;font-weight:600;color:${L2}">More</div><div class="v3more">${more}</div>` : ""}</section>`;
    const openId = DET.key === key ? DET.id : "";
    const rows = list.slice(0, 200).map(p => { const sel = p.id === openId, st = p.deleted ? "Deleted" : p.active === false ? "Inactive" : catName(p.categoryId) || "Active";
      return `<button type="button" data-open="${key}:${e(p.id)}" style="display:flex;gap:12px;align-items:center;width:calc(100% - 16px);padding:8px 16px;margin:0 8px;border:0;border-radius:10px;text-align:left;font:inherit;color:#000;cursor:pointer;background:${sel ? "rgba(10,102,216,.1)" : "transparent"}">${thumb(p, 48)}<span style="flex:1;min-width:0"><span style="display:block;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(p.name)}</span><span style="display:block;font-size:13px;color:${p.active === false || p.deleted ? RED : L2}">${e(st)}</span></span><span style="font-size:17px;white-space:nowrap">${e(money(+p.price || 0))}</span></button>`; }).join("")
      || `<div style="padding:40px 16px;text-align:center;color:${L2};font-size:15px">No items here yet.</div>`;
    const segs = cfg.tabs.map(([k, t]) => `<a href="#products" data-tab="${key}:${k}" style="flex:1;height:28px;border-radius:7px;display:grid;place-items:center;font-size:13px;font-weight:${tab === k ? 600 : 500};color:#000;text-decoration:none;background:${tab === k ? "#fff" : "transparent"};box-shadow:${tab === k ? "0 3px 8px rgba(0,0,0,.12)" : "none"}">${e(t)}</a>`).join("");
    const lst = `<section class="v3col" aria-label="Items" style="width:360px;flex:none;border-right:1px solid ${SEP};background:#fff;overflow:auto;height:100vh;box-sizing:border-box">
<div style="padding:10px 16px 0"><div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;min-height:44px"><span class="v3flt">${crudFltBtn(key)}</span><span class="ddwrap iewrap" style="position:relative">${gbtn(D.share, "Import or export", "data-iemenu")}<span class="ddmenu iemenu" hidden><button type="button" data-imp="${key}">Import</button><button type="button" data-exp="${key}">Export</button></span></span>${gbtn(D.plus, "Create item", `data-create="${key}"`, true)}</div>
<div style="padding:2px 0 8px"><h1>${e(title)}</h1></div></div>
<div style="padding:0 16px 10px"><label style="display:flex;align-items:center;gap:6px;height:36px;padding:0 10px;border-radius:10px;background:rgba(118,118,128,.12);color:${L2};font-size:17px">${svg(D.search, 17, L2)}<input type="search" data-search="${key}" value="${e(state.q[key] || "")}" placeholder="Name or SKU" aria-label="Search items" autocomplete="off" style="border:0;background:transparent;outline:none;font:inherit;font-size:17px;color:#000;flex:1;min-width:0"></label></div>
<div style="padding:0 16px 10px"><div role="group" style="display:flex;gap:2px;padding:2px;border-radius:9px;background:rgba(118,118,128,.12)">${segs}</div></div>${rows}</section>`;
    let det = `<div style="height:80vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:${L2};text-align:center">${svg(D.doc, 44, "#C7C7CC", 1.6)}<b style="font-size:20px;color:#000;font-weight:600;margin-top:6px">No Item Selected</b><span style="font-size:15px">Choose an item to see it here.</span></div>`;
    if (openId) { const r = S.products.find(x => x.id === openId); if (r) det = `<div class="v3det">${cfg.detail(r)}</div>`; }
    return `<div class="v3" style="display:flex;height:100vh">${sec}${lst}<main class="v3col" style="flex:1;min-width:0;overflow:auto;height:100vh;padding:10px 16px 40px;box-sizing:border-box">${det}</main></div>`;
  };
})();
