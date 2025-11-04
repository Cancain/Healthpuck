import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "path";

import * as schema from "./schema";

const url = process.env.DATABASE_URL as string;
const authToken = process.env.TURSO_AUTH_TOKEN as string | undefined;

const client = createClient({ url, authToken });
export const db = drizzle(client, { schema });

export const initializeDatabase = async () => {
  try {
    console.log("Running database migrations...");
    const migrationsFolder = path.resolve(__dirname, "./migrations");
    await migrate(db, { migrationsFolder });
    console.log("Database migrations completed successfully!");
  } catch (error) {
    console.error("Database migration failed:", error);
    if (process.env.NODE_ENV === "production") {
      console.error("Fatal: Migrations failed in production. Exiting...");
      process.exit(1);
    }
  }
};

export default db;
