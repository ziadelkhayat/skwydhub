// Tremor Raw Dialog (Radix). On phones it opens from the bottom; on larger screens it is Tremor's centred dialog.
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { RiCloseLine } from "@remixicon/react";
import { cx, focusRing } from "@/components/tremor/utils";

const Dialog = (props: React.ComponentProps<typeof DialogPrimitive.Root>) => <DialogPrimitive.Root {...props} />;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return <DialogPrimitive.Overlay className={cx("fixed inset-0 z-[100] bg-black/60 data-[state=open]:animate-dialogOverlayShow dark:bg-black/70", className)} {...props} />;
}

function DialogContent({ className, children, showCloseButton = true, fullScreen = false, ...props }: React.ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean; fullScreen?: boolean }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        data-slot="dialog-content"
        className={cx(
          "fixed z-[101] grid gap-4 overflow-y-auto overscroll-contain border border-gray-200 bg-white p-6 text-sm text-gray-700 shadow-lg outline-none dark:border-gray-900 dark:bg-[#090E1A] dark:text-gray-300",
          fullScreen
            ? "inset-0 h-dvh w-screen max-w-none rounded-none border-none sm:p-10"
            : "inset-x-0 bottom-0 max-h-[calc(100dvh-0.75rem)] w-full rounded-t-xl pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[calc(100dvh-2rem)] sm:w-[95vw] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-md sm:pb-6 data-[state=open]:animate-dialogContentShow",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close className={cx("absolute right-3 top-3 rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-900 dark:hover:text-gray-50", focusRing)} aria-label="Close">
            <RiCloseLine className="size-5" aria-hidden="true" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

const DialogHeader = ({ className, ...props }: React.ComponentProps<"div">) => <div data-slot="dialog-header" className={cx("flex flex-col gap-y-1 pr-8", className)} {...props} />;

function DialogFooter({ className, showCloseButton = false, children, ...props }: React.ComponentProps<"div"> & { showCloseButton?: boolean }) {
  return (
    <div data-slot="dialog-footer" className={cx("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props}>
      {children}
      {showCloseButton && <DialogPrimitive.Close className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50">Close</DialogPrimitive.Close>}
    </div>
  );
}

const DialogTitle = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) => <DialogPrimitive.Title data-slot="dialog-title" className={cx("text-lg font-semibold text-gray-900 dark:text-gray-50", className)} {...props} />;
const DialogDescription = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) => <DialogPrimitive.Description data-slot="dialog-description" className={cx("text-sm text-gray-500 dark:text-gray-500", className)} {...props} />;

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger };
