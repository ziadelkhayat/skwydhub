// Functions → Devices (pos.html openPrinters / prForm): this register's printers, kept in the device's settings.
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { live, type Ctx } from "../lib/pos";
import { printers, type Printer } from "../lib/print";
import { useStore } from "../lib/store";
import { C, F, R } from "../lib/theme";
import { Btn, Pill, T } from "./kit";
import { Sheet } from "./Pickers";

const KIND: [Printer["kind"], string][] = [["receipt", "Receipt"], ["kitchen", "Kitchen"], ["order", "Order"]];
const CONN: [string, string][] = [["network", "Network (IP)"], ["bluetooth", "Bluetooth"], ["usb", "USB"], ["builtin", "Built-in"]];
const Seg = <K extends string>({ l, v, set }: { l: [K, string][]; v: K; set: (k: K) => void }) => (
  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{l.map(([k, t]) => <Btn key={k} kind={v === k ? "soft" : "outline"} height={40} label={t} style={v === k ? { borderColor: C.brand } : undefined} onPress={() => set(k)} />)}</View>);

export function PrintersDialog({ x, onClose }: { x: Ctx; onClose: () => void }) {
  const { write, device } = useStore(), list = printers(device!), [ed, setEd] = useState<Printer | null>(null), [err, setErr] = useState("");
  const save = (l: Printer[]) => write("devices", device!.id, { settings: { ...(device!.settings || {}), printers: l } });
  const cats = x.S.categories.filter(c => live(c) && c.channel === "pos"), useCats = cats.length ? cats : x.S.categories.filter(c => live(c) && !c.channel);
  if (ed) {
    const set = (k: keyof Printer, v: any) => { setEd({ ...ed, [k]: v }); setErr(""); }, isNew = !list.some(p => p.id === ed.id);
    const ok = () => { if (!ed.name.trim()) return setErr("Enter a name."); if (ed.conn === "network" && !/^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(String(ed.ip || "").trim())) return setErr("Enter the printer's IP address, e.g. 192.168.1.50");
      save(isNew ? [...list, ed] : list.map(p => (p.id === ed.id ? ed : p))); setEd(null); };
    return (
      <Sheet title={isNew ? "Add Device" : "Edit Device"} width={640} onClose={() => setEd(null)} footer={<>
        {!isNew ? <Btn kind="danger" height={48} label="Delete" onPress={() => { save(list.filter(p => p.id !== ed.id)); setEd(null); }} /> : null}
        <T size={13} color={C.bad} style={{ flex: 1 }}>{err}</T><Btn label="Cancel" height={48} onPress={() => setEd(null)} /><Btn kind="primary" height={48} label="Save" onPress={ok} />
      </>}>
        <View style={{ gap: 14 }}>
          <View style={{ gap: 4 }}><T size={13} color={C.ink2}>Name *</T><TextInput value={ed.name} onChangeText={v => set("name", v)} placeholder="e.g. Kitchen hot line" accessibilityLabel="Name" style={{ height: 46, borderWidth: 1, borderColor: C.field, borderRadius: R.sm, paddingHorizontal: 12, fontFamily: F.r, fontSize: 16 }} /></View>
          <View style={{ gap: 4 }}><T size={13} color={C.ink2}>Type</T><Seg l={KIND} v={ed.kind} set={k => set("kind", k)} /></View>
          <View style={{ gap: 4 }}><T size={13} color={C.ink2}>Connection</T><Seg l={CONN} v={ed.conn} set={k => set("conn", k)} /></View>
          {ed.conn === "network" ? <View style={{ gap: 4 }}><T size={13} color={C.ink2}>IP address</T><TextInput value={ed.ip || ""} onChangeText={v => set("ip", v)} keyboardType="decimal-pad" placeholder="e.g. 192.168.1.50" accessibilityLabel="IP address" style={{ height: 46, borderWidth: 1, borderColor: C.field, borderRadius: R.sm, paddingHorizontal: 12, fontFamily: F.r, fontSize: 16 }} /></View>
            : <T size={13} color={C.warn}>Only network printers print from this app for now.</T>}
          <View style={{ gap: 4 }}><T size={13} color={C.ink2}>Copies</T><Seg l={[["1", "1"], ["2", "2"], ["3", "3"]]} v={String(ed.copies || 1) as "1"} set={k => set("copies", +k)} /></View>
          {ed.kind === "kitchen" ? <View style={{ gap: 6 }}><T size={13} color={C.ink2}>Categories it prints (none = all)</T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{useCats.map(c => { const on = (ed.cats || []).includes(c.id); return (
              <Pressable key={c.id} onPress={() => set("cats", on ? (ed.cats || []).filter(y => y !== c.id) : [...(ed.cats || []), c.id])} style={{ paddingHorizontal: 12, height: 38, justifyContent: "center", borderRadius: R.sm, borderWidth: on ? 2 : 1, borderColor: on ? C.brand : C.line, backgroundColor: on ? C.brand50 : "#fff" }}>
                <T size={14}>{c.name}</T></Pressable>); })}</View></View> : null}
          <Btn kind={ed.on !== false ? "soft" : "outline"} height={44} label={ed.on !== false ? "Active" : "Inactive"} onPress={() => set("on", ed.on === false)} />
        </View>
      </Sheet>);
  }
  return (
    <Sheet title="Devices" width={720} onClose={onClose} footer={<><View style={{ flex: 1 }} /><Btn kind="primary" height={48} label="Add Devices" onPress={() => setEd({ id: "pr_" + Date.now().toString(36), name: "", kind: "receipt", conn: "network", ip: "", copies: 1, on: true, cats: [] })} /></>}>
      {!list.length ? <T color={C.mut} style={{ textAlign: "center", paddingVertical: 24 }}>No devices yet</T> :
        <View style={{ gap: 8 }}>{list.map(p => (
          <Pressable key={p.id} onPress={() => setEd({ ...p })} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: R.md, borderWidth: 1, borderColor: C.line, opacity: p.on === false ? 0.55 : 1 }}>
            <Pill text={KIND.find(k => k[0] === p.kind)?.[1] || p.kind} tone="brand" /><T w="s" style={{ flex: 1 }}>{p.name}</T>
            <T size={13} color={C.mut}>{CONN.find(c => c[0] === p.conn)?.[1] || p.conn}{p.ip ? " · " + p.ip : ""}{(p.copies || 1) > 1 ? " · " + p.copies + " copies" : ""}</T></Pressable>))}</View>}
    </Sheet>
  );
}
