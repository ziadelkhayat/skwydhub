// Catalog → Modifiers: Modifier Groups and Modifier Options on one page, as two tabs (?view=options for the options).
import { Navigate, useLocation, useSearchParams } from "react-router";
import CrudPage from "../crud/CrudPage";
import { CRUD } from "../crud/configs";
import { LineTabs } from "../ui/Section";

export default function ModifiersPage() {
  const [sp, setSp] = useSearchParams(), v = sp.get("view") === "options" ? "options" : "groups";
  return (
    <>
      <LineTabs className="mx-0 mb-6 max-w-none" value={v} onChange={x => setSp(x === "options" ? { view: "options" } : {})} items={[["groups", "Modifier Groups"], ["options", "Modifier Options"]]} />
      {v === "options" ? <CrudPage key="options" cfg={CRUD["modifier-options"]} /> : <CrudPage key="groups" cfg={CRUD.modifiers} />}
    </>
  );
}

/** the old Modifier Options address opens the Options tab (keeps ?mod=) */
export function ToOptions() {
  const { search } = useLocation();
  return <Navigate to={"/modifiers?view=options" + (search ? "&" + search.slice(1) : "")} replace />;
}
