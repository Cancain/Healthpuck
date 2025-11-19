CREATE TABLE `dismissed_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`alert_id` integer NOT NULL,
	`patient_id` integer NOT NULL,
	`dismissed_at` integer NOT NULL,
	FOREIGN KEY (`alert_id`) REFERENCES `alerts`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `dismissed_alerts_alert_patient_idx` ON `dismissed_alerts` (`alert_id`,`patient_id`);

