import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) throw new Error("No Database URL");

export default defineConfig({
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  schema: "src/db/schema/*",
  out: "src/db/migrations",
  casing: "snake_case",
});
