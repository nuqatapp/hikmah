CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`round` text NOT NULL,
	`user` text NOT NULL,
	`correct` integer NOT NULL,
	`answer` text NOT NULL,
	`elapsed` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`round`) REFERENCES `rounds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attempt_round_user` ON `attempts` (`round`,`user`);--> statement-breakpoint
CREATE INDEX `attempts_user_date` ON `attempts` (`user`,`created_at`);--> statement-breakpoint
CREATE TABLE `content` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`locale` text NOT NULL,
	`prompt` text NOT NULL,
	`answer` text NOT NULL,
	`choices` text DEFAULT '[]' NOT NULL,
	`clues` text DEFAULT '[]' NOT NULL,
	`explanation` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `content_kind_locale` ON `content` (`kind`,`locale`,`active`);--> statement-breakpoint
CREATE TABLE `members` (
	`room` text NOT NULL,
	`user` text NOT NULL,
	`joined_at` integer NOT NULL,
	`last_seen` integer NOT NULL,
	`left_at` integer,
	PRIMARY KEY(`room`, `user`),
	FOREIGN KEY (`room`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `members_user` ON `members` (`user`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`username` text,
	`country` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`age_group` text DEFAULT '' NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`avatar` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_username` ON `profiles` (`username`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text,
	`content_id` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reports_status` ON `reports` (`status`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`kind` text NOT NULL,
	`locale` text NOT NULL,
	`mode` text NOT NULL,
	`host` text NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`round` integer DEFAULT 0 NOT NULL,
	`total` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_code_unique` ON `rooms` (`code`);--> statement-breakpoint
CREATE INDEX `rooms_status_mode` ON `rooms` (`status`,`mode`);--> statement-breakpoint
CREATE TABLE `rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`room` text NOT NULL,
	`number` integer NOT NULL,
	`content_id` text NOT NULL,
	`snapshot` text NOT NULL,
	`started_at` integer,
	`ended_at` integer,
	`winner` text,
	`outcome` text,
	`nonce` text,
	FOREIGN KEY (`room`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rounds_room_number` ON `rounds` (`room`,`number`);--> statement-breakpoint
CREATE TABLE `site_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wallet` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`amount` integer NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `wallet_user` ON `wallet` (`user`);