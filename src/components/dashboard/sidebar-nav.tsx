import { useTranslations } from "next-intl";
import {
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Link } from "@/i18n/navigation";
import { Bot, MessageSquare, BookOpen, Plug, BarChart3, Settings } from "lucide-react";

const COMING_SOON_ITEMS = [
  { key: "assistants", icon: Bot },
  { key: "chats", icon: MessageSquare },
  { key: "knowledgeBases", icon: BookOpen },
  { key: "integrations", icon: Plug },
  { key: "statistics", icon: BarChart3 },
] as const;

export function SidebarNav() {
  const t = useTranslations("dashboard.nav");
  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarMenu>
          {COMING_SOON_ITEMS.map(({ key, icon: Icon }) => (
            <SidebarMenuItem key={key}>
              <SidebarMenuButton disabled>
                <Icon />
                <span>{t(key)}</span>
                <span className="text-muted-foreground ml-auto text-xs">{t("comingSoon")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            {/* base-ui uses a `render` prop instead of Radix's `asChild` for polymorphism. */}
            <SidebarMenuButton render={<Link href="/settings/accounts" />}>
              <Settings />
              <span>{t("settings")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  );
}
