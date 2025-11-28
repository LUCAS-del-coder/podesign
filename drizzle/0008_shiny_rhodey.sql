CREATE TABLE `video_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`task_id` int,
	`highlight_id` int,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`audio_url` text NOT NULL,
	`title` varchar(512),
	`video_url` text,
	`video_file_key` text,
	`duration` int,
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `video_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `avatar_video_tasks`;