CREATE TABLE `discord_orders` (
	`id` varchar(32) NOT NULL,
	`discordId` varchar(64) NOT NULL,
	`discordName` varchar(255) NOT NULL,
	`plan` varchar(16) NOT NULL,
	`planName` varchar(80) NOT NULL,
	`amountCents` int NOT NULL,
	`status` enum('pending','approved') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`approvedAt` timestamp,
	`notifiedAt` timestamp,
	CONSTRAINT `discord_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `discord_orders_discord_id_idx` ON `discord_orders` (`discordId`);