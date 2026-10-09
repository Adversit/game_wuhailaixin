CREATE TABLE `game_saves` (
	`user_id` text PRIMARY KEY NOT NULL,
	`state_json` text NOT NULL,
	`revision` integer NOT NULL,
	`operation_id` text NOT NULL,
	`updated_at` text NOT NULL
);
