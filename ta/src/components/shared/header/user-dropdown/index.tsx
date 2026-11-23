import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { useTranslations } from "@/i18n";
import { ChevronDownIcon, GearIcon, LogOutIcon } from "@/icons";
import { cn } from "@/utils";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router";

export default function UserDropdown() {
  const t = useTranslations("userDropdown");
  const [isOpen, setIsOpen] = useState(false);
  const { staff, signOut } = useAuth();
  const name = staff?.name || "Account", ini = name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger className="dropdown-toggle flex items-center text-gray-700 dark:text-gray-400">
        <span className="me-3 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-base font-semibold text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
          {ini}
        </span>

        <span className="me-1 block text-sm font-medium">{name.split(" ")[0]}</span>

        <ChevronDownIcon
          className={cn(
            "size-5 text-gray-500 duration-200 dark:text-gray-400",
            isOpen ? "rotate-180" : "rotate-0",
          )}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={12} className="w-65 p-3">
        <div className="px-3 py-2">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-400">
            {name}
          </span>
          <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
            {staff?.email || staff?.phone || ""}
          </span>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem render={<Link to="/account" />}>
          <GearIcon className="size-6" />
          {t("accountSettings")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
          <LogOutIcon />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
