// Brand + Store filter buttons (Tremor, several choices each). Picking brands keeps only the stores of those brands.
import { inSel, selList } from "@/components/tremor/data-table/FilterSelect";
import type { Row } from "@/lib/db";
import { useState } from "react";
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/tremor/Drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterIcon } from "@/icons";
import { ChoiceButton } from "./Choice";

export function useBrandStore() {
  const [brand, setBrand] = useState(""), [store, setStore] = useState("");
  return { brand, setBrand, store, setStore };
}

/** is a record of `branchId` in the picked brands / stores? (no store = it belongs to every store) */
export const inBS = (stores: Row[], brand: string, store: string, branchId?: string | null) =>
  !branchId ? true : (!store || inSel(store, branchId)) && (!brand || inSel(brand, stores.find(b => b.id === branchId)?.brandId));

/** Brand + Store behind one Filters button (as on Orders): a Tremor side panel to pick them, and the ones in use as removable chips beside the button. */
export function BrandStoreFilters({ brands, stores, brand, setBrand, store, setStore, storeTitle = "Store" }: {
  brands: Row[]; stores: Row[]; brand: string; setBrand: (v: string) => void; store: string; setStore: (v: string) => void; storeTitle?: string;
}) {
  const live = (r: Row) => !r.deleted && !r.settings?.deletedAt;
  const [open, setOpen] = useState(false), [b, setB] = useState(brand), [st, setSt] = useState(store);
  const brandList = brands.filter(live), storeList = (br: string) => stores.filter(x => live(x) && x.active !== false && inSel(br, x.brandId));
  const names = (list: Row[], ids: string) => selList(ids).map(id => list.find(x => x.id === id)?.name || "—").join(", ");
  const tog = (ids: string, id: string) => (selList(ids).includes(id) ? selList(ids).filter(x => x !== id) : [...selList(ids), id]).join(",");
  const pickBrand = (v: string) => { setB(v); setSt(s => selList(s).filter(id => inSel(v, stores.find(x => x.id === id)?.brandId)).join(",")); };
  const n = (brand ? 1 : 0) + (store ? 1 : 0);
  const chip = (l: string, v: string, clear: () => void) => <span className="flex items-center gap-1 rounded-md bg-gray-100 py-1 ps-2.5 pe-1 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300">{l}: <b className="font-semibold">{v}</b>
    <button type="button" aria-label={"Remove " + l + " filter"} className="rounded px-1 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-800" onClick={clear}>×</button></span>;
  return <>
    <Button variant={n ? "secondary" : "outline"} className="h-[30px] py-1" onClick={() => { setB(brand); setSt(store); setOpen(true); }}><FilterIcon className="size-4" />Filters{n ? <Badge variant="solid" color="primary" className="ms-1">{n}</Badge> : null}</Button>
    {brand ? chip("Brand", names(brands, brand), () => { setBrand(""); }) : null}
    {store ? chip(storeTitle, names(stores, store), () => setStore("")) : null}
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="sm:max-w-md">
        <DrawerHeader><DrawerTitle>Filters</DrawerTitle></DrawerHeader>
        <DrawerBody className="-mx-6 space-y-7 overflow-y-auto px-6">
          <section className="space-y-3"><h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Brand</h3>
            <div className="flex flex-wrap gap-1.5">{brandList.map(x => <ChoiceButton key={x.id} on={inSel(b, x.id) && !!b} onClick={() => pickBrand(tog(b, String(x.id)))} className="min-h-8 py-1 text-sm">{x.name}</ChoiceButton>)}</div></section>
          <section className="space-y-3"><h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{storeTitle}</h3>
            <div className="flex flex-wrap gap-1.5">{storeList(b).map(x => <ChoiceButton key={x.id} on={inSel(st, x.id) && !!st} onClick={() => setSt(tog(st, String(x.id)))} className="min-h-8 py-1 text-sm">{x.name}</ChoiceButton>)}</div></section>
        </DrawerBody>
        <DrawerFooter className="-mx-6 -mb-2 gap-2 border-t border-gray-200 px-6 pt-4 dark:border-gray-800">
          <Button variant="ghost" className="sm:me-auto" onClick={() => { setB(""); setSt(""); }}>Reset all</Button>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => { setBrand(b); setStore(st); setOpen(false); }}>Show results</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  </>;
}
