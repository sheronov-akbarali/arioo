import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Briefcase, Users } from "lucide-react";

export default async function CRMLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("dashboard.nav");

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{t("crm")}</h1>
        <p className="text-sm text-muted-foreground">
          Lidlar, kelishuvlar va mijozlarni boshqarish (Light CRM)
        </p>
      </div>
      
      <div className="flex items-center gap-2 border-b border-border pb-4">
        <Link 
          href="/crm" 
          className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          <Briefcase className="size-4" /> Kanban (Deals)
        </Link>
        <Link 
          href="/crm/contacts" 
          className="flex items-center gap-2 rounded-md bg-transparent px-3 py-1.5 text-sm font-medium hover:bg-muted/50"
        >
          <Users className="size-4" /> Kontaktlar
        </Link>
      </div>

      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
