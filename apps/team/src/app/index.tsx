// The Team app (and the Driver app: the same app plus delivery orders): header, screen, bottom tabs, message line.
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTeam } from "../lib/team";
import { C } from "../lib/theme";
import { Chat } from "../ui/Chat";
import { Clock } from "../ui/Clock";
import { Deliveries, DriverAlert, useDriver } from "../ui/Deliveries";
import { Icon } from "../ui/Icon";
import { Btn, T } from "../ui/kit";
import { Login } from "../ui/Login";
import { Hours, Requests, Schedule } from "../ui/Schedule";
import { Guides, Tasks } from "../ui/Work";

type Tab = "deliv" | "clock" | "sched" | "tasks" | "chat" | "reqs" | "kb" | "hours";
export default function Index() {
  const { phase, me, note, signOut, driver, boot, queue } = useTeam();
  const [tab, setTab] = useState<Tab>(driver ? "deliv" : "clock"), [dots, setDots] = useState<Record<string, boolean>>({}), [order, setOrder] = useState<any>(null);
  const d = useDriver(driver && phase === "ready");
  if (phase === "boot") return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  if (phase === "login") return <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}><Login /></SafeAreaView>;
  if (phase === "offline" || !me) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 }}>
      <T w="s" size={18}>No internet connection</T><T color={C.mut} style={{ textAlign: "center" }}>Connect once to load your account on this phone.</T><Btn kind="primary" label="Try Again" onPress={boot} />
    </SafeAreaView>);
  const dot = (k: string) => (v: boolean) => setDots(s => (s[k] === v ? s : { ...s, [k]: v }));
  const tabs: [Tab, string, string][] = driver ? [["deliv", "Orders", "bike"], ["clock", "Clock", "clock"], ["sched", "Schedule", "cal"], ["chat", "Chat", "chat"], ["reqs", "Requests", "req"], ["kb", "Guides", "kb"]]
    : [["clock", "Clock", "clock"], ["sched", "Schedule", "cal"], ["tasks", "Tasks", "task"], ["chat", "Chat", "chat"], ["reqs", "Requests", "req"], ["kb", "Guides", "kb"]];
  const hr = new Date().getHours(), hello = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  const ini = String(me.name || "?").trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const out = () => queue.length ? signOut() : Alert.alert("Sign out?", "", [{ text: "Cancel", style: "cancel" }, { text: "Sign Out", style: "destructive", onPress: signOut }]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "bottom"]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: C.line }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.brand50, alignItems: "center", justifyContent: "center" }}><T w="s" color={C.brand}>{ini}</T></View>
        <View style={{ flex: 1 }}><T size={12} color={C.mut}>{hello}</T><T w="s" numberOfLines={1}>{me.name}</T></View>
        <Btn height={36} label="Sign Out" onPress={out} />
      </View>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {tab === "deliv" ? <Deliveries d={d} open={order} setOpen={setOrder} />
          : tab === "clock" ? <Clock onHours={() => setTab("hours")} />
          : tab === "hours" ? <Hours onBack={() => setTab("clock")} />
          : tab === "sched" ? <Schedule />
          : tab === "tasks" ? <Tasks />
          : tab === "chat" ? <Chat onDot={dot("chat")} />
          : tab === "reqs" ? <Requests />
          : <Guides onDot={dot("kb")} />}
        {note ? <View pointerEvents="none" style={{ position: "absolute", left: 16, right: 16, bottom: 12, padding: 12, borderRadius: 12, backgroundColor: C.ink }}><T color="#fff" style={{ textAlign: "center" }}>{note}</T></View> : null}
      </View>
      <View style={{ flexDirection: "row", borderTopWidth: 1, borderColor: C.line, padding: 6 }}>
        {tabs.map(([k, t, i]) => { const on = tab === k || (k === "clock" && tab === "hours"), red = k === "deliv" ? d.dot : dots[k];
          return <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setTab(k)} style={{ flex: 1, alignItems: "center", gap: 3, paddingVertical: 7, borderRadius: 12, backgroundColor: on ? C.brand50 : "transparent" }}>
            <Icon name={i} size={22} color={on ? C.brand : C.mut} /><T size={11} w="s" color={on ? C.brand : C.mut}>{t}</T>
            {red ? <View style={{ position: "absolute", top: 4, right: "28%", width: 9, height: 9, borderRadius: 5, backgroundColor: C.bad }} /> : null}
          </Pressable>; })}
      </View>
      {driver ? <DriverAlert d={d} onView={o => { setTab("deliv"); setOrder(o); }} /> : null}
    </SafeAreaView>
  );
}
