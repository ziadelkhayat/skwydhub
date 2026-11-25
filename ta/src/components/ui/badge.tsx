// Tremor Raw Badge look (soft colour + ring, rounded corners), with our colour names.
import * as React from "react";
import { cx } from "@/components/tremor/utils";
import { withRender } from "./render";

type Color = "primary" | "success" | "error" | "warning" | "info" | "gray" | "light" | "dark";
type Variant = "light" | "solid" | "ghost";
type Size = "sm" | "default" | "lg";

const SOFT: Record<Color, string> = {
  primary: "bg-blue-50 text-blue-800 ring-blue-500/30 dark:bg-blue-400/10 dark:text-blue-400 dark:ring-blue-400/30",
  info: "bg-sky-50 text-sky-800 ring-sky-500/30 dark:bg-sky-400/10 dark:text-sky-400 dark:ring-sky-400/30",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-600/30 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20",
  error: "bg-red-50 text-red-800 ring-red-600/20 dark:bg-red-400/10 dark:text-red-400 dark:ring-red-400/20",
  warning: "bg-yellow-50 text-yellow-800 ring-yellow-600/30 dark:bg-yellow-400/10 dark:text-yellow-500 dark:ring-yellow-400/20",
  gray: "bg-gray-50 text-gray-700 ring-gray-500/30 dark:bg-gray-400/10 dark:text-gray-300 dark:ring-gray-400/20",
  light: "bg-gray-50 text-gray-700 ring-gray-500/30 dark:bg-gray-400/10 dark:text-gray-300 dark:ring-gray-400/20",
  dark: "bg-gray-900 text-white ring-gray-900 dark:bg-gray-50 dark:text-gray-900 dark:ring-gray-50",
};
const SOLID: Record<Color, string> = {
  primary: "bg-blue-600 text-white ring-blue-600", info: "bg-sky-600 text-white ring-sky-600", success: "bg-emerald-600 text-white ring-emerald-600",
  error: "bg-red-600 text-white ring-red-600", warning: "bg-yellow-500 text-white ring-yellow-500", gray: "bg-gray-500 text-white ring-gray-500",
  light: "bg-gray-200 text-gray-800 ring-gray-200", dark: "bg-gray-900 text-white ring-gray-900",
};
const GHOST: Record<Color, string> = {
  primary: "text-blue-600 dark:text-blue-400", info: "text-sky-600", success: "text-emerald-700 dark:text-emerald-400", error: "text-red-700 dark:text-red-400",
  warning: "text-yellow-700 dark:text-yellow-500", gray: "text-gray-600 dark:text-gray-400", light: "text-gray-600 dark:text-gray-400", dark: "text-gray-900 dark:text-gray-50",
};
const SIZE: Record<Size, string> = { sm: "px-1.5 py-0.5 text-xs [&>svg]:size-3", default: "px-1.5 py-0.5 text-xs [&>svg]:size-3.5", lg: "px-2 py-1 text-sm [&>svg]:size-3.5" };

function badgeVariants({ variant = "light", color = "primary", size = "default" }: { variant?: Variant; color?: Color; size?: Size } = {}) {
  return cx(
    "inline-flex w-fit shrink-0 items-center gap-x-1 whitespace-nowrap rounded font-semibold [&>svg]:pointer-events-none [&>svg]:shrink-0",
    variant === "ghost" ? cx("bg-transparent p-0", GHOST[color]) : cx("ring-1 ring-inset", variant === "solid" ? SOLID[color] : SOFT[color], SIZE[size]),
  );
}

export interface BadgeProps extends Omit<React.ComponentProps<"span">, "color"> { variant?: Variant; color?: Color; size?: Size; render?: React.ReactElement }

function Badge({ className, variant = "light", color = "primary", size = "default", ...props }: BadgeProps) {
  return withRender("span", { "data-slot": "badge", className: cx(badgeVariants({ variant, color, size }), className), ...props });
}

export { Badge, badgeVariants };
