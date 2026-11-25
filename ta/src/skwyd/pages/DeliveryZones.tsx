import { Label } from "@/components/tremor/Label";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/tremor/Table";
import { SelectNative } from "@/components/tremor/SelectNative";
// Web Ordering → Delivery Zones: overview map of every zone, the zones table (All / Deleted) and the zone form with the polygon drawn on the map,
// same fields and rules as the current portal.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Input as TInput } from "@/components/tremor/Input";
import { Switch } from "@/components/ui/switch";
import { PlusIcon } from "@/icons";
import { newId, put, softDelete, type Row } from "@/lib/db";
import { money, sym } from "@/lib/util";
import { useEffect, useRef, useState } from "react";
import { live, useS, type S } from "../crud/CrudPage";
import { askYes } from "../ui/confirm";
import { EmptyState } from "../ui/EmptyState";
import { BOX, F, SEL, TD, TH, TR } from "../ui/kit";
import { baseMap, loadLeaflet, ZCOL } from "../ui/leaflet";
import { SegTabs } from "../ui/SegTabs";
import { toast } from "../ui/toast";

const drawn = (z: Row) => Array.isArray(z.polygon) && z.polygon.length >= 3;

export default function DeliveryZonesPage() {
  const s = useS(["zones", "branches", "charges", "settings"]);
  const [tab, setTab] = useState("all"), [q, setQ] = useState(""), [edit, setEdit] = useState<Row | null | undefined>(undefined);
  if (!s) return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  const bName = (id?: string) => s.branches.find(b => b.id === id)?.name || "";
  const color = (id?: string) => ZCOL[Math.max(0, s.branches.findIndex(b => b.id === id)) % ZCOL.length];
  const dmap: Record<string, string> = (s.settings.find(x => x.id === "dcharges") as any)?.map || {};
  const chargeOf = (z: Row) => { const id = dmap[z.id]; return id ? s.charges.find(c => c.id === id && live(c)) : null; };
  const del = tab === "deleted", qq = q.trim().toLowerCase();
  const rows = s.zones.filter(z => !!z.deleted === del && (!qq || (z.name + " " + bName(z.branchId)).toLowerCase().includes(qq))).sort((a, b) => bName(a.branchId).localeCompare(bName(b.branchId)) || String(a.name).localeCompare(String(b.name)));
  return (
    <>
      <PageBreadcrumb pageTitle="Delivery Zones" />
      <Overview zones={s.zones.filter(z => live(z) && drawn(z))} bName={bName} color={color} onOpen={z => setEdit(z)} />
      <div className={BOX + " mt-6"}>
        <div className="flex flex-col gap-4 px-5 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
          <SegTabs value={tab} onChange={setTab} items={[["all", "All"], ["deleted", "Deleted"]]} />
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center xl:w-auto">
            <TInput type="search" className="flex-1 sm:w-64 sm:flex-initial" inputClassName="h-9 py-1.5" placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} />
            <Button onClick={() => setEdit(null)}><PlusIcon className="size-5" />Add Delivery Zone</Button>
          </div>
        </div>
        <div className="max-w-full overflow-x-auto border-t border-gray-200 dark:border-gray-800">
          {!rows.length ? <EmptyState text={del ? "No deleted zones" : q ? "No zones match." : "No delivery zones yet"} />
            : <Table className="min-w-full"><TableHead className="border-b border-gray-200 dark:border-gray-800"><TableRow>
              {["Zone", "Store", "Delivery Charge"].map(h => <TableHeaderCell key={h} className={TH}>{h}</TableHeaderCell>)}<TableHeaderCell className={TH + " text-end"}>Min. Order</TableHeaderCell>{["Est. Time", "Map Area", "Status"].map(h => <TableHeaderCell key={h} className={TH}>{h}</TableHeaderCell>)}{del && <TableHeaderCell className={TH} />}</TableRow></TableHead>
              <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">{rows.map(z => { const c = chargeOf(z); return (
                <TableRow key={z.id} className={del ? "" : TR} onClick={() => !del && setEdit(z)}>
                  <TableCell className={TD}><span className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-50"><span className="size-2.5 rounded-full" style={{ background: color(z.branchId) }} />{z.name}</span></TableCell>
                  <TableCell className={TD}>{bName(z.branchId) || "—"}</TableCell><TableCell className={TD}>{c ? <>{c.name} <span className="text-gray-400">{money(+c.value || 0)}</span></> : "—"}</TableCell>
                  <TableCell className={TD + " text-end"}>{z.minOrder != null && z.minOrder !== "" ? money(z.minOrder) : "—"}</TableCell><TableCell className={TD}>{z.eta ? z.eta + " min" : "—"}</TableCell>
                  <TableCell className={TD}>{drawn(z) ? <Badge variant="light" color="success">Drawn · {z.polygon.length} points</Badge> : <Badge variant="light" color="light">Not drawn</Badge>}</TableCell>
                  <TableCell className={TD}>{z.active === false ? <Badge variant="light" color="light">Off</Badge> : <Badge variant="light" color="success">On</Badge>}</TableCell>
                  {del && <TableCell className={TD + " text-end"}><Button size="xs" variant="outline" onClick={async () => { await softDelete("zones", z.id, false); toast("Zone restored"); }}>Restore</Button></TableCell>}</TableRow>); })}</TableBody></Table>}
        </div>
      </div>
      {edit !== undefined && <ZoneForm z={edit} s={s} color={color} onClose={() => setEdit(undefined)} />}
    </>
  );
}

