// Data for the register, the same rules as wokdb.js in device mode:
// - an activated tablet has no login; its secret device key goes in the x-slick-device header on every request
// - every collection is cached on the tablet, so the register opens and sells offline
// - the database rings a secret broadcast topic ("chg", { t: table }) and the register reloads that table
// (web: the URL polyfill is not needed)
import AsyncStorage from "./kv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://akrezmxgtorkuwxxctyk.supabase.co";
export const SUPABASE_KEY = "sb_publishable_tL62keD2HdovsMpI8XAkWg_TPdjaUVh"; // public key

export type Row = { id: string; [k: string]: any };

const TABLE: Record<string, string> = { users: "staff_users", work_shifts: "staff_shifts", work_requests: "staff_requests" };
export const tableOf = (c: string) => TABLE[c] || c;
const BACK: Record<string, string> = { open_time: "open", close_time: "close", table_no: "table" };
const camel = (k: string) => BACK[k] || k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

// a register may only read the menu columns the public can see: cost and recipes stay hidden
const DEVCOLS: Record<string, string> = {
  products: "id,name,name_ar,sku,category_id,price,tax_group,description,image_url,channels,branch_ids,active,deleted,created_at,brand_id,pricing_method,selling_method,calories,custom_prices,inactive_branch_ids,out_of_stock_branch_ids,modifiers,sort,variant_set_id,variants",
  modifiers: "id,name,name_ar,deleted,sort",
  modifier_options: "id,modifier_id,name,name_ar,price,custom_prices,inactive_branch_ids,out_of_stock_branch_ids,sort,active,deleted",
};

export function fromRow(col: string, r: any): Row {
  if (tableOf(col) === "settings") return { ...(r.data || {}), id: r.id, updatedAt: r.updated_at };
  const o: any = {};
  for (const [k, v] of Object.entries(r)) o[camel(k)] = v;
  if (o.no != null) o.no = String(o.no);
  return o as Row;
}

// what the register keeps: the same list as the current POS
export const COLLECTIONS = ["brands", "devices", "branches", "categories", "products", "orders", "shifts", "modifiers", "modifier_options",
  "taxes", "tax_groups", "payment_methods", "roles", "users", "settings", "day_closes", "charges", "order_sources"] as const;
export type Col = (typeof COLLECTIONS)[number];
export type Data = Record<Col, Row[]>;
export const emptyData = (): Data => Object.fromEntries(COLLECTIONS.map(c => [c, []])) as unknown as Data;

const K = { key: "skwyd_devkey", topic: "skwyd_devtopic", device: "wokDevice", cache: (c: string) => "skwyd_c_" + c };

export const isNet = (e: any) => !e || e.name === "AuthRetryableFetchError" || e.name === "AbortError" || e.status === 0 ||
  /failed to fetch|network|load failed|timeout|abort|offline/i.test(String(e.message || e));

export type DeviceKey = { key: string; topic: string; deviceId: string };

export async function readDeviceKey(): Promise<DeviceKey | null> {
  const [key, topic, deviceId] = await Promise.all([AsyncStorage.getItem(K.key), AsyncStorage.getItem(K.topic), AsyncStorage.getItem(K.device)]);
  return key && deviceId ? { key, topic: topic || "", deviceId: deviceId.replace(/^"|"$/g, "") } : null;
}
export async function forgetDevice() {
  await AsyncStorage.multiRemove([K.key, K.topic, K.device, ...COLLECTIONS.map(K.cache)]);
}

// activate with the 6-digit code from Manage → Devices: the server swaps it, once, for the secret device key
export async function activate(code: string): Promise<{ error?: string }> {
  const anon = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await anon.rpc("skwyd_activate_device_key", { p_code: code });
  if (error) return { error: isNet(error) ? "No internet. Connect and try again." : error.message };
  if (!data || data.error) return { error: data?.error === "plan" ? data.message || "Your plan doesn't include more devices." : "That code isn't right. Check it in Manage → Devices." };
  await AsyncStorage.multiSet([[K.key, data.key], [K.topic, data.topic || ""], [K.device, data.id]]);
  return {};
}

export function client(dk: DeviceKey): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: "skwyd-device-noauth" },
    global: { headers: { "x-skwyd-device": dk.key, "x-slick-device": dk.key } },
  });
}

export async function readCache(): Promise<Partial<Data>> {
  const pairs = await AsyncStorage.multiGet(COLLECTIONS.map(K.cache));
  const out: Partial<Data> = {};
  pairs.forEach(([, v], i) => { if (v) try { out[COLLECTIONS[i]] = JSON.parse(v); } catch {} });
  return out;
}

export async function fetchAll(sb: SupabaseClient, col: Col): Promise<Row[]> {
  const t = tableOf(col);
  let q: any = sb.from(t).select(DEVCOLS[t] || "*");
  if (t === "orders") q = q.gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()).order("created_at", { ascending: false }).limit(1500);
  else if (t === "shifts") q = q.gte("opened_at", new Date(Date.now() - 7 * 86400000).toISOString()).limit(1000);
  else q = q.limit(5000);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data as any[]).map(r => fromRow(col, r));
  AsyncStorage.setItem(K.cache(col), JSON.stringify(rows)).catch(() => {});
  return rows;
}

