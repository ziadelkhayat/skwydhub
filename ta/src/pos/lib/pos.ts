// The register's rules, ported from pos.html as they are: prices per branch and order type, the POS menu from
// Sales Channels, taxes (inclusive or added), rounding, money formatting. Pure functions over the loaded data.
// web: SHA-256 from the browser
import type { Data, Row } from "./db";

export type OType = "dinein" | "takeaway" | "delivery";
export type Line = { productId: string; name: string; price: number; qty: number; disc?: number; discPct?: number; options?: any[]; mods?: string; note?: string; saved?: number };
export type Ctx = { S: Data; device: Row; branch: Row | null; otype: OType };

export const live = (r: Row) => !r.deleted;
const coS = (S: Data) => S.settings.find(x => x.id === "company") || ({} as Row);
export const typeKey = (t: string) => (t === "takeaway" ? "pickup" : t === "fast" ? "dinein" : t);
export const menuType = (t: OType) => (t === "takeaway" ? "pickup" : t);

/* ---------- money ---------- */
export const DEC = (S: Data) => { const d = coS(S).priceDecimals; return d === 0 || d === "0" ? 0 : +d || 2; };
const SYM = (S: Data) => String(coS(S).currencySymbol || "").trim() || coS(S).currency || "USD";
const CURJ = (s: string, n: string) => (/[\p{L}.]$/u.test(s) ? s + " " + n : s + n);
export const money = (S: Data, n: number) => CURJ(SYM(S), (+n || 0).toLocaleString("en-US", { minimumFractionDigits: DEC(S), maximumFractionDigits: DEC(S) }));
export const rrApply = (v: number, dec: number, rules?: any[]) => {
  if (!rules || !rules.length) return v;
  const f = Math.pow(10, dec), x = Math.round(Math.abs(+v || 0) * f), dg = x % 10, r = rules.find(r => dg >= +r.from && dg <= +r.to);
  if (!r || !dg) return v; return (Math.sign(v) * (r.up ? x - dg + 10 : x - dg)) / f;
};
export const money2 = (S: Data, n: number) => {
  const c = coS(S); if (!c.currency2 || !+c.rate2) return "";
  const d = +c.decimals2 || 0;
  return CURJ(String(c.currencySymbol2 || "").trim() || c.currency2, rrApply((+n || 0) * +c.rate2, d, c.roundRules2).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }));
};

/* ---------- the POS sales channel and menu ---------- */
// none saved yet = POS with every order type; deleted = no menu at this branch
export const posCh = (S: Data, branchId: string) => {
  const l = ((S.settings.find(x => x.id === "sales_channels") || ({} as Row)).list || []).filter((c: any) => c.kind === "pos" && c.branchId === branchId);
  return l.length ? l.find((c: any) => !c.deleted) || null : { types: ["dinein", "pickup", "delivery"] };
};
export const allowedTypes = (S: Data, branchId: string): OType[] => {
  const c = posCh(S, branchId); if (!c) return [];
  return (["dinein", "takeaway", "delivery"] as OType[]).filter(t => (c.types || []).includes(typeKey(t)));
};

export const prodPrice = (x: Ctx, p: Row) => {
  const cp = p.customPrices || {}, b = x.device.branchId, t = cp[b + ":pos:" + menuType(x.otype)], c = t != null && t !== "" ? t : cp[b];
  return c != null && c !== "" ? +c : +p.price || 0;
};
const products = (x: Ctx) => { const b = x.device.branchId; return x.S.products.filter(p => live(p) && p.active !== false && !(p.inactiveBranchIds || []).some((k: string) => k === b || k === b + ":pos" || k === b + ":pos:" + menuType(x.otype))); };
export const kidsOf = (x: Ctx, p: Row, ok = products(x)) => (p.variants || []).map((v: any) => ({ name: v.name, p: ok.find(y => y.id === v.productId) })).filter((k: any) => k.p) as { name: string; p: Row }[];
export const tilePrice = (x: Ctx, p: Row) => { const k = kidsOf(x, p); return k.length ? Math.min(...k.map(y => prodPrice(x, y.p))) : prodPrice(x, p); };
export const prodOos = (x: Ctx, p: Row): boolean => { const k = kidsOf(x, p); return k.length ? k.every(y => prodOos(x, y.p)) : (p.outOfStockBranchIds || []).includes(x.device.branchId); };
// a main product is in a channel category when it or one of its variants is listed
const chPos = (c: Row, p: Row) => { const ids = c.productIds || [], k = [p.id, ...(p.variants || []).map((v: any) => v.productId)].map(i => ids.indexOf(i)).filter(i => i >= 0); return k.length ? Math.min(...k) : -1; };
const catPar = (c?: Row) => { const r = String(c?.reference || ""); return r.startsWith("sub:") ? r.slice(4) : ""; };

