CREATE TABLE `whoop_connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`whoop_user_id` text NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`token_type` text,
	`scope` text,
	`expires_at` integer NOT NULL,
	`refresh_token_expires_at` integer,
	`last_synced_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `whoop_connections_user_id_unique` ON `whoop_connections` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `whoop_connections_whoop_user_id_unique` ON `whoop_connections` (`whoop_user_id`);

