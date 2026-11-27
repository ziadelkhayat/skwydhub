import { AppSidebar } from "./sidebar";
import { ScrollToTop } from "@/components/shared/scroll-to-top";
import { cn } from "@/utils";
import React, { Suspense } from "react";
import { Outlet, useLocation } from "react-router";
import { GroupTabs } from "./group-tabs";
import { Blocked, SubBar, useAccess } from "@/lib/access";
import { UserMenu } from "./user-menu";

export default function AppLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  const { pathname } = useLocation();
  const acc = useAccess();

  const isAiRoute =
    pathname.startsWith("/ai-chat") || pathname.startsWith("/ai-settings");

  // Route-specific styles for the main content container
  const getRouteSpecificStyles = () => {
    if (isAiRoute) {
      return "flex-1 min-h-0 flex flex-col";
    }
    return "mx-auto w-full min-w-0 max-w-(--breakpoint-2xl) p-4 sm:px-6 sm:pt-8 sm:pb-10 lg:px-10 lg:pt-2";
  };

  return (
    <div className={cn("min-h-svh bg-white dark:bg-gray-950", isAiRoute && "h-svh overflow-hidden")}>
      <AppSidebar />

      <main className={cn("min-w-0 lg:pl-72", isAiRoute && "h-svh overflow-hidden")}>
        {/* the signed-in user, top right (lg+; below lg it is in the top bar) */}
        {!isAiRoute ? <div className="hidden justify-end px-10 pt-4 lg:flex"><UserMenu top /></div> : null}

        <div className={getRouteSpecificStyles()}><SubBar /><GroupTabs />{!acc.ready ? null : acc.canOpen(pathname) ? <Suspense fallback={<div className="flex justify-center py-20"><span className="size-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" /></div>}>{children ?? <Outlet />}</Suspense> : <Blocked path={pathname} />}</div>
      </main>
      <ScrollToTop />
    </div>
  );
}