export type Menu = { cats: Row[]; tops: Row[]; subsOf: (id: string) => Row[]; itemsOf: (id: string) => Row[]; search: (q: string) => Row[]; parentOf: (id: string) => string };
export function menu(x: Ctx): Menu {
  const b = x.device.branchId, S = x.S;
  const all = products(x), kids = new Set(S.products.flatMap(p => (p.variants || []).map((v: any) => v.productId).filter(Boolean)));
  const prods = all.filter(p => !kids.has(p.id) && (!(p.variants || []).some((v: any) => v.productId) || kidsOf(x, p, all).length));
  // the POS menu's own categories (Sales Channels); older setups without them use the menu categories
  const catAt = (c: Row) => { const ia = c.inactiveBranchIds || []; if (ia.includes("x:" + b)) return false; const only = ia.filter((k: string) => String(k).startsWith("only:")); return !only.length || only.includes("only:" + b); };
  const chc = S.categories.filter(c => live(c) && c.channel === "pos" && catAt(c)), useCh = chc.length > 0;
  const has = (c: Row, p: Row) => (useCh ? chPos(c, p) >= 0 : p.categoryId === c.id);
  const on0 = (useCh ? chc : S.categories.filter(c => live(c) && !c.channel))
    .filter(c => !(c.inactiveBranchIds || []).includes(b) && !(c.inactiveBranchIds || []).includes(b + ":pos"))
    .sort((a, c) => (a.sort ?? 999) - (c.sort ?? 999) || String(a.name).localeCompare(c.name));
  const isTop = (c: Row) => !catPar(c) || !on0.some(y => y.id === catPar(c));
  const cats = on0.filter(c => (isTop(c) ? prods.some(p => has(c, p)) || on0.some(y => catPar(y) === c.id) : true));
  const tops = cats.filter(isTop), subsOf = (id: string) => cats.filter(c => catPar(c) === id && !isTop(c));
  const itemsOf = (id: string) => { const c = cats.find(y => y.id === id); if (!c) return []; return prods.filter(p => has(c, p)).sort((a, z) => useCh ? chPos(c, a) - chPos(c, z) : (a.sort ?? 9999) - (z.sort ?? 9999) || a.name.localeCompare(z.name)); };
  const search = (q: string) => { const s = q.trim().toLowerCase(); return prods.filter(p => cats.some(c => has(c, p)) && p.name.toLowerCase().includes(s)).sort((a, z) => a.name.localeCompare(z.name)); };
  const parentOf = (id: string) => { const c = cats.find(y => y.id === id); return c && !isTop(c) ? catPar(c) : ""; };
  return { cats, tops, subsOf, itemsOf, search, parentOf };
}

/* ---------- tax and totals ---------- */
const taxOn = (x: Ctx, t: Row) => { const l = t.orderTypes || []; return !l.length || l.includes(typeKey(x.otype)); };
const rates = (x: Ctx, groupId?: string) => {
  const g = groupId && x.S.tax_groups.find(y => y.id === groupId && live(y)), r = { inc: 0, exc: 0 };
  ((g && g.taxIds) || []).forEach((id: string) => { const t = x.S.taxes.find(y => y.id === id && live(y)); if (t && taxOn(x, t)) r[t.inclusive === false ? "exc" : "inc"] += (+t.rate || 0) / 100; });
  return r;
};
export const lineNet = (i: Line) => Math.max(0, (+i.price || 0) * (+i.qty || 1) - (Number(i.disc ?? 0) || 0));
// tax = the inclusive part taken out of the price + the exclusive part added on top
function taxParts(x: Ctx, items: Line[], disc: number) {
  let g = 0, t = 0, add = 0;
  items.forEach(i => { const l = lineNet(i), p = x.S.products.find(y => y.id === i.productId), r = rates(x, p?.taxGroup || x.branch?.settings?.taxGroup), base = l / (1 + r.inc); g += l; t += l - base + base * r.exc; add += base * r.exc; });
  if (g > 0 && disc > 0) { const k = 1 - Math.min(disc, g) / g; t *= k; add *= k; }
  return { tax: +t.toFixed(2), added: +add.toFixed(2) };
}
export type Charge = { id: string; name: string; type: string; value: number; amount: number; taxGroup?: string };
// charges of this order type, brand and store (Manage → Charges); the cashier adds them
export const chargeList = (x: Ctx) => x.S.charges.filter(c => !c.deleted && c.active !== false && (!(c.orderTypes || []).length || c.orderTypes.includes(typeKey(x.otype)))
  && (!(c.brandIds || []).length || c.brandIds.includes(x.branch?.brandId)) && (!(c.branchIds || []).length || c.branchIds.includes(x.device.branchId))).sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999) || String(a.name).localeCompare(b.name));
