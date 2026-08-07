import { useTranslations } from "next-intl";
import {
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Link } from "@/i18n/navigation";
import { Bot, MessageSquare, BookOpen, Plug, BarChart3, Settings, ShieldCheck } from "lucide-react";

const NAV_ITEMS = [
  { key: "assistants", icon: Bot, href: "/assistants" },
  // Chats and knowledge bases live per-agent (/assistants/[id]/chat,
  // /assistants/[id]/knowledge) — there's no global cross-agent page for
  // either yet, so both link to the agent list where the user picks one.
  { key: "chats", icon: MessageSquare, href: "/assistants" },
  { key: "knowledgeBases", icon: BookOpen, href: "/assistants" },
  { key: "approvals", icon: ShieldCheck, href: "/approvals" },
  { key: "integrations", icon: Plug },
  { key: "statistics", icon: BarChart3 },
] as const;

export function SidebarNav() {
  const t = useTranslations("dashboard.nav");
  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarMenu>
          {NAV_ITEMS.map(({ key, icon: Icon, ...item }) => (
            <SidebarMenuItem key={key}>
              {"href" in item ? (
                <SidebarMenuButton render={<Link href={item.href} />}>
                  <Icon />
                  <span>{t(key)}</span>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton disabled>
                  <Icon />
                  <span>{t(key)}</span>
                  <span className="text-muted-foreground ml-auto text-xs">{t("comingSoon")}</span>
                </SidebarMenuButton>
              )}
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
