import { db } from "./index";
import { sql, eq, and } from "drizzle-orm";
import {
  patients,
  patientUsers,
  users,
  organisations,
  organisationUsers,
  caretakers,
} from "./schema";

async function migrateData() {
  console.log("Starting data migration for organisations...");

  try {
    const now = new Date();
    const timestamp = Math.floor(now.getTime());

    const allPatients = await db.select().from(patients);
    console.log(`Found ${allPatients.length} patients to migrate`);

    const createdByMap = new Map<number, number>();

    for (const patient of allPatients) {
      if (!patient.createdBy) continue;

      if (!createdByMap.has(patient.createdBy)) {
        const creator = await db
          .select()
          .from(users)
          .where(eq(users.id, patient.createdBy))
          .limit(1);

        if (creator.length === 0) {
          console.warn(`Creator user ${patient.createdBy} not found for patient ${patient.id}, skipping`);
          continue;
        }

        const orgName = `${creator[0].name}'s Organisation`;
        const [newOrg] = await db
          .insert(organisations)
          .values({
            name: orgName,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        createdByMap.set(patient.createdBy, newOrg.id);

        await db.insert(organisationUsers).values({
          organisationId: newOrg.id,
          userId: patient.createdBy,
        });

        console.log(`Created organisation "${orgName}" (ID: ${newOrg.id}) for user ${patient.createdBy}`);
      }

      const organisationId = createdByMap.get(patient.createdBy)!;

      const patientUserLink = await db
        .select()
        .from(patientUsers)
        .where(
          and(
            eq(patientUsers.patientId, patient.id),
            eq(patientUsers.role, "patient"),
          ),
        )
        .limit(1);

      const userId = patientUserLink.length > 0 ? patientUserLink[0].userId : null;

      await db
        .update(patients)
        .set({
          organisationId,
          userId,
        })
        .where(eq(patients.id, patient.id));

      console.log(
        `Updated patient ${patient.id}: organisationId=${organisationId}, userId=${userId || "null"}`,
      );
    }

    const caregiverLinks = await db
      .select()
      .from(patientUsers)
      .where(eq(patientUsers.role, "caregiver"));

    console.log(`Found ${caregiverLinks.length} caregiver links to migrate`);

    for (const link of caregiverLinks) {
      const patient = await db
        .select()
        .from(patients)
        .where(eq(patients.id, link.patientId))
        .limit(1);

      if (patient.length === 0) {
        console.warn(
          `Patient ${link.patientId} not found, skipping caregiver ${link.userId}`,
        );
        continue;
      }

      if (!patient[0].organisationId) {
        console.warn(
          `Patient ${link.patientId} has no organisation yet, skipping caregiver ${link.userId}. This may be normal if migration is in progress.`,
        );
        continue;
      }

      const existingCaretaker = await db
        .select()
        .from(caretakers)
        .where(eq(caretakers.userId, link.userId))
        .limit(1);

      if (existingCaretaker.length === 0) {
        await db.insert(caretakers).values({
          userId: link.userId,
          organisationId: patient[0].organisationId,
          createdAt: now,
          updatedAt: now,
        });

        const orgUserExists = await db
          .select()
          .from(organisationUsers)
          .where(
            and(
              eq(organisationUsers.organisationId, patient[0].organisationId!),
              eq(organisationUsers.userId, link.userId),
            ),
          )
          .limit(1);

        if (orgUserExists.length === 0) {
          await db.insert(organisationUsers).values({
            organisationId: patient[0].organisationId,
            userId: link.userId,
          });
        }

        console.log(
          `Created caretaker entry for user ${link.userId} in organisation ${patient[0].organisationId}`,
        );
      }
    }

    console.log("Data migration completed successfully!");

    const patientsWithoutOrg = await db
      .select()
      .from(patients)
      .where(sql`${patients.organisationId} IS NULL`);

    if (patientsWithoutOrg.length > 0) {
      console.warn(
        `WARNING: ${patientsWithoutOrg.length} patients still have null organisationId. These may need manual assignment.`,
      );
    }

    const patientsWithoutUser = await db
      .select()
      .from(patients)
      .where(sql`${patients.userId} IS NULL`);

    if (patientsWithoutUser.length > 0) {
      console.warn(
        `WARNING: ${patientsWithoutUser.length} patients still have null userId. These may need manual assignment.`,
      );
    }
  } catch (error) {
    console.error("Data migration failed:", error);
    throw error;
  }
}

if (require.main === module) {
  migrateData()
    .then(() => {
      console.log("Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration script failed:", error);
      process.exit(1);
    });
}

export { migrateData };
