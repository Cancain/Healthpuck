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
    let appliedMigrations: any[] = [];
    try {
      appliedMigrations = await db.all(
        sql`SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at`,
      );
      console.log("Previously applied migrations:", appliedMigrations);
    } catch (err) {
      console.log("No migration tracking table found yet (first run)");
    }

    // Read the migration journal to see what migrations should exist
    const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
    let expectedMigrations: string[] = [];
    if (fs.existsSync(journalPath)) {
      const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
      expectedMigrations = journal.entries.map((entry: any) => entry.tag);
      console.log("Expected migrations from journal:", expectedMigrations);
    }

    await migrate(db, { migrationsFolder });
    console.log("Database migrations completed successfully!");

    // Check if all expected migrations were applied
    const recheckApplied = await db.all(
      sql`SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at`,
    );
    console.log(
      `Migration check: ${appliedMigrations.length} -> ${recheckApplied.length} migrations recorded`,
    );

    // If migrations didn't run, try to manually execute them
    if (
      recheckApplied.length === appliedMigrations.length &&
      recheckApplied.length < expectedMigrations.length
    ) {
      console.warn(
        "WARNING: Migrations may not have executed. Attempting to manually apply missing migrations...",
      );

      // Try to manually execute the SQL files for missing migrations
      for (let i = 0; i < expectedMigrations.length; i++) {
        const migrationTag = expectedMigrations[i];
        // Skip if we already have at least i+1 migrations applied
        if (i < recheckApplied.length) {
          console.log(`Migration ${migrationTag} appears to be applied, skipping manual execution`);
          continue;
        }

        const migrationFile = path.join(migrationsFolder, `${migrationTag}.sql`);
        if (fs.existsSync(migrationFile)) {
          const migrationSQL = fs.readFileSync(migrationFile, "utf-8");
          // Split by statement-breakpoint comments and clean up
          const rawStatements = migrationSQL.split(/--> statement-breakpoint/);

          console.log(`Attempting to manually execute ${migrationTag}...`);
          for (const rawStatement of rawStatements) {
            // Clean up the statement: remove comments, trim whitespace
            const statement = rawStatement
              .split("\n")
              .filter((line) => {
                const trimmed = line.trim();
                return trimmed && !trimmed.startsWith("--");
              })
              .join("\n")
              .trim();

            if (statement) {
              try {
                await client.execute(statement);
                console.log(`✓ Executed statement from ${migrationTag}`);
              } catch (err: any) {
                // Ignore "already exists" errors - these are safe to skip
                const errorMsg = err?.message || String(err);
                if (
                  errorMsg.includes("already exists") ||
                  errorMsg.includes("duplicate") ||
                  errorMsg.includes("UNIQUE constraint") ||
                  errorMsg.includes("table already exists")
                ) {
                  console.log(
                    `  (Statement already applied, skipping: ${errorMsg.substring(0, 100)})`,
                  );
                } else {
                  console.error(`  Error executing statement:`, errorMsg);
                  // Don't throw - continue with other statements
                }
              }
            }
          }
          console.log(`Completed manual execution attempt for ${migrationTag}`);
        }
      }

      // Re-run migrate to update the migration tracking table
      console.log("Re-running migrate to update tracking table...");
      try {
        await migrate(db, { migrationsFolder });
      } catch (err) {
        console.log(
          "Note: migrate() may report errors if migrations were manually applied, this is expected",
        );
      }
    }

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
