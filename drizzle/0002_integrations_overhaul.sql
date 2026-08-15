CREATE TYPE "public"."integration_connection_mode" AS ENUM('oauth', 'form', 'wizard', 'special');--> statement-breakpoint
CREATE TYPE "public"."integration_event_type" AS ENUM('created', 'status_changed', 'verified', 'error', 'reauth', 'archived', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('setup_needed', 'verifying', 'active', 'need_attention', 'archived');--> statement-breakpoint
CREATE TABLE "integration_event" (
	"id" text PRIMARY KEY NOT NULL,
	"integrationId" text NOT NULL,
	"type" "integration_event_type" NOT NULL,
	"message" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"providerId" text NOT NULL,
	"connectionMode" "integration_connection_mode" NOT NULL,
	"status" "integration_status" DEFAULT 'setup_needed' NOT NULL,
	"credentialsEncrypted" text,
	"config" jsonb,
	"linkedChannelId" text,
	"linkedTelegramConnectionId" text,
	"agentId" text,
	"lastVerifiedAt" timestamp,
	"lastError" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "integration_event" ADD CONSTRAINT "integration_event_integrationId_integration_id_fk" FOREIGN KEY ("integrationId") REFERENCES "public"."integration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration" ADD CONSTRAINT "integration_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration" ADD CONSTRAINT "integration_linkedChannelId_channel_id_fk" FOREIGN KEY ("linkedChannelId") REFERENCES "public"."channel"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration" ADD CONSTRAINT "integration_linkedTelegramConnectionId_telegram_channel_connection_id_fk" FOREIGN KEY ("linkedTelegramConnectionId") REFERENCES "public"."telegram_channel_connection"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration" ADD CONSTRAINT "integration_agentId_ai_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."ai_agent"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "integration_org_provider_idx" ON "integration" USING btree ("organizationId","providerId");
