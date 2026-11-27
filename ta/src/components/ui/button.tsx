// Tremor Raw Button, with the size and variant names our pages already use.
import * as React from "react";
import { Button as TremorButton, buttonVariants as tremorButton } from "@/components/tremor/Button";
import { cx } from "@/components/tremor/utils";
import { withRender } from "./render";

const VARIANT = { default: "primary", outline: "secondary", secondary: "secondary", light: "light", ghost: "ghost", destructive: "destructive", link: "ghost" } as const;
const SIZE = {
  default: "h-9 gap-2",
  xs: "h-7 gap-1.5 px-2 py-1 text-xs",
  sm: "h-8 gap-1.5 px-2.5 py-1.5",
  lg: "h-10 gap-2 px-4",
  icon: "size-9 p-0",
  "icon-xs": "size-7 p-0",
  "icon-sm": "size-8 p-0",
  "icon-lg": "size-10 p-0",
} as const;
type Variant = keyof typeof VARIANT;
type Size = keyof typeof SIZE;

function buttonVariants({ variant = "default", size = "default", className }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cx(
    tremorButton({ variant: VARIANT[variant] }),
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    SIZE[size],
    variant === "link" && "h-auto! border-0! p-0! font-normal text-blue-600 shadow-none hover:bg-transparent hover:underline dark:text-blue-500",
    className,
  );
}

type ButtonProps = React.ComponentProps<"button"> & { variant?: Variant; size?: Size; render?: React.ReactElement; isLoading?: boolean; loadingText?: string };

// the Tremor Button itself; render={<Link … />} makes the link look like the button
function Button({ className, variant = "default", size = "default", type, render, ...props }: ButtonProps) {
  if (render) return withRender("button", { "data-slot": "button", className: buttonVariants({ variant, size, className }), render, ...props });
  return <TremorButton data-slot="button" type={type ?? "button"} variant={VARIANT[variant]} className={cx("[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", SIZE[size],
    variant === "link" && "h-auto! border-0! p-0! font-normal text-blue-600 shadow-none hover:bg-transparent hover:underline dark:text-blue-500", className)} {...props} />;
}

export { Button, buttonVariants };
