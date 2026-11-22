import { SkwydMark } from "@/components/shared/skwyd-logo";

/** An empty list: the Skwyd mascot and a short line (instead of other icons) */
export function EmptyState({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center [--sk-ink:#98A2B3] dark:[--sk-ink:#667085]">
      <SkwydMark markClass="h-14 w-14" />
      <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">{text}</p>
      {children}
    </div>
  );
}
