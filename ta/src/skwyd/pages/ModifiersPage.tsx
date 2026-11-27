// Catalog → Modifiers: Modifier Groups and Modifier Options on one page, as two tabs (?view=options for the options).
import { Navigate, useLocation, useSearchParams } from "react-router";
import CrudPage from "../crud/CrudPage";
import { CRUD } from "../crud/configs";

export default function ModifiersPage() {
  const [sp, setSp] = useSearchParams(), v = sp.get("view") === "options" ? "options" : "groups";
  return (
    <>
      <div role="tablist" className="mb-6 flex gap-6 border-b border-gray-200 dark:border-gray-800">
        {([["groups", "Modifier Groups"], ["options", "Modifier Options"]] as const).map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={v === k} onClick={() => setSp(k === "options" ? { view: "options" } : {})}
          className={"-mb-px border-b-2 pb-2.5 text-sm font-medium outline-none transition " + (v === k ? "border-blue-500 text-gray-900 dark:text-gray-50" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300")}>{l}</button>)}
      </div>
      {v === "options" ? <CrudPage key="options" cfg={CRUD["modifier-options"]} /> : <CrudPage key="groups" cfg={CRUD.modifiers} />}
    </>
  );
}

/** the old Modifier Options address opens the Options tab (keeps ?mod=) */
export function ToOptions() {
  const { search } = useLocation();
  return <Navigate to={"/modifiers?view=options" + (search ? "&" + search.slice(1) : "")} replace />;
}
