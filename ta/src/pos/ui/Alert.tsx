"use no memo"; // the POS code relies on checks the React Compiler would skip (it treats x! as never null), so it runs without the compiler
// New orders and order edits from the web, API or call center: a Tremor banner over every screen (also the PIN screen),
// and the new-order sound looping until every one of them is accepted or declined.
import { Button } from "@/components/tremor/Button";
import { Card } from "@/components/tremor/Card";
import { useEffect, useRef } from "react";
import type { Data, Row } from "../lib/db";
import kv from "../lib/kv";
import { money } from "../lib/pos";
import { useStore } from "../lib/store";
import { Icon } from "./Icon";

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
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => { (async () => {
    const mute = (await kv.getItem("skwyd_sound")) === "off";
    if (!audio.current) { audio.current = new Audio(import.meta.env.BASE_URL + "pos-files/new-order.wav"); audio.current.loop = true; }
    const a = audio.current;
    try { if (ring && !mute) { if (a.paused) { a.currentTime = 0; await a.play(); } } else a.pause(); } catch { /* the browser waits for a first tap before it plays sound */ }
  })(); }, [ring]);
  useEffect(() => () => audio.current?.pause(), []);
  if (!o || !ring) return null;
  const edit = o.editRequest?.status === "pending" && o.status !== "pending";
  const what = edit ? "Order edit" : "New " + (o.channel === "callcenter" ? "call center" : o.channel === "web" || o.channel === "online" ? "web" : "API") + " order";
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center">
      <Card className="pointer-events-auto flex w-[660px] max-w-[94%] items-center gap-4 border-amber-300 p-4 shadow-lg dark:border-amber-700">
        <span className="flex size-11 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"><Icon name="bell" className="size-6" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 dark:text-gray-50">{what} · {o.type === "delivery" ? "Delivery" : "Pickup"}{list.length > 1 ? `  (+${list.length - 1} more)` : ""}</p>
          <p className="truncate text-sm text-gray-500">{[o.customerName, (o.items || []).length + " items", money(S, o.total)].filter(Boolean).join(" · ")}</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400"><Icon name="sound" className="size-4" />Ringing</span>
        <Button onClick={() => openIt(o)}>{cashier ? "Open" : "Sign In to Accept"}</Button>
      </Card>
    </div>);
}
