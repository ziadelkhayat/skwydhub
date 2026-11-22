// Tables (pos.html openTables): the store's tables by section (Manage → Store → Sections & Tables), free or occupied
// with the open order's amount and time. A free table starts a dine-in order on it; an occupied one opens its order.
import { Pressable, ScrollView, View } from "react-native";
import { money, type Ctx } from "../lib/pos";
import type { Row } from "../lib/db";
import { C, R } from "../lib/theme";
import { T } from "./kit";
import { Sheet } from "./Pickers";

export const tblParts = (n: any) => String(n || "").split("+").map(x => x.trim()).filter(Boolean);   // merged tables are saved as "3+4"
export const tblLbl = (n: any) => { const l = tblParts(n); if (!l.length) return String(n || ""); return l.every(x => /^\d+$/.test(x)) ? (l.length > 1 ? "Tables " : "Table ") + l.join(" + ") : l.join(" + "); };

export function TablesDialog({ x, onFree, onOpen, onClose }: { x: Ctx; onFree: (name: string) => void; onOpen: (o: Row) => void; onClose: () => void }) {
  const cfg = ((x.S.settings.find(s => s.id === "tables") || {}) as any)[x.device.branchId] || [];
  const open = x.S.orders.filter(o => o.branchId === x.device.branchId && ["active", "pending"].includes(o.status) && o.type === "dinein" && String(o.table || "").trim());
  const known = new Set(cfg.map((t: any) => String(t.name).trim()));
  const all: { name: string; section?: string }[] = [...cfg.filter((t: any) => String(t?.name || "").trim()).map((t: any) => ({ ...t, name: String(t.name).trim() })),
    ...[...new Set(open.flatMap(o => tblParts(o.table)))].filter(k => !known.has(k)).map(k => ({ name: k, section: "Other" }))];
  const orders = (k: string) => open.filter(o => tblParts(o.table).includes(k)).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const secs = [...new Set(all.map(t => t.section || ""))];
  const mins = (t: string) => Math.max(0, Math.round((Date.now() - +new Date(t)) / 60000));
  return (
    <Sheet title="Tables" width={980} onClose={onClose}>
      {!all.length ? <T color={C.mut}>No tables set up for this store yet. Add them in the back office under Manage → Stores → the store → Sections & Tables.</T> :
        <ScrollView style={{ maxHeight: 560 }}>{secs.map(sc => { const l = all.filter(t => (t.section || "") === sc); return (
          <View key={sc} style={{ marginBottom: 16 }}>
            {secs.length > 1 || sc ? <T w="s" style={{ marginBottom: 8 }}>{sc || "Tables"} <T size={13} color={C.mut}>· {l.filter(t => orders(t.name).length).length}/{l.length} occupied</T></T> : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>{l.map(t => { const os = orders(t.name), own = os.filter(o => tblParts(o.table)[0] === t.name), m = own[0] ? mins(own[0].createdAt) : 0;
              const busy = os.length > 0, bg = !busy ? "#fff" : m >= 60 ? C.badBg : C.warnBg, bd = !busy ? C.line : m >= 60 ? C.bad : C.warn;
              return (
                <Pressable key={t.name} accessibilityRole="button" accessibilityLabel={tblLbl(t.name) + (busy ? ", occupied" : ", free")} onPress={() => (own[0] ? onOpen(own[0]) : os[0] ? onOpen(os[0]) : onFree(t.name))}
                  style={{ width: 130, height: 104, borderRadius: R.md, borderWidth: 1, borderColor: bd, backgroundColor: bg, padding: 10, justifyContent: "space-between" }}>
                  <T w="s" size={16}>{tblLbl(t.name)}</T>
                  {!busy ? <T size={13} color={C.mut}>Free</T> : !own.length ? <T size={12} color={C.mut}>Merged with {tblLbl(tblParts(os[0].table)[0])}</T> : <>
                    <T w="s" color={C.ink}>{money(x.S, own.reduce((s, o) => s + (+o.total || 0), 0))}</T>
                    <T size={12} color={C.mut}>{+own[0].guests ? own[0].guests + " guests · " : ""}#{own[0].no || "—"}{own.length > 1 ? ` +${own.length - 1}` : ""} · {m < 60 ? m + " min" : Math.floor(m / 60) + " h " + (m % 60) + " min"}</T></>}
                </Pressable>); })}</View>
          </View>); })}</ScrollView>}
    </Sheet>
  );
}
