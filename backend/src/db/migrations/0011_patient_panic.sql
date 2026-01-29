CREATE TABLE `patient_panic` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`triggered_at` integer NOT NULL,
	`acknowledged_at` integer,
	`acknowledged_by_user_id` integer,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`acknowledged_by_user_id`) REFERENCES `users`(`id`)
);
