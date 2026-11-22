// Skwyd Hub admin, drawn from the approved design file (sidebar, Dashboard, Companies) on screens 1100px and wider.
// Uses the admin page's own data and actions (DATA, CO, INV, openCompany, viewAs, newCompany, showInvoice, slick_pa_update_subscription).
(function () {
  const T = "#0066D6", TF = "#0A66D8", SEP = "#E3E3E8", L2 = "#6C6C70", GREEN = "#248A3D", RED = "#D70015", ORANGE = "#C93400", PURPLE = "#8944AB";
  const on = () => innerWidth >= 1100;
  const e = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const P = { home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>', building: '<path d="M4 21V4h10v17M14 9h6v12M7 8h4M7 12h4M7 16h4M17 13h0M17 17h0"/>', invoice: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>', tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8"/>', more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>', chev: '<path d="M9 5l7 7-7 7"/>', plus: '<path d="M12 5v14M5 12h14"/>', filter: '<path d="M4 7h16M7 12h10M10 17h4"/>', share: '<path d="M12 15V3M7.5 7.5L12 3l4.5 4.5M5 12v8h14v-8"/>', doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>' };
  const svg = (n, s = 20, c = "currentColor", w = 2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
  const gbtn = (n, l, at, tint) => `<button type="button" aria-label="${e(l)}" title="${e(l)}" ${at} style="position:relative;width:40px;height:40px;border-radius:999px;border:0;background:rgba(118,118,128,.12);display:grid;place-items:center;cursor:pointer;color:${tint ? T : "#000"};padding:0">${svg(n)}</button>`;
  const chip = (t, c) => `<span style="display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:999px;background:${c}1A;color:${c};font-size:12px;font-weight:600;white-space:nowrap">${e(t)}</span>`;
  const chev = () => svg("chev", 14, "#C4C4C7", 2.4);
  const group = (rows, h, foot) => `<div style="margin:0 16px">${h ? `<div style="padding:0 16px 7px;font-size:13px;color:${L2};text-transform:uppercase;letter-spacing:.2px">${e(h)}</div>` : ""}<div style="background:#fff;border-radius:12px;overflow:hidden">${rows.map((r, i) => (i ? `<div style="height:1px;background:${SEP};margin-left:16px"></div>` : "") + r).join("") || `<div style="padding:12px 16px;color:${L2};font-size:15px">Nothing yet</div>`}</div>${foot ? `<div style="padding:7px 16px 0;font-size:13px;color:${L2}">${e(foot)}</div>` : ""}</div>`;
  const row = (l, v, o = {}) => `<${o.at ? `a href="#" ${o.at}` : "div"} style="display:flex;align-items:center;gap:10px;min-height:${o.sub ? 58 : 44}px;padding:0 16px;text-decoration:none;color:#000"><span style="flex:1 1 0;min-width:min-content;padding:8px 0"><span style="display:block;font-size:17px;line-height:22px">${e(l)}</span>${o.sub ? `<span style="display:block;font-size:13px;color:${L2}">${e(o.sub)}</span>` : ""}</span>${o.right || `<span style="font-size:17px;color:${o.vc || L2};white-space:nowrap;flex:none;max-width:60%;overflow:hidden;text-overflow:ellipsis;text-align:right">${e(v)}</span>`}${o.at ? chev() : ""}</${o.at ? "a" : "div"}>`;
  const ST = { active: GREEN, trial: PURPLE, grace: ORANGE, locked: RED, none: L2 };
  const stOf = c => c.sub?.complimentary ? ["Free", GREEN] : [STATE_LABEL[c.sub?.state] || "No Plan", ST[c.sub?.state] || L2];
  const ini = n => String(n || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const cur = () => DATA?.settings?.currency || "USD";
  const H = window.HV3 = { tab: "all", sort: "name", sel: null, x: "" };

  // ---------- sidebar
  function side() {
    const a = document.querySelector("aside.side"); if (!a || !on()) return;
    const nav = [["dashboard", "Dashboard", "home"], ["companies", "Companies", "building"], ["invoices", "Invoices", "invoice"], ["prices", "Price List", "tag"], ["settings", "Settings", "gear"]];
    const em = me?.email || "", nm0 = em.split("@")[0] || "Admin", nm = nm0.charAt(0).toUpperCase() + nm0.slice(1);
    let h = `<div class="v3side"><div style="padding:18px 16px 8px"><div style="font-size:30px;font-weight:700;letter-spacing:-.6px">Skwyd</div><div style="font-size:13px;color:${L2};margin-top:1px">Admin</div></div>
<div style="padding:4px 12px 10px"><label style="display:flex;align-items:center;gap:6px;height:36px;padding:0 10px;border-radius:10px;background:rgba(118,118,128,.12);color:${L2};font-size:17px">${svg("search", 17, L2)}<input type="search" class="hv3sq" placeholder="Search" aria-label="Search" style="border:0;background:transparent;outline:0;font:inherit;color:#000;flex:1;min-width:0;height:34px;padding:0"></label></div>`;
    nav.forEach(([k, t, i]) => { const o = view === k; h += `<a href="#" data-view="${k}" data-hv3nav class="${o ? "v3on" : ""}" style="margin:1px 10px;height:40px;padding:0 10px;border-radius:10px;display:flex;align-items:center;gap:12px;background:${o ? TF : "transparent"};color:${o ? "#fff" : "#000"};text-decoration:none;font-size:17px;font-weight:${o ? 600 : 400}">${svg(i, 22, o ? "#fff" : T, 1.8)}${t}</a>`; });
    h += `<div style="position:absolute;left:12px;right:12px;bottom:12px;display:flex;align-items:center;gap:10px;padding:10px;border-radius:12px;background:rgba(118,118,128,.1)"><span style="width:34px;height:34px;border-radius:50%;background:linear-gradient(180deg,#A1A1A6,#7C7C80);color:#fff;display:grid;place-items:center;font-size:13px;font-weight:600;flex:none">${e(ini(nm))}</span><span style="flex:1;min-width:0"><b style="display:block;font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(nm)}</b><span style="display:block;font-size:12px;color:${L2}">Platform Admin</span></span><span style="position:relative"><button type="button" data-v3om aria-label="Account" style="border:0;background:none;padding:4px;cursor:pointer;color:${L2}">${svg("more", 20)}</button><span class="ddmenu v3omenu" hidden style="bottom:34px;top:auto;right:0"><a href="#" data-hv3out>Sign Out</a></span></span></div></div>`;
    a.innerHTML = h;
    a.querySelectorAll("[data-view]").forEach(x => x.onclick = ev => { ev.preventDefault(); document.body.classList.remove("navopen"); if (view === x.dataset.view) return; view = x.dataset.view; VIN = 1; render(); });
  }

  // ---------- Dashboard
  const dashOld = viewDashboard;
  viewDashboard = function () {
    if (!on()) return dashOld();
    const cs = DATA.companies || [], now = new Date(), hr = now.getHours();
    const paying = cs.filter(c => !c.sub?.complimentary && c.sub?.state === "active");
    const mrr = paying.reduce((a, c) => a + Number(c.quote?.total || 0) / (c.quote?.cycle === "yearly" ? 12 : 1), 0);
    const owed = cs.reduce((a, c) => a + Number(c.sub?.owed || 0), 0);
    const count = st => cs.filter(c => !c.sub?.complimentary && c.sub?.state === st).length;
    const kp = [["Monthly Revenue", money(mrr, cur())], ["Paying", paying.length], ["On Trial", count("trial")], ["Owed", money(owed, cur())]].map(([a, b]) => `<div style="background:#fff;border-radius:14px;padding:12px 14px"><div style="font-size:13px;color:${L2}">${a}</div><div style="font-size:22px;font-weight:700">${e(b)}</div></div>`).join("");
    const need = cs.filter(c => !c.sub?.complimentary && (["trial", "grace"].includes(c.sub?.state) && c.sub?.daysLeft != null || c.sub?.state === "locked"))
      .sort((a, b) => (a.sub.state === "locked" ? -1 : a.sub.daysLeft) - (b.sub.state === "locked" ? -1 : b.sub.daysLeft)).slice(0, 8)
      .map(c => { const [t, col] = stOf(c), lk = c.sub.state === "locked", d = c.sub.daysLeft; return row(c.name, lk ? "Today" : d + (d === 1 ? " day" : " days"), { sub: t + (Number(c.sub.owed) ? " · " + money(c.sub.owed, cur()) + " owed" : ""), vc: col, at: `data-hv3co="${e(c.id)}"` }); });
    const months = [...Array(6)].map((_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1); return [d, cs.filter(c => { const x = new Date(c.created_at); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth(); }).length]; });
    const mx = Math.max(1, ...months.map(m => m[1]));
    const bars = months.map(([d, n], i) => `<div title="${e(d.toLocaleDateString("en-GB", { month: "long" }))}: ${n}" style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px;height:100%"><div style="width:100%;height:${Math.max(4, Math.round(n / mx * 150))}px;border-radius:6px;background:${i === 5 ? TF : "#A9C9F2"}"></div></div>`).join("");
    const X = H.x, xl = X === "busy" ? cs.slice().sort((a, b) => (b.orders30 || 0) - (a.orders30 || 0)).filter(c => c.orders30).slice(0, 8).map(c => row(c.name, (c.orders30 || 0).toLocaleString() + " orders", { at: `data-hv3co="${e(c.id)}"` }))
      : X === "new" ? cs.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 8).map(c => row(c.name, dmy(c.created_at), { sub: c.account_no || "", at: `data-hv3co="${e(c.id)}"` })) : null;
    $("#view").innerHTML = `<div class="v3" style="min-height:100vh;background:#F2F2F7;padding-bottom:30px">
<div style="display:flex;justify-content:flex-end;gap:8px;padding:12px 20px 0;min-height:44px"><span style="position:relative">${gbtn("more", "More", "data-v3om")}<span class="ddmenu v3omenu" hidden style="right:0"><a href="#" data-hv3x="busy">Busiest Businesses${X === "busy" ? " ✓" : ""}</a><a href="#" data-hv3x="new">Newest Businesses${X === "new" ? " ✓" : ""}</a></span></span></div>
<div style="padding:2px 20px 14px"><h1 style="margin:0;font-size:34px;line-height:41px;font-weight:700;letter-spacing:-.8px">${hr < 12 ? "Good Morning" : hr < 18 ? "Good Afternoon" : "Good Evening"}</h1><div style="font-size:15px;color:${L2}">Every restaurant on Skwyd Hub, their plans and what they owe</div></div>
<div style="padding:4px 20px 0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px">${kp}</div>
<div style="padding:18px 4px 0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0">${group(need, "Needs Attention")}<div style="margin:0 16px"><div style="padding:0 16px 7px;font-size:13px;color:${L2};text-transform:uppercase;letter-spacing:.2px">New This Month</div><div style="background:#fff;border-radius:12px;padding:16px;height:190px;box-sizing:border-box;display:flex;align-items:flex-end;gap:10px">${bars}</div></div></div>
${xl ? `<div style="padding:18px 4px 0">${group(xl, X === "busy" ? "Busiest (Orders, 30 Days)" : "Newest Businesses")}</div>` : ""}</div>`;
  };

  // ---------- Companies
  const coOld = viewCompanies;
  viewCompanies = function () {
    if (!on()) return coOld();
    const cs = DATA.companies || [], s = q.trim().toLowerCase();
    const tabs = [["all", "All"], ["active", "Active"], ["trial", "Trial"], ["grace", "Grace"], ["locked", "Locked"]];
    let rows = cs.filter(c => !s || [c.name, c.account_no, c.email, c.phone, c.contact_name].some(v => String(v || "").toLowerCase().includes(s))).filter(c => H.tab === "all" || (!c.sub?.complimentary && c.sub?.state === H.tab));
    rows.sort(H.sort === "owed" ? (a, b) => (+b.sub?.owed || 0) - (+a.sub?.owed || 0) : H.sort === "new" ? (a, b) => String(b.created_at).localeCompare(String(a.created_at)) : (a, b) => String(a.name).localeCompare(String(b.name)));
    if (!H.sel || !cs.some(c => c.id === H.sel)) H.sel = null;
    const list = rows.map(c => { const [t, col] = stOf(c), sb = c.sub || {}, o = c.id === H.sel;
      const d = sb.complimentary ? "Never billed" : sb.state === "locked" ? (Number(sb.owed) ? money(sb.owed, cur()) + " owed" : "Locked") : sb.state === "grace" ? "Pays in " + sb.daysLeft + (sb.daysLeft === 1 ? " day" : " days") : sb.daysLeft != null ? sb.daysLeft + (sb.daysLeft === 1 ? " day left" : " days left") : "";
      return `<a href="#" data-hv3co="${e(c.id)}" style="display:flex;gap:12px;align-items:center;padding:10px 12px;margin:0 8px;border-radius:10px;text-decoration:none;color:#000;background:${o ? "rgba(10,102,216,.1)" : "transparent"}"><span style="width:40px;height:40px;border-radius:50%;background:${col}1F;color:${col};display:grid;place-items:center;font-weight:700;font-size:14px;flex:none">${e(ini(c.name))}</span><span style="flex:1;min-width:0"><span style="display:block;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(c.name)}</span><span style="display:block;font-size:13px;color:${L2}">${e([c.account_no, d].filter(Boolean).join(" · "))}</span></span>${chip(t, col)}</a>`; }).join("")
      || `<div style="padding:40px 16px;text-align:center;color:${L2};font-size:15px">No companies match.</div>`;
    const seg = `<div role="group" style="display:flex;gap:2px;padding:2px;border-radius:9px;background:rgba(118,118,128,.12)">${tabs.map(([k, t]) => `<button type="button" data-hv3tab="${k}" style="flex:1;height:28px;border:0;border-radius:7px;font:inherit;font-size:13px;font-weight:${H.tab === k ? 600 : 500};color:#000;cursor:pointer;background:${H.tab === k ? "#fff" : "transparent"};box-shadow:${H.tab === k ? "0 3px 8px rgba(0,0,0,.12)" : "none"}">${t}</button>`).join("")}</div>`;
    const flt = `<span style="position:relative">${gbtn("filter", "Sort", "data-v3om")}<span class="ddmenu v3omenu" hidden style="right:0">${[["name", "Sort by Name"], ["new", "Newest First"], ["owed", "Most Owed"]].map(([k, t]) => `<a href="#" data-hv3sort="${k}">${t}${H.sort === k ? " ✓" : ""}</a>`).join("")}</span></span>`;
    const left = `<section style="width:400px;flex:none;border-right:1px solid ${SEP};background:#fff;overflow:auto;height:100vh;box-sizing:border-box">
<div style="padding:10px 16px 0"><div style="display:flex;justify-content:flex-end;gap:8px;min-height:44px;align-items:center">${flt}${gbtn("plus", "New business", "data-hv3new", true)}</div><h1 style="margin:0;padding:2px 0 8px;font-size:34px;line-height:41px;font-weight:700;letter-spacing:-.8px">Companies</h1></div>
<div style="padding:0 16px 10px"><label style="display:flex;align-items:center;gap:6px;height:36px;padding:0 10px;border-radius:10px;background:rgba(118,118,128,.12);color:${L2};font-size:17px">${svg("search", 17, L2)}<input type="search" id="q" value="${e(q)}" placeholder="Name or account number" aria-label="Search companies" autocomplete="off" style="border:0;background:transparent;outline:0;font:inherit;color:#000;flex:1;min-width:0;height:34px;padding:0"></label></div>
<div style="padding:0 16px 10px">${seg}</div>${list}<div style="padding:10px 20px 20px;font-size:13px;color:${L2}">${rows.length} of ${cs.length}</div></section>`;
    $("#view").innerHTML = `<div class="v3" style="display:flex;height:100vh">${left}<main style="flex:1;min-width:0;overflow:auto;height:100vh;background:#F2F2F7">${detail()}</main></div>`;
    const qi = $("#q"); qi.oninput = () => { q = qi.value; viewCompanies(); const n = $("#q"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  };
  function detail() {
    const c = H.sel && (DATA.companies || []).find(x => x.id === H.sel);
    if (!c) return `<div style="height:80vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:${L2};text-align:center">${svg("building", 44, "#C7C7CC", 1.6)}<b style="font-size:20px;color:#000;font-weight:600;margin-top:6px">No Business Selected</b><span style="font-size:15px">Choose a business to see its plan.</span></div>`;
    const s = c.subscription || {}, sb = c.sub || {}, [, col] = stOf(c), inv = (CO && CO.id === c.id ? INV : null);
    const yr = c.quote?.cycle === "yearly" || s.cycle === "yearly";
    const d1 = group([row("Plan", (sb.complimentary ? "Free" : STATE_LABEL[sb.state] || "No Plan") + " · " + (yr ? "Yearly" : "Monthly"), { at: "data-hv3edit" }), row("Price", sb.complimentary ? "—" : money(c.quote?.total, cur()) + (yr ? " / year" : " / month")), row("POS Devices", `${sb.posUsed ?? 0} of ${sb.complimentary ? "∞" : s.pos_devices ?? sb.posDevices ?? 0} used`, { at: "data-hv3edit" }), row(s.status === "trial" ? "Trial Ends" : "Next Invoice", dmy(s.status === "trial" ? s.trial_ends_at : s.paid_until))], "Subscription");
    const d2 = group([row("Contact", c.contact_name || "—"), row("Phone", c.phone || "—"), row("Category", [c.category, c.subcategory].filter(Boolean).join(" · ") || "—"), row("Account Number", c.account_no || "—")], "Business");
    const d3 = group(inv == null ? [`<div style="padding:12px 16px;color:${L2};font-size:15px">Loading…</div>`] : inv.slice(0, 5).map(i => row(i.number, money(i.total, i.currency), { sub: i.status === "paid" ? "Paid " + dmy(i.paid_at) : i.status === "void" ? "Void" : "Open · due " + dmy(i.due_at), vc: i.status === "paid" ? GREEN : i.status === "void" ? L2 : ORANGE, at: `data-hv3inv="${e(i.id)}"` })), "Invoices");
    const lk = !!s.locked;
    const d4 = group([row("Lock Back Office, POS & Web", "", { right: `<button type="button" role="switch" aria-checked="${lk}" data-hv3lock aria-label="Lock" style="width:51px;height:31px;border-radius:999px;border:0;padding:2px;cursor:pointer;background:${lk ? "#34C759" : "rgba(120,120,128,.16)"};display:flex;justify-content:${lk ? "flex-end" : "flex-start"}"><span style="width:27px;height:27px;border-radius:50%;background:#fff;box-shadow:0 3px 8px rgba(0,0,0,.15)"></span></button>` }), row("Extend Trial or Grace", "Choose days", { at: "data-hv3edit" })], "Access", "Locking keeps all their data. It opens again as soon as an invoice is paid.");
    return `<div style="display:flex;justify-content:flex-end;gap:8px;padding:10px 16px;align-items:center"><button type="button" data-hv3viewas style="height:40px;padding:0 18px;border-radius:999px;border:0;background:rgba(118,118,128,.12);color:${T};font:inherit;font-size:15px;font-weight:600;display:inline-flex;align-items:center;gap:7px;cursor:pointer">${svg("share", 18, T, 2.2)}Open Their Back Office</button><button type="button" data-hv3edit style="border:0;background:none;color:${T};font:inherit;font-size:17px;font-weight:600;cursor:pointer;padding:0 4px">Edit</button></div>
<div style="padding:0 20px 14px;display:flex;gap:14px;align-items:center"><span style="width:60px;height:60px;border-radius:50%;background:${col}1F;color:${col};display:grid;place-items:center;font-weight:700;font-size:20px;flex:none">${e(ini(c.name))}</span><div><div style="font-size:26px;font-weight:700;letter-spacing:-.5px">${e(c.name)}</div><div style="font-size:15px;color:${L2}">${(c.orders30 || c.orders || 0).toLocaleString()} orders · 30 days</div></div></div>
<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));padding:0 4px 30px"><div style="display:flex;flex-direction:column;gap:18px">${d1}${d4}</div><div style="display:flex;flex-direction:column;gap:18px">${d2}${d3}</div></div>`;
  }
  async function pick(id) { H.sel = id; CO = DATA.companies.find(c => c.id === id); INV = null; if (view === "companies") viewCompanies(); try { INV = await rpc("slick_pa_invoices", { p_company: id }); } catch (_) { INV = []; } if (view === "companies" && H.sel === id) viewCompanies(); }

  // after saving in the edit window, refresh the page behind it too
  const reloadOld = reload;
  reload = async function () { await reloadOld(); if (on() && view === "companies") viewCompanies(); };
  const renderOld = render;
  render = function () { renderOld(); side(); };

  document.addEventListener("click", async ev => {
    const t = ev.target;
    const om = t.closest("[data-v3om]"); if (om) { ev.preventDefault(); ev.stopPropagation(); const m = om.parentElement.querySelector(".v3omenu"); const was = m.hidden; document.querySelectorAll(".v3omenu").forEach(x => x.hidden = true); m.hidden = !was; return; } else document.querySelectorAll(".v3omenu").forEach(x => x.hidden = true);
    if (t.closest("[data-hv3out]")) { ev.preventDefault(); document.getElementById("out")?.click(); return; }
    const co = t.closest("[data-hv3co]"); if (co) { ev.preventDefault(); if (view !== "companies") { view = "companies"; render(); } pick(co.dataset.hv3co); return; }
    const tb = t.closest("[data-hv3tab]"); if (tb) { H.tab = tb.dataset.hv3tab; viewCompanies(); return; }
    const so = t.closest("[data-hv3sort]"); if (so) { ev.preventDefault(); H.sort = so.dataset.hv3sort; viewCompanies(); return; }
    const x = t.closest("[data-hv3x]"); if (x) { ev.preventDefault(); H.x = H.x === x.dataset.hv3x ? "" : x.dataset.hv3x; viewDashboard(); return; }
    if (t.closest("[data-hv3new]")) { newCompany(); return; }
    if (t.closest("[data-hv3viewas]")) { viewAs(H.sel); return; }
    if (t.closest("[data-hv3edit]")) { ev.preventDefault(); openCompany(H.sel); return; }
    const iv = t.closest("[data-hv3inv]"); if (iv) { ev.preventDefault(); showInvoice((INV || []).find(i => i.id === iv.dataset.hv3inv), CO); return; }
    const lk = t.closest("[data-hv3lock]"); if (lk) {
      const c = DATA.companies.find(c => c.id === H.sel); if (!c) return; const s = c.subscription || {}, to = !s.locked;
      if (to && !await ask(`Lock ${c.name}? Their back office, POS and web ordering stop until you unlock them or an invoice is paid. Their data is kept.`, "Lock")) return;
      const p = { status: s.status, cycle: s.cycle, posDevices: s.pos_devices ?? 0, warehouses: s.warehouses ?? 1, discountPct: s.discount_pct ?? 0, trialEndsAt: s.trial_ends_at || null, paidUntil: s.paid_until || null, graceDays: s.grace_days ?? null, modules: s.modules || [], locked: to, complimentary: !!s.complimentary, notes: s.notes || "",
        company: { name: c.name, contactName: c.contact_name || "", firstName: c.first_name || "", lastName: c.last_name || "", email: c.email || "", phone: c.phone || "", category: c.category || "", subcategory: c.subcategory || "", country: c.country || "", currency: c.currency || "" } };
      try { await rpc("slick_pa_update_subscription", { p_company: c.id, p }); await load(); toastOk(to ? "Locked" : "Unlocked"); pick(c.id); } catch (err) { toast(err.message); }
    }
  }, true);
  document.addEventListener("input", ev => { if (!ev.target.matches(".hv3sq")) return; const v = ev.target.value.toLowerCase(); document.querySelectorAll("aside.side [data-hv3nav]").forEach(a => a.style.display = !v || a.textContent.toLowerCase().includes(v) ? "flex" : "none"); });
  let w0 = on(); addEventListener("resize", () => { if (on() !== w0) { w0 = on(); if (DATA) render(); } });
  if (DATA) render();
})();
