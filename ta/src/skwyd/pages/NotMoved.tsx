import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { Button } from "@/components/ui/button";
import { OLD_PORTAL } from "@/lib/util";
import { useLocation } from "react-router";
import { pageOf } from "@/components/layout/app-layout/sidebar/data";
import { EmptyState } from "../ui/EmptyState";

/** A section that hasn't moved to the new back office yet: it opens in the current portal, where it works as before */
export default function NotMoved() {
  const { pathname } = useLocation(); const p = pageOf(pathname); const route = pathname.replace(/^\//, "") || "dashboard";
  return (<>
    <PageBreadcrumb pageTitle={p.title || "Page"} />
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <EmptyState text={`${p.title || "This page"} is moving to the new design. Until then it works in the current portal, exactly as before.`}>
        <Button render={<a href={OLD_PORTAL + "#" + route} target="_blank" rel="noreferrer" />}>Open In The Current Portal</Button>
      </EmptyState>
    </div>
  </>);
}
