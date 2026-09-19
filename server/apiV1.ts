import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { apiKeys, subscriptions } from "../drizzle/schema";
import { getDb, getProfileChanges, getProfileHistory, searchAndSnapshot } from "./db";
import { hashSecret, normalizeUsername } from "./security";

async function authorizeBusiness(req: Request, res: Response) {
  const raw = req.header("x-api-key") ?? req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!raw) { res.status(401).json({ error: "business_api_key_required" }); return null; }
  const db = await getDb(); if (!db) { res.status(503).json({ error: "database_unavailable" }); return null; }
  const key = (await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hashSecret(raw))).limit(1))[0];
  if (!key || key.revokedAt) { res.status(401).json({ error: "invalid_api_key" }); return null; }
  const subscription = (await db.select().from(subscriptions).where(eq(subscriptions.userId, key.userId)).limit(1))[0];
  if (!subscription || subscription.plan !== "BUSINESS" || subscription.status !== "ACTIVE" || (subscription.expiresAt && subscription.expiresAt < new Date())) { res.status(403).json({ error: "business_plan_required" }); return null; }
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, key.id));
  return key;
}

export function registerApiV1(app: Express) {
  app.get("/api/v1/profile/:username", async (req, res) => { if (!await authorizeBusiness(req, res)) return; try { const result = await searchAndSnapshot(normalizeUsername(req.params.username)); res.json(result.profile); } catch (error) { res.status(502).json({ error: error instanceof Error ? error.message : "provider_unavailable" }); } });
  app.get("/api/v1/history/:username", async (req, res) => { if (!await authorizeBusiness(req, res)) return; res.json(await getProfileHistory(req.params.username)); });
  app.get("/api/v1/changes/:username", async (req, res) => { if (!await authorizeBusiness(req, res)) return; res.json(await getProfileChanges(req.params.username)); });
}
