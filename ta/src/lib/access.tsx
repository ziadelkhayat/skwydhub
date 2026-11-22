// Who may open what, and the Skwyd Hub subscription, as in the current portal:
// - a user with roles only opens the sections their roles allow (the owner and admins open everything; no role = summary, orders, call center, customers)
// - a section of a paid module the plan doesn't include shows "isn't in your plan"
// - the subscription banner (free trial, payment overdue, invoice ready), the lock screen once it ends, and the Skwyd Hub admin "viewing as" bar
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useCol } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Link } from "react-router";

/* ---------- subscription (rpc slick_my_subscription), loaded once and every 10 minutes ---------- */
let SUB: any = undefined; const subs = new Set<() => void>(); let started = false;
async function loadSub() { try { const r = await sb.rpc("slick_my_subscription"); SUB = r.error ? null : r.data || null; } catch { SUB = null; } subs.forEach(f => f()); }
export function useSub() {
  return useSyncExternalStore(f => { subs.add(f); if (!started) { started = true; loadSub(); setInterval(() => { if (!document.hidden) loadSub(); }, 600000); } return () => { subs.delete(f); }; }, () => SUB, () => SUB);
}
export const subMoney = (n: any, c = "USD") => c + " " + (+n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

/* ---------- which permission and which paid module each address belongs to ---------- */
const G: [string, string | null, string[]][] = [
  ["bo_dashboard", null, [""]], ["bo_orders", null, ["orders", "order"]], ["bo_callcenter", "call_center", ["call-center"]], ["bo_customers", null, ["customers", "customer"]],
  ["bo_reports", null, ["sales-reports", "business-reports", "analysis-reports", "employee-reports"]],
  ["bo_reports", "inventory", ["inventory-reports", "inv-levels", "inv-history", "purchasing"]],
  ["bo_marketing", "marketing", ["discounts", "loyalty", "gift-cards", "promotions", "coupons"]],
  ["bo_menu", null, ["products", "categories", "modifiers", "modifier-options", "variants", "combos", "allergens", "branch-menu", "item", "option"]],
  ["bo_inventory", "inventory", ["inv-items", "inv-categories", "warehouses", "suppliers", "po", "purchase-orders", "transfer-orders", "transfers", "production", "inventory-count", "quantity-adjustments", "cost-adjustments", "spot-check", "count-sheets", "order-transactions", "inv-item", "supplier", "warehouse"]],
  ["bo_manage", "online_ordering", ["online-ordering", "delivery-zones", "delivery-charges"]],
  ["bo_staff", null, ["users", "roles", "schedule", "time-clock", "requests", "payroll", "documents", "team-chat", "tasks", "knowledge", "employee"]],
  ["bo_manage", null, ["brands", "branches", "devices", "taxes", "tax-groups", "currency", "payment-methods", "order-sources", "charges", "kitchen-flows", "reasons", "tags", "applications", "brand", "store", "subscription"]],
  ["bo_manage", "marketplace", ["marketplace"]],
];
const OF: Record<string, [string, string | null]> = {}; G.forEach(([p, m, l]) => l.forEach(r => OF[r] = [p, m]));
// the order reports open at /<hub>?r=… and other report pages: a report hub key is its own route
export const MOD_NAME: Record<string, string> = { inventory: "Inventory", marketing: "Marketing", online_ordering: "Online Ordering", marketplace: "Marketplace", call_center: "Call Center" };

export function useAccess() {
  const { staff } = useAuth(), users = useCol("users"), roles = useCol("roles"), sub = useSub();
  const full = !staff?.role || staff.role === "owner" || staff.role === "admin" || !!staff.viewAs;
  let perms: string[] | null = null;
  if (!full) { const u = (users || []).find(x => !x.deleted && x.userId && x.userId === staff!.userId), ids: string[] = u ? (u.roleIds?.length ? u.roleIds : u.roleId ? [u.roleId] : []) : [];
    const rs = (roles || []).filter(r => !r.deleted && ids.includes(r.id)); perms = rs.length ? [...new Set(rs.flatMap(r => r.permissions || []))] : ["bo_dashboard", "bo_orders", "bo_callcenter", "bo_customers"]; }
  const planHas = (mod: string | null) => !mod || !sub || sub.complimentary || !Array.isArray(sub.modules) || sub.modules.includes(mod);
  const route = (path: string) => path.replace(/^\/+/, "").split(/[/?]/)[0];
  const info = (path: string) => OF[route(path)] || null;
  const allowed = (path: string) => { const i = info(path); if (!i || !perms) return true; const [need] = i; return perms.includes(need) || (need === "bo_staff" && perms.includes("bo_manage")); };
  const inPlan = (path: string) => { const i = info(path); return !i || planHas(i[1]); };
  return { ready: full || (!!users && !!roles), perms, sub, allowed, inPlan, canOpen: (p: string) => allowed(p) && inPlan(p), modOf: (p: string) => info(p)?.[1] || null,
    mayDo: (perm: string) => !perms || perms.includes(perm) || perms.includes("bo_manage") };
}

/* ---------- the bar above every page ---------- */
export function SubBar() {
  const { staff } = useAuth(), { sub, canOpen } = useAccess(), [stopping, setStopping] = useState(false);
  const va = staff?.viewAs;
  if (va) return <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-warning-50 px-4 py-3 text-sm text-warning-800 dark:bg-warning-500/10 dark:text-warning-300">
    <span>You're viewing <b>{va.name}</b> (account {va.accountNo || ""}) as Skwyd Hub admin. Changes you make here are saved to this business.</span>
    <Button size="sm" variant="outline" className="ms-auto" disabled={stopping} onClick={async () => { setStopping(true); await sb.rpc("slick_stop_view"); location.reload(); }}>Exit</Button></div>;
  if (!sub || sub.complimentary || sub.state === "locked" || location.hash.startsWith("#/subscription")) return null;
  const cur = sub.billing?.currency || sub.quote?.currency || "USD", go = canOpen("/subscription");
  let warn = false, text: React.ReactNode = null, btn = "View Plan";
  if (sub.state === "trial") text = <>Free trial: <b>{days(+sub.daysLeft || 0)} left</b>. Your plan starts after the trial ends.</>;
  else if (sub.state === "grace") { warn = true; btn = "Pay Now"; text = <><b>Payment overdue.</b> {+sub.owed ? subMoney(sub.owed, cur) + " is due. " : ""}Access locks in <b>{days(+sub.daysLeft || 0)}</b>.</>; }
  else if (sub.state === "active" && +sub.openInvoices && +sub.daysLeft <= 7) text = <>Your invoice of <b>{subMoney(sub.owed, cur)}</b> is ready. The plan renews in {days(+sub.daysLeft || 0)}.</>;
  if (!text) return null;
  return <div className={"mb-4 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-sm " + (warn ? "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400" : "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300")}>
    <span>{text}</span>{go && <Button size="sm" variant="outline" className="ms-auto" render={<Link to="/subscription" />}>{btn}</Button>}</div>;
}

/* ---------- a page the user may not open, or a module that isn't in the plan ---------- */
export function Blocked({ path }: { path: string }) {
  const { allowed, modOf, canOpen } = useAccess(), m = modOf(path);
  const plan = allowed(path);
  return <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-800 dark:bg-white/3">
    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{plan ? `${MOD_NAME[m || ""] || "This module"} isn't in your plan` : "You don't have access to this page"}</h3>
    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{plan ? "Add it to your Skwyd Hub subscription to use it." : "Ask the owner to give your role this permission (Employee Management → Roles)."}</p>
    {plan && canOpen("/subscription") && <Button className="mt-5" render={<Link to="/subscription" />}>View Plan</Button>}</div>;
}

/* ---------- the lock screen once the subscription has ended (a Skwyd Hub admin viewing the business still gets in) ---------- */
export function Locked() {
  const sub = useSub(), { signOut } = useAuth(), b = sub?.billing || {}, cur = b.currency || "USD";
  useEffect(() => { document.title = "Subscription ended · Skwyd Hub"; }, []);
  const open = (sub?.invoices || []).filter((i: any) => i.status === "open");
  return <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-900"><div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/3">
    <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Your Skwyd Hub subscription has ended</h1>
    <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">The back office, POS registers and online ordering are paused until the open invoice is paid. Your data is kept safe.</p>
    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">To renew, contact {[b.supportPhone, b.supportEmail].filter(Boolean).join(" · ") || "Skwyd Hub support"}{sub?.company?.accountNo ? <> with your account number <b>{sub.company.accountNo}</b></> : null}.</p>
    {+sub?.owed > 0 && <div className="mt-5 flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount Due</span><b className="text-lg text-gray-800 dark:text-white/90">{subMoney(sub.owed, cur)}</b></div>}
    {open.length > 0 && <ul className="mt-4 space-y-1 text-start text-sm text-gray-600 dark:text-gray-400">{open.map((i: any) => <li key={i.id}>{i.number} · {subMoney(i.total, i.currency)}</li>)}</ul>}
    <div className="mt-6 flex justify-center gap-3"><Button variant="outline" onClick={() => location.reload()}>Check Again</Button><Button variant="outline" onClick={signOut}>Sign Out</Button></div>
  </div></div>;
}