/* ---------- promotions (Marketing → Promotions): the best one that fits the cart applies by itself; a discount the cashier picked takes its place ---------- */
const promoList = (S: Data) => (((S.settings.find(x => x.id === "promotions") || {}) as any).list || []).filter((p: any) => !p.deleted && p.active !== false);
function promoOn(x: Ctx, p: any) { const n = new Date(), z = (v: number) => String(v).padStart(2, "0"), d = n.getFullYear() + "-" + z(n.getMonth() + 1) + "-" + z(n.getDate()), hm = z(n.getHours()) + ":" + z(n.getMinutes()), ot = typeKey(x.otype);
  if (p.start && d < p.start) return false; if (p.end && d > p.end) return false;
  if ((p.days || []).length && !p.days.includes(String(n.getDay()))) return false;
  if (p.from || p.to) { const f = p.from || "00:00", t = p.to || "23:59"; if (f <= t ? (hm < f || hm > t) : (hm < f && hm > t)) return false; }
  if (!(p.orderTypes || []).includes(ot)) return false;
  return !(p.branchIds || []).length || p.branchIds.includes(x.device.branchId); }
const units = (cart: Line[], ids: string[]) => cart.filter(i => (ids || []).includes(i.productId)).flatMap(i => { const q = Math.max(1, Math.round(+i.qty || 1)); return Array(q).fill(lineNet(i) / q) as number[]; }).sort((a, b) => a - b);
function promoAmt(x: Ctx, cart: Line[], p: any, sub: number) {
  if (+p.minOrder && sub < +p.minOrder) return 0;
  const sum = (a: number[]) => a.reduce((s, v) => s + v, 0), off = (base: number) => p.valueType === "fixed" ? Math.min(+p.value || 0, base) : Math.min(base * (+p.value || 0) / 100, +p.maxDiscount > 0 ? +p.maxDiscount : Infinity);
  if (p.type === "disc") return off(sub);
  if (p.type === "itemdisc") { const base = sum(cart.filter(i => (p.itemIds || []).includes(i.productId) || (p.categoryIds || []).includes(x.S.products.find(y => y.id === i.productId)?.categoryId)).map(lineNet)); return base ? (p.valueType === "fixed" ? Math.min(+p.value || 0, base) : base * (+p.value || 0) / 100) : 0; }
  if (p.type === "bxgy") { const bq = Math.max(1, +p.buyQty || 1), gq = Math.max(1, +p.getQty || 1), pct = (p.getPct == null ? 100 : +p.getPct) / 100, buy = p.buyIds || [], get = p.getIds || [], buyOnly = buy.filter((id: string) => !get.includes(id));
    if (!buyOnly.length) { const u = units(cart, [...new Set([...buy, ...get])] as string[]), sets = Math.floor(u.length / (bq + gq)); return sum(u.slice(0, sets * gq)) * pct; }
    const sets = Math.floor(units(cart, buyOnly).length / bq); return sum(units(cart, get).slice(0, sets * gq)) * pct; }
  if (p.type === "freeitem") return sum(units(cart, p.freeIds).slice(0, Math.max(1, +p.freeQty || 1)));
  if (p.type === "bundle") { const ids = p.bundleIds || []; if (ids.length < 2) return 0; const per = ids.map((id: string) => units(cart, [id])); if (per.some((u: number[]) => !u.length)) return 0;
    const sets = Math.min(...per.map((u: number[]) => u.length)); return Math.max(0, sum(per.map((u: number[]) => sum(u.slice(0, sets)))) - sets * (+p.bundlePrice || 0)); }
  return 0; }
