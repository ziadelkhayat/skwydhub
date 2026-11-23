// Call Center order screen: customer (phone lookup, name, saved addresses), order type, source, brand and store, the call center menu
// with its prices, modifiers (the shared modifier picker modpick.js, same as the portal and POS), cart, discount, charges, notes and totals
// (taxes, charges and rounding as in the portal). Send / Save Draft / Accept / Decline / Cancel order behave as in the current portal.
// Orders the store already accepted are changed through the current portal (the store approves every change there).
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { MinusIcon, PlusIcon, SearchIcon, TrashBinIcon } from "@/icons";
import { useAuth } from "@/lib/auth";
import { newId, put, type Row } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { coSet, money } from "@/lib/util";
import { cn } from "@/utils";
import { useEffect, useMemo, useState } from "react";
import { live, useS } from "../crud/CrudPage";
import { F, SEL } from "../ui/kit";
import { toast } from "../ui/toast";
import { who } from "./em";

const CCS = ["+961", "+971", "+966", "+974", "+965", "+973", "+968", "+962", "+20", "+90", "+33", "+44", "+1"];
const SOURCES_DEF = ["Phone", "Toters", "NokNok", "Talabat", "WhatsApp", "Walk-in"];
const ADDR_K = ["label", "street", "building", "floor", "door", "extra"] as const;
type Addr = Record<(typeof ADDR_K)[number], string>;
const addrJoin = (a: Addr) => { const c = (v: string) => String(v || "").replace(/\s*·\s*/g, ", ").trim();
  return [c(a.label) ? "[" + c(a.label).replace(/[[\]]/g, "") + "]" : "", [c(a.street), c(a.building) && "Bldg: " + c(a.building), c(a.floor) && "Floor: " + c(a.floor), c(a.door) && "Door: " + c(a.door), c(a.extra) && "Info: " + c(a.extra)].filter(Boolean).join(" · ")].filter(Boolean).join(" "); };
const addrSplit = (v?: string): Addr => { const a: Addr = { label: "", street: "", building: "", floor: "", door: "", extra: "" }; let s = String(v || "").trim(); const m = /^\[(.*?)\]\s*/.exec(s); if (m) { a.label = m[1]; s = s.slice(m[0].length); }
  s.split(" · ").filter(Boolean).forEach(p => { const k = /^(Bldg|Floor|Door|Info):\s*(.*)$/.exec(p); if (k) (a as any)[({ Bldg: "building", Floor: "floor", Door: "door", Info: "extra" } as any)[k[1]]] = k[2]; else a.street = a.street ? a.street + ", " + p : p; }); return a; };
const lineNet = (i: any) => Math.max(0, (+i.price || 0) * (+i.qty || 1) - (+i.disc || 0));
const rrApply = (v: number, dec: number, rules: any[]) => { if (!rules || !rules.length) return v; const f = Math.pow(10, dec), x = Math.round(Math.abs(+v || 0) * f), dg = x % 10, r = rules.find(r => dg >= +r.from && dg <= +r.to); if (!r || !dg) return v; return Math.sign(v) * (r.up ? x - dg + 10 : x - dg) / f; };
const offAt = (arr: any[], b: string, ch: string) => !!b && ((arr || []).includes(b) || (arr || []).includes(b + ":" + ch));
const typeOff = (arr: any[], b: string, ch: string, t: string) => offAt(arr, b, ch) || (arr || []).includes(b + ":" + ch + ":" + (t === "takeaway" ? "pickup" : t));
const catAt = (c: Row, b: string) => { if (!b) return true; const ia = c.inactiveBranchIds || []; if (ia.includes("x:" + b)) return false; const only = ia.filter((k: string) => String(k).startsWith("only:")); return !only.length || only.includes("only:" + b); };
const bySort = (a: Row, b: Row) => (a.sort ?? 999) - (b.sort ?? 999) || String(a.name).localeCompare(String(b.name));
const brOpenNow = (b: any, t = new Date()) => { if (!b) return true;
  const H = (b.settings || {}).hours, D = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"], hm = (s: any) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(s || "")); return m ? +m[1] * 60 + +m[2] : null; };
  const day = (k: string) => { const d = H && H[k]; if (d) return d.closed ? null : [hm(d.open), hm(d.close)]; return [hm(b.open), hm(b.close)]; };
  const now = t.getHours() * 60 + t.getMinutes(), a = day(D[t.getDay()]), y = day(D[(t.getDay() + 6) % 7]);
  if (a && (a[0] == null || a[1] == null || a[0] === a[1])) return true; if (a && (a[1]! > a[0]! ? now >= a[0]! && now < a[1]! : now >= a[0]!)) return true; if (y && y[0] != null && y[1] != null && y[1] < y[0] && now < y[1]) return true; return false; };
