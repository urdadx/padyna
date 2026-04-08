CREATE TABLE "slack_connection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"chatbot_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slack_oauth_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state" text NOT NULL,
	"user_id" uuid NOT NULL,
	"chatbot_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "slack_connection" ADD CONSTRAINT "slack_connection_chatbot_id_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slack_connection" ADD CONSTRAINT "slack_connection_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slack_oauth_state" ADD CONSTRAINT "slack_oauth_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slack_oauth_state" ADD CONSTRAINT "slack_oauth_state_chatbot_id_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "slack_connection_team_id_uidx" ON "slack_connection" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "slack_connection_chatbot_id_uidx" ON "slack_connection" USING btree ("chatbot_id");--> statement-breakpoint
CREATE INDEX "slack_connection_organization_id_idx" ON "slack_connection" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "slack_oauth_state_state_uidx" ON "slack_oauth_state" USING btree ("state");--> statement-breakpoint
CREATE INDEX "slack_oauth_state_chatbot_id_idx" ON "slack_oauth_state" USING btree ("chatbot_id");--> statement-breakpoint
CREATE INDEX "slack_oauth_state_expires_at_idx" ON "slack_oauth_state" USING btree ("expires_at");
