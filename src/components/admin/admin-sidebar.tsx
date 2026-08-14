"use client";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { Link, usePathname } from "@/i18n/navigation";
import { Activity, Users, LogOut, ArrowLeft, KeySquare, Bot, CreditCard, MessageSquare, Megaphone, Gift } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";

export function AdminSidebar() {
  const pathname = usePathname();

  const isNavActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Sidebar className="border-r border-border bg-sidebar">
      <SidebarHeader className="flex h-16 items-center px-4">
        <Link href="/admin" className="flex items-center gap-2 font-bold text-lg text-sidebar-foreground">
          <div className="flex size-8 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
            <Activity className="size-5" />
          </div>
          Arioo Admin
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Asosiy</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/admin" prefetch={true} />}
                isActive={pathname === "/admin"}
                tooltip="Umumiy Statistika"
              >
                <Activity />
                <span>Umumiy Statistika</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/admin/users" prefetch={true} />}
                isActive={isNavActive("/admin/users")}
                tooltip="Mijozlar (Tashkilotlar)"
              >
                <Users />
                <span>Mijozlar (Tashkilotlar)</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/admin/agents" prefetch={true} />}
                isActive={isNavActive("/admin/agents")}
                tooltip="Barcha AI Xodimlar"
              >
                <Bot />
                <span>Barcha AI Xodimlar</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/admin/billing" prefetch={true} />}
                isActive={isNavActive("/admin/billing")}
                tooltip="Moliya va Billing"
              >
                <CreditCard />
                <span>Moliya va Billing</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Tizim</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/admin/tickets" prefetch={true} />}
                isActive={isNavActive("/admin/tickets")}
                tooltip="Murojaatlar (Tickets)"
              >
                <MessageSquare />
                <span>Murojaatlar (Tickets)</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/admin/announcements" prefetch={true} />}
                isActive={isNavActive("/admin/announcements")}
                tooltip="E'lonlar va Xabarlar"
              >
                <Megaphone />
                <span>E'lonlar va Xabarlar</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/admin/marketing" prefetch={true} />}
                isActive={isNavActive("/admin/marketing")}
                tooltip="Marketing va Promokod"
              >
                <Gift />
                <span>Marketing va Promokod</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/admin/settings" prefetch />}
                isActive={isNavActive("/admin/settings")}
                tooltip="Tizim Sozlamalari (ENV)"
              >
                <KeySquare />
                <span>Tizim Sozlamalari</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 flex flex-col gap-2">
        <SidebarMenuButton
          render={<Link href="/assistants" />}
          variant="outline"
          className="justify-center"
        >
          <ArrowLeft className="size-4 mr-2" />
          <span>Foydalanuvchi paneliga qaytish</span>
        </SidebarMenuButton>
        <SignOutButton>
          <SidebarMenuButton className="justify-center text-red-600 hover:text-red-700 hover:bg-red-50">
            <LogOut className="size-4 mr-2" />
            <span>Tizimdan chiqish</span>
          </SidebarMenuButton>
        </SignOutButton>
      </SidebarFooter>
    </Sidebar>
  );
}
