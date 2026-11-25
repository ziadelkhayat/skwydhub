// End of day (pos.html openDayEnd / doDayEnd): one per store per business day, after every till is closed and no order is left open.
import { View } from "react-native";
import { bizDate, money, openDay, type Ctx } from "../lib/pos";
import { useStore } from "../lib/store";
import { C } from "../lib/theme";
import { Btn, T } from "./kit";
import { Sheet } from "./Pickers";

const fmtDay = (d: string) => d.split("-").reverse().join("-");
export function endDayBlock(x: Ctx) {
  const shifts = x.S.shifts.filter(s => s.branchId === x.device.branchId && !s.closedAt), act = x.S.orders.filter(o => o.branchId === x.device.branchId && ["pending", "active"].includes(o.status));
  if (shifts.length) return shifts.length === 1 ? "Till still open. Close it before ending the day" : shifts.length + " tills still open. Close them before ending the day";
  if (act.length) return act.length === 1 ? "1 order still active. Finish, decline or void it first" : act.length + " orders still active. Finish, decline or void them first";
  return "";
}
export function EndDayDialog({ x, onDone }: { x: Ctx; onDone: (msg?: string) => void }) {
  const { write, cashier, device, branch } = useStore();
  const day = openDay(x), sales = x.S.orders.filter(o => o.branchId === x.device.branchId && (o.status === "closed" || o.status === "refund") && bizDate(x, o.createdAt) === day);
  const end = () => {
    write("day_closes", "dc_" + device!.branchId + "_" + day, { branchId: device!.branchId, businessDate: day, closedAt: new Date().toISOString(), closedBy: cashier?.name || device!.name, deviceId: device!.id, orders: sales.length, sales: +sales.reduce((a, o) => a + (+o.total || 0), 0).toFixed(2) }, "set");
    onDone("Day ended · " + fmtDay(day));
  };
  return (
    <Sheet title={"End day · " + fmtDay(day)} width={520} onClose={() => onDone()} footer={<><View style={{ flex: 1 }} /><Btn label="Cancel" height={48} onPress={() => onDone()} /><Btn kind="primary" height={48} label="End day" onPress={end} /></>}>
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {[["Orders", String(sales.length)], ["Net sales", money(x.S, sales.reduce((a, o) => a + (+o.total || 0) - (+o.tax || 0), 0))], ["Payments", money(x.S, sales.reduce((a, o) => a + (+o.total || 0), 0))]].map(([l, v]) =>
            <View key={l} style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: C.bg }}><T size={13} color={C.mut}>{l}</T><T w="s" size={18}>{v}</T></View>)}
        </View>
        <T color={C.mut}>Ending the day closes {fmtDay(day)} for {branch?.name || "this store"}. Every device at the store then starts the next business day.</T>
      </View>
    </Sheet>
  );
}
