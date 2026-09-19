import { boolean, index, integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const activationPlan = pgEnum("activation_plan", ["PRO", "BUSINESS"]);
export const subscriptionPlan = pgEnum("subscription_plan", ["FREE", "PRO", "BUSINESS"]);
export const subscriptionStatus = pgEnum("subscription_status", ["ACTIVE", "EXPIRED", "CANCELLED"]);
export const activationStatus = pgEnum("activation_status", ["UNUSED", "ACTIVE", "EXPIRED", "REVOKED"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"), email: varchar("email", { length: 320 }), loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRole("role").default("user").notNull(),
  disabled: boolean("disabled").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().notNull(), lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect; export type InsertUser = typeof users.$inferInsert;

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(), username: varchar("username", { length: 30 }).notNull().unique(), userId: varchar("userId", { length: 64 }),
  displayName: text("displayName"), biography: text("biography"), followers: integer("followers"), following: integer("following"), postCount: integer("postCount"),
  verified: boolean("verified"), isPrivate: boolean("isPrivate"), profilePictureUrl: varchar("profilePictureUrl", { length: 2048 }), externalUrl: varchar("externalUrl", { length: 2048 }),
  lastFetchedAt: timestamp("lastFetchedAt"), provider: varchar("provider", { length: 64 }), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({ usernameIndex: index("profiles_username_idx").on(table.username) }));
export type Profile = typeof profiles.$inferSelect;

export const snapshots = pgTable("snapshots", {
  id: serial("id").primaryKey(), profileId: integer("profileId").notNull(), username: varchar("username", { length: 30 }).notNull(), displayName: text("displayName"), biography: text("biography"), followers: integer("followers"), following: integer("following"), postCount: integer("postCount"), verified: boolean("verified"), isPrivate: boolean("isPrivate"), profilePictureUrl: varchar("profilePictureUrl", { length: 2048 }), externalUrl: varchar("externalUrl", { length: 2048 }), provider: varchar("provider", { length: 64 }), capturedAt: timestamp("capturedAt").defaultNow().notNull(),
}, (table) => ({ profileTimeIndex: index("snapshots_profile_time_idx").on(table.profileId, table.capturedAt) }));

export const changeEvents = pgTable("change_events", {
  id: serial("id").primaryKey(), profileId: integer("profileId").notNull(), username: varchar("username", { length: 30 }).notNull(), type: varchar("type", { length: 64 }).notNull(), beforeValue: text("beforeValue"), afterValue: text("afterValue"), occurredAt: timestamp("occurredAt").defaultNow().notNull(),
}, (table) => ({ changeTimeIndex: index("changes_profile_time_idx").on(table.profileId, table.occurredAt) }));

export const monitors = pgTable("monitors", {
  id: serial("id").primaryKey(), userId: integer("userId").notNull(), profileId: integer("profileId").notNull(), frequencyMinutes: integer("frequencyMinutes").default(1440).notNull(), active: boolean("active").default(true).notNull(), nextRunAt: timestamp("nextRunAt"), lastRunAt: timestamp("lastRunAt"), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ monitorUserIndex: index("monitors_user_idx").on(table.userId), monitorDueIndex: index("monitors_due_idx").on(table.active, table.nextRunAt) }));

export const notifications = pgTable("notifications", { id: serial("id").primaryKey(), userId: integer("userId").notNull(), title: varchar("title", { length: 255 }).notNull(), body: text("body").notNull(), type: varchar("type", { length: 64 }).notNull(), read: boolean("read").default(false).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() });
export const activationCodes = pgTable("activation_codes", { id: serial("id").primaryKey(), codeHash: varchar("codeHash", { length: 128 }).notNull().unique(), plan: activationPlan("plan").notNull(), durationDays: integer("durationDays").notNull(), createdBy: integer("createdBy").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), expiresAt: timestamp("expiresAt").notNull(), usedAt: timestamp("usedAt"), usedBy: integer("usedBy"), status: activationStatus("status").default("UNUSED").notNull(), note: text("note") });
export const subscriptions = pgTable("subscriptions", { id: serial("id").primaryKey(), userId: integer("userId").notNull(), plan: subscriptionPlan("plan").default("FREE").notNull(), status: subscriptionStatus("status").default("ACTIVE").notNull(), startedAt: timestamp("startedAt").defaultNow().notNull(), expiresAt: timestamp("expiresAt"), activationCodeId: integer("activationCodeId"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().notNull() }, (table) => ({ subscriptionUserIndex: index("subscriptions_user_idx").on(table.userId) }));
export const subscriptionEvents = pgTable("subscription_events", { id: serial("id").primaryKey(), subscriptionId: integer("subscriptionId").notNull(), actorId: integer("actorId"), action: varchar("action", { length: 64 }).notNull(), metadata: text("metadata"), createdAt: timestamp("createdAt").defaultNow().notNull() });
export const payments = pgTable("payments", { id: serial("id").primaryKey(), userId: integer("userId").notNull(), plan: varchar("plan", { length: 32 }).notNull(), amount: integer("amount").notNull(), currency: varchar("currency", { length: 8 }).default("SAR").notNull(), status: varchar("status", { length: 32 }).default("PENDING").notNull(), paymentReference: varchar("paymentReference", { length: 255 }), proofUrl: varchar("proofUrl", { length: 2048 }), createdAt: timestamp("createdAt").defaultNow().notNull(), reviewedBy: integer("reviewedBy"), reviewedAt: timestamp("reviewedAt") });
export const auditLogs = pgTable("audit_logs", { id: serial("id").primaryKey(), adminId: integer("adminId").notNull(), action: varchar("action", { length: 100 }).notNull(), target: varchar("target", { length: 255 }).notNull(), metadata: text("metadata"), createdAt: timestamp("createdAt").defaultNow().notNull() });
export const appSettings = pgTable("app_settings", { id: serial("id").primaryKey(), settingKey: varchar("settingKey", { length: 100 }).notNull().unique(), settingValue: text("settingValue").notNull(), updatedBy: integer("updatedBy"), updatedAt: timestamp("updatedAt").defaultNow().notNull() });
export const apiKeys = pgTable("api_keys", { id: serial("id").primaryKey(), userId: integer("userId").notNull(), keyHash: varchar("keyHash", { length: 128 }).notNull().unique(), label: varchar("label", { length: 100 }), lastUsedAt: timestamp("lastUsedAt"), createdAt: timestamp("createdAt").defaultNow().notNull(), revokedAt: timestamp("revokedAt") });
export const webhooks = pgTable("webhooks", { id: serial("id").primaryKey(), userId: integer("userId").notNull(), url: varchar("url", { length: 2048 }).notNull(), secret: varchar("secret", { length: 128 }).notNull(), active: boolean("active").default(true).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() });