const brHours = (b: any, t = new Date()) => { const H = (b?.settings || {}).hours, d = H && H[["sun", "mon", "tue", "wed", "thu", "fri", "sat"][t.getDay()]]; if (d) return d.closed ? "closed today" : `${d.open}–${d.close}`; return b?.open && b?.close ? `${b.open}–${b.close}` : ""; };
const ccLabel = (o: any) => o.ref || (o.no ? String(o.no) : o.invoiceNo ? String(o.invoiceNo).padStart(6, "0") : "Draft");
let modsP: Promise<any> | null = null;
const loadMods = () => (window as any).SkwydMods ? Promise.resolve((window as any).SkwydMods) : modsP ||= new Promise((res, rej) => { const s = document.createElement("script"); s.src = new URL("../modpick.js", location.href.split("#")[0]).href; s.onload = () => res((window as any).SkwydMods); s.onerror = () => { modsP = null; rej(new Error("The modifier picker couldn't load.")); }; document.head.appendChild(s); });

export default function CallCenterOrder({ order, onClose }: { order: any | null; onClose: () => void }) {
  const s = useS(["products", "categories", "modifiers", "modifier_options", "branches", "brands", "taxes", "tax_groups", "charges", "settings", "order_sources", "zones", "variant_sets"]);
  const { staff } = useAuth(), by = who(staff);
  const o = order, locked = !!o && o.status !== "draft", ro = !!o && !["draft", "review", "pending"].includes(o.status);
  const sp = (() => { const p = String(o?.phone || ""), cc = CCS.find(x => p.startsWith(x)) || "+961"; return { cc, num: p.startsWith(cc) ? p.slice(cc.length) : p }; })();
  const [cc, setCc] = useState(sp.cc), [num, setNum] = useState(sp.num), [name, setName] = useState(o?.customerName || ""), [type, setType] = useState(o?.type === "delivery" ? "delivery" : "pickup");
  const [source, setSource] = useState(o?.source || ""), [brand, setBrand] = useState(o?.brandId || ""), [branch, setBranch] = useState(o?.branchId || ""), [addr, setAddr] = useState<Addr>(addrSplit(o?.address));
  const [cart, setCart] = useState<any[]>(o ? (o.items || []).map((i: any) => ({ ...i })) : []), [cat, setCat] = useState(""), [q, setQ] = useState("");
  const [discType, setDiscType] = useState(o?.discountType === "amt" ? "amt" : "pct"), [disc, setDisc] = useState<number>(o ? (o.discountType === "amt" ? +o.discount || 0 : +o.discountPct || 0) : 0);
  const [chg, setChg] = useState<Set<string> | null>(o ? new Set((o.charges || []).map((c: any) => c.id)) : null), [open, setOpen] = useState<Record<string, number>>(() => Object.fromEntries((o?.charges || []).filter((c: any) => c.type === "open").map((c: any) => [c.id, +c.amount || 0])));
  const [notes, setNotes] = useState(o?.notes || ""), [rnotes, setRNotes] = useState(o?.receiptNotes || ""), [cust, setCust] = useState<any>(null), [past, setPast] = useState<any[]>([]), [addrIx, setAddrIx] = useState<number | null>(null);
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false), [dlg, setDlg] = useState<"" | "disc" | "chg" | "notes" | "reason">("");
  const phone = num.trim() ? (num.trim().startsWith("+") ? num.replace(/[^0-9+]/g, "") : cc + num.replace(/\D/g, "").replace(/^0+/, "")) : "";
  // the customer: looked up by phone (the same number written with or without the country code or a leading 0)
  useEffect(() => { if (phone.length < 6) { setCust(null); setPast([]); return; } let off = false;
    const t = setTimeout(async () => { const m = CCS.slice().sort((a, b) => b.length - a.length).find(c => phone.startsWith(c)), n = m ? phone.slice(m.length) : "", vars = [...new Set([phone, ...(m ? [n, "0" + n, m + " " + n] : [])])];
      const { data } = await sb.from("customers").select("id,name,phone,addresses,blacklisted,notes,tags,created_at").in("phone", vars).limit(1); if (off) return; const c = data?.[0] || null; setCust(c);
      if (!c) { setPast([]); return; } if (!locked && !name.trim() && c.name) setName(c.name);
      const { data: p } = await sb.from("orders").select("id,status,total,items,type,created_at").eq("customer_id", c.id).order("created_at", { ascending: false }).limit(100); if (!off) setPast(p || []); }, 300);
    return () => { off = true; clearTimeout(t); }; }, [phone]); // eslint-disable-line react-hooks/exhaustive-deps
  const S0 = s;
  const derived = useMemo(() => { if (!S0) return null; const s = S0;
    const set = (id: string) => (s.settings.find(x => x.id === id) as any) || {}, co = coSet();
    const brandSet = (id: string) => ({ webOrderRoute: co.webOrderRoute || "branch", ...set("brand_" + id) });
    const brands = s.brands.filter(b => live(b) && b.active !== false);
    const branches = s.branches.filter(b => (live(b) && b.active !== false && b.callCenter !== false && !((brandSet(b.brandId) as any).ccInactiveBranches || []).includes(b.id) || b.id === o?.branchId) && (brand ? b.brandId === brand : !brands.length));
    const sources = (() => { const l = s.order_sources.filter(r => live(r) && String(r.name || "").toUpperCase() !== "POS" && !["WEB", "API", "WEBSITE"].includes(String(r.name || "").trim().toUpperCase())).sort(bySort).map(r => r.name); const out = l.length ? l : SOURCES_DEF; return o?.source && !out.includes(o.source) ? [o.source, ...out] : out; })();
    // the store's Call Center sales channel exists (it starts existing; once deleted it is gone until created again)
    const scl = (set("sales_channels").list || []).filter((c: any) => c.kind === "callcenter" && c.branchId === branch), ccOn = !branch || !scl.length || scl.some((c: any) => !c.deleted);
    const chc = s.categories.filter(c => live(c) && c.channel === "callcenter" && catAt(c, branch)).sort(bySort), useCh = chc.length > 0;
    const cats = !ccOn ? [] : (useCh ? chc : s.categories.filter(c => live(c) && !c.channel).sort(bySort)).filter(c => !branch || !offAt(c.inactiveBranchIds, branch, "callcenter"));
    const varParent = (id: string) => s.products.find(x => live(x) && (x.variants || []).some((v: any) => v.productId === id));
    const chPos = (c: Row, p: Row) => { const ids = c.productIds || [], k = [p.id, ...(p.variants || []).map((v: any) => v.productId)].map((x: string) => ids.indexOf(x)).filter((i: number) => i >= 0); return k.length ? Math.min(...k) : -1; };
    const prods = ((brands.length && !brand) || !branch || !ccOn) ? [] : s.products.filter(p => live(p) && p.active !== false && !offAt(p.inactiveBranchIds, branch, "callcenter") && !typeOff(p.inactiveBranchIds, branch, "callcenter", type)
      && (useCh ? chc.some(c => chPos(c, p) >= 0 || (varParent(p.id) && chPos(c, varParent(p.id)!) >= 0)) : !offAt(s.categories.find(c => c.id === p.categoryId)?.inactiveBranchIds, branch, "callcenter")));
    const inCat = (c: Row, p: Row) => c.channel ? chPos(c, p) >= 0 : p.categoryId === c.id;
    const isKid = (p: Row) => !!varParent(p.id);
    const price = (p: Row) => { const cps = p.customPrices || {}, c = branch && (cps[branch + ":callcenter:" + type] ?? cps[branch + ":callcenter"] ?? cps[branch]); return c != null && c !== "" ? +c : +p.price || 0; };
    // a tax counts only on the order types it applies to
    const taxOn = (x: any) => { const l = x.orderTypes || []; return !l.length || l.includes(type); };
    const prodRates = (id: string) => { const p = s.products.find(x => x.id === id), bg = s.branches.find(b => b.id === branch)?.settings?.taxGroup, g = p && s.tax_groups.find(x => x.id === (p.taxGroup || bg) && live(x)), r = { inc: 0, exc: 0 };
      (g?.taxIds || []).forEach((t: string) => { const x = s.taxes.find(y => y.id === t && live(y)); if (x && taxOn(x)) (r as any)[x.inclusive === false ? "exc" : "inc"] += (+x.rate || 0) / 100; }); return r; };
    const chgRates = (c: any) => { const g = c?.taxGroup && s.tax_groups.find(x => x.id === c.taxGroup && live(x)), r = { inc: 0, exc: 0 }; (g?.taxIds || []).forEach((t: string) => { const x = s.taxes.find(y => y.id === t && live(y)); if (x && taxOn(x)) (r as any)[x.inclusive === false ? "exc" : "inc"] += (+x.rate || 0) / 100; }); return r; };
    // delivery charge from Delivery Charges: the customer's saved address is in a zone this store delivers to
    const zoneCharge = () => { if (type !== "delivery" || !cust) return null; const a = (cust.addresses || []).find((x: any) => x.zoneId && addrJoin(addrSplit(x.address)) === addrJoin(addr)); const z = a && s.zones.find(z => z.id === a.zoneId && live(z) && z.active !== false);
      if (!z || z.branchId !== branch) return null; const id = set("dcharges").map?.[z.id]; const c = id && s.charges.find(x => x.id === id && live(x)); return c && c.active !== false ? c : null; };
    const chList = s.charges.filter(c => live(c) && (!(c.orderTypes || []).length || c.orderTypes.includes(type === "takeaway" ? "pickup" : type)) && (!(c.brandIds || []).length || c.brandIds.includes(brand)) && (!(c.branchIds || []).length || c.branchIds.includes(branch))).sort(bySort);
    const zc = zoneCharge(); if (zc && !chList.some(c => c.id === zc.id)) chList.push(zc);
    return { brands, branches, sources, cats, prods, inCat, isKid, price, prodRates, chgRates, chList, zc, brandSet, co };
  }, [S0, brand, branch, type, cust, addr, o]); // eslint-disable-line react-hooks/exhaustive-deps
  // a brand with one store taking call center orders: pick it; the brand's default source
  useEffect(() => { if (!derived) return; if (!branch && derived.branches.length === 1) setBranch(derived.branches[0].id); const ds = (derived.brandSet(brand || derived.branches[0]?.brandId || "") as any).ccDefaultSource; if (ds && !source && derived.sources.includes(ds)) setSource(ds); }, [brand, derived?.branches.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (derived && derived.brands.length === 1 && !brand) setBrand(derived.brands[0].id); }, [derived?.brands.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!s || !derived) return null;
  const D = derived, picked = D.chList.filter(c => chg ? chg.has(c.id) : c.id === D.zc?.id);
  const gross0 = cart.reduce((a, i) => a + lineNet(i), 0), discAmt = discType === "amt" ? Math.min(+disc || 0, gross0) : gross0 * (+disc || 0) / 100;
  // totals: inclusive taxes are inside the prices, exclusive ones are added; charges on the gross (or after the discount); rounding rules last
  const calc = (() => { let gross = 0, tax = 0, add = 0;
    cart.forEach(i => { const l = lineNet(i), r = D.prodRates(i.productId), base = l / (1 + r.inc); gross += l; tax += (l - base) + base * r.exc; add += base * r.exc; });
    const d = Math.min(+discAmt || 0, gross); if (gross > 0 && d > 0) { tax *= 1 - d / gross; add *= 1 - d / gross; }
    const ch = picked.map(c => { const b = D.co.chargesBeforeDisc !== false ? gross : gross - d, amount = +(c.type === "percent" ? b * (+c.value || 0) / 100 : c.type === "open" ? +(open[c.id] ?? c.value ?? 0) || 0 : +c.value || 0).toFixed(2), r = D.chgRates(c), base = amount / (1 + r.inc); tax += (amount - base) + base * r.exc; add += base * r.exc;
      return { id: c.id, name: c.name, type: c.type, value: c.type === "open" ? amount : +c.value || 0, amount, ...(c.taxGroup ? { taxGroup: c.taxGroup } : {}) }; }), chT = ch.reduce((a, c) => a + c.amount, 0);
    const raw = +(gross - d + chT + add).toFixed(2), total = +rrApply(raw, Math.min(2, D.co.priceDecimals ?? 2), D.co.roundRules1).toFixed(2);
    return { gross: +gross.toFixed(2), disc: d, charges: ch, chargesTotal: +chT.toFixed(2), tax: +tax.toFixed(2), total, rounding: +(total - raw).toFixed(2) }; })();
  const delMiss = type === "delivery" ? ([["street", "area / street"], ["building", "building"], ["floor", "floor"]] as const).filter(([k]) => !addr[k]) : [];

  async function addProduct(p: Row) {
    try {
      const M = await loadMods(); const kids = (p.variants || []).map((v: any) => ({ name: v.name, p: D.prods.find(x => x.id === v.productId) })).filter((x: any) => x.p);
      if (kids.length && M.variant) { const vs = s!.variant_sets.find(x => x.id === p.variantSetId && live(x)); const v = await M.variant({ name: p.name, setName: vs?.name || (p.variants || []).find((x: any) => x.group)?.group || "Variant", variants: kids.map((k: any) => ({ name: k.name, price: D.price(k.p), id: k.p.id })), money }); if (!v) return; return addProduct(kids.find((k: any) => k.p.id === v.id).p); }
      let price = D.price(p), options: any[] = [], mods = "", note = "";
      if ((p.modifiers || []).length) {
        const groups: any = {}; s!.modifiers.filter(live).forEach(m => groups[m.id] = { name: m.name, sort: m.sort });
        const ids = new Set((p.modifiers || []).map((l: any) => l.modifierId)), linkOpt = (op: Row) => (((p.modifiers || []).find((l: any) => l.modifierId === op.modifierId)?.opts) || {})[op.id] || {};
        const k = branch + ":callcenter", kt = k + ":" + type;
        const opts = s!.modifier_options.filter(op => live(op) && op.active !== false && ids.has(op.modifierId) && !offAt(op.inactiveBranchIds, branch, "callcenter") && !typeOff(op.inactiveBranchIds, branch, "callcenter", type))
          .sort((x, y) => (x.sort ?? 999) - (y.sort ?? 999) || x.name.localeCompare(y.name))
          .filter(op => { const st = linkOpt(op), l = (p.modifiers || []).find((x: any) => x.modifierId === op.modifierId); return !(st.off || []).includes(k) && !(st.off || []).includes(kt) && !(l?.offTypes || []).includes(kt); })
          .map(op => { const st = linkOpt(op), pt = (st.price || {})[kt], spp = pt != null && pt !== "" ? pt : (st.price || {})[k], c = spp != null && spp !== "" ? spp : ((op.customPrices || {})[k] ?? (op.customPrices || {})[branch]);
            return { id: op.id, modifierId: op.modifierId, name: op.name, price: c != null && c !== "" ? +c : +op.price || 0, oos: (op.outOfStockBranchIds || []).includes(branch) || (st.oos || []).includes(branch) }; });
        const links = (p.modifiers || []).filter((l: any) => groups[l.modifierId] && opts.some(x => x.modifierId === l.modifierId));   // a modifier with no active options is hidden
        const r = await M.pick({ name: p.name, basePrice: price, links, groups, options: opts, money, askNote: true }); if (!r) return;
        options = r.options; mods = r.mods; price = r.unitPrice; note = r.note || "";
      }
      setCart(c => { const k = M.key(p.id, options), ex = !note && c.find(i => !i.note && M.key(i.productId, i.options) === k);
        if (ex) return c.map(i => i === ex ? { ...i, qty: +i.qty + 1 } : i);
        return [...c, { productId: p.id, name: p.name, price, qty: 1, ...(options.length ? { options } : {}), ...(note ? { note } : {}), ...(options.length || note ? { mods: M.label(mods, note) } : {}) }]; });
    } catch (e: any) { toast(e.message || "Couldn't add the item.", "error"); }
  }
  async function save(status: string, extra?: any) {
    setErr("");
    if (!phone) return setErr("Enter the customer's phone number."); if (!name.trim()) return setErr("Enter the customer's name.");
    if (!source) return setErr("Choose the order source."); if (!type) return setErr("Choose the order type: delivery or pickup.");
    const bs: any = D.brandSet(brand || s!.branches.find(b => b.id === branch)?.brandId || "");
    if ((bs.ccInactiveTypes || []).includes(type)) return setErr(`${type === "delivery" ? "Delivery" : "Pickup"} orders aren't taken by the call center for this brand.`);
    const sent = status !== "draft";
    if (status === "pending" && (!o || o.status === "draft")) { const bb = s!.branches.find(x => x.id === branch); if (bb && !brOpenNow(bb)) { const hh = brHours(bb); return setErr(`${bb.name} is closed now${hh ? " (" + hh + ")" : ""}. Save it as a draft and send it when the store opens.`); } }
    if (sent && D.brands.length && !brand) return setErr("Choose the brand."); if (sent && !branch) return setErr("Pick the store that will prepare this order.");
    if (sent && !cart.length) return setErr("Add at least one item.");
    if (sent && delMiss.length) return setErr("Delivery address needs the " + delMiss.map(x => x[1]).join(", ").replace(/, ([^,]*)$/, " and $1") + ".");
    const dq = { discount: calc.disc, discountType: discType, discountPct: discType === "pct" ? +disc || 0 : (calc.gross ? +(calc.disc / calc.gross * 100).toFixed(2) : 0) };
    const data: any = locked
      ? { source, type, notes: notes.trim(), receiptNotes: rnotes.trim(), items: cart, ...dq, subtotal: calc.gross, charges: calc.charges, chargesTotal: calc.chargesTotal, total: calc.total, ...(type === "delivery" && !o.address ? { address: addrJoin(addr) } : {}) }
      : { brandId: brand, phone, customerName: name.trim(), source, type, address: type === "delivery" ? addrJoin(addr) : "", branchId: branch, notes: notes.trim(), receiptNotes: rnotes.trim(), items: cart, ...dq, subtotal: calc.gross, charges: calc.charges, chargesTotal: calc.chargesTotal, total: calc.total, status };
    if (!o) { data.agent = by; data.channel = "callcenter"; }
    if (extra) Object.assign(data, extra);
    setBusy(true);
    try { await put("orders", o?.id || newId("ord"), data);
      const bn = s!.branches.find(b => b.id === (o?.branchId || branch))?.name || "the store";
      toast(o && o.status !== "draft" ? `Order ${ccLabel(o)} updated · ${bn} sees the changes` : status === "pending" ? `Order sent to ${bn}` : "Draft saved"); onClose(); }
    catch { setErr("Couldn't save the order."); } finally { setBusy(false); }
  }
  async function setStatus(st: string, why?: string) {
    setBusy(true);
    try { if (st === "pending") await save("keep" as any, { status: "pending", agent: by });
      else { await put("orders", o.id, { status: st, voidReason: why, doneAt: new Date().toISOString(), handledBy: by }); toast("Order " + (o.status === "review" ? "declined" : "cancelled")); onClose(); } }
    catch { setErr("Couldn't update the order."); } finally { setBusy(false); }
  }
  const cats = D.cats.filter(c => D.prods.some(p => D.inCat(c, p)));
  const shown = D.prods.filter(p => !D.isKid(p) && (q.trim() ? p.name.toLowerCase().includes(q.trim().toLowerCase()) : !cat || D.inCat(D.cats.find(c => c.id === cat)!, p)));
  const ok = past.filter(x => ["pending", "active", "closed"].includes(x.status)), spent = ok.reduce((a, x) => a + (+x.total || 0), 0);
  const reasons = (() => { const a: any = s.settings.find(x => x.id === "app") || {}; return a.cancelReasons == null ? ["Customer cancelled", "Duplicate order", "Wrong order details"] : String(a.cancelReasons).split("\n").map((x: string) => x.trim()).filter(Boolean); })();
  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent fullScreen className="overflow-hidden p-0 sm:p-0">
        <div className="flex h-full min-h-0 w-full flex-col">
          <DialogHeader className="flex-row items-center gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <DialogTitle className="text-lg font-semibold text-gray-800 dark:text-white/90">{o ? `Order ${ccLabel(o)}` : "New Call Center Order"}</DialogTitle>
            {o && <Badge variant="light" color={o.status === "pending" || o.status === "review" ? "warning" : o.status === "draft" ? "light" : "primary"}>{({ review: "Waiting for call center", draft: "Draft", pending: "Sent to store", active: "Preparing" } as any)[o.status] || o.status}</Badge>}
          </DialogHeader>
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[320px_380px_1fr] lg:overflow-hidden">
            {/* customer and order details */}
            <section className="space-y-4 border-gray-200 p-5 lg:overflow-y-auto lg:border-e dark:border-gray-800">
              <div className="grid grid-cols-2 gap-2">{[["pickup", "Pickup"], ["delivery", "Delivery"]].map(([k, t]) => <button key={k} type="button" disabled={ro || (!!o && !["callcenter", "pos"].includes(o.channel))} onClick={() => setType(k)}
                className={cn("h-11 rounded-lg border text-sm font-medium", type === k ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10" : "border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-400")}>{t}</button>)}</div>
              <F l="Order Source" req><select className={SEL} disabled={ro || (!!o && !["callcenter", "pos"].includes(o.channel))} value={source} onChange={e => setSource(e.target.value)}><option value="">Choose…</option>{D.sources.map(x => <option key={x}>{x}</option>)}</select></F>
              {D.brands.length > 0 && <F l="Brand" req><select className={SEL} disabled={locked} value={brand} onChange={e => { setBrand(e.target.value); setBranch(""); setCat(""); }}><option value="">Choose…</option>{D.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></F>}
              <F l="Store" req><select className={SEL} disabled={locked} value={branch} onChange={e => { setBranch(e.target.value); setCat(""); }}><option value="">Choose…</option>{D.branches.map(b => <option key={b.id} value={b.id}>{b.name}{brOpenNow(b) ? "" : " · closed now"}</option>)}</select></F>
              <F l="Customer Phone" req><div className="flex gap-2"><select aria-label="Country code" className={cn(SEL, "w-24 shrink-0")} disabled={locked} value={cc} onChange={e => setCc(e.target.value)}>{CCS.map(x => <option key={x}>{x}</option>)}</select>
                <Input className="h-11 flex-1" type="tel" inputMode="tel" disabled={locked} value={num} onChange={e => setNum(e.target.value)} autoFocus={!o} /></div></F>
              {cust && <div className="space-y-1 text-xs">{cust.blacklisted && <p className="font-semibold text-red-500">⚠ Blacklisted customer.</p>}{(cust.tags || []).length > 0 && <div className="flex flex-wrap gap-1">{cust.tags.map((t: string) => <Badge key={t} variant="light" color="primary">{t}</Badge>)}</div>}{cust.notes && <p className="text-gray-500 italic">{cust.notes}</p>}</div>}
              <F l="Customer Name" req><Input className="h-11" disabled={locked} value={name} onChange={e => setName(e.target.value)} /></F>
              {cust && <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-3 text-xs dark:bg-white/3">{[["Orders", String(ok.length)], ["Total spent", money(spent)], ["Avg. order", money(ok.length ? spent / ok.length : 0)], ["Last order", ok[0] ? new Date(ok[0].created_at).toLocaleDateString("en-GB") : "—"]].map(([l, v]) =>
                <div key={l}><span className="block text-gray-500">{l}</span><b className="text-gray-800 dark:text-white/90">{v}</b></div>)}</div>}
              {type === "delivery" && <div className="space-y-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                <b className="block text-sm font-medium text-gray-800 dark:text-white/90">Delivery Address</b>
                {!!(cust?.addresses || []).length && !(locked && o?.address) && <div className="flex flex-wrap gap-2">{cust.addresses.map((a: any, i: number) => <button key={i} type="button" onClick={() => { setAddr(addrSplit(a.address)); setAddrIx(i); }}
                  className={cn("rounded-lg border px-2.5 py-1.5 text-start text-xs", addrIx === i ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-gray-200 dark:border-gray-800")}><b className="block">{addrSplit(a.address).label || "Address " + (i + 1)}</b><span className="text-gray-500">{addrSplit(a.address).street}</span></button>)}</div>}
                {([["label", "Address type (Home, Work…)"], ["street", "Area / street *"], ["building", "Building name / no. *"], ["floor", "Floor / Apartment no. *"], ["door", "Door details / Name on intercom"], ["extra", "Instructions"]] as const).map(([k, ph]) =>
                  <Input key={k} className="h-10" disabled={ro || (locked && !!o?.address)} placeholder={ph} value={addr[k]} onChange={e => { setAddr({ ...addr, [k]: e.target.value }); setAddrIx(null); }} />)}
                {D.zc && <p className="text-xs text-gray-500">Delivery charge: {D.zc.name} ({money(+D.zc.value || 0)})</p>}
              </div>}
            </section>
            {/* the call center menu */}
            {/* the cart */}
            <section className="flex min-h-0 flex-col border-gray-200 lg:border-e dark:border-gray-800">
              {!ro && <div className="flex gap-2 border-b border-gray-200 p-3 dark:border-gray-800"><Button size="sm" variant="outline" onClick={() => setDlg("disc")}>Discount</Button><Button size="sm" variant="outline" onClick={() => setDlg("chg")}>Charges</Button><Button size="sm" variant="outline" onClick={() => setDlg("notes")}>Notes</Button></div>}
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">{!cart.length ? <p className="py-10 text-center text-sm text-gray-500">No items yet.</p> : cart.map((i, ix) => (
                <div key={ix} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                  <div className="flex items-start justify-between gap-2"><b className="text-sm font-medium text-gray-800 dark:text-white/90">{i.name}</b><span className="text-sm text-gray-800 dark:text-white/90">{money(lineNet(i))}</span></div>
                  {i.mods && <p className="mt-0.5 text-xs text-gray-500">{i.mods}</p>}
                  {!ro && <div className="mt-2 flex items-center gap-2"><Button size="icon-xs" variant="outline" aria-label="Less" onClick={() => setCart(c => +i.qty <= 1 ? c.filter((_, j) => j !== ix) : c.map((x, j) => j === ix ? { ...x, qty: +x.qty - 1 } : x))}><MinusIcon className="size-3.5" /></Button>
                    <span className="w-6 text-center text-sm">{i.qty}</span><Button size="icon-xs" variant="outline" aria-label="More" onClick={() => setCart(c => c.map((x, j) => j === ix ? { ...x, qty: +x.qty + 1 } : x))}><PlusIcon className="size-3.5" /></Button>
                    <button type="button" aria-label="Remove" className="ms-auto text-gray-400 hover:text-red-500" onClick={() => setCart(c => c.filter((_, j) => j !== ix))}><TrashBinIcon className="size-4" /></button></div>}
                </div>))}</div>
              <div className="space-y-1.5 border-t border-gray-200 p-4 text-sm dark:border-gray-800">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{money(calc.gross)}</span></div>
                {calc.disc > 0 && <div className="flex justify-between text-gray-500"><span>Discount{discType === "pct" ? ` (${disc}%)` : ""}</span><span>−{money(calc.disc)}</span></div>}
                {calc.charges.map(c => <div key={c.id} className="flex justify-between text-gray-500"><span>{c.name}</span><span>{money(c.amount)}</span></div>)}
                <div className="flex justify-between text-gray-500"><span>Tax</span><span>{money(calc.tax)}</span></div>
                {calc.rounding !== 0 && <div className="flex justify-between text-gray-500"><span>Rounding</span><span>{money(calc.rounding)}</span></div>}
                <div className="flex justify-between pt-1 text-base font-semibold text-gray-800 dark:text-white/90"><span>Total</span><span>{money(calc.total)}</span></div>
                {(notes || rnotes) && <p className="pt-1 text-xs text-gray-500">{notes && <>Kitchen: {notes}<br /></>}{rnotes && <>Receipt: {rnotes}</>}</p>}
                {err && <p className="pt-1 text-sm text-red-500">{err}</p>}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="outline" onClick={onClose}>Close</Button>
                  {(!o || o.status === "draft") && <><Button variant="outline" disabled={busy} onClick={() => save("draft")}>Save Draft</Button><Button className="flex-1" disabled={busy} onClick={() => save("pending")}>{busy ? "Sending…" : "Send"}</Button></>}
                  {o?.status === "draft" && <Button variant="destructive" disabled={busy} onClick={async () => { try { await put("orders", o.id, { deleted: true }); toast("Draft cancelled"); onClose(); } catch { toast("Couldn't cancel the draft.", "error"); } }}>Cancel Draft</Button>}
                  {o?.status === "review" && <><Button variant="destructive" disabled={busy} onClick={() => setDlg("reason")}>Decline</Button><Button className="flex-1" disabled={busy} onClick={() => setStatus("pending")}>Accept</Button></>}
                  {o?.status === "pending" && <><Button variant="outline" disabled={busy} onClick={() => save("keep" as any)}>Edit & Send</Button><Button variant="destructive" disabled={busy} onClick={() => setDlg("reason")}>Cancel Order</Button></>}
                </div>
              </div>
            </section>
            <section className="flex min-h-0 flex-col p-5 lg:overflow-hidden">
              {!branch || (D.brands.length && !brand) ? <p className="m-auto text-center text-sm text-gray-500">Choose the brand and the store to see the menu.</p> : ro ? <p className="m-auto text-center text-sm text-gray-500">This order can't be changed here.</p> : <>
                <InputGroup className="mb-3 h-11"><InputGroupAddon align="inline-start"><SearchIcon className="size-5 text-gray-400" /></InputGroupAddon><InputGroupInput placeholder="Search items..." value={q} onChange={e => setQ(e.target.value)} /></InputGroup>
                {/* categories as tiles; a category opens its items with Back (search shows matching items from every category) */}
                {!q.trim() && cat && <div className="mb-3 flex items-center gap-3"><Button size="sm" variant="outline" onClick={() => setCat("")}>‹ Back</Button><b className="text-base font-semibold text-gray-800 dark:text-white/90">{cats.find(c => c.id === cat)?.name}</b></div>}
                {!q.trim() && !cat ? <div className="custom-scrollbar grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">{cats.map(c => { const n = D.prods.filter(p => !D.isKid(p) && D.inCat(c, p)).length; return (
                  <button key={c.id} type="button" onClick={() => setCat(c.id)} className="flex min-h-24 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-start transition hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900">
                    {c.imageUrl ? <img src={c.imageUrl} alt="" className="h-24 w-full object-cover" /> : <span className="h-2 bg-brand-500" />}
                    <span className="flex flex-1 flex-col p-3"><b className="text-sm font-semibold text-gray-800 dark:text-white/90">{c.name}</b><span className="mt-auto pt-1 text-sm text-gray-500">{n} {n === 1 ? "item" : "items"}</span></span></button>); })}
                  {!cats.length && <p className="col-span-full py-10 text-center text-sm text-gray-500">No categories on this menu.</p>}</div> : <>
                <div className="custom-scrollbar grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">{shown.map(p => { const oos = (p.outOfStockBranchIds || []).includes(branch); return (
                  <button key={p.id} type="button" disabled={oos} onClick={() => addProduct(p)} className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-start transition hover:border-brand-300 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900">
                    {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-24 w-full object-cover" /> : <span className="h-2 bg-brand-50 dark:bg-brand-500/10" />}
                    <span className="flex flex-1 flex-col p-3"><b className="text-sm font-medium text-gray-800 dark:text-white/90">{p.name}</b><span className="mt-auto pt-1 text-sm text-gray-500">{oos ? "Out of stock" : (p.variants || []).length ? "Choose…" : money(D.price(p))}</span></span></button>); })}
                  {!shown.length && <p className="col-span-full py-10 text-center text-sm text-gray-500">No items here.</p>}</div></>}
              </>}
            </section>
          </div>
        </div>
        {dlg === "disc" && <Small title="Discount" onClose={() => setDlg("")}>
          <div className="flex gap-2">{[["pct", "Percentage"], ["amt", "Amount"]].map(([k, t]) => <button key={k} type="button" onClick={() => setDiscType(k)} className={cn("h-10 flex-1 rounded-lg border text-sm", discType === k ? "border-brand-500 bg-brand-50 text-brand-600" : "border-gray-300 text-gray-600 dark:border-gray-700")}>{t}</button>)}</div>
          <F l={discType === "pct" ? "Discount (%)" : "Discount Amount"}><Input className="h-11" type="number" min="0" max={discType === "pct" ? 100 : undefined} step="any" value={disc || ""} onChange={e => setDisc(Math.max(0, Math.min(discType === "pct" ? 100 : 1e9, +e.target.value || 0)))} /></F></Small>}
        {dlg === "chg" && <Small title="Charges" onClose={() => setDlg("")}>{!D.chList.length ? <p className="text-sm text-gray-500">No charges apply to this order type and store.</p> : D.chList.map(c => { const on = picked.some(x => x.id === c.id); return (
          <div key={c.id} className="flex items-center gap-3"><label className="flex flex-1 cursor-pointer items-center gap-3 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={on} onChange={e => { const n = new Set(picked.map(x => x.id)); if (e.target.checked) n.add(c.id); else n.delete(c.id); setChg(n); }} />{c.name}</label>
            {c.type === "open" ? <Input className="h-9 w-28" type="number" min="0" step="any" value={open[c.id] ?? c.value ?? ""} onChange={e => setOpen({ ...open, [c.id]: +e.target.value || 0 })} /> : <span className="text-sm text-gray-500">{c.type === "percent" ? (+c.value || 0) + "%" : money(+c.value || 0)}</span>}</div>); })}</Small>}
        {dlg === "notes" && <Small title="Notes" onClose={() => setDlg("")}><F l="Kitchen Notes"><Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} /></F><F l="Receipt Notes"><Textarea rows={3} value={rnotes} onChange={e => setRNotes(e.target.value)} /></F></Small>}
        {dlg === "reason" && <ReasonDlg title={o?.status === "review" ? "Decline order: reason" : "Cancel order: reason"} reasons={reasons} onClose={() => setDlg("")} onGo={why => { setDlg(""); setStatus("declined", why); }} />}
      </DialogContent>
    </Dialog>);
}
const Small = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
  <Dialog open onOpenChange={v => !v && onClose()}><DialogContent className="w-full p-6 sm:max-w-md"><DialogHeader><DialogTitle className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</DialogTitle></DialogHeader>
    <div className="mt-4 space-y-4">{children}</div><div className="mt-6 flex justify-end"><Button onClick={onClose}>Done</Button></div></DialogContent></Dialog>);
function ReasonDlg({ title, reasons, onClose, onGo }: { title: string; reasons: string[]; onClose: () => void; onGo: (why: string) => void }) {
  const [pick, setPick] = useState(reasons.length ? "" : "_other"), [txt, setTxt] = useState(""), [err, setErr] = useState("");
  return <Small title={title} onClose={onClose}>
    <div className="flex flex-wrap gap-2">{[...reasons, "_other"].map(r => <button key={r} type="button" onClick={() => setPick(r)} className={cn("rounded-lg border px-3 py-2 text-sm", pick === r ? "border-brand-500 bg-brand-50 text-brand-600" : "border-gray-300 text-gray-600 dark:border-gray-700")}>{r === "_other" ? "Other…" : r}</button>)}</div>
    {pick === "_other" && <Input className="h-11" autoFocus placeholder="Write the reason" value={txt} onChange={e => setTxt(e.target.value)} />}
    {err && <p className="text-sm text-red-500">{err}</p>}
    <Button variant="destructive" onClick={() => { const v = pick === "_other" ? txt.trim() : pick; if (!v) return setErr("Choose a reason."); onGo(v); }}>{title.startsWith("Decline") ? "Decline Order" : "Cancel Order"}</Button>
  </Small>;
}
