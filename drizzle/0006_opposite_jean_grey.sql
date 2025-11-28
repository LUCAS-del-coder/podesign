ALTER TABLE `podcast_tasks` ADD `progress_stage` enum('queued','downloading','transcribing','analyzing','generating','completed','failed') DEFAULT 'queued';--> statement-breakpoint
ALTER TABLE `podcast_tasks` ADD `progress_percent` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `podcast_tasks` ADD `progress_message` text;--> statement-breakpoint
ALTER TABLE `podcast_tasks` ADD `estimated_time_remaining` int;