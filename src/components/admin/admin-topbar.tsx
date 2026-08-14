"use client";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { UserButton, useUser } from "@clerk/nextjs";
import { usePathname } from "@/i18n/navigation";

export function AdminTopbar() {
  const { isMobile } = useSidebar();
  const { user } = useUser();
  const pathname = usePathname();

  let title = "Tizim Administratori";
  if (pathname.includes("/admin/users")) title = "Foydalanuvchilar va Tashkilotlar";
  if (pathname.includes("/admin/agents")) title = "Barcha AI Xodimlar";
  if (pathname.includes("/admin/billing")) title = "Moliya va Billing";
  if (pathname.includes("/admin/tickets")) title = "Murojaatlar (Tickets)";
  if (pathname.includes("/admin/announcements")) title = "E'lonlar va Xabarlar";
  if (pathname.includes("/admin/marketing")) title = "Marketing va Promokodlar";
  if (pathname.includes("/admin/settings")) title = "Tizim Sozlamalari (ENV)";

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:px-6">
      <div className="flex items-center gap-3">
        {isMobile && <SidebarTrigger className="-ml-2 mr-2" />}
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden md:flex flex-col items-end text-sm">
          <span className="font-medium">{user?.fullName || "Admin"}</span>
          <span className="text-xs text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</span>
        </div>
        <UserButton />
      </div>
    </header>
  );
}