/** orders of a store from the server, newest first, for business days older than the tablet keeps (or all of them) */
export async function fetchOrders(sb: SupabaseClient, branchId: string, from: string | null, to: string | null, offset = 0, n = 200): Promise<Row[]> {
  let q: any = sb.from("orders").select(DEVCOLS.orders || "*").eq("branch_id", branchId);
  if (from) q = q.gte("created_at", new Date(+new Date(from + "T00:00:00") - 86400000).toISOString());
  if (to) q = q.lt("created_at", new Date(+new Date(to + "T00:00:00") + 2 * 86400000).toISOString());
  const { data, error } = await q.order("created_at", { ascending: false }).range(offset, offset + n - 1);
  if (error) throw error;
  return (data as any[]).map(r => fromRow("orders", r));
}

export async function deviceOk(sb: SupabaseClient): Promise<boolean | null> {
  try { const r = await sb.rpc("skwyd_device_ok"); return r.error ? null : !!r.data; } catch { return null; }
}

// the database's bell: a change to a table names it, and only that table is reloaded
export function listen(sb: SupabaseClient, topic: string, onChange: (table?: string) => void, onState: (ok: boolean) => void) {
  const ch = sb.channel(topic || "skwyd-none", { config: { broadcast: { self: false } } })
    .on("broadcast", { event: "chg" }, (m: any) => onChange(m?.payload?.t))
    .subscribe((st: string) => onState(st === "SUBSCRIBED"));
  return () => { sb.removeChannel(ch); };
}

/* ---------- writes: an outbox on the tablet, sent in order when there is a connection (wokdb.js offline layer) ---------- */
const COLS: Record<string, Set<string>> = Object.fromEntries(Object.entries({
  orders: "id brand_id no channel source type status branch_id device_id shift_id zone_id customer_name phone address lat lng table_no notes items subtotal discount_pct discount delivery_fee tax invoice_no total payment agent handled_by accepted_at done_at void_reason voided_at voided_by created_at charges charges_total receipt_notes guests voided_items returned_items refund_total stock_action return_reason returned_at returned_by approved_by refund_of return_no discount_type updated_at closed_at scheduled_at edit_request driver_id driver_name dispatched_at dispatched_by driver_status driver_assigned_at driver_accepted_at picked_at pickup_photo delivered_at track_token driver_lat driver_lng driver_loc_at rating_driver rating_order rating_note rated_at driver_settled_at driver_settled_by",
  shifts: "id device_id branch_id cashier opening_cash opened_at closed_at orders sales expected_cash counted_cash difference",
  day_closes: "id branch_id business_date closed_at closed_by device_id orders sales created_at",
  devices: "id name type branch_id code activated_at last_seen deleted created_at reference settings",
}).map(([k, v]) => [k, new Set(v.split(" "))]));
const RENAME: Record<string, string> = { open: "open_time", close: "close_time", table: "table_no" };
const snake = (k: string) => RENAME[k] || k.replace(/[A-Z]/g, c => "_" + c.toLowerCase());
export function toRow(col: string, id: string | null, data: Record<string, any>) {
  const t = tableOf(col);
  if (t === "settings") { const d = { ...data }; delete d.updatedAt; delete d.createdAt; delete d.id; return { id, data: d }; }
  const row: any = id ? { id } : {};
  for (const [k, v] of Object.entries(data)) { const s = snake(k); if (COLS[t]?.has(s) && s !== "id") row[s] = v === "" && /_id$/.test(s) ? null : v; }
  if (t === "orders" && row.no != null) row.no = +row.no;
  return row;
}
export type Op = { col: Col; op: "set" | "update" | "delete"; id: string; data: Record<string, any>; tries?: number; lastError?: string };
const OUTBOX = "skwyd_outbox", FAILED = "skwyd_failed";
export async function readOutbox(): Promise<{ outbox: Op[]; failed: Op[] }> {
  const [[, a], [, b]] = await AsyncStorage.multiGet([OUTBOX, FAILED]);
  try { return { outbox: a ? JSON.parse(a) : [], failed: b ? JSON.parse(b) : [] }; } catch { return { outbox: [], failed: [] }; }
}
export const saveOutbox = (outbox: Op[], failed: Op[]) => AsyncStorage.multiSet([[OUTBOX, JSON.stringify(outbox)], [FAILED, JSON.stringify(failed)]]).catch(() => {});
export async function send(sb: SupabaseClient, op: Op) {
  const t = tableOf(op.col);
  if (op.op === "delete") { const { error } = await sb.from(t).delete().eq("id", op.id); if (error) throw error; return; }
  if (op.op === "set") { const { error } = await sb.from(t).upsert(toRow(op.col, op.id, op.data)); if (error) throw error; }
  else { const row: any = toRow(op.col, null, op.data); delete row.id;
    if (t === "settings") { const cur = await sb.from(t).select("data").eq("id", op.id).maybeSingle(); if (cur.error) throw cur.error; row.data = { ...(cur.data?.data || {}), ...row.data }; }   // a settings document is merged, never replaced
    const { error } = await sb.from(t).update(row).eq("id", op.id); if (error) throw error; }
}
// a change shows on screen at once: the list as the server sent it, with the writes still waiting laid over it
export function applyOp(rows: Row[], op: Op): Row[] {
  if (op.op === "delete") return rows.filter(r => r.id !== op.id);
  const i = rows.findIndex(r => r.id === op.id), out = rows.slice();
  if (op.op === "set") { const r = { ...op.data, id: op.id } as Row; if (i < 0) out.unshift(r); else out[i] = r; }
  else if (i >= 0) out[i] = { ...out[i], ...op.data, id: op.id };
  return out;
}
