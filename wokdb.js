/* skwyd hub ERP — connects the back office and POS to Supabase.
   Gives the pages the same small database API they used before (collections, snapshots, set/update/delete),
   and shows a staff login before anything loads. */
(function(){
  const SUPABASE_URL = "https://akrezmxgtorkuwxxctyk.supabase.co";
  const SUPABASE_KEY = "sb_publishable_tL62keD2HdovsMpI8XAkWg_TPdjaUVh";   // public key, safe in the browser
  // a POS tablet activated with its code carries a secret device key instead of any login
  const lsRaw = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
  const DEVKEY = window.SKWYD_OFFLINE ? lsRaw("skwyd_devkey") : null, DEVTOPIC = DEVKEY ? lsRaw("skwyd_devtopic") : null;
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, DEVKEY
    ? { auth: { persistSession: false, autoRefreshToken: false, storageKey: "skwyd-device-noauth" }, global: { headers: { "x-skwyd-device": DEVKEY } } }
    : { auth: { persistSession: true, autoRefreshToken: true } });

  // app collection -> table, and which columns each table accepts
  const TABLE = { inv_items: "inventory_items", zones: "delivery_zones", inv_categories: "inventory_categories", inv_docs: "inventory_docs", users: "staff_users", work_shifts: "staff_shifts" };
  const COLS = {
    staff_shifts: "id employee_id branch_id day start_time end_time break_min job_title note published deleted created_at",
    brands: "id name name_ar active deleted created_at slug",
    branches: "id brand_id name code address city phone open_time close_time active call_center production created_at name_ar tax_number lat lng settings",
    categories: "id brand_id name name_ar reference sort deleted created_at inactive_branch_ids channel product_ids image_url",
    products: "id brand_id name name_ar sku category_id price tax_group description image_url channels branch_ids active deleted created_at ingredients pricing_method costing_method selling_method cost barcode prep_time calories custom_prices inactive_branch_ids out_of_stock_branch_ids modifiers sort variant_set_id variants variant_recipes nutrition allergens description_ar",
    inventory_items: "id name sku category kind storage_unit ingredient_unit factor cost min_level par_level barcode deleted created_at ingredients max_level name_ar costing_method menu_item",
    delivery_zones: "id name branch_id fee min_order eta polygon active deleted created_at",
    devices: "id name type branch_id code activated_at last_seen deleted created_at reference settings",
    shifts: "id device_id branch_id cashier opening_cash opened_at closed_at orders sales expected_cash counted_cash difference",
    order_sources: "id name name_ar reference sort active deleted created_at",
    inventory_categories: "id name name_ar reference deleted created_at",
    warehouses: "id name reference address deleted created_at",
    inventory_docs: "id kind ref name location_id reason direction status business_date items notes created_by submitted_by submitted_at deleted created_at consumed supplier_id dest_id linked_id received_at received_by delivery_at additional_cost",
    suppliers: "id name code contact_name phone email address notes deleted created_at",
    modifiers: "id name name_ar reference sort deleted created_at",
    taxes: "id name name_ar rate inclusive order_types deleted created_at",
    tax_groups: "id name name_ar reference tax_ids deleted created_at",
    payment_methods: "id name name_ar type code open_drawer active sort deleted created_at",
    roles: "id name name_ar description permissions deleted created_at",
    day_closes: "id branch_id business_date closed_at closed_by device_id orders sales created_at",
    staff_users: "id name email phone employee_no job_title hire_date birth_date employment_type pay_type pay_rate emergency_name emergency_phone notes role role_id role_ids language display_localized branch_ids pin_hash active user_id deleted created_at",
    modifier_options: "id modifier_id name name_ar sku price tax_group costing_method cost calories ingredients custom_prices inactive_branch_ids out_of_stock_branch_ids sort active deleted created_at nutrition allergens",
    orders: "id brand_id no channel source type status branch_id device_id shift_id zone_id customer_name phone address lat lng table_no notes items subtotal discount_pct discount delivery_fee tax invoice_no total payment agent handled_by accepted_at done_at void_reason voided_at voided_by created_at charges charges_total receipt_notes guests voided_items returned_items refund_total stock_action return_reason returned_at returned_by approved_by refund_of return_no discount_type updated_at closed_at scheduled_at edit_request",
    charges: "id name name_ar type value order_types auto tax_group brand_ids branch_ids active sort deleted created_at",
    variant_sets: "id name name_ar options deleted created_at",
  };
  Object.keys(COLS).forEach(k => COLS[k] = new Set(COLS[k].split(" ")));
  const RENAME = { open: "open_time", close: "close_time", table: "table_no" };
  const BACK = { open_time: "open", close_time: "close", table_no: "table" };
  const snake = k => RENAME[k] || k.replace(/[A-Z]/g, c => "_" + c.toLowerCase());
  const camel = k => BACK[k] || k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  const tableOf = c => TABLE[c] || c;

  function toRow(col, id, data){
    const t = tableOf(col);
    if(t === "settings"){ const d = { ...data }; delete d.updatedAt; delete d.createdAt; return { id, data: d }; }
    const row = id ? { id } : {};
    for(const [k, v] of Object.entries(data)){
      const s = snake(k);
      if(COLS[t] && COLS[t].has(s) && s !== "id") row[s] = (v === "" && /_id$/.test(s)) ? null : v;
    }
    if(t === "orders" && row.no != null) row.no = +row.no;
    return row;
  }
  function fromRow(col, r){
    if(tableOf(col) === "settings") return { ...(r.data || {}), updatedAt: r.updated_at };
    const o = {};
    for(const [k, v] of Object.entries(r)) if(k !== "id") o[camel(k)] = v;
    if(o.no != null) o.no = String(o.no);
    return o;
  }

  /* ---------- offline layer (POS only: set window.SKWYD_OFFLINE = true before loading this file) ----------
     Every collection is cached on the device. Writes go to an outbox first, show up on screen right away,
     and are sent to the server in order as soon as there is a connection. */
  const OFF = !!window.SKWYD_OFFLINE;
  const ls = { get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
               set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){ console.warn("storage full", e); } } };
  const isNet = e => !navigator.onLine || !e || e.name === "AuthRetryableFetchError" || e.name === "AbortError" || e.status === 0 ||
    /failed to fetch|network|load failed|timeout|abort|offline/i.test(String(e.message || e)) || (e.code === "" && !e.hint);
  let outbox = OFF ? ls.get("skwyd_outbox", []) : [];
  let failed = OFF ? ls.get("skwyd_failed", []) : [];
  let online = navigator.onLine, syncing = false, lastSync = ls.get("skwyd_last_sync", null), needsLogin = false;
  const saveBox = () => { ls.set("skwyd_outbox", outbox); ls.set("skwyd_failed", failed); };
  function status(){
    const st = { online, syncing, pending: outbox.length, failed: failed.length, lastSync, needsLogin };
    window.dispatchEvent(new CustomEvent("skwyd-sync", { detail: st })); return st;
  }
  function applyOp(rows, op){
    const i = rows.findIndex(r => r.id === op.id);
    if(op.op === "set"){ const r = { ...op.data, id: op.id }; i < 0 ? rows.unshift(r) : rows[i] = r; }
    else if(op.op === "update" && i >= 0) rows[i] = { ...rows[i], ...op.data, id: op.id };
    else if(op.op === "delete" && i >= 0) rows.splice(i, 1);
    return rows;
  }
  const cacheKey = col => "skwyd_c_" + col;
  const local = {};               // col -> rows currently shown (app format)
  function withPending(col, rows){ outbox.filter(o => o.col === col).forEach(o => applyOp(rows, o)); return rows; }

  const listeners = {};          // col -> [cb]
  const timers = {};
  function emit(col, rows, fromCache){
    const snap = { docs: rows.map(r => { const { id, ...d } = r; return { id, data: () => ({ ...d }) }; }), metadata:{ fromCache: !!fromCache, hasPendingWrites: outbox.some(o => o.col === col) } };
    (listeners[col]||[]).forEach(l => l.next(snap));
  }
  async function fetchAll(col){
    const t = tableOf(col);
    let q = sb.from(t).select("*");
    if(t === "orders") q = q.gte("created_at", new Date(Date.now() - 3*86400000).toISOString()).order("created_at", { ascending:false }).limit(1000);
    else if(t === "staff_shifts") q = q.gte("day", new Date(Date.now() - 120*86400000).toISOString().slice(0,10)).limit(5000);
    else if(t === "shifts") q = q.gte("opened_at", new Date(Date.now() - 7*86400000).toISOString()).limit(1000);
    else q = q.limit(5000);
    if(OFF && window.AbortSignal && AbortSignal.timeout) q = q.abortSignal(AbortSignal.timeout(15000));
    const { data, error } = await q;
    if(error) throw error;
    return data.map(r => ({ ...fromRow(col, r), id: r.id }));
  }
  function refresh(col){
    clearTimeout(timers[col]);
    timers[col] = setTimeout(async () => {
      try{
        const rows = await fetchAll(col);
        if(DEVKEY && !rows.length && (col === "devices" || col === "branches")){   // nothing visible: was this register deactivated?
          const r = await sb.rpc("skwyd_device_ok"); if(!r.error && r.data === false){ try{ ["skwyd_devkey","skwyd_devtopic","skwyd_staff","wokDevice"].forEach(k => localStorage.removeItem(k)); }catch(_){} location.reload(); return; } }
        if(OFF){ ls.set(cacheKey(col), rows); if(!online){ online = true; status(); } }
        local[col] = OFF ? withPending(col, rows) : rows;
        emit(col, local[col], false);
      }catch(e){
        if(OFF && isNet(e)){ if(online){ online = false; status(); } return; }   // keep showing the cached copy
        console.error("load", col, e); (listeners[col]||[]).forEach(l => l.error && l.error({ code:"unavailable", message:e.message }));
      }
    }, 150);
  }
  const channels = {}, rtOk = {};
  // live updates: every change in the database reaches every open screen; a dropped connection reconnects by itself
  // device key: one secret "bell" channel; each ring names the table that changed
  let bell = null;
  function liveBell(){
    if(bell){ try{ sb.removeChannel(bell); }catch(e){} }
    const setAll = v => Object.keys(listeners).forEach(c => rtOk[c] = v);
    bell = sb.channel(DEVTOPIC || "skwyd-none", { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "chg" }, m => { const t = m?.payload?.t; Object.keys(listeners).forEach(c => { if(listeners[c].length && (!t || tableOf(c) === t)) refresh(c); }); })
      .subscribe(st => { if(st === "SUBSCRIBED"){ if(bell._was) Object.keys(listeners).forEach(c => listeners[c].length && refresh(c)); bell._was = true; setAll(true); }
        else if(st === "CHANNEL_ERROR" || st === "TIMED_OUT" || st === "CLOSED"){ setAll(false); clearTimeout(timers._bell); timers._bell = setTimeout(liveBell, 3000); } });
  }
  function live(col){
    if(DEVKEY){ if(!bell) liveBell(); else if(bell.state === "joined") rtOk[col] = true; return; }
    const t = tableOf(col);
    if(channels[col]){ try{ sb.removeChannel(channels[col]); }catch(e){} }
    rtOk[col] = false;
    channels[col] = sb.channel("rt-" + t + "-" + Date.now().toString(36)).on("postgres_changes", { event: "*", schema: "public", table: t }, () => refresh(col))
      .subscribe(st => { if(st === "SUBSCRIBED"){ if(rtOk[col] === false && rtOk["_seen_" + col]) refresh(col); rtOk[col] = true; rtOk["_seen_" + col] = true; }
        else if(st === "CHANNEL_ERROR" || st === "TIMED_OUT" || st === "CLOSED"){ rtOk[col] = false; clearTimeout(timers["rt_" + col]); timers["rt_" + col] = setTimeout(() => { if(listeners[col]?.length) live(col); }, 3000); } });
  }
  const catchUp = () => Object.keys(listeners).forEach(c => { if(!listeners[c].length) return; refresh(c); if(!rtOk[c]) live(c); });
  document.addEventListener("visibilitychange", () => { if(!document.hidden) catchUp(); });   // tablet woke up / app back in front
  window.addEventListener("online", catchUp); window.addEventListener("focus", catchUp);
  // safety net: if the live connection is down, poll every 10 s; while it is up, a quiet re-check every 2 min
  setInterval(() => { if(document.hidden) return; Object.keys(listeners).forEach(c => { if(listeners[c].length && !rtOk[c]) refresh(c); }); }, 10000);
  setInterval(() => { if(!document.hidden) Object.keys(listeners).forEach(c => listeners[c].length && refresh(c)); }, 120000);
  async function send(op){
    const t = tableOf(op.col);
    if(op.op === "set"){ const { error } = await sb.from(t).upsert(toRow(op.col, op.id, op.data)); if(error) throw error; }
    else if(op.op === "update"){
      const row = toRow(op.col, null, op.data); delete row.id;   // never touch the key on update (settings rows came back with id:null)
      if(t === "settings"){ const cur = await sb.from(t).select("data").eq("id", op.id).maybeSingle(); if(cur.error) throw cur.error; row.data = { ...(cur.data?.data||{}), ...row.data }; }
      const { error } = await sb.from(t).update(row).eq("id", op.id); if(error) throw error;
    }
    else { const { error } = await sb.from(t).delete().eq("id", op.id); if(error) throw error; }
  }
  async function flush(){
    if(!OFF || syncing || !outbox.length) return status();
    syncing = true; status();
    try{
      const { data: { session }, error: se } = DEVKEY ? { data: { session: true }, error: null } : await sb.auth.getSession();       // refreshes an expired token when back online
      if(!session){ if(se && isNet(se)){ online = false; } else if(navigator.onLine){ needsLogin = true; gate("Your session ended. Sign in again to send the saved sales."); } return; }
      needsLogin = false;
      const touched = new Set();
      while(outbox.length){
        const op = outbox[0];
        try{ await send(op); outbox.shift(); touched.add(op.col); online = true; lastSync = new Date().toISOString(); ls.set("skwyd_last_sync", lastSync); saveBox(); status(); }
        catch(e){
          if(isNet(e)){ online = false; break; }
          op.tries = (op.tries||0) + 1; op.lastError = e.message || String(e);
          if(op.tries >= 3){ failed.push(outbox.shift()); console.error("sync gave up on", op, e); }
          saveBox(); if(op.tries < 3) break;
        }
      }
      touched.forEach(refresh);
    } finally { syncing = false; status(); }
  }
  function queue(op){
    const last = [...outbox].reverse().find(o => o.col === op.col && o.id === op.id);
    if(op.op === "update" && last && last === outbox[outbox.length-1] && last.op !== "delete" && !syncing) last.data = { ...last.data, ...op.data };   // merge repeated updates (e.g. heartbeats)
    else outbox.push({ ...op, qid: Date.now().toString(36) + Math.random().toString(36).slice(2,6), at: new Date().toISOString() });
    saveBox();
    local[op.col] = applyOp(local[op.col] || ls.get(cacheKey(op.col), []), op);
    emit(op.col, local[op.col], true);
    status(); setTimeout(flush, 50);
  }
  if(OFF){
    window.addEventListener("online", () => { online = true; status(); flush(); Object.keys(listeners).forEach(refresh); });
    window.addEventListener("offline", () => { online = false; status(); });
    document.addEventListener("visibilitychange", () => { if(!document.hidden) flush(); });
    setInterval(() => { if(outbox.length) flush(); else if(!online) Object.keys(listeners).slice(0,1).forEach(refresh); }, 20000);
  }

  function collection(col){
    const t = tableOf(col);
    return {
      onSnapshot(next, error){
        (listeners[col] ||= []).push({ next, error });
        if(OFF){ const cached = ls.get(cacheKey(col), null); if(cached){ local[col] = withPending(col, cached); const rows = local[col]; setTimeout(() => next({ docs: rows.map(r => { const { id, ...d } = r; return { id, data: () => ({ ...d }) }; }), metadata:{ fromCache:true, hasPendingWrites:false } }), 0); } }
        refresh(col);
        if(!channels[col]) live(col);
        return () => { listeners[col] = (listeners[col]||[]).filter(l => l.next !== next); };
      },
      doc(id){
        if(OFF) return {
          async set(data){ queue({ op:"set", col, id, data }); },
          async update(data){ queue({ op:"update", col, id, data }); },
          async delete(){ queue({ op:"delete", col, id }); }
        };
        return {
          async set(data){ await send({ op:"set", col, id, data }); refresh(col); },
          async update(data){ await send({ op:"update", col, id, data }); refresh(col); },
          async delete(){ await send({ op:"delete", col, id }); refresh(col); }
        };
      }
    };
  }
  const dbApi = { collection };

  /* ---------- staff login ---------- */
  let staff = null, readyResolve; const ready = new Promise(r => readyResolve = r);
  const css = `.wk-gate{position:fixed;inset:0;background:radial-gradient(1200px 600px at 20% 0%,#eaeefb,transparent),radial-gradient(900px 500px at 100% 100%,#ebeffc,transparent),#f4f5fa;display:grid;place-items:center;z-index:9999;font-family:Inter,system-ui,sans-serif;padding:20px}
  .wk-card{background:#fff;border-radius:22px;padding:34px;width:min(380px,100%);box-shadow:0 10px 40px rgba(30,20,60,.1)}
  .wk-sq{width:54px;height:62px;margin:0 auto 10px}.f2gate{display:flex;flex-direction:column;align-items:center;gap:10px;margin:0 auto 8px}.f2gate svg{display:block}.wk-sq svg{width:100%;height:100%;display:block}.wk-name{font-weight:800!important;letter-spacing:-.6px}.wk-hub{display:inline-block;margin-left:5px;vertical-align:top;font-size:11px;font-weight:800;letter-spacing:0;line-height:1.3;padding:1px 6px;border-radius:6px;background:#c6f432;color:#172554;border:2px solid #172554;transform:translateY(2px)}.wk-logo{width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#1e3a8a,#1e3a8a);box-shadow:0 8px 22px rgba(30,58,138,.4);color:#fff;display:grid;place-items:center;font-weight:700;font-size:22px;margin:0 auto 12px}
  .wk-card h1{text-align:center;font-size:20px;margin:0 0 4px}.wk-card p{text-align:center;color:#5b5a66;margin:0 0 18px;font-size:14px}
  .wk-card label{display:block;font-size:13px;color:#5b5a66;margin:10px 0 5px;font-weight:500}
  .wk-card input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #e5e3ec;border-radius:10px;font:inherit}
  .wk-card button{width:100%;margin-top:16px;padding:13px;border:0;border-radius:12px;background:linear-gradient(135deg,#1e3a8a,#1e3a8a);box-shadow:0 6px 16px rgba(30,58,138,.3);color:#fff;font:inherit;font-weight:600;cursor:pointer}
  .wk-card button:disabled{opacity:.6}.wk-forgot{display:block;text-align:center;margin-top:12px;font-size:13px;color:#1e3a8a;text-decoration:none}.wk-err{color:#9e0c24;font-size:13px;min-height:18px;margin-top:10px;text-align:center}`;
  const IS_POS = document.title.includes("POS"); let emailMode = false, needsAct = false;
  function gate(msg, force){
    if(!document.body){ document.addEventListener("DOMContentLoaded", () => gate(msg, force), { once:true }); return; }   // page still loading
    if(force) emailMode = true;
    if(IS_POS && !emailMode){ needsAct = true; const g = document.getElementById("wkGate"); if(g) g.style.display = "none";
      document.dispatchEvent(new CustomEvent("wok:activate", { detail: { msg: msg || "" } })); return; }   // a new register goes straight to device activation
    let el = document.getElementById("wkGate");
    if(!el){
      const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
      el = document.createElement("div"); el.id = "wkGate"; el.className = "wk-gate";
      el.innerHTML = `<form class="wk-card" autocomplete="on"><div class="f2gate"><svg viewBox="0 0 120 124" height="64.0" width="61.9" aria-hidden="true"><path d="M24 82 V62 C24 32 41 12 60 12 C79 12 96 32 96 62 V82" fill="none" stroke="#172554" stroke-width="9" stroke-linecap="round"/><path d="M24 82 Q24 106 14 114 M48 84 Q48 104 42 116 M72 84 Q72 104 78 116 M96 82 Q96 106 106 114" fill="none" stroke="#172554" stroke-width="9" stroke-linecap="round"/><circle cx="47" cy="52" r="8.5" fill="#6d28d9"/><circle cx="73" cy="52" r="8.5" fill="#6d28d9"/></svg><svg viewBox="0 0 543.6 100" height="34" width="184.8" role="img" aria-label="skwyd hub"><path fill="#172554" fill-rule="evenodd" d="M465.3 2.0 L461.5 5.6 L460.2 10.1 L460.2 90.1 L461.5 94.4 L464.1 97.4 L468.3 99.0 L494.2 99.0 L506.4 96.9 L513.9 94.2 L520.2 90.7 L527.3 85.5 L534.0 78.2 L539.7 68.8 L542.3 61.3 L543.5 54.2 L543.3 43.5 L540.5 33.2 L536.9 26.0 L531.6 18.8 L524.0 11.9 L514.5 6.1 L508.9 4.0 L501.5 2.0 L494.9 1.0 L469.8 0.8ZM480.5 20.0 L493.9 20.0 L498.8 20.8 L504.1 22.5 L510.2 25.6 L513.9 28.4 L519.2 33.9 L522.1 38.8 L524.1 44.8 L524.6 48.1 L524.3 54.5 L522.3 60.8 L519.3 66.0 L513.6 71.9 L508.9 75.2 L503.8 77.7 L497.5 79.5 L491.2 80.2 L481.3 80.2 L480.2 79.8 L479.3 78.8 L479.2 21.8ZM30.4 0.7 L24.0 2.1 L17.2 5.0 L12.4 8.3 L7.4 13.6 L4.6 18.5 L2.6 25.3 L2.5 32.7 L3.6 38.5 L5.0 42.3 L7.1 45.6 L12.6 50.9 L16.7 53.6 L22.8 56.4 L34.4 59.8 L46.3 62.5 L51.6 64.8 L53.2 66.3 L54.2 68.3 L53.9 72.2 L51.7 75.5 L46.9 78.8 L41.5 80.3 L35.0 80.7 L29.1 79.5 L24.1 77.2 L21.0 74.9 L16.4 70.1 L13.4 68.1 L11.1 67.4 L7.9 67.4 L4.6 68.6 L2.3 70.6 L0.5 73.7 L0.0 77.5 L1.5 81.7 L5.3 86.3 L10.6 90.9 L17.2 95.0 L23.6 97.7 L31.1 99.3 L43.1 99.3 L50.4 97.9 L57.4 94.9 L62.8 91.2 L67.8 86.3 L70.9 81.2 L72.9 75.2 L73.4 68.1 L72.6 62.1 L70.2 56.7 L68.4 54.2 L65.3 51.2 L61.3 48.6 L50.1 43.8 L31.1 39.3 L25.0 36.5 L23.0 34.5 L22.0 32.7 L21.5 30.2 L21.8 27.3 L23.3 24.3 L26.3 21.7 L31.7 19.7 L37.4 19.3 L41.3 19.8 L45.5 21.2 L55.0 27.3 L57.0 27.8 L60.2 27.6 L63.3 26.3 L66.0 23.8 L67.6 20.0 L67.6 16.7 L66.3 13.4 L63.5 10.4 L57.5 6.0 L53.1 3.6 L48.8 2.0 L43.3 0.8ZM354.0 0.8 L350.6 3.6 L349.6 5.3 L348.8 8.4 L348.8 30.6 L349.8 37.5 L351.4 42.8 L353.9 47.9 L357.4 53.2 L362.6 58.8 L369.4 63.6 L373.6 65.8 L378.7 67.4 L380.2 68.6 L380.7 91.4 L381.3 94.4 L383.8 97.7 L386.8 99.5 L388.8 100.0 L393.6 99.5 L397.0 97.2 L399.3 93.1 L399.8 68.8 L401.2 67.6 L405.5 66.3 L410.7 63.6 L418.0 58.3 L423.5 52.2 L428.9 42.5 L430.4 37.5 L431.6 28.4 L431.6 9.6 L430.6 5.3 L427.8 1.8 L425.8 0.7 L422.8 0.0 L418.3 0.7 L414.7 3.3 L413.2 5.8 L412.6 8.1 L412.2 31.2 L411.1 35.5 L409.6 38.7 L406.0 43.3 L400.3 47.6 L394.9 49.6 L388.6 50.1 L384.6 49.4 L379.0 47.1 L374.0 43.1 L371.4 40.0 L369.3 35.9 L368.1 31.9 L367.8 9.4 L367.1 6.1 L365.6 3.5 L362.3 0.8 L359.0 0.0ZM211.6 3.8 L209.9 8.1 L210.1 71.7 L211.1 76.9 L213.9 83.1 L217.9 88.8 L221.7 92.4 L224.8 94.7 L231.1 97.9 L238.2 99.5 L244.1 99.7 L248.6 99.2 L254.2 97.4 L259.5 94.5 L263.5 91.4 L265.3 91.1 L269.9 94.5 L276.0 97.7 L282.5 99.3 L289.6 99.7 L297.4 98.2 L303.8 95.2 L309.8 90.7 L314.0 86.0 L317.4 79.7 L319.2 73.6 L319.7 69.3 L319.7 8.6 L318.2 4.3 L315.4 1.3 L310.9 0.0 L306.9 0.5 L303.6 2.5 L301.5 5.6 L300.7 9.1 L300.3 70.1 L298.8 74.0 L295.5 77.9 L292.1 79.8 L288.4 80.7 L283.3 80.0 L279.8 78.2 L276.4 74.5 L274.5 70.2 L274.2 8.3 L273.6 5.8 L271.7 3.0 L269.8 1.3 L267.4 0.3 L262.8 0.2 L259.2 1.7 L257.0 3.8 L255.9 6.0 L255.2 9.6 L255.0 69.3 L253.4 74.0 L250.6 77.4 L246.6 79.8 L243.0 80.7 L238.5 80.2 L234.4 78.2 L231.4 75.2 L229.1 70.2 L228.8 8.4 L227.9 5.5 L224.8 1.7 L220.2 0.0 L215.5 0.7ZM106.0 1.5 L103.0 4.6 L101.8 8.4 L101.8 91.6 L102.3 93.9 L103.6 96.4 L107.4 99.3 L109.6 100.0 L112.7 100.0 L116.7 98.5 L119.8 94.7 L120.8 90.6 L120.8 59.8 L121.8 58.3 L147.6 58.0 L151.6 58.7 L155.9 60.7 L159.5 64.1 L161.7 67.9 L162.6 72.4 L162.6 91.4 L163.3 94.4 L164.8 96.7 L167.9 99.2 L170.6 100.0 L174.5 99.8 L177.9 98.2 L180.7 95.0 L181.7 92.2 L181.8 73.1 L181.3 67.3 L178.7 59.2 L176.0 54.4 L167.9 45.1 L172.6 35.5 L174.2 28.6 L174.5 9.1 L173.9 6.0 L172.7 3.8 L170.1 1.3 L166.0 0.0 L161.3 0.7 L159.5 1.7 L157.4 3.8 L156.2 5.8 L155.5 8.9 L155.2 27.3 L153.2 31.9 L149.3 36.2 L145.6 38.2 L142.1 39.0 L123.3 39.2 L121.7 38.7 L120.8 37.4 L120.8 9.3 L120.2 6.1 L118.7 3.5 L116.9 1.7 L114.7 0.5 L110.4 0.0Z"/></svg><svg viewBox="0 0 376 100" height="11" width="41.4" aria-hidden="true"><g fill="none" stroke="#6d28d9" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"><path transform="translate(0 0)" d="M10 10 V90 M66 10 V90 M10 50 H66"/><path transform="translate(148 0)" d="M10 10 V60 A30 30 0 0 0 70 60 V10"/><path transform="translate(300 0)" d="M10 10 V90 H46 A20 20 0 0 0 46 50 H10 M10 50 H42 A20 20 0 0 0 42 10 H10"/></g></svg></div><h1 class="wk-name" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">skwyd hub</h1><p>${document.title.includes("POS") ? "Sign in to start the register" : "Sign in to the back office"}</p>
        <label for="wkAcct">Account number</label><input id="wkAcct" inputmode="numeric" autocomplete="organization" required value="${ls.get("skwyd_acct", "") || ""}">
        <label for="wkEmail">Email</label><input id="wkEmail" type="email" autocomplete="username" required>
        <label for="wkPass">Password</label><input id="wkPass" type="password" autocomplete="current-password" required>
        <button id="wkBtn">Sign in</button><a href="#" class="wk-forgot" id="wkForgot">Forgot password?</a>${!IS_POS && /skwydhub\.com$|pages\.dev$|localhost/.test(location.hostname) ? '<a href="/signup" class="wk-forgot">New to Skwyd Hub? Start a free trial</a>' : ""}${IS_POS ? '<a href="#" class="wk-forgot" id="wkAct">Activate with a device code</a>' : ""}<div class="wk-err" id="wkErr"></div></form>`;
      document.body.appendChild(el);
      el.querySelector("#wkAct")?.addEventListener("click", e => { e.preventDefault(); emailMode = false; gate(); });
      el.querySelector("#wkForgot").addEventListener("click", async e => { e.preventDefault(); const em = el.querySelector("#wkEmail").value.trim(), er = el.querySelector("#wkErr");
        if(!em){ er.textContent = "Type your email first, then tap Forgot password."; el.querySelector("#wkEmail").focus(); return; }
        const { error } = await sb.auth.resetPasswordForEmail(em, { redirectTo: location.href.split("#")[0] });
        er.style.color = error ? "" : "#1f7a3d"; er.textContent = error ? error.message : "Check your email for a link to set a new password."; });
      el.querySelector("form").addEventListener("submit", async e => {
        e.preventDefault(); const b = el.querySelector("#wkBtn"); b.disabled = true; el.querySelector("#wkErr").textContent = "";
        const acct = el.querySelector("#wkAcct").value.replace(/\s+/g, "");
        const { error } = await sb.auth.signInWithPassword({ email: el.querySelector("#wkEmail").value.trim(), password: el.querySelector("#wkPass").value });
        if(error){ b.disabled = false; el.querySelector("#wkErr").textContent = error.message === "Invalid login credentials" ? "Wrong account number, email or password." : error.message; return; }
        // the business's account number (given by skwyd hub) must match
        try{ const { data: co } = await sb.from("settings").select("data").eq("id", "company").maybeSingle(); const want = String(co?.data?.accountNo || "").replace(/\s+/g, "");
          if(want && want !== acct && !(await sb.rpc("slick_is_platform_admin")).data){ await sb.auth.signOut(); b.disabled = false; el.querySelector("#wkErr").textContent = "Wrong account number, email or password."; return; } }catch(_){}
        ls.set("skwyd_acct", acct); b.disabled = false;
        await afterLogin();
      });
    }
    el.style.display = "grid"; el.querySelector("#wkErr").textContent = msg || "";
  }
  // activate a new register with only its 6-digit code: anonymous login + server check of the code
  async function activateDevice(code, onId){
    if(!navigator.onLine) return { error: "offline" };
    const { data: { session } } = await sb.auth.getSession();
    if(session){ try{ await sb.auth.signOut({ scope: "local" }); }catch(_){} }   // a register is never tied to a login
    const anon = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false, storageKey: "skwyd-activate" } });
    const { data, error } = await anon.rpc("skwyd_activate_device_key", { p_code: code });
    if(error) return { error: isNet(error) ? "offline" : (error.code === "PGRST202" || /skwyd_activate_device_key/.test(error.message)) ? "setup" : error.message };
    if(!data || data.error) return data?.error === "plan" ? { error: data.message || "plan" } : { error: data?.error || "invalid" };
    try{ localStorage.setItem("skwyd_devkey", data.key); localStorage.setItem("skwyd_devtopic", data.topic || ""); localStorage.removeItem("skwyd_staff"); }catch(_){ return { error: "Couldn't save on this tablet." }; }
    needsAct = false; if(onId) onId(data.id);
    setTimeout(() => location.reload(), 300); return { id: data.id };
  }
  // a register deactivated in the back office leaves the sale screen within seconds (it may not get the change pushed, so it also asks)
  let watchT = null;
  // the company's Skwyd Hub subscription (trial, grace, locked…): works even while it's locked
  async function subState(){ try{ const r = await sb.rpc("slick_my_subscription"); return r.error ? null : r.data; }catch(_){ return null; } }
  function deactivated(){ try{ ["skwyd_devkey","skwyd_devtopic","skwyd_staff","wokDevice"].forEach(k => localStorage.removeItem(k)); }catch(_){} location.reload(); }
  async function deviceCheck(){
    if(!OFF || !staff?.device || !navigator.onLine) return;
    try{
      if(DEVKEY){ const r = await sb.rpc("skwyd_device_ok"); if(!r.error && r.data === false) deactivated(); return; }
      const r = await sb.rpc("staff_role"); if(!r.error && !r.data){ const st = await subState(); if(st?.state === "locked"){ document.dispatchEvent(new CustomEvent("wok:locked", { detail: st })); return; } try{ await sb.auth.signOut({ scope:"local" }); }catch(_){} deactivated(); }
    }catch(e){}
  }
  function deviceWatch(){ if(watchT || !OFF) return; watchT = setInterval(deviceCheck, 20000);
    addEventListener("focus", deviceCheck); document.addEventListener("visibilitychange", () => { if(!document.hidden) deviceCheck(); }); addEventListener("online", deviceCheck); }
  function useStaff(s){
    staff = s; if(OFF) ls.set("skwyd_staff", s); if(s?.device) deviceWatch();
    const el = document.getElementById("wkGate"); if(el) el.style.display = "none";
    readyResolve(dbApi); if(OFF) setTimeout(flush, 500);
  }
  async function afterLogin(){
    const cached = OFF ? ls.get("skwyd_staff", null) : null;
    let user = null;
    try{ const r = await sb.auth.getUser(); user = r.data?.user; if(r.error && isNet(r.error) && cached){ online = false; status(); return useStaff(cached); } }
    catch(e){ if(cached && isNet(e)) return useStaff(cached); }
    if(!user) return gate();
    if(user.is_anonymous){   // a register activated with its device code
      const r = await sb.rpc("staff_role");
      if(r.error && isNet(r.error) && cached && cached.user_id === user.id){ online = false; status(); return useStaff(cached); }
      if(!r.data){ const st = await subState(); if(st?.state === "locked") return useStaff({ user_id: user.id, role: null, name: "Register", device: true, locked: true });
        await sb.auth.signOut(); return gate(); }
      return useStaff({ user_id: user.id, role: r.data, name: "Register", device: true });
    }
    let { data, error } = await sb.from("staff").select("*").eq("user_id", user.id).maybeSingle();
    if(error && isNet(error) && cached && cached.user_id === user.id) return useStaff(cached);
    if(!data && !error){ const c = await sb.rpc("skwyd_claim_login"); if(c.data) ({ data } = await sb.from("staff").select("*").eq("user_id", user.id).maybeSingle()); }   // first sign-in of a user added under Manage → Users
    if(!data){ try{ const v = await sb.rpc("slick_my_view"); if(v.data?.companyId) return useStaff({ user_id: user.id, email: user.email, name: user.user_metadata?.name || user.email, role: "owner", viewAs: v.data }); }catch(_){}   // a Skwyd Hub admin opening a business's back office
      const st = await subState(); if(st?.state === "locked") return useStaff({ user_id: user.id, email: user.email, name: user.user_metadata?.name || user.email, role: "owner", locked: true });   // the lock screen explains; nothing else loads
      await sb.auth.signOut(); return gate("This login isn't set up as staff yet. Ask the owner to add you."); }
    // a user turned off (or deleted) under Manage → Users can't sign in to the back office
    try{ const su = await sb.from("staff_users").select("active,deleted").eq("user_id", user.id).maybeSingle(); if(su.data?.deleted){ await sb.auth.signOut(); return gate("This user was deleted. Ask the owner to restore you."); } }catch(e){}
    useStaff({ ...data, email: user.email });
  }
  (async () => {
    if(DEVKEY){   // an activated register: no login, its key is checked by the database on every request
      const dev = { user_id: "device", role: "cashier", name: "Register", device: true };
      let ok = null; try{ const r = await sb.rpc("skwyd_device_ok"); if(!r.error) ok = !!r.data; else if(!isNet(r.error)) ok = null; }catch(e){}
      if(ok === false){ try{ localStorage.removeItem("skwyd_devkey"); localStorage.removeItem("skwyd_devtopic"); localStorage.removeItem("wokDevice"); }catch(_){}
        return gate(); }
      if(ok === null && navigator.onLine){ /* server check unavailable: keep working, the next ring or poll will tell */ }
      if(!navigator.onLine){ online = false; status(); }
      return useStaff(dev);
    }
    const cached = OFF ? ls.get("skwyd_staff", null) : null;
    let res; try{ res = await sb.auth.getSession(); }catch(e){ res = { data:{ session:null }, error:e }; }
    const session = res.data?.session;
    if(session) await afterLogin();
    else if(cached && (isNet(res.error) || !navigator.onLine)){ online = false; status(); useStaff(cached); }   // offline with an expired token: keep selling, sync after sign-in
    else gate();
  })();

  const userApi = { id: async () => staff?.user_id, email: async () => staff?.email || "", name: async () => staff?.name || staff?.email, role: async () => staff?.role, branchId: async () => staff?.branch_id,
    canEdit: async () => ["owner","admin"].includes(staff?.role), isOwner: async () => staff?.role === "owner", signOut: async () => { if(DEVKEY && staff?.device){ if(OFF && outbox.length && !(await (window.askYes ? window.askYes(outbox.length + " change(s) haven't synced yet. Deactivate anyway?") : Promise.resolve(confirm("Deactivate anyway?"))))) return; try{ ["skwyd_devkey","skwyd_devtopic","skwyd_staff"].forEach(k => localStorage.removeItem(k)); }catch(_){} location.reload(); return; }
      if(OFF && outbox.length && !(await (window.askYes ? window.askYes(outbox.length + " change(s) haven't synced yet. Sign out anyway? They stay saved on this device.") : Promise.resolve(confirm(outbox.length + " change(s) haven't synced yet. Sign out anyway? They stay saved on this device."))))) return; await sb.auth.signOut(); if(OFF) localStorage.removeItem("skwyd_staff"); location.reload(); } };

  window.WOK = { sb, refreshAll: () => Object.keys(listeners).forEach(c => listeners[c].length && refresh(c)), subscription: subState, locked: () => !!staff?.locked, viewAs: () => staff?.viewAs || null, stopView: async () => { await sb.rpc("slick_stop_view"); location.reload(); }, cfg:{ url:SUPABASE_URL, key:SUPABASE_KEY }, ready, deviceCheck, user: userApi, activate: activateDevice, emailLogin: () => gate("", true), needsActivation: () => needsAct, isDevice: () => !!staff?.device, sync: { status, flush, failed: () => failed.slice(), retryFailed: () => { outbox.push(...failed.map(o => ({ ...o, tries:0 }))); failed = []; saveBox(); flush(); },
    // sales history was cleared in the back office: drop sales saved on this register before that moment
    purgeBefore: (cols, iso) => { const old = o => cols.includes(o.col) && String(o.at||"") < iso; outbox = outbox.filter(o => !old(o)); failed = failed.filter(o => !old(o)); saveBox();
      cols.forEach(c => { ls.set(cacheKey(c), []); local[c] = withPending(c, []); emit(c, local[c], true); if(listeners[c]) refresh(c); }); status(); } } };
  window.claude = { use: async n => n === "db" ? ready : n === "user" ? (await ready, userApi) : null };
})();

