import { db } from "@padyna/db";
import * as schema from "@padyna/db/schema/index";
import { env } from "@padyna/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { v4 as uuidv4 } from "uuid";
import { nanoid } from "nanoid";
import { getActiveOrganization } from "@padyna/db/get-active-organization";
import { getActiveChatbot } from "@padyna/db/get-active-chatbot";
import { setActiveSessionContext } from "@padyna/db/set-active-session-context";
import { chatbot } from "@padyna/db/schema/index";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),

  user: {
    additionalFields: {
      isSubscribed: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  session: {
    additionalFields: {
      activeOrganization: {
        type: "string",
        required: false,
        defaultValue: null,
        input: false,
      },
      activeChatbot: {
        type: "string",
        required: false,
        defaultValue: null,
        input: false,
      },
    },
  },
  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
    database: {
      generateId: () => uuidv4(),
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          try {
            const activeOrganization = await getActiveOrganization(session.userId);
            const activeChatbot = await getActiveChatbot(session.userId, activeOrganization);

            return {
              data: {
                ...session,
                activeOrganization,
                activeChatbot,
              },
            };
          } catch (error) {
            console.error("Failed to resolve active organization/chatbot for user:", {
              userId: session.userId,
              error,
            });
          }
          return {
            data: {
              ...session,
              activeOrganization: null,
              activeChatbot: null,
            },
          };
        },
      },
    },
  },
  plugins: [
    organization({
      organizationHooks: {
        afterCreateOrganization: async ({ organization, user }) => {
          const embedToken = `pd_${nanoid(12)}`;

          const [createdChatbot] = await db
            .insert(chatbot)
            .values({
              organizationId: organization.id,
              name: organization.name,
              image: organization.logo,
              embedToken,
            })
            .returning({ id: chatbot.id });

          if (user.id && createdChatbot?.id) {
            await setActiveSessionContext(user.id, {
              activeOrganization: organization.id,
              activeChatbot: createdChatbot.id,
            });
          }
        },
      },
    }),
  ],
});
