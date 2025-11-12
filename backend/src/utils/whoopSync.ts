import { eq } from "drizzle-orm";

import { db } from "../db";
import { whoopConnections } from "../db/schema";
import { WhoopClient } from "./whoopClient";

type SyncOptions = {
  forceRefresh?: boolean;
};

/**
 * Placeholder for future background syncing of Whoop data.
 * Currently validates connectivity and returns the profile payload.
 */
export async function syncWhoopDataForPatient(patientId: number, options: SyncOptions = {}) {
  const [connection] = await db
    .select()
    .from(whoopConnections)
    .where(eq(whoopConnections.patientId, patientId))
    .limit(1);

  if (!connection) {
    throw new Error("No Whoop connection found for patient");
  }

  const client = WhoopClient.create();

  let accessToken = connection.accessToken;
  let refreshToken = connection.refreshToken;
  let expiresAt = connection.expiresAt;
  let refreshTokenExpiresAt = connection.refreshTokenExpiresAt;

  if (options.forceRefresh || !expiresAt || expiresAt.getTime() <= Date.now()) {
    const refreshed = await client.refreshTokens(refreshToken);
    accessToken = refreshed.accessToken;
    refreshToken = refreshed.refreshToken;
    expiresAt = refreshed.expiresAt;
    refreshTokenExpiresAt = refreshed.refreshTokenExpiresAt ?? null;

    await db
      .update(whoopConnections)
      .set({
        accessToken,
        refreshToken,
        expiresAt,
        refreshTokenExpiresAt,
        tokenType: refreshed.tokenType,
        scope: refreshed.scope,
        updatedAt: new Date(),
      })
      .where(eq(whoopConnections.id, connection.id));
  }

  const profile = await client.fetchProfile(accessToken);

  await db
    .update(whoopConnections)
    .set({
      whoopUserId: String(profile.user_id ?? connection.whoopUserId),
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(whoopConnections.id, connection.id));

  return {
    profile,
    tokens: {
      accessToken,
      refreshToken,
      expiresAt,
      refreshTokenExpiresAt,
    },
  };
}
