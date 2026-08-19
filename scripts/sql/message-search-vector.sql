ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "search_vector" tsvector GENERATED ALWAYS AS (
  to_tsvector('simple', "content") ||
  to_tsvector('russian', "content") ||
  to_tsvector('english', "content")
) STORED;
--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS "message_search_vector_idx" ON "message" USING GIN ("search_vector");
--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS "message_conversation_id_idx" ON "message" ("conversationId");
--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS "conversation_agent_id_idx" ON "conversation" ("agentId");
--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS "conversation_started_at_idx" ON "conversation" ("startedAt");
