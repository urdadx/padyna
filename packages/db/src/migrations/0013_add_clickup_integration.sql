CREATE TABLE "clickup_integration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"chatbot_id" uuid NOT NULL,
	"access_token" text NOT NULL,
	"scope" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"disconnected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clickup_oauth_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state" text NOT NULL,
	"user_id" uuid NOT NULL,
	"chatbot_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clickup_integration" ADD CONSTRAINT "clickup_integration_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clickup_integration" ADD CONSTRAINT "clickup_integration_chatbot_id_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clickup_oauth_state" ADD CONSTRAINT "clickup_oauth_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clickup_oauth_state" ADD CONSTRAINT "clickup_oauth_state_chatbot_id_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "clickup_integration_chatbot_id_uidx" ON "clickup_integration" USING btree ("chatbot_id");--> statement-breakpoint
CREATE INDEX "clickup_integration_chatbot_id_idx" ON "clickup_integration" USING btree ("chatbot_id");--> statement-breakpoint
CREATE INDEX "clickup_integration_user_id_idx" ON "clickup_integration" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clickup_oauth_state_state_uidx" ON "clickup_oauth_state" USING btree ("state");--> statement-breakpoint
CREATE INDEX "clickup_oauth_state_chatbot_id_idx" ON "clickup_oauth_state" USING btree ("chatbot_id");--> statement-breakpoint
CREATE INDEX "clickup_oauth_state_expires_at_idx" ON "clickup_oauth_state" USING btree ("expires_at");
