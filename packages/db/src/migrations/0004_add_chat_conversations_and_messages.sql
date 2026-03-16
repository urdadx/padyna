CREATE TABLE "chat_conversation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chatbot_id" uuid NOT NULL,
  "organization_id" text NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "chat_conversation_chatbot_id_chatbot_id_fk"
    FOREIGN KEY ("chatbot_id")
    REFERENCES "public"."chatbot"("id")
    ON DELETE cascade,
  CONSTRAINT "chat_conversation_organization_id_organization_id_fk"
    FOREIGN KEY ("organization_id")
    REFERENCES "public"."organization"("id")
    ON DELETE cascade,
  CONSTRAINT "chat_conversation_user_id_user_id_fk"
    FOREIGN KEY ("user_id")
    REFERENCES "public"."user"("id")
    ON DELETE cascade
);

CREATE INDEX "chat_conversation_chatbot_id_idx"
  ON "chat_conversation" USING btree ("chatbot_id");
CREATE INDEX "chat_conversation_organization_id_idx"
  ON "chat_conversation" USING btree ("organization_id");
CREATE INDEX "chat_conversation_user_id_idx"
  ON "chat_conversation" USING btree ("user_id");
CREATE UNIQUE INDEX "chat_conversation_chatbot_org_user_uidx"
  ON "chat_conversation" USING btree ("chatbot_id", "organization_id", "user_id");

CREATE TABLE "chat_message" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL,
  "chatbot_id" uuid NOT NULL,
  "organization_id" text NOT NULL,
  "user_id" uuid NOT NULL,
  "role" varchar(9) NOT NULL,
  "message_id" text NOT NULL,
  "content_text" text DEFAULT '' NOT NULL,
  "parts" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "chat_message_conversation_id_chat_conversation_id_fk"
    FOREIGN KEY ("conversation_id")
    REFERENCES "public"."chat_conversation"("id")
    ON DELETE cascade,
  CONSTRAINT "chat_message_chatbot_id_chatbot_id_fk"
    FOREIGN KEY ("chatbot_id")
    REFERENCES "public"."chatbot"("id")
    ON DELETE cascade,
  CONSTRAINT "chat_message_organization_id_organization_id_fk"
    FOREIGN KEY ("organization_id")
    REFERENCES "public"."organization"("id")
    ON DELETE cascade,
  CONSTRAINT "chat_message_user_id_user_id_fk"
    FOREIGN KEY ("user_id")
    REFERENCES "public"."user"("id")
    ON DELETE cascade,
  CONSTRAINT "chat_message_role_chk"
    CHECK ("role" IN ('user', 'assistant', 'system'))
);

CREATE INDEX "chat_message_conversation_id_idx"
  ON "chat_message" USING btree ("conversation_id");
CREATE INDEX "chat_message_chatbot_id_idx"
  ON "chat_message" USING btree ("chatbot_id");
CREATE INDEX "chat_message_organization_id_idx"
  ON "chat_message" USING btree ("organization_id");
CREATE INDEX "chat_message_user_id_idx"
  ON "chat_message" USING btree ("user_id");
CREATE UNIQUE INDEX "chat_message_conversation_message_id_uidx"
  ON "chat_message" USING btree ("conversation_id", "message_id");
