// Data for the register, the same rules as wokdb.js in device mode:
// - an activated tablet has no login; its secret device key goes in the x-slick-device header on every request
// - every collection is cached on the tablet, so the register opens and sells offline
// - the database rings a secret broadcast topic ("chg", { t: table }) and the register reloads that table
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  pairs.forEach(([k, v], i) => { if (v) try { out[COLLECTIONS[i]] = JSON.parse(v); } catch {} });
  return out;
}

export async function fetchAll(sb: SupabaseClient, col: Col): Promise<Row[]> {
  const t = tableOf(col);
  let q: any = sb.from(t).select(DEVCOLS[t] || "*");
  if (t === "orders") q = q.gte("created_at", new Date(Date.now() - 3 * 86400000).toISOString()).order("created_at", { ascending: false }).limit(1000);
  else if (t === "shifts") q = q.gte("opened_at", new Date(Date.now() - 7 * 86400000).toISOString()).limit(1000);
  else q = q.limit(5000);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data as any[]).map(r => fromRow(col, r));
  AsyncStorage.setItem(K.cache(col), JSON.stringify(rows)).catch(() => {});
  return rows;
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
