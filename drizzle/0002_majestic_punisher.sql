ALTER TABLE `podcast_tasks` ADD `listen_hub_episode_id` varchar(64);--> statement-breakpoint
ALTER TABLE `podcast_tasks` ADD `podcast_audio_url` text;--> statement-breakpoint
ALTER TABLE `podcast_tasks` ADD `podcast_title` text;--> statement-breakpoint
ALTER TABLE `podcast_tasks` ADD `podcast_scripts` text;--> statement-breakpoint
ALTER TABLE `podcast_tasks` DROP COLUMN `generated_audio_url`;--> statement-breakpoint
ALTER TABLE `podcast_tasks` DROP COLUMN `generated_audio_file_key`;