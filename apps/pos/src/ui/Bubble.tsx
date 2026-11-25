// POS messages (the user's choice E): a dark bubble pointing at the button just pressed, gone after about 2 seconds or at the next tap.
// One shared message: the register and every window draw <Bubble />, so a message shows on top of whatever is open.
import { useEffect, useState } from "react";
import { useScreen } from "../lib/screen";
import { useWindowDimensions, View } from "react-native";
import { C } from "../lib/theme";
import { T } from "./kit";

type M = { text: string; x: number; y: number; tap: boolean; id: number };
let cur: M | null = null, last = { x: 0, y: 0, at: 0 }, seq = 0, timer: any = 0;
const subs = new Set<(m: M | null) => void>();
const emit = (m: M | null) => { cur = m; subs.forEach(f => f(m)); };
// every touch: where it was (page position; the frame's offset is taken off when drawing) and hide the message
export const touched = (e: any) => { const n = e?.nativeEvent || {}; last = { x: n.pageX ?? 0, y: n.pageY ?? 0, at: Date.now() }; if (cur) emit(null); };
export const notify = (text: string) => { const tap = Date.now() - last.at < 1500, m = { text, x: last.x, y: last.y, tap, id: ++seq }; emit(m);
  clearTimeout(timer); timer = setTimeout(() => { if (cur?.id === m.id) emit(null); }, Math.min(4500, 1800 + text.length * 25)); };

// win: drawn inside a window (Modal), which covers the whole browser window rather than the tablet frame
export function Bubble({ win }: { win?: boolean }) {
  const [m, setM] = useState<M | null>(cur), sc = useScreen(), wd = useWindowDimensions(), { width: W, height: H, ox, oy } = win ? { width: wd.width, height: wd.height, ox: 0, oy: 0 } : sc;
  useEffect(() => { subs.add(setM); return () => { subs.delete(setM); }; }, []);
  if (!m) return null;
  const x = m.tap ? m.x - ox : W / 2, y = m.tap ? m.y - oy : 20, bw = Math.min(320, W - 24), left = Math.max(12, Math.min(W - bw - 12, x - bw / 2)), below = !m.tap || y < H * 0.55, ax = Math.max(left + 14, Math.min(left + bw - 26, x - 6));
  return <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, zIndex: 100 }}>
    {m.tap ? <View style={{ position: "absolute", left: ax, ...(below ? { top: y + 14 } : { top: y - 26 }), width: 12, height: 12, backgroundColor: C.ink, transform: [{ rotate: "45deg" }] }} /> : null}
    <View style={{ position: "absolute", left, width: bw, ...(below ? { top: m.tap ? y + 19 : 16 } : { bottom: H - y + 19 }), alignItems: "center" }}>
      <View style={{ backgroundColor: C.ink, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 10, maxWidth: bw }}><T color="#fff" size={14} style={{ textAlign: "center" }}>{m.text}</T></View></View>
  </View>;
}
