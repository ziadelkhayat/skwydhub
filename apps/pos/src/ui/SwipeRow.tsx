// A cart line that can be swiped left to show a red Delete button (no animation: the line follows the finger, then sits open or closed).
import { useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, View, type ViewStyle } from "react-native";
import { C } from "../lib/theme";
import { T } from "./kit";

const W = 88;
export function SwipeRow({ enabled, onDelete, style, children }: { enabled: boolean; onDelete: () => void; style?: ViewStyle; children: React.ReactNode }) {
  const [x, setX] = useState(0), open = useRef(false);
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => enabled && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderMove: (_e, g) => setX(Math.max(-W, Math.min(0, (open.current ? -W : 0) + g.dx))),
    onPanResponderRelease: (_e, g) => { const v = (open.current ? -W : 0) + g.dx; open.current = v < -W / 2; setX(open.current ? -W : 0); },
    onPanResponderTerminate: () => setX(open.current ? -W : 0),
  }), [enabled]);
  if (!enabled && x) { open.current = false; setX(0); }
  return (
    <View style={{ overflow: "hidden" }}>
      {x < 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Delete" onPress={() => { open.current = false; setX(0); onDelete(); }}
        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: W, backgroundColor: C.bad, alignItems: "center", justifyContent: "center" }}><T w="s" size={14} color="#fff">Delete</T></Pressable> : null}
      <View {...pan.panHandlers} style={[style, { transform: [{ translateX: x }] }]}>{children}</View>
    </View>
  );
}
