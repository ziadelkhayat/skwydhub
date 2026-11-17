// Red toast for errors, green for success (same as the current portal).
import { useEffect, useState } from "react";

type T = { id: number; text: string; ok: boolean };
let push: (t: T) => void = () => {};
let n = 0;
export const toast = (text: string) => push({ id: ++n, text, ok: false });
export const toastOk = (text: string) => push({ id: ++n, text, ok: true });

export function Toasts() {
  const [list, setList] = useState<T[]>([]);
  useEffect(() => { push = t => { setList(l => [...l, t]); setTimeout(() => setList(l => l.filter(x => x.id !== t.id)), 3200); }; }, []);
  return <div className="toasts" aria-live="polite">{list.map(t => <div key={t.id} className={"toast " + (t.ok ? "ok" : "bad")}>{t.text}</div>)}</div>;
}
