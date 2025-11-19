CREATE TABLE `heart_rate_readings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`heart_rate` integer NOT NULL,
	`source` text NOT NULL,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `heart_rate_readings_patient_timestamp_idx` ON `heart_rate_readings` (`patient_id`,`timestamp`);

