// Web Ordering → Settings: each brand's ordering page (settings "online_<brand>" and the brand's web address), with the same
// Storefront / Appearance / Checkout / Stores tabs and the live preview of order.html (the page listens for "skwyd-web-cfg" messages).
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CopyIcon, ShareIcon } from "@/icons";
import { put, useCol } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { coSet, sym } from "@/lib/util";
import { cn } from "@/utils";
import { useEffect, useRef, useState } from "react";
import { live } from "../crud/CrudPage";
import { EmptyState } from "../ui/EmptyState";
import { F, SEL } from "../ui/kit";
import { ImageField } from "../ui/ImageField";
import { SegTabs } from "../ui/SegTabs";
import { toast } from "../ui/toast";

const ENVP = "dev."; // same as the portal: links stay on the dev addresses until the live system launches
const ORDER_HOST = "https://" + ENVP + "order.skwydhub.com/";
const RESERVED = new Set(["order", "hub", "admin", "portal", "api", "www", "app", "help", "login", "signup", "pos", "skwyd", "skwydhub"]);
const SLUG_OK = /^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])?$/;
const PRE: [string, string, string][] = [["Royal", "#007AFF", "light"], ["Wok red", "#d62828", "light"], ["Ember", "#f26b1d", "warm"], ["Golden", "#e8a317", "warm"], ["Forest", "#1f7a4d", "light"], ["Ocean", "#0e6ba8", "light"], ["Rose", "#e0457b", "light"], ["Charcoal", "#23222b", "light"], ["Midnight", "#f4b400", "dark"], ["Neon", "#007AFF", "dark"]];
const t12 = (t?: string) => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return ((h % 12) || 12) + ":" + String(m || 0).padStart(2, "0") + (h < 12 ? " am" : " pm"); };
const guess = (n: string) => String(n || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
const clone = (x: any) => JSON.parse(JSON.stringify(x || {}));

const Tg = ({ on, set, l, note }: { on: boolean; set: (v: boolean) => void; l: string; note?: string }) => (
  <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
    <span><span className="block text-sm font-medium text-gray-900 dark:text-gray-50">{l}</span>{note && <span className="text-xs text-gray-500 dark:text-gray-400">{note}</span>}</span>
    <Switch checked={on} onCheckedChange={v => set(!!v)} /></label>);
const Card = ({ title, note, children, right }: { title: string; note?: string; children: React.ReactNode; right?: React.ReactNode }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-800 dark:bg-[#090E1A]">
    <div className="mb-3 flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{title}</h3>{note && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{note}</p>}</div>{right}</div>
    {children}</div>);
function Radios({ value, set, opts }: { value: string; set: (v: string) => void; opts: [string, string, string?][] }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{opts.map(([v, t, s]) => (
    <button key={v} type="button" onClick={() => set(v)} aria-pressed={value === v}
      className={cn("rounded-md border p-3 text-start text-sm transition-colors", value === v ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10" : "border-gray-200 hover:border-gray-300 dark:border-gray-800")}>
      <b className={cn("block font-medium", value === v ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-gray-50")}>{t}</b>{s && <span className="text-xs text-gray-500">{s}</span>}</button>))}</div>;
}

export default function WebOrderingPage() {
  const brands = useCol("brands"), branches = useCol("branches"), sets = useCol("settings"), zones = useCol("zones");
  const [brand, setBrand] = useState(""), [tab, setTab] = useState("store"), [dev, setDev] = useState("phone");
  const [c, setC] = useState<any>(null), [slug, setSlug] = useState(""), [slugMsg, setSlugMsg] = useState<[string, boolean | null]>(["", null]), [busy, setBusy] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null), slugN = useRef(0);
  const bl = (brands || []).filter(b => live(b) && b.active !== false);
  const bid = bl.some(b => b.id === brand) ? brand : bl[0]?.id || "";
  const br = bl.find(b => b.id === bid);
  // load the brand's saved settings once (and again when the brand changes)
  useEffect(() => { if (!sets || !bid) return; setC(clone(sets.find(x => x.id === "online_" + bid) || {})); setSlug(br?.slug || guess(br?.name)); setSlugMsg(["", null]); }, [bid, !!sets]); // eslint-disable-line react-hooks/exhaustive-deps
  // live preview: the ordering page in the frame applies the draft
  const send = () => { if (c) frame.current?.contentWindow?.postMessage({ type: "skwyd-web-cfg", cfg: c }, location.origin); };
  useEffect(() => { const t = setTimeout(send, 120); return () => clearTimeout(t); }); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const f = (e: MessageEvent) => { if (e.origin === location.origin && e.data?.type === "skwyd-web-ready") send(); }; addEventListener("message", f); return () => removeEventListener("message", f); });
  // the web address is checked as you type (free across every business)
  useEffect(() => {
    const v = slug.trim().toLowerCase(); if (!bid) return;
    if (v && v === br?.slug) return setSlugMsg([`${ENVP}order.skwydhub.com/${v} is your current address.`, true]);
    if (!SLUG_OK.test(v)) return setSlugMsg(["Use 3 to 40 letters, numbers or dashes (no spaces).", false]);
    if (RESERVED.has(v)) return setSlugMsg([`/${v} is not available. Choose another one.`, false]);
    setSlugMsg(["Checking…", null]); const my = ++slugN.current;
    const t = setTimeout(async () => { const { data, error } = await sb.rpc("skwyd_slug_free", { p_slug: v, p_brand: bid }); if (my !== slugN.current) return;
      setSlugMsg(error ? ["Couldn't check the address right now.", null] : data ? [`order.skwydhub.com/${v} is available.`, true] : [`/${v} is already taken. Try another one, e.g. /${v}-online.`, false]); }, 300);
    return () => clearTimeout(t);
  }, [slug, bid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!brands || !branches || !sets || !zones) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  if (!bid) return <><PageBreadcrumb pageTitle="Web Ordering" /><EmptyState text="Each brand has its own ordering page. Create a brand in Manage → Brands first." /></>;
  if (!c) return null;
  const up = (path: string, v: any) => setC((o: any) => { const n = clone(o), ks = path.split("."); let x = n; ks.slice(0, -1).forEach(k => { x = x[k] ||= {}; }); x[ks[ks.length - 1]] = v; return n; });
  const th = c.theme || {}, co = c.checkout || {}, sh = c.show || {}, md = c.modes || {}, bc = c.branches || {};
  const link = br?.slug ? ORDER_HOST + br.slug : "";
  const acc = th.accent || "#007AFF", cur2 = coSet().currency2;
  async function save() {
    const sl = slug.trim().toLowerCase();
    if (sl !== (br?.slug || "")) {
      if (!SLUG_OK.test(sl)) return toast("The web address must be 3 to 40 letters, numbers or dashes.", "error");
      if (RESERVED.has(sl)) return toast("That web address is not available. Choose another one.", "error");
      const fr = await sb.rpc("skwyd_slug_free", { p_slug: sl, p_brand: bid }); if (fr.data === false) return toast("That web address is already taken. Choose another one.", "error");
      try { await put("brands", bid, { slug: sl }); } catch (e: any) { return toast(/duplicate|unique/i.test(e?.message || "") ? "That web address is already taken. Choose another one." : "Couldn't save the web address.", "error"); }
    }
    const { brandName: _d, id: _i, updatedAt: _u, ...rest } = c;
    const data = { ...rest, show: { search: sh.search !== false, desc: sh.desc !== false, soldOut: sh.soldOut !== false, cur2: sh.cur2 === true, branches: false }, gmapsKey: coSet().gmapsKey || "",
      theme: { accent: /^#[\da-f]{6}$/i.test(acc) ? acc : "#007AFF", bg: th.bg || "light", font: "plex", radius: th.radius || "round", header: th.header || "cover", layout: th.layout && th.layout !== "compact" ? th.layout : "grid", logo: th.logo || "", cover: th.cover || "" },
      modes: { delivery: md.delivery !== false, takeaway: md.takeaway !== false, dinein: md.dinein !== false },
      checkout: { schedule: !!co.schedule, scheduleDays: co.scheduleDays ?? 3, slot: co.slot || 30, pay: { cash: (co.pay || {}).cash !== false, card: !!(co.pay || {}).card }, email: co.email === "optional" || co.email === "required" ? "optional" : "off", notes: co.notes !== false, whatsapp: !!co.whatsapp, terms: co.terms || "" } };
    setBusy(true);
    try { await put("settings", "online_" + bid, data); toast("Web ordering saved"); } catch { toast("Couldn't save settings", "error"); }
    setBusy(false);
  }
  const inp = (path: string, l: string, ph?: string, type?: string) => { const v = path.split(".").reduce((o: any, k) => o?.[k], c); return <F l={l}><Input className="h-9" type={type} placeholder={ph} value={v ?? ""} onChange={e => up(path, e.target.value)} /></F>; };
  const stores = branches.filter(b => live(b) && b.active !== false && b.brandId === bid);
  const bset = (id: string, k: string, v: any) => up("branches", { ...bc, [id]: { ...(bc[id] || {}), [k]: v } });
  const previewW = dev === "desk" ? 1440 : dev === "tab" ? 820 : 390, previewH = dev === "desk" ? 900 : dev === "tab" ? 1180 : 780;

  return (
    <>
      <PageBreadcrumb pageTitle="Web Ordering" />
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">Each brand has its own ordering page named after the brand, with its own look, checkout and store settings.</p>
        <Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</Button>
      </div>
      {bl.length > 1 && <SegTabs className="mb-6" value={bid} onChange={b => { setBrand(b); setC(null); }} items={bl.map(b => [b.id, b.name + ((sets.find(x => x.id === "online_" + b.id) as any)?.enabled ? " · Live" : "")])} />}
      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[1fr_440px]">
        <div className="min-w-0 space-y-6">
          <SegTabs value={tab} onChange={setTab} items={[["store", "Storefront"], ["look", "Appearance"], ["checkout", "Checkout"], ["branches", "Stores"]]} />
          {tab === "store" && <>
            <Card title={br?.name || ""} right={<Badge variant="light" color={c.enabled ? "success" : "light"}>{c.enabled ? "Live" : "Off"}</Badge>}>
              <Tg on={!!c.enabled} set={v => up("enabled", v)} l="Accept web orders" note="Turn off to show a “closed” page." />
              <F l="Web Address" req>
                <div className="flex items-center gap-2"><span className="hidden text-sm text-gray-500 sm:inline">{ORDER_HOST.replace(/^https:\/\//, "")}</span>
                  <Input className="h-9 flex-1" value={slug} autoComplete="off" spellCheck={false} maxLength={40} onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))} />
                  {link && <><Button variant="outline" size="icon-lg" aria-label="Copy the link" onClick={() => navigator.clipboard?.writeText(link).then(() => toast("Link copied"))}><CopyIcon className="size-5" /></Button>
                    <a href={link} target="_blank" rel="noopener" aria-label="Open the ordering page" className="inline-flex size-11 items-center justify-center rounded-[10px] border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"><ShareIcon className="size-5" /></a></>}</div>
                <p className={cn("mt-1.5 text-xs", slugMsg[1] === true ? "text-green-600" : slugMsg[1] === false ? "text-red-500" : "text-gray-500")}>{slugMsg[0]}</p></F>
            </Card>
            <Card title="Contact & social" note="Shown as buttons under the brand name.">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">{inp("social.phone", "Phone", "+961 …", "tel")}{inp("social.whatsapp", "WhatsApp number", "+961 …", "tel")}
                {inp("social.instagram", "Instagram", "@thewok")}{inp("social.facebook", "Facebook", "page name or link")}{inp("social.tiktok", "TikTok", "@thewok")}{inp("social.website", "Website", "thewok.com")}</div>
            </Card>
            <Card title="Menu display">
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                <Tg on={sh.search !== false} set={v => up("show.search", v)} l="Search bar" note="Customers can search the menu." />
                <Tg on={sh.desc !== false} set={v => up("show.desc", v)} l="Item descriptions" note="Show the description under each item." />
                <Tg on={sh.soldOut !== false} set={v => up("show.soldOut", v)} l="Show sold-out items" note="Off hides items marked out of stock." />
                <Tg on={sh.cur2 === true} set={v => up("show.cur2", v)} l="Show Secondary Currency" note={cur2 ? `Show each item's price in ${cur2} too, under the main price.` : "Show each item's price in the secondary currency too. Set one up in Manage → Currency first."} />
              </div>
            </Card>
          </>}
          {tab === "look" && <>
            <Card title="Theme" note="Pick a preset, then fine-tune the color.">
              <div className="flex flex-wrap gap-2">{PRE.map(([n, a, b]) => { const on = a.toLowerCase() === acc.toLowerCase() && (th.bg || "light") === b; return (
                <button key={n} type="button" onClick={() => { up("theme", { ...th, accent: a, bg: b }); }} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", on ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10" : "border-gray-200 dark:border-gray-800")}>
                  <span className={cn("size-4 rounded-full ring-2", b === "dark" ? "ring-gray-800" : b === "warm" ? "ring-amber-100" : "ring-gray-100")} style={{ background: a }} /><span className="text-gray-700 dark:text-gray-300">{n}</span></button>); })}</div>
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <F l="Brand color"><div className="flex gap-3"><input type="color" aria-label="Brand color" value={/^#[\da-f]{6}$/i.test(acc) ? acc : "#007AFF"} onChange={e => up("theme.accent", e.target.value)} className="h-9 w-14 cursor-pointer rounded-lg border border-gray-300 bg-transparent p-1 dark:border-gray-700" />
                  <Input className="h-9 flex-1" maxLength={7} spellCheck={false} value={acc} onChange={e => up("theme.accent", e.target.value)} /></div></F></div>
              <div className="mt-5 space-y-5"><F l="Background"><Radios value={th.bg || "light"} set={v => up("theme.bg", v)} opts={[["light", "Light"], ["warm", "Warm"], ["dark", "Dark"], ["auto", "Same As Device"]]} /></F>
                <F l="Corners"><Radios value={th.radius || "round"} set={v => up("theme.radius", v)} opts={[["round", "Rounded"], ["soft", "Soft"], ["sharp", "Sharp"]]} /></F></div>
            </Card>
            <Card title="Header">
              <F l="Style"><Radios value={th.header === "minimal" ? "minimal" : "cover"} set={v => up("theme.header", v)} opts={[["cover", "Cover photo", "Photo or brand gradient"], ["minimal", "Minimal", "No banner"]]} /></F>
              <div className="mt-5 space-y-5"><F l="Logo"><ImageField value={th.logo || ""} onChange={v => up("theme.logo", v)} hint="Square works best." /></F>
                <F l="Cover photo"><ImageField wide value={th.cover || ""} onChange={v => up("theme.cover", v)} hint="Wide photo, e.g. 1600 × 600." /></F></div>
            </Card>
            <Card title="Menu layout"><Radios value={th.layout && th.layout !== "compact" ? th.layout : "grid"} set={v => up("theme.layout", v)} opts={[["grid", "Grid", "Big photos in cards"], ["list", "List", "Text with a photo on the side"]]} /></Card>
          </>}
          {tab === "checkout" && <>
            <Card title="Order types" note="For the whole page. Each store can turn them off under Stores.">
              <div className="divide-y divide-gray-200 dark:divide-gray-800">{[["delivery", "Delivery"], ["takeaway", "Pickup"], ["dinein", "In Store (table QR)"]].map(([k, t]) => <Tg key={k} on={md[k] !== false} set={v => up("modes." + k, v)} l={t} />)}</div></Card>
            <Card title="Scheduling">
              <Tg on={!!co.schedule} set={v => up("checkout.schedule", v)} l="Let customers order ahead" note="They can pick a later time, even while the store is closed." />
              <div className="mt-2 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <F l="Days ahead"><select className={SEL} value={co.scheduleDays ?? 3} onChange={e => up("checkout.scheduleDays", +e.target.value)}>{[0, 1, 2, 3, 5, 7, 14].map(n => <option key={n} value={n}>{n ? n + (n > 1 ? " days" : " day") : "Today only"}</option>)}</select></F>
                <F l="Time slots every"><select className={SEL} value={co.slot || 30} onChange={e => up("checkout.slot", +e.target.value)}>{[15, 30, 60].map(n => <option key={n} value={n}>{n} min</option>)}</select></F></div></Card>
            <Card title="Payment" note="Paid when the order is handed over.">
              <div className="divide-y divide-gray-200 dark:divide-gray-800"><Tg on={(co.pay || {}).cash !== false} set={v => up("checkout.pay.cash", v)} l="Cash" note="On delivery or at the counter." />
                <Tg on={!!(co.pay || {}).card} set={v => up("checkout.pay.card", v)} l="Card" note="Card machine on delivery or at the counter." /></div></Card>
            <Card title="Customer details">
              <F l="Ask for email"><Radios value={co.email === "optional" || co.email === "required" ? "optional" : "off"} set={v => up("checkout.email", v)} opts={[["off", "Don't ask"], ["optional", "Optional"]]} /></F>
              <div className="mt-2 divide-y divide-gray-200 dark:divide-gray-800"><Tg on={co.notes !== false} set={v => up("checkout.notes", v)} l="Notes for the kitchen" note="A free-text box on checkout." />
                <Tg on={!!co.whatsapp} set={v => up("checkout.whatsapp", v)} l="“Send on WhatsApp” button" note="After ordering, customers can send the order to the store's WhatsApp." /></div>
              <div className="mt-3">{inp("checkout.terms", "Checkout message", "e.g. Orders over USD 100 need a call to confirm")}</div></Card>
          </>}
          {tab === "branches" && (!stores.length ? <EmptyState text="This brand has no stores yet. Add them under Manage → Stores." /> : stores.map(b => { const x = bc[b.id] || {}, z = zones.filter(zz => live(zz) && zz.branchId === b.id && zz.active !== false).length;
            const bv = (k: string, l: string, ph: string, type?: string) => <F l={l}><Input className="h-9" type={type} min={type === "number" ? 0 : undefined} placeholder={ph} value={x[k] ?? ""} onChange={e => { const t = e.target.value; bset(b.id, k, t === "" ? null : type === "number" ? +t : t); }} /></F>;
            const qr = (n: number) => (br?.slug ? ORDER_HOST + br.slug + "?" : "../order.html?brand=" + encodeURIComponent(bid) + "&") + "branch=" + encodeURIComponent(b.id) + "&table=" + n;
            return (
              <div key={b.id} className={cn("rounded-lg border bg-white p-5 lg:p-6 dark:bg-[#090E1A]", x.paused ? "border-amber-300 dark:border-amber-500/40" : "border-gray-200 dark:border-gray-800")}>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div><h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{b.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{b.open || b.close ? t12(b.open) + " – " + t12(b.close) : "Hours in Manage → Stores"} · {z} delivery zone{z === 1 ? "" : "s"}</p></div>
                  <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300">{x.paused ? "Paused" : "Taking orders"}<Switch checked={!x.paused} onCheckedChange={v => bset(b.id, "paused", !v)} /></label>
                </div>
                <div className="mb-5 flex flex-wrap gap-2">{[["delivery", "Delivery"], ["takeaway", "Pickup"], ["dinein", "In Store"]].map(([k, t]) => { const on = x[k] !== false; return (
                  <button key={k} type="button" aria-pressed={on} onClick={() => bset(b.id, k, !on)} className={cn("h-9 rounded-lg border px-3.5 text-sm font-medium", on ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" : "border-gray-300 text-gray-500 dark:border-gray-700")}>{t}</button>); })}</div>
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                  {bv("prep", "Pickup ready in (min)", "20", "number")}{bv("minPickup", `Pickup minimum (${sym()})`, "0", "number")}{bv("phone", "Store phone", "+961 …", "tel")}
                  {bv("whatsapp", "Store WhatsApp", "+961 …", "tel")}{bv("address", "Address", "Street, area")}{bv("note", "Message to customers", "e.g. Parking available")}</div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="sm:w-36"><F l="Tables for QR"><Input className="h-9" type="number" min={0} value={x.tables ?? ""} onChange={e => bset(b.id, "tables", e.target.value === "" ? null : +e.target.value)} /></F></div>
                  <div className="flex flex-1 flex-wrap gap-1.5 sm:pt-7">{x.tables ? Array.from({ length: Math.min(+x.tables, 40) }, (_, i) => <a key={i} href={qr(i + 1)} target="_blank" rel="noopener" className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-blue-500 hover:bg-blue-50 dark:bg-white/5">T{i + 1}</a>)
                    : <span className="text-sm text-gray-500">Set the number of tables to get a QR link for each.</span>}</div></div>
              </div>); }))}
        </div>
        <aside className="h-fit min-w-0 rounded-lg border border-gray-200 bg-white p-4 2xl:sticky 2xl:top-24 dark:border-gray-800 dark:bg-[#090E1A]">
          <div className="mb-3 flex items-center justify-between"><span className="text-sm font-medium text-gray-900 dark:text-gray-50">Live preview</span>
            <SegTabs value={dev} onChange={setDev} items={[["phone", "Phone"], ["tab", "Tablet"], ["desk", "Desktop"]]} /></div>
          <Preview w={previewW} h={previewH}><iframe ref={frame} title="Ordering page preview" src={"../order.html?brand=" + encodeURIComponent(bid) + "&preview=1"} onLoad={send} className="size-full border-0" /></Preview>
          <p className="mt-2 text-center text-xs text-gray-500">Changes show here before you save.</p>
        </aside>
      </div>
    </>
  );
}

/** renders the page at the real device width and scales it down to fit the panel */
function Preview({ w, h, children }: { w: number; h: number; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null), [sc, setSc] = useState(1);
  useEffect(() => { const el = box.current; if (!el) return; const f = () => setSc(Math.min(1, el.clientWidth / w)); f(); const ro = new ResizeObserver(f); ro.observe(el); return () => ro.disconnect(); }, [w]);
  return <div ref={box} className="overflow-hidden rounded-md border border-gray-200 bg-gray-50 dark:border-gray-800" style={{ height: h * sc }}>
    <div style={{ width: w, height: h, transform: `scale(${sc})`, transformOrigin: "0 0" }}>{children}</div></div>;
}
