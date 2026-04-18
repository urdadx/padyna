import { env } from "@padyna/env/web";
import { Polar } from "@polar-sh/sdk";

export const polarClient = new Polar({
  accessToken: env.VITE_POLAR_ACCESS_TOKEN,
  server: env.VITE_POLAR_SERVER,
});
