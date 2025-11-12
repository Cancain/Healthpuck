ALTER TABLE `whoop_connections` RENAME TO `whoop_connections_old`;
--> statement-breakpoint
CREATE TABLE `whoop_connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`whoop_user_id` text NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`token_type` text,
	`scope` text,
	`expires_at` integer NOT NULL,
	`refresh_token_expires_at` integer,
	`last_synced_at` integer,
	`connected_by_user_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`connected_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
INSERT INTO `whoop_connections` (
	`patient_id`,
	`whoop_user_id`,
	`access_token`,
	`refresh_token`,
	`token_type`,
	`scope`,
	`expires_at`,
	`refresh_token_expires_at`,
	`last_synced_at`,
	`connected_by_user_id`,
	`created_at`,
	`updated_at`
)
SELECT
	COALESCE(
		(SELECT patient_id FROM patient_users WHERE user_id = wc.user_id AND role = 'patient' LIMIT 1),
		(SELECT patient_id FROM patient_users WHERE user_id = wc.user_id LIMIT 1)
	) AS patient_id,
	wc.whoop_user_id,
	wc.access_token,
	wc.refresh_token,
	wc.token_type,
	wc.scope,
	wc.expires_at,
	wc.refresh_token_expires_at,
	wc.last_synced_at,
	wc.user_id AS connected_by_user_id,
	wc.created_at,
	wc.updated_at
FROM `whoop_connections_old` wc
WHERE COALESCE(
	(SELECT patient_id FROM patient_users WHERE user_id = wc.user_id AND role = 'patient' LIMIT 1),
	(SELECT patient_id FROM patient_users WHERE user_id = wc.user_id LIMIT 1)
) IS NOT NULL;
--> statement-breakpoint
DROP TABLE `whoop_connections_old`;
--> statement-breakpoint
CREATE UNIQUE INDEX `whoop_connections_patient_id_unique` ON `whoop_connections` (`patient_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `whoop_connections_whoop_user_id_unique` ON `whoop_connections` (`whoop_user_id`);
