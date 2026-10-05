CREATE TABLE `game_saves` (
	`user_id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`write_id` text NOT NULL,
	`updated_at` text NOT NULL
);
