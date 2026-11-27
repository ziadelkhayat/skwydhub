// Brand + Store filter buttons (Tremor, several choices each). Picking brands keeps only the stores of those brands.
import { FilterSelect, inSel, selList } from "@/components/tremor/data-table/FilterSelect";
import type { Row } from "@/lib/db";
import { useState } from "react";

export function useBrandStore() {
  const [brand, setBrand] = useState(""), [store, setStore] = useState("");
  return { brand, setBrand, store, setStore };
}

/** is a record of `branchId` in the picked brands / stores? (no store = it belongs to every store) */
export const inBS = (stores: Row[], brand: string, store: string, branchId?: string | null) =>
  !branchId ? true : (!store || inSel(store, branchId)) && (!brand || inSel(brand, stores.find(b => b.id === branchId)?.brandId));

/** Brand + Store filter buttons (Tremor, several choices each), always shown on the page. Picking brands keeps only the stores of those brands. */
export function BrandStoreFilters({ brands, stores, brand, setBrand, store, setStore, storeTitle = "Store" }: {
  brands: Row[]; stores: Row[]; brand: string; setBrand: (v: string) => void; store: string; setStore: (v: string) => void; storeTitle?: string;
}) {
  const live = (r: Row) => !r.deleted && !r.settings?.deletedAt;
  return <>
    <FilterSelect multiple title="Brand" value={brand} onChange={v => { setBrand(v); setStore(selList(store).filter(id => inSel(v, stores.find(b => b.id === id)?.brandId)).join(",")); }}
      options={brands.filter(live).map(b => ({ value: String(b.id), label: String(b.name) }))} />
    <FilterSelect multiple title={storeTitle} value={store} onChange={setStore}
      options={stores.filter(b => live(b) && b.active !== false && inSel(brand, b.brandId)).map(b => ({ value: String(b.id), label: String(b.name) }))} />
  </>;
}
