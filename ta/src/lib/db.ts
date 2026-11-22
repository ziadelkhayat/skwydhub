// Data layer: the same tables and columns the current portal uses (wokdb.js), as React hooks.
// Rows arrive in camelCase (brand_id -> brandId); writes go back in snake_case, only to known columns.
import { useSyncExternalStore } from "react";
import { sb } from "./supabase";

export const TABLE: Record<string, string> = { inv_items: "inventory_items", zones: "delivery_zones", inv_categories: "inventory_categories", inv_docs: "inventory_docs", users: "staff_users", work_shifts: "staff_shifts", work_requests: "staff_requests", staff_docs: "staff_documents" };
const COLS_TXT: Record<string, string> = {
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
    warehouses: "id name reference address brand_id deleted created_at",
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
const COLS: Record<string, Set<string>> = Object.fromEntries(Object.entries(COLS_TXT).map(([k, v]) => [k, new Set(v.split(" "))]));
const RENAME: Record<string, string> = { open: "open_time", close: "close_time", table: "table_no" };
const BACK: Record<string, string> = { open_time: "open", close_time: "close", table_no: "table" };
const snake = (k: string) => RENAME[k] || k.replace(/[A-Z]/g, c => "_" + c.toLowerCase());
const camel = (k: string) => BACK[k] || k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
export const tableOf = (c: string) => TABLE[c] || c;

export type Row = { id: string; [k: string]: any };

function toRow(col: string, data: Record<string, any>) {
  const t = tableOf(col);
  if (t === "settings") { const d = { ...data }; delete d.updatedAt; delete d.createdAt; return { data: d }; }
  const row: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    const s = snake(k);
    if (COLS[t] && COLS[t].has(s) && s !== "id") row[s] = v === "" && /_id$/.test(s) ? null : v;
  }
  if (t === "orders" && row.no != null) row.no = +row.no;
  return row;
}
function fromRow(col: string, r: any): Row {
  if (tableOf(col) === "settings") return { ...(r.data || {}), updatedAt: r.updated_at, id: r.id };
  const o: Row = { id: r.id };
  for (const [k, v] of Object.entries(r)) if (k !== "id") o[camel(k)] = v;
  if (o.no != null) o.no = String(o.no);
  return o;
}

async function fetchAll(col: string): Promise<Row[]> {
  const t = tableOf(col);
  let q: any = sb.from(t).select("*");
  if (t === "orders") q = q.gte("created_at", new Date(Date.now() - 3 * 86400000).toISOString()).order("created_at", { ascending: false }).limit(1000);
  else if (t === "staff_requests") q = q.gte("created_at", new Date(Date.now() - 400 * 86400000).toISOString()).limit(5000);
  else if (t === "chat_messages") q = q.gte("created_at", new Date(Date.now() - 60 * 86400000).toISOString()).order("created_at", { ascending: false }).limit(3000);
  else if (t === "staff_shifts") q = q.gte("day", new Date(Date.now() - 120 * 86400000).toISOString().slice(0, 10)).limit(5000);
  else if (t === "shifts") q = q.gte("opened_at", new Date(Date.now() - 7 * 86400000).toISOString()).limit(1000);
  else q = q.limit(5000);
  const { data, error } = await q;
  if (error) throw error;
  return (data as any[]).map(r => fromRow(col, r));
}

// one shared copy per collection, kept fresh by realtime changes
type Entry = { rows: Row[] | null; error: string; subs: Set<() => void>; timer?: any; started?: boolean };
const store: Record<string, Entry> = {};
const entry = (col: string) => (store[col] ||= { rows: null, error: "", subs: new Set() });
function notify(col: string) { entry(col).subs.forEach(f => f()); }
export function refresh(col: string) {
  const e = entry(col); clearTimeout(e.timer);
  e.timer = setTimeout(async () => {
    try { e.rows = await fetchAll(col); e.error = ""; } catch (err: any) { console.error("load", col, err); e.error = err?.message || "Couldn't load"; if (!e.rows) e.rows = []; }
    notify(col);
  }, 120);
}
function start(col: string) {
  const e = entry(col); if (e.started) return; e.started = true;
  refresh(col);
  sb.channel("v2-" + tableOf(col) + "-" + Math.random().toString(36).slice(2, 7))
    .on("postgres_changes" as any, { event: "*", schema: "public", table: tableOf(col) }, () => refresh(col))
    .subscribe();
}
const EMPTY: Row[] = [];
/** All rows of a collection (e.g. "brands", "users", "payment_methods"); null while the first load is running. */
export function useCol(col: string): Row[] | null {
  return useSyncExternalStore(
    f => { const e = entry(col); e.subs.add(f); start(col); return () => { e.subs.delete(f); }; },
    () => entry(col).rows,
    () => EMPTY,
  );
}
export const peek = (col: string) => entry(col).rows || EMPTY;

export const newId = (p: string) => p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
/** Create or replace (set) / change some fields (update) of one row. */
export async function put(col: string, id: string | null, data: Record<string, any>) {
  const t = tableOf(col), row = toRow(col, data);
  const exists = id && peek(col).some(r => r.id === id);
  if (exists && t === "settings") { // settings documents are merged, never replaced (same as wokdb.js)
    const cur = await sb.from(t).select("data").eq("id", id).maybeSingle(); if (cur.error) throw cur.error;
    row.data = { ...((cur.data as any)?.data || {}), ...row.data };
  }
  const res = exists
    ? await sb.from(t).update(row).eq("id", id)
    : await sb.from(t).insert({ ...row, id: id || newId(col.slice(0, 3)) });
  if (res.error) throw res.error;
  refresh(col);
}
/** soft delete (the portal keeps deleted rows under the Deleted tab) */
export async function softDelete(col: string, id: string, on = true) { await put(col, id, { deleted: on }); }
export async function remove(col: string, id: string) {
  const { error } = await sb.from(tableOf(col)).delete().eq("id", id);
  if (error) throw error; refresh(col);
}
export const live = (r: Row) => !r.deleted;
