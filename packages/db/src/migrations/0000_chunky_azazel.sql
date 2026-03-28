CREATE TABLE "analytics_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatbot_id" uuid NOT NULL,
	"date" date NOT NULL,
	"total_sessions" integer DEFAULT 0 NOT NULL,
	"unique_visitors" integer DEFAULT 0 NOT NULL,
	"bounce_count" integer DEFAULT 0 NOT NULL,
	"engaged_count" integer DEFAULT 0 NOT NULL,
	"avg_session_duration_ms" integer,
	"avg_time_on_page_ms" integer,
	"total_chats_started" integer DEFAULT 0 NOT NULL,
	"total_messages" integer DEFAULT 0 NOT NULL,
	"desktop_sessions" integer DEFAULT 0 NOT NULL,
	"mobile_sessions" integer DEFAULT 0 NOT NULL,
	"tablet_sessions" integer DEFAULT 0 NOT NULL,
	"bot_sessions" integer DEFAULT 0 NOT NULL,
	"platform_breakdown" jsonb,
	"device_type_breakdown" jsonb,
	"country_breakdown" jsonb,
	"city_breakdown" jsonb,
	"continent_breakdown" jsonb,
	"referral_source_breakdown" jsonb,
	"referrer_breakdown" jsonb,
	"page_breakdown" jsonb,
	"event_breakdown" jsonb,
	"extra" jsonb
);
--> statement-breakpoint
CREATE TABLE "analytics_monthly" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatbot_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"total_sessions" integer DEFAULT 0 NOT NULL,
	"unique_visitors" integer DEFAULT 0 NOT NULL,
	"bounce_count" integer DEFAULT 0 NOT NULL,
	"engaged_count" integer DEFAULT 0 NOT NULL,
	"avg_session_duration_ms" integer,
	"total_chats_started" integer DEFAULT 0 NOT NULL,
	"total_messages" integer DEFAULT 0 NOT NULL,
	"country_breakdown" jsonb,
	"referral_source_breakdown" jsonb,
	"device_type_breakdown" jsonb
);
--> statement-breakpoint
CREATE TABLE "analytics_weekly" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatbot_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"week_end" date NOT NULL,
	"total_sessions" integer DEFAULT 0 NOT NULL,
	"unique_visitors" integer DEFAULT 0 NOT NULL,
	"bounce_count" integer DEFAULT 0 NOT NULL,
	"engaged_count" integer DEFAULT 0 NOT NULL,
	"avg_session_duration_ms" integer,
	"total_chats_started" integer DEFAULT 0 NOT NULL,
	"total_messages" integer DEFAULT 0 NOT NULL,
	"country_breakdown" jsonb,
	"referral_source_breakdown" jsonb,
	"device_type_breakdown" jsonb
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	"active_organization" text,
	"active_chatbot" uuid,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"external_id" text,
	"is_subscribed" boolean NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_conversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text DEFAULT 'New Conversation' NOT NULL,
	"chatbot_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"channel" varchar DEFAULT 'widget' NOT NULL,
	"visibility" varchar DEFAULT 'private' NOT NULL,
	"status" varchar DEFAULT 'opened' NOT NULL,
	"metadata" jsonb,
	"assigned_to" uuid,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "chat_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"chatbot_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" uuid,
	"role" varchar NOT NULL,
	"message_id" text NOT NULL,
	"content_text" text DEFAULT '' NOT NULL,
	"parts" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vote" (
	"chat_id" uuid NOT NULL,
	"message_id" text NOT NULL,
	"is_upvoted" boolean NOT NULL,
	"chatbot_id" uuid NOT NULL,
	CONSTRAINT "vote_chat_id_message_id_pk" PRIMARY KEY("chat_id","message_id")
);
--> statement-breakpoint
CREATE TABLE "chatbot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"image" text,
	"name" text,
	"primary_color" text DEFAULT '#6366f1' NOT NULL,
	"theme" text DEFAULT 'light' NOT NULL,
	"hide_powered_by" boolean DEFAULT false NOT NULL,
	"usecase" varchar DEFAULT 'support' NOT NULL,
	"initial_message" text DEFAULT 'Hi👋, What can I help you with?' NOT NULL,
	"suggested_messages" text[],
	"training_status" text DEFAULT 'idle',
	"last_trained_at" timestamp,
	"data_sources_count" integer DEFAULT 0 NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"embed_token" text,
	"allowed_domains" text[],
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "chatbot_embed_token_unique" UNIQUE("embed_token")
);
--> statement-breakpoint
CREATE TABLE "datasource_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"datasource_id" uuid NOT NULL,
	"chatbot_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"content_hash" text,
	"token_count" integer,
	"char_count" integer,
	"embedding" vector(1536),
	"embedding_model" text,
	"embedding_dimensions" integer,
	"last_embedded_at" timestamp,
	"extra_metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "datasources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatbot_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"source_type" varchar NOT NULL,
	"source_name" text NOT NULL,
	"ingest_status" varchar DEFAULT 'pending' NOT NULL,
	"times_referenced" integer DEFAULT 0 NOT NULL,
	"size_bytes" bigint,
	"file_name" text,
	"file_key" text,
	"file_hash" text,
	"mime_type" text,
	"url" text,
	"canonical_url" text,
	"domain" text,
	"question" text,
	"answer" text,
	"content_text" text DEFAULT '' NOT NULL,
	"content_hash" text,
	"language" text DEFAULT 'en',
	"token_count" integer,
	"char_count" integer,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"source_config" jsonb,
	"provider_payload" jsonb,
	"extra_metadata" jsonb,
	"error_code" text,
	"error_message" text,
	"last_error_at" timestamp,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	"external_customer_id" uuid,
	"max_chatbots" integer DEFAULT 1 NOT NULL,
	"max_members" integer DEFAULT 1 NOT NULL,
	"max_data_source_size" integer DEFAULT 52428800 NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organization_external_customer_id_unique" UNIQUE("external_customer_id")
);
--> statement-breakpoint
CREATE TABLE "visitor_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" text NOT NULL,
	"chatbot_id" uuid NOT NULL,
	"user_agent" text,
	"device_type" varchar DEFAULT 'unknown' NOT NULL,
	"os" text,
	"platform" text,
	"city" text,
	"region" text,
	"country" text,
	"country_code" text,
	"continent" text,
	"ip" text,
	"referrer" text,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"page_views" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer,
	"is_bounce" boolean DEFAULT false NOT NULL,
	"is_widget_active" boolean DEFAULT false NOT NULL,
	"extra" jsonb,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "visitor_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"chatbot_id" uuid NOT NULL,
	"visitor_id" text NOT NULL,
	"event" varchar NOT NULL,
	"conversation_id" uuid,
	"duration_ms" integer,
	"timestamp" timestamp NOT NULL,
	"extra" jsonb,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" text,
	"polar_subscription_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"external_id" text,
	"status" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"recurring_interval" text,
	"recurring_interval_count" integer,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"trial_start" timestamp,
	"trial_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp,
	"started_at" timestamp,
	"ends_at" timestamp,
	"ended_at" timestamp,
	"product_id" text,
	"checkout_id" text,
	"discount_id" text,
	"seats" integer,
	"meters" jsonb,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "subscription_polar_subscription_id_unique" UNIQUE("polar_subscription_id")
);
--> statement-breakpoint
ALTER TABLE "analytics_daily" ADD CONSTRAINT "analytics_daily_chatbot_id_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_monthly" ADD CONSTRAINT "analytics_monthly_chatbot_id_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_weekly" ADD CONSTRAINT "analytics_weekly_chatbot_id_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_active_chatbot_chatbot_id_fk" FOREIGN KEY ("active_chatbot") REFERENCES "public"."chatbot"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_conversation" ADD CONSTRAINT "chat_conversation_chatbot_id_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_conversation" ADD CONSTRAINT "chat_conversation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_conversation" ADD CONSTRAINT "chat_conversation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_conversation" ADD CONSTRAINT "chat_conversation_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_conversation_id_chat_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_chatbot_id_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_chatbot_id_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot" ADD CONSTRAINT "chatbot_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "datasource_chunks" ADD CONSTRAINT "datasource_chunks_datasource_id_datasources_id_fk" FOREIGN KEY ("datasource_id") REFERENCES "public"."datasources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "datasource_chunks" ADD CONSTRAINT "datasource_chunks_chatbot_id_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "datasource_chunks" ADD CONSTRAINT "datasource_chunks_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "datasources" ADD CONSTRAINT "datasources_chatbot_id_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "datasources" ADD CONSTRAINT "datasources_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_sessions" ADD CONSTRAINT "visitor_sessions_chatbot_id_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_events" ADD CONSTRAINT "visitor_events_session_id_visitor_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."visitor_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_events" ADD CONSTRAINT "visitor_events_chatbot_id_chatbot_id_fk" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_daily_chatbot_id_idx" ON "analytics_daily" USING btree ("chatbot_id");--> statement-breakpoint
CREATE INDEX "analytics_daily_date_idx" ON "analytics_daily" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_daily_chatbot_date_idx" ON "analytics_daily" USING btree ("chatbot_id","date");--> statement-breakpoint
CREATE INDEX "analytics_monthly_chatbot_id_idx" ON "analytics_monthly" USING btree ("chatbot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_monthly_chatbot_year_month_idx" ON "analytics_monthly" USING btree ("chatbot_id","year","month");--> statement-breakpoint
CREATE INDEX "analytics_weekly_chatbot_id_idx" ON "analytics_weekly" USING btree ("chatbot_id");--> statement-breakpoint
CREATE INDEX "analytics_weekly_week_start_idx" ON "analytics_weekly" USING btree ("week_start");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_weekly_chatbot_week_idx" ON "analytics_weekly" USING btree ("chatbot_id","week_start");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "chat_conversation_chatbot_id_idx" ON "chat_conversation" USING btree ("chatbot_id");--> statement-breakpoint
CREATE INDEX "chat_conversation_organization_id_idx" ON "chat_conversation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "chat_conversation_user_id_idx" ON "chat_conversation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_message_conversation_id_idx" ON "chat_message" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "chat_message_chatbot_id_idx" ON "chat_message" USING btree ("chatbot_id");--> statement-breakpoint
CREATE INDEX "chat_message_organization_id_idx" ON "chat_message" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "chat_message_user_id_idx" ON "chat_message" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_message_conversation_message_id_uidx" ON "chat_message" USING btree ("conversation_id","message_id");--> statement-breakpoint
CREATE INDEX "chatbot_organization_id_idx" ON "chatbot" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "datasource_chunks_datasource_id_idx" ON "datasource_chunks" USING btree ("datasource_id");--> statement-breakpoint
CREATE INDEX "datasource_chunks_chatbot_id_idx" ON "datasource_chunks" USING btree ("chatbot_id");--> statement-breakpoint
CREATE INDEX "datasource_chunks_organization_id_idx" ON "datasource_chunks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "datasource_chunks_embedding_cosine_idx" ON "datasource_chunks" USING ivfflat ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "datasource_chunks_datasource_chunk_index_uidx" ON "datasource_chunks" USING btree ("datasource_id","chunk_index");--> statement-breakpoint
CREATE INDEX "datasources_chatbot_id_idx" ON "datasources" USING btree ("chatbot_id");--> statement-breakpoint
CREATE INDEX "datasources_organization_id_idx" ON "datasources" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "datasources_ingest_status_idx" ON "datasources" USING btree ("ingest_status");--> statement-breakpoint
CREATE INDEX "datasources_source_type_idx" ON "datasources" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "datasources_last_synced_at_idx" ON "datasources" USING btree ("last_synced_at");--> statement-breakpoint
CREATE INDEX "datasources_fulltext_search_idx" ON "datasources" USING gin ((
        setweight(to_tsvector('simple', coalesce("source_name", '')), 'A') ||
        setweight(to_tsvector('simple', coalesce("question", '')), 'A') ||
        setweight(to_tsvector('simple', coalesce("answer", '')), 'A') ||
        setweight(to_tsvector('simple', coalesce("content_text", '')), 'B')
      ));--> statement-breakpoint
CREATE INDEX "member_organization_id_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_user_id_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "member_org_user_idx" ON "member" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "visitor_sessions_chatbot_id_idx" ON "visitor_sessions" USING btree ("chatbot_id");--> statement-breakpoint
CREATE INDEX "visitor_sessions_visitor_id_idx" ON "visitor_sessions" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "visitor_sessions_started_at_idx" ON "visitor_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "visitor_sessions_chatbot_started_idx" ON "visitor_sessions" USING btree ("chatbot_id","started_at");--> statement-breakpoint
CREATE INDEX "visitor_sessions_country_code_idx" ON "visitor_sessions" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "visitor_sessions_device_type_idx" ON "visitor_sessions" USING btree ("device_type");--> statement-breakpoint
CREATE INDEX "visitor_sessions_platform_idx" ON "visitor_sessions" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "visitor_sessions_os_idx" ON "visitor_sessions" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "visitor_sessions_ended_at_idx" ON "visitor_sessions" USING btree ("ended_at");--> statement-breakpoint
CREATE INDEX "visitor_events_session_id_idx" ON "visitor_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "visitor_events_chatbot_id_idx" ON "visitor_events" USING btree ("chatbot_id");--> statement-breakpoint
CREATE INDEX "visitor_events_visitor_id_idx" ON "visitor_events" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "visitor_events_event_idx" ON "visitor_events" USING btree ("event");--> statement-breakpoint
CREATE INDEX "visitor_events_timestamp_idx" ON "visitor_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "visitor_events_chatbot_event_timestamp_idx" ON "visitor_events" USING btree ("chatbot_id","event","timestamp");--> statement-breakpoint
CREATE INDEX "visitor_events_conversation_id_idx" ON "visitor_events" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "subscription_user_id_idx" ON "subscription" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscription_organization_id_idx" ON "subscription" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subscription_customer_id_idx" ON "subscription" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "subscription_status_idx" ON "subscription" USING btree ("status");