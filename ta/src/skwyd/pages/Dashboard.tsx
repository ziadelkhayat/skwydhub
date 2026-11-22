// Summary: the same live numbers as the current portal (rpc skwyd_dashboard), in TailAdmin metric cards + statistics chart.
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { useTheme } from "@/contexts";
import { BanknoteUndoIcon, BoxIcon, CartIcon, ClockIcon, DollarIcon, OctagonAlertIcon, TagIcon, TicketIcon, UserDollarIcon, XIcon } from "@/icons";
import MetricCard from "@/pages/main/dashboard/ecommerce/components/metrics/metric-card";
import { useCol } from "@/lib/db";
import { sb } from "@/lib/supabase";
import { money } from "@/lib/util";
import type { ApexOptions } from "apexcharts";
import { useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { SegTabs } from "../ui/SegTabs";

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default function Dashboard() {
  const { theme } = useTheme(); useCol("settings");
  const [days, setDays] = useState("1");
  const [D, setD] = useState<any>(null), [err, setErr] = useState("");
  useEffect(() => { let off = false; setD(null); setErr("");
    const n = +days, end = new Date(); const start = new Date(end); start.setDate(start.getDate() - (n - 1));
    sb.rpc("skwyd_dashboard", { p_day: iso(start), p_days: n, p_branches: null, p_brand: null, p_tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Beirut" })
      .then(({ data, error }) => { if (off) return; if (error) setErr(error.message); else setD(data || {}); });
    return () => { off = true; }; }, [days]);

  const hrs = (k: string) => { const a = Array(24).fill(0); (D?.hours || []).forEach((h: any) => { a[+h.h] = +h[k] || 0; }); return a; };
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const n = D ? +D.orders || sum(hrs("n")) : 0, net = D ? +D.net || sum(hrs("net")) : 0, pay = D ? +D.payments || sum(hrs("pay")) : 0;
  const cards: [string, string, React.ReactNode][] = D ? [
    ["Orders", n.toLocaleString(), <CartIcon />], ["Net sales", money(net), <DollarIcon />], ["Net payments", money(pay), <UserDollarIcon />],
    ["Average ticket", money(n ? net / n : 0), <TicketIcon />], ["Active orders", String(D.active?.n ?? D.open ?? 0), <ClockIcon />], ["Declined", String(D.declined?.n ?? 0), <XIcon />],
    ["Discounts", money(+D.discount || 0), <TagIcon />], ["Tax", money(+D.tax || 0), <BoxIcon />], ["Returns", money(D.returns?.v || D.refunds?.v || 0), <BanknoteUndoIcon />], ["Voids", money(D.voids?.v || 0), <OctagonAlertIcon />],
  ] : [];

  const labels = Array.from({ length: 24 }, (_, h) => (h % 12 || 12) + (h < 12 ? "am" : "pm"));
  const options: ApexOptions = {
    legend: { show: false }, colors: ["#465FFF", "#9CB9FF"],
    chart: { fontFamily: "Outfit, sans-serif", height: 310, type: "area", toolbar: { show: false } },
    stroke: { curve: "straight", width: [2, 2] }, fill: { type: "gradient", gradient: { opacityFrom: 0.55, opacityTo: 0 } },
    markers: { size: 0, strokeColors: "#fff", strokeWidth: 2, hover: { size: 6 } },
    grid: { borderColor: theme === "dark" ? "#1E2640" : "#F3F4F6", xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
    dataLabels: { enabled: false }, tooltip: { enabled: true, shared: true, intersect: false },
    xaxis: { type: "category", categories: labels, axisBorder: { show: false }, axisTicks: { show: false }, tickAmount: 8, labels: { style: { colors: "#6B7280" } } },
    yaxis: { labels: { style: { fontSize: "12px", colors: ["#6B7280"] }, formatter: v => (+v).toLocaleString() } },
  };

  return (
    <>
      <PageBreadcrumb pageTitle="Summary" />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SegTabs value={days} onChange={setDays} items={[["1", "Day"], ["7", "Week"], ["30", "Month"]]} />
      </div>
      {err ? <p className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-red-500 dark:border-gray-800 dark:bg-white/3">Couldn't load the dashboard: {err}</p>
        : !D ? <p className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/3">Loading live numbers…</p>
        : <div className="grid grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-5">
            {cards.map(([t, v, i]) => <MetricCard key={t} icon={i} title={t} value={v} />)}
          </div>
          <div className="col-span-12 rounded-2xl border border-gray-200 bg-white px-5 pt-5 pb-5 sm:px-6 sm:pt-6 dark:border-gray-800 dark:bg-white/3">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Sales By Hour</h3>
              <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">Net sales and payments through the day</p>
            </div>
            <div className="custom-scrollbar max-w-full overflow-x-auto">
              <div className="min-w-250 xl:min-w-full">
                <ReactApexChart options={options} series={[{ name: "Net sales", data: hrs("net").map(v => +v.toFixed(2)) }, { name: "Net payments", data: hrs("pay").map(v => +v.toFixed(2)) }]} type="area" height={310} />
              </div>
            </div>
          </div>
        </div>}
    </>
  );
}
