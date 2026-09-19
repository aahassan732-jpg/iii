import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"), email: varchar("email", { length: 320 }), loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  disabled: boolean("disabled").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect; export type InsertUser = typeof users.$inferInsert;

export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(), username: varchar("username", { length: 30 }).notNull().unique(), userId: varchar("userId", { length: 64 }),
  displayName: text("displayName"), biography: text("biography"), followers: int("followers"), following: int("following"), postCount: int("postCount"),
  verified: boolean("verified"), isPrivate: boolean("isPrivate"), profilePictureUrl: varchar("profilePictureUrl", { length: 2048 }), externalUrl: varchar("externalUrl", { length: 2048 }),
  lastFetchedAt: timestamp("lastFetchedAt"), provider: varchar("provider", { length: 64 }), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ usernameIndex: index("profiles_username_idx").on(table.username) }));
export type Profile = typeof profiles.$inferSelect;

export const snapshots = mysqlTable("snapshots", {
  id: int("id").autoincrement().primaryKey(), profileId: int("profileId").notNull(), username: varchar("username", { length: 30 }).notNull(), displayName: text("displayName"), biography: text("biography"), followers: int("followers"), following: int("following"), postCount: int("postCount"), verified: boolean("verified"), isPrivate: boolean("isPrivate"), profilePictureUrl: varchar("profilePictureUrl", { length: 2048 }), externalUrl: varchar("externalUrl", { length: 2048 }), provider: varchar("provider", { length: 64 }), capturedAt: timestamp("capturedAt").defaultNow().notNull(),
}, (table) => ({ profileTimeIndex: index("snapshots_profile_time_idx").on(table.profileId, table.capturedAt) }));

export const changeEvents = mysqlTable("change_events", {
  id: int("id").autoincrement().primaryKey(), profileId: int("profileId").notNull(), username: varchar("username", { length: 30 }).notNull(), type: varchar("type", { length: 64 }).notNull(), beforeValue: text("beforeValue"), afterValue: text("afterValue"), occurredAt: timestamp("occurredAt").defaultNow().notNull(),
}, (table) => ({ changeTimeIndex: index("changes_profile_time_idx").on(table.profileId, table.occurredAt) }));

export const monitors = mysqlTable("monitors", {
  id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), profileId: int("profileId").notNull(), frequencyMinutes: int("frequencyMinutes").default(1440).notNull(), active: boolean("active").default(true).notNull(), nextRunAt: timestamp("nextRunAt"), lastRunAt: timestamp("lastRunAt"), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ monitorUserIndex: index("monitors_user_idx").on(table.userId), monitorDueIndex: index("monitors_due_idx").on(table.active, table.nextRunAt) }));

export const notifications = mysqlTable("notifications", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), title: varchar("title", { length: 255 }).notNull(), body: text("body").notNull(), type: varchar("type", { length: 64 }).notNull(), read: boolean("read").default(false).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() });

export const activationCodes = mysqlTable("activation_codes", { id: int("id").autoincrement().primaryKey(), codeHash: varchar("codeHash", { length: 128 }).notNull().unique(), plan: mysqlEnum("plan", ["PRO", "BUSINESS"]).notNull(), durationDays: int("durationDays").notNull(), createdBy: int("createdBy").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), expiresAt: timestamp("expiresAt").notNull(), usedAt: timestamp("usedAt"), usedBy: int("usedBy"), status: mysqlEnum("status", ["UNUSED", "ACTIVE", "EXPIRED", "REVOKED"]).default("UNUSED").notNull(), note: text("note") });

export const subscriptions = mysqlTable("subscriptions", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), plan: mysqlEnum("plan", ["FREE", "PRO", "BUSINESS"]).default("FREE").notNull(), status: mysqlEnum("status", ["ACTIVE", "EXPIRED", "CANCELLED"]).default("ACTIVE").notNull(), startedAt: timestamp("startedAt").defaultNow().notNull(), expiresAt: timestamp("expiresAt"), activationCodeId: int("activationCodeId"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() }, (table) => ({ subscriptionUserIndex: index("subscriptions_user_idx").on(table.userId) }));

export const subscriptionEvents = mysqlTable("subscription_events", { id: int("id").autoincrement().primaryKey(), subscriptionId: int("subscriptionId").notNull(), actorId: int("actorId"), action: varchar("action", { length: 64 }).notNull(), metadata: text("metadata"), createdAt: timestamp("createdAt").defaultNow().notNull() });
export const payments = mysqlTable("payments", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), plan: varchar("plan", { length: 32 }).notNull(), amount: int("amount").notNull(), currency: varchar("currency", { length: 8 }).default("SAR").notNull(), status: varchar("status", { length: 32 }).default("PENDING").notNull(), paymentReference: varchar("paymentReference", { length: 255 }), proofUrl: varchar("proofUrl", { length: 2048 }), createdAt: timestamp("createdAt").defaultNow().notNull(), reviewedBy: int("reviewedBy"), reviewedAt: timestamp("reviewedAt") });
export const auditLogs = mysqlTable("audit_logs", { id: int("id").autoincrement().primaryKey(), adminId: int("adminId").notNull(), action: varchar("action", { length: 100 }).notNull(), target: varchar("target", { length: 255 }).notNull(), metadata: text("metadata"), createdAt: timestamp("createdAt").defaultNow().notNull() });
export const appSettings = mysqlTable("app_settings", { id: int("id").autoincrement().primaryKey(), settingKey: varchar("settingKey", { length: 100 }).notNull().unique(), settingValue: text("settingValue").notNull(), updatedBy: int("updatedBy"), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() });
export const apiKeys = mysqlTable("api_keys", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), keyHash: varchar("keyHash", { length: 128 }).notNull().unique(), label: varchar("label", { length: 100 }), lastUsedAt: timestamp("lastUsedAt"), createdAt: timestamp("createdAt").defaultNow().notNull(), revokedAt: timestamp("revokedAt") });
export const webhooks = mysqlTable("webhooks", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), url: varchar("url", { length: 2048 }).notNull(), secret: varchar("secret", { length: 128 }).notNull(), active: boolean("active").default(true).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() });
