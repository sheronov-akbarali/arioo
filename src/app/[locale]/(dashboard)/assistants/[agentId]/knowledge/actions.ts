"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { db } from "@/db/client";
import { knowledgeDocuments } from "@/db/schema/knowledge";
import { requireAgent } from "@/lib/auth/dal";
import { embedDocument } from "@/lib/ai/knowledge-embed";

const ALLOWED_EXTENSIONS = [".txt", ".md"];

export async function uploadKnowledgeDocumentAction(
  locale: string,
  agentId: string,
  formData: FormData,
): Promise<void> {
  const { agent } = await requireAgent(locale, agentId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) =>
    file.name.toLowerCase().endsWith(ext),
  );
  if (!hasAllowedExtension) return;

  const text = await file.text();
  const blob = await put(`knowledge/${agent.id}/${crypto.randomUUID()}-${file.name}`, file, {
    access: "private",
  });

  const [document] = await db
    .insert(knowledgeDocuments)
    .values({
      agentId: agent.id,
      blobUrl: blob.url,
      filename: file.name,
      mimeType: file.type || "text/plain",
      status: "processing",
    })
    .returning();

  await embedDocument(document!.id, text);
  revalidatePath(`/${locale}/assistants/${agent.id}/knowledge`);
}
