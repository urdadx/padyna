import { env } from "@padyna/env/server";
import { HTTPClient, Polar } from "@polar-sh/sdk";

const httpClient = new HTTPClient();
httpClient.addHook("beforeRequest", (request) => {
  request.headers.set("Polar-Version", "2026-04");
  return request;
});

export const polarClient = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: env.POLAR_SERVER,
  httpClient,
});
