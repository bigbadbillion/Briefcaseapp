import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

loadEnv({ path: ".env.local" });
loadEnv();

function resolveDatabaseUrl(): string {
  const password = process.env.SUPABASE_DB_PASSWORD;
  const projectRef = process.env.SUPABASE_PROJECT_REF ?? "yqzdgucrfwpjszxyhbjv";
  let url = process.env.DATABASE_URL;

  if (
    password &&
    (!url || url.includes("REPLACE_ME") || url.includes("[YOUR-PASSWORD]"))
  ) {
    // Session pooler (5432) — IPv4-friendly on networks without IPv6 direct DB access
    url = `postgresql://postgres.${projectRef}:${password}@aws-1-us-east-2.pooler.supabase.com:5432/postgres`;
  }

  if (!url) {
    throw new Error(
      "Set SUPABASE_DB_PASSWORD in .env.local (DATABASE_URL is built from it automatically).",
    );
  }

  return url;
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: resolveDatabaseUrl(),
  },
});
