import { useTranslations } from "next-intl";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Link } from "@/i18n/navigation";
import { Bot, MessageSquare, BookOpen, Plug, BarChart3, Settings, ShieldCheck } from "lucide-react";

// Grouped the way worken.ru's sidebar groups its nav: Work (agent-facing
// day-to-day) / Data (knowledge + integrations) / Monitoring (analytics).
const GROUPS = [
  {
    key: "work",
    items: [
      { key: "assistants", icon: Bot, href: "/assistants" },
      // Chats live per-agent (/assistants/[id]/chat) — no global cross-agent
      // page yet, so this links to the agent list where the user picks one.
      { key: "chats", icon: MessageSquare, href: "/assistants" },
      { key: "approvals", icon: ShieldCheck, href: "/approvals" },
    ],
  },
  {
    key: "data",
    items: [
      { key: "knowledgeBases", icon: BookOpen, href: "/assistants" },
      { key: "integrations", icon: Plug },
    ],
  },
  {
    key: "monitoring",
    items: [{ key: "statistics", icon: BarChart3 }],
  },
] as const;

export function SidebarNav() {
  const t = useTranslations("dashboard.nav");
  return (
    <SidebarContent>
      {GROUPS.map((group) => (
        <SidebarGroup key={group.key}>
          <SidebarGroupLabel>{t(`groups.${group.key}`)}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map(({ key, icon: Icon, ...item }) => (
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
          </SidebarMenu>
        </SidebarGroup>
      ))}
      <SidebarGroup>
        <SidebarMenu>
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
