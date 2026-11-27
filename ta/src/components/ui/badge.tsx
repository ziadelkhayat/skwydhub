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

function Badge({ className, variant: _v, color = "primary", size = "default", ...props }: BadgeProps) {
  return withRender("span", { "data-slot": "badge", className: cx(badgeVariants({ color, size }), className), ...props });
}

export { Badge, badgeVariants };
