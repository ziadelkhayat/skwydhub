// The POS's own on-screen keyboard (option A): a full keyboard at the bottom of the screen, English and Arabic,
// used for every text field so typing works the same on the tablet and in the browser test copy.
// Phone fields get a number pad in the same place; other number fields (price, amount) have their own pad on screen and keep the tablet's.
import { useEffect, useRef, useState } from "react";
import { Keyboard, Platform, Pressable, TextInput as RNTextInput, View, type TextInputProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../lib/theme";
import { T } from "./kit";

type Target = { id: number; get: () => string; set: (v: string) => void; multiline: boolean; max?: number; phone?: boolean };
let cur: Target | null = null, ids = 0;
const subs = new Set<() => void>();
const show = (t: Target | null) => { cur = t; subs.forEach(f => f()); };
function useTarget() { const [, tick] = useState(0); useEffect(() => { const f = () => tick(n => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []); return cur; }

const KEY_H = 54, GAP = 7, PAD = 8;
export const KB_H = PAD * 2 + KEY_H * 4 + GAP * 3;
/** how much of the bottom of the screen the keyboard covers (0 when closed); windows move up by this much */
export const useKbHeight = () => (useTarget() ? KB_H : 0);

const isNum = (k?: string) => /numeric|decimal|phone|number/.test(String(k || ""));

/** a drop-in for React Native's TextInput that opens the POS keyboard instead of the tablet's */
export function TextInput(props: TextInputProps) {
  const id = useRef(++ids).current, p = useRef(props); p.current = props;
  const phone = props.keyboardType === "phone-pad", own = (phone || !isNum(props.keyboardType as string)) && props.editable !== false;
  useEffect(() => () => { if (cur?.id === id) show(null); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!own) return <RNTextInput {...props} />;
  const open = () => show({ id, get: () => String(p.current.value ?? ""), set: v => p.current.onChangeText?.(v), multiline: !!props.multiline, max: props.maxLength, phone });
  return <RNTextInput {...props} showSoftInputOnFocus={false} {...(Platform.OS === "web" ? ({ inputMode: "none" } as any) : {})}
    onFocus={e => { open(); props.onFocus?.(e); }} onPressIn={e => { open(); props.onPressIn?.(e); }} />;
}

const EN = ["qwertyuiop", "asdfghjkl", "zxcvbnm"], AR = ["ضصثقفغعهخح", "شسيبلاتنمك", "ئءؤرىةوزظد"], NUM = ["1234567890", "-/:;()$&@\"", ".,?!'#%+=*"];

export function OnScreenKeyboard() {
  const t = useTarget(), bottom = useSafeAreaInsets().bottom;
  const [lang, setLang] = useState<"en" | "ar">("en"), [num, setNum] = useState(false), [shift, setShift] = useState(false);
  if (!t) return null;
  const put = (s: string) => { const v = t.get(); if (t.max && v.length >= t.max) return; t.set(v + s); if (shift) setShift(false); };
  const back = () => t.set(t.get().slice(0, -1));
  const done = () => { show(null); Keyboard.dismiss(); };
  const rows = num ? NUM : lang === "ar" ? AR : EN;
  if (t.phone) {   // a number pad for phone numbers: digits on the left, delete / clear / done on the right
    const P = ({ l, on, gray, flex = 1, a11y }: { l: string; on: () => void; gray?: boolean; flex?: number; a11y?: string }) =>
      <Pressable accessibilityRole="button" accessibilityLabel={a11y || l} onPress={on} style={({ pressed }) => ({ flex, borderRadius: 6, backgroundColor: pressed ? C.brand100 : gray ? "#AEB4BD" : "#fff", alignItems: "center", justifyContent: "center",
        shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 0, shadowOffset: { width: 0, height: 1 }, elevation: 1 })}><T w={gray ? "m" : "r"} size={gray ? 15 : 22} color={C.ink}>{l}</T></Pressable>;
    return (
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: KB_H + bottom, paddingTop: PAD, paddingBottom: PAD + bottom, backgroundColor: "#D1D5DB", zIndex: 200, elevation: 30, alignItems: "center" }}>
        <View style={{ width: 520, maxWidth: "96%", flex: 1, flexDirection: "row", gap: GAP }}>
          <View style={{ flex: 3, gap: GAP }}>{[["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["+", "0", " "]].map((r, i) => <View key={i} style={{ flex: 1, flexDirection: "row", gap: GAP }}>
            {r.map(k => k === " " ? <View key="sp" style={{ flex: 1 }} /> : <P key={k} l={k} on={() => put(k)} />)}</View>)}</View>
          <View style={{ flex: 1, gap: GAP }}><P l="⌫" a11y="Delete" gray on={back} /><P l="Clear" gray on={() => t.set("")} /><P l="Done" gray flex={2.1} on={done} /></View>
        </View>
      </View>);
  }
  const Key = ({ label, onPress, flex = 1, gray, a11y }: { label: string; onPress: () => void; flex?: number; gray?: boolean; a11y?: string }) =>
    <Pressable accessibilityRole="button" accessibilityLabel={a11y || label} onPress={onPress}
      style={({ pressed }) => ({ flex, height: KEY_H, borderRadius: 6, backgroundColor: pressed ? C.brand100 : gray ? "#AEB4BD" : "#fff", alignItems: "center", justifyContent: "center",
        shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 0, shadowOffset: { width: 0, height: 1 }, elevation: 1 })}>
      <T w={gray ? "m" : "r"} size={gray ? 15 : 21} color={C.ink}>{label}</T></Pressable>;
  const ch = (c: string) => (shift && lang === "en" && !num ? c.toUpperCase() : c);
  return (
    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: PAD, paddingHorizontal: 6, paddingBottom: PAD + bottom, gap: GAP, backgroundColor: "#D1D5DB", zIndex: 200, elevation: 30 }}>
      <View style={{ flexDirection: "row", gap: GAP }}>{rows[0].split("").map(c => <Key key={c} label={ch(c)} onPress={() => put(ch(c))} />)}<Key label="⌫" a11y="Delete" gray flex={1.4} onPress={back} /></View>
      <View style={{ flexDirection: "row", gap: GAP, paddingLeft: rows[1].length < 10 ? 24 : 0 }}>{rows[1].split("").map(c => <Key key={c} label={ch(c)} onPress={() => put(ch(c))} />)}<Key label="Done" gray flex={1.6} onPress={done} /></View>
      <View style={{ flexDirection: "row", gap: GAP }}>
        {lang === "en" && !num ? <Key label="⇧" a11y="Shift" gray flex={1.3} onPress={() => setShift(s => !s)} /> : null}
        {rows[2].split("").map(c => <Key key={c} label={ch(c)} onPress={() => put(ch(c))} />)}
        {lang === "en" && !num ? <><Key label="," onPress={() => put(",")} /><Key label="." onPress={() => put(".")} /></> : null}
        {t.multiline ? <Key label="↵" a11y="New line" gray flex={1.3} onPress={() => put("\n")} /> : null}
      </View>
      <View style={{ flexDirection: "row", gap: GAP }}>
        <Key label={num ? (lang === "ar" ? "أبج" : "ABC") : "123"} gray flex={1.5} onPress={() => setNum(n => !n)} />
        <Key label={lang === "ar" ? "مسافة" : "space"} a11y="Space" flex={7} onPress={() => put(" ")} />
        <Key label={lang === "ar" ? "EN" : "عربي"} a11y="Switch language" gray flex={1.5} onPress={() => { setLang(l => (l === "en" ? "ar" : "en")); setNum(false); }} />
      </View>
    </View>
  );
}
