CREATE TABLE `activation_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codeHash` varchar(128) NOT NULL,
	`plan` enum('PRO','BUSINESS') NOT NULL,
	`durationDays` int NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`usedBy` int,
	`status` enum('UNUSED','ACTIVE','EXPIRED','REVOKED') NOT NULL DEFAULT 'UNUSED',
	`note` text,
	CONSTRAINT `activation_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `activation_codes_codeHash_unique` UNIQUE(`codeHash`)
);
--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`keyHash` varchar(128) NOT NULL,
	`label` varchar(100),
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_keys_keyHash_unique` UNIQUE(`keyHash`)
);
--> statement-breakpoint
CREATE TABLE `app_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(100) NOT NULL,
	`settingValue` text NOT NULL,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_settings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`target` varchar(255) NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `change_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`username` varchar(30) NOT NULL,
	`type` varchar(64) NOT NULL,
	`beforeValue` text,
	`afterValue` text,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `change_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monitors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`profileId` int NOT NULL,
	`frequencyMinutes` int NOT NULL DEFAULT 1440,
	`active` boolean NOT NULL DEFAULT true,
	`nextRunAt` timestamp,
	`lastRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `monitors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`type` varchar(64) NOT NULL,
	`read` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`plan` varchar(32) NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'SAR',
	`status` varchar(32) NOT NULL DEFAULT 'PENDING',
	`paymentReference` varchar(255),
	`proofUrl` varchar(2048),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedBy` int,
	`reviewedAt` timestamp,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(30) NOT NULL,
	`userId` varchar(64),
	`displayName` text,
	`biography` text,
	`followers` int,
	`following` int,
	`postCount` int,
	`verified` boolean,
	`isPrivate` boolean,
	`profilePictureUrl` varchar(2048),
	`externalUrl` varchar(2048),
	`lastFetchedAt` timestamp,
	`provider` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `profiles_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`username` varchar(30) NOT NULL,
	`displayName` text,
	`biography` text,
	`followers` int,
	`following` int,
	`postCount` int,
	`verified` boolean,
	`isPrivate` boolean,
	`profilePictureUrl` varchar(2048),
	`externalUrl` varchar(2048),
	`provider` varchar(64),
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subscriptionId` int NOT NULL,
	`actorId` int,
	`action` varchar(64) NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscription_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`plan` enum('FREE','PRO','BUSINESS') NOT NULL DEFAULT 'FREE',
	`status` enum('ACTIVE','EXPIRED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	`activationCodeId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`url` varchar(2048) NOT NULL,
	`secret` varchar(128) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `disabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `changes_profile_time_idx` ON `change_events` (`profileId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `monitors_user_idx` ON `monitors` (`userId`);--> statement-breakpoint
CREATE INDEX `monitors_due_idx` ON `monitors` (`active`,`nextRunAt`);--> statement-breakpoint
CREATE INDEX `profiles_username_idx` ON `profiles` (`username`);--> statement-breakpoint
CREATE INDEX `snapshots_profile_time_idx` ON `snapshots` (`profileId`,`capturedAt`);--> statement-breakpoint
CREATE INDEX `subscriptions_user_idx` ON `subscriptions` (`userId`);