/* ---------- dates everywhere as dd-mm-yyyy: rewrites date text on screen and shows date fields as dd-mm-yyyy ---------- */
(function(){
  if(window.__slickDMY) return; window.__slickDMY = true;
  const M = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 }, z = n => String(n).padStart(2, "0");
  const MON = "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?";
  const RX = [
    [/\b(\d{4})-(\d{2})-(\d{2})(?![\d:]*Z)\b/g, (m, y, mo, d) => `${d}-${mo}-${y}`],                          // 2026-11-13
    [/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, (m, d, mo, y) => `${z(d)}-${z(mo)}-${y}`],                       // 13/11/2026 (en-GB)
    [new RegExp("\\b(\\d{1,2}) " + MON + ",? (\\d{4})\\b", "g"), (m, d, mo, y) => `${z(d)}-${z(M[mo.slice(0,3).toLowerCase()])}-${y}`],   // 13 Nov 2026
    [new RegExp("\\b" + MON + " (\\d{1,2}),? (\\d{4})\\b", "g"), (m, mo, d, y) => `${z(d)}-${z(M[mo.slice(0,3).toLowerCase()])}-${y}`],   // Nov 13, 2026
  ];
  const fix = s => RX.reduce((t, [r, f]) => t.replace(r, f), s);
  const SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|SELECT|OPTION|CODE|PRE|NOSCRIPT)$/;
  function walk(root){
    if(!root) return;
    if(root.nodeType === 3){ const p = root.parentNode; if(p && !SKIP.test(p.nodeName) && !p.closest?.("[contenteditable],[data-raw-date]") && /\d/.test(root.data)){ const v = fix(root.data); if(v !== root.data) root.data = v; } return; }
    if(root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if(root.nodeType === 1 && (SKIP.test(root.nodeName) || root.isContentEditable)){ if(root.nodeName === "INPUT") dateField(root); return; }
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; const list = [];
    while((n = tw.nextNode())) list.push(n);
    list.forEach(walk);
    root.querySelectorAll?.('input[type="date"]').forEach(dateField);
  }
  // a date field shows its value as dd-mm-yyyy (the browser would use the device language)
  function dateField(inp){
    if(inp.type !== "date" || inp.dataset.dmy) return;
    const w = document.createElement("span"), cs = getComputedStyle(inp), color = cs.color; inp.dataset.dmy = "1";
    w.className = "dmyw"; w.style.cssText = `position:relative;display:${cs.display === "block" ? "block" : "inline-block"};${cs.display === "block" || /100%/.test(inp.style.width) ? "width:100%" : ""}`;
    const o = document.createElement("span"); o.className = "dmyo";
    o.style.cssText = `position:absolute;left:${parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth) || 12}px;top:50%;transform:translateY(-50%);pointer-events:none;font:inherit;font-size:${cs.fontSize};color:${color};white-space:nowrap`;
    inp.parentNode.insertBefore(w, inp); w.appendChild(inp); w.appendChild(o);
    inp.style.color = "transparent"; inp.style.caretColor = "transparent";
    const paint = () => { const v = inp.value; o.textContent = v ? v.split("-").reverse().join("-") : "dd-mm-yyyy"; o.style.opacity = v ? "1" : ".45"; };
    paint(); inp.addEventListener("input", paint); inp.addEventListener("change", paint);
    inp.addEventListener("click", () => { try{ inp.showPicker(); }catch(e){} });
    const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    Object.defineProperty(inp, "value", { configurable:true, get(){ return d.get.call(this); }, set(v){ d.set.call(this, v); paint(); } });
  }
  // the browser's own date text (and its blue selection) stays hidden under the dd-mm-yyyy label
  const st = document.createElement("style"); st.textContent = 'input[data-dmy]::-webkit-datetime-edit{opacity:0}input[data-dmy]{color:transparent}input[data-dmy]::selection{background:transparent}';
  (document.head || document.documentElement).appendChild(st);
  const start = () => { walk(document.body);
    new MutationObserver(ms => { for(const m of ms){ if(m.type === "characterData") walk(m.target); else m.addedNodes.forEach(walk); } })
      .observe(document.body, { childList:true, subtree:true, characterData:true }); };
  if(document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
