// Skwyd Hub admin (admin.skwydhub.com) in the portal's TailAdmin look: sign in with email and password (Skwyd Hub admins only),
// then Dashboard, Companies (each company's plan, owner and invoices), Invoices, Price List and Settings. Replaces hub.html (still at /hub).
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/contexts";
import { sb } from "@/lib/supabase";
import { cn } from "@/utils";
import { Suspense, lazy, useEffect, useState } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router";
import { Toaster } from "../ui/toast";
import { ConfirmHost } from "../ui/confirm";
import { AdminCtx, initials, rpc, useAdmin, type Admin, type Overview } from "./data";

const Pages = { dash: lazy(() => import("./pages").then(m => ({ default: m.AdminDashboard }))), cos: lazy(() => import("./pages").then(m => ({ default: m.Companies }))),
  co: lazy(() => import("./pages").then(m => ({ default: m.CompanyPage }))), inv: lazy(() => import("./pages").then(m => ({ default: m.Invoices }))),
  prices: lazy(() => import("./pages").then(m => ({ default: m.Prices }))), settings: lazy(() => import("./pages").then(m => ({ default: m.AdminSettings }))) };
const NAV: [string, string, string][] = [["/", "Dashboard", "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"], ["/companies", "Companies", "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"],
  ["/invoices", "Invoices", "M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21zM9 8h6M9 12h6M9 16h3"], ["/prices", "Price List", "M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9zM7.5 6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3"],
  ["/settings", "Settings", "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"]];
const Ico = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const Spin = () => <div className="flex min-h-[50vh] items-center justify-center"><span className="size-9 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500" /></div>;

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
  return <div className="flex min-h-dvh items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
    <form className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-white/3" onSubmit={async e => { e.preventDefault(); setBusy(true); setErr("");
      const { error } = await sb.auth.signInWithPassword({ email: em.trim(), password: pw }); setBusy(false); if (error) return setErr("Wrong email or password."); onIn(); }}>
      <div className="mb-6"><img src="/images/logo/logo.svg" alt="skwyd" className="mb-6 h-9 dark:hidden" onError={e => (e.currentTarget.style.display = "none")} />
        <h1 className="text-title-sm font-semibold text-gray-800 dark:text-white/90">Skwyd Hub Admin</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Sign in with your admin email and password.</p></div>
      <div className="space-y-4">
        <div><label htmlFor="ae" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Email <span className="text-red-500">*</span></label><Input id="ae" className="h-9" type="email" autoComplete="username" required value={em} onChange={e => setEm(e.target.value)} /></div>
        <div><label htmlFor="ap" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Password <span className="text-red-500">*</span></label><Input id="ap" className="h-9" type="password" autoComplete="current-password" required value={pw} onChange={e => setPw(e.target.value)} /></div>
        {err && <p className="text-sm text-red-500">{err}</p>}
        <Button className="h-9 w-full" disabled={busy}>{busy ? "Signing in…" : "Sign In"}</Button>
      </div></form></div>;
}

function Shell() {
  const { me, view, reload, signOut } = useAdmin(), { pathname } = useLocation(), [open, setOpen] = useState(false), { theme, toggleTheme } = useTheme();
  useEffect(() => setOpen(false), [pathname]);
  return <div className="min-h-dvh bg-gray-50 dark:bg-gray-900">
    <aside className={cn("fixed inset-y-0 start-0 z-50 flex w-[260px] flex-col border-e border-gray-200 bg-white px-4 transition-transform lg:translate-x-0 dark:border-gray-800 dark:bg-gray-900", open ? "translate-x-0" : "-translate-x-full rtl:translate-x-full")}>
      <div className="flex h-[76px] items-center gap-3 px-2"><span className="flex size-10 items-center justify-center rounded-xl bg-brand-500 text-lg font-bold text-white">S</span><span><b className="block text-base font-semibold text-gray-800 dark:text-white/90">skwyd</b><span className="text-xs font-medium text-brand-500">admin</span></span></div>
      <nav className="flex flex-col gap-1 py-4">{NAV.map(([to, t, d]) => <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => cn("menu-item group", isActive || (to === "/companies" && pathname === "/company") ? "menu-item-active" : "menu-item-inactive")}><Ico d={d} />{t}</NavLink>)}</nav>
      <div className="mt-auto flex items-center gap-3 border-t border-gray-200 py-4 dark:border-gray-800"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-500 dark:bg-brand-500/15">{initials(me.email)}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-gray-700 dark:text-gray-300">{me.email}</span></div>
    </aside>
    {open && <div className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden" onClick={() => setOpen(false)} />}
    <div className="lg:ps-[260px]">
      <header className="sticky top-0 z-30 flex h-[76px] items-center gap-3 border-b border-gray-200 bg-white px-4 md:px-6 dark:border-gray-800 dark:bg-gray-900">
        <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Ico d="M4 7h16M4 12h16M4 17h16" /></Button>
        {view && <span className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">Viewing <b>{view.name}</b> in the portal
          <a className="font-semibold underline" href="https://dev.portal.skwydhub.com/" target="_blank" rel="noreferrer">Open</a>
          <button type="button" className="font-semibold underline" onClick={async () => { await rpc("slick_stop_view"); await reload(); }}>Stop Viewing</button></span>}
        <span className="flex-1" />
        <Button variant="outline" size="icon" aria-label="Dark mode" onClick={toggleTheme}><Ico d={theme === "dark" ? "M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8" : "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"} /></Button>
        <Button variant="outline" onClick={signOut}>Sign Out</Button>
      </header>
      <main className="mx-auto w-full max-w-(--breakpoint-2xl) p-4 md:p-6"><Suspense fallback={<Spin />}><Routes>
        <Route index element={<Pages.dash />} /><Route path="/companies" element={<Pages.cos />} /><Route path="/company" element={<Pages.co />} />
        <Route path="/invoices" element={<Pages.inv />} /><Route path="/prices" element={<Pages.prices />} /><Route path="/settings" element={<Pages.settings />} />
        <Route path="*" element={<Pages.dash />} /></Routes></Suspense></main>
    </div></div>;
}
