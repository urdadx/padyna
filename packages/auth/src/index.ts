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
import { chatbot, session, user } from "@padyna/db/schema/index";
import { polarClient } from "./lib/payments";
import { eq } from "drizzle-orm";
import { polar, portal } from "@polar-sh/better-auth";

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
        before: async (sessionData) => {
          try {
            const activeOrganization = await getActiveOrganization(sessionData.userId);
            const activeChatbot = await getActiveChatbot(sessionData.userId, activeOrganization);

            return {
              data: {
                ...sessionData,
                activeOrganization,
                activeChatbot,
              },
            };
          } catch (error) {
            console.error("Failed to resolve active organization/chatbot for user:", {
              userId: sessionData.userId,
              error,
            });
          }
          return {
            data: {
              ...sessionData,
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
          try {
            const embedToken = `pd_${nanoid(16)}`;

            const [createdChatbot] = await db
              .insert(chatbot)
              .values({
                organizationId: organization.id,
                name: `${organization.name} AI Agent`,
                image: organization.logo,
                embedToken,
              })
              .returning();

            const activeChatbotId = createdChatbot?.id || null;

            await db
              .update(session)
              .set({
                activeChatbot: activeChatbotId,
                activeOrganization: organization.id,
                updatedAt: new Date(),
              })
              .where(eq(session.userId, user.id));
          } catch (error) {
            console.error("Failed to create default chatbot for organization:", {
              organizationId: organization.id,
              error,
            });
          }
        },
      },
    }),
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [portal()],
      getCustomerCreateParams: async ({ user: newUser }) => {
        try {
          const { result: existingCustomers } = await polarClient.customers.list({
            email: newUser.email,
          });

          const existingCustomer = existingCustomers.items[0];

          const userId = newUser.id;
          if (existingCustomer?.externalId && userId && existingCustomer.externalId !== userId) {
            await db
              .update(user)
              .set({ id: existingCustomer.externalId })
              .where(eq(user.id, userId));
          }

          return {};
        } catch (error) {
          console.error("Error in getCustomerCreateParams:", error);
          return {};
        }
      },
    }),
  ],
});
