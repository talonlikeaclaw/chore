CREATE TABLE "chore" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"room_id" text NOT NULL,
	"interval_days" integer NOT NULL,
	"assigned_user_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "completion" (
	"id" text PRIMARY KEY NOT NULL,
	"chore_id" text NOT NULL,
	"user_id" text NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chore" ADD CONSTRAINT "chore_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chore" ADD CONSTRAINT "chore_assigned_user_id_user_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completion" ADD CONSTRAINT "completion_chore_id_chore_id_fk" FOREIGN KEY ("chore_id") REFERENCES "public"."chore"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completion" ADD CONSTRAINT "completion_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chore_roomId_idx" ON "chore" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "chore_assignedUserId_idx" ON "chore" USING btree ("assigned_user_id");--> statement-breakpoint
CREATE INDEX "completion_choreId_idx" ON "completion" USING btree ("chore_id");--> statement-breakpoint
CREATE INDEX "completion_userId_idx" ON "completion" USING btree ("user_id");