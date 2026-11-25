import { pageOf } from "@/components/layout/app-layout/nav-data";
import { RiArrowRightSLine } from "@remixicon/react";
import { Link } from "react-router";
import { Fragment } from "react";
import { useLocation } from "react-router";

interface BreadcrumbProps {
  pageTitle: string;
  /** the record or view open on a detail page (an item's name, a store's name…) */
  current?: string;
}

// a record's own page and the list it belongs to
const PARENT: Record<string, string> = { "/call-center-order": "/call-center", "/item": "/products", "/order": "/orders", "/customer": "/customers", "/employee": "/users", "/store": "/branches", "/brand": "/brands", "/modifier": "/modifiers", "/option": "/modifier-options", "/supplier": "/suppliers", "/inv-item": "/inv-items", "/warehouse": "/warehouses",
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
  // Tremor page header: small breadcrumb above the title
  return (
    <div className="mb-6">
      <nav aria-label="Breadcrumb" className="mb-1 min-w-0">
        <ol className="flex flex-wrap items-center gap-x-1 text-sm text-gray-500 dark:text-gray-400">
          {crumbs.map((c, i) => (
            <Fragment key={i}>
              {i > 0 && <RiArrowRightSLine className="size-4 shrink-0 text-gray-400 dark:text-gray-600" aria-hidden="true" />}
              <li className="min-w-0 truncate">
                {i === crumbs.length - 1 ? <span aria-current="page" className="text-gray-900 dark:text-gray-50">{c.label}</span> : c.to ? <Link to={c.to} className="hover:text-gray-700 dark:hover:text-gray-300">{c.label}</Link> : c.label}
              </li>
            </Fragment>
          ))}
        </ol>
      </nav>
      <h1 className="text-lg font-semibold break-words text-gray-900 sm:text-xl dark:text-gray-50">{pageTitle}</h1>
    </div>
  );
}
