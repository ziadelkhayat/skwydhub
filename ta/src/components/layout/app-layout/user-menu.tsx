// Tremor dashboard template user profile button + menu.
import { useNavigate } from "react-router";
import { RiArrowRightUpLine, RiComputerLine, RiMoonLine, RiMore2Fill, RiSettings5Line, RiSunLine } from "@remixicon/react";
import { cx, focusRing } from "@/components/tremor/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { useTheme } from "@/contexts/theme-context";
import { useAuth } from "@/lib/auth";

export function UserMenu({ compact, top }: { compact?: boolean; top?: boolean }) {
  const { staff, signOut } = useAuth();
  const go = useNavigate();
  const { themeMode, setThemeMode } = useTheme();
  const name = staff?.name || "Account", ini = name.split(/\s+/).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const avatar = <span className={cx("flex shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300", compact ? "size-7" : "size-8")} aria-hidden="true">{ini}</span>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="User settings" className={cx("group flex items-center rounded-md text-sm font-medium text-gray-900 hover:bg-gray-100 data-[state=open]:bg-gray-100 dark:text-gray-50 hover:dark:bg-gray-400/10 data-[state=open]:dark:bg-gray-400/10", compact ? "p-1" : top ? "gap-3 p-1.5 pr-2" : "w-full justify-between p-2", focusRing)}>
        {compact ? avatar : <>
          <span className="flex min-w-0 items-center gap-3">{avatar}<span className="truncate">{name}</span></span>
          <RiMore2Fill className="size-4 shrink-0 text-gray-500 group-hover:text-gray-700 group-hover:dark:text-gray-400" aria-hidden="true" />
        </>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact || top ? "end" : "start"} className="sm:!min-w-[calc(var(--radix-dropdown-menu-trigger-width))]">
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Theme</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={themeMode} onValueChange={v => setThemeMode(v as any)}>
                <DropdownMenuRadioItem aria-label="Light" value="light" iconType="check"><RiSunLine className="size-4 shrink-0" aria-hidden="true" />Light</DropdownMenuRadioItem>
                <DropdownMenuRadioItem aria-label="Dark" value="dark" iconType="check"><RiMoonLine className="size-4 shrink-0" aria-hidden="true" />Dark</DropdownMenuRadioItem>
                <DropdownMenuRadioItem aria-label="System" value="auto" iconType="check"><RiComputerLine className="size-4 shrink-0" aria-hidden="true" />System</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => go("/account")}><RiSettings5Line className="size-4 shrink-0" aria-hidden="true" />Account settings</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => go("/subscription")}><RiArrowRightUpLine className="size-4 shrink-0" aria-hidden="true" />Subscription</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => signOut()}>Sign out</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
