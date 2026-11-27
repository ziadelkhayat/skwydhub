// Tremor Raw Dialog, with the close button (X) and the full-screen option our pages use.
import * as React from "react";
import { RiCloseLine } from "@remixicon/react";
import { Button } from "@/components/tremor/Button";
import * as T from "@/components/tremor/Dialog";
import { cx } from "@/components/tremor/utils";

const { Dialog, DialogTrigger, DialogClose, DialogTitle, DialogDescription } = T;

function DialogContent({ className, children, showCloseButton = true, fullScreen = false, ...props }: React.ComponentProps<typeof T.DialogContent> & { showCloseButton?: boolean; fullScreen?: boolean }) {
  return (
    <T.DialogContent aria-describedby={undefined} data-slot="dialog-content"
      className={cx("grid max-h-[calc(100dvh-2rem)] gap-4 overscroll-contain text-sm text-gray-700 dark:text-gray-300", fullScreen && "inset-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-none sm:p-10", className)} {...props}>
      {children}
      {showCloseButton && <DialogClose asChild><Button variant="ghost" aria-label="Close" className="absolute right-3 top-3 aspect-square p-1.5"><RiCloseLine className="size-5" aria-hidden="true" /></Button></DialogClose>}
    </T.DialogContent>
  );
}

const DialogHeader = ({ className, ...props }: React.ComponentProps<typeof T.DialogHeader>) => <T.DialogHeader data-slot="dialog-header" className={cx("pr-8", className)} {...props} />;

function DialogFooter({ className, showCloseButton = false, children, ...props }: React.ComponentProps<typeof T.DialogFooter> & { showCloseButton?: boolean }) {
  return (
    <T.DialogFooter data-slot="dialog-footer" className={cx("gap-2 sm:space-x-0", className)} {...props}>
      {children}
      {showCloseButton && <DialogClose asChild><Button variant="secondary">Close</Button></DialogClose>}
    </T.DialogFooter>
  );
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger };
