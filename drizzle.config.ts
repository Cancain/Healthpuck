import type { Config } from "drizzle-kit";
import * as path from "path";

export default {
  schema: "./backend/src/db/schema.ts",
  out: "./backend/src/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: path.join(__dirname, "backend", "database.db"),
  },
} satisfies Config;
