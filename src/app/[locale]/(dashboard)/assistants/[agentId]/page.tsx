import { redirect } from "next/navigation";

export default async function AssistantDetailIndexPage({
  params,
}: {
  params: Promise<{ locale: string; agentId: string }>;
}) {
  const { locale, agentId } = await params;
  redirect(`/${locale}/assistants/${agentId}/ai`);
}