function Overview({ zones, bName, color, onOpen }: { zones: Row[]; bName: (id?: string) => string; color: (id?: string) => string; onOpen: (z: Row) => void }) {
  const el = useRef<HTMLDivElement>(null), [err, setErr] = useState(""), key = zones.map(z => z.id + JSON.stringify(z.polygon) + z.active).join();
  const cb = useRef(onOpen); cb.current = onOpen;
  useEffect(() => { let m: any, off = false;
    loadLeaflet().then(L => { if (off || !el.current) return; m = baseMap(L, el.current);
      const layers = zones.map(z => L.polygon(z.polygon, { color: color(z.branchId), weight: 2, fillOpacity: z.active === false ? .03 : .18, dashArray: z.active === false ? "4" : null })
        .bindTooltip(`${z.name} · ${bName(z.branchId)}`, { sticky: true }).on("click", () => cb.current(z)).addTo(m));
      if (layers.length) m.fitBounds(L.featureGroup(layers).getBounds(), { padding: [20, 20] });
      setTimeout(() => m.invalidateSize(), 200);
    }).catch(e => setErr(e.message));
    return () => { off = true; m?.remove(); }; }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const legend = [...new Set(zones.map(z => z.branchId))];
  return (
    <div className="space-y-3">
      {err ? <p className="p-6 text-sm text-gray-500">{err}</p> : <div ref={el} className="relative z-0 h-80 isolate sm:h-96" />}
      <div className="flex flex-wrap gap-4 px-5 py-3 text-sm text-gray-600 sm:px-6 dark:text-gray-400">{legend.length ? legend.map(id => <span key={id} className="flex items-center gap-2"><i className="size-3 rounded-full" style={{ background: color(id) }} />{bName(id)}</span>)
        : <span className="text-gray-500">No zones drawn yet. Add a zone and draw it on the map.</span>}</div>
    </div>);
}

function ZoneForm({ z, s, color, onClose }: { z: Row | null; s: S; color: (id?: string) => string; onClose: () => void }) {
  const [v, setV] = useState({ name: z?.name || "", branchId: z?.branchId || "", minOrder: z?.minOrder == null ? "" : String(z.minOrder), eta: z?.eta == null ? "" : String(z.eta), active: z?.active !== false });
  const [pts, setPts] = useState<[number, number][]>((z?.polygon || []).map((p: number[]) => [p[0], p[1]]));
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false), set = (k: string, x: any) => setV(p => ({ ...p, [k]: x }));
  async function save() {
    if (!v.name.trim()) return setErr("Zone / area name is required."); if (!v.branchId) return setErr("Delivering store is required.");
    if (pts.length < 3) return setErr("Draw the zone on the map (at least 3 points).");
    setBusy(true);
    try { await put("zones", z?.id || newId("zone"), { name: v.name.trim(), branchId: v.branchId, minOrder: v.minOrder === "" ? null : +v.minOrder, eta: v.eta === "" ? null : +v.eta, active: v.active, polygon: pts.map(p => [+p[0].toFixed(6), +p[1].toFixed(6)]) });
      toast(z ? "Zone saved" : "Zone added"); onClose(); } catch (e: any) { setErr(e?.message || "Couldn't save."); } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[94dvh] w-full overflow-y-auto p-6 sm:max-w-4xl sm:p-8">
        <DialogHeader><DialogTitle className="text-xl font-semibold text-gray-800 sm:text-2xl dark:text-gray-50">{z ? "Edit" : "Add"} Delivery Zone</DialogTitle></DialogHeader>
        <form className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); save(); }}>
          <F l="Zone / area name" req><Input className="h-9" autoFocus value={v.name} onChange={e => set("name", e.target.value)} /></F>
          <F l="Delivering store" req><SelectNative className={SEL} value={v.branchId} onChange={e => set("branchId", e.target.value)}><option value="">Choose…</option>{s.branches.filter(b => live(b) && b.active !== false).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</SelectNative></F>
          <F l={`Minimum order (${sym()})`}><Input className="h-9" type="number" min="0" step="any" value={v.minOrder} onChange={e => set("minOrder", e.target.value)} /></F>
          <F l="Estimated time (min)"><Input className="h-9" type="number" min="0" value={v.eta} onChange={e => set("eta", e.target.value)} /></F>
          <Label className="col-span-full flex cursor-pointer items-center gap-3"><Switch checked={v.active} onCheckedChange={x => set("active", !!x)} /><span className="text-sm font-medium text-gray-900 dark:text-gray-50">Accept orders for this zone</span></Label>
          <F l="Zone area on the map" req full help="Click the map to add corners around the area this store delivers to. Drag a corner to adjust it.">
            <ZoneMap pts={pts} setPts={setPts} others={s.zones.filter(o => live(o) && o.id !== z?.id && drawn(o))} color={color} />
            <div className="mt-3 flex flex-wrap items-center gap-3"><Button type="button" size="sm" variant="outline" onClick={() => setPts(p => p.slice(0, -1))}>Undo last point</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setPts([])}>Clear</Button>
              <span className="text-sm text-gray-500">{pts.length < 3 ? `${pts.length} point${pts.length === 1 ? "" : "s"} · add at least 3` : `${pts.length} points`}</span></div></F>
          {err && <p className="col-span-full text-sm text-red-500">{err}</p>}
          <div className="col-span-full flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
            {z && <Button type="button" variant="destructive" className="sm:me-auto" onClick={async () => { if (await askYes("Delete this zone?", "Delete", true)) { await softDelete("zones", z.id); toast("Zone deleted"); onClose(); } }}>Delete</Button>}
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>);
}

