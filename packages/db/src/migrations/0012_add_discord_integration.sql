CREATE TABLE "discord_connection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" text NOT NULL,
	"chatbot_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discord_oauth_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state" text NOT NULL,
	"user_id" uuid NOT NULL,
	"chatbot_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "discord_connection" ADD CONSTRAINT "discord_connection_chatbot_id_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_connection" ADD CONSTRAINT "discord_connection_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_oauth_state" ADD CONSTRAINT "discord_oauth_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_oauth_state" ADD CONSTRAINT "discord_oauth_state_chatbot_id_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "discord_connection_guild_id_uidx" ON "discord_connection" USING btree ("guild_id");--> statement-breakpoint
CREATE UNIQUE INDEX "discord_connection_chatbot_id_uidx" ON "discord_connection" USING btree ("chatbot_id");--> statement-breakpoint
CREATE INDEX "discord_connection_organization_id_idx" ON "discord_connection" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "discord_oauth_state_state_uidx" ON "discord_oauth_state" USING btree ("state");--> statement-breakpoint
CREATE INDEX "discord_oauth_state_chatbot_id_idx" ON "discord_oauth_state" USING btree ("chatbot_id");--> statement-breakpoint
CREATE INDEX "discord_oauth_state_expires_at_idx" ON "discord_oauth_state" USING btree ("expires_at");
