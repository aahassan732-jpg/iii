CREATE TABLE "activation_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"codeHash" varchar(128) NOT NULL,
	"plan" "activation_plan" NOT NULL,
	"durationDays" integer NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"usedAt" timestamp,
	"usedBy" integer,
	"status" "activation_status" DEFAULT 'UNUSED' NOT NULL,
	"note" text,
	CONSTRAINT "activation_codes_codeHash_unique" UNIQUE("codeHash")
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"keyHash" varchar(128) NOT NULL,
	"label" varchar(100),
	"lastUsedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"revokedAt" timestamp,
	CONSTRAINT "api_keys_keyHash_unique" UNIQUE("keyHash")
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"settingKey" varchar(100) NOT NULL,
	"settingValue" text NOT NULL,
	"updatedBy" integer,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_settings_settingKey_unique" UNIQUE("settingKey")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"adminId" integer NOT NULL,
	"action" varchar(100) NOT NULL,
	"target" varchar(255) NOT NULL,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"profileId" integer NOT NULL,
	"username" varchar(30) NOT NULL,
	"type" varchar(64) NOT NULL,
	"beforeValue" text,
	"afterValue" text,
	"occurredAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monitors" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"profileId" integer NOT NULL,
	"frequencyMinutes" integer DEFAULT 1440 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"nextRunAt" timestamp,
	"lastRunAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"type" varchar(64) NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"plan" varchar(32) NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(8) DEFAULT 'SAR' NOT NULL,
	"status" varchar(32) DEFAULT 'PENDING' NOT NULL,
	"paymentReference" varchar(255),
	"proofUrl" varchar(2048),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"reviewedBy" integer,
	"reviewedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(30) NOT NULL,
	"userId" varchar(64),
	"displayName" text,
	"biography" text,
	"followers" integer,
	"following" integer,
	"postCount" integer,
	"verified" boolean,
	"isPrivate" boolean,
	"profilePictureUrl" varchar(2048),
	"externalUrl" varchar(2048),
	"lastFetchedAt" timestamp,
	"provider" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"profileId" integer NOT NULL,
	"username" varchar(30) NOT NULL,
	"displayName" text,
	"biography" text,
	"followers" integer,
	"following" integer,
	"postCount" integer,
	"verified" boolean,
	"isPrivate" boolean,
	"profilePictureUrl" varchar(2048),
	"externalUrl" varchar(2048),
	"provider" varchar(64),
	"capturedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscriptionId" integer NOT NULL,
	"actorId" integer,
	"action" varchar(64) NOT NULL,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"plan" "subscription_plan" DEFAULT 'FREE' NOT NULL,
	"status" "subscription_status" DEFAULT 'ACTIVE' NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp,
	"activationCodeId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"disabled" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"url" varchar(2048) NOT NULL,
	"secret" varchar(128) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "changes_profile_time_idx" ON "change_events" USING btree ("profileId","occurredAt");--> statement-breakpoint
CREATE INDEX "monitors_user_idx" ON "monitors" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "monitors_due_idx" ON "monitors" USING btree ("active","nextRunAt");--> statement-breakpoint
CREATE INDEX "profiles_username_idx" ON "profiles" USING btree ("username");--> statement-breakpoint
CREATE INDEX "snapshots_profile_time_idx" ON "snapshots" USING btree ("profileId","capturedAt");--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("userId");