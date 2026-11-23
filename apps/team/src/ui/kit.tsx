// Small building blocks in the TailAdmin look. No animations (POS rule): presses only change colour.
import { Pressable, Text, View, type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from "react-native";
import { C, F, R, shadowXs } from "../lib/theme";

export function T({ w = "r", size = 15, color = C.ink, style, ...p }: TextProps & { w?: keyof typeof F; size?: number; color?: string }) {
  return <Text {...p} style={[{ fontFamily: F[w], fontSize: size, color }, style]} />;
}

type BtnKind = "primary" | "outline" | "soft" | "danger" | "ghost";
const KIND: Record<BtnKind, { bg: string; bgOn: string; fg: string; border: string }> = {
  primary: { bg: C.brand, bgOn: C.brand600, fg: "#fff", border: C.brand },
  outline: { bg: "#fff", bgOn: C.line2, fg: C.ink2, border: C.field },
  soft: { bg: C.brand50, bgOn: C.brand100, fg: C.brand600, border: C.brand50 },
  danger: { bg: "#fff", bgOn: C.badBg, fg: C.bad, border: C.field },
  ghost: { bg: "transparent", bgOn: C.line2, fg: C.ink2, border: "transparent" },
};
export function Btn({ kind = "outline", label, sub, style, textStyle, height = 48, children, disabled, ...p }:
  PressableProps & { kind?: BtnKind; label?: string; sub?: string; height?: number; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle> }) {
  const k = KIND[kind];
  return (
    <Pressable accessibilityRole="button" disabled={disabled} {...p}
      style={({ pressed }) => [{ height, borderRadius: R.sm, borderWidth: 1, borderColor: k.border, backgroundColor: pressed ? k.bgOn : k.bg, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, opacity: disabled ? 0.45 : 1 },
        kind === "outline" && shadowXs, style]}>
      {children ?? <>
        <T w="m" size={15} color={k.fg} style={textStyle} numberOfLines={1}>{label}</T>
        {sub ? <T size={11} color={k.fg} style={{ opacity: 0.8 }} numberOfLines={1}>{sub}</T> : null}
      </>}
    </Pressable>
  );
}

export function Pill({ text, tone = "gray" }: { text: string; tone?: "gray" | "ok" | "brand" | "warn" | "bad" }) {
  const t = { gray: [C.line2, C.ink2], ok: [C.okBg, C.ok], brand: [C.brand50, C.brand600], warn: [C.warnBg, C.warn], bad: [C.badBg, C.bad] }[tone];
  return <View style={{ backgroundColor: t[0], borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 }}><T w="m" size={12} color={t[1]}>{text}</T></View>;
}

export const Card = ({ style, ...p }: { style?: StyleProp<ViewStyle>; children?: React.ReactNode }) =>
  <View {...p} style={[{ backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.line }, style]} />;

// the 0–9 pad used for the activation code and PINs
export function Pad({ onKey, size = 72 }: { onKey: (k: string) => void; size?: number }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "c", "0", "b"];
  return (
    <View style={{ width: size * 3 + 24, flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {keys.map(k => (
        <Pressable key={k} accessibilityRole="button" accessibilityLabel={k === "c" ? "Clear" : k === "b" ? "Delete" : k} onPress={() => onKey(k)}
          style={({ pressed }) => [{ width: size, height: size, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, backgroundColor: pressed ? C.brand50 : "#fff", alignItems: "center", justifyContent: "center" }, shadowXs]}>
          <T w="m" size={k === "c" || k === "b" ? 16 : 26} color={k === "c" || k === "b" ? C.mut : C.ink}>{k === "c" ? "Clear" : k === "b" ? "⌫" : k}</T>
        </Pressable>
      ))}
    </View>
  );
}

export const Dots = ({ n, of = 5 }: { n: number; of?: number }) => (
  <View style={{ flexDirection: "row", gap: 14 }}>
    {Array.from({ length: of }, (_, i) => <View key={i} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: i < n ? C.brand : "#fff", borderWidth: 1.5, borderColor: i < n ? C.brand : C.field }} />)}
  </View>
);