export function promoBest(x: Ctx, cart: Line[], sub: number) { let best: { id: string; name: string; amount: number } | null = null; if (!cart.length) return null;
  for (const p of promoList(x.S)) { if (!promoOn(x, p)) continue; const a = +Math.min(promoAmt(x, cart, p, sub), sub).toFixed(2); if (a > 0 && (!best || a > best.amount)) best = { id: p.id, name: p.name, amount: a }; }
  return best; }
/* set discounts (Marketing → Discounts): store, order type, minimum order, items / categories / tags they're limited to */
export const dsAll = (S: Data) => ((((S.settings.find(x => x.id === "discounts") || {}) as any).list || []) as any[]).filter(d => !d.deleted);
export const dsHere = (x: Ctx) => dsAll(x.S).filter(d => (!(d.branchIds || []).length || d.branchIds.includes(x.device.branchId)) && (!(d.orderTypes || []).length || d.orderTypes.includes(typeKey(x.otype))));
export function dsCalc(x: Ctx, cart: Line[], d: any, val?: number) {
  const sub = cart.reduce((a, i) => a + lineNet(i), 0); if (d.minOrder != null && sub < +d.minOrder) return { amt: 0, why: "Minimum order " + money(x.S, +d.minOrder) };
  const tg = ((x.S.settings.find(y => y.id === "tags") || {}) as any).on?.product || {}, lim = (d.productIds || []).length || (d.categoryIds || []).length || (d.productTags || []).length;
  const ok = (i: Line) => { if (d.minProduct != null && (+i.price || 0) < +d.minProduct) return false; if (!lim) return true; const p = x.S.products.find(y => y.id === i.productId);
    return (d.productIds || []).includes(i.productId) || (p && (d.categoryIds || []).includes(p.categoryId)) || (tg[i.productId] || []).some((t: string) => (d.productTags || []).includes(t)); };
  const base = cart.filter(ok).reduce((a, i) => a + lineNet(i), 0); if (!(base > 0)) return { amt: 0, why: lim ? "No matching items" : "Nothing to discount" };
  const v = d.open ? +(val || 0) : +d.amount || 0; if (d.open && !(v > 0)) return { amt: 0, why: "" };
  let amt = d.type === "fixed" ? Math.min(v, base) : base * v / 100; if (d.type !== "fixed" && d.maxDiscount != null) amt = Math.min(amt, +d.maxDiscount);
  return { amt: +Math.min(amt, sub).toFixed(2), why: "" };
}
export type Disc = { type: "pct" | "amt"; value: number; name?: string; setId?: string; setVal?: number } | null;
export type Totals = { sub: number; disc: number; promo: { id: string; name: string; amount: number } | null; charges: Charge[]; chT: number; tax: number; total: number; rnd: number; net: number };
export function totals(x: Ctx, cart: Line[], d: Disc = null, picked: string[] = [], open: Record<string, number> = {}, fee = 0): Totals {
  const sub = cart.reduce((a, i) => a + lineNet(i), 0);
  // a set discount follows the cart; a manual one is a % or an amount; with neither, the best promotion applies by itself
  const ds = d?.setId ? dsAll(x.S).find(y => y.id === d.setId) : null, manual = !d ? 0 : ds ? dsCalc(x, cart, ds, d.setVal).amt : +(d.type === "amt" ? Math.min(d.value, sub) : sub * Math.min(d.value, 100) / 100).toFixed(2);
  const promo = d ? null : promoBest(x, cart, sub), disc = promo ? promo.amount : manual;
  const charges: Charge[] = chargeList(x).filter(c => picked.includes(c.id)).map(c => { const amount = +(c.type === "percent" ? (coS(x.S).chargesBeforeDisc !== false ? sub : sub - disc) * (+c.value || 0) / 100 : c.type === "open" ? +(open[c.id] || 0) : +c.value || 0).toFixed(2);
    return { id: c.id, name: c.name, type: c.type, value: c.type === "open" ? amount : +c.value || 0, amount, ...(c.taxGroup ? { taxGroup: c.taxGroup } : {}) }; });
  const chT = +charges.reduce((a, c) => a + c.amount, 0).toFixed(2), tp = taxParts(x, cart, disc);
  charges.forEach(c => { const r = rates(x, c.taxGroup), base = c.amount / (1 + r.inc); tp.tax = +(tp.tax + (c.amount - base) + base * r.exc).toFixed(2); tp.added = +(tp.added + base * r.exc).toFixed(2); });
  const raw = +(sub - disc + chT + fee + tp.added).toFixed(2), total = +rrApply(raw, DEC(x.S), coS(x.S).roundRules1).toFixed(2);
  return { sub, disc, promo, charges, chT, tax: tp.tax, total, rnd: +(total - raw).toFixed(2), net: +(raw - tp.tax).toFixed(2) };
}

