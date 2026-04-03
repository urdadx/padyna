CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"chatbot_id" uuid,
	"recipient_user_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"event_type" varchar NOT NULL,
	"entity_type" varchar,
	"entity_id" text,
	"title" text NOT NULL,
	"body" text,
	"metadata" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"dedupe_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_chatbot_id_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbot"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_organization_id_idx" ON "notification" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "notification_chatbot_id_idx" ON "notification" USING btree ("chatbot_id");--> statement-breakpoint
CREATE INDEX "notification_recipient_user_id_idx" ON "notification" USING btree ("recipient_user_id");--> statement-breakpoint
CREATE INDEX "notification_recipient_is_read_created_idx" ON "notification" USING btree ("recipient_user_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX "notification_org_created_idx" ON "notification" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_recipient_dedupe_uidx" ON "notification" USING btree ("recipient_user_id","dedupe_key");
