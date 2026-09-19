// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";

// server/db.ts
import { and, desc, eq, gt, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  disabled: boolean("disabled").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 30 }).notNull().unique(),
  userId: varchar("userId", { length: 64 }),
  displayName: text("displayName"),
  biography: text("biography"),
  followers: int("followers"),
  following: int("following"),
  postCount: int("postCount"),
  verified: boolean("verified"),
  isPrivate: boolean("isPrivate"),
  profilePictureUrl: varchar("profilePictureUrl", { length: 2048 }),
  externalUrl: varchar("externalUrl", { length: 2048 }),
  lastFetchedAt: timestamp("lastFetchedAt"),
  provider: varchar("provider", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => ({ usernameIndex: index("profiles_username_idx").on(table.username) }));
var snapshots = mysqlTable("snapshots", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  username: varchar("username", { length: 30 }).notNull(),
  displayName: text("displayName"),
  biography: text("biography"),
  followers: int("followers"),
  following: int("following"),
  postCount: int("postCount"),
  verified: boolean("verified"),
  isPrivate: boolean("isPrivate"),
  profilePictureUrl: varchar("profilePictureUrl", { length: 2048 }),
  externalUrl: varchar("externalUrl", { length: 2048 }),
  provider: varchar("provider", { length: 64 }),
  capturedAt: timestamp("capturedAt").defaultNow().notNull()
}, (table) => ({ profileTimeIndex: index("snapshots_profile_time_idx").on(table.profileId, table.capturedAt) }));
var changeEvents = mysqlTable("change_events", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  username: varchar("username", { length: 30 }).notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  beforeValue: text("beforeValue"),
  afterValue: text("afterValue"),
  occurredAt: timestamp("occurredAt").defaultNow().notNull()
}, (table) => ({ changeTimeIndex: index("changes_profile_time_idx").on(table.profileId, table.occurredAt) }));
var monitors = mysqlTable("monitors", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  profileId: int("profileId").notNull(),
  frequencyMinutes: int("frequencyMinutes").default(1440).notNull(),
  active: boolean("active").default(true).notNull(),
  nextRunAt: timestamp("nextRunAt"),
  lastRunAt: timestamp("lastRunAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => ({ monitorUserIndex: index("monitors_user_idx").on(table.userId), monitorDueIndex: index("monitors_due_idx").on(table.active, table.nextRunAt) }));
var notifications = mysqlTable("notifications", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), title: varchar("title", { length: 255 }).notNull(), body: text("body").notNull(), type: varchar("type", { length: 64 }).notNull(), read: boolean("read").default(false).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() });
var activationCodes = mysqlTable("activation_codes", { id: int("id").autoincrement().primaryKey(), codeHash: varchar("codeHash", { length: 128 }).notNull().unique(), plan: mysqlEnum("plan", ["PRO", "BUSINESS"]).notNull(), durationDays: int("durationDays").notNull(), createdBy: int("createdBy").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), expiresAt: timestamp("expiresAt").notNull(), usedAt: timestamp("usedAt"), usedBy: int("usedBy"), status: mysqlEnum("status", ["UNUSED", "ACTIVE", "EXPIRED", "REVOKED"]).default("UNUSED").notNull(), note: text("note") });
var subscriptions = mysqlTable("subscriptions", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), plan: mysqlEnum("plan", ["FREE", "PRO", "BUSINESS"]).default("FREE").notNull(), status: mysqlEnum("status", ["ACTIVE", "EXPIRED", "CANCELLED"]).default("ACTIVE").notNull(), startedAt: timestamp("startedAt").defaultNow().notNull(), expiresAt: timestamp("expiresAt"), activationCodeId: int("activationCodeId"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() }, (table) => ({ subscriptionUserIndex: index("subscriptions_user_idx").on(table.userId) }));
var subscriptionEvents = mysqlTable("subscription_events", { id: int("id").autoincrement().primaryKey(), subscriptionId: int("subscriptionId").notNull(), actorId: int("actorId"), action: varchar("action", { length: 64 }).notNull(), metadata: text("metadata"), createdAt: timestamp("createdAt").defaultNow().notNull() });
var payments = mysqlTable("payments", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), plan: varchar("plan", { length: 32 }).notNull(), amount: int("amount").notNull(), currency: varchar("currency", { length: 8 }).default("SAR").notNull(), status: varchar("status", { length: 32 }).default("PENDING").notNull(), paymentReference: varchar("paymentReference", { length: 255 }), proofUrl: varchar("proofUrl", { length: 2048 }), createdAt: timestamp("createdAt").defaultNow().notNull(), reviewedBy: int("reviewedBy"), reviewedAt: timestamp("reviewedAt") });
var auditLogs = mysqlTable("audit_logs", { id: int("id").autoincrement().primaryKey(), adminId: int("adminId").notNull(), action: varchar("action", { length: 100 }).notNull(), target: varchar("target", { length: 255 }).notNull(), metadata: text("metadata"), createdAt: timestamp("createdAt").defaultNow().notNull() });
var appSettings = mysqlTable("app_settings", { id: int("id").autoincrement().primaryKey(), settingKey: varchar("settingKey", { length: 100 }).notNull().unique(), settingValue: text("settingValue").notNull(), updatedBy: int("updatedBy"), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() });
var apiKeys = mysqlTable("api_keys", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), keyHash: varchar("keyHash", { length: 128 }).notNull().unique(), label: varchar("label", { length: 100 }), lastUsedAt: timestamp("lastUsedAt"), createdAt: timestamp("createdAt").defaultNow().notNull(), revokedAt: timestamp("revokedAt") });
var webhooks = mysqlTable("webhooks", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), url: varchar("url", { length: 2048 }).notNull(), secret: varchar("secret", { length: 128 }).notNull(), active: boolean("active").default(true).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() });

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// providers/instagram/InstaloaderProvider.ts
var InstaloaderProvider = class {
  name = "instaloader";
  lastHealth = { status: "offline", checkedAt: /* @__PURE__ */ new Date() };
  async fetchProfile(username) {
    const workerUrl = process.env.INSTAGRAM_WORKER_URL;
    if (!workerUrl) {
      const error = "INSTAGRAM_WORKER_URL is not configured";
      this.lastHealth = { status: "offline", checkedAt: /* @__PURE__ */ new Date(), lastError: error };
      throw new Error(error);
    }
    const started = Date.now();
    try {
      const response = await fetch(`${workerUrl.replace(/\/$/, "")}/profile/${encodeURIComponent(username)}`, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(25e3)
      });
      const payload = await response.json();
      if (!response.ok || payload.ok === false) {
        const error = String(payload.error ?? `Instagram worker returned ${response.status}`);
        this.lastHealth = { status: response.status === 429 ? "blocked" : "degraded", checkedAt: /* @__PURE__ */ new Date(), responseMs: Date.now() - started, lastError: error };
        throw new Error(error);
      }
      const profile = {
        username: String(payload.username ?? username),
        userId: payload.user_id ? String(payload.user_id) : null,
        displayName: payload.full_name ? String(payload.full_name) : null,
        biography: payload.biography ? String(payload.biography) : null,
        followers: typeof payload.followers === "number" ? payload.followers : null,
        following: typeof payload.following === "number" ? payload.following : null,
        postCount: typeof payload.posts_count === "number" ? payload.posts_count : null,
        verified: typeof payload.verified === "boolean" ? payload.verified : null,
        isPrivate: typeof payload.private === "boolean" ? payload.private : null,
        profilePictureUrl: payload.profile_picture_url ? String(payload.profile_picture_url) : null,
        externalUrl: payload.external_url ? String(payload.external_url) : null,
        fetchedAt: /* @__PURE__ */ new Date(),
        source: this.name
      };
      this.lastHealth = { status: "healthy", checkedAt: /* @__PURE__ */ new Date(), responseMs: Date.now() - started };
      return { profile, health: this.lastHealth };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown provider error";
      if (this.lastHealth.status === "healthy") this.lastHealth = { status: "degraded", checkedAt: /* @__PURE__ */ new Date(), responseMs: Date.now() - started, lastError: message };
      throw error;
    }
  }
  health() {
    return this.lastHealth;
  }
};

