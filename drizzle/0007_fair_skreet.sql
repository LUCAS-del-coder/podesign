CREATE TABLE `avatar_video_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`task_id` int,
	`highlight_id` int,
	`kling_task_id` varchar(128),
	`status` enum('pending','submitted','processing','succeed','failed') NOT NULL DEFAULT 'pending',
	`avatar_image_url` text NOT NULL,
	`audio_url` text NOT NULL,
	`mode` enum('std','pro') NOT NULL DEFAULT 'std',
	`video_url` text,
	`duration` int,
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `avatar_video_tasks_id` PRIMARY KEY(`id`)
);
