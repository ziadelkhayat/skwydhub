// Tremor dashboard template navigation: fixed sidebar on large screens, a top bar with a drawer on phones and tablets.
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { RiCloseLine, RiMenuLine } from "@remixicon/react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cx, focusRing } from "@/components/tremor/utils";
import { useAccess } from "@/lib/access";
import { LABELS, SECTIONS, type NavItem } from "./nav-data";
import { UserMenu } from "./user-menu";

const isOn = (pathname: string, path?: string) => !!path && (path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(path + "/"));
const groupOn = (pathname: string, it: NavItem) => it.subItems?.some(s => isOn(pathname, s.path)) ?? false;

function useSections() {
  const { canOpen } = useAccess();
  return SECTIONS.map(sec => ({
    ...sec,
    items: sec.items.map(it => it.subItems ? { ...it, subItems: it.subItems.filter(x => canOpen(x.path)) } : it).filter(it => it.subItems ? it.subItems.length > 0 : canOpen(it.path || "/")),
  })).filter(sec => sec.items.length > 0);
}

const itemCls = (on: boolean) => cx(
  on ? "text-blue-600 dark:text-blue-500" : "text-gray-700 hover:text-gray-900 dark:text-gray-400 hover:dark:text-gray-50",
  "flex w-full items-center gap-x-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition hover:bg-gray-100 hover:dark:bg-gray-900",
  focusRing,
);

function NavList({ onGo }: { onGo?: () => void }) {
  const { pathname } = useLocation();
  const sections = useSections();
  return (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-y-6">
      {sections.map(sec => (
        <div key={sec.label}>
          <ul role="list" className="space-y-0.5">
            {sec.items.map(it => {
              const Icon = it.icon;
              // a group is one link (to its first page); its pages show as tabs on top of the page
              const to = it.subItems ? it.subItems[0].path : it.path!, on = it.subItems ? groupOn(pathname, it) : isOn(pathname, it.path);
              return <li key={it.key}><Link to={to} onClick={onGo} className={itemCls(on)}><Icon className="size-4 shrink-0" aria-hidden="true" />{LABELS[it.key]}</Link></li>;
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AppSidebar() {
  const [mobile, setMobile] = useState(false);
  return (
    <>
      {/* sidebar (lg+) */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <aside className="flex grow flex-col gap-y-6 overflow-y-auto border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <NavList />
          <div className="mt-auto"><UserMenu /></div>
        </aside>
      </div>
      {/* top bar (below lg) */}
      <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-x-2 border-b border-gray-200 bg-white px-2 shadow-sm sm:px-4 lg:hidden dark:border-gray-800 dark:bg-gray-950">
        <span className="px-2 font-semibold text-gray-900 dark:text-gray-50">Skwyd Hub</span>
        <div className="flex items-center gap-1 sm:gap-2">
          <UserMenu compact />
          <DialogPrimitive.Root open={mobile} onOpenChange={setMobile}>
            <DialogPrimitive.Trigger aria-label="Open menu" className={cx("rounded-md p-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 hover:dark:bg-gray-400/10", focusRing)}>
              <RiMenuLine className="size-6 sm:size-5" aria-hidden="true" />
            </DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/30 data-[state=open]:animate-dialogOverlayShow" />
              <DialogPrimitive.Content aria-describedby={undefined} onOpenAutoFocus={e => e.preventDefault()} className="fixed inset-y-2 right-2 z-[101] flex w-[min(20rem,calc(100vw-1rem))] flex-col overflow-y-auto rounded-md border border-gray-200 bg-white p-4 shadow-lg data-[state=open]:animate-drawerSlideLeftAndFade dark:border-gray-900 dark:bg-gray-950">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <DialogPrimitive.Title className="text-base font-semibold text-gray-900 dark:text-gray-50">Skwyd Hub</DialogPrimitive.Title>
                  <DialogPrimitive.Close aria-label="Close menu" className={cx("rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900", focusRing)}><RiCloseLine className="size-5" /></DialogPrimitive.Close>
                </div>
                <NavList onGo={() => setMobile(false)} />
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        </div>
      </div>
    </>
  );
}