// providers/instagram/MockProvider.ts
var MockProvider = class {
  name = "mock-development";
  lastHealth = { status: "healthy", checkedAt: /* @__PURE__ */ new Date(), responseMs: 40 };
  async fetchProfile(username) {
    if (process.env.NODE_ENV === "production") throw new Error("MockProvider is disabled in production");
    const profile = {
      username,
      userId: `dev-${username}`,
      displayName: "\u062D\u0633\u0627\u0628 \u062A\u062C\u0631\u064A\u0628\u064A \u0644\u0644\u062A\u0637\u0648\u064A\u0631",
      biography: "\u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062C\u0631\u064A\u0628\u064A\u0629 \u0645\u062D\u0635\u0648\u0631\u0629 \u0641\u064A \u0628\u064A\u0626\u0629 \u0627\u0644\u062A\u0637\u0648\u064A\u0631 \u0641\u0642\u0637",
      followers: 12400,
      following: 318,
      postCount: 186,
      verified: false,
      isPrivate: false,
      profilePictureUrl: null,
      externalUrl: "https://example.com",
      fetchedAt: /* @__PURE__ */ new Date(),
      source: this.name
    };
    this.lastHealth = { status: "healthy", checkedAt: /* @__PURE__ */ new Date(), responseMs: 40 };
    return { profile, health: this.lastHealth };
  }
  health() {
    return this.lastHealth;
  }
};

