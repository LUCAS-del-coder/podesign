CREATE TABLE `podcast_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`youtube_url` varchar(512) NOT NULL,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`audio_url` text,
	`audio_file_key` text,
	`transcription` text,
	`summary` text,
	`podcast_script` text,
	`generated_audio_url` text,
	`generated_audio_file_key` text,
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `podcast_tasks_id` PRIMARY KEY(`id`)
);
