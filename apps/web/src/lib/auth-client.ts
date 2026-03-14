import { inferAdditionalFields, organizationClient } from "better-auth/client/plugins";
import { env } from "@padyna/env/web";
import { polarClient } from "@polar-sh/better-auth";
import { createAuthClient } from "better-auth/react";
import type { auth } from "@padyna/auth";

export const authClient = createAuthClient({
  baseURL: env.VITE_SERVER_URL,
  plugins: [polarClient(), organizationClient(), inferAdditionalFields<typeof auth>()],
});

export const { useSession, signIn, signUp, signOut, checkout, resetPassword } = authClient;
