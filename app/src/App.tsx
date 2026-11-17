import { useEffect, useMemo, useState, type ComponentType } from "react";
import { AuthProvider, useAuth } from "./lib/auth";
import { useCol, live } from "./lib/db";
import { Login } from "./ui/Login";
import { Shell } from "./ui/Shell";
import { Toasts } from "./ui/Toast";
import { NotMoved } from "./ui/NotMoved";
import { canOpen, NAV } from "./nav";
import { BrandsPage, PaymentMethodsPage, OrderSourcesPage } from "./pages/manage";
import { Mark } from "./ui/Icons";

// sections rebuilt so far; every other route opens the current portal
const PAGES: Record<string, ComponentType> = {
  brands: BrandsPage,
  "payment-methods": PaymentMethodsPage,
  "order-sources": OrderSourcesPage,
};
const useRoute = () => {
  const get = () => decodeURIComponent(location.hash.slice(1)) || "brands";
  const [r, setR] = useState(get);
  useEffect(() => { const f = () => setR(get()); addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  return r;
};

function Portal() {
  const { staff } = useAuth();
  const route = useRoute();
  const users = useCol("users"), roles = useCol("roles");
  // what this person may open: the owner and admins everything, others what their roles allow
  const perms = useMemo(() => {
    if (!staff || !staff.role || staff.role === "owner" || staff.role === "admin") return null;
    const u = (users || []).find(x => live(x) && x.userId === staff.userId);
    const ids: string[] = u ? [...(Array.isArray(u.roleIds) ? u.roleIds : []), u.roleId].filter(Boolean) : [];
    const rs = (roles || []).filter(r => ids.includes(r.id) && live(r));
    return rs.length ? [...new Set(rs.flatMap(r => r.permissions || []))] as string[] : ["bo_dashboard", "bo_orders", "bo_callcenter", "bo_customers"];
  }, [staff, users, roles]);
  const Page = PAGES[route];
  const first = NAV.map(s => s.id || s.kids![0].id).find(id => canOpen(id, perms));
  return <Shell route={route} perms={perms}>
    {!canOpen(route, perms) ? <div className="card notyet"><h1>No access</h1><p>Your role doesn't include this section.</p>{first && <a className="btn" href={"#" + first}>Go back</a>}</div>
      : Page ? <Page /> : <NotMoved route={route} />}
  </Shell>;
}

function Gate() {
  const { staff, loading, message } = useAuth();
  if (loading) return <div className="boot"><Mark size={56} /></div>;
  return staff ? <Portal /> : <Login message={message} />;
}
export default function App() { return <AuthProvider><Gate /><Toasts /></AuthProvider>; }
