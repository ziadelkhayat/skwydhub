// Who is signed in: the staff row of the business (owner, admin or a user with a role), like the current portal.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { sb } from "./supabase";

export type Staff = { userId: string; name: string; email?: string; phone?: string; role: string | null; roleId?: string | null; companyId?: string | null; viewAs?: any };
type Auth = { staff: Staff | null; loading: boolean; message: string; signOut: () => Promise<void>; reload: () => Promise<void> };
const Ctx = createContext<Auth>({ staff: null, loading: true, message: "", signOut: async () => {}, reload: async () => {} });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const { data: { user } } = await sb.auth.getUser();
    if (!user || user.is_anonymous) { setStaff(null); setLoading(false); return; }
    let { data } = await sb.from("staff").select("*").eq("user_id", user.id).maybeSingle();
    if (!data) { const c = await sb.rpc("skwyd_claim_login"); if (c.data) ({ data } = await sb.from("staff").select("*").eq("user_id", user.id).maybeSingle()); }
    if (!data) {
      const v = await sb.rpc("slick_my_view");
      if ((v.data as any)?.companyId) { setStaff({ userId: user.id, name: user.user_metadata?.name || user.email || "Admin", email: user.email, role: "owner", viewAs: v.data }); setLoading(false); return; }
      await sb.auth.signOut(); setMessage("This login doesn't have portal access. Ask the owner to give you access."); setStaff(null); setLoading(false); return;
    }
    const su = await sb.from("staff_users").select("deleted,name").eq("user_id", user.id).maybeSingle();
    if ((su.data as any)?.deleted) { await sb.auth.signOut(); setMessage("This user was deleted. Ask the owner to restore you."); setStaff(null); setLoading(false); return; }
    const co = await sb.rpc("skwyd_company");
    setStaff({ userId: user.id, name: (su.data as any)?.name || data.name || user.email || "", email: user.email, phone: user.phone, role: data.role || null, roleId: data.role_id, companyId: (co.data as string) || data.company_id });
    setLoading(false);
  }
  useEffect(() => {
    load();
    const { data: sub } = sb.auth.onAuthStateChange(ev => { if (ev === "SIGNED_IN" || ev === "SIGNED_OUT") load(); });
    return () => sub.subscription.unsubscribe();
  }, []);
  const signOut = async () => { await sb.auth.signOut(); setStaff(null); };
  return <Ctx.Provider value={{ staff, loading, message, signOut, reload: load }}>{children}</Ctx.Provider>;
}
