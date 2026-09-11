import { env } from "@padyna/env/web";
import { HTTPClient, Polar } from "@polar-sh/sdk";

const httpClient = new HTTPClient();
httpClient.addHook("beforeRequest", (request) => {
  request.headers.set("Polar-Version", "2026-04");
  return request;
});

export const polarClient = new Polar({
  accessToken: env.VITE_POLAR_ACCESS_TOKEN,
  server: env.VITE_POLAR_SERVER,
  httpClient,
});
