import { and, desc, eq, gt, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { activationCodes, appSettings, changeEvents, monitors, notifications, profiles, snapshots, subscriptions, users, type InsertUser } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { providerManager } from "../providers/instagram/ProviderManager";
import { normalizeUsername } from "../providers/instagram/InstagramProvider";

let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() { if (!_db && process.env.DATABASE_URL) { try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); } } return _db; }

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb(); if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  for (const field of ["name", "email", "loginMethod"] as const) { if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; } }
  if (user.role !== undefined || user.openId === ENV.ownerOpenId) { values.role = user.role ?? "admin"; updateSet.role = values.role; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
export async function getUserByOpenId(openId: string) { const db = await getDb(); if (!db) return undefined; const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1); return result[0]; }

function profileValues(profile: Awaited<ReturnType<typeof providerManager.active.fetchProfile>>["profile"]) {
  return { username: profile.username, userId: profile.userId ?? null, displayName: profile.displayName ?? null, biography: profile.biography ?? null, followers: profile.followers ?? null, following: profile.following ?? null, postCount: profile.postCount ?? null, verified: profile.verified ?? null, isPrivate: profile.isPrivate ?? null, profilePictureUrl: profile.profilePictureUrl ?? null, externalUrl: profile.externalUrl ?? null, lastFetchedAt: profile.fetchedAt, provider: profile.source };
}

export async function searchAndSnapshot(rawUsername: string) {
  const username = normalizeUsername(rawUsername); if (!username) throw new Error("اسم المستخدم غير صالح");
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا");
  const existing = (await db.select().from(profiles).where(eq(profiles.username, username)).limit(1))[0];
  const freshEnough = existing?.lastFetchedAt && Date.now() - existing.lastFetchedAt.getTime() < Number(process.env.PROFILE_CACHE_TTL_MS ?? 15 * 60 * 1000);
  if (freshEnough) return { profile: existing, cached: true, changes: [] };
  const result = await providerManager.active.fetchProfile(username);
  const before = existing;
  await db.insert(profiles).values(profileValues(result.profile)).onDuplicateKeyUpdate({ set: profileValues(result.profile) });
  const saved = (await db.select().from(profiles).where(eq(profiles.username, username)).limit(1))[0];
  if (!saved) throw new Error("تعذر حفظ الملف الشخصي");
  const previousSnapshot = (await db.select().from(snapshots).where(eq(snapshots.profileId, saved.id)).orderBy(desc(snapshots.capturedAt)).limit(1))[0];
  await db.insert(snapshots).values({ profileId: saved.id, ...profileValues(result.profile), capturedAt: result.profile.fetchedAt });
  const changeFields: Array<[string, unknown, unknown]> = [
    ["BIO_CHANGED", previousSnapshot?.biography, result.profile.biography], ["DISPLAY_NAME_CHANGED", previousSnapshot?.displayName, result.profile.displayName], ["PROFILE_PICTURE_CHANGED", previousSnapshot?.profilePictureUrl, result.profile.profilePictureUrl], ["FOLLOWERS_CHANGED", previousSnapshot?.followers, result.profile.followers], ["FOLLOWING_CHANGED", previousSnapshot?.following, result.profile.following], ["POST_COUNT_CHANGED", previousSnapshot?.postCount, result.profile.postCount], ["VERIFICATION_CHANGED", previousSnapshot?.verified, result.profile.verified], ["EXTERNAL_URL_CHANGED", previousSnapshot?.externalUrl, result.profile.externalUrl], ["PRIVACY_STATUS_CHANGED", previousSnapshot?.isPrivate, result.profile.isPrivate],
  ];
  const changes = previousSnapshot ? changeFields.filter(([, oldValue, newValue]) => String(oldValue ?? "") !== String(newValue ?? "")).map(([type, oldValue, newValue]) => ({ type, before: oldValue ?? null, after: newValue ?? null })) : [];
  for (const change of changes) await db.insert(changeEvents).values({ profileId: saved.id, username, type: change.type, beforeValue: change.before === null ? null : String(change.before), afterValue: change.after === null ? null : String(change.after), occurredAt: result.profile.fetchedAt });
  return { profile: saved, cached: false, changes };
}

