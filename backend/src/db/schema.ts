import { sqliteTable, text, integer, unique, index } from "drizzle-orm/sqlite-core";

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

export const medicationCheckIns = sqliteTable(
  "medication_check_ins",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    medicationId: integer("medication_id")
      .notNull()
      .references(() => medications.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["taken", "skipped", "missed"] })
      .notNull()
      .default("taken"),
    scheduledFor: integer("scheduled_for", { mode: "timestamp" }),
    takenAt: integer("taken_at", { mode: "timestamp" }).notNull(),
    notes: text("notes"),
    recordedByUserId: integer("recorded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    patientDateIdx: index("medication_check_ins_patient_date_idx").on(
      table.patientId,
      table.takenAt,
    ),
    medicationDateIdx: index("medication_check_ins_medication_date_idx").on(
      table.medicationId,
      table.takenAt,
    ),
  }),
);

export const whoopConnections = sqliteTable(
  "whoop_connections",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    whoopUserId: text("whoop_user_id").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token").notNull(),
    tokenType: text("token_type"),
    scope: text("scope"),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
    connectedByUserId: integer("connected_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    uniquePatient: unique().on(table.patientId),
    uniqueWhoopUser: unique().on(table.whoopUserId),
  }),
);

export const alerts = sqliteTable("alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  metricType: text("metric_type", { enum: ["whoop", "medication"] }).notNull(),
  metricPath: text("metric_path").notNull(),
  operator: text("operator", { enum: ["<", ">", "=", "<=", ">="] }).notNull(),
  thresholdValue: text("threshold_value").notNull(),
  priority: text("priority", { enum: ["high", "mid", "low"] }).notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const heartRateReadings = sqliteTable(
  "heart_rate_readings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    heartRate: integer("heart_rate").notNull(),
    source: text("source", { enum: ["bluetooth", "api"] }).notNull(),
    timestamp: integer("timestamp", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    patientTimestampIdx: index("heart_rate_readings_patient_timestamp_idx").on(
      table.patientId,
      table.timestamp,
    ),
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
export type MedicationCheckIn = typeof medicationCheckIns.$inferSelect;
export type NewMedicationCheckIn = typeof medicationCheckIns.$inferInsert;
export type WhoopConnection = typeof whoopConnections.$inferSelect;
export type NewWhoopConnection = typeof whoopConnections.$inferInsert;
export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
export type HeartRateReading = typeof heartRateReadings.$inferSelect;
export type NewHeartRateReading = typeof heartRateReadings.$inferInsert;
