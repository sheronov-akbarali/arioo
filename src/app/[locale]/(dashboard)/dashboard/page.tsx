import { requireOrganization } from "@/lib/auth/dal";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { organization } = await requireOrganization(locale);
  return <div>{organization.name}</div>;
}
