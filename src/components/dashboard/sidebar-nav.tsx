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
import {
  Bot,
  MessageSquare,
  PhoneCall,
  Repeat2,
  ShieldCheck,
  BookOpen,
  Package,
  Plug,
  BarChart3,
  Activity,
  Code2,
  Gift,
  Handshake,
  Settings,
} from "lucide-react";

// Grouped the way worken.ru's authenticated sidebar groups its nav: Work
// (agent-facing day-to-day) / Data (knowledge + commerce + integrations) /
// Monitoring (analytics) / Development (agent-building tools). Items without
// an `href` render as disabled "coming soon" — most of these track roadmap
// phases 4-6 (docs/superpowers/specs, CLAUDE.md roadmap) that aren't built yet.
const GROUPS = [
  {
    key: "work",
    items: [
      { key: "assistants", icon: Bot, href: "/assistants" },
      { key: "chats", icon: MessageSquare, href: "/chats" },
      { key: "calls", icon: PhoneCall, href: "/calls" },
      { key: "routines", icon: Repeat2, href: "/routines" },
      { key: "approvals", icon: ShieldCheck, href: "/approvals" },
    ],
  },
  {
    key: "data",
    items: [
      { key: "knowledgeBases", icon: BookOpen, href: "/knowledge-bases" },
      { key: "products", icon: Package, href: "/products" },
      { key: "integrations", icon: Plug, href: "/integrations" },
    ],
  },
  {
    key: "monitoring",
    items: [
      { key: "statistics", icon: BarChart3, href: "/statistics" },
      { key: "runs", icon: Activity, href: "/runs" },
    ],
  },
  {
    key: "development",
    items: [{ key: "codeAgent", icon: Code2 }],
  },
  {
    key: "partnership",
    items: [
      { key: "referralProgram", icon: Gift, href: "/referral-program" },
      { key: "affiliateProgram", icon: Handshake, href: "/affiliate-program" },
    ],
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
            <SidebarMenuButton render={<Link href="/settings/project" />}>
              <Settings />
              <span>{t("settings")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  );
}