// providers/instagram/ProviderManager.ts
var ProviderManager = class {
  provider;
  constructor() {
    const requested = process.env.INSTAGRAM_PROVIDER ?? "instaloader";
    if (requested === "mock" && process.env.NODE_ENV !== "production") this.provider = new MockProvider();
    else this.provider = new InstaloaderProvider();
  }
  get active() {
    return this.provider;
  }
};
var providerManager = new ProviderManager();

// providers/instagram/InstagramProvider.ts
function normalizeUsername(value) {
  return value.trim().replace(/^@+/, "").toLowerCase().replace(/[^a-z0-9._]/g, "").slice(0, 30);
}

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? /* @__PURE__ */ new Date() };
  const updateSet = { lastSignedIn: values.lastSignedIn };
  for (const field of ["name", "email", "loginMethod"]) {
    if (user[field] !== void 0) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.role !== void 0 || user.openId === ENV.ownerOpenId) {
    values.role = user.role ?? "admin";
    updateSet.role = values.role;
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
function profileValues(profile) {
  return { username: profile.username, userId: profile.userId ?? null, displayName: profile.displayName ?? null, biography: profile.biography ?? null, followers: profile.followers ?? null, following: profile.following ?? null, postCount: profile.postCount ?? null, verified: profile.verified ?? null, isPrivate: profile.isPrivate ?? null, profilePictureUrl: profile.profilePictureUrl ?? null, externalUrl: profile.externalUrl ?? null, lastFetchedAt: profile.fetchedAt, provider: profile.source };
}
async function searchAndSnapshot(rawUsername) {
  const username = normalizeUsername(rawUsername);
  if (!username) throw new Error("\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D");
  const db = await getDb();
  if (!db) throw new Error("\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629 \u062D\u0627\u0644\u064A\u064B\u0627");
  const existing = (await db.select().from(profiles).where(eq(profiles.username, username)).limit(1))[0];
  const freshEnough = existing?.lastFetchedAt && Date.now() - existing.lastFetchedAt.getTime() < Number(process.env.PROFILE_CACHE_TTL_MS ?? 15 * 60 * 1e3);
  if (freshEnough) return { profile: existing, cached: true, changes: [] };
  const result = await providerManager.active.fetchProfile(username);
  const before = existing;
  await db.insert(profiles).values(profileValues(result.profile)).onDuplicateKeyUpdate({ set: profileValues(result.profile) });
  const saved = (await db.select().from(profiles).where(eq(profiles.username, username)).limit(1))[0];
  if (!saved) throw new Error("\u062A\u0639\u0630\u0631 \u062D\u0641\u0638 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A");
  const previousSnapshot = (await db.select().from(snapshots).where(eq(snapshots.profileId, saved.id)).orderBy(desc(snapshots.capturedAt)).limit(1))[0];
  await db.insert(snapshots).values({ profileId: saved.id, ...profileValues(result.profile), capturedAt: result.profile.fetchedAt });
  const changeFields = [
    ["BIO_CHANGED", previousSnapshot?.biography, result.profile.biography],
    ["DISPLAY_NAME_CHANGED", previousSnapshot?.displayName, result.profile.displayName],
    ["PROFILE_PICTURE_CHANGED", previousSnapshot?.profilePictureUrl, result.profile.profilePictureUrl],
    ["FOLLOWERS_CHANGED", previousSnapshot?.followers, result.profile.followers],
    ["FOLLOWING_CHANGED", previousSnapshot?.following, result.profile.following],
    ["POST_COUNT_CHANGED", previousSnapshot?.postCount, result.profile.postCount],
    ["VERIFICATION_CHANGED", previousSnapshot?.verified, result.profile.verified],
    ["EXTERNAL_URL_CHANGED", previousSnapshot?.externalUrl, result.profile.externalUrl],
    ["PRIVACY_STATUS_CHANGED", previousSnapshot?.isPrivate, result.profile.isPrivate]
  ];
  const changes = previousSnapshot ? changeFields.filter(([, oldValue, newValue]) => String(oldValue ?? "") !== String(newValue ?? "")).map(([type, oldValue, newValue]) => ({ type, before: oldValue ?? null, after: newValue ?? null })) : [];
  for (const change of changes) await db.insert(changeEvents).values({ profileId: saved.id, username, type: change.type, beforeValue: change.before === null ? null : String(change.before), afterValue: change.after === null ? null : String(change.after), occurredAt: result.profile.fetchedAt });
  return { profile: saved, cached: false, changes };
}
async function getProfileHistory(rawUsername) {
  const db = await getDb();
  if (!db) return [];
  const username = normalizeUsername(rawUsername);
  const profile = (await db.select().from(profiles).where(eq(profiles.username, username)).limit(1))[0];
  if (!profile) return [];
  return db.select().from(snapshots).where(eq(snapshots.profileId, profile.id)).orderBy(desc(snapshots.capturedAt)).limit(100);
}
async function getProfileChanges(rawUsername) {
  const db = await getDb();
  if (!db) return [];
  const username = normalizeUsername(rawUsername);
  return db.select().from(changeEvents).where(eq(changeEvents.username, username)).orderBy(desc(changeEvents.occurredAt)).limit(100);
}
async function getUserMonitors(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ monitor: monitors, profile: profiles }).from(monitors).leftJoin(profiles, eq(monitors.profileId, profiles.id)).where(eq(monitors.userId, userId)).orderBy(desc(monitors.createdAt));
}
async function addMonitor(userId, rawUsername, frequencyMinutes = 1440) {
  const result = await searchAndSnapshot(rawUsername);
  const db = await getDb();
  if (!db) throw new Error("\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629");
  await db.insert(monitors).values({ userId, profileId: result.profile.id, frequencyMinutes, nextRunAt: new Date(Date.now() + frequencyMinutes * 6e4) });
  return result.profile;
}
async function getNotifications(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(30);
}
async function getSettings() {
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select().from(appSettings);
  return Object.fromEntries(rows.map((row) => [row.settingKey, row.settingValue]));
}
async function getAdminStats() {
  const db = await getDb();
  if (!db) return { users: 0, monitored: 0, profiles: 0, changes: 0 };
  const [userRows, monitorRows, profileRows, changeRows] = await Promise.all([db.select().from(users), db.select().from(monitors).where(eq(monitors.active, true)), db.select().from(profiles), db.select().from(changeEvents)]);
  return { users: userRows.length, monitored: monitorRows.length, profiles: profileRows.length, changes: changeRows.length };
}
async function getSubscription(userId) {
  const db = await getDb();
  if (!db) return null;
  const row = (await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.updatedAt)).limit(1))[0];
  if (row?.expiresAt && row.expiresAt < /* @__PURE__ */ new Date() && row.status === "ACTIVE") {
    await db.update(subscriptions).set({ plan: "FREE", status: "EXPIRED" }).where(eq(subscriptions.id, row.id));
    return { ...row, plan: "FREE", status: "EXPIRED" };
  }
  return row ?? { id: 0, userId, plan: "FREE", status: "ACTIVE", startedAt: /* @__PURE__ */ new Date(), expiresAt: null, activationCodeId: null, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() };
}
async function getDueMonitors() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ monitor: monitors, profile: profiles }).from(monitors).leftJoin(profiles, eq(monitors.profileId, profiles.id)).where(and(eq(monitors.active, true), lte(monitors.nextRunAt, /* @__PURE__ */ new Date()))).limit(100);
}
async function markMonitorRun(id, frequencyMinutes) {
  const db = await getDb();
  if (!db) return;
  await db.update(monitors).set({ lastRunAt: /* @__PURE__ */ new Date(), nextRunAt: new Date(Date.now() + frequencyMinutes * 6e4) }).where(eq(monitors.id, id));
}
async function getActivationByHash(codeHash) {
  const db = await getDb();
  if (!db) return null;
  return (await db.select().from(activationCodes).where(and(eq(activationCodes.codeHash, codeHash), eq(activationCodes.status, "UNUSED"), gt(activationCodes.expiresAt, /* @__PURE__ */ new Date()))).limit(1))[0] ?? null;
}
async function redeemActivation(codeId, userId, plan, expiresAt) {
  const db = await getDb();
  if (!db) throw new Error("\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629");
  await db.update(activationCodes).set({ status: "ACTIVE", usedAt: /* @__PURE__ */ new Date(), usedBy: userId }).where(and(eq(activationCodes.id, codeId), eq(activationCodes.status, "UNUSED")));
  await db.insert(subscriptions).values({ userId, plan, status: "ACTIVE", startedAt: /* @__PURE__ */ new Date(), expiresAt, activationCodeId: codeId });
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/routers.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z2 } from "zod";

