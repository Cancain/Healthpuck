CREATE TABLE `alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`created_by` integer NOT NULL,
	`name` text NOT NULL,
	`metric_type` text NOT NULL,
	`metric_path` text NOT NULL,
	`operator` text NOT NULL,
	`threshold_value` text NOT NULL,
	`priority` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);
