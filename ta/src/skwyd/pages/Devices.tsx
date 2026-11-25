import { BrandStoreFilters, inBS, useBrandStore } from "../ui/BrandStore";
import { DataTable } from "@/components/tremor/data-table/DataTable";
import { Label } from "@/components/tremor/Label";
import { ChoiceButton } from "../ui/Choice";
import { SelectNative } from "@/components/tremor/SelectNative";
// Manage → Devices: the same list (type tabs), device page (Force Sync, Copy Settings, Device Settings, Edit, Deactivate, Delete),
// create / edit / settings forms and rules as the current portal, in TailAdmin layout.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowLeftIcon, CopyIcon, GearIcon, PencilIcon, PlusIcon, RegenerateIcon } from "@/icons";
import { newId, put, type Row } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { fmtDateTime, openWin } from "@/lib/util";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { live, useS, type S } from "../crud/CrudPage";
import { askYes } from "../ui/confirm";
import { EmptyState } from "../ui/EmptyState";
import { Card, F, L, SEL } from "../ui/kit";
import { SegTabs } from "../ui/SegTabs";
import { toast } from "../ui/toast";

const DEV_TYPES: [string, string][] = [["cashier", "POS"], ["kds", "KDS"], ["notifier", "Notifier"], ["display", "Display"], ["sub_cashier", "Sub POS"]];
const TYPE_NOTE: Record<string, string> = { cashier: "Cashier register", sub_cashier: "Second register", kds: "Kitchen screen", notifier: "Order alerts", display: "Customer screen" };
const devType = (t?: string) => (DEV_TYPES.find(x => x[0] === t) || [, t === "waiter" ? "Waiter" : (t || "—")])[1];
const devRef = (devs: Row[]) => { const used = new Set(devs.filter(d => !d.deleted).map(d => String(d.reference || "").toUpperCase())); for (let n = 1; ; n++) { const r = "POS" + String(n).padStart(2, "0"); if (!used.has(r)) return r; } };
const newCode = () => String(Math.floor(100000 + Math.random() * 900000));
const online = (d: Row) => !!d.lastSeen && Date.now() - +new Date(d.lastSeen) < 6 * 60000;
const OT3: [string, string][] = [["dinein", "In Store"], ["takeaway", "Pickup"], ["delivery", "Delivery"]];

/** a device that is deactivated or deleted leaves no till open (same as the portal's closeDeviceTill) */
async function closeDeviceTill(deviceId: string) {
  try {
    const { data: open } = await sb.from("shifts").select("id,opening_cash").eq("device_id", deviceId).is("closed_at", null);
    for (const sh of open || []) {
      const { data: ords } = await sb.from("orders").select("status,total,payment,type,driver_id,driver_settled_at").eq("shift_id", sh.id).in("status", ["closed", "refund"]);
      const l: any[] = ords || [], isCash = (o: any) => (o.payment?.type || o.payment?.method) === "cash";
      const cash = l.filter(isCash).reduce((a, o) => a + (+o.total || 0), 0);
      const owed = l.filter(o => isCash(o) && o.type === "delivery" && o.driver_id && o.status === "closed" && !o.driver_settled_at).reduce((a, o) => a + (+o.total || 0), 0);
      const expected = +((+sh.opening_cash || 0) + cash - owed).toFixed(2);
      await sb.from("shifts").update({ closed_at: new Date().toISOString(), orders: l.filter(o => o.status === "closed").length, sales: +l.reduce((a, o) => a + (+o.total || 0), 0).toFixed(2), expected_cash: expected, counted_cash: expected, difference: 0 }).eq("id", sh.id).is("closed_at", null);
    }
  } catch (e) { console.error("close device till", e); }
}

