import {
  streamText,
  embed,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { messages as messagesTable } from "@/db/schema/conversations";
import { retrieveRelevantChunks } from "@/lib/ai/retrieval";
import { listAvailableModels, estimateCostUsd, EMBEDDING_MODEL } from "@/lib/ai/gateway";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { agentId } = await params;
  const [agent] = await db.select().from(aiAgents).where(eq(aiAgents.id, agentId));
  if (!agent) return new Response("Not found", { status: 404 });

  const body = (await req.json()) as { messages: UIMessage[]; conversationId: string };
  const { messages: uiMessages, conversationId } = body;

  const lastUserMessage = uiMessages.at(-1);
  const lastUserText =
    lastUserMessage?.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("\n") ?? "";

  // Retrieval is a best-effort enhancement: if embedding the query fails (AI
  // Gateway outage, no knowledge base yet, etc.), the agent still answers
  // from its system prompt alone rather than failing the whole request.
  let context = "";
  if (lastUserText) {
    try {
      const { embedding } = await embed({ model: EMBEDDING_MODEL, value: lastUserText });
      const chunks = await retrieveRelevantChunks(agentId, embedding);
      if (chunks.length > 0) {
        context = `\n\nBilim bazasidan tegishli ma'lumot:\n${chunks.join("\n---\n")}`;
      }
    } catch (error) {
      console.error("Knowledge base retrieval failed, answering without context", error);
    }
  }

  if (lastUserText) {
    await db.insert(messagesTable).values({
      conversationId,
      role: "user",
      content: lastUserText,
    });
  }

  const result = streamText({
    model: agent.model,
    system: agent.systemPrompt + context,
    messages: await convertToModelMessages(uiMessages),
    onError: ({ error }) => {
      console.error(`Chat generation failed for agent ${agentId}`, error);
    },
    onEnd: async ({ text, usage }) => {
      const models = await listAvailableModels();
      const cost = estimateCostUsd(models, agent.model, {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      });
      await db.insert(messagesTable).values({
        conversationId,
        role: "assistant",
        content: text,
        tokenCount: usage.totalTokens ?? null,
        estimatedCostUsd: cost,
      });
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
