CREATE TABLE `patients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`date_of_birth` integer,
	`created_by` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `patient_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`role` text NOT NULL,
	`invited_at` integer NOT NULL,
	`accepted_at` integer,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `patient_users_patient_id_user_id_unique` ON `patient_users` (`patient_id`,`user_id`);
--> statement-breakpoint
CREATE TABLE `medications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`name` text NOT NULL,
	`dosage` text NOT NULL,
	`frequency` text NOT NULL,
	`notes` text,
	`created_by` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `medication_intakes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`medication_id` integer NOT NULL,
	`date` integer NOT NULL,
	`taken` integer DEFAULT 0 NOT NULL,
	`taken_at` integer,
	`taken_by` integer,
	FOREIGN KEY (`medication_id`) REFERENCES `medications`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`taken_by`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `medication_intakes_medication_id_date_unique` ON `medication_intakes` (`medication_id`,`date`);

