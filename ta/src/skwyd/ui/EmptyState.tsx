// Tremor Blocks empty state: a dashed box with an icon, a title and a short line (actions under it).
import { RiInboxLine } from "@remixicon/react";

export function EmptyState({ text, title, children }: { text: string; title?: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-44 items-center justify-center rounded-md border border-dashed border-gray-300 p-6 text-center dark:border-gray-800">
      <div className="max-w-sm">
        <RiInboxLine className="mx-auto size-7 text-gray-400 dark:text-gray-600" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-50">{title || "Nothing here yet"}</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">{text}</p>
        {children && <div className="mt-4 flex justify-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
