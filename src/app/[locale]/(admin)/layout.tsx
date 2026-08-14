import { cookies } from "next/headers";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export default async function AdminLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const isAdminAuthed = cookieStore.get("admin_auth")?.value === "true";

  if (!isAdminAuthed) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted/20">
        <AdminLoginForm locale={locale} />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        <AdminTopbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/20">
          <div className="mx-auto max-w-6xl w-full">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
