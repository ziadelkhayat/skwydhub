import { pageOf } from "@/components/layout/app-layout/sidebar/data";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Fragment } from "react";
import { useLocation } from "react-router";

interface BreadcrumbProps {
  pageTitle: string;
  /** the record or view open on a detail page (an item's name, a store's name…) */
  current?: string;
}

// a record's own page and the list it belongs to
const PARENT: Record<string, string> = { "/call-center-order": "/call-center", "/item": "/products", "/order": "/orders", "/customer": "/customers", "/employee": "/users", "/store": "/branches", "/brand": "/brands", "/option": "/modifier-options", "/supplier": "/suppliers", "/inv-item": "/inv-items", "/warehouse": "/warehouses",
  "/inv-levels": "/inventory-reports", "/inv-history": "/inventory-reports", "/purchasing": "/inventory-reports" };
// query parameters that open one record or view inside a list page (?id= a document, ?r= a report, ?ch= a sales channel…)
const VIEW = /[?&](id|r|ch|settings|view)=/;

/** The page title and the path to it: Home › section › list (a link back) › the open record */
export function PageBreadcrumb({ pageTitle, current }: BreadcrumbProps) {
  const { pathname, search } = useLocation();
  const parent = PARENT[pathname] || (VIEW.test(search) ? pathname : "");
  const sec = pageOf(parent || pathname);
  const crumbs: { label: string; to?: string }[] = [{ label: "Home", to: "/" }];
  if (sec.section) crumbs.push({ label: sec.section });
  if (parent && sec.title) {
    crumbs.push({ label: sec.title, to: parent });
    const last = current || (pageTitle !== sec.title ? pageTitle : "");
    if (last) crumbs.push({ label: last });
  } else crumbs.push({ label: current || pageTitle });
  if (crumbs.length > 1 && !crumbs[crumbs.length - 1].to) delete crumbs[crumbs.length - 1].to;
  return (
    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
      <h2 className="text-title-lg font-semibold break-words text-gray-800 dark:text-white/90">
        {pageTitle}
      </h2>

      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-wrap">
          {crumbs.map((c, i) => (
            <Fragment key={i}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {i === crumbs.length - 1 ? <BreadcrumbPage>{c.label}</BreadcrumbPage> : c.to ? <BreadcrumbLink to={c.to}>{c.label}</BreadcrumbLink> : <span className="text-gray-500 dark:text-gray-400">{c.label}</span>}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