export default function DevicesPage() {
  const s = useS(["devices", "branches", "brands"]);
  const [sp] = useSearchParams(), nav = useNavigate(), id = sp.get("id");
  const [tab, setTab] = useState("all"), [create, setCreate] = useState(false), bs = useBrandStore();
  if (!s) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const bName = (id?: string) => s.branches.find(b => b.id === id)?.name || "";
  const open = id && s.devices.find(d => d.id === id && live(d));
  if (open) return <DevicePage d={open} s={s} bName={bName} back={() => nav("/devices")} />;
  const all = s.devices.filter(live), list = all.filter(d => (tab === "all" || d.type === tab) && inBS(s.branches, bs.brand, bs.store, d.branchId)).sort((a, b) => bName(a.branchId).localeCompare(bName(b.branchId)) || String(a.name).localeCompare(String(b.name)));
  return (
    <>
      <PageBreadcrumb pageTitle="Devices" />
      <DataTable<any>
        data={list} getRowId={(r: any) => r.id} key={tab}
        columns={[
          { id: "Name", title: "Name", cell: d => <><span className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-50"><span className={"size-2 rounded-full " + (online(d) ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600")} />{d.name}</span></> },
          { id: "Reference", title: "Reference", cell: d => <>{d.reference || "—"}</> },
          { id: "Type", title: "Type", cell: d => <>{devType(d.type)}</> },
          { id: "Status", title: "Status", cell: d => <>{d.activatedAt ? <Badge variant="light" color="success">Used</Badge> : <Badge variant="light" color="light">Not Used</Badge>}</> },
          { id: "Store", title: "Store", cell: d => <>{bName(d.branchId) || "—"}</> },
        ]}
        toolbar={<><SegTabs value={tab} onChange={setTab} items={[["all", "All"], ...DEV_TYPES]} /><BrandStoreFilters brands={s.brands} stores={s.branches} {...bs} /></>}
        actions={<><Button className="h-[30px] py-1" onClick={() => setCreate(true)}><PlusIcon className="size-4" />Create Device</Button></>}
        onRowClick={d => { openWin("/devices?id=" + d.id); }}
        rowActions={[...([{ label: "Open", onSelect: (d: any) => { openWin("/devices?id=" + d.id); } }])]}
        empty={<EmptyState text={all.length ? "No devices of this type." : "No devices yet"} />}
      />
      {create && <CreateDevice s={s} onClose={() => setCreate(false)} />}
    </>
  );
}

