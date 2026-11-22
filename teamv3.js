// Team app, drawn like the approved design file: large titles with round buttons, grouped white rows, iOS segmented controls.
// Same data and actions as before (clockPress, swapSheet, newReq, newChat, openChat, viewHrs …). No new motion.
(function () {
  const T = "#0066D6", L2 = "#6C6C70", SEP = "#E3E3E8";
  const svg = (d, s = 20, c = "currentColor", w = 2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = { cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', hrs: '<path d="M5 20V10M12 20V4M19 20v-7"/>', check: '<path d="m5 12 5 5L20 7"/>', kb: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 15h14"/>', plus: '<path d="M12 5v14M5 12h14"/>', chev: '<path d="M9 5l7 7-7 7"/>', l: '<path d="M15 5l-7 7 7 7"/>', r: '<path d="M9 5l7 7-7 7"/>', search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>' };
  const e = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rb = (n, l, id, tint) => `<button type="button" class="v3rb" id="${id}" aria-label="${e(l)}" style="color:${tint ? T : "#000"}">${svg(I[n])}</button>`;
  const head = (title, sub, btns) => `<div class="v3h">${btns || ""}</div><h1 class="v3t">${e(title)}</h1>${sub ? `<p class="v3s">${e(sub)}</p>` : ""}`;
  const tile = (n, c) => `<span class="v3ti" style="background:${c}">${svg(I[n], 17, "#fff", 2.2)}</span>`;
  const row = (o) => `<button type="button" class="v3r" ${o.id ? `id="${o.id}"` : ""} ${o.at || ""}>${o.icon || ""}<span class="v3rt"><b>${e(o.t)}</b>${o.sub ? `<small>${e(o.sub)}</small>` : ""}</span>${o.v ? `<span class="v3rv">${e(o.v)}</span>` : ""}${o.pill || ""}${o.chev === false ? "" : `<span class="v3rc">${svg(I.chev, 14, "#C4C4C7", 2.4)}</span>`}</button>`;
  const grp = (h, rows) => `${h ? `<div class="v3gh">${e(h)}</div>` : ""}<div class="v3g">${rows.join("")}</div>`;
  const seg = (items, cur, attr) => `<div class="v3seg">${items.map(([k, t]) => `<button type="button" ${attr}="${k}" class="${cur === k ? "on" : ""}">${t}</button>`).join("")}</div>`;
  const ampm = s => { const [h, m] = String(s || "").split(":").map(Number); if (isNaN(h)) return ""; return (h % 12 || 12) + ":" + String(m || 0).padStart(2, "0") + " " + (h < 12 ? "am" : "pm"); };
  const ini = n => String(n || "?").trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const css = `
html[data-ios=team] body.v3on .top{display:none!important}
html[data-ios=team] body.v3on #main{padding:0 16px 120px!important}
.v3h{display:flex;justify-content:flex-end;gap:8px;min-height:44px;align-items:center;padding-top:calc(8px + env(safe-area-inset-top))}
.v3rb{width:40px;height:40px;border-radius:999px;border:0;background:rgba(118,118,128,.12);display:grid;place-items:center;cursor:pointer;padding:0}
.v3av{width:40px;height:40px;border-radius:50%;border:0;background:${T};color:#fff;font:inherit;font-size:15px;font-weight:600;cursor:pointer;padding:0}
html body h1.v3t{font-size:34px!important;line-height:41px!important;font-weight:700!important;letter-spacing:-.8px!important;margin:2px 0 0!important;color:var(--ink,#000)}
.v3s{font-size:15px;color:${L2};margin:0 0 12px}
.v3gh{padding:18px 16px 7px;font-size:13px;color:${L2};text-transform:uppercase;letter-spacing:.2px}
.v3g{background:#fff;border-radius:12px;overflow:hidden}
.v3r{display:flex;align-items:center;gap:12px;width:100%;min-height:44px;padding:8px 16px;border:0;background:#fff;font:inherit;color:#000;text-align:left;cursor:pointer;position:relative}
.v3r + .v3r::before{content:"";position:absolute;left:16px;right:0;top:0;height:1px;background:${SEP}}
.v3g:has(.v3ti) .v3r + .v3r::before{left:58px}
.v3rt{flex:1;min-width:0}.v3rt b{display:block;font-size:17px;font-weight:400}.v3rt small{display:block;font-size:13px;color:${L2};margin-top:1px}
.v3rv{font-size:17px;color:${L2};white-space:nowrap}
.v3rc{display:grid;place-items:center}
.v3ti{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;flex:none}
.v3pill{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap}
.v3seg{display:flex;gap:2px;padding:2px;border-radius:9px;background:rgba(118,118,128,.12);margin:0 0 12px}
.v3seg button{flex:1;height:30px;border:0;border-radius:7px;background:transparent;font:inherit;font-size:13px;font-weight:500;color:#000;cursor:pointer}
.v3seg button.on{background:#fff;font-weight:600;box-shadow:0 3px 8px rgba(0,0,0,.12)}
.v3card{background:#fff;border-radius:16px;padding:22px 16px 16px;text-align:center}
.v3card .now{font-size:56px;font-weight:700;letter-spacing:-1.5px;line-height:64px}
.v3card .date{font-size:15px;color:${L2};margin:2px 0 16px}
:is(html,#_a#_b#_c) body .v3card button.cbtn{width:100%;height:56px;border-radius:999px;border:0;font:inherit;font-size:20px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;background:#248A3D!important;color:#fff!important}
:is(html,#_a#_b#_c) body .v3card button.cbtn.outb{background:#D70015!important;background:#D70015}
.v3card .cbtn svg{width:22px;height:22px}
.v3card .loc{font-size:13px;color:${L2};margin-top:12px}
.v3card .st{display:inline-flex;align-items:center;gap:6px;margin-top:12px;font-size:13px;font-weight:600;color:#248A3D}
.v3bal{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 14px}
.v3bal > div{background:#fff;border-radius:14px;padding:10px 12px;text-align:center}
.v3bal b{display:block;font-size:26px;font-weight:700}
.v3bal small{font-size:13px;color:${L2}}
.v3srch{display:flex;align-items:center;gap:6px;height:36px;padding:0 10px;border-radius:10px;background:rgba(118,118,128,.12);color:${L2};margin:0 0 12px}
:is(html,#_a#_b#_c) body .v3srch input{box-shadow:none!important;border-radius:0!important;background:transparent!important;flex:1;border:0;background:transparent;outline:0;font:inherit;font-size:17px;color:#000;min-width:0;height:34px;padding:0}
.v3chav{width:52px;height:52px;border-radius:50%;color:#fff;display:grid;place-items:center;font-size:17px;font-weight:600;flex:none}
.v3chl{margin:0 -16px;background:#fff}
.v3chl .v3r{padding:10px 16px;min-height:72px}
.v3chl .v3r + .v3r::before{left:84px}
.v3chl .v3rt b{font-weight:600}
.v3chl .v3rt small{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.v3cht{display:flex;flex-direction:column;align-items:flex-end;gap:4px;font-size:15px;color:${L2};align-self:flex-start;padding-top:2px}
.v3ub{min-width:20px;height:20px;border-radius:10px;background:${T};color:#fff;font-size:12px;font-weight:600;display:grid;place-items:center;padding:0 6px}
.v3ck{width:24px;height:24px;border-radius:50%;border:2px solid #C4C4C7;display:grid;place-items:center;flex:none;box-sizing:border-box}
.v3ck.on{background:#0A66D8;border-color:#0A66D8}
.v3tk{align-items:flex-start!important;padding-top:11px!important;padding-bottom:11px!important}
.v3g:has(.v3ck) .v3r + .v3r::before{left:52px}
.v3segs{overflow-x:auto;scrollbar-width:none}.v3segs button{flex:none;padding:0 14px;white-space:nowrap}
.v3back{display:inline-flex;align-items:center;gap:2px;border:0;background:none;color:#0066D6;font:inherit;font-size:17px;padding:0;cursor:pointer;min-height:44px}
@keyframes v3sp{to{transform:rotate(360deg)}}.v3spin{display:inline-block;width:22px;height:22px;border-radius:50%;border:2.5px solid rgba(60,60,67,.18);border-top-color:#6C6C70;animation:v3sp .8s linear infinite}
.v3empty{padding:24px 16px;text-align:center;color:${L2};font-size:15px}
html[data-theme=dark] .v3g,html[data-theme=dark] .v3r,html[data-theme=dark] .v3card,html[data-theme=dark] .v3bal > div,html[data-theme=dark] .v3chl{background:#1C1C1E}
html[data-theme=dark] .v3r,html[data-theme=dark] h1.v3t,html[data-theme=dark] .v3seg button{color:#fff}
html[data-theme=dark] .v3seg button.on{background:#636366}
`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const V = window.TEAMV3 = {}; let tick = 0;
  const ON = () => !document.documentElement.hasAttribute("data-v3off");
  const mark = () => document.body.classList.toggle("v3on", ON());

  // ---------- Today
  V.clock = async function () { with (window.TEAMAPI) {
    mark(); clearClk(); clearInterval(tick);
    const o = openNow(), br = o ? (S.me.branches.find(b => b.id === o.branchId)?.name || "") : "";
    const hr = new Date().getHours(), hello = (hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening") + ", " + String(S.me.name || "").trim().split(/\s+/)[0];
    const paint = (next, hours, tasks, kb) => {
      const today = ymd(new Date()), tmr = ymd(addD(new Date(), 1));
      const when = next ? (next.day === today ? "Today" : next.day === tmr ? "Tomorrow" : new Date(next.day + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long" }) + " " + dmy(next.day)) + " · " + ampm(next.start) + " – " + ampm(next.end) : "";
      const rows = [row({ icon: tile("cal", "#0A66D8"), t: next ? [next.branch, next.jobTitle].filter(Boolean).join(" · ") || "Shift" : "No shift coming up", sub: when, id: "v3next" }), row({ icon: tile("hrs", "#8944AB"), t: "My Hours", v: hours != null ? hours.toFixed(2) + " this week" : "", id: "myh" })];
      const fy = [...(tasks || []).filter(t => t.status !== "done").slice(0, 3).map(t => row({ icon: tile("check", "#C93400"), t: t.title, sub: t.dueDay ? "Due " + dmy(t.dueDay) : "", at: `data-v3go="tasks"` })),
        ...(kb || []).filter(a => a.ack && !a.readAt).slice(0, 2).map(a => row({ icon: tile("kb", "#0071A4"), t: "Read: " + a.title, at: `data-v3kb="${e(a.id)}"` }))];
      main().innerHTML = `${head("Today", hello, `<button type="button" class="v3av" id="v3me" aria-label="Your account">${e(ini(S.me.name))}</button>`)}
<div class="v3card"><div class="now" id="cnow">${hm(new Date())}</div><div class="date">${new Date().toLocaleDateString("en-GB", { weekday: "long" })} · ${dmy(new Date())}</div>
<button class="cbtn ${o ? "outb" : ""}" id="cb">${svg(I.clock, 22, "#fff", 2.2)}${o ? "Clock Out" : "Clock In"}</button>
${o ? `<div class="st"><i style="width:8px;height:8px;border-radius:50%;background:#248A3D;display:inline-block"></i>Clocked in since ${hm(o.at)}${br ? " · " + e(br) : ""}</div>` : ""}
<div class="loc" id="cq" style="color:var(--warn);font-weight:600" hidden></div><div class="loc" id="cloc">${svg(I.pin, 14, L2, 2)} We check you're at the store when you press it</div></div>
${grp("Next Shift", rows)}${fy.length ? grp("For You", fy) : ""}`;
      $("#cb").onclick = clockPress; paintQ();
      $("#myh").onclick = () => { document.querySelectorAll("[data-tab]").forEach(b => b.classList.remove("on")); V.hrs(); };
      $("#v3next").onclick = () => go("sched");
      $("#v3me").onclick = () => $("#so")?.click();
      document.querySelectorAll("[data-v3go]").forEach(b => b.onclick = () => go(b.dataset.v3go));
      document.querySelectorAll("[data-v3kb]").forEach(b => b.onclick = () => { go("kb"); setTimeout(() => document.querySelector(`[data-kb="${b.dataset.v3kb}"]`)?.click(), 300); });
    };
    paint(null, null, S.tasks, S.kb);
    tick = setInterval(() => { const n = $("#cnow"); if (n) n.textContent = hm(new Date()); else clearInterval(tick); }, 10000);
    let next = null, hours = null;
    try { const today = new Date(); const l = await rpc("skwyd_team_shifts", { p_from: ymd(today), p_to: ymd(addD(today, 14)) }); next = l.find(x => new Date(x.day + "T" + t5(x.end) + ":00") > new Date() || x.day > ymd(today)) || null; } catch (_) {}
    try { const a = mon(new Date()), z = addD(a, 6); const l = await rpc("skwyd_team_timesheet", { p_from: ymd(a), p_to: ymd(z) }); const on = openNow(); hours = l.reduce((s, x) => s + Math.max(0, ((x.out ? +new Date(x.out) : Date.now()) - +new Date(x.in)) / 3600000), 0) + (on ? Math.max(0, (Date.now() - +new Date(on.at)) / 3600000) : 0); } catch (_) {}
    try { if (navigator.onLine) S.tasks = await rpc("skwyd_team_tasks"); } catch (_) {}
    try { await kbLoad(); } catch (_) {}
    if (S.tab === "clock") paint(next, hours, S.tasks, S.kb);
  } };


  // ---------- Tasks: like Reminders, a round check on the left
  const chk = done => `<span class="v3ck${done ? " on" : ""}">${done ? svg(I.check, 14, "#fff", 3) : ""}</span>`;
  V.tasks = async function () { with (window.TEAMAPI) {
    mark();
    const paint = () => { const l = S.tasks || [], open = l.filter(t => t.status !== "done"), done = l.filter(t => t.status === "done"), today = ymd(new Date());
      const r = t => { const d = t.status === "done", late = !d && t.dueDay && String(t.dueDay).slice(0, 10) < today;
        return `<button type="button" class="v3r v3tk" data-tk="${e(t.id)}" aria-label="${d ? "Mark not done" : "Mark done"}: ${e(t.title)}">${chk(d)}<span class="v3rt"><b style="${d ? "text-decoration:line-through;color:" + L2 : ""}">${e(t.title)}</b>${t.notes ? `<small>${e(t.notes)}</small>` : ""}<small style="${late ? "color:#D70015;font-weight:600" : ""}">${d ? "Done " + dmy(t.doneAt) : t.dueDay ? (late ? "Late · due " : "Due ") + dmy(t.dueDay) : ""}</small></span></button>`; };
      main().innerHTML = `${head("Tasks", S.tasks ? (open.length ? open.length + " open" : "All done") : "")}${S.tasks == null ? `<div class="v3g"><div class="v3empty"><span class="v3spin" role="progressbar" aria-label="Loading"></span></div></div>` : open.length ? grp("", open.map(r)) : `<div class="v3g"><div class="v3empty">No open tasks. Nice work!</div></div>`}${done.length ? grp("Done this week", done.map(r)) : ""}`;
      document.querySelectorAll("[data-tk]").forEach(b => b.onclick = async () => { const t = S.tasks.find(x => x.id === b.dataset.tk); if (!t) return; if (!navigator.onLine) return toast("No internet connection.", "bad");
        const d = t.status !== "done"; b.disabled = true; try { const r = await rpc("skwyd_team_task_done", { p_task: t.id, p_done: d }); if (r?.error) { toast(r.error, "bad"); b.disabled = false; return; }
          S.tasks = await rpc("skwyd_team_tasks"); if (d) toast("Task done", "ok"); if (S.tab === "tasks") paint(); } catch (_) { toast("Couldn't save. Try again.", "bad"); b.disabled = false; } }); };
    paint(); if (navigator.onLine) { try { S.tasks = await rpc("skwyd_team_tasks"); } catch (_) { S.tasks = S.tasks || []; } if (S.tab === "tasks") paint(); }
  } };
  // ---------- Guides: search, categories as a segmented strip, grouped rows
  V.kb = async function () { with (window.TEAMAPI) {
    mark(); if (!S.kb) S.kb = LS.get("skwyd_team_kb", null);
    const paint = () => { const l = S.kb || [], q = KBQ.q.trim().toLowerCase(), cats = [...new Set(l.map(a => a.category).filter(Boolean))];
      const f = l.filter(a => (!KBQ.cat || a.category === KBQ.cat) && (!q || (a.title + " " + (a.body || "")).toLowerCase().includes(q))), todo = l.filter(a => a.ack && !a.readAt);
      const rows = f.map(a => row({ icon: tile("kb", a.ack && !a.readAt ? "#C93400" : "#0071A4"), t: a.title, sub: (a.category || "") + (a.pinned ? " · Pinned" : ""), at: `data-kb="${e(a.id)}"`, pill: a.ack && !a.readAt ? `<span class="v3pill" style="background:rgba(201,52,0,.12);color:#C93400">To read</span>` : "" }));
      main().innerHTML = `${head("Guides", todo.length ? todo.length + " to read" : "")}<label class="v3srch">${svg(I.search, 17, L2)}<input id="kbq" type="search" placeholder="Search" value="${e(KBQ.q)}"></label>
${cats.length > 1 ? `<div class="v3seg v3segs">${[["", "All"], ...cats.map(c => [c, c])].map(([k, t]) => `<button type="button" data-kbc="${e(k)}" class="${KBQ.cat === k ? "on" : ""}">${e(t)}</button>`).join("")}</div>` : ""}
${S.kb == null ? `<div class="v3g"><div class="v3empty"><span class="v3spin" role="progressbar" aria-label="Loading"></span></div></div>` : rows.length ? grp("", rows) : `<div class="v3g"><div class="v3empty">${l.length ? "Nothing matches." : "No guides yet."}</div></div>`}`;
      $("#kbq").oninput = ev => { KBQ.q = ev.target.value; const p = ev.target.selectionStart; paint(); const i = $("#kbq"); i.focus(); i.setSelectionRange(p, p); };
      document.querySelectorAll("[data-kbc]").forEach(b => b.onclick = () => { KBQ.cat = b.dataset.kbc; paint(); });
      document.querySelectorAll("[data-kb]").forEach(b => b.onclick = () => openKb(S.kb.find(a => a.id === b.dataset.kb))); };
    paint(); if (navigator.onLine) { try { await kbLoad(); } catch (_) {} if (S.tab === "kb" && !$("#kbart")) paint(); }
  } };
  // ---------- My Hours: week switcher, three tiles, one row per shift worked
  V.hrs = async function () { with (window.TEAMAPI) {
    mark(); S.tab = "hrs";
    const a = S.hwk, z = addD(a, 6);
    const draw = (tiles, body) => { main().innerHTML = `<div class="v3h" style="justify-content:space-between"><button type="button" class="v3back" id="v3hb">${svg(I.l, 22, T, 2.4)}Today</button><span style="display:flex;gap:8px">${rb("l", "Previous week", "hp")}${rb("r", "Next week", "hn")}</span></div><h1 class="v3t">My Hours</h1><p class="v3s">${dmy(a)} – ${dmy(z)}</p>${tiles}<div class="v3g">${body}</div>`;
      $("#hp").onclick = () => { S.hwk = addD(S.hwk, -7); V.hrs(); }; $("#hn").onclick = () => { S.hwk = addD(S.hwk, 7); V.hrs(); }; $("#v3hb").onclick = () => go("clock"); };
    draw("", `<div class="v3empty"><span class="v3spin" role="progressbar" aria-label="Loading"></span></div>`);
    let l = []; try { l = await rpc("skwyd_team_timesheet", { p_from: ymd(a), p_to: ymd(z) }); } catch (_) { draw("", `<div class="v3empty">Couldn't load your hours.</div>`); return; }
    const on = openNow(), o = on && new Date(on.at) >= a && new Date(on.at) <= addD(z, 1) ? { in: on.at, out: null, branch: S.me.branches.find(b => b.id === on.branchId)?.name, late: on.late } : null;
    const all = [...(o ? [o] : []), ...l], hrs = x => Math.max(0, ((x.out ? +new Date(x.out) : Date.now()) - +new Date(x.in)) / 3600000), tot = all.reduce((s, x) => s + hrs(x), 0);
    const days = {}; all.forEach(x => { const d = ymd(new Date(x.in)); days[d] = (days[d] || 0) + hrs(x); }); const ot = Object.values(days).reduce((s, v) => s + Math.max(0, v - 8), 0);
    draw(`<div class="v3bal"><div><b>${tot.toFixed(2)}</b><small>Hours</small></div><div><b>${Object.keys(days).length}</b><small>Days</small></div><div><b style="${ot ? "color:#C93400" : ""}">${ot.toFixed(2)}</b><small>Overtime</small></div></div>`,
      all.length ? all.map(x => row({ t: new Date(x.in).toLocaleDateString("en-GB", { weekday: "short" }) + " " + dmy(x.in), sub: ampm(hm(x.in)) + " – " + (x.out ? ampm(hm(x.out)) : "now") + (x.branch ? " · " + x.branch : ""), v: hrs(x).toFixed(2) + " h", pill: x.late ? `<span class="v3pill" style="background:rgba(201,52,0,.12);color:#C93400">Late ${+x.late}m</span>` : "", chev: false })).join("") : `<div class="v3empty">No hours this week</div>`);
  } };

  // ---------- Schedule
  V.sched = async function () { with (window.TEAMAPI) {
    mark();
    const a = S.week, z = addD(a, 6), today = ymd(new Date()), mine = true;
    const draw = (body) => { main().innerHTML = `${head("Schedule", dmy(a) + " – " + dmy(z), rb("l", "Previous week", "wp") + rb("r", "Next week", "wn"))}<div class="v3g" id="sc">${body}</div>`;
      $("#wp").onclick = () => { S.week = addD(S.week, -7); V.sched(); }; $("#wn").onclick = () => { S.week = addD(S.week, 7); V.sched(); };
      document.querySelectorAll("[data-v3sv]").forEach(b => b.onclick = () => { S.v3team = b.dataset.v3sv === "team"; V.sched(); }); };
    draw(`<div class="v3empty"><span class="v3spin" role="progressbar" aria-label="Loading"></span></div>`);
    try { S.shifts = await rpc("skwyd_team_shifts", { p_from: ymd(a), p_to: ymd(z), ...(mine ? {} : { p_team: true }) }); } catch (err) { if (!mine) { S.v3team = false; draw(`<div class="v3empty">Your store's full schedule isn't available here yet.</div>`); return; } draw(`<div class="v3empty">Couldn't load your schedule.</div>`); return; }
    try { if (!S.reqs.length) S.reqs = await rpc("skwyd_team_requests"); } catch (_) {}
    const pend = new Set(S.reqs.filter(r => r.kind === "swap" && r.status === "pending").map(r => r.shiftId));
    draw([...Array(7)].map((_, i) => { const d = addD(a, i), k = ymd(d), l = S.shifts.filter(x => x.day === k), lbl = d.toLocaleDateString("en-GB", { weekday: "short" }) + " " + d.getDate();
      if (!l.length) return row({ t: lbl, v: "Off", chev: false });
      return l.map((x, j) => row({ t: j ? "" : lbl, sub: ampm(x.start) + " – " + ampm(x.end) + (x.branch ? " · " + x.branch : "") + (x.jobTitle ? " · " + x.jobTitle : "") + (mine ? "" : x.name ? " · " + x.name : ""), at: k >= today && mine && !pend.has(x.id) ? `data-swap="${e(x.id)}"` : "",
        pill: k < today ? "" : pend.has(x.id) ? `<span class="v3pill" style="background:rgba(201,52,0,.12);color:#C93400">Swap pending</span>` : mine ? `<span class="v3pill" style="background:rgba(10,102,216,.12);color:${T}">Swap</span>` : "", chev: k >= today && mine && !pend.has(x.id) })).join(""); }).join(""));
    document.querySelectorAll("[data-swap]").forEach(b => b.onclick = () => swapSheet(S.shifts.find(x => x.id === b.dataset.swap)));
  } };

  // ---------- Requests
  V.reqs = async function () { with (window.TEAMAPI) {
    mark();
    const left = S.me.leaveDays != null ? Math.max(0, +S.me.leaveDays - +S.me.leaveUsed) : null, f2 = v => v == null ? "—" : (+v).toFixed(2);
    const draw = (body) => { main().innerHTML = `${head("Requests", "", rb("plus", "New request", "nr", true))}<div class="v3bal"><div><b>${f2(left)}</b><small>Days left</small></div><div><b>${f2(+S.me.leaveUsed || 0)}</b><small>Used</small></div><div><b>${f2(S.me.leaveDays)}</b><small>Per year</small></div></div>${seg([["all", "All"], ["pending", "Pending"], ["done", "Answered"]], S.rqTab, "data-rt")}<div class="v3g" id="rl">${body}</div>`;
      $("#nr").onclick = newReq; document.querySelectorAll("[data-rt]").forEach(b => b.onclick = () => { S.rqTab = b.dataset.rt; V.reqs(); }); };
    draw(`<div class="v3empty"><span class="v3spin" role="progressbar" aria-label="Loading"></span></div>`);
    try { S.reqs = await rpc("skwyd_team_requests"); } catch (err) { draw(`<div class="v3empty">Couldn't load your requests.</div>`); return; }
    const PC = { pending: ["#C93400", "rgba(201,52,0,.12)"], approved: ["#248A3D", "rgba(36,138,61,.12)"], declined: ["#D70015", "rgba(215,0,21,.1)"] };
    const l = S.reqs.filter(r => S.rqTab === "all" || (S.rqTab === "pending" ? r.status === "pending" : r.status !== "pending"));
    draw(l.length ? l.map(r => { const [c, bg] = PC[r.status] || [L2, "rgba(118,118,128,.12)"];
      return row({ t: r.kind === "leave" ? (LEAVE[r.leaveType] || "Time Off") : r.kind === "swap" ? "Shift Swap" + (r.swapWith ? " with " + r.swapWith.split(" ")[0] : "") : "Request",
        sub: (r.kind === "swap" ? dmy(r.from) : r.from ? dmy(r.from) + (r.to && r.to !== r.from ? " – " + dmy(r.to) : "") : "Sent " + dmy(r.createdAt)) + (r.decisionNote ? " · Manager: " + r.decisionNote : r.note ? " · " + r.note : ""),
        pill: `<span class="v3pill" style="background:${bg};color:${c}">${e(ST[r.status] || r.status)}</span>`, chev: false }); }).join("") : `<div class="v3empty">No requests</div>`);
  } };

  // ---------- Chat
  V.chat = async function () { with (window.TEAMAPI) {
    mark();
    const can = S.me.canChat || S.me.canGroup || S.me.canChannel;
    const draw = (l) => { const q = (S.v3cq || "").toLowerCase(), f = (l || []).filter(g => !q || String(g.name).toLowerCase().includes(q));
      main().innerHTML = `${head("Chat", "", can ? rb("plus", "New chat", "chn", true) : "")}<label class="v3srch">${svg(I.search, 17, L2)}<input id="v3cq" type="search" placeholder="Search" value="${e(S.v3cq || "")}"></label>
<div class="v3chl">${l == null ? `<div class="v3empty"><span class="v3spin" role="progressbar" aria-label="Loading"></span></div>` : f.length ? f.map(g => { const u = unread(g);
        return `<button type="button" class="v3r" data-chat="${e(g.id)}"><span class="v3chav" style="background:${avc(g.name)}">${e(inits(g.name))}</span><span class="v3rt"><b>${e(g.name)}</b><small>${e(g.last ? (g.last.mine ? "You: " : (g.last.by ? g.last.by.split(" ")[0] + ": " : "")) + g.last.body : g.direct ? "Private chat" : (g.channel ? "Channel · " : "") + g.members + " members")}</small></span><span class="v3cht">${g.last ? e(chT(g.last.at)) : ""}${u ? `<span class="v3ub">●</span>` : ""}</span></button>`; }).join("") : `<div class="v3empty">${l.length ? "Nothing matches." : "No chats yet. Your manager adds you to group chats."}</div>`}</div>`;
      const nb = $("#chn"); if (nb) nb.onclick = newChat;
      const qi = $("#v3cq"); qi.oninput = () => { S.v3cq = qi.value; const p = qi.selectionStart; draw(l); const n = $("#v3cq"); n.focus(); n.setSelectionRange(p, p); };
      document.querySelectorAll("[data-chat]").forEach(b => b.onclick = () => openChat(l.find(g => g.id === b.dataset.chat))); };
    draw(null); const l = await chatDot(); if (S.tab === "chat") draw(l);
  } };
  // the header is per screen now; the old top bar stays hidden and keeps Sign Out (the avatar on Today opens it)
})();