// server/_core/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError as TRPCError2 } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError2({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError2({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError2({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError2({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError2({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError2({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/security.ts
import crypto from "node:crypto";
function hashSecret(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function createActivationCode() {
  const raw = crypto.randomBytes(12).toString("hex").toUpperCase().slice(0, 16);
  return `ILP-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}
function createApiKey() {
  return `ilk_${crypto.randomBytes(24).toString("hex")}`;
}
function normalizeUsername2(value) {
  return value.trim().replace(/^@+/, "").toLowerCase().replace(/[^a-z0-9._]/g, "").slice(0, 30);
}

// server/routers.ts
var adminProcedure2 = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError3({ code: "FORBIDDEN", message: "\u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0645\u0637\u0644\u0648\u0628\u0629" });
  return next();
});
var usernameInput = z2.object({ username: z2.string().min(1).max(50) });
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  profile: router({
    search: publicProcedure.input(usernameInput).query(async ({ input }) => {
      try {
        return await searchAndSnapshot(input.username);
      } catch (error) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "\u062A\u0639\u0630\u0631 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u062D\u0627\u0644\u064A\u064B\u0627. \u062D\u0627\u0648\u0644 \u0644\u0627\u062D\u0642\u064B\u0627." });
      }
    }),
    history: publicProcedure.input(usernameInput).query(({ input }) => getProfileHistory(input.username)),
    changes: publicProcedure.input(usernameInput).query(({ input }) => getProfileChanges(input.username))
  }),
  monitor: router({
    list: protectedProcedure.query(({ ctx }) => getUserMonitors(ctx.user.id)),
    add: protectedProcedure.input(z2.object({ username: z2.string().min(1).max(50), frequencyMinutes: z2.number().int().min(60).max(10080).default(1440) })).mutation(({ ctx, input }) => addMonitor(ctx.user.id, input.username, input.frequencyMinutes))
  }),
  notifications: router({ list: protectedProcedure.query(({ ctx }) => getNotifications(ctx.user.id)) }),
  subscription: router({
    me: protectedProcedure.query(({ ctx }) => getSubscription(ctx.user.id)),
    activate: protectedProcedure.input(z2.object({ code: z2.string().regex(/^ILP-[A-Z0-9]{4}(?:-[A-Z0-9]{4}){3}$/) })).mutation(async ({ ctx, input }) => {
      const code = await getActivationByHash(hashSecret(input.code));
      if (!code || code.status !== "UNUSED") throw new TRPCError3({ code: "BAD_REQUEST", message: "\u0627\u0644\u0643\u0648\u062F \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u0623\u0648 \u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0648 \u0645\u0646\u062A\u0647\u064D" });
      const expiresAt = new Date(Date.now() + code.durationDays * 864e5);
      await redeemActivation(code.id, ctx.user.id, code.plan, expiresAt);
      return { success: true, plan: code.plan, expiresAt };
    }),
    generateApiKey: protectedProcedure.input(z2.object({ label: z2.string().max(100).optional() })).mutation(async ({ ctx, input }) => {
      const subscription = await getSubscription(ctx.user.id);
      if (subscription?.plan !== "BUSINESS" || subscription.status !== "ACTIVE") throw new TRPCError3({ code: "FORBIDDEN", message: "\u0645\u064A\u0632\u0629 API \u0645\u062A\u0627\u062D\u0629 \u0644\u0628\u0627\u0642\u0629 Business \u0641\u0642\u0637" });
      const db = await getDb();
      if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629" });
      const key = createApiKey();
      await db.insert(apiKeys).values({ userId: ctx.user.id, keyHash: hashSecret(key), label: input.label ?? null });
      return { key, warning: "\u0633\u064A\u0638\u0647\u0631 \u0627\u0644\u0645\u0641\u062A\u0627\u062D \u0645\u0631\u0629 \u0648\u0627\u062D\u062F\u0629 \u0641\u0642\u0637." };
    })
  }),
  settings: router({ public: publicProcedure.query(() => getSettings()) }),
  admin: router({
    stats: adminProcedure2.query(() => getAdminStats()),
    health: adminProcedure2.query(() => providerManager.active.health()),
    generateCode: adminProcedure2.input(z2.object({ plan: z2.enum(["PRO", "BUSINESS"]), durationDays: z2.number().int().min(1).max(730), note: z2.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629" });
      const code = createActivationCode();
      await db.insert(activationCodes).values({ codeHash: hashSecret(code), plan: input.plan, durationDays: input.durationDays, createdBy: ctx.user.id, expiresAt: new Date(Date.now() + input.durationDays * 864e5), note: input.note ?? null });
      return { code, warning: "\u0633\u064A\u0638\u0647\u0631 \u0647\u0630\u0627 \u0627\u0644\u0643\u0648\u062F \u0645\u0631\u0629 \u0648\u0627\u062D\u062F\u0629 \u0641\u0642\u0637\u061B \u062E\u0632\u0651\u0646\u0647 \u0628\u0623\u0645\u0627\u0646." };
    }),
    updateSetting: adminProcedure2.input(z2.object({ key: z2.string().min(1).max(100), value: z2.string().max(2e3) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629" });
      await db.insert(appSettings).values({ settingKey: input.key, settingValue: input.value, updatedBy: ctx.user.id }).onDuplicateKeyUpdate({ set: { settingValue: input.value, updatedBy: ctx.user.id } });
      return { success: true };
    })
  }),
  health: publicProcedure.query(() => ({ provider: providerManager.active.name, status: providerManager.active.health() }))
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs2 from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var PROJECT_ROOT = import.meta.dirname;
var LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
var MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
var TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function trimLogFile(logPath, maxSize) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }
    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines = [];
    let keptBytes = 0;
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}
`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
  }
}
function writeToLogFile(source, entries) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });
  fs.appendFileSync(logPath, `${lines.join("\n")}
`, "utf-8");
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}
function vitePluginManusDebugCollector() {
  return {
    name: "manus-debug-collector",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true
            },
            injectTo: "head"
          }
        ]
      };
    },
    configureServer(server) {
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }
        const handlePayload = (payload) => {
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };
        const reqBody = req.body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    }
  };
}
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/monitoring.ts
async function runDueMonitoring() {
  const due = await getDueMonitors();
  let checked = 0;
  let changed = 0;
  let failed = 0;
  for (const item of due) {
    const monitor = item.monitor;
    try {
      if (!item.profile?.username) throw new Error("monitor profile not found");
      const result = await searchAndSnapshot(item.profile.username);
      checked += 1;
      changed += result.changes.length;
      const db = await getDb();
      if (db && result.changes.length) await db.insert(notifications).values({ userId: monitor.userId, title: "\u062A\u063A\u064A\u064A\u0631 \u062C\u062F\u064A\u062F \u0641\u064A \u0627\u0644\u062D\u0633\u0627\u0628", body: `\u062A\u0645 \u0627\u0643\u062A\u0634\u0627\u0641 ${result.changes.length} \u062A\u063A\u064A\u064A\u0631\u064B\u0627 \u0641\u064A \u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0630\u064A \u062A\u0631\u0627\u0642\u0628\u0647.`, type: "PROFILE_CHANGE" });
      await markMonitorRun(monitor.id, monitor.frequencyMinutes);
    } catch (error) {
      failed += 1;
      console.warn(`[Monitoring] monitor ${monitor.id} failed:`, error instanceof Error ? error.message : error);
      await markMonitorRun(monitor.id, monitor.frequencyMinutes);
    }
  }
  return { ok: true, checked, changed, failed };
}

