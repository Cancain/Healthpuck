import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

const url = process.env.DATABASE_URL as string;
const authToken = process.env.TURSO_AUTH_TOKEN as string | undefined;

const client = createClient({ url, authToken });
export const db = drizzle(client, { schema });

export const initializeDatabase = () => {
  // LibSQL/Turso: schema is managed via migrations; no local DDL here.
};

export default db;
