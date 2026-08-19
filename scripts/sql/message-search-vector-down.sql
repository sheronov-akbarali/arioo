DROP INDEX IF EXISTS "conversation_started_at_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "conversation_agent_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "message_conversation_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "message_search_vector_idx";
--> statement-breakpoint
ALTER TABLE "message" DROP COLUMN IF EXISTS "search_vector";