/* ---------- cashiers ---------- */
export const pinsOn = (S: Data) => S.users.some(u => live(u) && u.pinHash);
export const isAdminUser = (u?: Row | null) => !!u && (u.role === "owner" || u.role === "admin");
export const posUsers = (S: Data, branchId: string) => S.users.filter(u => live(u) && u.pinHash && (isAdminUser(u) || !(u.branchIds || []).length || u.branchIds.includes(branchId)));
export const pinHash = async (id: string, pin: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("slick:" + id + ":" + pin)))].map(b => b.toString(16).padStart(2, "0")).join("");
export async function pinUser(list: Row[], pin: string) { for (const u of list) if ((await pinHash(u.id, pin)) === u.pinHash) return u; return null; }
export const userPerms = (S: Data, u?: Row | null) => { const ids = (u?.roleIds || []).length ? u!.roleIds : [u?.roleId]; return S.roles.filter(r => ids.includes(r.id) && !r.deleted).flatMap(r => r.permissions || []); };

/* ---------- modifiers (same rules as pos.html modData + modpick.js) ---------- */
export type ModLink = { modifierId: string; min?: number; max?: number; free?: number; multi?: boolean; defaults?: string[] };
export type ModOpt = { id: string; modifierId: string; name: string; price: number; oos: boolean };
export type ModData = { links: ModLink[]; groups: Record<string, { name: string }>; options: ModOpt[] };
const linkOpt = (p: Row, o: Row) => (((p.modifiers || []).find((l: any) => l.modifierId === o.modifierId)?.opts || {})[o.id] || {}) as any;
export function modData(x: Ctx, p: Row): ModData {
  const b = x.device.branchId, mt = menuType(x.otype), k = b + ":pos", kt = k + ":" + mt;
  const groups: Record<string, { name: string }> = {}; x.S.modifiers.forEach(m => { if (!m.deleted) groups[m.id] = { name: m.name }; });
  const links: any[] = p.modifiers || [], ids = new Set(links.map(l => l.modifierId));
  const options = x.S.modifier_options.filter(o => !o.deleted && o.active !== false && ids.has(o.modifierId) && !(o.inactiveBranchIds || []).some((y: string) => y === b || y === k || y === kt))
    .sort((a, z) => (a.sort ?? 999) - (z.sort ?? 999) || String(a.name).localeCompare(z.name))
    .filter(o => { const s = linkOpt(p, o), l = links.find(y => y.modifierId === o.modifierId); return !(s.off || []).includes(k) && !(s.off || []).includes(kt) && !(l?.offTypes || []).includes(kt); })
    .filter(o => !((links.find(l => l.modifierId === o.modifierId)?.excluded) || []).includes(o.id))
    .map(o => { const s = linkOpt(p, o), pt = (s.price || {})[kt], sp = pt != null && pt !== "" ? pt : (s.price || {})[k], c = sp != null && sp !== "" ? sp : (o.customPrices || {})[b];
      return { id: o.id, modifierId: o.modifierId, name: o.name, price: c != null && c !== "" ? +c : +o.price || 0, oos: (o.outOfStockBranchIds || []).includes(b) || (s.oos || []).includes(b) }; });
  return { links: links.filter(l => groups[l.modifierId] && options.some(o => o.modifierId === l.modifierId)), groups, options };
}
export const modRule = (l: ModLink) => { const mn = +(l.min || 0), mx = +(l.max || 0); if (mn && mx && mn === mx) return `Choose ${mn}`; if (mn && mx) return `Choose ${mn} to ${mx}`; if (mn) return `Choose at least ${mn}`; if (mx) return `Up to ${mx}`; return "Optional"; };
// the same options on a line mean the same item, so the cart merges them
export const lineKey = (productId: string, options?: any[]) => productId + "|" + (options || []).map(o => o.id).sort().join(",");
// the text shown on tickets and receipts: the options, then the cashier's note
export const modLabel = (mods: string, note?: string) => [mods, note ? "Note: " + note : ""].filter(Boolean).join(" · ");