function DevicePage({ d, s, bName, back }: { d: Row; s: S; bName: (id?: string) => string; back: () => void }) {
  const [dlg, setDlg] = useState<"" | "edit" | "set" | "copy">("");
  const st = d.settings || {}, onl = online(d);
  const last = ""; // last order time is read from the orders list in the portal; the device's lastSeen covers it here
  const brand = s.brands.find(b => b.id === s.branches.find(x => x.id === d.branchId)?.brandId)?.name;
  const sync = async () => {
    if (!(await askYes("You are about to force sync this device. It will reload all its data as soon as its current order is done.", "Force Sync"))) return;
    try { await put("devices", d.id, { settings: { ...st, syncAt: new Date().toISOString() } }); toast("Sync sent · the device reloads its data"); } catch { toast("Couldn't send the sync. Check the connection and try again.", "error"); }
  };
  const deactivate = async () => {
    if (!(await askYes("Deactivate this device? The tablet signs out and gets a new activation code.", "Deactivate", true))) return;
    const code = newCode(); await closeDeviceTill(d.id);
    try { await put("devices", d.id, { code, activatedAt: null }); toast("Device deactivated · new activation code " + code); } catch { toast("Couldn't deactivate. Only the owner or an admin can change devices.", "error"); }
  };
  const del = async () => {
    if (!(await askYes("Delete this device? Its past orders are kept.", "Delete", true))) return;
    await closeDeviceTill(d.id); await put("devices", d.id, { deleted: true }); toast("Device deleted"); back();
  };
  return (
    <>
      <PageBreadcrumb pageTitle={d.name} />
      <Card className="p-5 lg:p-6">
        <div className="space-y-6">
          <div className="flex flex-col gap-5 rounded-lg border border-gray-200 p-5 lg:p-6 xl:flex-row xl:items-center xl:justify-between dark:border-gray-800">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" className="shrink-0" aria-label="Back" onClick={back}><ArrowLeftIcon className="size-5" /></Button>
              <div>
                <h4 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-50">{d.name}</h4>
                <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><span className={"size-2 rounded-full " + (onl ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600")} />
                  {onl ? "Online" : d.activatedAt ? "Offline" : "Not activated"} · {devType(d.type)} · {bName(d.branchId) || "No store"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
              <span title={d.activatedAt ? "Activation code (already used: deactivate the device to get a new one)" : "Activation code (enter it on the tablet to activate)"}
                className={"col-span-2 rounded-lg border px-3 py-2 text-center font-mono text-base tracking-[0.3em] " + (d.activatedAt ? "border-gray-200 text-gray-400 line-through dark:border-gray-800" : "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400")}>{d.code || "——————"}</span>
              <Button variant="outline" onClick={sync}><RegenerateIcon className="size-4.5" />Force Sync Data</Button>
              <Button variant="outline" onClick={() => setDlg("copy")}><CopyIcon className="size-4.5" />Copy Settings</Button>
              <Button variant="outline" onClick={() => setDlg("set")}><GearIcon className="size-4.5" />Device Settings</Button>
              <Button className="col-span-2" onClick={() => setDlg("edit")}><PencilIcon className="size-4.5" />Edit Device</Button>
            </div>
          </div>
          <Card title="Details">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7 2xl:gap-x-32">
              <L l="Reference">{d.reference || "—"}</L><L l="Type">{devType(d.type)}</L><L l="Store">{bName(d.branchId) || "—"}</L>
              <L l="Brand">{brand || "—"}</L><L l="Status">{d.activatedAt ? <Badge variant="light" color="success">Used</Badge> : <Badge variant="light" color="light">Not Used</Badge>}</L>
              <L l="Receives Online Orders">{st.master ? "Yes" : "No"}</L><L l="Activated">{fmtDateTime(d.activatedAt)}</L><L l="Last Online">{fmtDateTime(d.lastSeen)}</L>{last}
            </div>
          </Card>
          {d.activatedAt
            ? <DangerRow title="Deactivate Device" text="Make sure all its orders are uploaded. The tablet signs out and a new activation code is generated." btn="Deactivate Device" onClick={deactivate} />
            : <DangerRow title="Delete Device" text="Removes this device from skwyd hub. Its past orders are kept." btn="Delete" onClick={del} />}
        </div>
      </Card>
      {dlg === "edit" && <EditDevice d={d} s={s} onClose={() => setDlg("")} onDeactivate={deactivate} />}
      {dlg === "set" && <DeviceSettings d={d} onClose={() => setDlg("")} />}
      {dlg === "copy" && <CopySettings d={d} s={s} bName={bName} onClose={() => setDlg("")} />}
    </>
  );
}

const DangerRow = ({ title, text, btn, onClick }: { title: string; text: string; btn: string; onClick: () => void }) => (
  <div className="flex flex-col gap-4 rounded-lg border border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6 dark:border-gray-800">
    <div><h4 className="text-base font-semibold text-gray-900 dark:text-gray-50">{title}</h4><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{text}</p></div>
    <Button variant="destructive" onClick={onClick}>{btn}</Button>
  </div>);

function Modal({ title, wide, onClose, footer, children }: { title: string; wide?: boolean; onClose: () => void; footer: React.ReactNode; children: React.ReactNode }) {
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className={"max-h-[90dvh] w-full overflow-y-auto p-6 sm:p-8 " + (wide ? "sm:max-w-3xl" : "sm:max-w-2xl")}>
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-800 sm:text-2xl dark:text-gray-50">{title}</DialogTitle></DialogHeader>
        {children}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{footer}</div>
      </DialogContent>
    </Dialog>);
}

function CreateDevice({ s, onClose }: { s: S; onClose: () => void }) {
  const brands = s.brands.filter(live);
  const [type, setType] = useState("cashier"), [name, setName] = useState(""), [ref, setRef] = useState(devRef(s.devices));
  const [brand, setBrand] = useState(brands.length === 1 ? brands[0].id : ""), [branch, setBranch] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const stores = s.branches.filter(b => live(b) && b.brandId === brand && b.active !== false);
  async function save() {
    const reference = ref.trim().toUpperCase();
    if (!name.trim() || !branch || !reference) return setErr("Type, name, reference and store are required.");
    if (s.devices.some(x => live(x) && String(x.reference || "").toUpperCase() === reference)) return setErr("Another device already uses this reference.");
    const code = newCode(), master = type === "cashier" && !s.devices.some(x => live(x) && x.branchId === branch && x.settings?.master);
    setBusy(true);
    try { await put("devices", newId("dev"), { name: name.trim(), reference, type, branchId: branch, code, settings: master ? { master: true } : {} }); toast(`Device created · activation code ${code}`); onClose(); }
    catch { setErr("Couldn't create the device."); } finally { setBusy(false); }
  }
  return (
    <Modal title="Create Device" onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</Button></>}>
      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <F l="Type" req full help="Choose the type of device."><SelectNative className={SEL} value={type} onChange={e => setType(e.target.value)}>{DEV_TYPES.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</SelectNative></F>
        <F l="Name" req full><Input className="h-9" autoFocus placeholder="e.g. Main Cashier, 2nd Floor Cashier" value={name} onChange={e => setName(e.target.value)} /></F>
        <F l="Reference" req full><div className="flex gap-3"><Input className="h-9 flex-1" value={ref} onChange={e => setRef(e.target.value)} /><Button variant="outline" className="h-9" onClick={() => setRef(devRef(s.devices))}>Generate</Button></div></F>
        <F l="Brand" req><SelectNative className={SEL} value={brand} onChange={e => { setBrand(e.target.value); setBranch(""); }}><option value="">Choose…</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</SelectNative></F>
        <F l="Store" req><SelectNative className={SEL} value={branch} onChange={e => setBranch(e.target.value)}><option value="">{brand ? "Choose…" : "Pick the brand first"}</option>{stores.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</SelectNative></F>
        {err && <p className="col-span-full text-sm text-red-500">{err}</p>}
      </div>
    </Modal>);
}

function EditDevice({ d, s, onClose, onDeactivate }: { d: Row; s: S; onClose: () => void; onDeactivate: () => void }) {
  const [name, setName] = useState(d.name || ""), [ref, setRef] = useState(d.reference || devRef(s.devices)), [type, setType] = useState(d.type || "cashier");
  const [master, setMaster] = useState(!!d.settings?.master), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  async function save() {
    const reference = ref.trim().toUpperCase();
    if (!name.trim()) return setErr("Name is required."); if (!reference) return setErr("Reference is required.");
    if (s.devices.some(x => live(x) && x.id !== d.id && String(x.reference || "").toUpperCase() === reference)) return setErr("Another device already uses this reference.");
    const m = master && ["cashier", "sub_cashier"].includes(type);
    setBusy(true);
    try {
      if (m) for (const o of s.devices.filter(x => live(x) && x.id !== d.id && x.branchId === d.branchId && x.settings?.master)) await put("devices", o.id, { settings: { ...o.settings, master: false } }); // one per store
      await put("devices", d.id, { name: name.trim(), reference, type, settings: { ...(d.settings || {}), master: m } }); toast("Device saved"); onClose();
    } catch { setErr("Couldn't save. Only the owner or an admin can change devices."); } finally { setBusy(false); }
  }
  return (
    <Modal title="Edit Device" onClose={onClose} footer={<>{d.activatedAt && <Button variant="destructive" className="sm:me-auto" onClick={() => { onClose(); onDeactivate(); }}>Deactivate</Button>}
      <Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</Button></>}>
      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <F l="Name" req><Input className="h-9" placeholder="e.g. Main cashier" value={name} onChange={e => setName(e.target.value)} /></F>
        <F l="Reference" req><div className="flex gap-3"><Input className="h-9 flex-1" value={ref} onChange={e => setRef(e.target.value)} />
          <Button variant="outline" size="icon-lg" aria-label="Generate a reference" onClick={() => setRef(devRef(s.devices.filter(x => x.id !== d.id)))}><RegenerateIcon className="size-5" /></Button></div></F>
        <F l="Type" full>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Type">{DEV_TYPES.map(([k, t]) => (
            <ChoiceButton on={type === k} key={k} role="radio" aria-checked={type === k} onClick={() => setType(k)}
              className="p-3 text-start">
              <b className="block text-sm font-semibold text-gray-900 dark:text-gray-50">{t}</b><span className="text-xs text-gray-500 dark:text-gray-400">{TYPE_NOTE[k]}</span></ChoiceButton>))}</div></F>
        <Field orientation="horizontal" className="col-span-full items-start gap-3 rounded-md border border-gray-200 p-4 dark:border-gray-800">
          <Switch checked={master} onCheckedChange={v => setMaster(!!v)} />
          <div><FieldLabel className="text-sm font-medium text-gray-900 dark:text-gray-50">Receives online orders</FieldLabel>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Web and call center orders ring on this device. Only one cashier per store; it also ends the day.</p></div></Field>
        {d.code && <div className="col-span-full flex items-center justify-between gap-4 rounded-md bg-gray-50 p-4 dark:bg-[#090E1A]">
          <div><b className="block text-sm font-medium text-gray-900 dark:text-gray-50">Activation code</b><span className="text-xs text-gray-500 dark:text-gray-400">{d.activatedAt ? "Already used · deactivate the device to get a new one" : "Type it on a new tablet to connect it"}</span></div>
          <em className="font-mono text-lg tracking-widest text-gray-800 not-italic dark:text-gray-50">{String(d.code).replace(/(\d{3})(?=\d)/, "$1 ")}</em></div>}
        {err && <p className="col-span-full text-sm text-red-500">{err}</p>}
      </div>
    </Modal>);
}

