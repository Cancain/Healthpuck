import { Router, Request, Response } from "express";
import { eq, and, isNull, inArray } from "drizzle-orm";

import { db } from "../db";
import {
  organisations,
  caretakers,
  organisationUsers,
  users,
  patients as patientsTable,
  patientUsers,
  patientPanic,
} from "../db/schema";
import { getUserIdFromRequest, authenticate } from "../middleware/auth";
import {
  getOrganisationForCaretaker,
  getPatientsForOrganisation,
  isCaretaker,
} from "../utils/organisationContext";
import { hashPassword } from "../utils/hash";

const router = Router();

router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const isUserCaretaker = await isCaretaker(userId);
    if (isUserCaretaker) {
      return res.status(400).json({
        error: "User is already a caregiver. Use GET /api/organisations to view your organisation.",
      });
    }

    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const orgName = req.body.name || `${user[0].name}'s Organisation`;

    const [newOrg] = await db
      .insert(organisations)
      .values({
        name: orgName,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await db.insert(organisationUsers).values({
      organisationId: newOrg.id,
      userId: userId,
    });

    await db.insert(caretakers).values({
      userId: userId,
      organisationId: newOrg.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res.status(201).json({
      organisationId: newOrg.id,
      organisationName: newOrg.name,
    });
  } catch (error) {
    console.error("Error creating organisation:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const organisation = await getOrganisationForCaretaker(userId);
    if (!organisation) {
      return res.status(404).json({
        error: "No organisation found for this user",
        code: "NO_ORGANISATION",
      });
    }

    return res.json(organisation);
  } catch (error) {
    console.error("Error fetching organisation:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const isUserCaretaker = await isCaretaker(userId);
    if (!isUserCaretaker) {
      return res.status(403).json({ error: "Only caretakers can update organisation" });
    }

    const organisation = await getOrganisationForCaretaker(userId);
    if (!organisation) {
      return res.status(404).json({
        error: "No organisation found for this user",
        code: "NO_ORGANISATION",
      });
    }

    const name = req.body?.name;
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name is required and must be a non-empty string" });
    }

    await db
      .update(organisations)
      .set({ name: name.trim(), updatedAt: new Date() })
      .where(eq(organisations.id, organisation.organisationId));

    const [updated] = await db
      .select({ organisationId: organisations.id, organisationName: organisations.name })
      .from(organisations)
      .where(eq(organisations.id, organisation.organisationId))
      .limit(1);

    return res.json(updated);
  } catch (error) {
    console.error("Error updating organisation:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/caretakers", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const isUserCaretaker = await isCaretaker(userId);
    if (!isUserCaretaker) {
      return res.status(403).json({ error: "Only caretakers can access this endpoint" });
    }

    const organisation = await getOrganisationForCaretaker(userId);
    if (!organisation) {
      return res.status(404).json({
        error: "No organisation found for this user",
        code: "NO_ORGANISATION",
      });
    }

    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(caretakers)
      .innerJoin(users, eq(caretakers.userId, users.id))
      .where(eq(caretakers.organisationId, organisation.organisationId));

    return res.json(result);
  } catch (error) {
    console.error("Error fetching organisation caretakers:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/patients", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const isUserCaretaker = await isCaretaker(userId);
    if (!isUserCaretaker) {
      return res.status(403).json({ error: "Only caretakers can access this endpoint" });
    }

    const organisation = await getOrganisationForCaretaker(userId);
    if (!organisation) {
      return res.status(404).json({
        error: "No organisation found for this user",
        code: "NO_ORGANISATION",
      });
    }

    const patientList = await getPatientsForOrganisation(organisation.organisationId);
    const patientIds = patientList.map((p) => p.id);
    const activePanicPatientIds = new Set<number>();
    if (patientIds.length > 0) {
      const activePanics = await db
        .select({ patientId: patientPanic.patientId })
        .from(patientPanic)
        .where(
          and(inArray(patientPanic.patientId, patientIds), isNull(patientPanic.acknowledgedAt)),
        );
      activePanics.forEach((r) => activePanicPatientIds.add(r.patientId));
    }
    const result = patientList.map((p) => ({
      ...p,
      hasActivePanic: activePanicPatientIds.has(p.id),
    }));
    return res.json(result);
  } catch (error) {
    console.error("Error fetching organisation patients:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/patients", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const isUserCaretaker = await isCaretaker(userId);
    if (!isUserCaretaker) {
      return res.status(403).json({ error: "Only caretakers can access this endpoint" });
    }

    const organisationId = Number(req.params.id);
    if (isNaN(organisationId)) {
      return res.status(400).json({ error: "Invalid organisation ID" });
    }

    const userOrganisation = await getOrganisationForCaretaker(userId);
    if (!userOrganisation || userOrganisation.organisationId !== organisationId) {
      return res.status(403).json({ error: "Access denied to this organisation" });
    }

    const patientListById = await getPatientsForOrganisation(organisationId);
    const patientIdsById = patientListById.map((p) => p.id);
    const activePanicPatientIdsById = new Set<number>();
    if (patientIdsById.length > 0) {
      const activePanicsById = await db
        .select({ patientId: patientPanic.patientId })
        .from(patientPanic)
        .where(
          and(inArray(patientPanic.patientId, patientIdsById), isNull(patientPanic.acknowledgedAt)),
        );
      activePanicsById.forEach((r) => activePanicPatientIdsById.add(r.patientId));
    }
    const resultById = patientListById.map((p) => ({
      ...p,
      hasActivePanic: activePanicPatientIdsById.has(p.id),
    }));
    return res.json(resultById);
  } catch (error) {
    console.error("Error fetching organisation patients:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/invite-users", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const isUserCaretaker = await isCaretaker(userId);
    if (!isUserCaretaker) {
      return res.status(403).json({ error: "Only caretakers can invite users" });
    }

    const organisation = await getOrganisationForCaretaker(userId);
    if (!organisation) {
      return res.status(404).json({
        error: "No organisation found for this user",
        code: "NO_ORGANISATION",
      });
    }

    const { invites } = req.body as {
      invites?: Array<{
        email: string;
        name: string;
        password: string;
        role: "patient" | "caregiver";
      }>;
    };

    if (!invites || !Array.isArray(invites) || invites.length === 0) {
      return res.status(400).json({ error: "invites array is required and cannot be empty" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const created: Array<{ id: number; email: string; name: string }> = [];
    const errors: Array<{ email: string; error: string }> = [];

    for (const invite of invites) {
      if (!invite.email || !invite.name || !invite.password || !invite.role) {
        errors.push({
          email: invite.email || "unknown",
          error: "Missing required fields: email, name, password, and role are required",
        });
        continue;
      }

      if (!emailRegex.test(invite.email)) {
        errors.push({
          email: invite.email,
          error: "Invalid email format",
        });
        continue;
      }

      if (invite.password.length < 8) {
        errors.push({
          email: invite.email,
          error: "Password must be at least 8 characters long",
        });
        continue;
      }

      if (invite.role !== "patient" && invite.role !== "caregiver") {
        errors.push({
          email: invite.email,
          error: "Role must be 'patient' or 'caregiver'",
        });
        continue;
      }

      try {
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, invite.email))
          .limit(1);

        if (existingUser.length > 0) {
          errors.push({
            email: invite.email,
            error: "User with this email already exists",
          });
          continue;
        }

        const hashedPassword = await hashPassword(invite.password);
        const [newUser] = await db
          .insert(users)
          .values({
            email: invite.email,
            name: invite.name,
            password: hashedPassword,
          })
          .returning();

        await db.insert(organisationUsers).values({
          organisationId: organisation.organisationId,
          userId: newUser.id,
        });

        if (invite.role === "patient") {
          const [newPatient] = await db
            .insert(patientsTable)
            .values({
              name: invite.name,
              email: invite.email,
              createdBy: userId,
              organisationId: organisation.organisationId,
              userId: newUser.id,
            })
            .returning();

          await db.insert(patientUsers).values({
            patientId: newPatient.id,
            userId: newUser.id,
            role: "patient",
            acceptedAt: new Date(),
          });
        } else {
          await db.insert(caretakers).values({
            userId: newUser.id,
            organisationId: organisation.organisationId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        created.push({
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        });
      } catch (dbError: unknown) {
        const error = dbError as { code?: number; message?: string };
        if (
          error?.code === 19 ||
          error?.message?.includes("UNIQUE constraint") ||
          error?.message?.includes("unique constraint")
        ) {
          errors.push({
            email: invite.email,
            error: "User with this email already exists",
          });
        } else {
          console.error(`Error creating user for ${invite.email}:`, dbError);
          errors.push({
            email: invite.email,
            error: "Failed to create user account",
          });
        }
      }
    }

    return res.status(200).json({
      created,
      errors,
    });
  } catch (error) {
    console.error("Error inviting users:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
