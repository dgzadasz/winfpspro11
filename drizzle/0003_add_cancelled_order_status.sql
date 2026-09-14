ALTER TABLE `discord_orders` MODIFY COLUMN `status` enum('pending','approved','cancelled') NOT NULL DEFAULT 'pending';