/* ---------- business day (pos.html bizDate / openDay / saleBlock) ---------- */
const dayCut = (x: Ctx) => { const v = x.branch?.settings?.dayStart || coS(x.S).dayEnd || ""; const m = /^(\d{1,2}):(\d{2})/.exec(v); return m ? Math.min(719, +m[1] * 60 + +m[2]) : 0; };
const nextDay = (d: string) => { const t = new Date(d + "T12:00:00"); t.setDate(t.getDate() + 1); return t.toISOString().slice(0, 10); };
export const dayClosed = (x: Ctx, d: string) => x.S.day_closes.some(c => c.branchId === x.device.branchId && String(c.businessDate).slice(0, 10) === d);
// ending the day early (before the start time) starts the next business day right then
export function bizDate(x: Ctx, t: string | Date = new Date()) {
  const ms = +new Date(t), d0 = new Date(ms - dayCut(x) * 60000); let d = new Date(+d0 - d0.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  for (let i = 0; i < 3; i++) { const c = x.S.day_closes.find(c => c.branchId === x.device.branchId && String(c.businessDate).slice(0, 10) === d); if (c && +new Date(c.closedAt) <= ms) d = nextDay(d); else break; }
  return d;
}
const liveOrder = (x: Ctx, o: Row) => o.branchId === x.device.branchId && !["draft", "declined", "void"].includes(o.status);
// the latest earlier business day at this store that had sales and wasn't ended; otherwise today
export function openDay(x: Ctx) { const today = bizDate(x), days = [...new Set(x.S.orders.filter(o => liveOrder(x, o)).map(o => bizDate(x, o.createdAt)))].filter(d => d < today && !dayClosed(x, d)).sort(); return days.length ? days[days.length - 1] : today; }
export function saleBlock(x: Ctx) { const today = bizDate(x); if (openDay(x) < today) return "End of day to start selling"; if (dayClosed(x, today)) return "Day already ended"; return ""; }

/* ---------- till, order numbers, payment methods ---------- */
export const openShift = (x: Ctx) => x.S.shifts.find(s => s.deviceId === x.device.id && !s.closedAt) || null;
export const shiftSales = (x: Ctx, sh: Row) => x.S.orders.filter(o => o.shiftId === sh.id && (o.status === "closed" || o.status === "refund"));
// cash still with drivers isn't in the drawer
const owed = (l: Row[]) => l.filter(o => o.type === "delivery" && o.driverId && !o.driverSettledAt && (o.payment?.type || o.payment?.method) === "cash").reduce((a, o) => a + (+o.total || 0), 0);
export const expectedCash = (x: Ctx, sh: Row) => { const s = shiftSales(x, sh); return (+sh.openingCash || 0) + s.filter(o => (o.payment?.type || o.payment?.method) === "cash").reduce((a, o) => a + (+o.total || 0), 0) - owed(s); };
export const CUR2 = (S: Data) => { const c = coS(S); return c.currency2 && +c.rate2 ? { code: String(c.currency2), rate: +c.rate2, dec: +c.decimals2 || 0 } : null; };
// call number: one sequence per store, starting again after each end of day; the server fixes any clash
export function nextOrderNo(x: Ctx, last: { since: number; n: number } | null) {
  const since = x.S.day_closes.filter(c => c.branchId === x.device.branchId).reduce((m, c) => Math.max(m, +new Date(c.closedAt) || 0), 0);
  let n = last && last.since === since ? last.n : 0, lo: Row | null = null;
  x.S.orders.forEach(o => { if (o.branchId === x.device.branchId && o.no && +new Date(o.createdAt) > since && (!lo || +new Date(o.createdAt) > +new Date(lo.createdAt))) lo = o; });
  if (lo) n = Math.max(n, parseInt(String((lo as Row).no).replace(/\D/g, ""), 10) || 0);
  const st = Math.max(1, +(x.device.settings?.callStart || 1)), rs = +(x.device.settings?.callReset || 0);
  n = n < st - 1 ? st - 1 : n; n++; if (rs && n > rs) n = st;
  return { no: String(n), since, n };
}
export type PayMethod = { id: string; name: string; type: string };
export const payMethods = (x: Ctx): PayMethod[] => {
  const l = x.S.payment_methods.filter(m => live(m) && m.active !== false && !(x.branch?.settings?.inactivePayments || []).includes(m.id)).sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999) || String(a.name).localeCompare(b.name));
  return l.length ? l.map(m => ({ id: m.id, name: m.name, type: m.type || "other" })) : [{ id: "cash", name: "Cash", type: "cash" }, { id: "card", name: "Card", type: "card" }, { id: "other", name: "Other", type: "other" }];
};
export const newId = (p: string) => p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
// what goes into the order: the type, the lines (without screen-only fields) and the totals
export function orderFields(x: Ctx, cart: Line[], t: Totals, extra: { table?: string; customerName?: string; phone?: string; guests?: number; disc?: Disc; receiptNotes?: string; notes?: string } = {}) {
  return { type: x.otype === "takeaway" ? "pickup" : x.otype, table: x.otype === "dinein" ? extra.table || "" : "", customerName: (extra.customerName || "").trim(), phone: (extra.phone || "").trim(), address: "",
    items: cart.map(({ saved, ...i }) => i), subtotal: +t.sub.toFixed(2), charges: t.charges, chargesTotal: t.chT, discountPct: extra.disc?.type === "pct" ? extra.disc.value : t.sub ? +(t.disc / t.sub * 100).toFixed(2) : 0, discountType: extra.disc?.type || "pct", discount: t.disc, promo: t.promo || null,
    total: t.total, tax: t.tax, receiptNotes: (extra.receiptNotes || "").trim(), notes: (extra.notes || "").trim(), ...(x.otype === "dinein" && extra.guests ? { guests: extra.guests } : {}) };
}

