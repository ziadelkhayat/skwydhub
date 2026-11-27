// Manage → Taxes & Groups: the taxes list and the tax groups list on one page (each keeps its own tabs, add button and row menu).
import CrudPage from "../crud/CrudPage";
import { CRUD } from "../crud/configs";

export default function TaxesGroups() {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-4 text-base font-semibold text-gray-900 sm:text-lg dark:text-gray-50">Taxes</h2>
        <CrudPage cfg={CRUD.taxes} />
      </section>
      <section>
        <h2 className="mb-4 text-base font-semibold text-gray-900 sm:text-lg dark:text-gray-50">Tax Groups</h2>
        <CrudPage cfg={CRUD["tax-groups"]} />
      </section>
    </div>
  );
}
