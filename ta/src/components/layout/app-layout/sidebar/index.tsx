import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import { useState } from "react";
import { useLocation } from "react-router";
import { businessItems, mainItems, salesItems, stockItems } from "./data";
import { useAccess } from "@/lib/access";
import AppSidebarHeader from "./sidebar-header";
import SidebarNavGroup from "./sidebar-nav-group";
import type { MenuType, NavItem } from "./types";

const menuSections: { type: MenuType; labelKey: string; items: NavItem[] }[] = [
  { type: "main", labelKey: "groups.skMenu", items: mainItems },
  { type: "sales", labelKey: "groups.skSales", items: salesItems },
  { type: "stock", labelKey: "groups.skStock", items: stockItems },
  { type: "business", labelKey: "groups.skBusiness", items: businessItems },
];

const findMatchingSubmenu = (path: string, sections = menuSections) => {
  for (const section of sections) {
    for (let index = 0; index < section.items.length; index++) {
      const nav = section.items[index];
      if (
        nav.subItems?.some(
          (subItem) =>
            subItem.path === path ||
            (subItem.path === "/ai-settings" &&
              path.startsWith("/ai-settings")),
        )
      ) {
        return { type: section.type, index };
      }
    }
  }
  return null;
};

export default function AppSidebar() {
  const { open, isMobile, isHovered } = useSidebar();
  const { pathname } = useLocation();
  const { canOpen } = useAccess();
  // only the sections this user may open (their roles) and the plan includes
  const sections = menuSections.map(sec => ({ ...sec, items: sec.items.map(it => it.subItems ? { ...it, subItems: it.subItems.filter(x => canOpen(x.path)) } : it)
    .filter(it => it.subItems ? it.subItems.length > 0 : canOpen(it.path || "/")) }));

  const showContent = open || isHovered || isMobile;

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: MenuType;
    index: number;
  } | null>(() => findMatchingSubmenu(pathname, sections));

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpenSubmenu(findMatchingSubmenu(pathname, sections));
  }

  const handleSubmenuToggle = (index: number, menuType: MenuType) => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const activeSections = sections.filter(
    (section) => section.items.length > 0,
  );

  return (
    <Sidebar side="left" collapsible="icon">
      <AppSidebarHeader showContent={showContent} />

      <SidebarContent className="overflow-y-auto px-5 duration-300 ease-linear">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            {activeSections.map((section) => (
              <SidebarNavGroup
                key={section.type}
                labelKey={section.labelKey}
                menuType={section.type}
                items={section.items}
                openSubmenu={openSubmenu}
                showContent={showContent}
                pathname={pathname}
                onToggleSubmenu={handleSubmenuToggle}
              />
            ))}
          </div>
        </nav>

      </SidebarContent>
    </Sidebar>
  );
}
