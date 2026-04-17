import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

// In Docker/Dokploy, variables are injected into the environment.
// Only look for the local .env file if DATABASE_URL isn't already set.
if (!process.env.DATABASE_URL) {
  dotenv.config({
    path: "../../apps/server/.env",
  });
}

export default defineConfig({
  // FIX: Added recursive glob to catch all exported files
  schema: "./src/schema/**/*.ts",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
