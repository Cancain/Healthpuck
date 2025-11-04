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
    console.log(`Migrations folder path: ${migrationsFolder}`);

    // Check if migrations folder exists
    const fs = await import("fs");
    if (!fs.existsSync(migrationsFolder)) {
      throw new Error(`Migrations folder does not exist at: ${migrationsFolder}`);
    }

    const migrationFiles = fs.readdirSync(migrationsFolder, { recursive: true });
    console.log(`Found migration files:`, migrationFiles);

    await migrate(db, { migrationsFolder });
    console.log("Database migrations completed successfully!");
  } catch (error) {
    console.error("Database migration failed:", error);
    if (error instanceof Error) {
      console.error("Migration error details:", {
        message: error.message,
        stack: error.stack,
      });
    }
    if (process.env.NODE_ENV === "production") {
      console.error("Fatal: Migrations failed in production. Exiting...");
      process.exit(1);
    } else {
      throw error;
    }
  }
};

export default db;
