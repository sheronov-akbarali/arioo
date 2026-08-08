import { requireOrganization } from "@/lib/auth/dal";
import { ProjectForm } from "@/components/dashboard/settings/project-form";
import { updateProjectAction } from "./actions";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { organization, membership } = await requireOrganization(locale);
  const canEdit = membership.role === "owner" || membership.role === "admin";
  const action = updateProjectAction.bind(null, locale);

  return (
    <ProjectForm
      action={action}
      name={organization.name}
      industry={organization.industry}
      canEdit={canEdit}
    />
  );
}
