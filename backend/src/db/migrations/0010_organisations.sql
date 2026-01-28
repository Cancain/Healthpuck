CREATE TABLE `organisations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `organisation_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organisation_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organisation_users_organisation_id_user_id_unique` ON `organisation_users` (`organisation_id`,`user_id`);
--> statement-breakpoint
CREATE TABLE `caretakers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`organisation_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `caretakers_user_id_unique` ON `caretakers` (`user_id`);
--> statement-breakpoint
ALTER TABLE `patients` ADD COLUMN `organisation_id` integer;
--> statement-breakpoint
ALTER TABLE `patients` ADD COLUMN `user_id` integer;
