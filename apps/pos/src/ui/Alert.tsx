// New orders and order edits from the web, API or call center: a banner over every screen (also the PIN screen),
// and the new-order sound looping until every one of them is accepted or declined.
import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import { useAudioPlayer } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Data, Row } from "../lib/db";
import { money } from "../lib/pos";
import { useStore } from "../lib/store";
import { C, R } from "../lib/theme";
import { Icon } from "./Icon";
import { Btn, T } from "./kit";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const waiting = (S: Data, branchId: string) => S.orders.filter(o => o.branchId === branchId && !o.deleted && ((o.channel !== "pos" && o.status === "pending") || o.editRequest?.status === "pending"))
  .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
export const pendingCount = (S: Data, branchId: string) => waiting(S, branchId).length;

// the register listens for "open this order"; asked from the PIN screen, it waits until the register is up
let listener: ((o: Row) => void) | null = null, queued: Row | null = null;
export const onAlertOpen = (f: (o: Row) => void) => { listener = f; if (queued) { const q = queued; queued = null; setTimeout(() => f(q), 0); } return () => { if (listener === f) listener = null; }; };
const openIt = (o: Row) => { if (listener) listener(o); else queued = o; };

export function AlertBanner() {
  const { S, device, cashier } = useStore();
  const list = device ? waiting(S, device.branchId) : [], o = list[0];
  const auto = !!device?.settings?.autoAccept;
  const ring = list.filter(z => !(auto && z.channel !== "callcenter" && z.status === "pending")).length > 0;
  const player = useAudioPlayer(require("../../assets/new-order.wav")), on = useRef(false);
  useEffect(() => { let off = false;
    (async () => { const mute = (await AsyncStorage.getItem("skwyd_sound")) === "off";
      try { player.loop = true; if (ring && !mute && !on.current) { player.seekTo(0); player.play(); on.current = true; } else if ((!ring || mute) && on.current) { player.pause(); on.current = false; } } catch {} })();
    return () => { off = true; void off; }; }, [ring]); // eslint-disable-line react-hooks/exhaustive-deps
  const top = useSafeAreaInsets().top;
  if (!o || !ring) return null;
  const edit = o.editRequest?.status === "pending" && o.status !== "pending";
  const what = edit ? "Order edit" : "New " + (o.channel === "callcenter" ? "call center" : o.channel === "web" || o.channel === "online" ? "web" : "API") + " order";
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", top: top + 8, left: 0, right: 0, alignItems: "center", zIndex: 60 }}>
      <View style={{ width: 660, maxWidth: "94%", flexDirection: "row", alignItems: "center", gap: 14, padding: 14, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#FDE68A",
        shadowColor: "#000000", shadowOpacity: 0.22, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 14 }}>
        <View style={{ width: 46, height: 46, borderRadius: R.lg, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" }}><Icon name="bell" size={24} color="#B45309" /></View>
        <View style={{ flex: 1 }}>
          <T w="s" size={16}>{what} · {o.type === "delivery" ? "Delivery" : "Pickup"}{list.length > 1 ? `  (+${list.length - 1} more)` : ""}</T>
          <T size={13} color={C.mut} numberOfLines={1}>{[o.customerName, (o.items || []).length + " items", money(S, o.total)].filter(Boolean).join(" · ")}</T>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Icon name="sound" size={18} color="#B45309" /><T w="s" size={12.5} color="#B45309">Ringing</T></View>
        <Btn kind="primary" height={42} label={cashier ? "Open" : "Sign In to Accept"} onPress={() => openIt(o)} />
      </View>
    </View>
  );
}
