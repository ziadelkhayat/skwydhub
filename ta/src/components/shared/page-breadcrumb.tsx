// The page title (Tremor template page heading). The name and props are kept from the old breadcrumb so pages don't change.
interface BreadcrumbProps {
  pageTitle: string;
  /** the record or view open on a detail page (an item's name, a store's name…) */
  current?: string;
}

export function PageBreadcrumb({ pageTitle, current }: BreadcrumbProps) {
  if (current) return null;   // record pages show their own header (back button + the record's name)
  return <h1 className="mb-6 text-lg font-semibold break-words text-gray-900 sm:text-xl dark:text-gray-50">{pageTitle}</h1>;
}

export default PageBreadcrumb;
