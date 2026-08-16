ALTER TABLE "conversation" ALTER COLUMN "channel" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "conversation" ALTER COLUMN "channel" SET DEFAULT 'playground'::text;--> statement-breakpoint
DROP TYPE "public"."conversation_channel";--> statement-breakpoint
CREATE TYPE "public"."conversation_channel" AS ENUM('playground', 'telegram', 'whatsapp', 'widget');--> statement-breakpoint
ALTER TABLE "conversation" ALTER COLUMN "channel" SET DEFAULT 'playground'::"public"."conversation_channel";--> statement-breakpoint
ALTER TABLE "conversation" ALTER COLUMN "channel" SET DATA TYPE "public"."conversation_channel" USING "channel"::"public"."conversation_channel";--> statement-breakpoint
ALTER TABLE "channel" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."channel_type";--> statement-breakpoint
CREATE TYPE "public"."channel_type" AS ENUM('telegram', 'whatsapp', 'widget');--> statement-breakpoint
ALTER TABLE "channel" ALTER COLUMN "type" SET DATA TYPE "public"."channel_type" USING "type"::"public"."channel_type";