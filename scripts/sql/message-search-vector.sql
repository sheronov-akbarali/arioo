ALTER TABLE "message" ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
  to_tsvector('simple', "content") ||
  to_tsvector('russian', "content") ||
  to_tsvector('english', "content")
) STORED;
--> statement-breakpoint
CREATE INDEX "message_search_vector_idx" ON "message" USING GIN ("search_vector");
--> statement-breakpoint
CREATE INDEX "message_conversation_id_idx" ON "message" ("conversationId");
--> statement-breakpoint
CREATE INDEX "conversation_agent_id_idx" ON "conversation" ("agentId");
--> statement-breakpoint
CREATE INDEX "conversation_started_at_idx" ON "conversation" ("startedAt");