/* ---------- customers for pickup and delivery (pos.html openPDNew) ---------- */
export type Addr = { label?: string; street?: string; building?: string; floor?: string; door?: string; extra?: string };
export type Cust = { name: string; phone: string; source: string; addr: Addr };
export const addrJoin = (a: Addr) => { const c = (v?: string) => String(v || "").replace(/\s*·\s*/g, ", ").trim();
  return [c(a.label) ? "[" + c(a.label).replace(/[\[\]]/g, "") + "]" : "", [c(a.street), c(a.building) && "Bldg: " + c(a.building), c(a.floor) && "Floor: " + c(a.floor), c(a.door) && "Door: " + c(a.door), c(a.extra) && "Info: " + c(a.extra)].filter(Boolean).join(" · ")].filter(Boolean).join(" "); };
export const addrParts = (v: string): Addr => { const a: any = { label: "", street: "", building: "", floor: "", door: "", extra: "" }; let s = String(v || "").trim(); const m = /^\[(.*?)\]\s*/.exec(s); if (m) { a.label = m[1]; s = s.slice(m[0].length); }
  s.split(" · ").filter(Boolean).forEach(p => { const k = /^(Bldg|Floor|Door|Info):\s*(.*)$/.exec(p); if (k) a[({ Bldg: "building", Floor: "floor", Door: "door", Info: "extra" } as any)[k[1]]] = k[2]; else a.street = a.street ? a.street + ", " + p : p; }); return a; };
export const normPhone = (p: string, cc = "+961") => { let d = String(p || "").replace(/[^\d+]/g, ""); if (!d) return ""; if (d.startsWith("00")) d = "+" + d.slice(2); if (d.startsWith("+")) return d.replace(/(?!^)\+/g, ""); const n = d.replace(/\+/g, "").replace(/^0+/, ""); return n.length < 6 ? "" : cc + n; };
export const phoneVariants = (full: string, cc = "+961") => { const out = new Set([full]); if (full.startsWith(cc)) { const n = full.slice(cc.length); out.add(n); out.add("0" + n); out.add(cc + " " + n); } return [...out]; };
export const posSources = (S: Data) => S.order_sources.filter(r => !r.deleted && String(r.name || "").trim() && !["POS", "WEB", "API", "WEBSITE"].includes(String(r.name).trim().toUpperCase()))
  .sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999) || String(a.name).localeCompare(b.name)).map(r => String(r.name));
