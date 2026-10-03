ALTER TABLE "chore" ADD COLUMN "recurrence" text DEFAULT 'days' NOT NULL;--> statement-breakpoint
ALTER TABLE "chore" ADD COLUMN "recurrence_interval" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "chore" ADD COLUMN "recurrence_weekday" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "chore" ADD COLUMN "recurrence_month_day" integer DEFAULT 1 NOT NULL;