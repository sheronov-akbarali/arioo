CREATE TYPE "public"."conversation_sentiment" AS ENUM('positive', 'neutral', 'negative');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'in_progress', 'closed');--> statement-breakpoint
CREATE TYPE "public"."announcement_type" AS ENUM('info', 'warning');--> statement-breakpoint
CREATE TYPE "public"."promocode_status" AS ENUM('active', 'expired');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('chat', 'lead', 'approval', 'ticket', 'system');--> statement-breakpoint
CREATE TYPE "public"."ab_test_status" AS ENUM('running', 'concluded', 'cancelled');--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"subject" text NOT NULL,
	"description" text,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"type" "announcement_type" DEFAULT 'info' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promocodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"discount" text NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"status" "promocode_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promocodes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"type" "notification_type" DEFAULT 'system' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text,
	"isRead" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_template" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"industry" text NOT NULL,
	"role" "agent_role" NOT NULL,
	"systemPrompt" text NOT NULL,
	"sampleKnowledge" text,
	"icon" text DEFAULT 'Bot',
	"isFeatured" boolean DEFAULT false NOT NULL,
	"downloadsCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ab_test" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"agentId" text NOT NULL,
	"name" text NOT NULL,
	"variantAPrompt" text NOT NULL,
	"variantBPrompt" text NOT NULL,
	"trafficSplit" integer DEFAULT 50 NOT NULL,
	"variantAConversations" integer DEFAULT 0 NOT NULL,
	"variantBConversations" integer DEFAULT 0 NOT NULL,
	"variantAConversions" integer DEFAULT 0 NOT NULL,
	"variantBConversions" integer DEFAULT 0 NOT NULL,
	"status" "ab_test_status" DEFAULT 'running' NOT NULL,
	"winnerVariant" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"endedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "message_template" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"agentId" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"usageCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "onboardingCompleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "onboardingStep" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "whitelabel" text;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "sentiment" "conversation_sentiment" DEFAULT 'neutral' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "handoffFromAgentId" text;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "handoffReason" text;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ab_test" ADD CONSTRAINT "ab_test_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ab_test" ADD CONSTRAINT "ab_test_agentId_ai_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."ai_agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_template" ADD CONSTRAINT "message_template_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_template" ADD CONSTRAINT "message_template_agentId_ai_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."ai_agent"("id") ON DELETE set null ON UPDATE no action;