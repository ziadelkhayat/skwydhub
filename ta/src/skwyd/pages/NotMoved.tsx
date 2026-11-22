import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { useLocation } from "react-router";
import { pageOf } from "@/components/layout/app-layout/sidebar/data";

/** A screen that isn't built yet (Kitchen Flows, as in the current portal) or an address that doesn't exist */
export default function NotMoved() {
  const { pathname } = useLocation(); const p = pageOf(pathname);
  return (<>
    <PageBreadcrumb pageTitle={p.title || "Not found"} />
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-800 dark:bg-white/3">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{p.title ? "Coming next" : "Page not found"}</h3>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{p.title ? "This screen is part of the plan and will be built in a later step." : "This address doesn't open a page. Pick one from the menu."}</p>
    </div>
  </>);
}
