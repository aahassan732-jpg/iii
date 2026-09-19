import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { activationCodes, apiKeys, appSettings } from "../drizzle/schema";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { addMonitor, getAdminStats, getDb, getNotifications, getProfileChanges, getProfileHistory, getSettings, getSubscription, getUserMonitors, redeemActivation, searchAndSnapshot, getActivationByHash, upsertUser } from "./db";
import { createActivationCode, createApiKey, hashSecret, normalizeUsername } from "./security";
import { providerManager } from "../providers/instagram/ProviderManager";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "صلاحيات الإدارة مطلوبة" }); return next(); });
const usernameInput = z.object({ username: z.string().min(1).max(50) });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  profile: router({
    search: publicProcedure.input(usernameInput).query(async ({ input }) => { try { return await searchAndSnapshot(input.username); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "تعذر تحديث البيانات حاليًا. حاول لاحقًا." }); } }),
    history: publicProcedure.input(usernameInput).query(({ input }) => getProfileHistory(input.username)),
    changes: publicProcedure.input(usernameInput).query(({ input }) => getProfileChanges(input.username)),
  }),
  monitor: router({
    list: protectedProcedure.query(({ ctx }) => getUserMonitors(ctx.user.id)),
    add: protectedProcedure.input(z.object({ username: z.string().min(1).max(50), frequencyMinutes: z.number().int().min(60).max(10080).default(1440) })).mutation(({ ctx, input }) => addMonitor(ctx.user.id, input.username, input.frequencyMinutes)),
  }),
  notifications: router({ list: protectedProcedure.query(({ ctx }) => getNotifications(ctx.user.id)) }),
  subscription: router({
    me: protectedProcedure.query(({ ctx }) => getSubscription(ctx.user.id)),
    activate: protectedProcedure.input(z.object({ code: z.string().regex(/^ILP-[A-Z0-9]{4}(?:-[A-Z0-9]{4}){3}$/) })).mutation(async ({ ctx, input }) => {
      const code = await getActivationByHash(hashSecret(input.code));
      if (!code || code.status !== "UNUSED") throw new TRPCError({ code: "BAD_REQUEST", message: "الكود غير صالح أو مستخدم أو منتهٍ" });
      const expiresAt = new Date(Date.now() + code.durationDays * 86_400_000);
      await redeemActivation(code.id, ctx.user.id, code.plan, expiresAt);
      return { success: true, plan: code.plan, expiresAt };
    }),
    generateApiKey: protectedProcedure.input(z.object({ label: z.string().max(100).optional() })).mutation(async ({ ctx, input }) => {
      const subscription = await getSubscription(ctx.user.id);
      if (subscription?.plan !== "BUSINESS" || subscription.status !== "ACTIVE") throw new TRPCError({ code: "FORBIDDEN", message: "ميزة API متاحة لباقة Business فقط" });
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      const key = createApiKey(); await db.insert(apiKeys).values({ userId: ctx.user.id, keyHash: hashSecret(key), label: input.label ?? null });
      return { key, warning: "سيظهر المفتاح مرة واحدة فقط." };
    }),
  }),
  settings: router({ public: publicProcedure.query(() => getSettings()) }),
  admin: router({
    stats: adminProcedure.query(() => getAdminStats()),
    health: adminProcedure.query(() => providerManager.active.health()),
    generateCode: adminProcedure.input(z.object({ plan: z.enum(["PRO", "BUSINESS"]), durationDays: z.number().int().min(1).max(730), note: z.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      const code = createActivationCode();
      await db.insert(activationCodes).values({ codeHash: hashSecret(code), plan: input.plan, durationDays: input.durationDays, createdBy: ctx.user.id, expiresAt: new Date(Date.now() + input.durationDays * 86_400_000), note: input.note ?? null });
      return { code, warning: "سيظهر هذا الكود مرة واحدة فقط؛ خزّنه بأمان." };
    }),
    updateSetting: adminProcedure.input(z.object({ key: z.string().min(1).max(100), value: z.string().max(2000) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" }); await db.insert(appSettings).values({ settingKey: input.key, settingValue: input.value, updatedBy: ctx.user.id }).onConflictDoUpdate({ target: appSettings.settingKey, set: { settingValue: input.value, updatedBy: ctx.user.id } }); return { success: true }; }),
  }),
  health: publicProcedure.query(() => ({ provider: providerManager.active.name, status: providerManager.active.health() })),
});

export type AppRouter = typeof appRouter;