// what pickup and delivery need before the order is saved or paid (Brand settings: customer required for pickup / delivery)
export function custMissing(t: OType, c: Cust, needSource = true) {
  if (t === "dinein") return "";
  const need: string[] = []; if (needSource && !c.source) need.push("order source"); if (!c.name.trim()) need.push("name"); if (c.phone.replace(/\D/g, "").length < 6) need.push("phone number");
  if (t === "delivery") ([["street", "area / street"], ["building", "building"], ["floor", "floor"]] as const).forEach(([k, l]) => { if (!String(c.addr[k] || "").trim()) need.push(l); });
  return need.length ? "Enter the customer's " + need.join(", ").replace(/, ([^,]*)$/, " and $1") : "";
}

/* ---------- what the signed-in cashier may do (roles; owners and admins everything; no PIN users = open register) ---------- */
export const can = (S: Data, cashier: Row | null, perm: string) => !pinsOn(S) || (!!cashier && (isAdminUser(cashier) || userPerms(S, cashier).includes(perm)));

/* ---------- void (open order) and return (done order), pos.html openVR / doVR ---------- */
export const retLeft = (o: Row, ix: number) => Math.max(0, +((o.items || [])[ix]?.qty || 0) - (o.returnedItems || []).filter((r: any) => r.ix === ix).reduce((s: number, r: any) => s + (+r.qty || 0), 0));
export const fullyBack = (o: Row) => +o.refundTotal && +o.refundTotal >= +o.total - 0.001;
export const vrReasons = (a: any) => [...new Set((String(a.voidReasons || "") + "\n" + String(a.returnReasons || "")).split("\n").map(s => s.trim()))].filter(Boolean);
// the order after some items are voided: what's left, its discount (a % stays a %), charges and tax again
export function afterVoid(x: Ctx, o: Row, qs: number[]) {
  const items = (o.items || []).map((i: any, ix: number) => { const left = +i.qty - (qs[ix] || 0); if (left <= 0) return null; const k = { ...i, qty: left }; if (+i.disc) k.disc = +(i.disc * left / i.qty).toFixed(2); return k; }).filter(Boolean);
  const sub = items.reduce((s: number, i: any) => s + lineNet(i), 0), d = o.discountType === "amt" ? Math.min(+o.discount || 0, sub) : +(sub * (+o.discountPct || 0) / 100).toFixed(2);
  const charges = (o.charges || []).map((c: any) => ({ ...c, amount: +(c.type === "percent" ? (sub - d) * (+c.value || 0) / 100 : +c.amount || 0).toFixed(2) }));
  const tp = taxParts(x, items, d), chT = +charges.reduce((s: number, c: any) => s + c.amount, 0).toFixed(2);
  return { items, subtotal: +sub.toFixed(2), discount: d, discountPct: o.discountType === "amt" ? (sub ? +(d / sub * 100).toFixed(2) : 0) : (+o.discountPct || 0), tax: tp.tax, charges, chargesTotal: chT, total: +(sub - d + chT + tp.added).toFixed(2) };
}
// the refund of the picked quantities: each item's price after the order discount, never more than what's left
export function refundOf(o: Row, qs: number[]) {
  const gross = (o.items || []).reduce((s: number, i: any) => s + lineNet(i), 0), share = gross ? (+o.total || 0) / gross : 1;
  const left = +((+o.total || 0) - (+o.refundTotal || 0)).toFixed(2), all = (o.items || []).every((_: any, ix: number) => (qs[ix] || 0) >= retLeft(o, ix));
  return all ? left : Math.min(left, +(o.items || []).reduce((s: number, i: any, ix: number) => s + lineNet(i) / (+i.qty || 1) * (qs[ix] || 0) * share, 0).toFixed(2));
}

/* ---------- the second currency at the till (Currency settings): what's due in it, and the change in it ---------- */
const ceilD = (n: number, d: number) => { const f = Math.pow(10, d); return Math.ceil(n * f - 1e-7) / f; };
export const due2 = (S: Data, t: number) => { const c = CUR2(S); return c ? rrApply(ceilD(t * c.rate, c.dec), c.dec, coS(S).roundRules2) : 0; };
export const chg2 = (S: Data, t: number) => { const c = CUR2(S); return c ? rrApply(Math.floor(t * c.rate * Math.pow(10, c.dec) + 1e-7) / Math.pow(10, c.dec), c.dec, coS(S).roundRules2) : 0; };
export const num2 = (n: number, d: number) => (+n || 0).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
export const quickTender = (S: Data, which: 1 | 2) => String(coS(S)[which === 2 ? "quickTender2" : "quickTender"] || "").split(",").map(v => +v.trim()).filter(v => v > 0).sort((a, b) => a - b);
