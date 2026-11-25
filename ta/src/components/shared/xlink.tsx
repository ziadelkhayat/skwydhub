// A link inside a page: opens in this window when it stays on the same page (a list and its records),
// otherwise in a new window so the page you are on stays open.
import * as React from "react";
import { samePage } from "@/lib/util";

export function XLink({ to, onClick, children, ...p }: Omit<React.ComponentProps<"a">, "href"> & { to: string }) {
  return <a href={"#" + to} {...p} onClick={e => { onClick?.(e); if (e.defaultPrevented) return;
    if (!samePage(to)) { e.preventDefault(); window.open(location.pathname + location.search + "#" + to, "_blank", "noopener"); } }}>{children}</a>;
}
