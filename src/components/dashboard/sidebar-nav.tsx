"use client";

import { useTranslations } from "next-intl";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Link, usePathname } from "@/i18n/navigation";
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
  Briefcase,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

type NavItem = { key: string; icon: LucideIcon; href?: string };
type NavGroup = { key: string; items: NavItem[] };

// Grouped the way worken.ru's authenticated sidebar groups its nav: Work
// (agent-facing day-to-day) / Data (knowledge + commerce + integrations) /
// Monitoring (analytics) / Development (agent-building tools) / Partnership
// (referral, affiliate, billing — worken shows billing in its icon rail
// too, alongside referral/affiliate). Items without an `href` render as
// disabled "coming soon" — most of these track roadmap phases 4-6
// (docs/superpowers/specs, CLAUDE.md roadmap) that aren't built yet.
const GROUPS: NavGroup[] = [
  {
    key: "work",
    items: [
      { key: "assistants", icon: Bot, href: "/assistants" },
      { key: "chats", icon: MessageSquare, href: "/chats" },
      { key: "calls", icon: PhoneCall, href: "/calls" },
      { key: "routines", icon: Repeat2, href: "/routines" },
      { key: "crm", icon: Briefcase, href: "/crm" },
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
];

const SETTINGS_ITEM: NavItem = { key: "settings", icon: Settings, href: "/settings/project" };

// Exact-match or nested-route match — e.g. `/assistants` is active for both
// `/assistants` itself and `/assistants/new` or `/assistants/abc123/chat`.
// Special case: `/settings/project` is also active for all other settings sub-routes
// like `/settings/team`, `/settings/limits`, `/settings/accounts`.
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/settings/project" && pathname.startsWith("/settings")) {
    return true;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const ROUTED_NAV_ITEMS: { key: string; href: string }[] = [
  ...GROUPS.flatMap((group) => group.items),
  SETTINGS_ITEM,
]
  .filter((item): item is NavItem & { href: string } => item.href !== undefined)
  .map(({ key, href }) => ({ key, href }));

export function getActiveNavItem(pathname: string) {
  return ROUTED_NAV_ITEMS.find((item) => isNavItemActive(pathname, item.href));
}

export function SidebarNav() {
  const t = useTranslations("dashboard.nav");
  const pathname = usePathname();

  return (
    <SidebarContent>
      {GROUPS.map((group) => (
        <SidebarGroup key={group.key}>
          <SidebarGroupLabel>{t(`groups.${group.key}`)}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map(({ key, icon: Icon, href }) => (
              <SidebarMenuItem key={key}>
                {href ? (
                  <SidebarMenuButton
                    render={<Link href={href} prefetch={true} />}
                    isActive={isNavItemActive(pathname, href)}
                    tooltip={t(key)}
                  >
                    <Icon />
                    <span>{t(key)}</span>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton disabled tooltip={t(key)}>
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
            <SidebarMenuButton
              render={<Link href={SETTINGS_ITEM.href!} prefetch={true} />}
              isActive={isNavItemActive(pathname, SETTINGS_ITEM.href!)}
              tooltip={t("settings")}
            >
              <Settings />
              <span>{t("settings")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  );
}
