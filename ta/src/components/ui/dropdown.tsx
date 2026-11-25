// Tremor Raw Dropdown Menu (Radix). Triggers still accept render={<Button … />}.
import * as React from "react";
import * as T from "@/components/tremor/Dropdown";
import { cx } from "@/components/tremor/utils";

const DropdownMenu = T.DropdownMenu;
const DropdownMenuGroup = T.DropdownMenuGroup;
const DropdownMenuLabel = T.DropdownMenuLabel;
const DropdownMenuSeparator = T.DropdownMenuSeparator;
const DropdownMenuRadioGroup = T.DropdownMenuRadioGroup;
const DropdownMenuRadioItem = T.DropdownMenuRadioItem;
const DropdownMenuCheckboxItem = T.DropdownMenuCheckboxItem;
const DropdownMenuSub = T.DropdownMenuSubMenu;
const DropdownMenuSubTrigger = T.DropdownMenuSubMenuTrigger;
const DropdownMenuSubContent = T.DropdownMenuSubMenuContent;

function DropdownMenuTrigger({ render, children, className, ...props }: React.ComponentProps<typeof T.DropdownMenuTrigger> & { render?: React.ReactElement }) {
  if (render && React.isValidElement(render)) return <T.DropdownMenuTrigger asChild {...props}>{React.cloneElement(render as React.ReactElement<any>, { className: cx((render.props as any).className, className) }, children)}</T.DropdownMenuTrigger>;
  return <T.DropdownMenuTrigger className={cx("outline-none", className)} {...props}>{children}</T.DropdownMenuTrigger>;
}

function DropdownMenuContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof T.DropdownMenuContent>) {
  return <T.DropdownMenuContent sideOffset={sideOffset} className={cx("z-[110]", className)} {...props} />;
}

function DropdownMenuItem({ className, variant, ...props }: React.ComponentProps<typeof T.DropdownMenuItem> & { variant?: "default" | "destructive" }) {
  return <T.DropdownMenuItem className={cx("gap-2 [&_svg]:size-4 [&_svg]:shrink-0", variant === "destructive" && "text-red-600 dark:text-red-500", className)} {...props} />;
}

const DropdownMenuShortcut = ({ className, ...props }: React.ComponentProps<"span">) => <span className={cx("ml-auto pl-2 text-sm text-gray-400 dark:text-gray-600", className)} {...props} />;

export { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger };
