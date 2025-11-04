import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { sql } from "drizzle-orm";
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

    // Check what migrations Drizzle thinks have been applied
    try {
      const appliedMigrations = await db.all(
        sql`SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at`,
      );
      console.log("Previously applied migrations:", appliedMigrations);
    } catch (err) {
      console.log("No migration tracking table found yet (first run)");
    }

    await migrate(db, { migrationsFolder });
    console.log("Database migrations completed successfully!");

    // Verify critical tables exist
    const requiredTables = [
      "users",
      "patients",
      "patient_users",
      "medications",
      "medication_intakes",
    ];
    const missingTables: string[] = [];

    for (const tableName of requiredTables) {
      try {
        const result = await db.all(
          sql`SELECT name FROM sqlite_master WHERE type='table' AND name=${tableName}`,
        );
        if (result.length === 0) {
          missingTables.push(tableName);
        } else {
          console.log(`✓ Table '${tableName}' exists`);
        }
      } catch (err) {
        console.error(`Error checking table ${tableName}:`, err);
        missingTables.push(tableName);
      }
    }

    if (missingTables.length > 0) {
      throw new Error(
        `Migrations reported success but required tables are missing: ${missingTables.join(", ")}. ` +
          `This indicates migrations were not actually executed. Please check the __drizzle_migrations table.`,
      );
    }

    console.log("✓ All required tables verified!");
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