// server/apiV1.ts
import { eq as eq2 } from "drizzle-orm";
async function authorizeBusiness(req, res) {
  const raw = req.header("x-api-key") ?? req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!raw) {
    res.status(401).json({ error: "business_api_key_required" });
    return null;
  }
  const db = await getDb();
  if (!db) {
    res.status(503).json({ error: "database_unavailable" });
    return null;
  }
  const key = (await db.select().from(apiKeys).where(eq2(apiKeys.keyHash, hashSecret(raw))).limit(1))[0];
  if (!key || key.revokedAt) {
    res.status(401).json({ error: "invalid_api_key" });
    return null;
  }
  const subscription = (await db.select().from(subscriptions).where(eq2(subscriptions.userId, key.userId)).limit(1))[0];
  if (!subscription || subscription.plan !== "BUSINESS" || subscription.status !== "ACTIVE" || subscription.expiresAt && subscription.expiresAt < /* @__PURE__ */ new Date()) {
    res.status(403).json({ error: "business_plan_required" });
    return null;
  }
  await db.update(apiKeys).set({ lastUsedAt: /* @__PURE__ */ new Date() }).where(eq2(apiKeys.id, key.id));
  return key;
}
function registerApiV1(app) {
  app.get("/api/v1/profile/:username", async (req, res) => {
    if (!await authorizeBusiness(req, res)) return;
    try {
      const result = await searchAndSnapshot(normalizeUsername2(req.params.username));
      res.json(result.profile);
    } catch (error) {
      res.status(502).json({ error: error instanceof Error ? error.message : "provider_unavailable" });
    }
  });
  app.get("/api/v1/history/:username", async (req, res) => {
    if (!await authorizeBusiness(req, res)) return;
    res.json(await getProfileHistory(req.params.username));
  });
  app.get("/api/v1/changes/:username", async (req, res) => {
    if (!await authorizeBusiness(req, res)) return;
    res.json(await getProfileChanges(req.params.username));
  });
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => server.close(() => resolve(true)));
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) if (await isPortAvailable(port)) return port;
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerApiV1(app);
  app.post("/api/scheduled/monitor", async (req, res) => {
    try {
      const expected = process.env.MONITOR_CRON_SECRET;
      const authorization = req.headers.authorization;
      if (!expected || authorization !== `Bearer ${expected}`) return res.status(401).json({ error: "cron-only" });
      return res.json(await runDueMonitoring());
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "monitoring failed", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    }
  });
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  if (process.env.NODE_ENV === "development") await setupVite(app, server);
  else serveStatic(app);
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  server.listen(port, () => console.log(`Server running on http://localhost:${port}/`));
}
startServer().catch(console.error);
