import {
  SidebarGroup,
  SidebarMenu,
} from "@/components/ui/sidebar";
import SidebarMenuItem from "./sidebar-menu-item";
import type { MenuType, NavItem } from "./types";

interface SidebarNavGroupProps {
  menuType: MenuType;
  items: NavItem[];
  openSubmenu: { type: MenuType; index: number } | null;
  showContent: boolean;
  pathname: string;
  onToggleSubmenu: (index: number, menuType: MenuType) => void;
}

export default function SidebarNavGroup({
  menuType,
  items,
  openSubmenu,
  showContent,
  pathname,
  onToggleSubmenu,
}: SidebarNavGroupProps) {
  return (
    <SidebarGroup className="p-0">
      {/* one list for the whole menu: no section titles (Ziad, 23-11-2026) */}
      <SidebarMenu className="gap-1">
        {items.map((nav, index) => (
          <SidebarMenuItem
            key={nav.key}
            nav={nav}
            isOpen={
              openSubmenu?.type === menuType && openSubmenu?.index === index
            }
            showContent={showContent}
            pathname={pathname}
            onToggle={() => onToggleSubmenu(index, menuType)}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
