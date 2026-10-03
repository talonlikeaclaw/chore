ALTER TABLE "household" ADD COLUMN "week_starts_on" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "hour_cycle" text DEFAULT 'h23' NOT NULL;--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "date_format" text DEFAULT 'mdy' NOT NULL;--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "default_interval_days" integer DEFAULT 7 NOT NULL;