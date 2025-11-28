CREATE TABLE `voice_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`host1_voice_id` varchar(64),
	`host2_voice_id` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `voice_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `voice_preferences_user_id_unique` UNIQUE(`user_id`)
);