function ZoneMap({ pts, setPts, others, color }: { pts: [number, number][]; setPts: React.Dispatch<React.SetStateAction<[number, number][]>>; others: Row[]; color: (id?: string) => string }) {
  const el = useRef<HTMLDivElement>(null), st = useRef<any>({}), [err, setErr] = useState("");
  useEffect(() => { let off = false;
    loadLeaflet().then(L => { if (off || !el.current) return; const m = baseMap(L, el.current);
      others.forEach(o => L.polygon(o.polygon, { color: color(o.branchId), weight: 1, fillOpacity: .08, dashArray: "4", interactive: false }).addTo(m).bindTooltip(o.name));
      const poly = L.polygon(pts, { color: "#3b82f6", weight: 2, fillOpacity: .2 }).addTo(m);
      st.current = { L, m, poly, handles: [] };
      m.on("click", (e: any) => setPts(p => [...p, [e.latlng.lat, e.latlng.lng]]));
      if (pts.length >= 3) m.fitBounds(poly.getBounds(), { padding: [20, 20] });
      setTimeout(() => m.invalidateSize(), 150); setTimeout(() => m.invalidateSize(), 450);
    }).catch(e => setErr(e.message));
    return () => { off = true; st.current.m?.remove(); st.current = {}; }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // redraw the shape and its draggable corners when the points change
  useEffect(() => { const { L, m, poly } = st.current; if (!L) return;
    poly.setLatLngs(pts); st.current.handles.forEach((h: any) => h.remove());
    st.current.handles = pts.map((p, i) => L.marker(p, { draggable: true, icon: L.divIcon({ className: "", html: '<span style="display:block;width:12px;height:12px;border-radius:50%;background:#fff;border:2px solid #3b82f6"></span>', iconSize: [12, 12] }) }).addTo(m)
      .on("drag", (e: any) => { const ll = e.target.getLatLng(), n = pts.slice(); n[i] = [ll.lat, ll.lng]; poly.setLatLngs(n); })
      .on("dragend", (e: any) => { const ll = e.target.getLatLng(); setPts(p => p.map((x, j) => j === i ? [ll.lat, ll.lng] : x)); }));
  }, [pts, err]);
  return err ? <p className="text-sm text-gray-500">{err}</p> : <div ref={el} className="relative z-0 h-80 overflow-hidden rounded-md border border-gray-200 isolate dark:border-gray-800" />;
}
