// Sidebar + top bar + the section tabs (like the current portal).
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { NAV, secOf, canOpen } from "../nav";
import { Icon, Mark, Wordmark } from "./Icons";
import { useAuth } from "../lib/auth";
import { cx, OLD_PORTAL } from "../lib/util";

export function Shell({ route, perms, children }: { route: string; perms: string[] | null; children: ReactNode }) {
  const { staff, signOut } = useAuth();
  const [open, setOpen] = useState(false);       // phone menu
  const [menu, setMenu] = useState(false);       // account menu
  const sec = secOf(route);
  const [exp, setExp] = useState<string>(sec?.t || "");
  useEffect(() => { if (sec && !sec.id) setExp(sec.t); }, [sec]);   // open the group of the page being shown
  const nav = useMemo(() => NAV.filter(s => canOpen(s.id || s.kids![0].id, perms)), [perms]);
  const go = (id: string) => { location.hash = id; setOpen(false); };
  return <div className={cx("app", open && "navopen")}>
    <aside className="side">
      <div className="sbrand"><Mark size={46} /><Wordmark height={46} /></div>
      <nav>{nav.map(s => s.id
        ? <a key={s.t} href={"#" + s.id} className={cx("nl", route === s.id && "on")} onClick={() => setOpen(false)}><Icon n={s.i} />{s.t}</a>
        : <div key={s.t} className={cx("ng", exp === s.t && "open", sec === s && "cur")}>
            <button type="button" className="nl" onClick={() => setExp(exp === s.t ? "" : s.t)}><Icon n={s.i} />{s.t}<span className="chev"><Icon n="chev" size={16} /></span></button>
            {exp === s.t && <div className="sub">{s.kids!.filter(k => !k.head).map(k => <a key={k.id} href={"#" + k.id} className={cx(route === k.id && "on")} onClick={() => setOpen(false)}>{k.t}</a>)}</div>}
          </div>)}</nav>
      <a className="nl old" href={OLD_PORTAL} target="_blank" rel="noopener"><Icon n="ext" />Current Portal</a>
    </aside>
    <div className="scrimnav" onClick={() => setOpen(false)} />
    <main className="main">
      <header className="top">
        <button className="ib menu" onClick={() => setOpen(true)} aria-label="Menu"><Icon n="menu" /></button>
        <span className="beta">New portal · preview</span><span className="sp" />
        <div className="acct"><button className="who" onClick={() => setMenu(!menu)}><span className="av">{(staff?.name || "?").trim().slice(0, 2).toUpperCase()}</span><b>{staff?.name}</b></button>
          {menu && <div className="pop" onMouseLeave={() => setMenu(false)}><div className="pi"><b>{staff?.name}</b><small>{staff?.phone ? "+" + staff.phone : staff?.email}</small></div><button onClick={signOut}><Icon n="out" size={18} /> Sign Out</button></div>}</div>
      </header>
      {sec?.kids && <div className="stabs">{sec.kids.filter(k => !k.head).map(k => <button key={k.id} className={cx(route === k.id && "on")} onClick={() => go(k.id)}>{k.t}</button>)}</div>}
      <div className="view">{children}</div>
    </main>
  </div>;
}
