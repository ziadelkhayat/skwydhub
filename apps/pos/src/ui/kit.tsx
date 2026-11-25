// Small building blocks copying Tremor Raw (Button, Badge, Card) for React Native. No animations (POS rule): presses only change colour.
import { Pressable, Text, View, type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from "react-native";
import { C, F, R, shadowXs } from "../lib/theme";

export function T({ w = "r", size = 15, color = C.ink, style, ...p }: TextProps & { w?: keyof typeof F; size?: number; color?: string }) {
  return <Text {...p} style={[{ fontFamily: F[w], fontSize: size, color }, style]} />;
}

type BtnKind = "primary" | "outline" | "soft" | "danger" | "ghost" | "light";
// Tremor Button variants: primary (blue-600, pressed blue-500), secondary (white, gray-300 border), light (gray-200),
// ghost, destructive (red-600). "soft" is the selected look of Tremor's RadioCard (blue-50, blue border).
const KIND: Record<BtnKind, { bg: string; bgOn: string; fg: string; border: string }> = {
  primary: { bg: C.brand, bgOn: C.brand500, fg: "#fff", border: C.brand },
  outline: { bg: "#fff", bgOn: C.bg2, fg: C.ink, border: C.field },
  light: { bg: "#E5E7EB", bgOn: "#D1D5DB", fg: C.ink, border: "#E5E7EB" },
  soft: { bg: C.brand50, bgOn: C.brand100, fg: C.brand800, border: C.brand500 },
  danger: { bg: C.bad, bgOn: "#EF4444", fg: "#fff", border: C.bad },
  ghost: { bg: "transparent", bgOn: "#F3F4F6", fg: C.ink, border: "transparent" },
};
export function Btn({ kind = "outline", label, sub, style, textStyle, height = 48, children, disabled, ...p }:
  PressableProps & { kind?: BtnKind; label?: string; sub?: string; height?: number; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle> }) {
  const k = KIND[kind];
  return (
    <Pressable accessibilityRole="button" disabled={disabled} {...p}
      style={({ pressed }) => [{ height, borderRadius: R.sm, borderWidth: 1, borderColor: k.border, backgroundColor: pressed ? k.bgOn : k.bg, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, opacity: disabled ? 0.45 : 1 },
        (kind === "outline" || kind === "primary" || kind === "danger") && shadowXs, style]}>
      {children ?? <>
        <T w="m" size={14} color={k.fg} style={textStyle} numberOfLines={1}>{label}</T>
        {sub ? <T size={11} color={k.fg} style={{ opacity: 0.8 }} numberOfLines={1}>{sub}</T> : null}
      </>}
    </Pressable>
  );
}

// Tremor Badge: soft colour, 1px ring, 4px corners, semibold 12px
export function Pill({ text, tone = "gray" }: { text: string; tone?: "gray" | "ok" | "brand" | "warn" | "bad" }) {
  const t = { gray: ["#F9FAFB", "#374151", C.grayRing], ok: [C.okBg, C.ok, C.okRing], brand: [C.brand50, C.brand800, C.brandRing], warn: [C.warnBg, C.warn, C.warnRing], bad: [C.badBg, C.bad800, C.badRing] }[tone];
  return <View style={{ backgroundColor: t[0], borderRadius: 6, borderWidth: 1, borderColor: t[2], paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start" }}><T w="s" size={12} color={t[1]}>{text}</T></View>;
}

export const Card = ({ style, ...p }: { style?: StyleProp<ViewStyle>; children?: React.ReactNode }) =>
  <View {...p} style={[{ backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.line }, shadowXs, style]} />;

// the 0–9 pad used for the activation code and PINs
export function Pad({ onKey, size = 72, flatFn, c = "Clear" }: { onKey: (k: string) => void; size?: number; flatFn?: boolean; c?: string }) {   // flatFn: Clear and ⌫ without a box
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "c", "0", "b"];
  return (
    <View style={{ width: size * 3 + 24, flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {keys.map(k => (
        <Pressable key={k} accessibilityRole="button" accessibilityLabel={k === "c" ? "Clear" : k === "b" ? "Delete" : k} onPress={() => onKey(k)}
          style={({ pressed }) => flatFn && (k === "c" || k === "b") ? { width: size, height: Math.round(size * 0.82), borderRadius: R.lg, backgroundColor: pressed ? C.brand50 : "transparent", alignItems: "center", justifyContent: "center" }
            : [{ width: size, height: flatFn ? Math.round(size * 0.82) : size, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, backgroundColor: pressed ? C.brand50 : "#fff", alignItems: "center", justifyContent: "center" }, shadowXs]}>
          <T w="m" size={k === "c" || k === "b" ? 15 : 24} color={k === "c" || k === "b" ? C.mut : C.ink}>{k === "c" ? c : k === "b" ? "⌫" : k}</T>
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
