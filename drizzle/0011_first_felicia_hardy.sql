ALTER TABLE `avatar_video_tasks` ADD `api_video_id` varchar(128);--> statement-breakpoint
ALTER TABLE `avatar_video_tasks` ADD `thumbnail_url` text;--> statement-breakpoint
ALTER TABLE `avatar_video_tasks` DROP COLUMN `kling_task_id`;--> statement-breakpoint
ALTER TABLE `avatar_video_tasks` DROP COLUMN `video_id`;