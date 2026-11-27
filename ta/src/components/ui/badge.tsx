// Tremor Raw Badge, with our colour names mapped to Tremor's variants (blue, gray, green, red, yellow).
import * as React from "react";
import { badgeVariants as tremorBadge } from "@/components/tremor/Badge";
import { cx } from "@/components/tremor/utils";
import { withRender } from "./render";

type Color = "primary" | "success" | "error" | "warning" | "info" | "gray" | "light" | "dark";
type Variant = "light" | "solid" | "ghost";
type Size = "sm" | "default" | "lg";
const TONE = { primary: "default", info: "default", success: "success", error: "error", warning: "warning", gray: "neutral", light: "neutral", dark: "neutral" } as const;

function badgeVariants({ color = "primary", size = "default" }: { variant?: Variant; color?: Color; size?: Size } = {}) {
  return cx(tremorBadge({ variant: TONE[color] }), "w-fit shrink-0 [&>svg]:pointer-events-none [&>svg]:size-3 [&>svg]:shrink-0", size === "lg" && "px-2 py-1 text-sm");
}

export interface BadgeProps extends Omit<React.ComponentProps<"span">, "color"> { variant?: Variant; color?: Color; size?: Size; render?: React.ReactElement }

// portal look (Badges 3): a coloured dot and the text, no box; solid badges (counts) keep the pill
const DOT: Record<Color, string> = { primary: "before:bg-blue-500", info: "before:bg-blue-500", success: "before:bg-emerald-500", error: "before:bg-red-500", warning: "before:bg-amber-500", gray: "before:bg-gray-400", light: "before:bg-gray-400", dark: "before:bg-gray-700" };
const dotLook = (color: Color) => cx("portal:gap-1.5 portal:bg-transparent portal:px-0 portal:py-0 portal:text-[13px] portal:font-medium portal:text-gray-700 portal:ring-0 dark:portal:text-gray-300",
  "portal:before:size-2 portal:before:shrink-0 portal:before:rounded-full portal:before:content-['']", DOT[color]);

function Badge({ className, variant = "light", color = "primary", size = "default", ...props }: BadgeProps) {
  return withRender("span", { "data-slot": "badge", className: cx(badgeVariants({ color, size }), variant !== "solid" && dotLook(color), className), ...props });
}

export { Badge, badgeVariants };
