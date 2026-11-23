// The POS's screen: the device's window on a tablet; in a web browser, a 16:10 tablet-sized frame in the middle of the window
// (so the web POS looks and lays out like the tablet app).
import { createContext, useContext, type ReactNode } from "react";
import { Platform, useWindowDimensions, View } from "react-native";

const Ctx = createContext<{ width: number; height: number } | null>(null);
export const useScreen = () => { const w = useWindowDimensions(), f = useContext(Ctx); return f || { width: w.width, height: w.height }; };

export function Screen({ children }: { children: ReactNode }) {
  const { width: W, height: H } = useWindowDimensions();
  if (Platform.OS !== "web") return <>{children}</>;
  // the biggest 16:10 box that fits the window (a phone held upright gets the full window)
  const tall = H > W, w = tall ? W : Math.min(W, Math.round(H * 1.6)), h = tall ? H : Math.round(w / 1.6);
  return (
    <View style={{ flex: 1, backgroundColor: "#1D2939", alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: w, height: h, overflow: "hidden", borderRadius: w < W || h < H ? 14 : 0 }}>
        <Ctx.Provider value={{ width: w, height: h }}>{children}</Ctx.Provider>
      </View>
    </View>
  );
}
