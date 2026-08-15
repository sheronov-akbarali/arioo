CREATE TABLE "site_analytics_event" (
	"id" text PRIMARY KEY NOT NULL,
	"siteId" text NOT NULL,
	"path" text NOT NULL,
	"referrerHost" text,
	"visitorHash" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_analytics_site" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"domain" text NOT NULL,
	"trackingKey" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "site_analytics_site_organizationId_unique" UNIQUE("organizationId")
);
--> statement-breakpoint
ALTER TABLE "site_analytics_event" ADD CONSTRAINT "site_analytics_event_siteId_site_analytics_site_id_fk" FOREIGN KEY ("siteId") REFERENCES "public"."site_analytics_site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_analytics_site" ADD CONSTRAINT "site_analytics_site_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "site_analytics_event_site_created_idx" ON "site_analytics_event" USING btree ("siteId","createdAt");--> statement-breakpoint
CREATE INDEX "site_analytics_event_site_visitor_idx" ON "site_analytics_event" USING btree ("siteId","visitorHash");--> statement-breakpoint
CREATE UNIQUE INDEX "site_analytics_site_tracking_key_idx" ON "site_analytics_site" USING btree ("trackingKey");
