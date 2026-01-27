import { eq, and } from "drizzle-orm";
import db from "../db";
import {
  caretakers,
  organisations,
  organisationUsers,
  patients,
  patientUsers,
} from "../db/schema";

export type OrganisationContext = {
  organisationId: number;
  organisationName: string;
};

export async function getOrganisationForCaretaker(
  userId: number,
): Promise<OrganisationContext | null> {
  const result = await db
    .select({
      organisationId: caretakers.organisationId,
      organisationName: organisations.name,
    })
    .from(caretakers)
    .innerJoin(organisations, eq(caretakers.organisationId, organisations.id))
    .where(eq(caretakers.userId, userId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return {
    organisationId: result[0].organisationId,
    organisationName: result[0].organisationName,
  };
}

export async function getPatientsForOrganisation(
  organisationId: number,
): Promise<typeof patients.$inferSelect[]> {
  const result = await db
    .select()
    .from(patients)
    .where(eq(patients.organisationId, organisationId));

  return result;
}

export async function isCaretaker(userId: number): Promise<boolean> {
  const result = await db
    .select()
    .from(caretakers)
    .where(eq(caretakers.userId, userId))
    .limit(1);

  return result.length > 0;
}

export async function getCaretakerOrganisationId(
  userId: number,
): Promise<number | null> {
  const result = await db
    .select({ organisationId: caretakers.organisationId })
    .from(caretakers)
    .where(eq(caretakers.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0].organisationId : null;
}

export async function hasAccessToPatientViaOrganisation(
  userId: number,
  patientId: number,
): Promise<boolean> {
  const caretakerOrg = await getCaretakerOrganisationId(userId);
  if (!caretakerOrg) {
    return false;
  }

  const patient = await db
    .select({ organisationId: patients.organisationId })
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);

  if (patient.length === 0) {
    return false;
  }

  return patient[0].organisationId === caretakerOrg;
}
