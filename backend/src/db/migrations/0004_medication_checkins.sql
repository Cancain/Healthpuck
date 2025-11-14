CREATE TABLE `medication_check_ins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`medication_id` integer NOT NULL,
	`status` text DEFAULT 'taken' NOT NULL,
	`scheduled_for` integer,
	`taken_at` integer NOT NULL,
	`notes` text,
	`recorded_by_user_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`medication_id`) REFERENCES `medications`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX `medication_check_ins_patient_date_idx` ON `medication_check_ins` (`patient_id`, `taken_at`);
--> statement-breakpoint
CREATE INDEX `medication_check_ins_medication_date_idx` ON `medication_check_ins` (`medication_id`, `taken_at`);