function DeviceSettings({ d, onClose }: { d: Row; onClose: () => void }) {
  const s0 = d.settings || {};
  const [v, setV] = useState<Record<string, any>>({ callStart: s0.callStart ?? 1, callReset: s0.callReset ?? "", kitchenLang: s0.kitchenLang || "main", copies: s0.copies || 1, eodEmail: s0.eodEmail || "", shiftEmail: s0.shiftEmail || "",
    kitchenPrinter: s0.kitchenPrinter || "", receiptPrinter: s0.receiptPrinter || "", lockMinutes: s0.lockMinutes ?? 10,
    autoAccept: !!s0.autoAccept, printOnline: !!s0.printOnline, noAutoPrint: s0.noAutoPrint ?? s0.receipt !== "print", printDrawer: !!s0.printDrawer, cashDrawer: s0.cashDrawer ?? true, lockAfterSale: !!s0.lockAfterSale });
  const [off, setOff] = useState<string[]>(OT3.map(x => x[0]).filter(k => !(s0.orderTypes || OT3.map(x => x[0])).includes(k)));
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k: string, x: any) => setV(p => ({ ...p, [k]: x }));
  const txt = (k: string, l: string, help?: string, type = "text", ph?: string) => <F l={l} help={help}><Input className="h-9" type={type} placeholder={ph} value={v[k]} onChange={e => set(k, e.target.value)} /></F>;
  const tg = (k: string, l: string, help: string) => (
    <Field orientation="horizontal" className="col-span-full items-start gap-3"><Switch checked={!!v[k]} onCheckedChange={x => set(k, !!x)} />
      <div><FieldLabel className="text-sm font-medium text-gray-900 dark:text-gray-50">{l}</FieldLabel><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{help}</p></div></Field>);
  async function save() {
    const orderTypes = OT3.map(x => x[0]).filter(k => !off.includes(k));
    if (!orderTypes.length) return setErr("At least one order type must stay enabled.");
    const callStart = Math.max(1, +v.callStart || 1), callReset = +v.callReset || 0;
    if (callReset && callReset <= callStart) return setErr("Call Number Reset must be bigger than Call Number Start.");
    const settings = { ...s0, orderTypes, callStart, callReset, kitchenLang: v.kitchenLang, copies: Math.max(1, +v.copies || 1), eodEmail: v.eodEmail.trim(), shiftEmail: v.shiftEmail.trim(),
      tables: [], kitchenPrinter: v.kitchenPrinter.trim(), receiptPrinter: v.receiptPrinter.trim(), lockMinutes: Math.max(0, +v.lockMinutes || 0),
      autoAccept: v.autoAccept, printOnline: v.printOnline, noAutoPrint: v.noAutoPrint, receipt: v.noAutoPrint ? "show" : "print", printDrawer: v.printDrawer, cashDrawer: v.cashDrawer, lockAfterSale: v.lockAfterSale };
    setBusy(true);
    try { await put("devices", d.id, { settings }); toast("Device settings saved"); onClose(); } catch { setErr("Couldn't save. Only the owner or an admin can change devices."); } finally { setBusy(false); }
  }
  return (
    <Modal title="Edit Device Settings" wide onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</Button></>}>
      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        {txt("callStart", "Call Number Start", "The number of the first order in a business day. For example 100.", "number")}
        {txt("callReset", "Call Number Reset", "When this number is reached, numbering goes back to the Call Number Start.", "number", "No reset")}
        <F l="Disabled Order Types" full help="Choose the order types to disable on this cashier.">
          <div className="flex flex-wrap gap-5 pt-1">{OT3.map(([k, t]) => (
            <Label key={k} className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700 dark:text-gray-400">
              <Checkbox checked={off.includes(k)} onCheckedChange={c => setOff(o => c ? [...o, k] : o.filter(x => x !== k))} />{t}</Label>))}</div></F>
        <F l="Kitchen Print Language" help="Products on the kitchen ticket appear in this language.">
          <SelectNative className={SEL} value={v.kitchenLang} onChange={e => set("kitchenLang", e.target.value)}><option value="main">Main</option><option value="localized">Localized</option><option value="both">Main & Localized</option></SelectNative></F>
        {txt("copies", "Receipt copies", undefined, "number")}
        {txt("eodEmail", "Send End of Day Report To Email", "One email address to receive end of day reports.", "email")}
        {txt("shiftEmail", "Send Shift Report To Email", "One email address to receive opening and closing shift reports.", "email")}
        {txt("kitchenPrinter", "Kitchen printer (IP address or name)", undefined, "text", "e.g. 192.168.1.50")}
        {txt("receiptPrinter", "Receipt printer (IP address or name)", undefined, "text", "Built-in / 192.168.1.51")}
        {txt("lockMinutes", "Auto-lock after (minutes idle)", "0 = never lock.", "number")}
        <div className="col-span-full my-1 border-t border-gray-200 dark:border-gray-800" />
        {tg("autoAccept", "Auto Accept Web & API Orders", "Accept web and API orders on this device automatically and send them to the kitchen. Call center orders are still accepted by hand.")}
        {tg("printOnline", "Print Online Order Info When Received", "Print call center and web orders automatically when they arrive.")}
        {tg("noAutoPrint", "Disable Automatic Receipt Printing", "Don't print receipts automatically after payments or closing orders.")}
        {tg("printDrawer", "Print Drawer Operations", "Print a receipt after each cash in / cash out.")}
        {tg("cashDrawer", "Cash drawer connected", "The drawer opens for cash payments.")}
        {tg("lockAfterSale", "Lock after every sale", "The next cashier enters their PIN.")}
        {err && <p className="col-span-full text-sm text-red-500">{err}</p>}
      </div>
    </Modal>);
}

