import { sqliteTable, text, integer, unique } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const patients = sqliteTable("patients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email"),
  dateOfBirth: integer("date_of_birth", { mode: "timestamp" }),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const patientUsers = sqliteTable(
  "patient_users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["patient", "caregiver"] }).notNull(),
    invitedAt: integer("invited_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    acceptedAt: integer("accepted_at", { mode: "timestamp" }),
  },
  (table) => ({
    uniquePatientUser: unique().on(table.patientId, table.userId),
  }),
);

export const medications = sqliteTable("medications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  notes: text("notes"),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const medicationIntakes = sqliteTable(
  "medication_intakes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    medicationId: integer("medication_id")
      .notNull()
      .references(() => medications.id, { onDelete: "cascade" }),
    date: integer("date", { mode: "timestamp" }).notNull(),
    taken: integer("taken", { mode: "boolean" }).notNull().default(false),
    takenAt: integer("taken_at", { mode: "timestamp" }),
    takenBy: integer("taken_by").references(() => users.id),
  },
  (table) => ({
    uniqueMedicationDate: unique().on(table.medicationId, table.date),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type PatientUser = typeof patientUsers.$inferSelect;
export type NewPatientUser = typeof patientUsers.$inferInsert;
export type Medication = typeof medications.$inferSelect;
export type NewMedication = typeof medications.$inferInsert;
export type MedicationIntake = typeof medicationIntakes.$inferSelect;
export type NewMedicationIntake = typeof medicationIntakes.$inferInsert;
