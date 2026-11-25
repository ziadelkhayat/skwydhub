// Tremor Raw Drawer (Radix Dialog sliding from the side). On phones it opens from the bottom.
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { RiCloseLine } from "@remixicon/react";
import { cx, focusRing } from "@/components/tremor/utils";

const Sheet = (props: React.ComponentProps<typeof DialogPrimitive.Root>) => <DialogPrimitive.Root {...props} />;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) =>
  <DialogPrimitive.Overlay className={cx("fixed inset-0 z-[100] bg-black/30 data-[state=open]:animate-dialogOverlayShow", className)} {...props} />;

function SheetContent({ className, children, side = "right", showCloseButton = true, ...props }: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: "top" | "right" | "bottom" | "left"; showCloseButton?: boolean }) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        data-side={side}
        className={cx(
          "fixed z-[101] flex flex-col gap-4 overflow-y-auto border-gray-200 bg-white p-6 text-sm shadow-lg outline-none dark:border-gray-900 dark:bg-[#090E1A]",
          side === "right" && "inset-y-0 right-0 w-full border-l data-[state=open]:animate-drawerSlideLeftAndFade sm:inset-y-2 sm:right-2 sm:w-[95vw] sm:max-w-lg sm:rounded-md sm:border",
          side === "left" && "inset-y-0 left-0 w-full border-r data-[state=open]:animate-drawerSlideRightAndFade sm:inset-y-2 sm:left-2 sm:w-[95vw] sm:max-w-sm sm:rounded-md sm:border",
          side === "top" && "inset-x-0 top-0 max-h-[85vh] border-b",
          side === "bottom" && "inset-x-0 bottom-0 max-h-[85vh] border-t",
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
    </SheetPortal>
  );
}

const SheetHeader = ({ className, ...props }: React.ComponentProps<"div">) => <div className={cx("flex flex-col gap-y-1 border-b border-gray-200 pb-4 pr-8 dark:border-gray-900", className)} {...props} />;
const SheetFooter = ({ className, ...props }: React.ComponentProps<"div">) => <div className={cx("mt-auto flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end dark:border-gray-900", className)} {...props} />;
const SheetTitle = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) => <DialogPrimitive.Title className={cx("text-base font-semibold text-gray-900 dark:text-gray-50", className)} {...props} />;
const SheetDescription = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) => <DialogPrimitive.Description className={cx("text-sm text-gray-500", className)} {...props} />;

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetOverlay, SheetPortal, SheetTitle, SheetTrigger };
