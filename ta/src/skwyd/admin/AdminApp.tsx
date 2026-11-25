import { Label } from "@/components/tremor/Label";
// Skwyd Hub admin (admin.skwydhub.com) in the portal's TailAdmin look: sign in with email and password (Skwyd Hub admins only),
// then Dashboard, Companies (each company's plan, owner and invoices), Invoices, Price List and Settings. Replaces the old hub.html admin.
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/contexts";
import { sb } from "@/lib/supabase";
import { cx, focusRing } from "@/components/tremor/utils";
import { RiBillLine, RiBuilding2Line, RiHome2Line, RiMenuLine, RiMore2Fill, RiPriceTag3Line, RiSettings5Line } from "@remixicon/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Suspense, lazy, useEffect, useState } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router";
import { Toaster } from "../ui/toast";
import { ConfirmHost } from "../ui/confirm";
import { AdminCtx, initials, rpc, useAdmin, type Admin, type Overview } from "./data";

const Pages = { dash: lazy(() => import("./pages").then(m => ({ default: m.AdminDashboard }))), cos: lazy(() => import("./pages").then(m => ({ default: m.Companies }))),
  co: lazy(() => import("./pages").then(m => ({ default: m.CompanyPage }))), inv: lazy(() => import("./pages").then(m => ({ default: m.Invoices }))),
  prices: lazy(() => import("./pages").then(m => ({ default: m.Prices }))), settings: lazy(() => import("./pages").then(m => ({ default: m.AdminSettings }))) };
const NAV: [string, string, React.ComponentType<{ className?: string }>][] = [["/", "Dashboard", RiHome2Line], ["/companies", "Companies", RiBuilding2Line], ["/invoices", "Invoices", RiBillLine], ["/prices", "Price List", RiPriceTag3Line], ["/settings", "Settings", RiSettings5Line]];
const Spin = () => <div className="flex min-h-[50vh] items-center justify-center"><span className="size-9 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" /></div>;

export default function AdminApp() {
  const [phase, setPhase] = useState<"boot" | "in" | "out">("boot"), [msg, setMsg] = useState(""), [data, setData] = useState<Overview | null>(null), [view, setView] = useState<any>(null), [me, setMe] = useState({ email: "" });
  const load = async () => { setData(await rpc<Overview>("slick_pa_overview")); try { setView(await rpc("slick_my_view")); } catch { setView(null); } };
  const boot = async () => {
    const { data: { session } } = await sb.auth.getSession(); if (!session) return setPhase("out");
    let ok = false; try { ok = await rpc<boolean>("slick_is_platform_admin"); } catch { /* not an admin */ }
    if (!ok) { await sb.auth.signOut(); setMsg("This account isn't a Skwyd Hub admin."); return setPhase("out"); }
    setMe({ email: session.user.email || "" }); try { await load(); setPhase("in"); } catch (e: any) { setMsg(e.message); setPhase("out"); } };
  useEffect(() => { document.title = "skwyd admin"; boot(); }, []);
  if (phase === "boot") return <Spin />;
  if (phase === "out" || !data) return <SignIn msg={msg} onIn={() => { setMsg(""); setPhase("boot"); boot(); }} />;
  const ctx: Admin = { data, view, me, reload: load, signOut: async () => { await sb.auth.signOut(); setData(null); setPhase("out"); } };
  return <AdminCtx.Provider value={ctx}><Shell /><Toaster /><ConfirmHost /></AdminCtx.Provider>;
}

function SignIn({ msg, onIn }: { msg: string; onIn: () => void }) {
  const [em, setEm] = useState(""), [pw, setPw] = useState(""), [err, setErr] = useState(msg), [busy, setBusy] = useState(false);
  return <div className="flex min-h-dvh items-center justify-center bg-white p-6 dark:bg-gray-950">
    <form className="w-full max-w-sm" onSubmit={async e => { e.preventDefault(); setBusy(true); setErr("");
      const { error } = await sb.auth.signInWithPassword({ email: em.trim(), password: pw }); setBusy(false); if (error) return setErr("Wrong email or password."); onIn(); }}>
      <div className="mb-6"><img src="/images/logo/logo.svg" alt="skwyd" className="mb-6 h-9 dark:hidden" onError={e => (e.currentTarget.style.display = "none")} />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Skwyd Hub Admin</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Sign in with your admin email and password.</p></div>
      <div className="space-y-4">
        <div><Label htmlFor="ae" className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-gray-50">Email <span className="text-red-500">*</span></Label><Input id="ae" className="h-9" type="email" autoComplete="username" required value={em} onChange={e => setEm(e.target.value)} /></div>
        <div><Label htmlFor="ap" className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-gray-50">Password <span className="text-red-500">*</span></Label><Input id="ap" className="h-9" type="password" autoComplete="current-password" required value={pw} onChange={e => setPw(e.target.value)} /></div>
        {err && <p className="text-sm text-red-500">{err}</p>}
        <Button className="h-9 w-full" disabled={busy}>{busy ? "Signing in…" : "Sign In"}</Button>
      </div></form></div>;
}

function Shell() {
  const { me, view, reload, signOut } = useAdmin(), { pathname } = useLocation(), [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const nav = <nav aria-label="Main" className="flex flex-1 flex-col"><ul role="list" className="space-y-0.5">{NAV.map(([to, t, I]) => <li key={to}><NavLink to={to} end={to === "/"} className={({ isActive }) => cx(isActive || (to === "/companies" && pathname === "/company") ? "text-blue-600 dark:text-blue-500" : "text-gray-700 hover:text-gray-900 dark:text-gray-400 hover:dark:text-gray-50", "flex items-center gap-x-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition hover:bg-gray-100 hover:dark:bg-gray-900", focusRing)}><I className="size-4 shrink-0" aria-hidden="true" />{t}</NavLink></li>)}</ul></nav>;
  const brand = <div className="flex items-center gap-x-2.5 rounded-md border border-gray-300 bg-white p-2 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-950"><span className="flex aspect-square size-8 items-center justify-center rounded bg-blue-600 text-xs font-medium text-white dark:bg-blue-500" aria-hidden="true">SH</span><span><span className="block font-medium text-gray-900 dark:text-gray-50">Skwyd Hub</span><span className="block text-xs text-gray-500 dark:text-gray-400">Admin</span></span></div>;
  const user = <DropdownMenu><DropdownMenuTrigger aria-label="User settings" className={cx("group flex w-full items-center justify-between rounded-md p-2 text-sm font-medium text-gray-900 hover:bg-gray-100 data-[state=open]:bg-gray-100 dark:text-gray-50 hover:dark:bg-gray-400/10", focusRing)}>
      <span className="flex min-w-0 items-center gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300" aria-hidden="true">{initials(me.email)}</span><span className="truncate">{me.email}</span></span>
      <RiMore2Fill className="size-4 shrink-0 text-gray-500" aria-hidden="true" /></DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="sm:!min-w-[calc(var(--radix-dropdown-menu-trigger-width))]"><ThemeItems /><DropdownMenuSeparator /><DropdownMenuItem onSelect={signOut}>Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
  return <div className="min-h-dvh bg-white dark:bg-gray-950">
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col"><aside className="flex grow flex-col gap-y-6 overflow-y-auto border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">{brand}{nav}<div className="mt-auto">{user}</div></aside></div>
    <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-2 shadow-sm sm:px-4 lg:hidden dark:border-gray-800 dark:bg-gray-950">
      <span className="font-semibold text-gray-900 dark:text-gray-50">Skwyd Hub Admin</span>
      <Sheet open={open} onOpenChange={setOpen}><SheetTrigger aria-label="Open menu" className={cx("rounded-md p-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300", focusRing)}><RiMenuLine className="size-6" /></SheetTrigger>
        <SheetContent side="right" className="sm:max-w-xs"><SheetHeader><SheetTitle>Skwyd Hub Admin</SheetTitle></SheetHeader>{nav}<div className="mt-auto">{user}</div></SheetContent></Sheet>
    </div>
    <main className="lg:pl-72"><div className="mx-auto w-full max-w-(--breakpoint-2xl) p-4 sm:px-6 sm:pt-8 sm:pb-10 lg:px-10 lg:pt-7">
      {view && <div className="mb-6 flex flex-wrap items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800 ring-1 ring-inset ring-blue-500/30 dark:bg-blue-400/10 dark:text-blue-400">Viewing <b>{view.name}</b> in the portal
        <a className="font-semibold underline" href="https://dev.portal.skwydhub.com/" target="_blank" rel="noreferrer">Open</a>
        <Button type="button" variant="link" className="font-semibold text-inherit underline dark:text-inherit" onClick={async () => { await rpc("slick_stop_view"); await reload(); }}>Stop Viewing</Button></div>}
      <Suspense fallback={<Spin />}><Routes>
        <Route index element={<Pages.dash />} /><Route path="/companies" element={<Pages.cos />} /><Route path="/company" element={<Pages.co />} />
        <Route path="/invoices" element={<Pages.inv />} /><Route path="/prices" element={<Pages.prices />} /><Route path="/settings" element={<Pages.settings />} />
        <Route path="*" element={<Pages.dash />} /></Routes></Suspense></div></main>
  </div>;
}

function ThemeItems() {
  const { themeMode, setThemeMode } = useTheme();
  return <DropdownMenuSub><DropdownMenuSubTrigger>Theme</DropdownMenuSubTrigger><DropdownMenuSubContent><DropdownMenuRadioGroup value={themeMode} onValueChange={v => setThemeMode(v as any)}>
    <DropdownMenuRadioItem value="light" iconType="check">Light</DropdownMenuRadioItem><DropdownMenuRadioItem value="dark" iconType="check">Dark</DropdownMenuRadioItem><DropdownMenuRadioItem value="auto" iconType="check">System</DropdownMenuRadioItem>
  </DropdownMenuRadioGroup></DropdownMenuSubContent></DropdownMenuSub>;
}