export async function getProfileHistory(rawUsername: string) { const db = await getDb(); if (!db) return []; const username = normalizeUsername(rawUsername); const profile = (await db.select().from(profiles).where(eq(profiles.username, username)).limit(1))[0]; if (!profile) return []; return db.select().from(snapshots).where(eq(snapshots.profileId, profile.id)).orderBy(desc(snapshots.capturedAt)).limit(100); }
export async function getProfileChanges(rawUsername: string) { const db = await getDb(); if (!db) return []; const username = normalizeUsername(rawUsername); return db.select().from(changeEvents).where(eq(changeEvents.username, username)).orderBy(desc(changeEvents.occurredAt)).limit(100); }
export async function getUserMonitors(userId: number) { const db = await getDb(); if (!db) return []; return db.select({ monitor: monitors, profile: profiles }).from(monitors).leftJoin(profiles, eq(monitors.profileId, profiles.id)).where(eq(monitors.userId, userId)).orderBy(desc(monitors.createdAt)); }
export async function addMonitor(userId: number, rawUsername: string, frequencyMinutes = 1440) { const result = await searchAndSnapshot(rawUsername); const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة"); await db.insert(monitors).values({ userId, profileId: result.profile.id, frequencyMinutes, nextRunAt: new Date(Date.now() + frequencyMinutes * 60_000) }); return result.profile; }
export async function getNotifications(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(30); }
export async function getSettings() { const db = await getDb(); if (!db) return {}; const rows = await db.select().from(appSettings); return Object.fromEntries(rows.map((row) => [row.settingKey, row.settingValue])); }
export async function getAdminStats() { const db = await getDb(); if (!db) return { users: 0, monitored: 0, profiles: 0, changes: 0 }; const [userRows, monitorRows, profileRows, changeRows] = await Promise.all([db.select().from(users), db.select().from(monitors).where(eq(monitors.active, true)), db.select().from(profiles), db.select().from(changeEvents)]); return { users: userRows.length, monitored: monitorRows.length, profiles: profileRows.length, changes: changeRows.length }; }
export async function getSubscription(userId: number) { const db = await getDb(); if (!db) return null; const row = (await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.updatedAt)).limit(1))[0]; if (row?.expiresAt && row.expiresAt < new Date() && row.status === "ACTIVE") { await db.update(subscriptions).set({ plan: "FREE", status: "EXPIRED" }).where(eq(subscriptions.id, row.id)); return { ...row, plan: "FREE" as const, status: "EXPIRED" as const }; } return row ?? { id: 0, userId, plan: "FREE" as const, status: "ACTIVE" as const, startedAt: new Date(), expiresAt: null, activationCodeId: null, createdAt: new Date(), updatedAt: new Date() }; }
export async function getDueMonitors() { const db = await getDb(); if (!db) return []; return db.select({ monitor: monitors, profile: profiles }).from(monitors).leftJoin(profiles, eq(monitors.profileId, profiles.id)).where(and(eq(monitors.active, true), lte(monitors.nextRunAt, new Date()))).limit(100); }
export async function markMonitorRun(id: number, frequencyMinutes: number) { const db = await getDb(); if (!db) return; await db.update(monitors).set({ lastRunAt: new Date(), nextRunAt: new Date(Date.now() + frequencyMinutes * 60_000) }).where(eq(monitors.id, id)); }
export async function getActivationByHash(codeHash: string) { const db = await getDb(); if (!db) return null; return (await db.select().from(activationCodes).where(and(eq(activationCodes.codeHash, codeHash), eq(activationCodes.status, "UNUSED"), gt(activationCodes.expiresAt, new Date()))).limit(1))[0] ?? null; }
export async function redeemActivation(codeId: number, userId: number, plan: "PRO" | "BUSINESS", expiresAt: Date) { const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة"); await db.update(activationCodes).set({ status: "ACTIVE", usedAt: new Date(), usedBy: userId }).where(and(eq(activationCodes.id, codeId), eq(activationCodes.status, "UNUSED"))); await db.insert(subscriptions).values({ userId, plan, status: "ACTIVE", startedAt: new Date(), expiresAt, activationCodeId: codeId }); }
