CREATE TYPE "public"."routine_action_type" AS ENUM('notify', 'webhook', 'handoff');--> statement-breakpoint
CREATE TYPE "public"."follow_up_status" AS ENUM('pending', 'sent', 'cancelled', 'failed');--> statement-breakpoint
ALTER TYPE "public"."routine_trigger_type" ADD VALUE 'ai_event' BEFORE 'schedule';--> statement-breakpoint
CREATE TABLE "follow_up_schedule" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"agent_id" text,
	"channel" text NOT NULL,
	"external_chat_id" text NOT NULL,
	"trigger_hours" integer NOT NULL,
	"status" "follow_up_status" DEFAULT 'pending' NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_agent" ADD COLUMN "enabledToolIds" jsonb DEFAULT '["createPaymentInvoice"]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "routine" ADD COLUMN "actionType" "routine_action_type" DEFAULT 'notify' NOT NULL;--> statement-breakpoint
ALTER TABLE "routine" ADD COLUMN "actionConfig" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "follow_up_schedule" ADD CONSTRAINT "follow_up_schedule_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_schedule" ADD CONSTRAINT "follow_up_schedule_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_schedule" ADD CONSTRAINT "follow_up_schedule_agent_id_ai_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agent"("id") ON DELETE set null ON UPDATE no action;