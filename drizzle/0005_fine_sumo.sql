CREATE TABLE `podcast_highlights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_id` int NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(256),
	`description` text,
	`start_time` int NOT NULL,
	`end_time` int NOT NULL,
	`duration` int NOT NULL,
	`audio_url` text,
	`audio_file_key` text,
	`transcript` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `podcast_highlights_id` PRIMARY KEY(`id`)
);
