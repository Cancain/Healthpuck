import { eq } from "drizzle-orm";

import db from "../db";
import { patientUsers, patients } from "../db/schema";

export type PatientContext = {
  patientId: number;
  patientName: string;
  role: "patient" | "caregiver";
};

export async function getPatientContextForUser(userId: number): Promise<PatientContext> {
  const result = await db
    .select({
      patientId: patientUsers.patientId,
      patientName: patients.name,
      role: patientUsers.role,
    })
    .from(patientUsers)
    .innerJoin(patients, eq(patientUsers.patientId, patients.id))
    .where(eq(patientUsers.userId, userId))
    .limit(1);

  if (result.length === 0) {
    throw new Error("User is not associated with a patient");
  }

  return result[0];
}

export async function assertUserHasAccessToPatient(userId: number, patientId: number) {
  const context = await getPatientContextForUser(userId);
  if (context.patientId !== patientId) {
    throw new Error("User does not have access to this patient");
  }
}
