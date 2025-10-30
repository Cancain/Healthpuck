import { Database } from "bun:sqlite";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import * as path from "path";

import * as schema from "./schema";

const databasePath = process.env.DATABASE_PATH || "./database.db";
const dbPath = path.isAbsolute(databasePath)
  ? databasePath
  : path.join(__dirname, "..", "..", databasePath);

const sqlite = new Database(dbPath);
sqlite.run("PRAGMA foreign_keys = ON");

export const db: BunSQLiteDatabase<typeof schema> = drizzle(sqlite, { schema });

export const initializeDatabase = () => {
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
};

export default db;
