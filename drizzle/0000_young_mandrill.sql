CREATE TYPE "public"."deal_status" AS ENUM('new', 'negotiating', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."invite_status" AS ENUM('pending', 'accepted', 'expired');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."agent_interruption_mode" AS ENUM('queue', 'abort_restart', 'drop_restart');--> statement-breakpoint
CREATE TYPE "public"."agent_memory_isolation" AS ENUM('user', 'thread');--> statement-breakpoint
CREATE TYPE "public"."agent_memory_template_mode" AS ENUM('freeform', 'schema');--> statement-breakpoint
CREATE TYPE "public"."agent_role" AS ENUM('sales', 'support', 'hr', 'marketing');--> statement-breakpoint
CREATE TYPE "public"."agent_status" AS ENUM('draft', 'active');--> statement-breakpoint
CREATE TYPE "public"."agent_limit_type" AS ENUM('messages', 'tokens', 'workens');--> statement-breakpoint
CREATE TYPE "public"."agent_operator_trigger" AS ENUM('keep_going', 'pause');--> statement-breakpoint
CREATE TYPE "public"."agent_text_reaction" AS ENUM('reply_text');--> statement-breakpoint
CREATE TYPE "public"."agent_voice_reaction" AS ENUM('none', 'reply_text', 'reply_voice');--> statement-breakpoint
CREATE TYPE "public"."agent_call_confirmation" AS ENUM('always', 'per_tool', 'read_only');--> statement-breakpoint
CREATE TYPE "public"."agent_call_direction" AS ENUM('inbound', 'outbound', 'both', 'off');--> statement-breakpoint
CREATE TYPE "public"."agent_call_mode" AS ENUM('supervised', 'autonomous');--> statement-breakpoint
CREATE TYPE "public"."agent_call_window_tz" AS ENUM('same_as_chat', 'custom');--> statement-breakpoint
CREATE TYPE "public"."agent_off_window_behavior" AS ENUM('reject', 'voicemail_task');--> statement-breakpoint
CREATE TYPE "public"."agent_recording_mode" AS ENUM('off', 'record', 'record_announce');--> statement-breakpoint
CREATE TYPE "public"."agent_knowledge_aggregation" AS ENUM('merge', 'priority');--> statement-breakpoint
CREATE TYPE "public"."knowledge_document_status" AS ENUM('processing', 'ready', 'error');--> statement-breakpoint
CREATE TYPE "public"."conversation_channel" AS ENUM('playground', 'telegram', 'whatsapp', 'widget', 'olx');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected', 'auto_resolved', 'expired');--> statement-breakpoint
CREATE TYPE "public"."credit_transaction_type" AS ENUM('grant', 'topup', 'usage', 'bonus');--> statement-breakpoint
CREATE TYPE "public"."routine_status" AS ENUM('draft');--> statement-breakpoint
CREATE TYPE "public"."routine_trigger_type" AS ENUM('crm_event', 'integration_event', 'schedule');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('item', 'digital', 'service', 'affiliate_offer', 'referral_offer', 'lead_magnet');--> statement-breakpoint
CREATE TYPE "public"."telegram_connection_status" AS ENUM('pending_code', 'pending_password', 'connected', 'error');--> statement-breakpoint
CREATE TYPE "public"."channel_type" AS ENUM('telegram', 'whatsapp', 'widget', 'olx');--> statement-breakpoint
CREATE TABLE "crm_contact" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"channel_id" text,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_deal" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"agent_id" text,
	"title" text NOT NULL,
	"value" numeric(12, 2),
	"currency" text DEFAULT 'UZS',
	"status" "deal_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invite" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"role" "membership_role" NOT NULL,
	"status" "invite_status" DEFAULT 'pending' NOT NULL,
	"invitedByUserId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	CONSTRAINT "invite_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "membership" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"organizationId" text NOT NULL,
	"role" "membership_role" NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"industry" text NOT NULL,
	"plan" text DEFAULT 'freemium' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_agent" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"role" "agent_role" NOT NULL,
	"name" text NOT NULL,
	"systemPrompt" text NOT NULL,
	"model" text NOT NULL,
	"status" "agent_status" DEFAULT 'draft' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"topP" real,
	"temperature" real,
	"maxTokens" integer,
	"readOnlyMode" boolean DEFAULT false NOT NULL,
	"recentMessagesCount" integer DEFAULT 20 NOT NULL,
	"autoTitleGeneration" boolean DEFAULT true NOT NULL,
	"semanticSearchEnabled" boolean DEFAULT false NOT NULL,
	"memoryIsolation" "agent_memory_isolation" DEFAULT 'user' NOT NULL,
	"memoryTemplateMode" "agent_memory_template_mode" DEFAULT 'freeform' NOT NULL,
	"memoryTemplate" text,
	"removeEmojis" boolean DEFAULT false NOT NULL,
	"removeMarkdown" boolean DEFAULT false NOT NULL,
	"interruptionMode" "agent_interruption_mode" DEFAULT 'queue' NOT NULL,
	"maxStepsWithoutTools" integer DEFAULT 1 NOT NULL,
	"maxStepsWithTools" integer DEFAULT 8 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_chat_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"agentId" text NOT NULL,
	"description" text,
	"greetingMessage" text,
	"replyDelaySeconds" integer DEFAULT 0 NOT NULL,
	"timezone" text,
	"voiceReaction" "agent_voice_reaction" DEFAULT 'none' NOT NULL,
	"textReaction" "agent_text_reaction" DEFAULT 'reply_text' NOT NULL,
	"ttsVoice" text DEFAULT 'alloy' NOT NULL,
	"ttsModel" text DEFAULT 'tts-1' NOT NULL,
	"voiceReactionText" text,
	"limitsEnabled" boolean DEFAULT false NOT NULL,
	"limitType" "agent_limit_type",
	"limitValue" integer,
	"limitMessage" text,
	"stopWordRules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"operatorTrigger" "agent_operator_trigger" DEFAULT 'keep_going' NOT NULL,
	"pauseDurationMinutes" integer DEFAULT 5 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_chat_settings_agentId_unique" UNIQUE("agentId")
);
--> statement-breakpoint
CREATE TABLE "agent_call_policy" (
	"id" text PRIMARY KEY NOT NULL,
	"agentId" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"direction" "agent_call_direction" DEFAULT 'off' NOT NULL,
	"windowTimezoneMode" "agent_call_window_tz" DEFAULT 'same_as_chat' NOT NULL,
	"windowStart" text,
	"windowEnd" text,
	"offWindowBehavior" "agent_off_window_behavior" DEFAULT 'reject' NOT NULL,
	"requireExistingThread" boolean DEFAULT true NOT NULL,
	"respectDnc" boolean DEFAULT true NOT NULL,
	"maxAttempts" integer,
	"attemptsPeriodDays" integer,
	"recordingMode" "agent_recording_mode" DEFAULT 'record_announce' NOT NULL,
	"disclosureScript" text,
	"maxDurationMinutes" integer DEFAULT 20 NOT NULL,
	"maxParallelLines" integer DEFAULT 2 NOT NULL,
	"sipIntegrationRef" text,
	"outboundDid" text,
	"lineInstruction" text,
	"callModel" text DEFAULT 'gpt-realtime' NOT NULL,
	"callVoice" text DEFAULT 'alloy' NOT NULL,
	"defaultMode" "agent_call_mode" DEFAULT 'supervised' NOT NULL,
	"maxActionsPerReply" integer DEFAULT 5 NOT NULL,
	"confirmationMode" "agent_call_confirmation" DEFAULT 'always' NOT NULL,
	"saveSummaryToThread" boolean DEFAULT true NOT NULL,
	"syncCrm" boolean DEFAULT false NOT NULL,
	"escalationTarget" text,
	"escalationTriggerWords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_call_policy_agentId_unique" UNIQUE("agentId")
);
--> statement-breakpoint
CREATE TABLE "agent_knowledge_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"agentId" text NOT NULL,
	"embeddingModel" text DEFAULT 'text-embedding-3-small' NOT NULL,
	"relevanceThreshold" real DEFAULT 0.85 NOT NULL,
	"maxResults" integer DEFAULT 10 NOT NULL,
	"maxContextTokens" integer DEFAULT 4000 NOT NULL,
	"aggregationStrategy" "agent_knowledge_aggregation" DEFAULT 'merge' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_knowledge_settings_agentId_unique" UNIQUE("agentId")
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunk" (
	"id" text PRIMARY KEY NOT NULL,
	"documentId" text NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_document" (
	"id" text PRIMARY KEY NOT NULL,
	"agentId" text NOT NULL,
	"blobUrl" text NOT NULL,
	"filename" text NOT NULL,
	"mimeType" text NOT NULL,
	"status" "knowledge_document_status" DEFAULT 'processing' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"agentId" text NOT NULL,
	"channel" "conversation_channel" DEFAULT 'playground' NOT NULL,
	"channelId" text,
	"externalChatId" text,
	"metadata" text,
	"startedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" text PRIMARY KEY NOT NULL,
	"conversationId" text NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"tokenCount" integer,
	"estimatedCostUsd" double precision,
	"externalMessageId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval" (
	"id" text PRIMARY KEY NOT NULL,
	"agentId" text NOT NULL,
	"conversationId" text,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "approval_status" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"resolvedAt" timestamp,
	"resolvedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "credit_transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"type" "credit_transaction_type" NOT NULL,
	"amount" double precision NOT NULL,
	"description" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_credit" (
	"organizationId" text PRIMARY KEY NOT NULL,
	"balance" double precision DEFAULT 0 NOT NULL,
	"bonusBalance" double precision DEFAULT 0 NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"triggerType" "routine_trigger_type" NOT NULL,
	"resource" text NOT NULL,
	"status" "routine_status" DEFAULT 'draft' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"type" "product_type" NOT NULL,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"priceUZS" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_referral" (
	"organizationId" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"balance" double precision DEFAULT 0 NOT NULL,
	"ratePercent" double precision DEFAULT 5 NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_referral_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "referral_operation" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"description" text NOT NULL,
	"amount" double precision NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_channel_connection" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"channelUsername" text NOT NULL,
	"channelTitle" text,
	"phoneMasked" text,
	"phone" text,
	"sessionSecretEncrypted" text,
	"phoneCodeHash" text,
	"status" "telegram_connection_status" DEFAULT 'pending_code' NOT NULL,
	"lastSyncedAt" timestamp,
	"lastError" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "telegram_channel_connection_organizationId_unique" UNIQUE("organizationId")
);
--> statement-breakpoint
CREATE TABLE "channel" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"agentId" text NOT NULL,
	"type" "channel_type" NOT NULL,
	"botToken" text,
	"botUsername" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_contact" ADD CONSTRAINT "crm_contact_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contact" ADD CONSTRAINT "crm_contact_channel_id_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channel"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deal" ADD CONSTRAINT "crm_deal_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deal" ADD CONSTRAINT "crm_deal_contact_id_crm_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deal" ADD CONSTRAINT "crm_deal_agent_id_ai_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agent"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent" ADD CONSTRAINT "ai_agent_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_chat_settings" ADD CONSTRAINT "agent_chat_settings_agentId_ai_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."ai_agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_call_policy" ADD CONSTRAINT "agent_call_policy_agentId_ai_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."ai_agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_knowledge_settings" ADD CONSTRAINT "agent_knowledge_settings_agentId_ai_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."ai_agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunk" ADD CONSTRAINT "knowledge_chunk_documentId_knowledge_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."knowledge_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_document" ADD CONSTRAINT "knowledge_document_agentId_ai_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."ai_agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_agentId_ai_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."ai_agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval" ADD CONSTRAINT "approval_agentId_ai_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."ai_agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval" ADD CONSTRAINT "approval_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transaction" ADD CONSTRAINT "credit_transaction_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_credit" ADD CONSTRAINT "organization_credit_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine" ADD CONSTRAINT "routine_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_referral" ADD CONSTRAINT "organization_referral_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_operation" ADD CONSTRAINT "referral_operation_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_channel_connection" ADD CONSTRAINT "telegram_channel_connection_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel" ADD CONSTRAINT "channel_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel" ADD CONSTRAINT "channel_agentId_ai_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."ai_agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knowledge_chunk_embedding_idx" ON "knowledge_chunk" USING hnsw ("embedding" vector_cosine_ops);