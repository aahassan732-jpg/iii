import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("Supabase Auth integration", () => {
  it("returns the authenticated application user from auth.me", async () => {
    const now = new Date();
    const ctx: TrpcContext = {
      user: { id: 1, openId: "supabase-user-id", email: "sample@example.com", name: "Sample User", loginMethod: "supabase", role: "user", disabled: false, createdAt: now, updatedAt: now, lastSignedIn: now },
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    await expect(appRouter.createCaller(ctx).auth.me()).resolves.toMatchObject({ openId: "supabase-user-id", loginMethod: "supabase" });
  });
});
