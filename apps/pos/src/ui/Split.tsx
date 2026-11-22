// Split check (pos.html openSplit): equally between N, or by amount (the last part takes the rest). Each part is then paid on its own.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { DEC, type Ctx } from "../lib/pos";
import { C, R } from "../lib/theme";
import { Btn, Pad, T } from "./kit";
import { Sheet } from "./Pickers";

export function splitParts(total: number, dec: number, mode: "eq" | "amt", n: number, amts: number[]) {
  const r = (v: number) => +(+v).toFixed(dec);
  if (mode === "eq") { const a = Math.floor(total / n * Math.pow(10, dec)) / Math.pow(10, dec); return Array.from({ length: n }, (_, g) => (g < n - 1 ? a : r(total - a * (n - 1)))); }
  const out = Array.from({ length: n - 1 }, (_, g) => r(amts[g] || 0)); out.push(r(total - out.reduce((a, b) => a + b, 0))); return out;
}
export function SplitDialog({ x, total, cur, onDone }: { x: Ctx; total: number; cur: (n: number) => string; onDone: (parts: number[] | null) => void }) {
  const [mode, setMode] = useState<"eq" | "amt">("eq"), [n, setN] = useState(2), [amts, setAmts] = useState<string[]>([]), [sel, setSel] = useState(0);
  const parts = splitParts(total, DEC(x.S), mode, n, amts.map(v => +v || 0)), ok = parts.every(a => a > 0.004);
  const key = (k: string) => setAmts(l => { const c = [...l]; const s = c[sel] || ""; c[sel] = k === "c" ? "" : k === "b" ? s.slice(0, -1) : s.length > 8 ? s : s === "0" ? k : s + k; return c; });
  return (
    <Sheet title="Split Check" width={620} onClose={() => onDone(null)} footer={<><View style={{ flex: 1 }} /><Btn label="Cancel" height={48} onPress={() => onDone(null)} /><Btn kind="primary" height={48} label="Pay Parts" disabled={!ok} onPress={() => onDone(parts)} /></>}>
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn kind={mode === "eq" ? "primary" : "outline"} height={44} style={{ flex: 1 }} label="Equally" onPress={() => setMode("eq")} />
          <Btn kind={mode === "amt" ? "primary" : "outline"} height={44} style={{ flex: 1 }} label="By amount" onPress={() => setMode("amt")} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><T w="m" style={{ flex: 1 }}>Parts</T>
          <Btn height={40} label="−" disabled={n <= 2} onPress={() => { setN(v => v - 1); setSel(0); }} /><T w="s" size={18} style={{ minWidth: 30, textAlign: "center" }}>{n}</T><Btn height={40} label="+" disabled={n >= 10} onPress={() => setN(v => v + 1)} /></View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{parts.map((a, g) => { const ed = mode === "amt" && g < n - 1, on = ed && sel === g; return (
          <Pressable key={g} disabled={!ed} onPress={() => setSel(g)} style={{ width: 130, padding: 10, borderRadius: R.md, borderWidth: on ? 2 : 1, borderColor: on ? C.brand : a < 0 ? C.bad : C.line, backgroundColor: on ? C.brand50 : "#fff" }}>
            <T size={12} color={C.mut}>Part {g + 1}{mode === "amt" && g === n - 1 ? " · rest" : ""}</T><T w="s" color={a < 0 ? C.bad : C.ink}>{cur(a)}</T></Pressable>); })}</View>
        {mode === "amt" ? <View style={{ alignItems: "center" }}><Pad onKey={key} size={60} /></View> : null}
      </View>
    </Sheet>
  );
}