function CopySettings({ d, s, bName, onClose }: { d: Row; s: S; bName: (id?: string) => string; onClose: () => void }) {
  const list = s.devices.filter(x => !x.deleted && x.id !== d.id && (x.type || "cashier") === (d.type || "cashier")).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const [pick, setPick] = useState<string[]>([]), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  async function go() {
    if (!pick.length) return setErr("Pick at least one device.");
    const { master: _m, syncAt: _s, ...copy } = d.settings || {};
    setBusy(true);
    try {
      for (const id of pick) { const t = s.devices.find(x => x.id === id); await put("devices", id, { settings: { ...JSON.parse(JSON.stringify(copy)), ...(t?.settings?.master ? { master: true } : {}), ...(t?.settings?.syncAt ? { syncAt: t.settings.syncAt } : {}) } }); }
      toast(`Settings copied to ${pick.length} device${pick.length > 1 ? "s" : ""}`); onClose();
    } catch { setErr("Couldn't copy the settings. Check the connection and try again."); } finally { setBusy(false); }
  }
  return (
    <Modal title="Copy Settings" onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={go}>{busy ? "Copying…" : "Copy"}</Button></>}>
      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Copy the device settings of {d.name} to these {devType(d.type)} devices. Their current settings are replaced.</p>
      <div className="mt-5 max-h-72 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2 dark:border-gray-800">
        {!list.length ? <p className="p-3 text-sm text-gray-500">No other {devType(d.type)} devices</p> : list.map(x => (
          <Label key={x.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/3">
            <Checkbox checked={pick.includes(x.id)} onCheckedChange={c => setPick(p => c ? [...p, x.id] : p.filter(y => y !== x.id))} />{x.name}{x.branchId ? <span className="text-gray-400"> · {bName(x.branchId)}</span> : null}</Label>))}
      </div>
      {err && <p className="mt-3 text-sm text-red-500">{err}</p>}
    </Modal>);
}
