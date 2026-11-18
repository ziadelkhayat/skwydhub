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
    ? { auth: { persistSession: false, autoRefreshToken: false, storageKey: "skwyd-device-noauth" }, global: { headers: { "x-skwyd-device": DEVKEY, "x-slick-device": DEVKEY } } }
    : { auth: { persistSession: true, autoRefreshToken: true } });

  // app collection -> table, and which columns each table accepts
  const TABLE = { inv_items: "inventory_items", zones: "delivery_zones", inv_categories: "inventory_categories", inv_docs: "inventory_docs", users: "staff_users", work_shifts: "staff_shifts", work_requests: "staff_requests", staff_docs: "staff_documents" };
  const COLS = {
    staff_documents: "id employee_id doc_type number issued_on expires_on file_path file_name note deleted created_at",
    chat_groups: "id name kind owner_id member_ids role_ids branch_ids created_by deleted created_at",
    kb_articles: "id title category body files role_ids branch_ids employee_ids admin_ids status archived pinned ack created_by deleted created_at updated_at",
    kb_reads: "id article_id staff_id read_at views last_viewed_at",
    tasks: "id title notes assignee_ids branch_id due_day status done_by done_at created_by deleted created_at updated_at",
    chat_messages: "id group_id sender_id sender_name from_office body deleted created_at",
    staff_requests: "id employee_id kind leave_type from_day to_day shift_id swap_with note status decided_by decided_at decision_note branch_id deleted created_at",
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
    staff_users: "id name email phone employee_no job_title hire_date birth_date employment_type pay_type pay_rate leave_days onboarding social_security emergency_name emergency_phone notes role role_id role_ids language display_localized branch_ids pin_hash active user_id username app_uid deleted created_at",
    modifier_options: "id modifier_id name name_ar sku price tax_group costing_method cost calories ingredients custom_prices inactive_branch_ids out_of_stock_branch_ids sort active deleted created_at nutrition allergens",
    orders: "id brand_id no channel source type status branch_id device_id shift_id zone_id customer_name phone address lat lng table_no notes items subtotal discount_pct discount delivery_fee tax invoice_no total payment agent handled_by accepted_at done_at void_reason voided_at voided_by created_at charges charges_total receipt_notes guests voided_items returned_items refund_total stock_action return_reason returned_at returned_by approved_by refund_of return_no discount_type updated_at closed_at scheduled_at edit_request driver_id driver_name dispatched_at dispatched_by driver_status driver_assigned_at driver_accepted_at picked_at pickup_photo delivered_at track_token driver_lat driver_lng driver_loc_at rating_driver rating_order rating_note rated_at driver_settled_at driver_settled_by",
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
  function emit(col, rows, fromCache, onlyNew){
    const snap = { docs: rows.map(r => { const { id, ...d } = r; return { id, data: () => ({ ...d }) }; }), metadata:{ fromCache: !!fromCache, hasPendingWrites: outbox.some(o => o.col === col) } };
    (listeners[col]||[]).forEach(l => { if(onlyNew && l.seen) return; l.seen = true; l.next(snap); });
  }
  const DEVCOLS = { products: "id,name,name_ar,sku,category_id,price,tax_group,description,image_url,channels,branch_ids,active,deleted,created_at,brand_id,pricing_method,selling_method,calories,custom_prices,inactive_branch_ids,out_of_stock_branch_ids,modifiers,sort,variant_set_id,variants",
    modifiers: "id,name,name_ar,deleted,sort", modifier_options: "id,modifier_id,name,name_ar,price,custom_prices,inactive_branch_ids,out_of_stock_branch_ids,sort,active,deleted" };
  async function fetchAll(col){
    const t = tableOf(col);
    // a register (device key, no login) may only read the menu columns the public can see: cost, recipes etc. stay hidden
    let q = sb.from(t).select((DEVKEY && DEVCOLS[t]) || "*");
    if(t === "orders") q = q.gte("created_at", new Date(Date.now() - 3*86400000).toISOString()).order("created_at", { ascending:false }).limit(1000);
    else if(t === "staff_requests") q = q.gte("created_at", new Date(Date.now() - 400*86400000).toISOString()).limit(5000);
    else if(t === "chat_messages") q = q.gte("created_at", new Date(Date.now() - 60*86400000).toISOString()).order("created_at", { ascending:false }).limit(3000);
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
        const next = OFF ? withPending(col, rows) : rows;
        let same = false; try{ same = local[col] && JSON.stringify(local[col]) === JSON.stringify(next); }catch(_){}
        local[col] = next;
        emit(col, local[col], false, same);   // nothing changed: only screens still waiting for this list get it (no redraw that makes phones jump while scrolling)
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
  .wk-sq{width:54px;height:62px;margin:0 auto 10px}.f2gate{display:flex;flex-direction:column;align-items:center;gap:10px;margin:0 auto 8px}.f2gate svg{display:block}.wk-sq svg{width:100%;height:100%;display:block}.wk-name{font-weight:800!important;letter-spacing:-.6px}.wk-hub{display:inline-block;margin-left:5px;vertical-align:top;font-size:11px;font-weight:800;letter-spacing:0;line-height:1.3;padding:1px 6px;border-radius:6px;background:#6d28d9;color:#fff;border:2px solid #172554;transform:translateY(2px)}.wk-logo{width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#1e3a8a,#1e3a8a);box-shadow:0 8px 22px rgba(30,58,138,.4);color:#fff;display:grid;place-items:center;font-weight:700;font-size:22px;margin:0 auto 12px}
  .wk-card h1{text-align:center;font-size:20px;margin:0 0 4px}.wk-card p{text-align:center;color:#5b5a66;margin:0 0 18px;font-size:14px}
  .wk-card label{display:block;font-size:13px;color:#5b5a66;margin:10px 0 5px;font-weight:500}
  .wk-card input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #e5e3ec;border-radius:10px;font:inherit}
  .wk-card button{width:100%;margin-top:16px;padding:13px;border:0;border-radius:12px;background:linear-gradient(135deg,#1e3a8a,#1e3a8a);box-shadow:0 6px 16px rgba(30,58,138,.3);color:#fff;font:inherit;font-weight:600;cursor:pointer}
  .wk-card button:disabled{opacity:.6}
  .wk-side{display:none}
  @media (min-width:900px){.wk-gate{grid-template-columns:44% 1fr!important;place-items:stretch!important;padding:0!important;background:#fff!important}
    .wk-side{display:flex;flex-direction:column;justify-content:space-between;background:#0B1330;padding:48px 56px;color:#AEB6D1;overflow:hidden}
    .wk-sb{display:flex;align-items:center;gap:12px}.wk-sb b{font-family:"Plus Jakarta Sans",Inter,sans-serif;color:#fff;font-size:22px;letter-spacing:-.02em}
    .wk-big{width:min(300px,60%);height:auto;align-self:center}
    .wk-tag h2{font-family:"Plus Jakarta Sans",Inter,sans-serif;color:#fff;font-size:34px;line-height:1.15;letter-spacing:-.02em;margin:0 0 10px}.wk-tag p{margin:0;font-size:15px}
    .wk-gate .wk-card{align-self:center;justify-self:center;box-shadow:none!important;width:min(420px,90%)!important;padding:0!important}
    .wk-gate .wk-card .f2gate{display:none}
    .wk-gate .wk-card > p:first-of-type::before{content:"Sign in";display:block;font:800 34px "Plus Jakarta Sans",Inter,sans-serif;letter-spacing:-.02em;color:#0E1530;margin-bottom:6px}
    .wk-gate .wk-card .wk-forgot{text-align:left!important;font-weight:600}
    .wk-gate .wk-card h1{text-align:left!important;font-family:"Plus Jakarta Sans",Inter,sans-serif;font-size:32px!important;letter-spacing:-.02em}.wk-gate .wk-card p{text-align:left!important}}
  .wk-card input,.wk-card select{min-height:48px;border-radius:14px!important;border-color:#E0E3EE!important;font-size:16px!important}
  .wk-card input:focus,.wk-card select:focus{outline:none;border-color:#1E3A8A!important;box-shadow:0 0 0 4px #E3E8FA}
  .wk-card button{min-height:52px;border-radius:14px!important;font-weight:700!important}
  .wk-card label{color:#0E1530!important;font-weight:600!important}
  .wk-gate,.wk-gate *{text-transform:none!important}.wk-forgot{display:block;text-align:center;margin-top:12px;font-size:13px;color:#1e3a8a;text-decoration:none}.wk-err{color:#9e0c24;font-size:13px;min-height:18px;margin-top:10px;text-align:center}`;
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
      el.innerHTML = `<div class="wk-side" aria-hidden="true"><div class="wk-sb" style="--sk-ink:#fff"><svg viewBox="0 0 120 124" width="38" height="40"><g transform="translate(0 3)"><path d="M60 10 C82 10 94 32 94 54 C94 70 82 78 60 78 C38 78 26 70 26 54 C26 32 38 10 60 10Z" style="fill:none!important;stroke:var(--sk-ink,#fff)!important" stroke-width="5.5" stroke-linejoin="round"/><path d="M38 74 C34 92 22 94 24 104 C26 110 34 106 30 101 M50 78 C50 94 44 104 48 110 M60 78 V108 C60 112 66 112 64 107 M70 78 C70 94 76 104 72 110 M82 74 C86 92 98 94 96 104 C94 110 86 106 90 101" style="fill:none!important;stroke:var(--sk-ink,#fff)!important" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M48 50h0M72 50h0" style="fill:none!important;stroke:var(--sk-ink,#fff)!important" stroke-width="8.8" stroke-linecap="round"/></g></svg><svg viewBox="0 0 169.1 99" height="40" width="68.3" role="img" aria-label="skwyd"><path d="M14.219999999999999 53.040000000000006Q11.52 53.040000000000006 8.91 52.32000000000001Q6.3 51.6 4.05 50.370000000000005Q1.7999999999999998 49.14 0.24 47.52L5.9399999999999995 41.7Q7.38 43.2 9.39 44.040000000000006Q11.4 44.88 13.68 44.88Q15.0 44.88 15.69 44.52Q16.38 44.160000000000004 16.38 43.5Q16.38 42.540000000000006 15.389999999999999 42.03Q14.399999999999999 41.52 12.809999999999999 41.13Q11.219999999999999 40.74 9.479999999999999 40.17Q7.739999999999999 39.6 6.119999999999999 38.64Q4.5 37.68000000000001 3.51 35.940000000000005Q2.52 34.2 2.52 31.500000000000004Q2.52 28.680000000000003 4.05 26.550000000000004Q5.58 24.420000000000005 8.34 23.190000000000005Q11.1 21.960000000000004 14.82 21.960000000000004Q18.599999999999998 21.960000000000004 22.019999999999996 23.250000000000004Q25.439999999999998 24.540000000000003 27.54 27.120000000000005L21.779999999999998 32.940000000000005Q20.34 31.320000000000004 18.6 30.690000000000005Q16.86 30.060000000000002 15.42 30.060000000000002Q14.04 30.060000000000002 13.44 30.450000000000003Q12.84 30.840000000000003 12.84 31.500000000000004Q12.84 32.28 13.83 32.760000000000005Q14.82 33.24 16.41 33.63Q18.0 34.02 19.71 34.620000000000005Q21.419999999999998 35.22 23.009999999999998 36.27Q24.599999999999998 37.32000000000001 25.589999999999996 39.06Q26.58 40.800000000000004 26.58 43.56Q26.58 47.940000000000005 23.22 50.49000000000001Q19.86 53.040000000000006 14.219999999999999 53.040000000000006Z M47.76 52.2 39.36 38.220000000000006V52.2H28.919999999999998V8.460000000000008H39.36V35.58L47.7 22.860000000000003H59.16L49.26 36.6L59.76 52.2Z M66.72 52.2 57.42 22.860000000000003H67.5L71.64 38.940000000000005L76.56 22.860000000000003H85.86L90.78 38.940000000000005L94.98 22.860000000000003H105.06L95.75999999999999 52.2H86.34L81.24000000000001 35.64L76.02 52.2Z M107.7 64.62 114.06 50.7 102.9 22.860000000000003H114.06L119.1 39.72L124.14 22.860000000000003H135.3L123.24000000000001 52.260000000000005L118.2 64.62Z M148.56 52.800000000000004Q144.3 52.800000000000004 141.06 50.82000000000001Q137.82 48.84 135.99 45.39Q134.16 41.940000000000005 134.16 37.56Q134.16 33.120000000000005 135.99 29.640000000000004Q137.82 26.160000000000004 141.03 24.210000000000004Q144.24 22.260000000000005 148.56 22.260000000000005Q151.32 22.260000000000005 153.72 23.220000000000002Q154.74 23.640000000000004 155.58 24.240000000000006V8.460000000000008H166.02V52.2H155.76V50.52Q154.8 51.18 153.72 51.660000000000004Q151.32 52.800000000000004 148.56 52.800000000000004ZM150.42000000000002 43.5Q152.16 43.5 153.42000000000002 42.75Q154.68 42.0 155.43 40.650000000000006Q156.18 39.300000000000004 156.18 37.5Q156.18 35.760000000000005 155.46 34.440000000000005Q154.74 33.120000000000005 153.45 32.34Q152.16 31.560000000000002 150.48000000000002 31.560000000000002Q148.8 31.560000000000002 147.51 32.34Q146.22 33.120000000000005 145.47 34.470000000000006Q144.72 35.82000000000001 144.72 37.5Q144.72 39.24 145.44 40.59Q146.16 41.940000000000005 147.48000000000002 42.72Q148.8 43.5 150.42000000000002 43.5Z" style="fill:var(--sk-ink,#1E3A8A)!important;stroke:none!important"/>${({pos:'<rect x="61.41" y="70" width="46.26" height="4" style="fill:#9CC70F!important;stroke:none!important"/><path d="M71.23200000000001 96.11999999999999Q69.98400000000001 96.11999999999999 68.97600000000001 95.592Q68.376 95.304 67.92000000000002 94.848V100.728H64.80000000000001V84.288H67.944V85.32Q68.4 84.88799999999999 69.00000000000001 84.576Q69.98400000000001 84.048 71.23200000000001 84.048Q72.84 84.048 74.11200000000001 84.84Q75.38400000000001 85.63199999999999 76.11600000000001 87.0Q76.84800000000001 88.368 76.84800000000001 90.09599999999999Q76.84800000000001 91.8 76.11600000000001 93.168Q75.38400000000001 94.536 74.11200000000001 95.328Q72.84 96.11999999999999 71.23200000000001 96.11999999999999ZM70.68 93.216Q71.54400000000001 93.216 72.21600000000001 92.82Q72.888 92.42399999999999 73.26 91.716Q73.632 91.008 73.632 90.072Q73.632 89.16 73.26 88.452Q72.888 87.744 72.21600000000001 87.348Q71.54400000000001 86.952 70.68 86.952Q69.84 86.952 69.168 87.348Q68.49600000000001 87.744 68.12400000000001 88.452Q67.75200000000001 89.16 67.75200000000001 90.072Q67.75200000000001 91.008 68.12400000000001 91.716Q68.49600000000001 92.42399999999999 69.156 92.82Q69.816 93.216 70.68 93.216Z M86.28000000000002 96.11999999999999Q84.528 96.11999999999999 83.12400000000001 95.316Q81.72000000000001 94.512 80.89200000000001 93.132Q80.06400000000001 91.752 80.06400000000001 90.048Q80.06400000000001 88.344 80.88000000000001 86.988Q81.69600000000001 85.63199999999999 83.11200000000001 84.828Q84.528 84.024 86.25600000000001 84.024Q88.03200000000001 84.024 89.436 84.828Q90.84000000000002 85.63199999999999 91.656 86.988Q92.47200000000001 88.344 92.47200000000001 90.048Q92.47200000000001 91.752 91.656 93.132Q90.84000000000002 94.512 89.436 95.316Q88.03200000000001 96.11999999999999 86.28000000000002 96.11999999999999ZM86.25600000000001 93.192Q87.144 93.192 87.828 92.79599999999999Q88.51200000000001 92.39999999999999 88.88400000000001 91.692Q89.25600000000001 90.984 89.25600000000001 90.072Q89.25600000000001 89.16 88.87200000000001 88.464Q88.48800000000001 87.768 87.816 87.372Q87.144 86.976 86.25600000000001 86.976Q85.39200000000001 86.976 84.72000000000001 87.372Q84.04800000000002 87.768 83.66400000000002 88.464Q83.28000000000002 89.16 83.28000000000002 90.072Q83.28000000000002 90.984 83.66400000000002 91.692Q84.04800000000002 92.39999999999999 84.72000000000001 92.79599999999999Q85.39200000000001 93.192 86.25600000000001 93.192Z M100.39200000000002 96.14399999999999Q99.40800000000002 96.14399999999999 98.46000000000001 95.88Q97.51200000000001 95.616 96.72000000000003 95.148Q95.92800000000003 94.67999999999999 95.35200000000002 94.008L97.22400000000002 92.112Q97.82400000000003 92.78399999999999 98.61600000000001 93.11999999999999Q99.40800000000002 93.45599999999999 100.36800000000002 93.45599999999999Q101.13600000000002 93.45599999999999 101.53200000000002 93.24Q101.92800000000003 93.024 101.92800000000003 92.592Q101.92800000000003 92.112 101.50800000000002 91.84799999999998Q101.08800000000002 91.58399999999999 100.41600000000003 91.404Q99.74400000000001 91.22399999999999 99.01200000000001 90.996Q98.28000000000002 90.768 97.60800000000002 90.396Q96.93600000000002 90.024 96.51600000000002 89.364Q96.09600000000002 88.704 96.09600000000002 87.648Q96.09600000000002 86.544 96.63600000000002 85.728Q97.17600000000002 84.91199999999999 98.18400000000003 84.45599999999999Q99.19200000000002 84.0 100.56000000000002 84.0Q102.00000000000001 84.0 103.16400000000002 84.50399999999999Q104.32800000000002 85.008 105.09600000000002 86.01599999999999L103.20000000000002 87.91199999999999Q102.67200000000003 87.264 102.01200000000003 86.976Q101.35200000000002 86.68799999999999 100.58400000000002 86.68799999999999Q99.88800000000002 86.68799999999999 99.51600000000002 86.904Q99.14400000000002 87.11999999999999 99.14400000000002 87.50399999999999Q99.14400000000002 87.93599999999999 99.56400000000002 88.17599999999999Q99.98400000000002 88.416 100.65600000000002 88.596Q101.32800000000002 88.776 102.06000000000002 89.00399999999999Q102.79200000000002 89.232 103.45200000000003 89.64Q104.11200000000002 90.048 104.53200000000002 90.72Q104.95200000000003 91.392 104.95200000000003 92.448Q104.95200000000003 94.152 103.72800000000002 95.148Q102.50400000000002 96.14399999999999 100.39200000000002 96.14399999999999Z" style="fill:var(--sk-ink,#1E3A8A)!important;stroke:none!important"/>',hub:'<rect x="60.48" y="70" width="48.11" height="4" style="fill:#9CC70F!important;stroke:none!important"/><path d="M71.67600000000002 95.88V89.232Q71.67600000000002 88.19999999999999 71.02800000000002 87.55199999999999Q70.38000000000001 86.904 69.34800000000001 86.904Q68.67600000000002 86.904 68.14800000000001 87.192Q67.62 87.47999999999999 67.32000000000001 88.008Q67.02000000000001 88.536 67.02000000000001 89.232V95.88H63.87600000000001V78.52799999999999H67.02000000000001V85.344Q67.42800000000001 84.93599999999999 67.98 84.624Q68.98800000000001 84.048 70.30800000000002 84.048Q71.62800000000001 84.048 72.64800000000001 84.624Q73.668 85.19999999999999 74.244 86.208Q74.82000000000001 87.216 74.82000000000001 88.536V95.88Z M84.22800000000001 96.11999999999999Q82.69200000000001 96.11999999999999 81.50400000000002 95.472Q80.31600000000002 94.824 79.644 93.672Q78.97200000000001 92.52 78.97200000000001 91.008V84.288H82.14000000000001V90.93599999999999Q82.14000000000001 91.65599999999999 82.38000000000001 92.172Q82.62 92.68799999999999 83.10000000000001 92.952Q83.58000000000001 93.216 84.22800000000001 93.216Q85.21200000000002 93.216 85.76400000000001 92.61599999999999Q86.316 92.01599999999999 86.316 90.93599999999999V84.288H89.46000000000001V91.008Q89.46000000000001 92.544 88.80000000000001 93.696Q88.14000000000001 94.848 86.95200000000001 95.484Q85.76400000000001 96.11999999999999 84.22800000000001 96.11999999999999Z M100.308 96.11999999999999Q99.06 96.11999999999999 98.052 95.592Q97.45200000000001 95.28 96.99600000000001 94.824V95.88H93.876V78.52799999999999H97.02000000000001V85.29599999999999Q97.47600000000001 84.83999999999999 98.07600000000001 84.55199999999999Q99.084 84.048 100.308 84.048Q101.91600000000001 84.048 103.18800000000002 84.84Q104.46000000000001 85.63199999999999 105.19200000000001 87.0Q105.924 88.368 105.924 90.09599999999999Q105.924 91.8 105.19200000000001 93.168Q104.46000000000001 94.536 103.18800000000002 95.328Q101.91600000000001 96.11999999999999 100.308 96.11999999999999ZM99.78000000000002 93.216Q100.644 93.216 101.304 92.82Q101.96400000000001 92.42399999999999 102.33600000000001 91.716Q102.70800000000001 91.008 102.70800000000001 90.072Q102.70800000000001 89.16 102.33600000000001 88.452Q101.96400000000001 87.744 101.292 87.348Q100.62 86.952 99.756 86.952Q98.89200000000001 86.952 98.232 87.348Q97.572 87.744 97.2 88.452Q96.828 89.16 96.828 90.072Q96.828 91.008 97.2 91.716Q97.572 92.42399999999999 98.244 92.82Q98.91600000000001 93.216 99.78000000000002 93.216Z" style="fill:var(--sk-ink,#1E3A8A)!important;stroke:none!important"/>',portal:'<rect x="43.96" y="70" width="81.16" height="4" style="fill:#9CC70F!important;stroke:none!important"/><path d="M53.784000000000006 96.11999999999999Q52.53600000000001 96.11999999999999 51.528000000000006 95.592Q50.92800000000001 95.304 50.47200000000001 94.848V100.728H47.35200000000001V84.288H50.49600000000001V85.32Q50.952000000000005 84.88799999999999 51.55200000000001 84.576Q52.53600000000001 84.048 53.784000000000006 84.048Q55.39200000000001 84.048 56.66400000000001 84.84Q57.93600000000001 85.63199999999999 58.668000000000006 87.0Q59.400000000000006 88.368 59.400000000000006 90.09599999999999Q59.400000000000006 91.8 58.668000000000006 93.168Q57.93600000000001 94.536 56.66400000000001 95.328Q55.39200000000001 96.11999999999999 53.784000000000006 96.11999999999999ZM53.232000000000006 93.216Q54.09600000000001 93.216 54.768000000000015 92.82Q55.44000000000001 92.42399999999999 55.81200000000001 91.716Q56.18400000000001 91.008 56.18400000000001 90.072Q56.18400000000001 89.16 55.81200000000001 88.452Q55.44000000000001 87.744 54.768000000000015 87.348Q54.09600000000001 86.952 53.232000000000006 86.952Q52.39200000000001 86.952 51.72000000000001 87.348Q51.04800000000001 87.744 50.67600000000001 88.452Q50.30400000000001 89.16 50.30400000000001 90.072Q50.30400000000001 91.008 50.67600000000001 91.716Q51.04800000000001 92.42399999999999 51.70800000000001 92.82Q52.36800000000001 93.216 53.232000000000006 93.216Z M68.83200000000001 96.11999999999999Q67.08 96.11999999999999 65.676 95.316Q64.272 94.512 63.444 93.132Q62.61600000000001 91.752 62.61600000000001 90.048Q62.61600000000001 88.344 63.432 86.988Q64.248 85.63199999999999 65.664 84.828Q67.08 84.024 68.808 84.024Q70.584 84.024 71.988 84.828Q73.39200000000001 85.63199999999999 74.208 86.988Q75.024 88.344 75.024 90.048Q75.024 91.752 74.208 93.132Q73.39200000000001 94.512 71.988 95.316Q70.584 96.11999999999999 68.83200000000001 96.11999999999999ZM68.808 93.192Q69.696 93.192 70.38 92.79599999999999Q71.06400000000001 92.39999999999999 71.436 91.692Q71.808 90.984 71.808 90.072Q71.808 89.16 71.424 88.464Q71.04 87.768 70.368 87.372Q69.696 86.976 68.808 86.976Q67.944 86.976 67.272 87.372Q66.60000000000001 87.768 66.21600000000001 88.464Q65.83200000000001 89.16 65.83200000000001 90.072Q65.83200000000001 90.984 66.21600000000001 91.692Q66.60000000000001 92.39999999999999 67.272 92.79599999999999Q67.944 93.192 68.808 93.192Z M78.96000000000001 95.88V84.288H82.10400000000001V85.32Q82.10400000000001 85.29599999999999 82.12800000000001 85.27199999999999Q83.16000000000001 84.048 85.10400000000001 84.048Q85.94400000000002 84.048 86.61600000000001 84.324Q87.28800000000001 84.6 87.84000000000002 85.22399999999999L85.87200000000001 87.47999999999999Q85.60800000000002 87.192 85.23600000000002 87.048Q84.86400000000002 86.904 84.38400000000001 86.904Q83.376 86.904 82.74000000000001 87.53999999999999Q82.10400000000001 88.176 82.10400000000001 89.472V95.88Z M93.00000000000001 95.88V87.048H90.28800000000001V84.288H93.00000000000001V79.464H96.144V84.288H98.85600000000001V87.048H96.144V95.88Z M107.4 96.11999999999999Q105.81600000000002 96.11999999999999 104.54400000000001 95.328Q103.272 94.536 102.552 93.168Q101.83200000000001 91.8 101.83200000000001 90.09599999999999Q101.83200000000001 88.368 102.552 87.0Q103.272 85.63199999999999 104.54400000000001 84.84Q105.81600000000002 84.048 107.4 84.048Q108.64800000000001 84.048 109.632 84.55199999999999Q110.28000000000002 84.88799999999999 110.76 85.392V84.288H113.88000000000001V95.88H110.76V94.752Q110.28000000000002 95.256 109.632 95.592Q108.64800000000001 96.11999999999999 107.4 96.11999999999999ZM107.97600000000001 93.216Q109.296 93.216 110.11200000000001 92.34Q110.92800000000001 91.464 110.92800000000001 90.072Q110.92800000000001 89.16 110.55600000000001 88.452Q110.18400000000001 87.744 109.524 87.348Q108.864 86.952 107.97600000000001 86.952Q107.11200000000001 86.952 106.45200000000001 87.348Q105.79200000000002 87.744 105.42000000000002 88.452Q105.04800000000002 89.16 105.04800000000002 90.072Q105.04800000000002 91.008 105.42000000000002 91.716Q105.79200000000002 92.42399999999999 106.45200000000001 92.82Q107.11200000000001 93.216 107.97600000000001 93.216Z M118.584 95.88V78.52799999999999H121.72800000000001V95.88Z" style="fill:var(--sk-ink,#1E3A8A)!important;stroke:none!important"/>'})[(document.title.includes("POS") ? "pos" : document.title.includes("Insights") ? "hub" : "portal")]}</svg></div><svg class="wk-big" viewBox="0 0 120 124"><g transform="translate(0 3)"><path d="M60 10 C82 10 94 32 94 54 C94 70 82 78 60 78 C38 78 26 70 26 54 C26 32 38 10 60 10Z" style="fill:none!important;stroke:var(--sk-ink,#1E3A8A)!important" stroke-width="5.5" stroke-linejoin="round"/><path d="M38 74 C34 92 22 94 24 104 C26 110 34 106 30 101 M50 78 C50 94 44 104 48 110 M60 78 V108 C60 112 66 112 64 107 M70 78 C70 94 76 104 72 110 M82 74 C86 92 98 94 96 104 C94 110 86 106 90 101" style="fill:none!important;stroke:var(--sk-ink,#1E3A8A)!important" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M48 50h0M72 50h0" style="fill:none!important;stroke:var(--sk-ink,#1E3A8A)!important" stroke-width="8.8" stroke-linecap="round"/></g></svg><div class="wk-tag"><h2>Every branch, order and shift in one place.</h2><p>POS, back office, online ordering and your team.</p></div></div><form class="wk-card" autocomplete="on"><div class="f2gate"><svg viewBox="0 0 169.1 181" height="150" width="140.1" role="img" aria-label="skwyd"><g transform="translate(34.54 0) scale(0.83333)"><path d="M60 10 C82 10 94 32 94 54 C94 70 82 78 60 78 C38 78 26 70 26 54 C26 32 38 10 60 10Z" style="fill:none!important;stroke:var(--sk-ink,#1E3A8A)!important" stroke-width="5" stroke-linejoin="round"/><path d="M38 74 C34 92 22 94 24 104 C26 110 34 106 30 101 M50 78 C50 94 44 104 48 110 M60 78 V108 C60 112 66 112 64 107 M70 78 C70 94 76 104 72 110 M82 74 C86 92 98 94 96 104 C94 110 86 106 90 101" style="fill:none!important;stroke:var(--sk-ink,#1E3A8A)!important" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M48 50h0M72 50h0" style="fill:none!important;stroke:var(--sk-ink,#1E3A8A)!important" stroke-width="9" stroke-linecap="round"/></g><g transform="translate(0 82)"><path d="M14.219999999999999 53.040000000000006Q11.52 53.040000000000006 8.91 52.32000000000001Q6.3 51.6 4.05 50.370000000000005Q1.7999999999999998 49.14 0.24 47.52L5.9399999999999995 41.7Q7.38 43.2 9.39 44.040000000000006Q11.4 44.88 13.68 44.88Q15.0 44.88 15.69 44.52Q16.38 44.160000000000004 16.38 43.5Q16.38 42.540000000000006 15.389999999999999 42.03Q14.399999999999999 41.52 12.809999999999999 41.13Q11.219999999999999 40.74 9.479999999999999 40.17Q7.739999999999999 39.6 6.119999999999999 38.64Q4.5 37.68000000000001 3.51 35.940000000000005Q2.52 34.2 2.52 31.500000000000004Q2.52 28.680000000000003 4.05 26.550000000000004Q5.58 24.420000000000005 8.34 23.190000000000005Q11.1 21.960000000000004 14.82 21.960000000000004Q18.599999999999998 21.960000000000004 22.019999999999996 23.250000000000004Q25.439999999999998 24.540000000000003 27.54 27.120000000000005L21.779999999999998 32.940000000000005Q20.34 31.320000000000004 18.6 30.690000000000005Q16.86 30.060000000000002 15.42 30.060000000000002Q14.04 30.060000000000002 13.44 30.450000000000003Q12.84 30.840000000000003 12.84 31.500000000000004Q12.84 32.28 13.83 32.760000000000005Q14.82 33.24 16.41 33.63Q18.0 34.02 19.71 34.620000000000005Q21.419999999999998 35.22 23.009999999999998 36.27Q24.599999999999998 37.32000000000001 25.589999999999996 39.06Q26.58 40.800000000000004 26.58 43.56Q26.58 47.940000000000005 23.22 50.49000000000001Q19.86 53.040000000000006 14.219999999999999 53.040000000000006Z M47.76 52.2 39.36 38.220000000000006V52.2H28.919999999999998V8.460000000000008H39.36V35.58L47.7 22.860000000000003H59.16L49.26 36.6L59.76 52.2Z M66.72 52.2 57.42 22.860000000000003H67.5L71.64 38.940000000000005L76.56 22.860000000000003H85.86L90.78 38.940000000000005L94.98 22.860000000000003H105.06L95.75999999999999 52.2H86.34L81.24000000000001 35.64L76.02 52.2Z M107.7 64.62 114.06 50.7 102.9 22.860000000000003H114.06L119.1 39.72L124.14 22.860000000000003H135.3L123.24000000000001 52.260000000000005L118.2 64.62Z M148.56 52.800000000000004Q144.3 52.800000000000004 141.06 50.82000000000001Q137.82 48.84 135.99 45.39Q134.16 41.940000000000005 134.16 37.56Q134.16 33.120000000000005 135.99 29.640000000000004Q137.82 26.160000000000004 141.03 24.210000000000004Q144.24 22.260000000000005 148.56 22.260000000000005Q151.32 22.260000000000005 153.72 23.220000000000002Q154.74 23.640000000000004 155.58 24.240000000000006V8.460000000000008H166.02V52.2H155.76V50.52Q154.8 51.18 153.72 51.660000000000004Q151.32 52.800000000000004 148.56 52.800000000000004ZM150.42000000000002 43.5Q152.16 43.5 153.42000000000002 42.75Q154.68 42.0 155.43 40.650000000000006Q156.18 39.300000000000004 156.18 37.5Q156.18 35.760000000000005 155.46 34.440000000000005Q154.74 33.120000000000005 153.45 32.34Q152.16 31.560000000000002 150.48000000000002 31.560000000000002Q148.8 31.560000000000002 147.51 32.34Q146.22 33.120000000000005 145.47 34.470000000000006Q144.72 35.82000000000001 144.72 37.5Q144.72 39.24 145.44 40.59Q146.16 41.940000000000005 147.48000000000002 42.72Q148.8 43.5 150.42000000000002 43.5Z" style="fill:var(--sk-ink,#1E3A8A)!important;stroke:none!important"/>${({pos:'<rect x="61.41" y="70" width="46.26" height="4" style="fill:#9CC70F!important;stroke:none!important"/><path d="M71.23200000000001 96.11999999999999Q69.98400000000001 96.11999999999999 68.97600000000001 95.592Q68.376 95.304 67.92000000000002 94.848V100.728H64.80000000000001V84.288H67.944V85.32Q68.4 84.88799999999999 69.00000000000001 84.576Q69.98400000000001 84.048 71.23200000000001 84.048Q72.84 84.048 74.11200000000001 84.84Q75.38400000000001 85.63199999999999 76.11600000000001 87.0Q76.84800000000001 88.368 76.84800000000001 90.09599999999999Q76.84800000000001 91.8 76.11600000000001 93.168Q75.38400000000001 94.536 74.11200000000001 95.328Q72.84 96.11999999999999 71.23200000000001 96.11999999999999ZM70.68 93.216Q71.54400000000001 93.216 72.21600000000001 92.82Q72.888 92.42399999999999 73.26 91.716Q73.632 91.008 73.632 90.072Q73.632 89.16 73.26 88.452Q72.888 87.744 72.21600000000001 87.348Q71.54400000000001 86.952 70.68 86.952Q69.84 86.952 69.168 87.348Q68.49600000000001 87.744 68.12400000000001 88.452Q67.75200000000001 89.16 67.75200000000001 90.072Q67.75200000000001 91.008 68.12400000000001 91.716Q68.49600000000001 92.42399999999999 69.156 92.82Q69.816 93.216 70.68 93.216Z M86.28000000000002 96.11999999999999Q84.528 96.11999999999999 83.12400000000001 95.316Q81.72000000000001 94.512 80.89200000000001 93.132Q80.06400000000001 91.752 80.06400000000001 90.048Q80.06400000000001 88.344 80.88000000000001 86.988Q81.69600000000001 85.63199999999999 83.11200000000001 84.828Q84.528 84.024 86.25600000000001 84.024Q88.03200000000001 84.024 89.436 84.828Q90.84000000000002 85.63199999999999 91.656 86.988Q92.47200000000001 88.344 92.47200000000001 90.048Q92.47200000000001 91.752 91.656 93.132Q90.84000000000002 94.512 89.436 95.316Q88.03200000000001 96.11999999999999 86.28000000000002 96.11999999999999ZM86.25600000000001 93.192Q87.144 93.192 87.828 92.79599999999999Q88.51200000000001 92.39999999999999 88.88400000000001 91.692Q89.25600000000001 90.984 89.25600000000001 90.072Q89.25600000000001 89.16 88.87200000000001 88.464Q88.48800000000001 87.768 87.816 87.372Q87.144 86.976 86.25600000000001 86.976Q85.39200000000001 86.976 84.72000000000001 87.372Q84.04800000000002 87.768 83.66400000000002 88.464Q83.28000000000002 89.16 83.28000000000002 90.072Q83.28000000000002 90.984 83.66400000000002 91.692Q84.04800000000002 92.39999999999999 84.72000000000001 92.79599999999999Q85.39200000000001 93.192 86.25600000000001 93.192Z M100.39200000000002 96.14399999999999Q99.40800000000002 96.14399999999999 98.46000000000001 95.88Q97.51200000000001 95.616 96.72000000000003 95.148Q95.92800000000003 94.67999999999999 95.35200000000002 94.008L97.22400000000002 92.112Q97.82400000000003 92.78399999999999 98.61600000000001 93.11999999999999Q99.40800000000002 93.45599999999999 100.36800000000002 93.45599999999999Q101.13600000000002 93.45599999999999 101.53200000000002 93.24Q101.92800000000003 93.024 101.92800000000003 92.592Q101.92800000000003 92.112 101.50800000000002 91.84799999999998Q101.08800000000002 91.58399999999999 100.41600000000003 91.404Q99.74400000000001 91.22399999999999 99.01200000000001 90.996Q98.28000000000002 90.768 97.60800000000002 90.396Q96.93600000000002 90.024 96.51600000000002 89.364Q96.09600000000002 88.704 96.09600000000002 87.648Q96.09600000000002 86.544 96.63600000000002 85.728Q97.17600000000002 84.91199999999999 98.18400000000003 84.45599999999999Q99.19200000000002 84.0 100.56000000000002 84.0Q102.00000000000001 84.0 103.16400000000002 84.50399999999999Q104.32800000000002 85.008 105.09600000000002 86.01599999999999L103.20000000000002 87.91199999999999Q102.67200000000003 87.264 102.01200000000003 86.976Q101.35200000000002 86.68799999999999 100.58400000000002 86.68799999999999Q99.88800000000002 86.68799999999999 99.51600000000002 86.904Q99.14400000000002 87.11999999999999 99.14400000000002 87.50399999999999Q99.14400000000002 87.93599999999999 99.56400000000002 88.17599999999999Q99.98400000000002 88.416 100.65600000000002 88.596Q101.32800000000002 88.776 102.06000000000002 89.00399999999999Q102.79200000000002 89.232 103.45200000000003 89.64Q104.11200000000002 90.048 104.53200000000002 90.72Q104.95200000000003 91.392 104.95200000000003 92.448Q104.95200000000003 94.152 103.72800000000002 95.148Q102.50400000000002 96.14399999999999 100.39200000000002 96.14399999999999Z" style="fill:var(--sk-ink,#1E3A8A)!important;stroke:none!important"/>',hub:'<rect x="60.48" y="70" width="48.11" height="4" style="fill:#9CC70F!important;stroke:none!important"/><path d="M71.67600000000002 95.88V89.232Q71.67600000000002 88.19999999999999 71.02800000000002 87.55199999999999Q70.38000000000001 86.904 69.34800000000001 86.904Q68.67600000000002 86.904 68.14800000000001 87.192Q67.62 87.47999999999999 67.32000000000001 88.008Q67.02000000000001 88.536 67.02000000000001 89.232V95.88H63.87600000000001V78.52799999999999H67.02000000000001V85.344Q67.42800000000001 84.93599999999999 67.98 84.624Q68.98800000000001 84.048 70.30800000000002 84.048Q71.62800000000001 84.048 72.64800000000001 84.624Q73.668 85.19999999999999 74.244 86.208Q74.82000000000001 87.216 74.82000000000001 88.536V95.88Z M84.22800000000001 96.11999999999999Q82.69200000000001 96.11999999999999 81.50400000000002 95.472Q80.31600000000002 94.824 79.644 93.672Q78.97200000000001 92.52 78.97200000000001 91.008V84.288H82.14000000000001V90.93599999999999Q82.14000000000001 91.65599999999999 82.38000000000001 92.172Q82.62 92.68799999999999 83.10000000000001 92.952Q83.58000000000001 93.216 84.22800000000001 93.216Q85.21200000000002 93.216 85.76400000000001 92.61599999999999Q86.316 92.01599999999999 86.316 90.93599999999999V84.288H89.46000000000001V91.008Q89.46000000000001 92.544 88.80000000000001 93.696Q88.14000000000001 94.848 86.95200000000001 95.484Q85.76400000000001 96.11999999999999 84.22800000000001 96.11999999999999Z M100.308 96.11999999999999Q99.06 96.11999999999999 98.052 95.592Q97.45200000000001 95.28 96.99600000000001 94.824V95.88H93.876V78.52799999999999H97.02000000000001V85.29599999999999Q97.47600000000001 84.83999999999999 98.07600000000001 84.55199999999999Q99.084 84.048 100.308 84.048Q101.91600000000001 84.048 103.18800000000002 84.84Q104.46000000000001 85.63199999999999 105.19200000000001 87.0Q105.924 88.368 105.924 90.09599999999999Q105.924 91.8 105.19200000000001 93.168Q104.46000000000001 94.536 103.18800000000002 95.328Q101.91600000000001 96.11999999999999 100.308 96.11999999999999ZM99.78000000000002 93.216Q100.644 93.216 101.304 92.82Q101.96400000000001 92.42399999999999 102.33600000000001 91.716Q102.70800000000001 91.008 102.70800000000001 90.072Q102.70800000000001 89.16 102.33600000000001 88.452Q101.96400000000001 87.744 101.292 87.348Q100.62 86.952 99.756 86.952Q98.89200000000001 86.952 98.232 87.348Q97.572 87.744 97.2 88.452Q96.828 89.16 96.828 90.072Q96.828 91.008 97.2 91.716Q97.572 92.42399999999999 98.244 92.82Q98.91600000000001 93.216 99.78000000000002 93.216Z" style="fill:var(--sk-ink,#1E3A8A)!important;stroke:none!important"/>',portal:'<rect x="43.96" y="70" width="81.16" height="4" style="fill:#9CC70F!important;stroke:none!important"/><path d="M53.784000000000006 96.11999999999999Q52.53600000000001 96.11999999999999 51.528000000000006 95.592Q50.92800000000001 95.304 50.47200000000001 94.848V100.728H47.35200000000001V84.288H50.49600000000001V85.32Q50.952000000000005 84.88799999999999 51.55200000000001 84.576Q52.53600000000001 84.048 53.784000000000006 84.048Q55.39200000000001 84.048 56.66400000000001 84.84Q57.93600000000001 85.63199999999999 58.668000000000006 87.0Q59.400000000000006 88.368 59.400000000000006 90.09599999999999Q59.400000000000006 91.8 58.668000000000006 93.168Q57.93600000000001 94.536 56.66400000000001 95.328Q55.39200000000001 96.11999999999999 53.784000000000006 96.11999999999999ZM53.232000000000006 93.216Q54.09600000000001 93.216 54.768000000000015 92.82Q55.44000000000001 92.42399999999999 55.81200000000001 91.716Q56.18400000000001 91.008 56.18400000000001 90.072Q56.18400000000001 89.16 55.81200000000001 88.452Q55.44000000000001 87.744 54.768000000000015 87.348Q54.09600000000001 86.952 53.232000000000006 86.952Q52.39200000000001 86.952 51.72000000000001 87.348Q51.04800000000001 87.744 50.67600000000001 88.452Q50.30400000000001 89.16 50.30400000000001 90.072Q50.30400000000001 91.008 50.67600000000001 91.716Q51.04800000000001 92.42399999999999 51.70800000000001 92.82Q52.36800000000001 93.216 53.232000000000006 93.216Z M68.83200000000001 96.11999999999999Q67.08 96.11999999999999 65.676 95.316Q64.272 94.512 63.444 93.132Q62.61600000000001 91.752 62.61600000000001 90.048Q62.61600000000001 88.344 63.432 86.988Q64.248 85.63199999999999 65.664 84.828Q67.08 84.024 68.808 84.024Q70.584 84.024 71.988 84.828Q73.39200000000001 85.63199999999999 74.208 86.988Q75.024 88.344 75.024 90.048Q75.024 91.752 74.208 93.132Q73.39200000000001 94.512 71.988 95.316Q70.584 96.11999999999999 68.83200000000001 96.11999999999999ZM68.808 93.192Q69.696 93.192 70.38 92.79599999999999Q71.06400000000001 92.39999999999999 71.436 91.692Q71.808 90.984 71.808 90.072Q71.808 89.16 71.424 88.464Q71.04 87.768 70.368 87.372Q69.696 86.976 68.808 86.976Q67.944 86.976 67.272 87.372Q66.60000000000001 87.768 66.21600000000001 88.464Q65.83200000000001 89.16 65.83200000000001 90.072Q65.83200000000001 90.984 66.21600000000001 91.692Q66.60000000000001 92.39999999999999 67.272 92.79599999999999Q67.944 93.192 68.808 93.192Z M78.96000000000001 95.88V84.288H82.10400000000001V85.32Q82.10400000000001 85.29599999999999 82.12800000000001 85.27199999999999Q83.16000000000001 84.048 85.10400000000001 84.048Q85.94400000000002 84.048 86.61600000000001 84.324Q87.28800000000001 84.6 87.84000000000002 85.22399999999999L85.87200000000001 87.47999999999999Q85.60800000000002 87.192 85.23600000000002 87.048Q84.86400000000002 86.904 84.38400000000001 86.904Q83.376 86.904 82.74000000000001 87.53999999999999Q82.10400000000001 88.176 82.10400000000001 89.472V95.88Z M93.00000000000001 95.88V87.048H90.28800000000001V84.288H93.00000000000001V79.464H96.144V84.288H98.85600000000001V87.048H96.144V95.88Z M107.4 96.11999999999999Q105.81600000000002 96.11999999999999 104.54400000000001 95.328Q103.272 94.536 102.552 93.168Q101.83200000000001 91.8 101.83200000000001 90.09599999999999Q101.83200000000001 88.368 102.552 87.0Q103.272 85.63199999999999 104.54400000000001 84.84Q105.81600000000002 84.048 107.4 84.048Q108.64800000000001 84.048 109.632 84.55199999999999Q110.28000000000002 84.88799999999999 110.76 85.392V84.288H113.88000000000001V95.88H110.76V94.752Q110.28000000000002 95.256 109.632 95.592Q108.64800000000001 96.11999999999999 107.4 96.11999999999999ZM107.97600000000001 93.216Q109.296 93.216 110.11200000000001 92.34Q110.92800000000001 91.464 110.92800000000001 90.072Q110.92800000000001 89.16 110.55600000000001 88.452Q110.18400000000001 87.744 109.524 87.348Q108.864 86.952 107.97600000000001 86.952Q107.11200000000001 86.952 106.45200000000001 87.348Q105.79200000000002 87.744 105.42000000000002 88.452Q105.04800000000002 89.16 105.04800000000002 90.072Q105.04800000000002 91.008 105.42000000000002 91.716Q105.79200000000002 92.42399999999999 106.45200000000001 92.82Q107.11200000000001 93.216 107.97600000000001 93.216Z M118.584 95.88V78.52799999999999H121.72800000000001V95.88Z" style="fill:var(--sk-ink,#1E3A8A)!important;stroke:none!important"/>'})[(document.title.includes("POS") ? "pos" : document.title.includes("Insights") ? "hub" : "portal")]}</g></svg></div><h1 class="wk-name" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">skwyd hub</h1><p>${document.title.includes("POS") ? "Sign in to start the register" : "Sign in to the back office"}</p>
        <label for="wkAcct">Account number</label><input id="wkAcct" inputmode="numeric" autocomplete="organization" required value="${ls.get("skwyd_acct", "") || ""}">
        <div id="wkPh"><label for="wkPhone">Phone number</label><div style="display:flex;gap:8px"><select id="wkCc" style="flex:0 0 96px;padding:11px 8px;border:1px solid #e5e3ec;border-radius:10px;font:inherit;background:#fff">${["+961","+971","+966","+974","+965","+973","+968","+962","+20","+90","+33","+44","+1"].map(c => `<option ${c===(ls.get("skwyd_ph_cc","+961")) ? "selected" : ""}>${c}</option>`).join("")}</select><input id="wkPhone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="70 123 456" value="${ls.get("skwyd_ph_n", "") || ""}"></div>
          <div id="wkCodeW" hidden><label for="wkCode">Code sent on WhatsApp</label><input id="wkCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6 digits" style="letter-spacing:.3em;text-align:center;font-weight:700"></div></div>
        <div id="wkEm" hidden><label for="wkEmail">Email</label><input id="wkEmail" type="email" autocomplete="username">
        <label for="wkPass">Password</label><input id="wkPass" type="password" autocomplete="current-password"></div>
        <button id="wkBtn">Send code on WhatsApp</button><a href="#" class="wk-forgot" id="wkMode">Sign in with email and password instead</a><a href="#" class="wk-forgot" id="wkForgot" hidden>Forgot password?</a>${!IS_POS && /skwydhub\.com$|pages\.dev$|localhost/.test(location.hostname) ? '<a href="/signup" class="wk-forgot">New to Skwyd Hub? Start a free trial</a>' : ""}${IS_POS ? '<a href="#" class="wk-forgot" id="wkAct">Activate with a device code</a>' : ""}<div class="wk-err" id="wkErr"></div></form>`;
      document.body.appendChild(el);
      el.querySelector("#wkAct")?.addEventListener("click", e => { e.preventDefault(); emailMode = false; gate(); });
      // employees sign in with their phone number and a code on WhatsApp; email + password stays for the owner as a fallback
      let pwMode = false, codeSent = "";
      const setMode = pw => { pwMode = pw; codeSent = ""; el.querySelector("#wkPh").hidden = pw; el.querySelector("#wkEm").hidden = !pw; el.querySelector("#wkForgot").hidden = !pw; el.querySelector("#wkCodeW").hidden = true;
        el.querySelector("#wkMode").textContent = pw ? "Sign in with your phone number instead" : "Sign in with email and password instead"; el.querySelector("#wkBtn").textContent = pw ? "Sign in" : "Send code on WhatsApp"; el.querySelector("#wkErr").textContent = ""; };
      el.querySelector("#wkMode").addEventListener("click", e => { e.preventDefault(); setMode(!pwMode); });
      el.querySelector("#wkPhone").addEventListener("input", () => { if(codeSent){ codeSent = ""; el.querySelector("#wkCodeW").hidden = true; el.querySelector("#wkBtn").textContent = "Send code on WhatsApp"; } });
      el.querySelector("#wkCode").addEventListener("input", e => { if(e.target.value.replace(/\D/g, "").length === 6) el.querySelector("form").requestSubmit(); });
      el._phone = async () => { const er = el.querySelector("#wkErr"), b = el.querySelector("#wkBtn"), cc = el.querySelector("#wkCc").value, n = el.querySelector("#wkPhone").value.replace(/\D/g, "").replace(/^0+/, "");
        if(n.length < 6){ er.textContent = "Enter your phone number."; return false; } const phone = cc + n;
        if(codeSent !== phone){ b.disabled = true; const { error } = await sb.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } }); b.disabled = false;
          if(error){ er.textContent = /not found|signups not allowed|user/i.test(error.message) ? "This number has no login. Ask the owner to turn on your login (Employee page)." : /provider|unsupported|disabled/i.test(error.message) ? "Sign in by phone isn't set up yet. Use email and password." : /rate|seconds/i.test(error.message) ? "Wait a minute, then try again." : error.message; return false; }
          codeSent = phone; ls.set("skwyd_ph_cc", cc); ls.set("skwyd_ph_n", n); el.querySelector("#wkCodeW").hidden = false; b.textContent = "Sign in"; er.style.color = "#1f7a3d"; er.textContent = "We sent a code on WhatsApp."; setTimeout(() => el.querySelector("#wkCode").focus(), 30); return false; }
        const k = el.querySelector("#wkCode").value.replace(/\D/g, ""); er.style.color = ""; if(k.length < 6){ er.textContent = "Enter the 6-digit code."; return false; }
        b.disabled = true; const { error } = await sb.auth.verifyOtp({ phone, token: k, type: "sms" }); b.disabled = false;
        if(error){ er.textContent = /expired|invalid/i.test(error.message) ? "Wrong or expired code." : error.message; return false; } return true; };
      el._pw = () => pwMode;
      el.querySelector("#wkForgot").addEventListener("click", async e => { e.preventDefault(); const em = el.querySelector("#wkEmail").value.trim(), er = el.querySelector("#wkErr");
        if(!em){ er.textContent = "Type your email first, then tap Forgot password."; el.querySelector("#wkEmail").focus(); return; }
        const { error } = await sb.auth.resetPasswordForEmail(em, { redirectTo: location.href.split("#")[0] });
        er.style.color = error ? "" : "#1f7a3d"; er.textContent = error ? error.message : "Check your email for a link to set a new password."; });
      el.querySelector("form").addEventListener("submit", async e => {
        e.preventDefault(); const b = el.querySelector("#wkBtn"); b.disabled = true; el.querySelector("#wkErr").textContent = "";
        const acct = el.querySelector("#wkAcct").value.replace(/\s+/g, "");
        if(!acct){ b.disabled = false; el.querySelector("#wkErr").textContent = "Enter your account number."; return; }
        if(!el._pw()){ b.disabled = false; if(!(await el._phone())) return; b.disabled = true; }
        else { const { error } = await sb.auth.signInWithPassword({ email: el.querySelector("#wkEmail").value.trim(), password: el.querySelector("#wkPass").value });
          if(error){ b.disabled = false; el.querySelector("#wkErr").textContent = error.message === "Invalid login credentials" ? "Wrong account number, email or password." : error.message; return; } }
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
