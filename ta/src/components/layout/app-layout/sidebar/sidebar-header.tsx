import { SkwydLogo } from "@/components/shared/skwyd-logo";
import { SidebarHeader } from "@/components/ui/sidebar";
import { cn } from "@/utils";
import { Link } from "react-router";

interface AppSidebarHeaderProps {
  showContent: boolean;
}

export default function AppSidebarHeader({ showContent }: AppSidebarHeaderProps) {
  return (
    <SidebarHeader className="px-5 pt-5 pb-8">
      <Link to="/" className={cn("flex items-center", !showContent ? "justify-center" : "justify-start")}>
        <SkwydLogo showWord={showContent} />
      </Link>
    </SidebarHeader>
  );
}
