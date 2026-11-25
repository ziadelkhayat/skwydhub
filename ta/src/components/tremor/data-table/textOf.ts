import { isValidElement, type ReactNode } from "react";
/** the plain text inside a React node: used to sort, search and export cells */
export function textOf(n: ReactNode): string {
  if (n == null || typeof n === "boolean") return "";
  if (typeof n === "string" || typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(textOf).join(" ");
  if (isValidElement(n)) return textOf((n.props as any)?.children);
  return "";
}
/** sort value: numbers as numbers (USD 1,200.50 → 1200.5), dd-mm-yyyy dates as yyyymmdd, the rest as text */
export function sortValue(n: ReactNode): string | number {
  const t = textOf(n).trim();
  const d = t.match(/^(\d{2})-(\d{2})-(\d{4})/); if (d) return +(d[3] + d[2] + d[1]);
  const num = t.replace(/^[A-Z]{3}\s*/, "").replace(/,/g, ""); if (num && !isNaN(+num)) return +num;
  return t.toLowerCase();
}
/** download rows as a CSV file */
export function downloadCsv(name: string, head: string[], rows: string[][]) {
  const esc = (v: string) => /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  const csv = [head, ...rows].map(r => r.map(esc).join(",")).join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = name + ".csv"; a.click();
}
