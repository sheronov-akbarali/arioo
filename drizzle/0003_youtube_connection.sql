CREATE TYPE "public"."youtube_connection_status" AS ENUM('connected', 'error');--> statement-breakpoint
CREATE TABLE "youtube_channel_connection" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"channelId" text NOT NULL,
	"channelTitle" text,
	"accessTokenEncrypted" text NOT NULL,
	"refreshTokenEncrypted" text NOT NULL,
	"tokenExpiresAt" timestamp NOT NULL,
	"status" "youtube_connection_status" DEFAULT 'connected' NOT NULL,
	"lastSyncedAt" timestamp,
	"lastError" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "youtube_channel_connection_organizationId_unique" UNIQUE("organizationId")
);
--> statement-breakpoint
ALTER TABLE "youtube_channel_connection" ADD CONSTRAINT "youtube_channel_connection_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
