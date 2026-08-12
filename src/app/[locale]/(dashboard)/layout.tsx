import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { OrgSwitcher } from "@/components/dashboard/org-switcher";
import { BillingWidget } from "@/components/dashboard/billing-widget";
import { UserMenu } from "@/components/dashboard/user-menu";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { requireOrganization } from "@/lib/auth/dal";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { user, organization } = await requireOrganization(locale);

  return (
    <SidebarProvider open={false} onOpenChange={() => {}}>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <OrgSwitcher userId={user.id} activeOrgId={organization.id} />
        </SidebarHeader>
        <SidebarNav />
        <SidebarFooter className="gap-3">
          <BillingWidget organizationId={organization.id} plan={organization.plan} />
          <UserMenu name={user.name} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <DashboardTopbar />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
