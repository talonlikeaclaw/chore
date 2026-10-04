ALTER TABLE "household_member" ADD COLUMN "notify_digest" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "digest_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "digest_day" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "digest_hour" integer DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "digest_last_sent_on" text;