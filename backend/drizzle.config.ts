import type { Config } from "drizzle-kit";
import * as path from "path";

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: path.join(__dirname, "database.db"),
  },
} satisfies Config;
