// A list page with tabs, search, and an Add / Edit dialog: the same pattern the current portal uses for most Manage sections.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useCol, put, live, newId, type Row } from "../lib/db";
import { toast, toastOk } from "./Toast";
import { Icon } from "./Icons";
import { cx } from "../lib/util";

export type Field = { k: string; l: string; t?: "text" | "select" | "chk" | "number"; req?: boolean; ph?: string; opts?: () => [string, string][]; def?: any; note?: string };
export type CrudCfg = {
  col: string; title: string; one: string; note?: string;
  tabs: [string, string, (r: Row) => boolean][];
  sort?: (a: Row, b: Row) => number; search?: (r: Row) => string;
  cols: [string, (r: Row) => ReactNode, ("num" | undefined)?][];
  fields: Field[]; unique?: string;
  canDelete?: (r: Row) => string;   // a reason it can't be deleted, or ""
};

export function Crud({ cfg }: { cfg: CrudCfg }) {
  const rows = useCol(cfg.col);
  const [tab, setTab] = useState(cfg.tabs[0][0]);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Row | "new" | null>(null);
  const list = useMemo(() => {
    const f = cfg.tabs.find(t => t[0] === tab)?.[2] || live, s = q.trim().toLowerCase();
    return (rows || []).filter(f).filter(r => !s || (cfg.search ? cfg.search(r) : String(r.name || "")).toLowerCase().includes(s)).sort(cfg.sort || ((a, b) => String(a.name).localeCompare(String(b.name))));
  }, [rows, tab, q, cfg]);
  return <>
    <div className="phead"><h1>{cfg.title}</h1><span className="sp" /><button className="btn pri" onClick={() => setEdit("new")}><Icon n="plus" size={18} /> Add {cfg.one}</button></div>
    {cfg.note && <p className="subt">{cfg.note}</p>}
    <div className="toolbar">
      <div className="tabs">{cfg.tabs.map(([k, t, f]) => <button key={k} className={cx("tab", tab === k && "on")} onClick={() => setTab(k)}>{t} <span>{(rows || []).filter(f).length}</span></button>)}</div>
      <span className="sp" /><label className="search"><Icon n="search" size={17} /><input placeholder="Search" value={q} onChange={e => setQ(e.target.value)} /></label>
    </div>
    <div className="card tbl"><table>
      <thead><tr>{cfg.cols.map(([l, , n]) => <th key={l} className={n}>{l}</th>)}</tr></thead>
      <tbody>{rows === null ? <tr><td colSpan={cfg.cols.length} className="empty">Loading…</td></tr>
        : list.length ? list.map(r => <tr key={r.id} className="click" onClick={() => setEdit(r)}>{cfg.cols.map(([l, f, n]) => <td key={l} className={n}>{f(r)}</td>)}</tr>)
        : <tr><td colSpan={cfg.cols.length} className="empty">No data to display!</td></tr>}</tbody>
    </table></div>
    {edit && <CrudDialog cfg={cfg} row={edit === "new" ? null : edit} all={rows || []} close={() => setEdit(null)} />}
  </>;
}

function CrudDialog({ cfg, row, all, close }: { cfg: CrudCfg; row: Row | null; all: Row[]; close: () => void }) {
  const [v, setV] = useState<Record<string, any>>(() => Object.fromEntries(cfg.fields.map(f => [f.k, row ? row[f.k] ?? (f.t === "chk" ? !!f.def : "") : f.def ?? (f.t === "chk" ? false : "")])));
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const box = useRef<HTMLFormElement>(null);
  useEffect(() => { const esc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); }; document.addEventListener("keydown", esc); (box.current?.querySelector("input,select") as HTMLElement)?.focus(); return () => document.removeEventListener("keydown", esc); }, []);
  const set = (k: string, x: any) => setV(o => ({ ...o, [k]: x }));
  async function save(e?: React.FormEvent) {
    e?.preventDefault(); setErr("");
    const data: Record<string, any> = {};
    for (const f of cfg.fields) {
      let x = v[f.k]; if (f.t === "number") x = x === "" || x == null ? null : +x; else if (f.t !== "chk" && typeof x === "string") x = x.trim();
      if (f.req && (x === "" || x == null)) return setErr(f.l + " is required.");
      data[f.k] = x;
    }
    if (cfg.unique && all.some(r => r.id !== row?.id && live(r) && String(r[cfg.unique!] || "").toLowerCase() === String(data[cfg.unique!] || "").toLowerCase())) return setErr(`That ${cfg.unique} is already used by another ${cfg.one.toLowerCase()}.`);
    setBusy(true);
    try { await put(cfg.col, row?.id || newId(cfg.col.slice(0, 3)), row ? data : { ...data, deleted: false }); toastOk(cfg.one + " saved"); close(); }
    catch (er: any) { console.error(er); setErr("Couldn't save. You may not have edit access."); setBusy(false); }
  }
  async function del() {
    if (!row) return; const why = cfg.canDelete?.(row); if (why) return toast(why);
    if (!confirm(`Delete ${row.name || "this " + cfg.one.toLowerCase()}?`)) return;
    try { await put(cfg.col, row.id, { deleted: true }); toastOk(cfg.one + " deleted"); close(); } catch { toast("Couldn't delete."); }
  }
  async function restore() { if (!row) return; try { await put(cfg.col, row.id, { deleted: false }); toastOk(cfg.one + " restored"); close(); } catch { toast("Couldn't restore."); } }
  return <div className="scrim" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
    <form className="modal" ref={box} onSubmit={save}>
      <header><h2>{row ? "Edit " + cfg.one : "New " + cfg.one}</h2><button type="button" className="x" onClick={close} aria-label="Close"><Icon n="x" /></button></header>
      <div className="body">{cfg.fields.map(f => f.t === "chk"
        ? <label key={f.k} className="chk full"><input type="checkbox" checked={!!v[f.k]} onChange={e => set(f.k, e.target.checked)} /> {f.l}</label>
        : <div key={f.k} className="f"><label htmlFor={"f_" + f.k}>{f.l}{f.req && <i> *</i>}</label>
          {f.t === "select"
            ? <select id={"f_" + f.k} value={v[f.k] ?? ""} onChange={e => set(f.k, e.target.value)}>{!f.req && <option value="">Choose…</option>}{f.opts!().map(([a, b]) => <option key={a} value={a}>{b}</option>)}</select>
            : <input id={"f_" + f.k} type={f.t === "number" ? "number" : "text"} step="any" value={v[f.k] ?? ""} placeholder={f.ph} onChange={e => set(f.k, e.target.value)} />}
          {f.note && <div className="note">{f.note}</div>}</div>)}
        <div className="err full">{err}</div></div>
      <footer>{row && (row.deleted ? <button type="button" className="btn" onClick={restore}>Restore</button> : <button type="button" className="btn danger" onClick={del}>Delete</button>)}<span className="sp" />
        <button type="button" className="btn" onClick={close}>Cancel</button><button className="btn pri" disabled={busy}>Save</button></footer>
    </form>
  </div>;
}
